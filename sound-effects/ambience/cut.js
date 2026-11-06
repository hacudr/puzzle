// Cuts the ambient sounds heard under a puzzle's ending music (`ambience` in
// puzzles.json, AMBIENT in sound.js) from the Freesound recordings kept in the
// git-ignored sound-effects/sources/ambience/<name>-<id>.mp3: up to thirty
// seconds from `from`, chosen as the steadiest stretch that suits the
// pictures, faded in and out, and evened out to the loudness of the music's
// own recordings (TARGET, the average of music/long/*.mp3), so that sound.js
// can set them all against the music with one number. A brief sound (the
// wings) fades in and out quicker.
//
//   node sound-effects/ambience/cut.js          cuts them all
//   node sound-effects/ambience/cut.js river    cuts one again
//
// Where each recording came from, and its licence, is in sound-effects/CREDITS.md.
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const here = __dirname;
const sources = path.join(here, '..', 'sources', 'ambience');
const TARGET = -17.5;

const CUTS = {
  river: { id: 459412, from: 14, length: 30 },
  brook: { id: 639128, from: 9, length: 30 },
  rain: { id: 501243, from: 19, length: 30 },
  // the rain, then a roll of thunder ten seconds in
  storm: { id: 577846, from: 28, length: 30 },
  sea: { id: 648860, from: 36, length: 30 },
  shore: { id: 250088, from: 6, length: 28 },
  harbour: { id: 829207, from: 97, length: 30 },
  rowing: { id: 253162, from: 24, length: 30 },
  birds: { id: 156002, from: 20, length: 30 },
  // the wind gusting through the branches twice
  wind: { id: 523389, from: 35, length: 30 },
  leaves: { id: 129427, from: 0, length: 21 },
  bees: { id: 566112, from: 22, length: 30 },
  crickets: { id: 522299, from: 58, length: 30 },
  sheep: { id: 430590, from: 105, length: 30 },
  // a horse and cart drawing near and going by
  cart: { id: 538438, from: 0, length: 30 },
  // from the first half, recorded standing in one place in the market
  market: { id: 371222, from: 621, length: 30 },
  street: { id: 423119, from: 0, length: 29 },
  // a full peal, Christmas morning in Hamburg
  bells: { id: 212037, from: 236, length: 30 },
  // drawing near, the whistle as it passes, and slowing to a stop
  train: { id: 119125, from: 18, length: 30 },
  fire: { id: 382616, from: 39, length: 30 },
  wings: { id: 670509, from: 3, length: 11, brief: true },
  flight: { id: 753219, from: 20, length: 17, brief: true },
  // two people walking on gravel, coming in slowly and going off slowly, as
  // if passing along a garden path; heard now and then under the birds
  footsteps: { id: 553136, from: 10, length: 9, fadeIn: 2.5, fadeOut: 3.5 },
};

function loudness(file, args = []) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...args, '-i', file, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = r.stderr.match(/I:\s+(-?[\d.]+) LUFS\s*$/m) || [...r.stderr.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].pop();
  return m ? +m[1] : null;
}

const only = process.argv.slice(2);
for (const [name, cut] of Object.entries(CUTS)) {
  if (only.length && !only.includes(name)) continue;
  const source = path.join(sources, `${name}-${cut.id}.mp3`);
  if (!fs.existsSync(source)) {
    console.log(`${name}: no recording at ${path.relative(process.cwd(), source)}`);
    continue;
  }
  const window = ['-ss', String(cut.from), '-t', String(cut.length)];
  const level = loudness(source, window);
  const gain = TARGET - level;
  const fadeIn = cut.fadeIn || (cut.brief ? 0.3 : 1.5);
  const fadeOut = cut.fadeOut || (cut.brief ? 1.5 : 4);
  const out = path.join(here, `${name}.mp3`);
  const filter = [
    `volume=${gain.toFixed(2)}dB`,
    'alimiter=limit=0.89:level=false',
    `afade=t=in:d=${fadeIn}`,
    `afade=t=out:st=${cut.length - fadeOut}:d=${fadeOut}`,
  ].join(',');
  const r = spawnSync('ffmpeg', ['-y', '-v', 'error', ...window, '-i', source, '-af', filter, '-ar', '44100', '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '128k', out], { encoding: 'utf8' });
  if (r.status) throw new Error(`${name}: ${r.stderr}`);
  console.log(`${name}: ${cut.length}s from ${cut.from}s, ${level} LUFS raised ${gain.toFixed(1)} dB, now ${loudness(out)} LUFS`);
}
