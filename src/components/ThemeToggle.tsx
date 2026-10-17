import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

function getValidTheme(val: string | null): Theme | null {
  if (val === 'light' || val === 'dark') return val;
  return null;
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('tf-theme', theme);
  window.dispatchEvent(new CustomEvent('tf-theme-change', { detail: { theme } }));
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const rawSaved = localStorage.getItem('tf-theme');
    const initial = getValidTheme(rawSaved) ?? 'dark';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);

    function handleThemeChange(e: Event) {
      const customEvt = e as CustomEvent<{ theme?: string }>;
      const newTheme = getValidTheme(customEvt.detail?.theme ?? null);
      if (newTheme) {
        setTheme(newTheme);
      }
    }

    window.addEventListener('tf-theme-change', handleThemeChange);
    return () => window.removeEventListener('tf-theme-change', handleThemeChange);
  }, []);

  function selectTheme(nextTheme: Theme) {
    if (nextTheme === theme) return;
    setTheme(nextTheme);
    applyTheme(nextTheme);
  }

  return (
    <div className="tf-theme-switch" role="group" aria-label="Tema de la interfaz">
      <button
        type="button"
        onClick={() => selectTheme('dark')}
        aria-label="Tema oscuro"
        aria-pressed={theme === 'dark'}
        title="Tema oscuro"
      >
        <i className="ti ti-moon" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => selectTheme('light')}
        aria-label="Tema claro"
        aria-pressed={theme === 'light'}
        title="Tema claro"
      >
        <i className="ti ti-sun" aria-hidden="true" />
      </button>
    </div>
  );
}
