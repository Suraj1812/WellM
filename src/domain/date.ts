import { formatNightDate } from './format';
import type { NightSession, WeekDay } from './types';

export function getLocalDateKey(timestamp: number | Date): string {
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function getNightDisplayDate(night: Pick<NightSession, 'endedAt'>): Date {
  return new Date(night.endedAt);
}

export function getWeekDays(
  anchor: number | Date = Date.now(),
  now: number = Date.now(),
): WeekDay[] {
  const end = anchor instanceof Date ? new Date(anchor.getTime()) : new Date(anchor);
  end.setHours(12, 0, 0, 0);
  const todayKey = getLocalDateKey(now);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(end);
    date.setDate(end.getDate() - 6 + index);
    return {
      key: getLocalDateKey(date),
      date,
      label: date.toLocaleDateString('en-US', { weekday: 'short' }),
      shortLabel: date.toLocaleDateString('en-US', { weekday: 'narrow' }),
      isToday: getLocalDateKey(date) === todayKey,
    };
  });
}

export function getNightForDay(
  nights: readonly NightSession[],
  day: number | Date | string,
): NightSession | undefined {
  const key = typeof day === 'string' ? day : getLocalDateKey(day);
  return nights
    .filter((night) => getLocalDateKey(getNightDisplayDate(night)) === key)
    .reduce<NightSession | undefined>(
      (latest, night) => (!latest || night.endedAt > latest.endedAt ? night : latest),
      undefined,
    );
}

export function formatRelativeNightDate(timestamp: number, now: number = Date.now()): string {
  const dateKey = getLocalDateKey(timestamp);
  if (dateKey === getLocalDateKey(now)) return 'This morning';
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateKey === getLocalDateKey(yesterday)) return 'Yesterday morning';
  return formatNightDate(timestamp);
}
