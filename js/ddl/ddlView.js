/**
 * Rendering helpers of the DDL chapter: SQL syntax highlighting, schema cards,
 * data tables (via RelationView) and the execution log.
 */
const DdlView = {
  esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },

  KEYWORDS: new Set(('create alter drop rename table database schema use index unique primary key foreign references constraint check default not null '
    + 'on delete update cascade set no action restrict insert into values select from where order by asc desc add modify column to and or like in between is '
    + 'auto_increment unsigned zerofill if exists first after engine grant revoke').split(' ')),
  TYPES: new Set('integer int tinyint smallint bigint decimal numeric float double real char varchar text date time timestamp datetime boolean'.split(' ')),

  /** Highlights one line of SQL (HTML-escaped result). */
  highlightLine(line) {
    const re = /(--.*|#.*)|('(?:[^'\\]|\\.|'')*')|(\b\d+(?:\.\d+)?\b)|([A-Za-z_][A-Za-z0-9_]*)|([\s\S])/g;
    let out = '';
    let m;
    while ((m = re.exec(line))) {
      const [all, comment, str, num, word] = m;
      if (comment) out += `<span class="tk-c">${DdlView.esc(comment)}</span>`;
      else if (str) out += `<span class="tk-s">${DdlView.esc(str)}</span>`;
      else if (num) out += `<span class="tk-n">${num}</span>`;
      else if (word && DdlView.KEYWORDS.has(word.toLowerCase())) out += `<span class="tk-k">${word}</span>`;
      else if (word && DdlView.TYPES.has(word.toLowerCase())) out += `<span class="tk-t">${word}</span>`;
      else out += DdlView.esc(all);
    }
    return out;
  },

  /** Highlighted <pre>. Lines starting with '+ ' (when marks=true) are shown as new. */
  sqlBlock(sql, { marks = false } = {}) {
    const lines = sql.split('\n').map((line) => {
      const isNew = marks && line.startsWith('+');
      const text = marks && (line.startsWith('+') || line.startsWith(' ')) ? line.slice(1) : line;
      return `<span class="ln${isNew ? ' new' : ''}">${DdlView.highlightLine(text) || ' '}</span>`;
    });
    return `<pre class="sql ddl-sql">${lines.join('')}</pre>`;
  },

  /** Table structure cards of the whole database. */
  schemaHtml(db) {
    const tables = db.describe();
    if (!tables.length) return '<p class="muted">Noch keine Tabellen – die Datenbank ist leer.</p>';
    return `<div class="schema-grid">${tables.map((t) => `
      <div class="ddl-table">
        <b class="ddl-table-name">${t.name}<small>${t.rowCount} Zeile(n)</small></b>
        <ul>
          ${t.columns.map((c) => `<li>
            <span class="col-name${c.pk ? ' is-pk' : ''}">${c.name}</span>
            <span class="col-type">${c.type}</span>
            ${c.pk ? '<span class="tag tag-pk">PK</span>' : ''}${c.fk ? '<span class="tag tag-fk">FK</span>' : ''}
            ${c.notNull && !c.pk ? '<span class="tag">NOT NULL</span>' : ''}${c.unique ? '<span class="tag">UNIQUE</span>' : ''}
            ${c.default !== undefined ? `<span class="tag">DEFAULT ${c.default === null ? 'NULL' : DdlView.esc(c.default)}</span>` : ''}
            ${c.autoInc ? '<span class="tag">AUTO_INCREMENT</span>' : ''}
          </li>`).join('')}
        </ul>
        ${t.pk.length > 1 ? `<p class="ddl-note"><span class="tag tag-pk">PK</span> zusammengesetzt: (${t.pk.join(', ')})</p>` : ''}
        ${t.fks.map((f) => `<p class="ddl-note"><span class="tag tag-fk">FK</span> ${f.cols.join(', ')} → ${f.refTable} (${f.refCols.join(', ')})<br>
          <small>ON DELETE ${f.onDelete} · ON UPDATE ${f.onUpdate}</small></p>`).join('')}
        ${t.uniques.filter((u) => u.cols.length > 1).map((u) => `<p class="ddl-note"><span class="tag">UNIQUE</span> (${u.cols.join(', ')})</p>`).join('')}
        ${t.checks.map((k) => `<p class="ddl-note"><span class="tag">CHECK</span> ${DdlView.esc(k.text)}</p>`).join('')}
      </div>`).join('')}</div>`;
  },

  /** Data of one table as RelationView. */
  dataHtml(db, tableName, { rows, title } = {}) {
    const t = db.table(tableName);
    if (!t) return '';
    const fkCols = new Set(t.fks.flatMap((f) => f.cols));
    return RelationView.html({
      name: title ?? t.name,
      columns: t.columns.map((c) => ({ name: c.name, pk: (t.pk ?? []).includes(c.name), fk: fkCols.has(c.name) })),
      rows: (rows ?? t.rows).map((r, i) => ({ id: i, values: { ...r }, mark: r.__mark })),
    }, { redundant: new Set() });
  },

  /** Result table of a SELECT. */
  resultHtml(res) {
    return RelationView.html({
      name: `Ergebnis (${res.table})`,
      columns: res.columns.map((name) => ({ name })),
      rows: res.rows.map((r, i) => ({ id: i, values: Object.fromEntries(res.columns.map((c, j) => [c, r[j]])) })),
    }, { redundant: new Set() });
  },

  /** Execution log with ✔ / ✘ per statement. */
  logHtml(results) {
    if (!results.length) return '<p class="muted">Noch nichts ausgeführt.</p>';
    return `<ol class="sql-log">${results.map((r) => `
      <li class="${r.skipped ? 'skipped' : r.ok ? 'ok' : 'err'}">
        <span class="sql-stmt">${DdlView.highlightLine(r.sql.length > 110 ? `${r.sql.slice(0, 107)}…` : r.sql)}</span>
        <span class="sql-msg">${r.skipped ? '⏭ ' : r.ok ? '✔ ' : '✘ '}${DdlView.esc(r.message)}</span>
      </li>`).join('')}</ol>`;
  },
};
