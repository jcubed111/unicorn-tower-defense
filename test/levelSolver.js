// Browser front-end for the level solver: runs each solution from
// test/levelSolutions.js a number of times and renders the results into the page.
// The node equivalent is test/levelSolverCli.js.

function solveLevel(level, solution) {
    console.time('solveLevel');
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
        GameState.terrain.step(1/30);
    }

    console.timeEnd('solveLevel');

    return [
        GameState.terrain.health,
        GameState.terrain.mana,
    ];
}


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

    for(const {level, tag='', solution} of solutions.reverse()) {
        let totalHealth = 0;
        let totalMana = 0;
        let perfects = 0;
        let passes = 0;
        let towers = new Set();
        for(const attempt of range(ATTEMPTS)) {
            status.innerText = `Running: Level ${level}, attempt ${attempt}/${ATTEMPTS}.`;
            await new Promise(res => setTimeout(res, 10));
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
