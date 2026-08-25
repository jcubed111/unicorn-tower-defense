function renderCircleIndicator(
    ctx,
    pos,
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
    ctx.arc(...scaleVec(pos, 15), radius * 15, 0, Math.PI * 2 * pct);
    ctx.stroke();
}

function renderRectIndicator(
    ctx,
    pos,
    radii,
    lineWidth,
    lineColor,
) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = lineColor;
    ctx.lineCap = 'butt';
    ctx.strokeRect(
        ...scaleVec(addVecWithBScaled(pos, radii, -1), 15),
        ...scaleVec(radii, 30),
    );
}

function renderTerrainBase(ctx, dt, terrain) {
    forEachGrid2d(terrain.isGround, (isGround, pos) => {
        const [x, y] = pos;
        const maybeComputedTower = grid2dAt(terrain.computedTowersByLocation, pos);
        // ground edge
        if(isGround != 1 && grid2dAt(terrain.isGround, addVec(pos, [0, -1])) == 1) {
            renderSprite(ctx, pos, sprites[performance.now() & 1024 ? 7 : 11]);
        }
        if(isGround) {
            const sprite = isGround == 1
                ? maybeComputedTower
                    ? sprites[3].withColor([200,200,200,255])
                    : sprites[(x + 3 * y) % 7 ? 3 : 2]
                // rainbow
                : sprites[33 + ((isGround - 2) >> 2)].withRot((isGround - 2) & 3)
            renderSprite(ctx, pos, sprite);
            // sparkle the rainbow paths
            if(isGround != 1) {
                ParticleSystem.sparkleSpriteAt(sprite, pos, dt / 100);
            }
        }

        // Marked tiles
        grid2dAt(terrain.markedTileSprites, pos).forEach(
            s => renderSprite(ctx, pos, s)
        );

        // Tower
        if(maybeComputedTower) {
            for(const s of getTowerSprites(
                pos,
                grid2dAt(terrain.rawTowers, pos),
                maybeComputedTower.getColor(),
                neighborPos =>
                    grid2dAt(terrain.computedTowersByLocation, neighborPos) == maybeComputedTower,
            )) {
                renderSprite(ctx, pos, s);

                // sparkle: each pixel should generate a particle every 20 seconds.
                ParticleSystem.sparkleSpriteAt(
                    s,
                    pos,
                    (maybeComputedTower._particleFirstRender && dt) ? 0.5 : dt / 20,
                );
            }
        }

        // // render descent map for debug
        // ctx.font = '3px sans-serif';
        // ctx.fillStyle = `#fff`;
        // ctx.fillText(grid2dAt(terrain.descentMap, pos), ...addVecWithBScaled([2, 2], pos, tileSize));
    });
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
    document.documentElement.style.fontSize =
        (GameState.pxCssSize = pxSize / window.devicePixelRatio) + 'px';
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
    renderTerrainBase(ctx, dt, terrain);

    // Render tower special effects
    terrain.computedTowersArr.forEach(t => t.renderSpecialEffects(dt, ctx));

    // Unmark towers as new
    forEachGrid2d(terrain.computedTowersByLocation, t => t._particleFirstRender = false);

    // Draw wizard
    if(terrain.health >= 0) {
        renderSprite(ctx, terrain.goalLocation, sprites[30]);
        // needs to match explode location in Terrain.step
        renderSprite(ctx, addVec(terrain.goalLocation, [0, -0.333]), sprites[31]);
    }else{
        renderSprite(ctx, terrain.goalLocation, sprites[30].withColor([0, 0, 0, 127]));
    }

    // Draw enemies
    for(const e of terrain.enemies) {
        // enemy armor
        if(e.armor) {
            renderCircleIndicator(ctx, e.pos, 0.4, Math.log2(e.armor + 1), '#b3ea', 1);
        }

        for(const s of e.getSprites()) {
            const pos = addVec(e.pos, [-0.5, -0.5]);
            renderSprite(ctx, pos, s, e.facing);
            if(e.fireEffects.length) {
                const fireAmt = Math.max(...e.fireEffects.map(f => f[0])) ** 0.5;
                ParticleSystem.sparkleSpriteAt(
                    s,
                    pos,
                    dt / 2 * fireAmt,
                    p => new FireParticle(p),
                );
            }
        }
    }
    // Draw enemy hp
    for(const e of terrain.enemies) {
        if(e.hp < e.maxHp) {
            const radius = 0.27 * e.maxHp / (e.maxHp + 10); // in (0, 1)

            renderCircleIndicator(
                ctx,
                addVec(e.pos, [0, -0.4]),
                radius,
                1,
                '#f26',
                e.hp / e.maxHp,
            );
        }
    }

    // Terrain specific effects
    GameState.terrain.renderSpecialEffects(dt, ctx);

    // Draw particles
    ParticleSystem.render(dt, ctx);

    // Draw hovered tower info
    if(GameState.hoveringElOverride) {
        GameState.hoverInfoEl.replaceChildren(GameState.hoveringElOverride);

    }else if(GameState.hoveringTower && GameState.hoveringPos) {
        // We use `&& hoveringPos` here to distinguish from non-world towers (eg the runebook)
        GameState.hoveringTower.renderRangeGuide(ctx);
        renderCircleIndicator(
            ctx,
            GameState.hoveringTower.center,
            0.125,
            0.5,
            '#fff',
            GameState.hoveringTower.charge / GameState.hoveringTower.chargeTime,
        );
        GameState.hoverInfoEl.replaceChildren(
            GameState.hoveringTower.asHoverEl(),
        );

    }else if(GameState.hoveringPos) {
        const dist2 = e => dist2Vec(e.pos, GameState.hoveringPos);
        const inRange = [...terrain.enemies].filter(e => dist2(e) <= 0.25);
        const maybeEnemy = inRange.length && minByTiesRand(inRange, dist2);
        GameState.hoverInfoEl.replaceChildren(
            maybeEnemy
                ? maybeEnemy.asHoverEl()
                : (grid2dAt(terrain.tileHoverEls, GameState.hoveringPos) ?? '')
        );

    }else{
        GameState.hoverInfoEl.replaceChildren();
    }

    // Hovering rune placement indicator
    if(GameState.hoveringPos && GameState.drawType) {
        const pos = GameState.hoveringPos.map(v => ~~v);
        const [x, y] = pos;
        if(grid2dAt(terrain.isGround, pos) == 1) {
            const [towerType, towerLevel] = grid2dAt(terrain.rawTowers, pos);
            const spriteOffsetForLevel = towerType == GameState.drawType ? towerLevel : 0;
            if(spriteOffsetForLevel <= 2) {
                const spriteIndex = [
                    4, 8, 12,  // runes
                    0, 0, 0,  // spells
                    23,  // level select
                ][GameState.drawType - 1] + spriteOffsetForLevel;
                renderSprite(
                    ctx,
                    pos,
                    sprites[spriteIndex]
                        .withColor(HALF_WHITE)
                        .withRot(GameState.drawType == 7 ? (performance.now() >> 9) & 3 : 0),
                );
            }
        }
    }

    // Update rune draw buttons
    GameState.manaDisplay.innerText = GameState.terrain.mana;
    GameState.heartDisplay.innerText = GameState.terrain.health;
    GameState.runeButtons.forEach((el, i) => {
        const cost = GameState.terrain.towerDrawCosts[i + 1];
        const canAfford = cost <= GameState.terrain.mana;
        el.classList.toggle('C--runeButtonActive', i + 1 == GameState.drawType);
        el.classList.toggle('C--runeButtonTooExpensive', !canAfford);
        el.children[0].innerText = cost + ' ᚯ';
        const displayEl = sprites[i * 4 + 4].withColor(
            canAfford
                ? normalizedTowerRgb(i == 0, i == 1, i == 2)
                : [127, 127, 127, 255],
        ).asImage;
        // Chrome needs this line to function; its `replaceChildren` isn't stable
        if(el.children[1].children[0] != displayEl) {
            el.children[1].replaceChildren(displayEl);
        }
    });
}
