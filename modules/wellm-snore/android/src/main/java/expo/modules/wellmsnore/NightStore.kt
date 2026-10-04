package expo.modules.wellmsnore

import android.content.Context
import android.util.AtomicFile
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

internal class NightStore(context: Context) {
  val directory = File(context.noBackupFilesDir, "wellm-nights").apply { mkdirs() }
  private val history = AtomicFile(File(directory, "nights.json"))
  private val checkpoint = AtomicFile(File(directory, "active.json"))

  fun readNights(): MutableList<JSONObject> {
    if (!exists(history)) return mutableListOf()
    val array = JSONArray(history.openRead().bufferedReader().use { it.readText() })
    return (0 until array.length()).map { array.getJSONObject(it) }.toMutableList()
  }

  fun readCheckpoint(): JSONObject? {
    if (!exists(checkpoint)) return null
    return JSONObject(checkpoint.openRead().bufferedReader().use { it.readText() })
  }

  fun saveCheckpoint(night: JSONObject) = write(checkpoint, night.toString())
  fun clearCheckpoint() = checkpoint.delete()

  fun saveNights(nights: List<JSONObject>) {
    val kept = nights.sortedByDescending { it.getLong("startedAt") }.take(90)
    write(history, JSONArray(kept).toString())
    val ids = kept.map { it.getString("id") }.toMutableSet()
    readCheckpoint()?.optString("id")?.let { ids.add(it) }
    directory.listFiles()?.filter {
      it.name.contains(".wav") && it.name.substringBefore(".wav") !in ids
    }?.forEach { deleteClip(it.name.substringBefore(".wav")) }
  }

  fun clipFile(id: String): File {
    require(id.matches(Regex("[a-zA-Z0-9-]+"))) { "Invalid night ID." }
    return File(directory, "$id.wav")
  }

  fun deleteClip(id: String) {
    val file = clipFile(id)
    AtomicFile(file).delete()
    if (file.exists() || File("${file.path}.bak").exists() || File("${file.path}.new").exists()) {
      throw IllegalStateException("Could not erase the saved audio clip.")
    }
  }

  fun eraseAll() {
    history.delete()
    checkpoint.delete()
    directory.listFiles()?.forEach {
      if (!it.delete()) throw IllegalStateException("Could not erase all saved night data.")
    }
  }

  private fun exists(file: AtomicFile): Boolean = file.baseFile.exists() || File("${file.baseFile.path}.bak").exists()

  private fun write(file: AtomicFile, text: String) {
    val output = file.startWrite()
    try {
      output.write(text.toByteArray(Charsets.UTF_8))
      file.finishWrite(output)
    } catch (error: Exception) {
      file.failWrite(output)
      throw error
    }
  }
}

internal fun JSONObject.asBridgeMap(): Map<String, Any?> = keys().asSequence().associateWith { key ->
  when (val value = get(key)) {
    JSONObject.NULL -> null
    is JSONObject -> value.asBridgeMap()
    is JSONArray -> value.asBridgeList()
    else -> value
  }
}

private fun JSONArray.asBridgeList(): List<Any?> = (0 until length()).map { index ->
  when (val value = get(index)) {
    JSONObject.NULL -> null
    is JSONObject -> value.asBridgeMap()
    is JSONArray -> value.asBridgeList()
    else -> value
  }
}
