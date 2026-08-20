'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import InstrumentRow from './InstrumentRow';
import { getAudio } from '../lib/audio';
import { loadState, saveState } from '../lib/storage';
import {
    CELL_W,
    CELLS_PER_MEASURE,
    MEASURES,
    NOTE_NAMES,
    TOTAL_COLS,
    eighthLength,
    instrumentArray,
    keyPitchClasses,
    presetSettings,
    serializeComposition,
} from '../lib/music';

const PANEL_W = 277; // instrument settings + note labels + border
const LOOKAHEAD = 0.15; // seconds of notes scheduled ahead of the clock
const VOLUME = 0.3;

let nextId = 1;

function makeInstrument(preset = 'piano') {
    return {
        id: nextId++,
        name: `inst ${nextId - 1}`,
        ...presetSettings(preset),
        notes: [],
    };
}

export default function Page() {
    const [tempo, setTempo] = useState(120);
    const [keyRoot, setKeyRoot] = useState(0);
    const [keyScale, setKeyScale] = useState('major');
    const [instruments, setInstruments] = useState(() => [makeInstrument()]);
    const [playing, setPlaying] = useState(false);

    // localStorage can't be read during render without breaking hydration, so the
    // saved piece loads on mount and saving waits until it has.
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const saved = loadState();
        if (saved) {
            setTempo(saved.tempo);
            setKeyRoot(saved.keyRoot);
            setKeyScale(saved.keyScale);
            setInstruments(saved.instruments);
            if (saved.instruments.length) {
                nextId = Math.max(...saved.instruments.map(i => i.id)) + 1;
            }
        }
        setLoaded(true);
    }, []);

    useEffect(() => {
        if (!loaded) return;
        saveState({ tempo, keyRoot, keyScale, instruments });
    }, [loaded, tempo, keyRoot, keyScale, instruments]);

    const keySet = useMemo(() => keyPitchClasses(keyRoot, keyScale), [keyRoot, keyScale]);

    const output = useMemo(
        () => serializeComposition(instruments, tempo, keyRoot, keyScale),
        [instruments, tempo, keyRoot, keyScale],
    );

    // Playback reads the live piece without restarting the scheduler.
    const liveRef = useRef({ instruments, tempo });
    liveRef.current = { instruments, tempo };

    const posRef = useRef(0); // column the playhead is on
    const posLabelRef = useRef(null);

    const setCursor = (col, on) => {
        for (const el of document.querySelectorAll('.colhl')) {
            el.style.transform = `translateX(${col * CELL_W}px)`;
            el.classList.toggle('on', on);
        }
        if (posLabelRef.current) {
            const measure = Math.floor(col / CELLS_PER_MEASURE) + 1;
            const eighth = col % CELLS_PER_MEASURE;
            posLabelRef.current.textContent =
                `${measure}.${Math.floor(eighth / 2) + 1}.${eighth % 2 ? '5' : '0'}`;
        }
    };

    // Bumped on a seek so the scheduler restarts from the new position.
    const [seek, setSeek] = useState(0);

    useEffect(() => {
        if (!playing) return;

        const audio = getAudio();
        const ctx = audio.ctx;
        let nextCol = posRef.current;
        let nextTime = ctx.currentTime + 0.08;
        const queue = []; // columns already scheduled, for the playhead

        const tick = () => {
            while (nextTime < ctx.currentTime + LOOKAHEAD) {
                const { instruments, tempo } = liveRef.current;
                const eighth = eighthLength(tempo);

                for (const inst of instruments) {
                    const sound = instrumentArray(inst);
                    for (const n of inst.notes) {
                        if (n.start !== nextCol) continue;
                        audio.scheduleNote(nextTime, n.pitch, n.len * eighth, sound, VOLUME);
                    }
                }

                queue.push({ col: nextCol, t: nextTime });
                nextCol = (nextCol + 1) % TOTAL_COLS; // loop the piece
                nextTime += eighth;
            }
        };

        let raf;
        const frame = () => {
            while (queue.length && queue[0].t <= ctx.currentTime) {
                posRef.current = queue.shift().col;
            }
            setCursor(posRef.current, true);
            raf = requestAnimationFrame(frame);
        };

        tick();
        const timer = setInterval(tick, 25);
        raf = requestAnimationFrame(frame);

        return () => {
            clearInterval(timer);
            cancelAnimationFrame(raf);
        };
    }, [playing, seek]);

    // Jump whole measures, wrapping around the loop like playback does.
    const seekMeasures = delta => {
        const measure = Math.floor(posRef.current / CELLS_PER_MEASURE) + delta;
        posRef.current = ((measure * CELLS_PER_MEASURE) % TOTAL_COLS + TOTAL_COLS) % TOTAL_COLS;
        setCursor(posRef.current, true);
        setSeek(n => n + 1);
    };

    useEffect(() => {
        const onKeyDown = e => {
            const el = e.target;
            // Let the settings controls have their own keys.
            if (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return;

            if (e.code === 'Space') {
                e.preventDefault();
                setPlaying(p => !p);
            } else if (e.code === 'ArrowLeft') {
                e.preventDefault();
                seekMeasures(-1);
            } else if (e.code === 'ArrowRight') {
                e.preventDefault();
                seekMeasures(1);
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, []);

    const stop = () => {
        setPlaying(false);
        posRef.current = 0;
        setCursor(0, false);
    };

    const previewNote = (inst, pitch, len) => {
        const audio = getAudio();
        audio.scheduleNote(
            audio.ctx.currentTime,
            pitch,
            len * eighthLength(tempo),
            instrumentArray(inst),
            VOLUME,
        );
    };

    const updateInstrument = updated =>
        setInstruments(list => list.map(i => (i.id === updated.id ? updated : i)));

    const measures = [];
    for (let m = 0; m < MEASURES; m++) {
        measures.push(
            <div key={m} className="measure" style={{ width: CELLS_PER_MEASURE * CELL_W }}>
                {m + 1}
            </div>
        );
    }

    return (
        <div className="page">
            <div className="settingsBar">
                <div className="field">
                    <label>tempo</label>
                    <input
                        type="number"
                        min="20"
                        max="300"
                        value={tempo}
                        onChange={e => setTempo(Math.max(20, Math.min(300, Number(e.target.value) || 20)))}
                        style={{ width: 60 }}
                    />
                    <span style={{ color: '#888' }}>bpm</span>
                </div>
                <div className="field">
                    <label>key</label>
                    <select value={keyRoot} onChange={e => setKeyRoot(Number(e.target.value))}>
                        {NOTE_NAMES.map((n, i) => <option key={n} value={i}>{n}</option>)}
                    </select>
                    <select value={keyScale} onChange={e => setKeyScale(e.target.value)}>
                        <option value="major">major</option>
                        <option value="minor">minor</option>
                    </select>
                </div>
            </div>

            <div className="hscroll">
                <div className="hinner" style={{ width: PANEL_W + TOTAL_COLS * CELL_W + 16 }}>
                    <div className="rulerRow">
                        <div style={{ width: PANEL_W, position: 'sticky', left: 0, background: '#fafafa', zIndex: 2 }} />
                        <div className="ruler">{measures}</div>
                    </div>

                    {instruments.map(inst => (
                        <InstrumentRow
                            key={inst.id}
                            inst={inst}
                            keySet={keySet}
                            onChange={updateInstrument}
                            onRemove={() => setInstruments(list => list.filter(i => i !== inst))}
                            onPreview={previewNote}
                        />
                    ))}

                    <div className="addRow">
                        <button onClick={() => setInstruments(list => [...list, makeInstrument()])}>
                            + add instrument
                        </button>
                    </div>
                </div>
            </div>

            <div className="bottomBar">
                <div className="playback">
                    <div className="row">
                        <button onClick={() => setPlaying(p => !p)}>
                            {playing ? '❚❚ pause' : '▶ play'}
                        </button>
                        <button onClick={stop}>■ stop</button>
                    </div>
                    <div className="row">
                        <span className="pos" ref={posLabelRef}>1.1.0</span>
                    </div>
                    <div className="row hint">space play/pause &middot; &larr;/&rarr; measure</div>
                </div>
                <textarea readOnly value={output} />
            </div>
        </div>
    );
}
