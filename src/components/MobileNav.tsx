import React, { useState } from 'react';

const NAV_LINKS = [
  { href: '/', label: 'Mapa', icon: 'ti-map-2' },
  { href: '/blog', label: 'Blog', icon: 'ti-pencil' },
  { href: '/educacion', label: 'Educación', icon: 'ti-school' },
  { href: '/noticias', label: 'Noticias', icon: 'ti-news' },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="tf-hamburger"
        aria-label="Abrir menú"
        onClick={() => setOpen(true)}
      >
        <i className="ti ti-menu-2" style={{ fontSize: 22 }} />
      </button>

      <div className={`tf-mobile-drawer${open ? ' open' : ''}`}>
        <div
          className="tf-mobile-drawer-backdrop"
          onClick={() => setOpen(false)}
        />
        <div className="tf-mobile-drawer-panel">
          <button
            className="tf-mobile-drawer-close"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          >
            <i className="ti ti-x" style={{ fontSize: 20 }} />
          </button>
          <a
            href="/"
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: 'var(--tf-accent)',
              textDecoration: 'none',
              borderBottom: 'none',
              marginBottom: 8,
            }}
            onClick={() => setOpen(false)}
          >
            Telurify
          </a>
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={() => setOpen(false)}>
              <i className={`ti ${link.icon}`} style={{ marginRight: 8, color: 'var(--tf-accent)' }} />
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
