package expo.modules.wellmsnore

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.AudioRecordingConfiguration
import android.media.MediaRecorder
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import java.io.IOException
import java.util.concurrent.atomic.AtomicBoolean

class SnoreRecordingService : Service() {
  companion object {
    private const val CHANNEL = "wellm-night-recording"
    private const val NOTIFICATION_ID = 4172
    private const val ACTION_STOP = "expo.modules.wellmsnore.STOP"
    private const val IDLE_READ_DELAY_MS = 20L
    @Volatile var isRunning = false
      private set
  }

  private var worker: Thread? = null
  private var wakeLock: PowerManager.WakeLock? = null
  private val completed = AtomicBoolean(false)
  @Volatile private var destroyed = false
  @Volatile private var interruption: String? = null
  @Volatile private var audioSessionId = 0
  private val recordingCallback = object : AudioManager.AudioRecordingCallback() {
    override fun onRecordingConfigChanged(configurations: MutableList<AudioRecordingConfiguration>) {
      if (Build.VERSION.SDK_INT >= 29 && configurations.any {
          it.clientAudioSessionId == audioSessionId && it.isClientSilenced
        }) {
        interruption = "The microphone became unavailable. This night did not count."
      }
    }
  }

  override fun onCreate() {
    super.onCreate()
    isRunning = true
    if (Build.VERSION.SDK_INT >= 26) {
      getSystemService(NotificationManager::class.java).createNotificationChannel(
        NotificationChannel(CHANNEL, "Night listening", NotificationManager.IMPORTANCE_LOW).apply {
          description = "Shows when WellM is listening on this phone."
          setSound(null, null)
        }
      )
    }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      SnoreEngine.requestStop()
      if (worker == null) stopSelf()
      return START_NOT_STICKY
    }
    if (worker != null) return START_NOT_STICKY
    try {
      ServiceCompat.startForeground(
        this,
        NOTIFICATION_ID,
        notification(),
        if (Build.VERSION.SDK_INT >= 30) ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE else 0
      )
      wakeLock = getSystemService(PowerManager::class.java).newWakeLock(
        PowerManager.PARTIAL_WAKE_LOCK, "$packageName:NightListening"
      ).apply {
        setReferenceCounted(false)
        acquire(SnoreEngine.MAX_SESSION_MS + 60_000)
      }
      worker = Thread(::record, "WellM-NightCapture").also { it.start() }
    } catch (failure: Exception) {
      completed.set(true)
      SnoreEngine.finish(null, true, failure.message ?: "Could not start background listening.")
      stopSelf()
    }
    return START_NOT_STICKY
  }

  private fun notification(): Notification {
    val stop = PendingIntent.getService(
      this, 1, Intent(this, SnoreRecordingService::class.java).setAction(ACTION_STOP),
      PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
    )
    val openIntent = packageManager.getLaunchIntentForPackage(packageName)
    val open = openIntent?.let {
      PendingIntent.getActivity(this, 2, it, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }
    return NotificationCompat.Builder(this, CHANNEL)
      .setSmallIcon(android.R.drawable.ic_btn_speak_now)
      .setContentTitle("WellM is listening")
      .setContentText("Sound stays on this phone. Stop when you wake up.")
      .setContentIntent(open)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setVisibility(NotificationCompat.VISIBILITY_PRIVATE)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .addAction(android.R.drawable.ic_media_pause, "Stop night", stop)
      .build()
  }

  private fun record() {
    var id: String? = null
    var recorder: AudioRecord? = null
    var classifier: YamNetClassifier? = null
    var interrupted = false
    var message: String? = null
    val loudest = LoudestClip()
    val audioManager = getSystemService(AudioManager::class.java)
    var callbackRegistered = false
    try {
      classifier = YamNetClassifier(this)
      val minimum = AudioRecord.getMinBufferSize(
        SnoreEngine.SAMPLE_RATE, AudioFormat.CHANNEL_IN_MONO, AudioFormat.ENCODING_PCM_16BIT
      )
      check(minimum > 0) { "This phone does not support 16 kHz microphone recording." }
      val source = if (audioManager.getProperty(AudioManager.PROPERTY_SUPPORT_AUDIO_SOURCE_UNPROCESSED) == "true") {
        MediaRecorder.AudioSource.UNPROCESSED
      } else {
        MediaRecorder.AudioSource.VOICE_RECOGNITION
      }
      recorder = AudioRecord.Builder()
        .setAudioSource(source)
        .setAudioFormat(
          AudioFormat.Builder()
            .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
            .setSampleRate(SnoreEngine.SAMPLE_RATE)
            .setChannelMask(AudioFormat.CHANNEL_IN_MONO)
            .build()
        )
        .setBufferSizeInBytes(maxOf(minimum, SnoreEngine.SAMPLE_RATE * 2 * 6))
        .build()
      check(recorder.state == AudioRecord.STATE_INITIALIZED) { "Could not open this phone's microphone." }
      audioSessionId = recorder.audioSessionId
      if (Build.VERSION.SDK_INT >= 29) {
        audioManager.registerAudioRecordingCallback(recordingCallback, Handler(Looper.getMainLooper()))
        callbackRegistered = true
      }
      recorder.startRecording()
      check(recorder.recordingState == AudioRecord.RECORDSTATE_RECORDING) { "The microphone did not start." }
      id = SnoreEngine.running()
      val block = ShortArray(LoudestClip.READ_SAMPLES)
      val window = ShortArray(SnoreEngine.MODEL_SAMPLES)
      var windowSize = 0
      val started = SystemClock.elapsedRealtime()
      var lastCheckpoint = started
      var lastCapture = started
      var capturedSamples = 0L
      while (!SnoreEngine.stopRequested && !destroyed) {
        interruption?.let { throw IOException(it) }
        if (SystemClock.elapsedRealtime() - started >= SnoreEngine.MAX_SESSION_MS) break
        // Keep cancellation and the capture watchdog reachable even if input stalls.
        val size = recorder.read(block, 0, block.size, AudioRecord.READ_NON_BLOCKING)
        if (size < 0) throw IOException("Microphone recording stopped (code $size). This night did not count.")
        if (size == 0) {
          if (SystemClock.elapsedRealtime() - lastCapture > 3000) {
            throw IOException("The microphone stopped delivering audio. This night did not count.")
          }
          Thread.sleep(IDLE_READ_DELAY_MS)
          continue
        }
        lastCapture = SystemClock.elapsedRealtime()
        capturedSamples += size
        val dbfs = loudest.add(block, size)
        SnoreEngine.captured(size, dbfs)
        var offset = 0
        while (offset < size) {
          val copied = minOf(size - offset, window.size - windowSize)
          block.copyInto(window, windowSize, offset, offset + copied)
          windowSize += copied
          offset += copied
          if (windowSize == window.size) {
            val result = classifier.classify(window)
            SnoreEngine.analyzed(windowSize, result.snoreConfidence, result.noisy, result.dbfs)
            windowSize = 0
          }
        }
        val now = SystemClock.elapsedRealtime()
        if (now - lastCheckpoint >= 10_000) {
          val capturedMilliseconds = capturedSamples * 1000 / SnoreEngine.SAMPLE_RATE
          if (now - started >= 30_000 && capturedMilliseconds.toDouble() / (now - started) < 0.90) {
            throw IOException("The phone could not keep up with audio capture. This night did not count.")
          }
          persistClip(id, loudest)
          lastCheckpoint = now
        }
      }
      if (destroyed && !SnoreEngine.stopRequested) {
        interrupted = true
        message = "Background listening was interrupted. This night did not count."
      }
    } catch (failure: Exception) {
      interrupted = failure !is NightCancelledException
      message = if (interrupted) failure.message ?: "Listening was interrupted. This night did not count." else null
    } finally {
      if (callbackRegistered) audioManager.unregisterAudioRecordingCallback(recordingCallback)
      try { recorder?.stop() } catch (_: Exception) { }
      recorder?.release()
      classifier?.close()
      try {
        id?.let { persistClip(it, loudest) }
      } catch (failure: Exception) {
        interrupted = true
        message = "Could not save the audio clip. Free device storage before the next night."
      }
      SnoreEngine.finish(id, interrupted, message)
      completed.set(true)
      wakeLock?.let { if (it.isHeld) it.release() }
      ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
      stopSelf()
    }
  }

  private fun persistClip(id: String, loudest: LoudestClip) {
    val file = loudest.save(SnoreEngine.clipFile(id))
    SnoreEngine.checkpoint(id, file, loudest.seconds, loudest.dbfs, loudest.waveform())
  }

  override fun onDestroy() {
    destroyed = true
    isRunning = false
    wakeLock?.let { if (it.isHeld) it.release() }
    if (!completed.get() && !SnoreEngine.stopRequested) {
      interruption = "Background listening was interrupted. This night did not count."
    }
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null
}
