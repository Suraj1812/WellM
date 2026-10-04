import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateNightMetrics,
  classifySoundWindow,
  EXCLUSION_REASONS,
  NIGHT_RULES,
  type NightMetricsInput,
  type SoundWindowInput,
} from '../src/domain/index';

const qualifyingNight: NightMetricsInput = {
  durationSeconds: 1800,
  analyzedSeconds: 1800,
  snoringSeconds: 360,
  noisySeconds: 0,
  interrupted: false,
};

const quietWindow: SoundWindowInput = {
  snoringConfidence: 0,
  speechConfidence: 0,
  musicConfidence: 0,
  televisionConfidence: 0,
  clippedSampleFraction: 0,
};

test('score measures snoring burden against analyzed audio, including noisy windows', () => {
  const metrics = calculateNightMetrics({
    ...qualifyingNight,
    durationSeconds: 7200,
    analyzedSeconds: 6480,
    snoringSeconds: 810,
    noisySeconds: 1200,
  });
  assert.equal(metrics.score, 13);
  assert.equal(metrics.eligible, true);
});

test('30 minutes, 90% coverage, and 30% noise are inclusive eligibility boundaries', () => {
  assert.deepEqual(
    calculateNightMetrics({
      ...qualifyingNight,
      analyzedSeconds: 1620,
      snoringSeconds: 324,
      noisySeconds: 486,
    }),
    { score: 20, eligible: true, exclusionReasons: [] },
  );
});

test('a short night keeps its score and is excluded with a specific reason', () => {
  const result = calculateNightMetrics({
    ...qualifyingNight,
    durationSeconds: 1799.99,
    analyzedSeconds: 1799,
  });
  assert.equal(result.score, 20);
  assert.equal(result.eligible, false);
  assert.deepEqual(result.exclusionReasons, [EXCLUSION_REASONS.tooShort]);
});

test('noise immediately above 30% does not count', () => {
  const result = calculateNightMetrics({ ...qualifyingNight, noisySeconds: 540.01 });
  assert.deepEqual(result.exclusionReasons, [EXCLUSION_REASONS.tooNoisy]);
});

test('missed analysis and an audio interruption give separate reasons', () => {
  const result = calculateNightMetrics({
    ...qualifyingNight,
    analyzedSeconds: 1619.99,
    interrupted: true,
  });
  assert.deepEqual(result.exclusionReasons, [
    EXCLUSION_REASONS.lowCoverage,
    EXCLUSION_REASONS.interrupted,
  ]);
});

test('no analyzed samples produce zero score and cannot be a qualifying night', () => {
  const result = calculateNightMetrics({ ...qualifyingNight, analyzedSeconds: 0 });
  assert.equal(result.score, 0);
  assert.equal(result.eligible, false);
  assert.deepEqual(result.exclusionReasons, [EXCLUSION_REASONS.lowCoverage]);
});

test('corrupt numeric values never yield NaN, Infinity, or an out-of-range score', () => {
  assert.equal(calculateNightMetrics({ ...qualifyingNight, snoringSeconds: 9000 }).score, 100);
  assert.equal(calculateNightMetrics({ ...qualifyingNight, snoringSeconds: -2 }).score, 0);
  assert.equal(calculateNightMetrics({ ...qualifyingNight, snoringSeconds: NaN }).score, 0);
  assert.equal(calculateNightMetrics({ ...qualifyingNight, analyzedSeconds: Infinity }).score, 0);
});

test('snoring at 0.35 counts, but a simultaneous competing sound rejects the window', () => {
  assert.deepEqual(classifySoundWindow({ ...quietWindow, snoringConfidence: 0.35 }), {
    isSnoring: true,
    isNoisy: false,
  });
  for (const field of ['speechConfidence', 'musicConfidence', 'televisionConfidence'] as const) {
    assert.deepEqual(
      classifySoundWindow({ ...quietWindow, snoringConfidence: 0.95, [field]: 0.35 }),
      { isSnoring: false, isNoisy: true },
    );
  }
  assert.equal(classifySoundWindow({ ...quietWindow, snoringConfidence: 0.349 }).isSnoring, false);
});

test('exactly 1% clipped PCM is accepted; more than 1% is noisy', () => {
  assert.equal(classifySoundWindow({ ...quietWindow, clippedSampleFraction: 0.01 }).isNoisy, false);
  assert.equal(
    classifySoundWindow({ ...quietWindow, clippedSampleFraction: 0.010001 }).isNoisy,
    true,
  );
});

test('a malformed competing confidence does not suppress another noisy class', () => {
  assert.equal(
    classifySoundWindow({ ...quietWindow, musicConfidence: NaN, speechConfidence: 0.8 }).isNoisy,
    true,
  );
});

test('non-overlapping windows accumulate seconds without double-counting snoring as noise', () => {
  const decisions = [
    classifySoundWindow({ ...quietWindow, snoringConfidence: 0.9 }),
    classifySoundWindow({ ...quietWindow, snoringConfidence: 0.8, musicConfidence: 0.9 }),
    classifySoundWindow(quietWindow),
    classifySoundWindow({ ...quietWindow, snoringConfidence: 0.8 }),
  ];
  const analyzedSeconds = decisions.length * NIGHT_RULES.windowSeconds;
  const snoringSeconds =
    decisions.filter((window) => window.isSnoring).length * NIGHT_RULES.windowSeconds;
  const noisySeconds =
    decisions.filter((window) => window.isNoisy).length * NIGHT_RULES.windowSeconds;
  assert.equal(analyzedSeconds, 3.9);
  assert.equal(snoringSeconds, 1.95);
  assert.equal(noisySeconds, 0.975);
  assert.equal(
    calculateNightMetrics({
      durationSeconds: 3.9,
      analyzedSeconds,
      snoringSeconds,
      noisySeconds,
      interrupted: false,
    }).score,
    50,
  );
});
