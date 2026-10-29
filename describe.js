// Writes the "About the painting" text for each puzzle in a category into
// puzzles/blurbs.json: the opening of the painting's English Wikipedia article
// where it has one (CC BY-SA 4.0, credited on the card), and otherwise the
// museum's own description: Cleveland's (CC0), the Art Institute of Chicago's
// (CC BY 4.0, credited) or the National Gallery of Art's (CC0).
// A puzzle may name an `article` of its own: the painting's article where its
// record does not lead to one, or else one on its sitter, place or kind of object.
// The painting's own article, found through Wikidata, comes first.
// node describe.js Impressionism
// node describe.js all
// Records kept in another folder are read too with --records <folder>.
// Where blurbs/picks.json chooses sentences for a picture, the card has those
// instead of the article's opening: whole sentences copied word for word from
// the article (or articles) named, each run of them a paragraph of its own.
// Each run is checked against the article as it now stands; one that no longer
// matches is reported, and the picture falls back to the opening.
// node describe.js picks   rebuilds only the pictures with chosen sentences.
const fs = require('fs');
const path = require('path');

const UA = 'ArtHistoryPuzzle/1.0 (https://hacudr.github.io/puzzle/)';
// an excerpt is cut at the end of a sentence once it has this many words
const WORDS = 120;
const dir = path.join(__dirname, 'puzzles');
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const args = process.argv.slice(2);
const folders = [path.join(dir, 'images')];
for (let i = args.indexOf('--records'); i >= 0; i = args.indexOf('--records')) folders.push(...args.splice(i, 2).slice(1));
const category = args[0];
if (!category) throw new Error('Name a category, or all: node describe.js Impressionism');
const picks = read(path.join(__dirname, 'blurbs', 'picks.json'));
const artists = read(path.join(dir, 'artists.json'))
  .filter((a) => category === 'all' || category === 'picks'|| a.period === category || (a.also || []).includes(category))
  .map((a) => a.name);
const puzzles = read(path.join(dir, 'puzzles.json')).filter((p) => (category === 'picks' ? picks[p.image] : category === 'all' || artists.includes(p.artist)));
if (!puzzles.length) throw new Error(`No puzzles under ${category}`);

// Every record beside the originals, by the slug of each picture in it.
const records = {};
for (const folder of folders) {
  for (const file of fs.readdirSync(folder).filter((f) => f.endsWith('.json'))) {
    const source = file.split('.').slice(-2, -1)[0];
    for (const w of read(path.join(folder, file)).works || []) {
      const slug = w.file.replace(/\.\w+$/, '');
      (records[slug] = records[slug] || []).push({ ...w, source });
    }
  }
}

async function get(url) {
  for (let tries = 0; ; tries++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (res.ok) return res.json();
    if (tries > 2 || res.status === 404) throw new Error(`${url}: ${res.status}`);
    await wait(3000);
  }
}

const plain = (html) => html.replace(/<\/p>/g, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');

// Whole sentences, up to about WORDS words, and always at least the first.
function excerpt(text) {
  text = tidy(text.replace(/\s+/g, ' '));
  const sentences = text.match(/[^.!?]+(?:[.!?]+["”’)]*|$)\s*/g) || [text];
  let out = '';
  for (const s of sentences) {
    if (out && (out + s).split(/\s+/).length > WORDS) break;
    out += s;
  }
  return named(out.replace(/\s+/g, ' ').trim());
}

// An article's opening brackets of pronunciation and other scripts are no use
// on the card: "Lamassu (Cuneiform: 𒀭𒆗, an.kal; …) is" reads "Lamassu is".
// A bracket left empty or begun with a semicolon, where Wikipedia's audio link
// was, goes too. Inner brackets go first, so "(plural: condottieri (Italian:
// [kondotˈtjɛːri]))" keeps "(plural: condottieri)". A plain original title,
// "(French: La Prune)", stays.
const SCRIPT = /[^\u0000-\u024F\u1E00-\u1EFF\u2000-\u206F\u20A0-\u20CF\u2190-\u22FF]/u;
function tidy(text) {
  for (let last; last !== text; ) {
    last = text;
    text = text.replace(/\s*\(([^()]*)\)/g, (all, inner) =>
      !inner.trim() || /^[\s;,]/.test(inner) || /\[|romanized|pronunciation/i.test(inner) || SCRIPT.test(inner) ? '' : all);
  }
  return text;
}

// "Van Gogh" is not a surname to stand alone: he is always Vincent van Gogh
// (his brother Theo van Gogh keeps his own name, as does Theo's wife Johanna)
const named = (text) => text.replace(/(?<!\b\p{Lu}\p{Ll}+ )\b[Vv]an Gogh\b/gu, 'Vincent van Gogh');

// The whole text of each article, a paragraph to a line, for the chosen sentences.
const ws = (text) => text.replace(/\s+/g, ' ').trim();
async function fullText(titles) {
  const out = {};
  for (const title of titles) {
    const data = await get(`https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=extracts|info&explaintext=1&inprop=url&redirects=1&titles=${encodeURIComponent(title)}`);
    const page = data.query.pages[0];
    if (page.extract) out[title] = { title: page.title, url: page.fullurl, paras: page.extract.split(/\n+/).map(ws) };
    await wait(200);
  }
  return out;
}

// A picture's chosen sentences, if each run of them still stands in its article.
function picked(image, full) {
  const runs = picks[image].parts.map(([title, sentences]) => ({ title, text: ws(sentences.join(' ')) }));
  const gone = runs.filter((r) => !(full[r.title] && full[r.title].paras.some((p) => p.includes(r.text))));
  for (const r of gone) console.warn(`  ${image}: no longer in "${r.title}": ${r.text.slice(0, 80)}…`);
  if (gone.length) return null;
  const used = [...new Set(runs.map((r) => r.title))].map((t) => ({ article: full[t].title, url: full[t].url }));
  return {
    text: named(runs.map((r) => r.text).join('\n\n')),
    source: 'Wikipedia',
    article: used[0].article,
    url: used[0].url,
    ...(used.length > 1 ? { articles: used } : {}),
    licence: 'CC BY-SA 4.0',
    licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
  };
}

async function main() {
  const wanted = puzzles.map((p) => {
    const recs = records[p.image.replace(/\.\w+$/, '')] || [];
    const of = (source) => recs.find((r) => r.source === source);
    return { p, wikidata: (recs.find((r) => r.wikidata) || {}).wikidata, met: of('met'), aic: of('aic'), cma: of('cma'), nga: of('nga') };
  });

  // The Met's records name no Wikidata item, but its API does. It wants asking slowly.
  for (const w of wanted.filter((w) => !w.wikidata && w.met)) {
    try {
      const o = await get(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${w.met.id}`);
      w.wikidata = (o.objectWikidata_URL || '').split('/').pop() || undefined;
    } catch (err) {
      console.warn('Met', w.met.id, err.message);
    }
    await wait(1000);
  }

  // Wikidata gives the English article, if there is one, of each picture.
  // some records give the item's whole address rather than its id
  for (const w of wanted) w.wikidata = w.wikidata && w.wikidata.split('/').pop();
  const ids = [...new Set(wanted.map((w) => w.wikidata).filter((id) => /^Q\d+$/.test(id || '')))];
  const article = {};
  for (let i = 0; i < ids.length; i += 50) {
    const data = await get(`https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&props=sitelinks&sitefilter=enwiki&ids=${ids.slice(i, i + 50).join('|')}`);
    for (const [id, e] of Object.entries(data.entities)) if (e.sitelinks && e.sitelinks.enwiki) article[id] = e.sitelinks.enwiki.title;
  }

  // The opening of each article, as plain text.
  const titles = [...new Set([...Object.values(article), ...wanted.map((w) => w.p.article).filter(Boolean)])];
  const intro = {};
  for (let i = 0; i < titles.length; i += 20) {
    const q = encodeURIComponent(titles.slice(i, i + 20).join('|'));
    const data = await get(`https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=extracts|info&exintro=1&explaintext=1&exlimit=20&inprop=url&redirects=1&titles=${q}`);
    const back = Object.fromEntries((data.query.redirects || []).map((r) => [r.to, r.from]));
    for (const page of data.query.pages) if (page.extract) intro[back[page.title] || page.title] = { title: page.title, url: page.fullurl, text: page.extract };
  }

  const file = path.join(dir, 'blurbs.json');
  const blurbs = fs.existsSync(file) ? read(file) : {};
  const tally = {};
  const none = [];
  const full = await fullText([...new Set(wanted.flatMap((w) => (picks[w.p.image] ? picks[w.p.image].parts.map((part) => part[0]) : [])))]);
  for (const w of wanted) {
    let b = picks[w.p.image] ? picked(w.p.image, full) : null;
    const wiki = intro[article[w.wikidata]] || intro[w.p.article];
    if (b) {
      // the chosen sentences stand
    } else if (wiki) {
      b = { text: excerpt(wiki.text), source: 'Wikipedia', article: wiki.title, url: wiki.url, licence: 'CC BY-SA 4.0', licenceUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' };
    } else if (w.cma) {
      const d = (await get(`https://openaccess-api.clevelandart.org/api/artworks/${w.cma.id}`)).data;
      const text = d.wall_description || d.description;
      if (text) b = { text: excerpt(plain(text)), source: 'Cleveland Museum of Art', url: w.cma.url, licence: 'CC0' };
    }
    if (!b && w.aic) {
      const d = (await get(`https://api.artic.edu/api/v1/artworks/${w.aic.id}?fields=description`)).data;
      if (d.description) b = { text: excerpt(plain(d.description)), source: 'Art Institute of Chicago', url: w.aic.url, licence: 'CC BY 4.0', licenceUrl: 'https://creativecommons.org/licenses/by/4.0/' };
    }
    if (!b && w.nga && w.nga.looks) b = { text: excerpt(w.nga.looks), source: 'National Gallery of Art', licence: 'CC0' };
    if (b) {
      blurbs[w.p.image] = b;
      tally[b.source] = (tally[b.source] || 0) + 1;
    } else {
      delete blurbs[w.p.image];
      none.push(w.p.image);
    }
  }
  fs.writeFileSync(file, JSON.stringify(blurbs, null, 2) + '\n');
  console.log(`${category}:`, tally, `${none.length} with none`);
  for (const image of none) console.log('  none:', image);
}

main();
