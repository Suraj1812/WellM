import { calculateNightMetrics, NIGHT_RULES } from './scoring';
import type { NightSession } from './types';

const demoDefinitions = [
  { durationSeconds: 24_780, snoringFraction: 0.21, noiseFraction: 0.06 },
  { durationSeconds: 25_020, snoringFraction: 0.18, noiseFraction: 0.08 },
  { durationSeconds: 24_060, snoringFraction: 0.28, noiseFraction: 0.41 },
  { durationSeconds: 1_140, snoringFraction: 0.11, noiseFraction: 0.03 },
  { durationSeconds: 26_160, snoringFraction: 0.15, noiseFraction: 0.04 },
  { durationSeconds: 24_540, snoringFraction: 0.24, noiseFraction: 0.07 },
  { durationSeconds: 25_620, snoringFraction: 0.12, noiseFraction: 0.03 },
] as const;

export function createDemoNights(now: number = Date.now()): NightSession[] {
  const latestMorning = new Date(now);
  latestMorning.setHours(6, 55, 0, 0);
  if (latestMorning.getTime() > now) latestMorning.setDate(latestMorning.getDate() - 1);

  return demoDefinitions
    .map<NightSession>((definition, index) => {
      const { durationSeconds, snoringFraction, noiseFraction } = definition;
      const morning = new Date(latestMorning);
      morning.setDate(morning.getDate() - 6 + index);
      morning.setHours(6, 45 + (index % 3) * 5, 0, 0);
      const endedAt = morning.getTime();
      const windowCount = Math.floor(durationSeconds / NIGHT_RULES.windowSeconds);
      const analyzedSeconds = windowCount * NIGHT_RULES.windowSeconds;
      const input = {
        durationSeconds,
        analyzedSeconds,
        snoringSeconds: Math.round(windowCount * snoringFraction) * NIGHT_RULES.windowSeconds,
        noisySeconds: Math.round(windowCount * noiseFraction) * NIGHT_RULES.windowSeconds,
        interrupted: false,
      };
      return {
        id: `demo-${index}-${endedAt}`,
        startedAt: endedAt - durationSeconds * 1000,
        endedAt,
        ...input,
        ...calculateNightMetrics(input),
        loudestClipUri: null,
        loudestClipSeconds: 0,
        loudestDbfs: -17 - index * 1.8,
        waveform: Array.from({ length: 44 }, (_, point) =>
          Math.max(0.08, Math.min(0.92, 0.22 + Math.abs(Math.sin(point * 1.71 + index)) * 0.56)),
        ),
        source: 'demo',
      };
    })
    .sort((a, b) => b.endedAt - a.endedAt);
}
