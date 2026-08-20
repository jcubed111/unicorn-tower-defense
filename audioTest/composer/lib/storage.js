import { SHAPES, presetSettings } from './music';

const KEY = 'composer-state';

const num = (v, fallback) => (typeof v === 'number' && isFinite(v) ? v : fallback);

// Storage is user-editable, so everything coming back gets checked.
function normalizeInstrument(raw, index) {
    const defaults = presetSettings('piano');
    const notes = Array.isArray(raw.notes) ? raw.notes : [];

    return {
        id: num(raw.id, index + 1),
        name: typeof raw.name === 'string' ? raw.name : `inst ${index + 1}`,
        attack: Math.max(0, num(raw.attack, defaults.attack)),
        decay: Math.max(0, num(raw.decay, defaults.decay)),
        sustain: Math.max(0, num(raw.sustain, defaults.sustain)),
        release: Math.max(0, num(raw.release, defaults.release)),
        shape: SHAPES.includes(raw.shape) ? raw.shape : defaults.shape,
        notes: notes
            .filter(n => n && isFinite(n.pitch) && isFinite(n.start) && n.len >= 1)
            .map(n => ({ pitch: n.pitch, start: n.start, len: n.len })),
    };
}

export function loadState() {
    try {
        const raw = JSON.parse(localStorage.getItem(KEY));
        if (!raw || typeof raw !== 'object') return null;

        const instruments = Array.isArray(raw.instruments) ? raw.instruments : [];
        return {
            tempo: num(raw.tempo, 120),
            keyRoot: num(raw.keyRoot, 0),
            keyScale: raw.keyScale === 'minor' ? 'minor' : 'major',
            instruments: instruments.map(normalizeInstrument),
        };
    } catch {
        return null;
    }
}

export function saveState(state) {
    try {
        localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
        // Private browsing or a full quota — composing still works, it just
        // won't survive a refresh.
    }
}
