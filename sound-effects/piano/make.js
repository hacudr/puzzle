// Makes the puzzle's piano: one file per key, C3 to C6, cut from the owner's
// recording of every key played in turn, sound-effects/sources/Piano Tones -
// Low C to Middle C to High C.m4a (git-ignored). node sound-effects/piano/make.js
//
// Each key is cleaned before it is saved:
// 1. the keys before it, still ringing a semitone or so below and beating
//    against it, which was heard as a buzz: whatever sounds in the moment
//    before the strike gets a narrow notch, unless it is one of this key's own
//    harmonics;
// 2. the mains hum, 60 Hz and its multiples;
// 3. the rumble below the note and the fizz above 9 kHz the original's
//    compression left;
// 4. the side strings: each key has two or three strings, a little out of tune
//    with each other on this piano, which make the tone waver, so the
//    strongest stray peaks beside each of its first eight harmonics are notched.
// Then each is evened out in loudness and faded at its end. How far each key
// was from true pitch is KEY_CENTS in sound.js, put right as it plays.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const SOURCE = path.join(__dirname, '..', 'sources', 'Piano Tones - Low C to Middle C to High C.m4a');
const sr = 48000;
// when each key is struck, in seconds, C3 first, found by ear and measurement
const STRIKES = [
  1.135, 4.125, 7.145, 9.935, 12.64, 15.445, 18.005, 20.61, 23.245, 25.66, 28.155, 30.75,
  33.515, 36.375, 39.355, 42.285, 45.205, 48.025, 50.905, 53.835, 56.81, 59.595, 62.34, 65.15,
  67.915, 70.555, 73.14, 75.535, 78.06, 80.605, 83.195, 85.745, 88.1, 90.585, 93.2, 95.61, 97.92,
];
// how far each key was from true, in cents, as in KEY_CENTS in sound.js
const CENTS = [
  -12, -9, -14, -9, -3, -3, -1, -9, -13, -11, -10, 11, 0, -5, -4, 1, -3, 4, 1,
  -3, -7, -5, 0, -7, -12, -5, -3, -5, 2, 1, 2, -5, -2, 0, 2, -4, -2,
];
const NAMES = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B'];
const LEN = 2.4; // seconds kept of each key, at most
const FADE = 0.4; // seconds it fades over at its end
const TARGET = 0.09; // loudness of the first 0.4 s, as rms

const pcm = execFileSync('ffmpeg', ['-v', 'error', '-i', SOURCE, '-f', 'f32le', '-ac', '1', '-ar', String(sr), '-'], { maxBuffer: 1 << 30 });
const d = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.length / 4);

function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j], re[i]];
      [im[i], im[j]] = [im[j], im[i]];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const a = (-2 * Math.PI) / len;
    for (let i = 0; i < n; i += len) {
      for (let j = 0; j < len / 2; j++) {
        const c = Math.cos(a * j), s = Math.sin(a * j);
        const ur = re[i + j], ui = im[i + j];
        const vr = re[i + j + len / 2] * c - im[i + j + len / 2] * s;
        const vi = re[i + j + len / 2] * s + im[i + j + len / 2] * c;
        re[i + j] = ur + vr;
        im[i + j] = ui + vi;
        re[i + j + len / 2] = ur - vr;
        im[i + j + len / 2] = ui - vi;
      }
    }
  }
}
function spectrum(x) {
  const N = x.length;
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let i = 0; i < N; i++) re[i] = x[i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / N));
  fft(re, im);
  const m = new Float64Array(N / 2);
  for (let i = 0; i < N / 2; i++) m[i] = Math.hypot(re[i], im[i]);
  return m;
}
function biquad(y, [b0, b1, b2, a0, a1, a2]) {
  b0 /= a0; b1 /= a0; b2 /= a0; a1 /= a0; a2 /= a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < y.length; i++) {
    const x = y[i];
    const v = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = v;
    y[i] = v;
  }
}
const notch = (f, bw) => {
  const w = (2 * Math.PI * f) / sr, al = Math.sin(w) / (2 * (f / bw)), c = Math.cos(w);
  return [1, -2 * c, 1, 1 + al, -2 * c, 1 - al];
};
const lowpass = (f) => {
  const w = (2 * Math.PI * f) / sr, al = Math.sin(w) / (2 * 0.7071), c = Math.cos(w);
  return [(1 - c) / 2, 1 - c, (1 - c) / 2, 1 + al, -2 * c, 1 - al];
};
const highpass = (f) => {
  const w = (2 * Math.PI * f) / sr, al = Math.sin(w) / (2 * 0.7071), c = Math.cos(w);
  return [(1 + c) / 2, -(1 + c), (1 + c) / 2, 1 + al, -2 * c, 1 - al];
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'piano-'));
STRIKES.forEach((at, k) => {
  const pitch = 48 + k;
  const f0 = 440 * 2 ** ((pitch - 69) / 12) * 2 ** (CENTS[k] / 1200);
  // is f within 45 cents of one of this key's own harmonics?
  const own = (f) => {
    const n = Math.max(1, Math.round(f / f0));
    return Math.abs(1200 * Math.log2(f / (n * f0))) < 45;
  };
  const next = k + 1 < STRIKES.length ? STRIKES[k + 1] : d.length / sr;
  const a = Math.floor((at - 0.005) * sr);
  const n = Math.floor(Math.min(LEN, next - at - 0.06) * sr);
  const y = Float32Array.from(d.subarray(a, a + n));

  // 1. what is still ringing in the moment before the strike
  const N = 16384;
  const m = spectrum(d.subarray(a - N, a));
  const hz = sr / N;
  const top = Math.max(...m);
  const floor = [...m].sort((p, q) => p - q)[Math.floor(m.length / 2)];
  const ringing = [];
  for (let i = 3; i < 6000 / hz; i++) {
    if (m[i] > m[i - 1] && m[i] >= m[i + 1] && m[i] > floor * 30 && m[i] > top * 0.01 && !own(i * hz)) ringing.push([i * hz, m[i]]);
  }
  ringing.sort((p, q) => q[1] - p[1]);
  for (const [f] of ringing.slice(0, 20)) {
    const bw = Math.max(7, f * 0.008);
    biquad(y, notch(f, bw));
    biquad(y, notch(f, bw));
  }
  // 2. the hum
  for (let h = 60; h <= 600; h += 60) if (!own(h)) biquad(y, notch(h, 4));
  // 3. the rumble and the fizz
  const hp = Math.max(45, f0 * 0.7);
  biquad(y, highpass(hp));
  biquad(y, highpass(hp));
  biquad(y, lowpass(9000));
  // 4. the side strings, measured from 0.3 s in, once the strike has passed
  const N2 = 32768;
  const sustain = new Float32Array(N2);
  sustain.set(y.subarray(Math.floor(0.3 * sr), Math.floor(0.3 * sr) + N2));
  const m2 = spectrum(sustain);
  const h2 = sr / N2;
  for (let h = 1; h <= 8 && h * f0 <= 7000; h++) {
    const c = h * f0;
    let main = 0, peak = 0;
    for (let i = Math.floor((c * 2 ** (-30 / 1200)) / h2); i <= Math.ceil((c * 2 ** (30 / 1200)) / h2); i++) {
      if (m2[i] > peak) { peak = m2[i]; main = i; }
    }
    const side = [];
    for (let i = Math.floor((main * h2 * 2 ** (-60 / 1200)) / h2); i <= Math.ceil((main * h2 * 2 ** (60 / 1200)) / h2); i++) {
      if (m2[i] > m2[i - 1] && m2[i] >= m2[i + 1] && m2[i] > peak * 0.1 && Math.abs(i - main) * h2 >= 3) side.push([i * h2, m2[i]]);
    }
    side.sort((p, q) => q[1] - p[1]);
    for (const [f] of side.slice(0, 3)) {
      biquad(y, notch(f, 1.6));
      biquad(y, notch(f, 1.6));
    }
  }

  // even out the loudness, without letting it clip, and fade the end
  let sum = 0;
  for (let i = Math.floor(0.005 * sr); i < Math.floor(0.405 * sr); i++) sum += y[i] ** 2;
  let most = 0;
  for (const v of y) most = Math.max(most, Math.abs(v));
  const gain = Math.min(TARGET / Math.sqrt(sum / (0.4 * sr)), 0.95 / most);
  const fade = Math.floor(FADE * sr);
  for (let i = 0; i < n; i++) {
    let w = 1;
    if (i < 48) w = i / 48;
    if (i > n - fade) w = ((n - i) / fade) ** 2;
    y[i] *= gain * w;
  }

  const name = NAMES[pitch % 12] + (Math.floor(pitch / 12) - 1);
  const raw = path.join(tmp, name + '.raw');
  fs.writeFileSync(raw, Buffer.from(y.buffer));
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'f32le', '-ar', String(sr), '-ac', '1', '-i', raw, '-c:a', 'libmp3lame', '-q:a', '0', path.join(__dirname, name + '.mp3')]);
  fs.unlinkSync(raw);
});
fs.rmdirSync(tmp);
console.log(`made ${STRIKES.length} keys in sound-effects/piano/`);
