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
const getLevelPerfectedSet = () => {
    return new Set(getLocalStorageItem('q') ?? [0]);
};
const setLevelPassed = (n, isPerfect) => {
    const passedLevels = new Set(getLocalStorageItem('p') ?? [0]);
    setLocalStorageItem('p', [...passedLevels, n]);
    if(isPerfect) {
        const perfectedLevels = getLevelPerfectedSet();
        setLocalStorageItem('q', [...perfectedLevels, n]);
    }
};

const levelData = [
    {},
    // Level 1
    {
        preLevelStoryContent: async () => {
            await showEventText()(
                sprites[31],
                `An `,
                styled('b', '', `EVIL WIZARD`),
                ` has descended upon the Unicorn Archipelago!\n\n(That's you)`,
            );
            await showEventText()(
                sprites[22],
                `You've stolen the\n`,
                styled('b', '', `GOLDEN HORN,`),
                `\nbut the unicorns want it back.\n\n(Obviously)`,
            );
            await showEventText()(
                sprites[18].withRot(2),
                // // This is +0.5% over just reusing an existing sprite
                // makeSpriteCanvas(ctx => {
                //     renderSprite(ctx, 0, 0, sprites[15]);
                //     renderSprite(ctx, 1, 0, sprites[15]);
                //     renderSprite(ctx, 2, 0, sprites[3]);
                //     renderSprite(ctx, 2, 0, sprites[18].withRot(2));
                //     renderSprite(ctx, 3, 0, sprites[3]);

                //     renderSprite(ctx, 0, 1, sprites[15]);
                //     renderSprite(ctx, 1, 1, sprites[3]);
                //     renderSprite(ctx, 2, 1, sprites[2]);
                //     renderSprite(ctx, 3, 1, sprites[7]);

                //     renderSprite(ctx, 0, 2, sprites[15]);
                //     renderSprite(ctx, 1, 2, sprites[3]);
                //     renderSprite(ctx, 1, 2, sprites[30]);
                //     renderSprite(ctx, 1, 2, sprites[27]);
                //     renderSprite(ctx, 2, 2, sprites[3]);
                //     renderSprite(ctx, 3, 2, sprites[15]);

                //     renderSprite(ctx, 0, 3, sprites[15]);
                //     renderSprite(ctx, 1, 3, sprites[7]);
                //     renderSprite(ctx, 2, 3, sprites[7]);
                //     renderSprite(ctx, 3, 3, sprites[15]);
                // }, 4, 4),
                `Defeat the attacking unicorns and escape with your\n`,
                styled('b', '', `RIGHTEOUSLY STOLEN BOOTY`),
            );
        },
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
    // // Level 3
    // {
    //     goalLocation: [7, 15],
    //     terrainString: './.../.../.../.../////////////.../////////////36./////////////.2./../../../../.2./../../../../.2./////////////.2./////////////15./////////////.../.2.../...2./.../.:36./.915./.../...2./.2.../.../////////////.../////////////.../////////////........./........',
    //     waves: [
    //         Enemy,
    //         Enemy,
    //         SwarmEnemy,
    //         Enemy,
    //         Enemy,
    //         SwarmEnemy,
    //         RunnerEnemy,
    //         Enemy,
    //         BossEnemy,
    //     ],
    // },
];
