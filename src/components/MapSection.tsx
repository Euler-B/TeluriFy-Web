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
    let isMounted = true;

    async function fetchAllSismos() {
      const baseUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
      const perPage = 1000;
      let aggregated: Sismo[] = [];

      try {
        const firstRes = await fetch(`${baseUrl}/v1/sismos?per_page=${perPage}&page=1`);
        if (!firstRes.ok) throw new Error(`HTTP error ${firstRes.status}`);
        const firstJson = await firstRes.json();

        if (!Array.isArray(firstJson.data)) {
          throw new Error('Invalid payload: json.data is not an array');
        }

        const firstData: Sismo[] = firstJson.data;
        aggregated = [...firstData];
        const pagination = firstJson.pagination;

        if (pagination && typeof pagination.total === 'number' && firstData.length > 0) {
          const total = pagination.total;
          const totalPages = Math.ceil(total / perPage);

          for (let page = 2; page <= totalPages; page++) {
            if (aggregated.length >= total) break;
            const res = await fetch(`${baseUrl}/v1/sismos?per_page=${perPage}&page=${page}`);
            if (!res.ok) throw new Error(`HTTP error ${res.status} on page ${page}`);
            const json = await res.json();
            if (!Array.isArray(json.data)) {
              throw new Error(`Invalid payload on page ${page}`);
            }
            const data: Sismo[] = json.data;
            if (data.length === 0) break;
            aggregated.push(...data);
          }
        }

        if (isMounted) {
          setSismos(aggregated);
          setError(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(true);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchAllSismos();

    return () => {
      isMounted = false;
    };
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
