
// const PIANO = [0.005, 0.4,  0.15, 0.3];
// const FLUTE = [0.08,  0.15, 0.85, 0.2];
// const PLUCK = [0.002, 0.25, 0.05, 0.3];
const PLUCK_BAD = [0.002, 0.25, 0.05, 0.3, 'sawtooth'];
const PLUCK_BAD_SLOW = [0.002, 0.75, 0.05, 0.3, 'sawtooth'];
// const BELL =  [0.002, 1,    0,    2];
const PING =  [0.007, 0.06, 0.42, 0.05];

const ERROR = [.01, .01, 1, .1, 'sawtooth'];


const AudioSystem = new class {
    ctx = new window.AudioContext();

    playTowerBolt(dNote) {
        this.scheduleNote(
            this.ctx.currentTime + randFloat(0, 0.1),
            dNote + randFloat(64, 66),
            0.05,
            PING,
            0.2,
        );
    }

    playRespawn() {
        this.scheduleNote(
            this.ctx.currentTime,
            randFloat(12, 14),
            0.2,
            PLUCK_BAD,
            0.5,
        );
        this.scheduleNote(
            this.ctx.currentTime,
            randFloat(6, 8),
            0.2,
            PLUCK_BAD_SLOW,
            0.5,
        );
    }

    playInvalidAction() {
        this.scheduleNote(
            this.ctx.currentTime,
            33,
            0.05,
            ERROR,
            0.4,
        );
    }

    // playNoteNow(...args) {
    //     this.scheduleNote(this.ctx.currentTime, ...args);
    // }

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
};
