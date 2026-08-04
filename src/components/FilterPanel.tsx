import { useState, useEffect, useRef } from 'react';
import type { SismoFilters } from '../services/api';

type Props = {
  filters: SismoFilters;
  onFilterChange: (newFilters: SismoFilters) => void;
  availableMagTypes?: string[];
  totalFilteredCount?: number;
  isTruncated?: boolean;
  isRateLimited?: boolean;
};

const DEFAULT_MAG_TYPES = ['ml', 'mww', 'mb', 'md', 'mw', 'mwb'];

export default function FilterPanel({
  filters,
  onFilterChange,
  availableMagTypes = DEFAULT_MAG_TYPES,
  totalFilteredCount,
  isTruncated,
  isRateLimited,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [localQuery, setLocalQuery] = useState(filters.query ?? '');

  const queryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filtersRef = useRef(filters);

  useEffect(() => {
    filtersRef.current = filters;
  }, [filters]);

  useEffect(() => {
    setLocalQuery(filters.query ?? '');
  }, [filters.query]);

  function handleQueryChange(val: string) {
    setLocalQuery(val);
    if (queryDebounceRef.current) {
      clearTimeout(queryDebounceRef.current);
    }
    queryDebounceRef.current = setTimeout(() => {
      onFilterChange({ ...filtersRef.current, query: val });
    }, 500);
  }

  const magMin = filters.mag_min ?? 0;
  const magMax = filters.mag_max ?? 10;
  const dateFrom = filters.date_from ?? '';
  const dateTo = filters.date_to ?? '';
  const selectedMagTypes = filters.mag_type ?? [];
  const tsunamiFilter = filters.tsunami ?? null;

  const hasActiveFilters =
    localQuery.trim().length > 0 ||
    magMin > 0 ||
    magMax < 10 ||
    Boolean(dateFrom) ||
    Boolean(dateTo) ||
    selectedMagTypes.length > 0 ||
    tsunamiFilter !== null;

  function handleReset() {
    setLocalQuery('');
    if (queryDebounceRef.current) clearTimeout(queryDebounceRef.current);
    onFilterChange({
      query: '',
      mag_min: 0,
      mag_max: 10,
      date_from: '',
      date_to: '',
      mag_type: [],
      tsunami: null,
    });
  }

  function toggleMagType(type: string) {
    const exists = selectedMagTypes.includes(type);
    const updated = exists
      ? selectedMagTypes.filter((t) => t !== type)
      : [...selectedMagTypes, type];
    onFilterChange({ ...filters, mag_type: updated });
  }

  function handleMagMinChange(newMin: number) {
    if (!Number.isFinite(newMin)) return;
    const clampedMin = Math.max(0, Math.min(10, newMin));
    const updatedMax = Math.max(clampedMin, Math.min(10, magMax));
    onFilterChange({ ...filters, mag_min: clampedMin, mag_max: updatedMax });
  }

  function handleMagMaxChange(newMax: number) {
    if (!Number.isFinite(newMax)) return;
    const clampedMax = Math.max(0, Math.min(10, newMax));
    const updatedMin = Math.max(0, Math.min(clampedMax, magMin));
    onFilterChange({ ...filters, mag_min: updatedMin, mag_max: clampedMax });
  }

  function handleDateFromChange(newFrom: string) {
    let updatedTo = dateTo;
    if (newFrom && dateTo && newFrom > dateTo) {
      updatedTo = newFrom;
    }
    onFilterChange({ ...filters, date_from: newFrom, date_to: updatedTo });
  }

  function handleDateToChange(newTo: string) {
    let updatedFrom = dateFrom;
    if (newTo && dateFrom && dateFrom > newTo) {
      updatedFrom = newTo;
    }
    onFilterChange({ ...filters, date_from: updatedFrom, date_to: newTo });
  }

  return (
    <div
      style={{
        background: 'var(--tf-surface)',
        border: '1px solid var(--tf-border)',
        borderRadius: 14,
        padding: '14px 16px',
        marginBottom: 14,
      }}
    >
      {/* Search Input & Header controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          marginBottom: 10,
        }}
      >
        {/* Search input field */}
        <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
          <i
            className="ti ti-search"
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--tf-text-secondary)',
              fontSize: 16,
            }}
          />
          <input
            type="text"
            placeholder="Buscar por ciudad o país (ej. Chile, Atacama, Japan...)"
            value={localQuery}
            onChange={(e) => handleQueryChange(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 36px 9px 36px',
              borderRadius: 10,
              border: '1px solid var(--tf-border)',
              fontSize: 13,
              background: 'var(--tf-bg)',
              color: 'var(--tf-text)',
              fontWeight: 500,
              outline: 'none',
            }}
          />
          {localQuery && (
            <button
              onClick={() => handleQueryChange('')}
              style={{
                position: 'absolute',
                right: 10,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--tf-text-secondary)',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              <i className="ti ti-x" style={{ fontSize: 14 }} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {totalFilteredCount !== undefined && (
            <span style={{ fontSize: 12, color: 'var(--tf-text-secondary)', fontWeight: 600 }}>
              {totalFilteredCount.toLocaleString()}{isTruncated ? '+' : ''} eventos
            </span>
          )}

          {hasActiveFilters && (
            <button
              onClick={handleReset}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FF3B30',
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
                padding: '6px 8px',
              }}
            >
              <i className="ti ti-rotate-clockwise" style={{ marginRight: 4 }} />
              Limpiar
            </button>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="tf-button-secondary"
            style={{ padding: '8px 12px', fontSize: 12 }}
          >
            <i className="ti ti-adjustments-horizontal" style={{ fontSize: 15 }} />
            {isOpen ? 'Ocultar filtros' : 'Filtros avanzados'}
            <i className={`ti ti-chevron-${isOpen ? 'up' : 'down'}`} style={{ fontSize: 14, marginLeft: 2 }} />
          </button>
        </div>
      </div>

      {/* Range slider (always visible) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          fontSize: 12,
          color: 'var(--tf-text-secondary)',
          fontWeight: 600,
        }}
      >
        <span>Magnitud mín:</span>
        <input
          type="range"
          min={0}
          max={8}
          step={0.5}
          value={magMin}
          onChange={(e) => handleMagMinChange(Number(e.target.value))}
          style={{ accentColor: 'var(--tf-accent)', flex: 1, maxWidth: 200 }}
        />
        <span style={{ fontWeight: 700, color: 'var(--tf-text)', minWidth: 32 }}>
          {magMin.toFixed(1)}+
        </span>
      </div>

      {/* Expanded filters drawer */}
      {isOpen && (
        <div
          style={{
            marginTop: 14,
            paddingTop: 14,
            borderTop: '1px solid var(--tf-border)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 16,
          }}
        >
          {/* Magnitude Max Range */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, color: 'var(--tf-text)' }}>
              Magnitud Máxima
            </label>
            <input
              type="number"
              min={0}
              max={10}
              step={0.1}
              placeholder="Máx (ej. 8.0)"
              value={magMax < 10 ? magMax : ''}
              onChange={(e) => {
                const val = e.target.value === '' ? 10 : Number(e.target.value);
                handleMagMaxChange(val);
              }}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid var(--tf-border)',
                fontSize: 12,
                background: 'var(--tf-bg)',
                color: 'var(--tf-text)',
              }}
            />
          </div>

          {/* Date range filters */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, color: 'var(--tf-text)' }}>
              Rango de Fechas
            </label>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => handleDateFromChange(e.target.value)}
                style={{
                  width: '50%',
                  padding: '5px 8px',
                  borderRadius: 8,
                  border: '1px solid var(--tf-border)',
                  fontSize: 11,
                  background: 'var(--tf-bg)',
                  color: 'var(--tf-text)',
                }}
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => handleDateToChange(e.target.value)}
                style={{
                  width: '50%',
                  padding: '5px 8px',
                  borderRadius: 8,
                  border: '1px solid var(--tf-border)',
                  fontSize: 11,
                  background: 'var(--tf-bg)',
                  color: 'var(--tf-text)',
                }}
              />
            </div>
          </div>

          {/* Tsunami Filter */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, color: 'var(--tf-text)' }}>
              Alerta de Tsunami
            </label>
            <select
              value={tsunamiFilter === null ? 'all' : String(tsunamiFilter)}
              onChange={(e) => {
                const val = e.target.value;
                const tsunamiVal = val === 'all' ? null : val === 'true';
                onFilterChange({ ...filters, tsunami: tsunamiVal });
              }}
              style={{
                width: '100%',
                padding: '6px 10px',
                borderRadius: 8,
                border: '1px solid var(--tf-border)',
                fontSize: 12,
                background: 'var(--tf-bg)',
                color: 'var(--tf-text)',
                fontWeight: 600,
              }}
            >
              <option value="all">Todos los eventos</option>
              <option value="true">Solo con alerta de tsunami</option>
              <option value="false">Sin alerta de tsunami</option>
            </select>
          </div>

          {/* Magnitude Types Multi-select badges */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 6, color: 'var(--tf-text)' }}>
              Filtrar por Tipo de Magnitud
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {availableMagTypes.map((type) => {
                const isSelected = selectedMagTypes.includes(type);
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleMagType(type)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 8,
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      border: isSelected ? '1px solid var(--tf-accent)' : '1px solid var(--tf-border)',
                      background: isSelected ? 'var(--tf-accent)' : 'var(--tf-bg)',
                      color: isSelected ? '#ffffff' : 'var(--tf-text)',
                      cursor: 'pointer',
                      transition: 'all 0.12s',
                    }}
                  >
                    {type}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Rate limit warning banner */}
      {isRateLimited && (
        <div
          style={{
            marginTop: 10,
            padding: '8px 12px',
            borderRadius: 8,
            background: '#FF950018',
            border: '1px solid #FF950040',
            color: '#D97706',
            fontSize: 12,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <i className="ti ti-alert-triangle" style={{ fontSize: 16 }} />
          <span>Ha alcanzado el límite de peticiones (Rate Limit). Espere unos segundos antes de aplicar más filtros.</span>
        </div>
      )}
    </div>
  );
}
