import React, { useEffect, useState } from 'react';
import type { Sismo } from './SeismicMap';
import SeismicMap from './SeismicMap';
import StatsBar from './StatsBar';
import AlertBanner from './AlertBanner';

export default function MapSection() {
  const [sismos, setSismos] = useState<Sismo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.PUBLIC_API_URL}/v1/sismos?per_page=1000`)
      .then((res) => res.json())
      .then((json) => setSismos(json.data ?? []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div
        style={{
          height: 580,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--tf-text-secondary)',
          fontWeight: 600,
          fontSize: 14,
          gap: 10,
        }}
      >
        <i className="ti ti-loader-2" style={{ fontSize: 20, animation: 'spin 1s linear infinite' }} />
        Cargando sismos recientes...
      </div>
    );
  }

  if (error) {
    return (
      <div
        style={{
          padding: 24,
          textAlign: 'center',
          color: 'var(--tf-text-secondary)',
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        <i className="ti ti-wifi-off" style={{ fontSize: 24, display: 'block', marginBottom: 8 }} />
        No se pudieron cargar los datos sísmicos. Verifica que el API esté disponible.
      </div>
    );
  }

  return (
    <>
      <AlertBanner sismos={sismos} />
      <StatsBar sismos={sismos} />
      <SeismicMap sismos={sismos} />
    </>
  );
}

// Simple CSS keyframe injected inline for spinner
const style = typeof document !== 'undefined' && !document.getElementById('tf-spin-style');
if (style && typeof document !== 'undefined') {
  const el = document.createElement('style');
  el.id = 'tf-spin-style';
  el.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
  document.head.appendChild(el);
}
