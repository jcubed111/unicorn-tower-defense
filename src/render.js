function render(dt) {
    const mainCanvas = GameState.mainCanvas;
    const terrain = GameState.terrain;

    const tileSize = 15;
    // size of a visual pixel in canvas pixels
    const pxSize = Math.floor(
        Math.min(window.innerHeight, window.innerWidth * 0.8)
        * window.devicePixelRatio
        / terrain.size
        / tileSize
    );

    document.body.style.fontSize = 0.5 * pxSize * tileSize / window.devicePixelRatio + 'px';
    mainCanvas.width = mainCanvas.height = pxSize * tileSize * terrain.size;
    const cssEdgeSize = mainCanvas.width / window.devicePixelRatio;
    GameState.sidebarEl.style.height = mainCanvas.style.width = mainCanvas.style.height = cssEdgeSize + 'px';
    GameState.sidebarEl.style.width = (cssEdgeSize >> 2) + 'px';

    const ctx = mainCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.resetTransform();
    ctx.scale(
        pxSize,
        pxSize,
    );

    range(terrain.size).map(x => {
        range(terrain.size).map(y => {
            // Ground tile
            const isGround = terrain.isGround[x][y];
            if(isGround) {
                if(terrain.computedTowersByLocation[x][y]) {
                    renderSprite(x, y, sprites[3].withColor([200,200,200,255]));
                }else{
                    renderSprite(x, y, sprites[(x + 3 * y) % 7 ? 3 : 2]);
                }
            }else if(terrain.isGround[x][y - 1]) {
                renderSprite(x, y, sprites[7]);
            }else{
                renderSprite(x, y, sprites[11]);
            }

            // Tower
            const maybeComputedTower = terrain.computedTowersByLocation[x][y];
            if(maybeComputedTower) {
                for(const s of getTowerSprites(x, y, maybeComputedTower)) {
                    renderSprite(x, y, s);

                    // sparkle: each pixel should generate a particle every 20 seconds.
                    s.toParticlesSparse(
                        maybeComputedTower._particleFirstRender ? 0.5 : dt / 20
                    ).forEach(([fy, fx, color]) => {
                        ParticleSystem.addParticle(new EnergyFadeParticle(
                            [x * tileSize + fx, y * tileSize + fy],
                            color,
                        ))
                    });
                }
            }

            // // render descent map for debug
            // ctx.font = '3px sans-serif';
            // ctx.fillStyle = `#fff`;
            // ctx.fillText(terrain.descentMap[x][y], x * tileSize + 2, y * tileSize + 2);
        });
    });

    // Unmark towers as new
    mapGrid2d(terrain.computedTowersByLocation, t => t._particleFirstRender = false);

    // Draw enemies
    for(const e of terrain.enemies) {
        for(const s of e.getSprites()) {
            renderSprite(e.pos[0] - 0.5, e.pos[1] - 0.5, s, e.facing);
        }
    }
    // Draw enemy hp
    for(const e of terrain.enemies) {
        if(e.hp < e.maxHp) {
            const [x, y] = e.pos;
            const radius = 4 * e.maxHp / (e.maxHp + 10); // in (0, 1)
            ctx.lineWidth = 1;
            ctx.strokeStyle = '#f26';

            ctx.beginPath();
            ctx.arc(x * 15, y * 15 - 8, radius, 0, Math.PI * 2 * e.hp / e.maxHp);
            ctx.stroke();
        }
    }

    // Draw particles
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
            [0, terrain.computedTowersByLocation[x]?.[y - 1] == computedTower],
            [1, terrain.computedTowersByLocation[x - 1]?.[y] == computedTower],
            [2, terrain.computedTowersByLocation[x]?.[y + 1] == computedTower],
            [3, terrain.computedTowersByLocation[x + 1]?.[y] == computedTower],
        ]) {
            yield sprites[+isSameTower].withRot(sideRot).withColor(outerColor);
        }
    }

    function renderSprite(x, y, sprite, rot=0) {
        ctx.save();
        ctx.scale(tileSize, tileSize);
        ctx.translate(x + 0.5, y + 0.5);
        ctx.rotate(rot);
        ctx.drawImage(sprite.asImage, -0.5, -0.5, 1, 1);
        ctx.restore();
    }

    // function renderSprite(x, y, sprite) {
    //     ctx.drawImage(sprite.asImage, tileSize * x, tileSize * y, tileSize, tileSize);
    // }
}

