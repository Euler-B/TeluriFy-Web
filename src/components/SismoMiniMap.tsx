import React from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface Props {
  lat: number;
  lng: number;
  color: string;
}

export default function SismoMiniMap({ lat, lng, color }: Props) {
  const icon = L.divIcon({
    className: '',
    html: `<div style="width:24px;height:24px;border-radius:50%;background:${color}88;border:2px solid ${color};"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  return (
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
  );
}
