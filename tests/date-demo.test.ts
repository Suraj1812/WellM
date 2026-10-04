import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createDemoNights,
  formatDuration,
  formatMinutes,
  formatRelativeNightDate,
  getLocalDateKey,
  getNightDisplayDate,
  getNightForDay,
  getWeekDays,
} from '../src/domain/index';

process.env.TZ = 'America/New_York';

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
  const fixtures = createDemoNights(now);
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

test('demo has seven distinct nights, explicit sample source, and no invented playback', () => {
  const now = new Date(2026, 9, 4, 12).getTime();
  const nights = createDemoNights(now);
  assert.equal(nights.length, 7);
  assert.equal(new Set(nights.map((night) => getLocalDateKey(night.endedAt))).size, 7);
  assert.equal(nights[0].endedAt < now, true);
  assert.equal(
    nights.every((night) => night.source === 'demo' && night.loudestClipUri === null),
    true,
  );
  assert.equal(nights.filter((night) => !night.eligible).length, 2);
  assert.equal(
    nights.some((night) => night.exclusionReasons.some((reason) => reason.includes('30 minutes'))),
    true,
  );
  assert.equal(
    nights.some((night) =>
      night.exclusionReasons.some((reason) => reason.includes('Background noise')),
    ),
    true,
  );
  assert.equal(
    getWeekDays(now, now).every((day) => getNightForDay(nights, day.key)),
    true,
  );
});

test('a preview opened before dawn has no duplicate or future sample mornings', () => {
  const now = new Date(2026, 9, 4, 2).getTime();
  const nights = createDemoNights(now);
  assert.equal(new Set(nights.map((night) => getLocalDateKey(night.endedAt))).size, 7);
  assert.equal(
    nights.every((night) => night.endedAt <= now),
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
