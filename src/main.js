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
            ...range(3).map(i => {
                const button = styled('button', '', {}, 'rgb'[i]);
                button.addEventListener('click', _ => drawType = i + 1);
                return button;
            }),
        ),
    );

    // GameState.terrain = new Terrain([7, 15], '....#########......#####.#####....#####...#####..#####..#..##########..###..########..#####..######..#####..########..###..##########..#..#####..#####...#####....#####.#####......#########........#######..........#####............###..............#........');
    GameState.terrain = new Terrain([7, 15], '..######..#####...#############...######..#####...######...##.....###.....##......####...#####.....####.#######.....###########.........#######..........######.......####.###.......########........#######.........######..........######............#........');
    GameState.terrain.recomputeDerivedValues();

    range(3).forEach(x => GameState.terrain.enemies.add(
        new Enemy(randChoice(GameState.terrain.spawnLocations), 10),
    ));

    GameState.mainCanvas.addEventListener('click', e => {
        GameState.terrain.placeTower(GameState.terrain.eventToTile(e), drawType);
    });

    mainLoop();
}
