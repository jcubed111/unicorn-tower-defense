// Every field here is assigned before its first read (initHtml, main, or
// gameFlow), and the four read early -- hoveringPos/hoveringTower/
// hoveringElOverride/drawType -- only need to be falsy, which `undefined`
// already is. So the initializers are all commented out rather than shipped;
// they're kept as the field list. Worth 16B, since Closure can't prove a
// property write is dead but does strip comments.
const GameState = {
    // pxCssSize: 1,
    // terrain: null,
    // mainCanvas: null,
    // cloudBlocker: null,
    // mainMenu: null,

    // hoveringPos: null,
    // hoveringTower: null,
    // waveInfoToast: null,
    // toastWaveInfo: _ => 0,

    // forces hovering el to resolve to this value; used to allow hovering ui elements
    // hoveringElOverride: null,
    // runeButtons: [],
    // 0 = no draw, 1-3 = runes, 4-6 = spells, 7 = level select
    // drawType: 0,
    // manaDisplay: null,
    // heartDisplay: null,
    // topLeftDisplay: null,
    // startNextWaveButton: null,
    // hoverInfoEl: null,
    // runebook: null,
    // rerenderRunebook: () => 0,  // set in main
    // sidebarEl: null,  // never was in this list; set in initHtml
};

const TOWER_BASE_COSTS =      [, 45, 30, 10];
const TOWER_INCREMENT_COST = 5;
const MANA_PASSIVE_RATE = 1;
const STARTING_MANA = 100;  // +STARTING_WAVE_DELAY in passive mana
const STARTING_HEALTH = 15;
const STARTING_WAVE_DELAY = 30;
const WAVE_DELAY = 20;

const LS_PREFIX = 'com.jstimac.26.';
const getLocalStorageItem = key => JSON.parse(window.localStorage[LS_PREFIX + key] ?? 'null');
const setLocalStorageItem = (key, value) => window.localStorage[LS_PREFIX + key] = JSON.stringify(value);

const withHoverInfo = (el, hoverInfoEl) => {
    el.addEventListener('mouseover', () => GameState.hoveringElOverride = hoverInfoEl);
    el.addEventListener('mouseout', () => GameState.hoveringElOverride = null);
    return el;
};
