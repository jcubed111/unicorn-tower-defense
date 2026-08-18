const GameState = {
    terrain: null,
    mainCanvas: null,
    hoveringPos: null,
    hoveringTower: null,
    runeButtons: [],
    drawType: 0,
    manaDisplay: null,
    topLeftDisplay: null,
    startNextWaveButton: null,
    hoverInfoEl: null,
};

const TOWER_BASE_COSTS =      [, 45, 30, 10];
const TOWER_INCREMENT_COSTS = [,  5,  5,  5];
const MANA_PASSIVE_RATE = 1;
