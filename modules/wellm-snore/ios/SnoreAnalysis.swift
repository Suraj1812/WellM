import Foundation

enum SnorePolicy {
  static let sampleRate = 16_000
  static let modelSamples = 15_600
  static let clipSamples = sampleRate * 10
  static let confidence: Float = 0.35
  static let clippingAmplitude: Float = 32_760.0 / 32_768.0
  static let minimumSeconds = 1_800.0
  static let maximumNoiseFraction = 0.30
  static let minimumAnalysisCoverage = 0.90
  static let maximumNights = 90

  static func score(snoringSeconds: Double, analyzedSeconds: Double) -> Int {
    guard analyzedSeconds > 0 else { return 0 }
    return Int((min(1, max(0, snoringSeconds / analyzedSeconds)) * 100).rounded())
  }

  static func exclusionReasons(duration: Double, analyzed: Double, noisy: Double, interrupted: Bool) -> [String] {
    var reasons = [String]()
    if duration < minimumSeconds { reasons.append("Recorded less than 30 minutes.") }
    if analyzed > 0 && noisy / analyzed > maximumNoiseFraction {
      reasons.append("Background noise covered more than 30% of analyzed audio.")
    }
    if duration <= 0 || analyzed / duration < minimumAnalysisCoverage {
      reasons.append("Less than 90% of recorded audio was analyzed.")
    }
    if interrupted { reasons.append("Listening was interrupted.") }
    return reasons
  }
}

struct LoudestClipWindow {
  private let capacity: Int
  private var ring: [Float]
  private var next = 0
  private var filled = 0
  private var energy = 0.0
  private(set) var bestSamples = [Float]()
  private(set) var bestMeanPower = -1.0
  private(set) var revision = 0

  init(capacity: Int = SnorePolicy.clipSamples) {
    self.capacity = capacity
    ring = Array(repeating: 0, count: capacity)
  }

  mutating func append(_ samples: [Float]) {
    guard !samples.isEmpty else { return }
    if samples.count > capacity {
      var offset = 0
      while offset < samples.count {
        let end = min(samples.count, offset + capacity)
        append(Array(samples[offset..<end]))
        offset = end
      }
      return
    }
    var overwritten = [Float]()
    overwritten.reserveCapacity(samples.count)
    var candidateMeanPower = bestSamples.count == capacity ? bestMeanPower : -1
    var candidateEnd: Int?
    for (index, rawSample) in samples.enumerated() {
      let sample = rawSample.isFinite ? min(1, max(-1, rawSample)) : 0
      let old = ring[next]
      overwritten.append(old)
      if filled == capacity { energy -= Double(old) * Double(old) }
      ring[next] = sample
      energy += Double(sample) * Double(sample)
      next = (next + 1) % capacity
      filled = min(capacity, filled + 1)
      if filled == capacity {
        let mean = max(0, energy) / Double(capacity)
        if mean > candidateMeanPower {
          candidateMeanPower = mean
          candidateEnd = index + 1
        }
      }
    }
    if let candidateEnd {
      let tail = samples.count - candidateEnd
      let current = orderedSamples()
      bestSamples = Array(overwritten.suffix(tail)) + Array(current.dropLast(tail))
      bestMeanPower = candidateMeanPower
      revision += 1
    } else if filled < capacity {
      bestSamples = orderedSamples()
      bestMeanPower = max(0, energy) / Double(max(1, filled))
      revision += 1
    }
  }

  private func orderedSamples() -> [Float] {
    if filled < capacity { return Array(ring.prefix(filled)) }
    return Array(ring[next...]) + Array(ring[..<next])
  }

  var dbfs: Double? {
    guard !bestSamples.isEmpty else { return nil }
    return max(-120, 10 * log10(max(bestMeanPower, 0.000_000_000_001)))
  }

  var waveform: [Double] {
    guard !bestSamples.isEmpty else { return [] }
    return (0..<40).map { bar in
      let start = bar * bestSamples.count / 40
      let end = min(bestSamples.count, max(start + 1, (bar + 1) * bestSamples.count / 40))
      let meanPower = bestSamples[start..<end].reduce(0.0) {
        $0 + Double($1) * Double($1)
      } / Double(end - start)
      let dbfs = max(-120, 10 * log10(max(meanPower, 0.000_000_000_001)))
      return min(1, max(0, (dbfs + 72) / 72))
    }
  }
}

struct SnoreNight: Codable {
  var id: String
  var startedAt: Double
  var endedAt: Double
  var durationSeconds: Double
  var snoringSeconds: Double
  var noisySeconds: Double
  var analyzedSeconds: Double
  var score: Int
  var eligible: Bool
  var exclusionReasons: [String]
  var clipFilename: String?
  var loudestClipSeconds: Double
  var loudestDbfs: Double?
  var interrupted: Bool
  var waveform: [Double]

  func dictionary(directory: URL) -> [String: Any] {
    let clipURL = clipFilename.map { directory.appendingPathComponent($0) }
    let existingClip = clipURL.flatMap { FileManager.default.fileExists(atPath: $0.path) ? $0.absoluteString : nil }
    return [
      "id": id, "startedAt": startedAt, "endedAt": endedAt,
      "durationSeconds": durationSeconds, "snoringSeconds": snoringSeconds,
      "noisySeconds": noisySeconds, "analyzedSeconds": analyzedSeconds,
      "score": score, "eligible": eligible, "exclusionReasons": exclusionReasons,
      "loudestClipUri": existingClip as Any? ?? NSNull(),
      "loudestClipSeconds": existingClip == nil ? 0 : loudestClipSeconds,
      "loudestDbfs": loudestDbfs as Any? ?? NSNull(),
      "interrupted": interrupted, "waveform": waveform, "source": "recorded"
    ]
  }
}

struct SnoreCheckpoint: Codable {
  var night: SnoreNight
  var savedAt: Double
}

enum PCMClipEncoder {
  static func wav(samples: [Float], sampleRate: Int = SnorePolicy.sampleRate) -> Data {
    let byteCount = UInt32(samples.count * MemoryLayout<Int16>.size)
    var data = Data()
    data.reserveCapacity(44 + Int(byteCount))
    func append<T: FixedWidthInteger>(_ value: T) {
      var littleEndian = value.littleEndian
      withUnsafeBytes(of: &littleEndian) { data.append(contentsOf: $0) }
    }
    data.append(contentsOf: "RIFF".utf8)
    append(UInt32(36) + byteCount)
    data.append(contentsOf: "WAVEfmt ".utf8)
    append(UInt32(16))
    append(UInt16(1))
    append(UInt16(1))
    append(UInt32(sampleRate))
    append(UInt32(sampleRate * 2))
    append(UInt16(2))
    append(UInt16(16))
    data.append(contentsOf: "data".utf8)
    append(byteCount)
    for sample in samples {
      let finite = sample.isFinite ? sample : 0
      append(Int16((min(1, max(-1, finite)) * Float(Int16.max)).rounded()))
    }
    return data
  }
}
