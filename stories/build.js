// Builds puzzles/stories.json from the spec files, pulling every excerpt
// word for word out of the public-domain texts in ./texts.
//   node stories/build.js
// The spec in stories/spec/ holds the stories ("subjects"), the passages (a
// Bible reference, or a start and end phrase in one of the texts) and, for each
// puzzle, its subject, a note on what the picture shows and which passages go
// with it. stories/spec/sources.js names every edition. The texts themselves
// (Project Gutenberg, Wikisource, the Fordham Golden Legend, CCEL) are kept in
// stories/texts/, which is git-ignored; the URLs are in sources.js.
// Review the result at mockups/stories-review.html (served by node serve.js).
const fs = require('fs'), path = require('path');
const L = require('./lib');
const REPO = path.join(__dirname, '..');
const SOURCES = require('./spec/sources');
const parts = ['bible', 'saints', 'myth', 'literature', 'history'].map(n => require('./spec/' + n));

const subjects = {}, passages = {}, puzzles = {};
for (const p of parts) {
  for (const [k, v] of Object.entries(p.subjects || {})) { if (subjects[k]) throw Error('dup subject ' + k); subjects[k] = v; }
  for (const [k, v] of Object.entries(p.passages || {})) { if (passages[k]) throw Error('dup passage ' + k); passages[k] = v; }
  for (const [k, v] of Object.entries(p.puzzles || {})) { if (puzzles[k]) throw Error('dup puzzle ' + k); puzzles[k] = v; }
}

function clean(t, o = {}) {
  t = t.replace(/\[Illustration[^\]]*\]/g, '')
       .replace(/\[(\d+|[a-z])\]/g, '')            // footnote markers
       .replace(/\[(have|named)\]/g, '$1')          // editorial insertions kept as words
       .replace(/[{}]/g, '')                        // Riley's bracketed supplied words
       .replace(/_/g, '')                           // italics markers
       .replace(/\u200b/g, '');
  if (o.fnDigits) t = t.replace(/([A-Za-z,;:.’'])\d{2,3}(?=[\s,;.]|$)/g, '$1');
  if (o.verse) {
    t = t.split('\n').map(l => l.replace(/\s{3,}\d+\s*$/, '').replace(/\s+$/, '')).join('\n');
    if (o.dropLines) t = t.split('\n').filter(l => !new RegExp(o.dropLines).test(l.trim())).join('\n');
    if (o.squash) t = t.split('\n').filter(l => l.trim()).join('\n');
    if (o.stanza) { const ls = t.split('\n').filter(l => l.trim()); t = ls.map((l, i) => (i && i % o.stanza === 0 ? '\n' : '') + l).join('\n'); }
    t = t.replace(/\n{3,}/g, '\n\n').trim();
  } else t = t.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim();
  t = t.replace(/-{2,}/g, '—').replace(/\n{3,}/g, '\n\n');
  if (o.verse) t = t.split('\n').map(l => l.replace(/(\S) {2,}(?=\S)/g, '$1 ')).join('\n');
  else t = t.replace(/(\S) {2,}(?=\S)/g, '$1 ');
  for (const [a, b] of o.fix || []) { if (!t.includes(a)) throw Error('fix not found: ' + a); t = t.split(a).join(b); }
  if (o.lead) t = '… ' + t.replace(/^[a-z]/, c => c);
  if (o.trail || /[,;:]$/.test(t)) t = t.replace(/[,;:—-]?\s*$/, '') + ' …';
  return t;
}

const out = { passages: {} }, errors = [];
for (const [id, p] of Object.entries(passages)) {
  try {
    const src = SOURCES[p.src]; if (!src) throw Error('no source ' + p.src);
    let text;
    if (p.bible) text = p.bible.split(';').map(r => L.bible(r.trim())).join(' … ');
    else if (p.text) text = p.text;
    else text = L.grab(p.file || src.file, p.start, p.end, { after: p.after, verse: p.verse });
    text = clean(text, { ...src.clean, ...p });
    out.passages[id] = { text, cite: p.cite || p.bible, source: p.src, ...(p.note ? { note: p.note } : {}) };
  } catch (e) { errors.push(id + ': ' + e.message); }
}

const images = new Set(fs.readdirSync(path.join(REPO, 'puzzles')).filter(f => f.endsWith('.webp')));
const listed = new Set(require(path.join(REPO, 'puzzles/puzzles.json')).map(p => p.image));
const pz = {};
for (const [slug, v] of Object.entries(puzzles)) {
  const img = slug + '.webp';
  if (!images.has(img) || !listed.has(img)) errors.push('no puzzle ' + img);
  for (const s of [].concat(v.subject || [])) if (!subjects[s]) errors.push(img + ': no subject ' + s);
  for (const q of v.passages || []) if (!passages[q]) errors.push(img + ': no passage ' + q);
  pz[img] = v;
}
const used = new Set(Object.values(puzzles).flatMap(v => v.passages || []));
for (const id of Object.keys(passages)) if (!used.has(id)) errors.push('unused passage ' + id);
const usedS = new Set(Object.values(puzzles).flatMap(v => [].concat(v.subject || [])));
for (const id of Object.keys(subjects)) if (!usedS.has(id)) errors.push('unused subject ' + id);

if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
const doc = {
  about: 'The stories behind the pictures: what each one shows, the history, scripture, myth or literature it comes from, and passages from those texts. Every passage is copied word for word from a public-domain edition named in "sources". Drafted for review; not yet shown in the app.',
  sources: Object.fromEntries(Object.entries(SOURCES).map(([k, v]) => [k, { title: v.title, author: v.author, ...(v.translator ? { translator: v.translator } : {}), edition: v.edition, url: v.url, licence: v.licence || 'Public domain in the United States' }])),
  subjects, passages: out.passages, puzzles: pz,
};
fs.writeFileSync(path.join(REPO, 'puzzles/stories.json'), JSON.stringify(doc, null, 1) + '\n');
console.log(`subjects ${Object.keys(subjects).length}, passages ${Object.keys(out.passages).length}, puzzles ${Object.keys(pz).length}, errors ${errors.length}`);
