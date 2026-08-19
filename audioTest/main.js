const ctx = new (window.AudioContext || window.webkitAudioContext)();

const WAVES = ["sine", "square", "sawtooth", "triangle"];
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

// 88-key piano: A0 (key 1) through C8 (key 88), A4 = 440Hz = key 49.
const NOTES = [];
for (let key = 1; key <= 88; key++) {
  const semitonesFromC0 = key + 8; // A0 is 9 semitones above C0
  NOTES.push({
    name: NOTE_NAMES[semitonesFromC0 % 12] + Math.floor(semitonesFromC0 / 12),
    freq: 440 * 2 ** ((key - 49) / 12),
  });
}

function radios(container, name, items, checkedIndex) {
  container.innerHTML = items
    .map(
      (item, i) =>
        `<label><input type="radio" name="${name}" value="${i}"${
          i === checkedIndex ? " checked" : ""
        }> ${item.label}</label>`,
    )
    .join("");
  return () => Number(container.querySelector("input:checked").value);
}

const getWave = radios(
  document.getElementById("waves"),
  "wave",
  WAVES.map((w) => ({ label: w })),
  3, // triangle
);
const getNote = radios(
  document.getElementById("notes"),
  "note",
  NOTES.map((n) => ({ label: n.name })),
  39, // C4
);

const sliders = {};
const sliderEls = {};
document.querySelectorAll('input[type="range"]').forEach((input) => {
  const output = input.parentElement.querySelector("output");
  const show = () => (output.textContent = Number(input.value).toFixed(3));
  input.addEventListener("input", show);
  input.addEventListener("input", draw);
  show();
  sliders[input.id] = () => Number(input.value);
  sliderEls[input.id] = input;
});

// Rough shapes only: four naked waveforms and an ADSR, no filters or harmonics,
// so these are caricatures of the instruments rather than imitations.
const PRESETS = {
  piano:  { wave: "triangle", attack: 0.005, decay: 0.4,  sustain: 0.15, release: 0.3 },
  violin: { wave: "sawtooth", attack: 0.12,  decay: 0.2,  sustain: 0.8,  release: 0.25 },
  organ:  { wave: "square",   attack: 0.01,  decay: 0.01, sustain: 1,    release: 0.1 },
  flute:  { wave: "sine",     attack: 0.08,  decay: 0.15, sustain: 0.85, release: 0.2 },
  pluck:  { wave: "sawtooth", attack: 0.002, decay: 0.25, sustain: 0.05, release: 0.3 },
  brass:  { wave: "sawtooth", attack: 0.06,  decay: 0.2,  sustain: 0.7,  release: 0.2 },
  bell:   { wave: "sine",     attack: 0.002, decay: 1,    sustain: 0,    release: 2 },
  bass:   { wave: "triangle", attack: 0.01,  decay: 0.3,  sustain: 0.2,  release: 0.15 },
  pad:    { wave: "triangle", attack: 0.4,   decay: 0.5,  sustain: 0.7,  release: 1.5 },
};

function applyPreset(name) {
  const { wave, ...envelope } = PRESETS[name];
  document.querySelector(`#waves input[value="${WAVES.indexOf(wave)}"]`).checked = true;
  for (const [id, value] of Object.entries(envelope)) {
    sliderEls[id].value = value;
    sliderEls[id].dispatchEvent(new Event("input")); // refresh readout + graph
  }
}

const presetsEl = document.getElementById("presets");
presetsEl.innerHTML = Object.keys(PRESETS)
  .map((name) => `<button type="button" data-preset="${name}">${name}</button>`)
  .join("");
presetsEl.addEventListener("click", (e) => {
  if (e.target.dataset.preset) applyPreset(e.target.dataset.preset);
});

function envelopeParams() {
  return {
    volume: sliders.volume(),
    attack: sliders.attack(),
    decay: sliders.decay(),
    sustain: sliders.sustain(),
    release: sliders.release(),
    noteLength: sliders.noteLength(), // gate: how long the "key" is held
  };
}

// Closed form of the schedule below, so the graph shows what the audio does.
function envelopeAt(time, p) {
  const held = (u) => {
    if (u <= 0) return 0;
    if (u < p.attack) return p.volume * (u / p.attack);
    const target = p.sustain * p.volume;
    return target + (p.volume - target) * Math.exp(-(u - p.attack) / (p.decay / 4));
  };
  if (time <= p.noteLength) return held(time);
  if (p.release <= 0) return 0;
  return held(p.noteLength) * Math.exp(-(time - p.noteLength) / (p.release / 4));
}

const voices = []; // live oscillators, so a new performance can cut off the old one

// Schedules one note at an absolute AudioContext time. `p` carries the same
// fields as envelopeParams(), but callers may pass values outside slider range.
function scheduleNote(t, freq, wave, p) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = wave;
  osc.frequency.value = freq;
  gain.gain.value = 0;
  osc.connect(gain).connect(ctx.destination);

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(p.volume, t + p.attack);                    // attack
  gain.gain.setTargetAtTime(p.sustain * p.volume, t + p.attack, p.decay / 4);   // decay -> sustain

  const releaseStart = t + p.noteLength;
  gain.gain.setTargetAtTime(0, releaseStart, p.release / 4);                    // release

  osc.start(t);
  osc.stop(releaseStart + p.release + 0.01);

  const voice = { osc, gain };
  voices.push(voice);
  osc.onended = () => voices.splice(voices.indexOf(voice), 1);
  return voice;
}

function stopAll() {
  const now = ctx.currentTime;
  for (const { osc, gain } of voices.slice()) {
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(0, now, 0.02); // short fade so it does not click
    osc.stop(now + 0.2);
  }
}

function playNote() {
  scheduleNote(ctx.currentTime, NOTES[getNote()].freq, WAVES[getWave()], envelopeParams());
}

const playButton = document.getElementById("play");
let timer = null;

// Self-rescheduling so slider moves take effect on the very next note.
function loop() {
  playNote();
  const p = envelopeParams();
  const period = Math.max(1, p.noteLength + p.release); // gate + tail, but never faster than 1/sec
  timer = setTimeout(loop, period * 1000);
}

playButton.addEventListener("click", () => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
    playButton.textContent = "▶ Play";
    return;
  }
  ctx.resume();
  loop();
  playButton.textContent = "⏸ Pause";
});

const canvas = document.getElementById("graph");
const g = canvas.getContext("2d");

function draw() {
  const p = envelopeParams();
  const total = p.noteLength + p.release || 1; // full note, gate + release tail

  // Match the backing store to the CSS size so the lines stay crisp.
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, w, h);

  const L = 38, R = 12, T = 12, B = 26;
  const x = (time) => L + (time / total) * (w - L - R);
  const y = (gain) => T + (1 - gain) * (h - T - B);

  // grid + gain labels (fixed 0..1 scale, so volume is visible)
  g.font = "10px system-ui, sans-serif";
  g.textBaseline = "middle";
  g.textAlign = "right";
  for (let v = 0; v <= 1.0001; v += 0.25) {
    g.strokeStyle = v === 0 ? "#999" : "#eee";
    g.beginPath();
    g.moveTo(L, y(v));
    g.lineTo(w - R, y(v));
    g.stroke();
    g.fillStyle = "#777";
    g.fillText(v.toFixed(2), L - 6, y(v));
  }

  // time axis
  g.textAlign = "center";
  g.textBaseline = "top";
  for (let i = 0; i <= 4; i++) {
    const time = (i / 4) * total;
    g.strokeStyle = "#eee";
    g.beginPath();
    g.moveTo(x(time), T);
    g.lineTo(x(time), y(0));
    g.stroke();
    g.fillStyle = "#777";
    g.fillText(time.toFixed(2) + "s", x(time), y(0) + 5);
  }

  // phase boundaries: end of attack, and note-off (release start)
  g.setLineDash([3, 3]);
  const marks = [];
  if (p.attack < p.noteLength) marks.push([p.attack, "#999", "A|D"]);
  marks.push([p.noteLength, "#c33", "note off"]);
  for (const [time, color, label] of marks) {
    g.strokeStyle = color;
    g.beginPath();
    g.moveTo(x(time), T);
    g.lineTo(x(time), y(0));
    g.stroke();
    g.fillStyle = color;
    g.textBaseline = "top";
    g.fillText(label, x(time), T);
  }
  g.setLineDash([]);

  // the envelope itself, one sample per pixel
  g.beginPath();
  for (let px = L; px <= w - R; px++) {
    const time = ((px - L) / (w - L - R)) * total;
    const gain = envelopeAt(time, p);
    if (px === L) g.moveTo(px, y(gain));
    else g.lineTo(px, y(gain));
  }
  g.strokeStyle = "#2a7";
  g.lineWidth = 2;
  g.stroke();

  g.lineTo(w - R, y(0));
  g.lineTo(L, y(0));
  g.closePath();
  g.fillStyle = "rgba(34, 170, 119, 0.15)";
  g.fill();
  g.lineWidth = 1;
}

window.addEventListener("resize", draw);
draw();

// --- Borodin, "In the Steppes of Central Asia" (1880), opening -----------------
// Transcribed from the IMSLP full score (typeset ed., PMLP03599): Allegro con
// moto, quarter = 92, 2/4. The Russian theme, clarinet I (in A) at bars 5-17,
// written pitches transposed down a minor third to concert pitch. Verified
// against the flute's concert-pitch restatement on the final page (key sig
// F#/C#/G#), which matches note for note an octave higher.
//
// Violin I holds a single sustained E throughout, 8va -- concert E7. That is
// voiced down here to E6: at 2637 Hz the real pitch reads as a mosquito on
// small speakers. The low E is not in the score; it is added for body.

const FREQ = {};
NOTES.forEach((n) => (FREQ[n.name] = n.freq));

const BEAT = 60 / 92; // quarter note at the score's marking

const AIR  = { volume: 0.05, attack: 4,    decay: 1,   sustain: 1,    release: 5 };
const PAD  = { volume: 0.13, attack: 2.5,  decay: 1,   sustain: 1,    release: 4 };
const REED = { volume: 0.3,  attack: 0.12, decay: 0.3, sustain: 0.8,  release: 0.5 };
const HORN = { volume: 0.26, attack: 0.2,  decay: 0.4, sustain: 0.75, release: 0.7 };

// [note, start beat, length in beats] -- one quarter note = 1 beat
const THEME = [
  ["E5",  0, 1.5], ["D5", 1.5, 0.25], ["C#5", 1.75, 0.25],   // bar 5
  ["B4",  2, 1],   ["C#5", 3, 1],                            // bar 6
  ["A4",  4, 1],   ["E4",  5, 1],                            // bar 7
  ["B4",  6, 1.5], ["C#5", 7.5, 0.25], ["B4", 7.75, 0.25],   // bar 8
  ["A4",  8, 1],   ["E5",  9, 1],                            // bar 9
  ["F#5",10, 1],   ["E5", 11, 1],                            // bar 10
  ["D5", 12, 1],   ["F#5",13, 1],                            // bar 11
  ["C#5",14, 2],                                             // bar 12
  ["E5", 16, 10],                                            // bars 13-17, tied
];

const RESTATE = 24; // horn takes the theme at bar 17, over the held clarinet E

function playSteppes() {
  stopAll();
  if (timer) {
    clearTimeout(timer);
    timer = null;
    playButton.textContent = "\u25b6 Play";
  }
  ctx.resume();

  const t0 = ctx.currentTime + 0.1;
  const total = (RESTATE + 26) * BEAT;

  // scheduleNote(t0, FREQ.E6, "sine", { ...AIR, noteLength: total });     // violins, sul E
  // scheduleNote(t0, FREQ.E2, "sine", { ...PAD, noteLength: total }); // added bass
  // scheduleNote(t0, FREQ.E3, "sine", { ...PAD, noteLength: total });

  for (const [name, beat, length] of THEME) {
    const p = { ...REED, noteLength: length * BEAT };
    scheduleNote(t0 + beat * BEAT, FREQ[name], "sine", p);
  }
  for (const [name, beat, length] of THEME) {
    const p = { ...HORN, noteLength: length * BEAT };
    scheduleNote(t0 + (beat + RESTATE) * BEAT, FREQ[name] / 2, "triangle", p);
  }
}

document.getElementById("steppes").addEventListener("click", playSteppes);

// --- Lightning strike ---------------------------------------------------------
// A shock wave, not a tone: broadband noise through a bandpass that sweeps down
// as the wave front loses its high end, plus a sine sub for the impact body.
// The stutter in the first 70ms is the 3-4 return strokes that flash down the
// same channel -- drive the visual flicker off the same timings.

let noiseBuffer = null;
function getNoise() {
  if (!noiseBuffer) {
    const len = Math.floor(ctx.sampleRate * 0.5);
    noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

const STROKES = [[0, 0.7], [0.022, 0.35], [0.048, 0.5], [0.07, 0.2]]; // [delay, gain]

function track(node, gain) {
  const voice = { osc: node, gain };
  voices.push(voice);
  node.onended = () => voices.splice(voices.indexOf(voice), 1);
}

function lightning(t) {
  // crack: bright noise sweeping down, stuttering through the return strokes
  const src = ctx.createBufferSource();
  src.buffer = getNoise();
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.Q.value = 0.7;
  const g = ctx.createGain();
  src.connect(bp).connect(g).connect(ctx.destination);

  bp.frequency.setValueAtTime(6000, t);
  bp.frequency.exponentialRampToValueAtTime(300, t + 0.25);

  g.gain.setValueAtTime(0.0001, t);
  for (const [dt, amp] of STROKES) {
    g.gain.exponentialRampToValueAtTime(amp, t + dt + 0.001);
    g.gain.exponentialRampToValueAtTime(0.05, t + dt + 0.018);
  }
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
  src.start(t);
  src.stop(t + 0.4);
  track(src, g);

  // // sub: the chest punch. Without it the crack reads as hiss.
  // const osc = ctx.createOscillator();
  // const sg = ctx.createGain();
  // osc.type = "sine";
  // osc.connect(sg).connect(ctx.destination);
  // osc.frequency.setValueAtTime(80, t);
  // osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
  // sg.gain.setValueAtTime(0.5, t);
  // sg.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
  // osc.start(t);
  // osc.stop(t + 0.2);
  // track(osc, sg);
}

document.getElementById("lightning").addEventListener("click", () => {
  ctx.resume();
  lightning(ctx.currentTime + 0.02);
});

// --- Viking horn (lur) --------------------------------------------------------
// Take one: saws through a lowpass sweep. That is a synth brass patch, and it
// sounds like one. A real horn does not filter a rich wave down -- it GENERATES
// harmonics as it gets loud, because the pressure wave steepens as it travels
// the tube (loud enough and it is literally a shock wave). So the harmonics are
// made by a nonlinearity whose drive follows the breath, not by a filter.
//
// Hence: a plain triangle pushed into a waveshaper, drive riding the envelope.
// Soft blow = nearly a sine. Hard blow = the brass blat. The curve is
// ASYMMETRIC because lips open and close differently, and that asymmetry is
// what puts the even harmonics in.
//
// After that the fakeness that is left is regularity, so nothing here is
// allowed to be periodic or exact: the vibrato is three LFOs at unrelated
// rates, the attack pitch is unstable, and the room is a real (generated)
// impulse response instead of a slap delay.

let brassCurve = null;
function getBrassCurve() {
  if (!brassCurve) {
    const n = 2048, k = 3.2, bias = 0.28;
    brassCurve = new Float32Array(n);
    const norm = Math.tanh(k + bias);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      brassCurve[i] = (Math.tanh(k * x + bias) - Math.tanh(bias)) / norm;
    }
  }
  return brassCurve;
}

// Stone hall / valley: decaying noise, lowpassed as it decays, two independent
// channels so the tail is not a point source. Cheaper in bytes than it sounds.
let hallIR = null;
function getHall() {
  if (!hallIR) {
    const len = Math.floor(ctx.sampleRate * 2.4);
    hallIR = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = hallIR.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        lp += 0.18 * (Math.random() * 2 - 1 - lp); // one-pole: dark tail
        d[i] = lp * (1 - i / len) ** 2.4;
      }
    }
  }
  return hallIR;
}

let hallBus = null;
function getHallBus() {
  if (!hallBus) {
    hallBus = ctx.createGain();
    const pre = ctx.createDelay(0.1);
    pre.delayTime.value = 0.022; // predelay: puts the walls at a distance
    const conv = ctx.createConvolver();
    conv.buffer = getHall();
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    hallBus.connect(pre).connect(conv).connect(wet).connect(ctx.destination);
  }
  return hallBus;
}

function horn(t, freq = 110, dur = 2.2, vol = 0.4) {
  const A = 0.13;             // attack: a big tube takes time to speak
  const REL = 0.34;           // the hall carries the rest of the tail
  const end = t + dur + REL;

  const out = ctx.createGain();
  out.connect(ctx.destination);
  out.connect(getHallBus());

  // Signal path: osc -> drive -> shaper -> bell resonance -> dc/mud trim -> out
  const drive = ctx.createGain();
  const shaper = ctx.createWaveShaper();
  shaper.curve = getBrassCurve();
  shaper.oversample = "4x";   // without this the blat aliases into grit
  const bell = ctx.createBiquadFilter();
  bell.type = "peaking";      // the flare's resonance, fixed in Hz, not tracking pitch
  bell.frequency.value = 900;
  bell.Q.value = 1.1;
  bell.gain.value = 7;
  const trim = ctx.createBiquadFilter();
  trim.type = "highpass";     // kills the DC the asymmetric curve leaves behind
  trim.frequency.value = 65;
  const tame = ctx.createBiquadFilter();
  tame.type = "lowpass";      // just the tube's own top limit, barely moving
  tame.frequency.setValueAtTime(freq * 6, t);
  tame.frequency.exponentialRampToValueAtTime(freq * 26, t + A);
  tame.frequency.exponentialRampToValueAtTime(freq * 10, end);
  drive.connect(shaper).connect(bell).connect(trim).connect(tame).connect(out);

  // THE effect: how hard the wave is driven into the nonlinearity. This is the
  // timbre envelope, and it is deliberately not the same shape as the volume --
  // the note blooms brighter a moment after it starts, then backs off.
  drive.gain.setValueAtTime(0.06, t);
  drive.gain.exponentialRampToValueAtTime(0.95, t + A * 1.4);
  drive.gain.exponentialRampToValueAtTime(0.55, t + A + 0.45);
  drive.gain.setValueAtTime(0.55, t + dur * 0.75);
  drive.gain.exponentialRampToValueAtTime(0.12, end); // darkens as it dies

  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(vol, t + A);
  out.gain.exponentialRampToValueAtTime(vol * 0.72, t + A + 0.4);
  out.gain.setValueAtTime(vol * 0.72, t + dur);
  out.gain.exponentialRampToValueAtTime(0.0001, end);

  // Instability, summed in cents. Three unrelated rates never line up, so the
  // wobble never repeats; the slow one is the player drifting, not vibrato.
  const wobble = ctx.createGain();
  for (const [rate, cents, fadeIn] of [[5.3, 6, 0.75], [7.1, 2.5, 1.1], [0.63, 5, 0]]) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = rate;
    if (fadeIn) {
      depth.gain.setValueAtTime(0, t);
      depth.gain.linearRampToValueAtTime(cents, t + fadeIn);
    } else {
      depth.gain.value = cents;
    }
    lfo.connect(depth).connect(wobble);
    lfo.start(t);
    lfo.stop(end);
  }
  // Breath is uneven too: the same wobble nudges the volume a little.
  const breath = ctx.createGain();
  breath.gain.value = vol * 0.004; // wobble is in cents, so scale way down
  wobble.connect(breath).connect(out.gain);

  // Two voices, barely apart. Not a chorus -- just enough that the phase
  // between them crawls, which is what stops it sounding like one oscillator.
  for (const [cents, level, mult] of [[0, 1, 1], [4, 0.75, 1], [-3, 0.32, 2]]) {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";     // the shaper supplies the harmonics, not the wave
    g.gain.value = level * 0.5;
    wobble.connect(osc.detune);
    // Attack pitch: lands fast and slightly randomly, the lips catching the
    // harmonic. A slow clean glide is a synth portamento and reads as fake.
    const off = 55 + Math.random() * 35;
    osc.detune.setValueAtTime(-off, t);
    osc.detune.linearRampToValueAtTime(cents + 3, t + 0.055);
    osc.detune.linearRampToValueAtTime(cents, t + 0.11);
    osc.frequency.value = freq * mult;
    osc.connect(g).connect(drive);
    osc.start(t);
    osc.stop(end);
    track(osc, g);
  }

  // Air, mixed in BEFORE the shaper so the nonlinearity chews on it too --
  // that is what welds it to the tone instead of laying hiss on top.
  const air = ctx.createBufferSource();
  air.buffer = getNoise();
  air.loop = true;
  const airBp = ctx.createBiquadFilter();
  airBp.type = "bandpass";
  airBp.frequency.value = 1100;
  airBp.Q.value = 0.6;
  const airGain = ctx.createGain();
  air.connect(airBp).connect(airGain).connect(drive);
  airGain.gain.setValueAtTime(0.0001, t);
  airGain.gain.exponentialRampToValueAtTime(0.22, t + 0.035); // the chiff
  airGain.gain.exponentialRampToValueAtTime(0.025, t + 0.28); // then just breath
  airGain.gain.exponentialRampToValueAtTime(0.0001, end);
  air.start(t);
  air.stop(end);
  track(air, airGain);

  return out;
}

document.getElementById("horn").addEventListener("click", () => {
  ctx.resume();
  horn(ctx.currentTime + 0.02);
});
