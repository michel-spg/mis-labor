/**
 * Base class for all exercises in part 2 (template method pattern).
 * Renders the common card frame (title, task, buttons, feedback) and delegates
 * the exercise specific parts to the subclasses.
 *
 * Subclasses implement:
 *  - renderBody(bodyElement)
 *  - evaluate(): {ok: boolean, message: string}
 *  - applySolution()
 * and may override solutionHtml() to show an explanation/SQL with the solution.
 */
class Exercise {
  /**
   * @param {HTMLElement} root container of the exercise card
   * @param {object} config
   * @param {string} config.title
   * @param {string} config.level e.g. "leicht", "mittel"
   * @param {string} config.task task description (HTML)
   * @param {string} [config.solutionSql] SQL shown together with the solution
   * @param {string} [config.explanation] explanation shown together with the solution (HTML)
   */
  constructor(root, config) {
    this.root = root;
    this.config = config;
  }

  /**
   * Creates one card per catalog entry inside the container.
   * @param {HTMLElement} container
   * @param {{type: typeof Exercise, config: object}[]} catalog
   */
  static mountAll(container, catalog) {
    catalog.forEach(({ type, config }) => {
      const article = document.createElement('article');
      container.appendChild(article);
      new type(article, config).mount();
    });
  }

  /** Renders the whole card; call once after construction. */
  mount() {
    const { title, level, task } = this.config;
    this.root.classList.add('exercise');
    this.root.innerHTML = `
      <header class="ex-head">
        <h3>${title}</h3><span class="level level-${level}">${level}</span>
      </header>
      <p class="ex-task">${task}</p>
      <div class="ex-body"></div>
      <div class="ex-actions">
        <button class="btn primary" data-act="check">Prüfen</button>
        <button class="btn" data-act="solution">Lösung anzeigen</button>
        <button class="btn ghost-btn" data-act="reset">↺ Zurücksetzen</button>
      </div>
      <div class="feedback" aria-live="polite" hidden></div>
      <div class="solution" hidden></div>`;
    this.body = this.root.querySelector('.ex-body');
    this.renderBody(this.body);
    this.root.querySelector('[data-act="check"]').addEventListener('click', () => this.check());
    this.root.querySelector('[data-act="solution"]').addEventListener('click', () => this.revealSolution());
    this.root.querySelector('[data-act="reset"]').addEventListener('click', () => this.reset());
  }

  /** Evaluates the current answer and shows the feedback. */
  check() {
    const { ok, message } = this.evaluate();
    this.#feedback(ok ? 'ok' : 'wrong', `${ok ? '✅ ' : '🩺 '}${message}`);
  }

  /** Fills in the correct answer and shows explanation and SQL. */
  revealSolution() {
    this.applySolution();
    const box = this.root.querySelector('.solution');
    box.innerHTML = this.solutionHtml();
    box.hidden = !box.innerHTML;
    this.#feedback('info', 'Lösung eingetragen – vergleiche sie mit deinem Versuch.');
  }

  /** Restores the initial state. */
  reset() {
    this.renderBody(this.body);
    this.root.querySelector('.feedback').hidden = true;
    this.root.querySelector('.solution').hidden = true;
  }

  /** Default solution box: optional explanation plus optional SQL. */
  solutionHtml() {
    const { explanation, solutionSql } = this.config;
    return (explanation ? `<p>${explanation}</p>` : '') + (solutionSql ? `<pre class="sql">${solutionSql}</pre>` : '');
  }

  #feedback(kind, html) {
    const box = this.root.querySelector('.feedback');
    box.className = `feedback ${kind}`;
    box.innerHTML = html;
    box.hidden = false;
  }

  /** Returns a shuffled copy of the array (Fisher-Yates). */
  static shuffle(array) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}
