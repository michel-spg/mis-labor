/**
 * Decomposition: drag the attributes of a relation into the target tables.
 * Key attributes that are needed in several tables (PK + FK) exist as
 * several cards with the same label.
 *
 * config.tables: [{name, attrs: [label], pk: [label], fk?: [label]}]   the solution
 * config.extra?: [label]  additional cards (distractors, belong nowhere)
 */
class SchemaBuilderExercise extends Exercise {
  renderBody(body) {
    const { tables, extra = [] } = this.config;
    const labels = [...tables.flatMap((t) => t.attrs), ...extra];
    this.cards = labels.map((label, i) => ({ id: `a${i}`, label }));
    body.innerHTML = `
      <div class="dd-pool" data-zone="pool" data-label="Attribute">
        ${Exercise.shuffle(this.cards).map((c) => `<div class="card attr" data-id="${c.id}">${c.label}</div>`).join('')}
      </div>
      <div class="dd-zones">
        ${tables.map((t, i) => `
          <div class="zone" data-zone="t${i}">
            <div class="zone-head"><b>${t.name}</b></div>
            <div class="zone-drop attrs"></div>
          </div>`).join('')}
      </div>`;
    DragDrop.wire(body);
  }

  evaluate() {
    const { tables } = this.config;
    let wrong = 0;
    let missing = 0;
    tables.forEach((t, i) => {
      const remaining = [...t.attrs];
      this.body.querySelectorAll(`.zone[data-zone="t${i}"] .card`).forEach((card) => {
        const idx = remaining.indexOf(card.textContent);
        const ok = idx >= 0;
        if (ok) remaining.splice(idx, 1); else wrong++;
        card.classList.toggle('right', ok);
        card.classList.toggle('wrong', !ok);
      });
      missing += remaining.length;
    });
    const leftInPool = this.body.querySelectorAll('.dd-pool .card').length;
    const needed = tables.reduce((n, t) => n + t.attrs.length, 0);
    if (!this.body.querySelector('.zone .card')) return { ok: false, message: 'Du hast noch kein Attribut in eine Tabelle gezogen.' };
    if (wrong) return { ok: false, message: `${wrong} Attribut(e) stehen in der falschen Tabelle (rot). Frage dich: Wovon hängt dieses Attribut ab?` };
    if (missing) {
      return {
        ok: false,
        message: leftInPool && missing <= leftInPool
          ? `Bisher alles richtig – es fehlen noch ${missing} Attribut(e).`
          : `Es fehlen noch ${missing} Attribut(e). Tipp: Fremdschlüssel stehen in zwei Tabellen.`,
      };
    }
    if (leftInPool && needed) return { ok: true, message: 'Richtig! Die übrigen Karten gehören in keine Tabelle.' };
    return { ok: true, message: this.config.successMessage ?? 'Perfekt zerlegt – alle Tabellen sind in 3. Normalform!' };
  }

  applySolution() {
    const pool = this.body.querySelector('.dd-pool');
    this.body.querySelectorAll('.zone .card').forEach((c) => pool.appendChild(c));
    this.config.tables.forEach((t, i) => {
      const drop = this.body.querySelector(`.zone[data-zone="t${i}"] .zone-drop`);
      t.attrs.forEach((label) => {
        const card = [...pool.querySelectorAll('.card')].find((c) => c.textContent === label);
        if (card) drop.appendChild(card);
      });
    });
    this.evaluate();
  }

  solutionHtml() {
    const schema = this.config.tables.map((t) => {
      const attrs = t.attrs.map((a) => {
        let html = t.pk.includes(a) ? `<u>${a}</u>` : a;
        if (t.fk?.includes(a)) html = `<span class="fkref">${html} (FK)</span>`;
        return html;
      }).join(', ');
      return `<span class="schema">${t.name} (${attrs})</span>`;
    }).join('<br>');
    return `<p><b>Lösung</b> (Primärschlüssel unterstrichen, Fremdschlüssel orange):</p><p>${schema}</p>` + super.solutionHtml();
  }
}
