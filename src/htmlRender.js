
const scrollBackImage = makeSpriteCanvas(ctx => {
    ctx.fillStyle = '#202020';
    ctx.fillRect(0, 10, 10, 10);
    ctx.fillStyle = '#404040';
    ctx.fillRect(0, 10, 1, 10);
    renderSprite(ctx, [0, 0], sprites[28]);
    renderSprite(ctx, [0, 1 + 1/15], sprites[28]);
}, 1, 2).toDataURL();
const scrollDiv = (...divArgs) => {
    const el = div(...divArgs);
    el.style.borderStyle = `solid`;
    el.style.borderWidth = `14rem 5rem 14rem 1rem`;
    el.style.borderImage = `url(${scrollBackImage}) 14 5 14 8 / 14rem 5rem 14rem 8rem / 0 round`;
    el.style.background = '#202020 padding-box';
    return el;
};

const runeBorderBackImageCache = {};
const runeBorderDiv = (color, bgAlpha=102) => (...divArgs) => {
    runeBorderBackImageCache[color]
        ??= sprites[30].withColor(color).asImage.toDataURL();
    const el = div(...divArgs);
    el.style.borderStyle = `solid`;
    el.style.borderWidth = `4rem`;
    el.style.borderImage = `url(${runeBorderBackImageCache[color]}) 6 / 6rem / 0 round`;
    el.style.background = `${colorAsString(withAlpha(color, bgAlpha))} padding-box`;
    return el;
};


const buttonBorderBackImageCache = {};
const getButtonBorderBackForColor = c => buttonBorderBackImageCache[colorAsString(c)]
    ??= [
        sprites[27].withColor(c).asImage.toDataURL(),
        sprites[27].withColor(c).withRot(1).asImage.toDataURL(),
    ];

GameState.rerenderRunebook = () => {
    GameState.runebook.replaceChildren(
        div('C--sidebarTitle', "ᚱuneᛒooᛕ"),
        ...orderedTowerTypes.map(T => {
            const isDiscovered = new T([]).isDiscovered();
            return withHoverInfo(
                div('C--runeListing ' + (!isDiscovered && 'C--secondary'),
                    div('', isDiscovered ? new T([]).displayName : '???'),
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
    GameState.runeButtons = [Red, Green, Blue].map((T, i) => {
        return div(
            'C--runeButtonWrapper',
            div(),  // cost
            withHoverInfo(
                wrapEl(
                    div('C--button'),  // tower canvas wrapper
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
                    wrapEl(
                        div('C--button', wrapEl(sprites[43].asImage, c => c.style.width = '10rem')),
                        e => e.addEventListener('click', _ => {
                            if(confirm('Give up?')) GameState.terrain.lose();
                        }),
                    ),
                ),

                runeBorderDiv([32, 32, 32, 255])('C--spellArea',
                    div('', "Inscribe Rune"),
                    div('C--runeButtonRow', ...GameState.runeButtons),
                ),

                runeBorderDiv([32, 32, 32, 255])('',
                    GameState.hoverInfoEl = div('C--hoverInfoArea'),
                ),

                GameState.runebook = scrollDiv('C--runeBook'),

                div('',
                    styled('label', 'C--audioCheckLabel'),
                    styled('label', 'C--audioCheckLabel',
                        wrapEl(styled('input'), el => {
                            el.type = 'checkbox';
                            el.checked = AudioSystem.bgMusicGain.gain.value;
                            el.addEventListener('change', e => {
                                AudioSystem.setSourceOnOff(1, el.checked)
                            });
                        }),
                        'Music',
                    ),
                    styled('label', 'C--audioCheckLabel',
                        wrapEl(styled('input'), el => {
                            el.type = 'checkbox';
                            el.checked = AudioSystem.sfxGain.gain.value;
                            el.addEventListener('change', e => {
                                AudioSystem.setSourceOnOff(0, el.checked)
                            });
                        }),
                        'Sfx',
                    ),
                ),
            ),
            GameState.waveInfoToast = runeBorderDiv([32, 32, 32, 255], 150)('C--waveInfoToast C--fullscreen C--waveInfoToastOut'),
            div('C--topLeft', // NOTE: the css depends on this being after sidebar
                GameState.startNextWaveButton = div('C--button C--buttonPadded'),
                GameState.topLeftDisplay = div(),  // Wave status text
            ),
            GameState.mainMenu = div('C--fullscreen',
                styled('h1', '',
                    makeSpriteCanvas(
                        ctx => {
                            range(4).forEach(i => {
                                renderSprite(ctx, [i, 0], sprites[48 + i]);
                                renderSprite(ctx, [i, 1], sprites[52 + i]);
                            });
                        },
                        4, 2, 90,
                    )
                ),
                "Click to Begin",
            ),
            GameState.cloudBlocker = div('C--fullscreen C--cloudBlockerHide'),
        )
    );
    GameState.rerenderRunebook();

    // Cloud blocker bg
    GameState.cloudBlocker.style.background =
        [[18, 233], [105, 207], [186, 226], [265, 208], [200, 145], [283, 133], [122, 140], [34, 141], [7, 103], [75, 82], [157, 86], [234, 71], [283, 47], [231, 23], [141, 19], [77, 21], [12, 25]]
        // // shorter, but looks less natural. Might need a sin? But then not as short.
        // // Saves 0.35%.
        // range(24).map(i => [30 + 60 * (i % 5), 240 - i * 12])
        .map(([px, py], i, a) =>
            `radial-gradient(circle calc(18rem * log(30 * (var(--s) - ${i / a.length / 2}) + 1)) at ${px}rem ${py}rem, #${(i & 2) ? 'b3b3b3' : 'aaa'} 100%, #0000 100%)`
        )
        .join(',');

    // Listeners
    const recomputeHovering = e => {
        GameState.hoveringPos = GameState.terrain.eventToPos(e);
        GameState.hoveringTower =
            grid2dAt(GameState.terrain.computedTowersByLocation, GameState.hoveringPos) ?? null;
    };

    GameState.mainCanvas.addEventListener('click', e => {
        GameState.terrain.placeTower(
            GameState.terrain.eventToPos(e).map(v => ~~v),
            GameState.drawType,
        ) || AudioSystem.playInvalidAction();
        recomputeHovering(e);
    });
    GameState.mainCanvas.addEventListener('mousemove', e => {
        recomputeHovering(e);
    });
    GameState.mainCanvas.addEventListener('mouseout', e => {
        GameState.hoveringPos = GameState.hoveringTower = null;
    });
}
