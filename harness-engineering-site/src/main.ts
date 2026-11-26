import 'katex/dist/katex.min.css';
import './styles/tokens.css';
import './styles/main.css';

import type { ManifestData, SearchItem } from './types';
import { initThemeSync, toggleColorScheme } from './components/ThemeToggle';
import { initCommandPalette } from './components/CommandPalette';
import { initScrollProgressFallback, runWithViewTransition } from './utils/modernDom';
import { getCompletedSet } from './state/progress';
import { renderHomeView } from './views/HomeView';
import { loadChapterData, renderChapterView } from './views/ChapterView';
import { loadGlossaryData, renderGlossaryView, renderLabsView, renderRoadmapView } from './views/OtherViews';

let manifest: ManifestData;
let searchItems: SearchItem[] = [];
let activeCleanup: () => void = () => {};

function parseHash(): { path: string; params: URLSearchParams } {
  const raw = window.location.hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart] = raw.split('?');
  return {
    path: pathPart || '/',
    params: new URLSearchParams(queryPart || ''),
  };
}

function renderShell(app: HTMLElement): HTMLElement {
  app.innerHTML = `
    <header class="site-header">
      <a class="brand-link" href="#/">
        <span class="brand-mark">HE</span>
        <span class="brand-title">Harness Engineering</span>
      </a>
      <nav class="header-nav" aria-label="Primary navigation">
        <a class="nav-link" data-nav="/" href="#/">Guide</a>
        <a class="nav-link" data-nav="/roadmap" href="#/roadmap">Roadmap</a>
        <a class="nav-link" data-nav="/labs" href="#/labs">Interactive Labs</a>
        <a class="nav-link" data-nav="/glossary" href="#/glossary">Glossary</a>
      </nav>
      <div class="header-actions">
        <button type="button" class="search-trigger" id="header-search-btn" aria-label="Search study guide">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.3-4.3"></path>
          </svg>
          <span>Search</span>
          <kbd>⌘K</kbd>
        </button>
        <a class="progress-pill" id="header-progress-pill" href="#/roadmap" title="View roadmap">0/41</a>
        <button type="button" class="icon-btn theme-toggle" id="header-theme-btn" aria-label="Toggle color theme" title="Toggle light or dark theme">
          <span class="icon-sun" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="4"></circle>
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"></path>
            </svg>
          </span>
          <span class="icon-moon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
            </svg>
          </span>
          <span class="sr-only">Toggle theme</span>
        </button>
      </div>
    </header>
    <div id="view-outlet"></div>
  `;
  return app.querySelector<HTMLElement>('#view-outlet')!;
}

function updateHeaderNav(path: string): void {
  document.querySelectorAll<HTMLElement>('.nav-link').forEach((link) => {
    const target = link.dataset.nav || '/';
    const isActive = target === '/' ? path === '/' || path.startsWith('/chapter/') : path === target;
    link.classList.toggle('is-active', isActive);
  });

  const pill = document.getElementById('header-progress-pill');
  if (pill && manifest) {
    const done = getCompletedSet().size;
    pill.textContent = `${done}/${manifest.stats.totalChapters}`;
  }
}

async function renderRoute(outlet: HTMLElement, withTransition: boolean): Promise<void> {
  const { path, params } = parseHash();

  let chapterData = null;
  let glossaryData = null;
  if (path.startsWith('/chapter/')) {
    const slug = path.replace('/chapter/', '');
    chapterData = await loadChapterData(slug);
  } else if (path === '/glossary') {
    glossaryData = await loadGlossaryData();
  }

  const swap = () => {
    activeCleanup();
    activeCleanup = () => {};
    updateHeaderNav(path);

    if (path.startsWith('/chapter/')) {
      activeCleanup = renderChapterView(outlet, manifest, chapterData, params);
      document.title = chapterData
        ? `${chapterData.num}. ${chapterData.title} — Harness Engineering`
        : 'Harness Engineering';
    } else if (path === '/roadmap') {
      activeCleanup = renderRoadmapView(outlet, manifest);
      document.title = 'Curriculum Roadmap — Harness Engineering';
    } else if (path === '/labs') {
      activeCleanup = renderLabsView(outlet, manifest);
      document.title = 'Interactive Labs — Harness Engineering';
    } else if (path === '/glossary') {
      activeCleanup = renderGlossaryView(outlet, manifest, glossaryData || [], params);
      document.title = 'Plain-English Glossary — Harness Engineering';
    } else {
      activeCleanup = renderHomeView(outlet, manifest);
      document.title = 'AI Agent Harness Engineering — Interactive Study Guide';
    }

    if (!params.get('section') && !params.get('lab') && !params.get('term')) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }
  };

  if (withTransition) {
    await runWithViewTransition(swap);
  } else {
    swap();
  }
}

async function bootstrap(): Promise<void> {
  initThemeSync();
  initScrollProgressFallback();

  const [manifestRes, searchRes] = await Promise.all([
    fetch('./data/manifest.json'),
    fetch('./data/search-index.json'),
  ]);
  manifest = (await manifestRes.json()) as ManifestData;
  searchItems = (await searchRes.json()) as SearchItem[];

  const app = document.getElementById('app')!;
  const outlet = renderShell(app);

  const palette = initCommandPalette(
    () => searchItems,
    (route) => {
      window.location.hash = route;
    }
  );

  document.getElementById('header-search-btn')?.addEventListener('click', () => palette.open());
  document.getElementById('header-theme-btn')?.addEventListener('click', () => toggleColorScheme());

  window.addEventListener('progress-change', () => updateHeaderNav(parseHash().path));
  window.addEventListener('hashchange', () => {
    void renderRoute(outlet, true);
  });

  await renderRoute(outlet, false);
}

void bootstrap();
