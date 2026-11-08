// Makes the pizzicato and harp the puzzle's notes can be played on, chosen in
// Settings in place of the piano: node sound-effects/vsco.js
//
// The notes are from VSCO 2 Community Edition (Versilian Studios, CC0,
// https://github.com/sgossner/VSCO-2-CE): the violin section's pizzicato, with
// the cello section's below the violins' lowest string, and the concert harp.
// The originals are downloaded into sound-effects/sources/vsco/ (git-ignored).
// Each is cut from where the note starts, faded at its end and evened out in
// loudness, and saved as sound-effects/<instrument>/<note>.mp3 (Cs4 for C#4).
// Then it prints, for sound.js, the notes there are and how far each is from
// true pitch, in cents, measured here.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const BASE = 'https://raw.githubusercontent.com/sgossner/VSCO-2-CE/master/';
const SOURCES = path.join(__dirname, 'sources', 'vsco');
const sr = 44100;

// keep = seconds kept of each note; the ensembles name every note an octave low
const INSTRUMENTS = {
  pizzicato: {
    keep: 1.6,
    files: [
      ...['G2', 'A2', 'B2', 'D3', 'F#3', 'A3', 'C4', 'E4', 'G4', 'B4', 'D5'].map((n) => [`Strings/Violin Section/Pizz/VlnEns_Pizz_${n}_v1_rr1.wav`, 12]),
      // the cellos, for what lies below the violins
      ...['C1', 'E1', 'G1', 'B1', 'D2', 'F2'].map((n) => [`Strings/Cello Section/pizzT/pizzT_${n}_v1_RR1.wav`, 12]),
    ],
  },
  harp: {
    keep: 3,
    files: ['B1', 'D2', 'F2', 'A2', 'C3', 'E3', 'G3', 'B3', 'D4', 'F4', 'A4', 'C5', 'E5', 'G5', 'B5', 'D6', 'F6', 'A6'].map((n) => [`Strings/Harp/KSHarp_${n}_mf.wav`, 0]),
  },
};

const SEMI = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const NAMES = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'];
const named = (f) => {
  const [, l, a, o] = path.basename(f).match(/_([A-G])(#?)(\d)_/);
  return 12 * (+o + 1) + SEMI[l] + (a ? 1 : 0);
};

function pcm(file, from, len) {
  const b = execFileSync('ffmpeg', ['-v', 'error', '-ss', String(from), '-t', String(len), '-i', file, '-ac', '1', '-ar', String(sr), '-f', 'f32le', '-']);
  return new Float32Array(b.buffer, b.byteOffset, b.length / 4);
}

// where the note starts: just before it first comes within 30 dB of its peak
function onset(file) {
  const x = pcm(file, 0, 2);
  let peak = 0;
  for (const v of x) peak = Math.max(peak, Math.abs(v));
  for (let i = 0; i < x.length; i++) if (Math.abs(x[i]) > peak * 0.03) return Math.max(0, i / sr - 0.01);
  return 0;
}

// its pitch a quarter of a second in (YIN), as a MIDI number with a fraction
function pitch(file, start) {
  const x = pcm(file, start + 0.25, 0.25);
  const W = 4096;
  const maxTau = Math.floor(sr / 50);
  const minTau = Math.floor(sr / 2200);
  const d = new Float64Array(maxTau + 1);
  for (let t = 1; t <= maxTau; t++) {
    let s = 0;
    for (let i = 0; i < W; i++) s += (x[i] - x[i + t]) ** 2;
    d[t] = s;
  }
  const c = new Float64Array(maxTau + 1);
  let run = 0;
  for (let t = 1; t <= maxTau; t++) c[t] = (d[t] * t) / (run += d[t]);
  let tau = -1;
  for (let t = minTau; t < maxTau; t++)
    if (c[t] < 0.15) {
      while (t + 1 < maxTau && c[t + 1] < c[t]) t++;
      tau = t;
      break;
    }
  if (tau < 0) return NaN;
  const [a, b, e] = [c[tau - 1], c[tau], c[tau + 1]];
  const p = tau + (a - e) / (2 * (a - 2 * b + e) || 1);
  return 69 + 12 * Math.log2(sr / p / 440);
}

fs.mkdirSync(SOURCES, { recursive: true });
for (const [name, inst] of Object.entries(INSTRUMENTS)) {
  const dir = path.join(__dirname, name);
  fs.mkdirSync(dir, { recursive: true });
  const notes = [];
  for (const [file, octaveLow] of inst.files) {
    const local = path.join(SOURCES, path.basename(file));
    if (!fs.existsSync(local)) execFileSync('curl', ['-s', '-f', '-A', 'art-history-puzzle', '-o', local, BASE + file.split('/').map(encodeURIComponent).join('/')]);
    const midi = named(file) + octaveLow;
    const start = onset(local);
    // the measurement only fine-tunes: a reading far off is a harmonic, and is not trusted
    const measured = pitch(local, start);
    const off = measured - midi - 12 * Math.round((measured - midi) / 12);
    const cents = Math.abs(off) < 0.35 ? Math.round(off * 100) : 0;
    const out = NAMES[midi % 12] + (Math.floor(midi / 12) - 1) + '.mp3';
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', String(start), '-t', String(inst.keep), '-i', local, '-ac', '1',
      '-af', `afade=t=out:st=${inst.keep - 0.4}:d=0.4,loudnorm=I=-20:TP=-2:LRA=11`, '-ar', String(sr), '-b:a', '128k', path.join(dir, out)]);
    notes.push([midi, cents]);
  }
  notes.sort((a, b) => a[0] - b[0]);
  console.log(`${name}: [${notes.map(([m, c]) => `[${m}, ${c}]`).join(', ')}],`);
}
