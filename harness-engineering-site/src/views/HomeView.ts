import type { ManifestData } from '../types';
import { getActivePathId, getCompletedSet, getLastChapter, setActivePathId } from '../state/progress';
import { mountHarnessBlueprint } from '../components/HarnessBlueprint';

export function renderHomeView(root: HTMLElement, manifest: ManifestData): () => void {
  const completed = getCompletedSet();
  const lastSlug = getLastChapter();
  const lastChapter = lastSlug ? manifest.chapters.find((c) => c.slug === lastSlug) : null;
  let activePathId = getActivePathId();

  const primaryCtaHref = lastChapter
    ? `#/chapter/${lastChapter.slug}`
    : '#/chapter/00-start-here-what-is-an-agent-harness';
  const primaryCtaLabel = lastChapter
    ? `Continue: Ch. ${lastChapter.num} ${lastChapter.title}`
    : 'Start at Chapter 00 →';

  root.innerHTML = `
    <main class="container">
      <section class="hero">
        <div>
          <div class="hero-eyebrow">
            <span class="hero-eyebrow-dot"></span>
            <span>Interactive Field Guide · Zero Prerequisites</span>
          </div>
          <h1 id="page-heading" tabindex="-1" class="hero-title">
            Understand how modern AI coding agents <em>actually work</em>.
          </h1>
          <p class="hero-subtitle">
            An interactive, beginner-friendly textbook exploring the software wrapped around language models, from streaming tool loops and KV prompt caches to OS sandboxes, subagent swarms, and evaluation benchmarks.
          </p>
          <div class="formula-banner" aria-label="Core formula">
            <span class="formula-pill">AI Agent</span>
            <span class="formula-eq">=</span>
            <span class="formula-pill">Language Model</span>
            <span class="formula-eq">+</span>
            <span class="formula-pill is-accent">Agent Harness</span>
          </div>
          <div class="hero-actions">
            <a class="btn-primary" href="${primaryCtaHref}">${primaryCtaLabel}</a>
            <a class="btn-secondary" href="#/labs">Try ${manifest.stats.totalLabs} Interactive Labs</a>
            <a class="btn-secondary" href="#/roadmap">View Roadmap</a>
          </div>
          <div class="hero-stats">
            <div>
              <div class="stat-value">${manifest.stats.totalChapters}</div>
              <div class="stat-label">Deep Chapters</div>
            </div>
            <div>
              <div class="stat-value">${Math.round(manifest.stats.totalWords / 1000)}k+</div>
              <div class="stat-label">Plain-English Words</div>
            </div>
            <div>
              <div class="stat-value">${manifest.stats.totalLabs}</div>
              <div class="stat-label">Live Simulators</div>
            </div>
            <div>
              <div class="stat-value">${manifest.stats.totalGlossaryTerms}</div>
              <div class="stat-label">Glossary Terms</div>
            </div>
          </div>
        </div>
        <div id="hero-blueprint-mount"></div>
      </section>

      <section class="section-block" aria-labelledby="paths-heading">
        <div class="section-header">
          <div>
            <h2 id="paths-heading" class="section-title">Choose a Reading Path</h2>
            <p class="section-subtitle">Click a path to highlight its chapters below, or read straight through from Module 0 to Module 7.</p>
          </div>
          <button type="button" class="btn-ghost btn-sm" id="clear-path-btn" style="display:none;">Show All Chapters</button>
        </div>
        <div class="paths-grid" id="paths-grid">
          ${manifest.readingPaths
            .map(
              (rp) => `
            <button type="button" class="path-card" data-path-id="${rp.id}">
              <div class="path-card-top">
                <span class="path-title">${rp.title}</span>
                <span class="path-count">${rp.chapterNums.length} chapters</span>
              </div>
              <p class="path-goal">${rp.goal}</p>
              <div class="path-nums">
                ${rp.chapterNums.map((n) => `<span class="path-num-tag">${n}</span>`).join('')}
              </div>
            </button>`
            )
            .join('')}
        </div>
      </section>

      <section class="section-block" aria-labelledby="labs-heading">
        <div class="section-header">
          <div>
            <h2 id="labs-heading" class="section-title">Hands-On Harness Simulators</h2>
            <p class="section-subtitle">Experiment directly with caching, compaction, OS sandboxes, subagents, and evaluation math.</p>
          </div>
          <a class="btn-ghost btn-sm" href="#/labs">Open All Labs →</a>
        </div>
        <div class="labs-grid">
          ${manifest.labs
            .map(
              (lab) => `
            <a class="lab-showcase-card" href="#/chapter/${lab.chapterSlug}?lab=${lab.id}">
              <div>
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
                  <span class="badge badge-teal">${lab.badge}</span>
                  <span class="chapter-num">Ch. ${lab.chapterNum}</span>
                </div>
                <h3 style="margin:0 0 8px;font-size:16.5px;">${lab.title}</h3>
                <p style="margin:0 0 14px;font-size:13.5px;color:var(--ink-secondary);">${lab.subtitle}</p>
              </div>
              <span style="font-size:13px;font-weight:600;color:var(--teal);">Launch in Chapter ${lab.chapterNum} →</span>
            </a>`
            )
            .join('')}
        </div>
      </section>

      <section class="section-block" aria-labelledby="curriculum-heading">
        <div class="section-header">
          <div>
            <h2 id="curriculum-heading" class="section-title">Full Curriculum Map</h2>
            <p class="section-subtitle">${manifest.stats.totalModules} modules · ${completed.size} of ${manifest.stats.totalChapters} chapters completed</p>
          </div>
        </div>
        <div id="curriculum-modules">
          ${manifest.modules
            .map((mod) => {
              const modChapters = manifest.chapters.filter((c) => c.moduleId === mod.id);
              return `
              <div class="module-group">
                <div class="module-banner">
                  <div class="module-banner-left">
                    <span class="module-num-badge" style="background:${mod.accent}">Module ${mod.number}</span>
                    <h3 class="module-heading">${mod.title}</h3>
                  </div>
                  <p class="module-desc">${mod.subtitle}</p>
                </div>
                <div class="chapters-grid">
                  ${modChapters
                    .map((ch) => {
                      const isDone = completed.has(ch.slug);
                      return `
                      <a class="chapter-card" data-ch-num="${ch.num}" href="#/chapter/${ch.slug}">
                        <div>
                          <div class="chapter-card-meta">
                            <span class="chapter-num">Chapter ${ch.num}</span>
                            <div style="display:flex;gap:6px;">
                              ${ch.labIds.length ? '<span class="badge badge-teal">Lab</span>' : ''}
                              ${isDone ? '<span class="badge badge-done">Done</span>' : ''}
                            </div>
                          </div>
                          <h4 class="chapter-card-title">${ch.title}</h4>
                          <p class="chapter-card-summary">${ch.summary}</p>
                        </div>
                        <div class="chapter-card-footer">
                          <span>${ch.readingTime}</span>
                          <span>Read →</span>
                        </div>
                      </a>`;
                    })
                    .join('')}
                </div>
              </div>`;
            })
            .join('')}
        </div>
      </section>
      <p style="margin-top:24px;font-size:12.5px;color:var(--ink-muted);text-align:center;">
        Vendor API endpoints, CLI flags, and protocol details verified against 2025–2026 specs as of November 2026.
      </p>
    </main>
  `;

  const cleanupBlueprint = mountHarnessBlueprint(root.querySelector('#hero-blueprint-mount')!);
  const clearBtn = root.querySelector<HTMLButtonElement>('#clear-path-btn')!;

  const syncPathSelection = () => {
    const activePath = manifest.readingPaths.find((r) => r.id === activePathId) || null;
    clearBtn.style.display = activePath ? 'inline-flex' : 'none';

    root.querySelectorAll<HTMLElement>('.path-card').forEach((card) => {
      card.classList.toggle('is-selected', card.dataset.pathId === activePathId);
    });

    const allowedNums = activePath ? new Set(activePath.chapterNums) : null;
    root.querySelectorAll<HTMLElement>('.chapter-card').forEach((card) => {
      const num = card.dataset.chNum || '';
      if (!allowedNums) {
        card.classList.remove('is-dimmed', 'is-highlighted');
      } else if (allowedNums.has(num)) {
        card.classList.remove('is-dimmed');
        card.classList.add('is-highlighted');
      } else {
        card.classList.add('is-dimmed');
        card.classList.remove('is-highlighted');
      }
    });
  };

  root.querySelectorAll<HTMLElement>('.path-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = card.dataset.pathId || null;
      activePathId = activePathId === id ? null : id;
      setActivePathId(activePathId);
      syncPathSelection();
    });
  });

  clearBtn.addEventListener('click', () => {
    activePathId = null;
    setActivePathId(null);
    syncPathSelection();
  });

  syncPathSelection();
  return cleanupBlueprint;
}
