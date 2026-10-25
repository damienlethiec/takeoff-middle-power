// One overlay at a time. Buttons carrying data-action resolve the modal's promise.
// Enter clicks [data-primary] (unless a button already has focus), Escape clicks [data-escape].

export interface ModalHandle {
  el: HTMLElement;
  overlay: HTMLElement;
  result: Promise<string>;
  close(): void;
}

let current: ModalHandle | null = null;
export const modalOpen = () => current !== null;

document.addEventListener('keydown', (ev) => {
  if (!current) return;
  const active = document.activeElement as HTMLElement | null;
  if (ev.key === 'Enter') {
    if (active && (active.tagName === 'BUTTON' || active.tagName === 'A' || active.tagName === 'INPUT') && current.el.contains(active)) return;
    const p = current.el.querySelector<HTMLButtonElement>('[data-primary]:not(:disabled)');
    if (p) {
      ev.preventDefault();
      p.click();
    }
  } else if (ev.key === 'Escape') {
    const x = current.el.querySelector<HTMLButtonElement>('[data-escape]');
    if (x) {
      ev.preventDefault();
      x.click();
    }
  }
});

export function openModal(html: string, opts: { cls?: string; overlayCls?: string; label?: string; keep?: boolean } = {}): ModalHandle {
  current?.close();
  const overlay = document.createElement('div');
  overlay.className = `overlay ${opts.overlayCls ?? ''}`;
  const el = document.createElement('div');
  el.className = `modal ${opts.cls ?? ''}`;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  if (opts.label) el.setAttribute('aria-label', opts.label);
  el.tabIndex = -1;
  el.innerHTML = html;
  overlay.appendChild(el);
  document.body.appendChild(overlay);
  let resolve!: (v: string) => void;
  const result = new Promise<string>((r) => (resolve = r));
  const handle: ModalHandle = {
    el,
    overlay,
    result,
    close() {
      if (current === handle) current = null;
      overlay.classList.add('leaving');
      setTimeout(() => overlay.remove(), 180);
    },
  };
  el.addEventListener('click', (ev) => {
    const b = (ev.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!b || !el.contains(b) || (b as HTMLButtonElement).disabled) return;
    const action = b.dataset.action!;
    if (!opts.keep && !b.hasAttribute('data-keep')) handle.close();
    resolve(action);
  });
  current = handle;
  requestAnimationFrame(() => {
    const f = el.querySelector<HTMLElement>('[data-autofocus]') ?? el.querySelector<HTMLElement>('[data-primary]') ?? el;
    f.focus({ preventScroll: true });
  });
  return handle;
}

/** Resolve after ms, for staged animations. Respects reduced motion by shortening waits. */
export const wait = (ms: number) =>
  new Promise<void>((r) => setTimeout(r, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? Math.min(ms, 120) : ms));
