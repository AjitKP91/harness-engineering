import type { ChapterDetail, ManifestData } from '../types';
import { getCompletedSet, getZenMode, setLastChapter, setZenMode, toggleChapterComplete } from '../state/progress';
import { renderMermaidDiagrams } from '../components/MermaidRenderer';
import { mountLab } from '../components/InteractiveLabs';

export async function loadChapterData(slug: string): Promise<ChapterDetail | null> {
  const res = await fetch(`./data/chapters/${slug}.json`);
  if (!res.ok) return null;
  return (await res.json()) as ChapterDetail;
}

export function renderChapterView(
  root: HTMLElement,
  manifest: ManifestData,
  chapter: ChapterDetail | null,
  queryParams: URLSearchParams
): () => void {
  if (!chapter) {
    root.innerHTML = `<main class="container"><h1 id="page-heading" tabindex="-1">Chapter not found</h1><p><a href="#/">Back to Home</a></p></main>`;
    return () => {};
  }
  setLastChapter(chapter.slug);

  const completed = getCompletedSet();
  let isDone = completed.has(chapter.slug);
  let isZen = getZenMode();
  const prevChapter = chapter.prevSlug ? manifest.chapters.find((c) => c.slug === chapter.prevSlug) : null;
  const nextChapter = chapter.nextSlug ? manifest.chapters.find((c) => c.slug === chapter.nextSlug) : null;

  root.innerHTML = `
    <div class="reader-shell ${isZen ? 'is-zen' : ''}" id="reader-shell">
      <aside class="reader-sidebar" id="reader-sidebar" aria-label="Curriculum navigation">
        <div class="sidebar-section-label">Curriculum (${completed.size}/${manifest.stats.totalChapters})</div>
        ${manifest.modules
          .map((mod) => {
            const modChs = manifest.chapters.filter((c) => c.moduleId === mod.id);
            const isOpen = mod.id === chapter.moduleId;
            return `
            <details class="sidebar-module" ${isOpen ? 'open' : ''}>
              <summary>${mod.number}. ${mod.title}</summary>
              <ul class="sidebar-chapter-list">
                ${modChs
                  .map(
                    (c) => `
                  <li>
                    <a class="sidebar-chapter-link ${c.slug === chapter.slug ? 'is-current' : ''}" href="#/chapter/${c.slug}">
                      <span>${c.num}. ${c.title}</span>
                      ${completed.has(c.slug) ? '<span class="sidebar-done-dot" title="Completed"></span>' : ''}
                    </a>
                  </li>`
                  )
                  .join('')}
              </ul>
            </details>`;
          })
          .join('')}
      </aside>

      <article class="reader-article">
        <header class="chapter-header">
          <div class="chapter-breadcrumbs">
            <a href="#/">Home</a>
            <span>/</span>
            <span>Module ${chapter.moduleNumber}: ${chapter.moduleTitle}</span>
            <span>/</span>
            <span>Chapter ${chapter.num}</span>
          </div>
          <h1 id="page-heading" tabindex="-1" class="chapter-title">${chapter.num}. ${chapter.title}</h1>
          <div class="chapter-meta-bar">
            <div class="chapter-meta-pills">
              <span class="meta-pill">Prerequisites: ${chapter.prerequisites}</span>
              <span class="meta-pill">${chapter.readingTime}</span>
              <span class="meta-pill">${chapter.wordCount.toLocaleString()} words</span>
            </div>
            <div style="display:flex;gap:8px;">
              <button type="button" class="btn-ghost btn-sm mobile-only" id="drawer-toggle-btn">Chapters</button>
              <button type="button" class="btn-ghost btn-sm" id="zen-toggle-btn">${isZen ? 'Exit Focus' : 'Focus Mode'}</button>
            </div>
          </div>
        </header>

        <div id="chapter-labs-mount"></div>

        <div class="prose" id="chapter-prose">${chapter.html}</div>

        <footer class="chapter-footer">
          <div class="complete-bar">
            <div>
              <strong id="complete-status-text">${isDone ? 'Chapter marked complete!' : 'Finished reading this chapter?'}</strong>
              <div style="font-size:13px;color:var(--ink-muted);">Your reading progress is saved locally in your browser.</div>
            </div>
            <button type="button" class="${isDone ? 'btn-secondary' : 'btn-primary'}" id="complete-btn">
              ${isDone ? '✓ Completed (Undo)' : 'Mark Chapter Complete'}
            </button>
          </div>
          <div class="prev-next-grid">
            ${
              prevChapter
                ? `<a class="prev-next-card" href="#/chapter/${prevChapter.slug}">
                    <span class="prev-next-dir">← Previous</span>
                    <span class="prev-next-title">${prevChapter.num}. ${prevChapter.title}</span>
                  </a>`
                : `<a class="prev-next-card" href="#/">
                    <span class="prev-next-dir">← Start</span>
                    <span class="prev-next-title">Home & Architecture Blueprint</span>
                  </a>`
            }
            ${
              nextChapter
                ? `<a class="prev-next-card" style="text-align:right;" href="#/chapter/${nextChapter.slug}">
                    <span class="prev-next-dir">Next →</span>
                    <span class="prev-next-title">${nextChapter.num}. ${nextChapter.title}</span>
                  </a>`
                : `<a class="prev-next-card" style="text-align:right;" href="#/glossary">
                    <span class="prev-next-dir">Reference →</span>
                    <span class="prev-next-title">Plain-English Glossary</span>
                  </a>`
            }
          </div>
        </footer>
      </article>

      <aside class="reader-toc" aria-label="On this page">
        <div class="sidebar-section-label">On This Page</div>
        <ul class="toc-list" id="toc-list">
          ${chapter.headings
            .map(
              (h) => `
            <li>
              <a class="toc-link ${h.level === 3 ? 'is-sub' : ''}" data-toc-id="${h.id}" href="#${h.id}">
                ${h.text.replace(/</g, '&lt;')}
              </a>
            </li>`
            )
            .join('')}
        </ul>
      </aside>
    </div>
  `;

  const cleanups: (() => void)[] = [];

  // Mount interactive labs associated with this chapter
  const labsMount = root.querySelector<HTMLElement>('#chapter-labs-mount')!;
  for (const labId of chapter.labIds) {
    const labDef = manifest.labs.find((l) => l.id === labId);
    if (!labDef) continue;
    const slot = document.createElement('div');
    labsMount.appendChild(slot);
    cleanups.push(mountLab(slot, labDef));
  }

  // Render Mermaid diagrams + re-render when theme toggles
  const proseEl = root.querySelector<HTMLElement>('#chapter-prose')!;
  void renderMermaidDiagrams(proseEl);
  const onThemeChange = () => {
    void renderMermaidDiagrams(proseEl);
  };
  window.addEventListener('theme-change', onThemeChange);
  cleanups.push(() => window.removeEventListener('theme-change', onThemeChange));

  // Copy code buttons
  proseEl.querySelectorAll<HTMLButtonElement>('.copy-code-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const pre = btn.closest('.code-block')?.querySelector('pre');
      if (!pre) return;
      try {
        await navigator.clipboard.writeText(pre.textContent || '');
        btn.textContent = 'Copied!';
        setTimeout(() => {
          btn.textContent = 'Copy';
        }, 1500);
      } catch {}
    });
  });

  // Smooth in-chapter anchor links (since router uses hash `#/...`)
  root.querySelectorAll<HTMLAnchorElement>('.toc-link, .heading-anchor').forEach((link) => {
    link.addEventListener('click', (e) => {
      const targetId = link.dataset.tocId || link.dataset.anchor;
      if (!targetId) return;
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        targetEl.focus({ preventScroll: true });
      }
    });
  });

  // Scroll-spy for Right TOC
  const tocLinks = Array.from(root.querySelectorAll<HTMLElement>('.toc-link'));
  const headingEls = chapter.headings
    .map((h) => document.getElementById(h.id))
    .filter((el): el is HTMLElement => Boolean(el));

  if (headingEls.length > 0 && tocLinks.length > 0) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            tocLinks.forEach((l) => l.classList.toggle('is-active', l.dataset.tocId === entry.target.id));
          }
        }
      },
      { rootMargin: '-90px 0px -70% 0px', threshold: 0 }
    );
    headingEls.forEach((el) => observer.observe(el));
    cleanups.push(() => observer.disconnect());
  }

  // Zen focus mode & mobile drawer
  const shell = root.querySelector<HTMLElement>('#reader-shell')!;
  const zenBtn = root.querySelector<HTMLButtonElement>('#zen-toggle-btn')!;
  zenBtn.addEventListener('click', () => {
    isZen = !isZen;
    setZenMode(isZen);
    shell.classList.toggle('is-zen', isZen);
    zenBtn.textContent = isZen ? 'Exit Focus' : 'Focus Mode';
  });

  const sidebar = root.querySelector<HTMLElement>('#reader-sidebar')!;
  const drawerBtn = root.querySelector<HTMLButtonElement>('#drawer-toggle-btn');
  drawerBtn?.addEventListener('click', () => {
    sidebar.classList.toggle('is-drawer-open');
  });

  // Mark chapter complete
  const completeBtn = root.querySelector<HTMLButtonElement>('#complete-btn')!;
  const statusText = root.querySelector<HTMLElement>('#complete-status-text')!;
  completeBtn.addEventListener('click', () => {
    isDone = toggleChapterComplete(chapter.slug);
    completeBtn.className = isDone ? 'btn-secondary' : 'btn-primary';
    completeBtn.textContent = isDone ? '✓ Completed (Undo)' : 'Mark Chapter Complete';
    statusText.textContent = isDone ? 'Chapter marked complete!' : 'Finished reading this chapter?';
  });

  // Keyboard shortcuts [ and ] for Prev/Next chapter
  const onKey = (e: KeyboardEvent) => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === '[' && prevChapter) {
      window.location.hash = `#/chapter/${prevChapter.slug}`;
    } else if (e.key === ']' && nextChapter) {
      window.location.hash = `#/chapter/${nextChapter.slug}`;
    } else if (e.key.toLowerCase() === 'z' && !e.metaKey && !e.ctrlKey) {
      zenBtn.click();
    }
  };
  window.addEventListener('keydown', onKey);
  cleanups.push(() => window.removeEventListener('keydown', onKey));

  // Scroll to deep-linked section or lab if requested
  const sectionParam = queryParams.get('section');
  const labParam = queryParams.get('lab');
  if (sectionParam) {
    setTimeout(() => {
      document.getElementById(sectionParam)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  } else if (labParam) {
    setTimeout(() => {
      document.getElementById(`lab-${labParam}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  }

  return () => {
    cleanups.forEach((fn) => fn());
  };
}
