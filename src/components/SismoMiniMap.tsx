import { MapContainer, TileLayer, Marker, LayersControl } from 'react-leaflet';
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
        <Marker position={[lat, lng]} icon={icon} />
      </MapContainer>
    </div>
  );
}
