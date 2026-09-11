
const scrollBackImage = makeSpriteCanvas(ctx => {
    ctx.fillStyle = '#202020';
    ctx.fillRect(0, 10, 10, 10);
    ctx.fillStyle = '#404040';
    ctx.fillRect(0, 10, 1, 10);
    renderSprite(ctx, [0, 0], sprites[24]);
    renderSprite(ctx, [0, 1 + 1/15], sprites[24]);
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
        ??= sprites[26].withColor(color).asImage.toDataURL();
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
        sprites[23].withColor(c).asImage.toDataURL(),
        sprites[23].withColor(c).withRot(1).asImage.toDataURL(),
    ];

GameState.rerenderRunebook = () => {
    GameState.runebook.replaceChildren(
        div('font-size:7rem', "ᚱuneᛒooᛕ"),
        ...orderedTowerTypes.map(T => {
            const isDiscovered = new T([]).isDiscovered();
            return withHoverInfo(
                div('display:flex;align-items:center;justify-content:space-between;padding:1.5rem 0;' + (isDiscovered ? '' : 'opacity:.6'),
                    div('', isDiscovered ? new T([]).displayName : '???'),
                    T.sourcePattern.makeElement(isDiscovered),
                ),
                isDiscovered
                    ? new T(T.sourcePattern.asGrid).asHoverEl()
                    : div('',
                        div('font-size:4rem;padding:1rem 0', '???'),
                        div('opacity:.6', 'Build this pattern to reveal its details'),
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
        div('position:relative;background:#273757',
            GameState.mainCanvas = styled('canvas'),
            GameState.sidebarEl = div('C--sidebar C--sidebarHide',
                div('C--statBar',
                    div('color:#94d6ff', GameState.manaDisplay = styled('span'), " ᚯ"),
                    div('text-align:center;color:#fff;width:10rem;margin:0 4.5rem 0 3.5rem', GameState.heartDisplay = styled('span', '', 10)),
                    wrapEl(
                        div('C--button', wrapEl(sprites[39].asImage, c => c.style.width = '10rem')),
                        e => e.addEventListener('click', _ => {
                            if(confirm('Give up?')) GameState.terrain.lose();
                        }),
                    ),
                ),

                runeBorderDiv([32, 32, 32, 255])('C--spellArea',
                    div('', "Inscribe Rune"),
                    div('display:flex;align-items:center;justify-content:space-between;color:#94d6ff', ...GameState.runeButtons),
                ),

                runeBorderDiv([32, 32, 32, 255])('',
                    GameState.hoverInfoEl = div('position:relative;padding:3rem;min-height:40rem'),
                ),

                GameState.runebook = scrollDiv('C--runeBook'),

                div('',
                    styled('label', 'padding:0 0 1rem 7.3rem;display:inline-block'),
                    styled('label', 'padding:0 0 1rem 7.3rem;display:inline-block',
                        wrapEl(styled('input'), el => {
                            el.type = 'checkbox';
                            el.checked = AudioSystem.bgMusicGain.gain.value;
                            el.addEventListener('change', e => {
                                AudioSystem.setSourceOnOff(1, el.checked)
                            });
                        }),
                        'Music',
                    ),
                    styled('label', 'padding:0 0 1rem 7.3rem;display:inline-block',
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
                styled('h1', '', "Rune Mage Tower Defense"),
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
        // i / 34 == i / a.length / 2 for the 17 pairs above, which also drops the
        // `a` parameter. calc() needs whitespace around + and - but not around *.
        .map(([px, py], i) =>
            `radial-gradient(circle calc(18rem*log(30*(var(--s) - ${i / 34}) + 1)) at ${px}rem ${py}rem, #${(i & 2) ? 'b3b3b3' : 'aaa'} 100%, #0000 100%)`
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
