
const setCloudTransition = async show => {
    if(GameState.cloudBlocker.classList.contains('C--cloudBlockerHide') != show) return;
    if(!show) ParticleSystem.clear();
    GameState.cloudBlocker.classList.toggle('C--cloudBlockerHide', !show);
    await time(500);
};

const time = n => new Promise(res => setTimeout(res, n));

const wrapEventImage = el => wrapEl(el.asImage ?? el, el => {
    el.style.width = '40rem';
    el.style.display = 'inline-block';
})

const showEventText = (
    divFn = scrollDiv,
    promiseCb = res => window.addEventListener('click', res, {once: true}),
    container = GameState.cloudBlocker,
) => async (sprite, ...text) => {
    const inner = div('C--innerEventTextScroll',
        sprite,
        div('', ' '),
        ...text,
    );
    const d = divFn('C--eventTextScroll', inner);
    container.replaceChildren(d);
    await time(100);
    d.style.height = inner.offsetHeight + 'px';
    d.style.opacity = '1';

    await time(300);
    const result = await new Promise(promiseCb);

    d.style.opacity = '0';
    await time(300);

    container.replaceChildren();
    return result;
};

const showLevelEndMenu = (levelNum, isSuccess, isPerfect) => {
    // return bool whether to restart
    const retryButton = div('C--buttonLike C--onBlack', 'Retry');
    const continueButton = div('C--buttonLike C--onBlack', 'Levels');

    const img =
        isPerfect
            ? makeSpriteCanvas(ctx => {
                renderSprite(ctx, [0, 0], sprites[21]);
                renderSprite(ctx, [0, 0.5], sprites[31]);
            }, 1, 1.5)
            : sprites[isSuccess ? 31 : 27];

    return showEventText(
        runeBorderDiv([16, 16, 16, 255], 200),
        res => {
            retryButton.addEventListener('click', e => res(true));
            continueButton.addEventListener('click', e => res(false));
        }
    )(
        wrapEventImage(img),
        isSuccess ? isPerfect ? 'Perfect!' : 'Victory!' : 'Defeat!',
        styled('br'),
        !isSuccess && retryButton,
        continueButton,
    );
};

let waveToastStacks = 0;  // ensures an earlier toast won't remove the new toast
GameState.toastWaveInfo = async (title, ...rest) => {
    GameState.waveInfoToast.replaceChildren(
        div('C--larger', title),
        ...rest,
    );
    GameState.waveInfoToast.classList.toggle('C--waveInfoToastOut', !++waveToastStacks);
    await time(3e3);
    GameState.waveInfoToast.classList.toggle('C--waveInfoToastOut', !--waveToastStacks);
}


const runBattle = async (n, wasRestarted) => {
    // returns true to restart

    if(!wasRestarted) {
        await levelData[n].preLevelStoryContent?.();
    }

    setCloudTransition(false);

    (async () => {
        await time(500);
        GameState.toastWaveInfo(`Level ${n}`);
    })();

    const pass = await new Promise(resolve => {
        GameState.terrain = getTerrainForLevel(n, resolve);
    });

    const isPerfect = GameState.terrain.health == STARTING_HEALTH;
    if(pass) {
        setLevelPassed(n, isPerfect);
    }
    const result = await showLevelEndMenu(
        n + 1,
        pass,
        isPerfect,
    );
    await setCloudTransition(true);
    return result;
};

const loopBattle = async n => {
    for(let wasRestarted = 0; await runBattle(n, wasRestarted); wasRestarted = 1) {};
}

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
        await loopBattle(1);
    }

    while(true) {
        const l = await runLevelSelect();
        await loopBattle(l);
    }
};
