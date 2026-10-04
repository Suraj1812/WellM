package expo.modules.wellmsnore

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.log10
import kotlin.math.sqrt

class LoudestClipTest {
  @Test
  fun retainsTheExactLoudestWindowBetweenReadBoundaries() {
    val samples = ShortArray(340_000) { index ->
      if (index in 237 until 160_237) 20_000 else 100
    }
    val clip = capture(samples)
    assertEquals(10.0, clip.seconds, 0.0)
    assertEquals(20 * log10(20_000.0 / 32768), requireNotNull(clip.dbfs), 0.0000001)
    assertEquals(40, clip.waveform().size)
  }

  @Test
  fun comparesTenSecondWindowsAfterAnInitiallyLoudShortCapture() {
    val samples = ShortArray(480_000) { index ->
      when {
        index < 128_000 -> 30_000
        index < 160_000 -> 0
        else -> 10_000
      }
    }
    val clip = capture(samples)
    val expectedRms = sqrt(128_000 * 30_000.0 * 30_000 / 160_000)
    assertEquals(20 * log10(expectedRms / 32768), requireNotNull(clip.dbfs), 0.0000001)
    assertEquals(10.0, clip.seconds, 0.0)
  }

  @Test
  fun retainsAllSamplesWhenTheRecordingIsShorterThanTenSeconds() {
    val clip = capture(ShortArray(16_000) { 1000 })
    assertEquals(1.0, clip.seconds, 0.0)
    assertEquals(20 * log10(1000.0 / 32768), requireNotNull(clip.dbfs), 0.0000001)
    assertTrue(clip.waveform().all { it in 0.0..1.0 })
  }

  private fun capture(samples: ShortArray): LoudestClip = LoudestClip().apply {
    var offset = 0
    while (offset < samples.size) {
      val size = minOf(LoudestClip.READ_SAMPLES, samples.size - offset)
      add(samples.copyOfRange(offset, offset + size), size)
      offset += size
    }
  }
}
