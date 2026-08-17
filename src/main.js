console.log('hello world')

window.onload = () => {
    const mainCanvas = styled('canvas', 'C_mainCanvas');
    document.body.appendChild(mainCanvas);

    let drawType = 'r';
    for(const t of 'rgb') {
        const button = styled('button', '', {}, t);
        button.addEventListener('click', _ => drawType = t);
        document.body.appendChild(button);
    }

    const terrain = new Terrain([7, 15], '....#########......#####.#####....#####...#####..#####..#..##########..###..########..#####..######..#####..########..###..##########..#..#####..#####...#####....#####.#####......#########........#######..........#####............###..............#........');
    terrain.recomputeDerivedValues();

    render(mainCanvas, terrain);

    mainCanvas.addEventListener('click', e => {
        terrain.placeTower(terrain.eventToTile(e), drawType);
        render(mainCanvas, terrain);
    });
}

function render(mainCanvas, terrain) {
    const size = 16;
    const tileSize = 45;
    const edgeSize = size * tileSize;

    mainCanvas.width = mainCanvas.height = edgeSize * window.devicePixelRatio;
    mainCanvas.style.width = mainCanvas.style.height = edgeSize + 'px';

    const ctx = mainCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.scale(
        window.devicePixelRatio * tileSize,
        window.devicePixelRatio * tileSize,
    );

    range(terrain.size).map(x => {
        range(terrain.size).map(y => {
            const isGround = terrain.isGround[x][y];
            if(isGround) {
                ctx.fillStyle = `#547c47`;
                ctx.fillRect(x, y, 1, 1);
            }else{
                ctx.fillStyle = '#467';
                ctx.fillRect(x, y, 1, 1);
            }

            const maybeComputedTower = terrain.computedTowers[x][y];
            if(maybeComputedTower) {
                for(const s of getTowerSprites(x, y, maybeComputedTower, ...terrain.rawTowers[x][y])) {
                    renderSprite(x, y, s);
                }
            }

            // render descent map for debug
            // ctx.font = '0.2px sans-serif';
            // ctx.fillStyle = `#fff`;
            // ctx.fillText(terrain.descentMap[x][y], x + 0.1, y + 0.4);
        });
    });

    function * getTowerSprites(x, y, computedTower, rawTowerType, rawTowerLevel) {
        const towerTypeIndex = {'r': 0, 'g': 1, 'b': 2}[rawTowerType];
        const innerSprite = sprites[towerTypeIndex * 4 + rawTowerLevel + 3];
        const outerColor = computedTower.getColor();
        const innerColor = lerpColor(
            outerColor,
            normalizedTowerRgb(rawTowerType == 'r', rawTowerType == 'g', rawTowerType == 'b'),
            0.5,
        );
        yield innerSprite.withColor(innerColor);

        for(const [sideRot, isSameTower] of [
            [0, terrain.computedTowers[x]?.[y - 1] == computedTower],
            [1, terrain.computedTowers[x - 1]?.[y] == computedTower],
            [2, terrain.computedTowers[x]?.[y + 1] == computedTower],
            [3, terrain.computedTowers[x + 1]?.[y] == computedTower],
        ]) {
            yield sprites[+isSameTower].withRot(sideRot).withColor(outerColor);
        }
    }

    // function renderSprite(x, y, sprite, rot, useColor='#fff') {
    //     ctx.save();
    //     ctx.translate(x + 0.5, y + 0.5);
    //     ctx.rotate(rot * Math.PI / 2);
    //     ctx.drawImage(sprite.asImageWithColor(useColor), -0.5, -0.5, 1, 1);
    //     ctx.restore();
    // }

    function renderSprite(x, y, sprite) {
        ctx.drawImage(sprite.asImage, x, y, 1, 1);
    }
}

