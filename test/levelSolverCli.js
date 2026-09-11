#!/usr/bin/env node
// Headless runner for the level solver. Same simulations as test/levelSolver.html,
// but on the node CLI and printing a stable, diffable text report.
//
//     node test/levelSolverCli.js
//     node test/levelSolverCli.js --levels 7,12-14 --attempts 200
//     node test/levelSolverCli.js > test/levelSolverResults.txt
//
// Game code comes from test/everythingButMain.js (built by `make`), and the
// solutions come from test/levelSolutions.js, which test/levelSolver.html loads
// too, so the browser page and this script never drift apart. The build is untouched; both files are just read and
// evaluated here against a hand-rolled browser stub (see makeBrowserGlobals).
// Nothing renders, so the stub only has to be deep enough for module-level
// setup and for the code paths Terrain.step touches.

const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const {Worker, isMainThread, parentPort} = require('worker_threads');

const TEST_DIR = __dirname;
const GAME_SRC = path.join(TEST_DIR, 'everythingButMain.js');
const SOLUTIONS_SRC = path.join(TEST_DIR, 'levelSolutions.js');

const STEP_DT = 1 / 30;
// A solution that never resolves would otherwise spin forever. No real level
// runs anywhere near an hour of simulated time.
const MAX_SIM_SECONDS = 3600;

const DEFAULTS = {
    attempts: 50,
    // 8, because this box's other 2 cores are efficiency cores and pull the run
    // down more than they speed it up. Capped by the actual core count elsewhere.
    jobs: Math.min(8, os.availableParallelism()),
    verbose: false,
    seed: 1,
    levels: null,  // null = every level that has a solution
    out: null,     // null = stdout
};


// ---------------------------------------------------------------- arguments

const USAGE = `Usage: node test/levelSolverCli.js [options]

  --attempts N     simulations per level (default ${DEFAULTS.attempts})
  --levels LIST    comma separated levels and ranges, eg "3,7,12-14"
  --jobs N         worker threads to sim on (default ${DEFAULTS.jobs})
  --seed N         base seed for the run, or "random" (default ${DEFAULTS.seed})
  --out FILE       write the report to FILE instead of stdout
  -v, --verbose    list the towers each level built
  -h, --help       show this message

Results are deterministic for a given --seed/--attempts pair regardless of
--jobs, so the report can be committed and diffed across balance changes.`;

const parseLevelList = spec => {
    const levels = new Set();
    for(const part of spec.split(',')) {
        const range = part.trim().match(/^(\d+)(?:-(\d+))?$/);
        if(!range) die(`bad --levels entry: ${part}`);
        const [lo, hi] = [+range[1], +(range[2] ?? range[1])];
        if(hi < lo) die(`bad --levels range: ${part}`);
        for(let l = lo; l <= hi; l++) levels.add(l);
    }
    return levels;
};

const die = msg => {
    process.stderr.write(`levelSolverCli: ${msg}\n`);
    process.exit(2);
};

const parseArgs = argv => {
    const opts = {...DEFAULTS};
    for(let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        const value = () => argv[++i] ?? die(`${arg} needs a value`);
        switch(arg) {
            case '-h': case '--help':
                process.stdout.write(USAGE + '\n');
                process.exit(0);
            case '--attempts':
                opts.attempts = +value();
                if(!Number.isInteger(opts.attempts) || opts.attempts < 1) die('--attempts must be a positive integer');
                break;
            case '--jobs':
                opts.jobs = +value();
                if(!Number.isInteger(opts.jobs) || opts.jobs < 1) die('--jobs must be a positive integer');
                break;
            case '--levels':
                opts.levels = parseLevelList(value());
                break;
            case '--seed': {
                const raw = value();
                opts.seed = raw === 'random' ? null : +raw;
                if(opts.seed !== null && !Number.isFinite(opts.seed)) die('--seed must be a number or "random"');
                break;
            }
            case '--out':
                opts.out = value();
                break;
            case '-v': case '--verbose':
                opts.verbose = true;
                break;
            default:
                die(`unknown option: ${arg}\n\n${USAGE}`);
        }
    }
    return opts;
};


// ------------------------------------------------------------------- random

// mulberry32. Math.random is the game's only entropy source, so swapping it
// out is enough to make a whole simulation replayable.
const makeRng = seed => {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), a | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
};

const attemptSeed = (base, level, attempt) =>
    (Math.imul(base >>> 0, 0x9E3779B1) ^ Math.imul(level, 0x85EBCA6B) ^ Math.imul(attempt + 1, 0xC2B2AE35)) >>> 0;


// ----------------------------------------------------------- browser stubs

// Just enough DOM/WebAudio to let the game code load and step. Every method is
// inert: nothing here is asserted on, it only has to not throw.
const makeBrowserGlobals = () => {
    const noop = () => {};

    // Canvas 2d contexts are only ever drawn into, so any unknown member can
    // safely answer with a no-op function.
    const ctx2d = new Proxy({}, {
        get: (target, key) => key in target ? target[key] : noop,
        set: (target, key, value) => (target[key] = value, true),
    });

    const makeElement = tagName => {
        const el = {
            tagName,
            className: '',
            innerText: '',
            textContent: '',
            width: 0,
            height: 0,
            offsetWidth: 0,
            offsetHeight: 0,
            style: {setProperty: noop},
            children: [],
            classList: {add: noop, remove: noop, toggle: noop, contains: () => false},
            append: (...children) => el.children.push(...children),
            appendChild: child => (el.children.push(child), child),
            replaceChildren: (...children) => (el.children = children),
            remove: noop,
            addEventListener: noop,
            removeEventListener: noop,
            setAttribute: noop,
            getContext: () => ctx2d,
            toDataURL: () => '',
            getBoundingClientRect: () => ({x: 0, y: 0, top: 0, left: 0, width: 0, height: 0}),
        };
        return el;
    };

    const makeAudioParam = () => ({
        value: 0,
        setTargetAtTime: noop,
        setValueAtTime: noop,
        linearRampToValueAtTime: noop,
        exponentialRampToValueAtTime: noop,
        cancelScheduledValues: noop,
    });
    const makeAudioNode = extra => ({
        connect: node => node,
        disconnect: noop,
        start: noop,
        stop: noop,
        ...extra,
    });

    const htmlEl = makeElement('html');
    const globals = {
        document: {
            createElement: makeElement,
            createTextNode: text => ({text}),
            body: makeElement('body'),
            head: makeElement('head'),
            documentElement: htmlEl,
            all: [htmlEl],
            addEventListener: noop,
        },
        localStorage: {},
        AudioContext: class {
            currentTime = 0;
            destination = makeAudioNode();
            createGain = () => makeAudioNode({gain: makeAudioParam()});
            createOscillator = () => makeAudioNode({frequency: makeAudioParam(), type: 'sine'});
            createBuffer = () => ({getChannelData: () => new Float32Array(1)});
            createBufferSource = () => makeAudioNode({buffer: null});
        },
        Image: class { constructor() { return makeElement('img'); } },
        // Sprites are built with putImageData; nothing here reads the pixels
        // back, so the stub only has to hold onto them.
        ImageData: class {
            constructor(data, width) {
                this.data = data;
                this.width = width;
                this.height = data.length / 4 / width;
            }
        },
        OscillatorNode: class {
            constructor(ctx, options = {}) {
                return makeAudioNode({
                    frequency: makeAudioParam(),
                    type: options.type ?? 'sine',
                });
            }
        },
        innerWidth: 1280,
        innerHeight: 800,
        devicePixelRatio: 1,
        requestAnimationFrame: cb => setTimeout(() => cb(0), 0),
        cancelAnimationFrame: clearTimeout,
        confirm: () => false,
        alert: noop,
        location: {href: '', hash: '', reload: noop},
        navigator: {userAgent: 'node'},
        onload: null,
    };

    // defineProperty rather than Object.assign: node already defines some of
    // these names (localStorage, navigator) as getter-only globals.
    for(const [name, value] of Object.entries(globals)) {
        Object.defineProperty(globalThis, name, {value, writable: true, configurable: true, enumerable: true});
    }
    // The game reads window.localStorage / window.AudioContext / window.innerWidth
    // and the minified build strips `window.` entirely, so window must be the
    // global object itself rather than a separate stub.
    globalThis.window = globalThis;
    return globals;
};


// ------------------------------------------------------------ loading the game

// Both files are plain scripts, so top level `const`/`function` declarations land
// in the shared global lexical scope and the second file can see the first. The
// trailing snippet hands the bindings we need back out to module scope.
const loadScript = (file, exportNames) => {
    const exportSnippet = exportNames.length
        ? `\n;Object.assign(globalThis.__solverExports, {${exportNames.join(', ')}});`
        : '';
    vm.runInThisContext(fs.readFileSync(file, 'utf8') + exportSnippet, {filename: path.relative(process.cwd(), file)});
};

const loadGame = () => {
    for(const file of [GAME_SRC, SOLUTIONS_SRC]) {
        if(!fs.existsSync(file)) {
            die(`missing ${path.relative(process.cwd(), file)} — run \`make\` first`);
        }
    }

    makeBrowserGlobals();
    globalThis.__solverExports = {};

    loadScript(GAME_SRC, ['GameState', 'ParticleSystem', 'AudioSystem', 'getTerrainForLevel', 'STARTING_HEALTH']);
    loadScript(SOLUTIONS_SRC, ['solutions']);

    const game = globalThis.__solverExports;
    delete globalThis.__solverExports;

    // Headless mocks, matching the ones in levelSolver.js's window.onload.
    const noop = () => {};
    game.GameState.startNextWaveButton = globalThis.document.createElement('div');
    game.GameState.runebook = globalThis.document.createElement('div');
    game.GameState.waveInfoToast = globalThis.document.createElement('div');
    game.GameState.topLeftDisplay = globalThis.document.createElement('div');
    globalThis.debugTowerBuildLog = [];
    for(const method of ['addParticle', 'spawnParticlePixelLine', 'sparkleRect', 'explodeSpritesAt',
                         'sparkleSpriteAt', 'explodeManaAt', 'spawnFireCircleAt', 'clear', 'render']) {
        game.ParticleSystem[method] = noop;
    }
    game.AudioSystem.scheduleNote = noop;

    return game;
};


// ---------------------------------------------------------------- simulating

// One playthrough. Returns null if the solution never finished, which means
// either a step that can never succeed or a level that can't end.
const runSolution = (game, level, solution) => {
    const remaining = [...solution];
    let ended = false;
    let won = null;

    const terrain = game.GameState.terrain = game.getTerrainForLevel(level, didWin => {
        ended = true;
        won = didWin;
    });

    for(let elapsed = 0; !ended; elapsed += STEP_DT) {
        if(elapsed > MAX_SIM_SECONDS) return null;
        // Apply as many pending steps as are currently possible, then advance.
        while(remaining.length && remaining[0](terrain)) remaining.shift();
        terrain.step(STEP_DT);
    }

    return {
        won,
        health: terrain.health,
        mana: terrain.mana,
        // outerColor is the tower pattern's outline colour, used to tint the report.
        towers: terrain.computedTowersArr.map(t => ({
            label: `${t.displayName}(${t.level})`,
            color: t.constructor.sourcePattern?.outerColor,
        })),
    };
};

const realRandom = Math.random;

// One attempt. The seed depends only on (seed, level, attempt), so attempts are
// independent of each other and of the order they get run in -- which is what
// lets them be spread across threads without changing the report.
const runAttempt = (game, {level, solution}, seed, attempt) => {
    Math.random = seed === null ? realRandom : makeRng(attemptSeed(seed, level, attempt));
    const result = runSolution(game, level, solution);
    Math.random = realRandom;
    return result;
};
const emptyStats = ({level, tag = ''}) =>
    ({level, tag, completed: 0, health: 0, mana: 0, passes: 0, perfects: 0, errors: 0, towers: []});

const accumulate = (stats, result, startingHealth) => {
    if(!result) {
        stats.errors++;
        return;
    }
    stats.completed++;
    stats.health += result.health;
    stats.mana += result.mana;
    stats.passes += result.health > -1 ? 1 : 0;
    stats.perfects += result.health == startingHealth ? 1 : 0;
    // towers[slot] maps every variant that slot held across attempts to its colour.
    result.towers.forEach(({label, color}, slot) =>
        (stats.towers[slot] ??= new Map()).set(label, color));
};

// Queued in report order (hardest level first), so levels finish roughly in the
// order they're printed and the report can stream out as it goes.
const buildQueue = (selected, opts) => {
    const queue = [];
    for(const entry of selected) {
        for(let attempt = 0; attempt < opts.attempts; attempt++) {
            queue.push({level: entry.level, attempt, seed: opts.seed});
        }
    }
    return queue;
};

const simulateSerial = (game, selected, opts, hooks) => {
    for(const entry of selected) {
        const stats = emptyStats(entry);
        for(let attempt = 0; attempt < opts.attempts; attempt++) {
            accumulate(stats, runAttempt(game, entry, opts.seed, attempt), game.STARTING_HEALTH);
            hooks.onAttempt();
        }
        hooks.onLevel(stats);
    }
};

// Each worker is its own V8 isolate, so it gets a private copy of the game's
// globals (GameState.terrain, the Math.random swap, the DOM stubs). That's the
// whole reason this parallelises cleanly -- nothing is shared, so nothing needs
// locking. Workers pull one attempt at a time off the queue rather than taking
// a fixed slice, which keeps every thread busy to the end of the run.
const simulateParallel = (game, selected, opts, hooks) => new Promise((resolve, reject) => {
    const queue = buildQueue(selected, opts);
    const statsByLevel = new Map(selected.map(e => [e.level, emptyStats(e)]));
    const workers = [];
    let next = 0;
    let done = 0;

    const pump = worker => {
        if(next >= queue.length) return false;
        worker.postMessage(queue[next++]);
        return true;
    };

    const fail = err => {
        workers.forEach(w => w.terminate());
        reject(err);
    };

    for(let i = 0; i < Math.min(opts.jobs, queue.length); i++) {
        const worker = new Worker(__filename);
        workers.push(worker);
        worker.on('error', fail);
        worker.on('message', ({level, result}) => {
            const stats = statsByLevel.get(level);
            accumulate(stats, result, game.STARTING_HEALTH);
            hooks.onAttempt();
            // Levels can finish out of order; the emitter re-sequences them.
            if(stats.completed + stats.errors == opts.attempts) hooks.onLevel(stats);
            if(!pump(worker)) worker.terminate();
            if(++done == queue.length) resolve();
        });
        if(!pump(worker)) worker.terminate();
    }
});

// Worker side: load the game once, then answer attempts until the pool cuts us off.
const runWorker = () => {
    const game = loadGame();
    const byLevel = new Map(game.solutions.map(entry => [entry.level, entry]));
    parentPort.on('message', task => {
        parentPort.postMessage({
            level: task.level,
            result: runAttempt(game, byLevel.get(task.level), task.seed, task.attempt),
        });
    });
};


// ----------------------------------------------------------------- reporting

// ANSI truecolor, and only ever to a terminal -- a report written to a file or
// piped onward stays plain so it can be committed and diffed.
const ANSI_RESET = '\x1b[0m';
const noPaint = {fg: (text) => text, rate: (text) => text, enabled: false};

const makePainter = enabled => enabled ? {
    enabled: true,
    fg: (text, [r, g, b] = [255, 255, 255]) => `\x1b[38;2;${r};${g};${b}m${text}${ANSI_RESET}`,
    // #f00 at 0% through #0c0 at 100%, white text on top.
    rate: (text, ratio) =>
        `\x1b[48;2;${Math.round(255 * (1 - ratio))};${Math.round(204 * ratio)};0m\x1b[97m${text}${ANSI_RESET}`,
} : noPaint;

const pct = (v, n) => `${n ? (v / n * 100).toFixed(0) : 0}%`.padStart(4);
// Widths are fixed so the numbers line up down the report, across levels.
const avg = (v, n, width) => (n ? v / n : 0).toFixed(1).padStart(width);

// Errored attempts never produced a game, so they're excluded from the
// averages and rates rather than counted as losses; error% is out of all
// attempts.
const summaryLine = (s, attempts, paint) => {
    const rate = (v, n) => paint.rate(pct(v, n), n ? v / n : 0);
    return `hp = ${avg(s.health, s.completed, 5)}; mana = ${avg(s.mana, s.completed, 7)}; `
        + `${rate(s.passes, s.completed)} pass; ${rate(s.perfects, s.completed)} perfect; `
        + `${pct(s.errors, attempts)} error`;
};

// One block per level, so a balance change to one level touches only its own
// lines in the diff.
// Labels share a fixed width so the summaries line up under each other.
const label = text => `${text}`.padStart(8);

const formatLevelBlock = (stats, attempts, paint, verbose) => {
    const lines = [
        `${label(`Level ${stats.level}`)}; ${summaryLine(stats, attempts, paint)}`
        + (stats.tag ? `; ${stats.tag}` : ''),
    ];
    if(verbose && stats.towers.length) {
        lines.push('Towers (grouped by index):');
        for(const variants of stats.towers) {
            const labels = [...(variants ?? new Map())].sort(([a], [b]) => a.localeCompare(b));
            lines.push(`    - ${labels.map(([label, color]) => paint.fg(label, color)).join(' / ')}`);
        }
    }
    return lines;
};


// ---------------------------------------------------------------------- main

// Levels can complete out of order in the pool, so blocks are buffered and
// released in level order -- the stream stays readable and the file it writes
// is identical to what scrolled past.
const makeEmitter = (selected, write) => {
    const pending = new Map();
    let nextIndex = 0;
    return stats => {
        pending.set(stats.level, stats);
        while(nextIndex < selected.length && pending.has(selected[nextIndex].level)) {
            write(pending.get(selected[nextIndex].level));
            nextIndex++;
        }
    };
};

const main = async () => {
    const opts = parseArgs(process.argv.slice(2));
    const game = loadGame();

    // Highest level first: those are the ones being balanced, so they should
    // land at the top of the report and come back first from the pool.
    const selected = game.solutions
        .filter(s => !opts.levels || opts.levels.has(s.level))
        .sort((a, b) => b.level - a.level);

    if(!selected.length) die('no solutions matched --levels');

    // With --out the file is written as it goes, so `tail -f` shows the run live.
    const fd = opts.out ? fs.openSync(opts.out, 'w') : null;
    const paint = makePainter(fd === null && !!process.stdout.isTTY && !process.env.NO_COLOR);
    const isTty = process.stderr.isTTY;
    const total = selected.length * opts.attempts;
    const startedAt = Date.now();

    let done = 0;
    const drawProgress = () => {
        if(isTty) process.stderr.write(`\r\x1b[KSimulating: ${done}/${total} attempts`);
    };
    const putLines = lines => {
        if(isTty) process.stderr.write('\r\x1b[K');
        const text = lines.join('\n') + '\n';
        fd === null ? process.stdout.write(text) : fs.writeSync(fd, text);
        drawProgress();
    };

    const emit = makeEmitter(selected, stats => putLines(formatLevelBlock(stats, opts.attempts, paint, opts.verbose)));
    const hooks = {
        onAttempt: () => (done++, drawProgress()),
        onLevel: emit,
    };

    // --jobs 1 stays in-process: one less moving part when something needs debugging.
    if(opts.jobs > 1) {
        await simulateParallel(game, selected, opts, hooks);
    }else{
        simulateSerial(game, selected, opts, hooks);
    }

    if(isTty) process.stderr.write('\r\x1b[K');
    if(fd !== null) {
        fs.closeSync(fd);
        process.stderr.write(`Wrote ${opts.out}\n`);
    }

    const jobs = opts.jobs > 1 ? `${Math.min(opts.jobs, total)} threads` : '1 thread';
    process.stderr.write(`Done in ${((Date.now() - startedAt) / 1000).toFixed(1)}s on ${jobs}\n`);
};

// require.main is this file inside a worker too, so isMainThread is what actually
// separates "run the report" from "be a worker".
if(!isMainThread) {
    runWorker();
}else if(require.main === module) {
    main().catch(err => die(err.stack ?? err));
}

// Exported so other scripts (one-off experiments, solution searches) can drive
// the same headless game without going through the report.
module.exports = {loadGame, runSolution, runAttempt, makeRng, attemptSeed};
