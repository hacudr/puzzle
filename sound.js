// Synthesised piano and lute notes. Each correctly placed piece plays the next
// step of the puzzle's tune, so solving the puzzle slowly plays the music; any
// other swap repeats the step it has reached.
const sound = (() => {
  // Settings can turn off the music (the notes, and the recording a puzzle ends
  // on) and the sound effects (the sword, the hooves and the knock), each on its own,
  // and can lengthen that recording to thirty seconds (long, off unless chosen).
  const KEYS = { music: 'puzzle.music', effects: 'puzzle.effects', long: 'puzzle.long' };
  const VOICES = {
    piano: { attack: 0.006, decay: 2.4, partials: [[1, 1], [2, 0.45], [3, 0.2], [4, 0.1], [5, 0.05]] },
    // The lute is worked out string by string. decay = seconds for middle C to
    // die away, cutoff = how bright the pluck is, in Hz, damping = how fast the
    // top of the sound goes (0.5 at most), and each string is [pitch as a
    // multiple, seconds late, where along it is plucked, level].
    // a lute: a course of two gut strings, plucked with the fingertip well along them
    lute: { plucked: true, decay: 2.6, cutoff: 2200, damping: 0.5, strings: [[1, 0, 0.27, 1], [1.0015, 0.005, 0.31, 0.9]] },
  };

  // Steps are separated by spaces; notes joined with + sound together. A step
  // lasts one of the tune's units unless /n gives another length, which is what
  // lets the ending be played in tempo. unit = seconds per unit, bar = units
  // per bar, lead = units of silence before the first step, pause = the ending
  // stops short of a step that comes more than this many units after the last.
  // A tune is played on the piano unless it names another voice; those that do
  // are kept for the pictures of violence and fright. A note may carry its own
  // length (F3:12 is twelve units long while the steps above it move on), and a
  // step ending in ~ is a tremolo: one note, plucked again every unit.
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
  // the second theme's bar: B flat falling to G over the chord, and back up
  const GNOSSIENNE_SWAY = 'Bb4+Bb2/2 F3+Bb3+Db4/1.5 Ab4/.5 G4/2 F3+Bb3+Db4/1.5 Ab4/.5';
  const SUMMER_RUN = 'D5 C5 Bb4 A4 G4 F#4 E4 D4 C4 Bb3 A3';
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
    // Satie, Gnossienne No. 1, the opening phrases, taken down by ear from the
    // recording; unit = a quaver. It is written without bar lines, and the left
    // hand's low F comes round every eight quavers.
    gnossienne: {
      composer: 'Erik Satie',
      title: 'Gnossienne No. 1',
      unit: 0.38,
      bar: 8,
      steps: [
        'F2/2 C5+Ab3+C4+F4 Eb5 D5/2 C5+Ab3+C4+F4/2',
        'B4+F2/2 Ab3+C4+F4 C5 B4/2 C5+Ab3+C4+F4/2',
        'B4+F2/2 C5+Ab3+C4+F4 Eb5 D5/2 C5+Ab3+C4+F4/2',
        'F5+F2/2 Ab3+C4+F4 F5 E5/2 C5+Ab3+C4+F4/2',
        'F2/2 C5+Ab3+C4+F4 Eb5 D5/2 C5+Ab3+C4+F4/2',
        'B4+F2/2 Ab3+C4+F4 C5 Ab4/.5 G4/1.5 C5+Ab3+C4+F4/2',
        'G4+F2/2 Ab3+C4+F4/6',
      ].join(' '),
    },
    // The same piece's second theme, where the bass moves to B flat, from 28
    // seconds into the recording and taken down from it in the same way
    gnossienne2: {
      composer: 'Erik Satie',
      title: 'Gnossienne No. 1',
      unit: 0.36,
      bar: 8,
      steps: [
        GNOSSIENNE_SWAY,
        GNOSSIENNE_SWAY,
        'G4+F2/2 Ab3+C4+F4/4 Ab3+C4+F4/2',
        'F2/2 Ab4+Ab3+C4+F4/4 C5+Ab3+C4+F4/2',
        GNOSSIENNE_SWAY,
        GNOSSIENNE_SWAY,
        'G4+F2/2 Ab3+C4+F4/6',
      ].join(' '),
    },
    // Mendelssohn, Spring Song, Op. 62 No. 6, bars 1-8, taken from an 1873
    // edition that prints it in A flat and put back up into A, the key it was
    // written in and the recording's; unit = a semiquaver
    spring: {
      composer: 'Felix Mendelssohn',
      title: 'Spring Song, Op. 62 No. 6',
      unit: 0.21,
      bar: 8,
      steps: [
        'C#5+A2/4 C#5 D5 D#5 E5',
        'A5+A2/2 E5/2 D5/2 C#5/2',
        'B4+A2/6 D5/2',
        'F#5+A2/6 D5/2',
        'B4+A2/4 B4 A#4 B4 B#4',
        'C#5/2 E5/2 D5/2 C#5/2',
        'B4/2 A4/2 G#4/2 A4/2',
        'C#5/4 A4/2 B4 E4',
      ].join(' '),
    },
    // Mendelssohn, On Wings of Song, Op. 34 No. 2, the upbeat and bars 1-4 of
    // the voice, in D, the key the recording plays it in; unit = a quaver
    wings: {
      composer: 'Felix Mendelssohn',
      title: 'On Wings of Song, Op. 34 No. 2',
      unit: 0.34,
      bar: 6,
      lead: 5,
      steps: [
        'A3',
        'F#4+D3/2 F#4 F#4 G4 A4',
        'A4/3 C#4/2 A3',
        'E4+A2/2 E4 E4 F#4 G4',
        'F#4+D3/6',
      ].join(' '),
    },
    // Handel, Serse, "Ombra mai fu", bars 1-9: the voice over the bass, from a
    // MIDI file on Commons (CC0), a semitone down from the written F major, as
    // the recording is played at the lower pitch of Handel's day; unit = a semiquaver
    largo: {
      composer: 'George Frideric Handel',
      title: 'Serse, “Ombra mai fu” (Largo)',
      unit: 0.225,
      bar: 12,
      steps: [
        'E4:16+E2/12',
        'F#2/4 D#4/4 C#4/3 B3',
        'B3+G#2/12',
        'C#4+A2/4 D#4+F#2/4 E4+E2 F#4 G#4/2',
        'F#4+B2/12',
        'C#5+A2/12',
        'B4+G#2/12',
        'A4+F#2/12',
        'G#4+E2/12',
      ].join(' '),
    },
    // Handel, Suite No. 5 in E major, HWV 430, the Air ("The Harmonious
    // Blacksmith"), its first strain twice; unit = a semiquaver
    blacksmith: {
      composer: 'George Frideric Handel',
      title: 'The Harmonious Blacksmith',
      unit: 0.235,
      bar: 16,
      steps: [
        'E2/4',
        'E4+B3+E3/2 G#4/2 F#4/2 B4/2 G#4+B3/2 F#4 E4',
        'F#4+B3/2 B4/2 G#4+E4/2 C#5 E4 D#4/2 B4 D#4 C#4/2 A#4/2',
        'B4+F#4+D#4+B2/4',
        'E4+B3+E3/2 G#4/2 F#4/2 B4/2 G#4+B3/2 F#4 E4',
        'F#4+B3/2 B4/2 G#4+E4/2 C#5 E4 D#4/2 B4 D#4 C#4/2 A#4/2',
        'B4+F#4+D#4+B2/4',
      ].join(' '),
    },
    // Handel, Water Music, Alla Hornpipe, bars 1-4, in D, its own key, read from
    // Grainger's setting in F of 1923; unit = a quaver
    hornpipe: {
      composer: 'George Frideric Handel',
      title: 'Water Music, Alla Hornpipe',
      unit: 0.14,
      bar: 12,
      steps: [
        'F#5+D3/4 E5/2 D5 C#5 D5/2 B4/2',
        'A4+D3/2 G4 F#4 G4/2 F#4 E4 F#4 G4 A4/2',
        'B4+G2/4 C#5/2 B4 A4 B4/2 D5/2',
        'G5+A2/4 F#5/2 E5 D5 E5/2 A4/2',
      ].join(' '),
    },
    // Vivaldi, The Four Seasons, "Summer", Presto, bars 1-19 without the silent
    // bar 5; unit = a semiquaver
    summer: {
      composer: 'Antonio Vivaldi',
      title: 'The Four Seasons, “Summer”, Presto',
      voice: 'lute',
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
    // Mozart, Requiem, Dies irae, bars 1-19: the sopranos over the basses, and
    // the violins' climb in bar 9; unit = a quaver
    diesirae: {
      composer: 'Wolfgang Amadeus Mozart',
      title: 'Requiem, Dies irae',
      voice: 'lute',
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
      voice: 'lute',
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
      voice: 'lute',
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
      voice: 'lute',
      unit: 0.21,
      bar: 8,
      steps: MOUNTAIN_KING + ' ' + octaveUp(MOUNTAIN_KING),
    },
    // Mussorgsky, Night on Bald Mountain, from the piano arrangement by Chernov:
    // the opening whirl and the first theme in the bass; unit = a triplet quaver
    baldmountain: {
      composer: 'Modest Mussorgsky',
      title: 'Night on Bald Mountain',
      voice: 'lute',
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
      voice: 'lute',
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
    // Bach, Mass in B minor, Kyrie eleison, bars 1-4, the Adagio the chorus
    // opens with: the first sopranos over the basses, with the seconds and the
    // tenors where they move; unit = a semiquaver
    kyrie: {
      composer: 'Johann Sebastian Bach',
      title: 'Mass in B minor, Kyrie eleison',
      sacred: true,
      unit: 0.45,
      bar: 16,
      steps: [
        'D5+B4+F#4+B3+B2/6 D5+B4+F#4+B3+B2/2 E5:4+B4+E4:4+G3:4+C#3:4/2 A#4/2 C#5/2 E5/2',
        'F#5:6+A4+F#3+D#3:6/2 C5:4+A3/2 D#4/2 F#5+B4+F#4+D#3/2 F#5+G4:4+E3:4/2 B4/2 E5/2 G5/2',
        'G5+A#4:6+A#2:8/2 F#5/4 E5/2 D5+F#4:4+B2:4/2 E5/2 F#5:6/2 A2/2',
        'G3:8+G2:8/2 E5 D5 E5/4 F#5+C#5+A#4+F#3+F#2/8',
      ].join(' '),
    },
    // Schubert, Ellens dritter Gesang, D. 839, bars 3-4, where the voice comes
    // in: the voice over the piano's sextuplets and its octaves in the bass;
    // unit = a sextuplet semiquaver
    avemaria: {
      composer: 'Franz Schubert',
      title: 'Ave Maria, D. 839',
      sacred: true,
      unit: 0.3,
      bar: 24,
      steps: [
        'Bb4:9+Bb1:3+Bb2:3 D4+F4 F4+Bb4 Bb4+D5 F4+Bb4 D4+F4',
        'G1:3+G2:3 D4+E4 E4+Bb4 A4:1.5+Bb4+D5 E4+Bb4/.5 Bb4:1.5/.5 D4+E4',
        'D5:10.5+F1:3+F2:3 D4+F4 F4+Bb4 Bb4+D5 F4+Bb4 D4+F4',
        'F1:3+F2:3 Eb4+A4 A4+C5 C5+Eb5 A4+C5/.5 C5:1.5/.5 Eb4+A4',
        'Bb4:6+G1:3+G2:3 D4+G4 G4+Bb4 Bb4+D5 G4+Bb4 D4+G4',
        'G1:3+G2:3 D4+G4 G4+Bb4 Bb4+D5 G4+Bb4 D4+G4',
        'C5:6+Eb1:3+Eb2:3 Eb4+G4 G4+C5 C5+Eb5 G4+C5 Eb4+G4',
        'Bb4:1.5+F1:3+F2:3 Eb4+F4/.5 A4:1.5/.5 F4+A4 G4:1.5+A4+C5 F4+A4/.5 A4:1.5/.5 Eb4+F4',
      ].join(' '),
    },
    // Fauré, Cantique de Jean Racine, Op. 11, bars 13-19: the first line the
    // voices sing, and from bar 15 the voice that answers it above, read from
    // a setting for flutes in D and put back down into D flat, Fauré's key
    // and the recording's; unit = a semiquaver
    cantique: {
      composer: 'Gabriel Fauré',
      title: 'Cantique de Jean Racine, Op. 11',
      sacred: true,
      unit: 0.18,
      bar: 16,
      lead: 12,
      steps: [
        'F5/3 F5',
        'Ab5/8 Gb5/6 Gb5/2',
        'F5/12 Ab5+F5/4',
        'Db6+F5/4 C6+F5/4 Bb5+Db5/4 Ab5/4',
        'C6+Ab5/4 Gb5/4 Db6+F5/4 Db6+F5/4',
        'Db6+Eb5/8 C6+Gb5/8',
        'Db6+F5/8',
      ].join(' '),
    },
  };
  // the tunes that take turns by a puzzle's position: the gentle ones for most
  // pictures, the stormy ones for those of violence and fright, and the sacred
  // ones for the religious pictures that are neither
  const ORDER = Object.keys(TUNES).filter((name) => !TUNES[name].voice && !TUNES[name].sacred);
  const STORMY = Object.keys(TUNES).filter((name) => TUNES[name].voice);
  const SACRED = Object.keys(TUNES).filter((name) => TUNES[name].sacred);
  const TURNS = { stormy: STORMY, sacred: SACRED };
  // A few seconds of the real thing for a tune to end on, in music/<name>.mp3,
  // cut from a recording on Wikimedia Commons; music/CREDITS.md has the sources.
  // by = who is playing. A recording with a licence must be credited, which the
  // solved screen does; the others are in the public domain. A tune without a
  // recording ends on its own notes. Each also has thirty seconds from the same
  // place in music/long/, for the long ending, but for one marked short.
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
    gnossienne: { by: 'Hannah Dreher' },
    gnossienne2: { by: 'Hannah Dreher' },
    spring: { by: 'ROSA Pianist', licence: 'CC BY 3.0' },
    wings: { by: 'Park Sisters', licence: 'CC BY 4.0' },
    largo: { by: 'Lea Desandre, Les Arts Florissants', licence: 'CC BY 3.0' },
    blacksmith: { by: 'Musopen' },
    hornpipe: { by: 'United States Marine Band' },
    summer: { by: 'Modena Chamber Orchestra' },
    diesirae: { by: 'unnamed performers, from IMSLP', licence: 'CC BY-SA 3.0' },
    strife: { by: 'Skidmore College Orchestra' },
    lamentoso: { by: 'Musopen' },
    mountainking: { by: 'Czech National Symphony Orchestra' },
    baldmountain: { by: 'Musopen' },
    newworld: { by: 'Musopen' },
    kyrie: { by: 'unnamed performers, from Musopen', short: true },
    avemaria: { by: 'Free Tim' },
    cantique: { by: 'Ahots-Argiak choir' },
  };
  // A sound to go with the ending, for a puzzle whose `effect` names one, or
  // lists several, from the files in sound-effects/. lead = the seconds of
  // silence the file opens on, which are skipped so that the sound comes in
  // with the music; level = how loud it is played, fade =
  // the seconds it takes to die away at its end, for one that would stop short.
  const EFFECTS = {
    sword: { file: 'Sword.m4a', lead: 0.8, level: 0.8 },
    gallop: { file: 'Gallop.m4a', lead: 0.45, level: 0.35, fade: 1.5 },
    knock: { file: 'Door knock.m4a', lead: 0.28, level: 0.3 },
  };

  const SEMITONES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  function midi(name) {
    const [, letter, accidental, octave] = name.match(/^([A-G])([#b]?)(\d)$/);
    return 12 * (+octave + 1) + SEMITONES[letter] + (accidental === '#' ? 1 : accidental === 'b' ? -1 : 0);
  }

  let ctx = null;
  let master = null;
  // iOS puts the audio to sleep when the app is put away, the screen locks or a
  // call comes in, and can bring it back dead: still saying it is running, or
  // refusing to be woken, with nothing sounding until the app is closed. So a
  // context that has run and since been away, or whose clock has stopped, is
  // replaced by a new one at the next touch. ran = this context has run, away =
  // it has been put away since, seen = the last time its clock was seen moving.
  let ran = false;
  let away = false;
  let seen = null;
  const on = { music: true, effects: true, long: false };
  // each step: { notes, at } with at = when it sounds, in units from the start
  let steps = [];
  let tune = null;
  let tuneKey = null;
  let length = 0;
  // index of the step most recently heard, -1 before the first sound
  let heard = -1;
  // the recordings fetched so far, the current tune's once it is ready, and the
  // one now sounding
  const clips = {};
  let clip = null;
  let playing = null;
  // the splash's music: its recording once asked for, and the sound of it
  // once it is playing
  let intro = null;
  let greeting = null;
  let parted = false;
  // the noise a tap on a button is cut from, once it has been made
  let hiss = null;
  // the same for the current puzzle's effects: the names asked for, and the
  // buffers of those that are ready, by name
  const effects = {};
  let wanted = [];
  let effect = {};
  let clashing = [];
  // the credit the current tune's recording must carry, if any
  let owed = null;
  // the lute's notes worked out so far, by pitch
  const plucks = {};

  try {
    // the one setting there used to be, which silenced everything
    const silent = localStorage.getItem('puzzle.sound') === 'off';
    for (const kind in KEYS) on[kind] = (localStorage.getItem(KEYS[kind]) || (silent || kind === 'long' ? 'off' : 'on')) === 'on';
  } catch {}

  // The page has been put away: if its audio has run, it may not come back.
  function leave() {
    if (ran) away = true;
  }
  document.addEventListener('visibilitychange', () => document.hidden && leave());
  window.addEventListener('pagehide', leave);

  // Is the clock of a context that says it is running standing still? Judged
  // only when it has stood for over a second since it was last seen to move.
  function frozen() {
    if (ctx.state !== 'running') {
      seen = null;
      return false;
    }
    const now = performance.now();
    if (!seen || ctx.currentTime > seen.time + 0.1) {
      seen = { time: ctx.currentTime, at: now };
      return false;
    }
    return now - seen.at > 1000;
  }

  // Lets go of a context that has died, and of everything made for it, so that
  // the next unlock starts afresh.
  function retire() {
    const old = ctx;
    ctx = null;
    master = null;
    ran = false;
    away = false;
    seen = null;
    clip = null;
    owed = null;
    effect = {};
    playing = null;
    clashing = [];
    greeting = null;
    intro = null;
    hiss = null;
    for (const group of [plucks, clips, effects]) for (const id in group) delete group[id];
    try {
      old.close().catch(() => {});
    } catch {}
  }

  // Must first run inside a touch or click, or iOS keeps the audio silent. It is
  // called at every touch, so that sound comes back after the app has been away.
  function unlock() {
    if (!on.music && !on.effects) return false;
    let renewed = false;
    if (ctx && (ctx.state === 'closed' || (ran && (away || frozen())))) {
      retire();
      renewed = true;
    }
    if (!ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      ctx = new Ctx();
      const mine = ctx;
      mine.onstatechange = () => {
        if (mine !== ctx) return;
        if (mine.state === 'running') ran = true;
        else if (mine.state === 'interrupted') leave();
      };
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
    if (ctx.state !== 'running') {
      // a context that cannot be woken, or does not wake, is dealt with at the next touch
      const mine = ctx;
      const woken = mine.resume();
      if (woken && woken.catch) woken.catch(leave);
      setTimeout(() => mine === ctx && mine.state !== 'running' && leave(), 600);
    }
    if (ctx.state === 'running') ran = true;
    // a new context starts with nothing: the recording and effects the puzzle
    // now open ends on, and its notes, are made again
    if (renewed && tune) {
      loadClip(tuneKey);
      askEffects(wanted);
      ready();
    }
    return true;
  }

  // One plucked string, added to data from the sample at: a delay line as long
  // as the note's period, fed back through a filter that takes a little off the
  // top each time round, which is how a string loses its brightness as it
  // rings (Karplus and Strong's string, tuned as Jaffe and Smith tuned it).
  // seconds = how long the note's fundamental takes to die away.
  function string(data, at, freq, v, pick, level, seconds) {
    const period = ctx.sampleRate / freq;
    // the top notes would be gone at once if they lost as much each time round
    const S = v.damping * Math.min(1, 523 / freq);
    // the filter delays by S and the all-pass after it by the fraction left over
    let size = Math.floor(period - S);
    let rest = period - S - size;
    if (rest < 0.1) {
      size--;
      rest++;
    }
    const C = (1 - rest) / (1 + rest);
    const w = (2 * Math.PI) / period;
    const loss = Math.min(0.9999, Math.pow(10, -3 / (freq * seconds)) / Math.sqrt(1 - 2 * S * (1 - S) * (1 - Math.cos(w))));
    // the pluck: a click, dulled, and its echo from the near end of the string
    const b = 1 - Math.exp((-2 * Math.PI * v.cutoff) / ctx.sampleRate);
    const gap = Math.max(1, Math.round(pick * period));
    const click = new Float32Array(gap + Math.ceil(8 / b));
    for (let i = 0, h = b; i < click.length; i++, h *= 1 - b) {
      click[i] += h;
      if (i + gap < click.length) click[i + gap] -= h;
    }
    const line = new Float32Array(size);
    let before = 0;
    let mean = 0;
    let passed = 0;
    for (let i = 0, k = 0; at + i < data.length; i++, k = k + 1 === size ? 0 : k + 1) {
      const back = line[k];
      const now = (1 - S) * back + S * before;
      before = back;
      passed = C * now + mean - C * passed;
      mean = now;
      const y = (i < click.length ? click[i] : 0) + loss * passed;
      line[k] = y;
      data[at + i] += level * y;
    }
  }

  // The note the lute makes at a pitch, worked out once and kept.
  function plucked(v, pitch) {
    const id = pitch;
    const freq = 440 * Math.pow(2, (pitch - 69) / 12);
    if (plucks[id]) return plucks[id];
    // low notes ring longer than high ones
    const seconds = v.decay * Math.min(1.6, Math.max(0.5, Math.pow(262 / freq, 0.35)));
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * Math.min(3.5, seconds)), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (const [multiple, late, pick, level] of v.strings) {
      if (freq * multiple < ctx.sampleRate / 8) string(data, Math.round(late * ctx.sampleRate), freq * multiple, v, pick, level, seconds);
    }
    let peak = 0;
    for (let i = 0; i < data.length; i++) peak = Math.max(peak, Math.abs(data[i]));
    const tail = Math.floor(ctx.sampleRate * 0.05);
    for (let i = 0; i < data.length; i++) data[i] *= Math.min(1, (data.length - i) / tail) / peak;
    return (plucks[id] = buffer);
  }

  // A plucked note rings on its own, and is damped once its length is up.
  // shake = plucks a second, for a tremolo.
  function pluck(v, pitch, when, level, hold, shake) {
    if (shake) {
      for (let k = 0; k < Math.max(1, Math.round(hold * shake)); k++) pluck(v, pitch, when + k / shake, level * 0.8, 1 / shake, 0);
      return;
    }
    const end = when + Math.max(hold, 0.8);
    const env = ctx.createGain();
    env.gain.setValueAtTime(level, when);
    env.gain.setValueAtTime(level, end);
    env.gain.exponentialRampToValueAtTime(0.0001, end + 0.25);
    env.connect(master);
    const source = ctx.createBufferSource();
    source.buffer = plucked(v, pitch);
    source.connect(env);
    source.start(when);
    source.stop(end + 0.3);
  }

  // Works out the current tune's notes ahead of their turn, if it is played on
  // the lute, one at a time between other things, so that the first piece to
  // land does not have to wait.
  function ready() {
    const mine = tune;
    const v = VOICES[tune.voice || 'piano'];
    if (!ctx || !v.plucked) return;
    const pitches = [...new Set(steps.flatMap((step) => step.notes.map((n) => midi(n.name))))];
    const next = () => {
      if (tune !== mine || !pitches.length) return;
      plucked(v, pitches.shift());
      setTimeout(next, 30);
    };
    setTimeout(next, 300);
  }

  // hold = seconds the note is written to last
  function note(name, delay = 0, volume = 1, hold = 0.8, shake = 0) {
    const v = VOICES[(tune && tune.voice) || 'piano'];
    const pitch = midi(name);
    const freq = 440 * Math.pow(2, (pitch - 69) / 12);
    const when = ctx.currentTime + delay;
    if (v.plucked) return pluck(v, pitch, when, 0.3 * volume * (pitch < 48 ? 0.7 : 1), hold, shake);
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

  // stops the splash's music, if it is still going, and keeps it from starting
  // if it has not yet; fade = the seconds it takes to die away
  function part(fade = 0) {
    parted = true;
    try {
      if (greeting && fade) {
        const now = ctx.currentTime;
        const gain = greeting.level.gain;
        gain.cancelScheduledValues(now);
        gain.setValueAtTime(gain.value, now);
        gain.linearRampToValueAtTime(0, now + fade);
        greeting.stop(now + fade);
      } else if (greeting) greeting.stop();
    } catch {}
    greeting = null;
  }

  // stops the ending, letting it die away over half a second, since the long
  // one may still be playing when the next puzzle is opened
  function hush() {
    for (const source of [playing, ...clashing]) {
      try {
        if (!source) continue;
        const now = ctx.currentTime;
        source.level.gain.cancelScheduledValues(now);
        source.level.gain.setValueAtTime(source.level.gain.value, now);
        source.level.gain.linearRampToValueAtTime(0, now + 0.5);
        source.stop(now + 0.5);
      } catch {}
    }
    playing = null;
    clashing = [];
  }

  // a recording, played as it is, without the room the notes are given
  // from = seconds into it to start from, fade = seconds it takes to die away
  // at its end
  function sample(buffer, level, delay, from = 0, fade = 0) {
    const gain = ctx.createGain();
    gain.gain.value = level;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gain).connect(ctx.destination);
    const start = ctx.currentTime + delay;
    const end = start + buffer.duration - from;
    if (fade) {
      gain.gain.setValueAtTime(level, Math.max(start, end - fade));
      gain.gain.linearRampToValueAtTime(0, end);
    }
    source.start(start, from);
    source.level = gain;
    return source;
  }

  const fetched = (url) =>
    fetch(url)
      .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject()))
      .then((data) => new Promise((done, fail) => ctx.decodeAudioData(data, done, fail)));

  // the long ending, thirty seconds from the same place, is music/long/<key>.mp3,
  // where one has been made (CLIPS marks those without one as short); if it
  // cannot be had, the short one is played instead
  const clipUrl = (key) => (on.long && !CLIPS[key].short ? `music/long/${key}.mp3` : `music/${key}.mp3`);
  function loadClip(key) {
    clip = null;
    owed = null;
    hush();
    if (!(key in CLIPS) || !unlock()) return;
    const url = clipUrl(key);
    const short = `music/${key}.mp3`;
    clips[url] = clips[url] || (url === short ? fetched(url) : fetched(url).catch(() => fetched(short)));
    clips[url].then(
      (buffer) => {
        // not if another puzzle, or the other length, has been asked for since
        if (TUNES[key] !== tune || url !== clipUrl(key)) return;
        clip = buffer;
        if (CLIPS[key].licence) owed = `${CLIPS[key].by}, ${CLIPS[key].licence}`;
      },
      () => delete clips[url]
    );
  }

  // fetches the effects a puzzle ends on, to be ready by the time it does
  function askEffects(names) {
    const asked = (wanted = [].concat(names || []).filter((name) => name in EFFECTS));
    effect = {};
    if (!asked.length || !unlock()) return;
    for (const name of asked) {
      effects[name] = effects[name] || fetched(`sound-effects/${EFFECTS[name].file}`);
      effects[name].then(
        (buffer) => {
          if (wanted === asked) effect[name] = buffer;
        },
        () => delete effects[name]
      );
    }
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

    // The splash's music: the opening of Clair de lune, music/welcome.mp3, thirty
    // seconds of it and five more in which it dies away, played softly, at
    // half the level of the music a puzzle ends on. The recording is under CC BY,
    // so the splash names its player. It is fetched while
    // the splash is up and played at the tap that puts the splash away, since
    // nothing may sound before the first touch. start = play it now.
    welcome(start) {
      if (start) parted = false;
      if (!on.music || !unlock()) return;
      intro = intro || fetched('music/welcome.mp3');
      intro.then(
        (buffer) => {
          if (start && on.music && !greeting && !parted) greeting = sample(buffer, 0.3, 0);
        },
        () => {}
      );
    },

    // A puzzle is opened: the splash's music dies away over a second and a half.
    begin() {
      part(1.5);
    },

    // A button was tapped: a stroke of a paintbrush on canvas. A breath of noise
    // with the bottom and the top taken off, which swells, darkens as it is
    // drawn out and is gone in under half a second, with a faint shiver in it
    // for the weave of the cloth. It is a little different each time, and dry,
    // without the room the notes are given. It goes with the effects.
    tap() {
      if (!on.effects || !unlock()) return;
      if (!hiss) {
        hiss = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
        const data = hiss.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      }
      const now = ctx.currentTime;
      const end = now + 0.4;
      const source = ctx.createBufferSource();
      source.buffer = hiss;
      source.loop = true;
      const band = ctx.createBiquadFilter();
      band.type = 'bandpass';
      band.Q.value = 0.7;
      band.frequency.setValueAtTime(2400 + Math.random() * 600, now);
      band.frequency.exponentialRampToValueAtTime(1100, end);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, now);
      env.gain.exponentialRampToValueAtTime(0.045, now + 0.09);
      env.gain.exponentialRampToValueAtTime(0.0001, end);
      // the weave: the level wavers a little, some thirty times a second
      const weave = ctx.createGain();
      const waver = ctx.createOscillator();
      waver.frequency.value = 28 + Math.random() * 8;
      const depth = ctx.createGain();
      depth.gain.value = 0.25;
      waver.connect(depth).connect(weave.gain);
      source.connect(band).connect(env).connect(weave).connect(ctx.destination);
      source.start(now, Math.random() * 0.4);
      waver.start(now);
      source.stop(end + 0.02);
      waver.stop(end + 0.02);
    },

    // name is a key of TUNES; anything else picks a tune by the puzzle's
    // position, among the stormy or the sacred tunes if kind is 'stormy' or 'sacred'
    setTune(name, index = 0, kind = '') {
      const turns = TURNS[kind] || ORDER;
      const key = name in TUNES ? name : turns[index % turns.length];
      tune = TUNES[key];
      tuneKey = key;
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
      ready();
    },

    // names is a key of EFFECTS or a list of them, or nothing for a puzzle that
    // ends on its music alone
    setEffect: (names) => askEffects(names),

    // count = how many pieces just landed where they belong; the notes the
    // pieces play go with the effects, not the music
    correct(count = 1) {
      if (!on.effects || !unlock() || !steps.length) return;
      for (let i = 0; i < count; i++) {
        const step = steps[++heard % steps.length];
        play(step, i * 0.2, 1, 0.7);
      }
    },

    // a swap that put nothing in place: repeat the note the tune has reached
    swap() {
      if (!on.effects || !unlock() || !steps.length) return;
      if (heard < 0) heard = 0;
      const step = steps[heard % steps.length];
      play(step, 0, 0.7, 0.5);
    },

    // The puzzle is finished: carry on from the step after the last one heard,
    // in tempo, to the first bar line that gives at least most of a bar. A stormy
    // tune can hold one note for a whole bar, which is no ending at all, so it
    // goes on bar by bar until four steps have sounded. A tune with a recording
    // ends on that instead. Either way the puzzle's effects, if it has any, come
    // in with it.
    finish() {
      if (!unlock() || !steps.length) return;
      hush();
      if (on.effects) clashing = Object.keys(effect).map((name) => sample(effect[name], EFFECTS[name].level, 0.7, EFFECTS[name].lead, EFFECTS[name].fade));
      if (!on.music) return;
      part();
      if (clip) {
        playing = sample(clip, 0.6, 0.7);
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
    // recording asks to be credited; null with the music off
    credit: () => (!on.music || !tune ? null : { composer: tune.composer, title: tune.title, performer: owed }),

    // kind is 'music' or 'effects'
    on: (kind) => on[kind],

    // turns the music, the effects or the long ending on or off; music coming
    // on plays a short chord, so that it can be heard to have come on, and the
    // long ending fetches the open puzzle's recording again at its new length
    set(kind, value) {
      if (!(kind in KEYS)) return;
      on[kind] = !!value;
      if (!value) hush();
      if (!value && kind === 'music') part();
      try {
        localStorage.setItem(KEYS[kind], value ? 'on' : 'off');
      } catch {}
      if (kind === 'long' && tune) loadClip(tuneKey);
      if (!value || kind !== 'music' || !unlock()) return;
      const playing = tune;
      tune = null;
      ['C4', 'E4', 'G4'].forEach((name, i) => note(name, i * 0.12));
      tune = playing;
    },
  };
})();
