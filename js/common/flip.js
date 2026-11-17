/**
 * FLIP animation helper (First, Last, Invert, Play).
 *
 * Every element with a `data-flip` attribute is identified by its key plus an
 * occurrence counter (the 3rd "Huber" is `c:Nachname=Huber#2`). Take a
 * snapshot before the DOM is replaced, then call play(): elements whose key
 * existed before glide from their old position to the new one, new elements
 * fade in. This makes values visibly "move" from one table into another.
 */
class Flip {
  /** True if the user asked the OS for reduced motion. */
  static get reduced() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  /**
   * Records the position of all flip elements below root.
   * @param {HTMLElement} root
   * @returns {Map<string, DOMRect>}
   */
  static snapshot(root) {
    const map = new Map();
    Flip.#each(root, (el, key) => map.set(key, el.getBoundingClientRect()));
    return map;
  }

  /**
   * Animates all flip elements from their snapshot position to the current one.
   * @param {HTMLElement} root
   * @param {Map<string, DOMRect>} before result of snapshot()
   * @param {number} [duration] ms
   */
  static play(root, before, duration = 750) {
    if (Flip.reduced || !before) return;
    Flip.#each(root, (el, key) => {
      const now = el.getBoundingClientRect();
      const old = before.get(key);
      if (old) {
        const dx = old.left - now.left;
        const dy = old.top - now.top;
        if (Math.abs(dx) + Math.abs(dy) < 1) return;
        el.animate(
          [{ transform: `translate(${dx}px, ${dy}px)`, zIndex: 5 }, { transform: 'none', zIndex: 5 }],
          { duration, easing: 'cubic-bezier(.25,.8,.25,1)' },
        );
      } else {
        el.animate(
          [{ opacity: 0, transform: 'scale(.7)' }, { opacity: 1, transform: 'none' }],
          { duration: duration * 0.55, delay: duration * 0.45, easing: 'ease-out', fill: 'backwards' },
        );
      }
    });
  }

  static #each(root, callback) {
    const counts = new Map();
    root.querySelectorAll('[data-flip]').forEach((el) => {
      const base = el.dataset.flip;
      const n = counts.get(base) ?? 0;
      counts.set(base, n + 1);
      callback(el, `${base}#${n}`);
    });
  }
}
