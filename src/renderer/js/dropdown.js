/* ---------------------------------------------------------------
   Custom select.

   The native <select> popup is drawn by the OS: opaque, square, and
   completely deaf to the theme. This is a drop-in replacement built
   from ordinary elements — same API surface the panel already used
   (`el.value`, an `onchange`-style callback), but themed, animated
   and keyboard-driven.

   The menu is portalled to <body> so the panel's `overflow: hidden`
   cannot clip it, and it is repositioned on scroll / resize.
   --------------------------------------------------------------- */
import { h } from './util.js';

let openMenu = null;   // only one list may be open at a time

/**
 * @param {[string, string][]} options  [value, label] pairs
 * @param {string} value                currently selected value
 * @param {(v: string) => void} onChange
 * @param {{ariaLabel?: string, wide?: boolean}} opts
 * @returns {HTMLElement} button element exposing `.value`
 */
export function dropdown(options, value, onChange, { ariaLabel = '', wide = false } = {}) {
  const items = options.map(([v, label]) => [String(v), label]);
  let current = String(value ?? '');

  const labelFor = (v) => items.find(([iv]) => iv === v)?.[1] ?? v;

  const text = h('span.dd-text', {}, labelFor(current));
  const el = h('button.dd', {
    type: 'button',
    role: 'combobox',
    'aria-haspopup': 'listbox',
    'aria-expanded': 'false',
    'aria-label': ariaLabel,
    class: wide ? 'wide' : '',
  }, text, h('span.dd-caret', {
    html: '<svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5"/></svg>',
  }));

  Object.defineProperty(el, 'value', {
    get: () => current,
    set: (v) => { current = String(v); text.textContent = labelFor(current); },
  });

  const pick = (v) => {
    if (v === current) return close();
    el.value = v;
    close();
    onChange?.(v);
  };

  function close() {
    if (!openMenu || openMenu.owner !== el) return;
    const { menu, detach } = openMenu;
    openMenu = null;
    detach();
    el.setAttribute('aria-expanded', 'false');
    menu.classList.remove('open');
    menu.addEventListener('transitionend', () => menu.remove(), { once: true });
    setTimeout(() => menu.remove(), 260);   // in case the transition never fires
  }

  function open() {
    closeAny();
    const menu = h('div.dd-menu', { role: 'listbox' },
      ...items.map(([v, label]) => {
        const opt = h('button.dd-option', {
          type: 'button',
          role: 'option',
          'aria-selected': String(v === current),
          class: v === current ? 'active' : '',
        }, h('span', {}, label), h('i.dd-check', {
          html: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
        }));
        opt.onclick = () => pick(v);
        return opt;
      }));

    document.body.append(menu);
    place(menu);

    const active = menu.querySelector('.dd-option.active') || menu.firstElementChild;
    active?.scrollIntoView({ block: 'nearest' });
    menu.getBoundingClientRect();          // flush the closed state so the open one animates
    menu.classList.add('open');

    const onDocDown = (e) => { if (!menu.contains(e.target) && !el.contains(e.target)) close(); };
    const onScroll = (e) => (menu.contains(e.target) ? null : close());
    const onResize = () => close();
    const onKey = (e) => {
      if (e.key === 'Tab') return;
      // captured at the document, so the app-wide single-key shortcuts
      // (t = next theme, c = next face…) stay out of the way while open
      e.stopPropagation();
      const opts = [...menu.querySelectorAll('.dd-option')];
      const i = opts.indexOf(document.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); close(); el.focus(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); opts[Math.min(opts.length - 1, i + 1)]?.focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); (i <= 0 ? opts[0] : opts[i - 1])?.focus(); }
      else if (e.key === 'Home') { e.preventDefault(); opts[0]?.focus(); }
      else if (e.key === 'End') { e.preventDefault(); opts.at(-1)?.focus(); }
    };

    document.addEventListener('pointerdown', onDocDown, true);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onResize);
    document.addEventListener('scroll', onScroll, true);

    openMenu = {
      owner: el,
      menu,
      detach() {
        document.removeEventListener('pointerdown', onDocDown, true);
        document.removeEventListener('keydown', onKey, true);
        window.removeEventListener('resize', onResize);
        document.removeEventListener('scroll', onScroll, true);
      },
    };
    el.setAttribute('aria-expanded', 'true');
    active?.focus({ preventScroll: true });
  }

  /** Anchor under the trigger, flipping above it when the viewport runs out. */
  function place(menu) {
    const r = el.getBoundingClientRect();
    const margin = 8;
    const below = window.innerHeight - r.bottom - margin;
    const above = r.top - margin;
    const flip = below < 180 && above > below;

    // as wide as its longest label, never narrower than the trigger
    menu.style.minWidth = `${Math.max(r.width, 168)}px`;
    menu.style.maxWidth = `${Math.min(340, window.innerWidth - margin * 2)}px`;
    menu.style.maxHeight = `${Math.max(120, (flip ? above : below) - 4)}px`;

    const width = menu.offsetWidth;   // layout width — unaffected by the open transform
    menu.style.left = `${Math.max(margin, Math.min(r.left, window.innerWidth - width - margin))}px`;
    if (flip) {
      menu.style.bottom = `${window.innerHeight - r.top + 6}px`;
      menu.style.top = 'auto';
      menu.classList.add('flip');
    } else {
      menu.style.top = `${r.bottom + 6}px`;
      menu.style.bottom = 'auto';
    }
  }

  el.onclick = (e) => {
    e.preventDefault();
    openMenu?.owner === el ? close() : open();
  };
  el.onkeydown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  };

  return el;
}

/** Dismisses whatever list is open — the panel calls this before re-rendering. */
export function closeAny() {
  if (!openMenu) return;
  openMenu.detach();
  openMenu.menu.remove();
  openMenu.owner.setAttribute('aria-expanded', 'false');
  openMenu = null;
}
