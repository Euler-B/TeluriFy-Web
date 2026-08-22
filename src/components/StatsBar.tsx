import type { SismoStats, Sismo } from '../services/api';
import { parseApiDate } from '../utils/date';

type Props = {
  stats?: SismoStats | null;
  sismos?: Sismo[];
};

function magnitudeColor(mag: number): string {
  if (mag >= 6.0) return '#FF3B30';
  if (mag >= 5.0) return '#FF9500';
  if (mag >= 3.0) return '#FFCC00';
  return '#34C759';
}

export default function StatsBar({ stats, sismos = [] }: Props) {
  // If stats endpoint returned data:
  if (stats) {
    const biggest = stats.max_magnitude;
    const magTypes = Object.entries(stats.by_mag_type || {});

    return (
      <div style={{ marginBottom: 16 }}>
        <div className="tf-stats-bar">
          {/* Card 1: Major Event */}
          <div className="tf-stat-card">
            {biggest ? (
              <>
                <div
                  className="tf-stat-value"
                  style={{ color: magnitudeColor(biggest.magnitude) }}
                >
                  M {biggest.magnitude.toFixed(1)}
                </div>
                <div className="tf-stat-label">Mayor sismo registrado</div>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--tf-text-secondary)',
                    marginTop: 4,
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={biggest.place}
                >
                  {biggest.place}
                </div>
              </>
            ) : (
              <>
                <div className="tf-stat-value">--</div>
                <div className="tf-stat-label">Sin registros</div>
              </>
            )}
          </div>

          {/* Card 2: Total Events & 24h Count */}
          <div className="tf-stat-card">
            <div className="tf-stat-value">{stats.total_sismos.toLocaleString()}</div>
            <div className="tf-stat-label">Eventos sísmicos totales</div>
            <div
              style={{
                fontSize: 10,
                color: 'var(--tf-text-secondary)',
                marginTop: 4,
                fontWeight: 600,
              }}
            >
              <i className="ti ti-clock" style={{ marginRight: 4, color: 'var(--tf-accent)' }} />
              {stats.last_24h_count} en las últimas 24h
            </div>
          </div>

          {/* Card 3: Tsunami Alerts */}
          <div className="tf-stat-card">
            <div
              className="tf-stat-value"
              style={{ color: stats.tsunami_count > 0 ? '#FF3B30' : 'var(--tf-text)' }}
            >
              {stats.tsunami_count}
            </div>
            <div className="tf-stat-label">Alertas de tsunami</div>
            <div
              style={{
                fontSize: 10,
                color: stats.tsunami_count > 0 ? '#FF3B30' : 'var(--tf-text-secondary)',
                marginTop: 4,
                fontWeight: 600,
              }}
            >
              <i className="ti ti-waves" style={{ marginRight: 4 }} />
              {stats.tsunami_count > 0 ? 'Eventos con advertencia marina' : 'Sin alertas activas'}
            </div>
          </div>
        </div>

        {/* Magnitude Type Badges Row */}
        {magTypes.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--tf-text-secondary)',
              background: 'var(--tf-surface)',
              border: '1px solid var(--tf-border)',
              borderRadius: 10,
              padding: '8px 12px',
            }}
          >
            <span style={{ fontWeight: 700, color: 'var(--tf-text)' }}>
              <i className="ti ti-category" style={{ marginRight: 4, color: 'var(--tf-accent)' }} />
              Tipos de magnitud:
            </span>
            {magTypes.map(([type, count]) => (
              <span
                key={type}
                style={{
                  background: 'rgba(88, 86, 214, 0.08)',
                  color: 'var(--tf-accent)',
                  padding: '2px 8px',
                  borderRadius: 6,
                  textTransform: 'uppercase',
                  fontWeight: 700,
                  fontSize: 10,
                }}
              >
                {type}: <span style={{ color: 'var(--tf-text)' }}>{count}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Fallback if stats is not provided (using local sismos array):
  if (sismos.length === 0) return null;

  const now = Date.now();
  const last24h = sismos.filter(
    (s) => {
      const timestamp = parseApiDate(s.attributes.time)?.getTime();
      return timestamp !== undefined && now - timestamp < 86_400_000;
    }
  );

  const tsunamis = sismos.filter((s) => s.attributes.tsunami);

  const biggest = [...sismos].sort(
    (a, b) => b.attributes.magnitude - a.attributes.magnitude
  )[0];

  return (
    <div className="tf-stats-bar" style={{ marginBottom: 14 }}>
      <div className="tf-stat-card">
        <div
          className="tf-stat-value"
          style={{ color: magnitudeColor(biggest.attributes.magnitude) }}
        >
          M {biggest.attributes.magnitude.toFixed(1)}
        </div>
        <div className="tf-stat-label">Mayor sismo en pantalla</div>
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
        <div
          className="tf-stat-value"
          style={{ color: tsunamis.length > 0 ? '#FF3B30' : 'var(--tf-text)' }}
        >
          {tsunamis.length}
        </div>
        <div className="tf-stat-label">Eventos con tsunami</div>
        <div style={{ fontSize: 10, color: 'var(--tf-text-secondary)', marginTop: 4, fontWeight: 500 }}>
          {tsunamis.length > 0 ? 'Con alerta de tsunami' : 'Sin alertas'}
        </div>
      </div>
    </div>
  );
}
