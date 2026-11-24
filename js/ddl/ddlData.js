/**
 * Shared example data of the SQL DDL chapter: the laboratory database from chapter 01,
 * now with the naming conventions of the lecture (lower case, plural, table prefix, FK = own + source prefix).
 * All persons are fictitious.
 */
const DdlData = {
  stationen: `create table st_stationen (
  st_statnr  integer primary key,
  st_name    varchar(40) not null unique,
  st_betten  integer default 20 check (st_betten > 0)
);`,

  /** @param {string} onDelete e.g. 'set null'  @param {string} onUpdate e.g. 'cascade' */
  patienten(onDelete = 'set null', onUpdate = 'cascade') {
    return `create table p_patienten (
  p_patnr          integer primary key,
  p_nachname       varchar(30) not null,
  p_vorname        varchar(30) not null,
  p_geburtsdatum   date,
  p_st_statnr      integer,
  foreign key (p_st_statnr) references st_stationen (st_statnr)
    on delete ${onDelete} on update ${onUpdate}
);`;
  },

  laborparameter: `create table lp_laborparameter (
  lp_parameter  varchar(20) primary key,
  lp_einheit    varchar(10) not null
);`,

  messwerte: `create table m_messwerte (
  m_p_patnr       integer,
  m_lp_parameter  varchar(20),
  m_wert          decimal(7,2) not null,
  primary key (m_p_patnr, m_lp_parameter),
  foreign key (m_p_patnr) references p_patienten (p_patnr) on delete cascade,
  foreign key (m_lp_parameter) references lp_laborparameter (lp_parameter)
);`,

  stationenDaten: `insert into st_stationen (st_statnr, st_name, st_betten) values
  (1, 'Innere Medizin', 24),
  (2, 'Chirurgie', 18),
  (3, 'Kardiologie', 12);`,

  patientenDaten: `insert into p_patienten (p_patnr, p_nachname, p_vorname, p_geburtsdatum, p_st_statnr) values
  (100, 'Berger', 'Lisa', '2008-04-12', 1),
  (101, 'Lang', 'Tobias', '2007-09-30', 2),
  (102, 'Yilmaz', 'Emre', '1985-11-02', 2),
  (103, 'Steiner', 'Mira', '2008-01-05', 3);`,

  laborparameterDaten: `insert into lp_laborparameter (lp_parameter, lp_einheit) values
  ('Haemoglobin', 'g/dl'),
  ('Glukose', 'mg/dl'),
  ('Kalium', 'mmol/l');`,

  messwerteDaten: `insert into m_messwerte (m_p_patnr, m_lp_parameter, m_wert) values
  (100, 'Haemoglobin', 13.4),
  (100, 'Glukose', 92),
  (101, 'Kalium', 4.1),
  (102, 'Glukose', 118.5);`,

  /** Complete lab database (structure + data), optionally with chosen FK actions. */
  all(onDelete = 'set null', onUpdate = 'cascade') {
    return [
      DdlData.stationen, DdlData.patienten(onDelete, onUpdate), DdlData.laborparameter, DdlData.messwerte,
      DdlData.stationenDaten, DdlData.patientenDaten, DdlData.laborparameterDaten, DdlData.messwerteDaten,
    ].join('\n\n');
  },

  /** A ready database object with the complete lab data. */
  database(onDelete, onUpdate) {
    const db = new MiniSql();
    db.run(DdlData.all(onDelete, onUpdate));
    return db;
  },
};
