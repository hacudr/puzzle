// Synthesised piano / harp notes. Each correctly placed piece plays the next
// step of the puzzle's tune, so solving the puzzle slowly plays the music; any
// other swap repeats the step it has reached.
const sound = (() => {
  const VOICE_KEY = 'puzzle.sound';
  const VOICES = {
    piano: { label: 'Piano', attack: 0.006, decay: 2.4, partials: [[1, 1], [2, 0.45], [3, 0.2], [4, 0.1], [5, 0.05]] },
    harp: { label: 'Harp', attack: 0.003, decay: 1.5, partials: [[1, 1], [2, 0.22], [3, 0.07]] },
    off: { label: 'Off' },
  };

  // Steps are separated by spaces; notes joined with + sound together. A step
  // lasts one of the tune's units unless /n gives another length, which is what
  // lets the ending be played in tempo. unit = seconds per unit, bar = units
  // per bar, lead = units of silence before the first step.
  const octaveUp = (steps) => steps.replace(/[A-G][#b]?\d/g, (name) => name.slice(0, -1) + (+name.slice(-1) + 1));
  const PATHETIQUE = [
    'C4/4 Bb3/4',
    'Eb4/6 Db4/2',
    'C4/2 Eb4/2 Ab4/2 Bb4/2',
    'Eb4/6 E4/2',
    'F4/4 Bb3/3 C4/.5 Db4/.5',
    'Eb4/4 A3/4',
    'Db4/4 C4 Bb3 Ab3 G3',
    'Bb3/4 Ab3/4',
  ].join(' ');
  const TUNES = {
    // Beethoven, Sonata Op. 27 No. 2, first movement, bars 1-9; unit = a triplet quaver
    moonlight: {
      unit: 0.37,
      bar: 12,
      steps: [
        'G#3+C#2+C#3 C#4 E4 G#3 C#4 E4 G#3 C#4 E4 G#3 C#4 E4',
        'G#3+B1+B2 C#4 E4 G#3 C#4 E4 G#3 C#4 E4 G#3 C#4 E4',
        'A3+A1+A2 C#4 E4 A3 C#4 E4 A3+F#1+F#2 D4 F#4 A3 D4 F#4',
        'G#3+G#1+G#2 C4 F#4 G#3 C#4 E4 G#3+G#1+G#2 C#4 D#4 F#3 C4 D#4',
        'G#3+C#2+C#3 C#4 E4 G#3 C#4 E4 G#3 C#4 E4 G#3+G#4 C#4 E4/.25 G#4/.75',
        'G#3+G#4+C2+C3 D#4 F#4 G#3 D#4 F#4 G#3 D#4 F#4 G#3+G#4 D#4 F#4/.25 G#4/.75',
        'G#3+G#4+C#2+C#3 C#4 E4 G#3 C#4 E4 A3+A4+F#1+F#2 C#4 F#4 A3 C#4 F#4',
        'G#3+G#4+B1+B2 B3 E4 G#3 B3 E4 A3+F#4+B1+B2 B3 D#4 A3+B4 B3 D#4',
        'G#3+E5+E2+E3 B3 E4 G#3 B3 E4 G#3 B3 E4 G#3 B3 E4',
      ].join(' '),
    },
    // Debussy, Clair de lune, bars 1-8; unit = a quaver. Notes tied over a bar
    // line carry the extra length.
    clair: {
      unit: 0.43,
      bar: 9,
      lead: 1,
      steps: [
        'Ab4+F4 Ab5+F5/4 F5+Db5/4',
        'Eb5+C5 F5+Db5 Eb5+C5/7',
        'Db5+Bb4 Eb5+C5 Db5/1.5 F5/3 Db5/2.5',
        'C5+Ab4 Db5+Bb4 C5+Ab4/7',
        'Bb4 C5 Bb4 Eb5 Bb4 Ab4 Bb4 Ab4/2',
        'Gb4 Ab4 Gb4/3 F4/4',
        'F4 Gb4 F4 Bb4 F4 Eb4 F4 Eb4/2',
        'Db4 Eb4 Db4/3 C4/3',
      ].join(' '),
    },
    // Beethoven, Sonata Op. 13 "Pathetique", Adagio cantabile, bars 1-16; unit = a semiquaver
    pathetique: {
      unit: 0.46,
      bar: 8,
      steps: PATHETIQUE + ' ' + octaveUp(PATHETIQUE),
    },
  };
  const ORDER = Object.keys(TUNES);

  const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function midi(name) {
    const [, letter, accidental, octave] = name.match(/^([A-G])([#b]?)(\d)$/);
    return 12 * (+octave + 1) + SEMITONES[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0);
  }

  let ctx = null;
  let master = null;
  let voice = 'piano';
  // each step: { notes, at } with at = when it sounds, in units from the start
  let steps = [];
  let tune = null;
  let length = 0;
  // index of the step most recently heard, -1 before the first sound
  let heard = -1;

  try {
    const saved = localStorage.getItem(VOICE_KEY);
    if (saved in VOICES) voice = saved;
  } catch {}

  // Must first run inside a touch or click, or iOS keeps the audio silent.
  function unlock() {
    if (voice === 'off') return false;
    if (!ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      ctx = new Ctx();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      // a little room: decaying noise as a reverb impulse
      const length = Math.floor(ctx.sampleRate * 2.2);
      const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = impulse.getChannelData(ch);
        for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
      }
      const reverb = ctx.createConvolver();
      reverb.buffer = impulse;
      const wet = ctx.createGain();
      wet.gain.value = 0.28;
      master.connect(reverb).connect(wet).connect(ctx.destination);
    }
    if (ctx.state !== 'running') ctx.resume();
    return true;
  }

  function note(name, delay = 0, volume = 1) {
    const v = VOICES[voice];
    const pitch = midi(name);
    const freq = 440 * Math.pow(2, (pitch - 69) / 12);
    const when = ctx.currentTime + delay;
    // low notes ring longer than high ones; bass notes sit behind the tune
    const decay = v.decay * Math.min(1.6, Math.max(0.5, Math.pow(262 / freq, 0.35)));
    const level = 0.3 * volume * (pitch < 48 ? 0.5 : 1);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, when);
    env.gain.exponentialRampToValueAtTime(level, when + v.attack);
    env.gain.exponentialRampToValueAtTime(0.0001, when + decay);
    env.connect(master);
    for (const [multiple, gain] of v.partials) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.value = freq * multiple;
      g.gain.value = gain;
      osc.connect(g).connect(env);
      osc.start(when);
      osc.stop(when + decay + 0.05);
    }
  }

  return {
    unlock,

    // name is a key of TUNES; anything else picks a tune by the puzzle's position
    setTune(name, index = 0) {
      tune = TUNES[name] || TUNES[ORDER[index % ORDER.length]];
      let at = tune.lead || 0;
      steps = tune.steps.split(' ').map((step) => {
        const [notes, units = 1] = step.split('/');
        const entry = { notes: notes.split('+'), at };
        at += +units;
        return entry;
      });
      length = at;
      heard = -1;
    },

    // count = how many pieces just landed where they belong
    correct(count = 1) {
      if (!unlock() || !steps.length) return;
      for (let i = 0; i < count; i++) {
        const step = steps[++heard % steps.length];
        step.notes.forEach((name, k) => note(name, i * 0.2, k === 0 ? 1 : 0.7));
      }
    },

    // a swap that put nothing in place: repeat the note the tune has reached
    swap() {
      if (!unlock() || !steps.length) return;
      if (heard < 0) heard = 0;
      const step = steps[heard % steps.length];
      step.notes.forEach((name, k) => note(name, 0, k === 0 ? 0.7 : 0.5));
    },

    // The puzzle is finished: carry on from the step after the last one heard,
    // in tempo, to the first bar line that gives at least most of a bar.
    finish() {
      if (!unlock() || !steps.length) return;
      let i = (heard + 1) % steps.length;
      const from = steps[i].at;
      const until = Math.ceil((from + tune.bar * 0.75) / tune.bar) * tune.bar;
      for (let lap = 0; steps[i].at + lap < until; ) {
        const delay = 0.7 + (steps[i].at + lap - from) * tune.unit;
        steps[i].notes.forEach((name, k) => note(name, delay, k === 0 ? 1 : 0.7));
        if (++i === steps.length) {
          i = 0;
          lap += length;
        }
      }
    },

    label: () => VOICES[voice].label,

    // Piano -> Harp -> Off
    nextVoice() {
      const names = Object.keys(VOICES);
      voice = names[(names.indexOf(voice) + 1) % names.length];
      try {
        localStorage.setItem(VOICE_KEY, voice);
      } catch {}
      if (unlock()) ['C4', 'E4', 'G4'].forEach((name, i) => note(name, i * 0.12));
    },
  };
})();
