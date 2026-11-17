/**
 * "FD-Detektiv": students pick the left side A (one or more columns) and the
 * right side B and check whether A → B holds in the example data. If not,
 * the rows that contradict the dependency are highlighted.
 */
class FdDetective {
  constructor(root, data) {
    this.root = root;
    this.rows = data.flatRows().map((r) => ({ id: `${r.PatNr}-${r.Parameter}`, values: r }));
    this.columns = ['PatNr', 'Nachname', 'Vorname', 'StatNr', 'Station', 'Parameter', 'Einheit', 'Wert'];
    this.left = new Set(['PatNr']);
    this.right = 'Nachname';
    this.presets = [
      { label: 'PatNr → Nachname', left: ['PatNr'], right: 'Nachname' },
      { label: 'PatNr → Wert', left: ['PatNr'], right: 'Wert' },
      { label: 'Parameter → Einheit', left: ['Parameter'], right: 'Einheit' },
      { label: 'PatNr, Parameter → Wert', left: ['PatNr', 'Parameter'], right: 'Wert' },
      { label: 'StatNr → Station', left: ['StatNr'], right: 'Station' },
      { label: 'Station → PatNr', left: ['Station'], right: 'PatNr' },
    ];
    this.render();
  }

  render() {
    const chips = (side) => this.columns.map((c) => {
      const on = side === 'left' ? this.left.has(c) : this.right === c;
      return `<button class="chip" aria-pressed="${on}" data-side="${side}" data-col="${c}">${c}</button>`;
    }).join('');
    const { ok, groups, text } = this.#check();
    const bad = new Set(groups.flat());
    const rows = this.rows.map((r) => ({ ...r, mark: ok === false ? (bad.has(r.id) ? 'hit' : 'dim') : '' }));
    const columns = this.columns.map((c) => ({
      name: c,
      mark: this.left.has(c) ? 'dep-a' : c === this.right ? 'dep-b' : undefined,
    }));
    this.root.innerHTML = `
      <div class="chips" aria-label="Beispiele"><span class="muted">Beispiele:</span>
        ${this.presets.map((p, i) => `<button class="chip" data-preset="${i}">${p.label}</button>`).join('')}
      </div>
      <div class="fd-builder">
        <div class="fd-side"><small>A – bestimmt (mehrere möglich)</small><div class="chips">${chips('left')}</div></div>
        <div class="fd-arrow" aria-hidden="true">→</div>
        <div class="fd-side"><small>B – wird bestimmt</small><div class="chips">${chips('right')}</div></div>
      </div>
      <div class="fd-result ${ok === null ? 'info' : ok ? 'ok' : 'bad'}" aria-live="polite">${text}</div>
      ${RelationView.html({ name: 'Laborbefund (1. NF)', columns, rows }, { redundant: new Set() })}`;
    this.root.querySelectorAll('[data-side]').forEach((b) => b.addEventListener('click', () => {
      const col = b.dataset.col;
      if (b.dataset.side === 'left') {
        if (this.left.has(col)) this.left.delete(col); else this.left.add(col);
        if (col === this.right) this.right = null;
      } else {
        this.right = this.right === col ? null : col;
        this.left.delete(col);
      }
      this.render();
    }));
    this.root.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => {
      const p = this.presets[Number(b.dataset.preset)];
      this.left = new Set(p.left);
      this.right = p.right;
      this.render();
    }));
  }

  /** Groups rows by A; A → B is violated if one group contains different B values. */
  #check() {
    const A = this.columns.filter((c) => this.left.has(c));
    const B = this.right;
    if (!A.length || !B) return { ok: null, groups: [], text: 'Wähle links mindestens eine Spalte (A) und rechts eine Spalte (B).' };
    const fd = `<code>${A.join(', ')} → ${B}</code>`;
    const byA = new Map();
    this.rows.forEach((r) => {
      const key = A.map((c) => r.values[c]).join(' | ');
      if (!byA.has(key)) byA.set(key, []);
      byA.get(key).push(r);
    });
    const groups = [...byA.entries()].filter(([, rs]) => new Set(rs.map((r) => r.values[B])).size > 1);
    if (!groups.length) {
      return {
        ok: true, groups: [],
        text: `✔ ${fd} <b>gilt</b> in diesen Daten: Zu jedem Wert von ${A.join(' + ')} gibt es genau <b>einen</b> Wert von ${B}.
          <span class="muted">(Ob das immer gilt, entscheidet die Bedeutung der Daten – nicht nur die Beispielzeilen.)</span>`,
      };
    }
    const [key, rs] = groups[0];
    const values = [...new Set(rs.map((r) => r.values[B]))].map((v) => `„${v}“`).join(', ');
    return {
      ok: false, groups: groups.map(([, g]) => g.map((r) => r.id)),
      text: `✘ ${fd} <b>gilt nicht</b>: Zu ${A.join(' + ')} = <b>${key}</b> gehören mehrere Werte von ${B} (${values}).
        Die widersprechenden Zeilen sind markiert.`,
    };
  }
}
