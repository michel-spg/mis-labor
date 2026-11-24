/**
 * Exercise type "write SQL": the student types a script, it is executed by MiniSql and verified
 * by behavioural checks (e.g. "an insert with an unknown station must fail").
 *
 * config.setup?:       SQL that runs first (prepared tables/data)
 * config.starter?:     text pre-filled in the editor
 * config.checks:       [{label, test(db) -> boolean}]  db = database after setup + student script
 * config.solutionSql:  the sample solution
 */
class SqlExercise extends Exercise {
  renderBody(body) {
    const { setup, starter = '', rows = 9 } = this.config;
    body.innerHTML = `
      ${setup ? `<details class="ex-setup"><summary>Vorhandene Ausgangsdaten (laufen vor deinem Skript automatisch)</summary>${DdlView.sqlBlock(setup)}</details>` : ''}
      <textarea class="sql-input" spellcheck="false" autocomplete="off" rows="${rows}" aria-label="Dein SQL-Skript"
        placeholder="-- Dein SQL hier&#10;create table …"></textarea>
      <div class="sql-out" aria-live="polite"></div>`;
    this.input = body.querySelector('textarea');
    this.input.value = starter;
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const { selectionStart: s, selectionEnd: t, value } = this.input;
        this.input.value = `${value.slice(0, s)}  ${value.slice(t)}`;
        this.input.selectionStart = this.input.selectionEnd = s + 2;
      }
    });
  }

  /** Runs setup + student script; returns {db, results}. */
  #execute() {
    const db = new MiniSql();
    if (this.config.setup) db.run(this.config.setup);
    const results = db.run(this.input.value);
    return { db, results };
  }

  evaluate() {
    const out = this.body.querySelector('.sql-out');
    if (!this.input.value.trim()) { out.innerHTML = ''; return { ok: false, message: 'Schreibe zuerst dein SQL-Skript in das Feld.' }; }
    const { db, results } = this.#execute();
    out.innerHTML = `<h4 class="mini-h">Protokoll</h4>${DdlView.logHtml(results)}<h4 class="mini-h">Ergebnis</h4>${DdlView.schemaHtml(db)}`;
    const err = results.find((r) => !r.ok && !r.skipped);
    if (err) return { ok: false, message: `Dein Skript bricht ab. ${DdlView.esc(err.message)}` };
    const checks = this.config.checks.map((c) => {
      let ok = false;
      try { ok = c.test(db) === true; } catch { ok = false; }
      return { label: c.label, ok };
    });
    const failed = checks.filter((c) => !c.ok);
    const list = `<ul class="check-list">${checks.map((c) => `<li class="${c.ok ? 'ok' : 'no'}">${c.ok ? '✔' : '✘'} ${c.label}</li>`).join('')}</ul>`;
    return failed.length
      ? { ok: false, message: `${checks.length - failed.length} von ${checks.length} Prüfungen bestanden.${list}` }
      : { ok: true, message: `Alle ${checks.length} Prüfungen bestanden – das Skript läuft fehlerfrei und die Constraints wirken.${list}` };
  }

  applySolution() {
    this.input.value = this.config.solutionSql;
    const out = this.body.querySelector('.sql-out');
    const { db, results } = this.#execute();
    out.innerHTML = `<h4 class="mini-h">Protokoll</h4>${DdlView.logHtml(results)}<h4 class="mini-h">Ergebnis</h4>${DdlView.schemaHtml(db)}`;
  }

  solutionHtml() {
    const { explanation, solutionSql } = this.config;
    return (explanation ? `<p>${explanation}</p>` : '') + DdlView.sqlBlock(solutionSql);
  }
}

/** Small helpers for the checks of SQL exercises. */
const Probe = {
  /** True if the statement(s) run without error on a copy of the database. */
  ok(db, sql) { return db.clone().run(sql).every((r) => r.ok); },
  /** True if a statement fails because of a constraint (a missing table does not count as "rejected"). */
  fails(db, sql) { return db.clone().run(sql).some((r) => !r.ok && !r.skipped && !/^Fehler (1146|1054):/.test(r.message)); },
  /** Database copy after running sql. */
  after(db, sql) { const c = db.clone(); c.run(sql); return c; },
  col(db, table, col) { return db.describe().find((t) => t.name === table)?.columns.find((c) => c.name === col); },
  tbl(db, table) { return db.describe().find((t) => t.name === table); },
};
