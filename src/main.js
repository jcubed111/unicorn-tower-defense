let lastRender = performance.now();
function mainLoop() {
    const dt = Math.min(1e2, performance.now() - lastRender) / 1e3;
    lastRender = performance.now();
    GameState.terrain.step(dt);
    render(dt);
    window.requestAnimationFrame(mainLoop);
}

window.onload = () => {
    let drawType = 1;

    document.body.append(
        GameState.mainCanvas = styled('canvas', 'C_mainCanvas'),
        GameState.sidebarEl = div('C_sidebar',
            "Runebook",
            ...orderedTowerTypes.map(T =>
                div('C_runeListing',
                    div('C_towerName', new T([]).displayName),
                    T.pattern.asElement,
                ),
            ),
            "Draw",
            ...range(3).map(i => {
                const button = styled('button', 'C_RuneDrawSelectButton', {},
                    sprites[i * 4 + 4].withColor(
                        normalizedTowerRgb(i == 0, i == 1, i == 2),
                    ).asImage
                );
                button.addEventListener('click', _ => drawType = i + 1);
                return button;
            }),
        ),
    );

    // GameState.terrain = new Terrain([7, 15], '....#########......#####.#####....#####...#####..#####..#..##########..###..########..#####..######..#####..########..###..##########..#..#####..#####...#####....#####.#####......#########........#######..........#####............###..............#........');
    GameState.terrain = new Terrain([7, 15], '..######..#####...#############...######..#####...######...##.....###.....##......####...#####.....####.#######.....###########......##.#######......#...######......#####.###.......########........#######.........######...........####.............#........');
    GameState.terrain.recomputeDerivedValues();

    range(3).forEach(x => GameState.terrain.enemies.add(
        new Enemy(randChoice(GameState.terrain.spawnLocations), 10),
    ));

    const recomputeHovering = e => {
        const [x, y] = GameState.hoveringTile = GameState.terrain.eventToTile(e);
        GameState.hoveringTower = GameState.terrain.computedTowersByLocation[x]?.[y] ?? null;
    };

    GameState.mainCanvas.addEventListener('click', e => {
        GameState.terrain.placeTower(GameState.terrain.eventToTile(e), drawType);
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
