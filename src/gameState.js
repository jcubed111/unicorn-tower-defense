const GameState = {
    terrain: null,
    mainCanvas: null,
    cloudBlocker: null,
    hoveringPos: null,
    hoveringTower: null,
    // forces hovering el to resolve to this value; used to allow hovering ui elements
    hoveringElOverride: null,
    runeButtons: [],
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
const TOWER_INCREMENT_COSTS = [,  5,  5,  5];
const MANA_PASSIVE_RATE = 1;

const LS_PREFIX = 'com.jstimac.26.';
const getLocalStorageItem = (key, def=null) => JSON.parse(window.localStorage[LS_PREFIX + key] ?? 'null') ?? def;
const setLocalStorageItem = (key, value) => window.localStorage[LS_PREFIX + key] = JSON.stringify(value);

const withHoverInfo = (el, hoverInfoEl) => {
    el.addEventListener('mouseover', () => GameState.hoveringElOverride = hoverInfoEl);
    el.addEventListener('mouseout', () => GameState.hoveringElOverride = null);
    return el;
};
