
const MAX_TOWER_LEVEL = 3;


const normalizedTowerRgb = (r, g, b, k = 0) => {
    const m = Math.max(r, g, b);
    if(!m) return [0, 0, 0, 255];
    // kf shifts the whole thing toward black
    const kf = 1 - k / (k + r + g + b);
    // We boost the luminance of blue, and drop the luminance of green, so it looks more aligned visually.
    return [
        kf * (r / m * 255 + 76 * b / m),
        kf * (g / m * 204 + b / m * 61),
        (kf * 0.5 + 0.5) * (b / m * 255),
        255,
    ].map(clampColorComponent);
}

function getTowerSprites(pos, rawCell, outerColor, isSameAt, isDarkTower) {
    const [rawTowerType, rawTowerLevel] = rawCell;
    return [
        rawTowerType == -1
            ? sprites[36]
            : sprites[rawTowerType * 4 + rawTowerLevel - 1].withColor(lerpArr(
                outerColor,
                normalizedTowerRgb(rawTowerType == 1, rawTowerType == 2, rawTowerType == 3, rawTowerType == 4),
                isDarkTower ? 0.75 : 0.5,
            )),
        // the side sprite for each direction; the CARDINAL_DIRS index is the rotation
        ...CARDINAL_DIRS.map((dir, sideRot) =>
            sprites[+isSameAt(addVec(pos, dir))].withRot(sideRot).withColor(outerColor)),
    ];
}

function withTowerPattern(stringRepr, hueOrder, optsOrCls, elseCls=undefined) {
    // Decorates a Tower class to add it's pattern as a static.
    // Used over `static` since that causes closure compler to freak.
    // NOTE: super important that stringRepr is a perfect grid with every row being
    // the same size. We don't check but the game will crash otherwise.

    const Cls = elseCls ?? optsOrCls;
    const {
        outerColor = normalizedTowerRgb(
            frequency([...stringRepr], 'r'),
            frequency([...stringRepr], 'g'),
            frequency([...stringRepr], 'b'),
            frequency([...stringRepr], 'k'),
        ),
        textColor = outerColor,
    } = optsOrCls == Cls ? {} : optsOrCls;

    // Grid<null | [towerType, 1]>
    const asGrid = transposeGrid2d(
        stringRepr.split('|').map(row => row.split('').map(
            t => (t = ' rgbk'.indexOf(t)) > 0 ? [t, 1] : null,
        )),
    );
    const allForms = allFormsGrid2d(asGrid)

    Cls.sourcePattern = {
        outerColor,
        textColor,
        allForms,
        // makeElement: (isDiscovered, forceComponentLevel, cellSizeRem) => towerGridToElement(asGrid, outerColor, isDiscovered, forceComponentLevel, cellSizeRem),
        makeElement: (...args) => towerGridToElement(
            asGrid,
            outerColor,
            stringRepr.includes('k') || new Cls([]).isDarkTower,
            ...args,
        ),
        asGrid,
        hueOrder,
    };
    return Cls;
}

function towerGridToElement(towerGrid, outerColor, isDarkTower, isDiscovered = true, forceComponentLevel = 0, cellSizeRem = 7.5) {
    // towerGrid: Grid2d<[towerType, level] | null>
    // If not discovered, renders as `?`s
    return makeSpriteCanvas(ctx => {
        forEachGrid2d(towerGrid, (tower, pos) => {
            if(tower) {
                getTowerSprites(
                    pos,
                    isDiscovered ? [tower[0], forceComponentLevel || tower[1]] : [-1, 1],
                    isDiscovered ? outerColor : [150, 150, 150, 255],
                    pos => grid2dAt(towerGrid, pos)?.[0] > 0,
                    isDarkTower,
                ).forEach(
                    s => renderSprite(ctx, pos, s)
                );
            }
        });
    }, towerGrid.length, towerGrid[0].length, towerGrid.length * cellSizeRem);
}

class Tower{
    static sourcePattern;
    displayName = '?';
    chargeTime = 2;
    range = 4;
    charge = 0;
    damage = 2;
    extraDescription;
    hideWhenUndiscovered = false;  // don't show in runebook unless discovered
    /** @type {number} */ level;

    size = 0;
    isDarkTower = false;
    _particleFirstRender = true;

    constructor(componentTowers, startingCharge = 0, levelAdd = 0) {
        this.componentTowers = componentTowers; // Grid2d<[type, level, pos]>
        this.center = [0, 0];
        this.level = levelAdd;
        this.charge = startingCharge;
        forEachGrid2d(componentTowers, maybeTower => {
            if(!maybeTower) return;
            this.level += maybeTower[1];
            // pattern grids (Tower.sourcePattern.asGrid) carry no pos; they're
            // only built for the runebook, so their center is meaningless anyway.
            this.center = addVec(this.center, maybeTower[2] ?? [0, 0]);
            this.size++;
            if(maybeTower[0] == 4) this.isDarkTower = true;
        });
        this.center = addVecWithBScaled([0.5, 0.5], this.center, 1 / this.size);
    }

    _asHoverElResult;
    asHoverEl() {
        const color = colorAsString(this.getTextColor());
        return this._asHoverElResult ??= div('',
            div('C--floatRight', towerGridToElement(
                this.componentTowers,
                this.getColor(),
                this.isDarkTower,
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
                Array.isArray(this.extraDescription) &&
                    this.extraDescription.map(content =>
                        wrapEl(
                            styled('span', '', content),
                            el => el.style.color = color
                        ),
                    ),
            ),
            this.extraDescription && !Array.isArray(this.extraDescription) &&
                wrapEl(div('', this.extraDescription), el => el.style.color = color)
        );
    }

    renderRangeGuide(ctx, r = this.range) {
        renderCircleIndicator(
            ctx,
            this.center,
            r,
            0.5,
            colorAsString(this.getColor()),
            1,
        );
    }

    renderSpecialEffects(dt, ctx) {
        // pass
    }

    isDiscovered() {
        return !!getLocalStorageItem(this.displayName);
    }
    setDiscovered() {
        if(!this.isDiscovered()) {
            setLocalStorageItem(this.displayName, 1);
            GameState.rerenderRunebook();
            GameState.toastWaveInfo(
                'New Tower Discovered!',
                wrapEl(
                    div('', this.displayName),
                    el => el.style.color = colorAsString(this.getColor()),
                ),
                this.constructor.sourcePattern.makeElement(1, 1, 12),
            );
        }
    }

    getColor() {
        return this.constructor.sourcePattern.outerColor;
    }

    getTextColor() {
        return this.constructor.sourcePattern.textColor;
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

    // `origin` is where the bolt is drawn from; subclasses that only vary that
    // can reuse this whole method.
    hit(targetsInRange, origin = this.center) {
        const target = randChoice(targetsInRange);
        target.takeDamage(this.damage);
        this.boltAt(target, origin);
        return target;
    }

    boltAt(target, from = this.center) {
        ParticleSystem.spawnParticlePixelLine(
            from,
            target.pos,
            pos => this.isDarkTower
                ? new EnergyFadeParticleDark(pos, this.getColor(), 0.5)
                : new EnergyFadeParticle(pos, this.getColor(), 0.5),
        );

        const [r, g, b] = this.getColor();
        AudioSystem.playTowerBolt(r / 64 - g / 64 + b / 32);
    }
}

let Boost,
    Meteor,
    Heavy,
    Sniper,
    Slow,
    Allegro,
    AntiArmor,
    Fire,
    Beam,
    Poison,
    Ring,
    ManaLeech,
    Charge,
    Lightning,
    Red,
    Green,
    Blue,
    Black;

const orderedTowerTypes = [
    // IMPORTANT: this needs to be ordered from highest priority -> lowest. Usually this means larger towers come first.

    // TODO: 5-cell towers (1 or 2?)
    // TODO: another red+blue tower

    // withTowerPattern('bbrbb', class extends Tower{
    //     displayName = 'Fear';
    //     // TODO
    // }),

    Boost = withTowerPattern(' r |grb|g b', 12.5, {
        outerColor: [20, 20, 20, 255],
        textColor: [200, 200, 200, 255],
    }, class extends Tower{
        displayName = 'Boost';
        chargeTime = 4;
        damage = 2 * this.level;
        range = 2.5;
        extraDescription = "Adds this tower's level to the enclosed tower";
        isDarkTower = true;

        constructor(...args) {
            super(...args);

            if(this.componentTowers.length) {
                // componentTowers is [] for mock towers so this fails
                // componentTowers: Grid2d<[type, level, pos] | null>
                const [[rx1, ry1], [rx2, ry2]] = this.componentTowers
                    .flat()
                    .filter(a => a)
                    .filter(([t]) => t == 1)
                    .map(([t, l, pos]) => pos ?? [0, 0]);
                const [[gx1, gy1] = [0, 0], [bx1, by1] = [0, 0]] = this.componentTowers
                    .flat()
                    .filter(a => a)
                    .map(([t, l, pos]) => pos ?? [0, 0])
                    .filter(([x, y]) => x != rx1 && x != rx2 && y!= ry1 && y != ry2);
                this.boostByLevelSquare = [
                    (gx1 + bx1) >> 1,
                    (gy1 + by1) >> 1,
                ];
            }
        }
    }),

    Meteor = withTowerPattern(' g |rrr| b ', 2, class extends Tower{
        displayName = 'Meteor';
        range = 3 + this.level / 2;
        chargeTime = 5;
        damage = 3 * this.level;
        fireDamagePerSec = this.level / 3;
        extraDescription = [
            this.fireDamagePerSec.toFixed(2), `fire / sec`,
            5, 'fire duration',
            2.5, 'splash range',
        ];

        hit(targetsInRange) {
            const target = super.hit(targetsInRange);
            const fireDuration = 5;
            const fireSplash = 2.5;

            ParticleSystem.spawnFireCircleAt(target.pos, fireSplash, 1, 1);
            this.getTargetsInRange(target.pos, fireSplash).forEach(t => {
                t.fireEffects.push([
                    this.fireDamagePerSec,
                    fireDuration,
                ])
            });
        }
    }),

    // Heavy = withTowerPattern('rrr| b ', class extends Tower{
    //     displayName = 'Heavy';
    //     chargeTime = 1;
    //     damage = ~~(1.5 * this.level);
    //     range = 1 + this.level / 3;
    // }),

    Heavy = withTowerPattern(' b |grg', 5, class extends Tower{
        displayName = 'Heavy';
        range = 1 + this.level / 3;
        chargeTime = 1;
        damage = ~~(1.5 * this.level);
    }),

    Sniper = withTowerPattern('gb|bb', 10, class extends Tower{
        displayName = 'Sniper';
        /** @type {number} */ range = 2 + this.level;
        chargeTime = 5;
        damage = 6 * this.level;
    }),

    Slow = withTowerPattern('bb|bb', 12, class extends Tower{
        displayName = 'Slow';
        range = 1 + this.level / 2;
        chargeTime = 0.25;
        damage = 0;
        slowAmount = 3 / this.level;
        extraDescription = [`${~~(100 - this.slowAmount * 100)}%`, 'slowing'];

        hit(targetsInRange) {
            targetsInRange.forEach(t => {
                t.slowEffects.push([this.slowAmount, this.chargeTime * 1.1])
            });
        }
    }),

    Allegro = withTowerPattern('gg | gb', 7, class extends Tower{
        displayName = 'Allegro';
        // high speed bolt tower
        range = 3.5;
        chargeTime = 1.8 / this.level;
        damage = 3;
        // damage = 2 + (this.level >> 2);
    }),

    AntiArmor = withTowerPattern('rg|bb', 13, class extends Tower{
        displayName = 'Anti-Armor';
        range = 3 + this.level / 4;
        chargeTime = 6 / this.level;
        damage = 4;
        armorRemove = this.level >> 1;
        extraDescription = [this.armorRemove, `armor remove`];

        hit(targetsInRange) {
            // The only tower with a targeting algo lol
            const target = randChoice(
                targetsInRange.filter(t => t.armor > 0)
            ) ?? randChoice(targetsInRange);
            target.armor = Math.max(0, target.armor - this.armorRemove);
            target.takeDamage(this.damage);
            this.boltAt(target);
        }
    }),

    Fire = withTowerPattern('rgr', 3, class extends Tower{
        displayName = 'Fire';
        range = 2 + this.level / 6;
        chargeTime = 0.25;
        damage = -1;  // so we don't show at all
        fireDamagePerSec = this.level / 3;
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

    Beam = withTowerPattern('grb', 14, class extends Tower{
        displayName = 'Beam';
        range = 0;
        chargeTime = 1.5;
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

    Poison = withTowerPattern('gg|b ', 8, class extends Tower{
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

    Ring = withTowerPattern('rb|r ', 0, class extends Tower{
        displayName = 'Ring';
        range = 5;
        chargeTime = 5;
        /** @type {number} */
        damage = 1 + this.level;
        minRange = 3;
        extraDescription = [this.minRange, 'minimum range', 'AoE'];

        getTargetsInRange() {
            return super.getTargetsInRange()
                .filter(e => dist2Vec(e.pos, this.center) >= this.minRange ** 2);
        }

        hit(targetsInRange) {
            targetsInRange.forEach(target => {
                target.takeDamage(this.damage);
                this.boltAt(target);
            });
        }

        renderRangeGuide(ctx) {
            super.renderRangeGuide(ctx, this.minRange);
            super.renderRangeGuide(ctx);
        }
    }),

    /*Black = */withTowerPattern('rk', 11, class extends Tower{
        hideWhenUndiscovered = true;
        displayName = 'Magenta';
        range = 1.5;
        chargeTime = 2;
        damage = 3 * this.level;
    }),

    /*Black = */withTowerPattern('gk', 11, class extends Tower{
        hideWhenUndiscovered = true;
        displayName = 'Forest';
        range = 1.5;
        chargeTime = 2;
        damage = 3 * this.level;
    }),

    /*Black = */withTowerPattern('bk', 11, class extends Tower{
        hideWhenUndiscovered = true;
        displayName = 'Sea';
        range = 1.5;
        chargeTime = 2;
        damage = 3 * this.level;
    }),

    ManaLeech = withTowerPattern('gb', 9, class extends Tower{
        displayName = 'Mana Leech';
        range = 2 + this.level / 4;
        chargeTime = 1.5;
        damage = 2 * this.level;
        manaLeech = this.level;

        extraDescription = [`+${this.manaLeech} ᚯ`, `/ hit`];

        hit(targetsInRange) {
            const target = super.hit(targetsInRange);
            ParticleSystem.explodeManaAt(target.pos, this.manaLeech);
            GameState.terrain.mana += this.manaLeech;
        }
    }),

    Charge = withTowerPattern('rb', 15, class extends Tower{
        displayName = 'Charge';
        range = 1.8 + 0.1 * this.level;
        chargeTime = 4;
        damage = 2 * this.level;
        /** @type {number} */
        maxCharge = this.level + 2;

        extraDescription = [this.maxCharge, 'capacity'];

        step(dt) {
            this.charge = Math.min(this.charge + dt, this.chargeTime * this.maxCharge);
            while(this.charge >= this.chargeTime) {
                const possibleTargets = this.getTargetsInRange();
                if(!possibleTargets.length) break;
                this.hit(
                    possibleTargets,
                    this.getChargeOrbLocation(~~(this.charge / this.chargeTime) - 1),
                );
                this.charge -= this.chargeTime;
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

    Lightning = withTowerPattern('gr', 4, class extends Tower{
        displayName = 'Lightning';
        range = 2.5;
        chargeTime = this.level / 2;
        damage = this.level;
        chain = this.level - 1;
        extraDescription = [this.chain, 'chain'];

        hit(targetsInRange, i = 0, origin = this.center) {
            const target = super.hit(targetsInRange, origin);
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

    Black = withTowerPattern('k', 11, class extends Tower{
        hideWhenUndiscovered = true;
        displayName = 'Black';
        range = 1.5;
        chargeTime = 2;
        damage = 3 * this.level;
    }),

    Red = withTowerPattern('r', 1, class extends Tower{
        displayName = 'Red';
        // hits all enemies in range on each shot
        range = 3;
        chargeTime = 5 - this.level;
        /** @type {number} */
        damage = 1 + this.level;
        extraDescription = 'AoE';

        hit(targetsInRange) {
            targetsInRange.forEach(target => {
                target.takeDamage(this.damage);
                this.boltAt(target);
            });
        }
        isDiscovered() { return true; }
    }),

    Green = withTowerPattern('g', 6, class extends Tower{
        displayName = 'Green';
        // simple bolt tower
        range = 2.75 + this.level / 4;
        chargeTime = 2;
        damage = 1 + 2 * this.level;
        isDiscovered() { return true; }
    }),

    Blue = withTowerPattern('b', 11, class extends Tower{
        displayName = 'Blue';
        range = 0;
        // Doesn't attack, just blocks
        chargeTime = 0;
        damage = 0;
        extraDescription = 'Cannot attack';
        isDiscovered() { return true; }
    }),
];
