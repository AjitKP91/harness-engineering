const STORAGE_KEY = 'color-scheme';

function getSystemScheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function getEffectiveScheme(): 'light' | 'dark' {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {}
  return getSystemScheme();
}

function applyScheme(value: string | null): void {
  const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (meta) {
    meta.content = value === 'light' || value === 'dark' ? value : 'light dark';
  }
  window.dispatchEvent(new CustomEvent('theme-change', { detail: { scheme: getEffectiveScheme() } }));
}

export function toggleColorScheme(): void {
  const currentRendered = getEffectiveScheme();
  const target = currentRendered === 'dark' ? 'light' : 'dark';
  const system = getSystemScheme();

  try {
    if (target !== system) {
      localStorage.setItem(STORAGE_KEY, target);
      applyScheme(target);
    } else {
      localStorage.removeItem(STORAGE_KEY);
      applyScheme(null);
    }
  } catch {
    applyScheme(target);
  }
}

export function initThemeSync(): void {
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEY) {
      applyScheme(event.newValue);
    }
  });

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) applyScheme(null);
    } catch {}
  });
}
