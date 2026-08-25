
const MAX_TOWER_LEVEL = 3;


const normalizedTowerRgb = (r, g, b) => {
    const m = Math.max(r, g, b);
    if(!m) return [0, 0, 0, 255];
    // We boost the luminance of blue, and drop the luminance of green, so it looks more aligned visually.
    return [r / m * 255 + 76 * b / m, g / m * 204 + b / m * 61, b / m * 255, 255].map(clampColorComponent);
}

function * getTowerSprites(pos, rawCell, outerColor, isSameAt) {
    const [rawTowerType, rawTowerLevel] = rawCell;
    if(rawTowerType == 4) {
        yield sprites[32];

    }else{
        const innerSprite = sprites[rawTowerType * 4 + rawTowerLevel - 1];
        const innerColor = lerpArr(
            outerColor,
            normalizedTowerRgb(rawTowerType == 1, rawTowerType == 2, rawTowerType == 3),
            0.5,
        );
        yield innerSprite.withColor(innerColor);
    }

    // the side sprite for each direction; the CARDINAL_DIRS index is the rotation
    for(const [sideRot, dir] of CARDINAL_DIRS.entries()) {
        yield sprites[+isSameAt(addVec(pos, dir))].withRot(sideRot).withColor(outerColor);
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
        forEachGrid2d(towerGrid, (tower, pos) => {
            if(tower) {
                for(const s of getTowerSprites(
                    pos,
                    isDiscovered ? tower : [4, 1],
                    isDiscovered ? outerColor : [150, 150, 150, 255],
                    pos => grid2dAt(towerGrid, pos)?.[0] > 0,
                )) {
                    renderSprite(ctx, pos, s);
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
        this.componentTowers = componentTowers; // Grid2d<[type, level, pos]>
        this.center = [0, 0];
        this.level = 0;
        this.charge = startingCharge;
        forEachGrid2d(componentTowers, maybeTower => {
            if(!maybeTower) return;
            this.level += maybeTower[1];
            // pattern grids (Tower.sourcePattern.asGrid) carry no pos; they're
            // only built for the runebook, so their center is meaningless anyway.
            this.center = addVec(this.center, maybeTower[2] ?? [0, 0]);
            this.size++;
        });
        this.center = addVecWithBScaled([0.5, 0.5], this.center, 1 / this.size);
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
                    this.range.toFixed(2),
                    styled('span', 'C--secondary', 'range'),
                ],
                this.chargeTime > 0 && [
                    (1 / this.chargeTime).toFixed(2),
                    styled('span', 'C--secondary', 'hits / sec'),
                ],
                this.extraDescription?.pop &&  // using .pop as proxy for "isArray"
                    this.extraDescription.map(content =>
                        wrapEl(
                            styled('span', '', content),
                            el => el.style.color = colorAsString(this.getColor())
                        ),
                    ),
            ),
            this.extraDescription && !this.extraDescription.pop &&  // using .pop as proxy for "isArray"
                wrapEl(div('', this.extraDescription), el => el.style.color = colorAsString(this.getColor()))
        );
    }

    renderRangeGuide(ctx) {
        renderCircleIndicator(
            ctx,
            this.center,
            this.range,
            0.5,
            colorAsString(this.getColor()),
            1,
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
            const possibleTargets = this.getTargetsInRange();
            if(possibleTargets.length) {
                this.hit(possibleTargets);
                this.charge = 0;
            }
        }
    }

    getTargetsInRange(pos = this.center, range = this.range) {
        return [...GameState.terrain.enemies].filter(
            e => dist2Vec(e.pos, pos) < range ** 2
                && e.pos[1] > 0
                && e.hp > 0
        );
    }

    hit(targetsInRange) {
        const target = randChoice(targetsInRange);
        target.takeDamage(this.damage);
        this.boltAt(target);
        return target;
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
    // TODO: another red+blue tower

    // withTowerPattern('bbrbb', class extends Tower{
    //     displayName = 'Fear';
    //     // TODO
    // }),

    withTowerPattern(' g |rrr| b ', class extends Tower{
        displayName = 'Meteor';
        damage = 4 * this.level;
        fireDamagePerSec = this.level / 3;
        chargeTime = 5;
        range = 3 + this.level / 2;
        extraDescription = [
            this.fireDamagePerSec.toFixed(2), `fire / sec`,
            5, 'fire duration',
            3, 'splash range',
        ];

        hit(targetsInRange) {
            const target = super.hit(targetsInRange);
            const fireDuration = 5;
            const fireSplash = 3;

            ParticleSystem.spawnFireCircleAt(target.pos, fireSplash, 1);
            this.getTargetsInRange(target.pos, fireSplash).forEach(t => {
                t.fireEffects.push([
                    this.fireDamagePerSec,
                    fireDuration,
                ])
            });
        }
    }),

    withTowerPattern(' b |grg', class extends Tower{
        displayName = 'Heavy';
        chargeTime = 1;
        damage = ~~(1.5 * this.level);
        range = 1 + this.level / 3;
    }),

    withTowerPattern('gb|bb', class extends Tower{
        displayName = 'Sniper';
        chargeTime = 5;
        /** @type {number} */ range = 2 + this.level;
        damage = 5 * this.level;
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

    withTowerPattern('g |gg| b', class extends Tower{
        displayName = 'Allegro';
        // high speed bolt tower
        range = 3.5;
        chargeTime = 2 / this.level;
        damage = 2 + (this.level >> 2);
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

        renderSpecialEffects(dt) {
            // Put a ring of fire at this tower's range
            ParticleSystem.spawnFireCircleAt(this.center, this.range, dt);
        }
    }),

    withTowerPattern('grb', class extends Tower{
        displayName = 'Beam';
        range = 0;
        chargeTime = 2;
        damage = this.level * 2;
        chargeRateModifier = 1 + this.level * 0.05;
        extraDescription = `Beam`;

        getRangePair() {
            return this.componentTowers.length == 1
                ? [0.5, 18]
                : [18, 0.5];
        }

        renderRangeGuide(ctx) {
            renderRectIndicator(
                ctx,
                this.center,
                this.getRangePair(),
                0.5,
                colorAsString(this.getColor()),
            );
        }

        getTargetsInRange([x, y] = this.center) {
            const [rx, ry] = this.getRangePair();
            return [...GameState.terrain.enemies].filter(
                e => {
                    const [ex, ey] = e.pos;
                    return (
                        ex >= x - rx
                        && ex <= x + rx
                        && ey >= y - ry
                        && ey <= y + ry
                        && ey > 0
                        && e.hp > 0
                    );
                }
            );
        }
    }),

    withTowerPattern('gg|b ', class extends Tower{
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
        chargeTime = 4;
        damage = 2 * this.level;
        /** @type {number} */
        maxCharge = this.level + 2;

        extraDescription = [this.maxCharge, 'capacity'];

        step(dt) {
            this.charge = Math.min(this.charge + dt, this.chargeTime * this.maxCharge);
            while(this.charge >= this.chargeTime) {
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
            const angle = performance.now() / 6e3 + i * Math.PI * 2 / this.maxCharge;
            return addVecWithBScaled(
                this.center,
                [Math.cos(angle), Math.sin(angle)],
                0.7,
            );
        }

        renderSpecialEffects(dt, ctx) {
            range(~~(this.charge / this.chargeTime)).map(i => {
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(...scaleVec(this.getChargeOrbLocation(i), 15), 1.5, 0, Math.PI * 2);
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
        damage = 1 + 2 * this.level;
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
