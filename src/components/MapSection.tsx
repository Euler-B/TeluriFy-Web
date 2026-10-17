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
        <div className="tf-loading" role="status" aria-label="Cargando datos sísmicos">
          <div className="tf-loading-rings" aria-hidden="true">
            <span />
            <span />
            <span />
            <img className="tf-logo-on-dark" src="/brand/telurify-symbol.svg" alt="" width="36" height="36" />
            <img className="tf-logo-on-light" src="/brand/telurify-symbol-dark.svg" alt="" width="36" height="36" />
          </div>
          <div className="tf-loading-text">Cargando panel sísmico…</div>
          <div className="tf-loading-sub">Sincronizando con la red global de monitoreo</div>
        </div>
      ) : error && sismos.length === 0 ? (
        <div
          className="tf-empty-state"
          role="alert"
          style={{ padding: 32 }}
        >
          <i className="ti ti-wifi-off" style={{ fontSize: 28, display: 'block', marginBottom: 8, color: 'var(--alert-coral)' }} aria-hidden="true" />
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
                background: 'var(--surface-elevated)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '5px 12px',
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--signal-cyan)',
                boxShadow: 'var(--shadow-card)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <i className="ti ti-loader-2" style={{ animation: 'spin 1s linear infinite' }} aria-hidden="true" />
              Actualizando datos…
            </div>
          )}
          <SeismicMap sismos={sismos} />
        </div>
      )}
    </>
  );
}
