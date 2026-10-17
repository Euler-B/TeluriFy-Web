import { useEffect, useState } from 'react';
import type { Sismo, SismoStats } from '../services/api';
import { fetchAllSismos, fetchSismosStats } from '../services/api';
import { getSeismicStatus } from '../utils/seismic';

const CATEGORIES = [
  { label: 'Estable (< 3.0)', colorVar: 'var(--signal-green)', min: 0, max: 3 },
  { label: 'Observación (3.0 – 4.9)', colorVar: 'var(--signal-cyan)', min: 3, max: 5 },
  { label: 'Precaución (5.0 – 5.9)', colorVar: 'var(--warning-amber)', min: 5, max: 6 },
  { label: 'Alerta (≥ 6.0)', colorVar: 'var(--alert-coral)', min: 6, max: Infinity },
];

export default function SeismicAnalytics() {
  const [stats, setStats] = useState<SismoStats | null>(null);
  const [sismos, setSismos] = useState<Sismo[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    async function loadData() {
      try {
        const [statsResult, sismosResult] = await Promise.allSettled([
          fetchSismosStats(controller.signal),
          fetchAllSismos(undefined, controller.signal).then((r) => r.sismos),
        ]);

        if (!isMounted) return;

        if (statsResult.status === 'rejected' && sismosResult.status === 'rejected') {
          setHasError(true);
          return;
        }

        if (statsResult.status === 'fulfilled') {
          setStats(statsResult.value);
        }
        if (sismosResult.status === 'fulfilled') {
          setSismos(sismosResult.value);
        }
        setHasError(false);
      } catch (err: unknown) {
        if (isMounted && (err as Error)?.name !== 'AbortError') {
          setHasError(true);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  if (loading) {
    return (
      <div className="tf-loading" role="status" aria-label="Cargando análisis estadístico">
        <div className="tf-loading-rings" aria-hidden="true">
          <span />
          <span />
          <span />
          <img className="tf-logo-on-dark" src="/brand/telurify-symbol.svg" alt="" width="36" height="36" />
          <img className="tf-logo-on-light" src="/brand/telurify-symbol-dark.svg" alt="" width="36" height="36" />
        </div>
        <div className="tf-loading-text">Cargando análisis estadístico…</div>
        <div className="tf-loading-sub">Desglosando la red de monitoreo sísmico</div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="tf-card" style={{ textAlign: 'center', padding: '48px 24px' }} role="alert">
        <i className="ti ti-wifi-off" style={{ fontSize: 36, color: 'var(--alert-coral)', display: 'block', marginBottom: 12 }} aria-hidden="true" />
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>No se pudieron cargar los datos analíticos</h3>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
          Ocurrió un error al comunicarse con el servidor sísmico. Por favor intenta más tarde.
        </p>
      </div>
    );
  }

  const loadedCount = sismos.length || 1;
  const serverTotalCount = stats?.total_sismos ?? 0;

  const categories = CATEGORIES.map((cat) => ({
    ...cat,
    count: sismos.filter(
      (s) => s.attributes.magnitude >= cat.min && s.attributes.magnitude < cat.max
    ).length,
  }));

  const magTypes = stats?.by_mag_type
    ? Object.entries(stats.by_mag_type).sort((a, b) => b[1] - a[1])
    : [];

  const tsunamiCount = stats ? stats.tsunami_count : sismos.filter((s) => s.attributes.tsunami).length;
  const tsunamiDenominator = stats ? (serverTotalCount || 1) : loadedCount;
  const tsunamiPct = ((tsunamiCount / tsunamiDenominator) * 100).toFixed(1);

  const maxStatus = stats?.max_magnitude
    ? getSeismicStatus(stats.max_magnitude.magnitude)
    : null;

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Resumen superior */}
      <div className="tf-stats-bar tf-stats-bar--3">
        <div className="tf-stat-card">
          <div className="tf-label" style={{ marginBottom: 8 }}>
            <i className="ti ti-activity" style={{ color: 'var(--signal-cyan)', fontSize: 15, marginRight: 6 }} aria-hidden="true" />
            Registros sísmicos
          </div>
          <div className="tf-stat-value" style={{ fontSize: 32 }}>
            {(stats?.total_sismos || sismos.length).toLocaleString('es-ES')}
          </div>
          <div className="tf-stat-sub">{stats?.last_24h_count || 0} en las últimas 24 h</div>
        </div>

        <div className="tf-stat-card">
          <div className="tf-label" style={{ marginBottom: 8 }}>
            <i className="ti ti-waves" style={{ color: 'var(--alert-coral)', fontSize: 15, marginRight: 6 }} aria-hidden="true" />
            Alertas de tsunami
          </div>
          <div
            className="tf-stat-value"
            style={{ fontSize: 32, color: tsunamiCount > 0 ? 'var(--alert-coral)' : 'var(--text-primary)' }}
          >
            {tsunamiCount}
          </div>
          <div className="tf-stat-sub">{tsunamiPct}% del total de eventos</div>
        </div>

        <div className="tf-stat-card">
          <div className="tf-label" style={{ marginBottom: 8 }}>
            <i className="ti ti-bolt" style={{ color: 'var(--warning-amber)', fontSize: 15, marginRight: 6 }} aria-hidden="true" />
            Mayor magnitud
          </div>
          {stats?.max_magnitude && maxStatus ? (
            <>
              <div className="tf-stat-value" style={{ fontSize: 32, color: maxStatus.colorVar }}>
                M {stats.max_magnitude.magnitude.toFixed(1)}
              </div>
              <div className="tf-stat-sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={stats.max_magnitude.place}>
                {stats.max_magnitude.place}
              </div>
            </>
          ) : (
            <div className="tf-stat-value" style={{ fontSize: 24, color: 'var(--text-secondary)' }}>--</div>
          )}
        </div>
      </div>

      {/* Distribución por rango */}
      <div className="tf-card">
        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>
          Distribución por estado sísmico
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
          Conteo de eventos según los umbrales de estado de la red: magnitud y alertas asociadas.
        </p>

        <div style={{ display: 'grid', gap: 14 }}>
          {categories.map((cat) => {
            const pct = Math.min(100, Math.round((cat.count / loadedCount) * 100));
            return (
              <div key={cat.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-primary)' }}>{cat.label}</span>
                  <span className="tf-mono" style={{ color: cat.colorVar }}>
                    {cat.count.toLocaleString('es-ES')} ({pct}%)
                  </span>
                </div>
                <div
                  role="img"
                  aria-label={`${cat.label}: ${cat.count} eventos, ${pct}% del total`}
                  style={{
                    height: 10,
                    background: 'var(--background)',
                    borderRadius: 6,
                    overflow: 'hidden',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: cat.colorVar,
                      borderRadius: 6,
                      transition: 'width 0.4s ease-out',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tipos de magnitud */}
      {magTypes.length > 0 && (
        <div className="tf-card">
          <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>
            Frecuencia por tipo de magnitud
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
            Metodología de cálculo sísmico reportada por la red de estaciones sismológicas.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            {magTypes.map(([type, count]) => {
              const typePct = ((count / (stats?.total_sismos || 1)) * 100).toFixed(1);
              return (
                <div
                  key={type}
                  style={{
                    background: 'var(--background)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '12px 14px',
                  }}
                >
                  <div className="tf-mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--signal-cyan)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {type}
                  </div>
                  <div className="tf-mono" style={{ fontSize: 20, fontWeight: 600, margin: '2px 0', color: 'var(--text-primary)' }}>
                    {count.toLocaleString('es-ES')}
                  </div>
                  <div className="tf-mono" style={{ fontSize: 10, color: 'var(--text-secondary)', fontWeight: 500 }}>
                    {typePct}% del total
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
