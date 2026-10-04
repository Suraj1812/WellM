package expo.modules.wellmsnore

import android.util.AtomicFile
import java.io.File
import java.nio.ByteBuffer
import java.nio.ByteOrder

internal class LoudestClip {
  companion object {
    const val READ_SAMPLES = 1600
    const val CLIP_SAMPLES = SnoreEngine.SAMPLE_RATE * 10
  }
  private val ring = ShortArray(CLIP_SAMPLES + READ_SAMPLES)
  private var count = 0L
  private var energy = 0.0
  private var bestEnergy = -1.0
  private var best = ShortArray(0)
  private var revision = 0L
  private var savedRevision = -1L

  val seconds: Double get() = best.size.toDouble() / SnoreEngine.SAMPLE_RATE
  val dbfs: Double? get() = if (best.isEmpty()) null else rmsDbfs(best.sumOf { it.toDouble() * it } / best.size / (32768.0 * 32768.0))

  fun add(samples: ShortArray, size: Int): Double {
    require(size <= READ_SAMPLES)
    var candidateEnd = -1L
    var candidateSize = 0
    var blockEnergy = 0.0
    for (index in 0 until size) {
      val sample = samples[index]
      if (count >= CLIP_SAMPLES) {
        val old = ring[((count - CLIP_SAMPLES) % ring.size).toInt()].toDouble()
        energy -= old * old
      }
      ring[(count % ring.size).toInt()] = sample
      val squared = sample.toDouble() * sample
      energy += squared
      blockEnergy += squared
      count++
      if (count < CLIP_SAMPLES) {
        candidateEnd = count
        candidateSize = count.toInt()
      } else if (energy > bestEnergy) {
        bestEnergy = energy
        candidateEnd = count
        candidateSize = CLIP_SAMPLES
      }
    }
    if (candidateEnd >= 0) {
      val beginning = candidateEnd - candidateSize
      best = ShortArray(candidateSize) { ring[((beginning + it) % ring.size).toInt()] }
      revision++
    }
    return rmsDbfs(blockEnergy / size / (32768.0 * 32768.0))
  }

  fun waveform(): List<Double> {
    if (best.isEmpty()) return emptyList()
    return (0 until 40).map { bar ->
      val start = bar * best.size / 40
      val end = ((bar + 1) * best.size / 40).coerceAtLeast(start + 1).coerceAtMost(best.size)
      var sum = 0.0
      for (index in start until end) sum += best[index].toDouble() * best[index]
      ((rmsDbfs(sum / (end - start) / (32768.0 * 32768.0)) + 72) / 72).coerceIn(0.0, 1.0)
    }
  }

  fun save(file: File): File? {
    if (best.isEmpty()) return null
    if (revision == savedRevision && file.exists()) return file
    val dataBytes = best.size * 2
    val header = ByteBuffer.allocate(44).order(ByteOrder.LITTLE_ENDIAN).apply {
      put("RIFF".toByteArray(Charsets.US_ASCII)); putInt(36 + dataBytes)
      put("WAVEfmt ".toByteArray(Charsets.US_ASCII)); putInt(16)
      putShort(1); putShort(1); putInt(SnoreEngine.SAMPLE_RATE)
      putInt(SnoreEngine.SAMPLE_RATE * 2); putShort(2); putShort(16)
      put("data".toByteArray(Charsets.US_ASCII)); putInt(dataBytes)
    }.array()
    val pcm = ByteBuffer.allocate(dataBytes).order(ByteOrder.LITTLE_ENDIAN)
    best.forEach { pcm.putShort(it) }
    val atomic = AtomicFile(file)
    val stream = atomic.startWrite()
    try {
      stream.write(header)
      stream.write(pcm.array())
      atomic.finishWrite(stream)
      savedRevision = revision
    } catch (error: Exception) {
      atomic.failWrite(stream)
      throw error
    }
    return file
  }
}
