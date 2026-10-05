import { NIGHT_RULES } from '../domain/scoring';

export function rmsDbfs(meanSquare: number): number {
  return meanSquare > 0 ? Math.max(-96, 10 * Math.log10(meanSquare)) : -96;
}

export function waveformLevel(dbfs: number): number {
  return Math.min(1, Math.max(0, (dbfs + 72) / 72));
}

/** Streaming area resampling: preserves fractional boundaries between worklet blocks. */
export class PcmResampler {
  private filled = 0;
  private energy = 0;
  private readonly ratio: number;

  constructor(inputRate: number, outputRate: number = NIGHT_RULES.sampleRate) {
    if (inputRate <= 0 || outputRate <= 0) throw new Error('Invalid audio sample rate.');
    this.ratio = inputRate / outputRate;
  }

  process(input: Float32Array): Float32Array {
    const output: number[] = [];
    for (const raw of input) {
      const sample = Number.isFinite(raw) ? Math.min(1, Math.max(-1, raw)) : 0;
      let remaining = 1;
      while (remaining > 1e-9) {
        const weight = Math.min(remaining, this.ratio - this.filled);
        this.energy += sample * weight;
        this.filled += weight;
        remaining -= weight;
        if (this.filled >= this.ratio - 1e-9) {
          output.push(this.energy / this.ratio);
          this.filled = 0;
          this.energy = 0;
        }
      }
    }
    return Float32Array.from(output);
  }
}

/** Bounded PCM storage; chooses the highest-energy contiguous ten-second window. */
export class LoudestAudioClip {
  private readonly clipSamples: number;
  private readonly ring: Float32Array;
  private count = 0;
  private rollingEnergy = 0;
  private bestEnergy = -1;
  private best = new Float32Array(0);

  constructor(
    sampleRate: number = NIGHT_RULES.sampleRate,
    seconds: number = NIGHT_RULES.loudestClipSeconds,
  ) {
    this.clipSamples = sampleRate * seconds;
    this.ring = new Float32Array(this.clipSamples + 8192);
  }

  add(samples: Float32Array): number {
    if (samples.length > 8192) throw new Error('Audio capture block is too large.');
    let candidateEnd = -1;
    let candidateSize = 0;
    let blockEnergy = 0;
    for (const sample of samples) {
      if (this.count >= this.clipSamples) {
        const old = this.ring[(this.count - this.clipSamples) % this.ring.length];
        this.rollingEnergy -= old * old;
      }
      this.ring[this.count % this.ring.length] = sample;
      this.rollingEnergy += sample * sample;
      blockEnergy += sample * sample;
      this.count++;
      if (this.count < this.clipSamples) {
        candidateEnd = this.count;
        candidateSize = this.count;
      } else if (this.rollingEnergy > this.bestEnergy) {
        this.bestEnergy = this.rollingEnergy;
        candidateEnd = this.count;
        candidateSize = this.clipSamples;
      }
    }
    if (candidateEnd >= 0) {
      const start = candidateEnd - candidateSize;
      this.best = Float32Array.from(
        { length: candidateSize },
        (_, i) => this.ring[(start + i) % this.ring.length],
      );
    }
    return rmsDbfs(samples.length ? blockEnergy / samples.length : 0);
  }

  get samples(): Float32Array {
    return this.best;
  }

  get dbfs(): number | null {
    if (!this.best.length) return null;
    const sum = this.best.reduce((value, sample) => value + sample * sample, 0);
    return rmsDbfs(sum / this.best.length);
  }

  waveform(): number[] {
    if (!this.best.length) return [];
    return Array.from({ length: 40 }, (_, i) => {
      const start = Math.floor((i * this.best.length) / 40);
      const end = Math.min(
        this.best.length,
        Math.max(start + 1, Math.floor(((i + 1) * this.best.length) / 40)),
      );
      let sum = 0;
      for (let j = start; j < end; j++) sum += this.best[j] * this.best[j];
      return waveformLevel(rmsDbfs(sum / (end - start)));
    });
  }
}

export function encodePcmWav(
  samples: Float32Array,
  sampleRate: number = NIGHT_RULES.sampleRate,
): Blob {
  const bytes = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(bytes);
  const ascii = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i++) view.setUint8(offset + i, value.charCodeAt(i));
  };
  ascii(0, 'RIFF');
  view.setUint32(4, bytes.byteLength - 8, true);
  ascii(8, 'WAVEfmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, 'data');
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const sample = Math.min(1, Math.max(-1, samples[i]));
    view.setInt16(44 + i * 2, Math.round(sample * (sample < 0 ? 32768 : 32767)), true);
  }
  return new Blob([bytes], { type: 'audio/wav' });
}
