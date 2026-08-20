'use client';

import { useEffect, useRef } from 'react';
import Staff from './Staff';
import {
    CELL_H,
    PRESETS,
    ROWS,
    SHAPES,
    TOP_MIDI,
    matchingPreset,
    noteName,
    presetSettings,
} from '../lib/music';

const STAFF_H = 15 * CELL_H;

// Start the view around the middle of the range.
const INITIAL_SCROLL = (TOP_MIDI - 76) * CELL_H;

// Times get a squared slider curve so the short end stays reachable; sustain is
// a level, so it stays linear.
const RANGES = {
    attack: { max: 0.5, curve: 2 },
    decay: { max: 3, curve: 2 },
    sustain: { max: 1, curve: 1 },
    release: { max: 3, curve: 2 },
};

const round = v => Math.round(v * 10000) / 10000;

function Adsr({ name, value, onChange }) {
    const { max, curve } = RANGES[name];
    const position = (value / max) ** (1 / curve);

    return (
        <div className="field slider">
            <label>{name}</label>
            <input
                type="range"
                min="0"
                max="1"
                step="0.001"
                value={position}
                onChange={e => onChange(round(max * Number(e.target.value) ** curve))}
            />
            <span className="value">{value}</span>
        </div>
    );
}

export default function InstrumentRow({ inst, keySet, onChange, onRemove, onPreview }) {
    const scrollRef = useRef(null);
    const labelsRef = useRef(null);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = INITIAL_SCROLL;
    }, []);

    const syncLabels = () => {
        if (labelsRef.current && scrollRef.current) {
            labelsRef.current.style.transform =
                `translateY(${-scrollRef.current.scrollTop}px)`;
        }
    };

    const set = patch => onChange({ ...inst, ...patch });

    const labels = [];
    for (let i = 0; i < ROWS; i++) {
        const pitch = TOP_MIDI - i;
        labels.push(
            <div
                key={pitch}
                className={pitch % 12 === 0 ? 'label root' : 'label'}
                style={{ height: CELL_H, lineHeight: `${CELL_H - 1}px` }}
            >
                {noteName(pitch)}
            </div>
        );
    }

    const preset = matchingPreset(inst);

    return (
        <div className="instRow">
            <div className="stickyPanel">
                <div className="instSettings" style={{ height: STAFF_H }}>
                    <div className="head">
                        <input
                            value={inst.name}
                            onChange={e => set({ name: e.target.value })}
                        />
                        <button onClick={onRemove} title="Remove instrument">✕</button>
                    </div>
                    <div className="field">
                        <label>preset</label>
                        <select
                            value={preset}
                            onChange={e => set(presetSettings(e.target.value))}
                        >
                            {!preset && <option value="">custom</option>}
                            {Object.keys(PRESETS).map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>
                    <Adsr name="attack" value={inst.attack} onChange={v => set({ attack: v })} />
                    <Adsr name="decay" value={inst.decay} onChange={v => set({ decay: v })} />
                    <Adsr name="sustain" value={inst.sustain} onChange={v => set({ sustain: v })} />
                    <Adsr name="release" value={inst.release} onChange={v => set({ release: v })} />
                    <div className="field">
                        <label>shape</label>
                        <select
                            value={inst.shape}
                            onChange={e => set({ shape: e.target.value })}
                        >
                            {SHAPES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                <div className="labels" style={{ height: STAFF_H }}>
                    <div ref={labelsRef}>{labels}</div>
                </div>
            </div>
            <Staff
                notes={inst.notes}
                keySet={keySet}
                height={STAFF_H}
                scrollRef={scrollRef}
                onScroll={syncLabels}
                onNotesChange={notes => set({ notes })}
                onPreview={(pitch, len) => onPreview(inst, pitch, len)}
            />
        </div>
    );
}
