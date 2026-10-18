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
const VIEW_KEY = 'puzzle.view';
const FRAME_KEY = 'puzzle.frame';
// the pictures the splash has shown, and whether it has been shown since the app was opened
const SPLASH_KEY = 'puzzle.splash';
const WELCOMED_KEY = 'puzzle.welcomed';
// the colour of the page in each theme, for the bar round the app
const THEMES = { blush: '#f3d9d1', lace: '#f1e6d0', celadon: '#c8d9d0', sage: '#b9c5a3', walnut: '#2b1f18', burgundy: '#3b1827' };
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
// one entry per artist: { name, note, sort, usual, all, cover, puzzles }; `all` and
// `usual` are every picture and the listed cover, `puzzles` and `cover` what
// is left of them once hidden pictures are taken out
let everyone = [];
// the artists with something on show
let artists = [];
// the same artists in the order of their surnames, for the list
let byName = [];
// what the home page shows: 'gallery' for the categories, 'list' for every artist by name
let view = loadView();
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

function loadView() {
  try {
    return localStorage.getItem(VIEW_KEY) === 'list' ? 'list' : 'gallery';
  } catch {
    return 'gallery';
  }
}

function setView(next) {
  view = next;
  try {
    localStorage.setItem(VIEW_KEY, next);
  } catch {}
  showView();
  $('#gallery').scrollTop = 0;
}

function showView() {
  document.querySelectorAll('#views [data-view]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.view === view));
  $('#galleryTitle').textContent = view === 'list' ? 'Choose an artist' : 'Choose a collection';
  $('#collections').hidden = view === 'list';
  $('#names').hidden = view !== 'list';
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
  const note = (kids ? 'Kids mode' : button.firstChild.textContent) + ' · ' + button.querySelector('small').textContent;
  document.querySelectorAll('.level-note').forEach((el) => (el.textContent = note));
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
// a religious picture that is not also a stormy one
const sacred = (p) => p.sacred && !stormy(p);

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
  byName = [...artists].sort((a, b) => a.sort.localeCompare(b.sort));
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

function showSound() {
  document.querySelectorAll('#sounds button').forEach((b) => {
    b.setAttribute('aria-pressed', sound.on(b.dataset.sound));
    b.querySelector('small').textContent = sound.on(b.dataset.sound) ? 'on' : 'off';
  });
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
    card.querySelector('small').textContent = state === 'next' ? `No. ${i + 1} · tap to begin` : `Unlocks after No. ${i}`;
    card.setAttribute('aria-label', state === 'next' ? `Up next, picture ${i + 1}` : `Hidden, picture ${i + 1}, unlocks after picture ${i}`);
  });
  const tally = (list) => (card, i) => {
    const count = list[i].puzzles.length;
    const done = list[i].puzzles.filter((p) => solved.has(p.id)).length;
    card.querySelector('small').textContent = count + (count === 1 ? ' puzzle' : ' puzzles') + (done ? ` · ${done} solved` : '');
  };
  if (collection) document.querySelectorAll('#shelf .card').forEach(tally(collection.artists));
  document.querySelectorAll('#names .card').forEach(tally(byName));
  document.querySelectorAll('#collections .card').forEach((card, i) => {
    const count = collections[i].count;
    card.querySelector('small').textContent = count + (count === 1 ? ' puzzle' : ' puzzles');
  });
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

function show(id) {
  document.querySelectorAll('.screen').forEach((s) => (s.hidden = s.id !== id));
}

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

// A tap anywhere sets its music going and puts it away until the app is next
// opened.
$('#splash').addEventListener('click', () => {
  const el = $('#splash');
  try {
    sessionStorage.setItem(WELCOMED_KEY, 'on');
  } catch {}
  sound.welcome(true);
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
  card.innerHTML = '<span class="card-img"><img alt="" loading="lazy" decoding="async"></span><span class="card-label"><i></i><b></b><small></small></span>';
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

// The home page: one card per collection, always lit, and behind it the list of
// every artist by surname, on cards without pictures.
function renderGallery() {
  const grid = $('#collections');
  grid.textContent = '';
  $('#empty').hidden = puzzles.length > 0;
  $('#allHidden').hidden = !puzzles.length || artists.length > 0;
  $('#surprise').hidden = !artists.length;
  for (const c of collections) {
    // no italic line: its number and name, as large as each other
    const card = makeCard(c.cover, '', c.name);
    card.querySelector('b').prepend(Object.assign(document.createElement('span'), { textContent: c.number + ':' }));
    card.classList.add('solved');
    card.addEventListener('click', () => openCollection(c));
    grid.append(card);
  }
  const list = $('#names');
  list.textContent = '';
  for (const a of byName) {
    const card = document.createElement('button');
    card.className = 'card';
    card.innerHTML = '<span class="card-label"><i></i><b></b><small></small></span>';
    card.querySelector('i').textContent = a.note || '';
    card.querySelector('b').textContent = a.name;
    card.addEventListener('click', () => openArtist(a));
    list.append(card);
  }
  showView();
  labelCards();
}

function openGallery() {
  game = null;
  labelCards();
  show('gallery');
}

// One collection's artists, always lit. Coming back to the same collection keeps the page where it was.
function openCollection(c) {
  game = null;
  if (c !== collection) {
    collection = c;
    $('#collectionNote').textContent = c.number;
    $('#collectionName').textContent = c.name;
    const grid = $('#shelf');
    grid.textContent = '';
    for (const a of c.artists) {
      const card = makeCard(a.cover, a.note, a.name);
      card.classList.add('solved');
      card.addEventListener('click', () => openArtist(a));
      grid.append(card);
    }
    $('#collection').scrollTop = 0;
  }
  labelCards();
  show('collection');
}

// One artist's puzzles. Coming back to the same artist keeps the page where it was.
function openArtist(a) {
  game = null;
  if (a !== artist) {
    artist = a;
    $('#artistNote').textContent = a.note || '';
    $('#artistName').textContent = a.name;
    const grid = $('#grid');
    grid.textContent = '';
    for (const p of a.puzzles) {
      const card = makeCard(p.image, p.scientific, titleOf(p), true);
      hideCard(card, p);
      card.addEventListener('click', () => {
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
  $('#artistBackName').textContent = view === 'list' ? 'Artists' : collectionOf(a).name;
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

// Opens a picture from its card: the finished one if it has been solved, the
// puzzle if not.
async function visit(p) {
  if (!finished(p)) return start(p);
  let img;
  try {
    img = await loadImage(p.image);
  } catch (err) {
    alert(err.message);
    return;
  }
  game = { p, aspect: img.naturalWidth / img.naturalHeight, held: [], done: true };
  $('#doneArtistName').textContent = artistOf(p).name;
  showPlate(p, false);
}

// Opens a puzzle where it was left off; `fresh` deals it again from scratch.
async function start(p, fresh = false) {
  let img;
  try {
    img = await loadImage(p.image);
  } catch (err) {
    alert(err.message);
    return;
  }
  $('#pause').hidden = true;
  $('#quitName').textContent = $('#doneArtistName').textContent = artistOf(p).name;
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

  if (stormy(p)) sound.setTune(p.music, puzzles.filter(stormy).indexOf(p), 'stormy');
  else if (p.sacred) sound.setTune(p.music, puzzles.filter(sacred).indexOf(p), 'sacred');
  else sound.setTune(p.music, puzzles.indexOf(p));
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
  const wide = Math.round(Math.min((GUIDE_HEIGHT * img.naturalWidth) / img.naturalHeight, window.innerWidth * 0.45));
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
  solved.add(p.id);
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
    if (game && game.p === p) showPlate(p);
    else $('#play').classList.remove('won');
  });
}

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
  const credit = played && sound.credit();
  $('#plateMusic').textContent = credit
    ? `Music: ${credit.composer}, ${credit.title}` + (credit.performer ? ` · played by ${credit.performer}` : '')
    : '';
  $('#plateMusic').hidden = !credit;
  $('#nextBtn').hidden = artistOf(p).puzzles.length < 2;
  showAboutBtn(p);
  $('#doneAbout').hidden = true;
  // The solved screen fades in over the puzzle, which is only put away after.
  const done = $('#done');
  $('#donePause').hidden = true;
  done.classList.add('arriving');
  done.hidden = false;
  setTimeout(() => {
    done.classList.remove('arriving');
    $('#play').classList.remove('won');
    if (!done.hidden) show('done');
  }, 1000);
}

// What is said about a picture on its card, from puzzles/blurbs.json.
const blurbOf = (p) => blurbs[p.image.replace(/^puzzles\//, '')];
// Kids mode has no descriptions: an article can speak plainly of what the settings hide.
// With one, the ⓘ beside the title and the painting itself both open the card.
function showAboutBtn(p) {
  const on = !kids && !!blurbOf(p);
  $('#aboutBtn').hidden = !on;
  $('.plate').classList.toggle('has-about', on);
}

// The card: the text, then where it came from. Wikipedia's text is CC BY-SA,
// which asks for the article to be named and linked and the licence named.
function showAbout(p) {
  const b = blurbOf(p);
  if (!b) return;
  $('#aboutName').textContent = titleOf(p);
  $('#aboutSci').textContent = p.scientific || '';
  $('#aboutArtist').textContent = p.artist || '';
  $('#aboutText').textContent = b.text;
  const link = (href, text) => {
    if (!href) return text;
    const a = document.createElement('a');
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener';
    a.textContent = text;
    return a;
  };
  const credit = $('#aboutCredit');
  credit.replaceChildren();
  if (b.source === 'Wikipedia') credit.append('From ', link(b.url, `“${b.article}”`), ' on Wikipedia, excerpted');
  else credit.append('Description from the ', link(b.url, b.source));
  // CC0 asks for nothing; a licence that asks for credit is named and linked
  if (b.licenceUrl) credit.append(', ', link(b.licenceUrl, b.licence));
  $('#doneAbout').hidden = false;
}

// The same artist's next unsolved puzzle, or simply their next one if all are solved.
function nextPuzzle(p) {
  const list = artistOf(p).puzzles;
  const i = list.indexOf(p);
  const rest = [...list.slice(i + 1), ...list.slice(0, i)];
  // a chapter goes on to its next picture, wherever this one stood
  return list.find((q) => !solved.has(q.id)) || rest[0];
}

// Surprise Me: one of the pictures not yet solved, drawn by chance from all the
// settings leave on show, or any one of them once every picture is solved. It
// opens on the pieces, so a solved one is dealt afresh.
function surprise() {
  // never a picture a chapter still keeps hidden behind the next one
  const pool = artists.flatMap((a) => a.puzzles).filter((p) => stateOf(p) !== 'locked');
  const fresh = pool.filter((p) => !(blind() ? mastered(p) : solved.has(p.id)));
  const from = fresh.length ? fresh : pool;
  if (!from.length) return;
  const p = from[Math.floor(Math.random() * from.length)];
  start(p, finished(p));
}

/* ---------- Controls ---------- */

$('#pauseBtn').addEventListener('click', () => ($('#pause').hidden = false));
// Settings from a paused puzzle: the puzzle waits behind them, still paused.
$('#pauseSettings').addEventListener('click', () => {
  settingsFrom = 'play';
  levelBefore = level;
  showSound();
  show('settings');
});
$('#resumeBtn').addEventListener('click', () => ($('#pause').hidden = true));
$('#restartBtn').addEventListener('click', () => start(game.p, true));
$('#quitBtn').addEventListener('click', () => openArtist(artistOf(game.p)));
$('#homeBtn').addEventListener('click', openGallery);

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

// the solved screen's menu: the ways back to the artist and the gallery
$('#donePauseBtn').addEventListener('click', () => ($('#donePause').hidden = false));
$('#doneResume').addEventListener('click', () => ($('#donePause').hidden = true));
$('#doneRestart').addEventListener('click', () => start(game.p, true));
// Settings from the solved screen: the finished picture waits behind them
$('#doneSettings').addEventListener('click', () => {
  settingsFrom = 'done';
  showSound();
  show('settings');
});
$('#doneArtist').addEventListener('click', () => openArtist(artistOf(game.p)));
$('#doneHome').addEventListener('click', openGallery);
$('#doneSurprise').addEventListener('click', surprise);
$('#aboutBtn').addEventListener('click', () => showAbout(game.p));
$('.plate-face').addEventListener('click', () => {
  if (!$('#aboutBtn').hidden) {
    sound.tap();
    showAbout(game.p);
  }
});
$('#aboutClose').addEventListener('click', () => ($('#doneAbout').hidden = true));
$('#doneAbout').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) e.currentTarget.hidden = true;
});
$('#artistBack').addEventListener('click', () => (view === 'list' ? openGallery() : openCollection(collectionOf(artist))));
$('#collectionBack').addEventListener('click', openGallery);
$('#againBtn').addEventListener('click', () => start(game.p, true));
$('#nextBtn').addEventListener('click', () => visit(nextPuzzle(game.p)));

document.querySelectorAll('.gear').forEach((b) =>
  b.addEventListener('click', () => {
    settingsFrom = b.closest('.screen').id;
    artistBefore = artist;
    collectionBefore = collection;
    showSound();
    show('settings');
  })
);
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
document.querySelectorAll('#views [data-view]').forEach((b) => b.addEventListener('click', () => setView(b.dataset.view)));
$('#surprise').addEventListener('click', surprise);
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
document.querySelectorAll('#sounds button').forEach((b) =>
  b.addEventListener('click', () => {
    sound.set(b.dataset.sound, !sound.on(b.dataset.sound));
    showSound();
  })
);
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
  if (b && !b.matches('[data-sound="music"], [data-kids="off"]')) sound.tap();
});
document.addEventListener('gesturestart', (e) => e.preventDefault());

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
      return { name, note: about.note, sort: about.sort || name.split(' ').pop(), period: about.period || 'Other artists', usual: about.cover ? 'puzzles/' + about.cover : all[0] && all[0].image, all };
    })
    .filter((a) => a.all.length);
  const era = (name) => eras.find((t) => t.name === name) || {};
  const shelf = (name) => era(name).collection || 'Other pictures';
  // a collection's artists go in the order of their periods, then of artists.json,
  // except that the one it names as its `start` comes first
  const rank = (a) => {
    const i = eras.findIndex((t) => t.name === a.period);
    return i < 0 ? eras.length : i;
  };
  const names = [...new Set([...shelves.map((c) => c.name), ...everyone.map((a) => shelf(a.period))])];
  everyCollection = names.map((name, i) => {
    const about = shelves.find((c) => c.name === name) || {};
    const mine = everyone.filter((a) => shelf(a.period) === name).sort((a, b) => rank(a) - rank(b));
    const start = mine.find((a) => a.name === about.start);
    // each is numbered in its order, as Collection 1
    return { name, number: `Collection ${i + 1}`, usual: about.cover && 'puzzles/' + about.cover, everyone: start ? [start, ...mine.filter((a) => a !== start)] : mine };
  });
  // what the About card says of each picture; a picture missing from it has no card.
  // It is large and not wanted until a puzzle is solved, so nothing waits for it.
  fetch('puzzles/blurbs.json', { cache: 'no-cache' })
    .then((res) => res.json())
    .then((all) => (blurbs = all))
    .catch(() => {});
  sift();
  showSplash();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

boot();
