function render(dt) {
    const mainCanvas = GameState.mainCanvas;
    const terrain = GameState.terrain;

    // size of a visual pixel in canvas pixels
    const tileSize = 15;
    const pxSize = Math.floor(
        Math.min(window.innerHeight, window.innerWidth)
        * window.devicePixelRatio
        / terrain.size
        / tileSize
    );

    mainCanvas.width = mainCanvas.height = pxSize * tileSize * terrain.size;
    mainCanvas.style.width = mainCanvas.style.height = pxSize * tileSize * terrain.size / window.devicePixelRatio + 'px';

    const ctx = mainCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.resetTransform();
    ctx.scale(
        pxSize,
        pxSize,
    );

    range(terrain.size).map(x => {
        range(terrain.size).map(y => {
            const isGround = terrain.isGround[x][y];
            if(isGround) {
                ctx.fillStyle = `#547c47`;
            }else{
                ctx.fillStyle = '#467';
            }
            ctx.fillRect(tileSize * x, tileSize * y, tileSize, tileSize);

            const maybeComputedTower = terrain.computedTowers[x][y];
            if(maybeComputedTower) {
                for(const s of getTowerSprites(x, y, maybeComputedTower)) {
                    renderSprite(x, y, s);

                    // sparkle: each pixel should generate a particle every 20 seconds.
                    s.toParticlesSparse(
                        maybeComputedTower._particleFirstRender ? 0.5 : dt / 20
                    ).forEach(([fy, fx, color]) => {
                        console.log('spawning particle')
                        ParticleSystem.addParticle(new EnergyFadeParticle(
                            x * tileSize + fx,
                            y * tileSize + fy,
                            color,
                        ))
                    });
                }
            }

            // render descent map for debug
            // ctx.font = '0.2px sans-serif';
            // ctx.fillStyle = `#fff`;
            // ctx.fillText(terrain.descentMap[x][y], x + 0.1, y + 0.4);
        });
    });

    mapGrid2d(terrain.computedTowers, t => t._particleFirstRender = false);

    ParticleSystem.render(ctx);
    ParticleSystem.step(dt);

    function * getTowerSprites(x, y, computedTower) {
        const [rawTowerType, rawTowerLevel] = terrain.rawTowers[x][y];
        const innerSprite = sprites[rawTowerType * 4 + rawTowerLevel - 1];
        const outerColor = computedTower.getColor();
        const innerColor = lerpColor(
            outerColor,
            normalizedTowerRgb(rawTowerType == 1, rawTowerType == 2, rawTowerType == 3),
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
        ctx.drawImage(sprite.asImage, tileSize * x, tileSize * y, tileSize, tileSize);
    }
}

