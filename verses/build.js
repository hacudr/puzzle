// Builds puzzles/verses.json from verses/spec.js, cutting every passage word
// for word out of its edition. Editions not yet in verses/texts/ (git-ignored)
// are downloaded from Project Gutenberg first.
//   node verses/build.js
const fs = require('fs');
const path = require('path');
const { sources, verses } = require('./spec');

const UA = 'ArtHistoryPuzzle/1.0 (https://hacudr.github.io/puzzle/)';
const TEXTS = path.join(__dirname, 'texts');
const OUT = path.join(__dirname, '..', 'puzzles', 'verses.json');

// only letters and digits, accents taken off, so that a passage is found
// whatever an edition's quotes, dashes and spacing
const key = (s) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]/g, '');

const cache = {};
function load(id) {
  if (cache[id]) return cache[id];
  const raw = fs.readFileSync(path.join(TEXTS, id + '.txt'), 'utf8').replace(/\r/g, '');
  let keys = '';
  const at = [];
  for (let i = 0; i < raw.length; i++) {
    const c = key(raw[i]);
    if (c) { keys += c; at.push(i); }
  }
  return (cache[id] = { raw, keys, at });
}

// The edition's own marks come off: footnote and line numbers, verse numbers,
// italic underscores and the indent. Prose is one paragraph again, and a long
// line the edition wrapped is one line again (Whitman's, and the Old English
// translations', whose half-lines keep a wide space between them).
function clean(s, prose, id) {
  let lines = s.split('\n').map((l) => l
    .replace(/\s*\[\d+(?::\d+)?\]/g, '').replace(/\s*\{\w+\}/g, '')
    .replace(/\s{2,}\(?_?\d+\)?\s*$/, '')
    .replace(/^\d+\s{2,}/, '      ')
    .replace(/^(\s*)\d+:\d+\s/, '$1')
    .replace(/_/g, '').replace(/\s+$/, ''));
  const indent = (l) => l.match(/^\s*/)[0].length;
  const wraps = id === 1322 || id === 31172;
  const joined = [];
  for (const l of lines) {
    const prev = joined[joined.length - 1];
    if (prev && wraps && l.trim() && indent(l) >= indent(prev) + 4) joined[joined.length - 1] = prev + ' ' + l.trim();
    else joined.push(l);
  }
  let text = joined.map((l) => l.trim().replace(/\s{3,}/g, ' ').replace(/ {2,}/g, ' ')).join('\n').trim();
  if (prose) text = text.replace(/\n(?!\n)/g, ' ').replace(/\n\n+/g, '\n\n').split('\n').map((l) => l.trim()).join('\n');
  text = text.replace(/--/g, '—').replace(/\n{3,}/g, '\n\n');
  // a first word printed in capitals, in its usual case: "GLORY be", "A CUP"
  text = text.replace(/^(['‘“"]?)([A-Z])([A-Z]+)\b/, (all, q, a, b) => q + a + b.toLowerCase());
  text = text.replace(/^(['‘“"]?[AI]\s+)([A-Z]{2,})\b/, (all, q, w) => q + w.toLowerCase());
  return text;
}

function cut(image, v) {
  const t = load(v.source);
  const k = key(v.from);
  const end = key(v.to);
  // every place the first words come, and of those with the last words close
  // after, the closest: a contents page or a note quotes the first line only.
  // A tie goes to the later, the poem after its listing.
  let best = null;
  for (let i = t.keys.indexOf(k); i >= 0; i = t.keys.indexOf(k, i + 1)) {
    const j = t.keys.indexOf(end, i);
    if (j >= 0 && t.at[j] - t.at[i] < 3000 && (!best || j - i <= best.j - best.i)) best = { i, j };
  }
  if (!best) throw new Error(`${image}: "${v.from}" … "${v.to}" not found in ${v.source}`);
  // verse starts at its line, unless a speaker's name or the end of another
  // sentence is before it there; prose starts at its word
  const lineStart = t.raw.lastIndexOf('\n', t.at[best.i]) + 1;
  const before = t.raw.slice(lineStart, t.at[best.i]).replace(/^\s*\d+\s/, '').replace(/[“"‘'’(_]+$/, '');
  let start = v.prose || /\S/.test(before) ? t.at[best.i] : lineStart;
  while (start > lineStart && /[’'‘“"]/.test(t.raw[start - 1])) start--;
  // to the end of the last word, and the stops after it
  const last = t.at[best.j + end.length - 1] + 1;
  const stop = last + t.raw.slice(last).match(/^[\w’']*[.,;:!?’”'")\]—-]*/)[0].length;
  let text = clean(t.raw.slice(start, stop), v.prose, v.source);
  if (v.fix) {
    const fixed = v.fix(text);
    if (key(fixed) !== key(text)) throw new Error(`${image}: the fix changes the words`);
    if (fixed === text) throw new Error(`${image}: the fix does nothing`);
    text = fixed;
  }
  return text;
}

async function main() {
  fs.mkdirSync(TEXTS, { recursive: true });
  const used = [...new Set(Object.values(verses).map((v) => v.source))];
  for (const id of used) {
    if (!sources[id]) throw new Error(`No edition named for ${id}`);
    const file = path.join(TEXTS, id + '.txt');
    if (fs.existsSync(file)) continue;
    const res = await fetch(`https://www.gutenberg.org/cache/epub/${id}/pg${id}.txt`, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`Gutenberg ${id}: ${res.status}`);
    fs.writeFileSync(file, await res.text());
    console.log('downloaded', id);
  }
  const puzzles = {};
  for (const [image, v] of Object.entries(verses)) {
    puzzles[image] = { text: cut(image, v), poet: v.poet, poem: v.poem, source: String(v.source) };
    if (v.prose) puzzles[image].prose = true;
  }
  const eds = {};
  for (const id of used) eds[id] = { ...sources[id], url: `https://www.gutenberg.org/ebooks/${id}` };
  fs.writeFileSync(OUT, JSON.stringify({ sources: eds, puzzles }, null, 1) + '\n');
  console.log(`${Object.keys(puzzles).length} passages from ${used.length} editions`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
