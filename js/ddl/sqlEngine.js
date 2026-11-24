/**
 * MiniSql – a tiny in-browser SQL engine for teaching DDL (MySQL flavour, German messages).
 *
 * Supports: CREATE/DROP DATABASE + USE (no-ops, one database only), CREATE/ALTER/DROP/RENAME TABLE,
 * CREATE/DROP INDEX, INSERT, UPDATE, DELETE and a minimal SELECT (columns or *, WHERE, ORDER BY).
 * Constraints: NOT NULL, DEFAULT, AUTO_INCREMENT, PRIMARY KEY, UNIQUE, CHECK,
 * FOREIGN KEY (ON DELETE / ON UPDATE: NO ACTION, RESTRICT, CASCADE, SET NULL).
 *
 * Usage:  const db = new MiniSql();  db.run('create table ...;')  ->  [{sql, ok, message, ...}]
 * Works in the browser (global MiniSql, SqlError) and in node (module.exports).
 */
class SqlError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

/* ------------------------------------------------------------------ tokenizer */

const SQL_SYMBOLS = ['<=', '>=', '<>', '!=', '(', ')', ',', ';', '.', '=', '<', '>', '+', '-', '*', '/', '%'];

function tokenize(sql) {
  const tokens = [];
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const c = sql[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '#' || (c === '-' && sql[i + 1] === '-' && (i + 2 >= n || /\s/.test(sql[i + 2])))) {
      while (i < n && sql[i] !== '\n') i++;
      continue;
    }
    if (c === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2);
      i = end < 0 ? n : end + 2;
      continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      let value = '';
      for (;;) {
        if (j >= n) throw new SqlError('Der Text ab Zeichen ' + (i + 1) + ' ist nicht mit einem Hochkomma abgeschlossen.', 1064);
        if (sql[j] === '\\' && j + 1 < n) { value += sql[j + 1]; j += 2; continue; }
        if (sql[j] === c) {
          if (sql[j + 1] === c) { value += c; j += 2; continue; }
          break;
        }
        value += sql[j++];
      }
      tokens.push({ t: 'str', v: value, raw: sql.slice(i, j + 1) });
      i = j + 1;
      continue;
    }
    if (c === '`') {
      const end = sql.indexOf('`', i + 1);
      if (end < 0) throw new SqlError('Der Name ab Zeichen ' + (i + 1) + ' ist nicht mit einem Backtick abgeschlossen.', 1064);
      tokens.push({ t: 'word', v: sql.slice(i + 1, end), u: sql.slice(i + 1, end).toUpperCase(), raw: sql.slice(i, end + 1), quoted: true });
      i = end + 1;
      continue;
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(sql[i + 1] ?? ''))) {
      const m = /^(\d+(\.\d*)?|\.\d+)([eE][+-]?\d+)?/.exec(sql.slice(i));
      tokens.push({ t: 'num', v: Number(m[0]), raw: m[0] });
      i += m[0].length;
      continue;
    }
    if (/[A-Za-z_]/.test(c)) {
      const m = /^[A-Za-z_][A-Za-z0-9_$]*/.exec(sql.slice(i));
      tokens.push({ t: 'word', v: m[0], u: m[0].toUpperCase(), raw: m[0] });
      i += m[0].length;
      continue;
    }
    const sym = SQL_SYMBOLS.find((s) => sql.startsWith(s, i));
    if (!sym) throw new SqlError(`Unerlaubtes Zeichen „${c}“ (Zeichen ${i + 1}).`, 1064);
    tokens.push({ t: 'sym', v: sym, raw: sym });
    i += sym.length;
  }
  return tokens;
}

/** Splits a token list into statements at ';'. */
function splitStatements(tokens, sql) {
  const out = [];
  let current = [];
  tokens.forEach((tok) => {
    if (tok.t === 'sym' && tok.v === ';') {
      if (current.length) out.push(current);
      current = [];
    } else current.push(tok);
  });
  if (current.length) out.push(current);
  return out.map((toks) => ({ tokens: toks, text: toks.map((t) => t.raw).join(' ') }));
}

/* ------------------------------------------------------------------ token cursor */

class Cursor {
  constructor(tokens) {
    this.tokens = tokens;
    this.pos = 0;
  }

  get done() { return this.pos >= this.tokens.length; }
  peek(offset = 0) { return this.tokens[this.pos + offset]; }
  next() { return this.tokens[this.pos++]; }

  isKw(...words) {
    return words.every((w, i) => {
      const t = this.peek(i);
      return t && t.t === 'word' && !t.quoted && t.u === w;
    });
  }

  eatKw(...words) {
    if (!this.isKw(...words)) return false;
    this.pos += words.length;
    return true;
  }

  expectKw(...words) {
    if (!this.eatKw(...words)) this.fail(`„${words.join(' ')}“ erwartet`);
  }

  isSym(s) { const t = this.peek(); return !!t && t.t === 'sym' && t.v === s; }
  eatSym(s) { if (this.isSym(s)) { this.pos++; return true; } return false; }
  expectSym(s) { if (!this.eatSym(s)) this.fail(`„${s}“ erwartet`); }

  /** Reads an identifier (table / column / constraint name) and returns it lower-cased. */
  ident(what = 'Name') {
    const t = this.next();
    if (!t || t.t !== 'word') {
      this.pos--;
      this.fail(`${what} erwartet`);
    }
    return t.v.toLowerCase();
  }

  /** Reads "(a, b, c)" as list of identifiers. */
  identList() {
    this.expectSym('(');
    const list = [this.ident('Spaltenname')];
    while (this.eatSym(',')) list.push(this.ident('Spaltenname'));
    this.expectSym(')');
    return list;
  }

  fail(expected) {
    const t = this.tokens[this.pos];
    const near = t ? `bei „${t.raw}“` : 'am Ende des Befehls';
    throw new SqlError(`Syntaxfehler ${near}: ${expected}.${t && this.pos > 0 ? ' Fehlt davor vielleicht ein Komma oder ein Semikolon?' : ''}`, 1064);
  }

  expectEnd() {
    if (!this.done) this.fail('Befehlsende erwartet');
  }
}

/* ------------------------------------------------------------------ expressions (CHECK / WHERE / SET) */

class ExprParser {
  constructor(cursor) { this.c = cursor; }

  parse() { return this.#or(); }

  #or() {
    let l = this.#and();
    while (this.c.eatKw('OR') || this.c.eatSym('||')) l = { k: 'bin', op: 'OR', l, r: this.#and() };
    return l;
  }

  #and() {
    let l = this.#not();
    while (this.c.eatKw('AND')) l = { k: 'bin', op: 'AND', l, r: this.#not() };
    return l;
  }

  #not() {
    if (this.c.eatKw('NOT')) return { k: 'not', e: this.#not() };
    return this.#cmp();
  }

  #cmp() {
    const l = this.#add();
    const c = this.c;
    if (c.eatKw('IS')) {
      const neg = c.eatKw('NOT');
      c.expectKw('NULL');
      return { k: 'isnull', e: l, neg };
    }
    let neg = false;
    if (c.isKw('NOT') && (c.isKw('NOT', 'BETWEEN') || c.isKw('NOT', 'IN') || c.isKw('NOT', 'LIKE'))) { c.next(); neg = true; }
    if (c.eatKw('BETWEEN')) {
      const lo = this.#add();
      c.expectKw('AND');
      return { k: 'between', e: l, lo, hi: this.#add(), neg };
    }
    if (c.eatKw('IN')) {
      c.expectSym('(');
      const list = [this.#or()];
      while (c.eatSym(',')) list.push(this.#or());
      c.expectSym(')');
      return { k: 'in', e: l, list, neg };
    }
    if (c.eatKw('LIKE')) return { k: 'like', e: l, p: this.#add(), neg };
    const t = c.peek();
    if (t && t.t === 'sym' && ['=', '<>', '!=', '<', '<=', '>', '>='].includes(t.v)) {
      c.next();
      return { k: 'bin', op: t.v === '!=' ? '<>' : t.v, l, r: this.#add() };
    }
    return l;
  }

  #add() {
    let l = this.#mul();
    while (this.c.isSym('+') || this.c.isSym('-')) l = { k: 'bin', op: this.c.next().v, l, r: this.#mul() };
    return l;
  }

  #mul() {
    let l = this.#unary();
    while (this.c.isSym('*') || this.c.isSym('/') || this.c.isSym('%')) l = { k: 'bin', op: this.c.next().v, l, r: this.#unary() };
    return l;
  }

  #unary() {
    if (this.c.eatSym('-')) return { k: 'neg', e: this.#unary() };
    if (this.c.eatSym('+')) return this.#unary();
    return this.#primary();
  }

  #primary() {
    const c = this.c;
    const t = c.next();
    if (!t) { c.pos--; c.fail('Wert oder Spaltenname erwartet'); }
    if (t.t === 'num') return { k: 'lit', v: t.v };
    if (t.t === 'str') return { k: 'lit', v: t.v };
    if (t.t === 'sym' && t.v === '(') {
      const e = this.#or();
      c.expectSym(')');
      return e;
    }
    if (t.t === 'word' && !t.quoted) {
      if (t.u === 'NULL') return { k: 'lit', v: null };
      if (t.u === 'TRUE') return { k: 'lit', v: 1 };
      if (t.u === 'FALSE') return { k: 'lit', v: 0 };
      if (c.isSym('(')) { c.pos--; c.fail(`Die Funktion ${t.u}() kennt das Labor nicht`); }
    }
    if (t.t === 'word') {
      let name = t.v.toLowerCase();
      if (c.isSym('.') && c.peek(1)?.t === 'word') { c.next(); name = c.next().v.toLowerCase(); }
      return { k: 'col', name };
    }
    c.pos--;
    c.fail('Wert oder Spaltenname erwartet');
    return null;
  }
}

const Expr = {
  /** Parses an expression from the cursor; returns {ast, text}. */
  parse(cursor) {
    const start = cursor.pos;
    const ast = new ExprParser(cursor).parse();
    const text = cursor.tokens.slice(start, cursor.pos).map((t) => t.raw).join(' ').replace(/\( /g, '(').replace(/ \)/g, ')').replace(/ ,/g, ',');
    return { ast, text };
  },

  columns(ast, out = new Set()) {
    if (!ast) return out;
    if (ast.k === 'col') out.add(ast.name);
    ['e', 'l', 'r', 'lo', 'hi', 'p'].forEach((key) => ast[key] && Expr.columns(ast[key], out));
    (ast.list ?? []).forEach((x) => Expr.columns(x, out));
    return out;
  },

  /** Three-valued evaluation: returns number | string | null. */
  evaluate(ast, row) {
    const ev = (a) => Expr.evaluate(a, row);
    const bool = (v) => (v === null || v === undefined ? null : (typeof v === 'string' ? Number(v) !== 0 && !Number.isNaN(Number(v)) : v !== 0));
    const num = (v) => (v === null ? null : (typeof v === 'number' ? v : Number(v)));
    const cmp = (a, b) => {
      if (a === null || b === null) return null;
      const bothNum = typeof a === 'number' && typeof b === 'number';
      if (bothNum) return a - b;
      const na = Number(a);
      const nb = Number(b);
      if (!Number.isNaN(na) && !Number.isNaN(nb) && String(a).trim() !== '' && String(b).trim() !== '' && (typeof a === 'number' || typeof b === 'number')) return na - nb;
      const sa = String(a).toLowerCase();
      const sb = String(b).toLowerCase();
      return sa < sb ? -1 : sa > sb ? 1 : 0;
    };
    const asInt = (b) => (b === null ? null : b ? 1 : 0);
    switch (ast.k) {
      case 'lit': return ast.v;
      case 'col': {
        if (!(ast.name in row)) throw new SqlError(`Unbekannte Spalte „${ast.name}“.`, 1054);
        return row[ast.name];
      }
      case 'neg': { const v = num(ev(ast.e)); return v === null ? null : -v; }
      case 'not': return asInt(((b) => (b === null ? null : !b))(bool(ev(ast.e))));
      case 'isnull': { const isNull = ev(ast.e) === null; return asInt(ast.neg ? !isNull : isNull); }
      case 'between': {
        const v = ev(ast.e);
        const lo = cmp(v, ev(ast.lo));
        const hi = cmp(v, ev(ast.hi));
        if (lo === null || hi === null) return null;
        const inside = lo >= 0 && hi <= 0;
        return asInt(ast.neg ? !inside : inside);
      }
      case 'in': {
        const v = ev(ast.e);
        if (v === null) return null;
        const results = ast.list.map((x) => cmp(v, ev(x)));
        const hit = results.some((r) => r === 0);
        if (!hit && results.some((r) => r === null)) return null;
        return asInt(ast.neg ? !hit : hit);
      }
      case 'like': {
        const v = ev(ast.e);
        const p = ev(ast.p);
        if (v === null || p === null) return null;
        const re = new RegExp(`^${String(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.')}$`, 'is');
        const hit = re.test(String(v));
        return asInt(ast.neg ? !hit : hit);
      }
      case 'bin': {
        if (ast.op === 'AND' || ast.op === 'OR') {
          const a = bool(ev(ast.l));
          const b = bool(ev(ast.r));
          if (ast.op === 'AND') return asInt(a === false || b === false ? false : (a === null || b === null ? null : true));
          return asInt(a === true || b === true ? true : (a === null || b === null ? null : false));
        }
        const a = ev(ast.l);
        const b = ev(ast.r);
        if (['+', '-', '*', '/', '%'].includes(ast.op)) {
          const x = num(a);
          const y = num(b);
          if (x === null || y === null) return null;
          switch (ast.op) {
            case '+': return x + y;
            case '-': return x - y;
            case '*': return x * y;
            case '/': return y === 0 ? null : x / y;
            default: return y === 0 ? null : x % y;
          }
        }
        const d = cmp(a, b);
        if (d === null) return null;
        return asInt({ '=': d === 0, '<>': d !== 0, '<': d < 0, '<=': d <= 0, '>': d > 0, '>=': d >= 0 }[ast.op]);
      }
      default: throw new SqlError('Interner Fehler im Ausdruck.', 1105);
    }
  },
};

/* ------------------------------------------------------------------ data types */

const INT_RANGES = {
  TINYINT: [-128, 127, 255], SMALLINT: [-32768, 32767, 65535], MEDIUMINT: [-8388608, 8388607, 16777215],
  INT: [-2147483648, 2147483647, 4294967295], BIGINT: [-(2 ** 63), 2 ** 63 - 1, 2 ** 64 - 1],
};
const TYPE_ALIASES = { INTEGER: 'INT', BOOLEAN: 'TINYINT', BOOL: 'TINYINT', NUMERIC: 'DECIMAL', DEC: 'DECIMAL', DOUBLE: 'DOUBLE', REAL: 'DOUBLE', DATETIME: 'TIMESTAMP' };
const KNOWN_TYPES = ['TINYINT', 'SMALLINT', 'MEDIUMINT', 'INT', 'INTEGER', 'BIGINT', 'BOOLEAN', 'BOOL', 'DECIMAL', 'NUMERIC', 'DEC',
  'FLOAT', 'DOUBLE', 'REAL', 'CHAR', 'VARCHAR', 'TEXT', 'DATE', 'TIME', 'TIMESTAMP', 'DATETIME'];

const SqlTypes = {
  family(type) {
    if (type.base in INT_RANGES) return 'int';
    if (['DECIMAL', 'FLOAT', 'DOUBLE'].includes(type.base)) return 'num';
    if (['CHAR', 'VARCHAR', 'TEXT'].includes(type.base)) return 'text';
    return type.base.toLowerCase(); // date | time | timestamp
  },

  label(type) {
    const args = type.base === 'DECIMAL' && type.len != null ? `(${type.len},${type.scale ?? 0})`
      : ['CHAR', 'VARCHAR'].includes(type.base) ? `(${type.len})`
        : type.base === 'FLOAT' && type.len != null ? `(${type.len})` : '';
    const name = type.base === 'INT' ? 'INTEGER' : type.base === 'TIMESTAMP' && type.alias === 'DATETIME' ? 'DATETIME' : type.base;
    return `${name}${args}${type.unsigned ? ' UNSIGNED' : ''}`;
  },

  /** Checks and normalises a value for the given column. Throws SqlError. */
  coerce(col, value) {
    if (value === null) return null;
    const { type } = col;
    const bad = (why) => new SqlError(`Ungültiger Wert ${JSON.stringify(value)} für Spalte „${col.name}“ (${SqlTypes.label(type)}): ${why}`, 1366);
    switch (SqlTypes.family(type)) {
      case 'int': {
        const x = typeof value === 'number' ? value : Number(String(value).trim());
        if (String(value).trim() === '' || !Number.isFinite(x)) throw bad('keine ganze Zahl');
        const r = Math.round(x);
        const [min, max, umax] = INT_RANGES[type.base];
        if (type.unsigned ? (r < 0 || r > umax) : (r < min || r > max)) {
          throw new SqlError(`Wert ${r} liegt außerhalb des Bereichs der Spalte „${col.name}“ (${SqlTypes.label(type)}: ${type.unsigned ? `0 bis ${umax}` : `${min} bis ${max}`}).`, 1264);
        }
        return r;
      }
      case 'num': {
        const x = typeof value === 'number' ? value : Number(String(value).trim());
        if (String(value).trim() === '' || !Number.isFinite(x)) throw bad('keine Zahl');
        if (type.base === 'DECIMAL') {
          const scale = type.scale ?? 0;
          const r = Number(x.toFixed(scale));
          const digits = type.len ?? 10;
          if (Math.abs(r) >= 10 ** (digits - scale)) {
            throw new SqlError(`Wert ${x} passt nicht in Spalte „${col.name}“ ${SqlTypes.label(type)}: erlaubt sind ${digits - scale} Stellen vor und ${scale} nach dem Komma.`, 1264);
          }
          if (type.unsigned && r < 0) throw new SqlError(`Wert ${r} liegt außerhalb des Bereichs der Spalte „${col.name}“ (UNSIGNED).`, 1264);
          return r;
        }
        return x;
      }
      case 'text': {
        const s = String(value);
        if (type.len != null && s.length > type.len) {
          throw new SqlError(`Der Text „${s}“ ist zu lang für Spalte „${col.name}“ (${SqlTypes.label(type)} erlaubt höchstens ${type.len} Zeichen, der Text hat ${s.length}).`, 1406);
        }
        return s;
      }
      case 'date': {
        const s = String(value);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(`${s}T00:00:00Z`)) || new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) !== s) {
          throw bad('ein Datum muss die Form \'JJJJ-MM-TT\' haben, z. B. \'2008-04-12\'');
        }
        return s;
      }
      case 'time': {
        const s = String(value);
        if (!/^\d{1,3}:[0-5]\d(:[0-5]\d)?$/.test(s)) throw bad('eine Uhrzeit muss die Form \'HH:MM:SS\' haben');
        return s;
      }
      default: { // timestamp
        const s = String(value);
        const m = /^(\d{4}-\d{2}-\d{2})([ T](\d{2}:[0-5]\d(:[0-5]\d)?))?$/.exec(s);
        if (!m || new Date(`${m[1]}T00:00:00Z`).toISOString().slice(0, 10) !== m[1]) throw bad('erwartet wird \'JJJJ-MM-TT HH:MM:SS\'');
        return s;
      }
    }
  },

  /** Compatibility of an FK column with the referenced column. */
  compatible(a, b) {
    const fa = SqlTypes.family(a);
    const fb = SqlTypes.family(b);
    if (fa !== fb) return false;
    return fa !== 'int' || a.base === b.base;
  },
};

/* ------------------------------------------------------------------ engine */

const REF_ACTIONS = ['NO ACTION', 'RESTRICT', 'CASCADE', 'SET NULL'];
const DEFAULT_ACTION = 'NO ACTION';

class MiniSql {
  constructor() {
    this.tables = new Map();
    this.databases = new Set();
    this.currentDb = null;
  }

  /** Independent copy (used by exercises to probe a student's solution). */
  clone() {
    const copy = new MiniSql();
    copy.tables = structuredClone(this.tables);
    copy.databases = new Set(this.databases);
    copy.currentDb = this.currentDb;
    return copy;
  }

  /**
   * Executes a script. Stops at the first error (like running all statements in the Workbench).
   * @returns {{sql: string, ok: boolean, message: string, columns?: string[], rows?: any[][], skipped?: boolean}[]}
   */
  run(script) {
    let statements;
    try {
      statements = splitStatements(tokenize(script), script);
    } catch (e) {
      return [{ sql: '', ok: false, message: e.message }];
    }
    const results = [];
    let failed = false;
    statements.forEach((st) => {
      if (failed) { results.push({ sql: st.text, ok: false, skipped: true, message: 'nicht ausgeführt (vorheriger Fehler)' }); return; }
      const snapshot = structuredClone(this.tables);
      try {
        results.push({ sql: st.text, ok: true, ...this.#execute(new Cursor(st.tokens)) });
      } catch (e) {
        if (!(e instanceof SqlError)) throw e;
        this.tables = snapshot;
        failed = true;
        results.push({ sql: st.text, ok: false, message: e.code ? `Fehler ${e.code}: ${e.message}` : e.message });
      }
    });
    return results;
  }

  /** Read-only overview of the schema for the UI and for checks. */
  describe() {
    return [...this.tables.values()].map((t) => ({
      name: t.name,
      columns: t.columns.map((c) => ({
        name: c.name,
        type: SqlTypes.label(c.type),
        base: c.type.base,
        notNull: c.notNull || (t.pk ?? []).includes(c.name),
        pk: (t.pk ?? []).includes(c.name),
        unique: t.uniques.some((u) => u.cols.length === 1 && u.cols[0] === c.name),
        fk: t.fks.some((f) => f.cols.includes(c.name)),
        default: c.default,
        autoInc: c.autoInc,
      })),
      pk: t.pk ?? [],
      uniques: t.uniques,
      fks: t.fks,
      checks: t.checks.map((c) => ({ name: c.name, text: c.text })),
      indexes: t.indexes,
      rowCount: t.rows.length,
    }));
  }

  table(name) { return this.tables.get(String(name).toLowerCase()); }
  rows(name) { return this.table(name)?.rows ?? []; }

  /* ---------- dispatcher ---------- */

  #execute(c) {
    const first = c.peek();
    if (!first || first.t !== 'word') c.fail('ein SQL-Befehl wie CREATE, INSERT, … erwartet');
    if (c.eatKw('CREATE')) return this.#create(c);
    if (c.eatKw('ALTER')) return this.#alter(c);
    if (c.eatKw('DROP')) return this.#drop(c);
    if (c.eatKw('RENAME')) return this.#renameTable(c);
    if (c.eatKw('INSERT')) return this.#insert(c);
    if (c.eatKw('UPDATE')) return this.#update(c);
    if (c.eatKw('DELETE')) return this.#delete(c);
    if (c.eatKw('SELECT')) return this.#select(c);
    if (c.eatKw('USE')) { c.ident('Datenbankname'); c.expectEnd(); return { message: 'Datenbank ausgewählt.' }; }
    if (c.isKw('GRANT') || c.isKw('REVOKE')) throw new SqlError(`${first.u} gehört zur DCL (Zugriffsrechte). Das übt das Labor nicht – hier geht es um DDL.`, 1064);
    throw new SqlError(`Unbekannter Befehl „${first.raw}“. Das Labor kennt CREATE, ALTER, DROP, RENAME, INSERT, UPDATE, DELETE und SELECT.`, 1064);
  }

  /* ---------- CREATE ---------- */

  #create(c) {
    if (c.eatKw('DATABASE') || c.eatKw('SCHEMA')) {
      const ifNot = c.eatKw('IF', 'NOT', 'EXISTS');
      const name = c.ident('Datenbankname');
      c.expectEnd();
      if (this.databases.has(name) && !ifNot) throw new SqlError(`Die Datenbank „${name}“ gibt es schon.`, 1007);
      this.databases.add(name);
      this.currentDb = name;
      return { message: `Datenbank „${name}“ angelegt (und für die nächsten Befehle ausgewählt).` };
    }
    if (c.isKw('UNIQUE') || c.isKw('INDEX')) return this.#createIndex(c);
    c.expectKw('TABLE');
    const ifNot = c.eatKw('IF', 'NOT', 'EXISTS');
    const name = c.ident('Tabellenname');
    if (this.tables.has(name)) {
      if (ifNot) return { message: `Tabelle „${name}“ gibt es schon – nichts geändert.` };
      throw new SqlError(`Die Tabelle „${name}“ gibt es schon.`, 1050);
    }
    const table = { name, columns: [], pk: null, uniques: [], fks: [], checks: [], indexes: [], rows: [], autoNext: 1 };
    c.expectSym('(');
    const items = [];
    do { items.push(this.#tableItem(c)); } while (c.eatSym(','));
    c.expectSym(')');
    // table options such as ENGINE=InnoDB are ignored, anything else is a syntax error
    if (c.isKw('ENGINE') || c.isKw('DEFAULT') || c.isKw('CHARSET') || c.isKw('COLLATE') || c.isKw('COMMENT') || c.isKw('AUTO_INCREMENT')) c.pos = c.tokens.length;
    c.expectEnd();

    this.tables.set(name, table); // registered early so that self references work
    try {
      items.filter((i) => i.kind === 'column').forEach((i) => this.#addColumn(table, i.col));
      const order = ['pk', 'unique', 'index', 'check', 'fk'];
      items.filter((i) => i.kind !== 'column').sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
        .forEach((i) => this.#addConstraint(table, i));
      this.#finalizePk(table);
    } catch (e) {
      this.tables.delete(name);
      throw e;
    }
    return { message: `Tabelle „${name}“ angelegt (${table.columns.length} Spalten).` };
  }

  #createIndex(c) {
    const unique = c.eatKw('UNIQUE');
    c.expectKw('INDEX');
    const idx = c.ident('Indexname');
    c.expectKw('ON');
    const t = this.#needTable(c.ident('Tabellenname'));
    const cols = c.identList();
    c.expectEnd();
    cols.forEach((col) => this.#needColumn(t, col));
    if (unique) this.#addConstraint(t, { kind: 'unique', name: idx, cols });
    else t.indexes.push({ name: idx, cols });
    return { message: `Index „${idx}“ auf ${t.name}(${cols.join(', ')}) angelegt.` };
  }

  #tableItem(c) {
    let name = null;
    if (c.eatKw('CONSTRAINT')) {
      if (!c.isKw('PRIMARY') && !c.isKw('FOREIGN') && !c.isKw('UNIQUE') && !c.isKw('CHECK')) name = c.ident('Constraint-Name');
    }
    if (c.eatKw('PRIMARY', 'KEY')) return { kind: 'pk', name, cols: c.identList() };
    if (c.eatKw('UNIQUE')) {
      c.eatKw('KEY') || c.eatKw('INDEX');
      const n = !c.isSym('(') ? c.ident('Name') : null;
      return { kind: 'unique', name: name ?? n, cols: c.identList() };
    }
    if (c.eatKw('FOREIGN', 'KEY')) {
      const n = !c.isSym('(') ? c.ident('Name') : null;
      const cols = c.identList();
      return { kind: 'fk', name: name ?? n, cols, ...this.#references(c) };
    }
    if (c.eatKw('CHECK')) {
      c.expectSym('(');
      const e = Expr.parse(c);
      c.expectSym(')');
      return { kind: 'check', name, ...e };
    }
    if (c.isKw('KEY') || c.isKw('INDEX')) {
      c.next();
      const n = !c.isSym('(') ? c.ident('Name') : null;
      return { kind: 'index', name: n, cols: c.identList() };
    }
    if (name) c.fail('PRIMARY KEY, FOREIGN KEY, UNIQUE oder CHECK nach CONSTRAINT erwartet');
    return { kind: 'column', col: this.#columnDef(c) };
  }

  #references(c) {
    c.expectKw('REFERENCES');
    const refTable = c.ident('Tabellenname');
    const refCols = c.isSym('(') ? c.identList() : null;
    let onDelete = DEFAULT_ACTION;
    let onUpdate = DEFAULT_ACTION;
    while (c.isKw('ON')) {
      c.next();
      const which = c.isKw('DELETE') ? 'DELETE' : c.isKw('UPDATE') ? 'UPDATE' : null;
      if (!which) c.fail('DELETE oder UPDATE nach ON erwartet');
      c.next();
      const action = REF_ACTIONS.find((a) => c.eatKw(...a.split(' ')));
      if (!action) c.fail('CASCADE, SET NULL, NO ACTION oder RESTRICT erwartet');
      if (which === 'DELETE') onDelete = action; else onUpdate = action;
    }
    return { refTable, refCols, onDelete, onUpdate };
  }

  #columnDef(c) {
    const name = c.ident('Spaltenname');
    const t = c.next();
    if (!t || t.t !== 'word' || !KNOWN_TYPES.includes(t.u)) {
      throw new SqlError(`Unbekannter Datentyp „${t ? t.raw : ''}“ bei Spalte „${name}“. Erlaubt sind z. B. INTEGER, DECIMAL(n,m), VARCHAR(n), CHAR(n), DATE, TIMESTAMP.`, 1064);
    }
    const type = { base: TYPE_ALIASES[t.u] ?? t.u, alias: t.u, unsigned: false };
    if (c.eatSym('(')) {
      const n = c.next();
      if (!n || n.t !== 'num') { c.pos--; c.fail('eine Zahl in der Typangabe erwartet'); }
      type.len = n.v;
      if (c.eatSym(',')) {
        const m = c.next();
        if (!m || m.t !== 'num') { c.pos--; c.fail('eine Zahl erwartet'); }
        type.scale = m.v;
      }
      c.expectSym(')');
    }
    if (['CHAR', 'VARCHAR'].includes(type.base)) {
      if (type.len == null) {
        if (type.base === 'VARCHAR') throw new SqlError(`VARCHAR braucht eine Länge: z. B. VARCHAR(50) bei Spalte „${name}“.`, 1064);
        type.len = 1;
      }
    }
    if (type.base === 'DECIMAL' && type.len == null) { type.len = 10; type.scale = 0; }
    if (type.base === 'DECIMAL' && type.scale != null && type.scale > type.len) {
      throw new SqlError(`Bei DECIMAL(${type.len},${type.scale}) darf die Zahl der Nachkommastellen nicht größer sein als die Gesamtstellen.`, 1427);
    }
    while (c.isKw('UNSIGNED') || c.isKw('ZEROFILL')) { if (c.next().u === 'UNSIGNED') type.unsigned = true; }

    const col = { name, type, notNull: false, default: undefined, autoInc: false, inline: [] };
    for (;;) {
      if (c.eatKw('NOT', 'NULL')) col.notNull = true;
      else if (c.eatKw('NULL')) col.notNull = false;
      else if (c.eatKw('DEFAULT')) {
        const neg = c.eatSym('-');
        const v = c.next();
        if (!v || !['num', 'str', 'word'].includes(v.t)) { c.pos--; c.fail('einen Vorgabewert erwartet'); }
        if (v.t === 'word' && !['NULL', 'TRUE', 'FALSE'].includes(v.u)) {
          throw new SqlError(`Als DEFAULT sind nur feste Werte erlaubt (Zahl, Text, NULL) – nicht „${v.raw}“.`, 1064);
        }
        col.default = v.t === 'word' ? (v.u === 'NULL' ? null : v.u === 'TRUE' ? 1 : 0) : v.v;
        if (neg) col.default = -col.default;
      } else if (c.eatKw('AUTO_INCREMENT')) col.autoInc = true;
      else if (c.eatKw('PRIMARY', 'KEY')) col.inline.push({ kind: 'pk', cols: [name] });
      else if (c.eatKw('UNIQUE')) { c.eatKw('KEY'); col.inline.push({ kind: 'unique', cols: [name] }); }
      else if (c.eatKw('CHECK')) {
        c.expectSym('(');
        const e = Expr.parse(c);
        c.expectSym(')');
        col.inline.push({ kind: 'check', ...e });
      } else if (c.isKw('REFERENCES')) {
        throw new SqlError(`Bei Spalte „${name}“: MySQL ignoriert REFERENCES direkt in der Spaltendefinition. Schreibe einen Tabellenconstraint: FOREIGN KEY (${name}) REFERENCES …`, 1064);
      } else if (c.eatKw('COMMENT')) c.next();
      else break;
    }
    return col;
  }

  #addColumn(table, col) {
    if (table.columns.some((x) => x.name === col.name)) throw new SqlError(`Die Spalte „${col.name}“ gibt es in „${table.name}“ schon.`, 1060);
    const { inline, ...pure } = col;
    if (pure.default !== undefined && pure.default !== null) pure.default = SqlTypes.coerce(pure, pure.default);
    table.columns.push(pure);
    table.rows.forEach((r) => { r[pure.name] = pure.default ?? null; });
    inline.forEach((i) => this.#addConstraint(table, i));
  }

  #needTable(name) {
    const t = this.tables.get(name);
    if (!t) throw new SqlError(`Die Tabelle „${name}“ gibt es nicht.`, 1146);
    return t;
  }

  #needColumn(table, name) {
    const col = table.columns.find((x) => x.name === name);
    if (!col) throw new SqlError(`Die Spalte „${name}“ gibt es in „${table.name}“ nicht.`, 1054);
    return col;
  }

  #addConstraint(table, item) {
    switch (item.kind) {
      case 'pk': {
        if (table.pk) throw new SqlError(`„${table.name}“ hat schon einen PRIMARY KEY (${table.pk.join(', ')}) – es darf nur einen geben.`, 1068);
        item.cols.forEach((n) => this.#needColumn(table, n));
        table.pk = item.cols;
        table.columns.filter((x) => item.cols.includes(x.name)).forEach((x) => { x.notNull = true; });
        break;
      }
      case 'unique': {
        item.cols.forEach((n) => this.#needColumn(table, n));
        table.uniques.push({ name: item.name ?? `${table.name}_${item.cols.join('_')}_uq`, cols: item.cols });
        break;
      }
      case 'index': {
        item.cols.forEach((n) => this.#needColumn(table, n));
        table.indexes.push({ name: item.name, cols: item.cols });
        return;
      }
      case 'check': {
        Expr.columns(item.ast).forEach((n) => {
          if (!table.columns.some((x) => x.name === n)) throw new SqlError(`Im CHECK kommt die Spalte „${n}“ vor, die es in „${table.name}“ nicht gibt.`, 3959);
        });
        table.checks.push({ name: item.name ?? `${table.name}_chk_${table.checks.length + 1}`, ast: item.ast, text: item.text });
        break;
      }
      case 'fk': {
        item.cols.forEach((n) => this.#needColumn(table, n));
        const parent = this.tables.get(item.refTable);
        if (!parent) throw new SqlError(`FOREIGN KEY auf „${item.refTable}“ nicht möglich: Diese Tabelle gibt es (noch) nicht. Lege zuerst die Tabelle an, auf die verwiesen wird.`, 1824);
        const refCols = item.refCols ?? parent.pk;
        if (!refCols) throw new SqlError(`„${item.refTable}“ hat keinen PRIMARY KEY, auf den der FOREIGN KEY zeigen könnte.`, 1215);
        if (refCols.length !== item.cols.length) throw new SqlError('Ein FOREIGN KEY braucht gleich viele Spalten wie der Schlüssel, auf den er zeigt.', 1239);
        refCols.forEach((n) => this.#needColumn(parent, n));
        const isKey = (cols) => (parent.pk && sameCols(parent.pk, cols)) || parent.uniques.some((u) => sameCols(u.cols, cols));
        if (!isKey(refCols)) throw new SqlError(`Der FOREIGN KEY muss auf einen PRIMARY KEY oder UNIQUE-Schlüssel von „${item.refTable}“ zeigen – (${refCols.join(', ')}) ist keiner.`, 1215);
        item.cols.forEach((n, i) => {
          const a = this.#needColumn(table, n);
          const b = this.#needColumn(parent, refCols[i]);
          if (!SqlTypes.compatible(a.type, b.type)) {
            throw new SqlError(`„${table.name}.${n}“ (${SqlTypes.label(a.type)}) und „${item.refTable}.${refCols[i]}“ (${SqlTypes.label(b.type)}) haben nicht denselben Datentyp.`, 3780);
          }
          if ((item.onDelete === 'SET NULL' || item.onUpdate === 'SET NULL') && a.notNull) {
            throw new SqlError(`SET NULL geht nicht bei „${n}“, weil die Spalte NOT NULL ist (oder zum PRIMARY KEY gehört).`, 1830);
          }
        });
        table.fks.push({
          name: item.name ?? `${table.name}_ibfk_${table.fks.length + 1}`, cols: item.cols, refTable: item.refTable, refCols, onDelete: item.onDelete, onUpdate: item.onUpdate,
        });
        break;
      }
      default: break;
    }
    // new constraints must hold for rows that already exist
    if (table.rows.length && ['pk', 'unique', 'check', 'fk'].includes(item.kind)) this.#validateExisting(table, item.kind);
  }

  #finalizePk(table) {
    if (table.pk) table.columns.filter((x) => table.pk.includes(x.name)).forEach((x) => { x.notNull = true; });
  }

  /** Validates all rows of a table against one constraint kind (used by ALTER TABLE ... ADD). */
  #validateExisting(table, kind) {
    const fail = (why) => { throw new SqlError(`Der Constraint kann nicht angelegt werden, weil bereits vorhandene Daten ihn verletzen: ${why}`, 1062); };
    table.rows.forEach((row) => {
      try {
        if (kind === 'pk') { this.#checkNotNull(table, row); this.#checkPkUnique(table, row, row); }
        if (kind === 'unique') this.#checkUnique(table, row, row);
        if (kind === 'check') this.#checkChecks(table, row);
        if (kind === 'fk') this.#checkFks(table, row);
      } catch (e) {
        if (e instanceof SqlError) fail(e.message);
        throw e;
      }
    });
  }

  /* ---------- DROP / RENAME ---------- */

  #drop(c) {
    if (c.eatKw('DATABASE') || c.eatKw('SCHEMA')) {
      const ifEx = c.eatKw('IF', 'EXISTS');
      const name = c.ident('Datenbankname');
      c.expectEnd();
      if (!this.databases.has(name) && !ifEx) throw new SqlError(`Die Datenbank „${name}“ gibt es nicht.`, 1008);
      if (this.databases.delete(name)) { this.tables = new Map(); this.currentDb = null; }
      return { message: `Datenbank „${name}“ gelöscht.` };
    }
    if (c.eatKw('INDEX')) {
      const idx = c.ident('Indexname');
      c.expectKw('ON');
      const t = this.#needTable(c.ident('Tabellenname'));
      c.expectEnd();
      const before = t.indexes.length + t.uniques.length;
      t.indexes = t.indexes.filter((i) => i.name !== idx);
      t.uniques = t.uniques.filter((u) => u.name !== idx);
      if (before === t.indexes.length + t.uniques.length) throw new SqlError(`Index „${idx}“ gibt es auf „${t.name}“ nicht.`, 1091);
      return { message: `Index „${idx}“ gelöscht.` };
    }
    c.expectKw('TABLE');
    const ifEx = c.eatKw('IF', 'EXISTS');
    const names = [c.ident('Tabellenname')];
    while (c.eatSym(',')) names.push(c.ident('Tabellenname'));
    c.expectEnd();
    names.forEach((name) => {
      if (!this.tables.has(name)) {
        if (ifEx) return;
        throw new SqlError(`Die Tabelle „${name}“ gibt es nicht.`, 1051);
      }
      const user = [...this.tables.values()].find((t) => t.name !== name && !names.includes(t.name) && t.fks.some((f) => f.refTable === name));
      if (user) throw new SqlError(`„${name}“ kann nicht gelöscht werden: „${user.name}“ verweist mit einem FOREIGN KEY darauf. Lösche zuerst die Tabelle „${user.name}“ (Kindtabellen zuerst!).`, 3730);
    });
    names.forEach((n) => this.tables.delete(n));
    return { message: `Tabelle(n) ${names.map((n) => `„${n}“`).join(', ')} gelöscht.` };
  }

  #renameTable(c) {
    c.expectKw('TABLE');
    const pairs = [];
    do {
      const from = c.ident('Tabellenname');
      c.expectKw('TO');
      pairs.push([from, c.ident('neuer Tabellenname')]);
    } while (c.eatSym(','));
    c.expectEnd();
    pairs.forEach(([from, to]) => this.#rename(from, to));
    return { message: pairs.map(([a, b]) => `„${a}“ heißt jetzt „${b}“`).join(', ') + '.' };
  }

  #rename(from, to) {
    const t = this.#needTable(from);
    if (this.tables.has(to)) throw new SqlError(`Eine Tabelle „${to}“ gibt es schon.`, 1050);
    const next = new Map();
    this.tables.forEach((v, k) => next.set(k === from ? to : k, v));
    t.name = to;
    this.tables = next;
    this.tables.forEach((o) => o.fks.forEach((f) => { if (f.refTable === from) f.refTable = to; }));
  }

  /* ---------- ALTER ---------- */

  #alter(c) {
    c.expectKw('TABLE');
    const table = this.#needTable(c.ident('Tabellenname'));
    const messages = [];
    do {
      if (c.eatKw('ADD')) {
        if (c.isKw('COLUMN') || !(c.isKw('CONSTRAINT') || c.isKw('PRIMARY') || c.isKw('FOREIGN') || c.isKw('UNIQUE') || c.isKw('CHECK') || c.isKw('INDEX') || c.isKw('KEY'))) {
          c.eatKw('COLUMN');
          const col = this.#columnDef(c);
          if (c.eatKw('FIRST')) { /* position is ignored */ } else if (c.eatKw('AFTER')) c.ident('Spaltenname');
          if (col.notNull && col.default === undefined && table.rows.length && !col.autoInc) {
            throw new SqlError(`Die neue Spalte „${col.name}“ ist NOT NULL, aber „${table.name}“ enthält schon Zeilen – gib einen DEFAULT-Wert an.`, 1138);
          }
          this.#addColumn(table, col);
          messages.push(`Spalte „${col.name}“ hinzugefügt`);
        } else {
          const item = this.#tableItem(c);
          this.#addConstraint(table, item);
          this.#finalizePk(table);
          messages.push(`${{ pk: 'PRIMARY KEY', unique: 'UNIQUE', fk: 'FOREIGN KEY', check: 'CHECK', index: 'Index' }[item.kind]} hinzugefügt`);
        }
      } else if (c.eatKw('DROP')) {
        if (c.eatKw('PRIMARY', 'KEY')) {
          if (!table.pk) throw new SqlError(`„${table.name}“ hat keinen PRIMARY KEY.`, 1091);
          if ([...this.tables.values()].some((t) => t.fks.some((f) => f.refTable === table.name && sameCols(f.refCols, table.pk)))) {
            throw new SqlError('Der PRIMARY KEY wird von einem FOREIGN KEY einer anderen Tabelle gebraucht. Entferne zuerst den FOREIGN KEY.', 1553);
          }
          table.pk = null;
          messages.push('PRIMARY KEY entfernt');
        } else if (c.eatKw('FOREIGN', 'KEY')) {
          const n = c.ident('Constraint-Name');
          if (!table.fks.some((f) => f.name === n)) throw new SqlError(`Einen FOREIGN KEY „${n}“ gibt es in „${table.name}“ nicht.`, 1091);
          table.fks = table.fks.filter((f) => f.name !== n);
          messages.push(`FOREIGN KEY „${n}“ entfernt`);
        } else if (c.eatKw('CHECK') || (c.isKw('CONSTRAINT') && c.next())) {
          const n = c.ident('Constraint-Name');
          const before = table.checks.length + table.fks.length + table.uniques.length;
          table.checks = table.checks.filter((k) => k.name !== n);
          table.fks = table.fks.filter((k) => k.name !== n);
          table.uniques = table.uniques.filter((k) => k.name !== n);
          if (before === table.checks.length + table.fks.length + table.uniques.length) throw new SqlError(`Einen Constraint „${n}“ gibt es in „${table.name}“ nicht.`, 3940);
          messages.push(`Constraint „${n}“ entfernt`);
        } else if (c.eatKw('INDEX') || c.eatKw('KEY')) {
          const n = c.ident('Indexname');
          table.indexes = table.indexes.filter((i) => i.name !== n);
          table.uniques = table.uniques.filter((u) => u.name !== n);
          messages.push(`Index „${n}“ entfernt`);
        } else {
          c.eatKw('COLUMN');
          const n = c.ident('Spaltenname');
          this.#needColumn(table, n);
          if (table.columns.length === 1) throw new SqlError('Die letzte Spalte kann man nicht löschen – dafür gibt es DROP TABLE.', 1090);
          if ([...this.tables.values()].some((t) => t.fks.some((f) => (t === table && f.cols.includes(n)) || (f.refTable === table.name && f.refCols.includes(n))))) {
            throw new SqlError(`Die Spalte „${n}“ wird von einem FOREIGN KEY gebraucht. Entferne zuerst den FOREIGN KEY.`, 1829);
          }
          table.columns = table.columns.filter((x) => x.name !== n);
          table.rows.forEach((r) => { delete r[n]; });
          table.pk = table.pk && table.pk.includes(n) ? table.pk.filter((x) => x !== n) : table.pk;
          if (table.pk && !table.pk.length) table.pk = null;
          table.uniques = table.uniques.filter((u) => !u.cols.includes(n));
          table.indexes = table.indexes.filter((u) => !u.cols.includes(n));
          table.checks = table.checks.filter((k) => !Expr.columns(k.ast).has(n));
          messages.push(`Spalte „${n}“ gelöscht`);
        }
      } else if (c.eatKw('MODIFY')) {
        c.eatKw('COLUMN');
        const col = this.#columnDef(c);
        const old = this.#needColumn(table, col.name);
        const cloneRows = structuredClone(table.rows);
        table.rows.forEach((r) => { r[col.name] = SqlTypes.coerce(col, r[col.name]); });
        if (col.notNull && table.rows.some((r) => r[col.name] === null)) {
          table.rows = cloneRows;
          throw new SqlError(`„${col.name}“ kann nicht NOT NULL werden: Es gibt Zeilen mit NULL.`, 1138);
        }
        Object.assign(old, { type: col.type, notNull: col.notNull || (table.pk ?? []).includes(col.name), default: col.default, autoInc: col.autoInc });
        col.inline.forEach((i) => this.#addConstraint(table, i));
        messages.push(`Spalte „${col.name}“ geändert`);
      } else if (c.eatKw('RENAME')) {
        c.eatKw('TO') || c.eatKw('AS');
        const to = c.ident('neuer Tabellenname');
        this.#rename(table.name, to);
        messages.push(`Tabelle heißt jetzt „${to}“`);
      } else c.fail('ADD, DROP, MODIFY oder RENAME erwartet');
    } while (c.eatSym(','));
    c.expectEnd();
    return { message: `${messages.join('; ')}.` };
  }

  /* ---------- row constraint checks ---------- */

  #checkNotNull(table, row) {
    table.columns.forEach((col) => {
      if ((col.notNull || (table.pk ?? []).includes(col.name)) && row[col.name] === null) {
        throw new SqlError(`Die Spalte „${col.name}“ darf nicht NULL sein (NOT NULL${(table.pk ?? []).includes(col.name) ? ' / PRIMARY KEY' : ''}).`, 1048);
      }
    });
  }

  #checkPkUnique(table, row, self) {
    if (!table.pk) return;
    const dup = table.rows.find((r) => r !== self && table.pk.every((n) => r[n] === row[n]));
    if (dup) throw new SqlError(`Doppelter Eintrag ${fmtKey(table.pk, row)} – der PRIMARY KEY von „${table.name}“ muss eindeutig sein.`, 1062);
  }

  #checkUnique(table, row, self) {
    table.uniques.forEach((u) => {
      if (u.cols.some((n) => row[n] === null)) return; // several NULLs are allowed
      const dup = table.rows.find((r) => r !== self && u.cols.every((n) => (typeof r[n] === 'string' && typeof row[n] === 'string' ? r[n].toLowerCase() === row[n].toLowerCase() : r[n] === row[n])));
      if (dup) throw new SqlError(`Doppelter Eintrag ${fmtKey(u.cols, row)} – UNIQUE-Constraint „${u.name}“ verletzt.`, 1062);
    });
  }

  #checkChecks(table, row) {
    table.checks.forEach((k) => {
      if (Expr.evaluate(k.ast, row) === 0) throw new SqlError(`CHECK-Constraint „${k.name}“ verletzt: Die Bedingung (${k.text}) ist nicht erfüllt.`, 3819);
    });
  }

  #checkFks(table, row) {
    table.fks.forEach((f) => {
      if (f.cols.some((n) => row[n] === null)) return;
      const parent = this.tables.get(f.refTable);
      const ok = parent.rows.some((p) => f.refCols.every((n, i) => looseEq(p[n], row[f.cols[i]])));
      if (!ok) {
        throw new SqlError(`FOREIGN KEY verletzt: In „${f.refTable}“ gibt es keinen Eintrag mit ${f.refCols.map((n, i) => `${n} = ${show(row[f.cols[i]])}`).join(', ')}. (Fremdschlüssel ${table.name}.${f.cols.join(', ')})`, 1452);
      }
    });
  }

  #checkRow(table, row, self) {
    this.#checkNotNull(table, row);
    this.#checkPkUnique(table, row, self);
    this.#checkUnique(table, row, self);
    this.#checkChecks(table, row);
    this.#checkFks(table, row);
  }

  /* ---------- INSERT ---------- */

  #insert(c) {
    c.eatKw('INTO');
    const table = this.#needTable(c.ident('Tabellenname'));
    let cols = table.columns.map((x) => x.name);
    if (c.isSym('(')) {
      cols = c.identList();
      cols.forEach((n) => this.#needColumn(table, n));
    }
    if (!c.eatKw('VALUES') && !c.eatKw('VALUE')) c.fail('VALUES erwartet');
    const tuples = [];
    do {
      c.expectSym('(');
      const vals = [];
      do { vals.push(Expr.evaluate(new ExprParser(c).parse(), {})); } while (c.eatSym(','));
      c.expectSym(')');
      if (vals.length !== cols.length) {
        throw new SqlError(`Die Zeile hat ${vals.length} Werte, es sind aber ${cols.length} Spalten angegeben (${cols.join(', ')}).`, 1136);
      }
      tuples.push(vals);
    } while (c.eatSym(','));
    c.expectEnd();
    tuples.forEach((vals) => {
      const row = {};
      table.columns.forEach((col) => {
        const idx = cols.indexOf(col.name);
        if (idx >= 0) {
          let v = vals[idx];
          if (col.autoInc && (v === null || v === 0)) v = null;
          row[col.name] = SqlTypes.coerce(col, v);
        } else row[col.name] = col.default !== undefined ? col.default : null;
        if (col.autoInc && row[col.name] === null) row[col.name] = table.autoNext;
        if (col.autoInc) table.autoNext = Math.max(table.autoNext, row[col.name] + 1);
      });
      this.#checkRow(table, row, null);
      table.rows.push(row);
    });
    return { message: `${tuples.length} Zeile(n) in „${table.name}“ eingefügt.` };
  }

  /* ---------- UPDATE / DELETE ---------- */

  #where(c, table) {
    if (!c.eatKw('WHERE')) return () => true;
    const { ast } = Expr.parse(c);
    Expr.columns(ast).forEach((n) => this.#needColumn(table, n));
    return (row) => Expr.evaluate(ast, row) === 1;
  }

  #delete(c) {
    c.expectKw('FROM');
    const table = this.#needTable(c.ident('Tabellenname'));
    const test = this.#where(c, table);
    c.expectEnd();
    const doomed = table.rows.filter(test);
    this.#deleteRows(table, new Set(doomed), new Set());
    return { message: `${doomed.length} Zeile(n) gelöscht${doomed.length === 0 ? ' (keine Zeile erfüllt die WHERE-Bedingung)' : ''}.` };
  }

  #deleteRows(table, doomed, seen) {
    doomed.forEach((r) => seen.add(r));
    this.tables.forEach((child) => {
      child.fks.filter((f) => f.refTable === table.name).forEach((f) => {
        const hit = child.rows.filter((r) => !seen.has(r)
          && [...doomed].some((p) => f.cols.every((n, i) => r[n] !== null && looseEq(r[n], p[f.refCols[i]]))));
        if (!hit.length) return;
        if (f.onDelete === 'CASCADE') this.#deleteRows(child, new Set(hit), seen);
        else if (f.onDelete === 'SET NULL') hit.forEach((r) => f.cols.forEach((n) => { r[n] = null; }));
        else {
          throw new SqlError(`Zeile kann nicht gelöscht werden: „${child.name}“ verweist noch darauf (${hit.length} Zeile(n), Fremdschlüssel ${f.cols.join(', ')}). `
            + 'Mit ON DELETE CASCADE würden sie mitgelöscht, mit ON DELETE SET NULL auf NULL gesetzt.', 1451);
        }
      });
    });
    table.rows = table.rows.filter((r) => !doomed.has(r));
  }

  #update(c) {
    const table = this.#needTable(c.ident('Tabellenname'));
    c.expectKw('SET');
    const sets = [];
    do {
      const n = c.ident('Spaltenname');
      this.#needColumn(table, n);
      c.expectSym('=');
      const { ast } = Expr.parse(c);
      sets.push([n, ast]);
    } while (c.eatSym(','));
    const test = this.#where(c, table);
    c.expectEnd();
    const targets = table.rows.filter(test);
    targets.forEach((row) => {
      const next = { ...row };
      sets.forEach(([n, ast]) => { next[n] = SqlTypes.coerce(this.#needColumn(table, n), Expr.evaluate(ast, row)); });
      this.#checkRow(table, next, row);
      this.#propagateUpdate(table, row, next);
      Object.assign(row, next);
    });
    return { message: `${targets.length} Zeile(n) geändert.` };
  }

  #propagateUpdate(table, oldRow, newRow) {
    this.tables.forEach((child) => {
      child.fks.filter((f) => f.refTable === table.name).forEach((f) => {
        if (f.refCols.every((n) => looseEq(oldRow[n], newRow[n]))) return;
        const hit = child.rows.filter((r) => f.cols.every((n, i) => r[n] !== null && looseEq(r[n], oldRow[f.refCols[i]])));
        if (!hit.length) return;
        if (f.onUpdate === 'CASCADE') {
          hit.forEach((r) => {
            const next = { ...r };
            f.cols.forEach((n, i) => { next[n] = newRow[f.refCols[i]]; });
            this.#propagateUpdate(child, r, next);
            Object.assign(r, next);
          });
        } else if (f.onUpdate === 'SET NULL') hit.forEach((r) => f.cols.forEach((n) => { r[n] = null; }));
        else {
          throw new SqlError(`Schlüssel kann nicht geändert werden: „${child.name}“ verweist noch darauf (${hit.length} Zeile(n)). Mit ON UPDATE CASCADE würde der Fremdschlüssel mitgeändert.`, 1451);
        }
      });
    });
  }

  /* ---------- SELECT (minimal) ---------- */

  #select(c) {
    let cols = null;
    if (!c.eatSym('*')) {
      cols = [c.ident('Spaltenname')];
      while (c.eatSym(',')) cols.push(c.ident('Spaltenname'));
    }
    c.expectKw('FROM');
    const table = this.#needTable(c.ident('Tabellenname'));
    const test = this.#where(c, table);
    let order = null;
    if (c.eatKw('ORDER', 'BY')) {
      order = { col: c.ident('Spaltenname'), desc: false };
      this.#needColumn(table, order.col);
      if (c.eatKw('DESC')) order.desc = true; else c.eatKw('ASC');
    }
    c.expectEnd();
    const names = cols ?? table.columns.map((x) => x.name);
    names.forEach((n) => this.#needColumn(table, n));
    let rows = table.rows.filter(test);
    if (order) {
      rows = [...rows].sort((a, b) => {
        const x = a[order.col];
        const y = b[order.col];
        if (x === y) return 0;
        if (x === null) return -1;
        if (y === null) return 1;
        return (x < y ? -1 : 1) * (order.desc ? -1 : 1);
      });
    }
    return { message: `${rows.length} Zeile(n).`, columns: names, rows: rows.map((r) => names.map((n) => r[n])), table: table.name };
  }
}

/* ------------------------------------------------------------------ helpers */

function sameCols(a, b) {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

function looseEq(a, b) {
  if (a === null || b === null) return false;
  if (typeof a === 'string' && typeof b === 'string') return a.toLowerCase() === b.toLowerCase();
  return a === b || String(a) === String(b);
}

function show(v) {
  return v === null ? 'NULL' : typeof v === 'string' ? `'${v}'` : String(v);
}

function fmtKey(cols, row) {
  return cols.length === 1 ? `'${row[cols[0]]}'` : `(${cols.map((n) => row[n]).join(', ')})`;
}

if (typeof module !== 'undefined') module.exports = { MiniSql, SqlError, SqlTypes, tokenize };
