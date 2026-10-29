// A small tool for choosing excerpts for blurbs/picks.json.
//   node blurbs/wiki.js article "<title>"   the article's paragraphs, numbered, as plain text
//   node blurbs/wiki.js search "<query>"    the titles of matching articles
//   node blurbs/wiki.js check <file>        checks every run of sentences in a batch file
//                                           is word for word in one paragraph of its article
// It asks Wikipedia slowly and tries again when asked to wait.
const fs = require('fs');
const UA = 'ArtHistoryPuzzle/1.0 (https://hacudr.github.io/puzzle/)';
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ws = (s) => s.replace(/\s+/g, ' ').trim();

async function get(url) {
  for (let tries = 0; tries < 6; tries++) {
    await wait(700);
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA } });
      const text = await res.text();
      if (res.ok && text.startsWith('{')) return JSON.parse(text);
    } catch {}
    await wait(3000 * (tries + 1));
  }
  throw new Error('Wikipedia did not answer: ' + url);
}

async function article(title) {
  const d = await get(`https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=extracts|info&explaintext=1&inprop=url&redirects=1&titles=${encodeURIComponent(title)}`);
  const p = d.query.pages[0];
  return { title: p.title, url: p.fullurl, missing: !p.extract, paras: (p.extract || '').split(/\n+/).map(ws).filter(Boolean) };
}

const [cmd, arg] = process.argv.slice(2);
(async () => {
  if (cmd === 'article') {
    const a = await article(arg);
    if (a.missing) return console.log('No such article:', arg);
    console.log(`# ${a.title}\n`);
    a.paras.forEach((p, i) => console.log(`[${i}] ${p}\n`));
  } else if (cmd === 'search') {
    const d = await get(`https://en.wikipedia.org/w/api.php?action=query&list=search&format=json&srlimit=10&srsearch=${encodeURIComponent(arg)}`);
    for (const s of d.query.search) console.log(s.title);
  } else if (cmd === 'check') {
    const batch = JSON.parse(fs.readFileSync(arg, 'utf8'));
    const cache = {};
    let bad = 0;
    for (const item of batch) {
      for (const [title, sentences] of item.parts || []) {
        cache[title] = cache[title] || (await article(title));
        const run = ws(sentences.join(' '));
        if (!cache[title].paras.some((p) => p.includes(run))) {
          bad++;
          console.log(`NOT FOUND  ${item.image}  "${title}": ${run.slice(0, 100)}…`);
          for (const s of sentences) if (!cache[title].paras.some((p) => p.includes(ws(s)))) console.log(`   this sentence is not in the article: ${s.slice(0, 100)}`);
        }
      }
    }
    console.log(bad ? `${bad} runs to fix` : `all ${batch.length} checked: every run is word for word`);
  } else {
    console.log('node blurbs/wiki.js article "<title>" | search "<query>" | check <file>');
  }
})();
