// Writes the blurred stand-ins an artist's page shows for the pictures not yet solved,
// to puzzles/veils/<slug>.webp: the picture brought down to 8 pixels across its
// shorter side, so only its colours and broad shapes are left, then smoothed back up to 200 at
// its own shape. Run it for every picture, or for a category:
// node veil.js all, node veil.js Impressionism
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const want = process.argv[2];
if (!want) {
  console.error('Name a category, or all, as in: node veil.js Impressionism');
  process.exit(1);
}
const read = (file) => JSON.parse(fs.readFileSync(path.join(__dirname, 'puzzles', file), 'utf8'));
const names = read('artists.json')
  .filter((a) => a.period === want || (a.also || []).includes(want))
  .map((a) => a.name);
const list = read('puzzles.json').filter((p) => want === 'all' || names.includes(p.artist));
fs.mkdirSync(path.join(__dirname, 'puzzles', 'veils'), { recursive: true });
let made = 0;
for (const p of list) {
  const from = path.join(__dirname, 'puzzles', 'thumbs', p.image);
  const to = path.join(__dirname, 'puzzles', 'veils', p.image);
  if (fs.existsSync(to)) continue;
  const [w, h] = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', from])
    .toString()
    .trim()
    .split(',')
    .map(Number);
  const k = 200 / Math.min(w, h);
  const big = [w, h].map((n) => 2 * Math.round((n * k) / 2));
  const small = w > h ? '-2:8' : '8:-2';
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', from, '-vf', `scale=${small}:flags=area,scale=${big[0]}:${big[1]}:flags=bicubic,gblur=sigma=9`, '-c:v', 'libwebp', '-quality', '60', to]);
  made++;
}
console.log(`${made} veils written for ${want}, ${list.length - made} already there`);
