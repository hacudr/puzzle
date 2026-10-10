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
  // Bars that come round again; ~ is where the theme's first bass note goes.
  const ARABESQUE_THEME = '~/1.5 B2/1.5 E5+E3 F#5/.5 G#3/.5 C#5 E5+B3 B4/.5 G#3/.5 C#5 G#4+E3 B4/.5 B2/.5 F#4';
  const ARABESQUE_ANSWER = 'G#4+E2 E4/.5 C#3/.5 G#4 D#4+E3/1.5 G#3/1.5 C#4/1.5 G#3/1.5 C#4+E3/1.5 B2/1.5';
  const GONDOLA1_ANSWER = 'C5+A4+G2 A3+C4 Bb4+G4+D3 A4+F#4+G2 A3+C4 C5+A4+D3';
  const GONDOLA2_ROCK = 'F#2 C#3 F#3+A3 C#3 F#3+A3 C#4';
  const GONDOLA2_UPBEAT = 'G#3+B3 C#3 F#3+A3 E#3+G#3 A4+F#3+A3 B4+G#3+B3';
  const GONDOLA2_OPENING = [
    'C#5+F#2 C#3 F#3+A3 C#5+C#3 F#3+A3 C#4',
    'C#5+F#2 C#3 E#3+G#3 C#3 E#3+G#3 C#5+C#4',
    'C#5+F#2 A5+C#3 G#5+F#3+A3 F#5+C#3 E5+F#3+A3 D5+C#4',
  ].join(' ');
  const TUNES = {
    // Beethoven, Sonata Op. 27 No. 2, first movement, bars 1-9; unit = a triplet quaver
    moonlight: {
      composer: 'Ludwig van Beethoven',
      title: 'Moonlight Sonata, first movement',
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
      composer: 'Claude Debussy',
      title: 'Clair de lune',
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
      composer: 'Ludwig van Beethoven',
      title: 'Sonata Pathétique, Adagio cantabile',
      unit: 0.46,
      bar: 8,
      steps: PATHETIQUE + ' ' + octaveUp(PATHETIQUE),
    },
    // Debussy, Arabesque No. 1, bars 1-9; unit = a triplet quaver. From bar 6
    // the left hand plays two quavers against each triplet, hence the halves.
    arabesque: {
      composer: 'Claude Debussy',
      title: 'Arabesque No. 1',
      unit: 0.27,
      bar: 12,
      steps: [
        'C#4 E4 A4 C#5 E5 F#5 G#5 D#5 B4 G#4 D#4 B3',
        'A3 C#4 F#4 A4 C#5 D#5 E5 B4 G#4 E4 B3 G#3',
        'F#3 A3 C#4 C#5 F#4 A4 F#5+E3 A3 C#4 C#5 F#4 A4',
        'D#3 A3 C#4 C#5 F#4 A4 F#5+C#3 A3 E4 A5 A4 C#5',
        'B2 F#3 A3 A5+C#4 D#4 F#4 A4 C#5 D#5 C#5 G#5+B4 F#5+A4',
        ARABESQUE_THEME.replace('~', 'E2'),
        ARABESQUE_ANSWER,
        ARABESQUE_THEME.replace('~', 'B3+E2'),
        ARABESQUE_ANSWER,
      ].join(' '),
    },
    // Debussy, La fille aux cheveux de lin, bars 1-4; unit = a semiquaver
    flaxen: {
      composer: 'Claude Debussy',
      title: 'La fille aux cheveux de lin',
      unit: 0.23,
      bar: 12,
      steps: [
        'Db5/6 Bb4 Gb4 Eb4/2 Gb4 Bb4',
        'Db5/2 Bb4 Gb4 Eb4/2 Gb4 Bb4 Gb4/2 Gb4+Cb4+Eb3+Cb3 Eb4',
        'Gb4+Bb3+Gb3+Db3+Gb2/2 F4 Eb4 Db4/20',
      ].join(' '),
    },
    // Debussy, Reflets dans l'eau, bars 1-4; unit = a semiquaver. The three
    // notes under the chords (Ab, F, Eb) are the tune.
    reflets: {
      composer: 'Claude Debussy',
      title: 'Reflets dans l’eau',
      unit: 0.38,
      bar: 8,
      steps: [
        'Db2+Ab2 Db4+Bb3+Gb3 Ab4+F4+C4 Eb4+Db4+Bb3 Ab4 Db5+Bb4+Gb4 Ab5+F5+C5 Eb5+Db5+Bb4',
        'F4+Db6+Bb5+Gb5 Ab6+F6+C6 Eb6+Db6+Bb5 Ab5+F5+C5 Eb4+Eb5+Db5+Bb4 Ab4+F4+C4 Eb4+Db4+Bb3 Gb3+Ab2',
        'Db2 Eb4+Ab3+F3 Bb4+F4+Db4 F4+Eb4+C4 F4+Db4+Bb3 Eb5+Ab4+F4 Bb5+F5+Db5 Eb5+Db5+Bb4',
        'F5+Db5+Bb4 Eb6+Ab5+F5 Bb6+F6+Db6 F6+Eb6+C6 F6+Db6+Bb5 Db6+Bb5+F5 Bb5+F5+Db5 F5+Db5+Bb4',
      ].join(' '),
    },
    // Debussy, La plus que lente, upbeat and bars 1-7; unit = a quaver. The
    // A3 in the chords is written B double flat.
    lente: {
      composer: 'Claude Debussy',
      title: 'La plus que lente',
      unit: 0.32,
      bar: 6,
      lead: 2,
      steps: [
        'Db4/2 Eb4/2',
        'F4+Gb2/2 Db4+A3+Db3 Ab4 F4+Db2/2',
        'Gb2 Ab4+Db3 F4+Db4+A3 Ab4 F4+Db2 Ab4',
        'F4+Gb2/2 Db4+A3+Db3/2 F4+Db2/2',
        'Gb2 Db3 Db4+A3/2 Db2 Eb4',
        'F4+Gb2/2 Db4+A3+Db3 Ab4 F4+Db2/2',
        'Gb2 Ab4+Db3 F4+Db4+A3 Ab4 Gb4+Db4+Bb3+Gb2 Bb4',
        'Eb5/6',
      ].join(' '),
    },
    // Mendelssohn, Venetian Boat Song No. 1, Op. 19b No. 6, bars 1-17; unit = a quaver
    gondola1: {
      composer: 'Felix Mendelssohn',
      title: 'Venetian Boat Song No. 1, Op. 19b No. 6',
      unit: 0.42,
      bar: 6,
      steps: [
        'G2 G3+Bb3 D3 G2 G3+Bb3 D3',
        'G2 G3+Bb3 D3 G2 G3+A3+C4 Eb3',
        'D4+G1+G2 G3+Bb3 D3 F4+F1+F2 A3+C4 F3',
        'Bb1+Bb2 Bb3+D4 F3 Eb4+C2+C3 G3+C4 Eb3',
        'D4+D2 G3+Bb3 D3 D2 G3+Bb3 D3',
        'D2 A3+C4 D3 D2 F#3+A3 D3',
        'G2 G3+Bb3 D3 G2 G3+Bb3 D5+Bb4+D3',
        GONDOLA1_ANSWER,
        'Bb4+D4+G2 G3+Bb3 A4+C4+D3 G4+Bb3+G2 G3+Bb3 D4+D3',
        'Eb4+C4+G2 G3 Eb4+C4+Eb3 Eb4+C4+G2/.5 F4+D4/.5 G4+Eb4+G3+C4 Eb4+C4+Eb3',
        'G2 G3+Bb3 D3 G2 G3+Bb3 D5+Bb4+D3',
        GONDOLA1_ANSWER,
        'Bb4+D4+G2 G3+Bb3 A4+C4+D3 G4+Bb3+G2 G4+G3 A4+D3',
        'Bb4+G2 C#5+Bb3+D4 D5+G3 F5+C#5+G2 E5+Bb3+C#4 D5+G3',
        'A5+D5+F2 A3+D4 F5+F3 D5+F2 A3+D4 A4+F3',
        'Bb4+G2 C#5+E4+Bb3+D4 D5+F4+G3 F5+A4+A2 E5+G4+C#4 D5+F4+A3',
        'D5+F4+D3 A3+D4 F3 D3 A3+D4 F3',
      ].join(' '),
    },
    // Mendelssohn, Venetian Boat Song No. 2, Op. 30 No. 6, upbeat and bars 1-21; unit = a quaver
    gondola2: {
      composer: 'Felix Mendelssohn',
      title: 'Venetian Boat Song No. 2, Op. 30 No. 6',
      unit: 0.36,
      bar: 6,
      lead: 5,
      steps: [
        'C#3',
        GONDOLA2_ROCK,
        GONDOLA2_ROCK,
        'E#4+F#2 C#3 E#3+G#3 C#3 E#3+G#3 C#4',
        'G#4+F#2 C#3 E#3+G#3 C#3 E#3+G#3 C#4',
        'F#2 C#3 G#3+B3 B3+D4 C#3 A3+C#4',
        GONDOLA2_UPBEAT,
        GONDOLA2_OPENING,
        'C#5+F#2 C#3 F#3+A3 F#4+C#3 F#3+A3 C#4',
        'A4+F#2 C#3 F#3+A3 C#3 F#3+A3 B4+C#4',
        'C#5+A1 C#3 F#3+A3 F#5+C#3 F#3+A3 C#4',
        'E#5+C#2 C#3 G#3+B3 G#5+B3+D4 C#3 A3+C#4',
        GONDOLA2_UPBEAT,
        GONDOLA2_OPENING,
        'C#5+F#2 F#5+C#3 E5+F#3+A3 D5+C#3 C#5+F#3+A3 B#4+C#4',
        'C#5+A1 A4+C#3 C#5+F#3+A3 F#4+C#3 F#3+A3 C#4',
        'C#2 C#3 G#4+G#3+B3 E#4+C#3 G#3+B3 G#4+C#4',
        'F#4+F#2 C#3 F#3+A3 C#3 F#3+A3 C#4',
      ].join(' '),
    },
    // Mendelssohn, Venetian Boat Song No. 3, Op. 62 No. 5, upbeat and bars 1-12; unit = a quaver
    gondola3: {
      composer: 'Felix Mendelssohn',
      title: 'Venetian Boat Song No. 3, Op. 62 No. 5',
      unit: 0.42,
      bar: 6,
      lead: 5,
      steps: [
        'E3',
        'C4+A3 A2 E3 C4+A3 A2 E3',
        'A4+C4+A3 A2 E3 E4+C4+A3 A2 E3',
        'C4+A3 A2 E3 C4+A3 A2 E3',
        'C4+A3+E3 A2 E3 E5+C5+C4+A3 E2 C5+A4+E3',
        'A4+E4+C4+A3 A1 B4+G#4+E3 C5+A4+C4+A3 D5+B4+A2 E5+C5+E3',
        'G5+E5+D4+A3 A2 F5+D5+F3 D4+A3 E5+C5+A2 D5+B4+F3',
        'E5+C5+C4+A3 A2 C5+A4+E3 A4+C4+A3 G#4+E4+A2 A4+F#4+E3',
        'B4+G#4+B3+G#3 E2 E3 E5+G#4+D4+B3 E2 C5+E3',
        'A4+E4+C4+A3 A2 B4+G#4+E3 C5+A4+C4+A3 D5+B4+A2 E5+C5+E3',
        'G5+D5+D4+B3 E5+B2 F5+G3 E5+E4+C4 F5+D5+C3 G3/.5 E5+C5/.5',
        'E5+C5+F4+D4 D5+B4+D3 A3/.5 C5+A4/.5 C5+A4+E4 B4+G#4+E3 D4/.5 A4/.5',
        'A4+C4+A3 A2 E3 C4+A3 A2 E3',
      ].join(' '),
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

    // who wrote the current tune and what it is, or null with the sound off
    credit: () => (voice === 'off' || !tune ? null : { composer: tune.composer, title: tune.title }),

    label: () => VOICES[voice].label,

    voice: () => voice,

    // name is a key of VOICES; plays a short chord so the choice can be heard
    setVoice(name) {
      if (!(name in VOICES)) return;
      voice = name;
      try {
        localStorage.setItem(VOICE_KEY, voice);
      } catch {}
      if (unlock()) ['C4', 'E4', 'G4'].forEach((name, i) => note(name, i * 0.12));
    },
  };
})();
