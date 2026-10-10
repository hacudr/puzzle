const $ = (s) => document.querySelector(s);

const SOLVED_KEY = 'puzzle.solved';
// piece shapes in grid cells: [width, height, weight]
const SIZES = [[1, 1, 3], [2, 1, 4], [1, 2, 2], [2, 2, 3], [1, 3, 1], [2, 3, 1]];
const DRAG_THRESHOLD = 8;

const board = $('#board');
const piecesEl = $('#pieces');
const peekEl = $('#peek');

let puzzles = [];
let solved = loadSolved();
let game = null;
let drag = null;
let peekTimer = 0;

function loadSolved() {
  try {
    return new Set(JSON.parse(localStorage.getItem(SOLVED_KEY) || '[]'));
  } catch {
    return new Set();
  }
}

function saveSolved() {
  try {
    localStorage.setItem(SOLVED_KEY, JSON.stringify([...solved]));
  } catch {}
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

const shape = (s) => s.w + 'x' + s.h;

/* ---------- Collection ---------- */

function renderGallery() {
  const grid = $('#grid');
  grid.textContent = '';
  $('#empty').hidden = puzzles.length > 0;
  for (const p of puzzles) {
    const card = document.createElement('button');
    card.className = 'card' + (solved.has(p.id) ? ' solved' : '');
    card.innerHTML = '<span class="card-img"></span><span class="card-label"><i></i><b></b><small></small></span>';
    card.querySelector('.card-img').style.backgroundImage = `url("${p.image}")`;
    card.querySelector('i').textContent = p.scientific || '';
    card.querySelector('b').textContent = p.name;
    card.querySelector('small').textContent = solved.has(p.id) ? 'Solved' : '';
    card.addEventListener('click', () => start(p));
    grid.append(card);
  }
}

function openGallery() {
  game = null;
  renderGallery();
  show('gallery');
}

/* ---------- Puzzle setup ---------- */

// Cover a cols x rows grid with random rectangles. Pieces can only trade places
// with pieces of the same shape, so retry until no shape is one of a kind.
function tile(cols, rows) {
  let slots;
  for (let attempt = 0; attempt < 300; attempt++) {
    const used = new Array(cols * rows).fill(false);
    slots = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (used[r * cols + c]) continue;
        const fits = SIZES.filter(([w, h]) => {
          if (c + w > cols || r + h > rows) return false;
          for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) if (used[y * cols + x]) return false;
          return true;
        });
        let n = Math.random() * fits.reduce((sum, f) => sum + f[2], 0);
        const [w, h] = fits.find((f) => (n -= f[2]) < 0) || fits[0];
        for (let y = r; y < r + h; y++) for (let x = c; x < c + w; x++) used[y * cols + x] = true;
        slots.push({ c, r, w, h });
      }
    }
    const counts = {};
    for (const s of slots) counts[shape(s)] = (counts[shape(s)] || 0) + 1;
    if (Object.values(counts).every((n) => n > 1)) break;
  }
  return slots;
}

// at[slot] = piece sitting there. Rotating each shape group by one guarantees
// every piece starts out of place.
function scramble(slots) {
  const at = slots.map((_, i) => i);
  const groups = {};
  slots.forEach((s, i) => (groups[shape(s)] ||= []).push(i));
  for (const group of Object.values(groups)) {
    if (group.length < 2) continue;
    const order = shuffled(group);
    order.forEach((slot, k) => (at[slot] = order[(k + 1) % order.length]));
  }
  return at;
}

async function start(p) {
  let img;
  try {
    img = await loadImage(p.image);
  } catch (err) {
    alert(err.message);
    return;
  }
  // cells are twice as wide as they are tall; aim for about 40 of them
  const aspect = img.naturalWidth / img.naturalHeight;
  const cols = p.cols || Math.max(3, Math.round(Math.sqrt(20 * aspect)));
  const rows = p.rows || Math.max(2, Math.round((cols * 2) / aspect));
  const slots = tile(cols, rows);
  const at = scramble(slots);
  const where = [];
  at.forEach((piece, slot) => (where[piece] = slot));
  game = { p, cols, rows, slots, at, where, els: [], selected: null, done: false, aspect };

  piecesEl.textContent = '';
  peekEl.classList.remove('show');
  peekEl.style.backgroundImage = `url("${p.image}")`;
  board.style.setProperty('--cols', cols);
  board.style.setProperty('--rows', rows);
  slots.forEach((src, id) => {
    const el = document.createElement('div');
    el.className = 'piece';
    el.dataset.id = id;
    el.style.backgroundImage = `url("${p.image}")`;
    el.style.setProperty('--w', src.w);
    el.style.setProperty('--h', src.h);
    el.style.setProperty('--sc', src.c);
    el.style.setProperty('--sr', src.r);
    game.els[id] = el;
    place(id);
    piecesEl.append(el);
  });

  $('#pause').hidden = true;
  show('play');
  layout();
}

function place(id) {
  const slot = game.slots[game.where[id]];
  const el = game.els[id];
  el.style.setProperty('--c', slot.c);
  el.style.setProperty('--r', slot.r);
  el.classList.toggle('home', game.where[id] === id);
}

// Whole-pixel cells keep neighbouring pieces seamless.
function layout() {
  if (!game) return;
  const stage = $('#stage');
  const width = Math.min(stage.clientWidth, stage.clientHeight * game.aspect);
  const cw = Math.floor(width / game.cols);
  const ch = Math.floor((cw * game.cols) / game.aspect / game.rows);
  board.style.setProperty('--cw', cw + 'px');
  board.style.setProperty('--ch', ch + 'px');
  board.style.width = cw * game.cols + 'px';
  board.style.height = ch * game.rows + 'px';
}

/* ---------- Moving pieces ---------- */

function slotAt(x, y) {
  const rect = board.getBoundingClientRect();
  const c = Math.floor(((x - rect.left) / rect.width) * game.cols);
  const r = Math.floor(((y - rect.top) / rect.height) * game.rows);
  return game.slots.findIndex((s) => c >= s.c && c < s.c + s.w && r >= s.r && r < s.r + s.h);
}

function select(id) {
  if (game.selected !== null) game.els[game.selected].classList.remove('selected');
  game.selected = id;
  if (id !== null) game.els[id].classList.add('selected');
}

function nope(id) {
  const el = game.els[id];
  el.classList.remove('nope');
  void el.offsetWidth;
  el.classList.add('nope');
}

function trySwap(id, target) {
  const from = game.where[id];
  if (target < 0 || target === from) return false;
  const other = game.at[target];
  if (other === target || shape(game.slots[other]) !== shape(game.slots[id])) return false;
  game.at[from] = other;
  game.at[target] = id;
  game.where[id] = target;
  game.where[other] = from;
  for (const piece of [id, other]) {
    const el = game.els[piece];
    el.classList.add('moving');
    setTimeout(() => el.classList.remove('moving'), 300);
    place(piece);
  }
  select(null);
  if (game.at.every((piece, slot) => piece === slot)) win();
  return true;
}

function tap(id) {
  if (game.selected === null) select(id);
  else if (game.selected === id) select(null);
  else if (!trySwap(game.selected, game.where[id])) select(id);
}

board.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('.piece');
  if (!el || !game || game.done || drag || el.classList.contains('home')) return;
  board.setPointerCapture(e.pointerId);
  drag = { el, id: +el.dataset.id, x: e.clientX, y: e.clientY, pointer: e.pointerId, moved: false };
});

board.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.pointer) return;
  const dx = e.clientX - drag.x;
  const dy = e.clientY - drag.y;
  if (!drag.moved) {
    if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    drag.moved = true;
    select(null);
    drag.el.classList.add('dragging');
  }
  drag.el.style.transform = `translate(${dx}px, ${dy}px) scale(1.04)`;
});

function endDrag(e) {
  if (!drag || e.pointerId !== drag.pointer) return;
  const d = drag;
  drag = null;
  d.el.classList.remove('dragging');
  d.el.style.transform = '';
  if (e.type === 'pointercancel' || !game || game.done) return;
  if (!d.moved) tap(d.id);
  else if (!trySwap(d.id, slotAt(e.clientX, e.clientY))) nope(d.id);
}
board.addEventListener('pointerup', endDrag);
board.addEventListener('pointercancel', endDrag);

/* ---------- Solved ---------- */

function win() {
  game.done = true;
  const p = game.p;
  solved.add(p.id);
  saveSolved();
  setTimeout(() => {
    if (game && game.p === p) showPlate(p);
  }, 1300);
}

function showPlate(p) {
  const plate = $('.plate');
  plate.style.setProperty('--aspect', game.aspect);
  plate.style.setProperty('--grow', Math.max(1, game.aspect / 0.8));
  $('#plateImg').style.backgroundImage = `url("${p.image}")`;
  $('#plateSci').textContent = p.scientific || '';
  $('#plateName').textContent = p.name;
  $('#plateText').textContent = p.description || '';
  $('#descBtn').hidden = !p.description;
  $('#nextBtn').hidden = puzzles.length < 2;
  toggleDescription(false);
  show('done');
}

function toggleDescription(on) {
  $('#plateText').hidden = !on;
  $('#plateImg').hidden = on;
  $('#descBtn').textContent = on ? 'Picture' : 'Description';
}

// The next unsolved puzzle after this one, or simply the next one if all are solved.
function nextPuzzle(p) {
  const i = puzzles.indexOf(p);
  const rest = [...puzzles.slice(i + 1), ...puzzles.slice(0, i)];
  return rest.find((q) => !solved.has(q.id)) || rest[0];
}

/* ---------- Controls ---------- */

$('#pauseBtn').addEventListener('click', () => ($('#pause').hidden = false));
$('#resumeBtn').addEventListener('click', () => ($('#pause').hidden = true));
$('#restartBtn').addEventListener('click', () => start(game.p));
$('#quitBtn').addEventListener('click', openGallery);

$('#peekBtn').addEventListener('click', () => {
  clearTimeout(peekTimer);
  if (peekEl.classList.toggle('show')) peekTimer = setTimeout(() => peekEl.classList.remove('show'), 1800);
});

$('#backBtn').addEventListener('click', openGallery);
$('#descBtn').addEventListener('click', () => toggleDescription($('#plateText').hidden));
$('#againBtn').addEventListener('click', () => start(game.p));
$('#nextBtn').addEventListener('click', () => start(nextPuzzle(game.p)));

window.addEventListener('resize', layout);
document.addEventListener('gesturestart', (e) => e.preventDefault());

/* ---------- Boot ---------- */

async function boot() {
  try {
    const res = await fetch('puzzles/puzzles.json', { cache: 'no-cache' });
    puzzles = (await res.json()).map((p) => ({ ...p, id: p.id || p.image, image: 'puzzles/' + p.image }));
  } catch (err) {
    console.error('Could not read puzzles/puzzles.json', err);
  }
  renderGallery();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

boot();
