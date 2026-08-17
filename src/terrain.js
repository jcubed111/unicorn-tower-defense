
class Terrain{
    size = 16;
    isGround = grid2d(this.size, 0);
    goalLocation = [0, 0];
    // raw towers stores primary color + level for each square.
    rawTowers = grid2d(this.size, [0, 0]); // [x][y] -> Tuple<0 | 1 (r) | 2 (g) | 3 (b), level: number = 0>

    // Grid2d<Tower>
    computedTowers = grid2d(this.size, 0);
    computedTowerCache = {};  // Record<key, Tower>

    descentMap = [];

    constructor(goalLocation, terrainString) {
        terrainString.split('').forEach((c, i) => this.isGround[i % this.size][~~(i / this.size)] = c == '#');
        this.goalLocation = goalLocation;

        this.recomputeDerivedValues();
    }

    recomputeDerivedValues() {
        /* Monster descent map */
        const DESCENT_MAX = 1e8;
        const DESCENT_WALL = 1e4;

        this.descentMap = range(this.size).map(_ => range(this.size).fill(DESCENT_MAX));
        const next = [[this.goalLocation, 0]];
        while(next.length) {
            let [[x, y], val] = next.shift();
            if(x < 0 || y < 0 || x >= this.size || y >= this.size || !this.isGround[x][y]) continue;

            // make the descent map work through walls, but make it cost a ton. This allows monsters
            // to still move even if they get caught under a placed tower.
            if(this.rawTowers[x][y][0]) val += DESCENT_WALL;

            if(this.descentMap[x][y] <= val) continue;
            this.descentMap[x][y] = val;
            next.push(
                [[x + 1, y], val + 1],
                [[x, y + 1], val + 1],
                [[x - 1, y], val + 1],
                [[x, y - 1], val + 1],
            );
        }
        if(range(this.size).every(x => this.descentMap[x][0] >= DESCENT_WALL)) {
            // error if there isn't any top spawn point
            throw 1;
        }

        /* joined towers */
        const unjoinedTowerColors = mapGrid2d(this.rawTowers, t => t[0]);
        this.computedTowers = grid2d(this.size, 0);

        for(const CandidateTower of orderedTowerTypes) {
            range(this.size).map(x => {
                range(this.size).map(y => {
                    CandidateTower.pattern.allFormsAsIndexed.forEach((patternForm, patternFormIndex) => {
                        // Try to blit this rotation of the tower onto this location.
                        if(patternForm.some(([dx, dy, neededTowerType]) => unjoinedTowerColors[x + dx][y + dy] != neededTowerType)) {
                            return;
                        }
                        const towerCells = patternForm.map(
                            ([dx, dy, neededTowerType]) => [
                                [x + dx, y + dy],
                                ...this.rawTowers[x + dx][y + dy],
                            ],
                        )
                        const key = JSON.stringify(towerCells);
                        this.computedTowerCache[key] ??= new CandidateTower(towerCells);
                        for(const [[x, y]] of towerCells) {
                            unjoinedTowerColors[x][y] = 0;
                            this.computedTowers[x][y] = this.computedTowerCache[key];
                        }
                    })
                })
            });
        }
    }

    eventToTile(e) {  // -> [x, y]
        const { x, y, width, height } = e.target.getBoundingClientRect();
        return [
            ~~((e.clientX - x) / width * this.size),
            ~~((e.clientY - y) / height * this.size),
        ];
    }

    placeTower([x, y], towerType) {  // -> boolean, whether the tower could be placed
        const [current, currentLevel] = this.rawTowers[x][y];
        if(
            (current && current != towerType )
            || currentLevel >= MAX_TOWER_LEVEL
            || !this.isGround[x][y]
            || (x == this.goalLocation[0] && y == this.goalLocation[1])
        ) {
            return false;
        }
        this.rawTowers[x][y] = [towerType, (currentLevel ?? 0) + 1];
        try{
            this.recomputeDerivedValues();
            return true;
        }catch{
            // recomputeDerivedValues throws if the map no longer has any valid paths.
            // undo the placement and return false.
            console.log("undoing placement. TODO: play sound")
            this.rawTowers[x][y] = [current, currentLevel];
            this.recomputeDerivedValues();
            return false;
        }
    }
}
