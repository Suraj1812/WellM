package expo.modules.wellmsnore

import android.Manifest
import android.content.Context
import android.os.Build
import expo.modules.interfaces.permissions.PermissionsStatus
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class WellMSnoreModule : Module() {
  private val context: Context
    get() = appContext.reactContext?.applicationContext ?: throw Exceptions.AppContextLost()

  override fun definition() = ModuleDefinition {
    Name("WellMSnore")

    AsyncFunction("requestMicrophonePermission") { promise: Promise ->
      val permissions = appContext.permissions
      if (permissions == null) {
        promise.reject("E_PERMISSIONS", "Microphone permission service is unavailable.", null)
      } else {
        val requested = if (Build.VERSION.SDK_INT >= 33) {
          arrayOf(Manifest.permission.RECORD_AUDIO, Manifest.permission.POST_NOTIFICATIONS)
        } else {
          arrayOf(Manifest.permission.RECORD_AUDIO)
        }
        permissions.askForPermissions({ result ->
          promise.resolve(result[Manifest.permission.RECORD_AUDIO]?.status == PermissionsStatus.GRANTED)
        }, *requested)
      }
    }

    AsyncFunction("getState") { SnoreEngine.state(context) }
    AsyncFunction("getNights") { SnoreEngine.nights(context) }
    AsyncFunction("startNight") Coroutine { ->
      if (appContext.currentActivity == null) {
        throw IllegalStateException("Open WellM before starting a night.")
      }
      SnoreEngine.start(context)
    }
    AsyncFunction("stopNight") Coroutine { -> SnoreEngine.stop(context) }
    AsyncFunction("deleteNight") { id: String -> SnoreEngine.delete(context, id) }
    AsyncFunction("deleteAllNights") { SnoreEngine.deleteAll(context) }
  }
}
