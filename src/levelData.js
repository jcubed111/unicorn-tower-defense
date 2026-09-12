const makeLevelSelectTerrain = cb => new LevelSelectTerrain(
    '...........s........p...q...r........................m...........................o...................l.............n.......h...........i..........................k..j...e..f.................................g...a..b...c..d...................................',
    levelData[0],
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
    /* 19: */ [18],
];

const getLevelIsUnlockedMap = () => {
    const passedLevels = getLevelSet('p');
    return levelDeps.map(deps => deps.some(d => passedLevels.has(d)));
};
// 'p' = levels passed, 'q' = levels perfected. Level 0 is always in both.
const getLevelSet = key => new Set((getLocalStorageItem(key) ?? '0').split(',').map(v => +v));
const setLevelPassed = (n, isPerfect) => {
    setLocalStorageItem('p', [...getLevelSet('p'), n]);
    if(isPerfect) setLocalStorageItem('q', [...getLevelSet('q'), n]);
};

const getTerrainForLevel = (n, resolveCb) => {
    const level = levelData[n];
    return new Terrain(
        level.goalLocation,
        level.terrainString,
        level.waves,
        resolveCb,
        level.narwhalData,
        level.extraSetup,
    );
};

const runOrbPonder = TowerType => () => {
    if(new TowerType([]).isDiscovered()) return;

    const pattern = TowerType.sourcePattern;
    const gridClone = mapGrid2d(pattern.asGrid, n => n);
    const filledSquares = grid2dToIndexed(gridClone).filter(g => g[2]);
    const [px, py] = filledSquares[(100 + ~~pattern.hueOrder) % filledSquares.length];
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

// Levels are objects; every field is optional.
//
// Level N lives at levelData[N]. Index 0 is the level select map -- there is no
// level 0 -- and the home screen sits on the end at levelData.at(-1), so neither
// screen shifts the level indices. Keep it last if you add a level.
const levelData = [
    // The level select screen
    {
        goalLocation: [21, 21],
        terrainString: '........../////..733/333/..///...0......0...2....0.../..41115....0...0.........../36.0...........0.2./36.........0./3;.2.73/6....0...../3;..2....0.....0....2....4/33/3;./33/36..........0..0.2..........0..0./.../33/333/33/',
        waves: [],
    },
    // Level 1
    {
        preLevelStoryContent: async () => {
            await showEventText()(
                wrapEventImage(sprites[31]),
                `An `,
                styled('b', '', `EVIL RUNE MAGE`),
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
                `Defeat the attacking unicorns and escape with your\n`,
                styled('b', '', `RIGHTEOUSLY STOLEN BOOTY`),
            );
        },
        goalLocation: [2, 12],
        terrainString: '...//.....//.......///...///......./////////........////////..........//////...........////............////.//.........////.//..........///...........73/////.........0..//////.....///.../.../...///////...///.....///./////',
        waves: [
            Enemy,
            Enemy,
            SwarmEnemy,
            Enemy,
        ],
    },
    // Level 2
    {
        preLevelStoryContent: () => showEventText()(
            wrapEventImage(Lightning.sourcePattern.makeElement()),
            `Multiple runes can be combined to make stronger towers.\n\nTry making a lightning tower from a red and green rune.`,
        ),
        goalLocation: [3, 13],
        terrainString: '...//////..........//////36......../////..2........////..//........////.////.......////.////36.....////..//..2...../////.....2......//////////.......//////////.......0..0..///.......0..0..///.....///////////....////////////.....//////////',
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
        preLevelStoryContent: () => showEventText()(
            wrapEventImage(towerGridToElement(
                [
                    [       ,   , [2, 2] ],
                    [ [2, 1],   ,        ],
                    [       ,   , [2, 3] ],
                ],
                normalizedTowerRgb(0, 1, 0),
            )),
            `Inscribe a rune atop one of the same color to make a stronger version`,
        ),
        goalLocation: [8, 8],
        terrainString: '......../...........736./...........0./////........./////////......///.../////.....//..///////..../////////////...///////////./...//./////..../...//.////////./...//../////////....//.////////...../////..////....../////////........./////',
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
        goalLocation: [14, 14],
        terrainString: '...////.............///3336......./////...////...///////3/////...///////./////...//////.../////...//..0.....///....0.////..7///...////////3;.//...////////...//..//////////.7;...//////////.0..../////////..///..////////..////../////.0.91////........415',
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
        goalLocation: [3, 15],
        terrainString: '....///////............0...........///.0.///......//...0...//.....//./////.////..///./////.////..///./////.////..///./////.////..///./////.////..///...0...///....////.0.////..........0..///.....///.///........././3/././/......///.///.//......./',
        waves: [
            Enemy,
            Rhinoicorn,
            Enemy,
            Rhinoicorn,
            Pegacorn,
            Rhinoicorn,
            Rhinoicorn,
        ],
        extraSetup: terrain => {
            terrain.rawTowers[10][13] = [3, 1];
            terrain.rawTowers[11][13] = [3, 1];
            terrain.rawTowers[10][14] = [3, 1];
        },
    },
    // Level 6: This level is actually pretty hard as written,
    // cause runner + boss are very different. Miniboss.
    {
        goalLocation: [10, 15],
        terrainString: '..///////.........///////36.......//////..2..........0....2..........41//15............//..............2...////...///..2...////../////.2.7336//../////15.0//2//../////...0//2.....///....0..2......2...73;..2......:333;..../..............///............/////',
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
        narwhalData: [
            [[0, -1], [0, 3], [8, 7], [8, 16]],
            5,
        ],
    },
    // Level 7: Optional - no 2x2 tower spots
    {
        preLevelStoryContent: runOrbPonder(ManaLeech),
        goalLocation: [1, 13],
        terrainString: '...././././././.....///.///.///....../.../.../......///.///.///..733/.///.///./..0..///.///.///..0.../.../.../...//.///.///.///...///.///.///./..//.///.///.///../.../.../.../...//.///.///.///...///.///.///./..//.///.///.///......0...2...........41115',
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
        goalLocation: [9, 14],
        terrainString: '...///..////.......///./////.......//../////36.....//.///....2.....////...//.2.....//...////15........//////.......///////........./////...///...73///.../////6..0.....//////.2..0...///.///..2..0.///////...//..41/////...////....////..//////',
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
        goalLocation: [6, 13],
        terrainString: '...0...///.........0.///////.....73;.////////....0...////.////...4118.///.//.//.....0.///.//.//..733;..//.//.//..0...../////./...411118.//////........0....///...73333;.///////..0.....////////..0...//////////..41111/////////....../////////',
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
        narwhalData: [
            [[4, -1], [0, 16]],
            5,
        ],
    },
    // Level: 10 - all runners
    {
        preLevelStoryContent: runOrbPonder(Slow),
        goalLocation: [8, 15],
        terrainString: '../////.........../////...///...../////../////..../////../////..../////../////...7//////..///....0.//////.0.0....0..//////////...0..0..////////..////........//.//////3////////.//////.////////.//////3///////..//////...0.......////..///.............///',
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
        goalLocation: [7, 15],
        terrainString: './////////////....///////////.....///////////.../../////////....//./////////....//..///////...../...///////........../////..//......./////.////....../////.////...//..///...//...////.///........////.///.........//.../.............../.............../',
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
        preLevelStoryContent: async () => {
            await runOrbPonder(Sniper)();
            await showEventText()(
                wrapEventImage(spriteListToEl([
                    sprites[3],
                    sprites[26].withColor([0, 0, 0, 255]),
                    sprites[6].withColor([255, 0, 0, 255]),
                ])),
                `A `,
                styled('b', '', `WARD`),
                ` prevents the placement of a certain color rune.`,
            );
        },
        goalLocation: [4, 15],
        terrainString: '.......0.............73;..////.......0...//////....73;...//////....0.....//////...///.....////.../////....2..2.../////11115.95.../////......2..../////.....///.../////..../////...///..733/////........0../////.....////../////....//////..///.....//////',
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
        extraSetup: terrain => {
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
    },
    // Level: 13: OPTIONAL: no blue
    {
        preLevelStoryContent: runOrbPonder(Fire),
        goalLocation: [1, 14],
        terrainString: '....///.............///.///.........///3///.///.....///.///.///...73///.///.///...0.///.///3///...0.///.///.///...0.///.///.///...0.....///.///...0..733;.0.///../////....0..0.../////.////////../////3////////../////.////////../////',
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
        extraSetup: terrain => {
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
    },
    // Level 14: no green
    {
        preLevelStoryContent: runOrbPonder(Ring),
        goalLocation: [7, 10],
        terrainString: '..........///..............///...736.///...///...0.//////...///..4////////..///...///..////.///..///....///.///..///...////.///..//...////..///..///.////...///..///..//...////...///......///...7/////../////6..0.//////////.2..415.//////.415',
        waves: [
            Enemy,
            Rhinoicorn,
            Enemy,
            Pegacorn,
            Enemy,
            SwarmEnemy,
            Enemy,
            Enemy,
            SwarmEnemy,
            RunnerEnemy,
            Enemy,
            SwarmEnemy,
            RunnerEnemy,
        ],
        extraSetup: terrain => {
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
            terrain.rawTowers[6][10] = [1, 1];
        },
    },
    // Level: 15: Boss level; pegasii and rainbowicorns and broodicorns oh my
    {
        preLevelStoryContent: runOrbPonder(Allegro),
        goalLocation: [5, 15],
        terrainString: '............////....736.736.////.//.0.2.0.2.////.//3;.:3;.:3////.//..............//3////////3336....///..///...2.//3////////.915.//././.././.2...//././.././.2...//3////////.:36.0..///..///...2.0..////////1115.4115.0..0............////...//......//////..//',
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
    },
    // Level: 16
    {
        preLevelStoryContent: runOrbPonder(Heavy),
        goalLocation: [1, 15],
        terrainString: '....0...............0.........//.//.41111118.///.//...../..0.///....//////.0.///.//.//////.0////.//.../....0.///.......7333;.///...//..0.//...//...///.0.///.......////0..///.......///418.///...736.///.0..///..0.2.....0...///.0.:33333;....//./',
        waves: [
            Enemy,
            Enemy,
            SwarmEnemy,
            Rhinoicorn,
            Enemy,
            Pegacorn,
            Enemy,
            RunnerEnemy,
            Megacorn,
            Enemy,
            SwarmEnemy,
            Rhinoicorn,
            Enemy,
            Pegacorn,
            Enemy,
            Megacorn,
            Enemy,
            Rhinoicorn,
        ],
        narwhalData: [
            [[10, -1], [3, 3], [3, 6], [5, 7], [14, 16]],
            4, 10,
        ],
    },
    // Level: 17
    {
        preLevelStoryContent: runOrbPonder(Meteor),
        goalLocation: [1, 15],
        terrainString: './././././././././//////////////../././././././..7/////////////..0././././././...41///////////6...../././././.2...../////////15.........0...............0...///..736..///../////.0.:3/////3////////../////./////////3/////6.///.////..///.2..0..////......:33;',
        waves: [
            Enemy,
            SwarmEnemy,
            Enemy,
            SwarmEnemy,
            Enemy,
            SwarmEnemy,
            Enemy,
            Rooicorn,
            Pegacorn,
            Rooicorn,
            Pegacorn,
            Rooicorn,
            Pegacorn,
            Enemy,
            SwarmEnemy,
            Rooicorn,
            SwarmEnemy,
            Rooicorn,
            SwarmEnemy,
            Rooicorn,
        ],
    },
    // Level: 18
    {
        preLevelStoryContent: () => showEventText()(
            wrapEventImage(spriteListToEl([
                sprites[18].withRot(2),
                sprites[43].withRot(2),
            ])),
            `This is it!\n\nDefeat the Kingicorn and escape with the Golden Horn!`,
        ),
        goalLocation: [7, 15],
        terrainString: '...///.............////3333///...73////....////..0.////3333/////.48.........////..0.........////..///3//////////.////./////////./////3;...////..////.........2..////../3///..2..///////.////.2..///////3////15.../////....//............////...........////',
        waves: [
            Megacorn,
            SwarmEnemy,
            Pegacorn,
            Megacorn,
            SwarmEnemy,
            Pegacorn,
            Enemy,
            Rooicorn,
            Enemy,
            Rooicorn,
            Rhinoicorn,
            SwarmEnemy,
            SwarmEnemy,
            SwarmEnemy,
            Enemy,
            Rooicorn,
            Megacorn,
            Megacorn,
            Enemy,
            Pegacorn,
            Kingicorn,
        ],
        narwhalData: [
            [[9, 0], [9, 4], [5, 5], [5, 8], [7, 9], [7, 13], [4, 16]],
            5, 15,
        ],
        postLevelStoryContent: () => showEventText()(
            div('C--orbPonderWrapper',
                wrapEl(sprites[42].asImage, el => el.style.width = '40rem'),
                // Sorted by hue so the ring of runes reads as a rainbow.
                ...orderedTowerTypes
                    .filter(T => new T([]).isDiscovered())
                    .sort((a, b) => a.sourcePattern.hueOrder - b.sourcePattern.hueOrder)
                    .map((T, i, arr) =>
                        wrapEl(
                            T.sourcePattern.makeElement(1, 3),
                            el => {
                                el.className = 'C--orbit';
                                el.style.animationDelay = `${-6 * i / arr.length}s`;
                            },
                        ),
                    ),
            ),
            `With the unicorns defeated, the Golden Horn is finally yours!`,
        ),
    },
    // Level 19: 99 waves
    {
        goalLocation: [6, 7],
        terrainString: '..///.....///.....///.//...///...////.///...///..///..////..///.////..////..////////..////..////////..0..2...///////.///.:36.///////.////..2.///////..////.:6.///////...///.2.////////..///.2./////////////.2.//./////////..////..///////...////.../////....///',
        waves: [
            Enemy,
            Rhinoicorn,
            Enemy,
            SwarmEnemy,
            Rhinoicorn,
            ...range(10).flatMap(_ => [
                Enemy,
                Rhinoicorn,
                SwarmEnemy,
                RunnerEnemy,
                Pegacorn,
                Rainbowicorn,
                Rooicorn,
                Megacorn,
                BossEnemy,
            ]),
            BossEnemy,
            BossEnemy,
            BossEnemy,
            Kingicorn,
        ],
        narwhalData: [
            [[7, -1], [10,2], [11, 10], [11, 16]],
            ...range(11).map(n => 9 * n + 4),
        ],
    },
    // Home screen
    {
        goalLocation: [21, 21],
        terrainString: '......................................./...../....736.//..../...73;/////.../....;////////./.....//////////......////////.//.....////////////..../////////////.../////..///////..////...../////..///........//...//............../',
        waves: [],
        extraSetup: t => {
            t.placeTower = _ => true;
            t.enemies.add(
                new Narwhalicorn(1, [[2, 0], [18, 1], [13, 6], [16, 17]]),
            );
        },
    },
];
