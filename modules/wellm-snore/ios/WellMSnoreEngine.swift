import AVFoundation
import Foundation
import TensorFlowLite

private enum SnoreEngineError: LocalizedError {
  case message(String)
  var errorDescription: String? {
    switch self { case .message(let text): return text }
  }
}

private final class CaptureGate: @unchecked Sendable {
  private let lock = NSLock()
  private var pending = 0
  private var droppedSeconds = 0.0

  func begin(seconds: Double) -> Bool {
    lock.lock()
    defer { lock.unlock() }
    if pending >= 24 {
      droppedSeconds += seconds
      return false
    }
    pending += 1
    return true
  }

  func finish() {
    lock.lock()
    pending -= 1
    lock.unlock()
  }

  func drop(seconds: Double) {
    lock.lock()
    droppedSeconds += seconds
    lock.unlock()
  }

  func takeDroppedSeconds() -> Double {
    lock.lock()
    defer { lock.unlock() }
    let result = droppedSeconds
    droppedSeconds = 0
    return result
  }
}

private final class LiveSnoreSession: @unchecked Sendable {
  let id = UUID().uuidString.lowercased()
  let startedAt = Date().timeIntervalSince1970 * 1_000
  let gate = CaptureGate()
  var sampleCount = 0
  var droppedSeconds = 0.0
  var snoringSeconds = 0.0
  var noisySeconds = 0.0
  var analyzedSeconds = 0.0
  var interrupted = false
  var currentDbfs = -120.0
  var lastSnoringConfidence = 0.0
  var modelSamples = [Float]()
  var waveform = [Double]()
  var clip = LoudestClipWindow()
  var savedClipRevision = -1
  var lastAudioAt = ProcessInfo.processInfo.systemUptime

  var duration: Double { Double(sampleCount) / Double(SnorePolicy.sampleRate) + droppedSeconds }

  func dictionary() -> [String: Any] {
    [
      "id": id, "startedAt": startedAt, "durationSeconds": duration,
      "snoringSeconds": snoringSeconds, "noisySeconds": noisySeconds,
      "analyzedSeconds": analyzedSeconds, "currentDbfs": currentDbfs,
      "lastSnoringConfidence": lastSnoringConfidence, "waveform": waveform
    ]
  }

  func night(endedAt: Double) -> SnoreNight {
    let reasons = SnorePolicy.exclusionReasons(
      duration: duration, analyzed: analyzedSeconds, noisy: noisySeconds, interrupted: interrupted
    )
    return SnoreNight(
      id: id, startedAt: startedAt, endedAt: endedAt,
      durationSeconds: duration, snoringSeconds: snoringSeconds,
      noisySeconds: noisySeconds, analyzedSeconds: analyzedSeconds,
      score: SnorePolicy.score(snoringSeconds: snoringSeconds, analyzedSeconds: analyzedSeconds),
      eligible: reasons.isEmpty, exclusionReasons: reasons,
      clipFilename: clip.bestSamples.isEmpty ? nil : "\(id).wav",
      loudestClipSeconds: Double(clip.bestSamples.count) / Double(SnorePolicy.sampleRate),
      loudestDbfs: clip.dbfs, interrupted: interrupted, waveform: clip.waveform
    )
  }
}

final class WellMSnoreEngine: @unchecked Sendable {
  static let shared = WellMSnoreEngine()
  let queue = DispatchQueue(label: "co.wellm.snore.capture", qos: .userInitiated)

  private var status = "idle"
  private var errorText: String?
  private var active: LiveSnoreSession?
  private var audioEngine: AVAudioEngine?
  private var converter: AVAudioConverter?
  private var interpreter: Interpreter?
  private var timer: DispatchSourceTimer?
  private var observers = [NSObjectProtocol]()
  private var nights = [SnoreNight]()
  private var loaded = false

  private var directory: URL {
    FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("WellMSnore", isDirectory: true)
  }
  private var historyURL: URL { directory.appendingPathComponent("nights.json") }
  private var checkpointURL: URL { directory.appendingPathComponent("active.json") }

  private init() {}

  func getState() throws -> [String: Any] {
    try ensureLoaded()
    return [
      "status": status,
      "active": active?.dictionary() as Any? ?? NSNull(),
      "error": errorText as Any? ?? NSNull()
    ]
  }

  func getNights() throws -> [[String: Any]] {
    try ensureLoaded()
    return nights.sorted { $0.startedAt > $1.startedAt }.map { $0.dictionary(directory: directory) }
  }

  func startNight() throws -> [String: Any] {
    try ensureLoaded()
    guard active == nil else { return try getState() }
    let audioSession = AVAudioSession.sharedInstance()
    guard audioSession.recordPermission == .granted else {
      throw SnoreEngineError.message("Allow microphone access in Settings to start a night.")
    }
    status = "starting"
    errorText = nil
    do {
      try prepareModel()
      try audioSession.setCategory(.record, mode: .measurement, options: [])
      try audioSession.setPreferredSampleRate(Double(SnorePolicy.sampleRate))
      try audioSession.setPreferredIOBufferDuration(0.08)
      try audioSession.setActive(true)
      if let microphone = audioSession.availableInputs?.first(where: { $0.portType == .builtInMic }) {
        try audioSession.setPreferredInput(microphone)
      }
      let engine = AVAudioEngine()
      let input = engine.inputNode
      let hardwareFormat = input.outputFormat(forBus: 0)
      guard hardwareFormat.sampleRate > 0, hardwareFormat.channelCount > 0,
        let targetFormat = AVAudioFormat(
          commonFormat: .pcmFormatFloat32, sampleRate: Double(SnorePolicy.sampleRate),
          channels: 1, interleaved: false
        ), let converter = AVAudioConverter(from: hardwareFormat, to: targetFormat)
      else { throw SnoreEngineError.message("The microphone's audio format is unavailable.") }
      converter.downmix = true
      self.converter = converter
      let session = LiveSnoreSession()
      active = session
      audioEngine = engine
      input.installTap(onBus: 0, bufferSize: 2_048, format: hardwareFormat) { [weak self] buffer, _ in
        guard let self else { return }
        let seconds = Double(buffer.frameLength) / hardwareFormat.sampleRate
        guard session.gate.begin(seconds: seconds) else { return }
        guard let copied = Self.copy(buffer: buffer) else {
          session.gate.drop(seconds: seconds)
          session.gate.finish()
          return
        }
        self.queue.async { [weak self] in
          defer { session.gate.finish() }
          guard let self, self.active?.id == session.id, self.status == "recording" else { return }
          do { try self.receive(copied, session: session) }
          catch { self.stopAfterFailure(error.localizedDescription) }
        }
      }
      engine.prepare()
      try engine.start()
      status = "recording"
      try checkpoint()
      observeAudioChanges(engine: engine, sessionID: session.id)
      startCheckpointTimer(sessionID: session.id)
      return try getState()
    } catch {
      shutdownAudio()
      active = nil
      try? FileManager.default.removeItem(at: checkpointURL)
      status = "error"
      errorText = error.localizedDescription
      throw error
    }
  }

  func stopNight() throws -> [String: Any] {
    try ensureLoaded()
    guard active != nil else { throw SnoreEngineError.message("There isn't a night recording to stop.") }
    return try finishNight().dictionary(directory: directory)
  }

  func deleteNight(id: String) throws {
    try ensureLoaded()
    guard active?.id != id else { throw SnoreEngineError.message("Stop the night before deleting it.") }
    guard let night = nights.first(where: { $0.id == id }) else {
      if UUID(uuidString: id) != nil { try removeIfPresent(directory.appendingPathComponent("\(id).wav")) }
      return
    }
    let previous = nights
    nights.removeAll { $0.id == id }
    do { try saveHistory() } catch { nights = previous; throw error }
    if let filename = night.clipFilename { try removeIfPresent(directory.appendingPathComponent(filename)) }
  }

  func deleteAllNights() throws {
    try ensureLoaded()
    guard active == nil else { throw SnoreEngineError.message("Stop your night before deleting recordings.") }
    let previous = nights
    nights = []
    do { try saveHistory() } catch { nights = previous; throw error }
    for file in try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil) {
      if file.pathExtension == "wav" || file.lastPathComponent == "active.json" { try removeIfPresent(file) }
    }
    status = "idle"
    errorText = nil
  }

  private func prepareModel() throws {
    if interpreter != nil { return }
    let owner = Bundle(for: WellMSnoreModule.self)
    var bundles = [owner, Bundle.main] + Bundle.allFrameworks + Bundle.allBundles
    for bundle in bundles {
      if let resourceURL = bundle.url(forResource: "WellMSnoreModel", withExtension: "bundle"),
        let resources = Bundle(url: resourceURL) { bundles.append(resources) }
    }
    guard let path = bundles.compactMap({ $0.path(forResource: "yamnet", ofType: "tflite") }).first else {
      throw SnoreEngineError.message("The on-device sound model isn't in this build. Install a development build.")
    }
    var options = Interpreter.Options()
    options.threadCount = 2
    let model = try Interpreter(modelPath: path, options: options)
    try model.allocateTensors()
    let input = try model.input(at: 0)
    let output = try model.output(at: 0)
    guard input.dataType == .float32, input.shape.dimensions == [SnorePolicy.modelSamples],
      output.dataType == .float32, output.shape.dimensions == [1, 521]
    else { throw SnoreEngineError.message("The bundled YAMNet model has an unsupported input or label shape.") }
    interpreter = model
  }

  private func receive(_ buffer: AVAudioPCMBuffer, session: LiveSnoreSession) throws {
    guard let converter else { throw SnoreEngineError.message("Audio conversion stopped.") }
    let capacity = AVAudioFrameCount(ceil(Double(buffer.frameLength) *
      Double(SnorePolicy.sampleRate) / buffer.format.sampleRate) + 64)
    guard let output = AVAudioPCMBuffer(pcmFormat: converter.outputFormat, frameCapacity: capacity) else {
      throw SnoreEngineError.message("There wasn't enough memory to analyze the microphone.")
    }
    var supplied = false
    var conversionError: NSError?
    let result = converter.convert(to: output, error: &conversionError) { _, status in
      if supplied { status.pointee = .noDataNow; return nil }
      supplied = true
      status.pointee = .haveData
      return buffer
    }
    if let conversionError { throw conversionError }
    guard result != .error else { throw SnoreEngineError.message("Microphone audio conversion failed.") }
    let lost = session.gate.takeDroppedSeconds()
    if lost > 0 { session.droppedSeconds += lost; session.interrupted = true }
    guard output.frameLength > 0, let channel = output.floatChannelData?[0] else { return }
    let samples = Array(UnsafeBufferPointer(start: channel, count: Int(output.frameLength)))
      .map { $0.isFinite ? min(1, max(-1, $0)) : 0 }
    session.lastAudioAt = ProcessInfo.processInfo.systemUptime
    session.sampleCount += samples.count
    session.clip.append(samples)
    let energy = samples.reduce(0.0) { $0 + Double($1) * Double($1) }
    session.currentDbfs = max(-120, 10 * log10(max(energy / Double(samples.count), 0.000_000_000_001)))
    session.modelSamples.append(contentsOf: samples)
    while session.modelSamples.count >= SnorePolicy.modelSamples {
      let frame = Array(session.modelSamples.prefix(SnorePolicy.modelSamples))
      session.modelSamples.removeFirst(SnorePolicy.modelSamples)
      try classify(frame, countedSamples: frame.count, session: session)
    }
  }

  private func classify(_ samples: [Float], countedSamples: Int, session: LiveSnoreSession) throws {
    guard let interpreter else { throw SnoreEngineError.message("The sound model is unavailable.") }
    let bytes = samples.withUnsafeBufferPointer { Data(buffer: $0) }
    try interpreter.copy(bytes, toInputAt: 0)
    try interpreter.invoke()
    let output = try interpreter.output(at: 0)
    var confidence = Array(repeating: Float(0), count: 521)
    guard output.data.count == confidence.count * MemoryLayout<Float>.size else {
      throw SnoreEngineError.message("YAMNet returned an unexpected number of sound labels.")
    }
    _ = confidence.withUnsafeMutableBytes { output.data.copyBytes(to: $0) }
    let seconds = Double(countedSamples) / Double(SnorePolicy.sampleRate)
    let snoring = confidence[38]
    let noiseConfidence = max(confidence[0], confidence[132], confidence[518])
    let actualSamples = samples.prefix(countedSamples)
    let clipped = actualSamples.reduce(0) { $0 + (abs($1) >= SnorePolicy.clippingAmplitude ? 1 : 0) }
    let noisy = noiseConfidence >= SnorePolicy.confidence || Double(clipped) / Double(countedSamples) > 0.01
    session.analyzedSeconds += seconds
    if noisy { session.noisySeconds += seconds }
    if snoring >= SnorePolicy.confidence && !noisy { session.snoringSeconds += seconds }
    session.lastSnoringConfidence = Double(snoring)
    let meanPower = actualSamples.reduce(0.0) { $0 + Double($1) * Double($1) } / Double(countedSamples)
    let dbfs = max(-120, 10 * log10(max(meanPower, 0.000_000_000_001)))
    if session.waveform.count >= 120 {
      session.waveform = stride(from: 0, to: session.waveform.count, by: 2).map {
        max(session.waveform[$0], session.waveform[min($0 + 1, session.waveform.count - 1)])
      }
    }
    session.waveform.append(min(1, max(0.02, (dbfs + 65) / 65)))
  }

  private func finishNight() throws -> SnoreNight {
    guard let session = active else { throw SnoreEngineError.message("There isn't an active night.") }
    status = "stopping"
    shutdownAudio()
    let lost = session.gate.takeDroppedSeconds()
    if lost > 0 { session.droppedSeconds += lost; session.interrupted = true }
    session.modelSamples.removeAll(keepingCapacity: false)
    do {
      try saveClip(session)
      let night = session.night(endedAt: Date().timeIntervalSince1970 * 1_000)
      let previous = nights
      nights.removeAll { $0.id == night.id }
      nights.insert(night, at: 0)
      do { try saveHistory() } catch { nights = previous; throw error }
      try removeIfPresent(checkpointURL)
      active = nil
      status = errorText == nil ? "idle" : "error"
      try pruneHistory()
      return night
    } catch {
      session.interrupted = true
      status = "error"
      errorText = "The night couldn't be saved: \(error.localizedDescription)"
      try? checkpoint()
      throw error
    }
  }

  private func stopAfterFailure(_ message: String) {
    guard let session = active else { return }
    session.interrupted = true
    errorText = message
    do { _ = try finishNight() }
    catch { status = "error"; errorText = "\(message) \(error.localizedDescription)" }
  }

  private func startCheckpointTimer(sessionID: String) {
    let source = DispatchSource.makeTimerSource(queue: queue)
    source.schedule(deadline: .now() + 5, repeating: 5)
    source.setEventHandler { [weak self] in
      guard let self, let session = self.active, session.id == sessionID, self.status == "recording" else { return }
      if ProcessInfo.processInfo.systemUptime - session.lastAudioAt > 10 {
        self.stopAfterFailure("Microphone capture stopped. This night didn't count.")
        return
      }
      do { try self.checkpoint() }
      catch { self.stopAfterFailure("The recording couldn't be safely saved: \(error.localizedDescription)") }
    }
    timer = source
    source.resume()
  }

  private func observeAudioChanges(engine: AVAudioEngine, sessionID: String) {
    let center = NotificationCenter.default
    observers.append(center.addObserver(forName: AVAudioSession.interruptionNotification,
      object: AVAudioSession.sharedInstance(), queue: nil) { [weak self] notification in
      guard let raw = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
        AVAudioSession.InterruptionType(rawValue: raw) == .began else { return }
      self?.queue.async { [weak self] in
        guard let self, self.active?.id == sessionID else { return }
        self.stopAfterFailure("A call or another app interrupted the microphone.")
      }
    })
    observers.append(center.addObserver(forName: .AVAudioEngineConfigurationChange,
      object: engine, queue: nil) { [weak self] _ in
      self?.queue.async { [weak self] in
        guard let self, self.active?.id == sessionID else { return }
        self.stopAfterFailure("The microphone route changed during the night.")
      }
    })
    observers.append(center.addObserver(forName: AVAudioSession.mediaServicesWereResetNotification,
      object: AVAudioSession.sharedInstance(), queue: nil) { [weak self] _ in
      self?.queue.async { [weak self] in
        guard let self, self.active?.id == sessionID else { return }
        self.stopAfterFailure("The phone's audio service restarted during the night.")
      }
    })
  }

  private func shutdownAudio() {
    timer?.cancel()
    timer = nil
    observers.forEach { NotificationCenter.default.removeObserver($0) }
    observers.removeAll()
    if let engine = audioEngine {
      engine.inputNode.removeTap(onBus: 0)
      engine.stop()
    }
    audioEngine = nil
    converter = nil
    try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
  }

  private func checkpoint() throws {
    guard let session = active else { return }
    try saveClip(session)
    let now = Date().timeIntervalSince1970 * 1_000
    try writePrivate(JSONEncoder().encode(SnoreCheckpoint(night: session.night(endedAt: now), savedAt: now)), to: checkpointURL)
  }

  private func saveClip(_ session: LiveSnoreSession) throws {
    guard !session.clip.bestSamples.isEmpty, session.savedClipRevision != session.clip.revision else { return }
    let file = directory.appendingPathComponent("\(session.id).wav")
    try writePrivate(PCMClipEncoder.wav(samples: session.clip.bestSamples), to: file)
    session.savedClipRevision = session.clip.revision
  }

  private func ensureLoaded() throws {
    guard !loaded else { return }
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true,
      attributes: [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication])
    var privateDirectory = directory
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    try privateDirectory.setResourceValues(values)
    if FileManager.default.fileExists(atPath: historyURL.path) {
      nights = try JSONDecoder().decode([SnoreNight].self, from: Data(contentsOf: historyURL))
    }
    if FileManager.default.fileExists(atPath: checkpointURL.path) {
      let saved = try JSONDecoder().decode(SnoreCheckpoint.self, from: Data(contentsOf: checkpointURL))
      if !nights.contains(where: { $0.id == saved.night.id }) {
        var recovered = saved.night
        recovered.interrupted = true
        recovered.endedAt = saved.savedAt
        recovered.exclusionReasons = SnorePolicy.exclusionReasons(
          duration: recovered.durationSeconds, analyzed: recovered.analyzedSeconds,
          noisy: recovered.noisySeconds, interrupted: true
        )
        recovered.eligible = false
        nights.insert(recovered, at: 0)
        try saveHistory()
      }
      try removeIfPresent(checkpointURL)
      errorText = "The previous recording was interrupted. Its saved result is in your week."
    }
    try pruneHistory()
    let retained = Set(nights.compactMap { $0.clipFilename })
    for file in try FileManager.default.contentsOfDirectory(at: directory, includingPropertiesForKeys: nil) {
      if file.pathExtension == "wav" && !retained.contains(file.lastPathComponent) { try removeIfPresent(file) }
    }
    loaded = true
  }

  private func saveHistory() throws {
    try writePrivate(JSONEncoder().encode(nights), to: historyURL)
  }

  private func pruneHistory() throws {
    guard nights.count > SnorePolicy.maximumNights else { return }
    let sorted = nights.sorted { $0.startedAt > $1.startedAt }
    let removed = Array(sorted.dropFirst(SnorePolicy.maximumNights))
    let previous = nights
    nights = Array(sorted.prefix(SnorePolicy.maximumNights))
    do { try saveHistory() } catch { nights = previous; throw error }
    for night in removed {
      if let filename = night.clipFilename { try removeIfPresent(directory.appendingPathComponent(filename)) }
    }
  }

  private func writePrivate(_ data: Data, to destination: URL) throws {
    try data.write(to: destination, options: .atomic)
    try FileManager.default.setAttributes(
      [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication], ofItemAtPath: destination.path
    )
    var file = destination
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    try file.setResourceValues(values)
  }

  private func removeIfPresent(_ file: URL) throws {
    if FileManager.default.fileExists(atPath: file.path) { try FileManager.default.removeItem(at: file) }
  }

  private static func copy(buffer: AVAudioPCMBuffer) -> AVAudioPCMBuffer? {
    guard let result = AVAudioPCMBuffer(pcmFormat: buffer.format, frameCapacity: buffer.frameLength) else { return nil }
    result.frameLength = buffer.frameLength
    let source = UnsafeMutableAudioBufferListPointer(buffer.mutableAudioBufferList)
    let destination = UnsafeMutableAudioBufferListPointer(result.mutableAudioBufferList)
    guard source.count == destination.count else { return nil }
    for index in 0..<source.count {
      guard let from = source[index].mData, let to = destination[index].mData else { return nil }
      memcpy(to, from, Int(source[index].mDataByteSize))
      destination[index].mDataByteSize = source[index].mDataByteSize
    }
    return result
  }
}
