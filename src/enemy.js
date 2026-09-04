// Age every [amount, timeRemaining] effect by dt and drop the expired ones.
const decayEffects = (effects, dt) =>
    effects.flatMap(([v, t]) => (t -= dt) > 0 ? [[v, t]] : []);

class Enemy{
    displayName = 'Unicorn';
    speed = 2;  // squares/sec
    // extraDescription;  // undefined unless a subclass sets it
    // armor = this.level >> 2;  // set in constructor
    banishDamage = 1;  // is doubled each banish
    manaOnKillMult = 1;  // is set to 0 if banished
    landBased = true;

    /* used by wave generator */
    delayPerMonster = 1;
    // Change the wave's total hp by this factor. Higher values make the wave harder.
    totalHpModifier = 1;
    // hpToNumRatio = enemy hp / num enemies
    // higher values produce fewer but beefier enemies
    hpToNumRatio = 0.7;

    /* internal state vars */
    targetLocation = null;
    facing = 3;

    slowEffects = [];  // Array<[speedMult, remaining]>
    fireEffects = [];  // Array<[damagePerSec, timeRemaining]>
    poisonEffects = [];  // Array<[damagePerSec, timeRemaining]>
    _dotAcc = 0;  // fire accumulates += dt * max(fireEffects), then damages upon hitting 1

    maxHp = 0;  // set by setWaves in Terrain
    hp = 0;  // set by setWaves in Terrain

    baseSpriteColor = WHITE;

    constructor(level, pos) {
        this.level = level;
        this.armor = level >> 2;
        this.respawnLocation = addVec(this.pos = addVec(pos, [0.5, 0.5]), [0, 1]);
    }

    setLocation(toPos) {
        this.pos = toPos;
        this.targetLocation = null;
    }

    asHoverEl() {
        // can't cache since it changes with hp
        return div('',
            div('C--floatRight',
                spriteListToEl(this.getSprites()),
            ),
            div('C--infoTitle', `${this.displayName}`),
            div('C--secondary', `Wave ${this.level + 1}`),
            div('C--infoGrid',
                `${this.hp} / ${this.maxHp}`,
                styled('span', 'C--secondary', 'hp'),

                this.speed,
                styled('span', 'C--secondary', 'speed'),

                this.armor > 0 && [
                    styled('span', 'C--armorColor', this.armor),
                    styled('span', 'C--secondary', 'armor'),
                ],

                this.manaOnKillMult
                    ? styled('span', 'C--manaColor', ~~(this.maxHp * this.manaOnKillMult) + ' ᚯ')
                    : styled('span', '', '0 ᚯ'),
                styled('span', 'C--secondary', 'reward'),

                styled('span', '', this.banishDamage + ' ♥'),
                styled('span', 'C--secondary', 'banish cost'),
            ),
            div('', this.extraDescription),
        );
    }

    getSquare() {
        return this.pos.map(Math.floor);
    }

    getSprites() {
        const s = sprites[
            16 + ((GameState.terrain.terrainTotalTime * 3 * this.speed) & 3)
        ].withColor(this.baseSpriteColor);
        return [
            ...(this.slowEffects.length ? [sprites[20].withColor([59, 124, 255, 255])] : []),
            this.poisonEffects.length ? s.withColor([150, 255, 150, 255]) : s,
        ];
    }

    takeDamage(amt) {
        this.hp -= Math.max(0, amt - this.armor);
    }

    onDeath() {
        // pass
    }

    step(dt) {
        // Damage over time
        // Technically there can be rounding errors in the fire calc, but they're in favor
        // of the player (eg, a fire effect might get applied for `dt` when it only has `dt / 2`s remaining)
        this._dotAcc += dt * (Math.max(0, ...this.fireEffects.map(f => f[0]))
            + this.poisonEffects.reduce((a, b) => a + b[0], 0));
        this.hp -= ~~this._dotAcc;
        this._dotAcc %= 1;

        this.fireEffects = decayEffects(this.fireEffects, dt);
        this.poisonEffects = decayEffects(this.poisonEffects, dt);

        // determine speed
        const speed = this.speed * Math.min(
            1,
            ...this.slowEffects.map(s => s[0]),
        );
        this.slowEffects = decayEffects(this.slowEffects, dt);

        // Movement
        if(!this.targetLocation) {
            // TODO: support diagonals?
            const square = this.getSquare();

            // we're at the goal; spin in palce lol
            if(grid2dAt(GameState.terrain.descentMap, square) == 0) {
                this.facing += dt * speed * 2;
                return;
            }

            this.targetLocation = this.getTarget(square);
        }


        const delta = addVecWithBScaled(this.targetLocation, this.pos, -1);
        const [dx, dy] = delta;
        const dist = Math.hypot(dx, dy);
        const moveAmount = speed * dt;
        if(dist <= moveAmount) {
            this.pos = this.targetLocation;
            this.targetLocation = null;
        }else{
            this.pos = addVecWithBScaled(this.pos, delta, moveAmount / dist);
        }

        // update facing direction
        const heading = Math.atan2(dx, -dy);
        const facingError = heading - this.facing;
        if(Math.abs(facingError) > Math.PI) this.facing += Math.PI * 2 * Math.sign(facingError);
        // re-read this.facing: the wrap above may have just moved it.
        // moveAmount is speed * dt, so we stil lscale correctly with time step
        this.facing += (heading - this.facing) * (1 - 2 ** (-5 * moveAmount));

        // return augmented dt
        return dt * speed;
    }

    getTarget(square) {
        return minByTiesRand(
            CARDINAL_DIRS.map(dir => addVec(square, dir)),
            pos => grid2dAt(GameState.terrain.descentMap, pos) ?? 1e8,
        ).map(v => v + randFloat(0.4, 0.6));
    }
}

class Rhinoicorn extends Enemy{
    displayName = 'Rhinoicorn';
    speed = 1.33;
    armor = (this.level + 1) >> 1;
    // totalHpModifier = 0.7;
    hpToNumRatio = 1.5;
    // manaOnKillMult = 1.5;
    // TODO: better rhino sprites?
    baseSpriteColor = [160, 160, 160, 255];
}

class SwarmEnemy extends Enemy{
    displayName = 'Minicorn';
    armor = this.level >> 3;
    hpToNumRatio = 0.2;
    delayPerMonster = 0.5;
    getSprites() {
        return super.getSprites().map(s => s.withScale(0.7));
    }
}

class RunnerEnemy extends Enemy{
    displayName = 'Dashicorn';
    speed = 4;
    armor = 0;
    hpToNumRatio = 0.5;
    delayPerMonster = 0.25;
}

class Pegacorn extends Enemy{
    displayName = 'Pegacorn';
    speed = 2;
    armor = 0;
    hpToNumRatio = 1.0;
    totalHpModifier = 0.75;
    manaOnKillMult = 1.5;
    landBased = false;

    constructor(level) {
        super(level, [~~randFloat(1, 15), -1]);
    }

    getSprites() {
        return [...super.getSprites(), sprites[37 + ((GameState.terrain.terrainTotalTime * 3 * this.speed) & 1)]];
    }

    getTarget(square) {
        const [sx, sy] = square;
        const [gx, gy] = GameState.terrain.goalLocation;

        return addVec(square, randChoice(
            [
                gx > sx && sy >= 0 && [1.5, 0.5],
                gx < sx && sy >= 0 && [-0.5, 0.5],
                gy < sy && [0.5, -0.5],
                // this one is doubled so it's more likely to move down
                // otherwise they tend to line up north of the wizard
                gy > sy && [0.5, 1.5],
                gy > sy && [0.5, 1.5],
            ].filter(t => t)
        ));
    }
}

class Megacorn extends Enemy{
    displayName = 'Megacorn';
    armor = this.level;
    hpToNumRatio = 15;
    delayPerMonster = 1.0;
    getSprites() {
        return super.getSprites().map(s => s.withScale(1.4));
    }
}

class Rooicorn extends Enemy{
    displayName = 'Rooicorn';
    speed = 1.5;
    armor = this.level >> 2;
    hpToNumRatio = 15;
    totalHpModifier = 0.4;
    delayPerMonster = 2.0;
    baseSpriteColor = [180, 120, 90, 255];
    extraDescription = 'Explodes into 8 Minicorns on death';

    onDeath() {
        range(8).forEach(i => {
            const e = new SwarmEnemy(this.level, this.getSquare());
            e.hp = e.maxHp = (this.maxHp >> 3) || 1;
            e.respawnLocation = this.respawnLocation;
            GameState.terrain.enemies.add(e);
        });
    }
}

class BossEnemy extends Enemy{
    displayName = 'Shadowcorn';
    armor = this.level >> 1;
    hpToNumRatio = 1000;
    manaOnKillMult = 2;
    banishDamage = 5;
    baseSpriteColor = [50, 40, 40, 255];
}

class Rainbowicorn extends Enemy{
    displayName = 'Rainbowicorn';
    hpToNumRatio = 20;

    getSprites() {
        // Cycle through the rainbow colors
        this.baseSpriteColor = [
            [236, 204, 202, 255],
            [242, 224, 194, 255],
            [240, 235, 194, 255],
            [192, 235, 210, 255],
            [208, 208, 242, 255],
            [234, 209, 239, 255],
        ][(~~GameState.terrain.terrainTotalTime) % 6];
        return super.getSprites();
    }

    getTarget(square) {
        const w = grid2dAt(GameState.terrain.descentMap, square);
        // TODO: use min by descent map instead of find
        let bridgePos = CARDINAL_DIRS.map(dir => {
            // return gapPos | false
            const gapPos = addVec(square, dir);
            const landPos = addVecWithBScaled(square, dir, 2);
            return grid2dAt(GameState.terrain.isGround, square) == 1
                && grid2dAt(GameState.terrain.isGround, gapPos) == 0
                && grid2dAt(GameState.terrain.isGround, landPos) == 1
                && grid2dAt(GameState.terrain.descentMap, landPos) < w - 1
                && gapPos;  // return the gap pos
        }).filter(f => f)[0];

        if(bridgePos) {
            const [bx, by] = bridgePos;
            const isVertical = bx == square[0];
            GameState.terrain.isGround[bx][by] = isVertical ? 2 : 3;
            GameState.terrain.recomputeDerivedValues();

            ParticleSystem.sparkleSpriteAt(
                sprites[33].withRot(isVertical ? 0 : 1),
                bridgePos,
                0.25,
            );
            // ParticleSystem.explodeSpritesAt(bridgePos, sprite);

            // always move to the new bridge
            return addVec(bridgePos, [0.5, 0.5]);
        }

        return super.getTarget(square);
    }
}

class Narwhalicorn extends Enemy{
    displayName = 'Narwhalicorn';
    speed = 1.0;
    armor = 0;
    manaOnKillMult = 3;
    landBased = false;

    constructor(level, path) {
        super(level, path[0]);
        this.hp = this.maxHp = this.level ** 2;
        this.path = [...path];
    }

    step(dt) {
        // Water enemies can't be aflame
        this.fireEffects = [];
        super.step(dt);
    }

    getSprites() {
        return [sprites[28].withColor([0, 0, 0, 70])];
    }

    getTarget(square) {
        if(!this.path.length) {
            GameState.terrain.enemies.delete(this);
        }
        return addVec(this.path.shift() ?? square, [0.5, 0.5]);
    }
}

class Kingicorn extends Enemy{
    displayName = 'Kingicorn';
    armor = 40;
    hpToNumRatio = 1000;
    banishDamage = 5;

    getSprites() {
        return [...super.getSprites(), sprites[43]];
    }

    onDeath() {
        const k2 = new Kingicorn2(
            this.level,
            addVec(this.respawnLocation, [-0.5, -0.5]),
        );
        k2.hp = k2.maxHp = this.maxHp * 2;
        k2.respawnLocation = this.respawnLocation;
        GameState.terrain.enemies.add(k2);

        AudioSystem.playRespawn();
        ParticleSystem.spawnParticlePixelLine(
            this.pos,
            this.respawnLocation,
            pos => new EnergyFadeParticle(pos, WHITE),
        );
    }
}

class Kingicorn2 extends Enemy{
    displayName = 'Kingicorn II';
    speed = 4;
    armor = 0;
    banishDamage = 5;
    baseSpriteColor = [150, 150, 150, 255];

    getSprites() {
        return [...super.getSprites(), sprites[43]];
    }

    onDeath() {
        const k2 = new Kingicorn3(
            this.level,
            addVec(this.respawnLocation, [-0.5, -0.5]),
        );
        k2.hp = k2.maxHp = this.maxHp * 2;
        k2.respawnLocation = this.respawnLocation;
        GameState.terrain.enemies.add(k2);

        AudioSystem.playRespawn();
        ParticleSystem.spawnParticlePixelLine(
            this.pos,
            this.respawnLocation,
            pos => new EnergyFadeParticle(pos, WHITE),
        );
    }
}

class Kingicorn3 extends Enemy{
    displayName = 'Kingicorn III';
    armor = 0;
    banishDamage = 5;
    baseSpriteColor = [50, 50, 50, 255];

    _spawnClock = 0;

    getSprites() {
        return [...super.getSprites(), sprites[43]];
    }

    step(dt) {
        const augmentedDt = super.step(dt);
        this._spawnClock += augmentedDt;
        while(this._spawnClock > 3) {
            this._spawnClock -= 3;

            const e = new SwarmEnemy(this.level, this.getSquare());
            e.hp = e.maxHp = (this.maxHp >> 5) || 1;
            e.speed = 3;
            e.respawnLocation = this.respawnLocation;
            GameState.terrain.enemies.add(e);
        }
    }
}
