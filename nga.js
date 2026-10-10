// Fetches an artist's open-access pictures from the National Gallery of Art's
// open data (https://github.com/NationalGalleryOfArt/opendata) into
// puzzles/images/, with a <lastname>.nga.json of what the gallery says about
// each one: node nga.js "Claude Monet"
const fs = require('fs');
const path = require('path');

const DATA = 'https://raw.githubusercontent.com/NationalGalleryOfArt/opendata/main/data/';
// longest side of the copy kept as the original; the scans themselves run to 30,000 px
const MASTER = 4096;
const out = path.join(__dirname, 'puzzles', 'images');

// Reads one of the gallery's CSV tables as it downloads, keeping the rows wanted.
async function rows(name, keep) {
  const res = await fetch(DATA + name + '.csv');
  if (!res.ok) throw new Error(`${name}.csv: ${res.status}`);
  const text = new TextDecoder();
  const kept = [];
  let head, row = [], field = '', quoted = false, quoteSeen = false;
  const endField = () => (row.push(field), (field = ''));
  const endRow = () => {
    endField();
    if (!head) head = row;
    else if (row.length > 1) {
      const r = Object.fromEntries(head.map((h, i) => [h, row[i]]));
      if (keep(r)) kept.push(r);
    }
    row = [];
  };
  for await (const chunk of res.body) {
    for (const c of text.decode(chunk, { stream: true })) {
      if (quoted) {
        if (!quoteSeen) {
          if (c === '"') quoteSeen = true;
          else field += c;
          continue;
        }
        quoteSeen = false;
        if (c === '"') {
          field += c;
          continue;
        }
        quoted = false;
      }
      if (c === '"') quoted = true;
      else if (c === ',') endField();
      else if (c === '\n') endRow();
      else if (c !== '\r') field += c;
    }
  }
  if (field || row.length) endRow();
  return kept;
}

const plain = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// "Woman with a Parasol - Madame Monet and Her Son" -> "woman-with-a-parasol"
const slug = (s) => plain(s.replace(/\(.*?\)/g, '').split(' - ')[0]).replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function main() {
  const wanted = process.argv[2];
  if (!wanted) throw new Error('Usage: node nga.js "Artist Name"');
  const artists = await rows('constituents', (r) => plain(r.forwarddisplayname) === plain(wanted) || plain(r.preferreddisplayname) === plain(wanted));
  if (artists.length !== 1) {
    throw new Error(`${artists.length} artists match "${wanted}"` + artists.map((a) => `\n  ${a.forwarddisplayname}, ${a.displaydate}`).join(''));
  }
  const artist = artists[0];
  const prefix = slug(artist.lastname || artist.forwarddisplayname);

  const roles = new Map();
  await rows('objects_constituents', (r) => r.constituentid === artist.constituentid && r.roletype === 'artist' && roles.set(r.objectid, r.role));
  const [objects, images, terms] = await Promise.all([
    rows('objects', (r) => roles.has(r.objectid)),
    rows('published_images', (r) => roles.has(r.depictstmsobjectid) && r.viewtype === 'primary' && r.openaccess === '1'),
    rows('objects_terms', (r) => roles.has(r.objectid) && r.termtype !== 'Systematic Catalogue Volume'),
  ]);

  fs.mkdirSync(out, { recursive: true });
  const works = [];
  const taken = new Set();
  for (const o of objects.sort((a, b) => a.beginyear - b.beginyear || a.objectid - b.objectid)) {
    const image = images.find((i) => i.depictstmsobjectid === o.objectid);
    if (!image) continue;
    let name = `${prefix}-${slug(o.title)}`;
    if (taken.has(name)) name += '-' + o.objectid;
    taken.add(name);
    const file = name + '.jpg';
    if (!fs.existsSync(path.join(out, file))) {
      const res = await fetch(`${image.iiifurl}/full/!${MASTER},${MASTER}/0/default.jpg`);
      if (!res.ok) throw new Error(`${o.title}: ${res.status}`);
      fs.writeFileSync(path.join(out, file), Buffer.from(await res.arrayBuffer()));
      console.log('fetched', file);
    }
    works.push({
      file,
      title: o.title,
      date: o.displaydate,
      medium: o.medium,
      dimensions: o.dimensions,
      classification: o.classification,
      attribution: o.attribution,
      role: roles.get(o.objectid),
      inscription: o.inscription,
      creditline: o.creditline,
      accession: o.accessionnum,
      wikidata: o.wikidataid,
      terms: terms.filter((t) => t.objectid === o.objectid).map((t) => `${t.termtype}: ${t.term}`),
      looks: image.assistivetext,
    });
  }
  const about = { name: artist.forwarddisplayname, dates: artist.displaydate, wikidata: artist.wikidataid, works };
  fs.writeFileSync(path.join(out, prefix + '.nga.json'), JSON.stringify(about, null, 2));
  console.log(`${works.length} pictures by ${about.name} are in puzzles/images/, described in ${prefix}.nga.json`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
