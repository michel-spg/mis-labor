/**
 * Base class for step-by-step explanations that can go forwards AND backwards
 * (unlike a one-way animation). Manages the current index, the control buttons,
 * step dots, auto play and the arrow keys.
 *
 * Subclasses implement showScene(scene, index, previousIndex) and may override
 * durationFor(scene) (auto play pause in ms).
 *
 * Expected markup inside root (created by the subclass before calling init()):
 *   [data-act="first|prev|next|play"] buttons, .step-dots container
 */
class SceneStepper {
  constructor(root, scenes) {
    this.root = root;
    this.scenes = scenes;
    this.index = 0;
    this.timer = null;
  }

  /** Wires the controls and shows the first scene. */
  init() {
    const act = (name, fn) => this.root.querySelector(`[data-act="${name}"]`)?.addEventListener('click', fn);
    act('first', () => { this.stop(); this.go(0); });
    act('prev', () => { this.stop(); this.go(this.index - 1); });
    act('next', () => { this.stop(); this.go(this.index + 1); });
    act('play', () => (this.timer ? this.stop() : this.play()));
    this.dots = this.root.querySelector('.step-dots');
    this.dots.innerHTML = this.scenes.map((s, i) =>
      `<button class="step-dot" data-i="${i}" title="Schritt ${i + 1}: ${s.title}" aria-label="Schritt ${i + 1}: ${s.title}"></button>`).join('');
    this.dots.addEventListener('click', (e) => {
      const dot = e.target.closest('.step-dot');
      if (dot) { this.stop(); this.go(Number(dot.dataset.i)); }
    });
    this.root.addEventListener('keydown', (e) => {
      if (e.target.matches('input, select, textarea')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); this.stop(); this.go(this.index + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); this.stop(); this.go(this.index - 1); }
    });
    this.go(0, true);
  }

  /** Shows scene i (clamped). */
  go(i, initial = false) {
    const next = Math.max(0, Math.min(this.scenes.length - 1, i));
    if (next === this.index && !initial) return;
    const previous = initial ? null : this.index;
    this.index = next;
    this.showScene(this.scenes[next], next, previous);
    this.#updateControls();
  }

  /** Starts auto play from the current scene (or from the start when at the end). */
  play() {
    if (this.index === this.scenes.length - 1) this.go(0);
    const tick = () => {
      if (this.index >= this.scenes.length - 1) return this.stop();
      this.timer = setTimeout(() => { this.go(this.index + 1); tick(); }, this.durationFor(this.scenes[this.index]));
    };
    this.timer = -1; // mark as playing before the first timeout exists
    tick();
    this.#updateControls();
  }

  stop() {
    if (this.timer && this.timer !== -1) clearTimeout(this.timer);
    this.timer = null;
    this.#updateControls();
  }

  /* ---- hooks ---- */
  showScene() {}
  durationFor() { return 5000; }

  #updateControls() {
    const last = this.scenes.length - 1;
    const btn = (name) => this.root.querySelector(`[data-act="${name}"]`);
    if (btn('first')) btn('first').disabled = this.index === 0;
    if (btn('prev')) btn('prev').disabled = this.index === 0;
    if (btn('next')) btn('next').disabled = this.index === last;
    if (btn('play')) btn('play').textContent = this.timer ? '⏸ Pause' : '▶ Automatisch';
    this.dots?.querySelectorAll('.step-dot').forEach((d, i) => {
      d.classList.toggle('current', i === this.index);
      d.classList.toggle('done', i < this.index);
      if (i === this.index) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current');
    });
  }
}
