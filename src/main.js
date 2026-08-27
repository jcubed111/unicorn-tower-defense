
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
    window.addEventListener('click', e => AudioSystem.playMainMusic(), {once: true});
    window.addEventListener('keydown', e => {
        // Use 1-3 for tower selection
        if(e.key > 0 && e.key < 4) {
            GameState.drawType = +e.key;
        }else if(e.key == 'q') {
            // 0 -> 1
            // 1 -> 3
            // 3 -> 1
            GameState.terrain.timeRate ||= 3;
            GameState.terrain.timeRate ^= 2;
        }else if(e.key == ' ') {
            // * -> 0
            // 0 -> 1
            GameState.terrain.timeRate = +!GameState.terrain.timeRate;
        }else if(e.key == 'Tab') {
            GameState.terrain.startNextWaveNow();
        }
    });

    // Unicorn head island terrain
    GameState.terrain = new MockTerrain(
        '.....................................7.3.6...///.........//.....7;3/;///////////./...//........./////////////////.//./..........////////////////////////./....../////////...../././/////////..../////................././......./',
    );

    animLoop();
    runGame();
}
