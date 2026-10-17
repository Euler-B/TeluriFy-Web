import { useEffect, useState } from 'react';

function getUtcOffsetLabel(date: Date): string {
  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return minutes === 0 ? `UTC${sign}${hours}` : `UTC${sign}${hours}:${String(minutes).padStart(2, '0')}`;
}

interface LiveSignalProps {
  variant?: 'pill' | 'caption';
}

export default function LiveSignal({ variant = 'pill' }: LiveSignalProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const formattedTime = now
    ? new Intl.DateTimeFormat('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now)
    : '--:--:--';

  if (variant === 'caption') {
    return (
      <span
        className="tf-live-signal tf-live-signal--caption"
        title="Señal activa · hora local de tu dispositivo"
        aria-label="Señal en vivo activa. La hora mostrada es la hora local de tu dispositivo."
      >
        <span className="tf-live-label">Señal en vivo</span>
        <span className="tf-live-sep" aria-hidden="true">•</span>
        <span className="tf-live-clock" aria-hidden="true">{formattedTime}</span>
      </span>
    );
  }

  const zoneLabel = now ? getUtcOffsetLabel(now) : '';

  return (
    <div
      className="tf-live-signal"
      title="Señal activa · hora local de tu dispositivo"
      aria-label="Señal en vivo activa. La hora mostrada es la hora local de tu dispositivo."
    >
      <span className="tf-live-dot" aria-hidden="true" />
      <span className="tf-live-label">Señal en vivo</span>
      <span className="tf-live-clock" aria-hidden="true">{formattedTime}</span>
      <span className="tf-live-zone" aria-hidden="true">
        {zoneLabel ? `hora local · ${zoneLabel}` : 'hora local'}
      </span>
    </div>
  );
}
