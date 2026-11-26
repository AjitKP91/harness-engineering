import type { SearchItem } from '../types';
import { attachDialogFallbacks, closeDialogSmoothly } from '../utils/modernDom';

export function initCommandPalette(
  getSearchItems: () => SearchItem[],
  onNavigate: (route: string) => void
): { open: () => void } {
  const dialog = document.getElementById('search-dialog') as HTMLDialogElement | null;
  const input = document.getElementById('search-modal-input') as HTMLInputElement | null;
  const resultsEl = document.getElementById('search-results');
  const closeBtn = document.getElementById('search-close-btn');

  if (!dialog || !input || !resultsEl) {
    return { open: () => {} };
  }

  attachDialogFallbacks(dialog);

  let activeIdx = 0;
  let currentMatches: SearchItem[] = [];

  const scoreItem = (item: SearchItem, query: string): number => {
    if (!query) {
      return item.type === 'lab' ? 3 : item.type === 'chapter' ? 2 : 0;
    }
    const q = query.toLowerCase().trim();
    const titleLower = item.title.toLowerCase();
    const subLower = item.subtitle.toLowerCase();
    if (titleLower === q) return 100;
    if (titleLower.startsWith(q)) return 80;
    if (titleLower.includes(q)) return 60;
    if (subLower.includes(q)) return 35;

    const terms = q.split(/\s+/);
    let hits = 0;
    for (const term of terms) {
      if (item.keywords.includes(term)) hits += 12;
    }
    return hits === terms.length * 12 ? hits : 0;
  };

  const renderResults = () => {
    const query = input.value;
    const all = getSearchItems();
    const scored = all
      .map((item) => ({ item, score: scoreItem(item, query) }))
      .filter((x) => (query.trim() ? x.score > 0 : x.item.type === 'lab' || x.item.type === 'chapter'))
      .sort((a, b) => b.score - a.score)
      .slice(0, 18)
      .map((x) => x.item);

    currentMatches = scored;
    if (activeIdx >= currentMatches.length) activeIdx = 0;

    if (currentMatches.length === 0) {
      resultsEl.innerHTML = `<div style="padding:20px;text-align:center;color:var(--ink-muted)">No chapters, sections, or glossary terms matched "${query.replace(/</g, '&lt;')}".</div>`;
      return;
    }

    resultsEl.innerHTML = currentMatches
      .map(
        (m, idx) => `
      <button type="button" class="search-result-item ${idx === activeIdx ? 'is-active' : ''}" data-idx="${idx}" role="option" aria-selected="${idx === activeIdx}">
        <div>
          <div class="search-result-title">${m.title.replace(/</g, '&lt;')}</div>
          <div class="search-result-sub">${m.subtitle.replace(/</g, '&lt;')}</div>
        </div>
        <span class="badge ${m.type === 'lab' ? 'badge-teal' : 'badge-accent'}">${m.badge}</span>
      </button>`
      )
      .join('');
  };

  const selectResult = (idx: number) => {
    const item = currentMatches[idx];
    if (!item) return;
    void closeDialogSmoothly(dialog).then(() => {
      onNavigate(item.route);
    });
  };

  const open = () => {
    input.value = '';
    activeIdx = 0;
    renderResults();
    dialog.showModal();
    input.focus();
  };

  input.addEventListener('input', () => {
    activeIdx = 0;
    renderResults();
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (currentMatches.length > 0) {
        activeIdx = (activeIdx + 1) % currentMatches.length;
        renderResults();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (currentMatches.length > 0) {
        activeIdx = (activeIdx - 1 + currentMatches.length) % currentMatches.length;
        renderResults();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      selectResult(activeIdx);
    }
  });

  resultsEl.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('.search-result-item');
    if (!btn) return;
    selectResult(Number(btn.dataset.idx));
  });

  closeBtn?.addEventListener('click', () => {
    void closeDialogSmoothly(dialog);
  });

  window.addEventListener('keydown', (e) => {
    const tag = (e.target as HTMLElement | null)?.tagName;
    const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement | null)?.isContentEditable;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (dialog.open) void closeDialogSmoothly(dialog);
      else open();
    } else if (e.key === '/' && !isTyping && !dialog.open) {
      e.preventDefault();
      open();
    }
  });

  return { open };
}
