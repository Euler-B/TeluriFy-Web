import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, LayersControl, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import type { Sismo } from '../services/api';
import { submitSismoReport, ApiError } from '../services/api';
import { formatApiDate } from '../utils/date';

const INTENSITY_OPTIONS = [
  { value: 'not_felt', label: 'No lo sentí' },
  { value: 'weak', label: 'Débil' },
  { value: 'light', label: 'Leve' },
  { value: 'moderate', label: 'Moderado' },
  { value: 'strong', label: 'Fuerte' },
  { value: 'severe', label: 'Severo' },
];

function magnitudeColor(magnitude: number): string {
  const m = Number(magnitude) || 0;
  if (m >= 6.0) return '#FF3B30';
  if (m >= 5.0) return '#FF9500';
  if (m >= 3.0) return '#FFCC00';
  return '#34C759';
}

function magnitudeIcon(magnitude: number) {
  const magNum = Number(magnitude) || 0;
  const color = magnitudeColor(magNum);
  const size = Math.min(22 + magNum * 2.5, 44);
  const magText = magNum.toFixed(1);
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color}E6;border:2px solid #FFFFFF;box-shadow:0 2px 8px rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:#FFFFFF;line-height:1;letter-spacing:-0.5px;">${magText}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function userLocationIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:22px;height:22px;border-radius:50%;background:#007AFF;border:3px solid #FFFFFF;box-shadow:0 0 12px rgba(0,122,255,0.85);"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

// Haversine formula to compute distance in km
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
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
}// Auto-adjust map bounds whenever the sismos dataset changes or filters apply
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
      {(status === 'error' || status === 'rate_limited') && (
        <p style={{ margin: '4px 0 0', color: '#FF3B30', fontSize: 11 }}>{errorMessage}</p>
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

  if (!isValidCoordinate(lat, lng)) return null;

  return (
    <Marker
      position={[lat, lng]}
      icon={magnitudeIcon(mag)}
      eventHandlers={{
        popupopen: () => setIsOpen(true),
        popupclose: () => setIsOpen(false),
      }}
    >
      <Popup>
        <div style={{ minWidth: 180 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{sismo.attributes.place}</div>
          <div style={{ fontSize: 12, color: magnitudeColor(mag), fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>M {mag.toFixed(1)}</span>
            {sismo.attributes.tsunami && (
              <span style={{ color: '#FF3B30', fontSize: 11 }} title="Alerta de Tsunami">
                <i className="ti ti-waves" style={{ marginRight: 2 }} /> Tsunami
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: '#6E6E73', margin: '4px 0 8px' }}>
            {formatApiDate(sismo.attributes.time)}
          </div>
          <a
            href={`/sismos/${sismo.id}`}
            className="tf-button-primary"
            style={{ fontSize: 11, padding: '5px 12px', display: 'inline-block', marginBottom: 8, textDecoration: 'none' }}
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
      {/* Location Button & Info Header */}
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
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--tf-text-secondary)' }}>
          {userPos ? (
            <span style={{ color: '#34C759', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-check" /> Ubicación GPS activa
            </span>
          ) : (
            'Explora los sismos en el mapa interactivo y listado lateral:'
          )}
        </div>

        <button
          onClick={handleLocateUser}
          disabled={isLocating}
          className="tf-button-secondary"
          style={{
            fontSize: 12,
            padding: '6px 14px',
            borderRadius: 8,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <i className="ti ti-current-location" />
          {isLocating ? 'Obteniendo ubicación...' : 'Mi ubicación'}
        </button>
      </div>

      {geoError && (
        <div
          style={{
            padding: '8px 12px',
            marginBottom: 10,
            borderRadius: 8,
            background: '#FF3B3015',
            border: '1px solid #FF3B3040',
            color: '#FF3B30',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <i className="ti ti-alert-circle" style={{ fontSize: 16 }} />
          <span>{geoError}</span>
        </div>
      )}

      {closestSismoInfo && (
        <div
          style={{
            padding: '8px 12px',
            marginBottom: 10,
            borderRadius: 8,
            background: 'var(--tf-surface)',
            border: '1px solid var(--tf-border)',
            fontSize: 12,
            fontWeight: 600,
            color: 'var(--tf-text)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>
            Sismo más cercano a tu ubicación: <strong>{closestSismoInfo.sismo.attributes.place}</strong> ({closestSismoInfo.distKm} km)
          </span>
          <a
            href={`/sismos/${closestSismoInfo.sismo.id}`}
            style={{ color: 'var(--tf-accent)', textDecoration: 'none', fontWeight: 700, fontSize: 11 }}
          >
            Ver detalle
          </a>
        </div>
      )}

      {/* USGS-Style Split View: Sidebar + Map */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 16,
          alignItems: 'stretch',
          width: '100%',
        }}
      >
        {/* Sidebar List (USGS Style) */}
        <div
          style={{
            flex: '0 0 340px',
            maxWidth: '100%',
            background: 'var(--tf-surface)',
            border: '1px solid var(--tf-border)',
            borderRadius: 16,
            display: 'flex',
            flexDirection: 'column',
            height: '560px',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '12px 14px',
              borderBottom: '1px solid var(--tf-border)',
              background: 'var(--tf-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--tf-text)' }}>
                <i className="ti ti-list-details" style={{ color: 'var(--tf-accent)', marginRight: 6 }} />
                Listado de Sismos
              </div>
              <div style={{ fontSize: 11, color: 'var(--tf-text-secondary)', marginTop: 2 }}>
                Página {currentPage} de {totalPages} ({sismos.length.toLocaleString()} eventos)
              </div>
            </div>
          </div>

          {/* List items */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
            {currentPageSismos.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--tf-text-secondary)' }}>
                No se encontraron sismos con los filtros seleccionados.
              </div>
            ) : (
              currentPageSismos.map((s) => {
                const lat = Number(s.attributes.coordinates.latitude);
                const lng = Number(s.attributes.coordinates.longitude);
                const mag = Number(s.attributes.magnitude) || 0;
                const isSelected = selectedSismoId === s.id;
                const validPos = isValidCoordinate(lat, lng);

                return (
                  <button
                    type="button"
                    key={s.id}
                    disabled={!validPos}
                    onClick={() => {
                      if (validPos) {
                        setSelectedSismoPos([lat, lng]);
                        setSelectedSismoId(s.id);
                      }
                    }}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 12px',
                      marginBottom: 6,
                      borderRadius: 10,
                      border: isSelected ? '1px solid var(--tf-accent)' : '1px solid var(--tf-border)',
                      background: isSelected ? 'rgba(88, 86, 214, 0.12)' : 'var(--tf-surface)',
                      cursor: validPos ? 'pointer' : 'default',
                      opacity: validPos ? 1 : 0.6,
                      transition: 'all 0.15s ease',
                      outline: 'none',
                    }}
                  >
                    {/* Magnitude Badge */}
                    <div
                      style={{
                        minWidth: 42,
                        height: 42,
                        borderRadius: 10,
                        background: magnitudeColor(mag),
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: 13,
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                      }}
                    >
                      {mag.toFixed(1)}
                    </div>

                    {/* Sismo info */}
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 12,
                          color: 'var(--tf-text)',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                        title={s.attributes.place}
                      >
                        {s.attributes.place}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--tf-text-secondary)', marginTop: 2 }}>
                        {formatApiDate(s.attributes.time)}
                      </div>
                    </div>

                    {/* Tsunami Indicator */}
                    {s.attributes.tsunami && (
                      <span title="Alerta de Tsunami" style={{ color: '#FF3B30', fontSize: 14 }}>
                        <i className="ti ti-waves" />
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Pagination Footer */}
          <div
            style={{
              padding: '10px 14px',
              borderTop: '1px solid var(--tf-border)',
              background: 'var(--tf-bg)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="tf-button-secondary"
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6 }}
            >
              Anterior
            </button>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tf-text-secondary)' }}>
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="tf-button-secondary"
              style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6 }}
            >
              Siguiente
            </button>
          </div>
        </div>

        {/* Map Container */}
        <div style={{ flex: '1 1 480px', minWidth: '300px', height: '560px', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--tf-border)', position: 'relative' }}>
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
