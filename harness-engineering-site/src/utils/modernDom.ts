/**
 * Modern Web Guidance helpers:
 * 1. Scroll progress bar JS fallback (only when animation-timeline: scroll() is unsupported)
 * 2. Light-dismiss fallback for browsers without <dialog closedby="any">
 * 3. Top-layer exit animation probe + fallback (Firefox / Safari)
 * 4. Same-document View Transition wrapper with focus routing
 */

export function initScrollProgressFallback(): void {
  if (typeof CSS === 'undefined' || !CSS.supports('animation-timeline', 'scroll()')) {
    const progress = document.querySelector<HTMLElement>('#progress');
    if (!progress) return;

    const update = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      progress.style.transform = `scaleX(${ratio})`;
    };

    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update, { passive: true });
    update();
  }
}

let supportsDisplayTransition: boolean | undefined;
function canTransitionDisplay(): boolean {
  if (supportsDisplayTransition !== undefined) return supportsDisplayTransition;
  if (!window.CSS?.supports?.('transition-behavior', 'allow-discrete') || !document.body) {
    return false;
  }
  const probe = document.createElement('div');
  probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = 'none';
  supportsDisplayTransition = getComputedStyle(probe).display === 'block';
  probe.remove();
  return supportsDisplayTransition;
}

function supportsTopLayerExit(): boolean {
  return Boolean(window.CSS?.supports?.('overlay', 'auto') && canTransitionDisplay());
}

export async function closeDialogSmoothly(dialog: HTMLDialogElement): Promise<void> {
  if (!dialog.open) return;
  if (!supportsTopLayerExit()) {
    dialog.setAttribute('data-closing', '');
    const animations = dialog.getAnimations({ subtree: true });
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((a) => a.finished)),
        new Promise((r) => setTimeout(r, 400)),
      ]);
    }
    if (!dialog.hasAttribute('data-closing')) return;
    dialog.removeAttribute('data-closing');
  }
  dialog.close();
}

export function attachDialogFallbacks(dialog: HTMLDialogElement): void {
  // Light-dismiss fallback for browsers without native closedby="any"
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    dialog.addEventListener('click', (event) => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      const inside =
        rect.top <= event.clientY &&
        event.clientY <= rect.top + rect.height &&
        rect.left <= event.clientX &&
        event.clientX <= rect.left + rect.width;
      if (!inside) {
        void closeDialogSmoothly(dialog);
      }
    });
  }

  // Ensure Esc cancel routes through smooth exit when top-layer exit isn't native
  dialog.addEventListener('cancel', (event) => {
    if (!supportsTopLayerExit()) {
      event.preventDefault();
      void closeDialogSmoothly(dialog);
    }
  });
}

export async function runWithViewTransition(
  updateDom: () => void | Promise<void>,
  focusTargetSelector = '#page-heading'
): Promise<void> {
  const focusHeading = () => {
    const el = document.querySelector<HTMLElement>(focusTargetSelector);
    if (el) {
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
      el.focus({ preventScroll: true });
    }
  };

  if (!document.startViewTransition) {
    await updateDom();
    focusHeading();
    return;
  }

  const transition = document.startViewTransition(async () => {
    await updateDom();
  });
  try {
    await transition.finished;
  } catch {
    // Ignore aborted transitions when the user navigates rapidly
  } finally {
    focusHeading();
  }
}
