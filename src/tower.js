
const MAX_TOWER_LEVEL = 3;


const normalizedTowerRgb = (r, g, b) => {
    const m = Math.max(r, g, b);
    if(!m) return [0, 0, 0, 255];
    // We boost the luminance of blue, and drop the luminance of green, so it looks more aligned visually.
    return [r / m * 255 + 76 * b / m, g / m * 204 + b / m * 61, b / m * 255, 255].map(clampColorComponent);
}

function * getTowerSprites(x, y, rawCell, outerColor, isSameAt) {
    const [rawTowerType, rawTowerLevel] = rawCell;
    if(rawTowerType == 4) {
        yield sprites[32];

    }else{
        const innerSprite = sprites[rawTowerType * 4 + rawTowerLevel - 1];
        const innerColor = lerpColor(
            outerColor,
            normalizedTowerRgb(rawTowerType == 1, rawTowerType == 2, rawTowerType == 3),
            0.5,
        );
        yield innerSprite.withColor(innerColor);
    }

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

    // Grid<null | [towerType, 1]>
    const asGrid = transposeGrid2d(
        stringRepr.split('|').map(row => row.split('').map(
            t => (t = ' rgb'.indexOf(t)) > 0 ? [t, 1] : null,
        )),
    );
    const allForms = allFormsGrid2d(asGrid)

    const values = range(3).fill(0);
    forEachGrid2d(asGrid, c => {
        if(c) values[c[0] - 1]++;
    });
    const outerColor = normalizedTowerRgb(...values);

    Cls.sourcePattern = {
        outerColor,
        allForms,
        makeElement: isDiscovered => towerGridToElement(asGrid, outerColor, isDiscovered),
        asGrid,
    };
    return Cls;
}

function towerGridToElement(towerGrid, outerColor, isDiscovered = true) {
    // towerGrid: Grid2d<[towerType, level] | null>
    // If not discovered, renders as `?`s
    return makeSpriteCanvas(ctx => {
        forEachGrid2d(towerGrid, (tower, [x, y]) => {
            if(tower) {
                for(const s of getTowerSprites(
                    x, y,
                    isDiscovered ? tower : [4, 1],
                    isDiscovered ? outerColor : [150, 150, 150, 255],
                    (x, y) => towerGrid[x]?.[y]?.[0] > 0,
                )) {
                    renderSprite(ctx, x, y, s);
                }
            }
        });
    }, towerGrid.length, towerGrid[0].length);
}

class Tower{
    static sourcePattern;
    displayName = '?';
    chargeTime = 2;
    range = 4;
    charge = 0;
    damage = 2;
    extraDescription;
    /** @type {number} */ level;

    size = 0;
    _particleFirstRender = true;

    constructor(componentTowers, startingCharge = 0) {
        this.componentTowers = componentTowers; // Grid2d<[type, level, x, y]>
        this.center = [0, 0];
        this.level = 0;
        this.charge = startingCharge;
        forEachGrid2d(componentTowers, maybeTower => {
            this.level += maybeTower?.[1] ?? 0;
            this.center[0] += maybeTower?.[2] ?? 0;
            this.center[1] += maybeTower?.[3] ?? 0;
            this.size += !!maybeTower;
        });
        this.center = this.center.map(c => c / this.size + 0.5);
    }

    _asHoverElResult;
    asHoverEl() {
        return this._asHoverElResult ??= div('',
            div('C--floatRight', towerGridToElement(
                this.componentTowers,
                this.getColor(),
            )),
            div('C--infoTitle', `${this.displayName}`),
            div('C--secondary', `Level ${this.level}`),
            div('C--infoGrid',
                this.damage > -1 && [
                    `${this.damage}`,
                    styled('span', 'C--secondary', 'damage'),
                ],
                this.range > 0 && [
                    this.range,
                    styled('span', 'C--secondary', 'range'),
                ],
                this.chargeTime > 0 && [
                    (1 / this.chargeTime).toFixed(2),
                    styled('span', 'C--secondary', 'hits / sec'),
                ],
                this.extraDescription?.pop && [  // using .pop as proxy for "isArray"
                    wrapEl(styled('span', '', this.extraDescription[0]), el => el.style.color = colorAsString(this.getColor())),
                    wrapEl(styled('span', '', this.extraDescription[1]), el => el.style.color = colorAsString(this.getColor())),
                ],
            ),
            this.extraDescription && !this.extraDescription.pop &&  // using .pop as proxy for "isArray"
                wrapEl(div('', this.extraDescription), el => el.style.color = colorAsString(this.getColor()))
        );
    }

    renderSpecialEffects(dt, ctx) {
        // pass
    }

    isDiscovered() {
        return getLocalStorageItem(this.displayName);
    }
    setDiscovered() {
        if(!this.isDiscovered()) {
            setLocalStorageItem(this.displayName, 1);
            GameState.rerenderRunebook();
        }
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

    // TODO: 5-cell towers (1 or 2?)
    // TODO: 'rrr| b | g ' maybe?
    // TODO: A white tower

    // withTowerPattern('bbrbb', class extends Tower{
    //     displayName = 'Fear';
    //     // TODO
    // }),

    // withTowerPattern('rb|br', class extends Tower{
    //     displayName = '???';
    //     // TODO
    // }),

    withTowerPattern('gb|bb', class extends Tower{
        displayName = 'Sniper';
        chargeTime = 10;
        /** @type {number} */ range = 2 + this.level;
        damage = 16 * this.level;
    }),

    withTowerPattern('bb|bb', class extends Tower{
        displayName = 'Slow';
        damage = 0;
        slowAmount = 3 / this.level;
        chargeTime = 0.25;
        range = 1 + this.level / 2;
        extraDescription = [`${~~(100 - this.slowAmount * 100)}%`, 'slowing'];

        hit(targetsInRange) {
            targetsInRange.forEach(t => {
                t.slowEffects.push([this.slowAmount, this.chargeTime * 1.1])
            });
        }
    }),

    withTowerPattern('g |gg| g', class extends Tower{
        displayName = 'Allegro';
        // simple bolt tower
        range = 3.5;
        chargeTime = 2 / this.level;
        damage = 3;
        isDiscovered() { return true; }
    }),

    withTowerPattern('rg|bb', class extends Tower{
        displayName = 'Anti-Armor';
        range = 4;
        chargeTime = 8 / this.level;
        damage = 0;
        armorReduction = 1;
        extraDescription = [this.armorReduction, `armor remove`];

        getTargetsInRange() {
            return super.getTargetsInRange().filter(t => t.armor > 0);
        }

        hit(targetsInRange) {
            const target = randChoice(targetsInRange);
            target.armor = Math.max(0, target.armor - this.armorReduction);
            this.boltAt(target);
        }
    }),

    withTowerPattern('rgr', class extends Tower{
        displayName = 'Fire';
        damage = -1;  // so we don't show at all
        fireDamagePerSec = this.level / 3;
        chargeTime = 0.25;
        range = 1.75 + this.level / 4;
        extraDescription = [this.fireDamagePerSec.toFixed(2), `fire / sec`];

        hit(targetsInRange) {
            targetsInRange.forEach(t => {
                t.fireEffects.push([
                    this.fireDamagePerSec,
                    this.chargeTime * 1.1,
                ])
            });
        }

        renderSpecialEffects(dt, ctx) {
            // Put a ring of fire at this tower's range
            range(probRound(dt * this.range * 15 * 6)).forEach(i => {
                const [cx, cy] = this.center;
                const [rx, ry] = randVec(this.range);
                const px = cx + rx, py = cy + ry;
                if(
                    GameState.terrain.isGround[~~px]?.[~~py]
                    && !GameState.terrain.computedTowersByLocation[~~px]?.[~~py]
                ) {
                    ParticleSystem.addParticle(new FireParticle(
                        [~~((cx + rx) * 15), ~~((cy + ry) * 15)],
                    ))
                }
            });
        }
    }),

    withTowerPattern('gg| b', class extends Tower{
        displayName = 'Poison';
        range = 3;
        chargeTime = 2;
        damage = 4 * this.level;
        /** @type {number} */
        over = 2 * this.level;
        extraDescription = `Damage dealt over ${this.over}s`;

        hit(targetsInRange) {
            const target = randChoice(targetsInRange);
            target.poisonEffects.push([
                this.damage / this.over,
                this.over,
            ]);
            this.boltAt(target);
        }
    }),

    withTowerPattern('gb', class extends Tower{
        displayName = 'Mana Leech';
        range = 2;
        chargeTime = 2;
        damage = 2 * this.level;
        manaLeech = this.level - 1;

        extraDescription = [`+${this.manaLeech} ᚯ`, `/ hit`];

        hit(targetsInRange) {
            const target = randChoice(targetsInRange);
            if(target.manaOnKillMult > 0) {
                ParticleSystem.explodeManaAt(target.pos, this.manaLeech);
                GameState.terrain.mana += this.manaLeech;
            }
            target.takeDamage(this.damage);
            this.boltAt(target);
        }
    }),

    withTowerPattern('rb', class extends Tower{
        displayName = 'Charge';
        range = 2;
        chargeTime = 3;
        damage = 2 * this.level;
        /** @type {number} */
        maxCharge = this.level + 1;

        extraDescription = [this.maxCharge, 'capacity'];

        step(dt) {
            this.charge = Math.min(this.charge + dt, this.chargeTime * this.maxCharge);
            while(this.charge >= this.chargeTime) {
                const [x, y] = this.center;
                const possibleTargets = this.getTargetsInRange();
                const i = ~~(this.charge / this.chargeTime) - 1;
                if(possibleTargets.length) {
                    const target = randChoice(possibleTargets);
                    target.takeDamage(this.damage);
                    this.boltAt(target, this.getChargeOrbLocation(i));

                    this.charge -= this.chargeTime;
                }else{
                    break;
                }
            }
        }

        getChargeOrbLocation(i) {
            const [x, y] = this.center;
            return [
                x + Math.cos(performance.now() / 6e3 + i * Math.PI * 2 / this.maxCharge) * 0.7,
                y + Math.sin(performance.now() / 6e3 + i * Math.PI * 2 / this.maxCharge) * 0.7,
            ];
        }

        renderSpecialEffects(dt, ctx) {
            range(~~(this.charge / this.chargeTime)).map(i => {
                const [x, y] = this.getChargeOrbLocation(i);
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(x * 15, y * 15, 1.5, 0, Math.PI * 2);
                ctx.fill();
            });
        }
    }),

    withTowerPattern('gr', class extends Tower{
        displayName = 'Lightning';
        chain = this.level - 1;
        extraDescription = [this.chain, 'chain'];
        range = 2.5;
        chargeTime = this.level / 2;
        damage = this.level;

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

    withTowerPattern('r', class extends Tower{
        displayName = 'Red';
        extraDescription = 'AoE';
        // hits all enemies in range on each shot
        range = 3;
        chargeTime = 5 - this.level;
        /** @type {number} */
        damage = 1 + this.level;

        hit(targetsInRange) {
            targetsInRange.forEach(target => {
                target.takeDamage(this.damage);
                this.boltAt(target);
            });
        }
        isDiscovered() { return true; }
    }),

    withTowerPattern('g', class extends Tower{
        displayName = 'Green';
        // simple bolt tower
        range = 2.75 + 0.25 * this.level;
        chargeTime = 2;
        damage = 3 * this.level;
        isDiscovered() { return true; }
    }),

    withTowerPattern('b', class extends Tower{
        displayName = 'Blue';
        // Doesn't attack, just blocks
        chargeTime = 0;
        range = 0;
        damage = 0;
        extraDescription = 'Cannot attack';
        isDiscovered() { return true; }
    }),
];
