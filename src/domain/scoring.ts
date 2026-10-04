import type {
  NightMetrics,
  NightMetricsInput,
  SoundWindowClassification,
  SoundWindowInput,
} from './types';

export const NIGHT_RULES = Object.freeze({
  sampleRate: 16_000,
  windowSamples: 15_600,
  windowSeconds: 0.975,
  minimumDurationSeconds: 30 * 60,
  minimumAnalysisCoverage: 0.9,
  maximumNoiseFraction: 0.3,
  snoringConfidenceThreshold: 0.35,
  noiseConfidenceThreshold: 0.35,
  maximumClippedSampleFraction: 0.01,
  loudestClipSeconds: 10,
});

export const EXCLUSION_REASONS = Object.freeze({
  tooShort: 'Recorded less than 30 minutes.',
  tooNoisy: 'Background noise covered more than 30% of analyzed audio.',
  lowCoverage: 'Less than 90% of recorded audio was analyzed.',
  interrupted: 'Listening was interrupted.',
});

function nonNegative(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function classifySoundWindow(input: SoundWindowInput): SoundWindowClassification {
  const isNoisy =
    Math.max(
      nonNegative(input.speechConfidence),
      nonNegative(input.musicConfidence),
      nonNegative(input.televisionConfidence),
    ) >= NIGHT_RULES.noiseConfidenceThreshold ||
    nonNegative(input.clippedSampleFraction) > NIGHT_RULES.maximumClippedSampleFraction;

  return {
    isNoisy,
    isSnoring:
      !isNoisy && nonNegative(input.snoringConfidence) >= NIGHT_RULES.snoringConfidenceThreshold,
  };
}

export function getEligibilityReasons(input: NightMetricsInput): string[] {
  const duration = nonNegative(input.durationSeconds);
  const analyzed = nonNegative(input.analyzedSeconds);
  const noisy = nonNegative(input.noisySeconds);
  const reasons: string[] = [];

  if (duration < NIGHT_RULES.minimumDurationSeconds) {
    reasons.push(EXCLUSION_REASONS.tooShort);
  }
  if (analyzed > 0 && noisy / analyzed > NIGHT_RULES.maximumNoiseFraction) {
    reasons.push(EXCLUSION_REASONS.tooNoisy);
  }
  if (duration === 0 || analyzed / duration < NIGHT_RULES.minimumAnalysisCoverage) {
    reasons.push(EXCLUSION_REASONS.lowCoverage);
  }
  if (input.interrupted) {
    reasons.push(EXCLUSION_REASONS.interrupted);
  }

  return reasons;
}

export function calculateNightMetrics(input: NightMetricsInput): NightMetrics {
  const analyzed = nonNegative(input.analyzedSeconds);
  const snoring = nonNegative(input.snoringSeconds);
  const score = analyzed > 0 ? Math.round(Math.min(1, snoring / analyzed) * 100) : 0;
  const exclusionReasons = getEligibilityReasons(input);

  return { score, eligible: exclusionReasons.length === 0, exclusionReasons };
}
