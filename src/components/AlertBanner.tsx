import React, { useState, useEffect } from 'react';

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
      const age = now - new Date(s.attributes.time).getTime();
      return age >= 0 && age < 86_400_000;
    })
    .sort((a, b) => b.attributes.magnitude - a.attributes.magnitude);

  if (severe.length === 0) return null;

  const top = severe[0];

  return (
    <div className="tf-alert-banner" role="alert">
      <i className="ti ti-alert-triangle-filled" style={{ fontSize: 18, flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <span style={{ fontWeight: 700 }}>Sismo significativo en las últimas 24h — </span>
        M {top.attributes.magnitude.toFixed(1)} · {top.attributes.place}
        {severe.length > 1 && (
          <span style={{ color: '#C0392B', marginLeft: 6 }}>
            (+{severe.length - 1} más)
          </span>
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
            color: '#C0392B',
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            border: '1px solid #FF3B3040',
            borderRadius: 6,
            padding: '3px 8px',
          }}
        >
          Ver en USGS
        </a>
      )}
    </div>
  );
}
