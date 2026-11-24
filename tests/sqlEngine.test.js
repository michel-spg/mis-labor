// Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert/strict');
const { MiniSql } = require('../js/ddl/sqlEngine.js');

const LAB = `
create table st_stationen (
  st_statnr integer primary key,
  st_name varchar(40) not null unique,
  st_betten integer default 20 check (st_betten > 0)
);
create table p_patienten (
  p_patnr integer,
  p_nachname varchar(30) not null,
  p_geburtsdatum date,
  p_st_statnr integer,
  primary key (p_patnr),
  foreign key (p_st_statnr) references st_stationen (st_statnr) on delete set null on update cascade
);
insert into st_stationen (st_statnr, st_name) values (1,'Innere'),(2,'Chirurgie');
insert into p_patienten values (100,'Berger','2008-04-12',1),(101,'Lang','2007-09-30',2);
`;

const ok = (results) => results.forEach((r) => assert.ok(r.ok, `${r.sql} -> ${r.message}`));
const fails = (results, re) => {
  const bad = results.find((r) => !r.ok);
  assert.ok(bad, 'expected an error');
  assert.match(bad.message, re);
};

test('creates tables and inserts', () => {
  const db = new MiniSql();
  ok(db.run(LAB));
  assert.equal(db.rows('st_stationen')[0].st_betten, 20);
  assert.deepEqual(db.table('p_patienten').pk, ['p_patnr']);
});

test('constraint violations', () => {
  const db = new MiniSql();
  ok(db.run(LAB));
  fails(db.run("insert into p_patienten values (102,'X','2000-01-01',9);"), /FOREIGN KEY/);
  fails(db.run("insert into p_patienten values (100,'X','2000-01-01',1);"), /Doppelter Eintrag/);
  fails(db.run("insert into st_stationen values (3,'Innere',10);"), /UNIQUE/);
  fails(db.run("insert into st_stationen values (3,'Neu',-3);"), /CHECK/);
  fails(db.run("insert into st_stationen (st_statnr) values (3);"), /NULL/);
  fails(db.run("insert into p_patienten values (103,'X','12.04.2000',1);"), /JJJJ-MM-TT/);
  fails(db.run("insert into p_patienten values (103,'1234567890123456789012345678901','2000-01-01',1);"), /zu lang/);
});

test('failed statement is rolled back and stops the script', () => {
  const db = new MiniSql();
  ok(db.run(LAB));
  const res = db.run("insert into st_stationen values (3,'A',5),(4,'Innere',5); insert into st_stationen values (5,'B',5);");
  assert.equal(res[0].ok, false);
  assert.equal(res[1].skipped, true);
  assert.equal(db.rows('st_stationen').length, 2);
});

test('ON DELETE SET NULL / ON UPDATE CASCADE', () => {
  const db = new MiniSql();
  ok(db.run(LAB));
  ok(db.run('update st_stationen set st_statnr = 10 where st_statnr = 1;'));
  assert.equal(db.rows('p_patienten')[0].p_st_statnr, 10);
  ok(db.run('delete from st_stationen where st_statnr = 10;'));
  assert.equal(db.rows('p_patienten')[0].p_st_statnr, null);
});

test('ON DELETE default is NO ACTION; CASCADE deletes children', () => {
  const db = new MiniSql();
  ok(db.run(`create table a (a_id integer primary key);
    create table b (b_id integer primary key, b_a_id integer, foreign key (b_a_id) references a(a_id));
    insert into a values (1); insert into b values (1,1);`));
  fails(db.run('delete from a where a_id = 1;'), /verweist noch darauf/);
  fails(db.run('drop table a;'), /FOREIGN KEY/);
  ok(db.run('alter table b drop foreign key b_ibfk_1; alter table b add foreign key (b_a_id) references a(a_id) on delete cascade;'));
  ok(db.run('delete from a where a_id = 1;'));
  assert.equal(db.rows('b').length, 0);
});

test('composite primary key and syntax errors', () => {
  const db = new MiniSql();
  ok(db.run(LAB + `create table lp_laborparameter (lp_parameter varchar(20) primary key, lp_einheit varchar(10));
    create table m_messwerte (m_p_patnr integer, m_lp_parameter varchar(20), m_wert decimal(7,2) not null,
      primary key (m_p_patnr, m_lp_parameter),
      foreign key (m_p_patnr) references p_patienten (p_patnr) on delete cascade,
      foreign key (m_lp_parameter) references lp_laborparameter (lp_parameter));
    insert into lp_laborparameter values ('Hb','g/dl');
    insert into m_messwerte values (100,'Hb',13.5);`));
  fails(db.run("insert into m_messwerte values (100,'Hb',14.1);"), /Doppelter Eintrag/);
  fails(db.run("insert into m_messwerte values (100,'Hb',1234567.1);"), /passt nicht/);
  fails(db.run('create table x (a integer b integer);'), /Syntaxfehler/);
  fails(db.run('create table x (a text, b varchar);'), /Länge/);
  fails(db.run('create table x (a integer references p_patienten(p_patnr));'), /ignoriert/);
  fails(db.run('create table x (a unbekannt);'), /Datentyp/);
  fails(db.run('create table y (a integer, foreign key (a) references nirgends(a));'), /gibt es \(noch\) nicht/);
  fails(db.run('create table z (a integer) create table w (b integer);'), /Syntaxfehler/);
});

test('alter table validates existing data', () => {
  const db = new MiniSql();
  ok(db.run(`create table a (a_id integer primary key);
    create table b (b_id integer primary key, b_a_id integer);
    insert into a values (1); insert into b values (1,1),(2,7);`));
  fails(db.run('alter table b add foreign key (b_a_id) references a(a_id);'), /bereits vorhandene Daten/);
  ok(db.run('update b set b_a_id = 1 where b_id = 2; alter table b add constraint fk_ba foreign key (b_a_id) references a(a_id);'));
  ok(db.run('alter table b add b_note varchar(20) default \'-\'; alter table b drop column b_note;'));
  fails(db.run('alter table b add b_x integer not null;'), /DEFAULT/);
});

test('self reference and select', () => {
  const db = new MiniSql();
  ok(db.run(`create table a_aerzte (a_id integer primary key, a_name varchar(20), a_a_chef integer,
     foreign key (a_a_chef) references a_aerzte(a_id) on delete set null);
     insert into a_aerzte values (1,'Dr. A',null),(2,'Dr. B',1);`));
  const r = db.run('select a_name from a_aerzte where a_a_chef = 1;');
  assert.deepEqual(r[0].rows, [['Dr. B']]);
  ok(db.run('delete from a_aerzte where a_id = 1;'));
  assert.equal(db.rows('a_aerzte')[0].a_a_chef, null);
});
