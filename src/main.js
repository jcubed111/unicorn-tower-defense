
// Some css that needs to be compiled from the js image sources
const [a, b] = getButtonBorderBackForColor(HALF_WHITE);
// One write, one <style>: the keyframes that need JS-built data URLs, then
// `[CSS]`, which combine.py swaps for the whole stylesheet in the dist build
// and which is inert leftover text in dev.
document.write(`<style>@keyframes B{0%{border-image-source:url(${a})}50%{border-image-source:url(${b})}}[CSS]</style>`);


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
        }
        // Using tab here is weird cause it focuses elements and is really close to `q`
        // else if(e.key == 'Tab') {
        //     GameState.terrain.startNextWaveNow();
        // }
    });

    // Unicorn head island terrain
    GameState.terrain = new MockTerrain(
        '.....................................7.3.6...///.........//.....7;3/;///////////./...//........./////////////////.//./..........////////////////////////./....../////////...../././/////////..../////................././......./',
    );
    GameState.terrain.enemies.add(
        new Narwhalicorn(1, [[-1, 0], [18, 1], [13, 6], [16, 17]]),
    );

    animLoop();
    runGame();
}
