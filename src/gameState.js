const GameState = {
    pxCssSize: 1,
    terrain: null,
    mainCanvas: null,
    cloudBlocker: null,
    mainMenu: null,
    sidebarEl: null,

    hoveringPos: null,
    hoveringTower: null,
    waveInfoToast: null,
    toastWaveInfo: _ => 0,

    // forces hovering el to resolve to this value; used to allow hovering ui elements
    hoveringElOverride: null,
    runeButtons: [],
    // 0 = no draw, 1-3 = runes, 4-6 = spells, 7 = level select
    drawType: 0,
    manaDisplay: null,
    heartDisplay: null,
    topLeftDisplay: null,
    startNextWaveButton: null,
    hoverInfoEl: null,
    runebook: null,
    rerenderRunebook: () => 0,  // set in main
};

const TOWER_BASE_COSTS =      [, 45, 30, 10];
const TOWER_INCREMENT_COST = 5;
const MANA_PASSIVE_RATE = 1;
const STARTING_MANA = 100;  // +STARTING_WAVE_DELAY in passive mana
const STARTING_HEALTH = 15;
const STARTING_WAVE_DELAY = 30;
const WAVE_DELAY = 20;

const LS_PREFIX = 'com.jstimac.26.';
// No JSON: localStorage stringifies on write anyway (an array lands as
// "1,2,3"), and every read is either a flag tested for truthiness or a list
// parsed by getLevelSet. Saved games in the wild are in this format -- do not
// change it without a migration.
const getLocalStorageItem = key => window.localStorage[LS_PREFIX + key];
const setLocalStorageItem = (key, value) => window.localStorage[LS_PREFIX + key] = value;

const withHoverInfo = (el, hoverInfoEl) => {
    el.addEventListener('mouseover', () => GameState.hoveringElOverride = hoverInfoEl);
    el.addEventListener('mouseout', () => GameState.hoveringElOverride = null);
    return el;
};
