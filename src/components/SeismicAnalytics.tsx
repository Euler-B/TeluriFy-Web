import { useEffect, useState } from 'react';
import type { Sismo, SismoStats } from '../services/api';
import { fetchAllSismos, fetchSismosStats } from '../services/api';

function magnitudeColor(mag: number): string {
  if (mag >= 6.0) return '#FF3B30';
  if (mag >= 5.0) return '#FF9500';
  if (mag >= 3.0) return '#FFCC00';
  return '#34C759';
}

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
      <div className="tf-card" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--tf-text-secondary)' }}>
        <i className="ti ti-loader-2" style={{ fontSize: 24, animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 12px' }} />
        Cargando análisis estadístico de la red sísmica...
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="tf-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <i className="ti ti-wifi-off" style={{ fontSize: 36, color: '#FF3B30', display: 'block', marginBottom: 12 }} />
        <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 700 }}>No se pudieron cargar los datos analíticos</h3>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--tf-text-secondary)', fontWeight: 500 }}>
          Ocurrió un error al comunicarse con el servidor sísmico. Por favor intenta más tarde.
        </p>
      </div>
    );
  }

  // Calculate histogram counts from loaded sismos and server stats
  const loadedCount = sismos.length || 1;
  const serverTotalCount = stats?.total_sismos ?? 0;

  const leveCount = sismos.filter((s) => s.attributes.magnitude < 3.0).length;
  const moderadoCount = sismos.filter((s) => s.attributes.magnitude >= 3.0 && s.attributes.magnitude < 5.0).length;
  const fuerteCount = sismos.filter((s) => s.attributes.magnitude >= 5.0 && s.attributes.magnitude < 6.0).length;
  const severoCount = sismos.filter((s) => s.attributes.magnitude >= 6.0).length;

  const categories = [
    { label: 'Leve (<3.0)', count: leveCount, color: '#34C759' },
    { label: 'Moderado (3.0 - 4.9)', count: moderadoCount, color: '#FFCC00' },
    { label: 'Fuerte (5.0 - 5.9)', count: fuerteCount, color: '#FF9500' },
    { label: 'Severo (≥6.0)', count: severoCount, color: '#FF3B30' },
  ];

  const magTypes = stats?.by_mag_type
    ? Object.entries(stats.by_mag_type).sort((a, b) => b[1] - a[1])
    : [];

  const tsunamiCount = stats ? stats.tsunami_count : sismos.filter((s) => s.attributes.tsunami).length;
  const tsunamiDenominator = stats ? (serverTotalCount || 1) : loadedCount;
  const tsunamiPct = ((tsunamiCount / tsunamiDenominator) * 100).toFixed(1);

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {/* Top Stats Overview Grid */}
      <div className="tf-grid-3">
        <div className="tf-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--tf-text-secondary)', marginBottom: 8 }}>
            <i className="ti ti-activity" style={{ color: 'var(--tf-accent)', fontSize: 18 }} />
            <span>Total Registros Sísmicos</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, color: 'var(--tf-text)' }}>
            {(stats?.total_sismos || sismos.length).toLocaleString()}
          </div>
          <div style={{ fontSize: 11, color: 'var(--tf-text-secondary)', marginTop: 4, fontWeight: 600 }}>
            {stats?.last_24h_count || 0} registrados en las últimas 24 horas
          </div>
        </div>

        <div className="tf-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--tf-text-secondary)', marginBottom: 8 }}>
            <i className="ti ti-waves" style={{ color: '#FF3B30', fontSize: 18 }} />
            <span>Alertas de Tsunami</span>
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, color: tsunamiCount > 0 ? '#FF3B30' : 'var(--tf-text)' }}>
            {tsunamiCount}
          </div>
          <div style={{ fontSize: 11, color: 'var(--tf-text-secondary)', marginTop: 4, fontWeight: 600 }}>
            {tsunamiPct}% del total de eventos registrados
          </div>
        </div>

        <div className="tf-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700, color: 'var(--tf-text-secondary)', marginBottom: 8 }}>
            <i className="ti ti-bolt" style={{ color: '#FF9500', fontSize: 18 }} />
            <span>Evento de Mayor Magnitud</span>
          </div>
          {stats?.max_magnitude && typeof stats.max_magnitude.magnitude === 'number' && Number.isFinite(stats.max_magnitude.magnitude) ? (
            <>
              <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: -1, color: magnitudeColor(stats.max_magnitude.magnitude) }}>
                M {stats.max_magnitude.magnitude.toFixed(1)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--tf-text-secondary)', marginTop: 4, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {stats.max_magnitude.place}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--tf-text-secondary)' }}>--</div>
          )}
        </div>
      </div>

      {/* Magnitude Distribution Histogram Card */}
      <div className="tf-card">
        <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>
          Distribución por Rango de Magnitud
        </h3>
        <p style={{ margin: '0 0 20px', fontSize: 12, color: 'var(--tf-text-secondary)', fontWeight: 500 }}>
          Desglose de sismos según la escala de severidad sísmica.
        </p>

        <div style={{ display: 'grid', gap: 14 }}>
          {categories.map((cat) => {
            const pct = Math.min(100, Math.round((cat.count / loadedCount) * 100));
            return (
              <div key={cat.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  <span style={{ color: 'var(--tf-text)' }}>{cat.label}</span>
                  <span style={{ color: cat.color }}>
                    {cat.count.toLocaleString()} eventos ({pct}%)
                  </span>
                </div>
                <div style={{ height: 12, background: 'var(--tf-bg)', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--tf-border)' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: cat.color,
                      borderRadius: 6,
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Magnitude Type Breakdown */}
      {magTypes.length > 0 && (
        <div className="tf-card">
          <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, letterSpacing: -0.3 }}>
            Frecuencia por Tipo de Magnitud Sismológica
          </h3>
          <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--tf-text-secondary)', fontWeight: 500 }}>
            Metodología de cálculo sísmico reportada por la red de estaciones sismológicas.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            {magTypes.map(([type, count]) => {
              const typePct = ((count / (stats?.total_sismos || 1)) * 100).toFixed(1);
              return (
                <div
                  key={type}
                  style={{
                    background: 'var(--tf-bg)',
                    border: '1px solid var(--tf-border)',
                    borderRadius: 12,
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--tf-accent)', textTransform: 'uppercase' }}>
                    {type}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, margin: '2px 0', color: 'var(--tf-text)' }}>
                    {count.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--tf-text-secondary)', fontWeight: 600 }}>
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
