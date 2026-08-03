import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

type Sismo = {
  id: number;
  attributes: {
    title: string;
    place: string;
    magnitude: number;
    coordinates: {
      latitude: number;
      longitude: number;
    };
    time: string;
  };
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
  if (magnitude >= 6.0) return '#FF3B30'; // severo
  if (magnitude >= 5.0) return '#FF9500'; // fuerte
  if (magnitude >= 3.0) return '#FFCC00'; // moderado
  return '#34C759'; // leve
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

  if (status === 'sent') return <p>¡Gracias por tu reporte!</p>;

  return (
    <div>
      <p>¿Sentiste este sismo?</p>
      <select
        disabled={status === 'sending'}
        defaultValue=""
        onChange={(e) => e.target.value && submitReport(e.target.value)}
      >
        <option value="" disabled>
          Selecciona una intensidad
        </option>
        {INTENSITY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {status === 'error' && <p>Hubo un error, intenta de nuevo.</p>}
    </div>
  );
}

export default function SeismicMap() {
  const [sismos, setSismos] = useState<Sismo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.PUBLIC_API_URL}/v1/sismos?per_page=1000`)
      .then((res) => res.json())
      .then((json) => setSismos(json.data ?? []))
      .catch(() => setSismos([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Cargando sismos recientes...</p>;

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginBottom: 10, fontSize: 11, color: 'var(--tf-text-secondary)', fontWeight: 600 }}>
        <span><i className="ti ti-point-filled" style={{ color: '#34C759' }} /> Leve</span>
        <span><i className="ti ti-point-filled" style={{ color: '#FFCC00' }} /> Moderado</span>
        <span><i className="ti ti-point-filled" style={{ color: '#FF9500' }} /> Fuerte</span>
        <span><i className="ti ti-point-filled" style={{ color: '#FF3B30' }} /> Severo</span>
      </div>
      <MapContainer
        center={[-15, -70]}
        zoom={3}
        style={{ height: '500px', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MarkerClusterGroup chunkedLoading>
          {sismos.map((sismo) => (
            <Marker
              key={sismo.id}
              position={[
                sismo.attributes.coordinates.latitude,
                sismo.attributes.coordinates.longitude,
              ]}
              icon={magnitudeIcon(sismo.attributes.magnitude)}
            >
              <Popup>
                <strong>{sismo.attributes.place}</strong>
                <br />
                Magnitud: {sismo.attributes.magnitude}
                <br />
                <ReportForm sismoId={sismo.id} />
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
