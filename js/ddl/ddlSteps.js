/**
 * Step-by-step animation "Vom Entwurf zum CREATE TABLE": the statement grows from scene to scene.
 * Each scene's script is executed by MiniSql, so the structure shown below the code is always real.
 * Script lines start with '+' (new in this scene) or ' ' (unchanged).
 */
class DdlSteps extends SceneStepper {
  static SCENES = [
    {
      title: 'Tabelle benennen',
      text: '<p>Jede Tabelle beginnt mit <code>CREATE TABLE</code> und einem <b>Namen</b>. Nach der Namenskonvention: <b>klein</b>, <b>Mehrzahl</b>, '
        + 'ohne Umlaute und mit einem <b>Präfix</b> (hier <code>st_</code> für Stationen).</p>'
        + '<p>Alle Spalten stehen in <b>runden Klammern</b>; der Befehl endet mit <code>;</code>. Wir beginnen mit dem Schlüssel.</p>',
      sql: ['+create table st_stationen (', '+  st_statnr integer', ' );'],
    },
    {
      title: 'Spalten und Datentypen',
      text: '<p>Jede Spalte hat einen <b>Namen</b> (mit demselben Präfix <code>st_</code>) und einen <b>Datentyp</b>. Spalten werden durch <b>Kommas</b> getrennt – nach der letzten steht keines.</p>'
        + '<p><code>varchar(40)</code>: Text mit höchstens 40 Zeichen. <code>integer</code>: ganze Zahl.</p>',
      sql: ['+create table st_stationen (', '+  st_statnr integer,', '+  st_name   varchar(40),', '+  st_betten integer', ' );'],
    },
    {
      title: 'NOT NULL und DEFAULT',
      text: '<p>Jede Station braucht einen Namen: <code>not null</code> verbietet leere Werte.</p>'
        + '<p><code>default 20</code> ist der <b>Vorgabewert</b>: Wird beim Einfügen keine Bettenzahl angegeben, setzt die Datenbank 20 ein.</p>'
        + '<p class="muted">Das sind <b>Spaltenconstraints</b> – sie stehen direkt bei der Spalte.</p>',
      sql: [' create table st_stationen (', '   st_statnr integer,', '+  st_name   varchar(40) not null,', '+  st_betten integer default 20', ' );'],
    },
    {
      title: 'PRIMARY KEY',
      text: '<p>Der <b>Primärschlüssel</b> identifiziert jede Zeile eindeutig und darf nie NULL sein. Man kann ihn direkt bei der Spalte schreiben '
        + '(<code>st_statnr integer primary key</code>) oder – wie hier – als <b>Tabellenconstraint</b> nach allen Spalten.</p>'
        + '<p>Der Tabellenconstraint ist <b>nötig</b>, sobald der Schlüssel aus <b>mehreren</b> Spalten besteht (Teilschlüssel, z. B. bei Messwerten).</p>',
      sql: [' create table st_stationen (', '   st_statnr integer,', '   st_name   varchar(40) not null,', '+  st_betten integer default 20,', '+  primary key (st_statnr)', ' );'],
    },
    {
      title: 'UNIQUE und CHECK',
      text: '<p><code>unique</code>: Kein Wert darf zweimal vorkommen – hier darf keine Station doppelt heißen, obwohl der Name nicht der Primärschlüssel ist.</p>'
        + '<p><code>check (…)</code>: Eine <b>Bedingung</b>, die jede Zeile erfüllen muss – hier mehr als 0 Betten.</p>',
      sql: [' create table st_stationen (', '   st_statnr integer,', '+  st_name   varchar(40) not null unique,', '+  st_betten integer default 20 check (st_betten > 0),', '   primary key (st_statnr)', ' );'],
    },
    {
      title: 'FOREIGN KEY',
      text: '<p>Die zweite Tabelle <code>p_patienten</code> verweist auf die Station. Der <b>Fremdschlüssel</b> <code>p_st_statnr</code> trägt <b>zuerst</b> das Präfix der eigenen Tabelle (<code>p_</code>), '
        + '<b>dann</b> das der Quelltabelle (<code>st_</code>).</p>'
        + '<p><code>foreign key (…) references tabelle (spalte)</code> sorgt für <b>referentielle Integrität</b>: Es sind nur Stationsnummern erlaubt, die es wirklich gibt (oder NULL).</p>'
        + '<p class="muted">Die Elterntabelle (<code>st_stationen</code>) muss <b>vorher</b> existieren.</p>',
      sql: [' create table st_stationen (', '   st_statnr integer,', '   st_name   varchar(40) not null unique,', '   st_betten integer default 20 check (st_betten > 0),', '   primary key (st_statnr)', ' );', ' ',
        '+create table p_patienten (', '+  p_patnr     integer,', '+  p_nachname  varchar(30) not null,', '+  p_st_statnr integer,', '+  primary key (p_patnr),', '+  foreign key (p_st_statnr) references st_stationen (st_statnr)', '+);'],
    },
    {
      title: 'ON DELETE / ON UPDATE',
      text: '<p>Was passiert, wenn man eine Station löscht, auf die noch Patient*innen verweisen? Das legst du am Fremdschlüssel fest:</p>'
        + '<ul><li><b>NO ACTION</b> (Standard): Löschen wird <b>verweigert</b>.</li><li><b>CASCADE</b>: Die Patient*innen werden <b>mitgelöscht</b> bzw. mitgeändert.</li>'
        + '<li><b>SET NULL</b>: Der Fremdschlüssel wird auf <b>NULL</b> gesetzt.</li></ul>'
        + '<p>Ausprobieren kannst du das weiter unten im Abschnitt „FOREIGN KEY: ON DELETE und ON UPDATE“.</p>',
      sql: [' create table st_stationen (', '   st_statnr integer,', '   st_name   varchar(40) not null unique,', '   st_betten integer default 20 check (st_betten > 0),', '   primary key (st_statnr)', ' );', ' ',
        ' create table p_patienten (', '   p_patnr     integer,', '   p_nachname  varchar(30) not null,', '   p_st_statnr integer,', '   primary key (p_patnr),', '   foreign key (p_st_statnr) references st_stationen (st_statnr)',
        '+    on delete set null', '+    on update cascade', ' );'],
    },
    {
      title: 'Daten einfügen',
      text: '<p>Mit <code>INSERT INTO</code> kommen die Zeilen in die Tabellen (das ist <b>DML</b>, nicht mehr DDL). Reihenfolge: <b>erst die Eltern, dann die Kinder</b> – '
        + 'sonst verletzt der Fremdschlüssel die Regel.</p>'
        + '<p class="muted">Tipp aus der Vorlesung: Man kann die FOREIGN KEYs auch erst <b>nach</b> dem Einfügen mit <code>ALTER TABLE … ADD</code> anlegen; dann wird alles auf einmal geprüft.</p>',
      sql: [' create table st_stationen (', '   st_statnr integer,', '   st_name   varchar(40) not null unique,', '   st_betten integer default 20 check (st_betten > 0),', '   primary key (st_statnr)', ' );', ' ',
        ' create table p_patienten (', '   p_patnr     integer,', '   p_nachname  varchar(30) not null,', '   p_st_statnr integer,', '   primary key (p_patnr),', '   foreign key (p_st_statnr) references st_stationen (st_statnr)',
        '     on delete set null on update cascade', ' );', ' ',
        "+insert into st_stationen (st_statnr, st_name) values (1, 'Innere Medizin'), (2, 'Chirurgie');", ' ',
        "+insert into p_patienten values (100, 'Berger', 1), (101, 'Lang', 2), (102, 'Yilmaz', 2);"],
    },
  ];

  constructor(root) {
    super(root, DdlSteps.SCENES);
    root.innerHTML = `
      <div class="step-toolbar">
        <div class="controls">
          <button class="btn" data-act="first" title="Zum Anfang">⏮</button>
          <button class="btn" data-act="prev">← Zurück</button>
          <button class="btn primary" data-act="next">Weiter →</button>
          <button class="btn ghost-btn" data-act="play">▶ Automatisch</button>
        </div>
        <div class="step-dots" role="group" aria-label="Schritte"></div>
      </div>
      <div class="scene-head"><h4></h4><span class="scene-count"></span></div>
      <div class="narration" aria-live="polite"></div>
      <div class="ddl-split">
        <div><h4 class="mini-h">SQL-Skript</h4><div class="ddl-code"></div></div>
        <div><h4 class="mini-h">Ergebnis in der Datenbank</h4><div class="ddl-result"></div></div>
      </div>`;
    this.init();
  }

  showScene(scene, i) {
    const r = this.root;
    r.querySelector('.scene-head h4').textContent = `${i + 1}. ${scene.title}`;
    r.querySelector('.scene-count').textContent = `Schritt ${i + 1} von ${this.scenes.length}`;
    r.querySelector('.narration').innerHTML = scene.text;
    r.querySelector('.ddl-code').innerHTML = DdlView.sqlBlock(scene.sql.join('\n'), { marks: true });
    const db = new MiniSql();
    const results = db.run(scene.sql.map((l) => l.slice(1)).join('\n'));
    let html = DdlView.schemaHtml(db);
    if (results.some((x) => !x.ok)) html += `<p class="feedback wrong">${DdlView.esc(results.find((x) => !x.ok).message)}</p>`;
    if (db.table('st_stationen')?.rows.length) {
      html += `<div class="data-pair">${DdlView.dataHtml(db, 'st_stationen')}${DdlView.dataHtml(db, 'p_patienten')}</div>`;
    }
    r.querySelector('.ddl-result').innerHTML = html;
  }

  durationFor() { return 7000; }
}
