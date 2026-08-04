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
      <div className="tf-seismograph-container">
        <svg className="tf-seismograph-svg" viewBox="0 0 500 180" fill="none" style={{ overflow: 'visible' }}>
          {/* Baseline grid line */}
          <line x1="0" y1="90" x2="500" y2="90" stroke="var(--tf-border)" strokeWidth="1" strokeDasharray="4 4" />

          {/* Base seismograph waveform (always visible) */}
          <path
            d="M 10 90 L 100 90 L 120 90 L 140 76 L 160 104 L 180 64 L 200 116 L 220 66 L 250 38 L 270 142 L 290 58 L 310 112 L 330 72 L 350 98 L 370 86 L 390 92 L 410 90 L 490 90"
            stroke="rgba(88, 86, 214, 0.25)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Active traveling seismic wave pulse */}
          <path
            className="tf-seismo-pulse-path"
            pathLength="1000"
            d="M 10 90 L 100 90 L 120 90 L 140 76 L 160 104 L 180 64 L 200 116 L 220 66 L 250 38 L 270 142 L 290 58 L 310 112 L 330 72 L 350 98 L 370 86 L 390 92 L 410 90 L 490 90"
            stroke="var(--tf-accent)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Epicenter group with expanding shockwaves */}
          <g transform="translate(250, 38)">
            <circle className="tf-seismo-ring" r="1" stroke="var(--tf-accent)" strokeWidth="2" fill="none" />
            <circle className="tf-seismo-ring" r="1" stroke="var(--tf-accent)" strokeWidth="2" fill="none" />
            <circle className="tf-seismo-ring" r="1" stroke="var(--tf-accent)" strokeWidth="2" fill="none" />
            <circle className="tf-seismo-dot" r="6" fill="#FF3B30" stroke="#FFFFFF" strokeWidth="2" />
          </g>
        </svg>
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
