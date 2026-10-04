function safeSeconds(seconds: number): number {
  return Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0;
}

export function formatDuration(seconds: number): string {
  const total = safeSeconds(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m${remaining > 0 ? ` ${remaining}s` : ''}`;
  return `${remaining}s`;
}

export function formatMinutes(seconds: number): string {
  const minutes = Number.isFinite(seconds) ? Math.max(0, seconds) / 60 : 0;
  return minutes.toLocaleString('en-US', { maximumFractionDigits: 1 });
}

export function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatNightDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function formatScore(score: number): string {
  return String(Number.isFinite(score) ? Math.round(Math.max(0, Math.min(100, score))) : 0);
}
