
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
    _particleFirstRender = true;
    constructor(componentTowers) {
        this.componentTowers = componentTowers; // Array<[[x, y], type, level]>
    }

    getColor() {
        const values = range(3).fill(0);
        this.componentTowers.forEach(([_, t]) => values[t - 1]++);
        return normalizedTowerRgb(...values);
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
