/* Microphone PCM is transferred locally to the app. Output remains silent. */
class WellMRecorder extends AudioWorkletProcessor {
  constructor() {
    super();
    this.samples = new Float32Array(Math.round(sampleRate / 10));
    this.offset = 0;
    this.port.onmessage = ({ data }) => {
      if (data === 'flush') {
        if (this.offset > 0) {
          const tail = this.samples.slice(0, this.offset);
          this.port.postMessage({ samples: tail, frame: currentFrame }, [tail.buffer]);
          this.offset = 0;
        }
        this.port.postMessage({ flushed: true });
      }
    };
  }

  process(inputs) {
    const channels = inputs[0];
    if (!channels || channels.length === 0) return true;
    for (let i = 0; i < channels[0].length; i++) {
      let sample = 0;
      for (const channel of channels) sample += channel[i];
      this.samples[this.offset++] = sample / channels.length;
      if (this.offset === this.samples.length) {
        const samples = this.samples;
        this.port.postMessage({ samples, frame: currentFrame + i }, [samples.buffer]);
        this.samples = new Float32Array(Math.round(sampleRate / 10));
        this.offset = 0;
      }
    }
    return true;
  }
}

registerProcessor('wellm-recorder', WellMRecorder);
