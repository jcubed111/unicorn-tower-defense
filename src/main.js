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
                "Runebook",
                ...orderedTowerTypes.map(T =>
                    div(/*'C--runeListing'*/ '',
                        div('C--towerName', new T([]).displayName),
                        T.pattern.asElement,
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
        [10, 1, 5, pos => new Enemy(pos, 3)],
        [30, 1, 5, pos => new Enemy(pos, 5)],
        [50, 1, 5, pos => new Enemy(pos, 7)],
    );

    const recomputeHovering = e => {
        const [x, y] = GameState.hoveringTile = GameState.terrain.eventToTile(e);
        GameState.hoveringTower = GameState.terrain.computedTowersByLocation[x]?.[y] ?? null;
    };

    GameState.mainCanvas.addEventListener('click', e => {
        GameState.terrain.placeTower(GameState.terrain.eventToTile(e), GameState.drawType);
        recomputeHovering(e);
    });
    GameState.mainCanvas.addEventListener('mousemove', e => {
        recomputeHovering(e);
    });
    GameState.mainCanvas.addEventListener('mouseout', e => {
        GameState.hoveringTile = GameState.hoveringTower = null;
    });

    mainLoop();
}
