import type { SismoStats, Sismo } from '../services/api';
import { parseApiDate } from '../utils/date';
import { formatDepth, formatMagnitude, getSeismicStatus } from '../utils/seismic';

type Props = {
  stats?: SismoStats | null;
  sismos?: Sismo[];
};

export default function StatsBar({ stats, sismos = [] }: Props) {
  if (stats) {
    const biggest = stats.max_magnitude;
    const biggestStatus = biggest ? getSeismicStatus(biggest.magnitude) : null;
    const magTypes = Object.entries(stats.by_mag_type || {});

    return (
      <div style={{ marginBottom: 16 }}>
        <div className="tf-stats-bar tf-stats-bar--3">
          <div className="tf-stat-card">
            {biggest && biggestStatus ? (
              <>
                <div className="tf-stat-value" style={{ color: biggestStatus.colorVar }}>
                  M {formatMagnitude(biggest.magnitude)}
                </div>
                <div className="tf-stat-label">Mayor sismo registrado</div>
                <div className="tf-stat-sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={biggest.place}>
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

          <div className="tf-stat-card">
            <div className="tf-stat-value">{stats.total_sismos.toLocaleString('es-ES')}</div>
            <div className="tf-stat-label">Eventos totales</div>
            <div className="tf-stat-sub">
              <i className="ti ti-clock" style={{ marginRight: 4, color: 'var(--signal-cyan)' }} aria-hidden="true" />
              {stats.last_24h_count} en las últimas 24 h
            </div>
          </div>

          <div className="tf-stat-card">
            <div
              className="tf-stat-value"
              style={{ color: stats.tsunami_count > 0 ? 'var(--alert-coral)' : 'var(--text-primary)' }}
            >
              {stats.tsunami_count}
            </div>
            <div className="tf-stat-label">Alertas de tsunami</div>
            <div
              className="tf-stat-sub"
              style={{ color: stats.tsunami_count > 0 ? 'var(--alert-coral)' : undefined }}
            >
              <i className="ti ti-waves" style={{ marginRight: 4 }} aria-hidden="true" />
              {stats.tsunami_count > 0 ? 'Eventos con advertencia marina' : 'Sin alertas activas'}
            </div>
          </div>
        </div>

        {magTypes.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-secondary)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '8px 12px',
              marginTop: 10,
            }}
          >
            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              <i className="ti ti-category" style={{ marginRight: 4, color: 'var(--signal-cyan)' }} aria-hidden="true" />
              Tipos de magnitud:
            </span>
            {magTypes.map(([type, count]) => (
              <span
                key={type}
                className="tf-mono"
                style={{
                  background: 'color-mix(in srgb, var(--signal-cyan) 10%, transparent)',
                  color: 'var(--signal-cyan)',
                  padding: '2px 8px',
                  borderRadius: 6,
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  fontSize: 10,
                }}
              >
                {type}: <span style={{ color: 'var(--text-primary)' }}>{count}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (sismos.length === 0) return null;

  const now = Date.now();
  const last24h = sismos.filter((s) => {
    const timestamp = parseApiDate(s.attributes.time)?.getTime();
    return timestamp !== undefined && now - timestamp < 86_400_000;
  });

  const tsunamis = sismos.filter((s) => s.attributes.tsunami);

  const biggest = [...sismos].sort(
    (a, b) => b.attributes.magnitude - a.attributes.magnitude
  )[0];
  const biggestStatus = getSeismicStatus(biggest.attributes.magnitude, biggest.attributes.tsunami);

  return (
    <div className="tf-stats-bar tf-stats-bar--3" style={{ marginBottom: 14 }}>
      <div className="tf-stat-card">
        <div className="tf-stat-value" style={{ color: biggestStatus.colorVar }}>
          M {formatMagnitude(biggest.attributes.magnitude)}
        </div>
        <div className="tf-stat-label">Mayor sismo en pantalla</div>
        <div className="tf-stat-sub">{biggest.attributes.place}</div>
      </div>
      <div className="tf-stat-card">
        <div className="tf-stat-value">{sismos.length.toLocaleString('es-ES')}</div>
        <div className="tf-stat-label">Eventos cargados</div>
        <div className="tf-stat-sub">
          {last24h.length} en las últimas 24 h · Prof. media{' '}
          {formatDepth(
            sismos.reduce((acc, s) => acc + (Number(s.attributes.depth) || 0), 0) / sismos.length
          )}
        </div>
      </div>
      <div className="tf-stat-card">
        <div
          className="tf-stat-value"
          style={{ color: tsunamis.length > 0 ? 'var(--alert-coral)' : 'var(--text-primary)' }}
        >
          {tsunamis.length}
        </div>
        <div className="tf-stat-label">Eventos con tsunami</div>
        <div className="tf-stat-sub">
          {tsunamis.length > 0 ? 'Con alerta de tsunami' : 'Sin alertas'}
        </div>
      </div>
    </div>
  );
}
