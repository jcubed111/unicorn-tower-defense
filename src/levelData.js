const makeLevelSelectTerrain = cb => new LevelSelectTerrain(
    '........../////..733/333/..///...0......0...2....0.../..41115....0...0.........../36.0...........0.2./36.........0./3;.2.73/6....0...../3;..2....0.....0....2....4/33/3;./33/36..........0..0.2..........0..0./.../33/333/33/...................................',
    '....................p...q...r........................m...........................o...................l.............n.......h...........i..........................k..j...e..f.................................g...a..b...c..d...................................',
    cb,
    getLevelIsUnlockedMap(),
);

const levelDeps = [
    /* 0 : */ [],
    /* 1 : */ [0],
    /* 2 : */ [1],
    /* 3 : */ [2],
    /* 4 : */ [3],
    /* 5 : */ [3],  // nb
    /* 6 : */ [5, 4],
    /* 7 : */ [6],
    /* 8 : */ [6], // nb
    /* 9 : */ [8],
    /* 10: */ [9],
    /* 11: */ [10],
    /* 12: */ [9],  // nb
    /* 13: */ [12],
    /* 14: */ [12],  // nb
    /* 15: */ [14, 11],
    /* 16: */ [15],
    /* 17: */ [16],
    /* 18: */ [17],
];

const getLevelIsUnlockedMap = () => {
    const passedLevels = new Set(getLocalStorageItem('p') ?? [0]);
    return levelDeps.map(deps => !deps || deps.some(d => passedLevels.has(d)));
};
const setLevelPassed = n => {
    const passedLevels = new Set(getLocalStorageItem('p') ?? [0]);
    setLocalStorageItem('p', [...passedLevels, n]);
};

const setCloudTransition = async show => {
    if(GameState.cloudBlocker.classList.contains('C--hide') != show) return;
    const cloudOriginPoints = [
        [18, 233], [105, 207], [186, 226], [265, 208], [200, 145], [283, 133], [122, 140], [34, 141], [7, 103], [75, 82], [157, 86], [234, 71], [283, 47], [231, 23], [141, 19], [77, 21], [12, 25]
    ];
    GameState.cloudBlocker.style.background = cloudOriginPoints
        .map(([px, py], i) =>
            `radial-gradient(circle calc(18rem * log(30 * (var(--s) - ${i / cloudOriginPoints.length / 2}) + 1)) at ${px}rem ${py}rem, #aaa 100%, #0000 100%)`
        ).join(',');
    GameState.cloudBlocker.classList.toggle('C--hide', !show);
    await new Promise(res => setTimeout(res, 500));
};


const levelData = [
    {},
    // Level 1
    {
        goalLocation: [2, 12],
        terrainString: '...//.....//.......///...///......./////////........////////..........//////...........////............////.//.........////.//..........///...........73/////.........0..//////.....///.../.../...///////...///.....///./////...................................',
        waves: [
            Enemy,
            Enemy,
            SwarmEnemy,
            Enemy,
        ],
    },
    // Level 2
    {
        goalLocation: [10, 15],
        terrainString: '..///////.........///////36.......//////..2..........0....2..........41//15............//..............2...////...///..2...////../////.2.7336//../////15.0//2//../////...0//2.....///....0..2......2...73;..2......:333;..../..............///............/////.',
        waves: [
            Enemy,
            Enemy,
            SwarmEnemy,
            Enemy,
            Enemy,
            SwarmEnemy,
            RunnerEnemy,
            Enemy,
            BossEnemy,
        ],
    },
];


const runBattle = async n => {
    setCloudTransition(false);
    // TODO: level-specific intro text
    const pass = await new Promise(resolve => {
        GameState.terrain = new Terrain(
            levelData[n].goalLocation,
            levelData[n].terrainString,
            levelData[n].waves,
            resolve,
        );
    });
    if(pass) {
        console.log('Passed!')
        setLevelPassed(n);
        // TODO: victory/defeat screen
    }else{
        console.log('Failed </3')
        // TODO: victory/defeat screen
    }
    await setCloudTransition(true);
};

const runLevelSelect = async () => {
    setCloudTransition(false);
    GameState.drawType = 7;
    const l = await new Promise(resolve => {
        GameState.terrain = makeLevelSelectTerrain(resolve);
    });
    await setCloudTransition(true);
    GameState.drawType = 0;
    return l;
};

const runGame = async () => {
    await setCloudTransition(true);

    // // On load, if you haven't passed level 1, skip level select
    // // and go to the first level
    // if(!getLevelIsUnlockedMap[2]) {
    //     await runBattle(1);
    // }

    while(true) {
        const l = await runLevelSelect();
        await runBattle(l);
    }
};
