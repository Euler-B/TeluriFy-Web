import React, { useEffect, useState } from 'react';
import type { Sismo } from '../services/api';
import { submitSismoReport, ApiError } from '../services/api';
import ShareExportCard from './ShareExportCard';

const INTENSITY_OPTIONS = [
  { value: 'not_felt', label: 'No lo sentí' },
  { value: 'weak', label: 'Débil' },
  { value: 'light', label: 'Leve' },
  { value: 'moderate', label: 'Moderado' },
  { value: 'strong', label: 'Fuerte' },
  { value: 'severe', label: 'Severo' },
];

function magnitudeColor(mag: number) {
  if (mag >= 6.0) return '#FF3B30';
  if (mag >= 5.0) return '#FF9500';
  if (mag >= 3.0) return '#FFCC00';
  return '#34C759';
}

function magnitudeLabel(mag: number) {
  if (mag >= 6.0) return 'Severo';
  if (mag >= 5.0) return 'Fuerte';
  if (mag >= 3.0) return 'Moderado';
  return 'Leve';
}

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#34C759', fontWeight: 700, fontSize: 14 }}>
        <i className="ti ti-circle-check-filled" style={{ fontSize: 18 }} />
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
            style={{
              fontSize: 12,
              fontWeight: 700,
              padding: '7px 14px',
              borderRadius: 8,
              border: '1px solid var(--tf-border)',
              background: 'var(--tf-bg)',
              cursor: 'pointer',
              color: 'var(--tf-text)',
              transition: 'background 0.12s, border-color 0.12s',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.background = 'var(--tf-accent)';
              (e.target as HTMLButtonElement).style.color = '#fff';
              (e.target as HTMLButtonElement).style.borderColor = 'var(--tf-accent)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.background = 'var(--tf-bg)';
              (e.target as HTMLButtonElement).style.color = 'var(--tf-text)';
              (e.target as HTMLButtonElement).style.borderColor = 'var(--tf-border)';
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {(status === 'error' || status === 'rate_limited') && (
        <p style={{ margin: '8px 0 0', color: '#FF3B30', fontSize: 12, fontWeight: 600 }}>
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
  const [MiniMap, setMiniMap] = useState<React.ComponentType<{ lat: number; lng: number; color: string }> | null>(null);

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
    const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
    setLoading(true);

    async function loadSismo() {
      try {
        const PER_PAGE = 1000;
        let page = 1;
        let total = Infinity;

        while ((page - 1) * PER_PAGE < total) {
          const res = await fetch(
            `${apiUrl}/v1/sismos?per_page=${PER_PAGE}&page=${page}`,
            { signal: controller.signal }
          );
          if (!active) return;
          if (!res.ok) { if (active) setError(true); break; }
          const json = await res.json();
          if (!active) return;
          if (!Array.isArray(json.data)) { if (active) setError(true); break; }

          total = json.pagination?.total ?? json.data.length;

          const found: Sismo | undefined = json.data.find(
            (item: Sismo) =>
              String(item.id) === String(sismoId) ||
              item.attributes?.external_id === sismoId
          );
          if (found) {
            if (active) { setSismo(found); setError(false); }
            break;
          }
          if (page * PER_PAGE >= total) {
            if (active) setError(true);
            break;
          }
          page++;
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
      <div className="tf-card" style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--tf-text-secondary)' }}>
        <i className="ti ti-loader-2" style={{ fontSize: 24, animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 12px' }} />
        Cargando detalles del sismo #{sismoId}...
      </div>
    );
  }

  if (error || !sismo) {
    return (
      <div className="tf-card" style={{ textAlign: 'center', padding: '48px 24px' }}>
        <i className="ti ti-seismograph" style={{ fontSize: 40, color: 'var(--tf-text-secondary)', display: 'block', marginBottom: 12 }} />
        <h1 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Sismo no encontrado</h1>
        <p style={{ fontSize: 14, color: 'var(--tf-text-secondary)', fontWeight: 500, margin: '0 0 20px' }}>
          El evento sísmico con ID <code>{sismoId}</code> no fue encontrado en los datos actuales.
        </p>
        <a href="/mapa" className="tf-button-secondary" style={{ padding: '8px 16px', fontSize: 13, textDecoration: 'none', display: 'inline-block' }}>
          Volver al mapa
        </a>
      </div>
    );
  }

  const { attributes: a, links } = sismo;
  const color = magnitudeColor(a.magnitude);
  const lat = a.coordinates.latitude;
  const lng = a.coordinates.longitude;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Header card */}
      <div className="tf-card" style={{ display: 'flex', alignItems: 'flex-start', gap: 20, flexWrap: 'wrap' }}>
        <div
          style={{
            background: `${color}18`,
            border: `2px solid ${color}`,
            borderRadius: 16,
            padding: '12px 20px',
            textAlign: 'center',
            minWidth: 90,
          }}
        >
          <div style={{ fontSize: 32, fontWeight: 700, color, letterSpacing: -1 }}>
            M {a.magnitude.toFixed(1)}
          </div>
          <div style={{ fontSize: 11, fontWeight: 700, color, marginTop: 2 }}>
            {magnitudeLabel(a.magnitude)}
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: '0 0 6px', fontSize: 20, fontWeight: 700, letterSpacing: -0.3 }}>
            {a.place}
          </h1>
          <div style={{ fontSize: 13, color: 'var(--tf-text-secondary)', fontWeight: 500, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span>
              <i className="ti ti-clock" style={{ marginRight: 6, color: 'var(--tf-accent)' }} />
              {new Date(a.time).toLocaleString('es', { dateStyle: 'full', timeStyle: 'medium' })}
            </span>
            <span>
              <i className="ti ti-map-pin" style={{ marginRight: 6, color: 'var(--tf-accent)' }} />
              {lat.toFixed(4)}°, {lng.toFixed(4)}°
            </span>
            {a.mag_type && (
              <span>
                <i className="ti ti-tag" style={{ marginRight: 6, color: 'var(--tf-accent)' }} />
                Tipo: {a.mag_type.toUpperCase()}
              </span>
            )}
            {a.tsunami && (
              <span style={{ color: '#FF3B30', fontWeight: 700 }}>
                <i className="ti ti-waves" style={{ marginRight: 6 }} />
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
              style={{ marginTop: 14, fontSize: 12, display: 'inline-block' }}
            >
              Ver en USGS
            </a>
          )}
        </div>
      </div>

      {/* Mini map */}
      {MiniMap ? (
        <MiniMap lat={lat} lng={lng} color={color} />
      ) : (
        <div className="tf-card" style={{ height: 320, background: 'var(--tf-bg)' }} />
      )}

      {/* Report card */}
      <div className="tf-card">
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-message-report" style={{ color: 'var(--tf-accent)', fontSize: 17 }} />
          Reportar percepción ciudadana
        </div>
        <ReportForm sismoId={sismo.id} />
      </div>

      {/* Share and Export card */}
      <ShareExportCard sismo={sismo} />
    </div>
  );
}
