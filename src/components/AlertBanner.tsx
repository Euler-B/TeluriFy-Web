import { useState, useEffect } from 'react';
import { parseApiDate } from '../utils/date';

type Sismo = {
  id: number;
  attributes: {
    title: string;
    place: string;
    magnitude: number;
    coordinates: { latitude: number; longitude: number };
    time: string;
  };
  links?: { external_url?: string };
};

export default function AlertBanner({ sismos }: { sismos: Sismo[] }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const severe = sismos
    .filter((s) => {
      if (s.attributes.magnitude < 6.0) return false;
      const timestamp = parseApiDate(s.attributes.time)?.getTime();
      if (timestamp === undefined) return false;
      const age = now - timestamp;
      return age >= 0 && age < 86_400_000;
    })
    .sort((a, b) => b.attributes.magnitude - a.attributes.magnitude);

  if (severe.length === 0) return null;

  const top = severe[0];

  return (
    <div className="tf-alert-banner" role="alert">
      <span className="tf-status-chip tf-status--alerta" aria-hidden="true">
        Alerta
      </span>
      <i className="ti ti-alert-triangle-filled" style={{ fontSize: 18, flexShrink: 0 }} aria-hidden="true" />
      <div style={{ flex: 1 }}>
        <span style={{ fontWeight: 700 }}>Sismo significativo en las últimas 24 h — </span>
        <span className="tf-mono">M {top.attributes.magnitude.toFixed(1)}</span> · {top.attributes.place}
        {severe.length > 1 && (
          <span style={{ marginLeft: 6, opacity: 0.85 }}>(+{severe.length - 1} más)</span>
        )}
      </div>
      {top.links?.external_url && (
        <a
          href={top.links.external_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: 'inherit',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            border: '1px solid color-mix(in srgb, var(--alert-coral) 45%, transparent)',
            borderRadius: 6,
            padding: '5px 10px',
            minHeight: 32,
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          Ver en USGS
        </a>
      )}
    </div>
  );
}
