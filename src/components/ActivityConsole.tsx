import { useEffect, useMemo, useState } from 'react';
import type { Sismo } from '../services/api';
import { fetchSismosPage } from '../services/api';
import { formatApiDate, parseApiDate } from '../utils/date';
import { formatDepth, formatMagnitude, getSeismicStatus } from '../utils/seismic';

type LoadState = 'loading' | 'ready' | 'error';

const RECENT_LIMIT = 8;

function sortByTimeDesc(sismos: Sismo[]): Sismo[] {
  return [...sismos].sort(
    (a, b) =>
      (parseApiDate(b.attributes.time)?.getTime() ?? 0) -
      (parseApiDate(a.attributes.time)?.getTime() ?? 0)
  );
}

export default function ActivityConsole() {
  const [latest, setLatest] = useState<Sismo[]>([]);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function load() {
      try {
        const result = await fetchSismosPage(undefined, 1, 60, controller.signal);
        if (!active) return;
        setLatest(sortByTimeDesc(result.data));
        setState('ready');
      } catch {
        if (active) setState('error');
      }
    }

    load();

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const recent = useMemo(() => latest.slice(0, RECENT_LIMIT), [latest]);

  const topSismo = useMemo(() => {
    if (latest.length === 0) return null;
    return latest.reduce((max, sismo) =>
      sismo.attributes.magnitude > max.attributes.magnitude ? sismo : max
    );
  }, [latest]);

  if (state === 'loading') {
    return (
      <section className="tf-section" aria-label="Actividad sísmica en vivo">
        <div className="tf-loading" role="status" aria-label="Sincronizando señal sísmica">
          <div className="tf-loading-rings" aria-hidden="true">
            <span />
            <span />
            <span />
            <img className="tf-logo-on-dark" src="/brand/telurify-symbol.svg" alt="" width="36" height="36" />
            <img className="tf-logo-on-light" src="/brand/telurify-symbol-dark.svg" alt="" width="36" height="36" />
          </div>
          <div className="tf-loading-text">Sincronizando señal sísmica…</div>
          <div className="tf-loading-sub">Consultando la red global de monitoreo</div>
        </div>
      </section>
    );
  }

  if (state === 'error') {
    return (
      <section className="tf-section" aria-labelledby="tf-activity-title">
        <div className="tf-section-head">
          <div>
            <span className="tf-section-kicker">En vivo</span>
            <h2 className="tf-section-title tf-section-title--lg" id="tf-activity-title">
              Actividad sísmica en vivo
            </h2>
          </div>
        </div>
        <div className="tf-empty-state" role="alert">
          No se pudo conectar con la red sísmica en este momento. Verifica tu conexión o consulta
          el <a href="/mapa">mapa interactivo</a> nuevamente en unos segundos.
        </div>
      </section>
    );
  }

  return (
    <section className="tf-section" aria-labelledby="tf-activity-title">
      <div className="tf-section-head">
        <div>
          <span className="tf-section-kicker">En vivo</span>
          <h2 className="tf-section-title tf-section-title--lg" id="tf-activity-title">
            Actividad sísmica en vivo
          </h2>
        </div>
        <a className="tf-section-link" href="/mapa">
          Abrir mapa <i className="ti ti-arrow-up-right" aria-hidden="true" />
        </a>
      </div>

      <div className="tf-console-grid">
        <div className="tf-card">
          <h3 className="tf-section-title" style={{ fontSize: 15, marginBottom: 12 }}>
            Actividad más relevante
          </h3>
          {topSismo ? (
            <div className="tf-most-relevant">
              <div className="tf-most-relevant-top">
                <span
                  className="tf-most-relevant-mag"
                  style={{
                    color: getSeismicStatus(topSismo.attributes.magnitude, topSismo.attributes.tsunami)
                      .colorVar,
                  }}
                >
                  M {formatMagnitude(topSismo.attributes.magnitude)}
                </span>
                <span
                  className={
                    getSeismicStatus(topSismo.attributes.magnitude, topSismo.attributes.tsunami).chipClass
                  }
                >
                  {getSeismicStatus(topSismo.attributes.magnitude, topSismo.attributes.tsunami).label}
                </span>
              </div>
              <div className="tf-most-relevant-place">{topSismo.attributes.place}</div>
              <div className="tf-event-meta">
                <span className="tf-mono" title="Hora del evento (tu zona horaria)">
                  {formatApiDate(topSismo.attributes.time)}
                </span>
                {topSismo.attributes.depth !== undefined && (
                  <span className="tf-mono">Prof. {formatDepth(topSismo.attributes.depth)}</span>
                )}
              </div>
              <a
                href={`/sismos/${topSismo.id}`}
                className="tf-button-secondary"
                style={{ fontSize: 12, padding: '8px 14px', minHeight: 44, alignSelf: 'flex-start' }}
              >
                Ver detalle del evento
              </a>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
              Sin eventos relevantes en el periodo cargado.
            </p>
          )}
        </div>

        <div className="tf-card">
          <h3 className="tf-section-title" style={{ fontSize: 15, marginBottom: 12 }}>
            Actividad reciente
          </h3>
          {recent.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)' }}>
              No hay eventos para mostrar con los criterios actuales.
            </p>
          ) : (
            <ul className="tf-event-list">
              {recent.map((sismo) => {
                const status = getSeismicStatus(sismo.attributes.magnitude, sismo.attributes.tsunami);
                return (
                  <li key={sismo.id}>
                    <a className="tf-event-card" href={`/sismos/${sismo.id}`}>
                      <span className={`tf-event-mag ${status.bgClass}`} aria-hidden="true">
                        {formatMagnitude(sismo.attributes.magnitude)}
                      </span>
                      <span className="tf-event-body">
                        <span className="tf-event-place" title={sismo.attributes.place}>
                          {sismo.attributes.place}
                        </span>
                        <span className="tf-event-meta">
                          <span className="tf-mono" title="Hora del evento (tu zona horaria)">
                            {formatApiDate(sismo.attributes.time)}
                          </span>
                          <span className="tf-mono">Prof. {formatDepth(sismo.attributes.depth)}</span>
                        </span>
                      </span>
                      <span className="tf-event-side">
                        <span className={status.chipClass}>{status.label}</span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
