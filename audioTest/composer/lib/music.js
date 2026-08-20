export const MEASURES = 20;
export const CELLS_PER_MEASURE = 8; // eighth notes, 4/4
export const TOTAL_COLS = MEASURES * CELLS_PER_MEASURE;

export const CELL_W = 22;
export const CELL_H = 18;

export const TOP_MIDI = 84; // C6
export const BOTTOM_MIDI = 36; // C2
export const ROWS = TOP_MIDI - BOTTOM_MIDI + 1;

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10],
};

export const SHAPES = ['sine', 'square', 'sawtooth', 'triangle'];

export function noteName(midi) {
    return NOTE_NAMES[midi % 12] + (Math.floor(midi / 12) - 1);
}

export function keyPitchClasses(root, scale) {
    const set = new Set();
    for (const step of SCALES[scale]) set.add((root + step) % 12);
    return set;
}

// Seconds per eighth note.
export function eighthLength(tempo) {
    return 30 / tempo;
}

export function instrumentArray(inst) {
    return [inst.attack, inst.decay, inst.sustain, inst.release, inst.shape];
}

// '[]' for a single cell, '[-' '--' '-]' across longer notes.
export function noteCellText(index, len) {
    if (len === 1) return '[]';
    if (index === 0) return '[-';
    if (index === len - 1) return '-]';
    return '--';
}

// [attack, decay, sustain, release, shape]
export const PRESETS = {
    piano: [0.005, 0.4, 0.15, 0.3, 'sine'],
    flute: [0.08, 0.15, 0.85, 0.2, 'sine'],
    pluck: [0.002, 0.25, 0.05, 0.3, 'sine'],
    bell: [0.002, 1, 0, 2, 'sine'],
};

export function presetSettings(name) {
    const [attack, decay, sustain, release, shape] = PRESETS[name];
    return { attack, decay, sustain, release, shape };
}

// Name of the preset an instrument exactly matches, or '' for a custom sound.
export function matchingPreset(inst) {
    for (const name of Object.keys(PRESETS)) {
        const [a, d, s, r, shape] = PRESETS[name];
        if (
            inst.attack === a &&
            inst.decay === d &&
            inst.sustain === s &&
            inst.release === r &&
            inst.shape === shape
        ) return name;
    }
    return '';
}

const num = v => String(Math.round(v * 10000) / 10000);

export function keyString(root, scale) {
    return `${NOTE_NAMES[root]} ${scale}`;
}

// The data code for the piece:
//   instruments: [[a, d, s, r, shape], ...]
//   notes: [[eighth note index, midiNumber, length in eighths, instrumentIndex], ...]
export function serializeComposition(instruments, tempo, root, scale) {
    const sounds = instruments.map(
        i => `[${num(i.attack)}, ${num(i.decay)}, ${num(i.sustain)}, ${num(i.release)}, '${i.shape}']`
    );

    const notes = [];
    instruments.forEach((inst, index) => {
        for (const n of inst.notes) notes.push([n.start, n.pitch, n.len, index]);
    });
    notes.sort((a, b) => a[0] - b[0] || a[3] - b[3] || a[1] - b[1]);

    return [
        `instruments: [${sounds.join(', ')}],`,
        `notes: [${notes.map(n => `[${n.join(', ')}]`).join(', ')}],`,
        `tempo: ${tempo},`,
        `key: '${keyString(root, scale)}'`,
    ].join('\n');
}
