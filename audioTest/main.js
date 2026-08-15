const ctx = new (window.AudioContext || window.webkitAudioContext)();

let currentType = "triangle";
let currentOctave = 0;

function playNote(type, octave) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = 261.6255653005986 * 2 ** octave; // C4 shifted by octave
  gain.gain.value = 0;
  osc.connect(gain).connect(ctx.destination);

  const t = ctx.currentTime;
  const attack = 0.005, decay = 0.1, sustain = 0.3, release = 1;
  const eighthNote = 0.25; // (60 / 120bpm) / 2

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(1, t + attack);          // attack
  gain.gain.setTargetAtTime(sustain, t + attack, decay / 4); // decay -> sustain

  const releaseStart = t + eighthNote;
  gain.gain.setTargetAtTime(0, releaseStart, release / 4);   // release

  osc.start(t);
  osc.stop(releaseStart + release);
}

document.querySelectorAll("button[data-type]").forEach((button) => {
  button.addEventListener("click", () => {
    currentType = button.dataset.type;
    ctx.resume();
    playNote(currentType, currentOctave);
  });
});

document.querySelectorAll("button[data-octave]").forEach((button) => {
  button.addEventListener("click", () => {
    currentOctave = Number(button.dataset.octave);
    ctx.resume();
    playNote(currentType, currentOctave);
  });
});
