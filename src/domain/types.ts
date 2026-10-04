export interface NightSession {
  id: string;
  startedAt: number;
  endedAt: number;
  durationSeconds: number;
  snoringSeconds: number;
  noisySeconds: number;
  analyzedSeconds: number;
  score: number;
  eligible: boolean;
  exclusionReasons: string[];
  loudestClipUri: string | null;
  loudestClipSeconds: number;
  loudestDbfs: number | null;
  interrupted: boolean;
  waveform: number[];
  source: 'recorded' | 'demo';
}

export interface ActiveNight {
  id: string;
  startedAt: number;
  durationSeconds: number;
  snoringSeconds: number;
  noisySeconds: number;
  analyzedSeconds: number;
  currentDbfs: number;
  lastSnoringConfidence: number;
  waveform: number[];
}

export interface EngineState {
  status: 'idle' | 'starting' | 'recording' | 'stopping' | 'error';
  active: ActiveNight | null;
  error: string | null;
}

export type NightMetricsInput = Pick<
  NightSession,
  'durationSeconds' | 'snoringSeconds' | 'noisySeconds' | 'analyzedSeconds' | 'interrupted'
>;

export type NightMetrics = Pick<NightSession, 'score' | 'eligible' | 'exclusionReasons'>;

export interface SoundWindowInput {
  snoringConfidence: number;
  speechConfidence: number;
  musicConfidence: number;
  televisionConfidence: number;
  clippedSampleFraction: number;
}

export interface SoundWindowClassification {
  isSnoring: boolean;
  isNoisy: boolean;
}

export interface WeekDay {
  key: string;
  date: Date;
  label: string;
  shortLabel: string;
  isToday: boolean;
}
