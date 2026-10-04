package expo.modules.wellmsnore

import android.content.Context
import org.tensorflow.lite.DataType
import org.tensorflow.lite.Interpreter
import java.io.Closeable
import java.io.FileInputStream
import java.nio.ByteBuffer
import java.nio.ByteOrder
import java.nio.channels.FileChannel
import kotlin.math.abs
import kotlin.math.log10
import kotlin.math.sqrt

internal class YamNetClassifier(context: Context) : Closeable {
  private val interpreter: Interpreter
  private val input = ByteBuffer.allocateDirect(SnoreEngine.MODEL_SAMPLES * 4).order(ByteOrder.nativeOrder())
  private val output = arrayOf(FloatArray(521))

  init {
    val model = context.assets.openFd("yamnet.tflite").use { descriptor ->
      FileInputStream(descriptor.fileDescriptor).use { stream ->
        stream.channel.map(FileChannel.MapMode.READ_ONLY, descriptor.startOffset, descriptor.declaredLength)
      }
    }
    interpreter = Interpreter(model, Interpreter.Options().setNumThreads(2))
    val inputTensor = interpreter.getInputTensor(0)
    val outputTensor = interpreter.getOutputTensor(0)
    check(inputTensor.dataType() == DataType.FLOAT32 && inputTensor.numElements() == SnoreEngine.MODEL_SAMPLES) {
      "The bundled YAMNet input does not match the audited 15,600-sample model."
    }
    check(outputTensor.dataType() == DataType.FLOAT32 && outputTensor.numElements() == 521) {
      "The bundled YAMNet AudioSet labels do not match this app."
    }
  }

  data class Classification(val snoreConfidence: Double, val noisy: Boolean, val dbfs: Double)

  fun classify(samples: ShortArray): Classification {
    require(samples.size == SnoreEngine.MODEL_SAMPLES)
    input.clear()
    var squared = 0.0
    var clipped = 0
    for (sample in samples) {
      val value = sample.toFloat() / 32768f
      input.putFloat(value)
      squared += value.toDouble() * value
      if (abs(sample.toInt()) >= 32760) clipped++
    }
    input.rewind()
    interpreter.run(input, output)
    val scores = output[0]
    val noisy = maxOf(scores[0], scores[132], scores[518]) >= 0.35f || clipped.toDouble() / samples.size > 0.01
    return Classification(scores[38].toDouble(), noisy, rmsDbfs(squared / samples.size))
  }

  override fun close() = interpreter.close()
}

internal fun rmsDbfs(meanSquare: Double): Double = if (meanSquare <= 0.0) -96.0
else (20 * log10(sqrt(meanSquare))).coerceAtLeast(-96.0)
