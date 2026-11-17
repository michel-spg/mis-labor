/**
 * Drag & drop for cards (.card) and drop zones ([data-zone]).
 * Works with the mouse (HTML5 drag & drop) and – for touch screens and the
 * keyboard – with "click/Enter on a card, then click on a zone".
 *
 * A zone that contains a `.zone-drop` element receives the cards there,
 * otherwise the zone element itself (e.g. the pool).
 */
class DragDrop {
  /**
   * @param {HTMLElement} body container with cards and zones
   * @param {{onMove?: (card: HTMLElement, zone: HTMLElement) => void}} [options]
   */
  static wire(body, { onMove } = {}) {
    let selected = null;

    const moveTo = (card, zoneEl) => {
      (zoneEl.querySelector('.zone-drop') ?? zoneEl).appendChild(card);
      card.classList.remove('right', 'wrong', 'selected');
      selected = null;
      onMove?.(card, zoneEl);
    };

    body.querySelectorAll('.card').forEach((card) => {
      card.setAttribute('draggable', 'true');
      card.setAttribute('tabindex', '0');
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', card.dataset.id);
        e.dataTransfer.effectAllowed = 'move';
        card.classList.add('dragging');
      });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
      const select = (e) => {
        e.stopPropagation();
        body.querySelectorAll('.card.selected').forEach((c) => c.classList.remove('selected'));
        selected = selected === card ? null : card;
        if (selected) card.classList.add('selected');
      };
      card.addEventListener('click', select);
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(e); }
      });
    });

    body.querySelectorAll('[data-zone]').forEach((zoneEl) => {
      zoneEl.addEventListener('dragover', (e) => { e.preventDefault(); zoneEl.classList.add('over'); });
      zoneEl.addEventListener('dragleave', (e) => {
        if (!zoneEl.contains(e.relatedTarget)) zoneEl.classList.remove('over');
      });
      zoneEl.addEventListener('drop', (e) => {
        e.preventDefault();
        zoneEl.classList.remove('over');
        const card = body.querySelector(`.card[data-id="${e.dataTransfer.getData('text/plain')}"]`);
        if (card) moveTo(card, zoneEl);
      });
      zoneEl.addEventListener('click', () => selected && moveTo(selected, zoneEl));
      if (!zoneEl.hasAttribute('tabindex')) zoneEl.setAttribute('tabindex', '0');
      zoneEl.addEventListener('keydown', (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && e.target === zoneEl && selected) { e.preventDefault(); moveTo(selected, zoneEl); }
      });
    });
  }
}
