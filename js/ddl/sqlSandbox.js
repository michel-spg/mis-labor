/**
 * Free playground: type SQL, run it in MiniSql and inspect log, structure and data.
 */
class SqlSandbox {
  static PRESETS = [
    { id: 'lab', label: 'Labor-Datenbank (fertig)', sql: () => `-- Komplette Labor-Datenbank: Strukturen und Daten\n${DdlData.all()}\n` },
    { id: 'start', label: 'Neue Tabelle (Vorlage)', sql: () => `-- Lege eine Tabelle für Ärzt*innen an\ncreate table a_aerzte (\n  a_id        integer primary key,\n  a_nachname  varchar(30) not null,\n  a_fachgebiet varchar(40) default 'Allgemeinmedizin'\n);\n\ninsert into a_aerzte (a_id, a_nachname) values (1, 'Wolf'), (2, 'Aksoy');\n\nselect * from a_aerzte;\n` },
    { id: 'alter', label: 'ALTER TABLE ausprobieren', sql: () => `${DdlData.stationen}\n\ninsert into st_stationen values (1, 'Innere Medizin', 24);\n\n-- Spalte hinzufügen, ändern, löschen:\nalter table st_stationen add st_telefon varchar(20);\nalter table st_stationen modify st_telefon varchar(30) not null default '-';\nalter table st_stationen drop column st_telefon;\n\n-- Tabelle umbenennen:\nrename table st_stationen to st_abteilungen;\n` },
    { id: 'empty', label: 'Leer', sql: () => '' },
  ];

  constructor(root) {
    this.root = root;
    this.db = new MiniSql();
    this.last = [];
    this.root.innerHTML = `
      <div class="sandbox-bar">
        <label>Vorlage <select data-act="preset">${SqlSandbox.PRESETS.map((p) => `<option value="${p.id}">${p.label}</option>`).join('')}</select></label>
        <label class="toggle"><input type="checkbox" data-act="fresh" checked> Datenbank vor jedem Lauf leeren</label>
      </div>
      <textarea class="sql-input" spellcheck="false" autocomplete="off" aria-label="SQL-Skript" rows="14"></textarea>
      <div class="controls" style="margin-top:8px">
        <button class="btn primary" data-act="run">▶ Ausführen <small>(Strg + Enter)</small></button>
        <button class="btn ghost-btn" data-act="clear">Datenbank leeren</button>
      </div>
      <div class="sandbox-out"></div>`;
    this.input = root.querySelector('textarea');
    this.input.value = SqlSandbox.PRESETS[0].sql();
    root.querySelector('[data-act="preset"]').addEventListener('change', (e) => {
      this.input.value = SqlSandbox.PRESETS.find((p) => p.id === e.target.value).sql();
    });
    root.querySelector('[data-act="run"]').addEventListener('click', () => this.run());
    root.querySelector('[data-act="clear"]').addEventListener('click', () => { this.db = new MiniSql(); this.last = []; this.show(); });
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); this.run(); }
      if (e.key === 'Tab') {
        e.preventDefault();
        const { selectionStart: s, selectionEnd: t, value } = this.input;
        this.input.value = `${value.slice(0, s)}  ${value.slice(t)}`;
        this.input.selectionStart = this.input.selectionEnd = s + 2;
      }
    });
    this.show();
  }

  run() {
    if (this.root.querySelector('[data-act="fresh"]').checked) this.db = new MiniSql();
    this.last = this.db.run(this.input.value);
    this.show();
  }

  show() {
    const selects = this.last.filter((r) => r.ok && r.rows);
    const tables = this.db.describe();
    this.root.querySelector('.sandbox-out').innerHTML = `
      <h4 class="mini-h">Protokoll</h4>${DdlView.logHtml(this.last)}
      ${selects.map((r) => `<div class="ddl-data">${DdlView.resultHtml(r)}</div>`).join('')}
      <h4 class="mini-h">Struktur der Datenbank</h4>${DdlView.schemaHtml(this.db)}
      ${tables.length ? `<details class="lab-data"><summary>Daten aller Tabellen (${tables.length})</summary>
        <div class="data-pair">${tables.map((t) => DdlView.dataHtml(this.db, t.name)).join('')}</div></details>` : ''}`;
  }
}
