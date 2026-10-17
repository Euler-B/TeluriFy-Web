import { MapContainer, TileLayer, Marker, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { AlertLevel } from '../utils/seismic';

interface Props {
  lat: number;
  lng: number;
  level: AlertLevel;
}

export default function SismoMiniMap({ lat, lng, level }: Props) {
  const icon = L.divIcon({
    className: '',
    html: `<div class="tf-marker tf-bg-${level}" style="width:26px;height:26px;opacity:0.92;"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });

  return (
    <div className="tf-card" style={{ padding: 0, overflow: 'hidden', borderRadius: 14 }}>
      <MapContainer
        center={[lat, lng]}
        zoom={7}
        minZoom={3}
        maxBounds={[[-85, -180], [85, 180]]}
        maxBoundsViscosity={1.0}
        style={{ height: 320, width: '100%' }}
        zoomControl={true}
      >
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="Satélite">
            <TileLayer
              noWrap={true}
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Estándar">
            <TileLayer
              noWrap={true}
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
