const GameState = {
    terrain: null,
    mainCanvas: null,
    hoveringPos: null,
    hoveringTower: null,
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
const getLocalStorageItem = key => JSON.parse(window.localStorage[LS_PREFIX + key] ?? 'null');
const setLocalStorageItem = (key, value) => window.localStorage[LS_PREFIX + key] = JSON.stringify(value);
