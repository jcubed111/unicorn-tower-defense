// In the dist build `[CSS]` gets replaced with the raw styles.
// In dev this line is a noop.
document.write('<style>[CSS]</style>');


let lastRender = performance.now();
function animLoop() {
    const dt = Math.min(1e2, performance.now() - lastRender) / 1e3;
    lastRender = performance.now();
    GameState.terrain.step(dt);
    render(dt);
    window.requestAnimationFrame(animLoop);
}


const runBattle = async (
    goalLocation,
    terrainString,
    waves,
) => {
    await new Promise(resolve => {
        GameState.terrain = new Terrain(
            goalLocation,
            terrainString,
            waves,
            resolve,
        );
    });
};


window.onload = async () => {
    initHtml();
    window.addEventListener('click', () => AudioSystem.playMainMusic(), {once: true});

    GameState.terrain = new MockTerrain([-1,-1], '', [], 0);

    animLoop();

    // GameState.terrain = new Terrain(
        // [7, 15],
        // '....#########......#####.#####....#####...#####..#####..#..##########..###..########..#####..######..#####..########..###..##########..#..#####..#####...#####....#####.#####......#########........#######..........#####............###..............#........',
        // ???
    // GameState.terrain = new Terrain(
        // [7, 15],
        // '..######..#####...#############...######..#####...######...##.....###.....##......####...#####.....####.#######.....###########......##.#######......#...######......#####.###.......########........#######.........######...........####.............#........',
        // ???
    // GameState.terrain = new Terrain(
        // [3, 15],
        // '............#.....###......###...##############..#####....#####..##############...###......###....#.#.......#.....#.#.......#.....#.#.......#.....#.#......###....###.....#####..#####...######..##############..#####...######...###.....####.....#............',
        // ???
    // GameState.terrain = new Terrain(
        // [1, 10],
        // '.........######....####...#####...######...####..########..####..########...##...#############...########.####....######..####.....####....###.......##.##.......###.##.###......###.##.###......###..#.###........#..#............####.........................',
        // ???

    await runBattle(
        [10, 15],
        '..///////.........///////36.......//////..2..........0....2..........41//15............//..............2...////...///..2...////../////.2.7336//../////15.0//2//../////...0//2.....///....0..2......2...73;..2......:333;..../..............///............/////.',
        [
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
    );
}
