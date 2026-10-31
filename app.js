const $ = (s) => document.querySelector(s);

const SOLVED_KEY = 'puzzle.solved';
const LEVEL_KEY = 'puzzle.level';
const GUIDE_KEY = 'puzzle.guide';
const TRAY_KEY = 'puzzle.tray';
const PROGRESS_KEY = 'puzzle.progress';
const KIDS_KEY = 'puzzle.kids';
const HIDE_KEY = 'puzzle.hide';
const SPELL_KEY = 'puzzle.spell';
const THEME_KEY = 'puzzle.theme';
const FRAME_KEY = 'puzzle.frame';
// the pictures the splash has shown, and whether it has been shown since the app was opened
const SPLASH_KEY = 'puzzle.splash';
const WELCOMED_KEY = 'puzzle.welcomed';
// the puzzle last played, which the app goes back to when it is next opened
const LAST_KEY = 'puzzle.last';
// the developer's letter: which one has been opened. Raise NOTE when the letter
// is rewritten, and the little scroll wiggles again until the new one is read.
const NOTE_KEY = 'puzzle.note';
const NOTE = 1;
// the colour of the page in each theme, for the bar round the app
const THEMES = { blush: '#f3d9d1', lace: '#f1e6d0', celadon: '#c8d9d0', sage: '#b9c5a3', walnut: '#2b1f18', burgundy: '#3b1827', crimson: '#4a1218', peacock: '#052e3e' };
// how long Off is held to leave Kids mode, in ms
const KIDS_HOLD = 3000;
// height of the reference picture, and limits for the reserve strip, in px
const GUIDE_HEIGHT = 94;
const STRIP_MIN = 64;
const STRIP_MAX = 96;
// approximate number of pieces at each difficulty
const LEVELS = { veryeasy: 10, easy: 40, medium: 100, hard: 200, expert: 200 };
// levels that must never go over their number
const CAPPED = { veryeasy: 10 };
// Expert is solved unseen: grey pieces, blurred cards and no reference picture
const blind = () => level === 'expert';
const mastered = (p) => solved.has(p.id + '|expert');

const board = $('#board');
const piecesEl = $('#pieces');
const peekEl = $('#peek');
const guideEl = $('#guide');
const reserveEl = $('#reserve');

let puzzles = [];
let blurbs = {};
let stories = {};
let verses = {};
let notes = {};
// one entry per artist: { name, note, sort, usual, focus, all, cover, puzzles }; `all` and
// `usual` are every picture and the listed cover, `puzzles` and `cover` what
// is left of them once hidden pictures are taken out; `focus` is the part of the
// listed cover the card keeps in view when it crops it, so no head is cut off
let everyone = [];
// the artists with something on show
let artists = [];
// the artist whose puzzles are on show
let artist = null;
// one entry per collection on the home page: { name, number, usual, everyone,
// artists, cover, count }; `everyone` is its artists in order, `artists` those
// with something on show and `count` their puzzles
let everyCollection = [];
// the collections with something on show
let collections = [];
// the collection whose artists are on show
let collection = null;
// where the settings page goes back to
let settingsFrom = 'gallery';
// the difficulty a paused puzzle had when its settings were opened
let levelBefore = null;
// the artist's or collection's page the settings were opened from
let artistBefore = null;
let collectionBefore = null;
let solved = loadSolved();
// the collections bought, by name (simulated: no payment is taken)
let bought = loadBought();
// a puzzle the pay screen was opened for, opened once it is bought
let pending = null;
// Kids mode plays on Very Easy and hides every kind of picture that can be
// hidden, whatever is chosen below; the choices are kept for when it goes off.
let kids = loadKids();
let chosen = loadLevel();
let level = kids ? 'veryeasy' : chosen;
// the kinds of picture switched off in the settings, from a puzzle's `content`
let hide = loadHide();
// whether a title's upsetting words are written in full
let spell = loadSpell();
let progress = loadProgress();
let game = null;
let drag = null;
let hold = null;
let peekTimer = 0;
// whether the tray for pieces set aside is switched on
let trayOn = loadTray();

function loadSolved() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SOLVED_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function loadLevel() {
  try {
    // Very Easy was called Kids before Kids mode came along
    const saved = (localStorage.getItem(LEVEL_KEY) || '').replace(/^kids$/, 'veryeasy');
    return saved in LEVELS ? saved : 'easy';
  } catch {
    return 'easy';
  }
}

function loadKids() {
  try {
    return localStorage.getItem(KIDS_KEY) === 'on';
  } catch {
    return false;
  }
}

function loadHide() {
  try {
    return new Set(JSON.parse(localStorage.getItem(HIDE_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function loadSpell() {
  try {
    return localStorage.getItem(SPELL_KEY) === 'on';
  } catch {
    return false;
  }
}

function setLevel(next) {
  chosen = next;
  try {
    localStorage.setItem(LEVEL_KEY, chosen);
  } catch {}
  showLevel();
}

function showLevel() {
  level = kids ? 'veryeasy' : chosen;
  document.querySelectorAll('#levels button').forEach((b) => {
    b.setAttribute('aria-pressed', b.dataset.level === level);
    b.disabled = kids;
  });
  // the collection says which difficulty is chosen, as "Easy · about 40 pieces"
  const button = $(`#levels [data-level="${level}"]`);
  // the name is a link to the Difficulty choice in Settings
  const name = kids ? 'Kids mode' : button.firstChild.textContent;
  document.querySelectorAll('.level-note').forEach((el) => {
    const link = document.createElement('button');
    link.className = 'level-link';
    link.textContent = name;
    link.addEventListener('click', () => openSettings(el.closest('.screen').id, '#levels'));
    // the count of pieces, which a puzzle's bar leaves off on a phone (.level-rest)
    const rest = document.createElement('span');
    rest.className = 'level-rest';
    rest.textContent = ' · ' + button.querySelector('small').textContent;
    el.replaceChildren(link, rest);
  });
  labelCards();
}

function setKids(on) {
  kids = on;
  try {
    localStorage.setItem(KIDS_KEY, on ? 'on' : 'off');
  } catch {}
  showKids();
  sift();
  showLevel();
  // turned on from Settings over a solved picture, which then loses its About card
  if (game) showAboutBtn(game.p);
}

function showKids() {
  document.querySelectorAll('#kids button').forEach((b) => b.setAttribute('aria-pressed', (b.dataset.kids === 'on') === kids));
  $('#kidsHold').hidden = !kids;
  showContent();
}

/* ---------- Hidden pictures ---------- */

const hidden = (kind) => kids || hide.has(kind);
const visible = (p) => !(p.content || []).some(hidden);
// pictures of violence or fright are set to the stormy tunes, played on the lute
const stormy = (p) => (p.content || []).some((kind) => kind === 'violence' || kind === 'frightening');
// a religious picture that is not also a stormy one, or any picture of Christ
// (marked `christ`), which keeps a sacred tune however violent it is
const sacred = (p) => p.sacred && (p.christ || !stormy(p));

function setHidden(kind, on) {
  if (on) hide.add(kind);
  else hide.delete(kind);
  try {
    localStorage.setItem(HIDE_KEY, JSON.stringify([...hide]));
  } catch {}
  showContent();
  sift();
}

// Each kind is underlined while it is shown; Kids mode holds them all hidden.
function showContent() {
  document.querySelectorAll('#content [data-content]').forEach((b) => {
    const off = hidden(b.dataset.content);
    b.setAttribute('aria-pressed', !off);
    b.disabled = kids;
    b.querySelector('small').textContent = off ? 'hidden' : 'shown';
  });
  const b = $('#spell');
  b.setAttribute('aria-pressed', spelled());
  b.disabled = kids;
  b.querySelector('small').textContent = spelled() ? 'spelled out' : 'masked';
}

// Kids mode never spells them out
const spelled = () => spell && !kids;

function setSpell(on) {
  spell = on;
  try {
    localStorage.setItem(SPELL_KEY, on ? 'on' : 'off');
  } catch {}
  showContent();
  sift();
}

// Take the hidden pictures out of every artist's page. An artist whose cover is
// hidden shows their first picture left, and one with none left has no card.
function sift() {
  for (const a of everyone) {
    a.puzzles = a.all.filter(visible);
    const usual = a.all.find((p) => p.image === a.usual);
    a.cover = usual && !visible(usual) ? a.puzzles[0] && a.puzzles[0].image : a.usual;
  }
  artists = everyone.filter((a) => a.puzzles.length);
  // a collection shows the picture it names, or its first artist's where it names
  // none or that one is hidden, and one with no artists left has no card
  for (const c of everyCollection) {
    c.artists = c.everyone.filter((a) => a.puzzles.length);
    c.count = c.artists.reduce((n, a) => n + a.puzzles.length, 0);
    const named = c.artists.some((a) => a.puzzles.some((p) => p.image === c.usual));
    c.cover = named ? c.usual : c.artists[0] && c.artists[0].cover;
  }
  collections = everyCollection.filter((c) => c.artists.length);
  // the open pages are drawn again when they are next opened
  artist = null;
  collection = null;
  $('#grid').textContent = '';
  $('#shelf').textContent = '';
  renderGallery();
}

// index.html puts the saved theme on the page before it is first drawn
function setTheme(next) {
  try {
    localStorage.setItem(THEME_KEY, next);
  } catch {}
  document.documentElement.dataset.theme = next;
  showTheme();
}

function showTheme() {
  const theme = document.documentElement.dataset.theme in THEMES ? document.documentElement.dataset.theme : 'lace';
  document.documentElement.dataset.theme = theme;
  $('meta[name="theme-color"]').content = THEMES[theme];
  document.querySelectorAll('#themes button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.theme === theme));
}

// A solved puzzle hangs in the photographed frame unless the plain one, drawn
// by the styles, has been chosen.
function loadFrame() {
  try {
    return localStorage.getItem(FRAME_KEY) === 'plain' ? 'plain' : 'ornate';
  } catch {
    return 'ornate';
  }
}

function setFrame(next) {
  try {
    localStorage.setItem(FRAME_KEY, next);
  } catch {}
  showFrame();
}

function showFrame() {
  const plain = loadFrame() === 'plain';
  $('.plate').classList.toggle('plain', plain);
  $('.plate-face').classList.toggle('frame', plain);
  document.querySelectorAll('#frames button').forEach((b) => b.setAttribute('aria-pressed', (b.dataset.frame === 'plain') === plain));
}

// the music's slider: 0 = off, 1 = a short ending, 2 = a long one
const musicLevel = () => (!sound.on('music') ? 0 : sound.on('long') ? 2 : 1);
const MUSIC_NAMES = ['Off', 'On: Short', 'On: Long'];

function showSound() {
  document.querySelectorAll('#sounds [data-sound]').forEach((b) => {
    b.setAttribute('aria-pressed', sound.on(b.dataset.sound));
    b.querySelector('small').textContent = sound.on(b.dataset.sound) ? 'on' : 'off';
  });
  const level = musicLevel();
  $('#music').value = level;
  $('#music').setAttribute('aria-valuetext', MUSIC_NAMES[level]);
  $('#music').style.setProperty('--fill', level / 2);
  document.querySelectorAll('#sounds [data-music]').forEach((b) => b.setAttribute('aria-pressed', +b.dataset.music === level));
}

// The text size: every word is sized from the root, so one value on <html>
// enlarges them all (style.css keeps the big titles as they are).
const TEXT_KEY = 'puzzle.textSize';
const TEXT_SIZES = ['standard', 'larger', 'largest'];
const TEXT_NAMES = ['Standard', 'Larger', 'Largest'];
function textLevel() {
  return Math.max(0, TEXT_SIZES.indexOf(document.documentElement.dataset.text || 'standard'));
}
function showTextSize() {
  const level = textLevel();
  $('#textSize').value = level;
  $('#textSize').setAttribute('aria-valuetext', TEXT_NAMES[level]);
  $('#textSize').style.setProperty('--fill', level / 2);
  document.querySelectorAll('#textSizes [data-text]').forEach((b) => b.setAttribute('aria-pressed', +b.dataset.text === level));
}
function setTextSize(level) {
  if (level) document.documentElement.dataset.text = TEXT_SIZES[level];
  else delete document.documentElement.dataset.text;
  try {
    localStorage.setItem(TEXT_KEY, TEXT_SIZES[level]);
  } catch {}
  showTextSize();
}

// Short and Long differ only in the ending; the music is turned on last, so
// that its chord is heard only when it comes on from Off
function setMusic(level) {
  if (level > 0 && sound.on('long') !== (level === 2)) sound.set('long', level === 2);
  if ((level > 0) !== sound.on('music')) sound.set('music', level > 0);
  showSound();
}

// The line under each card's name; unfinished puzzles are per difficulty.
function labelCards() {
  document.querySelectorAll('#grid .card').forEach((card, i) => {
    const p = artist.puzzles[i];
    const state = stateOf(p);
    card.classList.toggle('solved', solved.has(p.id));
    card.classList.toggle('veiled', state === 'open' && blind() && !mastered(p));
    card.classList.toggle('is-next', state === 'next');
    card.classList.toggle('is-locked', state === 'locked');
    card.classList.toggle('sepia', !playable(p));
    // a chapter moving on: the next picture comes out of its blur, and the
    // one after turns round to be ringed, when the page is next shown
    const was = card.dataset.state;
    card.dataset.state = state;
    if (was && was !== state) card.classList.add('from-' + was);
    if (state === 'open') {
      fill(card, p.image);
      card.removeAttribute('aria-label');
      card.querySelector('i').textContent = p.scientific || '';
      card.querySelector('b').textContent = titleOf(p);
      drawVeil(card);
      card.querySelector('small').textContent =
        progressKey(p) in progress ? 'In progress' : mastered(p) ? 'Solved in black and white' : solved.has(p.id) ? 'Solved' : '';
      return;
    }
    card.querySelector('i').textContent = yearOf(p);
    card.querySelector('b').textContent = state === 'next' ? 'Up next' : '?';
    card.querySelector('small').textContent = !playable(p) ? 'Unlock the collection to play' : state === 'next' ? `No. ${i + 1} · tap to begin` : `Unlocks after No. ${i}`;
    card.setAttribute('aria-label', state === 'next' ? `Up next, picture ${i + 1}` : `Hidden, picture ${i + 1}, unlocks after picture ${i}`);
  });
  const tally = (list) => (card, i) => {
    const count = list[i].puzzles.length;
    const done = list[i].puzzles.filter((p) => solved.has(p.id)).length;
    const small = card.querySelector('small');
    small.textContent = count + (count === 1 ? ' puzzle' : ' puzzles') + (done && done < count ? ` · ${done} solved` : '');
    // a finished chapter says so
    if (count && done === count) small.append(' · ', Object.assign(document.createElement('em'), { className: 'complete', textContent: 'Complete' }));
    card.classList.toggle('sepia', !litArtist(list[i]));
  };
  if (collection) document.querySelectorAll('#shelf .card').forEach(tally(collection.artists));
  document.querySelectorAll('#collections .card').forEach((card, i) => card.classList.toggle('sepia', !lit(collections[i])));
  showOffers();
}

// The reference picture in the top bar stays on unless it has been switched
// off; without it the bar is slimmer and the puzzle takes the room.
function setGuide(on) {
  try {
    localStorage.setItem(GUIDE_KEY, on ? 'on' : 'off');
  } catch {}
  guideEl.classList.toggle('off', !on);
  $('#play').classList.toggle('no-guide', !on);
  $('#peekBtn').setAttribute('aria-pressed', on);
  layout();
}

function loadTray() {
  try {
    return localStorage.getItem(TRAY_KEY) !== 'off';
  } catch {
    return true;
  }
}

function setTray(on) {
  trayOn = on;
  try {
    localStorage.setItem(TRAY_KEY, on ? 'on' : 'off');
  } catch {}
  showTray();
}

// The tray is on show while it is switched on or has anything in it; a full
// canvas can still push a block into it. Hidden, it leaves its room to the puzzle.
function showTray() {
  const play = $('#play');
  const off = !trayOn && !(game && game.held.length);
  $('#trayBtn').setAttribute('aria-pressed', !off);
  if (play.classList.contains('no-tray') === off) return;
  play.classList.toggle('no-tray', off);
  layout();
}

function loadGuide() {
  try {
    return localStorage.getItem(GUIDE_KEY) !== 'off';
  } catch {
    return true;
  }
}

function saveSolved() {
  try {
    localStorage.setItem(SOLVED_KEY, JSON.stringify([...solved]));
  } catch {}
}

// Unfinished puzzles are kept per picture and difficulty, so a half-done hard
// puzzle survives someone else solving the same picture on Very Easy.
const progressKey = (p) => p.id + '|' + level;

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {};
    // Very Easy was called Kids before Kids mode came along
    return Object.fromEntries(Object.entries(saved).map(([key, state]) => [key.replace(/\|kids$/, '|veryeasy'), state]));
  } catch {
    return {};
  }
}

function writeProgress() {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {}
}

function saveProgress() {
  const { p, cols, rows, pos, held } = game;
  progress[progressKey(p)] = { cols, rows, pos, held };
  writeProgress();
}

function clearProgress(p) {
  if (!(progressKey(p) in progress)) return;
  delete progress[progressKey(p)];
  writeProgress();
}

// The saved state for this picture, if it still fits the grid and accounts for
// every piece exactly once.
function savedProgress(p, cols, rows) {
  const s = progress[progressKey(p)];
  const count = cols * rows;
  if (!s || s.cols !== cols || s.rows !== rows || !Array.isArray(s.pos) || !Array.isArray(s.held)) return null;
  if (s.pos.length !== count || !s.held.every(Array.isArray)) return null;
  const inReserve = new Set(s.held.flat());
  const spots = new Set();
  for (let piece = 0; piece < count; piece++) {
    const spot = s.pos[piece];
    if (!Number.isInteger(spot) || spot >= count || (spot < 0) !== inReserve.has(piece) || spots.has(spot)) return null;
    if (spot >= 0) spots.add(spot);
  }
  if (inReserve.size !== s.held.flat().length || inReserve.size + spots.size !== count) return null;
  return s;
}

// Every page opens at its top, coming back to it included.
function show(id) {
  document.querySelectorAll('.screen').forEach((s) => (s.hidden = s.id !== id));
  $('#' + id).scrollTop = 0;
  reloadIfStale();
}

// Keeping up to date. A home-screen app on the iPad is seldom started afresh: put
// away, it is only paused, and comes back running the copy it had, so what has been
// published since never shows. Each time it comes back it asks the host whether
// anything is newer (every publish at GitHub Pages stamps every file anew), and if
// so it starts again on the new copy, but only from the gallery's pages, never in
// a puzzle, on its solved screen or in Settings: that waits until one is left.
// The iOS app carries its own files and is updated through the App Store, so
// it never asks.
const stampOf = () =>
  store.native ? Promise.resolve('') : fetch('index.html', { method: 'HEAD', cache: 'no-store' })
    .then((r) => (r.ok && (r.headers.get('etag') || r.headers.get('last-modified'))) || '')
    .catch(() => '');
const firstStamp = stampOf();
let stale = false;
async function checkFresh() {
  const was = await firstStamp;
  const now = was && (await stampOf());
  if (now && now !== was) stale = true;
  reloadIfStale();
}
function reloadIfStale() {
  const at = document.querySelector('.screen:not([hidden])');
  if (stale && at && ['gallery', 'collection', 'artist'].includes(at.id) && $('#paywall').hidden) location.reload();
}
document.addEventListener('visibilitychange', () => document.hidden || checkFresh());

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load ' + src));
    img.src = src;
  });
}

function shuffled(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---------- Black and white ---------- */

// These are drawn on canvases; CSS filters can fail to paint in Safari.
function scaled(src, wide, high) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(wide));
  canvas.height = Math.max(1, Math.round(high));
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function greyed(canvas) {
  const ctx = canvas.getContext('2d');
  const shot = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = shot.data;
  for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  ctx.putImageData(shot, 0, 0);
  return canvas;
}

// A grey blur of a picture: halved until its shorter side is near `fine`
// pixels, then doubled back up until that side reaches `size`. Going by steps
// keeps it smooth.
function blurred(img, fine, size) {
  const full = [img.naturalWidth || img.width, img.naturalHeight || img.height];
  const shrink = fine / Math.min(...full);
  let [wide, high] = full;
  let canvas = img;
  while (Math.min(wide, high) > fine * 2) canvas = scaled(canvas, (wide /= 2), (high /= 2));
  canvas = greyed(scaled(canvas, full[0] * shrink, full[1] * shrink));
  while (Math.min(canvas.width, canvas.height) < size) canvas = scaled(canvas, canvas.width * 2, canvas.height * 2);
  return canvas;
}

// The whole picture in black and white, as an address the pieces can use.
let greyUrl = '';
function greyPicture(img) {
  URL.revokeObjectURL(greyUrl);
  const canvas = greyed(scaled(img, img.naturalWidth, img.naturalHeight));
  return new Promise((resolve) => canvas.toBlob((blob) => resolve((greyUrl = URL.createObjectURL(blob))), 'image/jpeg', 0.9));
}

// A veiled card shows the blur in place of its picture, made once the picture is in.
function drawVeil(card) {
  const face = card.querySelector('img');
  if (!card.classList.contains('veiled') || card.querySelector('.veil') || !face.naturalWidth) return;
  const veil = blurred(face, 7, 240);
  veil.className = 'veil';
  veil.style.objectPosition = face.style.objectPosition;
  face.after(veil);
}

/* ---------- Splash ---------- */

// The app opens on a picture and a title card, once each time it is opened.
// The picture is never one with a `content` tag, whatever the settings show,
// and each opening takes one not shown yet until they have all had a turn.
async function showSplash() {
  if (!('splash' in document.documentElement.dataset)) return;
  // fetched now, to be ready for the tap
  sound.welcome();
  const mild = puzzles.filter((p) => !(p.content || []).length);
  let seen = [];
  try {
    seen = JSON.parse(localStorage.getItem(SPLASH_KEY)) || [];
  } catch {}
  let fresh = mild.filter((p) => !seen.includes(p.id));
  if (!fresh.length) {
    // round again, but not straight back to the last one
    fresh = mild.length > 1 ? mild.filter((p) => p.id !== seen[seen.length - 1]) : mild;
    seen = [];
  }
  const p = fresh[Math.floor(Math.random() * fresh.length)];
  if (!p) return;
  try {
    localStorage.setItem(SPLASH_KEY, JSON.stringify([...seen, p.id]));
  } catch {}
  try {
    await loadImage(p.image);
  } catch {
    return;
  }
  $('#splashCaption').textContent = titleOf(p) + ' · ' + p.artist;
  $('#splashImg').style.backgroundImage = `url("${p.image}")`;
  $('#splashImg').classList.add('in');
}

// Where the app opens, once someone has played: the puzzle they last played if
// it is still unfinished, or else the next one to start, as Next Puzzle would
// lead on from it. Someone who has played but has no puzzle on record (from
// before this was kept) goes to the first puzzle begun, or the first not solved,
// in the order the collections show them. Null, for the home page, the first
// time, or when that puzzle is hidden by the settings, finished, or not bought.
function landing() {
  let last = null;
  try {
    const id = localStorage.getItem(LAST_KEY);
    last = puzzles.find((p) => p.id === id) || null;
  } catch {}
  const shownNow = (p) => !!p && !!artistOf(p) && artistOf(p).puzzles.includes(p);
  const begun = (p) => progressKey(p) in progress;
  const order = collections.flatMap((c) => c.artists).flatMap((a) => a.puzzles);
  let p = null;
  if (shownNow(last)) p = begun(last) || !finished(last) ? last : nextPuzzle(last);
  else if (last || solved.size || Object.keys(progress).length) p = order.find(begun) || order.find((q) => !solved.has(q.id));
  return p && shownNow(p) && !finished(p) && playable(p) ? p : null;
}

// A tap anywhere sets its music going and puts it away until the app is next
// opened, going on into the puzzle that waits (`landing`), where the splash's
// music dies away as it does whenever a puzzle is opened.
$('#splash').addEventListener('click', () => {
  const el = $('#splash');
  try {
    sessionStorage.setItem(WELCOMED_KEY, 'on');
  } catch {}
  sound.welcome(true);
  const p = landing();
  if (p) start(p);
  el.classList.add('leaving');
  // gone once it has faded
  setTimeout(() => delete document.documentElement.dataset.splash, 700);
});

/* ---------- Gallery ---------- */

const artistOf = (p) => everyone.find((a) => a.all.includes(p));
// the collection an artist's page goes back to: the open one if they are in it, or their own
const collectionOf = (a) => (collection && collection.artists.includes(a) ? collection : collections.find((c) => c.artists.includes(a)));
// a title is shown without the word "rape" spelled out, as The R+++ of Proserpine,
// unless the settings ask for it in full
const titleOf = (p) => (spelled() ? p.name : p.name.replace(/\b(r)ape\b/gi, '$1+++'));

// Every artist is a chapter, showing their pictures one at a time, in order. The first not yet solved is next,
// under a blur of its colours alone (puzzles/veils/, made by veil.js), and
// those after it are blurred too, with a question mark, until it is solved.
// Neither loads the picture itself. A picture solved or begun
// is open, whatever its place.
const veilOf = (p) => p.image.replace('puzzles/', 'puzzles/veils/');
function stateOf(p) {
  const a = artistOf(p);
  if (!a || solved.has(p.id) || progressKey(p) in progress) return 'open';
  return a.puzzles.find((q) => !solved.has(q.id)) === p ? 'next' : 'locked';
}
const unseen = (p) => stateOf(p) !== 'open';
const thumbOf = (image) => image.replace('puzzles/', 'puzzles/thumbs/');
// the year in a puzzle's italic line, the one thing a hidden picture's card tells of it
const yearOf = (p) => ((p.scientific || '').match(/\b1\d{3}\b/) || [''])[0];

// `later` leaves the picture out until fill() puts it in, for a chapter's hidden cards
function makeCard(image, line, name, later = false) {
  const card = document.createElement('button');
  card.className = 'card';
  card.innerHTML = '<span class="card-img"><img alt="" loading="lazy" decoding="async"><span class="tone"></span><span class="padlock"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10.5" width="14" height="10" rx="1.6"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/></svg></span></span><span class="card-label"><i></i><b></b><small></small></span>';
  // a small copy keeps the gallery light; fall back to the full picture
  const face = card.querySelector('img');
  face.onerror = () => {
    face.onerror = null;
    face.src = face.getAttribute('src').replace('puzzles/thumbs/', 'puzzles/');
  };
  face.onload = () => drawVeil(card);
  if (!later) fill(card, image);
  card.querySelector('i').textContent = line || '';
  card.querySelector('b').textContent = name;
  return card;
}

// Puts a picture on a card, or changes it, as a cover does once a chapter moves on.
function fill(card, image) {
  const face = card.querySelector('.card-img img');
  const src = thumbOf(image);
  if (face.getAttribute('src') !== src && face.getAttribute('src') !== image) face.src = src;
}

// A chapter's card holds, beside the picture, the blur shown until it is solved.
function hideCard(card, p) {
  const box = card.querySelector('.card-img');
  const hint = Object.assign(document.createElement('img'), { className: 'hint', alt: '', decoding: 'async', src: veilOf(p) });
  box.append(hint);
  markShape(card, hint);
}

// A puzzle's card crops every picture to the same upright shape, so it carries
// a small outline of the picture's own, tall, wide or square, once it is in.
// A chapter's card takes the shape from its blur, which is the picture's own.
function markShape(card, face = card.querySelector('img')) {
  const mark = () => {
    if (!face.naturalWidth || card.querySelector('.shape')) return;
    const ratio = face.naturalWidth / face.naturalHeight;
    const kind = ratio > 1.08 ? 'wide' : ratio < 0.92 ? 'tall' : 'square';
    const el = document.createElement('span');
    el.className = 'shape ' + kind;
    el.setAttribute('role', 'img');
    el.setAttribute('aria-label', { tall: 'Upright picture', wide: 'Wide picture', square: 'Square picture' }[kind]);
    card.querySelector('.card-img').append(el);
  };
  face.addEventListener('load', mark);
  if (face.complete) mark();
}

// The home page: one card per collection, always lit.
function renderGallery() {
  const grid = $('#collections');
  grid.textContent = '';
  $('#empty').hidden = puzzles.length > 0;
  $('#allHidden').hidden = !puzzles.length || artists.length > 0;
  for (const c of collections) {
    // no italic line: its number alone stands for its name, as Collection 1
    const card = makeCard(c.cover, '', c.number);
    if (c.focus && c.cover === c.usual) card.querySelector('.card-img img').style.objectPosition = c.focus;
    // no count of its puzzles either
    card.querySelector('small').remove();
    card.classList.add('solved');
    // a collection not yet bought can still be opened, to see whose pictures it holds
    card.addEventListener('click', () => openCollection(c));
    grid.append(card);
  }
  labelCards();
}

function openGallery() {
  game = null;
  labelCards();
  show('gallery');
}

// One collection's artists, always lit.
function openCollection(c) {
  game = null;
  if (c !== collection) {
    collection = c;
    $('#collectionName').textContent = c.number;
    const grid = $('#shelf');
    grid.textContent = '';
    for (const a of c.artists) {
      const card = makeCard(a.cover, a.note, a.name);
      if (a.focus && a.cover === a.usual) card.querySelector('.card-img img').style.objectPosition = a.focus;
      card.classList.add('solved');
      card.addEventListener('click', () => (litArtist(a) ? openArtist(a) : openPaywall(shelfOf(a))));
      grid.append(card);
    }
    $('#collection').scrollTop = 0;
  }
  labelCards();
  show('collection');
}

// The artist's bio spans exactly the columns of cards under it. The columns are
// centred and their number changes with the width, so it is measured from the grid
// each time the grid changes size (which includes the page being shown).
function fitBio() {
  const grid = $('#grid');
  const cs = getComputedStyle(grid);
  const cols = cs.gridTemplateColumns.split(' ').map(parseFloat).filter((n) => n > 0);
  if (!cols.length) return;
  const wide = cols.reduce((s, n) => s + n, 0) + parseFloat(cs.columnGap) * (cols.length - 1);
  $('#artistBio').style.width = `${Math.round(wide)}px`;
}
new ResizeObserver(fitBio).observe($('#grid'));

// One artist's puzzles.
function openArtist(a) {
  game = null;
  if (a !== artist) {
    artist = a;
    // with a bio, the italic note ("French, 1840–1926") ends it instead of standing over the name
    $('#artistNote').textContent = a.bio ? '' : a.note || '';
    $('#artistNote').hidden = !!a.bio;
    $('#artistName').textContent = a.name;
    const bio = $('#artistBio');
    bio.textContent = a.bio || '';
    if (a.bio && a.note) {
      const note = document.createElement('em');
      note.className = 'bio-note';
      note.textContent = a.note;
      bio.append(' ', note);
    }
    bio.hidden = !a.bio;
    const grid = $('#grid');
    grid.textContent = '';
    for (const p of a.puzzles) {
      const card = makeCard(p.image, p.scientific, titleOf(p), true);
      // the part of the picture its card keeps in view, so no head is cut off
      if (p.focus) card.querySelector('.card-img img').style.objectPosition = p.focus;
      hideCard(card, p);
      card.addEventListener('click', () => {
        if (!playable(p)) return openPaywall(shelfOf(a), p);
        if (stateOf(p) !== 'locked') return visit(p);
        // a hidden one only shrugs
        card.classList.remove('nudge');
        void card.offsetWidth;
        card.classList.add('nudge');
      });
      grid.append(card);
    }
    $('#artist').scrollTop = 0;
  }
  // from the list of artists, the way back is to the list
  $('#artistBackName').textContent = collectionOf(a).number;
  labelCards();
  show('artist');
}

/* ---------- Puzzle setup ---------- */

// Cells are twice as wide as they are tall; pick the grid whose cell count
// lands closest to the target, without going over `most`. A picture too tall
// to fit under `most` even at two columns gets fewer, taller rows instead.
function gridFor(aspect, target, most = Infinity) {
  let best;
  for (let cols = 2; cols <= 30; cols++) {
    let rows = Math.max(2, Math.round((cols * 2) / aspect));
    if (cols * rows > most) {
      if (best) break;
      rows = Math.floor(most / cols);
    }
    if (!best || Math.abs(cols * rows - target) < Math.abs(best.cols * best.rows - target)) best = { cols, rows };
  }
  return best;
}

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

// The canvas is a grid exactly the size of the picture. Pieces are numbered by
// their place in the picture (row by row). g.pos[piece] is the canvas cell a
// piece sits on, or -1 while it is in the reserve; g.cell[i] is the piece on
// that cell, or -1. g.held lists the blocks in the reserve.
// Is this piece sitting against its true neighbour in direction (dc, dr)?
function joined(g, piece, dc, dr) {
  const homeCol = (piece % g.cols) + dc;
  const want = piece + dc + dr * g.cols;
  if (g.pos[piece] < 0 || homeCol < 0 || homeCol >= g.cols || want < 0 || want >= g.pos.length) return false;
  const c = (g.pos[piece] % g.cols) + dc;
  const r = Math.floor(g.pos[piece] / g.cols) + dr;
  if (c < 0 || c >= g.cols || r < 0 || r >= g.rows) return false;
  return g.cell[r * g.cols + c] === want;
}

// group[piece] = an id shared by every piece fused to it on the canvas
function findGroups(g) {
  const group = new Array(g.pos.length).fill(-1);
  let count = 0;
  for (let first = 0; first < group.length; first++) {
    if (group[first] >= 0 || g.pos[first] < 0) continue;
    group[first] = count;
    const stack = [first];
    while (stack.length) {
      const piece = stack.pop();
      for (const [dc, dr] of DIRS) {
        const next = piece + dc + dr * g.cols;
        if (joined(g, piece, dc, dr) && group[next] < 0) {
          group[next] = count;
          stack.push(next);
        }
      }
    }
    count++;
  }
  return { group, count };
}

// Deal the pieces over the whole canvas, retrying so none start out joined.
function scatter(g, count) {
  const cells = Array.from({ length: count }, (_, i) => i);
  for (let attempt = 0; attempt < 500; attempt++) {
    g.pos = shuffled(cells);
    g.cell = [];
    g.pos.forEach((spot, piece) => (g.cell[spot] = piece));
    if (findGroups(g).count === count) break;
  }
}

// A picture already solved at this difficulty, and not begun again since, hangs
// finished in its frame, where Solve Again deals it afresh. On Expert that
// takes having solved it in black and white, or the picture would be given away.
const finished = (p) => (blind() ? mastered(p) : solved.has(p.id)) && !(progressKey(p) in progress);

// The tune a puzzle plays: its own, or the next of the stormy, sacred or piano
// tunes by its place among them
function chooseTune(p) {
  if (sacred(p)) sound.setTune(p.music, puzzles.filter(sacred).indexOf(p), 'sacred');
  else if (stormy(p)) sound.setTune(p.music, puzzles.filter(stormy).indexOf(p), 'stormy');
  else sound.setTune(p.music, puzzles.indexOf(p));
}

// names the music on the solved screen, once it is playing
function nameMusic(played = true) {
  const credit = played && sound.credit();
  $('#plateMusic').textContent = credit
    ? `Music: ${credit.composer}, ${credit.title}` + (credit.performer ? ` · played by ${credit.performer}` : '')
    : '';
  $('#plateMusic').hidden = !credit;
}

// Opens a picture from its card: the finished one if it has been solved, the
// puzzle if not.
async function visit(p) {
  if (!playable(p)) return openPaywall(shelfOf(artistOf(p)), p);
  if (!finished(p)) return start(p);
  // its music is fetched while the picture is, and plays once it hangs
  chooseTune(p);
  sound.setEffect(null);
  let img;
  try {
    img = await loadImage(p.image);
  } catch (err) {
    alert(err.message);
    return;
  }
  game = { p, aspect: img.naturalWidth / img.naturalHeight, held: [], done: true };
  $('#doneBackName').textContent = artistOf(p).name;
  showPlate(p, false);
  sound.reprise(() => game && game.p === p && !$('#done').hidden).then((played) => played && nameMusic());
}

// Opens a puzzle where it was left off; `fresh` deals it again from scratch.
async function start(p, fresh = false) {
  if (!playable(p)) return openPaywall(shelfOf(artistOf(p)), p);
  try {
    localStorage.setItem(LAST_KEY, p.id);
  } catch {}
  let img;
  try {
    img = await loadImage(p.image);
  } catch (err) {
    alert(err.message);
    return;
  }
  $('#pause').hidden = true;
  $('#playBackName').textContent = $('#doneBackName').textContent = artistOf(p).name;
  show('play');

  const aspect = img.naturalWidth / img.naturalHeight;
  const { cols, rows } = gridFor(aspect, LEVELS[level], CAPPED[level]);
  game = { p, cols, rows, aspect, held: [], els: [], done: false, blind: blind() };
  const face = game.blind ? await greyPicture(img) : p.image;
  if (fresh) clearProgress(p);
  const saved = savedProgress(p, cols, rows);
  if (saved) {
    game.pos = saved.pos.slice();
    game.held = saved.held.map((block) => block.slice());
    game.cell = new Array(cols * rows).fill(-1);
    game.pos.forEach((spot, piece) => spot >= 0 && (game.cell[spot] = piece));
  } else {
    scatter(game, cols * rows);
  }

  chooseTune(p);
  sound.setEffect(p.effect);
  sound.begin();
  piecesEl.textContent = '';
  peekEl.classList.remove('show', 'reveal');
  peekEl.style.backgroundImage = `url("${p.image}")`;
  $('#play').classList.toggle('blind', game.blind);
  showTray();
  loadImage(p.image.replace('puzzles/', 'puzzles/thumbs/'))
    .catch(() => img)
    .then(drawGuide);
  $('#play').style.setProperty('--cols', cols);
  $('#play').style.setProperty('--rows', rows);
  for (let id = 0; id < cols * rows; id++) {
    const el = document.createElement('div');
    el.className = 'piece';
    el.dataset.id = id;
    el.style.backgroundImage = `url("${face}")`;
    el.style.setProperty('--sc', id % cols);
    el.style.setProperty('--sr', Math.floor(id / cols));
    game.els[id] = el;
    piecesEl.append(el);
  }
  layout();
  refresh();
}

// The reference picture is drawn onto a canvas at the screen's own pixel size,
// already faded. A scaled, see-through <img> showed white lines on the iPad.
function drawGuide(img) {
  // never wider than leaves room for the three buttons on the right (156px) and
  // as much again on the left, inside the bar's 22px edges, or on a phone the bar
  // runs off the screen
  const bar = guideEl.closest('.bar').clientWidth || window.innerWidth;
  const room = Math.max(40, bar - 2 * (156 + 22));
  const wide = Math.round(Math.min((GUIDE_HEIGHT * img.naturalWidth) / img.naturalHeight, window.innerWidth * 0.45, room));
  const high = Math.round((wide * img.naturalHeight) / img.naturalWidth);
  const scale = window.devicePixelRatio || 1;
  guideEl.width = Math.round(wide * scale);
  guideEl.height = Math.round(high * scale);
  guideEl.style.width = wide + 'px';
  guideEl.style.height = high + 'px';
  const ctx = guideEl.getContext('2d');
  ctx.globalAlpha = 0.7;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, guideEl.width, guideEl.height);
}

// Work out which pieces are fused, then put every piece where the state says
// it is and hide the seams between fused neighbours.
function refresh() {
  const { group, count } = findGroups(game);
  game.group = group;
  // every separate block, on the canvas or in the reserve
  game.groups = count + game.held.length;
  game.els.forEach((el, piece) => {
    if (game.pos[piece] < 0) return;
    if (el.parentNode !== piecesEl) piecesEl.append(el);
    el.style.setProperty('--c', game.pos[piece] % game.cols);
    el.style.setProperty('--r', Math.floor(game.pos[piece] / game.cols));
    el.classList.toggle('jl', joined(game, piece, -1, 0));
    el.classList.toggle('jr', joined(game, piece, 1, 0));
    el.classList.toggle('jt', joined(game, piece, 0, -1));
    el.classList.toggle('jb', joined(game, piece, 0, 1));
  });
  showTray();
  drawReserve();
}

// Blocks in the reserve keep their shape but are drawn small enough to fit
// the strip; a single piece stays full size.
function drawReserve() {
  const scroll = reserveEl.scrollLeft;
  reserveEl.querySelectorAll('.held').forEach((item) => item.remove());
  const { cols } = game;
  game.held.forEach((pieces, index) => {
    const box = boxOf(pieces);
    const scale = Math.min(1, game.strip / (box.h * game.ch), (game.strip * 3) / (box.w * game.cw));
    const cw = Math.max(2, Math.floor(game.cw * scale));
    const ch = Math.max(1, Math.floor(game.ch * scale));
    const item = document.createElement('div');
    item.className = 'held';
    item.dataset.index = index;
    item.style.setProperty('--cw', cw + 'px');
    item.style.setProperty('--ch', ch + 'px');
    item.style.width = box.w * cw + 'px';
    item.style.height = box.h * ch + 'px';
    const inBlock = new Set(pieces);
    for (const piece of pieces) {
      const el = game.els[piece];
      el.style.setProperty('--c', (piece % cols) - box.c);
      el.style.setProperty('--r', Math.floor(piece / cols) - box.r);
      el.classList.toggle('jl', piece % cols > 0 && inBlock.has(piece - 1));
      el.classList.toggle('jr', piece % cols < cols - 1 && inBlock.has(piece + 1));
      el.classList.toggle('jt', inBlock.has(piece - cols));
      el.classList.toggle('jb', inBlock.has(piece + cols));
      item.append(el);
    }
    reserveEl.append(item);
  });
  reserveEl.classList.toggle('empty', !game.held.length);
  reserveEl.scrollLeft = scroll;
}

// Whole-pixel cells keep fused pieces seamless. The reserve strip is as tall
// as one piece, within limits, and the canvas takes the space that leaves.
function layout() {
  // a finished picture on show has no pieces to lay out
  if (!game || !game.cols) return;
  const stage = $('#stage');
  // a hidden puzzle has no size to fit; it is laid out again when it shows
  if (!stage.clientWidth || !stage.clientHeight) return;
  const play = $('#play');
  const k = (game.aspect * game.rows) / game.cols; // cell width / cell height
  game.strip = STRIP_MAX;
  for (let pass = 0; pass < 2; pass++) {
    play.style.setProperty('--strip', game.strip + 'px');
    game.cw = Math.floor(Math.min(stage.clientWidth / game.cols, (stage.clientHeight / game.rows) * k));
    game.ch = Math.floor(game.cw / k);
    game.strip = clamp(game.ch, STRIP_MIN, STRIP_MAX);
  }
  play.style.setProperty('--strip', game.strip + 'px');
  play.style.setProperty('--cw', game.cw + 'px');
  play.style.setProperty('--ch', game.ch + 'px');
  board.style.width = game.cw * game.cols + 'px';
  board.style.height = game.ch * game.rows + 'px';
  if (game.group) drawReserve();
}

/* ---------- Moving pieces ---------- */

const membersOf = (groupId) => game.group.flatMap((g, piece) => (g === groupId ? [piece] : []));
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// Where a block sits in the picture: its top-left corner and size, in cells.
function boxOf(pieces) {
  const cs = pieces.map((piece) => piece % game.cols);
  const rs = pieces.map((piece) => Math.floor(piece / game.cols));
  const c = Math.min(...cs);
  const r = Math.min(...rs);
  return { c, r, w: Math.max(...cs) - c + 1, h: Math.max(...rs) - r + 1 };
}

// Put a block of fused pieces on the given canvas cells; it may come from
// elsewhere on the canvas, moved by (dc, dr), or from the reserve. Whatever is
// in the way trades places with it: each block underneath moves whole, by the
// same distance the other way if that is free, otherwise to the nearest free
// cells, and into the reserve if the canvas has no room. Fused pieces never
// come apart. A tray that is put away is never brought out this way: the move
// is refused instead, and nothing changes. Returns whether the block was placed.
function place(pieces, targets, dc = 0, dr = 0) {
  const { cols, rows } = game;
  const cell = game.cell.slice();
  const pos = game.pos.slice();
  const held = game.held.filter((block) => block !== pieces);
  const shifted = (piece, oc, or) => {
    const c = (pos[piece] % cols) + oc;
    const r = Math.floor(pos[piece] / cols) + or;
    return c < 0 || c >= cols || r < 0 || r >= rows ? -1 : r * cols + c;
  };
  const lift = (block) => block.forEach((piece) => pos[piece] >= 0 && (cell[pos[piece]] = -1));
  const drop = (block, spots) => block.forEach((piece, i) => (cell[(pos[piece] = spots[i])] = piece));
  const free = (spots) => spots.every((spot) => spot >= 0 && cell[spot] === -1);

  lift(pieces);
  const inTheWay = [...new Set(targets.map((t) => cell[t]).filter((piece) => piece >= 0).map((piece) => game.group[piece]))]
    .map(membersOf)
    .sort((x, y) => y.length - x.length);
  inTheWay.forEach(lift);
  drop(pieces, targets);

  for (const block of inTheWay) {
    let best = dc || dr ? block.map((piece) => shifted(piece, -dc, -dr)) : null;
    if (!best || !free(best)) {
      best = null;
      let bestDistance = Infinity;
      for (let or = -rows; or <= rows; or++) {
        for (let oc = -cols; oc <= cols; oc++) {
          const distance = Math.hypot(oc * 2, or);
          if (distance >= bestDistance) continue;
          const spots = block.map((piece) => shifted(piece, oc, or));
          if (free(spots)) {
            best = spots;
            bestDistance = distance;
          }
        }
      }
    }
    if (best) {
      drop(block, best);
    } else {
      if (trayHidden()) return false;
      block.forEach((piece) => (pos[piece] = -1));
      held.unshift(block);
    }
  }
  game.cell = cell;
  game.pos = pos;
  game.held = held;
  return true;
}

// Take a block off the canvas and set it aside in the reserve.
function setAside(pieces) {
  pieces.forEach((piece) => {
    game.cell[game.pos[piece]] = -1;
    game.pos[piece] = -1;
  });
  game.held.unshift(pieces);
}

function flash(els, name) {
  els.forEach((el) => el.classList.remove(name));
  void board.offsetWidth;
  els.forEach((el) => el.classList.add(name));
}

// After a move: redraw, then the tune moves on if pieces fused and repeats its
// note if not, and the puzzle ends once everything is one block.
function settle(blocksBefore, id) {
  refresh();
  if (game.groups < blocksBefore) {
    sound.correct(1);
    flash(membersOf(game.group[id]).map((piece) => game.els[piece]), 'fused');
  } else {
    sound.swap();
  }
  if (game.groups === 1 && !game.held.length) win();
  else saveProgress();
}

const trayHidden = () => $('#play').classList.contains('no-tray');
const overReserve = (e) => !trayHidden() && e.clientY >= reserveEl.getBoundingClientRect().top;

board.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('.piece');
  if (!el || !game || game.done || drag || hold) return;
  board.setPointerCapture(e.pointerId);
  const id = +el.dataset.id;
  const pieces = membersOf(game.group[id]);
  drag = { id, pieces, els: pieces.map((piece) => game.els[piece]), x: e.clientX, y: e.clientY, pointer: e.pointerId };
  drag.els.forEach((el) => el.classList.add('dragging'));
  // the reserve is drawn after the canvas, so lift the canvas above it
  $('#stage').classList.add('lifting');
});

board.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.pointer) return;
  const move = `translate(${e.clientX - drag.x}px, ${e.clientY - drag.y}px)`;
  drag.els.forEach((el) => (el.style.transform = move));
  reserveEl.classList.toggle('over', overReserve(e));
});

function endDrag(e) {
  if (!drag || e.pointerId !== drag.pointer) return;
  const d = drag;
  drag = null;
  d.els.forEach((el) => {
    el.classList.remove('dragging');
    el.style.transform = '';
  });
  $('#stage').classList.remove('lifting');
  reserveEl.classList.remove('over');
  if (e.type === 'pointercancel' || !game || game.done) return;

  const blocksBefore = game.groups;
  if (overReserve(e)) {
    setAside(d.pieces);
    settle(blocksBefore, d.id);
    return;
  }
  // snap to the grid, keeping the whole block on the canvas
  const cs = d.pieces.map((piece) => game.pos[piece] % game.cols);
  const rs = d.pieces.map((piece) => Math.floor(game.pos[piece] / game.cols));
  const dc = clamp(Math.round((e.clientX - d.x) / game.cw), -Math.min(...cs), game.cols - 1 - Math.max(...cs));
  const dr = clamp(Math.round((e.clientY - d.y) / game.ch), -Math.min(...rs), game.rows - 1 - Math.max(...rs));
  if (!dc && !dr) return;
  if (!place(d.pieces, d.pieces.map((piece) => game.pos[piece] + dc + dr * game.cols), dc, dr)) return;
  settle(blocksBefore, d.id);
}
board.addEventListener('pointerup', endDrag);
board.addEventListener('pointercancel', endDrag);

// Taking a block back out of the reserve; it follows the finger at full size.
// A finger on a block is ours to read, not the browser's: left to the browser,
// a pull that set off sideways (the canvas is rarely straight above) was taken
// for scrolling the strip and the block never came out. So a full strip is
// scrolled from here, by a sideways pull that stays inside it; any other pull
// brings the block out.
reserveEl.addEventListener('pointerdown', (e) => {
  const item = e.target.closest('.held');
  if (!item || !game || game.done || hold || drag) return;
  reserveEl.setPointerCapture(e.pointerId);
  hold = {
    item, pieces: game.held[+item.dataset.index], x: e.clientX, y: e.clientY, pointer: e.pointerId,
    out: false, scroll: reserveEl.scrollLeft, scrolling: false,
  };
});

reserveEl.addEventListener('pointermove', (e) => {
  if (!hold || e.pointerId !== hold.pointer) return;
  if (!hold.out) {
    const dx = e.clientX - hold.x;
    const dy = e.clientY - hold.y;
    if (!hold.scrolling && Math.hypot(dx, dy) < 8) return;
    const full = reserveEl.scrollWidth > reserveEl.clientWidth;
    if (overReserve(e) && (hold.scrolling || (full && Math.abs(dx) > Math.abs(dy)))) {
      hold.scrolling = true;
      reserveEl.scrollLeft = hold.scroll - dx;
      return;
    }
    hold.out = true;
    hold.box = boxOf(hold.pieces);
    hold.item.classList.add('floating');
    hold.item.style.setProperty('--cw', game.cw + 'px');
    hold.item.style.setProperty('--ch', game.ch + 'px');
    hold.item.style.width = hold.box.w * game.cw + 'px';
    hold.item.style.height = hold.box.h * game.ch + 'px';
    $('#play').append(hold.item);
  }
  hold.item.style.left = e.clientX - (hold.box.w * game.cw) / 2 + 'px';
  hold.item.style.top = e.clientY - (hold.box.h * game.ch) / 2 + 'px';
});

function endHold(e) {
  if (!hold || e.pointerId !== hold.pointer) return;
  const h = hold;
  hold = null;
  if (!h.out || !game) return;
  const rect = board.getBoundingClientRect();
  const onCanvas =
    e.type === 'pointerup' && !game.done &&
    e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
  if (onCanvas) {
    // centre the block under the finger, snapped to the grid and kept on the canvas
    const c0 = clamp(Math.round((e.clientX - rect.left) / game.cw - h.box.w / 2), 0, game.cols - h.box.w);
    const r0 = clamp(Math.round((e.clientY - rect.top) / game.ch - h.box.h / 2), 0, game.rows - h.box.h);
    const blocksBefore = game.groups;
    const targets = h.pieces.map(
      (piece) => (r0 + Math.floor(piece / game.cols) - h.box.r) * game.cols + c0 + (piece % game.cols) - h.box.c
    );
    place(h.pieces, targets);
    settle(blocksBefore, h.pieces[0]);
  } else {
    refresh();
  }
  h.item.remove();
}
reserveEl.addEventListener('pointerup', endHold);
reserveEl.addEventListener('pointercancel', endHold);

/* ---------- Solved ---------- */

function win() {
  game.done = true;
  const p = game.p;
  // whether this picture is the last of its artist, or of its whole collection
  const a = artistOf(p);
  const c = a && collectionOf(a);
  const whole = (list) => list.length > 0 && list.every((q) => solved.has(q.id));
  const before = { artist: a && whole(a.puzzles), collection: c && whole(c.artists.flatMap((b) => b.puzzles)) };
  solved.add(p.id);
  const cheer = {
    artist: a && !before.artist && whole(a.puzzles) ? a : null,
    collection: c && !before.collection && whole(c.artists.flatMap((b) => b.puzzles)) ? c : null,
  };
  // the colour comes back over the finished picture
  if (game.blind) {
    solved.add(p.id + '|expert');
    peekEl.classList.add('reveal', 'show');
  }
  saveSolved();
  clearProgress(p);
  sound.finish();
  // the tools step back, and the picture is ready before its screen comes in
  $('#play').classList.add('won');
  const ready = loadImage(p.image).then((img) => img.decode && img.decode()).catch(() => {});
  if (loadFrame() === 'ornate') loadImage(game.aspect > 1 ? 'frames/gilt-frame-landscape.webp' : 'frames/gilt-frame.webp').catch(() => {});
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  // never held up for long by a picture that is slow to decode
  Promise.all([Promise.race([ready, wait(3000)]), wait(1800)]).then(() => {
    if (game && game.p === p) {
      showPlate(p);
      // once the picture has settled in its frame
      if (cheer.artist || cheer.collection) setTimeout(() => game && game.p === p && !$('#done').hidden && showCheer(cheer), 2400);
    } else $('#play').classList.remove('won');
  });
}

/* ---------- Swiping through the finished pictures ---------- */

// A finished picture leads, by a swipe to the left, to the next one solved, and by
// a swipe to the right, to the one before, in the order the collections show them.
// The picture follows the finger a little, and slides out and the next one in.
let swiped = 0;
let slideIn = 0;
let slideOut = null;
const swipe = { x: 0, y: 0, id: null, moved: false };

function finishedNear(p, step) {
  const order = collections.flatMap((c) => c.artists.flatMap((a) => a.puzzles));
  for (let i = order.indexOf(p) + step; i >= 0 && i < order.length; i += step) {
    if (playable(order[i]) && finished(order[i])) return order[i];
  }
  return null;
}

// Nothing over the picture, and it is not being pinched.
const swipeable = () =>
  game && game.done && !$('#done').hidden && $('#done').classList.contains('arriving') === false &&
  $('#donePause').hidden && $('#doneAbout').hidden && $('#doneCheer').hidden && zoom.el.hidden && faceFingers.size < 2;

function goFinished(step) {
  const plate = $('.plate');
  const q = step && swipeable() && finishedNear(game.p, step);
  if (!q) {
    // at either end, the picture only springs back
    plate.animate([{ transform: plate.style.transform || 'none' }, { transform: 'none' }], { duration: 260, easing: 'ease-out' });
    plate.style.transform = '';
    return;
  }
  const from = plate.style.transform || 'none';
  plate.style.transform = '';
  slideOut = plate.animate([{ transform: from, opacity: 1 }, { transform: `translateX(${-step * 90}px)`, opacity: 0 }], { duration: 200, easing: 'ease-in', fill: 'forwards' });
  slideIn = step;
  visit(q).finally(() => {
    // a picture that could not be shown leaves this one where it was
    if (slideOut) slideOut.cancel();
    slideOut = null;
    slideIn = 0;
  });
}

const doneBody = $('.done-body');
doneBody.addEventListener('pointerdown', (e) => {
  if (swipe.id !== null || !e.isPrimary || e.target.closest('button') || !swipeable()) return;
  Object.assign(swipe, { x: e.clientX, y: e.clientY, id: e.pointerId, moved: false });
});
// followed on the whole page, so a finger that strays off the picture's area still ends the swipe
document.addEventListener('pointermove', (e) => {
  if (e.pointerId !== swipe.id) return;
  // a second finger is a pinch, not a swipe
  if (faceFingers.size > 1) {
    swipe.id = null;
    $('.plate').style.transform = '';
    return;
  }
  const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
  if (!swipe.moved && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy)) swipe.moved = true;
  if (swipe.moved) $('.plate').style.transform = `translateX(${dx * 0.35}px)`;
});
const endSwipe = (e) => {
  if (e.pointerId !== swipe.id) return;
  swipe.id = null;
  if (!swipe.moved) return;
  swiped = Date.now();
  const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
  if (e.type === 'pointerup' && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) goFinished(dx < 0 ? 1 : -1);
  else goFinished(0);
};
document.addEventListener('pointerup', endSwipe);
document.addEventListener('pointercancel', endSwipe);
// the arrow keys do the same, with a keyboard
document.addEventListener('keydown', (e) => {
  if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && swipeable()) goFinished(e.key === 'ArrowRight' ? 1 : -1);
});

// played = the puzzle has just been solved, and its music is to be named
function showPlate(p, played = true) {
  const plate = $('.plate');
  plate.style.setProperty('--aspect', game.aspect);
  plate.style.setProperty('--grow', Math.max(1, game.aspect / 0.8));
  // the frame is as thick as suits the picture's longer side, and lies on its side for a wide one
  plate.style.setProperty('--k', Math.max(1, 1 / game.aspect));
  plate.classList.toggle('wide', game.aspect > 1);
  $('#plateImg').style.backgroundImage = `url("${p.image}")`;
  $('#plateSci').textContent = p.scientific || '';
  $('#plateName').textContent = titleOf(p);
  $('#plateArtist').textContent = p.artist || '';
  nameMusic(played);
  $('#nextBtn').hidden = puzzles.length < 2;
  showAboutBtn(p);
  $('#doneAbout').hidden = true;
  $('#doneCheer').hidden = true;
  closeZoom();
  const done = $('#done');
  $('#donePause').hidden = true;
  // swiped to: it slides in from the side it was swiped from, over the one before
  if (slideIn && !done.hidden) {
    if (slideOut) slideOut.cancel();
    slideOut = null;
    plate.animate([{ transform: `translateX(${slideIn * 90}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 320, easing: 'cubic-bezier(.22, .8, .25, 1)' });
    slideIn = 0;
    return;
  }
  // The solved screen fades in over the puzzle, which is only put away after.
  done.classList.add('arriving');
  done.hidden = false;
  setTimeout(() => {
    done.classList.remove('arriving');
    $('#play').classList.remove('won');
    if (!done.hidden) show('done');
  }, 1000);
}

// Congratulations on finishing an artist, or a whole collection (which names
// the collection, the larger of the two), with gold leaf falling over a dark screen.
// The leaf is drawn frame by frame on one canvas. As dozens of separately
// animated flakes, by CSS or the Web Animations API, it froze halfway down on
// the iPad, which stops updating animated layers when it has too many.
let leafFrame = 0;
function showCheer({ artist: a, collection: c }) {
  const el = $('#doneCheer');
  $('#cheerEyebrow').textContent = c ? 'Collection complete' : 'Chapter complete';
  $('#cheerName').textContent = c ? c.number : a.name;
  el.classList.remove('leaving');
  el.hidden = false;
  cancelAnimationFrame(leafFrame);
  const canvas = el.querySelector('.leaf');
  const ctx = canvas.getContext('2d');
  const W = el.clientWidth, H = el.clientHeight, dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  // cleared whole, in its own pixels, so rounding leaves no edge of old leaf
  const wipe = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  wipe();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const rand = (lo, hi) => lo + Math.random() * (hi - lo);
  const shades = ['#9c7326', '#c79a3c', '#d4a94e', '#e9c873', '#f3d98b'];
  const flakes = Array.from({ length: c ? 70 : 36 }, () => ({
    x: rand(-0.02, 1) * W, w: rand(6, 14), dx: rand(-90, 90), turn: rand(-3, 3) * Math.PI,
    t: rand(4500, 8000), d: rand(0, c ? 3500 : 2500),
  }));
  const start = performance.now();
  const draw = (now) => {
    wipe();
    let left = 0;
    for (const f of flakes) {
      const k = (now - start - f.d) / f.t;
      if (k >= 1) continue;
      left++;
      if (k <= 0) continue;
      // in over the first 8%, out over the last 15%
      const alpha = k < 0.08 ? (k / 0.08) * 0.95 : k > 0.85 ? ((1 - k) / 0.15) * 0.9 : 0.9;
      // the flake tumbles: its height shrinks and grows as it turns over, and it catches the light face on
      const flip = Math.cos(k * 4 * Math.PI);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(f.x + f.dx * k, -20 + (H + 40) * k);
      ctx.rotate(f.turn * k);
      ctx.fillStyle = shades[Math.round((flip + 1) * 2)];
      ctx.fillRect(-f.w / 2, (-f.w * 0.35) * Math.abs(flip), f.w, Math.max(0.6, f.w * 0.7 * Math.abs(flip)));
      ctx.restore();
    }
    if (left && !el.hidden) leafFrame = requestAnimationFrame(draw);
  };
  leafFrame = requestAnimationFrame(draw);
}
function closeCheer() {
  const el = $('#doneCheer');
  if (el.hidden || el.classList.contains('leaving')) return;
  el.classList.add('leaving');
  setTimeout(() => {
    el.hidden = true;
    el.classList.remove('leaving');
    cancelAnimationFrame(leafFrame);
  }, 450);
}

// What is said about a picture on its card: the description from puzzles/blurbs.json
// first, then its story from puzzles/stories.json (the history, scripture, myth or
// literature behind it, what this picture shows, and passages from the text
// itself). A picture with
// neither has lines of verse, or a passage of prose, from puzzles/verses.json,
// after a few sentences on the artwork itself from puzzles/notes.json, written
// for the app (as the artists' bios are), so they need no credit.
const noteOf = (p) => notes[p.image.replace(/^puzzles\//, '')];
const blurbOf = (p) => blurbs[p.image.replace(/^puzzles\//, '')];
// an excerpt may be cut from more than one article, each credited
const articlesOf = (b) => b.articles || [{ article: b.article, url: b.url }];
const storyOf = (p) => stories.puzzles && stories.puzzles[p.image.replace(/^puzzles\//, '')];
const verseOf = (p) => verses.puzzles && verses.puzzles[p.image.replace(/^puzzles\//, '')];
// Kids mode has no descriptions: an article can speak plainly of what the settings hide.
// With one, the ⓘ beside the title and the painting itself both open the card.
function showAboutBtn(p) {
  const on = !kids && !!(storyOf(p) || blurbOf(p) || verseOf(p));
  $('#aboutBtn').hidden = !on;
  $('.plate').classList.toggle('has-about', on);
}

// The middle of the card scrolls; it fades at an edge with more beyond it, and
// the nudge under it shows until the end is in view.
function scrollEdges(s, more) {
  const above = s.scrollTop > 2;
  const below = s.scrollTop + s.clientHeight < s.scrollHeight - 2;
  s.classList.toggle('more-above', above);
  s.classList.toggle('more-below', below);
  more.hidden = !below;
}
function aboutEdges() { scrollEdges($('#aboutScroll'), $('#aboutMore')); }
$('#aboutScroll').addEventListener('scroll', aboutEdges, { passive: true });
$('#aboutMore').addEventListener('click', () => {
  const s = $('#aboutScroll');
  s.scrollBy({ top: s.clientHeight * 0.8, behavior: 'smooth' });
});
addEventListener('resize', () => !$('#doneAbout').hidden && aboutEdges());

// The card: the story, then where its words came from. Wikipedia's text is CC BY-SA,
// which asks for the article and the licence to be named.
function showAbout(p) {
  const story = storyOf(p);
  const b = blurbOf(p);
  const verse = !story && !b && verseOf(p);
  if (!story && !b && !verse) return;
  $('#aboutName').textContent = titleOf(p);
  $('#aboutSci').textContent = p.scientific || '';
  $('#aboutArtist').textContent = p.artist || '';
  const body = $('#aboutBody');
  body.replaceChildren();
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const passages = story ? (story.passages || []).map((id) => stories.passages[id]).filter(Boolean) : [];
  // the painting comes first, under the card's own "About the painting", then
  // the story behind it; an excerpt keeps the breaks between the passages it was cut from
  if (b) for (const para of b.text.split(/\n\n+/)) body.append(el('p', '', para));
  if (story) {
    for (const id of [].concat(story.subject)) {
      const s = stories.subjects[id];
      if (!s) continue;
      body.append(el('h3', '', s.title), el('p', '', s.about));
    }
    if (story.scene) body.append(el('h3', '', 'This picture'), el('p', '', story.scene));
    if (passages.length) body.append(el('h3', '', passages.length > 1 ? 'From the texts' : 'From the text'));
    for (const q of passages) {
      const quote = el('blockquote', 'about-quote' + (/[^\n]\n[^\n]/.test(q.text) ? ' verse' : ''));
      quote.append(el('p', 'q', q.text), el('cite', '', q.cite));
      body.append(quote);
    }
  }
  // the lines, named by their poet and poem (Scripture and the Old English
  // poems by the poem alone)
  if (verse) {
    const note = noteOf(p);
    if (note) body.append(el('p', '', note));
    const quote = el('blockquote', 'about-quote' + (verse.prose ? '' : ' verse'));
    const by = /^(The Bible|Anonymous)$/.test(verse.poet) ? '' : `${verse.poet}, `;
    quote.append(el('p', 'q', verse.text), el('cite', '', by + verse.poem));
    body.append(quote);
  }
  // the sources are named in plain text, with no links out of the app
  const credit = $('#aboutCredit');
  credit.replaceChildren();
  // the passages come from public-domain editions, each named
  const eds = [...new Set(passages.map((q) => q.source))].map((k) => stories.sources[k]).filter(Boolean);
  eds.forEach((s, i) => {
    const by = s.author && s.author !== 'Bible' ? `${s.author}, ` : '';
    credit.append(i ? '; ' : 'Passages from ', by, s.title, s.translator ? `, tr. ${s.translator}` : '');
  });
  if (eds.length) credit.append(', public domain.');
  // the edition the lines come from, at Project Gutenberg
  const ed = verse && verses.sources[verse.source];
  if (ed) {
    const by = ed.translator ? `, tr. ${ed.translator}` : ed.editor ? `, ed. ${ed.editor}` : '';
    credit.append('From ', ed.title, by, ', public domain.');
  }
  if (b) {
    if (eds.length) credit.append(' ');
    if (b.source === 'Wikipedia') credit.append('From ', articlesOf(b).map((a) => `“${a.article}”`).join(' and '), ' on Wikipedia, excerpted');
    else credit.append('Description from the ', b.source);
    // CC0 asks for nothing; a licence that asks for credit is named
    if (b.licence && b.licenceUrl) credit.append(', ', b.licence);
  }
  credit.hidden = !credit.childNodes.length;
  $('#doneAbout').hidden = false;
  // each opening starts at the top
  const s = $('#aboutScroll');
  s.style.scrollBehavior = 'auto';
  s.scrollTop = 0;
  s.style.scrollBehavior = '';
  aboutEdges();
}

/* ---------- A personal note from the app creator ---------- */

// The little scroll in the top-left corner of the home page wiggles until its letter has been opened.
// Tapping it slips the ribbon off and unrolls it, and the letter unrolls between its rollers.
let noteSeen = false;
function noteRead() {
  try { return noteSeen || +localStorage.getItem(NOTE_KEY) >= NOTE; } catch { return noteSeen; }
}
function markNote() { $('#noteBtn').classList.toggle('unread', !noteRead()); }
function noteEdges() { scrollEdges($('#noteScroll'), $('#noteMore')); }
function openNote() {
  $('#note').hidden = false;
  const s = $('#noteScroll');
  s.style.scrollBehavior = 'auto';
  s.scrollTop = 0;
  s.style.scrollBehavior = '';
  noteEdges();
}
function closeNote() {
  $('#note').hidden = true;
  $('#noteBtn').classList.remove('open');
}
$('#noteBtn').addEventListener('click', () => {
  const b = $('#noteBtn');
  noteSeen = true;
  try { localStorage.setItem(NOTE_KEY, String(NOTE)); } catch {}
  b.classList.remove('unread');
  b.classList.add('open');
  // the ribbon slips off and the little scroll unrolls before the letter does
  setTimeout(openNote, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 620);
});
$('#noteScroll').addEventListener('scroll', noteEdges, { passive: true });
// the fades are measured again once the letter has finished unrolling
$('#note .letter').addEventListener('animationend', noteEdges);
$('#noteMore').addEventListener('click', () => {
  const s = $('#noteScroll');
  s.scrollBy({ top: s.clientHeight * 0.8, behavior: 'smooth' });
});
$('#noteClose').addEventListener('click', closeNote);
$('#note').addEventListener('click', (e) => e.target === e.currentTarget && closeNote());
document.addEventListener('keydown', (e) => e.key === 'Escape' && !$('#note').hidden && closeNote());
addEventListener('resize', () => !$('#note').hidden && noteEdges());
markNote();

/* ---------- Purchases (the App Store in the iOS app, simulated on the web: store.js) ---------- */

// Each collection is bought on its own, at PRICE. Until it is, its card and its
// artists' are toned grey. The first collection is the way in: its card and its
// first artist's are in colour, and that artist's first FREE pictures can be played.
// In the iOS app each collection is the App Store product its `product` in
// collections.json names, and the App Store's own price, in the buyer's currency,
// is shown in place of PRICE.
const PRICE = 4.99;
const FREE = 10;
function loadBought() {
  try {
    return new Set(JSON.parse(localStorage.getItem('puzzle.bought') || '[]'));
  } catch {
    return new Set();
  }
}
function saveBought() {
  try {
    localStorage.setItem('puzzle.bought', JSON.stringify([...bought]));
  } catch {}
}
// All the collections together are one more product, ALL, at a lower price
// than the three bought one by one: ALL_PRICE on the web, the App Store's own in
// the app. Owning it owns every collection.
const ALL = 'com.hacudr.arthistory.all';
const ALL_PRICE = 12.99;
const dollars = (n) => '$' + n.toFixed(2);
const money = (n) => dollars(n * PRICE);
const collectionNamed = (name) => everyCollection.find((k) => k.name === name);
// one collection's price, and the price of several, from the App Store where it has said
const priceOf = (c) => (c && c.product && store.price(c.product)) || money(1);
const amountOf = (names) => (store.native ? store.amount(names.map((n) => (collectionNamed(n) || {}).product)) : names.length * PRICE);
const shown = (n) => (n == null ? null : store.native ? store.format(n) : dollars(n));
const totalOf = (names) => shown(amountOf(names)) || money(names.length);
const bundleAmount = () => (store.native ? store.amount([ALL]) : ALL_PRICE);
// The bundle is bought in place of the chosen collections when they are every
// one not yet owned, more than one, and it costs less than they do together;
// so it is not offered to someone who already owns a collection, unless its
// price is set low enough for that still to be a saving.
function bundleFits(names) {
  const rest = collections.filter((k) => !owns(k));
  if (rest.length < 2 || names.length !== rest.length) return false;
  const all = bundleAmount(), apart = amountOf(names);
  return all != null && apart != null && all < apart;
}

// What the App Store says is owned replaces what was kept, so a purchase made on
// another device, or approved later by a parent, shows here, and a refunded one goes.
function startStore() {
  if (!store.native) return;
  $('#payRestore').hidden = false;
  $('#restoreBought').hidden = false;
  // only the App Store can take a purchase back
  $('#resetBought').hidden = true;
  $('#buyHint').textContent = 'Each collection is a one-time purchase. Bought one before, or on another iPad or iPhone? Restore purchases brings it back.';
  const ids = [...everyCollection.map((c) => c.product).filter(Boolean), ALL];
  store.start(ids, (owned) => {
    bought = new Set(everyCollection.filter((c) => owned.has(ALL) || (c.product && owned.has(c.product))).map((c) => c.name));
    saveBought();
    labelCards();
  });
}
const payNote = (text) => {
  $('#payNote').textContent = text;
  $('#payNote').hidden = !text;
};
const shelfOf = (a) => everyCollection.find((c) => c.everyone.includes(a));
const owns = (c) => !!c && bought.has(c.name);
const freeArtist = () => everyCollection[0] && everyCollection[0].everyone[0];
const lit = (c) => owns(c) || c === everyCollection[0];
const litArtist = (a) => owns(shelfOf(a)) || a === freeArtist();
function playable(p) {
  const a = artistOf(p);
  if (owns(shelfOf(a))) return true;
  const i = a === freeArtist() ? a.puzzles.indexOf(p) : -1;
  return i >= 0 && i < FREE;
}

// The lines under the headings that offer what is not yet bought
function showOffers() {
  $('#galleryOffer').hidden = everyCollection.every(owns);
  const offer = (el, c, a) => {
    el.hidden = !c || owns(c);
    if (el.hidden) return;
    const first = freeArtist();
    el.querySelector('span').textContent = c === everyCollection[0] && (!a || a === first) ? `The first ${FREE} ${first.name} puzzles are free.` : '';
    el.querySelector('button').textContent = `Unlock the collection · ${priceOf(c)}`;
  };
  offer($('#collectionOffer'), collection);
  offer($('#artistOffer'), artist && shelfOf(artist), artist);
}

// The pay screen: each collection is chosen on its own, and the total follows.
// `c` is the one it was opened for, chosen already; with none, all not yet bought are.
// `done`, the collection just finished, when Next Puzzle led here from its last picture.
function openPaywall(c, p = null, done = null) {
  pending = p;
  $('#payEyebrow').textContent = done ? `${done.number} complete` : 'Unlock the collections';
  $('#payLede').textContent = done && c
    ? 'Purchase another collection, or unlock all collections, to continue puzzling.'
    : 'Choose one, two or all three. Each brings its artists into colour and opens all their puzzles.';
  const list = $('#payList');
  list.textContent = '';
  for (const k of collections) {
    const item = document.createElement('button');
    item.className = 'pay-item' + (owns(k) ? ' owned' : '');
    item.disabled = owns(k);
    item.setAttribute('aria-pressed', String(!owns(k) && (k === c || !c)));
    item.dataset.name = k.name;
    item.innerHTML = '<span class="pay-pic"><img alt=""><span class="tone"></span></span><span class="pay-text"><i></i><b></b><small></small></span><span class="pay-price"></span>';
    const img = item.querySelector('img');
    img.src = thumbOf(k.cover);
    if (k.focus && k.cover === k.usual) img.style.objectPosition = k.focus;
    item.querySelector('i').remove();
    item.querySelector('b').textContent = k.number;
    item.querySelector('small').textContent = `${k.artists.length} artists · ${k.count} puzzles`;
    item.querySelector('.pay-price').textContent = owns(k) ? 'Owned' : priceOf(k);
    item.addEventListener('click', () => {
      item.setAttribute('aria-pressed', String(item.getAttribute('aria-pressed') !== 'true'));
      showTotal();
    });
    list.append(item);
  }
  $('#payTitle').textContent = `${priceOf(collections[0])} each`;
  if (store.native) payNote('');
  showTotal();
  $('#payDone').hidden = true;
  $('#payForm').hidden = false;
  $('#paywall').hidden = false;
}
const chosenToBuy = () => [...document.querySelectorAll('#payList .pay-item[aria-pressed="true"]')].map((b) => b.dataset.name);
// while the App Store's sheets are up, the pay screen waits for them
let buying = false;
function showTotal() {
  const names = chosenToBuy();
  const n = names.length;
  const buy = $('#payBuy');
  const bundle = bundleFits(names);
  const total = bundle ? shown(bundleAmount()) : totalOf(names);
  buy.disabled = !n;
  buy.textContent = !n ? 'Choose a collection' : n === 3 ? `Unlock all three · ${total}` : `Unlock ${n === 1 ? 'one collection' : 'two collections'} · ${total}`;
  // the saving the bundle brings, or how to have it
  const rest = collections.filter((k) => !owns(k)).map((k) => k.name);
  const all = bundleAmount(), apart = amountOf(rest);
  const deal = rest.length >= 2 && all != null && apart != null && all < apart;
  const them = rest.length === 3 ? 'all three' : rest.length === 2 ? 'both' : `all ${rest.length}`;
  $('#paySave').hidden = !deal;
  if (deal) $('#paySave').textContent = bundle ? `Together for ${shown(all)}, saving ${shown(apart - all)}.` : `Choose ${them} to have them for ${shown(all)} in place of ${shown(apart)}.`;
}
function closePaywall() {
  if (buying) return;
  $('#paywall').hidden = true;
  pending = null;
}
function thank(names) {
  $('#payForm').hidden = true;
  $('#payDone').hidden = false;
  $('#payThanks').textContent = names.length === 1 ? `${collectionNamed(names[0]).number} is unlocked.` : `${names.length === 3 ? 'All three' : 'Two'} collections are unlocked.`;
  $('#payContinue').textContent = pending && playable(pending) ? 'Play it now' : 'Back to the gallery';
}
// In the iOS app each chosen collection is its own purchase, so the App Store's
// sheet comes up once for each, in turn; saying no to one stops there. When the
// bundle fits, it is the one purchase made in their place.
async function buyChosen(names) {
  if (!store.native) return names;
  const buys = bundleFits(names)
    ? [{ id: ALL, names }]
    : names.map((name) => ({ id: (collectionNamed(name) || {}).product, names: [name] })).filter((b) => b.id);
  const done = [];
  const buy = $('#payBuy');
  buying = true;
  buy.classList.add('busy');
  buy.textContent = 'Opening the App Store…';
  payNote('');
  try {
    for (const b of buys) {
      const result = await store.buy(b.id);
      if (result === 'bought') done.push(...b.names);
      else {
        if (result === 'pending') payNote('Waiting for approval. The collection unlocks as soon as it is approved.');
        break;
      }
    }
  } catch (e) {
    console.warn('store: purchase failed', e);
    payNote('The App Store could not be reached. Please try again.');
  } finally {
    buying = false;
    buy.classList.remove('busy');
  }
  return done;
}
$('#payBuy').addEventListener('click', async () => {
  const names = chosenToBuy();
  if (!names.length || buying) return;
  const done = await buyChosen(names);
  if (!done.length) return showTotal();
  done.forEach((n) => bought.add(n));
  saveBought();
  // the colour comes back into the cards behind
  labelCards();
  thank(done);
});
$('#payClose').addEventListener('click', closePaywall);
// Restore Purchases, which Apple asks for: it says what it found on the button
// itself, then the button goes back to its name.
async function restoreBought(button) {
  if (buying || button.disabled) return;
  const name = button.textContent;
  const had = new Set(bought);
  button.disabled = true;
  button.textContent = 'Restoring…';
  let said;
  try {
    await store.restore();
    const found = [...bought].filter((n) => !had.has(n));
    said = found.length ? 'Restored' : bought.size ? 'Already restored' : 'Nothing to restore';
    if (found.length && !$('#paywall').hidden) thank(found);
  } catch (e) {
    console.warn('store: restore failed', e);
    said = 'Could not reach the App Store';
  }
  button.textContent = said;
  setTimeout(() => {
    button.textContent = name;
    button.disabled = false;
  }, 2500);
}
$('#payRestore').addEventListener('click', (e) => restoreBought(e.currentTarget));
$('#restoreBought').addEventListener('click', (e) => restoreBought(e.currentTarget));
$('#payContinue').addEventListener('click', () => {
  const p = pending;
  closePaywall();
  if (p && playable(p)) visit(p);
});
$('#paywall').addEventListener('click', (e) => e.target === e.currentTarget && closePaywall());
$('#galleryOffer button').addEventListener('click', () => openPaywall(null));
$('#collectionOffer button').addEventListener('click', () => openPaywall(collection));
$('#artistOffer button').addEventListener('click', () => openPaywall(shelfOf(artist)));
$('#settingsUnlock').addEventListener('click', () => openPaywall(null));
$('#resetBought').addEventListener('click', () => {
  bought.clear();
  saveBought();
  labelCards();
  // the letter comes back unread too, for trying it all again
  noteSeen = false;
  try { localStorage.removeItem(NOTE_KEY); } catch {}
  markNote();
});

// The same artist's next unsolved puzzle; once all of theirs are solved, the first
// unsolved one of the artists after them in the same collection, passing over any
// artist already finished (round to the collection's first artist if need be). Only
// once the whole collection is solved does it lead on to the next collection with a
// picture left to solve, in the order the collections show them, the very last back
// to the very first. Once every picture is solved, simply the next picture in order.
function nextPuzzle(p) {
  const a = artistOf(p);
  // a chapter goes on to its next picture, wherever this one stood
  const mine = a.puzzles.find((q) => !solved.has(q.id));
  if (mine) return mine;
  const unsolved = (b) => b.puzzles.find((q) => !solved.has(q.id));
  const home = collections.find((c) => c.artists.includes(a));
  if (home) {
    const j = home.artists.indexOf(a);
    for (let k = 1; k < home.artists.length; k++) {
      const q = unsolved(home.artists[(j + k) % home.artists.length]);
      if (q) return q;
    }
  }
  const order = collections.flatMap((c) => c.artists);
  const i = order.indexOf(a);
  for (let k = 1; k < order.length; k++) {
    const q = unsolved(order[(i + k) % order.length]);
    if (q) return q;
  }
  // all solved: the picture after this one, or the next artist's first
  const after = a.puzzles[a.puzzles.indexOf(p) + 1];
  if (after) return after;
  for (let k = 1; k < order.length; k++) {
    const b = order[(i + k) % order.length];
    if (b.puzzles.length) return b.puzzles[0];
  }
  return a.puzzles[0];
}

/* ---------- Controls ---------- */

$('#pauseBtn').addEventListener('click', () => ($('#pause').hidden = false));
// Settings from a paused puzzle: the puzzle waits behind them, still paused.
$('#pauseSettings').addEventListener('click', () => openSettings('play'));
$('#resumeBtn').addEventListener('click', () => ($('#pause').hidden = true));
$('#restartBtn').addEventListener('click', () => start(game.p, true));
$('#playBack').addEventListener('click', () => openArtist(artistOf(game.p)));

$('#peekBtn').addEventListener('click', () => setGuide(guideEl.classList.contains('off')));
// a tray with pieces in it stays, and shows why
$('#trayBtn').addEventListener('click', () => {
  if (trayOn && game.held.length) return flash([reserveEl], 'nudge');
  setTray(!trayOn);
});
// tapping the reference picture shows it large for a moment
guideEl.addEventListener('click', () => {
  if (game.blind) return;
  clearTimeout(peekTimer);
  if (peekEl.classList.toggle('show')) peekTimer = setTimeout(() => peekEl.classList.remove('show'), 1800);
});

// the solved screen's menu
$('#donePauseBtn').addEventListener('click', () => ($('#donePause').hidden = false));
$('#doneResume').addEventListener('click', () => ($('#donePause').hidden = true));
$('#doneRestart').addEventListener('click', () => start(game.p, true));
// Settings from the solved screen: the finished picture waits behind them
$('#doneSettings').addEventListener('click', () => openSettings('done'));
$('#doneBack').addEventListener('click', () => openArtist(artistOf(game.p)));
$('#aboutBtn').addEventListener('click', () => showAbout(game.p));
$('.plate-face').addEventListener('click', () => {
  if (!$('#aboutBtn').hidden && Date.now() - facePinched > 800 && Date.now() - swiped > 500) {
    sound.tap();
    showAbout(game.p);
  }
});
$('#zoomClose').addEventListener('click', closeZoom);
$('#cheerClose').addEventListener('click', closeCheer);
$('#doneCheer').addEventListener('click', (e) => {
  if (e.target === e.currentTarget || e.target.classList.contains('leaf')) closeCheer();
});
$('#aboutClose').addEventListener('click', () => ($('#doneAbout').hidden = true));
$('#doneAbout').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) e.currentTarget.hidden = true;
});
$('#artistBack').addEventListener('click', () => openCollection(collectionOf(artist)));
$('#collectionBack').addEventListener('click', openGallery);
$('#againBtn').addEventListener('click', () => start(game.p, true));
// Next Puzzle; when it crosses into another collection, it says so first: a card
// naming the collection begun, or, for one not yet bought, the pay screen for it.
$('#nextBtn').addEventListener('click', () => {
  const q = nextPuzzle(game.p);
  const from = shelfOf(artistOf(game.p)), to = shelfOf(artistOf(q));
  if (!from || !to || from === to) return visit(q);
  if (!playable(q)) return openPaywall(to, q, from);
  openOnward(from, to, q);
});
function openOnward(from, to, q) {
  pending = q;
  $('#onwardEyebrow').textContent = `${from.number} complete`;
  $('#onwardTitle').textContent = `On to ${to.number}`;
  const img = $('#onwardPic');
  img.src = thumbOf(to.cover);
  img.style.objectPosition = to.focus && to.cover === to.usual ? to.focus : '';
  $('#onward').hidden = false;
}
function closeOnward() {
  $('#onward').hidden = true;
  pending = null;
}
$('#onwardGo').addEventListener('click', () => {
  const q = pending;
  closeOnward();
  if (q) visit(q);
});
$('#onwardClose').addEventListener('click', closeOnward);
$('#onward').addEventListener('click', (e) => e.target === e.currentTarget && closeOnward());

// Settings from a page of the gallery or a puzzle; `at` names a part of Settings
// to land on. A puzzle waits behind them, and is dealt again at a new difficulty.
function openSettings(from, at) {
  settingsFrom = from;
  levelBefore = level;
  artistBefore = artist;
  collectionBefore = collection;
  showSound();
  show('settings');
  if (at) $(at).closest('section').scrollIntoView({ block: 'center' });
}
document.querySelectorAll('.gear').forEach((b) => b.addEventListener('click', () => openSettings(b.closest('.screen').id)));
$('#settingsBack').addEventListener('click', async () => {
  // A new difficulty reopens the same picture at it, where that one was left
  // off; the old difficulty keeps its own progress.
  if (settingsFrom === 'play') {
    // a picture hidden while it was paused is put away
    if (!visible(game.p)) return openGallery();
    if (level !== levelBefore) {
      await start(game.p);
      $('#pause').hidden = false;
    }
  }
  // a finished picture hidden in the meantime is put away
  if (settingsFrom === 'done' && !visible(game.p)) return openGallery();
  // an artist's page comes back without the pictures hidden in the meantime
  if (settingsFrom === 'artist') {
    if (!artists.includes(artistBefore)) return openGallery();
    if (collections.includes(collectionBefore)) openCollection(collectionBefore);
    return openArtist(artistBefore);
  }
  if (settingsFrom === 'collection') return collections.includes(collectionBefore) ? openCollection(collectionBefore) : openGallery();
  show(settingsFrom);
});
// Sources & Credits, at the foot of Settings: only what a licence asks to be
// credited. The recordings and fonts are written in index.html; the Wikipedia
// articles and the Art Institute's descriptions (puzzles/blurbs.json) are filled
// here each time it is opened, for the pictures in the app, with the word the
// titles mask masked here too. Public-domain and CC0 sources are not listed.
function fillCredits() {
  const mask = (s) => (spelled() ? s : s.replace(/\b(r)ape\b/gi, '$1+++'));
  const link = (text, url) => {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = text;
    return a;
  };
  const item = (...parts) => {
    const li = document.createElement('li');
    li.append(...parts);
    return li;
  };
  const used = puzzles.map(blurbOf).filter(Boolean);
  const from = (source) => used.filter((b) => b.source === source);
  const byUrl = (list) => [...new Map(list.map((b) => [b.url, b])).values()];

  const wiki = byUrl(from('Wikipedia').flatMap(articlesOf)).sort((a, b) => a.article.localeCompare(b.article));
  $('#creditsWiki').replaceChildren(...wiki.map((b) => item(link(mask(b.article), b.url))));

  // the Art Institute names the work, not an article, so each is named by its picture
  const aic = puzzles.filter((p) => (blurbOf(p) || {}).source === 'Art Institute of Chicago');
  $('#creditsAic').replaceChildren(...aic.map((p) => item(link(`${p.artist}, ${titleOf(p)}`, blurbOf(p).url))));
}
$('#openCredits').addEventListener('click', () => {
  fillCredits();
  show('credits');
});
// back to the foot of Settings, where the link was
$('#creditsBack').addEventListener('click', () => {
  show('settings');
  $('#openCredits').scrollIntoView({ block: 'center' });
});
document.querySelectorAll('#levels button').forEach((b) => b.addEventListener('click', () => setLevel(b.dataset.level)));
document.querySelectorAll('#content [data-content]').forEach((b) =>
  b.addEventListener('click', () => setHidden(b.dataset.content, !hide.has(b.dataset.content)))
);
$('#spell').addEventListener('click', () => setSpell(!spell));

// Kids mode goes on at a tap. Coming out of it is for a grown-up: Off has to be
// held down while its line fills.
$('#kids [data-kids="on"]').addEventListener('click', () => kids || setKids(true));
{
  const off = $('#kids [data-kids="off"]');
  let timer = 0;
  const release = () => {
    clearTimeout(timer);
    off.classList.remove('holding');
  };
  off.style.setProperty('--hold', KIDS_HOLD + 'ms');
  off.addEventListener('pointerdown', () => {
    if (!kids) return;
    off.classList.add('holding');
    timer = setTimeout(() => {
      release();
      setKids(false);
    }, KIDS_HOLD);
  });
  for (const type of ['pointerup', 'pointerleave', 'pointercancel']) off.addEventListener(type, release);
  off.addEventListener('contextmenu', (e) => e.preventDefault());
}
document.querySelectorAll('#sounds [data-sound]').forEach((b) =>
  b.addEventListener('click', () => {
    sound.set(b.dataset.sound, !sound.on(b.dataset.sound));
    showSound();
  })
);
$('#music').addEventListener('input', (e) => setMusic(+e.target.value));
document.querySelectorAll('#sounds [data-music]').forEach((b) => b.addEventListener('click', () => setMusic(+b.dataset.music)));
$('#textSize').addEventListener('input', (e) => setTextSize(+e.target.value));
document.querySelectorAll('#textSizes [data-text]').forEach((b) => b.addEventListener('click', () => setTextSize(+b.dataset.text)));
showTextSize();
document.querySelectorAll('#themes button').forEach((b) => b.addEventListener('click', () => setTheme(b.dataset.theme)));
document.querySelectorAll('#frames button').forEach((b) => b.addEventListener('click', () => setFrame(b.dataset.frame)));

// The pieces are fitted to the stage whenever its size changes. On the iPad a
// turn of the screen fires 'resize' before the page has been laid out afresh,
// so the stage's own size is watched instead: it reports only once the new
// size has taken, and so the board can no longer spill over the bar and tray.
window.addEventListener('resize', layout);
if (window.ResizeObserver) new ResizeObserver(layout).observe($('#stage'));
// Every touch, at its start and at its end, wakes the audio or renews it if it
// has died: iOS lets sound begin only at the end of a touch, and may have put it
// to sleep while the app was away.
for (const type of ['pointerdown', 'pointerup', 'touchend', 'click']) document.addEventListener(type, () => sound.unlock(), { capture: true, passive: true });
// Every button answers a tap with a soft sound, but for the music's own, which
// plays a chord as it comes on, and Off for Kids mode, which a tap does not work.
document.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b && !b.matches('[data-music], [data-kids="off"]')) sound.tap();
});
document.addEventListener('gesturestart', (e) => e.preventDefault());

/* ---------- Looking closer ---------- */

// A finished painting can be looked at closely: two fingers spread on the framed
// picture open it alone on a dark ground. There it
// is pinched or double-tapped larger (or wheeled, with a mouse) and dragged about;
// pinched back well below the size that fits, it closes, as the × does.
// s is the scale, x and y where the picture's top left corner lies on the screen.
const zoom = { el: $('#zoom'), img: $('#zoomImg'), s: 1, x: 0, y: 0, fit: 1, ready: false, pts: new Map(), pinch: null, tap: null, lastTap: 0 };
const zoomMax = () => zoom.fit * 6;

function openZoom(fingers) {
  const { el, img } = zoom;
  zoom.ready = false;
  zoom.pts.clear();
  zoom.pinch = null;
  zoom.pinched = false;
  img.classList.remove('glide');
  img.style.transform = 'translate(-9999px, 0)';
  el.hidden = false;
  const hint = $('#zoomHint');
  hint.classList.remove('gone');
  setTimeout(() => hint.classList.add('gone'), 2500);
  const begin = () => {
    zoomFit();
    zoom.ready = true;
    // opened by two fingers on the painting: they go straight on pinching
    if (fingers) {
      fingers.forEach((pt, id) => zoom.pts.set(id, pt));
      if (zoom.pts.size === 2) startPinch();
    }
  };
  if (img.getAttribute('src') !== game.p.image) img.src = game.p.image;
  if (img.complete && img.naturalWidth) begin();
  else img.onload = begin;
}

function closeZoom() {
  zoom.el.hidden = true;
  zoom.pts.clear();
  zoom.pinch = null;
  zoom.pinched = false;
}

// the whole picture, as large as fits the screen, in the middle
function zoomFit(glide) {
  const w = zoom.el.clientWidth, h = zoom.el.clientHeight;
  const nw = zoom.img.naturalWidth, nh = zoom.img.naturalHeight;
  zoom.img.style.width = nw + 'px';
  zoom.img.style.height = nh + 'px';
  zoom.fit = Math.min(w / nw, h / nh);
  zoom.s = zoom.fit;
  zoomClamp();
  zoomDraw(glide);
}

// A picture smaller than the screen stays in its middle; a larger one may not be
// dragged so far that bare ground shows beside it.
function zoomClamp() {
  const w = zoom.el.clientWidth, h = zoom.el.clientHeight;
  const pw = zoom.img.naturalWidth * zoom.s, ph = zoom.img.naturalHeight * zoom.s;
  zoom.x = pw <= w ? (w - pw) / 2 : Math.min(0, Math.max(w - pw, zoom.x));
  zoom.y = ph <= h ? (h - ph) / 2 : Math.min(0, Math.max(h - ph, zoom.y));
}

function zoomDraw(glide) {
  zoom.img.classList.toggle('glide', !!glide);
  zoom.img.style.transform = `translate(${zoom.x}px, ${zoom.y}px) scale(${zoom.s})`;
}

// to scale s, keeping the point of the screen at cx, cy over the same part of the picture
function zoomTo(s, cx, cy, glide) {
  s = Math.min(zoomMax(), Math.max(zoom.fit, s));
  zoom.x = cx - ((cx - zoom.x) * s) / zoom.s;
  zoom.y = cy - ((cy - zoom.y) * s) / zoom.s;
  zoom.s = s;
  zoomClamp();
  zoomDraw(glide);
}

function startPinch() {
  const [a, b] = [...zoom.pts.values()];
  zoom.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, s: zoom.s, x: zoom.x, y: zoom.y };
  zoom.tap = null;
}

// Two fingers on the framed painting open it close up; a pinch also keeps the
// tap from opening the About card.
const faceFingers = new Map();
let facePinched = 0;
$('.plate-face').addEventListener('pointerdown', (e) => {
  if (e.pointerType !== 'touch') return;
  faceFingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (faceFingers.size === 2 && zoom.el.hidden) {
    facePinched = Date.now();
    openZoom(new Map(faceFingers));
  }
});
['pointerup', 'pointercancel'].forEach((t) =>
  document.addEventListener(t, (e) => faceFingers.delete(e.pointerId))
);

zoom.el.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button') || !zoom.ready) return;
  zoom.pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (zoom.pts.size === 2) startPinch();
  else if (zoom.pts.size === 1) zoom.tap = { x: e.clientX, y: e.clientY, t: Date.now() };
});

// Moves are followed on the whole page, since fingers that opened the view on the
// painting still belong to it.
document.addEventListener('pointermove', (e) => {
  const prev = zoom.pts.get(e.pointerId);
  if (!prev || zoom.el.hidden) return;
  const pt = { x: e.clientX, y: e.clientY };
  zoom.pts.set(e.pointerId, pt);
  if (zoom.tap && Math.hypot(pt.x - zoom.tap.x, pt.y - zoom.tap.y) > 10) zoom.tap = null;
  if (zoom.pinch && zoom.pts.size >= 2) {
    const [a, b] = [...zoom.pts.values()];
    const p = zoom.pinch;
    // a little below the fitting size, to show it will close if let go there
    const s = Math.min(zoomMax(), Math.max(zoom.fit * 0.5, (p.s * Math.hypot(a.x - b.x, a.y - b.y)) / p.d));
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    zoom.x = mx - ((p.mx - p.x) * s) / p.s;
    zoom.y = my - ((p.my - p.y) * s) / p.s;
    zoom.s = s;
    if (s >= zoom.fit) zoomClamp();
    zoomDraw();
  } else if (zoom.pts.size === 1) {
    zoom.x += pt.x - prev.x;
    zoom.y += pt.y - prev.y;
    zoomClamp();
    zoomDraw();
  }
});

function zoomLift(e) {
  if (!zoom.pts.delete(e.pointerId) || zoom.el.hidden) return;
  // the fingers of a pinch seldom lift together: it settles when the last one does
  if (zoom.pinch) zoom.pinched = true;
  zoom.pinch = null;
  if (zoom.pts.size) return;
  if (zoom.pinched) {
    zoom.pinched = false;
    if (zoom.s < zoom.fit * 0.8) return closeZoom();
    zoomTo(zoom.s, 0, 0, true);
    return;
  }
  // a double tap goes in close at that point, or back out to the whole picture
  if (zoom.tap && e.type === 'pointerup') {
    const now = Date.now();
    if (now - zoom.lastTap < 320) {
      zoom.lastTap = 0;
      if (zoom.s > zoom.fit * 1.05) zoomFit(true);
      else zoomTo(zoom.fit * 3, e.clientX, e.clientY, true);
    } else zoom.lastTap = now;
  }
  zoom.tap = null;
}
document.addEventListener('pointerup', zoomLift);
document.addEventListener('pointercancel', zoomLift);

zoom.el.addEventListener('wheel', (e) => {
  e.preventDefault();
  if (zoom.ready) zoomTo(zoom.s * Math.exp(-e.deltaY * 0.0025), e.clientX, e.clientY);
}, { passive: false });
window.addEventListener('resize', () => {
  if (!zoom.el.hidden && zoom.ready) zoomFit();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !zoom.el.hidden) closeZoom();
});

/* ---------- Boot ---------- */

async function boot() {
  setGuide(loadGuide());
  showKids();
  showLevel();
  showTheme();
  showFrame();
  try {
    const res = await fetch('puzzles/puzzles.json', { cache: 'no-cache' });
    // ids keep the .jpg the pictures first had, so saved progress survives the move to WebP
    puzzles = (await res.json()).map((p) => ({ ...p, id: p.id || p.image.replace(/\.\w+$/, '.jpg'), image: 'puzzles/' + p.image, artist: p.artist || 'Other pictures' }));
  } catch (err) {
    console.error('Could not read puzzles/puzzles.json', err);
  }
  // artists.json sets the order of the artists and what each card says; an
  // artist missing from it still gets a card, after the others. The list of
  // artists goes by the last word of the name, or by `sort` where that is wrong
  let listed = [];
  try {
    listed = await (await fetch('puzzles/artists.json', { cache: 'no-cache' })).json();
  } catch {}
  // periods.json names the collection each period is in, and sets the order of
  // the artists within it; an artist with no period goes under Other pictures.
  // collections.json sets the order of the collections on the home page and
  // what each card says
  let eras = [];
  try {
    eras = await (await fetch('puzzles/periods.json', { cache: 'no-cache' })).json();
  } catch {}
  let shelves = [];
  try {
    shelves = await (await fetch('puzzles/collections.json', { cache: 'no-cache' })).json();
  } catch {}
  everyone = [...new Set([...listed.map((a) => a.name), ...puzzles.map((p) => p.artist)])]
    .map((name) => {
      const all = puzzles.filter((p) => p.artist === name);
      const about = listed.find((a) => a.name === name) || {};
      return { name, note: about.note, bio: about.bio, sort: about.sort || name.split(' ').pop(), period: about.period || 'Other artists', usual: about.cover ? 'puzzles/' + about.cover : all[0] && all[0].image, focus: about.cover && about.focus, all };
    })
    .filter((a) => a.all.length);
  const era = (name) => eras.find((t) => t.name === name) || {};
  const shelf = (name) => era(name).collection || 'Other pictures';
  // a collection's artists go in the order of their periods, then of artists.json,
  // or by surname (`sort`) when it says "order": "surname", except that the one it
  // names as its `start` comes first
  const rank = (a) => {
    const i = eras.findIndex((t) => t.name === a.period);
    return i < 0 ? eras.length : i;
  };
  const names = [...new Set([...shelves.map((c) => c.name), ...everyone.map((a) => shelf(a.period))])];
  everyCollection = names.map((name, i) => {
    const about = shelves.find((c) => c.name === name) || {};
    const bySurname = (a, b) => a.sort.localeCompare(b.sort) || a.name.localeCompare(b.name);
    const mine = everyone.filter((a) => shelf(a.period) === name).sort(about.order === 'surname' ? bySurname : (a, b) => rank(a) - rank(b));
    const start = mine.find((a) => a.name === about.start);
    // each is numbered in its order, as Collection 1
    return { name, number: `Collection ${i + 1}`, product: about.product, usual: about.cover && 'puzzles/' + about.cover, focus: about.cover && about.focus, everyone: start ? [start, ...mine.filter((a) => a !== start)] : mine };
  });
  // what the About card says of each picture; a picture missing from it has no card.
  // It is large and not wanted until a puzzle is solved, so nothing waits for it.
  // The stories behind the pictures come the same way; whichever arrives while a
  // solved picture is showing turns its ⓘ on.
  const lateAbout = () => game && !$('#done').hidden && showAboutBtn(game.p);
  fetch('puzzles/blurbs.json', { cache: 'no-cache' })
    .then((res) => res.json())
    .then((all) => { blurbs = all; lateAbout(); })
    .catch(() => {});
  fetch('puzzles/stories.json', { cache: 'no-cache' })
    .then((res) => res.json())
    .then((all) => { stories = all; lateAbout(); })
    .catch(() => {});
  fetch('puzzles/verses.json', { cache: 'no-cache' })
    .then((res) => res.json())
    .then((all) => { verses = all; lateAbout(); })
    .catch(() => {});
  fetch('puzzles/notes.json', { cache: 'no-cache' })
    .then((res) => res.json())
    .then((all) => { notes = all; })
    .catch(() => {});
  sift();
  showSplash();
  startStore();
  // the iOS app carries its files with it and is updated through the App Store
  if (!store.native && 'serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

boot();
