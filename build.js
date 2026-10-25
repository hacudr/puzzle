// Copies just the files the app needs into dist/, the web pages the iOS app is
// built from (Capacitor's webDir): node build.js, then npx cap sync ios
// (or both at once: npm run ios).
//
// The app copy differs from the web one in a few ways. Whatever index.html wraps
// in <!-- web-only --> … <!-- /web-only --> is left out: the password page and the
// web manifest, which only the copy hosted in the open needs. Capacitor's runtime,
// capacitor.js, is put in before store.js, so that real purchases go through the
// App Store. The service worker stays behind.
const fs = require('fs');
const path = require('path');

const root = __dirname;
const dist = path.join(root, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'puzzles'), { recursive: true });

const copy = (from, to = from) => {
  fs.mkdirSync(path.dirname(path.join(dist, to)), { recursive: true });
  fs.copyFileSync(path.join(root, from), path.join(dist, to));
};
// every file in a folder whose name passes the test, not its subfolders
const copyDir = (dir, keep) => {
  for (const f of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    if (f.isFile() && keep(f.name)) copy(path.join(dir, f.name));
  }
};

// the page, without what only the web copy needs
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const before = html.length;
html = html.replace(/[ \t]*<!-- web-only -->[\s\S]*?<!-- \/web-only -->\r?\n?/g, '');
if (html.length === before) throw new Error('index.html has no <!-- web-only --> blocks: is the password page still marked?');
if (!html.includes('<script src="store.js"></script>')) throw new Error('index.html does not load store.js');
html = html.replace('<script src="store.js"></script>', '<script src="capacitor.js"></script>\n<script src="store.js"></script>');
fs.writeFileSync(path.join(dist, 'index.html'), html);

for (const file of ['style.css', 'app.js', 'sound.js', 'store.js']) copy(file);
copy('node_modules/@capacitor/core/dist/capacitor.js', 'capacitor.js');

fs.cpSync(path.join(root, 'frames'), path.join(dist, 'frames'), { recursive: true });
// the fonts, with their licence beside them as the OFL asks
copyDir('fonts', (n) => /\.(woff2?|txt)$/.test(n));
// the music: the short clips and the long cuts, not the full recordings in music/sources
copyDir('music', (n) => n.endsWith('.mp3'));
copyDir('music/long', (n) => n.endsWith('.mp3'));
copyDir('sound-effects', (n) => /\.(m4a|mp3)$/.test(n));

// only the pictures listed in puzzles.json, not the full-size originals
const list = JSON.parse(fs.readFileSync(path.join(root, 'puzzles', 'puzzles.json'), 'utf8'));
for (const file of ['puzzles.json', 'artists.json', 'periods.json', 'collections.json', 'blurbs.json', 'stories.json', 'verses.json', 'notes.json']) {
  copy(path.join('puzzles', file));
}
let missing = 0;
for (const p of list) {
  copy(path.join('puzzles', p.image));
  for (const dir of ['thumbs', 'veils']) {
    const from = path.join('puzzles', dir, p.image);
    if (fs.existsSync(path.join(root, from))) copy(from);
    else missing++;
  }
}

// every file the sounds name must be there, or the app is silent where it should not be
const sound = fs.readFileSync(path.join(root, 'sound.js'), 'utf8');
for (const [, file] of sound.matchAll(/file: '([^']+)'/g)) {
  if (!fs.existsSync(path.join(dist, 'sound-effects', file))) throw new Error(`sound-effects/${file} is missing`);
}

let bytes = 0;
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((f) => (f.isDirectory() ? walk(path.join(d, f.name)) : (bytes += fs.statSync(path.join(d, f.name)).size)));
walk(dist);
console.log(`dist/ is ready with ${list.length} puzzles, ${(bytes / 1e6).toFixed(0)} MB${missing ? `; ${missing} thumbnails or blurs are missing` : ''}`);
