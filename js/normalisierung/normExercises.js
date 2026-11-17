/**
 * Content of all exercises on the normalisation page.
 * Order = order on the page (easy -> harder). All persons are fictitious.
 */
const NormExercises = [
  {
    type: DragMatchExercise,
    config: {
      title: 'Ü1 · Welche Anomalie ist das?',
      level: 'leicht',
      task: 'Ziehe jede Situation auf die passende Anomalie (oder: Karte anklicken, dann Feld anklicken). '
        + 'Alle Situationen stammen aus <b>nicht normalisierten</b> Tabellen.',
      items: [
        { id: 1, label: 'Eine neue Station wird eröffnet. Sie lässt sich nicht speichern, weil dort noch niemand liegt.', key: 'insert' },
        { id: 2, label: 'Ein Medikament ist neu zugelassen, wurde aber noch niemandem verordnet – es kann nicht erfasst werden.', key: 'insert' },
        { id: 3, label: 'Die Durchwahl der Ambulanz wurde nur in einer von drei Zeilen korrigiert. Jetzt gibt es zwei verschiedene Nummern.', key: 'update' },
        { id: 4, label: 'Ein Patient zieht um. Seine Adresse steht in 12 Befundzeilen und muss überall geändert werden.', key: 'update' },
        { id: 5, label: 'Der letzte Befund mit dem Allergen „Birke“ wird gelöscht – damit ist auch weg, dass Birke ein Pollen-Allergen ist.', key: 'delete' },
        { id: 6, label: 'Eine Ärztin geht in Pension, ihre Termine werden gelöscht – und mit ihnen die einzige Angabe, in welchem Raum die Ordination ist.', key: 'delete' },
      ],
      zones: [
        { key: 'insert', label: 'Einfügeanomalie', sub: 'etwas kann nicht gespeichert werden' },
        { key: 'update', label: 'Änderungsanomalie', sub: 'mehrfach gespeichert → Widerspruch' },
        { key: 'delete', label: 'Löschanomalie', sub: 'ungewollt mitgelöscht' },
      ],
      successMessage: 'Richtig! Alle drei Anomalien haben dieselbe Ursache: Informationen über verschiedene Dinge stehen in einer Tabelle.',
      explanation: '<b>Einfügen:</b> Man kann etwas nicht speichern, ohne etwas anderes mitzuspeichern. '
        + '<b>Ändern:</b> Dieselbe Info steht mehrfach – vergisst man eine Stelle, widersprechen sich die Daten. '
        + '<b>Löschen:</b> Mit einem Datensatz verschwinden Informationen, die man noch braucht.',
    },
  },
  {
    type: ColumnPickExercise,
    config: {
      title: 'Ü2 · Was verletzt die 1. Normalform?',
      level: 'leicht',
      task: 'Ein Schularzt hat die Impfpässe so erfasst. Markiere alle Spalten, in denen die Werte <b>nicht atomar</b> sind '
        + 'oder eine <b>Wiederholungsgruppe</b> steckt.',
      table: {
        name: 'Impfpass',
        columns: ['PassNr', 'Name', 'Geburtsdatum', 'Impfungen', 'Hausarzt', 'Blutgruppe'],
        rows: [
          { PassNr: 5001, Name: 'Lisa Berger', Geburtsdatum: '12.04.2008', Impfungen: 'FSME 03/2024, Tetanus 11/2023', Hausarzt: 'Dr. Wolf, 1090 Wien', Blutgruppe: 'A+' },
          { PassNr: 5002, Name: 'Tobias Lang', Geburtsdatum: '30.09.2007', Impfungen: 'Influenza 10/2024', Hausarzt: 'Dr. Aksoy, 1100 Wien', Blutgruppe: '0−' },
          { PassNr: 5003, Name: 'Mira Steiner', Geburtsdatum: '05.01.2008', Impfungen: 'HPV 02/2023, FSME 05/2024, Masern 06/2019', Hausarzt: 'Dr. Wolf, 1090 Wien', Blutgruppe: 'B+' },
        ],
      },
      correct: ['Name', 'Impfungen', 'Hausarzt'],
      reasons: {
        Name: 'Vor- und Nachname in einer Zelle → aufteilen in Vorname und Nachname.',
        Impfungen: 'Mehrere Impfungen (jeweils mit Datum) in einer Zelle – eine Wiederholungsgruppe. Jede Impfung braucht eine eigene Zeile.',
        Hausarzt: 'Name, Postleitzahl und Ort in einer Zelle → aufteilen.',
        Geburtsdatum: 'ist atomar: ein Datum ist <b>ein</b> Wert (Datentyp DATE).',
        Blutgruppe: 'ist atomar: „A+“ ist ein einzelner Wert aus einer festen Liste.',
      },
    },
  },
  {
    type: DragMatchExercise,
    config: {
      title: 'Ü3 · Wovon hängt das ab?',
      level: 'mittel',
      task: 'Die Tabelle <span class="schema">Verordnung (<u>PatNr</u>, <u>MedNr</u>, Patientenname, Geburtsdatum, Handelsname, '
        + 'Wirkstoff, Hersteller, Dosierung, Startdatum)</span> speichert, welche Medikamente Patient*innen bekommen. '
        + 'Der Primärschlüssel ist <b>PatNr + MedNr</b>. Ordne jedes Nicht-Schlüssel-Attribut dem Teil des Schlüssels zu, von dem es abhängt.',
      items: [
        { id: 'pn', label: 'Patientenname', key: 'pat' },
        { id: 'gd', label: 'Geburtsdatum', key: 'pat' },
        { id: 'hn', label: 'Handelsname', key: 'med' },
        { id: 'ws', label: 'Wirkstoff', key: 'med' },
        { id: 'hs', label: 'Hersteller', key: 'med' },
        { id: 'do', label: 'Dosierung', sub: 'z. B. 1-0-1', key: 'both' },
        { id: 'sd', label: 'Startdatum', sub: 'seit wann die Person es nimmt', key: 'both' },
      ],
      zones: [
        { key: 'pat', label: 'nur von PatNr', sub: 'PatNr → …' },
        { key: 'med', label: 'nur von MedNr', sub: 'MedNr → …' },
        { key: 'both', label: 'vom ganzen Schlüssel', sub: 'PatNr, MedNr → …' },
      ],
      successMessage: 'Richtig! Alles in „nur PatNr“ und „nur MedNr“ verletzt die 2. NF und kommt in eine eigene Tabelle.',
      explanation: 'Zerlegung in 2. NF: <span class="schema">Patient (<u>PatNr</u>, Patientenname, Geburtsdatum)</span> · '
        + '<span class="schema">Medikament (<u>MedNr</u>, Handelsname, Wirkstoff, Hersteller)</span> · '
        + '<span class="schema">Verordnung (<u>PatNr</u>, <u>MedNr</u>, Dosierung, Startdatum)</span>. '
        + 'Die Dosierung hängt von beiden ab: Dasselbe Medikament bekommt jede Person anders dosiert.',
    },
  },
  {
    type: ChoiceQuiz,
    config: {
      title: 'Ü4 · In welcher Normalform?',
      level: 'mittel',
      task: 'Bestimme für jede Tabelle die <b>höchste</b> Normalform, die sie erfüllt. Primärschlüssel sind unterstrichen, '
        + 'darunter stehen die funktionalen Abhängigkeiten. Prüfe immer der Reihe nach: 1NF → 2NF → 3NF.',
      options: ['nicht in 1NF', '1NF', '2NF', '3NF'],
      questions: [
        {
          prompt: '<span class="schema">Anamnese (<u>PatNr</u>, Name, Allergien)</span>',
          facts: 'Beispielzeile: (2001, Huber, „Pollen, Nüsse, Penicillin“)',
          answer: 'nicht in 1NF',
          why: 'In <i>Allergien</i> stehen mehrere Werte in einer Zelle → Wiederholungsgruppe, nicht atomar.',
        },
        {
          prompt: '<span class="schema">Blutdruck (<u>PatNr</u>, <u>Messzeitpunkt</u>, Systolisch, Diastolisch, Patientenname)</span>',
          facts: 'PatNr, Messzeitpunkt → Systolisch, Diastolisch · PatNr → Patientenname',
          answer: '1NF',
          why: 'Patientenname hängt nur von einem <b>Teil</b> des Schlüssels (PatNr) ab → 2NF verletzt.',
        },
        {
          prompt: '<span class="schema">Operation (<u>OpNr</u>, Datum, SaalNr, Saalbezeichnung, Chirurg)</span>',
          facts: 'OpNr → Datum, SaalNr, Chirurg · SaalNr → Saalbezeichnung',
          answer: '2NF',
          why: 'Einfacher Primärschlüssel → 2NF automatisch erfüllt. Aber SaalNr → Saalbezeichnung ist eine Abhängigkeit zwischen Nicht-Schlüssel-Attributen → 3NF verletzt.',
        },
        {
          prompt: '<span class="schema">Medikament (<u>PZN</u>, Handelsname, Wirkstoff, Packungsgröße)</span>',
          facts: 'PZN → Handelsname, Wirkstoff, Packungsgröße (sonst keine Abhängigkeiten)',
          answer: '3NF',
          why: 'Alle Werte atomar, einfacher Schlüssel, und kein Nicht-Schlüssel-Attribut bestimmt ein anderes → 3NF.',
        },
        {
          prompt: '<span class="schema">Probe (<u>ProbenNr</u>, Entnahmezeit, PatNr, Patientenname)</span>',
          facts: 'ProbenNr → Entnahmezeit, PatNr · PatNr → Patientenname',
          answer: '2NF',
          why: 'PatNr ist hier <b>kein</b> Schlüssel, sondern ein normales Attribut. PatNr → Patientenname ist daher eine transitive Abhängigkeit → 3NF verletzt.',
        },
        {
          prompt: '<span class="schema">Dienstplan (<u>ArztNr</u>, <u>Datum</u>, Schicht)</span>',
          facts: 'ArztNr, Datum → Schicht',
          answer: '3NF',
          why: 'Das einzige Nicht-Schlüssel-Attribut hängt vom ganzen Schlüssel ab, und es gibt kein zweites, das es bestimmen könnte → 3NF.',
        },
      ],
    },
  },
  {
    type: SchemaBuilderExercise,
    config: {
      title: 'Ü5 · Blutspende in 3. Normalform',
      level: 'mittel',
      task: 'Der Blutspendedienst speichert <span class="schema">Blutspende (<u>SpendeNr</u>, Datum, Menge_ml, SpenderNr, Spendername, '
        + 'Blutgruppe, OrtNr, Spendeort)</span>.<br>Abhängigkeiten: <code>SpenderNr → Spendername, Blutgruppe</code> · '
        + '<code>OrtNr → Spendeort</code>.<br>Ziehe die Attribute in die drei Tabellen. Fremdschlüssel gibt es zweimal.',
      tables: [
        { name: 'Spende', attrs: ['SpendeNr', 'Datum', 'Menge_ml', 'SpenderNr', 'OrtNr'], pk: ['SpendeNr'], fk: ['SpenderNr', 'OrtNr'] },
        { name: 'Spender', attrs: ['SpenderNr', 'Spendername', 'Blutgruppe'], pk: ['SpenderNr'] },
        { name: 'Spendeort', attrs: ['OrtNr', 'Spendeort'], pk: ['OrtNr'] },
      ],
      explanation: 'Der Primärschlüssel ist einfach (SpendeNr) – die 2NF war also schon erfüllt. '
        + 'Beide Probleme waren <b>transitive</b> Abhängigkeiten (3NF): Der Bestimmer wird Primärschlüssel der neuen Tabelle '
        + 'und bleibt als Fremdschlüssel in <i>Spende</i>.',
    },
  },
];
