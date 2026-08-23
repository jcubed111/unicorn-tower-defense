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
    if(GameState.cloudBlocker.classList.contains('C--cloudBlockerHide') != show) return;
    GameState.cloudBlocker.classList.toggle('C--cloudBlockerHide', !show);
    await new Promise(res => setTimeout(res, 500));
};

const time = n => new Promise(res => setTimeout(res, n));
const showEventText = async (sprite, ...text) => {
    var inner;
    const d = scrollDiv('C--eventTextScroll',
        inner = div('C--innerEventTextScroll',
            wrapEl(sprite.asImage ?? sprite, el => {
                el.style.width = '40rem';
                el.style.display = 'inline-block';
            }),
            div('', ' '),
            ...text,
        ),
    );
    GameState.cloudBlocker.replaceChildren(d);
    await time(100);
    d.style.height = inner.offsetHeight + 'px';
    d.style.opacity = '1';

    await time(300);
    await new Promise(res => window.addEventListener('click', res, {once: true}));

    d.style.opacity = '0';
    await time(300);

    GameState.cloudBlocker.replaceChildren();
};

let waveToastStacks = 0;  // ensures an earlier toast won't remove the new toast
GameState.toastWaveInfo = async (title, ...subtext) => {
    GameState.waveInfoToast.replaceChildren(
        div('C--larger', title),
        ...subtext.map(s => div('C--secondary', s)),
    );
    GameState.waveInfoToast.classList.toggle('C--waveInfoToastOut', !++waveToastStacks);
    await time(1500);
    GameState.waveInfoToast.classList.toggle('C--waveInfoToastOut', !--waveToastStacks);
}


const levelData = [
    {},
    // Level 1
    {
        preLevelStoryContent: async () => {
            await showEventText(
                sprites[31],
                `An `,
                styled('b', '', `EVIL WIZARD`),
                ` has descended upon the Unicorn Archipelago!\n\n(That's you)`,
            );
            await showEventText(
                sprites[22],
                `You've stolen the\n`,
                styled('b', '', `GOLDEN HORN,`),
                `\nbut the unicorns want it back.\n\n(Obviously)`,
            );
            await showEventText(
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


const runBattle = async n => {
    await levelData[n].preLevelStoryContent?.();

    setCloudTransition(false);

    (async () => {
        await time(500);
        GameState.toastWaveInfo(`Level ${n}`);
    })();

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
    // setup
    GameState.sidebarEl.classList.toggle('C--sidebarLevelSelect', true);
    GameState.drawType = 7;

    const l = await new Promise(resolve => {
        GameState.terrain = makeLevelSelectTerrain(resolve);
    });

    await setCloudTransition(true);
    // teardown
    GameState.sidebarEl.classList.toggle('C--sidebarLevelSelect', false);
    GameState.drawType = 0;

    return l;
};

const runGame = async () => {
    // await new Promise(res => setTimeout(res, 5000));
    await new Promise(res => window.addEventListener('click', res));

    await setCloudTransition(true);
    GameState.mainMenu.remove();
    GameState.sidebarEl.classList.toggle('C--sidebarHide', false);

    // On load, if you haven't passed level 1, skip level select
    // and go to the first level
    if(!getLevelIsUnlockedMap()[2]) {
        await runBattle(1);
    }

    while(true) {
        const l = await runLevelSelect();
        await runBattle(l);
    }
};
