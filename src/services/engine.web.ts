import {
  CompiledModel,
  type LiteRt,
  Tensor,
  getGlobalLiteRtPromise,
  loadAndCompile,
  loadLiteRt,
} from '@litertjs/core';
import { calculateNightMetrics, classifySoundWindow, NIGHT_RULES } from '../domain/scoring';
import type { ActiveNight, EngineState, NightSession } from '../domain/types';
import { encodePcmWav, LoudestAudioClip, PcmResampler, waveformLevel } from './browserAudio';
import { BrowserNightStore, type StoredNight } from './browserStore';
import { waitForMicrophone } from './browserPermission';
import { ensureLocalRuntime, type RuntimeLoadCache } from './browserRuntime';

const MODEL_CHECKSUM = '10c95ea3eb9a7bb4cb8bddf6feb023250381008177ac162ce169694d05c317de';
const ENGINE_LOCK = 'wellm-microphone-session';
const store = new BrowserNightStore();
const browserGlobal = globalThis as typeof globalThis & {
  __wellmBrowserSnoreEngine?: BrowserSnoreEngine;
  __wellmLiteRtLoad?: RuntimeLoadCache<LiteRt>;
};
const runtimeCache = (browserGlobal.__wellmLiteRtLoad ??= {});

function browserSupport() {
  if (typeof window === 'undefined') throw new Error('Listening starts after the page opens.');
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
    throw new Error('Open WellM over HTTPS or localhost to use your microphone.');
  }
  if (!window.AudioContext || !window.AudioWorkletNode || !navigator.locks) {
    throw new Error('Use a current Chrome, Edge, Firefox, or Safari browser to listen locally.');
  }
}

function message(error: unknown): string {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'Allow microphone access for this page, then start listening again.';
  }
  if (error instanceof DOMException && error.name === 'NotFoundError') {
    return 'No microphone was found. Connect a microphone and try again.';
  }
  return error instanceof Error ? error.message : 'Browser listening could not continue.';
}

class BrowserSnoreEngine {
  private state: EngineState = { status: 'idle', active: null, error: null };
  private stream: MediaStream | null = null;
  private context: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private recorder: AudioWorkletNode | null = null;
  private model: CompiledModel | null = null;
  private resampler: PcmResampler | null = null;
  private clip = new LoudestAudioClip();
  private capturedSamples = 0;
  private modelWindow = new Float32Array(NIGHT_RULES.windowSamples);
  private windowOffset = 0;
  private queue: Float32Array[] = [];
  private analyzing: Promise<void> | null = null;
  private interrupted = false;
  private automaticStopMessage: string | null = null;
  private stopPromise: Promise<NightSession> | null = null;
  private releaseLock: (() => void) | null = null;
  private initialized: Promise<void> | null = null;
  private checkpointTask: Promise<void> | null = null;
  private checkpointTimer: ReturnType<typeof setInterval> | null = null;
  private watchdog: ReturnType<typeof setInterval> | null = null;
  private permissionTimer: ReturnType<typeof setTimeout> | null = null;
  private lastAudioAt = 0;
  private lastAudioFrame: number | null = null;
  private flush: (() => void) | null = null;

  private async initialize(): Promise<void> {
    if (typeof window === 'undefined') return;
    if (!this.initialized) {
      this.initialized = (async () => {
        if (navigator.locks) {
          await navigator.locks.request(ENGINE_LOCK, { ifAvailable: true }, async (lock) => {
            if (lock) await store.recoverInterruptedNight();
          });
        }
      })().catch((error) => {
        this.initialized = null;
        throw error;
      });
    }
    await this.initialized;
  }

  async requestMicrophonePermission(): Promise<boolean> {
    browserSupport();
    if (this.stream?.getAudioTracks().some((track) => track.readyState === 'live')) return true;
    try {
      this.stream = await waitForMicrophone(
        navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: false,
            noiseSuppression: false,
            autoGainControl: false,
          },
          video: false,
        }),
      );
    } catch (error) {
      throw new Error(message(error));
    }
    // A permission request should not leave a microphone open if start is abandoned.
    this.permissionTimer = setTimeout(() => {
      if (this.state.status === 'idle' || this.state.status === 'error') this.releaseCapture();
    }, 15_000);
    return true;
  }

  async getState(): Promise<EngineState> {
    return {
      ...this.state,
      active: this.state.active
        ? { ...this.state.active, waveform: [...this.state.active.waveform] }
        : null,
    };
  }

  async getNights(): Promise<NightSession[]> {
    await this.initialize();
    if (typeof window === 'undefined') return [];
    return store.getNights();
  }

  private async acquireLock(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      void navigator.locks
        .request(ENGINE_LOCK, { ifAvailable: true }, async (lock) => {
          if (!lock) {
            reject(new Error('Another WellM tab is listening. Finish that recording first.'));
            return;
          }
          await new Promise<void>((release) => {
            this.releaseLock = release;
            resolve();
          });
        })
        .catch(reject);
    });
  }

  private async loadModel(): Promise<void> {
    if (this.model) return;
    await ensureLocalRuntime(
      getGlobalLiteRtPromise,
      () => loadLiteRt('/wellm-audio/'),
      runtimeCache,
    );
    const response = await fetch('/wellm-audio/yamnet.tflite');
    if (!response.ok)
      throw new Error('The local YAMNet model is unavailable. Reload WellM and try again.');
    const bytes = await response.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const checksum = Array.from(new Uint8Array(digest), (value) =>
      value.toString(16).padStart(2, '0'),
    ).join('');
    if (checksum !== MODEL_CHECKSUM)
      throw new Error('The local YAMNet model failed its integrity check.');
    const model = await loadAndCompile(new Uint8Array(bytes), {
      accelerator: 'wasm',
      cpuOptions: { numThreads: 1 },
    });
    const input = model.getInputDetails();
    const output = model.getOutputDetails();
    if (
      input.length !== 1 ||
      input[0].dtype !== 'float32' ||
      input[0].shape.reduce((a, b) => a * b, 1) !== NIGHT_RULES.windowSamples ||
      output.length !== 1 ||
      output[0].dtype !== 'float32' ||
      output[0].shape.reduce((a, b) => a * b, 1) !== 521
    ) {
      model.delete();
      throw new Error('YAMNet does not match the audited audio input and output.');
    }
    const probe = new Tensor(new Float32Array(NIGHT_RULES.windowSamples), [
      NIGHT_RULES.windowSamples,
    ]);
    let outputs: Tensor[] = [];
    try {
      outputs = await model.run(probe);
      const scores = outputs[0]?.toTypedArray();
      if (!scores || scores.length !== 521 || !Array.from(scores).every(Number.isFinite)) {
        throw new Error('YAMNet could not analyze audio in this browser.');
      }
      this.model = model;
    } catch (error) {
      model.delete();
      throw error;
    } finally {
      probe.delete();
      for (const output of outputs) output.delete();
    }
  }

  async startNight(): Promise<EngineState> {
    if (this.state.active || this.state.status === 'starting') return this.getState();
    this.state = { status: 'starting', active: null, error: null };
    try {
      browserSupport();
      await this.initialize();
      await this.acquireLock();
      await store.recoverInterruptedNight();
      if (!this.stream) await this.requestMicrophonePermission();
      if (this.permissionTimer) clearTimeout(this.permissionTimer);
      this.permissionTimer = null;
      // Create/resume before loading WASM to retain the initiating user gesture.
      try {
        this.context = new AudioContext({ sampleRate: NIGHT_RULES.sampleRate });
      } catch {
        this.context = new AudioContext();
      }
      await this.context.resume();
      await this.loadModel();
      await this.context.audioWorklet.addModule('/wellm-recorder-worklet.js');
      if (document.hidden) throw new Error('Keep WellM visible to start browser listening.');
      this.clip = new LoudestAudioClip();
      this.capturedSamples = 0;
      this.modelWindow = new Float32Array(NIGHT_RULES.windowSamples);
      this.windowOffset = 0;
      this.queue = [];
      this.interrupted = false;
      this.automaticStopMessage = null;
      this.stopPromise = null;
      this.lastAudioAt = Date.now();
      this.lastAudioFrame = null;
      this.resampler = new PcmResampler(this.context.sampleRate);
      const startedAt = Date.now();
      const active: ActiveNight = {
        id: `browser-${crypto.randomUUID()}`,
        startedAt,
        durationSeconds: 0,
        analyzedSeconds: 0,
        snoringSeconds: 0,
        noisySeconds: 0,
        currentDbfs: -96,
        lastSnoringConfidence: 0,
        waveform: [],
      };
      this.state = { status: 'recording', active, error: null };
      // Confirm local storage works before recording any PCM.
      await store.checkpoint(this.snapshot());
      this.source = this.context.createMediaStreamSource(this.stream!);
      this.recorder = new AudioWorkletNode(this.context, 'wellm-recorder', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
      });
      this.recorder.port.onmessage = ({
        data,
      }: MessageEvent<{ samples?: Float32Array; frame?: number; flushed?: boolean }>) => {
        if (data.flushed) {
          this.flush?.();
          return;
        }
        if (
          data.samples &&
          (this.state.status === 'recording' || this.state.status === 'stopping')
        ) {
          if (data.frame !== undefined && this.lastAudioFrame !== null) {
            const gap = data.frame - this.lastAudioFrame;
            if (gap > this.context!.sampleRate * 0.3) this.interrupted = true;
          }
          this.lastAudioFrame = data.frame ?? null;
          this.lastAudioAt = Date.now();
          this.consume(this.resampler!.process(data.samples));
        }
      };
      this.recorder.onprocessorerror = () =>
        this.interrupt('The browser audio processor stopped. Your recorded audio was saved.');
      this.source.connect(this.recorder);
      this.recorder.connect(this.context.destination);
      this.context.onstatechange = () => {
        if (this.state.status === 'recording' && this.context?.state !== 'running') {
          this.interrupt(
            'The browser suspended microphone listening. Your session was saved as interrupted.',
          );
        }
      };
      for (const track of this.stream!.getAudioTracks())
        track.onended = () =>
          this.interrupt('Microphone access ended. Your session was saved as interrupted.');
      document.addEventListener('visibilitychange', this.visibilityChanged);
      window.addEventListener('pagehide', this.pageHidden);
      this.checkpointTimer = setInterval(() => this.saveCheckpoint(), 5000);
      this.watchdog = setInterval(() => {
        if (this.state.status === 'recording' && Date.now() - this.lastAudioAt > 3000) {
          this.interrupt(
            'The microphone stopped delivering audio. Your session was saved as interrupted.',
          );
        }
      }, 1000);
      return this.getState();
    } catch (error) {
      this.releaseCapture();
      if (this.state.active && this.capturedSamples === 0)
        await store.discardCheckpoint().catch(() => {});
      this.releaseLock?.();
      this.releaseLock = null;
      this.state = { status: 'error', active: null, error: message(error) };
      return this.getState();
    }
  }

  private consume(samples: Float32Array): void {
    const active = this.state.active;
    if (!active || samples.length === 0) return;
    this.capturedSamples += samples.length;
    active.durationSeconds = this.capturedSamples / NIGHT_RULES.sampleRate;
    active.currentDbfs = this.clip.add(samples);
    active.waveform.push(waveformLevel(active.currentDbfs));
    if (active.waveform.length > 48) active.waveform.shift();
    let offset = 0;
    while (offset < samples.length) {
      const length = Math.min(
        samples.length - offset,
        NIGHT_RULES.windowSamples - this.windowOffset,
      );
      this.modelWindow.set(samples.subarray(offset, offset + length), this.windowOffset);
      offset += length;
      this.windowOffset += length;
      if (this.windowOffset === NIGHT_RULES.windowSamples) {
        // A slow device gets honest lower analysis coverage, never unlimited PCM storage.
        if (this.queue.length < 4) this.queue.push(this.modelWindow);
        this.modelWindow = new Float32Array(NIGHT_RULES.windowSamples);
        this.windowOffset = 0;
      }
    }
    this.analyze();
  }

  private analyze(): void {
    if (this.analyzing || this.queue.length === 0) return;
    this.analyzing = (async () => {
      while (this.queue.length && this.state.active) {
        const samples = this.queue.shift()!;
        const input = new Tensor(samples, [NIGHT_RULES.windowSamples]);
        let outputs: Tensor[] = [];
        try {
          outputs = await this.model!.run(input);
          const scores = outputs[0].toTypedArray();
          if (scores.length !== 521 || !Array.from(scores).every(Number.isFinite)) {
            throw new Error('YAMNet returned invalid model scores.');
          }
          const active = this.state.active;
          if (!active) return;
          let clipped = 0;
          for (const sample of samples) if (Math.abs(sample) >= 32760 / 32768) clipped++;
          const classification = classifySoundWindow({
            snoringConfidence: scores[38],
            speechConfidence: scores[0],
            musicConfidence: scores[132],
            televisionConfidence: scores[518],
            clippedSampleFraction: clipped / samples.length,
          });
          active.analyzedSeconds += NIGHT_RULES.windowSeconds;
          active.lastSnoringConfidence = scores[38];
          if (classification.isSnoring) active.snoringSeconds += NIGHT_RULES.windowSeconds;
          if (classification.isNoisy) active.noisySeconds += NIGHT_RULES.windowSeconds;
        } finally {
          input.delete();
          for (const output of outputs) output.delete();
        }
      }
    })()
      .catch((error) => {
        this.queue = [];
        this.interrupt(
          `Audio analysis stopped: ${message(error)} Your session was saved as interrupted.`,
        );
      })
      .finally(() => {
        this.analyzing = null;
        if (this.queue.length) this.analyze();
      });
  }

  private snapshot(): StoredNight {
    const active = this.state.active;
    if (!active) throw new Error('No listening session is active.');
    const night: NightSession = {
      id: active.id,
      startedAt: active.startedAt,
      endedAt: Date.now(),
      durationSeconds: active.durationSeconds,
      analyzedSeconds: active.analyzedSeconds,
      snoringSeconds: active.snoringSeconds,
      noisySeconds: active.noisySeconds,
      interrupted: this.interrupted,
      waveform: this.clip.waveform(),
      source: 'recorded',
      loudestClipUri: null,
      loudestClipSeconds: this.clip.samples.length / NIGHT_RULES.sampleRate,
      loudestDbfs: this.clip.dbfs,
      ...calculateNightMetrics({ ...active, interrupted: this.interrupted }),
    };
    return { night, clip: this.clip.samples.length ? encodePcmWav(this.clip.samples) : null };
  }

  private saveCheckpoint(): void {
    if (this.checkpointTask || !this.state.active) return;
    this.checkpointTask = store
      .checkpoint(this.snapshot())
      .catch((error) => {
        this.interrupt(`Local saving stopped: ${message(error)}`);
      })
      .finally(() => {
        this.checkpointTask = null;
      });
  }

  private visibilityChanged = () => {
    if (document.hidden)
      this.interrupt(
        'Browser listening stops when this page is hidden or the screen locks. This session was saved as interrupted. Use the Android app for overnight listening.',
      );
  };

  private pageHidden = () => {
    this.interrupted = true;
    this.saveCheckpoint();
    this.interrupt('The browser page closed. This session was saved as interrupted.');
    this.releaseCapture();
  };

  private interrupt(reason: string): void {
    if (this.state.status !== 'recording') return;
    this.interrupted = true;
    this.automaticStopMessage = reason;
    void this.stopNight().catch((error) => {
      this.state.error = `${reason} ${message(error)}`;
    });
  }

  private releaseCapture(): void {
    if (this.checkpointTimer) clearInterval(this.checkpointTimer);
    if (this.watchdog) clearInterval(this.watchdog);
    if (this.permissionTimer) clearTimeout(this.permissionTimer);
    this.checkpointTimer = null;
    this.watchdog = null;
    this.permissionTimer = null;
    if (typeof document !== 'undefined')
      document.removeEventListener('visibilitychange', this.visibilityChanged);
    if (typeof window !== 'undefined') window.removeEventListener('pagehide', this.pageHidden);
    if (this.recorder) {
      this.recorder.port.onmessage = null;
      this.recorder.port.close();
    }
    this.source?.disconnect();
    this.recorder?.disconnect();
    if (this.context) {
      this.context.onstatechange = null;
      void this.context.close().catch(() => {});
    }
    for (const track of this.stream?.getTracks() ?? []) {
      track.onended = null;
      track.stop();
    }
    this.source = null;
    this.recorder = null;
    this.context = null;
    this.stream = null;
  }

  async stopNight(): Promise<NightSession> {
    if (this.stopPromise) return this.stopPromise;
    if (!this.state.active) throw new Error('There is no active session to finish.');
    this.state.status = 'stopping';
    this.stopPromise = (async () => {
      if (this.recorder && this.context?.state === 'running') {
        await new Promise<void>((resolve) => {
          const timer = setTimeout(() => {
            this.flush = null;
            resolve();
          }, 300);
          this.flush = () => {
            clearTimeout(timer);
            this.flush = null;
            resolve();
          };
          this.recorder!.port.postMessage('flush');
        });
      }
      this.releaseCapture();
      // Drain every complete queued window; incomplete final audio is not claimed analyzed.
      while (this.analyzing) await this.analyzing;
      if (this.checkpointTask) await this.checkpointTask;
      const record = this.snapshot();
      try {
        const night = await store.finish(record);
        this.state = { status: 'idle', active: null, error: this.automaticStopMessage };
        return night;
      } catch (error) {
        this.state.status = 'error';
        this.state.error = `Recording ended, but local saving failed: ${message(error)}. Retry finishing to save it.`;
        throw new Error(this.state.error);
      } finally {
        this.releaseLock?.();
        this.releaseLock = null;
      }
    })();
    try {
      return await this.stopPromise;
    } catch (error) {
      this.stopPromise = null;
      throw error;
    }
  }

  async deleteNight(id: string): Promise<void> {
    await store.deleteNight(id);
  }
  async deleteAllNights(): Promise<void> {
    await store.deleteAllNights();
  }
}

// Fast Refresh must not orphan an active microphone, WASM model, or browser lock.
export const nativeEngine =
  typeof window === 'undefined'
    ? new BrowserSnoreEngine()
    : (browserGlobal.__wellmBrowserSnoreEngine ??= new BrowserSnoreEngine());
// Reuse capture state while installing current methods after Fast Refresh.
// Keeping only the instance would retain an old loadModel implementation.
if (typeof window !== 'undefined') {
  Object.setPrototypeOf(nativeEngine, BrowserSnoreEngine.prototype);
}
export async function requestMicrophone(): Promise<boolean> {
  return nativeEngine.requestMicrophonePermission();
}
