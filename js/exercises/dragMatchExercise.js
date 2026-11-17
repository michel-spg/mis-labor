/**
 * Drag & drop: every card belongs into exactly one zone.
 *
 * config.items: [{id, label, sub?, key}]   key = id of the correct zone
 * config.zones: [{key, label, sub?}]
 * config.successMessage?: string
 */
class DragMatchExercise extends Exercise {
  renderBody(body) {
    const { items, zones } = this.config;
    body.innerHTML = `
      <div class="dd-pool" data-zone="pool" data-label="Karten">
        ${Exercise.shuffle(items).map((it) => `
          <div class="card" data-id="${it.id}"><b>${it.label}</b>${it.sub ? `<small>${it.sub}</small>` : ''}</div>`).join('')}
      </div>
      <div class="dd-zones">
        ${zones.map((z) => `
          <div class="zone" data-zone="${z.key}">
            <div class="zone-head"><b>${z.label}</b>${z.sub ? `<small>${z.sub}</small>` : ''}</div>
            <div class="zone-drop"></div>
          </div>`).join('')}
      </div>`;
    DragDrop.wire(body);
  }

  evaluate() {
    const placement = this.#placement();
    const items = this.config.items;
    const unplaced = items.filter((it) => !placement.has(String(it.id)));
    const wrong = items.filter((it) => placement.has(String(it.id)) && placement.get(String(it.id)) !== String(it.key));
    this.body.querySelectorAll('.card').forEach((card) => {
      const item = items.find((it) => String(it.id) === card.dataset.id);
      const zone = placement.get(card.dataset.id);
      card.classList.toggle('right', zone === String(item.key));
      card.classList.toggle('wrong', zone !== undefined && zone !== String(item.key));
    });
    if (unplaced.length === items.length) return { ok: false, message: 'Du hast noch keine Karte zugeordnet.' };
    if (wrong.length) return { ok: false, message: `${wrong.length} Karte(n) liegen falsch (rot markiert).` };
    if (unplaced.length) return { ok: false, message: `Bisher alles richtig – es fehlen noch ${unplaced.length} Karte(n).` };
    return { ok: true, message: this.config.successMessage ?? 'Perfekt, alles richtig zugeordnet!' };
  }

  applySolution() {
    this.config.items.forEach((it) => {
      const card = this.body.querySelector(`.card[data-id="${it.id}"]`);
      this.body.querySelector(`.zone[data-zone="${it.key}"] .zone-drop`).appendChild(card);
    });
    this.evaluate();
  }

  /** @returns {Map<string, string>} card id -> zone key of all placed cards */
  #placement() {
    const map = new Map();
    this.body.querySelectorAll('.zone').forEach((zone) => {
      zone.querySelectorAll('.card').forEach((card) => map.set(card.dataset.id, zone.dataset.zone));
    });
    return map;
  }
}
