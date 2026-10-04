import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const modelUrl =
  'https://storage.googleapis.com/download.tensorflow.org/models/tflite/task_library/audio_classification/android/lite-model_yamnet_classification_tflite_1.tflite';
const expectedHash = '10c95ea3eb9a7bb4cb8bddf6feb023250381008177ac162ce169694d05c317de';
const modelPath = fileURLToPath(new URL('../assets/models/yamnet.tflite', import.meta.url));

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

let current;
try {
  current = await readFile(modelPath);
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
}

if (current && hash(current) === expectedHash) {
  console.log('Bundled YAMNet model verified.');
} else {
  const response = await fetch(modelUrl);
  if (!response.ok) throw new Error(`Model download failed: HTTP ${response.status}.`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (hash(bytes) !== expectedHash || bytes.subarray(4, 8).toString() !== 'TFL3') {
    throw new Error('Model checksum or format mismatch. The audited artifact was not replaced.');
  }
  await mkdir(fileURLToPath(new URL('../assets/models/', import.meta.url)), { recursive: true });
  await writeFile(`${modelPath}.download`, bytes);
  await rename(`${modelPath}.download`, modelPath);
  console.log('Downloaded and verified the audited YAMNet model.');
}
