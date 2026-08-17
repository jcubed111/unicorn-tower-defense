
const MAX_TOWER_LEVEL = 3;

const decodeTowerType = n => 'rgb'.indexOf(n) + 1;

function TowerPattern(stringRepr) {
    // NOTE: super important that stringRepr is a perfect grid with every row being
    // the same size. We don't check but the game will crash otherwise.
    const asGrid = stringRepr.split('|').map(row => row.split('').map(decodeTowerType));
    const allFormsAsIndexed = allFormsGrid2d(asGrid).map(
        g => grid2dToIndexed(g).filter(g => g[2])
    );
    return {
        allFormsAsIndexed,
        // the number of towers contained in this pattern
        size: allFormsAsIndexed[0].length,
    };
}

const normalizedTowerRgb = (r, g, b) => {
    const m = Math.max(r, g, b);
    if(!m) return [0, 0, 0, 255];
    // We boost the luminance of blue, and drop the luminance of green, so it looks more aligned visually.
    return [r / m * 255 + 76 * b / m, g / m * 204 + b / m * 61, b / m * 255, 255].map(clampColorComponent);
}

class Tower{
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
    }

    getColor() {
        const values = range(3).fill(0);
        this.componentTowers.forEach(([_, t]) => values[t - 1]++);
        return normalizedTowerRgb(...values);
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
        console.log('tower bolt')
        const target = randChoice(targetsInRange);
        target.hp -= this.damage;
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
    },
    class extends Tower{
        static pattern = TowerPattern('bb|bb');
        displayName = 'Slow';
    },
    class extends Tower{
        static pattern = TowerPattern('rgr');
        displayName = 'Fire';
    },
    class extends Tower{
        static pattern = TowerPattern('ggr');
        displayName = 'Poison';
    },
    class extends Tower{
        static pattern = TowerPattern('rg');
        displayName = 'Lightning';
    },
    class extends Tower{
        static pattern = TowerPattern('gb');
        displayName = 'Freeze';
    },
    class extends Tower{
        static pattern = TowerPattern('rb');
        displayName = 'Magenta';
    },
    class extends Tower{
        static pattern = TowerPattern('r');
        displayName = 'Red';
    },
    class extends Tower{
        static pattern = TowerPattern('g');
        displayName = 'Green';
    },
    class extends Tower{
        static pattern = TowerPattern('b');
        displayName = 'Blue';
    },
];
