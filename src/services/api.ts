import { parseApiDate } from '../utils/date';

export type Sismo = {
  id: number;
  type?: string;
  attributes: {
    title: string;
    place: string;
    magnitude: number;
    coordinates: { latitude: number; longitude: number };
    time: string;
    mag_type?: string;
    tsunami?: boolean;
    external_id?: string;
  };
  links?: { external_url?: string };
};

export type SismoStats = {
  total_sismos: number;
  last_24h_count: number;
  tsunami_count: number;
  max_magnitude: {
    id: number;
    title: string;
    magnitude: number;
    place: string;
    time: string;
  } | null;
  by_mag_type: Record<string, number>;
};

export type SismoFilters = {
  query?: string;
  mag_min?: number;
  mag_max?: number;
  date_from?: string;
  date_to?: string;
  mag_type?: string[];
  tsunami?: boolean | null;
};

export type PaginatedSismosResponse = {
  data: Sismo[];
  pagination?: {
    current_page: number;
    total: number;
    per_page: number;
    truncated?: boolean;
  };
};

export class ApiError extends Error {
  status: number;
  isRateLimited: boolean;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.isRateLimited = status === 429;
  }
}

function getApiBaseUrl(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PUBLIC_API_URL) {
    return import.meta.env.PUBLIC_API_URL;
  }
  return 'http://localhost:3000';
}

const TIMEOUT_SYMBOL = Symbol('REQUEST_TIMEOUT');

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = 10000
): Promise<Response> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(TIMEOUT_SYMBOL), timeoutMs);

  let combinedSignal: AbortSignal;
  const callerSignal = init?.signal;

  if (callerSignal) {
    if (typeof AbortSignal !== 'undefined' && 'any' in AbortSignal && typeof (AbortSignal as any).any === 'function') {
      combinedSignal = (AbortSignal as any).any([callerSignal, timeoutController.signal]);
    } else {
      const controller = new AbortController();
      if (callerSignal.aborted) {
        controller.abort(callerSignal.reason);
      } else {
        callerSignal.addEventListener('abort', () => controller.abort(callerSignal.reason), { once: true });
        timeoutController.signal.addEventListener('abort', () => controller.abort(timeoutController.signal.reason), { once: true });
      }
      combinedSignal = controller.signal;
    }
  } else {
    combinedSignal = timeoutController.signal;
  }

  try {
    return await fetch(input, { ...init, signal: combinedSignal });
  } catch (err: unknown) {
    if (
      timeoutController.signal.aborted &&
      (!callerSignal || !callerSignal.aborted)
    ) {
      throw new ApiError('La petición al servidor excedió el tiempo límite (Timeout)', 408);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchSismosStats(signal?: AbortSignal): Promise<SismoStats> {
  const baseUrl = getApiBaseUrl();
  const res = await fetchWithTimeout(`${baseUrl}/v1/sismos/stats`, { signal });

  if (res.status === 429) {
    throw new ApiError('Ha excedido el límite de peticiones (Rate Limit). Por favor intente más tarde.', 429);
  }
  if (!res.ok) {
    throw new ApiError(`Error al obtener estadísticas sísmicas (${res.status})`, res.status);
  }

  const json = await res.json();
  const attributes = json.data?.attributes;

  if (!attributes) {
    throw new ApiError('Estructura de respuesta de estadísticas inválida', 500);
  }

  const rawTotal = Number(attributes.total_sismos);
  const total_sismos = Number.isFinite(rawTotal) ? rawTotal : 0;

  const rawLast24 = Number(attributes.last_24h_count);
  const last_24h_count = Number.isFinite(rawLast24) ? rawLast24 : 0;

  const rawTsunami = Number(attributes.tsunami_count);
  const tsunami_count = Number.isFinite(rawTsunami) ? rawTsunami : 0;

  let max_magnitude = null;
  if (attributes.max_magnitude && typeof attributes.max_magnitude === 'object') {
    const rawMag = Number(attributes.max_magnitude.magnitude);
    if (Number.isFinite(rawMag)) {
      max_magnitude = {
        id: Number(attributes.max_magnitude.id ?? 0),
        title: String(attributes.max_magnitude.title ?? ''),
        magnitude: rawMag,
        place: String(attributes.max_magnitude.place ?? ''),
        time: String(attributes.max_magnitude.time ?? ''),
      };
    }
  }

  return {
    total_sismos,
    last_24h_count,
    tsunami_count,
    max_magnitude,
    by_mag_type: attributes.by_mag_type ?? {},
  };
}

export async function fetchSismosPage(
  filters?: SismoFilters,
  page = 1,
  perPage = 1000,
  signal?: AbortSignal
): Promise<PaginatedSismosResponse> {
  const baseUrl = getApiBaseUrl();
  const url = new URL(`${baseUrl}/v1/sismos`);

  url.searchParams.append('page', String(page));
  url.searchParams.append('per_page', String(perPage));

  if (filters) {
    if (filters.mag_min !== undefined && filters.mag_min > 0) {
      url.searchParams.append('filters[mag_min]', String(filters.mag_min));
    }
    if (filters.mag_max !== undefined && filters.mag_max < 10) {
      url.searchParams.append('filters[mag_max]', String(filters.mag_max));
    }
    if (filters.date_from) {
      url.searchParams.append('filters[date_from]', filters.date_from);
    }
    if (filters.date_to) {
      url.searchParams.append('filters[date_to]', filters.date_to);
    }
    if (filters.mag_type && filters.mag_type.length > 0) {
      url.searchParams.append('filters[mag_type]', filters.mag_type.join(','));
    }
    if (filters.tsunami !== undefined && filters.tsunami !== null) {
      url.searchParams.append('filters[tsunami]', String(filters.tsunami));
    }
  }

  const res = await fetchWithTimeout(url.toString(), { signal });

  if (res.status === 429) {
    throw new ApiError('Ha alcanzado el límite de peticiones a la API. Espere un momento.', 429);
  }
  if (!res.ok) {
    throw new ApiError(`Error al consultar sismos (${res.status})`, res.status);
  }

  const json = await res.json();
  if (!Array.isArray(json.data)) {
    throw new ApiError('Respuesta de la API malformada: data no es una lista', 500);
  }

  return {
    data: json.data,
    pagination: json.pagination,
  };
}

export async function fetchAllSismos(
  filters?: SismoFilters,
  signal?: AbortSignal
): Promise<{ sismos: Sismo[]; pagination?: PaginatedSismosResponse['pagination'] }> {
  const perPage = 1000;
  const MAX_PAGES = 5;
  const MAX_RECORDS = 5000;

  const firstRes = await fetchSismosPage(filters, 1, perPage, signal);
  let aggregated: Sismo[] = [];
  let isTruncated = false;

  const total = firstRes.pagination?.total;
  if (typeof total === 'number' && total > 0) {
    const totalPages = Math.ceil(total / perPage);
    if (totalPages > MAX_PAGES) {
      isTruncated = true;
    }

    const startPage = Math.max(1, totalPages - MAX_PAGES + 1);
    for (let page = totalPages; page >= startPage; page--) {
      const pageRes = page === 1 ? firstRes : await fetchSismosPage(filters, page, perPage, signal);
      if (pageRes.data.length > 0) {
        aggregated.push(...pageRes.data);
      }
      if (aggregated.length >= MAX_RECORDS) break;
    }
  } else {
    aggregated = [...firstRes.data];
  }

  if (aggregated.length > MAX_RECORDS) {
    isTruncated = true;
    aggregated = aggregated.slice(0, MAX_RECORDS);
  }

  // Final text filter over aggregated data if specified
  if (filters?.query && filters.query.trim().length > 0) {
    const q = filters.query.trim().toLowerCase();
    aggregated = aggregated.filter((item) =>
      item.attributes.place.toLowerCase().includes(q) ||
      item.attributes.title.toLowerCase().includes(q)
    );
  }

  // Ensure sismos are sorted descending by time (newest first)
  aggregated.sort(
    (a, b) => (parseApiDate(b.attributes.time)?.getTime() ?? 0) - (parseApiDate(a.attributes.time)?.getTime() ?? 0)
  );

  const paginationInfo = firstRes.pagination
    ? { ...firstRes.pagination, truncated: isTruncated }
    : undefined;

  return { sismos: aggregated, pagination: paginationInfo };
}

export async function submitSismoReport(
  sismoId: number,
  felt: boolean,
  intensity: string
): Promise<void> {
  const baseUrl = getApiBaseUrl();
  const res = await fetchWithTimeout(`${baseUrl}/v1/sismos/${sismoId}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ felt, intensity }),
  });

  if (res.status === 429) {
    throw new ApiError('Ha realizado demasiados reportes recientemente. Por favor espere un momento.', 429);
  }
  if (!res.ok) {
    throw new ApiError('No se pudo enviar el reporte.', res.status);
  }
}
