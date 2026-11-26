import type { GlossaryEntry, ManifestData } from '../types';
import { getCompletedSet } from '../state/progress';
import { mountLab } from '../components/InteractiveLabs';

export function renderRoadmapView(root: HTMLElement, manifest: ManifestData): () => void {
  const completed = getCompletedSet();
  const totalPct = Math.round((completed.size / manifest.stats.totalChapters) * 100);

  root.innerHTML = `
    <main class="container">
      <div class="section-header">
        <div>
          <span class="badge badge-accent">Learning Progression</span>
          <h1 id="page-heading" tabindex="-1" class="hero-title" style="margin-top:10px;font-size:clamp(2rem,3.5vw,2.8rem);">
            Curriculum Roadmap
          </h1>
          <p class="hero-subtitle" style="margin-bottom:0;">
            Overall mastery: <strong>${completed.size} / ${manifest.stats.totalChapters}</strong> chapters completed (${totalPct}%).
          </p>
        </div>
        <a class="btn-secondary" href="#/">← Back to Home</a>
      </div>

      <div class="tank-bar" style="margin:18px 0 36px;">
        <div class="tank-seg" style="width:${totalPct}%;background:linear-gradient(90deg,var(--accent),var(--teal));"></div>
      </div>

      <div style="display:grid;gap:22px;">
        ${manifest.modules
          .map((mod) => {
            const modChapters = manifest.chapters.filter((c) => c.moduleId === mod.id);
            const doneCount = modChapters.filter((c) => completed.has(c.slug)).length;
            const modPct = Math.round((doneCount / modChapters.length) * 100);

            return `
            <section class="blueprint-card">
              <div class="module-banner" style="margin-bottom:12px;">
                <div class="module-banner-left">
                  <span class="module-num-badge" style="background:${mod.accent}">Module ${mod.number}</span>
                  <h2 class="module-heading">${mod.title}</h2>
                </div>
                <span class="badge ${doneCount === modChapters.length ? 'badge-done' : 'badge-teal'}">${doneCount}/${modChapters.length} done (${modPct}%)</span>
              </div>
              <p style="margin:0 0 14px;color:var(--ink-secondary);font-size:14px;">${mod.subtitle}</p>
              <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:10px;">
                ${modChapters
                  .map(
                    (c) => `
                  <a class="prev-next-card" href="#/chapter/${c.slug}">
                    <div style="display:flex;justify-content:space-between;align-items:center;">
                      <span class="prev-next-dir">Chapter ${c.num} · ${c.readingTime}</span>
                      ${completed.has(c.slug) ? '<span class="badge badge-done">Done</span>' : ''}
                    </div>
                    <span class="prev-next-title">${c.title}</span>
                    <span style="font-size:12px;color:var(--ink-muted);">Prereq: ${c.prerequisites}</span>
                  </a>`
                  )
                  .join('')}
              </div>
            </section>`;
          })
          .join('')}
      </div>
    </main>
  `;
  return () => {};
}

export function renderLabsView(root: HTMLElement, manifest: ManifestData): () => void {
  root.innerHTML = `
    <main class="container">
      <div class="section-header" style="margin-bottom:28px;">
        <div>
          <span class="badge badge-teal">6 Interactive Simulators</span>
          <h1 id="page-heading" tabindex="-1" class="hero-title" style="margin-top:10px;font-size:clamp(2rem,3.5vw,2.8rem);">
            Interactive Harness Labs
          </h1>
          <p class="hero-subtitle" style="margin-bottom:0;">
            Experiment hands-on with core agent mechanics—every simulator below is also embedded directly inside its matching chapter.
          </p>
        </div>
        <a class="btn-secondary" href="#/">← Back to Home</a>
      </div>
      <div id="labs-hub-list" style="display:grid;gap:28px;"></div>
    </main>
  `;

  const listEl = root.querySelector<HTMLElement>('#labs-hub-list')!;
  const cleanups: (() => void)[] = [];

  for (const lab of manifest.labs) {
    const wrapper = document.createElement('section');
    const headerLink = document.createElement('div');
    headerLink.style.cssText = 'display:flex;justify-content:flex-end;margin-bottom:-18px;';
    headerLink.innerHTML = `<a class="bp-chip-link" href="#/chapter/${lab.chapterSlug}">Read Chapter ${lab.chapterNum} →</a>`;
    const slot = document.createElement('div');
    wrapper.appendChild(headerLink);
    wrapper.appendChild(slot);
    listEl.appendChild(wrapper);
    cleanups.push(mountLab(slot, lab));
  }

  return () => {
    cleanups.forEach((fn) => fn());
  };
}

export async function loadGlossaryData(): Promise<GlossaryEntry[]> {
  const res = await fetch('./data/glossary.json');
  return (await res.json()) as GlossaryEntry[];
}

export function renderGlossaryView(
  root: HTMLElement,
  entries: GlossaryEntry[],
  queryParams: URLSearchParams
): () => void {

  const letters = Array.from(new Set(entries.map((e) => e.letter))).sort();
  let selectedLetter: string | null = null;
  let searchQuery = '';
  const targetTermId = queryParams.get('term');

  root.innerHTML = `
    <main class="container">
      <div class="section-header">
        <div>
          <span class="badge badge-accent">Reference · ${entries.length} Terms</span>
          <h1 id="page-heading" tabindex="-1" class="hero-title" style="margin-top:10px;font-size:clamp(2rem,3.5vw,2.8rem);">
            Plain-English Glossary
          </h1>
          <p class="hero-subtitle" style="margin-bottom:0;">
            Every acronym and engineering term across all 41 chapters, explained simply with direct links back to the text.
          </p>
        </div>
        <a class="btn-secondary" href="#/">← Back to Home</a>
      </div>

      <div class="glossary-controls">
        <input id="glossary-filter" class="glossary-search" type="search" placeholder="Filter glossary terms or definitions…" />
        <div class="alpha-bar" id="alpha-bar">
          <button type="button" class="alpha-btn is-active" data-letter="">All</button>
          ${letters.map((l) => `<button type="button" class="alpha-btn" data-letter="${l}">${l}</button>`).join('')}
        </div>
      </div>

      <div class="glossary-grid" id="glossary-grid"></div>
    </main>
  `;

  const filterInput = root.querySelector<HTMLInputElement>('#glossary-filter')!;
  const gridEl = root.querySelector<HTMLElement>('#glossary-grid')!;
  const alphaBtns = Array.from(root.querySelectorAll<HTMLButtonElement>('.alpha-btn'));

  const renderCards = () => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = entries.filter((e) => {
      if (selectedLetter && e.letter !== selectedLetter) return false;
      if (q && !e.term.toLowerCase().includes(q) && !e.definitionText.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      gridEl.innerHTML = `<p style="color:var(--ink-muted)">No glossary entries matched your filter.</p>`;
      return;
    }

    gridEl.innerHTML = filtered
      .map(
        (e) => `
      <article class="glossary-card ${targetTermId === e.id ? 'is-target' : ''}" id="term-${e.id}">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;">
          <h2 class="glossary-term">${e.term.replace(/</g, '&lt;')}</h2>
          <span class="chapter-num">${e.letter}</span>
        </div>
        <div class="prose" style="font-size:14px;">${e.definitionHtml}</div>
      </article>`
      )
      .join('');
  };

  filterInput.addEventListener('input', () => {
    searchQuery = filterInput.value;
    renderCards();
  });

  alphaBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      selectedLetter = btn.dataset.letter || null;
      alphaBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
      renderCards();
    });
  });

  renderCards();

  if (targetTermId) {
    setTimeout(() => {
      document.getElementById(`term-${targetTermId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
  }

  return () => {};
}
