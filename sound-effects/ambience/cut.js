// Cuts the ambient sounds heard under a puzzle's ending music (`ambience` in
// puzzles.json, AMBIENT in sound.js) from the Freesound recordings kept in the
// git-ignored sound-effects/sources/ambience/<name>-<id>.mp3: up to thirty
// seconds from `from`, chosen as the steadiest stretch that suits the
// pictures, faded in and out, and evened out to the loudness of the music's
// own recordings (TARGET, the average of music/long/*.mp3), so that sound.js
// can set them all against the music with one number. A brief sound (the
// wings) fades in and out quicker. A sound made of `parts` is first mixed
// from several recordings, each part a stretch of one (`file`, `from`,
// `length`) set in at `at` seconds, `gain` dB louder or softer; `under` sets
// a sparse sound that many dB below the rest, since its quiet gaps would
// otherwise have its few sounds raised too high.
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
  // a dinner party: voices and laughter, a knife and fork on a plate, and four
  // glasses touched together at uneven times (the glass recording alone, one
  // clink every two seconds, was too regular)
  dinner: {
    length: 30,
    parts: [
      { file: 'dinner-480724', from: 19, length: 30, at: 0 },
      { file: 'cutlery-466329', from: 0, length: 19.5, at: 2.5, gain: 4 },
      { file: 'glass-565725', from: 3.06, length: 1.6, at: 5.2, gain: -6 },
      { file: 'glass-565725', from: 12.57, length: 1.6, at: 11.8, gain: -9 },
      { file: 'glass-565725', from: 24.25, length: 1.6, at: 19.4, gain: -7 },
      { file: 'glass-565725', from: 34.83, length: 1.6, at: 26.3, gain: -10 },
    ],
  },
  // four pages turned, about seven seconds apart
  pages: {
    length: 30,
    under: 5,
    parts: [
      { file: 'pages-465260', from: 12.3, length: 2.3, at: 2 },
      { file: 'pages-465260', from: 20.1, length: 2.7, at: 9.5 },
      { file: 'pages-465260', from: 59, length: 4, at: 16.5 },
      { file: 'pages-465260', from: 79.5, length: 3, at: 24 },
    ],
  },
  // a courtyard: pigeons, and the city beyond
  window: { id: 851386, from: 18, length: 30 },
  // the sounds heard once, at the end
  pour: { id: 574563, from: 1.1, length: 9.4, brief: true },
  // three calls, the last a long one
  owl: { id: 745208, from: 4, length: 15, brief: true },
  // two calls; a faint recording, raised a long way
  dove: { id: 456930, from: 3, length: 18.5, brief: true },
  geese: { id: 423346, from: 0.3, length: 11.5, brief: true },
  // a big dog some way off
  dog: { id: 440865, from: 0.6, length: 9.6, brief: true },
  neigh: { id: 347036, from: 0, length: 10.5, brief: true },
  lion: { id: 488348, from: 0, length: 16.5, brief: true },
};

// mixes a sound's parts into one file, to be cut as any recording is
function mix(name, cut) {
  const out = path.join(require('os').tmpdir(), `${name}-mix.wav`);
  const args = ['-y', '-v', 'error'];
  const chains = [];
  cut.parts.forEach((part, i) => {
    args.push('-ss', String(part.from), '-t', String(part.length), '-i', path.join(sources, `${part.file}.mp3`));
    const ms = Math.round(part.at * 1000);
    chains.push(
      `[${i}:a]aformat=channel_layouts=stereo,volume=${part.gain || 0}dB,` +
        `afade=t=in:d=0.08,afade=t=out:st=${Math.max(0, part.length - 0.3)}:d=0.3,adelay=${ms}|${ms}` +
        (i === 0 ? `,apad=whole_dur=${cut.length}` : '') +
        `[p${i}]`
    );
  });
  const inputs = cut.parts.map((_, i) => `[p${i}]`).join('');
  chains.push(`${inputs}amix=inputs=${cut.parts.length}:normalize=0:duration=first[x]`);
  args.push('-filter_complex', chains.join(';'), '-map', '[x]', '-t', String(cut.length), '-ar', '44100', '-ac', '2', '-c:a', 'pcm_s16le', out);
  const r = spawnSync('ffmpeg', args, { encoding: 'utf8' });
  if (r.status) throw new Error(`${name}: ${r.stderr}`);
  return out;
}

function loudness(file, args = []) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...args, '-i', file, '-af', 'ebur128', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = r.stderr.match(/I:\s+(-?[\d.]+) LUFS\s*$/m) || [...r.stderr.matchAll(/I:\s+(-?[\d.]+) LUFS/g)].pop();
  return m ? +m[1] : null;
}

const only = process.argv.slice(2);
for (const [name, cut] of Object.entries(CUTS)) {
  if (only.length && !only.includes(name)) continue;
  const missing = (cut.parts ? cut.parts.map((part) => part.file) : [`${name}-${cut.id}`]).filter(
    (file) => !fs.existsSync(path.join(sources, `${file}.mp3`))
  );
  if (missing.length) {
    console.log(`${name}: no recording at sources/ambience/${missing.join('.mp3, ')}.mp3`);
    continue;
  }
  const source = cut.parts ? mix(name, cut) : path.join(sources, `${name}-${cut.id}.mp3`);
  const window = ['-ss', String(cut.from || 0), '-t', String(cut.length)];
  const level = loudness(source, window);
  const gain = TARGET - (cut.under || 0) - level;
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
  console.log(`${name}: ${cut.length}s from ${cut.from || 0}s,${level} LUFS raised ${gain.toFixed(1)} dB, now ${loudness(out)} LUFS`);
}
