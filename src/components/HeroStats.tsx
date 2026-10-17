import { useEffect, useState } from 'react';
import type { SismoStats } from '../services/api';
import { fetchSismosStats } from '../services/api';

export default function HeroStats() {
  const [stats, setStats] = useState<SismoStats | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    fetchSismosStats(controller.signal)
      .then((value) => {
        if (active) setStats(value);
      })
      .catch(() => {
        // Sin conexión: los valores quedan como "—"
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, []);

  const format = (value: number | undefined) =>
    value === undefined ? '—' : value.toLocaleString('es-ES');

  return (
    <div className="tf-hero-stats" role="group" aria-label="Resumen de actividad sísmica">
      <div className="tf-hero-stat tf-hero-stat--cyan">
        <div className="tf-hero-stat-value">{format(stats?.last_24h_count)}</div>
        <div className="tf-hero-stat-label">eventos en las últimas 24 h</div>
      </div>
      <div className="tf-hero-stat tf-hero-stat--amber">
        <div className="tf-hero-stat-value">{format(stats?.total_sismos)}</div>
        <div className="tf-hero-stat-label">eventos registrados</div>
      </div>
      <div className="tf-hero-stat tf-hero-stat--coral">
        <div className="tf-hero-stat-value">{format(stats?.tsunami_count)}</div>
        <div className="tf-hero-stat-label">alertas de tsunami</div>
      </div>
    </div>
  );
}
