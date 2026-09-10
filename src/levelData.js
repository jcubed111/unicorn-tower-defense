const makeLevelSelectTerrain = cb => new LevelSelectTerrain(
    '....................p...q...r........................m...........................o...................l.............n.......h...........i..........................k..j...e..f.................................g...a..b...c..d...................................',
    cb,
    ...levelData[0],
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
    const passedLevels = getLevelSet('p');
    return levelDeps.map(deps => deps.some(d => passedLevels.has(d)));
};
// 'p' = levels passed, 'q' = levels perfected. Level 0 is always in both.
const getLevelSet = key => new Set((getLocalStorageItem(key) ?? '0').split(',').map(v => +v));
const setLevelPassed = (n, isPerfect) => {
    setLocalStorageItem('p', [...getLevelSet('p'), n]);
    if(isPerfect) setLocalStorageItem('q', [...getLevelSet('q'), n]);
};

const getTerrainForLevel = (n, resolveCb) => new Terrain(resolveCb, ...levelData[n]);

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

// Levels are tuples. Slots are all optional, leave a hole for a gap:
//   0 preLevelStoryContent()
//   1 goalLocation  [x, y]
//   2 waves         [EnemyCls, ...]
//   3 terrainString
//   4 narwhalData   collapsed as [path, ...waveIndices]
//   5 extraSetup(terrain)
//   6 postLevelStoryContent()  // only on success, after clicking continue
// The slot order is space-optimized, sorry future me :( -- slot 0 first because
// most levels have story and few have anything in 4-6.
//
// Level N lives at levelData[N]. Index 0 is the level select map -- there is no
// level 0 -- and the home screen sits on the end at levelData.at(-1), so neither
// screen shifts the level indices. Keep it last if you add a level. Every
// terrain is built as `new Terrain(onEndCb, ...levelData[i])`; slot 0 is the
// one Terrain itself ignores. LevelSelectTerrain takes its level index string
// ahead of that, since it's the only caller that has one.
const levelData = [
    // The level select screen
    [
        ,
        [21, 21],
        [],
        '...7.3.3./.3.3.3./.././//////.....00......./....04.1.1.125........0/.3.6..00......................00..2/.3/;3.62...7.3./.6........00........../03.;.....22........4./.3.3./.3.;.../03.3./03.62......./.3.3./.3.3.30/.3.30/../',
    ],
    // Level 1
    [
        async () => {
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
        [2, 12],
        [
            Enemy,
            Enemy,
            SwarmEnemy,
            Enemy,
        ],
        '......////./......./////.............././///////////////...................././////////.......................////////..////.................7.3//////././..............././0/...././//./././/....../././//////.//./././///./',
    ],
    // Level 2
    [
        () => showEventText()(
            wrapEventImage(Lightning.sourcePattern.makeElement()),
            `Multiple runes can be combined to make stronger towers.\n\nTry making a lightning tower from a red and green rune.`,
        ),
        [3, 13],
        [
            SwarmEnemy,
            Enemy,
            SwarmEnemy,
            Enemy,
            SwarmEnemy,
        ],
        '......////////////.3.6................/////////..../2/................////////..////////.3.6..........////////./.././.....22...........././/////////////////./..............00....00....//////.........///////////////////////.........././././././././././',
    ],
    // Level 3
    [
        () => showEventText()(
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
        [8, 8],
        [
            Enemy,
            Rhinoicorn,
            SwarmEnemy,
            Rhinoicorn,
            Enemy,
            Rhinoicorn,
        ],
        '.........7.3.6..//......................0/.///////////././............/////...././//////////........///////////////////////.//......////..//////////./././..//.....././/./../////////////////........././///////././///////................./././././',
    ],

    // Level 4 (parallel to 5) Mob focus
    [
        runOrbPonder(Lightning),
        [14, 14],
        [
            Enemy,
            SwarmEnemy,
            Enemy,
            RunnerEnemy,
            SwarmEnemy,
            Enemy,
            RunnerEnemy,
        ],
        '.....././/////.3.3.3.6.............///////////./.3./////////....../////////////..././///////./.....././0.../0/././.....7//////......////////////////3.;...////....////////////////////..70;......./////////////////....///////..../././././...04.1951././././',
    ],

    // Level 5 (parallel to 4) Armor focus
    [
        runOrbPonder(Charge),
        [3, 15],
        [
            Enemy,
            Rhinoicorn,
            Enemy,
            Rhinoicorn,
            Pegacorn,
            Rhinoicorn,
            Rhinoicorn,
        ],
        '.......././././0/././................////./...00../././/./........./////..//////////..////////....//////..//////////..////////....//////../././0/./...///////......././././...00.././/////..........///.//.3///.//..././...........././//.../././..././',
        ,  // narwhals
        terrain => {
            terrain.rawTowers[10][13] = [3, 1];
            terrain.rawTowers[11][13] = [3, 1];
            terrain.rawTowers[10][14] = [3, 1];
        },
    ],

    // Level 6: This level is actually pretty hard as written,
    // cause runner + boss are very different. Miniboss.
    [
        ,
        [10, 15],
        [
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
        '....//////////////.3.6.............././././0/./.....22....................4.1.////1.5................/././....22......////////....//////////.125..703/3/62////...././//////.......00/./.22............2:.3.3.37;3.;.....2/...........................///////./',
        [
            [[0, -1], [0, 3], [8, 7], [8, 16]],
            5,
        ],
    ],
    // Level 7: Optional - no 2x2 tower spots
    [
        runOrbPonder(ManaLeech),
        [1, 13],
        [
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
        '........//.///..//.///..//.///...........///./...///./...///./....703.3.//.////.//.////.//.///....0/./...///./...///./...///./.....////.//.////.//.////.//.///....//./...///./...///./...///./.....////.//.////.//.////.//.///............04.1.1.125',
    ],
    // Level 8: Rainbowicorn
    [
        runOrbPonder(Poison),
        [9, 14],
        [
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
        '......//////.../////////..............////...//////././.3.62........../////./...././////.125.........../././/////////./............7.3///////./...././//////.6....00......././///.///////...22....04.1///////////./...././////.......././././....././././././',
    ],
    // Level 9
    [
        runOrbPonder(Beam),
        [6, 13],
        [
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
        '......00..././//////././..........703.;.../////////.//////./......4.1.1.80..//////..////..////....703.3.;.....////./////..///.....4.1.1.1.1.80.././././/////......703.3.3.3.;..///////////////....04.1.1.1/1//////////////////............/././././././././',
        [
            [[4, -1], [0, 16]],
            5,
        ],
    ],
    // Level: 10 - all runners
    [
        runOrbPonder(Slow),
        [8, 15],
        [
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
        '....//////////......./././..........//////////....//////////.......7//////////./.././//////.......00.././/////////./0/./0/./......0/././0/..../././././././///..////////////3.////////////////..////////////3./././0/./././......././././.....//////',
    ],
    // Level: 11 - armored
    [
        runOrbPonder(AntiArmor),
        [7, 15],
        [
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
        '.././//////////////////////....../.././//////////////////.......////.././//////////////........./......././//////////...././..............//////////..////////...../////./..//////.....././......././////..././//.............................//',
    ],
    // Level 12: no red
    [
        async () => {
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
        [4, 15],
        [
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
        '...........7.30;....././././...........7.30;......////////////......./0/./.......././////////.....//////////.1.1.1.125...925......//////////.........../2/./.....././//////....7.3.3//////////.........../././0/....//////////........////////////..../././',
        ,  // narwhals
        terrain => {
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
    ],
    // Level: 13: OPTIONAL: no blue
    [
        runOrbPonder(Fire),
        [1, 14],
        [
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
        '........//////.../././..................//////3.//////..//////......703.//////..//////.3//////......00..//////..//////..//////......00.....7.3.3/;/./0..//////....//////////.../././0/././0/./....//////////3.////////////////..../././././',
        ,  // narwhals
        terrain => {
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
    ],
    // Level 14: no green
    [
        runOrbPonder(Ring),
        [7, 10],
        [
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
        '...................././///./......703.6/.///////./...././///./....4.///////././/////./..//////....//////.......///////..//////....////./...////////.....//////...././///./.././.......///////.....70/.////////././/////////.62....4.1.5..././././././...4.1.5',
        ,
        terrain => {
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
    ],

    // Level: 15: Boss level; pegasii and rainbowicorns and broodicorns oh my
    [
        runOrbPonder(Allegro),
        [5, 15],
        [
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
        '.........7.3.6...7.3.6..////////..////.30;..2:.30;..2:.3////////..////.3././././././././.3.3.3.6..././.3//////././//////...9.125..////..//..//....//..//..22....../0/.3.///////././/////..:.3.62..04.1.1/5/./0/././0/./.1.1.1.5............/////////./....////',
    ],

    // Level: 16
    [
        runOrbPonder(Heavy),
        [1, 15],
        [
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
        '........00..................././..////..4.1.1.1.1/1.1.80..//////..././..////////////..00.///////.././......./..7.3.3.30;..//////......////./..00..////./...././......././/////04.1.8/.////./......703.62../././...00...././///./..0/..:.3.3.3.3.3.;........././',
        [
            [[10, -1], [3, 3], [3, 6], [5, 7], [14, 16]],
            4, 10,
        ],
    ],
    // Level: 17
    [
        runOrbPonder(Meteor),
        [1, 15],
        [
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
        '..//.///.///.///.///.///.///.///...7//.///.///.///.///.///.///....04.1//.///.///.///.///.///.6..........//.///.///.///.///.125..................00......./././....703.6:.3.///////./.3////////////////./.3//////////.6/.///////.////////..../././...2:.3.30;',
    ],
    // Level: 18
    [
        () => showEventText()(
            wrapEventImage(spriteListToEl([
                sprites[18].withRot(2),
                sprites[43].withRot(2),
            ])),
            `This is it!\n\nDefeat the Kingicorn and escape with the Golden Horn!`,
        ),
        [7, 15],
        [
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
        '......//////./.3.3.3.3./././......703.////////.3.3.3.3////////./..4.80..................////////...///////3.///////////////////./////////.3.;......././././2....////////././//3.//////./..22...././//////////.3./././///1.5....................////////',
        [
            [[9, 0], [9, 4], [5, 5], [5, 8], [7, 9], [7, 13], [4, 16]],
            5, 15,
        ],
        ,  // extra setup
        () => showEventText()(
            div('C--orbPonderWrapper',
                wrapEl(sprites[42].asImage, el => el.style.width = '40rem'),
                // Indices into orderedTowerTypes in hue order, so the ring reads
                // as a rainbow. Kept here as one permutation rather than a
                // hueOrder on all 16 patterns -- same order, far fewer bytes.
                ...[9, 13, 0, 6, 12, 1, 14, 4, 8, 10, 2, 15, 3, 5, 7, 11]
                    .map(j => orderedTowerTypes[j])
                    .filter(T => new T([]).isDiscovered())
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
    ],
    // Home screen
    [
        ,
        [21, 21],
        [],
        '.....................................7.3.6...///.........//.....7;3/;///////////./...//........./////////////////.//./..........////////////////////////./....../////////...../././/////////..../////................././......./',
        ,
        t => {
            t.placeTower = _ => true;
            t.enemies.add(
                new Narwhalicorn(1, [[2, 0], [18, 1], [13, 6], [16, 17]]),
            );
        },
    ],
];
