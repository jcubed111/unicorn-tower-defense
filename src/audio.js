
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

    async playMainMusic() {
        // await this.playSong(
        //     [[0.005, 0.4, 0.15, 0.3, 'sine'], [0.002, 1, 0, 2, 'sine']],
        //     [[0, 55, 1, 0], [0, 57, 1, 0], [0, 59, 1, 0], [0, 45, 1, 1], [2, 55, 1, 0], [2, 57, 1, 0], [2, 59, 1, 0], [2, 45, 1, 1], [4, 55, 1, 0], [4, 57, 1, 0], [4, 59, 1, 0], [4, 47, 1, 1], [6, 55, 1, 0], [6, 57, 1, 0], [6, 59, 1, 0], [6, 47, 1, 1], [7, 55, 1, 0], [7, 57, 1, 0], [7, 59, 1, 0], [8, 60, 2, 0], [8, 62, 2, 0], [8, 45, 1, 1], [10, 62, 2, 0], [10, 64, 2, 0], [10, 45, 1, 1], [12, 64, 2, 0], [12, 65, 2, 0], [12, 47, 1, 1], [14, 62, 1, 0], [14, 64, 1, 0], [14, 47, 1, 1], [15, 62, 1, 0], [15, 64, 1, 0], [16, 60, 1, 0], [16, 45, 1, 1], [17, 60, 1, 0], [18, 60, 1, 0], [18, 45, 1, 1], [19, 60, 1, 0], [20, 62, 4, 0], [20, 47, 1, 1], [22, 47, 1, 1]],
        //     120,
        // );
        // await this.playSong(
        //     [[0.08, 0.15, 0.85, 0.2, 'sine']],
        //     [[0, 48, 4, 0], [0, 52, 4, 0], [4, 47, 4, 0], [4, 50, 4, 0], [8, 48, 4, 0], [8, 52, 4, 0], [12, 47, 4, 0], [12, 50, 4, 0], [16, 48, 4, 0], [16, 52, 4, 0], [20, 50, 4, 0], [20, 53, 4, 0], [24, 52, 4, 0], [24, 55, 4, 0], [28, 50, 4, 0], [28, 53, 4, 0]],
        //     120,
        // );
        await this.playSong(
            [],
            [],
            120,
        );
    }
    // instruments: [[0.005, 0.4, 0.15, 0.3, 'sine'], [0.002, 1, 0, 2, 'sine']],
    // notes: [[0, 55, 1, 0], [0, 59, 1, 0], [0, 45, 1, 1], [2, 55, 1, 0], [2, 59, 1, 0], [2, 45, 1, 1], [4, 55, 1, 0], [4, 59, 1, 0], [4, 47, 1, 1], [6, 55, 1, 0], [6, 59, 1, 0], [6, 47, 1, 1], [7, 55, 1, 0], [7, 59, 1, 0], [8, 45, 1, 1], [10, 45, 1, 1], [12, 47, 1, 1], [14, 47, 1, 1], [16, 45, 1, 1], [18, 45, 1, 1], [20, 47, 1, 1], [22, 47, 1, 1]],
    // tempo: 120,
    async playSong(instruments, notes, tempo) {
        const t0 = this.ctx.currentTime + 0.1;
        for(const [beat, midi, duration, instrument] of notes) {
            this.scheduleNote(
                t0 + beat * 30 / tempo,
                midi,
                duration * 30 / tempo,
                instruments[instrument],
                0.35,  // hardcoded bg music volume
            );
        }
    }
};
