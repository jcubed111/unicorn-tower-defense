
// Some css that needs to be compiled from the js image sources
const [a, b] = getButtonBorderBackForColor(HALF_WHITE);
document.write(`<style>@keyframes B{0%{border-image-source:url(${a})}50%{border-image-source:url(${b})}}</style>`);
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

window.onload = () => {
    initHtml();
    window.addEventListener('click', () => AudioSystem.playMainMusic(), {once: true});

    // Unicorn head island terrain
    GameState.terrain = new MockTerrain(
        '......................................./...../....736.//..../...73;/////.../....;////////./.....//////////......////////.//.....////////////..../////////////.../////..///////..////...../////..///........//...//............../...............................',
    );

    animLoop();
    runGame();

    // GameState.terrain = new Terrain(
    //     [7, 15],
    //     '....#########......#####.#####....#####...#####..#####..#..##########..###..########..#####..######..#####..########..###..##########..#..#####..#####...#####....#####.#####......#########........#######..........#####............###..............#........',
    //     [],
    //     null,
    // );
    // GameState.terrain = new Terrain(
    //     [7, 15],
    //     '..######..#####...#############...######..#####...######...##.....###.....##......####...#####.....####.#######.....###########......##.#######......#...######......#####.###.......########........#######.........######...........####.............#........',
    //     [],
    //     null,
    // );
    // GameState.terrain = new Terrain(
    //     [3, 15],
    //     '............#.....###......###...##############..#####....#####..##############...###......###....#.#.......#.....#.#.......#.....#.#.......#.....#.#......###....###.....#####..#####...######..##############..#####...######...###.....####.....#............',
    //     [],
    //     null,
    // );
    // GameState.terrain = new Terrain(
    //     [1, 10],
    //     '.........######....####...#####...######...####..########..####..########...##...#############...########.####....######..####.....####....###.......##.##.......###.##.###......###.##.###......###..#.###........#..#............####.........................',
    //     [],
    //     null,
    // );
}
