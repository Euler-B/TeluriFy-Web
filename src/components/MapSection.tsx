import { useEffect, useState, useRef } from 'react';
import type { Sismo, SismoStats, SismoFilters } from '../services/api';
import { fetchAllSismos, fetchSismosStats, ApiError } from '../services/api';

import SeismicMap from './SeismicMap';
import StatsBar from './StatsBar';
import AlertBanner from './AlertBanner';
import FilterPanel from './FilterPanel';

export default function MapSection() {
  const [sismos, setSismos] = useState<Sismo[]>([]);
  const [stats, setStats] = useState<SismoStats | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);
  const [filters, setFilters] = useState<SismoFilters>({
    mag_min: 0,
    mag_max: 10,
    date_from: '',
    date_to: '',
    mag_type: [],
    tsunami: null,
  });

  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefetching, setIsRefetching] = useState(false);
  const [error, setError] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoadRef = useRef(true);

  // Fetch initial global stats on mount
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadStats() {
      try {
        const data = await fetchSismosStats(controller.signal);
        if (isMounted) setStats(data);
      } catch (err: unknown) {
        if (isMounted && err instanceof ApiError && err.isRateLimited) {
          setIsRateLimited(true);
        }
      }
    }

    loadStats();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  // Fetch sismos list whenever filters change (debounced)
  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!isFirstLoadRef.current) {
      setIsRefetching(true);
    }
    setIsRateLimited(false);

    const delay = isFirstLoadRef.current ? 0 : 400;

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const { sismos: fetched, pagination } = await fetchAllSismos(filters, controller.signal);
        if (isMounted) {
          setSismos(fetched);
          setIsTruncated(Boolean(pagination?.truncated));
          setError(false);
          setIsRateLimited(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          if (err instanceof ApiError && err.isRateLimited) {
            setIsRateLimited(true);
          } else if ((err as Error)?.name !== 'AbortError') {
            setError(true);
          }
        }
      } finally {
        if (isMounted) {
          setInitialLoading(false);
          setIsRefetching(false);
          isFirstLoadRef.current = false;
        }
      }
    }, delay);

    return () => {
      isMounted = false;
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      controller.abort();
    };
  }, [filters]);

  const availableMagTypes = stats?.by_mag_type
    ? Object.keys(stats.by_mag_type)
    : ['ml', 'mww', 'mb', 'md', 'mw', 'mwb'];

  return (
    <>
      <AlertBanner sismos={sismos} />
      <StatsBar stats={stats} sismos={sismos} />

      <FilterPanel
        filters={filters}
        onFilterChange={setFilters}
        availableMagTypes={availableMagTypes}
        totalFilteredCount={sismos.length}
        isTruncated={isTruncated}
        isRateLimited={isRateLimited}
      />

      {initialLoading ? (
        <div className="tf-seismograph-container">
          <svg className="tf-seismograph-svg" viewBox="0 0 500 180" fill="none" style={{ overflow: 'visible' }}>
            <line x1="0" y1="90" x2="500" y2="90" stroke="var(--tf-border)" strokeWidth="1" strokeDasharray="4 4" />
            <path
              d="M 10 90 L 100 90 L 120 90 L 140 76 L 160 104 L 180 64 L 200 116 L 220 66 L 250 38 L 270 142 L 290 58 L 310 112 L 330 72 L 350 98 L 370 86 L 390 92 L 410 90 L 490 90"
              stroke="rgba(88, 86, 214, 0.25)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              className="tf-seismo-pulse-path"
              pathLength="1000"
              d="M 10 90 L 100 90 L 120 90 L 140 76 L 160 104 L 180 64 L 200 116 L 220 66 L 250 38 L 270 142 L 290 58 L 310 112 L 330 72 L 350 98 L 370 86 L 390 92 L 410 90 L 490 90"
              stroke="var(--tf-accent)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <g transform="translate(250, 38)">
              <circle className="tf-seismo-ring" r="1" stroke="var(--tf-accent)" strokeWidth="2" fill="none" />
              <circle className="tf-seismo-ring" r="1" stroke="var(--tf-accent)" strokeWidth="2" fill="none" />
              <circle className="tf-seismo-ring" r="1" stroke="var(--tf-accent)" strokeWidth="2" fill="none" />
              <circle className="tf-seismo-dot" r="6" fill="#FF3B30" stroke="#FFFFFF" strokeWidth="2" />
            </g>
          </svg>
        </div>
      ) : error && sismos.length === 0 ? (
        <div
          style={{
            padding: 32,
            textAlign: 'center',
            color: 'var(--tf-text-secondary)',
            fontWeight: 600,
            fontSize: 13,
            background: 'var(--tf-surface)',
            border: '1px solid var(--tf-border)',
            borderRadius: 14,
          }}
        >
          <i className="ti ti-wifi-off" style={{ fontSize: 28, display: 'block', marginBottom: 8, color: '#FF3B30' }} />
          No se pudieron cargar los datos sísmicos. Verifica que el API esté disponible.
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          {isRefetching && (
            <div
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                zIndex: 1000,
                background: 'var(--tf-surface)',
                border: '1px solid var(--tf-border)',
                borderRadius: 8,
                padding: '4px 10px',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--tf-accent)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} />
              Actualizando datos...
            </div>
          )}
          <SeismicMap sismos={sismos} />
        </div>
      )}
    </>
  );
}

const style = typeof document !== 'undefined' && !document.getElementById('tf-spin-style');
if (style && typeof document !== 'undefined') {
  const el = document.createElement('style');
  el.id = 'tf-spin-style';
  el.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
  document.head.appendChild(el);
}
