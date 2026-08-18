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

window.onload = () => {
    GameState.runeButtons = range(3).map(i => {
        const button = sprites[i * 4 + 4].withColor(
            normalizedTowerRgb(i == 0, i == 1, i == 2),
        ).asImage;
        button.addEventListener('click', _ => GameState.drawType = i + 1);
        return div(
            'C--runeButtonWrapper',
            div(/*'C--runeButtonCost'*/),
            button,
        );
    });

    document.body.append(
        div('C--mainWrapper',
            GameState.mainCanvas = styled('canvas'),
            GameState.sidebarEl = div('C--sidebar',
                GameState.hoverInfoEl = div('C--hoverInfoArea'),
                "Runebook",
                ...orderedTowerTypes.map(T =>
                    div(/*'C--runeListing'*/ '',
                        div(/*'C--towerName',*/ '', new T([]).displayName),
                        T.sourcePattern.makeElement(),
                    ),
                ),
                div('', "Inscribe Rune"),
                div('', "Mana: ", GameState.manaDisplay = styled('span')),
                div('C--runeButtonRow', ...GameState.runeButtons),
            ),
            div('C--topLeft',
                GameState.topLeftDisplay = div(),
                GameState.startNextWaveButton = div('', 'Start Wave Now'),
            ),
        )
    );

    // GameState.terrain = new Terrain([7, 15], '....#########......#####.#####....#####...#####..#####..#..##########..###..########..#####..######..#####..########..###..##########..#..#####..#####...#####....#####.#####......#########........#######..........#####............###..............#........');
    // GameState.terrain = new Terrain([7, 15], '..######..#####...#############...######..#####...######...##.....###.....##......####...#####.....####.#######.....###########......##.#######......#...######......#####.###.......########........#######.........######...........####.............#........');
    GameState.terrain = new Terrain([3, 15], '............#.....###......###...##############..#####....#####..##############...###......###....#.#.......#.....#.#.......#.....#.#.......#.....#.#......###....###.....#####..#####...######..##############..#####...######...###.....####.....#............');
    GameState.terrain.recomputeDerivedValues();

    GameState.terrain.setWaves(
        [10,  1,     5, pos => new Enemy(pos, 3)],  // total hp ~= 15
        [30,  1,     5, pos => new Enemy(pos, 4)],  // total hp ~= 22
        [50,  0.5,  10, pos => new Enemy(pos, 3)],  // total hp ~= 33
        [70,  1,     7, pos => new Enemy(pos, 8)],  // total hp ~= 50
        [90,  1,     8, pos => new Enemy(pos, 9)], // total hp ~= 75
        [110, 0.25, 20, pos => new Enemy(pos, 6)],  // total hp ~= 113
        [130, 1,     9, pos => new Enemy(pos, 18)], // total hp ~= 170
        [150, 1,    10, pos => new Enemy(pos, 26)], // total hp ~= 256
        [170, 1,     1, pos => new Enemy(pos, 200)], // total hp ~= 384
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
