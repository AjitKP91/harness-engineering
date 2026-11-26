const COMPLETED_KEY = 'harness-guide:completed-chapters';
const LAST_CHAPTER_KEY = 'harness-guide:last-chapter';
const ACTIVE_PATH_KEY = 'harness-guide:active-path';
const ZEN_KEY = 'harness-guide:zen-mode';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota or restricted context errors
  }
}

export function getCompletedSet(): Set<string> {
  return new Set(readJson<string[]>(COMPLETED_KEY, []));
}

export function toggleChapterComplete(slug: string): boolean {
  const set = getCompletedSet();
  let completed = false;
  if (set.has(slug)) {
    set.delete(slug);
  } else {
    set.add(slug);
    completed = true;
  }
  writeJson(COMPLETED_KEY, [...set]);
  window.dispatchEvent(new CustomEvent('progress-change'));
  return completed;
}

export function setLastChapter(slug: string): void {
  try {
    localStorage.setItem(LAST_CHAPTER_KEY, slug);
  } catch {}
}

export function getLastChapter(): string | null {
  try {
    return localStorage.getItem(LAST_CHAPTER_KEY);
  } catch {
    return null;
  }
}

export function getActivePathId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_PATH_KEY);
  } catch {
    return null;
  }
}

export function setActivePathId(pathId: string | null): void {
  try {
    if (pathId) localStorage.setItem(ACTIVE_PATH_KEY, pathId);
    else localStorage.removeItem(ACTIVE_PATH_KEY);
  } catch {}
}

export function getZenMode(): boolean {
  try {
    return localStorage.getItem(ZEN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setZenMode(zen: boolean): void {
  try {
    localStorage.setItem(ZEN_KEY, String(zen));
  } catch {}
}
