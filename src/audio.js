
// const PIANO = [0.005, 0.4,  0.15, 0.3];
// const FLUTE = [0.08,  0.15, 0.85, 0.2];
// const PLUCK = [0.002, 0.25, 0.05, 0.3];
const PLUCK_BAD = [0.002, 0.25, 0.05, 0.3, 'sawtooth'];
const PLUCK_BAD_SLOW = [0.002, 0.75, 0.05, 0.3, 'sawtooth'];
// const BELL =  [0.002, 1,    0,    2];
const PING =  [0.007, 0.06, 0.42, 0.05];

const ERROR = [.01, .01, 1, .1, 'sawtooth'];
const ENEMY_DEATH = [.002, .07, .05, .3];


const AudioSystem = new class {
    ctx = new window.AudioContext();
    /** @type {!GainNode} */
    sfxGain = this.ctx.createGain();
    /** @type {!GainNode} */
    bgMusicGain = this.ctx.createGain();

    constructor() {
        this.sfxGain.connect(this.ctx.destination);
        this.sfxGain.gain.value = getLocalStorageItem('S') ?? 1;
        this.bgMusicGain.connect(this.ctx.destination);
        this.bgMusicGain.gain.value = getLocalStorageItem('M') ?? 1;
    }

    setSourceOnOff(isBg, isOn) {
        (isBg ? this.bgMusicGain : this.sfxGain).gain
            .setTargetAtTime(isOn, this.ctx.currentTime, 0.01);
        setLocalStorageItem('SM'[isBg], isOn);
    }

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

    playEnemyDeath() {
        this.scheduleNote(
            this.ctx.currentTime + randFloat(0, 0.1),
            randFloat(52, 54),
            0.05,
            ENEMY_DEATH,
            0.4,
        );
    }

    scheduleNote(atTime, midiNumber, noteLength, instrument, volume = 1, isBg = 0) {
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

        osc.connect(gain).connect(isBg ? this.bgMusicGain : this.sfxGain);

        gain.gain.setValueAtTime(0, atTime);
        gain.gain.linearRampToValueAtTime(volume, atTime + attack);
        gain.gain.setTargetAtTime(sustain * volume, atTime + attack, decay / 4);
        gain.gain.setTargetAtTime(0, atTime + noteLength, release / 4);

        osc.start(atTime);
        osc.stop(atTime + noteLength + release + 0.01);
    }

    async playMainMusic() {
        // high-complexity version
        // Note: these songs are really bad
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

        // low complexity version. Better songs.
        while(true) {
            // Stop playing if in bg
            await new Promise(res => requestAnimationFrame(res));
            const totalMaxHp = [...GameState.terrain.enemies].reduce((acc, e) => acc + e.maxHp, 0);
            if(
                totalMaxHp <= 15 * GameState.terrain.computedTowersArr.length
            ) {
                console.log('calm song');
                // Full source:
                // instruments: [[0.005, 0.4, 0.15, 0.3, 'sine']],
                // notes: [[0, 52, 4, 0], [4, 52, 4, 0], [8, 54, 4, 0], [12, 55, 1, 0], [13, 55, 1, 0], [14, 52, 2, 0], [16, 54, 4, 0], [20, 57, 1, 0], [21, 57, 1, 0], [22, 52, 2, 0], [24, 54, 4, 0], [28, 50, 1, 0], [29, 50, 1, 0], [30, 52, 2, 0], [32, 52, 4, 0], [36, 52, 4, 0], [40, 54, 4, 0], [44, 57, 1, 0], [45, 57, 1, 0], [46, 52, 2, 0], [48, 54, 1, 0], [49, 54, 1, 0], [50, 55, 2, 0], [52, 54, 1, 0], [53, 54, 1, 0], [54, 50, 2, 0], [56, 52, 4, 0], [60, 52, 4, 0], [64, 50, 2, 0], [66, 50, 2, 0], [68, 50, 2, 0], [70, 54, 1, 0], [71, 55, 1, 0], [72, 52, 4, 0], [76, 52, 4, 0]],
                // tempo: 120,
                // key: 'D major'
                await this.playSimpleSong(120, [
                    [2, 4], [2, 4], [4, 4], [5, 1], [5, 1], [2, 2], [4, 4],
                    [7, 1], [7, 1], [2, 2], [4, 4], [0, 1], [0, 1], [2, 2],
                    [2, 4], [2, 4], [4, 4], [7, 1], [7, 1], [2, 2], [4, 1],
                    [4, 1], [5, 2], [4, 1], [4, 1], [0, 2], [2, 4], [2, 4],
                    [0, 2], [0, 2], [0, 2], [4, 1], [5, 1], [2, 4], [2, 4]
                ]);
            }else{
                console.log('frantic song');
                // Full source:
                // instruments: [[0.005, 0.4, 0.15, 0.3, 'sine']],
                // notes: [[0, 52, 2, 0], [2, 52, 2, 0], [4, 54, 1, 0], [5, 52, 1, 0], [6, 54, 1, 0], [7, 52, 1, 0], [8, 54, 2, 0], [10, 55, 1, 0], [11, 55, 1, 0], [12, 54, 2, 0], [14, 50, 2, 0], [16, 52, 1, 0], [17, 54, 1, 0], [18, 55, 1, 0], [19, 57, 1, 0], [20, 59, 1, 0], [21, 57, 1, 0], [22, 54, 2, 0], [24, 52, 1, 0], [25, 52, 1, 0], [26, 54, 2, 0], [28, 52, 1, 0], [29, 52, 1, 0], [30, 50, 2, 0], [32, 52, 1, 0], [33, 52, 1, 0], [34, 54, 2, 0], [36, 52, 1, 0], [37, 54, 1, 0], [38, 50, 1, 0], [39, 55, 1, 0], [40, 55, 1, 0], [41, 55, 1, 0], [42, 57, 2, 0], [44, 55, 1, 0], [45, 55, 1, 0], [46, 52, 2, 0], [48, 50, 1, 0], [49, 52, 1, 0], [50, 50, 1, 0], [51, 54, 1, 0], [52, 50, 1, 0], [53, 55, 1, 0], [54, 50, 1, 0], [55, 57, 1, 0], [56, 52, 2, 0], [58, 52, 2, 0], [60, 52, 2, 0], [62, 50, 1, 0], [63, 55, 1, 0], [64, 52, 1, 0], [65, 52, 1, 0], [66, 52, 1, 0], [67, 52, 1, 0], [68, 50, 2, 0], [70, 54, 1, 0], [71, 54, 1, 0], [72, 52, 4, 0], [76, 50, 2, 0], [78, 52, 2, 0]],
                // tempo: 120,
                // key: 'D major'
                await this.playSimpleSong(140, [
                    [2, 2], [2, 2], [4, 1], [2, 1], [4, 1], [2, 1], [4, 2],
                    [5, 1], [5, 1], [4, 2], [0, 2], [2, 1], [4, 1], [5, 1],
                    [7, 1], [9, 1], [7, 1], [4, 2], [2, 1], [2, 1], [4, 2],
                    [2, 1], [2, 1], [0, 2], [2, 1], [2, 1], [4, 2], [2, 1],
                    [4, 1], [0, 1], [5, 1], [5, 1], [5, 1], [7, 2], [5, 1],
                    [5, 1], [2, 2], [0, 1], [2, 1], [0, 1], [4, 1], [0, 1],
                    [5, 1], [0, 1], [7, 1], [2, 2], [2, 2], [2, 2], [0, 1],
                    [5, 1], [2, 1], [2, 1], [2, 1], [2, 1], [0, 2], [4, 1],
                    [4, 1], [2, 4], [0, 2], [2, 2],
                ]);
            }
        }
    }

    // More capable version
    // async playSong(instruments, notes, tempo) {
    //     const t0 = this.ctx.currentTime + 0.1;
    //     for(const [beat, midi, duration, instrument] of notes) {
    //         this.scheduleNote(
    //             t0 + beat * 30 / tempo,
    //             midi,
    //             duration * 30 / tempo,
    //             instruments[instrument],
    //             0.35,  // hardcoded bg music volume
    //         );
    //     }
    // }

    async playSimpleSong(tempo, notes) {
        // Takes all midi numbers as relative to 50,
        // And can only play one note at a time, on only
        // piano. Doesn't support rests either.
        const beatLength = 30 / tempo;
        const t0 = this.ctx.currentTime;
        let beat = 0;
        for(const [midi, duration] of notes) {
            this.scheduleNote(
                t0 + beat * beatLength,
                50 + midi,
                duration * beatLength,
                [0.005, 0.4, 0.15, 0.3, 'sine'],
                0.20,  // hardcoded bg music volume
                1,  // send to background output
            );
            beat += duration;
        }
        await time(beat * beatLength * 1e3);
    }
};
