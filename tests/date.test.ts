import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatDuration,
  formatMinutes,
  formatRelativeNightDate,
  getLocalDateKey,
  getNightDisplayDate,
  getNightForDay,
  getWeekDays,
} from '../src/domain/index';

import type { NightSession } from '../src/domain/types';

process.env.TZ = 'America/New_York';

function fixtureNight(id: string, endedAt: number): NightSession {
  return {
    id,
    endedAt,
    startedAt: endedAt - 60_000,
    durationSeconds: 60,
    analyzedSeconds: 59.475,
    snoringSeconds: 0,
    noisySeconds: 0,
    score: 0,
    eligible: false,
    exclusionReasons: ['Recorded less than 30 minutes.'],
    loudestClipUri: null,
    loudestClipSeconds: 0,
    loudestDbfs: null,
    interrupted: false,
    waveform: [],
    source: 'recorded',
  };
}

test('an overnight session belongs to the morning date', () => {
  const morning = new Date(2026, 9, 4, 6, 30).getTime();
  const night = { endedAt: morning };
  assert.equal(getLocalDateKey(getNightDisplayDate(night)), '2026-10-04');
  assert.equal(
    formatRelativeNightDate(morning, new Date(2026, 9, 4, 11).getTime()),
    'This morning',
  );
});

test('week calendar dates remain consecutive across daylight-saving changes', () => {
  const anchor = new Date(2026, 2, 10, 11).getTime();
  const days = getWeekDays(anchor, anchor);
  assert.deepEqual(
    days.map((day) => day.key),
    [
      '2026-03-04',
      '2026-03-05',
      '2026-03-06',
      '2026-03-07',
      '2026-03-08',
      '2026-03-09',
      '2026-03-10',
    ],
  );
  assert.equal(days.filter((day) => day.isToday).length, 1);
  assert.equal(days[6].isToday, true);
});

test('week rolls correctly across a year boundary', () => {
  const anchor = new Date(2027, 0, 2);
  const days = getWeekDays(anchor, anchor.getTime());
  assert.equal(days[0].key, '2026-12-27');
  assert.equal(days[6].key, '2027-01-02');
});

test('multiple recordings on one day select the latest without changing stored order', () => {
  const now = new Date(2026, 9, 4, 12).getTime();
  const fixtures = [
    fixtureNight('first', now - 60_000),
    fixtureNight('yesterday', now - 86_400_000),
  ];
  const duplicate = { ...fixtures[0], id: 'newer', endedAt: fixtures[0].endedAt + 30_000 };
  const nights = [fixtures[0], duplicate, fixtures[1]];
  const originalOrder = nights.map((night) => night.id);
  assert.equal(getNightForDay(nights, new Date(now))?.id, 'newer');
  assert.equal(getNightForDay(nights, '2026-01-01'), undefined);
  assert.deepEqual(
    nights.map((night) => night.id),
    originalOrder,
  );
});

test('an empty history never creates a recorded night for a calendar day', () => {
  const now = new Date(2026, 9, 4, 12).getTime();
  assert.equal(
    getWeekDays(now, now).every((day) => getNightForDay([], day.key) === undefined),
    true,
  );
});

test('duration formats remain useful for short test recordings and long nights', () => {
  assert.equal(formatDuration(0), '0s');
  assert.equal(formatDuration(10.8), '10s');
  assert.equal(formatDuration(492), '8m 12s');
  assert.equal(formatDuration(7680), '2h 8m');
  assert.equal(formatMinutes(90), '1.5');
  assert.equal(formatDuration(NaN), '0s');
});
