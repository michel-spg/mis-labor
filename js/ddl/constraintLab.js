/**
 * Constraint lab: tries to break the lab database with one statement at a time.
 * Every attempt runs on a fresh copy; the engine's error message shows which constraint protects the data.
 */
class ConstraintLab {
  static ATTEMPTS = [
    { id: 'pk', label: 'Patient mit vorhandener PatNr', constraint: 'PRIMARY KEY', sql: "insert into p_patienten (p_patnr, p_nachname, p_vorname) values (100, 'Neu', 'Nora');", table: 'p_patienten',
      why: 'Die Nummer 100 gehört schon Lisa Berger. Ein <b>PRIMARY KEY</b> ist eindeutig – und darf nie NULL sein.' },
    { id: 'nn', label: 'Station ohne Namen', constraint: 'NOT NULL', sql: 'insert into st_stationen (st_statnr, st_betten) values (4, 10);', table: 'st_stationen',
      why: '<code>st_name</code> ist <b>NOT NULL</b>: Beim Einfügen muss ein Wert angegeben werden.' },
    { id: 'uq', label: 'Zweite Station „Chirurgie“', constraint: 'UNIQUE', sql: "insert into st_stationen (st_statnr, st_name) values (4, 'Chirurgie');", table: 'st_stationen',
      why: 'Der Name ist nicht der Primärschlüssel, soll aber trotzdem nur einmal vorkommen: <b>UNIQUE</b>.' },
    { id: 'chk', label: 'Station mit −3 Betten', constraint: 'CHECK', sql: "insert into st_stationen (st_statnr, st_name, st_betten) values (4, 'Neurologie', -3);", table: 'st_stationen',
      why: 'Die Bedingung <code>st_betten &gt; 0</code> ist falsch → <b>CHECK</b> verweigert die Zeile.' },
    { id: 'fk', label: 'Patient auf Station 9', constraint: 'FOREIGN KEY', sql: "insert into p_patienten (p_patnr, p_nachname, p_vorname, p_st_statnr) values (110, 'Neu', 'Nora', 9);", table: 'p_patienten',
      why: 'Eine Station 9 gibt es nicht. Der <b>FOREIGN KEY</b> sichert die <b>referentielle Integrität</b>.' },
    { id: 'type', label: 'Datum als 12.04.2008', constraint: 'Datentyp', sql: "insert into p_patienten (p_patnr, p_nachname, p_vorname, p_geburtsdatum) values (110, 'Neu', 'Nora', '12.04.2008');", table: 'p_patienten',
      why: 'Der Datentyp <b>DATE</b> verlangt das Format <code>\'JJJJ-MM-TT\'</code>.' },
    { id: 'len', label: 'Nachname mit 31 Zeichen', constraint: 'Datentyp', sql: "insert into p_patienten (p_patnr, p_nachname, p_vorname) values (110, 'Abcdefghijklmnopqrstuvwxyzabcde', 'Nora');", table: 'p_patienten',
      why: '<code>varchar(30)</code> erlaubt höchstens 30 Zeichen.' },
    { id: 'def', label: 'Station ohne Bettenzahl', constraint: 'DEFAULT', sql: "insert into st_stationen (st_statnr, st_name) values (4, 'Neurologie');", table: 'st_stationen',
      why: 'Das geht! Fehlt die Angabe, setzt <b>DEFAULT</b> den Vorgabewert 20 ein.' },
  ];

  constructor(root) {
    this.root = root;
    this.base = DdlData.database();
    this.current = null;
    this.render();
  }

  render() {
    const att = this.current;
    let outcome = '';
    if (att) {
      const db = this.base.clone();
      const res = db.run(att.sql)[0];
      outcome = `
        <div class="lab-sql">${DdlView.sqlBlock(att.sql)}</div>
        <div class="feedback ${res.ok ? 'ok' : 'wrong'}">${res.ok ? '✅ ' : '🩺 '}${DdlView.esc(res.message)}</div>
        <p class="lab-why"><span class="tag">${att.constraint}</span> ${att.why}</p>
        ${res.ok ? `<div class="ddl-data">${DdlView.dataHtml(db, att.table)}</div>` : ''}`;
    }
    this.root.innerHTML = `
      <p><b>Probiere es aus:</b> Wähle einen Versuch. Er wird auf der Laborauswahl unten ausgeführt – die Daten bleiben unverändert.</p>
      <div class="chips" role="group" aria-label="Versuche">
        ${ConstraintLab.ATTEMPTS.map((a) => `<button class="chip" aria-pressed="${att?.id === a.id}" data-id="${a.id}">${a.label}</button>`).join('')}
      </div>
      <div class="lab-out">${outcome || '<p class="muted">Noch kein Versuch gewählt.</p>'}</div>
      <details class="lab-data"><summary>Aktuelle Daten ansehen</summary>
        <div class="data-pair">${DdlView.dataHtml(this.base, 'st_stationen')}${DdlView.dataHtml(this.base, 'p_patienten')}</div>
      </details>`;
    this.root.querySelectorAll('[data-id]').forEach((b) => b.addEventListener('click', () => {
      this.current = ConstraintLab.ATTEMPTS.find((a) => a.id === b.dataset.id);
      this.render();
      this.root.querySelector('.lab-out').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }));
  }
}

/**
 * FK action lab: choose ON DELETE / ON UPDATE, then delete or renumber station 2 and watch the patients.
 */
class FkActionLab {
  constructor(root) {
    this.root = root;
    this.onDelete = 'no action';
    this.onUpdate = 'no action';
    this.action = null;
    this.render();
  }

  render() {
    const db = DdlData.database(this.onDelete, this.onUpdate);
    const sql = { delete: 'delete from st_stationen where st_statnr = 2;', update: 'update st_stationen set st_statnr = 20 where st_statnr = 2;' }[this.action];
    const before = db.clone();
    let res = null;
    if (sql) res = db.run(sql)[0];
    const radios = (name, value) => ['no action', 'cascade', 'set null'].map((o) =>
      `<label class="toggle"><input type="radio" name="fk-${name}" value="${o}" ${value === o ? 'checked' : ''}> ${o.toUpperCase()}</label>`).join('');
    this.root.innerHTML = `
      <div class="fk-options">
        <fieldset><legend>ON DELETE</legend>${radios('del', this.onDelete)}</fieldset>
        <fieldset><legend>ON UPDATE</legend>${radios('upd', this.onUpdate)}</fieldset>
      </div>
      ${DdlView.sqlBlock(`foreign key (p_st_statnr) references st_stationen (st_statnr)\n  on delete ${this.onDelete} on update ${this.onUpdate}`)}
      <div class="controls">
        <button class="btn primary" data-do="delete">Station 2 (Chirurgie) löschen</button>
        <button class="btn primary" data-do="update">Stationsnummer 2 → 20 ändern</button>
        <button class="btn ghost-btn" data-do="reset">↺ Zurücksetzen</button>
      </div>
      ${res ? `${DdlView.sqlBlock(sql)}<div class="feedback ${res.ok ? 'ok' : 'wrong'}">${res.ok ? '✅ ' : '🩺 '}${DdlView.esc(res.message)}</div>` : ''}
      <div class="data-pair">
        ${DdlView.dataHtml(db, 'st_stationen', { title: res ? 'st_stationen (danach)' : 'st_stationen' })}
        ${DdlView.dataHtml(db, 'p_patienten', { rows: this.#patientRows(before, db), title: res ? 'p_patienten (danach, Änderungen markiert)' : 'p_patienten' })}
      </div>
      ${res?.ok && this.action === 'delete' ? this.#goneNote(before, db) : ''}`;
    this.root.querySelectorAll('input[name="fk-del"]').forEach((i) => i.addEventListener('change', () => { this.onDelete = i.value; this.render(); }));
    this.root.querySelectorAll('input[name="fk-upd"]').forEach((i) => i.addEventListener('change', () => { this.onUpdate = i.value; this.render(); }));
    this.root.querySelectorAll('[data-do]').forEach((b) => b.addEventListener('click', () => {
      this.action = b.dataset.do === 'reset' ? null : b.dataset.do;
      this.render();
    }));
  }

  /** Patients before the action; changed rows are highlighted, deleted rows struck through. */
  #patientRows(before, after) {
    return before.rows('p_patienten').map((b) => {
      const a = after.rows('p_patienten').find((r) => r.p_patnr === b.p_patnr);
      if (!a) return { ...b, __mark: 'gone' };
      return { ...a, __mark: JSON.stringify(a) !== JSON.stringify(b) ? 'hit' : undefined };
    });
  }

  #goneNote(before, after) {
    const lost = before.rows('p_patienten').filter((b) => !after.rows('p_patienten').some((r) => r.p_patnr === b.p_patnr));
    return lost.length
      ? `<p class="lab-why"><span class="tag">CASCADE</span> Mitgelöscht: ${lost.map((r) => `${r.p_vorname} ${r.p_nachname}`).join(', ')}.</p>`
      : '';
  }
}
