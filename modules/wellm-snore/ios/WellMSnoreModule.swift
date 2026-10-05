import AVFoundation
import ExpoModulesCore
import Foundation

private enum ThemePreferenceError: LocalizedError {
  case invalidPreference

  var errorDescription: String? {
    "Appearance must be system, light, or dark."
  }
}

public final class WellMSnoreModule: Module {
  private let engine = WellMSnoreEngine.shared
  private let themePreferenceQueue = DispatchQueue(label: "wellm.appearance")

  public func definition() -> ModuleDefinition {
    Name("WellMSnore")

    AsyncFunction("getThemePreference") { () -> String in
      let preference = UserDefaults.standard.string(forKey: "wellm.appearance") ?? "system"
      return ["system", "light", "dark"].contains(preference) ? preference : "system"
    }.runOnQueue(themePreferenceQueue)

    AsyncFunction("setThemePreference") { (preference: String) throws in
      guard ["system", "light", "dark"].contains(preference) else {
        throw ThemePreferenceError.invalidPreference
      }
      UserDefaults.standard.set(preference, forKey: "wellm.appearance")
    }.runOnQueue(themePreferenceQueue)

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
