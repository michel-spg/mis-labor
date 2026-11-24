/**
 * Content of all exercises on the SQL DDL page (easy -> hard). All persons are fictitious.
 * SQL exercises are verified by behaviour (Probe): a solution works if the constraints actually hold.
 */
const LAB_STATIONEN = `${DdlData.stationen}\n${DdlData.stationenDaten}`;

const DdlExercises = [
  {
    type: DragMatchExercise,
    config: {
      title: 'Ü1 · Zu welcher Teilsprache gehört der Befehl?',
      level: 'leicht',
      task: 'Ordne jeden Befehl der richtigen Gruppe von SQL zu (ziehen oder: Karte anklicken, dann Feld anklicken).',
      items: [
        { id: 1, label: 'CREATE TABLE', sub: 'Tabelle anlegen', key: 'ddl' },
        { id: 2, label: 'ALTER TABLE', sub: 'Struktur ändern', key: 'ddl' },
        { id: 3, label: 'DROP TABLE', sub: 'Tabelle löschen', key: 'ddl' },
        { id: 4, label: 'INSERT', sub: 'Zeile einfügen', key: 'dml' },
        { id: 5, label: 'UPDATE', sub: 'Werte ändern', key: 'dml' },
        { id: 6, label: 'DELETE', sub: 'Zeilen löschen', key: 'dml' },
        { id: 7, label: 'SELECT', sub: 'Daten abfragen', key: 'dql' },
        { id: 8, label: 'GRANT', sub: 'Recht erteilen', key: 'dcl' },
        { id: 9, label: 'REVOKE', sub: 'Recht entziehen', key: 'dcl' },
        { id: 10, label: 'CREATE INDEX', sub: 'Index anlegen', key: 'ddl' },
      ],
      zones: [
        { key: 'ddl', label: 'DDL', sub: 'Data Definition Language – Strukturen' },
        { key: 'dml', label: 'DML', sub: 'Data Manipulation Language – Daten ändern' },
        { key: 'dql', label: 'DQL', sub: 'Data Query Language – abfragen' },
        { key: 'dcl', label: 'DCL', sub: 'Data Control Language – Rechte' },
      ],
      successMessage: 'Richtig! DDL verändert die Struktur, DML die Daten, DQL liest nur, DCL regelt die Rechte.',
      explanation: '<b>Eselsbrücke:</b> D<b>D</b>L = <b>d</b>efinieren (Tabellen bauen), D<b>M</b>L = <b>m</b>anipulieren (Daten ändern), D<b>Q</b>L = <b>q</b>uery (fragen), D<b>C</b>L = <b>c</b>ontrol (kontrollieren, wer was darf).',
    },
  },
  {
    type: ChoiceQuiz,
    config: {
      title: 'Ü2 · Welcher Datentyp passt?',
      level: 'leicht',
      task: 'Wähle für jede Spalte der Laborverwaltung den passendsten Datentyp.',
      options: ['INTEGER', 'VARCHAR(n)', 'DECIMAL(n,m)', 'DATE', 'TIMESTAMP'],
      questions: [
        { prompt: 'Anzahl der Betten einer Station', answer: 'INTEGER', why: 'Eine ganze Zahl ohne Nachkommastellen.' },
        { prompt: 'Nachname einer Patientin', answer: 'VARCHAR(n)', why: 'Text variabler Länge, z. B. <code>varchar(30)</code>.' },
        { prompt: 'Geburtsdatum', answer: 'DATE', why: 'Nur ein Datum, ohne Uhrzeit – Format <code>\'JJJJ-MM-TT\'</code>.' },
        { prompt: 'Hämoglobin-Messwert, z. B. 13,4 g/dl', answer: 'DECIMAL(n,m)', why: 'Exakte Dezimalzahl, z. B. <code>decimal(7,2)</code>: 7 Stellen insgesamt, 2 nach dem Komma.' },
        { prompt: 'Zeitpunkt der Blutabnahme (Tag und Uhrzeit)', answer: 'TIMESTAMP', why: '<code>timestamp</code> speichert Datum <b>und</b> Uhrzeit.' },
        { prompt: 'Telefonnummer der Station, z. B. +43 1 40400', answer: 'VARCHAR(n)', why: 'Telefonnummern sind <b>Text</b>: Sie enthalten „+“ und Leerzeichen, und man rechnet nicht damit.' },
      ],
    },
  },
  {
    type: ChoiceQuiz,
    config: {
      title: 'Ü3 · Welcher Constraint?',
      level: 'leicht',
      task: 'Welcher Constraint setzt die Regel um?',
      options: ['NOT NULL', 'PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY', 'DEFAULT', 'CHECK'],
      questions: [
        { prompt: 'Jede Patientin hat eine eindeutige Nummer, die nie fehlen darf.', answer: 'PRIMARY KEY', why: 'Der Primärschlüssel ist eindeutig und nie NULL.' },
        { prompt: 'Zu jedem Patienten muss ein Nachname gespeichert werden.', answer: 'NOT NULL', why: 'NOT NULL verbietet leere Werte.' },
        { prompt: 'Keine zwei Stationen dürfen denselben Namen haben (der Name ist aber nicht der Primärschlüssel).', answer: 'UNIQUE', why: 'UNIQUE sichert Eindeutigkeit auch außerhalb des Primärschlüssels.' },
        { prompt: 'Ein Patient darf nur einer Station zugeordnet sein, die es auch gibt.', answer: 'FOREIGN KEY', why: 'Der Fremdschlüssel sichert die referentielle Integrität.' },
        { prompt: 'Ohne Angabe hat eine neue Station 20 Betten.', answer: 'DEFAULT', why: 'DEFAULT liefert den Vorgabewert.' },
        { prompt: 'Die Bettenzahl muss größer als 0 sein.', answer: 'CHECK', why: '<code>check (st_betten &gt; 0)</code> prüft eine beliebige Bedingung.' },
      ],
    },
  },
  {
    type: ChoiceQuiz,
    config: {
      title: 'Ü4 · ON DELETE und ON UPDATE',
      level: 'mittel',
      task: 'Eine Station wird gelöscht (oder ihre Nummer geändert), auf die Patient*innen verweisen. Welche Aktion beschreibt das Verhalten?',
      options: ['NO ACTION', 'CASCADE', 'SET NULL'],
      questions: [
        { prompt: 'Die Station wird gelöscht. Die Patient*innen bleiben erhalten, bei ihnen steht danach keine Station mehr.', answer: 'SET NULL', why: 'Der Fremdschlüssel wird auf NULL gesetzt – dafür muss die Spalte NULL erlauben (nicht NOT NULL).' },
        { prompt: 'Die Station wird gelöscht – und alle ihre Patient*innen verschwinden ebenfalls.', answer: 'CASCADE', why: 'CASCADE gibt das Löschen an die abhängigen Zeilen weiter. Vorsicht: Das kann viele Daten kosten!' },
        { prompt: 'Eine Station mit Patient*innen lässt sich nicht löschen – es kommt eine Fehlermeldung.', answer: 'NO ACTION', why: 'NO ACTION (Standard) verweigert die Änderung, solange Verweise bestehen.' },
        { prompt: 'Wird eine Patientin gelöscht, sollen auch ihre Messwerte verschwinden – allein sind sie nutzlos.', answer: 'CASCADE', why: 'Messwerte hängen existenziell an der Patientin: ON DELETE CASCADE.' },
        { prompt: 'ON UPDATE: Die Stationsnummer wird geändert und alle Patient*innen sollen automatisch die neue Nummer bekommen.', answer: 'CASCADE', why: 'ON UPDATE CASCADE zieht den Fremdschlüssel mit.' },
      ],
    },
  },
  {
    type: ChoiceQuiz,
    config: {
      title: 'Ü5 · Die richtige Reihenfolge',
      level: 'mittel',
      task: 'Fremdschlüssel verweisen auf Tabellen, die <b>existieren</b> müssen. Wähle die richtige Reihenfolge.',
      options: ['st_stationen', 'p_patienten'],
      questions: [
        { prompt: 'Welche Tabelle legst du mit <code>CREATE TABLE</code> <b>zuerst</b> an?', answer: 'st_stationen', why: 'Die Elterntabelle (auf die verwiesen wird) muss existieren, bevor ein FOREIGN KEY auf sie zeigen kann.' },
        { prompt: 'In welche Tabelle fügst du Daten <b>zuerst</b> ein?', answer: 'st_stationen', why: 'Eine Patientin mit Station 2 kann man erst speichern, wenn es Station 2 gibt.' },
        { prompt: 'Welche Tabelle löschst du mit <code>DROP TABLE</code> <b>zuerst</b>?', answer: 'p_patienten', why: 'Man löscht in umgekehrter Reihenfolge: erst die Kindtabelle, dann die Elterntabelle.' },
        {
          prompt: 'Wie kann man Daten in beliebiger Reihenfolge einfügen?',
          options: ['FOREIGN KEY erst nach dem Einfügen mit ALTER TABLE anlegen', 'FOREIGN KEY einfach weglassen'],
          answer: 'FOREIGN KEY erst nach dem Einfügen mit ALTER TABLE anlegen',
          why: 'Dann wird beim Anlegen des Constraints <b>alles auf einmal</b> geprüft – schlägt es fehl, gibt es verwaiste Zeilen. Weglassen hieße: keine Integrität mehr.',
        },
      ],
    },
  },
  {
    type: SqlExercise,
    config: {
      title: 'Ü6 · Tabelle st_stationen anlegen',
      level: 'leicht',
      task: 'Lege die Tabelle <code>st_stationen</code> an:<ul>'
        + '<li><code>st_statnr</code> – ganze Zahl, <b>Primärschlüssel</b></li>'
        + '<li><code>st_name</code> – Text, höchstens 40 Zeichen, <b>Pflicht</b> und <b>einzigartig</b></li>'
        + '<li><code>st_betten</code> – ganze Zahl, ohne Angabe <b>20</b>, muss <b>größer als 0</b> sein</li></ul>',
      starter: '',
      checks: [
        { label: 'Tabelle st_stationen mit den Spalten st_statnr, st_name, st_betten', test: (db) => ['st_statnr', 'st_name', 'st_betten'].every((c) => Probe.col(db, 'st_stationen', c)) },
        { label: 'st_statnr ist PRIMARY KEY', test: (db) => Probe.tbl(db, 'st_stationen')?.pk.join() === 'st_statnr' },
        { label: 'st_name ist NOT NULL', test: (db) => Probe.fails(db, 'insert into st_stationen (st_statnr) values (1);') },
        { label: 'st_name ist UNIQUE', test: (db) => Probe.ok(db, "insert into st_stationen (st_statnr, st_name) values (1,'A');") && Probe.fails(db, "insert into st_stationen (st_statnr, st_name) values (1,'A'),(2,'A');") },
        { label: 'st_betten hat den DEFAULT-Wert 20', test: (db) => Probe.after(db, "insert into st_stationen (st_statnr, st_name) values (1,'A');").rows('st_stationen')[0]?.st_betten === 20 },
        { label: 'CHECK: st_betten > 0 (5 ist erlaubt, −3 nicht)', test: (db) => Probe.ok(db, "insert into st_stationen values (1,'A',5);") && Probe.fails(db, "insert into st_stationen values (1,'A',-3);") },
      ],
      solutionSql: DdlData.stationen,
      explanation: 'Spaltenconstraints stehen direkt hinter dem Datentyp. Die Reihenfolge der Spalten und die Schreibweise (PRIMARY KEY als Spalten- oder Tabellenconstraint) sind egal – wichtig ist, dass die Regeln wirken.',
    },
  },
  {
    type: SqlExercise,
    config: {
      title: 'Ü7 · Tabelle p_patienten mit Fremdschlüssel',
      level: 'mittel',
      task: 'Die Tabelle <code>st_stationen</code> (mit den Stationen 1–3) gibt es schon. Lege <code>p_patienten</code> an:<ul>'
        + '<li><code>p_patnr</code> ganze Zahl, Primärschlüssel</li>'
        + '<li><code>p_nachname</code>, <code>p_vorname</code> – Text bis 30 Zeichen, Pflicht</li>'
        + '<li><code>p_geburtsdatum</code> – Datum</li>'
        + '<li><code>p_st_statnr</code> – Fremdschlüssel auf <code>st_stationen</code>. Wird eine Station gelöscht, bleiben die Patient*innen erhalten (dann ohne Station).</li></ul>',
      setup: LAB_STATIONEN,
      checks: [
        { label: 'Tabelle p_patienten mit allen 5 Spalten', test: (db) => ['p_patnr', 'p_nachname', 'p_vorname', 'p_geburtsdatum', 'p_st_statnr'].every((c) => Probe.col(db, 'p_patienten', c)) },
        { label: 'p_patnr ist PRIMARY KEY', test: (db) => Probe.tbl(db, 'p_patienten')?.pk.join() === 'p_patnr' },
        { label: 'Nachname und Vorname sind Pflicht', test: (db) => Probe.ok(db, "insert into p_patienten (p_patnr, p_nachname, p_vorname) values (1,'A','B');") && Probe.fails(db, "insert into p_patienten (p_patnr, p_nachname) values (1,'A');") && Probe.fails(db, "insert into p_patienten (p_patnr, p_vorname) values (1,'A');") },
        { label: 'p_geburtsdatum ist ein DATE', test: (db) => Probe.col(db, 'p_patienten', 'p_geburtsdatum')?.base === 'DATE' },
        { label: 'FOREIGN KEY auf st_stationen: Station 1 und NULL sind erlaubt, Station 9 nicht', test: (db) => Probe.ok(db, "insert into p_patienten values (1,'A','B',null,1);") && Probe.ok(db, "insert into p_patienten (p_patnr, p_nachname, p_vorname) values (2,'A','B');") && Probe.fails(db, "insert into p_patienten values (1,'A','B',null,9);") },
        { label: 'ON DELETE SET NULL: Station löschen → Patient bleibt, Station = NULL', test: (db) => { const d = Probe.after(db, "insert into p_patienten values (1,'A','B',null,1); delete from st_stationen where st_statnr = 1;"); return d.rows('p_patienten').length === 1 && d.rows('p_patienten')[0].p_st_statnr === null; } },
      ],
      solutionSql: DdlData.patienten('set null', 'no action').replace(/\n    on delete set null on update no action/, '\n    on delete set null'),
      explanation: 'Ohne <code>on delete …</code> gilt <b>NO ACTION</b>: Dann ließe sich eine Station mit Patient*innen gar nicht löschen. Mit <code>on delete set null</code> wird der Fremdschlüssel auf NULL gesetzt – deshalb darf <code>p_st_statnr</code> nicht NOT NULL sein.',
    },
  },
  {
    type: SqlExercise,
    config: {
      title: 'Ü8 · Fehlersuche im Skript',
      level: 'mittel',
      task: 'Dieses Skript für die Messwerte läuft nicht. <b>Drei Fehler</b> stecken drin (Reihenfolge, Syntax, Datentyp). Klicke auf <b>Prüfen</b>, lies die Fehlermeldung, behebe den Fehler – und wiederhole das, bis alles durchläuft.',
      rows: 22,
      starter: `-- Messwerte, Laborparameter, Patienten
create table m_messwerte (
  m_p_patnr       integer,
  m_lp_parameter  varchar(20),
  m_wert          decimal(7,2) not null,
  primary key (m_p_patnr, m_lp_parameter),
  foreign key (m_p_patnr) references p_patienten (p_patnr),
  foreign key (m_lp_parameter) references lp_laborparameter (lp_parameter)
);

create table lp_laborparameter (
  lp_parameter  varchar primary key
  lp_einheit    varchar(10) not null
);

create table p_patienten (
  p_patnr     integer primary key,
  p_nachname  varchar(30) not null
);`,
      checks: [
        { label: 'Alle drei Tabellen sind angelegt', test: (db) => ['m_messwerte', 'lp_laborparameter', 'p_patienten'].every((t) => Probe.tbl(db, t)) },
        { label: 'm_messwerte hat den zusammengesetzten PRIMARY KEY (Patient, Parameter)', test: (db) => Probe.tbl(db, 'm_messwerte')?.pk.length === 2 },
        { label: 'm_messwerte hat zwei FOREIGN KEYs', test: (db) => Probe.tbl(db, 'm_messwerte')?.fks.length === 2 },
        { label: 'Gültiger Messwert lässt sich speichern', test: (db) => Probe.ok(db, "insert into p_patienten values (1,'A'); insert into lp_laborparameter values ('Hb','g/dl'); insert into m_messwerte values (1,'Hb',13.5);") },
        { label: 'Messwert für unbekannte Patientin wird abgelehnt', test: (db) => Probe.fails(db, "insert into lp_laborparameter values ('Hb','g/dl'); insert into m_messwerte values (7,'Hb',13.5);") },
      ],
      solutionSql: `-- Eltern zuerst, Kinder danach
create table p_patienten (
  p_patnr     integer primary key,
  p_nachname  varchar(30) not null
);

create table lp_laborparameter (
  lp_parameter  varchar(20) primary key,
  lp_einheit    varchar(10) not null
);

create table m_messwerte (
  m_p_patnr       integer,
  m_lp_parameter  varchar(20),
  m_wert          decimal(7,2) not null,
  primary key (m_p_patnr, m_lp_parameter),
  foreign key (m_p_patnr) references p_patienten (p_patnr),
  foreign key (m_lp_parameter) references lp_laborparameter (lp_parameter)
);`,
      explanation: '<b>1.</b> Elterntabellen vor Kindtabellen anlegen. <b>2.</b> Zwischen zwei Spalten gehört ein Komma. <b>3.</b> <code>varchar</code> braucht eine Länge: <code>varchar(20)</code>.',
    },
  },
  {
    type: SqlExercise,
    config: {
      title: 'Ü9 · Messwerte mit zusammengesetztem Schlüssel',
      level: 'schwer',
      task: 'Patient*innen und Laborparameter (mit Daten) gibt es schon. Lege <code>m_messwerte</code> an:<ul>'
        + '<li><code>m_p_patnr</code> (ganze Zahl), <code>m_lp_parameter</code> (Text bis 20) und <code>m_wert</code> (Dezimalzahl, 7 Stellen, 2 Nachkommastellen, Pflicht)</li>'
        + '<li><b>Primärschlüssel</b> aus <code>m_p_patnr</code> <b>und</b> <code>m_lp_parameter</code> (je Patient*in ein Wert pro Parameter)</li>'
        + '<li>Fremdschlüssel auf <code>p_patienten</code> – wird die Patientin gelöscht, verschwinden auch ihre Messwerte</li>'
        + '<li>Fremdschlüssel auf <code>lp_laborparameter</code> – ein Parameter, zu dem es Messwerte gibt, darf nicht gelöscht werden</li></ul>',
      setup: `${DdlData.stationen}\n${DdlData.patienten('set null', 'cascade')}\n${DdlData.laborparameter}\n${DdlData.stationenDaten}\n${DdlData.patientenDaten}\n${DdlData.laborparameterDaten}`,
      rows: 12,
      checks: [
        { label: 'Tabelle m_messwerte mit den drei Spalten', test: (db) => ['m_p_patnr', 'm_lp_parameter', 'm_wert'].every((c) => Probe.col(db, 'm_messwerte', c)) },
        { label: 'PRIMARY KEY besteht aus Patient und Parameter', test: (db) => [...(Probe.tbl(db, 'm_messwerte')?.pk ?? [])].sort().join() === 'm_lp_parameter,m_p_patnr' },
        { label: 'm_wert ist Pflicht', test: (db) => Probe.ok(db, "insert into m_messwerte values (100,'Kalium',4.2);") && Probe.fails(db, "insert into m_messwerte (m_p_patnr, m_lp_parameter) values (100,'Kalium');") },
        { label: 'Derselbe Parameter zweimal für dieselbe Patientin wird abgelehnt', test: (db) => Probe.fails(db, "insert into m_messwerte values (100,'Kalium',4.2),(100,'Kalium',4.5);") },
        { label: 'Unbekannte Patientin oder unbekannter Parameter werden abgelehnt', test: (db) => Probe.fails(db, "insert into m_messwerte values (999,'Kalium',4.2);") && Probe.fails(db, "insert into m_messwerte values (100,'Eisen',4.2);") },
        { label: 'ON DELETE CASCADE bei der Patientin: Messwerte verschwinden mit', test: (db) => { const d = Probe.after(db, "insert into m_messwerte values (100,'Kalium',4.2); delete from p_patienten where p_patnr = 100;"); return d.rows('m_messwerte').length === 0 && !d.rows('p_patienten').some((p) => p.p_patnr === 100); } },
        { label: 'Parameter mit Messwerten lässt sich nicht löschen', test: (db) => Probe.fails(db, "insert into m_messwerte values (100,'Kalium',4.2); delete from lp_laborparameter where lp_parameter = 'Kalium';") },
      ],
      solutionSql: DdlData.messwerte,
      explanation: 'Der Primärschlüssel aus zwei Spalten ist ein <b>Tabellenconstraint</b> – direkt bei einer Spalte könnte man ihn nicht schreiben. Beide Spalten sind zugleich Fremdschlüssel (TSA und FSA in einem). Beim Parameter bleibt es beim Standard NO ACTION.',
    },
  },
  {
    type: SqlExercise,
    config: {
      title: 'Ü10 · Nachträglich ändern mit ALTER TABLE',
      level: 'schwer',
      task: 'In <code>p_patienten</code> fehlt der Fremdschlüssel – und die Daten sind nicht sauber (Patient 102 gehört zu einer Station, die es nicht gibt). Erledige mit einem Skript:<ol>'
        + '<li>Bereinige die Daten (der Patient bleibt erhalten, ohne Station).</li>'
        + '<li>Lege nachträglich den Fremdschlüssel <code>fk_p_st</code> von <code>p_st_statnr</code> auf <code>st_stationen</code> an; beim Löschen einer Station soll die Spalte auf NULL gesetzt werden.</li>'
        + '<li>Füge die Spalte <code>p_email</code> (Text bis 60 Zeichen, <b>einzigartig</b>) hinzu.</li></ol>',
      setup: `${DdlData.stationen}\n${DdlData.stationenDaten}
create table p_patienten (
  p_patnr     integer primary key,
  p_nachname  varchar(30) not null,
  p_st_statnr integer
);
insert into p_patienten values (100, 'Berger', 1), (101, 'Lang', 2), (102, 'Yilmaz', 7);`,
      rows: 10,
      checks: [
        { label: 'Skript läuft ohne Fehler – auch der FOREIGN KEY wird angenommen', test: (db) => !!Probe.tbl(db, 'p_patienten')?.fks.length },
        { label: 'Der FOREIGN KEY heißt fk_p_st und zeigt auf st_stationen', test: (db) => Probe.tbl(db, 'p_patienten')?.fks.some((f) => f.name === 'fk_p_st' && f.refTable === 'st_stationen' && f.cols.join() === 'p_st_statnr') },
        { label: 'Er hat ON DELETE SET NULL', test: (db) => Probe.tbl(db, 'p_patienten')?.fks.some((f) => f.name === 'fk_p_st' && f.onDelete === 'SET NULL') },
        { label: 'Alle drei Patient*innen sind noch da; Patient 102 hat keine Station mehr', test: (db) => db.rows('p_patienten').length === 3 && db.rows('p_patienten').find((p) => p.p_patnr === 102)?.p_st_statnr === null },
        { label: 'Neue Spalte p_email (VARCHAR)', test: (db) => Probe.col(db, 'p_patienten', 'p_email')?.base === 'VARCHAR' },
        { label: 'p_email ist UNIQUE', test: (db) => Probe.fails(db, "update p_patienten set p_email = 'x@y.at';") && Probe.ok(db, "update p_patienten set p_email = 'x@y.at' where p_patnr = 100;") },
      ],
      solutionSql: `-- 1. verwaiste Zeile bereinigen
update p_patienten set p_st_statnr = null where p_st_statnr = 7;

-- 2. Fremdschlüssel nachträglich
alter table p_patienten
  add constraint fk_p_st foreign key (p_st_statnr)
  references st_stationen (st_statnr) on delete set null;

-- 3. neue Spalte
alter table p_patienten add p_email varchar(60) unique;`,
      explanation: 'Beim <code>ALTER TABLE … ADD FOREIGN KEY</code> werden die <b>vorhandenen</b> Daten geprüft. Gäbe es noch die verwaiste Station 7, würde der Befehl scheitern – deshalb zuerst aufräumen (oder die Zeile löschen).',
    },
  },
  {
    type: SqlExercise,
    config: {
      title: 'Ü11 · Fremdschlüssel auf die eigene Tabelle',
      level: 'schwer',
      task: 'Ärzt*innen haben eine*n Oberärzt*in – ebenfalls aus derselben Tabelle. Lege <code>a_aerzte</code> an: <code>a_id</code> (ganze Zahl, Primärschlüssel), <code>a_nachname</code> (Text bis 30, Pflicht) und <code>a_a_oberarzt</code> (Fremdschlüssel auf <code>a_aerzte</code> selbst). '
        + 'Verlässt eine Oberärztin das Haus (Zeile gelöscht), soll bei ihren Mitarbeiter*innen NULL stehen.<br><span class="muted">Namensregel: Fremdschlüssel = eigenes Präfix <code>a_</code> + Präfix der Quelltabelle (<code>a_</code>) → <code>a_a_…</code></span>',
      rows: 9,
      checks: [
        { label: 'Tabelle a_aerzte mit a_id, a_nachname, a_a_oberarzt', test: (db) => ['a_id', 'a_nachname', 'a_a_oberarzt'].every((c) => Probe.col(db, 'a_aerzte', c)) },
        { label: 'a_id ist PRIMARY KEY, a_nachname ist Pflicht', test: (db) => Probe.tbl(db, 'a_aerzte')?.pk.join() === 'a_id' && Probe.fails(db, 'insert into a_aerzte (a_id) values (1);') },
        { label: 'FOREIGN KEY zeigt auf a_aerzte selbst', test: (db) => Probe.tbl(db, 'a_aerzte')?.fks.some((f) => f.refTable === 'a_aerzte' && f.cols.join() === 'a_a_oberarzt') },
        { label: 'Chefärztin (NULL) und Mitarbeiter (verweist auf 1) lassen sich einfügen, unbekannte Oberärztin 9 nicht', test: (db) => Probe.ok(db, "insert into a_aerzte values (1,'Wolf',null),(2,'Aksoy',1);") && Probe.fails(db, "insert into a_aerzte values (3,'Neu',9);") },
        { label: 'ON DELETE SET NULL: Oberärztin löschen → Mitarbeiter bleibt, Verweis = NULL', test: (db) => { const d = Probe.after(db, "insert into a_aerzte values (1,'Wolf',null),(2,'Aksoy',1); delete from a_aerzte where a_id = 1;"); return d.rows('a_aerzte').length === 1 && d.rows('a_aerzte')[0].a_a_oberarzt === null; } },
      ],
      solutionSql: `create table a_aerzte (
  a_id          integer primary key,
  a_nachname    varchar(30) not null,
  a_a_oberarzt  integer,
  foreign key (a_a_oberarzt) references a_aerzte (a_id)
    on delete set null
);`,
      explanation: 'Ein Fremdschlüssel darf auch auf die <b>eigene Tabelle</b> zeigen (rekursive Beziehung). Die Spalte muss NULL erlauben – sonst könnte man die oberste Person nie einfügen.',
    },
  },
];
