# Bundled YAMNet model

The app ships Google's public YAMNet AudioSet classification model. It runs locally. No model download happens while using the app.

- Artifact: `yamnet.tflite`
- Source: https://storage.googleapis.com/download.tensorflow.org/models/tflite/task_library/audio_classification/android/lite-model_yamnet_classification_tflite_1.tflite
- SHA-256: `10c95ea3eb9a7bb4cb8bddf6feb023250381008177ac162ce169694d05c317de`
- Input: float32 `[15600]`, mono samples scaled to `[-1, 1]`, at 16,000 Hz.
- Output: float32 `[1, 521]`, one AudioSet score per category.
- Label file: `yamnet_label_list.txt`, embedded in the model's ZIP metadata.
- Used labels: Snoring index 38, Speech index 0, Music index 132, Television index 518.
- No custom TensorFlow Lite operators are present in this artifact.
- License: Apache License 2.0; a copy is included as `YAMNET-LICENSE.txt`.

Model provenance and implementation: https://github.com/tensorflow/models/tree/master/research/audioset/yamnet

Run `node scripts/download-model.mjs` to verify the checked-in model or restore the exact artifact if missing. A changed upstream artifact is rejected by its checksum.

YAMNet classifies general sound events. It does not diagnose snoring, sleep apnea, sleep quality, or health conditions. Playback volume, microphone placement, background sound, and a bed partner can affect its predictions. Scores are general model confidences and are not calibrated medical probabilities.
