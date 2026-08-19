// In the dist build `[CSS]` gets replaced with the raw styles.
// In dev this line is a noop.
document.write('<style>[CSS]</style>');

let lastRender = performance.now();
function mainLoop() {
    const dt = Math.min(1e2, performance.now() - lastRender) / 1e3;
    lastRender = performance.now();
    GameState.terrain.step(dt);
    render(dt);
    window.requestAnimationFrame(mainLoop);
}

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

const spellAreaBackImage = sprites[26].asImage.toDataURL();
const spellAreaDiv = (...divArgs) => {
    const el = div(...divArgs);
    // 15 rem = 1 tile
    // The magic numbers here are the result of dividing [sprite px] / 7.5 to get the rem values.
    el.style.borderStyle = `solid`;
    el.style.borderWidth = `5rem`;
    el.style.borderImage = `url(${spellAreaBackImage}) 6 / 6rem / 0 round`;
    // el.style.background = '#202020 padding-box';
    return el;
};

window.onload = () => {
    GameState.runeButtons = range(3).map(i => {
        const button = div();
        button.addEventListener('click', _ => GameState.drawType = i + 1);
        return div(
            'C--runeButtonWrapper',
            div(),  // cost
            button,  // tower canvas wrapper
        );
    });

    document.body.append(
        div('C--mainWrapper',
            GameState.mainCanvas = styled('canvas'),
            GameState.sidebarEl = div('C--sidebar',
                div('C--statBar',
                    div('C--manaOrb', GameState.manaDisplay = styled('span'), " ᚯ"),
                    div('C--heartNumber', GameState.heartDisplay = styled('span', '', 10)),
                ),

                spellAreaDiv('C--spellArea',
                    div('', "Inscribe Rune"),
                    div('C--runeButtonRow', ...GameState.runeButtons),
                ),

                GameState.hoverInfoEl = div('C--hoverInfoArea'),

                scrollDiv('C--runeBook',
                    div('C--sidebarTitle', "ᚱuneᛒooᛕ"),
                    orderedTowerTypes.map(T =>
                        div('C--runeListing',
                            div(/*'C--towerName',*/ '', new T([]).displayName),
                            T.sourcePattern.makeElement(),
                        ),
                    ).reverse(),
                ),
            ),
            div('C--topLeft',
                GameState.topLeftDisplay = div(),
                GameState.startNextWaveButton = div('', 'Start Wave Now'),
            ),
        )
    );

    // GameState.terrain = new Terrain([7, 15], '....#########......#####.#####....#####...#####..#####..#..##########..###..########..#####..######..#####..########..###..##########..#..#####..#####...#####....#####.#####......#########........#######..........#####............###..............#........');
    // GameState.terrain = new Terrain([7, 15], '..######..#####...#############...######..#####...######...##.....###.....##......####...#####.....####.#######.....###########......##.#######......#...######......#####.###.......########........#######.........######...........####.............#........');
    // GameState.terrain = new Terrain([3, 15], '............#.....###......###...##############..#####....#####..##############...###......###....#.#.......#.....#.#.......#.....#.#.......#.....#.#......###....###.....#####..#####...######..##############..#####...######...###.....####.....#............');
    GameState.terrain = new Terrain([1, 10], '.........######....####...#####...######...####..########..####..########...##...#############...########.####....######..####.....####....###.......##.##.......###.##.###......###.##.###......###..#.###........#..#............####.........................');
    GameState.terrain.recomputeDerivedValues();

    GameState.terrain.setWaves(
        Enemy,
        Enemy,
        SwarmEnemy,
        Enemy,
        Enemy,
        SwarmEnemy,
        Enemy,
        Enemy,
        BossEnemy,
    );

    const recomputeHovering = e => {
        const [x, y] = GameState.hoveringPos = GameState.terrain.eventToPos(e);
        GameState.hoveringTower = GameState.terrain.computedTowersByLocation[~~x]?.[~~y] ?? null;
    };

    GameState.mainCanvas.addEventListener('click', e => {
        const [x, y] = GameState.terrain.eventToPos(e);
        GameState.terrain.placeTower([~~x, ~~y], GameState.drawType);
        recomputeHovering(e);
    });
    GameState.mainCanvas.addEventListener('mousemove', e => {
        recomputeHovering(e);
    });
    GameState.mainCanvas.addEventListener('mouseout', e => {
        GameState.hoveringPos = GameState.hoveringTower = null;
    });

    mainLoop();
}
