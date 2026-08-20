'use client';

import { useRef, useState } from 'react';
import {
    CELL_H,
    CELL_W,
    CELLS_PER_MEASURE,
    ROWS,
    TOP_MIDI,
    TOTAL_COLS,
    noteCellText,
} from '../lib/music';

const GRID_W = TOTAL_COLS * CELL_W;
const GRID_H = ROWS * CELL_H;

const MEASURE_W = CELLS_PER_MEASURE * CELL_W;

const gridBackground = {
    backgroundImage: [
        `repeating-linear-gradient(to right, rgba(0,0,0,.28) 0 1px, transparent 1px ${MEASURE_W}px)`,
        `repeating-linear-gradient(to right, rgba(0,0,0,.10) 0 1px, transparent 1px ${CELL_W}px)`,
    ].join(','),
};

function Note({ note, preview }) {
    const cells = [];
    for (let i = 0; i < note.len; i++) {
        cells.push(
            <span key={i} style={{ width: CELL_W }}>{noteCellText(i, note.len)}</span>
        );
    }

    return (
        <div
            className={preview ? 'note preview' : 'note'}
            style={{
                left: note.start * CELL_W,
                top: (TOP_MIDI - note.pitch) * CELL_H,
                width: note.len * CELL_W,
                height: CELL_H,
            }}
        >
            {cells}
        </div>
    );
}

export default function Staff({ notes, keySet, height, scrollRef, onScroll, onNotesChange, onPreview }) {
    const [drag, setDrag] = useState(null);
    const innerRef = useRef(null);

    const cellAt = e => {
        const rect = innerRef.current.getBoundingClientRect();
        const col = Math.floor((e.clientX - rect.left) / CELL_W);
        const row = Math.floor((e.clientY - rect.top) / CELL_H);
        return {
            col: Math.max(0, Math.min(TOTAL_COLS - 1, col)),
            pitch: TOP_MIDI - Math.max(0, Math.min(ROWS - 1, row)),
        };
    };

    const onPointerDown = e => {
        if (e.button !== 0) return;
        const { col, pitch } = cellAt(e);

        const existing = notes.find(
            n => n.pitch === pitch && col >= n.start && col < n.start + n.len
        );
        if (existing) {
            onNotesChange(notes.filter(n => n !== existing));
            return;
        }

        e.currentTarget.setPointerCapture(e.pointerId);
        setDrag({ pitch, start: col, len: 1 });
        onPreview(pitch, 1);
    };

    const onPointerMove = e => {
        if (!drag) return;
        const { col } = cellAt(e);
        const len = Math.max(1, Math.min(TOTAL_COLS - drag.start, col - drag.start + 1));
        if (len !== drag.len) setDrag({ ...drag, len });
    };

    const onPointerUp = () => {
        if (!drag) return;
        const end = drag.start + drag.len;
        // Anything on the same row that this note overlaps gets replaced.
        const kept = notes.filter(
            n => n.pitch !== drag.pitch || n.start + n.len <= drag.start || n.start >= end
        );
        onNotesChange([...kept, drag]);
        setDrag(null);
    };

    const rows = [];
    for (let i = 0; i < ROWS; i++) {
        const pitch = TOP_MIDI - i;
        rows.push(
            <div
                key={pitch}
                className="staffRow"
                style={{
                    height: CELL_H,
                    background: keySet.has(pitch % 12) ? '#fff' : '#eee',
                }}
            />
        );
    }

    return (
        <div
            className="staffScroll"
            ref={scrollRef}
            onScroll={onScroll}
            style={{ width: GRID_W + 16, height }}
        >
            <div
                className="staffInner"
                ref={innerRef}
                style={{ width: GRID_W, height: GRID_H }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
            >
                <div className="rowsLayer">{rows}</div>
                <div className="colhl" style={{ width: CELL_W }} />
                <div className="gridLayer" style={gridBackground} />
                <div className="notesLayer">
                    {notes.map(n => <Note key={`${n.pitch}:${n.start}`} note={n} />)}
                    {drag && <Note note={drag} preview />}
                </div>
            </div>
        </div>
    );
}
