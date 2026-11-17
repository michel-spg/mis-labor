/**
 * Students click the column headers that have a certain property
 * (e.g. "violates 1NF because the values are not atomic").
 *
 * config.table:   {name, columns: [string], rows: [{col: value}]}
 * config.correct: [column names that must be picked]
 * config.reasons: {column: explanation}  shown with the solution
 */
class ColumnPickExercise extends Exercise {
  renderBody(body) {
    const { table } = this.config;
    this.picked = new Set();
    body.innerHTML = `
      <div class="rel">
        <div class="rel-title">${table.name}</div>
        <div class="tbl-scroll">
          <table class="data pick-table">
            <thead><tr>${table.columns.map((c) =>
              `<th data-col="${c}"><button aria-pressed="false" data-col="${c}">${c}</button></th>`).join('')}</tr></thead>
            <tbody>${table.rows.map((r) => `<tr>${table.columns.map((c) =>
              `<td data-col="${c}">${RelationView.format(r[c])}</td>`).join('')}</tr>`).join('')}</tbody>
          </table>
        </div>
      </div>
      <p class="muted">Klicke auf die Spaltenköpfe, um sie zu markieren (nochmal klicken hebt die Markierung auf).</p>`;
    body.querySelectorAll('th button').forEach((btn) => btn.addEventListener('click', () => this.#toggle(btn.dataset.col)));
  }

  #toggle(col, value) {
    const on = value ?? !this.picked.has(col);
    if (on) this.picked.add(col); else this.picked.delete(col);
    this.body.querySelectorAll(`[data-col="${col}"]`).forEach((el) => {
      el.classList.toggle('picked', on);
      el.classList.remove('right', 'wrong', 'missed');
    });
    this.body.querySelector(`button[data-col="${col}"]`).setAttribute('aria-pressed', String(on));
  }

  evaluate() {
    const { correct, table } = this.config;
    if (!this.picked.size) return { ok: false, message: 'Du hast noch keine Spalte markiert.' };
    let wrong = 0;
    let missing = 0;
    table.columns.forEach((c) => {
      const should = correct.includes(c);
      const is = this.picked.has(c);
      const th = this.body.querySelector(`th[data-col="${c}"]`);
      th.classList.toggle('right', is && should);
      th.classList.toggle('wrong', is && !should);
      if (is && !should) wrong++;
      if (!is && should) missing++;
    });
    if (wrong) return { ok: false, message: `${wrong} markierte Spalte(n) sind in Ordnung (rot) – dort steht jeweils nur ein einziger Wert.` };
    if (missing) return { ok: false, message: `Richtig so weit – aber es fehlen noch ${missing} Spalte(n).` };
    return { ok: true, message: this.config.successMessage ?? 'Genau – alle Problemspalten gefunden!' };
  }

  applySolution() {
    this.config.table.columns.forEach((c) => this.#toggle(c, this.config.correct.includes(c)));
    this.evaluate();
  }

  solutionHtml() {
    const reasons = this.config.reasons ?? {};
    const list = Object.entries(reasons).map(([c, r]) => `<li><b>${c}:</b> ${r}</li>`).join('');
    return (list ? `<ul>${list}</ul>` : '') + super.solutionHtml();
  }
}
