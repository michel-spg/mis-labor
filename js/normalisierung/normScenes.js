/**
 * The scenes of the normalisation animation: from the un-normalised table
 * "Laborbefund" step by step to 3NF. Each scene is a complete description of
 * what is visible (tables, marks, functional dependencies, text), so the
 * animation can jump forwards and backwards freely.
 */
const NormStages = [
  { id: 'UNF', label: 'Ausgangstabelle', sub: 'nicht normalisiert' },
  { id: '1NF', label: '1. NF', sub: 'nur atomare Werte' },
  { id: '2NF', label: '2. NF', sub: 'abhängig vom ganzen Schlüssel' },
  { id: '3NF', label: '3. NF', sub: 'keine transitiven Abhängigkeiten' },
];

const NormScenes = (() => {
  const D = LabData;
  const flat = D.flatRows();
  const station = (nr) => D.stations.find((s) => s.StatNr === nr).Station;

  /** Marks every row whose values in `keyCols` already occurred as 'dup'. */
  const markDuplicates = (rows, keyCols) => {
    const seen = new Set();
    return rows.map((r) => {
      const k = keyCols.map((c) => r.values[c]).join('|');
      const dup = seen.has(k);
      seen.add(k);
      return dup ? { ...r, mark: 'dup' } : r;
    });
  };
  const unique = (rows) => rows.filter((r) => r.mark !== 'dup');
  const pick = (obj, cols) => Object.fromEntries(cols.map((c) => [c, obj[c]]));

  /* ---------- rows of the single steps ---------- */
  const labItems = (patNr) => flat.filter((r) => r.PatNr === patNr)
    .map((r) => ({ text: `${r.Parameter} ${r.Wert} ${r.Einheit}`, flip: `c:Parameter=${r.Parameter}` }));

  const unfRows = D.patients.map((p) => ({
    id: p.PatNr,
    values: { PatNr: p.PatNr, Name: `${p.Vorname} ${p.Nachname}`, Station: `${p.StatNr} ${station(p.StatNr)}`, Laborwerte: labItems(p.PatNr) },
    flip: { Name: `c:Nachname=${p.Nachname}`, Station: `c:StatNr=${p.StatNr}` },
  }));

  const atomicRows = D.patients.map((p) => ({
    id: p.PatNr,
    values: { PatNr: p.PatNr, Nachname: p.Nachname, Vorname: p.Vorname, StatNr: p.StatNr, Station: station(p.StatNr), Laborwerte: labItems(p.PatNr) },
  }));

  const flatRows = flat.map((r) => ({ id: `${r.PatNr}-${r.Parameter}`, values: r }));
  const patCount = (nr) => flat.filter((r) => r.PatNr === nr).length;
  const flatRowsConflict = flatRows.map((r) => (patCount(r.values.PatNr) > 1 ? { ...r, cellMarks: { PatNr: 'conflict' } } : r));

  const patCols = ['PatNr', 'Nachname', 'Vorname', 'StatNr', 'Station'];
  const patRowsDup = markDuplicates(flatRows.map((r) => ({ id: r.id, values: pick(r.values, patCols) })), ['PatNr']);
  const parRowsDup = markDuplicates(flatRows.map((r) => ({ id: r.id, values: pick(r.values, ['Parameter', 'Einheit']) })), ['Parameter']);
  const mwRows = flatRows.map((r) => ({ id: r.id, values: pick(r.values, ['PatNr', 'Parameter', 'Wert']) }));
  const patRows = unique(patRowsDup);
  const parRows = unique(parRowsDup);
  const pat3Rows = patRows.map((r) => ({ id: r.id, values: pick(r.values, ['PatNr', 'Nachname', 'Vorname', 'StatNr']) }));
  const statRowsDup = markDuplicates(patRows.map((r) => ({ id: r.id, values: pick(r.values, ['StatNr', 'Station']) })), ['StatNr']);
  const statRows = unique(statRowsDup);

  /* ---------- column sets ---------- */
  const flatCols = (pk, marks = {}) => [
    { name: 'PatNr', pk: pk.includes('PatNr'), mark: marks.PatNr },
    { name: 'Nachname', det: ['PatNr'], mark: marks.Nachname },
    { name: 'Vorname', det: ['PatNr'], mark: marks.Vorname },
    { name: 'StatNr', det: ['PatNr'], mark: marks.StatNr },
    { name: 'Station', det: ['StatNr'], mark: marks.Station },
    { name: 'Parameter', pk: pk.includes('Parameter'), mark: marks.Parameter },
    { name: 'Einheit', det: ['Parameter'], mark: marks.Einheit },
    { name: 'Wert', det: ['PatNr', 'Parameter'], mark: marks.Wert },
  ];
  const depMarks = { PatNr: 'key', Parameter: 'key', Nachname: 'dep-a', Vorname: 'dep-a', StatNr: 'dep-a', Station: 'dep-a', Einheit: 'dep-b', Wert: 'dep-full' };

  const patientCols = (marks = {}) => [
    { name: 'PatNr', pk: true },
    { name: 'Nachname', det: ['PatNr'], mark: marks.Nachname },
    { name: 'Vorname', det: ['PatNr'], mark: marks.Vorname },
    { name: 'StatNr', det: ['PatNr'], mark: marks.StatNr },
    { name: 'Station', det: ['StatNr'], mark: marks.Station },
  ];
  const parameterCols = (mark) => [{ name: 'Parameter', pk: true }, { name: 'Einheit', det: ['Parameter'], mark }];
  const messwertCols = (mark) => [
    { name: 'PatNr', pk: true, fk: true }, { name: 'Parameter', pk: true, fk: true },
    { name: 'Wert', det: ['PatNr', 'Parameter'], mark },
  ];
  const patient3Cols = [
    { name: 'PatNr', pk: true }, { name: 'Nachname', det: ['PatNr'] }, { name: 'Vorname', det: ['PatNr'] },
    { name: 'StatNr', fk: true, det: ['PatNr'] },
  ];
  const stationCols = [{ name: 'StatNr', pk: true }, { name: 'Station', det: ['StatNr'] }];

  const ok = (nf) => ({ text: `${nf} ✓` });
  const fail = (text) => ({ text, warn: true });

  const fdsTwoNF = [
    { text: 'PatNr → Nachname, Vorname, StatNr, Station', kind: 'dep-a' },
    { text: 'Parameter → Einheit', kind: 'dep-b' },
    { text: 'PatNr, Parameter → Wert', kind: 'dep-full' },
  ];

  const erd = `
    <div class="erd" aria-label="Datenbankschema in 3. Normalform">
      <div class="erd-box"><b>Station</b><div class="pkline">StatNr</div><div>Station</div></div>
      <div class="erd-link">1 : n</div>
      <div class="erd-box"><b>Patient</b><div class="pkline">PatNr</div><div>Nachname</div><div>Vorname</div><div class="fkline">StatNr (FK)</div></div>
      <div class="erd-link">1 : n</div>
      <div class="erd-box"><b>Messwert</b><div class="pkline fkline">PatNr (FK)</div><div class="pkline fkline">Parameter (FK)</div><div>Wert</div></div>
      <div class="erd-link">n : 1</div>
      <div class="erd-box"><b>Laborparameter</b><div class="pkline">Parameter</div><div>Einheit</div></div>
    </div>`;

  /* ---------- the scenes ---------- */
  return [
    {
      stage: 'UNF',
      title: 'Die Ausgangstabelle',
      narration: `<p>Das Stationssekretariat führt die aktuellen Laborwerte in <b>einer</b> Liste: pro Patient*in eine Zeile.
        Primärschlüssel ist die <b>PatNr</b>.</p>
        <p>Auf den ersten Blick übersichtlich – aber: <b>Name</b> und <b>Station</b> enthalten jeweils zwei Informationen
        (<i>nicht atomar</i>), und in <b>Laborwerte</b> stehen beliebig viele Werte in einer Zelle (<i>Wiederholungsgruppe</i>).
        Wie findet man so alle Patient*innen mit Glukose über 100?</p>`,
      tables: [{
        name: 'Laborbefund', flipName: 'Laborbefund', badge: fail('nicht normalisiert'),
        columns: [{ name: 'PatNr', pk: true }, { name: 'Name', mark: 'nonatomic' }, { name: 'Station', mark: 'nonatomic' }, { name: 'Laborwerte', mark: 'repeat' }],
        rows: unfRows,
      }],
      legend: ['nonatomic', 'repeat'],
      meter: false,
    },
    {
      stage: 'UNF',
      title: '1. NF · Schritt 1: Werte zerlegen',
      narration: `<p><b>Frage der 1. NF:</b> Enthält jede Zelle genau <b>einen</b> Wert?</p>
        <p>Zuerst zerlegen wir die zusammengesetzten Werte: <code>Name</code> → <code>Nachname</code> + <code>Vorname</code>,
        <code>Station</code> → <code>StatNr</code> + <code>Station</code>. Jetzt kann man z.&nbsp;B. nach Nachnamen sortieren
        oder alle Patient*innen der Station 3 suchen.</p>`,
      tables: [{
        name: 'Laborbefund', badge: fail('noch nicht 1NF'),
        columns: [{ name: 'PatNr', pk: true }, { name: 'Nachname', mark: 'new' }, { name: 'Vorname', mark: 'new' },
          { name: 'StatNr', mark: 'new' }, { name: 'Station', mark: 'new' }, { name: 'Laborwerte', mark: 'repeat' }],
        rows: atomicRows,
      }],
      legend: ['new', 'repeat'],
      meter: false,
    },
    {
      stage: 'UNF',
      title: '1. NF · Schritt 2: Wiederholungsgruppe auflösen',
      narration: `<p>Jeder Laborwert bekommt eine <b>eigene Zeile</b> mit den Spalten <code>Parameter</code>, <code>Einheit</code> und <code>Wert</code>.
        Die Patientendaten werden dafür in jede dieser Zeilen kopiert.</p>
        <p>Problem: Die <b>PatNr</b> ist nicht mehr eindeutig – 101 steht jetzt dreimal in der Tabelle (rot).
        Ein Primärschlüssel darf aber jeden Wert nur <b>einmal</b> haben.</p>`,
      tables: [{ name: 'Laborbefund', badge: fail('PK nicht eindeutig!'), columns: flatCols(['PatNr'], { Parameter: 'new', Einheit: 'new', Wert: 'new' }), rows: flatRowsConflict }],
      legend: ['new', 'redundant'],
    },
    {
      stage: '1NF',
      title: '1. NF · Schritt 3: neuer Primärschlüssel',
      narration: `<p>Was macht eine Zeile jetzt eindeutig? <b>PatNr und Parameter gemeinsam</b>: Zu Patientin 101 gibt es genau
        einen Glukose-Wert. Das ist unser neuer, <b>zusammengesetzter Primärschlüssel</b> (🔑).</p>
        <p class="ok">✔ Alle Werte sind atomar → <b>1. Normalform erreicht.</b> Aber sieh dir die gelb markierten Zellen an:
        Viele Informationen stehen mehrfach in der Tabelle (<b>Redundanz</b>).</p>`,
      tables: [{ name: 'Laborbefund', badge: ok('1NF'), columns: flatCols(['PatNr', 'Parameter'], { PatNr: 'key', Parameter: 'key' }), rows: flatRows }],
      legend: ['key', 'redundant'],
    },
    {
      stage: '1NF',
      title: '2. NF · Schritt 4: Wovon hängt jede Spalte ab?',
      narration: `<p><b>Frage der 2. NF:</b> Hängt jedes Nicht-Schlüssel-Attribut vom <b>ganzen</b> Primärschlüssel ab – oder reicht schon ein Teil davon?</p>
        <p>Den <b>Nachnamen</b> kennt man schon, wenn man nur die PatNr weiß (blau). Die <b>Einheit</b> folgt allein aus dem Parameter
        (orange) – Glukose wird immer in mg/dl gemessen. Nur der <b>Wert</b> braucht beide Schlüsselteile (grün).
        Blau und Orange verletzen die 2. NF.</p>`,
      tables: [{ name: 'Laborbefund', badge: fail('2NF ✗'), columns: flatCols(['PatNr', 'Parameter'], depMarks), rows: flatRows }],
      fds: fdsTwoNF,
      legend: ['dep-a', 'dep-b', 'dep-full', 'redundant'],
    },
    {
      stage: '1NF',
      title: '2. NF · Schritt 5: Tabelle aufteilen',
      narration: `<p>Jede Gruppe wandert in eine <b>eigene Tabelle</b> – mit dem Schlüsselteil, von dem sie abhängt:</p>
        <p><b>Patient</b> (blau, Schlüssel PatNr) · <b>Laborparameter</b> (orange, Schlüssel Parameter) ·
        <b>Messwert</b> (grün, behält den ganzen Schlüssel). Die durchgestrichenen Zeilen sind jetzt <b>exakte Duplikate</b> – sie fliegen raus.</p>`,
      tables: [
        { name: 'Patient', columns: patientCols({ Nachname: 'dep-a', Vorname: 'dep-a', StatNr: 'dep-a', Station: 'dep-a' }), rows: patRowsDup },
        { name: 'Messwert', flipName: 'Laborbefund', columns: messwertCols('dep-full'), rows: mwRows },
        { name: 'Laborparameter', columns: parameterCols('dep-b'), rows: parRowsDup },
      ],
      fds: fdsTwoNF,
      legend: ['dep-a', 'dep-b', 'dep-full'],
    },
    {
      stage: '2NF',
      title: '2. NF · Schritt 6: Duplikate entfernt',
      narration: `<p>Aus 1 Tabelle mit 9 Zeilen wurden 3 Tabellen. Jede Patientin, jeder Laborparameter steht nur noch <b>einmal</b> da.
        In <b>Messwert</b> sind PatNr und Parameter jetzt <b>Fremdschlüssel</b> (FK): Sie zeigen auf Patient bzw. Laborparameter.</p>
        <p class="ok">✔ <b>2. Normalform erreicht.</b> Fast alles ist redundanzfrei – aber in <b>Patient</b> steht „Kardiologie“ immer noch zweimal …</p>`,
      tables: [
        { name: 'Patient', badge: ok('2NF'), columns: patientCols(), rows: patRows },
        { name: 'Messwert', flipName: 'Laborbefund', badge: ok('2NF'), columns: messwertCols(), rows: mwRows },
        { name: 'Laborparameter', badge: ok('2NF'), columns: parameterCols(), rows: parRows },
      ],
      legend: ['redundant'],
    },
    {
      stage: '2NF',
      title: '3. NF · Schritt 7: Abhängigkeiten zwischen Nicht-Schlüsseln?',
      narration: `<p><b>Frage der 3. NF:</b> Folgt aus einem <b>Nicht-Schlüssel-Attribut</b> ein anderes Nicht-Schlüssel-Attribut?</p>
        <p>Ja: Aus der <b>StatNr</b> folgt der Stationsname (lila). Station 3 heißt immer „Kardiologie“ – egal welche Patientin.
        Die Kette <code>PatNr → StatNr → Station</code> nennt man <b>transitive Abhängigkeit</b>.
        Messwert und Laborparameter haben kein solches Problem.</p>`,
      tables: [
        { name: 'Patient', badge: fail('3NF ✗'), columns: patientCols({ StatNr: 'dep-trans', Station: 'dep-trans' }), rows: patRows },
        { name: 'Messwert', flipName: 'Laborbefund', badge: ok('3NF'), columns: messwertCols(), rows: mwRows },
        { name: 'Laborparameter', badge: ok('3NF'), columns: parameterCols(), rows: parRows },
      ],
      fds: [
        { text: 'PatNr → Nachname, Vorname, StatNr', kind: 'ok' },
        { text: 'StatNr → Station', kind: 'dep-trans' },
      ],
      legend: ['dep-trans', 'redundant'],
    },
    {
      stage: '2NF',
      title: '3. NF · Schritt 8: Station auslagern',
      narration: `<p>Die transitive Abhängigkeit wird in eine eigene Tabelle <b>Station</b> ausgelagert. Der <b>Bestimmer</b> (StatNr) wird dort
        Primärschlüssel und bleibt in Patient als <b>Fremdschlüssel</b> zurück – sonst wüssten wir nicht mehr, wo jemand liegt.</p>
        <p>Die doppelte Zeile „3 Kardiologie“ ist ein Duplikat und verschwindet.</p>`,
      tables: [
        { name: 'Station', columns: stationCols.map((c) => ({ ...c, mark: 'dep-trans' })), rows: statRowsDup },
        { name: 'Patient', columns: patient3Cols, rows: pat3Rows },
        { name: 'Messwert', flipName: 'Laborbefund', columns: messwertCols(), rows: mwRows },
        { name: 'Laborparameter', columns: parameterCols(), rows: parRows },
      ],
      legend: ['dep-trans'],
    },
    {
      stage: '3NF',
      title: 'Geschafft: 3. Normalform',
      narration: `<p class="ok">✔ <b>3. Normalform erreicht.</b> Jede Information steht genau <b>einmal</b> in der Datenbank.</p>
        <p>Benennt man Station 3 um, ändert man <b>eine</b> Zelle. Ein neuer Laborparameter kann angelegt werden, bevor er gemessen wurde.
        Und wird Herr Yilmaz entlassen, bleiben „Kalium (mmol/l)“ und die Station „Innere Medizin“ erhalten.
        Mit einem <b>JOIN</b> über die Fremdschlüssel lässt sich die ursprüngliche Liste jederzeit wieder zusammensetzen.</p>`,
      tables: [
        { name: 'Station', badge: ok('3NF'), columns: stationCols, rows: statRows },
        { name: 'Patient', badge: ok('3NF'), columns: patient3Cols, rows: pat3Rows },
        { name: 'Messwert', flipName: 'Laborbefund', badge: ok('3NF'), columns: messwertCols(), rows: mwRows },
        { name: 'Laborparameter', badge: ok('3NF'), columns: parameterCols(), rows: parRows },
      ],
      extra: erd,
      legend: [],
    },
  ];
})();
