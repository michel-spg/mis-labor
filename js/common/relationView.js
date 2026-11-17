/**
 * Renders a relation (table) described by a plain object. Used by the
 * normalisation animation, the anomaly demo and the FD detective.
 *
 * spec = {
 *   name: 'Patient',
 *   badge?: { text: '2NF ✓', warn?: true },
 *   columns: [{ name, pk?, fk?, mark?, det? }],
 *       mark: css suffix, e.g. 'nonatomic', 'repeat', 'new', 'dep-a', 'dep-b', 'dep-full', 'dep-trans', 'key'
 *       det:  determinant columns – used to detect redundant (repeated) facts
 *   rows: [{ id, values: {col: value}, mark?, cellMarks?: {col: cls}, flip?: {col: key} }],
 *       value: string/number, null, or an array of {text, flip} (repeating group)
 *       mark:  'dup' | 'gone' | 'added' | 'hit' | 'error' | 'dim'
 * }
 */
class RelationView {
  /**
   * Returns the HTML of the relation.
   * @param {object} spec
   * @param {{redundant?: Set<string>}} [extra] cells ("rowIndex:col") to mark as redundant
   */
  static html(spec, extra = {}) {
    const redundant = extra.redundant ?? RelationView.redundantCells(spec);
    const badge = spec.badge
      ? `<span class="rel-badge${spec.badge.warn ? ' warn' : ''}">${spec.badge.text}</span>` : '';
    const head = spec.columns.map((c) => {
      const cls = [c.pk ? 'is-pk' : '', c.fk ? 'is-fk' : '', c.mark ? `m-${c.mark}` : ''].join(' ').trim();
      return `<th class="${cls}" scope="col"><span class="v" data-flip="h:${c.name}">${c.name}</span></th>`;
    }).join('');
    const body = spec.rows.map((row, r) => {
      const tds = spec.columns.map((c) => {
        const cls = [
          c.pk ? 'is-pk' : '',
          c.mark ? `m-${c.mark}` : '',
          redundant.has(`${r}:${c.name}`) ? 'redundant' : '',
          row.cellMarks?.[c.name] ?? '',
        ].join(' ').trim();
        return `<td class="${cls}" data-col="${c.name}">${RelationView.cell(row, c.name)}</td>`;
      }).join('');
      return `<tr class="${row.mark ?? ''}" data-row="${row.id}">${tds}</tr>`;
    }).join('');
    return `
      <div class="rel" data-rel="${spec.name}">
        <div class="rel-title"><span class="v" data-flip="t:${spec.flipName ?? spec.name}">${spec.name}</span>${badge}</div>
        <div class="tbl-scroll">
          <table class="data">
            <thead><tr>${head}</tr></thead>
            <tbody>${body || `<tr><td colspan="${spec.columns.length}" class="null">(leer)</td></tr>`}</tbody>
          </table>
        </div>
      </div>`;
  }

  /** Renders the content of one cell including its flip key. */
  static cell(row, col) {
    const value = row.values[col];
    if (Array.isArray(value)) {
      return `<div class="group-list">${value
        .map((it) => `<span class="group-item v" data-flip="${it.flip ?? `g:${it.text}`}">${it.text}</span>`)
        .join('')}</div>`;
    }
    const text = RelationView.format(value);
    const key = row.flip?.[col] ?? `c:${col}=${value}`;
    return `<span class="v" data-flip="${key}">${text}</span>`;
  }

  /** Formats a value; NULL like in SQL Server Management Studio. */
  static format(value) {
    if (value === null || value === undefined) return '<span class="null">NULL</span>';
    return String(value);
  }

  /**
   * Finds cells that store a fact a second time: same determinant values
   * (column.det) as an earlier, not deleted row of the same table.
   * @returns {Set<string>} "rowIndex:column"
   */
  static redundantCells(spec) {
    const result = new Set();
    spec.columns.filter((c) => c.det && !c.pk).forEach((c) => {
      const seen = new Set();
      spec.rows.forEach((row, r) => {
        if (row.mark === 'dup' || row.mark === 'gone') return;
        const key = c.det.map((d) => row.values[d]).join('|');
        if (seen.has(key)) result.add(`${r}:${c.name}`);
        seen.add(key);
      });
    });
    return result;
  }
}
