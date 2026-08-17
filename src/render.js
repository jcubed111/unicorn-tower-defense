function render(dt) {
    const mainCanvas = GameState.mainCanvas;
    const terrain = GameState.terrain;

    // size of a visual pixel in canvas pixels
    const pxSize = Math.floor(
        Math.min(window.innerHeight, window.innerWidth * 0.8)
        * window.devicePixelRatio
        / terrain.size
        / tileSize
    );

    document.documentElement.style.fontSize = 0.5 * pxSize * tileSize / window.devicePixelRatio + 'px';
    mainCanvas.width = mainCanvas.height = pxSize * tileSize * terrain.size;
    const cssEdgeSize = mainCanvas.width / window.devicePixelRatio;
    GameState.sidebarEl.style.height = mainCanvas.style.width = mainCanvas.style.height = cssEdgeSize + 'px';
    GameState.sidebarEl.style.width = (cssEdgeSize >> 2) + 'px';

    const ctx = mainCanvas.getContext('2d');
    ctx.setTransform(pxSize, 0, 0, pxSize, 0, 0);

    range(terrain.size).map(x => {
        range(terrain.size).map(y => {
            // Ground tile
            const isGround = terrain.isGround[x][y];
            if(isGround) {
                if(terrain.computedTowersByLocation[x][y]) {
                    renderSprite(ctx, x, y, sprites[3].withColor([200,200,200,255]));
                }else{
                    renderSprite(ctx, x, y, sprites[(x + 3 * y) % 7 ? 3 : 2]);
                }
            }else if(terrain.isGround[x][y - 1]) {
                renderSprite(ctx, x, y, sprites[7]);
            }else{
                renderSprite(ctx, x, y, sprites[11]);
            }

            // Tower
            const maybeComputedTower = terrain.computedTowersByLocation[x][y];
            if(maybeComputedTower) {
                for(const s of getTowerSprites(
                    x, y,
                    terrain.rawTowers[x][y],
                    maybeComputedTower.getColor(),
                    (x, y) => terrain.computedTowersByLocation[x]?.[y] == maybeComputedTower,
                )) {
                    renderSprite(ctx, x, y, s);

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
            renderSprite(ctx, e.pos[0] - 0.5, e.pos[1] - 0.5, s, e.facing);
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
}
