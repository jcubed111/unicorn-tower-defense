class AbcEnemy{
    // need a super class to force init order to put level first
    constructor(level, pos) {
        this.level = level;
        this.pos = pos.map(v => v + 0.5);
    }
}

class Enemy extends AbcEnemy{
    displayName = 'Unicorn';
    speed = 2;  // squares/sec
    armor = 0;
    extraDescription;
    banishDamage = 1;  // is doubled each banish
    manaOnKillMult = 1;  // is set to 0 if banished

    targetLocation = null;
    facing = 3;

    slowEffects = [];  // Array<[speedMult, remaining]>

    maxHp = ~~(3 * 1.35 ** this.level);
    hp = 0;  // set by setWaves in Terrain

    // used by wave generator
    delayPerMonster = 1;
    totalHpModifier = 1;

    constructor(level, pos) {
        super(level, pos);
    }

    setLocation(toPos) {
        this.pos = toPos;
        this.targetLocation = null;
    }

    asHoverEl() {
        // can't cache since it changes with hp
        return div('',
            spriteListToEl(...this.getSprites()),
            div('', `${this.displayName}`),
            div('', `hp: ${this.hp} / ${this.maxHp}`),
            div('', `speed: ${this.speed}`),
            div('', `armor: ${this.armor}`),
            div('', this.extraDescription),
        );
    }

    getSquare() {
        return this.pos.map(Math.floor);
    }

    *getSprites() {
        if(this.slowEffects.length) {
            yield sprites[20];
        }
        yield sprites[16 + Math.floor(performance.now() / 200 * this.speed) % 4];
    }

    takeDamage(amt) {
        this.hp -= Math.max(0, amt - this.armor);
    }

    step(dt) {
        if(!this.targetLocation) {
            // TODO: support diagonals?
            const [sx, sy] = this.getSquare();
            this.targetLocation = minByTiesRand(
                [
                    [sx + 1, sy],
                    [sx - 1, sy],
                    [sx, sy - 1],
                    [sx, sy + 1],
                ],
                ([x, y]) => GameState.terrain.descentMap[x]?.[y] ?? 1e8,
            ).map(v => v + randFloat(0.4, 0.6));
        }

        const speed = this.speed * Math.min(
            1,
            ...this.slowEffects.map(s => s[0]),
        );
        this.slowEffects = this.slowEffects
            .map(([a, t]) => [a, t - dt])
            .filter(s => s[1] > 0);

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
}

class SwarmEnemy extends Enemy{
    maxHp = ~~(1.5 * 1.35 ** this.level);
    delayPerMonster = 0.5;
}

class BossEnemy extends Enemy{
    banishDamage = 5;
    maxHp = ~~(8 * 1.5 ** this.level);
    totalHpModifier = 0.1;  // ensure there's only 1 boss
}
