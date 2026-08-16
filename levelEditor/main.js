// n x n level grid, index 0 = top-left, row-major (top row first, left to right).
const N = 16;
const RUN_BASE = '#'.charCodeAt(0); // '#' = run length 0, '$' = 1, '%' = 2, ... '~' = max
const MAX_RUN = '~'.charCodeAt(0) - RUN_BASE; // longest run a single char can encode

const gridEl = document.getElementById('grid');
const encodedEl = document.getElementById('encoded');
const byteCountEl = document.getElementById('byte-count');
const base64El = document.getElementById('base64');
const base64ByteCountEl = document.getElementById('base64-byte-count');
const asciiEl = document.getElementById('ascii');
const asciiByteCountEl = document.getElementById('ascii-byte-count');

// checkboxes[index] -> the <input type="checkbox"> for that grid cell
const checkboxes = new Array(N * N);

function buildGrid() {
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const index = r * N + c;

      const label = document.createElement('label');
      label.className = 'cell';
      label.dataset.index = index;

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.dataset.index = index;

      label.appendChild(input);
      gridEl.appendChild(label);
      checkboxes[index] = input;
    }
  }
}

function getBits() {
  return checkboxes.map(cb => (cb.checked ? 1 : 0));
}

function setBits(bits) {
  for (let i = 0; i < N * N; i++) {
    const checked = !!bits[i];
    const cb = checkboxes[i];
    cb.checked = checked;
    cb.parentElement.classList.toggle('filled', checked);
  }
}

function setCellValue(index, value) {
  const checked = !!value;
  checkboxes[index].checked = checked;
  checkboxes[index].parentElement.classList.toggle('filled', checked);
}

// Click-and-drag painting: the value painted for the whole drag is the
// opposite of whatever cell the drag started on.
let painting = false;
let paintValue = 1;

function cellIndexAtPoint(x, y) {
  const el = document.elementFromPoint(x, y);
  const label = el && el.closest('.cell');
  if (!label || !gridEl.contains(label)) return null;
  return Number(label.dataset.index);
}

gridEl.addEventListener('pointerdown', e => {
  const index = cellIndexAtPoint(e.clientX, e.clientY);
  if (index === null) return;
  e.preventDefault();
  painting = true;
  paintValue = checkboxes[index].checked ? 0 : 1;
  setCellValue(index, paintValue);
  refreshEncodingsFromGrid();
});

// Each cell is a <label> wrapping its checkbox, so a click would natively
// toggle that checkbox a second time -- after painting already set it --
// desyncing cb.checked from the .filled class and the encoded strings.
// Painting is the only thing allowed to mutate cell state.
gridEl.addEventListener('click', e => {
  e.preventDefault();
});

window.addEventListener('pointermove', e => {
  if (!painting) return;
  const index = cellIndexAtPoint(e.clientX, e.clientY);
  if (index === null) return;
  setCellValue(index, paintValue);
  refreshEncodingsFromGrid();
});

window.addEventListener('pointerup', () => {
  painting = false;
});
window.addEventListener('pointercancel', () => {
  painting = false;
});

// Split bits into alternating runs, always starting with a "filled" run
// (a length-0 run is inserted up front if the grid actually starts empty).
function bitsToRuns(bits) {
  const runs = [];
  let expected = 1;
  let i = 0;
  while (i < bits.length) {
    if (bits[i] === expected) {
      let len = 0;
      while (i < bits.length && bits[i] === expected) {
        len++;
        i++;
      }
      runs.push(len);
    } else {
      runs.push(0);
    }
    expected = 1 - expected;
  }
  return runs;
}

function runLengthToChar(len) {
  return String.fromCharCode(RUN_BASE + len);
}

function charToRunLength(ch) {
  return ch.charCodeAt(0) - RUN_BASE;
}

function encode(bits) {
  const runs = bitsToRuns(bits);
  let out = '';
  for (const runLen of runs) {
    if (runLen === 0) {
      out += runLengthToChar(0);
      continue;
    }
    let remaining = runLen;
    while (remaining > 0) {
      const chunk = Math.min(remaining, MAX_RUN);
      out += runLengthToChar(chunk);
      remaining -= chunk;
      if (remaining > 0) out += runLengthToChar(0); // zero-length run of the other type, keep alternating
    }
  }
  return out;
}

function decode(str) {
  const bits = [];
  let expected = 1;
  for (const ch of str) {
    const len = charToRunLength(ch);
    for (let k = 0; k < len && bits.length < N * N; k++) bits.push(expected);
    expected = 1 - expected;
  }
  while (bits.length < N * N) bits.push(0);
  return bits;
}

function bitsToBase64(bits) {
  const bytes = new Uint8Array(Math.ceil(bits.length / 8));
  for (let i = 0; i < bits.length; i++) {
    if (bits[i]) bytes[i >> 3] |= 1 << (i % 8);
  }
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBits(str) {
  const binary = atob(str);
  const bits = [];
  for (let i = 0; i < N * N; i++) {
    const byte = binary.charCodeAt(i >> 3) || 0;
    bits.push((byte >> (i % 8)) & 1);
  }
  return bits;
}

// '#' = filled, anything else = empty. Written as one unbroken line so it can
// be pasted straight into source; whitespace is ignored when parsing back, so
// multi-line art still reads in fine.
function bitsToAscii(bits) {
  let out = '';
  for (let i = 0; i < N * N; i++) out += bits[i] ? '#' : '.';
  return out;
}

function asciiToBits(str) {
  const chars = str.replace(/\s+/g, '');
  const bits = [];
  for (let i = 0; i < N * N; i++) bits.push(chars[i] === '#' ? 1 : 0);
  return bits;
}

function byteLength(str) {
  return new TextEncoder().encode(str).length;
}

// Each field: the element, how to render bits into it, and how to read bits
// back out (returning null when the text isn't valid yet).
const fields = [
  {
    el: encodedEl,
    countEl: byteCountEl,
    render: bits => JSON.stringify(encode(bits)),
    parse: text => {
      let raw;
      try {
        raw = JSON.parse(text);
      } catch (e) {
        return null;
      }
      return typeof raw === 'string' ? decode(raw) : null;
    },
  },
  {
    el: base64El,
    countEl: base64ByteCountEl,
    render: bits => JSON.stringify(bitsToBase64(bits)),
    parse: text => {
      let raw;
      try {
        raw = JSON.parse(text);
      } catch (e) {
        return null;
      }
      if (typeof raw !== 'string') return null;
      try {
        return base64ToBits(raw);
      } catch (e) {
        return null;
      }
    },
  },
  {
    el: asciiEl,
    countEl: asciiByteCountEl,
    render: bitsToAscii,
    parse: asciiToBits,
  },
];

function updateByteCounts() {
  for (const f of fields) {
    const bytes = byteLength(f.el.value);
    f.countEl.textContent = `${bytes} byte${bytes === 1 ? '' : 's'}`;
  }
}

// Rewrite every field except the one currently being typed into, so the
// caret and in-progress text there are left alone.
function renderFields(bits, source) {
  for (const f of fields) {
    if (f.el !== source) f.el.value = f.render(bits);
  }
  updateByteCounts();
}

function refreshEncodingsFromGrid() {
  renderFields(getBits(), null);
}

for (const f of fields) {
  f.el.addEventListener('input', () => {
    const bits = f.parse(f.el.value);
    if (!bits) {
      updateByteCounts(); // keep the count live even while the text is invalid
      return;
    }
    setBits(bits);
    renderFields(bits, f.el);
  });
}

buildGrid();
refreshEncodingsFromGrid();
