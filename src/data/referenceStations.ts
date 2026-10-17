export type ReferenceStation = {
  id: string;
  region: string;
  labelName: string;
  place: string;
  country: string;
  latitude: number;
  longitude: number;
  magnitude: number;
  depthKm: number;
  time: string;
  labelDx: number;
  labelDy: number;
  labelAnchor: 'start' | 'end';
};

/**
 * Estaciones de referencia de la red Telurify: una por continente.
 * La telemetría mostrada es ilustrativa y se etiqueta como tal en la interfaz;
 * la actividad operativa proviene de la API de sismos en vivo.
 */
export const REFERENCE_STATIONS: ReferenceStation[] = [
  {
    id: 'north-america',
    region: 'América del Norte',
    labelName: 'América',
    place: 'Parkfield, California',
    country: 'Estados Unidos',
    latitude: 35.9,
    longitude: -120.43,
    magnitude: 4.3,
    depthKm: 8,
    time: '2026-10-12T18:22:00Z',
    labelDx: 16,
    labelDy: -32,
    labelAnchor: 'start',
  },
  {
    id: 'south-america',
    region: 'América del Sur',
    labelName: 'Sudamérica',
    place: 'Valparaíso',
    country: 'Chile',
    latitude: -33.05,
    longitude: -71.62,
    magnitude: 5.1,
    depthKm: 35,
    time: '2026-10-02T07:41:00Z',
    labelDx: 18,
    labelDy: 36,
    labelAnchor: 'start',
  },
  {
    id: 'europe',
    region: 'Europa',
    labelName: 'Europa',
    place: 'Península de Reykjanes',
    country: 'Islandia',
    latitude: 63.88,
    longitude: -22.44,
    magnitude: 2.8,
    depthKm: 5,
    time: '2026-10-05T03:18:00Z',
    labelDx: 18,
    labelDy: -30,
    labelAnchor: 'start',
  },
  {
    id: 'africa',
    region: 'África',
    labelName: 'África',
    place: 'Al Haouz',
    country: 'Marruecos',
    latitude: 31.13,
    longitude: -8.42,
    magnitude: 4.0,
    depthKm: 12,
    time: '2026-09-21T22:07:00Z',
    labelDx: 16,
    labelDy: 40,
    labelAnchor: 'start',
  },
  {
    id: 'asia',
    region: 'Asia',
    labelName: 'Asia',
    place: 'Península de Noto',
    country: 'Japón',
    latitude: 37.5,
    longitude: 137.25,
    magnitude: 6.2,
    depthKm: 12,
    time: '2026-10-09T11:54:00Z',
    labelDx: -16,
    labelDy: -34,
    labelAnchor: 'end',
  },
  {
    id: 'oceania',
    region: 'Oceanía',
    labelName: 'Oceanía',
    place: 'Kaikōura',
    country: 'Nueva Zelanda',
    latitude: -42.4,
    longitude: 173.68,
    magnitude: 4.6,
    depthKm: 15,
    time: '2026-09-28T15:33:00Z',
    labelDx: -18,
    labelDy: 38,
    labelAnchor: 'end',
  },
];
