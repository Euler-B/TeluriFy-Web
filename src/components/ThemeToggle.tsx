import { useEffect, useState } from 'react';

function getValidTheme(val: string | null): 'light' | 'dark' | null {
  if (val === 'light' || val === 'dark') return val;
  return null;
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const rawSaved = localStorage.getItem('tf-theme');
    const validSaved = getValidTheme(rawSaved);
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = validSaved || (systemPrefersDark ? 'dark' : 'light');

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

  function toggleTheme() {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('tf-theme', nextTheme);
    window.dispatchEvent(new CustomEvent('tf-theme-change', { detail: { theme: nextTheme } }));
  }

  return (
    <button
      onClick={toggleTheme}
      className="tf-button-secondary"
      style={{
        padding: '6px 12px',
        fontSize: 13,
        borderRadius: 10,
        gap: 6,
      }}
      title={`Cambiar a modo ${theme === 'light' ? 'oscuro' : 'claro'}`}
    >
      <i
        className={`ti ti-${theme === 'light' ? 'moon' : 'sun'}`}
        style={{ fontSize: 16, color: theme === 'light' ? '#5856D6' : '#FFCC00' }}
      />
      <span style={{ fontSize: 12, fontWeight: 700 }}>
        {theme === 'light' ? 'Oscuro' : 'Claro'}
      </span>
    </button>
  );
}
