import mermaid from 'mermaid';
import { getEffectiveScheme } from './ThemeToggle';
import { attachDialogFallbacks, closeDialogSmoothly } from '../utils/modernDom';

let lightboxInitialized = false;
let currentZoom = 1;
let panX = 0;
let panY = 0;

function configureMermaid(): void {
  const isDark = getEffectiveScheme() === 'dark';
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    theme: 'base',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    themeVariables: isDark
      ? {
          background: '#10151e',
          primaryColor: '#1b2434',
          primaryTextColor: '#f1ede6',
          primaryBorderColor: '#f59e0b',
          secondaryColor: '#13242b',
          secondaryTextColor: '#f1ede6',
          secondaryBorderColor: '#2dd4bf',
          tertiaryColor: '#1a2130',
          tertiaryTextColor: '#f1ede6',
          lineColor: '#94a3b8',
          textColor: '#f1ede6',
          mainBkg: '#1b2434',
          nodeBorder: '#f59e0b',
          clusterBkg: '#131822',
          clusterBorder: '#334155',
          actorBkg: '#1b2434',
          actorBorder: '#2dd4bf',
          actorTextColor: '#f1ede6',
          signalColor: '#f1ede6',
          labelBoxBkgColor: '#1a2130',
          labelTextColor: '#f1ede6',
        }
      : {
          background: '#f6f3ec',
          primaryColor: '#ffffff',
          primaryTextColor: '#181715',
          primaryBorderColor: '#c85a17',
          secondaryColor: '#eef8f6',
          secondaryTextColor: '#181715',
          secondaryBorderColor: '#0f766e',
          tertiaryColor: '#f1ede4',
          tertiaryTextColor: '#181715',
          lineColor: '#57534e',
          textColor: '#181715',
          mainBkg: '#ffffff',
          nodeBorder: '#c85a17',
          clusterBkg: '#faf8f4',
          clusterBorder: '#d6d3cd',
          actorBkg: '#ffffff',
          actorBorder: '#0f766e',
          actorTextColor: '#181715',
          signalColor: '#181715',
          labelBoxBkgColor: '#f1ede4',
          labelTextColor: '#181715',
        },
  });
}

function initDiagramLightbox(): void {
  if (lightboxInitialized) return;
  lightboxInitialized = true;

  const dialog = document.getElementById('diagram-dialog') as HTMLDialogElement | null;
  const viewport = document.getElementById('diagram-viewport');
  const canvas = document.getElementById('diagram-canvas');
  const zoomLabel = document.getElementById('diagram-zoom-label');
  const zoomInBtn = document.getElementById('diagram-zoom-in');
  const zoomOutBtn = document.getElementById('diagram-zoom-out');
  const resetBtn = document.getElementById('diagram-zoom-reset');
  const closeBtn = document.getElementById('diagram-close-btn');

  if (!dialog || !viewport || !canvas || !zoomLabel) return;
  attachDialogFallbacks(dialog);

  const applyTransform = () => {
    canvas.style.transform = `translate(${panX}px, ${panY}px) scale(${currentZoom})`;
    zoomLabel.textContent = `${Math.round(currentZoom * 100)}%`;
  };

  zoomInBtn?.addEventListener('click', () => {
    currentZoom = Math.min(3.5, currentZoom + 0.25);
    applyTransform();
  });

  zoomOutBtn?.addEventListener('click', () => {
    currentZoom = Math.max(0.4, currentZoom - 0.25);
    applyTransform();
  });

  resetBtn?.addEventListener('click', () => {
    currentZoom = 1;
    panX = 0;
    panY = 0;
    applyTransform();
  });

  closeBtn?.addEventListener('click', () => {
    void closeDialogSmoothly(dialog);
  });

  viewport.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      const delta = e.deltaY < 0 ? 0.12 : -0.12;
      currentZoom = Math.min(3.5, Math.max(0.4, currentZoom + delta));
      applyTransform();
    },
    { passive: false }
  );

  let dragging = false;
  let startX = 0;
  let startY = 0;
  viewport.addEventListener('pointerdown', (e) => {
    dragging = true;
    startX = e.clientX - panX;
    startY = e.clientY - panY;
    viewport.setPointerCapture(e.pointerId);
  });
  viewport.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    panX = e.clientX - startX;
    panY = e.clientY - startY;
    applyTransform();
  });
  viewport.addEventListener('pointerup', () => {
    dragging = false;
  });
  viewport.addEventListener('pointercancel', () => {
    dragging = false;
  });
}

export function openDiagramLightbox(svgMarkup: string, title = 'Architecture Diagram'): void {
  initDiagramLightbox();
  const dialog = document.getElementById('diagram-dialog') as HTMLDialogElement | null;
  const canvas = document.getElementById('diagram-canvas');
  const titleEl = document.getElementById('diagram-dialog-title');
  const zoomLabel = document.getElementById('diagram-zoom-label');
  if (!dialog || !canvas) return;

  currentZoom = 1.15;
  panX = 0;
  panY = 0;
  canvas.innerHTML = svgMarkup;
  const svg = canvas.querySelector('svg');
  if (svg) {
    svg.style.maxWidth = 'none';
    svg.style.width = 'min(920px, 85vw)';
    svg.style.height = 'auto';
  }
  canvas.style.transform = `translate(0px, 0px) scale(${currentZoom})`;
  if (zoomLabel) zoomLabel.textContent = `${Math.round(currentZoom * 100)}%`;
  if (titleEl) titleEl.textContent = title;
  dialog.showModal();
}

let renderSeq = 0;

function decodeBase64Utf8(b64: string): string {
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export async function renderMermaidDiagrams(container: HTMLElement): Promise<void> {
  initDiagramLightbox();
  const figures = Array.from(container.querySelectorAll<HTMLElement>('.mermaid-figure'));
  if (figures.length === 0) return;

  configureMermaid();

  for (const fig of figures) {
    const b64 = fig.dataset.mermaidB64;
    const stageEl = fig.querySelector<HTMLElement>('.mermaid-stage');
    if (!b64 || !stageEl) continue;

    const rawCode = decodeBase64Utf8(b64).trim();
    if (!rawCode) continue;

    renderSeq += 1;
    const svgId = `mermaid-svg-${Date.now()}-${renderSeq}`;
    const scratch = document.createElement('div');
    scratch.style.cssText = 'position:fixed;left:-99999px;top:-99999px;visibility:hidden;pointer-events:none;';
    document.body.appendChild(scratch);
    try {
      const { svg } = await mermaid.render(svgId, rawCode, scratch);
      stageEl.innerHTML = svg;
    } catch {
      stageEl.innerHTML = `<pre class="lab-pre">${rawCode.replace(/</g, '&lt;')}</pre>`;
    } finally {
      scratch.remove();
      document.getElementById(`d${svgId}`)?.remove();
    }

    const zoomBtn = fig.querySelector<HTMLButtonElement>('[data-action="zoom"]');
    const copyBtn = fig.querySelector<HTMLButtonElement>('[data-action="copy"]');

    if (zoomBtn && !zoomBtn.dataset.bound) {
      zoomBtn.dataset.bound = '1';
      zoomBtn.addEventListener('click', () => {
        openDiagramLightbox(stageEl.innerHTML, 'Architecture Diagram');
      });
    }

    if (copyBtn && !copyBtn.dataset.bound) {
      copyBtn.dataset.bound = '1';
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(rawCode);
          copyBtn.textContent = 'Copied!';
          setTimeout(() => {
            copyBtn.textContent = 'Copy source';
          }, 1500);
        } catch {}
      });
    }
  }
}
