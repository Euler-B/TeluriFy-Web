import React from 'react';

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

export default function StatsBar({ sismos }: { sismos: Sismo[] }) {
  if (sismos.length === 0) return null;

  const now = Date.now();
  const last24h = sismos.filter(
    (s) => now - new Date(s.attributes.time).getTime() < 86_400_000
  );

  const biggest = [...sismos].sort(
    (a, b) => b.attributes.magnitude - a.attributes.magnitude
  )[0];

  const avg =
    sismos.reduce((acc, s) => acc + s.attributes.magnitude, 0) / sismos.length;

  return (
    <div className="tf-stats-bar">
      <div className="tf-stat-card">
        <div
          className="tf-stat-value"
          style={{ color: biggest.attributes.magnitude >= 6 ? '#FF3B30' : biggest.attributes.magnitude >= 5 ? '#FF9500' : 'var(--tf-text)' }}
        >
          M {biggest.attributes.magnitude.toFixed(1)}
        </div>
        <div className="tf-stat-label">Mayor sismo cargado</div>
        <div style={{ fontSize: 10, color: 'var(--tf-text-secondary)', marginTop: 4, fontWeight: 500 }}>
          {biggest.attributes.place}
        </div>
      </div>
      <div className="tf-stat-card">
        <div className="tf-stat-value">{sismos.length.toLocaleString()}</div>
        <div className="tf-stat-label">Eventos cargados</div>
        <div style={{ fontSize: 10, color: 'var(--tf-text-secondary)', marginTop: 4, fontWeight: 500 }}>
          {last24h.length} en las últimas 24h
        </div>
      </div>
      <div className="tf-stat-card">
        <div className="tf-stat-value">{avg.toFixed(2)}</div>
        <div className="tf-stat-label">Magnitud promedio</div>
        <div style={{ fontSize: 10, color: 'var(--tf-text-secondary)', marginTop: 4, fontWeight: 500 }}>
          Sobre {sismos.length.toLocaleString()} eventos
        </div>
      </div>
    </div>
  );
}
