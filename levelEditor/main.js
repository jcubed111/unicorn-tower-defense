// n x n level grid, index 0 = top-left, row-major (top row first, left to right).
// Each cell holds one of three values: EMPTY, WHITE, or BLUE.
const N = 16;

const EMPTY = 0;
const WHITE = 1;
const BLUE = 2;

// Ascii: '.' black, '/' white, and one character per path tile (see tileChar).
// A blue cell whose tile can't be worked out -- only ever a half-drawn branch,
// since real paths don't fork and a lone cell falls back to loneShape -- is
// written as '0' so the output never leaves the tile alphabet. '%' (old path)
// and '#' (old white) still read in.
const CHAR_EMPTY = '.';
const CHAR_WHITE = '/';
const CHAR_UNKNOWN_TILE = '0';
const TILE_CHARS = '0123' + '4567' + '89:;';

const VALUE_FOR_CHAR = { [CHAR_WHITE]: WHITE, '#': WHITE, '%': BLUE };
for (const ch of TILE_CHARS) VALUE_FOR_CHAR[ch] = BLUE;

// Direction indices, in clockwise order so a turn is a +/-1 step.
const E = 0, S = 1, W = 2, Nn = 3;
const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // [dc, dr]

const PATH_FILL = '#2f4364';
const STRAIGHT_BASE = '0'.charCodeAt(0); // '0' is red on the west edge
const RED_OUTSIDE_BASE = '4'.charCodeAt(0); // '4' joins the top and right edges
const BLUE_OUTSIDE_BASE = '8'.charCodeAt(0); // '8' joins the left and bottom edges

// The corner of the cell a turn hugs, keyed by a bitmask of the two edges it
// joins, numbered counter-clockwise from the north-east to match the ascii.
const NE = 1 << E | 1 << Nn, NW = 1 << Nn | 1 << W, SW = 1 << W | 1 << S, SE = 1 << S | 1 << E;
const CORNER_CCW = { [NE]: 0, [NW]: 1, [SW]: 2, [SE]: 3 };

const EDGE_RED = '#e0453c';
const EDGE_BLUE = '#4b9cf5';

const gridEl = document.getElementById('grid');
const asciiEl = document.getElementById('ascii');
const asciiByteCountEl = document.getElementById('ascii-byte-count');
const swatchEls = [...document.querySelectorAll('.swatch')];
const reverseEl = document.getElementById('reverse');
const coordsEl = document.getElementById('coords');

// cells[index] -> the <div class="cell"> for that grid position
const cells = new Array(N * N);
const values = new Array(N * N).fill(EMPTY);

// The color the palette is set to; painting lays this down, or erases when the
// drag starts on a cell that already has it.
let selectedValue = WHITE;

// Which way enemies walk each path. pickStart guesses, and a path listed here
// runs the other way. It is held per cell rather than per path so that a path
// keeps its direction as you extend it -- a component counts as reversed if any
// of its cells is in the set, and cells that stop being path are pruned.
const reversedCells = new Set();

function buildGrid() {
  for (let index = 0; index < N * N; index++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = index;
    gridEl.appendChild(cell);
    cells[index] = cell;
  }
}

// ---------------------------------------------------------------------------
// Path shapes
//
// A blue cell is a path tile drawn with a red edge on the left of travel and a
// blue edge on the right. Which tile it is -- straight, or a 90 degree turn --
// and how it is rotated both follow from its blue neighbours, so the ascii only
// ever has to say "this cell is path".
// ---------------------------------------------------------------------------

function rowOf(index) {
  return (index / N) | 0;
}

function colOf(index) {
  return index % N;
}

function onBorder(index) {
  const r = rowOf(index), c = colOf(index);
  return r === 0 || c === 0 || r === N - 1 || c === N - 1;
}

function neighborAt(index, dir) {
  const c = colOf(index) + DIRS[dir][0];
  const r = rowOf(index) + DIRS[dir][1];
  return c < 0 || c >= N || r < 0 || r >= N ? null : r * N + c;
}

function neighborIs(index, dir, value) {
  const n = neighborAt(index, dir);
  return n !== null && values[n] === value;
}

function blueNeighbors(index) {
  const out = [];
  for (let d = 0; d < 4; d++) {
    if (neighborIs(index, d, BLUE)) out.push({ dir: d, index: neighborAt(index, d) });
  }
  return out;
}

function dirBetween(from, to) {
  const dc = colOf(to) - colOf(from);
  const dr = rowOf(to) - rowOf(from);
  return DIRS.findIndex(([c, r]) => c === dc && r === dr);
}

function collectComponent(start) {
  const comp = [];
  const seen = new Set([start]);
  const queue = [start];
  while (queue.length) {
    const index = queue.pop();
    comp.push(index);
    for (const n of blueNeighbors(index)) {
      if (seen.has(n.index)) continue;
      seen.add(n.index);
      queue.push(n.index);
    }
  }
  return comp;
}

// Of the two ends of a path, the one on the grid border is the likelier
// entrance; ties (and border-less paths) fall back to the topmost-leftmost end
// so the choice is at least stable.
function pickStart(ends) {
  const border = ends.filter(onBorder);
  return Math.min(...(border.length ? border : ends));
}

// Walk a component end to end, returning the cells in travel order plus whether
// it closed back on itself. Returns null when there is no single direction of
// travel to infer: a lone cell, or a branch. Real levels never branch, but a
// half-drawn drag makes T and + shapes constantly, and a branch is what would
// otherwise let the walk loop back on itself forever.
function orderComponent(comp) {
  if (comp.length < 2) return null;
  if (comp.some(index => blueNeighbors(index).length > 2)) return null;

  // No branches, so the component is now either a simple path or a simple
  // loop, and the walk below is guaranteed to terminate.
  const ends = comp.filter(index => blueNeighbors(index).length === 1);
  const loop = ends.length === 0;
  const start = loop ? Math.min(...comp) : pickStart(ends);

  const order = [];
  let prev = -1;
  let cur = start;
  while (cur !== undefined) {
    order.push(cur);
    const onward = blueNeighbors(cur).filter(n => n.index !== prev);
    prev = cur;
    cur = onward.length ? onward[0].index : undefined;
    if (cur === start) break; // loop closed
  }
  return { order, loop };
}

function pathComponents() {
  const comps = [];
  const done = new Set();
  for (let i = 0; i < N * N; i++) {
    if (values[i] !== BLUE || done.has(i)) continue;
    const comp = collectComponent(i);
    for (const index of comp) done.add(index);
    comps.push(comp);
  }
  return comps;
}

function isReversed(comp) {
  return comp.some(index => reversedCells.has(index));
}

function reverseComponent(comp) {
  const backwards = isReversed(comp);
  for (const index of comp) {
    if (backwards) reversedCells.delete(index);
    else reversedCells.add(index);
  }
}

// Erased cells would otherwise keep flipping a path drawn over them later.
function pruneReversed() {
  for (const index of reversedCells) {
    if (values[index] !== BLUE) reversedCells.delete(index);
  }
}

// The two ends of a path have only one path neighbour, so nothing says which
// way the tile continues. If a white cell is sitting against one of those ends,
// the path runs into it -- carrying straight on into the white if it can, else
// turning towards it, which makes the end tile a curve. Cells with two path
// neighbours already know both directions, so this never touches them.
function openEnd(index, towardsPath) {
  const straightOn = (towardsPath + 2) % 4;
  if (neighborIs(index, straightOn, WHITE)) return straightOn;
  for (let d = 0; d < 4; d++) {
    if (d !== towardsPath && neighborIs(index, d, WHITE)) return d;
  }
  return null;
}

function assignShapes(shapes, walk, flip) {
  const { loop } = walk;
  const order = flip ? [...walk.order].reverse() : walk.order;
  for (let k = 0; k < order.length; k++) {
    const index = order[k];
    const before = k > 0 ? order[k - 1] : loop ? order[order.length - 1] : null;
    const after = k < order.length - 1 ? order[k + 1] : loop ? order[0] : null;
    let inDir, outDir;
    if (before === null) {
      // Start of the path: it is entered from the white cell it backs onto.
      outDir = dirBetween(index, after);
      const white = openEnd(index, outDir);
      inDir = white === null ? outDir : (white + 2) % 4;
    } else {
      inDir = dirBetween(before, index);
      // End of the path: it carries on into the white cell ahead of it.
      const white = after !== null ? null : openEnd(index, (inDir + 2) % 4);
      outDir = after !== null ? dirBetween(index, after) : white === null ? inDir : white;
    }
    shapes[index] = inDir === outDir
      ? { kind: 'straight', rot: inDir }
      : { kind: 'corner', rot: inDir, right: (outDir - inDir + 4) % 4 === 1 };
  }
}

// A path cell with no neighbours has nothing to take its direction from. Only
// the two sides of a straight are coloured -- its open ends aren't -- so lay it
// along whichever axis keeps red and blue off the white cells, preferring
// vertical when both axes work or neither does.
function loneShape(index, flip) {
  const clear = (a, b) => !neighborIs(index, a, WHITE) && !neighborIs(index, b, WHITE);
  // Heading north colours the west and east edges; heading east colours north and south.
  const rot = clear(E, W) || !clear(Nn, S) ? Nn : E;
  return { kind: 'straight', rot: flip ? (rot + 2) % 4 : rot };
}

function fillShapes(shapes, comp, flip) {
  if (comp.length === 1) {
    shapes[comp[0]] = loneShape(comp[0], flip);
    return;
  }
  const walk = orderComponent(comp);
  if (walk) assignShapes(shapes, walk, flip); // else ambiguous: leave it shapeless
}

function pathShapes() {
  const shapes = new Array(N * N).fill(null);
  for (const comp of pathComponents()) fillShapes(shapes, comp, isReversed(comp));
  return shapes;
}

// Drawn facing east, then rotated: red along the north edge (left of travel),
// blue along the south edge (right of travel). A turn pivots on the cell corner
// it hugs, which puts the outside of the turn on the red side for a right turn
// and on the blue side for a left turn. The bands line up across cell edges, so
// neighbouring tiles join into one continuous red line and one blue line.
function shapeSvg(shape) {
  // A tile whose direction couldn't be worked out still gets the road surface,
  // just without edges.
  if (!shape) return plainSvg(`<rect x="0" y="0" width="24" height="24" fill="${PATH_FILL}"/>`);

  let body;
  if (shape.kind === 'straight') {
    body =
      `<rect x="0" y="0" width="24" height="24" fill="${PATH_FILL}"/>` +
      `<rect x="0" y="0" width="24" height="3" fill="${EDGE_RED}"/>` +
      `<rect x="0" y="21" width="24" height="3" fill="${EDGE_BLUE}"/>`;
  } else if (shape.right) {
    // Exits south, pivoting on the south-west corner.
    body =
      `<path d="M0 0A24 24 0 0 1 24 24L0 24Z" fill="${PATH_FILL}"/>` +
      `<path d="M22.5 24A22.5 22.5 0 0 0 0 1.5" fill="none" stroke="${EDGE_RED}" stroke-width="3"/>` +
      `<path d="M1.5 24A1.5 1.5 0 0 0 0 22.5" fill="none" stroke="${EDGE_BLUE}" stroke-width="3"/>`;
  } else {
    // Exits north, pivoting on the north-west corner.
    body =
      `<path d="M0 24A24 24 0 0 0 24 0L0 0Z" fill="${PATH_FILL}"/>` +
      `<path d="M22.5 0A22.5 22.5 0 0 1 0 22.5" fill="none" stroke="${EDGE_BLUE}" stroke-width="3"/>` +
      `<path d="M1.5 0A1.5 1.5 0 0 1 0 1.5" fill="none" stroke="${EDGE_RED}" stroke-width="3"/>`;
  }
  return plainSvg(`<g transform="rotate(${shape.rot * 90} 12 12)">${body}</g>`);
}

function plainSvg(body) {
  return `<svg viewBox="0 0 24 24" width="24" height="24">${body}</svg>`;
}

// A cell's tile depends on its neighbours, so every edit repaints the whole grid.
function render(shapes) {
  for (let i = 0; i < N * N; i++) {
    const cell = cells[i];
    cell.classList.toggle('white', values[i] === WHITE);
    const svg = values[i] === BLUE ? shapeSvg(shapes[i]) : '';
    if (cell.innerHTML !== svg) cell.innerHTML = svg;
  }
}

function setValues(next) {
  for (let i = 0; i < N * N; i++) values[i] = next[i] || EMPTY;
}

// Click-and-drag painting: the value painted for the whole drag is decided by
// the cell the drag started on -- the selected color, or EMPTY if that cell
// already had it.
let painting = false;
let paintValue = WHITE;

function cellIndexAtPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  const cell = el && el.closest('.cell');
  if (!cell || !gridEl.contains(cell)) return null;
  return Number(cell.dataset.index);
}

gridEl.addEventListener('pointerdown', e => {
  if (e.button !== 0) return; // right button reverses a path instead
  const index = cellIndexAtPoint(e.clientX, e.clientY);
  if (index === null) return;
  e.preventDefault();
  painting = true;
  paintValue = values[index] === selectedValue ? EMPTY : selectedValue;
  values[index] = paintValue;
  refreshFromGrid();
});

window.addEventListener('pointermove', e => {
  if (!painting) return;
  const index = cellIndexAtPoint(e.clientX, e.clientY);
  if (index === null || values[index] === paintValue) return;
  values[index] = paintValue;
  refreshFromGrid();
});

window.addEventListener('pointerup', () => {
  painting = false;
});
window.addEventListener('pointercancel', () => {
  painting = false;
});

// Readout of the cell under the pointer, in the same x/y the grid is indexed by.
function showCoords(index) {
  coordsEl.textContent = index === null ? 'x -, y -' : `x ${colOf(index)}, y ${rowOf(index)}`;
}

gridEl.addEventListener('pointermove', e => {
  showCoords(cellIndexAtPoint(e.clientX, e.clientY));
});

gridEl.addEventListener('pointerleave', () => {
  showCoords(null);
});

for (const swatch of swatchEls) {
  swatch.addEventListener('click', () => {
    selectedValue = Number(swatch.dataset.value);
    for (const other of swatchEls) {
      other.classList.toggle('selected', other === swatch);
    }
  });
}

gridEl.addEventListener('contextmenu', e => {
  e.preventDefault();
  const index = cellIndexAtPoint(e.clientX, e.clientY);
  if (index === null || values[index] !== BLUE) return;
  reverseComponent(collectComponent(index));
  refreshFromGrid();
});

reverseEl.addEventListener('click', () => {
  for (const comp of pathComponents()) reverseComponent(comp);
  refreshFromGrid();
});

// Straights count counter-clockwise from '0' (red on the west edge, so heading
// north); DIRS counts clockwise, hence the flip. A turn is named by the two
// edges it joins, which is the corner it hugs: red ends up on the outside of a
// right turn and blue on the outside of a left one, since red is always on the
// left of travel. Within a family the index counts corners counter-clockwise,
// and both families are numbered by where the blue edge lands: the corner the
// turn hugs when red is outside, the opposite one when blue is.
function tileChar(shape) {
  if (shape.kind === 'straight') {
    return String.fromCharCode(STRAIGHT_BASE + (3 - shape.rot));
  }
  const inEdge = (shape.rot + 2) % 4; // travelling east means entering from the west
  const outEdge = (shape.rot + (shape.right ? 1 : 3)) % 4;
  const corner = CORNER_CCW[1 << inEdge | 1 << outEdge]; // the corner it hugs
  return shape.right
    ? String.fromCharCode(RED_OUTSIDE_BASE + corner)
    : String.fromCharCode(BLUE_OUTSIDE_BASE + (corner + 2) % 4);
}

// Where a row-major cell index lands in the ascii. The ascii is written row by
// row, so this is the identity -- src/terrain.js reads back the same order.
function asciiPos(index) {
  return index;
}

// Written as one unbroken line so it can be pasted straight into source;
// whitespace is ignored when parsing back, so multi-line art still reads in fine.
// Trailing empties are dropped: the game inits every tile to 0, so they only
// ever cost bytes. Parsing back handles the short string fine.
function valuesToAscii(shapes) {
  const out = [];
  for (let i = 0; i < N * N; i++) {
    let ch;
    if (values[i] === WHITE) ch = CHAR_WHITE;
    else if (values[i] !== BLUE) ch = CHAR_EMPTY;
    else ch = shapes[i] ? tileChar(shapes[i]) : CHAR_UNKNOWN_TILE;
    out[asciiPos(i)] = ch;
  }
  return out.join('').replace(/\.+$/, '');
}

function asciiToValues(str) {
  const chars = str.replace(/\s+/g, '');
  const vals = [];
  for (let i = 0; i < N * N; i++) vals.push(VALUE_FOR_CHAR[chars[asciiPos(i)]] || EMPTY);
  return vals;
}

function byteLength(str) {
  return new TextEncoder().encode(str).length;
}

function updateByteCount() {
  const bytes = byteLength(asciiEl.value);
  asciiByteCountEl.textContent = `${bytes} byte${bytes === 1 ? '' : 's'}`;
}

function refreshFromGrid() {
  pruneReversed();
  const shapes = pathShapes();
  render(shapes);
  asciiEl.value = valuesToAscii(shapes);
  updateByteCount();
}

// Each tile character says which side of the path is red, so pasted text also
// says which way every path in it runs: give each one the direction that
// reproduces more of its own characters. A path whose text says nothing either
// way (a tie) keeps the direction it has.
function adoptDirections(text) {
  const chars = text.replace(/\s+/g, '');
  for (const comp of pathComponents()) {
    const score = flip => {
      const shapes = new Array(N * N).fill(null);
      fillShapes(shapes, comp, flip);
      return comp.filter(index => shapes[index] && tileChar(shapes[index]) === chars[index]).length;
    };
    const forward = score(false);
    const backward = score(true);
    if (backward !== forward && (backward > forward) !== isReversed(comp)) {
      reverseComponent(comp);
    }
  }
}

// Typing in the box repaints the grid, but leaves the text (and the caret)
// exactly as typed.
asciiEl.addEventListener('input', () => {
  setValues(asciiToValues(asciiEl.value));
  pruneReversed();
  adoptDirections(asciiEl.value);
  render(pathShapes());
  updateByteCount();
});

buildGrid();
refreshFromGrid();
showCoords(null);
