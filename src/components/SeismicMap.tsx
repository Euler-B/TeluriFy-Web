import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export type Sismo = {
  id: number;
  attributes: {
    title: string;
    place: string;
    magnitude: number;
    coordinates: { latitude: number; longitude: number };
    time: string;
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

function magnitudeColor(magnitude: number): string {
  if (magnitude >= 6.0) return '#FF3B30';
  if (magnitude >= 5.0) return '#FF9500';
  if (magnitude >= 3.0) return '#FFCC00';
  return '#34C759';
}

function magnitudeIcon(magnitude: number) {
  const color = magnitudeColor(magnitude);
  const size = Math.min(14 + magnitude * 3, 40);
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color}88;border:1.5px solid ${color};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#1D1D1F;"></div>`,
    iconSize: [size, size],
  });
}

function ReportForm({ sismoId }: { sismoId: number }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [selectedValue, setSelectedValue] = useState('');

  async function submitReport(intensity: string) {
    setStatus('sending');
    try {
      const apiUrl = import.meta.env.PUBLIC_API_URL;
      if (!apiUrl) throw new Error('PUBLIC_API_URL is not set');
      const res = await fetch(
        `${apiUrl}/v1/sismos/${sismoId}/reports`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ felt: intensity !== 'not_felt', intensity }),
        }
      );
      if (res.ok) {
        setStatus('sent');
      } else {
        setStatus('error');
        setSelectedValue('');
      }
    } catch {
      setStatus('error');
      setSelectedValue('');
    }
  }

  if (status === 'sent') return <p style={{ margin: 0, color: '#34C759', fontWeight: 600 }}>¡Gracias por tu reporte!</p>;

  return (
    <div style={{ marginTop: 8 }}>
      <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600 }}>¿Sentiste este sismo?</p>
      <select
        disabled={status === 'sending'}
        value={selectedValue}
        onChange={(e) => {
          const val = e.target.value;
          setSelectedValue(val);
          if (val) submitReport(val);
        }}
        style={{ fontSize: 12, padding: '4px 6px', borderRadius: 6, border: '1px solid rgba(0,0,0,0.15)', width: '100%' }}
      >
        <option value="" disabled>Selecciona intensidad</option>
        {INTENSITY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {status === 'error' && <p style={{ margin: '4px 0 0', color: '#FF3B30', fontSize: 11 }}>Hubo un error, intenta de nuevo.</p>}
    </div>
  );
}

type Props = {
  sismos: Sismo[];
};

export default function SeismicMap({ sismos }: Props) {
  const [minMag, setMinMag] = useState(0);

  const filtered = sismos.filter((s) => s.attributes.magnitude >= minMag);

  return (
    <div>
      {/* Filter bar */}
      <div className="tf-filter-bar">
        <i className="ti ti-adjustments-horizontal" style={{ fontSize: 14, color: 'var(--tf-accent)' }} />
        <span>Magnitud mínima:</span>
        <input
          type="range"
          min={0}
          max={8}
          step={0.5}
          value={minMag}
          onChange={(e) => setMinMag(Number(e.target.value))}
        />
        <span
          style={{
            fontWeight: 700,
            color: magnitudeColor(minMag),
            minWidth: 28,
            textAlign: 'center',
          }}
        >
          {minMag.toFixed(1)}+
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--tf-text-secondary)' }}>
          {filtered.length.toLocaleString()} eventos
        </span>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center', marginBottom: 10, fontSize: 11, color: 'var(--tf-text-secondary)', fontWeight: 600 }}>
        <span><i className="ti ti-point-filled" style={{ color: '#34C759' }} /> Leve (&lt;3.0)</span>
        <span><i className="ti ti-point-filled" style={{ color: '#FFCC00' }} /> Moderado (3–5)</span>
        <span><i className="ti ti-point-filled" style={{ color: '#FF9500' }} /> Fuerte (5–6)</span>
        <span><i className="ti ti-point-filled" style={{ color: '#FF3B30' }} /> Severo (≥6)</span>
      </div>

      <MapContainer
        center={[-15, -70]}
        zoom={3}
        style={{ height: '500px', width: '100%', borderRadius: 10 }}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Satélite">
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Estándar">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
        </LayersControl>
        <MarkerClusterGroup chunkedLoading>
          {filtered.map((sismo) => (
            <Marker
              key={sismo.id}
              position={[
                sismo.attributes.coordinates.latitude,
                sismo.attributes.coordinates.longitude,
              ]}
              icon={magnitudeIcon(sismo.attributes.magnitude)}
            >
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{sismo.attributes.place}</div>
                  <div style={{ fontSize: 12, color: magnitudeColor(sismo.attributes.magnitude), fontWeight: 700 }}>
                    M {sismo.attributes.magnitude.toFixed(1)}
                  </div>
                  <div style={{ fontSize: 11, color: '#6E6E73', margin: '4px 0 8px' }}>
                    {new Date(sismo.attributes.time).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                  <a href={`/sismos/${sismo.id}`} style={{ fontSize: 11, color: '#5856D6', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                    Ver detalle →
                  </a>
                  <ReportForm sismoId={sismo.id} />
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
