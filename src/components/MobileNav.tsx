import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ThemeToggle from './ThemeToggle';

const NAV_LINKS = [
  { href: '/', label: 'Inicio', icon: 'ti-home' },
  { href: '/mapa', label: 'Mapa', icon: 'ti-map-2' },
  { href: '/analitica', label: 'Analítica', icon: 'ti-chart-bar' },
  { href: '/blog', label: 'Blog', icon: 'ti-pencil' },
  { href: '/educacion', label: 'Educación', icon: 'ti-school' },
  { href: '/noticias', label: 'Noticias', icon: 'ti-news' },
];

export default function MobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const hamburgerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    closeButtonRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        hamburgerRef.current?.focus();
        return;
      }

      if (e.key === 'Tab' && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 641px)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        if (open && panelRef.current?.contains(document.activeElement)) {
          const firstDesktopLink = document.querySelector<HTMLElement>('.tf-nav-links a');
          firstDesktopLink?.focus();
        }
        setOpen(false);
      }
    };
    mq.addEventListener('change', handleChange);
    return () => mq.removeEventListener('change', handleChange);
  }, [open]);

  const handleClose = () => {
    setOpen(false);
    hamburgerRef.current?.focus();
  };

  const drawer = (
    <div
      className={`tf-mobile-drawer${open ? ' open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Menú de navegación"
    >
      <div
        className="tf-mobile-drawer-backdrop"
        onClick={handleClose}
      />
      <div className="tf-mobile-drawer-panel" ref={panelRef}>
        <button
          ref={closeButtonRef}
          className="tf-mobile-drawer-close"
          aria-label="Cerrar menú"
          onClick={handleClose}
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
          onClick={handleClose}
        >
          Telurify
        </a>
        {NAV_LINKS.map((link) => (
          <a key={link.href} href={link.href} onClick={handleClose}>
            <i className={`ti ${link.icon}`} style={{ marginRight: 8, color: 'var(--tf-accent)' }} />
            {link.label}
          </a>
        ))}
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--tf-border)' }}>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={hamburgerRef}
        className="tf-hamburger"
        aria-label="Abrir menú"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <i className="ti ti-menu-2" style={{ fontSize: 22 }} />
      </button>
      {mounted && createPortal(drawer, document.body)}
    </>
  );
}
