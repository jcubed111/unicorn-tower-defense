const GameState = {
    terrain: null,
    mainCanvas: null,
    hoveringTile: null,
    hoveringTower: null,
    runeButtons: [],
    drawType: 0,
    manaDisplay: null,
};

const TOWER_BASE_COSTS =      [, 40, 25, 10];
const TOWER_INCREMENT_COSTS = [,  5,  5,  5];
const MANA_PASSIVE_RATE = 1;
