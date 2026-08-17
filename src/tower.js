
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

function TowerPattern(stringRepr) {
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

    const asElement = styled('canvas', 'C_towerPattern');
    asElement.width = tileSize * asGrid[0].length;
    asElement.height = tileSize * asGrid.length;
    asElement.style.width = asGrid[0].length + 'rem';
    const ctx = asElement.getContext('2d');
    mapGrid2d(asGrid, (c, [x, y]) => {
        for(const s of getTowerSprites(
            x, y,
            [c, 1],
            outerColor,
            (x, y) => asGrid[y]?.[x] > 0,
        )) {
            renderSprite(ctx, x, y, s);
        }
    });

    return {
        outerColor,
        allFormsAsIndexed,
        // the number of towers contained in this pattern
        size: allFormsAsIndexed[0].length,
        asElement,
    };
}

class Tower{
    static pattern;
    displayName = '?';
    chargeTime = 2;
    range = 4;
    charge = 0;
    damage = 2;

    _particleFirstRender = true;

    constructor(componentTowers) {
        this.componentTowers = componentTowers; // Array<[[x, y], type, level]>
        this.center = [
            this.componentTowers.reduce((acc, [pos]) => acc + pos[0], 0) / this.componentTowers.length + 0.5,
            this.componentTowers.reduce((acc, [pos]) => acc + pos[1], 0) / this.componentTowers.length + 0.5,
        ];
        this.level = this.componentTowers.map(t => t[2]).reduce((a, b) => a + b, 0);
    }

    getColor() {
        return this.constructor.pattern.outerColor;
    }

    step(dt) {
        this.charge = Math.min(this.charge + dt, this.chargeTime);
        if(this.charge >= this.chargeTime) {
            const [x, y] = this.center;
            const possibleTargets = [...GameState.terrain.enemies].filter(
                e => (e.pos[0] - x) ** 2 + (e.pos[1] - y) ** 2 < this.range ** 2,
            );
            if(possibleTargets.length) {
                this.hit(possibleTargets);
                this.charge = 0;
            }
        }
    }

    hit(targetsInRange) {
        const target = randChoice(targetsInRange);
        target.takeDamage(this.damage);
        this.boltAt(target);
    }

    boltAt(target) {
        ParticleSystem.spawnParticlePixelLine(
            this.center,
            target.pos,
            pos => new EnergyFadeParticle(pos, this.getColor(), 0.5),
        );
    }
}

const orderedTowerTypes = [
    // IMPORTANT: this needs to be ordered from highest priority -> lowest. Usually this means larger towers come first.
    class extends Tower{
        static pattern = TowerPattern('bbrbb');
        displayName = 'Fear';
        // TODO
    },
    class extends Tower{
        static pattern = TowerPattern('bb|bb');
        displayName = 'Slow';
        // TODO
    },
    class extends Tower{
        static pattern = TowerPattern('rgr');
        displayName = 'Fire';
        // TODO
    },
    class extends Tower{
        static pattern = TowerPattern('ggr');
        displayName = 'Poison';
        // TODO
    },
    class extends Tower{
        static pattern = TowerPattern('rg');
        displayName = 'Lightning';
        // TODO
    },
    class extends Tower{
        static pattern = TowerPattern('gb');
        displayName = 'Freeze';
        // TODO
    },
    class extends Tower{
        static pattern = TowerPattern('rb');
        displayName = 'Magenta';
        // TODO
    },

    class extends Tower{
        static pattern = TowerPattern('r');
        displayName = 'Red';
        keywords = 'AoE';
        // hits all enemies in range on each shot
        range = 3;
        chargeTime = 4;
        damage = 2;

        hit(targetsInRange) {
            targetsInRange.forEach(target => {
                target.takeDamage(this.damage);
                this.boltAt(target);
            });
        }
    },

    class extends Tower{
        static pattern = TowerPattern('g');
        displayName = 'Green';
        // simple bolt tower
        range = 3;
        chargeTime = 2;
        damage = 3;
    },

    class extends Tower{
        static pattern = TowerPattern('b');
        displayName = 'Blue';
        // Doesn't attack, just blocks
        chargeTime = 0;
        range = 0;
        damage = 0;
    },
];
