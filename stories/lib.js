const fs = require('fs'), path = require('path');
const cache = {};
const text = f => cache[f] || (cache[f] = fs.readFileSync(path.join(__dirname, 'texts', f), 'utf8').replace(/\r/g, '').replace(/^﻿/, ''));

// Split a Bible file into books by its header lines.
function books(file, headers) {
  // A header just below another one is its subtitle ("Otherwise Called: The First Book of the Kings").
  const out = {}; let cur = null, at = -99;
  text(file).split('\n').forEach((line, n) => {
    const t = line.trim();
    if (headers.includes(t)) { if (n - at > 6) { cur = t; out[cur] = out[cur] || []; } at = n; return; }
    if (cur) out[cur].push(line);
  });
  return out;
}
function verses(lines) {
  // Verse numbers ("3:8 ") usually open a line but sometimes run on inside one.
  const all = lines.join('\n').replace(/\s+/g, ' ');
  const v = {}; const re = /(?:^| )(\d+):(\d+) /g; let m, last = null;
  while ((m = re.exec(all))) {
    if (last) { if (v[last.k] === undefined) v[last.k] = all.slice(last.end, m.index).trim(); }
    last = { k: m[1] + ':' + m[2], end: re.lastIndex };
  }
  if (last && v[last.k] === undefined) v[last.k] = all.slice(last.end).trim();
  return v;
}

let KH = null;
function kjvHeaders() {
  if (KH) return KH;
  const t = text('pg10.txt').split('\n').map(x => x.trim());
  const i = t.lastIndexOf('The Old Testament of the King James Version of the Bible');
  const toc = t.slice(0, i);
  const start = toc.indexOf('The First Book of Moses: Called Genesis');
  return KH = [...new Set(toc.slice(start).filter(x => x && !/Testament/.test(x)))];
}
const names = {
  '1 Samuel': 'The First Book of Samuel', '2 Samuel': 'The Second Book of Samuel',
  '1 Kings': 'The First Book of the Kings', '2 Kings': 'The Second Book of the Kings',
  Psalm: 'The Book of Psalms', Psalms: 'The Book of Psalms', Proverbs: 'The Proverbs',
  Lamentations: 'The Lamentations of Jeremiah', Isaiah: 'The Book of the Prophet Isaiah',
  Ezekiel: 'The Book of the Prophet Ezekiel', Jeremiah: 'The Book of the Prophet Jeremiah',
  Matthew: 'The Gospel According to Saint Matthew', Mark: 'The Gospel According to Saint Mark',
  Luke: 'The Gospel According to Saint Luke', John: 'The Gospel According to Saint John',
  Acts: 'The Acts of the Apostles', Romans: 'The Epistle of Paul the Apostle to the Romans',
  '1 Corinthians': 'The First Epistle of Paul the Apostle to the Corinthians',
  '2 Thessalonians': 'The Second Epistle of Paul the Apostle to the Thessalonians',
  '2 Timothy': 'The Second Epistle of Paul the Apostle to Timothy',
  Hebrews: 'The Epistle of Paul the Apostle to the Hebrews',
  Revelation: 'The Revelation of Saint John the Divine',
};
function kjvBook(b) {
  if (names[b]) return names[b];
  return kjvHeaders().find(h => h === b || h.endsWith(': Called ' + b) || h === 'The Book of ' + b || h === 'The Book of the Prophet ' + b);
}
let K = null, A = null, AH = null;
function apoHeaders() {
  return AH || (AH = [...new Set(text('pg124.txt').split('\n').map(s => s.trim())
    .filter(s => /^The (Book|First Book|Second Book|History|Rest|Additions|Prayer|Song|Wisdom|Greek)/.test(s) && s.length < 90))]);
}
function bible(ref) { // "Luke 1:26-38" or "Luke 1:26-2:3"; "Additions to Esther 15:7" for the Apocrypha
  const m = ref.match(/^(.+?) (\d+):(\d+)(?:-(?:(\d+):)?(\d+))?$/); if (!m) throw Error('bad ref ' + ref);
  const [, b, c1, v1, c2, v2] = m; let lines;
  const apo = /^(Additions to Esther|Judith|Susanna|Tobit|Wisdom|Sirach)/.test(b);
  if (!apo) { const kb = kjvBook(b); if (!kb) throw Error('no book ' + b); K = K || books('pg10.txt', kjvHeaders()); lines = K[kb]; }
  else {
    A = A || books('pg124.txt', apoHeaders());
    const key = b.replace('Additions to Esther', 'Greek Additions to Esther');
    const hs = apoHeaders().filter(h => h.includes(key) && A[h]);
    if (!hs.length) throw Error('no book ' + b);
    lines = hs.map(h => A[h]).sort((x, y) => y.length - x.length)[0];
  }
  if (!lines) throw Error('no book ' + b);
  const V = verses(lines), out = [];
  let c = +c1, v = +v1; const ce = c2 ? +c2 : +c1, ve = v2 ? +v2 : +v1;
  while (c < ce || (c == ce && v <= ve)) {
    const k = c + ':' + v;
    if (V[k] === undefined) { if (c < ce) { c++; v = 1; continue; } throw Error('missing ' + b + ' ' + k); }
    out.push(V[k].replace(/\s+/g, ' ').trim()); v++;
  }
  return out.join(' ');
}

function norm(s) { return s.replace(/\s+/g, ' ').trim(); }
function grab(file, start, end, { after, verse } = {}) {
  const t = text(file); let base = 0;
  if (after) { const i = t.indexOf(after); if (i < 0) throw Error(`after not found in ${file}: ${after}`); base = i; }
  const flat = [], map = [];
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (/\s/.test(ch)) { if (flat.length && flat[flat.length - 1] !== ' ') { flat.push(' '); map.push(i); } }
    else { flat.push(ch); map.push(i); }
  }
  const F = flat.join('');
  const fb = map.findIndex(x => x >= base);
  const s = F.indexOf(norm(start), fb); if (s < 0) throw Error(`start not found in ${file}: ${start}`);
  const e = F.indexOf(norm(end), s); if (e < 0) throw Error(`end not found in ${file}: ${end}`);
  const raw = t.slice(map[s], map[e + norm(end).length - 1] + 1);
  if (verse) return raw.split('\n').map(l => l.replace(/\s+$/, '').replace(/^\s+/, '')).join('\n').replace(/\n{3,}/g, '\n\n').trim();
  return raw.split(/\n\s*\n/).map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n\n');
}
module.exports = { bible, grab, text };
