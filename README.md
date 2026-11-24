# MIS-Labor (MIS)

Interaktive Lern-Webapp für Datenbanken im Gegenstand MIS: Konzepte verstehen (Animationen, Demos) und üben
(Übungen mit Prüfen/Lösung). Die Beispiele kommen aus Medizin und Labor – **alle Personen und Befunde sind frei erfunden**.

## Starten

- `index.html` im Browser öffnen (Doppelklick genügt, `file://` funktioniert) **oder**
- in VS Code mit der Extension *Live Server*.

Keine Installation, kein Build, keine externen Requests – die App läuft komplett offline.

## Deployment (GitHub Pages)

1. Angaben in `impressum.html` prüfen (Offenlegung nach § 25 MedienG).
2. Repository auf GitHub anlegen und `main` pushen.
3. **Settings → Pages**: *Source* = „Deploy from a branch“, *Branch* = `main`, Ordner `/ (root)`.

`.nojekyll` schaltet Jekyll ab; alle Pfade sind relativ.

## Kapitel

| Nr | Seite | Thema | Inhalt | Übungen |
|---|---|---|---|---|
| 01 | `normalisierung.html` | Normalisierung (1.–3. NF) | Anomalie-Demo, FD-Detektiv, Schritt-für-Schritt-Animation (Laborbefund → Station/Patient/Messwert/Laborparameter), Merksätze | 5 |
| 02 | `ddl.html` | SQL DDL | Schritt-für-Schritt `CREATE TABLE`, Constraint-Labor, ON DELETE/UPDATE-Labor, SQL-Spielwiese (läuft im Browser), Merksätze | 11 |

Jedes Kapitel hat denselben Aufbau: **Teil 1 – Verstehen** und **Teil 2 – Üben** (leicht → schwer).

### Beispiel Kapitel 01

Ausgangstabelle `Laborbefund (PatNr, Name, Station, Laborwerte)` mit nicht atomaren Werten und einer Wiederholungsgruppe.
Ergebnis in 3. NF:

```
Station (StatNr, Station)
Patient (PatNr, Nachname, Vorname, StatNr → Station)
Messwert (PatNr → Patient, Parameter → Laborparameter, Wert)
Laborparameter (Parameter, Einheit)
```

Die Daten stehen einmal (normalisiert) in `js/normalisierung/labData.js`; alle Zwischenschritte werden in
`normScenes.js` daraus erzeugt. Jede Szene beschreibt den kompletten sichtbaren Zustand (Tabellen, Markierungen,
funktionale Abhängigkeiten, Text) – deshalb kann man frei vor- und zurückspringen.

## Technik

- Plain HTML, CSS und JavaScript – **kein** Framework, kein Node, keine ES-Module (klassische `<script>`-Tags,
  damit die Seiten auch per `file://` laufen).
- Eine Klasse pro Datei; Code und Kommentare auf Englisch, Texte für Schüler*innen auf Deutsch.
- Schriften (Titillium Web, JetBrains Mono) liegen lokal in `fonts/` (DSGVO, keine Google Fonts), Lizenz SIL OFL 1.1.
- Animationen respektieren `prefers-reduced-motion`.

## Ordnerstruktur

```
index.html              Startseite mit den Kapiteln
normalisierung.html     Kapitel 01
impressum.html          Offenlegung, Datenschutz
css/styles.css          gemeinsames Stylesheet (Design-Tokens in :root)
img/logo.svg            Logo / Favicon
fonts/                  Schriftdateien + Lizenzen
js/common/              von allen Kapiteln nutzbar
  nav.js                markiert den aktuellen Teil in der Abschnittsleiste
  relationView.js       Tabelle (Relation) mit PK/FK, Spalten-/Zeilenmarkierung, Redundanz-Erkennung
  flip.js               FLIP-Animation: Werte "fliegen" zwischen Tabellen
  sceneStepper.js       Basisklasse für Schritt-Erklärungen (vor/zurück, Auto, Punkte, Pfeiltasten)
  dragDrop.js           Drag & Drop + Klick/Tastatur-Alternative
js/exercises/           Übungstypen (Basisklasse Exercise + Unterklassen)
js/normalisierung/      Kapitel 01 (Daten, Szenen, Animation, Demos, Übungskatalog, normPage.js)
```

### Übungstypen (`js/exercises/`)

| Klasse | Art | verwendet in |
|---|---|---|
| `DragMatchExercise` | Karten per Drag & Drop in Kategorien ziehen | 01 |
| `ColumnPickExercise` | Spaltenköpfe anklicken (z. B. „verletzt 1NF“) | 01 |
| `ChoiceQuiz` | Einfachauswahl, mehrere Fragen mit gleichen Optionen | 01 |
| `SchemaBuilderExercise` | Attribute in Zieltabellen ziehen (Zerlegung), Lösung als Schema mit PK/FK | 01 |

Alle erben von `Exercise` (Template Method: `renderBody`, `evaluate`, `applySolution`). Die Inhalte stehen getrennt
vom Code im Übungskatalog des Kapitels (`normExercises.js`) – neue Aufgaben sind meist nur ein neuer Eintrag dort.

## Neues Kapitel hinzufügen

1. `kapitel.html` nach dem Muster von `normalisierung.html` anlegen (Hero, Abschnittsleiste, Teil 1, Teil 2, Footer).
2. Ordner `js/<kapitel>/` mit Daten, Demos, Übungskatalog und `<kapitel>Page.js` als Einstiegspunkt.
3. Wiederverwenden: `RelationView`, `SceneStepper` + `Flip` (für Schritt-Animationen), `DragDrop`, Übungstypen.
4. Kachel in `index.html` ergänzen (Platzhalter „Demnächst“ ersetzen) und in **allen** Seiten Kapitelnavigation
   (`.chapter-nav`) und Footer-Links ergänzen.
5. Diese README erweitern (Kapiteltabelle, ggf. neue Übungstypen).

## Änderungsprotokoll

- **Kapitel 01 – Normalisierung:** Seite `normalisierung.html` mit Anomalie-Demo, FD-Detektiv, Animation UNF → 3NF und 5 Übungen.

### Kapitel 02: SQL DDL und die Mini-SQL-Engine

Die Seite führt SQL **wirklich aus**: `js/ddl/sqlEngine.js` (`MiniSql`) ist eine kleine, abhängigkeitsfreie SQL-Engine im MySQL-Stil mit deutschen Fehlermeldungen.
Sie versteht `CREATE/ALTER/DROP/RENAME TABLE`, `CREATE/DROP INDEX`, `INSERT`, `UPDATE`, `DELETE`, ein einfaches `SELECT` und die Constraints
`NOT NULL`, `DEFAULT`, `AUTO_INCREMENT`, `PRIMARY KEY`, `UNIQUE`, `CHECK` und `FOREIGN KEY` (`ON DELETE/UPDATE` mit `NO ACTION`, `CASCADE`, `SET NULL`).
Die SQL-Übungen prüfen das Verhalten (z. B. „wird Station 9 abgelehnt?“) statt den Text zu vergleichen.

Tests der Engine (Node ≥ 18, keine Installation nötig):

```
node --test tests/
```
