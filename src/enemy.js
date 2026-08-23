class AbcEnemy{
    // need a super class to force init order to put level first
    level = 0;
    constructor(level, pos) {
        this.level = level;
        this.pos = pos.map(v => v + 0.5);
    }
}

class Enemy extends AbcEnemy{
    displayName = 'Unicorn';
    speed = 2;  // squares/sec
    armor = this.level >> 2;
    extraDescription;
    banishDamage = 1;  // is doubled each banish
    manaOnKillMult = 1;  // is set to 0 if banished

    targetLocation = null;
    facing = 3;

    slowEffects = [];  // Array<[speedMult, remaining]>
    fireEffects = [];  // Array<[damagePerSec, timeRemaining]>
    poisonEffects = [];  // Array<[damagePerSec, timeRemaining]>
    _dotAcc = 0;  // fire accumulates += dt * max(fireEffects), then damages upon hitting 1

    maxHp = ~~(3 * 1.35 ** this.level);
    hp = 0;  // set by setWaves in Terrain

    // used by wave generator
    delayPerMonster = 1;
    totalHpModifier = 1;

    // constructor(level, pos) {
    //     super(level, pos);
    // }

    setLocation(toPos) {
        this.pos = toPos;
        this.targetLocation = null;
    }

    asHoverEl() {
        // can't cache since it changes with hp
        return div('',
            div('C--floatRight',
                spriteListToEl(...this.getSprites()),
            ),
            div('C--infoTitle', `${this.displayName}`),
            div('C--secondary', `Wave ${this.level + 1}`),
            div('C--infoGrid',
                `${this.hp} / ${this.maxHp}`,
                styled('span', 'C--secondary', 'hp'),

                this.speed,
                styled('span', 'C--secondary', 'speed'),

                this.armor > 0 && [
                    this.armor,
                    styled('span', 'C--secondary', 'armor'),
                ],

                this.manaOnKillMult
                    ? styled('span', 'C--manaColor', this.maxHp * this.manaOnKillMult + ' ᚯ')
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

    *getSprites() {
        if(this.slowEffects.length) {
            yield sprites[20].withColor([59, 124, 255, 255]);
        }
        const s = sprites[16 + Math.floor(performance.now() / 200 * this.speed) % 4];
        if(this.poisonEffects.length) {
            yield s.withColor([150, 255, 150, 255]);
        }else{
            yield s;
        }
    }

    takeDamage(amt) {
        this.hp -= Math.max(0, amt - this.armor);
    }

    step(dt) {
        // Damage over time
        // Technically there can be rounding errors in the fire calc, but they're in favor
        // of the player (eg, a fire effect might get applied for `dt` when it only has `dt / 2`s remaining)
        this._dotAcc += dt * Math.max(0, ...this.fireEffects.map(f => f[0]));
        this._dotAcc += dt * this.poisonEffects.map(f => f[0]).reduce((a, b) => a + b, 0);
        this.hp -= ~~this._dotAcc;
        this._dotAcc %= 1;

        this.fireEffects = this.fireEffects
            .map(([rate, dur]) => [rate, dur - dt])
            .filter(([rate, dur]) => dur > 0);
        this.poisonEffects = this.poisonEffects
            .map(([rate, dur]) => [rate, dur - dt])
            .filter(([rate, dur]) => dur > 0);

        // determine speed
        const speed = this.speed * Math.min(
            1,
            ...this.slowEffects.map(s => s[0]),
        );
        this.slowEffects = this.slowEffects
            .map(([a, t]) => [a, t - dt])
            .filter(s => s[1] > 0);

        // Movement
        if(!this.targetLocation) {
            // TODO: support diagonals?
            const [sx, sy] = this.getSquare();

            // we're at the goal; spin in palce lol
            if(GameState.terrain.descentMap[sx]?.[sy] == 0) {
                this.facing += dt * speed * 2;
                return;
            }

            this.targetLocation = this.getTarget(sx, sy);;
        }


        const [x, y] = this.pos;
        const [tx, ty] = this.targetLocation;
        const dx = tx - x, dy = ty - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const moveAmount = speed * dt;
        if(dist <= moveAmount) {
            this.pos = [tx, ty];
            this.targetLocation = null;
        }else{
            this.pos = [
                x + dx * moveAmount / dist,
                y + dy * moveAmount / dist,
            ];
        }

        // update facing direction
        const facingError = Math.atan2(dx, -dy) - this.facing;
        if(Math.abs(facingError) > Math.PI) this.facing += Math.PI * 2 * Math.sign(facingError);
        // moveAmount is speed * dt, so we stil lscale correctly with time step
        this.facing += (Math.atan2(dx, -dy) - this.facing) * (1 - 2 ** (-5 * moveAmount));
    }

    getTarget(sx, sy) {
        return minByTiesRand(
            [
                [sx + 1, sy],
                [sx - 1, sy],
                [sx, sy - 1],
                [sx, sy + 1],
            ],
            ([x, y]) => GameState.terrain.descentMap[x]?.[y] ?? 1e8,
        ).map(v => v + randFloat(0.4, 0.6));
    }
}

class SwarmEnemy extends Enemy{
    displayName = 'Minicorn';
    maxHp = ~~(1.5 * 1.35 ** this.level);
    delayPerMonster = 0.5;
    armor = 0;
    *getSprites() {
        for(const s of super.getSprites()) {
            yield s.withScale(0.7);
        }
    }
}

class RunnerEnemy extends Enemy{
    displayName = 'Dash-i-corn';
    speed = 4;
    maxHp = ~~(1.5 * 1.25 ** this.level);
    delayPerMonster = 0.25;
    armor = 0;
}

class BossEnemy extends Enemy{
    displayName = 'Bossy Corn';
    banishDamage = 5;
    maxHp = ~~(8 * 1.5 ** this.level);
    totalHpModifier = 0.1;  // ensure there's only 1 boss
    armor = this.level >> 1;
}

class Bridgeicorn extends Enemy{
    displayName = 'Bridgeicorn';
    maxHp = ~~(4 * 1.5 ** this.level);
    totalHpModifier = 0.3;  // so we get 2

    getTarget(sx, sy) {
        const w = GameState.terrain.descentMap[sx]?.[sy];
        let bridgeDir = [
            [0, 1],
            [1, 0],
            [-1, 0],
            [0, -1],
        ].find(([dx, dy]) =>
            GameState.terrain.isGround[sx]?.[sy] == 1
            && GameState.terrain.isGround[sx + dx]?.[sy + dy] == 0
            && GameState.terrain.isGround[sx + 2 * dx]?.[sy + 2 * dy] == 1
            && GameState.terrain.descentMap[sx + 2 * dx]?.[sy + 2 * dy] < w - 1
        );
        if(bridgeDir) {
            const [dx, dy] = bridgeDir;
            GameState.terrain.isGround[sx + dx][sy + dy] = dx == 0 ? 2 : 3;
            GameState.terrain.recomputeDerivedValues();
            const sprite = sprites[33].withRot(dx == 0 ? 0 : 1);
            sprite
                .toParticlesSparse(0.25)
                .forEach(([fy, fx, color]) => {
                    ParticleSystem.addParticle(new EnergyFadeParticle(
                        [(sx + dx) * tileSize + fx, (sy + dy) * tileSize + fy],
                        color,
                    ))
                });
            // ParticleSystem.explodeSpritesAt([sx + dx, sy + dy], sprite);

            // always move to the new bridge
            return [sx + dx + 0.5, sy + dy + 0.5];
        }

        return super.getTarget(sx, sy);
    }
}
