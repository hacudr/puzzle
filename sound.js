// Synthesised piano / harp / string notes. Each correctly placed piece plays the next
// step of the puzzle's tune, so solving the puzzle slowly plays the music; any
// other swap repeats the step it has reached.
const sound = (() => {
  const VOICE_KEY = 'puzzle.sound';
  const VOICES = {
    piano: { label: 'Piano', attack: 0.006, decay: 2.4, partials: [[1, 1], [2, 0.45], [3, 0.2], [4, 0.1], [5, 0.05]] },
    harp: { label: 'Harp', attack: 0.003, decay: 1.5, partials: [[1, 1], [2, 0.22], [3, 0.07]] },
    // a violin, and a cello below its bottom G: bowed, so a note holds for its length instead of dying away
    strings: { label: 'Strings', bowed: true, attack: 0.07, release: 0.3 },
    off: { label: 'Off' },
  };

  // Steps are separated by spaces; notes joined with + sound together. A step
  // lasts one of the tune's units unless /n gives another length, which is what
  // lets the ending be played in tempo. unit = seconds per unit, bar = units
  // per bar, lead = units of silence before the first step, pause = the ending
  // stops short of a step that comes more than this many units after the last.
  // A tune with a voice is always played in it, whatever the settings say, and
  // is kept for the pictures of violence and fright. For the bowed voice a note
  // may carry its own length (F3:12 holds for twelve units while the steps above
  // it move on), and a step ending in ~ is a tremolo: one note, bowed once a unit.
  const octaveUp = (steps) => steps.replace(/[A-G][#b]?\d/g, (name) => name.slice(0, -1) + (+name.slice(-1) + 1));
  const octaves = (steps) => steps.replace(/[A-G][#b]?\d/g, (name) => name + '+' + name.slice(0, -1) + (name.slice(-1) - 1));
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
  const MOUNTAIN_KING = [
    'B3+B2 C#4 D4+F#3 E4 F#4+B2 D4 F#4+F#3/2',
    'F4+B2 C#4 F4+F#3/2 E4+B2 C4 E4+F#3/2',
    'B3+B2 C#4 D4+F#3 E4 F#4+B2 D4 F#4+F#3 B4',
    'A4+D3 F#4 D4+A3 F#4 A4+D3/2 A3/2',
    'F#4 G#4 A#4 B4 C#5 A#4 C#5/2',
    'D5 A#4 D5/2 C#5 A#4 C#5/2',
    'F#4 G#4 A#4 B4 C#5 A#4 C#5/2',
    'D5 A#4 D5/2 C#5/4',
    'B3+B2 C#4 D4+F#3 E4 F#4+B2 D4 F#4+F#3/2',
    'F4+B2 C#4 F4+F#3/2 E4+B2 C4 E4+F#3/2',
    'B3+B2 C#4 D4+F#3 E4 F#4+B2 D4 F#4+F#3 B4',
    'A4+D3 F#4 D4+A3 F#4 B4+B2/4',
  ].join(' ');
  const SUMMER_RUN = 'D5 C5 Bb4 A4 G4 F#4 E4 D4 C4 Bb3 A3';
  const MARS_DRUM = 'G3+G2/2 G3+G2/2 G3+G2/2 G3+G2/6 G3+G2/6 G3+G2/3 G3+G2/3 G3+G2/6';
  const WHIRL = 'A5+A4 G#5 A5 Bb5 A5 G#5 A5 G#5 A5 Bb5 A5 G#5';
  const WHIRL_TREAD = 'A5+A3 G#5 A5 Bb5+G#3 A5 G#5 A5+Bb3 G#5 A5 Bb5+G#3 A5 G#5';
  // four quavers of chatter, x y y x, with the bass note that comes in under them
  const chatter = (x, y, bass) => `${bass ? bass + '+' : ''}${x}/1.5 ${y}/1.5 ${y}/1.5 ${x}/1.5`;
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
    // Debussy, Clair de lune, bars 1-8, an octave below where it is written;
    // unit = a quaver. Notes tied over a bar line carry the extra length.
    clair: {
      composer: 'Claude Debussy',
      title: 'Clair de lune',
      unit: 0.43,
      bar: 9,
      lead: 1,
      steps: [
        'Ab3+F3 Ab4+F4/4 F4+Db4/4',
        'Eb4+C4 F4+Db4 Eb4+C4/7',
        'Db4+Bb3 Eb4+C4 Db4/1.5 F4/3 Db4/2.5',
        'C4+Ab3 Db4+Bb3 C4+Ab3/7',
        'Bb3 C4 Bb3 Eb4 Bb3 Ab3 Bb3 Ab3/2',
        'Gb3 Ab3 Gb3/3 F3/4',
        'F3 Gb3 F3 Bb3 F3 Eb3 F3 Eb3/2',
        'Db3 Eb3 Db3/3 C3/3',
      ].join(' '),
    },
    // Beethoven, Sonata Op. 13 "Pathetique", Adagio cantabile, bars 1-16; unit = a semiquaver
    pathetique: {
      composer: 'Ludwig van Beethoven',
      title: 'Sonata Pathétique, Adagio cantabile',
      unit: 0.46,
      bar: 8,
      // the dotted crotchets leave the quaver after them sounding like a straggler
      pause: 5,
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
    // Vivaldi, The Four Seasons, "Summer", Presto, bars 1-19 without the silent
    // bar 5; unit = a semiquaver
    summer: {
      composer: 'Antonio Vivaldi',
      title: 'The Four Seasons, “Summer”, Presto',
      voice: 'strings',
      unit: 0.1,
      bar: 12,
      steps: [
        'G4 G3/11~ F4 G3/11~ Eb4 G3/11~ D4 G3/11~',
        'D5 D4/11~ C5 D4/11~ Bb4 D4/11~ A4 D4/12~',
        SUMMER_RUN,
        'G3/12~ G3 G5 F5 Eb5 D5 C5 Bb4 A4 G4 F4 Eb4 D4',
        'C4/12~ C4 Bb5 A5 G5 F5 Eb5 D5 C5 Bb4 A4 G4 F4',
        'Eb4/12~ Eb4 D6 C6 Bb5 A5 G5 F#5 E5 D5 C5 Bb4 A4',
        'G4/12~ G4 D6 C6 Bb5 A5 G5 F#5 E5 D5 C5 Bb4 A4',
        'G4/12~',
      ].join(' '),
    },
    // Beethoven, Symphony No. 5, first movement, bars 1-13; unit = a quaver
    fate: {
      composer: 'Ludwig van Beethoven',
      title: 'Symphony No. 5, first movement',
      voice: 'strings',
      unit: 0.17,
      bar: 4,
      lead: 1,
      steps: [
        'G4+G3 G4+G3 G4+G3 Eb4+Eb3/5',
        'F4+F3 F4+F3 F4+F3 D4+D3/9',
        'G4 G4 G4 Eb4:5 Ab4 Ab4 Ab4 G4:5 Eb5 Eb5 Eb5 C5+G4+Eb4/5',
        'G4 G4 G4 D4:5 Ab4 Ab4 Ab4 G4:5 F5 F5 F5 D5+G4+D4/4',
      ].join(' '),
    },
    // Mozart, Requiem, Dies irae, bars 1-19: the sopranos over the basses, and
    // the violins' climb in bar 9; unit = a quaver
    diesirae: {
      composer: 'Wolfgang Amadeus Mozart',
      title: 'Requiem, Dies irae',
      voice: 'strings',
      unit: 0.24,
      bar: 8,
      steps: [
        'D5+D4/4 A4+D4/4',
        'E5+D4/2 A4+D4/6',
        'E5+C#4/4 A4+C#4/4',
        'F5+D4/2 D5+D4/4 D5+D3 D5+D3',
        'C#5+E3/2 D5+F3/4 D5+F3 D5+F3',
        'E5+C#3/2 F5+D3/2 D5:3/2 D4 D5+C4',
        'G5+Bb3/2 F5+A3/2 E5+G3/2 D5+D3/2',
        'D5+A3/2 C#5+A3/6',
        'A4 A4/.5 A4/.5 Bb4/.5 Bb4/.5 B4/.5 B4/.5 C5/.5 C5/.5 C#5/.5 C#5/.5 D5/.5 D5/.5 E5/.5 E5/.5',
        'F5+F3/6 C5+F3/2',
        'A4+F3/2 F4+F3/2 A4+F3/2 C5+F3/2',
        'Eb5+F#3/4 D5+F#3/4',
        'G5+G3/6 D5+G3/2',
        'B4+G3/2 G4+G3/2 B4+G3/2 D5+G3/2',
        'F5+G#3/4 E5+G#3/4',
        'E5+A3/4 E5+B3/4',
        'E5+C4/4 D5+D4/4',
        'D5+E4/2 C5+A3/2 B4+E3/4',
        'A4+A3/8',
      ].join(' '),
    },
    // Tchaikovsky, Romeo and Juliet, the strife theme, four bars; unit = a semiquaver
    strife: {
      composer: 'Pyotr Ilyich Tchaikovsky',
      title: 'Romeo and Juliet, Fantasy-Overture',
      voice: 'strings',
      unit: 0.115,
      bar: 16,
      steps: [
        'B4/4 F#5+B4 F#5+B4 F#5+B4/4 B4/4 C#5/2',
        'D5/3 C#5 B4/6 D5/2 C#5/2 B4/2',
        'D5/3 C#5 B4/6 D5/2 C#5/2 B4/2',
        'D5/2 G5/14',
      ].join(' '),
    },
    // Tchaikovsky, Symphony No. 6, finale, bars 1-6: the two violin parts, whose
    // crossing makes the falling line that is heard; unit = a semiquaver
    lamentoso: {
      composer: 'Pyotr Ilyich Tchaikovsky',
      title: 'Symphony No. 6 “Pathétique”, finale',
      voice: 'strings',
      unit: 0.28,
      bar: 12,
      steps: [
        'F#5+B4/4 E5+A#4/2 D5+G#4/2 C#5+E#4/3 B4+E#4',
        'C#5+E4/12',
        'F#5+B4/4 E5+A#4/2 D5+G#4/2 C#5+E#4/3 B4+E#4',
        'D5+E4/2 C#5+E4/10',
        'G4+B3/6 G4+B3/2 G4+B3/3 A4+A3',
        'F#4+A3/12',
      ].join(' '),
    },
    // Grieg, In the Hall of the Mountain King, the whole theme, an octave above
    // the cellos and basses that begin it and then an octave higher; unit = a quaver
    mountainking: {
      composer: 'Edvard Grieg',
      title: 'In the Hall of the Mountain King',
      voice: 'strings',
      unit: 0.21,
      bar: 8,
      steps: MOUNTAIN_KING + ' ' + octaveUp(MOUNTAIN_KING),
    },
    // Wagner, Ride of the Valkyries, the theme and its answer a third higher;
    // unit = a semiquaver
    valkyries: {
      composer: 'Richard Wagner',
      title: 'Ride of the Valkyries',
      voice: 'strings',
      unit: 0.12,
      bar: 18,
      lead: 16,
      steps: octaves(
        [
          'F#3/2',
          'B3/3 F#3 B3/2 D4/6 B3/6',
          'D4/3 B3 D4/2 F#4/6 D4/6',
          'F#4/3 D4 F#4/2 A4/6 A3/6',
          'D4/3 A3 D4/2 F#4/10 A3/2',
          'D4/3 A3 D4/2 F#4/6 D4/6',
          'F#4/3 D4 F#4/2 A4/6 F#4/6',
          'A4/3 F#4 A4/2 C#5/6 C#4/6',
          'F#4/3 C#4 F#4/2 A#4/12',
        ].join(' ')
      ),
    },
    // Holst, The Planets, Mars: the rhythm, the first theme over it (an octave
    // up, to be heard), then the second and third; unit = a sixth of a crotchet
    mars: {
      composer: 'Gustav Holst',
      title: 'Mars, the Bringer of War',
      voice: 'strings',
      unit: 0.065,
      bar: 30,
      steps: [
        MARS_DRUM,
        MARS_DRUM.replace('G3+G2', 'G4:48+G3+G2'),
        MARS_DRUM.replace('G3+G2/3', 'D5:12+D4:12+G3+G2/3'),
        MARS_DRUM.replace('G3+G2', 'Db5:48+Db4:48+G3+G2'),
        MARS_DRUM,
        'Ab3+F3+Db3/9 G3+E3+C3/3 F#3+D#3+B2/9 G3+E3+C3/3 Ab3+F3+Db3/9',
        'Bb3+G3+Eb3/3 C4+A3+F3/9 D4+B3+G3/3 Eb4+C4+Ab3/9 D4+B3+G3/3',
        'D4/6 D4/6 D4/6 D4/2 C#4/2 D4/2 D4/2 C#4/2 D4/2',
        'F4/12 D4/4.5 D4/1.5 F4/6 D4/6',
        'B4+G4/4.5 B4+G4/1.5 B4+G4/2 A#4+D4/2 B4+G4/2 D5+B4/2 B4+G4/2 G4+D4/2 D4/12',
      ].join(' '),
    },
    // Mussorgsky, Night on Bald Mountain, from the piano arrangement by Chernov:
    // the opening whirl and the first theme in the bass; unit = a triplet quaver
    baldmountain: {
      composer: 'Modest Mussorgsky',
      title: 'Night on Bald Mountain',
      voice: 'strings',
      unit: 0.115,
      bar: 12,
      steps: [
        WHIRL,
        WHIRL,
        WHIRL_TREAD,
        WHIRL_TREAD,
        'A5+A3/.75 G#5/.75 A5/.75 G#5/.75 A5/1.875 Bb5/.375 C6/.375 D6/.375 Eb6+A5/4.875 D6/.375 C6/.375 Bb5/.375',
        'A5+A3/.75 G#5/.75 A5/.75 G#5/.75 A5/1.875 B5/.375 C6/.375 D6/.375 E6+A5/4.875 D6/.375 C6/.375 B5/.375',
        WHIRL_TREAD,
        WHIRL_TREAD,
        'A5+A3/.75 G#5/.75 A5/.75 G#5/.75 A5/1.5 Bb5/.375 C6/.375 D6/.375 E6/.375 F6+A5/4.5 E6/.375 D6/.375 C6/.375 Bb5/.375',
        'A5+A3/.75 G#5/.75 A5/.75 G#5/.75 A5/1.5 B5/.375 C6/.375 D6/.375 E6/.375 F#6+A5/4.5 E6/.375 D6/.375 C6/.375 B5/.375',
        WHIRL,
        chatter('A5+F5', 'G#5+F5'),
        chatter('A5+F5', 'G#5+F5'),
        chatter('A5+F5', 'G#5+F5'),
        chatter('A5+F5', 'G#5+F5'),
        chatter('A5+F5', 'G#5+F5', 'F3:12'),
        chatter('A5+F5', 'G#5+F5'),
        chatter('A5+F5', 'G#5+F5', 'E3:18'),
        chatter('A5+F5', 'G#5+F5'),
        chatter('A5+F5', 'G#5+F5'),
        chatter('A5+F5', 'G#5+F5', 'D3:6'),
        chatter('C6+A5', 'B5+A5', 'E3:6'),
        chatter('C6+A5', 'B5+A5', 'F3:6'),
        chatter('B5+F5', 'A#5+F5', 'G#3:18'),
        chatter('B5+F5', 'A#5+F5'),
        chatter('B5+F5', 'A#5+F5'),
        chatter('C6+F5', 'B5+F5', 'A3:6'),
        chatter('A5+E5', 'G#5+E5', 'C3:18'),
        chatter('A5+E5', 'G#5+E5'),
        chatter('A5+E5', 'G#5+E5'),
        'C3:2+A5+E5/1.5 G#5+E5/.5 C3:2/1 G#5+E5/1 C3:2/.5 A5+E5/1.5',
      ].join(' '),
    },
    // Dvořák, Symphony No. 9, finale: two bars of the strings' opening, then the
    // horns' and trumpets' theme, bars 10-17; unit = a quaver
    newworld: {
      composer: 'Antonín Dvořák',
      title: 'Symphony No. 9 “From the New World”, finale',
      voice: 'strings',
      unit: 0.2,
      bar: 8,
      steps: octaves(
        [
          'B3/3 C4/5 B3/3 C4/5',
          'E4/4 F#4/2 G4/2',
          'F#4/3 E4 E4/4',
          'E4/4 D4/2 B3 D4',
          'E4/6 E4/2',
          'E4/4 F#4/2 G4/2',
          'F#4/3 E4 E4/4',
          'E4/2 G4/.6667 E4/.6667 G4/.6666 B4/2 B3/2',
          'E4/8',
        ].join(' ')
      ),
    },
  };
  // the tunes that take turns by a puzzle's position: the gentle ones for most
  // pictures, the stormy ones for those of violence and fright
  const ORDER = Object.keys(TUNES).filter((name) => !TUNES[name].voice);
  const STORMY = Object.keys(TUNES).filter((name) => TUNES[name].voice);
  // A few seconds of the real thing for a tune to end on, in music/<name>.mp3,
  // cut from a recording on Wikimedia Commons; music/CREDITS.md has the sources.
  // by = who is playing. A recording with a licence must be credited, which the
  // solved screen does; the others are in the public domain. A tune without a
  // recording ends on its own notes.
  const CLIPS = {
    moonlight: { by: 'Paul Pitman' },
    clair: { by: 'Laurens Goedhart', licence: 'CC BY 3.0' },
    pathetique: { by: 'Musopen' },
    arabesque: { by: 'Patrizia Prati', licence: 'CC BY-SA 4.0' },
    flaxen: { by: 'Patrizia Prati', licence: 'CC BY-SA 4.0' },
    reflets: { by: 'Giorgi Latso', licence: 'CC BY-SA 4.0' },
    lente: { by: 'La Pianista', licence: 'CC BY-SA 3.0' },
    gondola1: { by: 'FAE Piano cafe', licence: 'CC BY 3.0' },
    gondola2: { by: 'Membeth' },
    gondola3: { by: 'Bernd Krueger', licence: 'CC BY-SA 3.0 DE' },
    summer: { by: 'Modena Chamber Orchestra' },
    diesirae: { by: 'unnamed performers, from IMSLP', licence: 'CC BY-SA 3.0' },
    fate: { by: 'Musopen' },
    strife: { by: 'Skidmore College Orchestra' },
    lamentoso: { by: 'Musopen' },
    mountainking: { by: 'Czech National Symphony Orchestra' },
    valkyries: { by: 'American Symphony Orchestra, 1921' },
    mars: { by: 'United States Air Force Band' },
    baldmountain: { by: 'Musopen' },
    newworld: { by: 'Musopen' },
  };

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
  // the recordings fetched so far, the current tune's once it is ready, and the
  // one now sounding
  const clips = {};
  let clip = null;
  let playing = null;
  // the credit the current tune's recording must carry, if any
  let owed = null;
  // the bowed voice's two instruments and the noise of its bow, made when first needed
  let boxes = null;
  let hiss = null;

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

  // The box of the instrument: resonances that stay where they are whatever note
  // is played, so that each harmonic swells and fades as the vibrato carries it
  // across them. That, more than anything, is what tells a violin from a
  // synthesiser. scale moves them all down, for a cello.
  function box(scale, level) {
    const input = ctx.createGain();
    input.gain.value = level;
    let last = input;
    const add = (type, freq, q, db) => {
      const filter = ctx.createBiquadFilter();
      filter.type = type;
      filter.frequency.value = freq;
      filter.Q.value = q;
      filter.gain.value = db;
      last.connect(filter);
      last = filter;
    };
    add('highpass', 180 * scale, 0.7, 0);
    // the air in the box, two of the wood, the nasal dip and the bridge
    for (const [freq, q, db] of [[275, 4, 5], [460, 5, 6], [550, 5, 4], [1500, 1.2, -5], [2600, 1.2, 6]]) add('peaking', freq * scale, q, db);
    add('lowpass', 3800 * Math.sqrt(scale), 0.7, 0);
    last.connect(master);
    return input;
  }

  // A bowed note: one string, a sawtooth as a bowed string is, with the hiss of
  // the hair on it, loudest as the bow bites, and a vibrato that comes in once
  // the note has settled, no two at quite the same rate. Notes below the
  // violin's bottom G go to a cello. shake = bow strokes a second, for a tremolo.
  function bow(v, freq, when, level, hold, shake) {
    if (!boxes) {
      boxes = { violin: box(1, 0.8), cello: box(0.4, 0.8) };
      hiss = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = hiss.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    const release = Math.min(v.release, 0.08 + hold / 2);
    const end = when + hold;
    const body = shake ? level * 0.7 : level;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, when);
    env.gain.exponentialRampToValueAtTime(body, when + Math.min(v.attack, hold * 0.4));
    env.gain.setValueAtTime(body, end);
    env.gain.exponentialRampToValueAtTime(0.0001, end + release);
    env.connect(freq < 190 ? boxes.cello : boxes.violin);
    const sources = [];
    // a slow oscillator that wobbles whatever it is connected to by depth, from a moment after the note starts
    const wobble = (rate, depth, after) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.value = rate;
      g.gain.setValueAtTime(0, when + after);
      g.gain.linearRampToValueAtTime(depth, when + after + 0.15);
      osc.connect(g);
      sources.push(osc);
      return g;
    };
    if (shake) wobble(shake, level * 0.3, 0).connect(env.gain);
    const string = ctx.createOscillator();
    string.type = 'sawtooth';
    string.frequency.value = freq;
    // nobody stops a string dead in tune
    string.detune.value = Math.random() * 8 - 4;
    if (hold > 0.4 && !shake) wobble(5.2 + Math.random() * 0.8, freq * 0.008, 0.2).connect(string.frequency);
    string.connect(env);
    sources.push(string);
    const hair = ctx.createBufferSource();
    hair.buffer = hiss;
    hair.loop = true;
    const scrape = ctx.createGain();
    scrape.gain.setValueAtTime(0.3, when);
    scrape.gain.exponentialRampToValueAtTime(0.04, when + 0.09);
    hair.connect(scrape).connect(env);
    sources.push(hair);
    for (const source of sources) {
      source.start(when);
      source.stop(end + release + 0.05);
    }
  }

  // hold = seconds a bowed note lasts; v = the voice, which the tune may have chosen
  function note(name, delay = 0, volume = 1, hold = 0.8, shake = 0, v = VOICES[(tune && tune.voice) || voice]) {
    const pitch = midi(name);
    const freq = 440 * Math.pow(2, (pitch - 69) / 12);
    const when = ctx.currentTime + delay;
    if (v.bowed) return bow(v, freq, when, 0.17 * volume, hold, shake);
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

  function hush() {
    if (!playing) return;
    try {
      playing.stop();
    } catch {}
    playing = null;
  }

  function loadClip(key) {
    clip = null;
    owed = null;
    hush();
    if (!(key in CLIPS) || !unlock()) return;
    clips[key] =
      clips[key] ||
      fetch(`music/${key}.mp3`)
        .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject()))
        .then((data) => new Promise((done, fail) => ctx.decodeAudioData(data, done, fail)));
    clips[key].then(
      (buffer) => {
        if (TUNES[key] !== tune) return;
        clip = buffer;
        if (CLIPS[key].licence) owed = `${CLIPS[key].by}, ${CLIPS[key].licence}`;
      },
      () => delete clips[key]
    );
  }

  // Sounds a step. In tempo its notes last as written; on its own, a note
  // lasts long enough to be heard.
  function play(step, delay, first, rest, tempo) {
    step.notes.forEach((n, k) => {
      const written = n.units * tune.unit;
      const hold = tempo ? written : Math.min(1.6, Math.max(0.45, written));
      note(n.name, delay, k === 0 ? first : rest, hold, step.shake ? 1 / tune.unit : 0);
    });
  }

  return {
    unlock,

    // name is a key of TUNES; anything else picks a tune by the puzzle's
    // position, among the stormy tunes if stormy is set
    setTune(name, index = 0, stormy = false) {
      const turns = stormy ? STORMY : ORDER;
      const key = name in TUNES ? name : turns[index % turns.length];
      tune = TUNES[key];
      loadClip(key);
      let at = tune.lead || 0;
      steps = tune.steps.split(' ').map((step) => {
        const shake = step.endsWith('~');
        const [notes, units = 1] = step.replace('~', '').split('/');
        const entry = {
          notes: notes.split('+').map((n) => {
            const [name, own = units] = n.split(':');
            return { name, units: +own };
          }),
          at,
          shake,
        };
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
        play(step, i * 0.2, 1, 0.7);
      }
    },

    // a swap that put nothing in place: repeat the note the tune has reached
    swap() {
      if (!unlock() || !steps.length) return;
      if (heard < 0) heard = 0;
      const step = steps[heard % steps.length];
      play(step, 0, 0.7, 0.5);
    },

    // The puzzle is finished: carry on from the step after the last one heard,
    // in tempo, to the first bar line that gives at least most of a bar. A bowed
    // tune can hold one note for a whole bar, which is no ending at all, so it
    // goes on bar by bar until four steps have sounded. A tune with a recording
    // ends on that instead.
    finish() {
      if (!unlock() || !steps.length) return;
      if (clip) {
        hush();
        const level = ctx.createGain();
        level.gain.value = 0.6;
        playing = ctx.createBufferSource();
        playing.buffer = clip;
        playing.connect(level).connect(ctx.destination);
        playing.start(ctx.currentTime + 0.7);
        return;
      }
      let i = (heard + 1) % steps.length;
      const from = steps[i].at;
      const least = tune.voice ? 4 : 0;
      let until = Math.ceil((from + tune.bar * 0.75) / tune.bar) * tune.bar;
      for (let lap = 0, last = from, sounded = 0; ; sounded++) {
        while (steps[i].at + lap >= until && sounded < least) until += tune.bar;
        if (steps[i].at + lap >= until) break;
        if (steps[i].at + lap - last > tune.pause) break;
        last = steps[i].at + lap;
        const delay = 0.7 + (steps[i].at + lap - from) * tune.unit;
        play(steps[i], delay, 1, 0.7, true);
        if (++i === steps.length) {
          i = 0;
          lap += length;
        }
      }
    },

    // who wrote the current tune and what it is, and who is playing where the
    // recording asks to be credited; null with the sound off
    credit: () => (voice === 'off' || !tune ? null : { composer: tune.composer, title: tune.title, performer: owed }),

    label: () => VOICES[voice].label,

    voice: () => voice,

    // name is a key of VOICES; plays a short chord so the choice can be heard
    setVoice(name) {
      if (!(name in VOICES)) return;
      voice = name;
      if (voice === 'off') hush();
      try {
        localStorage.setItem(VOICE_KEY, voice);
      } catch {}
      if (unlock()) ['C4', 'E4', 'G4'].forEach((name, i) => note(name, i * 0.12, 1, 0.8, 0, VOICES[voice]));
    },
  };
})();
