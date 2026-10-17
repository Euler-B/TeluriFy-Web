import { useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { geoNaturalEarth1, geoPath, geoGraticule10 } from 'd3-geo';
import type { GeoPermissibleObjects } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import worldTopology from 'world-atlas/countries-110m.json';

import { REFERENCE_STATIONS } from '../data/referenceStations';
import { formatEventDateWithZone } from '../utils/date';
import { formatDepth, formatMagnitude, getSeismicStatus } from '../utils/seismic';

const WIDTH = 1000;
const HEIGHT = 500;

const topology = worldTopology as unknown as Topology<{
  countries: GeometryCollection;
  land: GeometryCollection;
}>;

const sphere = { type: 'Sphere' } as unknown as GeoPermissibleObjects;

const projection = geoNaturalEarth1().fitExtent(
  [
    [10, 14],
    [WIDTH - 10, HEIGHT - 14],
  ],
  sphere
);

const pathGenerator = geoPath(projection);

const spherePath = pathGenerator(sphere);
const countriesPath = pathGenerator(feature(topology, topology.objects.countries));
const bordersPath = pathGenerator(
  mesh(topology, topology.objects.countries, (a, b) => a !== b)
);
const graticulePath = pathGenerator(geoGraticule10());

const RADAR_RINGS = [90, 180, 270];
const STATUS_LEGEND = [
  { level: 'estable', label: 'Estable' },
  { level: 'observacion', label: 'Observación' },
  { level: 'precaucion', label: 'Precaución' },
  { level: 'alerta', label: 'Alerta' },
] as const;

interface WorldRadarProps {
  compact?: boolean;
}

export default function WorldRadar({ compact = false }: WorldRadarProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => REFERENCE_STATIONS.find((station) => station.id === selectedId) ?? null,
    [selectedId]
  );

  const selectedStatus = selected ? getSeismicStatus(selected.magnitude) : null;

  function toggleStation(id: string) {
    setSelectedId((current) => (current === id ? null : id));
  }

  function handleStationKeyDown(event: KeyboardEvent<SVGGElement>, id: string) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      toggleStation(id);
    }
  }

  return (
    <div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="tf-radar-svg"
        role="img"
        aria-label="Mapa mundial estilizado con las estaciones sísmicas de referencia de Telurify, una por continente."
      >
        {spherePath && <path d={spherePath} className="tf-radar-sphere" />}
        {countriesPath && <path d={countriesPath} className="tf-radar-country" />}
        {graticulePath && <path d={graticulePath} className="tf-radar-graticule" />}
        {bordersPath && <path d={bordersPath} className="tf-radar-sphere" />}

        {/* Barrido del radar */}
        <defs>
          <linearGradient id="tfRadarSweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--signal-cyan)" />
            <stop offset="100%" stopColor="var(--signal-cyan)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line
          x1={WIDTH / 2}
          y1={HEIGHT / 2}
          x2={WIDTH / 2 + 330}
          y2={HEIGHT / 2 - 85}
          stroke="url(#tfRadarSweep)"
          className="tf-radar-sweep"
          aria-hidden="true"
        />

        {/* Retícula del radar */}
        <g aria-hidden="true">
          {RADAR_RINGS.map((r) => (
            <circle key={r} cx={WIDTH / 2} cy={HEIGHT / 2} r={r} className="tf-radar-ring" />
          ))}
          <line
            x1={WIDTH / 2 - 320}
            y1={HEIGHT / 2}
            x2={WIDTH / 2 + 320}
            y2={HEIGHT / 2}
            className="tf-radar-crosshair"
          />
          <line
            x1={WIDTH / 2}
            y1={HEIGHT / 2 - 220}
            x2={WIDTH / 2}
            y2={HEIGHT / 2 + 220}
            className="tf-radar-crosshair"
          />
        </g>

        {/* Pulso lento del radar */}
        <g aria-hidden="true">
          <circle cx={WIDTH / 2} cy={HEIGHT / 2} r={90} className="tf-radar-pulse" />
          <circle cx={WIDTH / 2} cy={HEIGHT / 2} r={90} className="tf-radar-pulse" />
          <circle cx={WIDTH / 2} cy={HEIGHT / 2} r={90} className="tf-radar-pulse" />
        </g>

        {/* Estaciones de referencia */}
        {REFERENCE_STATIONS.map((station, index) => {
          const position = projection([station.longitude, station.latitude]);
          if (!position) return null;
          const [x, y] = position;
          const status = getSeismicStatus(station.magnitude);
          const dotRadius = Math.min(4 + Math.max(station.magnitude - 2, 0) * 1.8, 12);

          return (
            <g
              key={station.id}
              className="tf-station"
              tabIndex={0}
              role="button"
              aria-pressed={selectedId === station.id}
              aria-label={`${station.place}, ${station.country}. Región ${station.region}. Magnitud ${formatMagnitude(station.magnitude)}. Estado ${status.label}.`}
              onClick={() => toggleStation(station.id)}
              onMouseEnter={() => setSelectedId(station.id)}
              onFocus={() => setSelectedId(station.id)}
              onKeyDown={(event) => handleStationKeyDown(event, station.id)}
            >
              <circle
                cx={x}
                cy={y}
                r={dotRadius}
                className={`tf-station-halo tf-station-halo--${status.level}`}
                style={{ animationDelay: `${index * 0.4}s` }}
              />
              <circle
                cx={x}
                cy={y}
                r={dotRadius}
                className={`tf-station-dot tf-station-dot--${status.level}`}
              />
            </g>
          );
        })}

        {/* Etiquetas de estación (solo modo compacto) */}
        {compact &&
          REFERENCE_STATIONS.map((station) => {
            const position = projection([station.longitude, station.latitude]);
            if (!position) return null;
            const [x, y] = position;
            const lx = x + station.labelDx;
            const ly = y + station.labelDy;
            const direction = station.labelAnchor === 'start' ? 1 : -1;
            const lineEndX = lx - direction * 6;

            return (
              <g key={`${station.id}-label`} className="tf-station-label" aria-hidden="true">
                <line x1={x + direction * 8} y1={y + Math.sign(station.labelDy) * 8} x2={lineEndX} y2={ly + 4} />
                <text
                  x={lx}
                  y={ly}
                  textAnchor={station.labelAnchor}
                  className="tf-station-label-name"
                >
                  {station.labelName}
                </text>
                <text
                  x={lx}
                  y={ly + 13}
                  textAnchor={station.labelAnchor}
                  className="tf-station-label-mag"
                >
                  M {formatMagnitude(station.magnitude)}
                </text>
              </g>
            );
          })}
      </svg>

      {!compact && (
        <div className="tf-radar-caption">
          <span>Estaciones de referencia por continente · telemetría ilustrativa</span>
          <div className="tf-legend" aria-label="Leyenda de estados sísmicos">
            {STATUS_LEGEND.map((item) => (
              <span key={item.level} className="tf-legend-item">
                <span className={`tf-legend-dot tf-legend-dot--${item.level}`} aria-hidden="true" />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {(!compact || selected) && (
        <div className="tf-radar-panel" aria-live="polite">
          {selected && selectedStatus ? (
            <>
              <div className="tf-radar-panel-head">
                <div>
                  <div className="tf-radar-panel-region">{selected.region}</div>
                  <div className="tf-radar-panel-place">
                    {selected.place} · {selected.country}
                  </div>
                </div>
                <span className={selectedStatus.chipClass}>{selectedStatus.label}</span>
              </div>
              <div className="tf-radar-panel-grid">
                <div className="tf-data-row">
                  <span className="tf-data-label">Magnitud</span>
                  <span className="tf-data-value">M {formatMagnitude(selected.magnitude)}</span>
                </div>
                <div className="tf-data-row">
                  <span className="tf-data-label">Profundidad</span>
                  <span className="tf-data-value">{formatDepth(selected.depthKm)}</span>
                </div>
                <div className="tf-data-row">
                  <span className="tf-data-label">Hora del evento</span>
                  <span className="tf-data-value">{formatEventDateWithZone(selected.time)}</span>
                </div>
                <div className="tf-data-row">
                  <span className="tf-data-label">Coordenadas</span>
                  <span className="tf-data-value">
                    {selected.latitude.toFixed(2)}°, {selected.longitude.toFixed(2)}°
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
              Selecciona o enfoca un punto de la red para ver ubicación, magnitud, profundidad, hora
              del evento y estado. Los datos mostrados corresponden a telemetría de referencia
              ilustrativa; la actividad sísmica en vivo está en el mapa interactivo.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
