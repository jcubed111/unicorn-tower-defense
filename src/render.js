function renderCircleIndicator(
    ctx,
    x, y,
    radius,
    lineWidth,
    lineColor,
    pct,
) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = lineColor;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    // pct % 1, except 0 -> 0, and whole numbers -> 1.
    // allows us to show, eg 1.5 as 0.5, while still working for 0-1
    // Used by charge tower
    pct -= ~~(pct - .0001);
    ctx.arc(x * 15, y * 15, radius * 15, 0, Math.PI * 2 * pct);
    ctx.stroke();
}

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

    // Set rem to 1/2 tile size
    document.documentElement.style.fontSize = pxSize / window.devicePixelRatio + 'px';
    mainCanvas.width = 1.25 * pxSize * tileSize * terrain.size;
    mainCanvas.height = pxSize * tileSize * terrain.size;
    const cssEdgeSize = mainCanvas.height / window.devicePixelRatio;
    mainCanvas.style.width = 1.25 * cssEdgeSize + 'px';
    mainCanvas.style.height = cssEdgeSize + 'px';
    // GameState.sidebarEl.style.width = (cssEdgeSize >> 2) + 'px';

    const ctx = mainCanvas.getContext('2d');
    ctx.setTransform(pxSize, 0, 0, pxSize, 0, 0);

    if(terrain.screenShake > 0.1) {
        ctx.translate(randFloat(-terrain.screenShake, terrain.screenShake), randFloat(-terrain.screenShake, terrain.screenShake))
        // decay with half life of 2s
    }
    terrain.screenShake *= 0.5 ** (4 * dt);

    // Render terrain & towers
    mapGrid2d(terrain.isGround, (isGround, [x, y]) => {
        renderSprite(ctx, x, y,
            isGround
                ? terrain.computedTowersByLocation[x][y]
                    ? sprites[3].withColor([200,200,200,255])
                    : sprites[(x + 3 * y) % 7 ? 3 : 2]
                : sprites[terrain.isGround[x][y - 1] ? (performance.now() & 1024 ? 7 : 11) : 15],
        );

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

    // Render tower special effects
    terrain.computedTowersArr.forEach(t => t.renderSpecialEffects(dt, ctx));

    // Unmark towers as new
    mapGrid2d(terrain.computedTowersByLocation, t => t._particleFirstRender = false);

    // Draw wizard
    renderSprite(ctx, ...terrain.goalLocation, sprites[30]);
    renderSprite(ctx, ...terrain.goalLocation, sprites[27]);

    // Draw enemies
    for(const e of terrain.enemies) {
        // enemy armor
        if(e.armor) {
            renderCircleIndicator(ctx, ...e.pos, 0.4, Math.log2(e.armor + 1), '#b3ea', 1);
        }

        for(const s of e.getSprites()) {
            renderSprite(ctx, e.pos[0] - 0.5, e.pos[1] - 0.5, s, e.facing);
            if(e.fireEffects.length) {
                s.toParticlesSparse(dt / 2).map(([fx, fy]) =>
                    ParticleSystem.addParticle(new FireParticle([
                        e.pos[0] * 15 - 7.5 + fx,
                        e.pos[1] * 15 - 7.5 + fy,
                    ]))
                );
            }
        }
    }
    // Draw enemy hp
    for(const e of terrain.enemies) {
        if(e.hp < e.maxHp) {
            const [x, y] = e.pos;
            const radius = 0.27 * e.maxHp / (e.maxHp + 10); // in (0, 1)

            renderCircleIndicator(ctx, x, y - 0.4, radius, 1, '#f26', e.hp / e.maxHp);
        }
    }

    // Draw mana pool
    const rate = terrain.mana / (terrain.mana + 200);
    const colorRate = 255 * terrain.mana / (terrain.mana + 50);
    const col = [~~colorRate, ~~colorRate, ~~colorRate, 255];
    renderSprite(ctx, ...MANA_POOL_POS, sprites[25].withColor(col));
    sprites[25].toParticlesSparse(rate * dt).forEach(([fy, fx, color]) => {
        ParticleSystem.addParticle(new EnergyFadeParticle(
            [MANA_POOL_POS[0] * 15 + fx, MANA_POOL_POS[1] * 15 + fy],
            color,
        ))
    });

    // Draw heart
    renderSprite(ctx, ...HEART_POS, sprites[29]);

    // Draw particles
    ParticleSystem.render(ctx);
    ParticleSystem.step(dt);

    // Draw hovered tower info
    // We use `&& hoveringPos` here to distinguish from non-world towers (eg the runebook)
    if(GameState.hoveringTower && GameState.hoveringPos) {
        const [x, y] = GameState.hoveringTower.center;
        renderCircleIndicator(
            ctx,
            x, y,
            GameState.hoveringTower.range,
            0.5,
            colorAsString(GameState.hoveringTower.getColor()),
            1,
        );
        renderCircleIndicator(
            ctx,
            x, y,
            0.125,
            0.5,
            '#fff',
            GameState.hoveringTower.charge / GameState.hoveringTower.chargeTime,
        );
        GameState.hoverInfoEl.replaceChildren(
            GameState.hoveringTower.asHoverEl(),
        );

    }else if(GameState.hoveringPos) {
        const [x, y] = GameState.hoveringPos;
        const dist2 = e => (e.pos[0] - x) ** 2 + (e.pos[1] - y) ** 2;
        const inRange = [...terrain.enemies].filter(e => dist2(e) <= 0.25);
        const maybeEnemy = inRange.length && minByTiesRand(inRange, dist2);
        GameState.hoverInfoEl.replaceChildren(maybeEnemy ? maybeEnemy.asHoverEl() : '');

    }else{
        GameState.hoverInfoEl.replaceChildren();
    }

    // Update rune draw buttons
    GameState.manaDisplay.innerText = GameState.terrain.mana;
    GameState.heartDisplay.innerText = GameState.terrain.health;
    GameState.runeButtons.forEach((el, i) => {
        const cost = GameState.terrain.getDrawCost(i + 1);
        const canAfford = cost <= GameState.terrain.mana;
        el.classList.toggle('C--runeButtonActive', i + 1 == GameState.drawType);
        el.classList.toggle('C--runeButtonTooExpensive', !canAfford);
        el.children[0].innerText = cost + ' ᚯ';
        el.children[1].replaceChildren(
            sprites[i * 4 + 4].withColor(
                canAfford
                    ? normalizedTowerRgb(i == 0, i == 1, i == 2)
                    : [127, 127, 127, 255],
            ).asImage
        );
    });
}
