package expo.modules.wellmsnore

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import androidx.core.content.ContextCompat
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.withTimeout
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID
import kotlin.math.roundToInt

internal object SnoreEngine {
  const val SAMPLE_RATE = 16_000
  const val MODEL_SAMPLES = 15_600
  const val MAX_SESSION_MS = 12L * 60 * 60 * 1000
  private val lock = Any()
  private var store: NightStore? = null
  private var saved = mutableListOf<JSONObject>()
  private var active: NightAccumulator? = null
  private var status = "idle"
  private var error: String? = null
  private var pendingStart: CompletableDeferred<Map<String, Any?>>? = null
  private var pendingStop: CompletableDeferred<Map<String, Any?>>? = null
  @Volatile var stopRequested = false
    private set

  private fun initialize(context: Context) = synchronized(lock) {
    if (store != null) return@synchronized
    val storage = NightStore(context)
    val history = storage.readNights()
    val stale = storage.readCheckpoint()
    if (stale != null) {
      val recovered = NightAccumulator.fromCheckpoint(stale).toNight(true)
      if (history.none { it.getString("id") == recovered.getString("id") }) history.add(recovered)
      storage.saveNights(history)
      storage.clearCheckpoint()
      error = "The previous night was interrupted. Its saved portion did not count."
    }
    saved = history.sortedByDescending { it.getLong("startedAt") }.take(90).toMutableList()
    store = storage
  }

  fun state(context: Context): Map<String, Any?> {
    initialize(context)
    return synchronized(lock) { stateLocked() }
  }

  fun nights(context: Context): List<Map<String, Any?>> {
    initialize(context)
    return synchronized(lock) { saved.map { it.asBridgeMap() } }
  }

  suspend fun start(context: Context): Map<String, Any?> {
    initialize(context)
    if (ContextCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
      throw IllegalStateException("Allow microphone access in Settings to start a night.")
    }
    val result = synchronized(lock) {
      check(active == null) { "A night is already recording." }
      error = null
      stopRequested = false
      status = "starting"
      active = NightAccumulator(UUID.randomUUID().toString(), System.currentTimeMillis())
      try {
        store!!.saveCheckpoint(active!!.checkpoint())
      } catch (failure: Exception) {
        active = null
        status = "error"
        error = "Not enough storage to save this night."
        throw failure
      }
      pendingStop = CompletableDeferred()
      CompletableDeferred<Map<String, Any?>>().also { pendingStart = it }
    }
    try {
      ContextCompat.startForegroundService(context, Intent(context, SnoreRecordingService::class.java))
      return withTimeout(15_000) { result.await() }
    } catch (failure: Exception) {
      synchronized(lock) {
        stopRequested = true
        status = "error"
        error = failure.message ?: "Could not start listening. Open WellM and try again."
        if (!SnoreRecordingService.isRunning) {
          active = null
          store!!.clearCheckpoint()
        }
      }
      throw failure
    }
  }

  suspend fun stop(context: Context): Map<String, Any?> {
    initialize(context)
    val result = synchronized(lock) {
      check(active != null) { "There is no night recording." }
      status = "stopping"
      stopRequested = true
      requireNotNull(pendingStop)
    }
    return withTimeout(15_000) { result.await() }
  }

  fun running(): String = synchronized(lock) {
    val night = requireNotNull(active) { "No active session." }
    if (stopRequested) throw NightCancelledException()
    status = "recording"
    pendingStart?.complete(stateLocked())
    night.id
  }

  fun captured(samples: Int, dbfs: Double) = synchronized(lock) {
    active?.let {
      it.capturedSamples += samples
      it.currentDbfs = dbfs
      it.endedAt = System.currentTimeMillis()
    }
  }

  fun analyzed(samples: Int, snoreConfidence: Double, noisy: Boolean, dbfs: Double) = synchronized(lock) {
    active?.let {
      it.analyzedSamples += samples
      if (noisy) it.noisySamples += samples
      else if (snoreConfidence >= 0.35) it.snoreSamples += samples
      it.confidence = snoreConfidence
      it.currentDbfs = dbfs
      it.waveform.add(((dbfs + 72) / 72).coerceIn(0.0, 1.0))
      if (it.waveform.size > 48) it.waveform.removeAt(0)
    }
  }

  fun checkpoint(id: String, clip: File?, clipSeconds: Double, dbfs: Double?, waveform: List<Double>) = synchronized(lock) {
    val night = active?.takeIf { it.id == id } ?: return@synchronized
    night.clipUri = clip?.let { android.net.Uri.fromFile(it).toString() }
    night.clipSeconds = clipSeconds
    night.loudestDbfs = dbfs
    night.clipWaveform = waveform
    store!!.saveCheckpoint(night.checkpoint())
  }

  fun clipFile(id: String): File = synchronized(lock) { requireNotNull(store).clipFile(id) }

  fun finish(id: String?, interrupted: Boolean, message: String?) = synchronized(lock) {
    val night = active ?: return@synchronized
    if (id != null && night.id != id) return@synchronized
    night.endedAt = System.currentTimeMillis()
    val record = night.toNight(interrupted)
    try {
      if (night.capturedSamples > 0) {
        val next = (listOf(record) + saved.filter { it.getString("id") != night.id }).take(90)
        store!!.saveNights(next)
        saved = next.toMutableList()
      }
      store!!.clearCheckpoint()
      active = null
      error = message
      status = if (message == null) "idle" else "error"
      pendingStart?.takeUnless { it.isCompleted }?.completeExceptionally(
        IllegalStateException(message ?: "Listening stopped before the microphone was ready.")
      )
      pendingStop?.complete(record.asBridgeMap())
    } catch (failure: Exception) {
      active = null
      status = "error"
      error = "Could not save the morning card. Free device storage and reopen WellM."
      pendingStart?.takeUnless { it.isCompleted }?.completeExceptionally(failure)
      pendingStop?.completeExceptionally(failure)
    }
  }

  fun requestStop() = synchronized(lock) {
    status = "stopping"
    stopRequested = true
  }

  fun delete(context: Context, id: String) {
    initialize(context)
    synchronized(lock) {
      check(active?.id != id) { "Stop the night before deleting it." }
      store!!.deleteClip(id)
      val next = saved.filter { it.getString("id") != id }
      store!!.saveNights(next)
      saved = next.toMutableList()
    }
  }

  fun deleteAll(context: Context) {
    synchronized(lock) {
      check(active == null) { "Stop your current night before clearing device data." }
      val storage = store ?: NightStore(context)
      storage.eraseAll()
      store = storage
      saved.clear()
      error = null
      status = "idle"
    }
  }

  private fun stateLocked(): Map<String, Any?> = mapOf(
    "status" to status,
    "active" to active?.activeMap(),
    "error" to error
  )
}

internal class NightCancelledException : Exception("Listening was cancelled.")

internal class NightAccumulator(val id: String, val startedAt: Long) {
  var endedAt = startedAt
  var capturedSamples = 0L
  var analyzedSamples = 0L
  var snoreSamples = 0L
  var noisySamples = 0L
  var currentDbfs = -96.0
  var confidence = 0.0
  var clipUri: String? = null
  var clipSeconds = 0.0
  var loudestDbfs: Double? = null
  var waveform = mutableListOf<Double>()
  var clipWaveform = emptyList<Double>()
  private fun seconds(samples: Long) = samples.toDouble() / SnoreEngine.SAMPLE_RATE

  fun activeMap(): Map<String, Any?> = mapOf(
    "id" to id, "startedAt" to startedAt,
    "durationSeconds" to seconds(capturedSamples),
    "snoringSeconds" to seconds(snoreSamples),
    "noisySeconds" to seconds(noisySamples),
    "analyzedSeconds" to seconds(analyzedSamples),
    "currentDbfs" to currentDbfs,
    "lastSnoringConfidence" to confidence,
    "waveform" to waveform.toList()
  )

  fun checkpoint(): JSONObject = toNight(false).apply {
    put("capturedSamples", capturedSamples)
    put("analyzedSamples", analyzedSamples)
    put("snoreSamples", snoreSamples)
    put("noisySamples", noisySamples)
  }

  fun toNight(interrupted: Boolean): JSONObject {
    val duration = seconds(capturedSamples)
    val analyzed = seconds(analyzedSamples)
    val reasons = mutableListOf<String>()
    if (duration < 1800) reasons.add("Recorded less than 30 minutes.")
    if (analyzed > 0 && noisySamples.toDouble() / analyzedSamples > 0.30) {
      reasons.add("Background noise covered more than 30% of analyzed audio.")
    }
    if (duration <= 0 || analyzed / duration < 0.90) reasons.add("Less than 90% of recorded audio was analyzed.")
    if (interrupted) reasons.add("Listening was interrupted.")
    val score = if (analyzedSamples == 0L) 0 else (100.0 * snoreSamples / analyzedSamples).roundToInt().coerceIn(0, 100)
    return JSONObject().apply {
      put("id", id)
      put("startedAt", startedAt)
      put("endedAt", endedAt)
      put("durationSeconds", duration)
      put("snoringSeconds", seconds(snoreSamples))
      put("noisySeconds", seconds(noisySamples))
      put("analyzedSeconds", analyzed)
      put("score", score)
      put("eligible", reasons.isEmpty())
      put("exclusionReasons", JSONArray(reasons))
      put("loudestClipUri", clipUri ?: JSONObject.NULL)
      put("loudestClipSeconds", clipSeconds)
      put("loudestDbfs", loudestDbfs ?: JSONObject.NULL)
      put("interrupted", interrupted)
      put("waveform", JSONArray(clipWaveform))
      put("source", "recorded")
    }
  }

  companion object {
    fun fromCheckpoint(json: JSONObject): NightAccumulator = NightAccumulator(
      json.getString("id"), json.getLong("startedAt")
    ).apply {
      endedAt = json.getLong("endedAt")
      capturedSamples = json.getLong("capturedSamples")
      analyzedSamples = json.getLong("analyzedSamples")
      snoreSamples = json.getLong("snoreSamples")
      noisySamples = json.getLong("noisySamples")
      clipUri = if (json.isNull("loudestClipUri")) null else json.getString("loudestClipUri")
      clipSeconds = json.optDouble("loudestClipSeconds", 0.0)
      loudestDbfs = if (json.isNull("loudestDbfs")) null else json.getDouble("loudestDbfs")
      clipWaveform = json.optJSONArray("waveform")?.let { values ->
        (0 until values.length()).map { values.getDouble(it) }
      } ?: emptyList()
    }
  }
}
