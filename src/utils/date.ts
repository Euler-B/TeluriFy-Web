const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
};

export function parseApiDate(value: string): Date | null {
  if (!value) return null;

  const normalized = value
    .trim()
    .replace(/^(\d{4}-\d{2}-\d{2})\s+/, '$1T')
    .replace(/\s+UTC$/i, 'Z')
    // Safari only accepts up to three fractional-second digits.
    .replace(/\.(\d{3})\d+(?=(Z|[+-]\d{2}:?\d{2})?$)/, '.$1');
  const date = new Date(normalized);
  if (!Number.isNaN(date.getTime())) return date;

  // Fallback for SQL timestamps that a WebKit Date parser does not accept.
  const parts = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}:?\d{2})?$/
  );
  if (!parts) return null;

  const [, year, month, day, hours, minutes, seconds, fraction = '', zone] = parts;
  const milliseconds = Number(fraction.slice(0, 3).padEnd(3, '0'));
  const utcTimestamp = Date.UTC(
    Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes), Number(seconds), milliseconds
  );
  const offsetMinutes = zone && zone !== 'Z'
    ? (Number(zone.slice(1, 3)) * 60 + Number(zone.slice(-2))) * (zone[0] === '+' ? 1 : -1)
    : 0;
  const fallback = new Date(utcTimestamp - offsetMinutes * 60_000);

  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function formatApiDate(value: string, includeWeekday = false): string {
  const date = parseApiDate(value);
  if (!date) return 'Fecha no disponible';

  return new Intl.DateTimeFormat('es-ES', {
    ...DATE_TIME_OPTIONS,
    ...(includeWeekday ? { weekday: 'long' } : {}),
  }).format(date);
}
