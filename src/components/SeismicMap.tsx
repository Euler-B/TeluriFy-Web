import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import type { Sismo } from '../services/api';
import { submitSismoReport, ApiError } from '../services/api';
import { formatApiDate } from '../utils/date';
import { formatDepth, formatMagnitude, getSeismicStatus } from '../utils/seismic';

const INTENSITY_OPTIONS = [
  { value: 'not_felt', label: 'No lo sentí' },
  { value: 'weak', label: 'Débil' },
  { value: 'light', label: 'Leve' },
  { value: 'moderate', label: 'Moderado' },
  { value: 'strong', label: 'Fuerte' },
  { value: 'severe', label: 'Severo' },
];

function magnitudeIcon(magnitude: number, tsunami?: boolean) {
  const magNum = Number(magnitude) || 0;
  const status = getSeismicStatus(magNum, tsunami);
  const size = Math.min(22 + magNum * 2.5, 44);
  return L.divIcon({
    className: '',
    html: `<div class="tf-marker ${status.bgClass}" style="width:${size}px;height:${size}px;">${magNum.toFixed(1)}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function userLocationIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:20px;height:20px;border-radius:50%;background:var(--signal-cyan);border:3px solid var(--surface);box-shadow:0 0 12px color-mix(in srgb, var(--signal-cyan) 80%, transparent);"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

// Distancia Haversine en km
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function MapFlyTo({ position }: { position: [number, number] | null }) {
  const map = useMap();
  React.useEffect(() => {
    if (position) {
      map.flyTo(position, 7, { duration: 1.5 });
    }
  }, [position, map]);
  return null;
}

function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return false;
  if (nLat < -90 || nLat > 90 || nLng < -180 || nLng > 180) return false;
  if (nLat === 0 && nLng === 0) return false;
  return true;
}

function MapResizer() {
  const map = useMap();

  React.useEffect(() => {
    map.invalidateSize();
    const timer1 = setTimeout(() => map.invalidateSize(), 100);
    const timer2 = setTimeout(() => map.invalidateSize(), 500);

    const handleResize = () => {
      map.invalidateSize();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      window.removeEventListener('resize', handleResize);
    };
  }, [map]);

  return null;
}

// Ajusta los límites del mapa cuando cambia el conjunto de sismos o los filtros
function MapBoundsFitter({ sismos, userPos }: { sismos: Sismo[]; userPos: [number, number] | null }) {
  const map = useMap();

  React.useEffect(() => {
    if (userPos) return;
    if (!sismos || sismos.length === 0) return;

    const validCoords: [number, number][] = sismos
      .filter((s) => isValidCoordinate(s.attributes.coordinates.latitude, s.attributes.coordinates.longitude))
      .map((s) => [
        Number(s.attributes.coordinates.latitude),
        Number(s.attributes.coordinates.longitude),
      ] as [number, number]);

    if (validCoords.length > 0) {
      const bounds = L.latLngBounds(validCoords);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [30, 30], maxZoom: 8 });
      }
    }
  }, [sismos, userPos, map]);

  return null;
}

function ReportForm({ sismoId }: { sismoId: number }) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error' | 'rate_limited'>('idle');
  const [selectedValue, setSelectedValue] = useState('');
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
        setErrorMessage('Hubo un error, intenta de nuevo.');
      }
      setSelectedValue('');
    }
  }

  if (status === 'sent') {
    return (
      <p style={{ margin: 0, color: 'var(--signal-green)', fontWeight: 600, fontSize: 12 }}>
        ¡Gracias por tu reporte!
      </p>
    );
  }

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
        aria-label="Intensidad percibida del sismo"
        style={{
          fontSize: 12,
          padding: '6px 8px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--background)',
          color: 'var(--text-primary)',
          width: '100%',
          minHeight: 36,
        }}
      >
        <option value="" disabled>Selecciona intensidad</option>
        {INTENSITY_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {(status === 'error' || status === 'rate_limited') && (
        <p style={{ margin: '4px 0 0', color: 'var(--alert-coral)', fontSize: 11 }}>{errorMessage}</p>
      )}
    </div>
  );
}

function SismoMarkerItem({ sismo }: { sismo: Sismo }) {
  const [isOpen, setIsOpen] = useState(false);

  const lat = Number(sismo.attributes.coordinates.latitude);
  const lng = Number(sismo.attributes.coordinates.longitude);
  const magRaw = Number(sismo.attributes.magnitude);
  const mag = isNaN(magRaw) ? 0 : magRaw;
  const status = getSeismicStatus(mag, sismo.attributes.tsunami);

  if (!isValidCoordinate(lat, lng)) return null;

  return (
    <Marker
      position={[lat, lng]}
      icon={magnitudeIcon(mag, sismo.attributes.tsunami)}
      eventHandlers={{
        popupopen: () => setIsOpen(true),
        popupclose: () => setIsOpen(false),
      }}
    >
      <Popup>
        <div style={{ minWidth: 200 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>{sismo.attributes.place}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
            <span className="tf-mono" style={{ fontSize: 14, fontWeight: 600, color: status.colorVar }}>
              M {formatMagnitude(mag)}
            </span>
            <span className={status.chipClass}>{status.label}</span>
          </div>
          <div className="tf-mono" style={{ fontSize: 11, color: 'var(--text-secondary)', display: 'grid', gap: 2, marginBottom: 8 }}>
            <span title="Hora del evento (tu zona horaria)">{formatApiDate(sismo.attributes.time)}</span>
            <span>Prof. {formatDepth(sismo.attributes.depth)}</span>
            <span>{lat.toFixed(3)}°, {lng.toFixed(3)}°</span>
            {sismo.attributes.mag_type && <span style={{ textTransform: 'uppercase' }}>{sismo.attributes.mag_type}</span>}
          </div>
          {sismo.attributes.tsunami && (
            <div style={{ color: 'var(--alert-coral)', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>
              <i className="ti ti-waves" style={{ marginRight: 4 }} aria-hidden="true" /> Alerta de tsunami asociada
            </div>
          )}
          <a
            href={`/sismos/${sismo.id}`}
            className="tf-button-primary"
            style={{
              fontSize: 11,
              padding: '6px 12px',
              minHeight: 36,
              display: 'inline-flex',
              marginBottom: 4,
              textDecoration: 'none',
            }}
          >
            Ver detalle
          </a>
          {isOpen && <ReportForm sismoId={sismo.id} />}
        </div>
      </Popup>
    </Marker>
  );
}

type Props = {
  sismos: Sismo[];
};

export default function SeismicMap({ sismos }: Props) {
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSismoPos, setSelectedSismoPos] = useState<[number, number] | null>(null);
  const [selectedSismoId, setSelectedSismoId] = useState<number | null>(null);

  const SIDEBAR_PER_PAGE = 10;
  const totalPages = Math.max(1, Math.ceil(sismos.length / SIDEBAR_PER_PAGE));

  useEffect(() => {
    setCurrentPage(1);
    setSelectedSismoPos(null);
    setSelectedSismoId(null);
  }, [sismos]);

  const currentPageSismos = useMemo(() => {
    const start = (currentPage - 1) * SIDEBAR_PER_PAGE;
    return sismos.slice(start, start + SIDEBAR_PER_PAGE);
  }, [sismos, currentPage]);

  const flyToPos = selectedSismoPos || userPos;

  const closestSismoInfo = useMemo<{ sismo: Sismo; distKm: number } | null>(() => {
    if (!userPos || sismos.length === 0) return null;
    const [uLat, uLng] = userPos;
    let minDistance = Infinity;
    let nearest: Sismo | null = null;
    sismos.forEach((s) => {
      const sLat = s.attributes.coordinates.latitude;
      const sLng = s.attributes.coordinates.longitude;
      if (!isValidCoordinate(sLat, sLng)) return;
      const dist = calculateDistanceKm(uLat, uLng, Number(sLat), Number(sLng));
      if (dist < minDistance) {
        minDistance = dist;
        nearest = s;
      }
    });
    return nearest ? { sismo: nearest, distKm: Math.round(minDistance) } : null;
  }, [userPos, sismos]);

  function handleLocateUser() {
    if (!navigator.geolocation) {
      setGeoError('Geolocalización no soportada en este navegador.');
      return;
    }
    setGeoError(null);
    setIsLocating(true);

    const onSuccess = (pos: GeolocationPosition) => {
      setIsLocating(false);
      const uLat = pos.coords.latitude;
      const uLng = pos.coords.longitude;
      setUserPos([uLat, uLng]);
    };

    function getGeoErrorMessage(e: GeolocationPositionError): string {
      switch (e.code) {
        case e.PERMISSION_DENIED:
          return 'Permiso de ubicación denegado por el navegador o el usuario.';
        case e.POSITION_UNAVAILABLE:
          return 'No se pudo obtener la posición geográfica actual. Comprueba la señal GPS o de red.';
        case e.TIMEOUT:
          return 'La solicitud de ubicación excedió el tiempo de respuesta. Inténtalo de nuevo.';
        default:
          return 'No se pudo determinar la ubicación del dispositivo.';
      }
    }

    const onError = (err: GeolocationPositionError) => {
      if (err.code === err.PERMISSION_DENIED) {
        setIsLocating(false);
        setGeoError(getGeoErrorMessage(err));
      } else {
        navigator.geolocation.getCurrentPosition(
          onSuccess,
          (fallbackErr) => {
            setIsLocating(false);
            setGeoError(getGeoErrorMessage(fallbackErr));
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
        );
      }
    };

    navigator.geolocation.getCurrentPosition(onSuccess, onError, {
      enableHighAccuracy: false,
      timeout: 8000,
      maximumAge: 300000,
    });
  }

  return (
    <div>
      {/* Botón de ubicación e información contextual */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 10,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
          {userPos ? (
            <span style={{ color: 'var(--signal-green)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-check" aria-hidden="true" /> Ubicación GPS activa
            </span>
          ) : (
            'Explora los sismos en el mapa interactivo y listado lateral:'
          )}
        </div>

        <button
          onClick={handleLocateUser}
          disabled={isLocating}
          className="tf-button-secondary"
          style={{ fontSize: 12, padding: '8px 14px' }}
        >
          <i className="ti ti-current-location" aria-hidden="true" />
          {isLocating ? 'Obteniendo ubicación…' : 'Mi ubicación'}
        </button>
      </div>

      {geoError && (
        <div
          role="alert"
          style={{
            padding: '8px 12px',
            marginBottom: 10,
            borderRadius: 10,
            background: 'color-mix(in srgb, var(--alert-coral) 12%, transparent)',
            border: '1px solid color-mix(in srgb, var(--alert-coral) 40%, transparent)',
            color: 'var(--alert-coral)',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <i className="ti ti-alert-circle" style={{ fontSize: 16 }} aria-hidden="true" />
          <span>{geoError}</span>
        </div>
      )}

      {closestSismoInfo && (
        <div
          style={{
            padding: '8px 12px',
            marginBottom: 10,
            borderRadius: 10,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <span>
            Sismo más cercano a tu ubicación: <strong>{closestSismoInfo.sismo.attributes.place}</strong>{' '}
            <span className="tf-mono">({closestSismoInfo.distKm} km)</span>
          </span>
          <a
            href={`/sismos/${closestSismoInfo.sismo.id}`}
            style={{ color: 'var(--signal-cyan)', textDecoration: 'none', fontWeight: 700, fontSize: 11 }}
          >
            Ver detalle
          </a>
        </div>
      )}

      {/* Vista dividida: listado + mapa */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'stretch',
          width: '100%',
        }}
      >
        {/* Listado lateral */}
        <div className="tf-map-sidebar">
          <div className="tf-map-sidebar-head">
            <div>
              <div className="tf-map-sidebar-title">
                <i className="ti ti-list-details" style={{ color: 'var(--signal-cyan)', marginRight: 6 }} aria-hidden="true" />
                Listado de sismos
              </div>
              <div className="tf-map-sidebar-sub">
                Página {currentPage} de {totalPages} · {sismos.length.toLocaleString('es-ES')} eventos
              </div>
            </div>
            <span className="tf-status-chip tf-status--observacion">Tiempo real</span>
          </div>

          <div className="tf-map-sidebar-body">
            {currentPageSismos.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>
                No se encontraron sismos con los filtros seleccionados.
              </div>
            ) : (
              currentPageSismos.map((s) => {
                const lat = Number(s.attributes.coordinates.latitude);
                const lng = Number(s.attributes.coordinates.longitude);
                const mag = Number(s.attributes.magnitude) || 0;
                const status = getSeismicStatus(mag, s.attributes.tsunami);
                const isSelected = selectedSismoId === s.id;
                const validPos = isValidCoordinate(lat, lng);

                return (
                  <button
                    type="button"
                    key={s.id}
                    disabled={!validPos}
                    aria-pressed={isSelected}
                    onClick={() => {
                      if (validPos) {
                        setSelectedSismoPos([lat, lng]);
                        setSelectedSismoId(s.id);
                      }
                    }}
                    className="tf-sismo-item"
                    style={{ opacity: validPos ? 1 : 0.6, cursor: validPos ? 'pointer' : 'default' }}
                  >
                    <div className={`tf-sismo-item-mag ${status.bgClass}`} aria-hidden="true">
                      {formatMagnitude(mag)}
                    </div>

                    <div className="tf-sismo-item-body">
                      <div className="tf-sismo-item-place" title={s.attributes.place}>
                        {s.attributes.place}
                      </div>
                      <div className="tf-sismo-item-time" title="Hora del evento (tu zona horaria)">
                        {formatApiDate(s.attributes.time)} · Prof. {formatDepth(s.attributes.depth)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                      <span className={status.chipClass}>{status.label}</span>
                      {s.attributes.tsunami && (
                        <span title="Alerta de tsunami" style={{ color: 'var(--alert-coral)', fontSize: 14 }}>
                          <i className="ti ti-waves" aria-hidden="true" /><span className="tf-visually-hidden">Alerta de tsunami</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="tf-map-sidebar-foot">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="tf-button-secondary"
              style={{ fontSize: 11, padding: '6px 12px', minHeight: 36 }}
            >
              Anterior
            </button>
            <span className="tf-mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="tf-button-secondary"
              style={{ fontSize: 11, padding: '6px 12px', minHeight: 36 }}
            >
              Siguiente
            </button>
          </div>
        </div>

        {/* Mapa */}
        <div
          className="tf-map-wrap"
          style={{
            flex: '1 1 480px',
            minWidth: 280,
            height: 560,
            border: '1px solid var(--border)',
            position: 'relative',
          }}
        >
          <MapContainer
            center={[15, 0]}
            zoom={2}
            minZoom={1.8}
            maxBounds={[[-85, -180], [85, 180]]}
            maxBoundsViscosity={1.0}
            scrollWheelZoom={true}
            style={{ height: '100%', width: '100%' }}
          >
            <MapResizer />
            <MapFlyTo position={flyToPos} />
            <MapBoundsFitter sismos={sismos} userPos={userPos} />

            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Satélite">
                <TileLayer
                  noWrap={true}
                  bounds={[[-85, -180], [85, 180]]}
                  minZoom={1.8}
                  attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
              </LayersControl.BaseLayer>
              <LayersControl.BaseLayer name="Estándar">
                <TileLayer
                  noWrap={true}
                  bounds={[[-85, -180], [85, 180]]}
                  minZoom={1.8}
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              </LayersControl.BaseLayer>
            </LayersControl>

            {userPos && (
              <Marker position={userPos} icon={userLocationIcon()}>
                <Popup>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>Tu ubicación actual</div>
                </Popup>
              </Marker>
            )}

            <MarkerClusterGroup chunkedLoading>
              {sismos.map((sismo) => (
                <SismoMarkerItem key={sismo.id} sismo={sismo} />
              ))}
            </MarkerClusterGroup>
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
