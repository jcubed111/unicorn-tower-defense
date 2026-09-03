// Solution step fns. Return true on sucess, false if the action
// can't be done yet.

function buildTowerAt(type, [x, y]) {
    return terrain => terrain.placeTower([x, y], type);
}
function waitForWaveIndex(index) {
    return terrain => {
        const currentWave = terrain.totalWaves - terrain.upcomingWaves.length - 1;
        return currentWave >= index;
    }
}


function solveLevel(level, solution) {
    const remainingSolution = [...solution];

    let done = false;
    let output = null;
    GameState.terrain = getTerrainForLevel(level, out => {
        done = true;
        output = out;
    });

    while(!done) {
        while(remainingSolution.length) {
            const next = remainingSolution[0];
            if(next(GameState.terrain)) {
                remainingSolution.shift();
            }else{
                break;
            }
        }
        GameState.terrain.step(1/60);
    }

    return [
        GameState.terrain.health,
        GameState.terrain.mana,
    ];

    return div('', `Level ${level} solved. ${GameState.terrain.health}/15 hp remaining.`);
}


const solutions = [
    { level: 1, solution: [
        buildTowerAt(2, [8, 9]),
        buildTowerAt(1, [10, 11]),
        waitForWaveIndex(0),
        buildTowerAt(2, [5, 12]),
        waitForWaveIndex(1),
        waitForWaveIndex(2),
        waitForWaveIndex(3),
    ] },
    { level: 2, solution: [
        buildTowerAt(2, [6, 9]),
        buildTowerAt(1, [7, 9]),
        buildTowerAt(2, [5, 13]),
        waitForWaveIndex(0),
        buildTowerAt(2, [6, 9]),
        waitForWaveIndex(1),
        waitForWaveIndex(2),
        waitForWaveIndex(3),
        buildTowerAt(1, [7, 9]),
        waitForWaveIndex(4),
    ] },
    { level: 3, solution: [
        buildTowerAt(1, [6, 3]),
        buildTowerAt(3, [9, 2]),
        buildTowerAt(2, [9, 3]),
        buildTowerAt(3, [9, 2]),
        waitForWaveIndex(0),
        buildTowerAt(3, [9, 2]),
        buildTowerAt(2, [7, 8]),
        waitForWaveIndex(1),
        buildTowerAt(1, [4, 6]),
        waitForWaveIndex(2),
        buildTowerAt(3, [4, 7]),
        buildTowerAt(3, [4, 7]),
        waitForWaveIndex(3),
        buildTowerAt(3, [4, 7]),
        buildTowerAt(2, [9, 3]),
        waitForWaveIndex(4),
        buildTowerAt(2, [9, 3]),
        waitForWaveIndex(5),
        buildTowerAt(1, [4, 6]),
        buildTowerAt(1, [4, 6]),
        buildTowerAt(3, [8, 9]),
    ] },
    { level: 4, solution: [
        buildTowerAt(2, [8, 12]),
        buildTowerAt(2, [7, 12]),
        buildTowerAt(2, [7, 11]),
        buildTowerAt(3, [6, 11]),
        waitForWaveIndex(0),
        buildTowerAt(3, [12, 12]),
        buildTowerAt(3, [6, 11]),
        waitForWaveIndex(1),
        buildTowerAt(3, [6, 11]),
        waitForWaveIndex(2),
        buildTowerAt(2, [7, 11]),
        waitForWaveIndex(3),
        buildTowerAt(2, [7, 11]),
        waitForWaveIndex(4),
        buildTowerAt(1, [12, 13]),
        waitForWaveIndex(5),
        buildTowerAt(2, [7, 12]),
        buildTowerAt(2, [7, 12]),
        waitForWaveIndex(6),
    ] },
    // { level: 4, tag:' only Allegro', solution: [
    //     buildTowerAt(2, [11, 13]),
    //     buildTowerAt(2, [12, 13]),
    //     buildTowerAt(2, [12, 12]),
    //     waitForWaveIndex(0),
    //     buildTowerAt(3, [13, 12]),
    //     buildTowerAt(3, [13, 12]),
    //     buildTowerAt(3, [13, 12]),
    //     waitForWaveIndex(1),
    //     buildTowerAt(2, [12, 12]),
    //     waitForWaveIndex(2),
    //     waitForWaveIndex(3),
    //     buildTowerAt(2, [12, 12]),
    //     buildTowerAt(2, [12, 13]),
    //     waitForWaveIndex(4),
    //     buildTowerAt(2, [12, 13]),
    //     waitForWaveIndex(5),
    //     buildTowerAt(2, [11, 13]),
    //     waitForWaveIndex(6),
    //     buildTowerAt(2, [11, 13]),
    // ] },
    { level: 5, solution: [
        buildTowerAt(2, [11, 14]),
        buildTowerAt(2, [6, 5]),
        buildTowerAt(2, [6, 7]),
        waitForWaveIndex(0),
        buildTowerAt(1, [6, 6]),
        buildTowerAt(3, [5, 6]),
        waitForWaveIndex(1),
        buildTowerAt(3, [5, 6]),
        buildTowerAt(3, [5, 6]),
        waitForWaveIndex(2),
        buildTowerAt(2, [2, 12]),
        waitForWaveIndex(3),
        buildTowerAt(2, [2, 12]),
        waitForWaveIndex(4),
        buildTowerAt(2, [2, 12]),
        waitForWaveIndex(5),
        buildTowerAt(3, [10, 14]),
        buildTowerAt(3, [10, 14]),
        waitForWaveIndex(6),
        buildTowerAt(2, [6, 5]),
        buildTowerAt(1, [6, 6]),
    ] },
    { level: 6, solution: [
        buildTowerAt(2, [4, 10]),
        buildTowerAt(2, [4, 9]),
        buildTowerAt(2, [3, 9]),
        waitForWaveIndex(0),
        buildTowerAt(3, [3, 8]),
        buildTowerAt(3, [3, 8]),
        buildTowerAt(3, [3, 8]),
        waitForWaveIndex(1),
        buildTowerAt(1, [10, 10]),
        waitForWaveIndex(2),
        buildTowerAt(3, [10, 9]),
        waitForWaveIndex(3),
        buildTowerAt(2, [3, 9]),
        waitForWaveIndex(4),
        buildTowerAt(2, [3, 9]),
        waitForWaveIndex(5),
        buildTowerAt(3, [10, 9]),
        buildTowerAt(3, [10, 9]),
        waitForWaveIndex(6),
        buildTowerAt(2, [4, 9]),
        waitForWaveIndex(7),
        buildTowerAt(2, [4, 9]),
        buildTowerAt(2, [4, 10]),
        buildTowerAt(2, [4, 10]),
        buildTowerAt(1, [10, 10]),
        waitForWaveIndex(8),
        buildTowerAt(1, [10, 10]),
    ] },
];

window.onload = async () => {
    const ATTEMPTS = 50;
    // mocks
    GameState.startNextWaveButton = document.createElement('div');
    GameState.runebook = document.createElement('div');
    GameState.waveInfoToast = document.createElement('div');
    window.debugTowerBuildLog = [];
    ParticleSystem.addParticle = () => {};
    ParticleSystem.spawnParticlePixelLine = () => {};
    ParticleSystem.sparkleRect = () => {};
    ParticleSystem.explodeSpritesAt = () => {};
    ParticleSystem.sparkleSpriteAt = () => {};
    ParticleSystem.explodeManaAt = () => {};
    ParticleSystem.spawnFireCircleAt = () => {};
    AudioSystem.scheduleNote = () => {};

    const status = div('');
    document.body.append(status);

    for(const {level, tag='', solution} of solutions) {
        let totalHealth = 0;
        let totalMana = 0;
        let perfects = 0;
        let passes = 0;
        let towers = new Set();
        for(const attempt of range(ATTEMPTS)) {
            status.innerText = `Running: Level ${level}, attempt ${attempt}/${ATTEMPTS}.`;
            await new Promise(res => requestAnimationFrame(res));
            const [health, mana] = solveLevel(level, solution);
            totalHealth += health;
            totalMana += mana;
            perfects += health == 15 ? 1 : 0;
            passes += health > -1 ? 1 : 0;
            GameState.terrain.computedTowersArr.forEach((t, i) => {
                towers.add(`${i}=${t.displayName}(${t.level})`);
            });
        }
        document.body.append(div('solutionRow',
            div('cat', 'Level'), div('num', level, ' ', tag),
            div('cat', 'Health'), div('num', (totalHealth / ATTEMPTS).toFixed(1)),
            div('cat', 'Mana'), div('num', (totalMana / ATTEMPTS).toFixed(1)),
            div('cat', 'Pass'), div('num', (passes / ATTEMPTS * 100).toFixed(0), '%'),
            div('cat', 'Perfect'), div('num', (perfects / ATTEMPTS * 100).toFixed(0), '%'),
            div('', [...towers].toSorted().join(', '))
        ));
    }
    status.innerText = `Done.`;
}
