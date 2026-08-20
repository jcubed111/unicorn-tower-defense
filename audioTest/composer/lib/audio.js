// Port of src/audio.js — same scheduleNote signature, lazily created context so
// it can live in a browser-only module.

let system = null;

class AudioSystem {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }

    scheduleNote(atTime, midiNumber, noteLength, instrument, volume = 1) {
        const [
            attack,
            decay,
            sustain,
            release,
            shape = 'sine',
        ] = instrument;

        const osc = new OscillatorNode(this.ctx, {
            frequency: 440 * 2 ** ((midiNumber - 69) / 12),
            type: shape,
        });
        const gain = this.ctx.createGain();

        osc.connect(gain).connect(this.ctx.destination);

        gain.gain.setValueAtTime(0, atTime);
        gain.gain.linearRampToValueAtTime(volume, atTime + attack);
        gain.gain.setTargetAtTime(sustain * volume, atTime + attack, decay / 4);
        gain.gain.setTargetAtTime(0, atTime + noteLength, release / 4);

        osc.start(atTime);
        osc.stop(atTime + noteLength + release + 0.01);
    }
}

export function getAudio() {
    if (!system) system = new AudioSystem();
    if (system.ctx.state === 'suspended') system.ctx.resume();
    return system;
}
