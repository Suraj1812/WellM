import AVFoundation
import ExpoModulesCore

public final class WellMSnoreModule: Module {
  private let engine = WellMSnoreEngine.shared

  public func definition() -> ModuleDefinition {
    Name("WellMSnore")

    AsyncFunction("requestMicrophonePermission") { (promise: Promise) in
      if #available(iOS 17.0, *) {
        AVAudioApplication.requestRecordPermission { allowed in promise.resolve(allowed) }
      } else {
        AVAudioSession.sharedInstance().requestRecordPermission { allowed in promise.resolve(allowed) }
      }
    }.runOnQueue(.main)

    AsyncFunction("getState") { () throws -> [String: Any] in
      try self.engine.getState()
    }.runOnQueue(engine.queue)

    AsyncFunction("getNights") { () throws -> [[String: Any]] in
      try self.engine.getNights()
    }.runOnQueue(engine.queue)

    AsyncFunction("startNight") { () throws -> [String: Any] in
      try self.engine.startNight()
    }.runOnQueue(engine.queue)

    AsyncFunction("stopNight") { () throws -> [String: Any] in
      try self.engine.stopNight()
    }.runOnQueue(engine.queue)

    AsyncFunction("deleteNight") { (id: String) throws in
      try self.engine.deleteNight(id: id)
    }.runOnQueue(engine.queue)

    AsyncFunction("deleteAllNights") { () throws in
      try self.engine.deleteAllNights()
    }.runOnQueue(engine.queue)
  }
}
