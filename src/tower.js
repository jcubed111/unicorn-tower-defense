
const MAX_TOWER_LEVEL = 3;

const decodeTowerType = n => 'rgb'.indexOf(n) + 1;

const normalizedTowerRgb = (r, g, b) => {
    const m = Math.max(r, g, b);
    if(!m) return [0, 0, 0, 255];
    // We boost the luminance of blue, and drop the luminance of green, so it looks more aligned visually.
    return [r / m * 255 + 76 * b / m, g / m * 204 + b / m * 61, b / m * 255, 255].map(clampColorComponent);
}

function * getTowerSprites(x, y, rawCell, outerColor, isSameAt) {
    const [rawTowerType, rawTowerLevel] = rawCell;
    const innerSprite = sprites[rawTowerType * 4 + rawTowerLevel - 1];
    const innerColor = lerpColor(
        outerColor,
        normalizedTowerRgb(rawTowerType == 1, rawTowerType == 2, rawTowerType == 3),
        0.5,
    );
    yield innerSprite.withColor(innerColor);

    for(const [sideRot, isSameTower] of [
        [0, isSameAt(x,     y - 1)],
        [1, isSameAt(x - 1, y)],
        [2, isSameAt(x,     y + 1)],
        [3, isSameAt(x + 1, y)],
    ]) {
        yield sprites[+isSameTower].withRot(sideRot).withColor(outerColor);
    }
}

function withTowerPattern(stringRepr, Cls) {
    // Decorates a Tower class to add it's pattern as a static.
    // Used over `static` since that causes closure compler to freak.
    // NOTE: super important that stringRepr is a perfect grid with every row being
    // the same size. We don't check but the game will crash otherwise.

    const asGrid = stringRepr.split('|').map(row => row.split('').map(decodeTowerType));
    const allFormsAsIndexed = allFormsGrid2d(asGrid).map(
        g => grid2dToIndexed(g).filter(g => g[2])
    );

    const values = range(3).fill(0);
    mapGrid2d(asGrid, c => {
        if(c) values[c - 1]++;
    });
    const outerColor = normalizedTowerRgb(...values);

    Cls.sourcePattern = {
        outerColor,
        allFormsAsIndexed,
        // the number of towers contained in this sourcePattern
        size: allFormsAsIndexed[0].length,
        makeElement: () => {
            return makeSpriteCanvas(ctx => {
                mapGrid2d(asGrid, (c, [y, x]) => {
                    for(const s of getTowerSprites(
                        x, y,
                        [c, 1],
                        outerColor,
                        (x, y) => asGrid[y]?.[x] > 0,
                    )) {
                        renderSprite(ctx, x, y, s);
                    }
                });
            }, asGrid[0].length, asGrid.length);
        },
    };
    return Cls;
}

class Tower{
    static sourcePattern;
    displayName = '?';
    chargeTime = 2;
    range = 4;
    charge = 0;
    damage = 2;
    extraDescription;

    _particleFirstRender = true;

    constructor(componentTowers) {
        this.componentTowers = componentTowers; // Array<[[x, y], type, level]>
        this.center = [
            this.componentTowers.reduce((acc, [pos]) => acc + pos[0], 0) / this.componentTowers.length + 0.5,
            this.componentTowers.reduce((acc, [pos]) => acc + pos[1], 0) / this.componentTowers.length + 0.5,
        ];
        this.level = this.componentTowers.map(t => t[2]).reduce((a, b) => a + b, 0);
    }

    _asHoverElResult;
    asHoverEl() {
        return this._asHoverElResult ??= div('',
            this.constructor.sourcePattern.makeElement(),
            div('', `${this.displayName} (lvl ${this.level})`),
            div('', `damage: ${this.damage}`),
            div('', `range: ${this.range}`),
            div('', `rate: ${(1 / this.chargeTime).toFixed(2)}`),
            div('', this.extraDescription),
        );
    }

    getColor() {
        return this.constructor.sourcePattern.outerColor;
    }

    step(dt) {
        this.charge = Math.min(this.charge + dt, this.chargeTime);
        if(this.charge >= this.chargeTime) {
            const [x, y] = this.center;
            const possibleTargets = this.getTargetsInRange();
            if(possibleTargets.length) {
                this.hit(possibleTargets);
                this.charge = 0;
            }
        }
    }

    getTargetsInRange([x, y] = this.center) {
        return [...GameState.terrain.enemies].filter(
            e => (e.pos[0] - x) ** 2 + (e.pos[1] - y) ** 2 < this.range ** 2
                && e.pos[1] > 0
                && e.hp > 0
        );
    }

    hit(targetsInRange) {
        const target = randChoice(targetsInRange);
        target.takeDamage(this.damage);
        this.boltAt(target);
    }

    boltAt(target, from = this.center) {
        ParticleSystem.spawnParticlePixelLine(
            from,
            target.pos,
            pos => new EnergyFadeParticle(pos, this.getColor(), 0.5),
        );

        const [r, g, b] = this.getColor();
        AudioSystem.playTowerBolt(r / 64 - g / 64 + b / 32);
    }
}

const orderedTowerTypes = [
    // IMPORTANT: this needs to be ordered from highest priority -> lowest. Usually this means larger towers come first.

    // withTowerPattern('bbrbb', class extends Tower{
    //     displayName = 'Fear';
    //     // TODO
    // }),

    withTowerPattern('gb|bb', class extends Tower{
        displayName = 'Sniper';
        chargeTime = 10;
        /** @type {number} */ range = 3 + this.level;
        damage = 15 * this.level;
    }),

    withTowerPattern('bb|bb', class extends Tower{
        displayName = 'Slow';
        slowAmount = 3 / this.level;
        chargeTime = 0.25;
        range = 1 + this.level / 2;
        extraDescription = `Slow ${~~(100 - this.slowAmount * 100)}%`;

        hit(targetsInRange) {
            targetsInRange.forEach(t => {
                t.slowEffects.push([this.slowAmount, this.chargeTime * 1.1])
            });
        }
    }),

    // withTowerPattern('rgr', class extends Tower{
    //     displayName = 'Fire';
    //     // TODO
    // }),

    // withTowerPattern('ggr', class extends Tower{
    //     displayName = 'Poison';
    //     // TODO
    // }),

    withTowerPattern('rg', class extends Tower{
        displayName = 'Lightning';
        chain = this.level - 1;
        extraDescription = `Chain ${this.chain}`;
        range = 2.5;
        chargeTime = 1;
        damage = 2;

        hit(targetsInRange, i = 0, origin = this.center) {
            const target = randChoice(targetsInRange);
            target.takeDamage(this.damage);
            this.boltAt(target, origin);
            if(i < this.chain) {
                const chainTargets = this.getTargetsInRange(target.pos)
                    .filter(t => t != target);
                if(chainTargets.length) {
                    this.hit(
                        chainTargets,
                        i + 1,
                        target.pos,
                    );
                }
            }
        }
    }),

    // withTowerPattern('gb', class extends Tower{
    //     displayName = 'Freeze';
    //     // TODO
    // }),

    // withTowerPattern('rb', class extends Tower{
    //     displayName = 'Magenta';
    //     // TODO
    // }),

    withTowerPattern('r', class extends Tower{
        displayName = 'Red';
        extraDescription = 'AoE';
        // hits all enemies in range on each shot
        range = 3;
        chargeTime = 5 - this.level;
        damage = 2;

        hit(targetsInRange) {
            targetsInRange.forEach(target => {
                target.takeDamage(this.damage);
                this.boltAt(target);
            });
        }
    }),

    withTowerPattern('g', class extends Tower{
        displayName = 'Green';
        // simple bolt tower
        range = 3;
        chargeTime = 2;
        damage = 3 * this.level;
    }),

    withTowerPattern('b', class extends Tower{
        displayName = 'Blue';
        // Doesn't attack, just blocks
        chargeTime = 0;
        range = 0;
        damage = 0;
    }),
];
