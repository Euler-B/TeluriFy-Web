export type AlertLevel = 'estable' | 'observacion' | 'precaucion' | 'alerta';

export type SeismicStatus = {
  level: AlertLevel;
  label: string;
  colorVar: string;
  chipClass: string;
  bgClass: string;
  textClass: string;
};

const LEVEL_META: Record<AlertLevel, { label: string; colorVar: string }> = {
  estable: { label: 'Estable', colorVar: 'var(--signal-green)' },
  observacion: { label: 'Observación', colorVar: 'var(--signal-cyan)' },
  precaucion: { label: 'Precaución', colorVar: 'var(--warning-amber)' },
  alerta: { label: 'Alerta', colorVar: 'var(--alert-coral)' },
};

export function getSeismicStatus(magnitude: number, tsunami = false): SeismicStatus {
  const mag = Number(magnitude) || 0;

  let level: AlertLevel = 'estable';
  if (tsunami || mag >= 6) level = 'alerta';
  else if (mag >= 5) level = 'precaucion';
  else if (mag >= 3) level = 'observacion';

  const meta = LEVEL_META[level];
  return {
    level,
    label: meta.label,
    colorVar: meta.colorVar,
    chipClass: `tf-status-chip tf-status--${level}`,
    bgClass: `tf-bg-${level}`,
    textClass: `tf-text-${level}`,
  };
}

export function formatDepth(depth: number | null | undefined): string {
  if (depth === null || depth === undefined) return '—';
  const value = Number(depth);
  if (!Number.isFinite(value)) return '—';
  return `${value.toFixed(0)} km`;
}

export function formatMagnitude(magnitude: number | null | undefined): string {
  const value = Number(magnitude);
  if (!Number.isFinite(value)) return '—';
  return value.toFixed(1);
}
