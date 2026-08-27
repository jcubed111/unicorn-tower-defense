const makeLevelSelectTerrain = cb => new LevelSelectTerrain(
    '...7.3.3./.3.3.3./.././//////.....00......./....04.1.1.125........0/.3.6..00......................00..2/.3/;3.62...7.3./.6........00........../03.;.....22........4./.3.3./.3.;.../03.3./03.62......./.3.3./.3.3.30/.3.30/../',
    '....................p...q...r........................m...........................o...................l.............n.......h...........i..........................k..j...e..f.................................g...a..b...c..d...................................',
    cb,
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
    const passedLevels = getPassedSet();
    return levelDeps.map(deps => !deps || deps.some(d => passedLevels.has(d)));
};
const getPassedSet = () => {
    return new Set(getLocalStorageItem('p') ?? [0]);
};
const getLevelPerfectedSet = () => {
    return new Set(getLocalStorageItem('q') ?? [0]);
};
const setLevelPassed = (n, isPerfect) => {
    const passedLevels = getPassedSet();
    setLocalStorageItem('p', [...passedLevels, n]);
    if(isPerfect) {
        const perfectedLevels = getLevelPerfectedSet();
        setLocalStorageItem('q', [...perfectedLevels, n]);
    }
};

const getTerrainForLevel = (n, resolveCb) => {
    const terrain = new Terrain(
        levelData[n].goalLocation,
        levelData[n].terrainString,
        levelData[n].waves,
        resolveCb,
    );
    levelData[n].extraSetup?.(terrain);
    return terrain;
}

const runOrbPonder = TowerType => () => {
    if(new TowerType([]).isDiscovered()) return;

    const pattern = TowerType.sourcePattern;
    const gridClone = mapGrid2d(pattern.asGrid, n => n);
    const [px, py] = randChoice(
        grid2dToIndexed(gridClone).filter(g => g[2])
    );
    gridClone[px][py] = [4, 1];

    const mysteryShape = towerGridToElement(
        gridClone,
        pattern.outerColor,
        true,
    );

    return showEventText()(
        div('C--orbPonderWrapper',
            wrapEl(sprites[40].asImage, el => el.style.width = '60rem'),
            wrapEl(mysteryShape,        el => el.style.width = '27rem'),
            wrapEl(sprites[41].asImage, el => el.style.width = '60rem'),
        ),
        `Pondering your orb reveals a vision...`,
    );
};

const levelData = [
    {},
    // Level 1
    {
        // extraSetup() {}
        preLevelStoryContent: async () => {
            await showEventText()(
                wrapEventImage(sprites[31]),
                `An `,
                styled('b', '', `EVIL WIZARD`),
                ` has descended upon the Unicorn Archipelago!\n\n(That's you)`,
            );
            await showEventText()(
                wrapEventImage(sprites[22]),
                `You've stolen the\n`,
                styled('b', '', `GOLDEN HORN,`),
                `\nbut the unicorns want it back.\n\n(Obviously)`,
            );
            await showEventText()(
                wrapEventImage(sprites[18].withRot(2)),
                // // This is +0.5% over just reusing an existing sprite
                // makeSpriteCanvas(ctx => {
                //     renderSprite(ctx, [0, 0], sprites[15]);
                //     renderSprite(ctx, [1, 0], sprites[15]);
                //     renderSprite(ctx, [2, 0], sprites[3]);
                //     renderSprite(ctx, [2, 0], sprites[18].withRot(2));
                //     renderSprite(ctx, [3, 0], sprites[3]);

                //     renderSprite(ctx, [0, 1], sprites[15]);
                //     renderSprite(ctx, [1, 1], sprites[3]);
                //     renderSprite(ctx, [2, 1], sprites[2]);
                //     renderSprite(ctx, [3, 1], sprites[7]);

                //     renderSprite(ctx, [0, 2], sprites[15]);
                //     renderSprite(ctx, [1, 2], sprites[3]);
                //     renderSprite(ctx, [1, 2], sprites[30]);
                //     renderSprite(ctx, [1, 2], sprites[27]);
                //     renderSprite(ctx, [2, 2], sprites[3]);
                //     renderSprite(ctx, [3, 2], sprites[15]);

                //     renderSprite(ctx, [0, 3], sprites[15]);
                //     renderSprite(ctx, [1, 3], sprites[7]);
                //     renderSprite(ctx, [2, 3], sprites[7]);
                //     renderSprite(ctx, [3, 3], sprites[15]);
                // }, 4, 4),
                `Defeat the attacking unicorns and escape with your\n`,
                styled('b', '', `RIGHTEOUSLY STOLEN BOOTY`),
            );
        },
        goalLocation: [2, 12],
        terrainString: '......////./......./////.............././///////////////...................././////////.......................////////..////.................7.3//////././..............././0/...././//./././/....../././//////.//./././///./',
        waves: [
            Enemy,
            Enemy,
            SwarmEnemy,
            Enemy,
        ],
    },
    // Level 2
    {
        preLevelStoryContent: async () => {
            await showEventText()(
                wrapEventImage(Lightning.sourcePattern.makeElement()),
                `Multiple runes can be combined to make stronger towers.\n\nTry making a lightning tower from a red and green rune.`,
            );
        },
        terrainString: '......////////////.3.6................/////////..../2/................////////..////////.3.6..........////////./.././.....22...........././/////////////////./..............00....00....//////.........///////////////////////.........././././././././././',
        goalLocation: [3, 13],
        waves: [
            SwarmEnemy,
            Enemy,
            SwarmEnemy,
            Enemy,
            SwarmEnemy,
        ],
    },
    // Level 3
    {
        preLevelStoryContent: async () => {
            await showEventText()(
                wrapEventImage(towerGridToElement(
                    [
                        [ null,   null, [2, 2] ],
                        [ [2, 1], null, null   ],
                        [ null,   null, [2, 3] ],
                    ],
                    normalizedTowerRgb(0, 1, 0),
                )),
                `Inscribe a rune atop one of the same color to make a stronger version`,
            );
        },
        terrainString: '.........7.3.6..//......................0/.///////////././............/////...././//////////........///////////////////////.//......////..//////////./././..//.....././/./../////////////////........././///////././///////................./././././',
        goalLocation: [8, 8],
        waves: [
            Enemy,
            Rhinoicorn,
            SwarmEnemy,
            Rhinoicorn,
            Enemy,
            Rhinoicorn,
        ],
    },

    // Level 4 (parallel to 5) Mob focus
    {
        preLevelStoryContent: runOrbPonder(Lightning),
        terrainString: '.....././/////.3.3.3.6.............///////////./.3./////////....../////////////..././///////./.....././0.../0/././.....7//////......////////////////3.;...////....////////////////////..70;......./////////////////....///////..../././././...04.1951././././',
        goalLocation: [14, 14],
        waves: [
            Enemy,
            SwarmEnemy,
            Enemy,
            RunnerEnemy,
            SwarmEnemy,
            Enemy,
            RunnerEnemy,
        ],
    },

    // Level 5 (parallel to 4) Armor focus
    {
        preLevelStoryContent: runOrbPonder(Charge),
        extraSetup(terrain) {
            terrain.rawTowers[10][13] = [3, 1];
            terrain.rawTowers[11][13] = [3, 1];
            terrain.rawTowers[10][14] = [3, 1];
            terrain.recomputeDerivedValues();
        },
        terrainString: '.......././././0/././................////./...00../././/./........./////..//////////..////////....//////..//////////..////////....//////../././0/./...///////......././././...00.././/////..........///.//.3///.//..././...........././//.../././..././',
        goalLocation: [3, 15],
        waves: [
            Enemy,
            Rhinoicorn,
            Enemy,
            Rhinoicorn,
            Pegacorn,
            Rhinoicorn,
            Rhinoicorn,
        ],
    },

    // Level 6: This level is actually pretty hard as written,
    // cause runner + boss are very different. Miniboss.
    {
        terrainString: '....//////////////.3.6.............././././0/./.....22....................4.1.////1.5................/././....22......////////....//////////.125..703/3/62////...././//////.......00/./.22............2:.3.3.37;3.;.....2/...........................///////./',
        goalLocation: [10, 15],
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
    // Level 7: Optional - no 2x2 tower spots
    {
        preLevelStoryContent: runOrbPonder(ManaLeech),
        terrainString: '........//.///..//.///..//.///...........///./...///./...///./....703.3.//.////.//.////.//.///....0/./...///./...///./...///./.....////.//.////.//.////.//.///....//./...///./...///./...///./.....////.//.////.//.////.//.///............04.1.1.125',
        goalLocation: [1, 13],
        waves: [
            SwarmEnemy,
            Enemy,
            Enemy,
            SwarmEnemy,
            Enemy,
            Pegacorn,
            Enemy,
            SwarmEnemy,
            SwarmEnemy,
            BossEnemy,
        ],
    },
    // Level 8: Rainbowicorn
    {
        preLevelStoryContent: runOrbPonder(Poison),
        terrainString: '......//////.../////////..............////...//////././.3.62........../////./...././////.125.........../././/////////./............7.3///////./...././//////.6....00......././///.///////...22....04.1///////////./...././////.......././././....././././././',
        goalLocation: [9, 14],
        waves: [
            Enemy,
            Enemy,
            SwarmEnemy,
            Rainbowicorn,
            SwarmEnemy,
            Rhinoicorn,
            Enemy,
            Rhinoicorn,
            Rainbowicorn,
            SwarmEnemy,
        ],
    },
    // Level 9
    {
        preLevelStoryContent: runOrbPonder(Beam),
        terrainString: '......00..././//////././..........703.;.../////////.//////./......4.1.1.80..//////..////..////....703.3.;.....////./////..///.....4.1.1.1.1.80.././././/////......703.3.3.3.;..///////////////....04.1.1.1/1//////////////////............/././././././././',
        goalLocation: [6, 13],
        waves: [
            Enemy,
            Enemy,
            Enemy,
            SwarmEnemy,
            Enemy,
            Rhinoicorn,
            Enemy,
            Pegacorn,
            Enemy,
            SwarmEnemy,
            SwarmEnemy,
        ],
    },
    // Level: 10 - all runners
    {
        preLevelStoryContent: runOrbPonder(Slow),
        terrainString: '....//////////......./././..........//////////....//////////.......7//////////./.././//////.......04.8/.//////////./0/./0/./........0/./0/..../././././././///....//////////3.////////////////...././//////.3././0/././././...................//////',
        goalLocation: [8, 15],
        waves: [
            RunnerEnemy,
            RunnerEnemy,
            RunnerEnemy,
            RunnerEnemy,
            RunnerEnemy,
            RunnerEnemy,
            RunnerEnemy,
            RunnerEnemy,
            RunnerEnemy,
            RunnerEnemy,
            RunnerEnemy,
            RunnerEnemy,
        ],
    },
    // Level: 11 - armored
    {
        preLevelStoryContent: runOrbPonder(AntiArmor),
        terrainString: '.././//////////////////////....../.././//////////////////.......////.././//////////////........./......././//////////...././..............//////////..////////...../////./..//////.....././......././////..././//.............................//',
        goalLocation: [7, 15],
        waves: [
            Rhinoicorn,
            Rhinoicorn,
            Rhinoicorn,
            Rhinoicorn,
            Rhinoicorn,
            Rhinoicorn,
            Rhinoicorn,
            Rhinoicorn,
            Rhinoicorn,
            Rhinoicorn,
            Rhinoicorn,
            Rhinoicorn,
        ],
    },
    // Level 12: no red
    {
        preLevelStoryContent: runOrbPonder(Sniper),
        extraSetup(terrain) {
            terrain.markLocation(
                [5, 8],
                [
                    sprites[26].withColor([0, 0, 0, 255]),
                    sprites[6].withColor([255, 0, 0, 255]),
                ],
                div('',
                    div('C--infoTitle', 'Red Ward'),
                    'Prevents the placement of red runes on this map',
                ),
            );
            terrain.extraTowerValidation = (pos, towerType) => towerType != 1;
        },
        terrainString: '...........7.30;....././././...........7.30;......////////////......./0/./.......././////////.....//////////.1.1.1.125...925......//////////.........../2/./.....././//////....7.3.3//////////.........../././0/....//////////........////////////..../././',
        goalLocation: [4, 15],
        waves: [
            Enemy,
            SwarmEnemy,
            Enemy,
            Rhinoicorn,
            Enemy,
            RunnerEnemy,
            Enemy,
            Rhinoicorn,
            Enemy,
            Rhinoicorn,
            Enemy,
            Megacorn,
        ],
    },
    // Level: 13: OPTIONAL: no blue
    {
        preLevelStoryContent: runOrbPonder(Fire),
        extraSetup(terrain) {
            terrain.markLocation(
                [3, 12],
                [
                    sprites[26].withColor([0, 0, 0, 255]),
                    sprites[10].withColor([112, 99, 255, 255]),
                ],
                div('',
                    div('C--infoTitle', 'Blue Ward'),
                    'Prevents the placement of blue runes on this map',
                ),
            );
            terrain.extraTowerValidation = (pos, towerType) => towerType != 3;
        },
        terrainString: '........//////.../././..................//////3.//////..//////......703.//////..//////.3//////......00..//////..//////..//////......00.....7.3.3/;/./0..//////....//////////.../././0/././0/./....//////////3.////////////////..../././././',
        goalLocation: [1, 14],
        waves: [
            SwarmEnemy,
            Enemy,
            SwarmEnemy,
            RunnerEnemy,
            Enemy,
            SwarmEnemy,
            Enemy,
            Rooicorn,
            Enemy,
            RunnerEnemy,
            Enemy,
            SwarmEnemy,
            RunnerEnemy,
        ],
    },
    // Level 14: no green
    {
        preLevelStoryContent: runOrbPonder(Ring),
        extraSetup(terrain) {
            terrain.markLocation(
                [7, 8],
                [
                    sprites[26].withColor([0, 0, 0, 255]),
                    sprites[10].withColor([0, 204, 0, 255]),
                ],
                div('',
                    div('C--infoTitle', 'Green Ward'),
                    'Prevents the placement of green runes on this map',
                ),
            );
            terrain.extraTowerValidation = (pos, towerType) => towerType != 2;
        },
        terrainString: '...................././///./......703.6/.///////./...././///./....4.///////././/////./..//////....//////.......///////..//////....////./...////////.....//////...././///./.././.......///////.....70/.////////././/////////.62....4.1.5..././././././...4.1.5',
        goalLocation: [7, 10],
        waves: [
            Enemy,
            Rhinoicorn,
            Enemy,
            SwarmEnemy,
            Enemy,
            Pegacorn,
            RunnerEnemy,
            Enemy,
            Rooicorn,
            Enemy,
            SwarmEnemy,
            Enemy,
            RunnerEnemy,
        ],
    },

    // Level: 15: Boss level; pegasii and rainbowicorns and broodicorns oh my
    {
        preLevelStoryContent: runOrbPonder(Allegro),
        terrainString: '.........7.3.6...7.3.6..////////..////.30;..2:.30;..2:.3////////..////.3././././././././.3.3.3.6..././.3//////././//////...9.125..////..//..//....//..//..22....../0/.3.///////././/////..:.3.62..04.1.1/5/./0/././0/./.1.1.1.5............/////////./....////',
        goalLocation: [5, 15],
        waves: [
            Enemy,
            Enemy,
            RunnerEnemy,
            Enemy,
            Enemy,
            Pegacorn,
            Rooicorn,
            Enemy,
            Rainbowicorn,
            Rooicorn,
            Pegacorn,
            Pegacorn,
            Rainbowicorn,
            Rooicorn,
            Enemy,
            BossEnemy,
        ],
    }

    // Level: 16
    // ....///...//..2....////...//..2.../////...//..2../////...///..2..////...////..2..///.../////..2..///33/////...2..///...///....2..////.../....//../////..0...///.../////.0..////....///////////....7//////////...///5.///////....///.............///.............
    // [0, 15]
    // Level: 17
    // Level: 18

        // preLevelStoryContent: runOrbPonder(Heavy),
        // preLevelStoryContent: runOrbPonder(Meteor),
];
