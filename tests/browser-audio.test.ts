import assert from 'node:assert/strict';
import test from 'node:test';
import { encodePcmWav, LoudestAudioClip, PcmResampler } from '../src/services/browserAudio';

test('streaming 44.1 kHz resampling preserves sample count and block boundaries', () => {
  const input = Float32Array.from({ length: 44_100 }, (_, i) => Math.sin((i * Math.PI) / 91));
  const whole = new PcmResampler(44_100).process(input);
  const chunked = new PcmResampler(44_100);
  const output: number[] = [];
  for (let offset = 0; offset < input.length; offset += 127) {
    output.push(...chunked.process(input.subarray(offset, offset + 127)));
  }
  assert.equal(whole.length, 16_000);
  assert.deepEqual(Float32Array.from(output), whole);
});

test('the loudest clip uses a contiguous rolling window across block boundaries', () => {
  const audio = new LoudestAudioClip(100, 10);
  // Quiet 10 seconds, loud 10 seconds, then quiet 15 seconds.
  audio.add(new Float32Array(987).fill(0.1));
  audio.add(Float32Array.from({ length: 29 }, (_, i) => (i < 13 ? 0.1 : 0.8)));
  audio.add(new Float32Array(984).fill(0.8));
  audio.add(new Float32Array(1500).fill(0.1));
  assert.equal(audio.samples.length, 1000);
  assert.ok(audio.samples.every((value) => Math.abs(value - 0.8) < 1e-6));
  assert.ok(Math.abs(audio.dbfs! - 20 * Math.log10(0.8)) < 1e-5);
  assert.ok(audio.waveform().every((value) => value > 0.9));
});

test('short sessions retain captured samples and longer sessions cap the retained audio', () => {
  const audio = new LoudestAudioClip(100, 10);
  audio.add(new Float32Array(350).fill(0.3));
  assert.equal(audio.samples.length, 350);
  audio.add(new Float32Array(2000).fill(0.3));
  assert.equal(audio.samples.length, 1000);
});

test('the WAV clip has a seekable PCM header and signed, bounded samples', async () => {
  const clip = encodePcmWav(Float32Array.from([-1, 0, 1, 5]));
  const bytes = await clip.arrayBuffer();
  const view = new DataView(bytes);
  assert.equal(clip.type, 'audio/wav');
  assert.equal(new TextDecoder().decode(bytes.slice(0, 4)), 'RIFF');
  assert.equal(new TextDecoder().decode(bytes.slice(8, 12)), 'WAVE');
  assert.equal(view.getUint32(24, true), 16_000);
  assert.equal(view.getUint32(40, true), 8);
  assert.deepEqual(
    [44, 46, 48, 50].map((offset) => view.getInt16(offset, true)),
    [-32768, 0, 32767, 32767],
  );
});
