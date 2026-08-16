
const MAX_TOWER_LEVEL = 3;

function TowerPattern(stringRepr) {
    // NOTE: super important that stringRepr is a perfect grid with every row being
    // the same size. We don't check but the game will crash otherwise.
    const asGrid = stringRepr.split('\n').map(row => row.split(''));
    const allFormsAsIndexed = allFormsGrid2d(asGrid).map(
        g => grid2dToIndexed(g).filter(g => g[2].trim())
    );
    return {
        allFormsAsIndexed,
        // the number of towers contained in this pattern
        size: allFormsAsIndexed[0].length,
    };
}

const normalizedRgb = (r, g, b) => {
    const m = Math.max(r, g, b);
    if(!m) return `#000`;
    // We boost the luminance of blue, and drop the luminance of green, so it looks more aligned visually.
    return `rgb(${r * 255 + 76 * b},${g * 204 + b * 61},${b * 255})`;
}

class Tower{
    displayName = '?';
    constructor(componentTowers) {
        this.componentTowers = componentTowers; // Array<[[x, y], type, level]>
    }

    getColor() {
        return normalizedRgb(
            this.componentTowers.filter(([_, t]) => t == 'r').length,
            this.componentTowers.filter(([_, t]) => t == 'g').length,
            this.componentTowers.filter(([_, t]) => t == 'b').length,
        );
    }
}

const orderedTowerTypes = [
    // IMPORTANT: this needs to be ordered from highest priority -> lowest. Usually this means larger towers come first.
    class extends Tower{
        static pattern = TowerPattern('rg');
        displayName = 'Lightning';
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
