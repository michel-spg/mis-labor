/**
 * Step-by-step normalisation: shows the scenes from normScenes.js, moves the
 * values between the tables with FLIP animations and counts redundant cells.
 */
class NormAnimation extends SceneStepper {
  static LEGEND = {
    nonatomic: ['nicht atomar', '#ffe4e6'],
    repeat: ['Wiederholungsgruppe', '#fecaca'],
    new: ['neue Spalte', '#a5f3fc'],
    key: ['Teil des Primärschlüssels', '#f1f5f9'],
    'dep-a': ['hängt nur von PatNr ab', '#bfdbfe'],
    'dep-b': ['hängt nur von Parameter ab', '#fde68a'],
    'dep-full': ['hängt vom ganzen Schlüssel ab', '#bbf7d0'],
    'dep-trans': ['Nicht-Schlüssel → Nicht-Schlüssel', '#e9d5ff'],
    redundant: ['doppelt gespeichert', '#fef9c3'],
  };

  constructor(root, scenes, stages) {
    super(root, scenes);
    this.stages = stages;
    root.innerHTML = `
      <div class="stage-bar" role="list">
        ${stages.map((s) => `<button class="stage" data-stage="${s.id}" role="listitem"><b>${s.label}</b><small>${s.sub}</small></button>`).join('')}
      </div>
      <div class="step-toolbar">
        <div class="controls">
          <button class="btn" data-act="first" title="Zum Anfang">⏮</button>
          <button class="btn" data-act="prev">◀ Zurück</button>
          <button class="btn primary" data-act="next">Weiter ▶</button>
          <button class="btn ghost-btn" data-act="play">▶ Automatisch</button>
        </div>
        <div class="step-dots" aria-label="Schritte"></div>
      </div>
      <div class="scene-head"><h4 class="scene-title"></h4><span class="scene-count"></span></div>
      <div class="narration" aria-live="polite"></div>
      <div class="fd-list"></div>
      <div class="scene-tables"></div>
      <div class="scene-extra"></div>
      <div class="scene-foot">
        <div class="legend"></div>
        <div class="controls">
          <span class="redundancy-meter"></span>
          <label class="toggle"><input type="checkbox" checked data-role="redundancy"> markieren</label>
        </div>
      </div>`;
    root.tabIndex = -1;
    this.tables = root.querySelector('.scene-tables');
    root.querySelectorAll('.stage').forEach((btn) => btn.addEventListener('click', () => {
      this.stop();
      this.go(this.scenes.findIndex((s) => s.stage === btn.dataset.stage));
    }));
    root.querySelector('[data-role="redundancy"]').addEventListener('change', (e) => {
      root.classList.toggle('show-redundancy-off', !e.target.checked);
    });
    this.init();
  }

  showScene(scene, index, previous) {
    const q = (sel) => this.root.querySelector(sel);
    const before = previous === null ? null : Flip.snapshot(this.tables);

    q('.scene-title').textContent = scene.title;
    q('.scene-count').textContent = `Schritt ${index + 1} / ${this.scenes.length}`;
    q('.narration').innerHTML = scene.narration;
    q('.fd-list').innerHTML = (scene.fds ?? [])
      .map((fd) => `<span class="fd k-${fd.kind}">${fd.text}</span>`).join('');
    q('.fd-list').hidden = !scene.fds;

    let redundantTotal = 0;
    this.tables.innerHTML = scene.tables.map((t) => {
      const redundant = RelationView.redundantCells(t);
      redundantTotal += redundant.size;
      return RelationView.html(t, { redundant });
    }).join('');
    q('.scene-extra').innerHTML = scene.extra ?? '';

    q('.legend').innerHTML = (scene.legend ?? [])
      .map((k) => `<span style="--c:${NormAnimation.LEGEND[k][1]}">${NormAnimation.LEGEND[k][0]}</span>`).join('');
    q('.redundancy-meter').innerHTML = scene.meter === false
      ? 'Doppelt gespeicherte Werte: <b>?</b>'
      : `Doppelt gespeicherte Werte: <b class="${redundantTotal ? '' : 'zero'}">${redundantTotal}</b>`;

    const stageIdx = this.stages.findIndex((s) => s.id === scene.stage);
    this.root.querySelectorAll('.stage').forEach((el, i) => {
      el.classList.toggle('current', i === stageIdx);
      el.classList.toggle('done', i < stageIdx);
    });

    Flip.play(this.tables, before);
  }

  durationFor(scene) {
    return 4000 + scene.narration.length * 18;
  }
}
