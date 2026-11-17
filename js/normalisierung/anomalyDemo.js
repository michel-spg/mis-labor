/**
 * Shows the three anomalies (update, insert, delete) live on the 1NF table
 * "Laborbefund": students trigger the action and see what goes wrong.
 */
class AnomalyDemo {
  static COLUMNS = [
    { name: 'PatNr', pk: true }, { name: 'Nachname' }, { name: 'Vorname' }, { name: 'StatNr' }, { name: 'Station' },
    { name: 'Parameter', pk: true }, { name: 'Einheit' }, { name: 'Wert' },
  ];

  constructor(root, data) {
    this.root = root;
    this.base = data.flatRows().map((r) => ({ id: `${r.PatNr}-${r.Parameter}`, values: r }));
    this.tabs = {
      update: {
        label: 'Änderungsanomalie',
        text: 'Die Station 3 wird umbenannt in <b>„Kardiologie &amp; Angiologie“</b>.',
        actions: [['partial', 'Nur in der ersten Zeile ändern'], ['all', 'In allen Zeilen ändern']],
      },
      insert: {
        label: 'Einfügeanomalie',
        text: 'Das Labor bietet ab sofort <b>Laktat</b> (Einheit mmol/l) an. Gemessen wurde es noch bei niemandem.',
        actions: [['insert', 'Laktat einfügen']],
      },
      delete: {
        label: 'Löschanomalie',
        text: '<b>Emre Yilmaz</b> (PatNr 102) wird entlassen. Seine Laborwerte werden gelöscht.',
        actions: [['delete', 'Zeilen von 102 löschen']],
      },
    };
    this.current = 'update';
    this.render();
  }

  render(state = 'start') {
    const tab = this.tabs[this.current];
    const { rows, verdict } = this.#apply(state);
    this.root.innerHTML = `
      <div class="tabs" role="tablist">
        ${Object.entries(this.tabs).map(([k, t]) =>
          `<button class="chip" role="tab" aria-selected="${k === this.current}" aria-pressed="${k === this.current}" data-tab="${k}">${t.label}</button>`).join('')}
      </div>
      <p class="anomaly-text">${tab.text}</p>
      <div class="controls">
        ${tab.actions.map(([k, label]) => `<button class="btn primary" data-do="${k}">${label}</button>`).join('')}
        <button class="btn ghost-btn" data-do="start">↺ Zurücksetzen</button>
      </div>
      <div style="margin-top:12px">${RelationView.html({ name: 'Laborbefund (1. NF)', columns: AnomalyDemo.COLUMNS, rows }, { redundant: new Set() })}</div>
      ${verdict ?? ''}`;
    this.root.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => {
      this.current = b.dataset.tab;
      this.render();
    }));
    this.root.querySelectorAll('[data-do]').forEach((b) => b.addEventListener('click', () => this.#run(b.dataset.do)));
  }

  #run(state) {
    if (state === 'delete') {
      this.render('deleting');
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.current === 'delete' && this.render('deleted'), Flip.reduced ? 0 : 1400);
      return;
    }
    this.render(state);
  }

  /** Returns the rows and the explanation for the given state of the current tab. */
  #apply(state) {
    const rows = this.base.map((r) => ({ ...r, values: { ...r.values } }));
    const verdict = (bad, title, text, fix) => `
      <div class="anomaly-verdict ${bad ? 'bad' : 'good'}"><b>${title}</b><p>${text}</p></div>
      <div class="anomaly-verdict good"><b>In der 3. NF:</b><p>${fix}</p></div>`;
    const NEW = 'Kardiologie & Angiologie';

    if (this.current === 'update' && state !== 'start') {
      const affected = rows.filter((r) => r.values.StatNr === 3);
      affected.forEach((r, i) => {
        if (state === 'all' || i === 0) { r.values.Station = NEW; r.mark = 'added'; } else r.mark = 'hit';
        r.cellMarks = { Station: state === 'all' ? '' : 'conflict' };
      });
      return {
        rows,
        verdict: state === 'partial'
          ? verdict(true, '❌ Widerspruch!', `Station 3 hat jetzt <b>zwei verschiedene Namen</b>. Welcher stimmt? Die Daten sind
              <b>inkonsistent</b>, weil dieselbe Information in ${affected.length} Zeilen steht und nur eine geändert wurde.`,
            'Der Name steht nur in <b>einer</b> Zeile der Tabelle <b>Station</b>. Eine Änderung – fertig, kein Widerspruch möglich.')
          : verdict(true, '⚠️ Geht – aber aufwendig und fehleranfällig', `Um <b>eine</b> Information zu ändern, mussten
              <b>${affected.length} Zeilen</b> geändert werden. In einer echten Klinik mit tausenden Befunden vergisst man leicht eine.`,
            'Der Name steht nur in <b>einer</b> Zeile der Tabelle <b>Station</b>. Eine Änderung – fertig.'),
      };
    }
    if (this.current === 'insert' && state === 'insert') {
      rows.push({
        id: 'new', mark: 'error',
        values: { PatNr: null, Nachname: null, Vorname: null, StatNr: null, Station: null, Parameter: 'Laktat', Einheit: 'mmol/l', Wert: null },
        cellMarks: { PatNr: 'conflict' },
      });
      return {
        rows,
        verdict: verdict(true, '❌ Einfügen abgelehnt!', `<b>PatNr</b> ist Teil des Primärschlüssels und darf nicht <code>NULL</code> sein.
            Einen neuen Laborparameter kann man in dieser Tabelle erst speichern, wenn er bei jemandem gemessen wurde.`,
          'In der Tabelle <b>Laborparameter</b> legt man einfach die Zeile <code>(Laktat, mmol/l)</code> an – ganz ohne Patient*in.'),
      };
    }
    if (this.current === 'delete' && (state === 'deleting' || state === 'deleted')) {
      const gone = rows.filter((r) => r.values.PatNr === 102);
      if (state === 'deleting') {
        gone.forEach((r) => { r.mark = 'gone'; });
        return { rows };
      }
      return {
        rows: rows.filter((r) => r.values.PatNr !== 102),
        verdict: verdict(true, '❌ Mehr gelöscht als gewollt!', `Mit den Zeilen von Herrn Yilmaz ist auch verschwunden, dass
            <b>Station 5 „Innere Medizin“</b> heißt und dass <b>Kalium in mmol/l</b> gemessen wird – diese Informationen standen nirgends sonst.`,
          'Gelöscht werden nur die Zeilen in <b>Messwert</b> (und ggf. in <b>Patient</b>). <b>Station</b> und <b>Laborparameter</b> bleiben unberührt.'),
      };
    }
    return { rows };
  }
}
