// Copies just the files the app needs into dist/, ready to upload to a host: node build.js
const fs = require('fs');
const path = require('path');

const dist = path.join(__dirname, 'dist');
fs.rmSync(dist, { recursive: true, force: true });
fs.mkdirSync(path.join(dist, 'puzzles'), { recursive: true });

for (const file of ['index.html', 'style.css', 'app.js', 'sw.js', 'manifest.webmanifest']) {
  fs.copyFileSync(path.join(__dirname, file), path.join(dist, file));
}
fs.cpSync(path.join(__dirname, 'icons'), path.join(dist, 'icons'), { recursive: true });

// only the pictures listed in puzzles.json, not the full-size originals
const list = JSON.parse(fs.readFileSync(path.join(__dirname, 'puzzles', 'puzzles.json'), 'utf8'));
fs.copyFileSync(path.join(__dirname, 'puzzles', 'puzzles.json'), path.join(dist, 'puzzles', 'puzzles.json'));
for (const p of list) {
  const to = path.join(dist, 'puzzles', p.image);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(path.join(__dirname, 'puzzles', p.image), to);
}
console.log(`dist/ is ready with ${list.length} puzzles`);
