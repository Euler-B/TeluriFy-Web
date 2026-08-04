import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Sismo = {
  id: number;
  attributes: {
    title: string;
    place: string;
    magnitude: number;
    coordinates: { latitude: number; longitude: number };
    time: string;
    mag_type: string;
    tsunami: boolean;
    external_id: string;
  };
  links?: { external_url?: string };
};

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
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  async function submitReport(intensity: string) {
    setStatus('sending');
    try {
      const res = await fetch(
        `${import.meta.env.PUBLIC_API_URL}/v1/sismos/${sismoId}/reports`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ felt: intensity !== 'not_felt', intensity }),
        }
      );
      setStatus(res.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
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
      {status === 'error' && (
        <p style={{ margin: '8px 0 0', color: '#FF3B30', fontSize: 12, fontWeight: 600 }}>
          Hubo un error al enviar tu reporte. Intenta de nuevo.
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

  useEffect(() => {
    if (initialSismo) {
      setSismo(initialSismo);
      setLoading(false);
      return;
    }

    const apiUrl = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000';
    setLoading(true);

    async function loadSismo() {
      try {
        // 1. Try single item endpoint
        const res = await fetch(`${apiUrl}/v1/sismos/${sismoId}`);
        if (res.ok) {
          const json = await res.json();
          if (json.data && json.data.id) {
            setSismo(json.data);
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        // Ignore single fetch error, attempt list fetch next
      }

      // 2. Fallback: search in list endpoint
      try {
        const listRes = await fetch(`${apiUrl}/v1/sismos?per_page=1000`);
        if (listRes.ok) {
          const listJson = await listRes.json();
          const list: Sismo[] = listJson.data ?? [];
          const found = list.find(
            (item) =>
              String(item.id) === String(sismoId) ||
              item.attributes?.external_id === sismoId
          );
          if (found) {
            setSismo(found);
            setError(false);
          } else {
            setError(true);
          }
        } else {
          setError(true);
        }
      } catch (e) {
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadSismo();
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
        <a href="/" className="tf-button">
          <i className="ti ti-arrow-left" />
          Volver al mapa
        </a>
      </div>
    );
  }

  const { attributes: a, links } = sismo;
  const color = magnitudeColor(a.magnitude);
  const lat = a.coordinates.latitude;
  const lng = a.coordinates.longitude;

  const icon = L.divIcon({
    className: '',
    html: `<div style="width:24px;height:24px;border-radius:50%;background:${color}88;border:2px solid ${color};"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

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
              className="tf-button"
              style={{ marginTop: 14, fontSize: 12 }}
            >
              <i className="ti ti-external-link" />
              Ver en USGS
            </a>
          )}
        </div>
      </div>

      {/* Mini map */}
      <div className="tf-card" style={{ padding: 0, overflow: 'hidden' }}>
        <MapContainer
          center={[lat, lng]}
          zoom={7}
          style={{ height: 320, width: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={[lat, lng]} icon={icon} />
        </MapContainer>
      </div>

      {/* Report card */}
      <div className="tf-card">
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <i className="ti ti-message-report" style={{ color: 'var(--tf-accent)', fontSize: 17 }} />
          Reportar percepción ciudadana
        </div>
        <ReportForm sismoId={sismo.id} />
      </div>
    </div>
  );
}
