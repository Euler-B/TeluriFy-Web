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
    // Safari only accepts up to three fractional-second digits.
    .replace(/\.(\d{3})\d+(?=(Z|[+-]\d{2}:?\d{2})?$)/, '.$1');
  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatApiDate(value: string, includeWeekday = false): string {
  const date = parseApiDate(value);
  if (!date) return 'Fecha no disponible';

  return new Intl.DateTimeFormat('es-ES', {
    ...DATE_TIME_OPTIONS,
    ...(includeWeekday ? { weekday: 'long' } : {}),
  }).format(date);
}
