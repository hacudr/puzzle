const $ = (s) => document.querySelector(s);

const SOLVED_KEY = 'puzzle.solved';
const LEVEL_KEY = 'puzzle.level';
// approximate number of pieces at each difficulty
const LEVELS = { kids: 10, easy: 40, medium: 100, hard: 200 };
// levels that must never go over their number
const CAPPED = { kids: 10 };

const board = $('#board');
const piecesEl = $('#pieces');
const peekEl = $('#peek');

let puzzles = [];
let solved = loadSolved();
let level = loadLevel();
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

function loadLevel() {
  try {
    const saved = localStorage.getItem(LEVEL_KEY);
    return saved in LEVELS ? saved : 'easy';
  } catch {
    return 'easy';
  }
}

function setLevel(next) {
  level = next;
  try {
    localStorage.setItem(LEVEL_KEY, level);
  } catch {}
  document.querySelectorAll('#levels button').forEach((b) => b.setAttribute('aria-pressed', b.dataset.level === level));
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

// The table is bigger than the picture, so there is always room to move pieces
// and fused groups around: at least two spare columns and rows, and at least
// 40% more cells than pieces. It grows to use whatever space the screen has.
function tableFor(cols, rows, aspect) {
  const stage = $('#stage');
  const k = (aspect * rows) / cols; // cell width / cell height
  let ch = Math.min(stage.clientWidth / (cols + 2) / k, stage.clientHeight / (rows + 2));
  for (;;) {
    const tcols = Math.floor(stage.clientWidth / (ch * k));
    const trows = Math.floor(stage.clientHeight / ch);
    if (tcols * trows >= cols * rows * 1.4) return { tcols, trows };
    ch *= 0.97;
  }
}

const DIRS = [[-1, 0], [1, 0], [0, -1], [0, 1]];

// Pieces are numbered by their place in the picture (row by row). g.pos[piece]
// is the table cell it sits on and g.cell[i] the piece on that cell, or -1.
// Is this piece sitting against its true neighbour in direction (dc, dr)?
function joined(g, piece, dc, dr) {
  const homeCol = (piece % g.cols) + dc;
  const want = piece + dc + dr * g.cols;
  if (homeCol < 0 || homeCol >= g.cols || want < 0 || want >= g.pos.length) return false;
  const c = (g.pos[piece] % g.tcols) + dc;
  const r = Math.floor(g.pos[piece] / g.tcols) + dr;
  if (c < 0 || c >= g.tcols || r < 0 || r >= g.trows) return false;
  return g.cell[r * g.tcols + c] === want;
}

// group[piece] = an id shared by every piece fused to it
function findGroups(g) {
  const group = new Array(g.pos.length).fill(-1);
  let count = 0;
  for (let first = 0; first < group.length; first++) {
    if (group[first] >= 0) continue;
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

// Deal the pieces onto random table cells, retrying so none start out joined.
function scatter(g, count) {
  const cells = Array.from({ length: g.tcols * g.trows }, (_, i) => i);
  for (let attempt = 0; attempt < 300; attempt++) {
    g.pos = shuffled(cells).slice(0, count);
    g.cell = new Array(cells.length).fill(-1);
    g.pos.forEach((spot, piece) => (g.cell[spot] = piece));
    if (findGroups(g).count === count) break;
  }
}

async function start(p) {
  let img;
  try {
    img = await loadImage(p.image);
  } catch (err) {
    alert(err.message);
    return;
  }
  $('#pause').hidden = true;
  show('play');

  const aspect = img.naturalWidth / img.naturalHeight;
  const { cols, rows } = gridFor(aspect, LEVELS[level], CAPPED[level]);
  game = { p, cols, rows, aspect, ...tableFor(cols, rows, aspect), els: [], done: false };
  scatter(game, cols * rows);

  sound.setTune(p.music, puzzles.indexOf(p));
  piecesEl.textContent = '';
  peekEl.classList.remove('show');
  peekEl.style.backgroundImage = `url("${p.image}")`;
  board.style.setProperty('--cols', cols);
  board.style.setProperty('--rows', rows);
  for (let id = 0; id < cols * rows; id++) {
    const el = document.createElement('div');
    el.className = 'piece';
    el.dataset.id = id;
    el.style.backgroundImage = `url("${p.image}")`;
    el.style.setProperty('--sc', id % cols);
    el.style.setProperty('--sr', Math.floor(id / cols));
    game.els[id] = el;
    piecesEl.append(el);
  }
  refresh();
  layout();
}

// Work out which pieces are fused, then put every piece where the state says
// it is and hide the seams between fused neighbours.
function refresh() {
  const { group, count } = findGroups(game);
  game.group = group;
  game.groups = count;
  game.els.forEach((el, piece) => {
    el.style.setProperty('--c', game.pos[piece] % game.tcols);
    el.style.setProperty('--r', Math.floor(game.pos[piece] / game.tcols));
    el.classList.toggle('jl', joined(game, piece, -1, 0));
    el.classList.toggle('jr', joined(game, piece, 1, 0));
    el.classList.toggle('jt', joined(game, piece, 0, -1));
    el.classList.toggle('jb', joined(game, piece, 0, 1));
  });
}

// Whole-pixel cells keep fused pieces seamless.
function layout() {
  if (!game) return;
  const stage = $('#stage');
  const k = (game.aspect * game.rows) / game.cols;
  game.cw = Math.floor(Math.min(stage.clientWidth / game.tcols, (stage.clientHeight / game.trows) * k));
  game.ch = Math.floor(game.cw / k);
  board.style.setProperty('--cw', game.cw + 'px');
  board.style.setProperty('--ch', game.ch + 'px');
  board.style.width = game.cw * game.tcols + 'px';
  board.style.height = game.ch * game.trows + 'px';
}

/* ---------- Moving pieces ---------- */

const membersOf = (groupId) => game.group.flatMap((g, piece) => (g === groupId ? [piece] : []));

// Move a piece and everything fused to it by (dc, dr) cells. Anything in the
// way steps aside as a whole group to the nearest free space, so fused pieces
// never come apart. Returns false, changing nothing, if there is no room.
function moveGroup(id, dc, dr) {
  const { tcols, trows } = game;
  const cell = game.cell.slice();
  const pos = game.pos.slice();
  const shifted = (piece, oc, or) => {
    const c = (pos[piece] % tcols) + oc;
    const r = Math.floor(pos[piece] / tcols) + or;
    return c < 0 || c >= tcols || r < 0 || r >= trows ? -1 : r * tcols + c;
  };
  const lift = (pieces) => pieces.forEach((piece) => (cell[pos[piece]] = -1));
  const drop = (pieces, spots) => pieces.forEach((piece, i) => (cell[(pos[piece] = spots[i])] = piece));

  const moving = membersOf(game.group[id]);
  lift(moving);
  const targets = moving.map((piece) => shifted(piece, dc, dr));
  if (targets.includes(-1)) return false;
  const inTheWay = [...new Set(targets.map((t) => cell[t]).filter((piece) => piece >= 0).map((piece) => game.group[piece]))]
    .map(membersOf)
    .sort((x, y) => y.length - x.length);
  inTheWay.forEach(lift);
  drop(moving, targets);

  for (const pieces of inTheWay) {
    let best = null;
    let bestDistance = Infinity;
    for (let or = -trows; or <= trows; or++) {
      for (let oc = -tcols; oc <= tcols; oc++) {
        const distance = Math.hypot(oc * 2, or);
        if (distance >= bestDistance) continue;
        const spots = pieces.map((piece) => shifted(piece, oc, or));
        if (spots.every((spot) => spot >= 0 && cell[spot] === -1)) {
          best = spots;
          bestDistance = distance;
        }
      }
    }
    if (!best) return false;
    drop(pieces, best);
  }
  game.cell = cell;
  game.pos = pos;
  return true;
}

function flash(els, name) {
  els.forEach((el) => el.classList.remove(name));
  void board.offsetWidth;
  els.forEach((el) => el.classList.add(name));
}

board.addEventListener('pointerdown', (e) => {
  const el = e.target.closest('.piece');
  if (!el || !game || game.done || drag) return;
  board.setPointerCapture(e.pointerId);
  const id = +el.dataset.id;
  const pieces = membersOf(game.group[id]);
  drag = { id, pieces, els: pieces.map((piece) => game.els[piece]), x: e.clientX, y: e.clientY, pointer: e.pointerId };
  drag.els.forEach((el) => el.classList.add('dragging'));
});

board.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.pointer) return;
  const move = `translate(${e.clientX - drag.x}px, ${e.clientY - drag.y}px)`;
  drag.els.forEach((el) => (el.style.transform = move));
});

function endDrag(e) {
  if (!drag || e.pointerId !== drag.pointer) return;
  const d = drag;
  drag = null;
  d.els.forEach((el) => {
    el.classList.remove('dragging');
    el.style.transform = '';
  });
  if (e.type === 'pointercancel' || !game || game.done) return;

  // snap to the grid, keeping the whole group on the table
  const cs = d.pieces.map((piece) => game.pos[piece] % game.tcols);
  const rs = d.pieces.map((piece) => Math.floor(game.pos[piece] / game.tcols));
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const dc = clamp(Math.round((e.clientX - d.x) / game.cw), -Math.min(...cs), game.tcols - 1 - Math.max(...cs));
  const dr = clamp(Math.round((e.clientY - d.y) / game.ch), -Math.min(...rs), game.trows - 1 - Math.max(...rs));
  if (!dc && !dr) return;

  const groupsBefore = game.groups;
  if (!moveGroup(d.id, dc, dr)) {
    flash(d.els, 'nope');
    return;
  }
  refresh();
  // the tune moves on each time pieces fuse; otherwise it repeats its note
  if (game.groups < groupsBefore) {
    sound.correct(1);
    flash(membersOf(game.group[d.id]).map((piece) => game.els[piece]), 'fused');
  } else {
    sound.swap();
  }
  if (game.groups === 1) win();
}
board.addEventListener('pointerup', endDrag);
board.addEventListener('pointercancel', endDrag);

/* ---------- Solved ---------- */

function win() {
  game.done = true;
  const p = game.p;
  // slide the finished picture to the middle of the table
  const left = Math.floor((game.tcols - game.cols) / 2);
  const top = Math.floor((game.trows - game.rows) / 2);
  game.pos = game.pos.map((_, piece) => (top + Math.floor(piece / game.cols)) * game.tcols + left + (piece % game.cols));
  game.cell.fill(-1);
  game.pos.forEach((spot, piece) => (game.cell[spot] = piece));
  refresh();
  solved.add(p.id);
  saveSolved();
  sound.finish();
  setTimeout(() => {
    if (game && game.p === p) showPlate(p);
  }, 1800);
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

$('#pauseBtn').addEventListener('click', () => {
  $('#soundBtn').textContent = 'Sound: ' + sound.label();
  $('#pause').hidden = false;
});
$('#soundBtn').addEventListener('click', () => {
  sound.nextVoice();
  $('#soundBtn').textContent = 'Sound: ' + sound.label();
});
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

document.querySelectorAll('#levels button').forEach((b) => b.addEventListener('click', () => setLevel(b.dataset.level)));

window.addEventListener('resize', layout);
document.addEventListener('pointerdown', () => sound.unlock(), true);
document.addEventListener('gesturestart', (e) => e.preventDefault());

/* ---------- Boot ---------- */

async function boot() {
  setLevel(level);
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
