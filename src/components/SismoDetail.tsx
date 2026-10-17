import React, { useEffect, useState } from 'react';
import type { Sismo } from '../services/api';
import { submitSismoReport, ApiError } from '../services/api';
import type { AlertLevel } from '../utils/seismic';
import { formatDepth, formatMagnitude, getSeismicStatus } from '../utils/seismic';
import ShareExportCard from './ShareExportCard';
import { formatEventDateWithZone } from '../utils/date';

const INTENSITY_OPTIONS = [
  { value: 'not_felt', label: 'No lo sentí' },
  { value: 'weak', label: 'Débil' },
  { value: 'light', label: 'Leve' },
  { value: 'moderate', label: 'Moderado' },
  { value: 'strong', label: 'Fuerte' },
  { value: 'severe', label: 'Severo' },
];

function ReportForm({ sismoId }: { sismoId: number }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error' | 'rate_limited'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  async function submitReport(intensity: string) {
    setStatus('sending');
    setErrorMessage('');
    try {
      await submitSismoReport(sismoId, intensity !== 'not_felt', intensity);
      setStatus('sent');
    } catch (err: unknown) {
      if (err instanceof ApiError && err.isRateLimited) {
        setStatus('rate_limited');
        setErrorMessage(err.message);
      } else {
        setStatus('error');
        setErrorMessage('Hubo un error al enviar tu reporte. Intenta de nuevo.');
      }
    }
  }

  if (status === 'sent') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--signal-green)', fontWeight: 700, fontSize: 14 }}>
        <i className="ti ti-circle-check-filled" style={{ fontSize: 18 }} aria-hidden="true" />
        ¡Gracias por tu reporte ciudadano!
      </div>
    );
  }

  return (
    <div>
      <p style={{ margin: '0 0 10px', fontWeight: 600, fontSize: 14 }}>¿Sentiste este sismo?</p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {INTENSITY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            disabled={status === 'sending'}
            onClick={() => submitReport(opt.value)}
            className="tf-button-secondary"
            style={{ fontSize: 12, padding: '8px 14px' }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {(status === 'error' || status === 'rate_limited') && (
        <p style={{ margin: '8px 0 0', color: 'var(--alert-coral)', fontSize: 12, fontWeight: 600 }}>
          {errorMessage}
        </p>
      )}
    </div>
  );
}

type Props = {
  sismoId: string;
  initialSismo?: Sismo | null;
};

export default function SismoDetail({ sismoId, initialSismo }: Props) {
  const [sismo, setSismo] = useState<Sismo | null>(initialSismo ?? null);
  const [loading, setLoading] = useState(!initialSismo);
  const [error, setError] = useState(false);
  const [MiniMap, setMiniMap] = useState<React.ComponentType<{ lat: number; lng: number; level: AlertLevel }> | null>(null);

  useEffect(() => {
    import('./SismoMiniMap').then((mod) => setMiniMap(() => mod.default));
  }, []);

  useEffect(() => {
    if (initialSismo) {
      setSismo(initialSismo);
      setLoading(false);
      return;
    }

    let active = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    setLoading(true);

    async function loadSismo() {
      try {
        // Usar el origen web para que los móviles nunca resuelvan el host del API como localhost.
        const response = await fetch(
          `/api/sismos/${encodeURIComponent(sismoId)}`,
          { signal: controller.signal }
        );
        const json = response.ok ? await response.json() : null;
        const found: Sismo | null = json?.data ?? null;
        if (active) {
          setSismo(found);
          setError(!found);
        }
      } catch {
        if (active) setError(true);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSismo();

    return () => {
      active = false;
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [sismoId, initialSismo]);

  if (loading) {
    return (
      <div className="tf-loading" role="status">
        <div className="tf-loading-rings" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <div className="tf-loading-text">Cargando evento #{sismoId}…</div>
      </div>
    );
  }

  if (error || !sismo) {
    return (
      <div className="tf-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <i className="ti ti-seismograph" style={{ fontSize: 40, color: 'var(--text-secondary)', display: 'block', marginBottom: 12 }} aria-hidden="true" />
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Sismo no encontrado</h1>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500, margin: '0 0 20px' }}>
          El evento sísmico con ID <code className="tf-mono">{sismoId}</code> no fue encontrado en los datos actuales.
        </p>
        <a href="/mapa" className="tf-button-secondary">
          Volver al mapa
        </a>
      </div>
    );
  }

  const { attributes: a, links } = sismo;
  const status = getSeismicStatus(a.magnitude, a.tsunami);
  const lat = a.coordinates.latitude;
  const lng = a.coordinates.longitude;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Tarjeta de encabezado */}
      <div className="tf-card" style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flexWrap: 'wrap' }}>
        <div
          style={{
            background: `color-mix(in srgb, ${status.colorVar} 14%, transparent)`,
            border: `2px solid ${status.colorVar}`,
            borderRadius: 14,
            padding: '12px 20px',
            textAlign: 'center',
            minWidth: 100,
          }}
        >
          <div className="tf-mono" style={{ fontSize: 30, fontWeight: 600, color: status.colorVar, letterSpacing: -1 }}>
            M {formatMagnitude(a.magnitude)}
          </div>
          <div style={{ marginTop: 4 }}>
            <span className={status.chipClass}>{status.label}</span>
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1 style={{ margin: '0 0 10px', fontSize: 20, fontWeight: 700, letterSpacing: -0.3 }}>
            {a.place}
          </h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span title="Hora del evento en tu zona horaria">
              <i className="ti ti-clock" style={{ marginRight: 6, color: 'var(--signal-cyan)' }} aria-hidden="true" />
              <span className="tf-mono" style={{ fontSize: 12.5 }}>{formatEventDateWithZone(a.time, true)}</span>
            </span>
            <span>
              <i className="ti ti-arrow-down" style={{ marginRight: 6, color: 'var(--signal-cyan)' }} aria-hidden="true" />
              Profundidad: <span className="tf-mono" style={{ fontSize: 12.5 }}>{formatDepth(a.depth)}</span>
            </span>
            <span>
              <i className="ti ti-map-pin" style={{ marginRight: 6, color: 'var(--signal-cyan)' }} aria-hidden="true" />
              <span className="tf-mono" style={{ fontSize: 12.5 }}>{lat.toFixed(4)}°, {lng.toFixed(4)}°</span>
            </span>
            {a.mag_type && (
              <span>
                <i className="ti ti-tag" style={{ marginRight: 6, color: 'var(--signal-cyan)' }} aria-hidden="true" />
                Tipo de magnitud: <span className="tf-mono" style={{ fontSize: 12.5, textTransform: 'uppercase' }}>{a.mag_type}</span>
              </span>
            )}
            {a.tsunami && (
              <span style={{ color: 'var(--alert-coral)', fontWeight: 700 }}>
                <i className="ti ti-waves" style={{ marginRight: 6 }} aria-hidden="true" />
                Alerta de tsunami asociada
              </span>
            )}
          </div>
          {links?.external_url && (
            <a
              href={links.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="tf-button-secondary"
              style={{ marginTop: 16, fontSize: 12 }}
            >
              Ver en USGS
            </a>
          )}
        </div>
      </div>

      {/* Mini mapa */}
      {MiniMap ? (
        <MiniMap lat={lat} lng={lng} level={status.level} />
      ) : (
        <div className="tf-card" style={{ height: 320, background: 'var(--background)' }} />
      )}

      {/* Tarjeta de reporte */}
      <div className="tf-card">
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-message-report" style={{ color: 'var(--signal-cyan)', fontSize: 17 }} aria-hidden="true" />
          Reportar percepción ciudadana
        </div>
        <ReportForm sismoId={sismo.id} />
      </div>

      {/* Compartir y exportar */}
      <ShareExportCard sismo={sismo} />
    </div>
  );
}
