
const scrollBackImage = makeSpriteCanvas(ctx => {
    renderSprite(ctx, 0, 0, sprites[24]);
    renderSprite(ctx, 0, 1, sprites[28]);
}, 1, 2).toDataURL();
const scrollDiv = (...divArgs) => {
    const el = div(...divArgs);
    // 15 rem = 1 tile
    // The magic numbers here are the result of dividing [sprite px] / 7.5 to get the rem values.
    el.style.borderStyle = `solid`;
    el.style.borderWidth = `14rem 5rem 14rem 1rem`;
    el.style.borderImage = `url(${scrollBackImage}) 14 5 14 8 / 14rem 5rem 14rem 8rem / 0 round`;
    el.style.background = '#202020 padding-box';
    return el;
};

const runeBorderBackImageCache = {};
const runeBorderDiv = (color, ...divArgs) => {
    runeBorderBackImageCache[colorAsString(color)]
        ??= sprites[26].withColor(color).asImage.toDataURL();
    const el = div(...divArgs);
    // 15 rem = 1 tile
    // The magic numbers here are the result of dividing [sprite px] / 7.5 to get the rem values.
    el.style.borderStyle = `solid`;
    el.style.borderWidth = `5rem`;
    el.style.borderImage = `url(${runeBorderBackImageCache[colorAsString(color)]}) 6 / 6rem / 0 round`;
    el.style.background = '#20202066 padding-box';
    return el;
};

GameState.rerenderRunebook = () => {
    GameState.runebook.replaceChildren(
        div('C--sidebarTitle', "ᚱuneᛒooᛕ"),
        ...orderedTowerTypes.map(T => {
            const isDiscovered = new T([]).isDiscovered();
            return withHoverInfo(
                div('C--runeListing ' + (!isDiscovered && 'C--secondary'),
                    div(/*'C--towerName',*/ '', isDiscovered ? new T([]).displayName : '???'),
                    T.sourcePattern.makeElement(isDiscovered),
                ),
                isDiscovered
                    ? new T(T.sourcePattern.asGrid).asHoverEl()
                    : div('',
                        div('C--infoTitle', '???'),
                        div('C--secondary', 'Build this pattern to reveal its details'),
                    ),
            );
        }).reverse(),
    );
};

const initHtml = () => {
    GameState.runeButtons = orderedTowerTypes.slice(-3).map((T, i) => {
        return div(
            'C--runeButtonWrapper',
            div(),  // cost
            withHoverInfo(
                wrapEl(
                    div(),  // tower canvas wrapper
                    el => el.addEventListener('click', _ => GameState.drawType = i + 1)
                ),
                new T(T.sourcePattern.asGrid).asHoverEl(),
            ),
        );
    });

    document.body.append(
        div('C--mainWrapper',
            GameState.mainCanvas = styled('canvas'),
            GameState.sidebarEl = div('C--sidebar C--sidebarHide',
                div('C--statBar',
                    div('C--manaColor', GameState.manaDisplay = styled('span'), " ᚯ"),
                    div('C--heartNumber', GameState.heartDisplay = styled('span', '', 10)),
                ),

                runeBorderDiv([32, 32, 32, 255], 'C--spellArea',
                    div('', "Inscribe Rune"),
                    div('C--runeButtonRow', ...GameState.runeButtons),
                ),

                runeBorderDiv([32, 32, 32, 255], '',
                    GameState.hoverInfoEl = div('C--hoverInfoArea'),
                ),

                GameState.runebook = scrollDiv('C--runeBook'),
            ),
            div('C--topLeft',
                GameState.topLeftDisplay = div(),
                GameState.startNextWaveButton = div('', 'Start Wave Now'),
            ),
            GameState.mainMenu = div('C--fullscreen',
                styled('h1', '', "Unicorn Tower Defense"),
                "Click to Begin",
            ),
            GameState.cloudBlocker = div('C--fullscreen C--cloudBlockerHide'),
        )
    );
    GameState.rerenderRunebook();

    // Cloud blocker bg
    GameState.cloudBlocker.style.background =
        // [0,10],
        [[18, 233], [105, 207], [186, 226], [265, 208], [200, 145], [283, 133], [122, 140], [34, 141], [7, 103], [75, 82], [157, 86], [234, 71], [283, 47], [231, 23], [141, 19], [77, 21], [12, 25]]
        // shorter, but looks less natural. Might need a sin? But then not as short.
        // ...range(24).map(i => [30 + 60 * (i % 5), 240 - i / 12])
        .map(([px, py], i, a) =>
            `radial-gradient(circle calc(18rem * log(30 * (var(--s) - ${i / a.length / 2}) + 1)) at ${px}rem ${py}rem, #aaa 100%, #0000 100%)`
        )
        .join(',');

    // Listeners
    const recomputeHovering = e => {
        const [x, y] = GameState.hoveringPos = GameState.terrain.eventToPos(e);
        GameState.hoveringTower = GameState.terrain.computedTowersByLocation[~~x]?.[~~y] ?? null;
    };

    GameState.mainCanvas.addEventListener('click', e => {
        const [x, y] = GameState.terrain.eventToPos(e);
        GameState.terrain.placeTower([~~x, ~~y], GameState.drawType)
            || AudioSystem.playInvalidAction();
        recomputeHovering(e);
    });
    GameState.mainCanvas.addEventListener('mousemove', e => {
        recomputeHovering(e);
    });
    GameState.mainCanvas.addEventListener('mouseout', e => {
        GameState.hoveringPos = GameState.hoveringTower = null;
    });
}
