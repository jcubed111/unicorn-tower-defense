
class Terrain{
    size = 16;
    isGround = grid2d(this.size, 0);
    goalLocation = [0, 0];
    // raw towers stores primary color + level for each square.
    rawTowers = grid2d(this.size, [0, 0]); // [x][y] -> Tuple<0 | 1 (r) | 2 (g) | 3 (b), level: number = 0>
    mana = 100;

    computedTowersArr = [];
    computedTowersByLocation = grid2d(this.size, 0);  // Grid2d<Tower>
    computedTowerCache = {};  // Record<key, Tower>

    descentMap = [];  // Grid2d<number>
    spawnLocations = [];

    enemies = new Set;
    actionQueue = [];  // Array<[delayTime, cb]>
    manaPassiveClock = 0;

    constructor(goalLocation, terrainString) {
        terrainString.split('').forEach((c, i) => this.isGround[i % this.size][~~(i / this.size)] = c == '#');
        this.goalLocation = goalLocation;

        this.recomputeDerivedValues();
    }

    getDrawCost(towerType) {
        let sum = 0;
        mapGrid2d(this.rawTowers, ([type, level]) => {
            if(type == towerType) sum += level;
        });
        return TOWER_BASE_COSTS[towerType] + sum * TOWER_INCREMENT_COSTS[towerType];
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
        this.spawnLocations = range(this.size)
            .filter(x => this.descentMap[x][0] < DESCENT_WALL)
            .map(x => [x, -1]);
        if(this.spawnLocations.length == 0) {
            // error if there isn't any top spawn point
            throw 1;
        }
        // error if any enemy is inside a WALL
        for(const e of this.enemies) {
            const [x, y] = e.getSquare();
            if(y >= 0 && this.descentMap[x][y] >= DESCENT_WALL) throw 1;
        }

        /* joined towers */
        const unjoinedTowerColors = mapGrid2d(this.rawTowers, t => t[0]);
        this.computedTowersByLocation = grid2d(this.size, 0);
        this.computedTowersArr = [];

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
                        const tower = this.computedTowerCache[key] ??= new CandidateTower(towerCells);
                        for(const [[x, y]] of towerCells) {
                            unjoinedTowerColors[x][y] = 0;
                            this.computedTowersByLocation[x][y] = tower;
                        }
                        this.computedTowersArr.push(tower);
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
        const cost = this.getDrawCost(towerType);
        const [current, currentLevel] = this.rawTowers[x][y];
        if(
            (current && current != towerType )
            || currentLevel >= MAX_TOWER_LEVEL
            || !this.isGround[x][y]
            || (x == this.goalLocation[0] && y == this.goalLocation[1])
            || cost > this.mana
        ) {
            return false;
        }
        this.rawTowers[x][y] = [towerType, (currentLevel ?? 0) + 1];
        try{
            this.recomputeDerivedValues();
            this.mana -= cost;
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

    step(dt) {
        this.manaPassiveClock += dt * MANA_PASSIVE_RATE;
        this.mana += ~~this.manaPassiveClock;
        this.manaPassiveClock %= 1;

        for(const t of this.computedTowersArr) {
            t.step(dt);
        }
        for(const e of this.enemies) {
            e.step(dt);
            const [sx, sy] = e.getSquare();
            const [tx, ty] = this.goalLocation;
            if(e.hp <= 0) {
                this.enemies.delete(e);
                ParticleSystem.explodeSpritesAt(
                    e.pos.map(v => v - 0.5),
                    ...e.getSprites(),
                );
            }else if(sx == tx && sy == ty) {
                this.enemies.delete(e);
                console.log('TODO: hit');
            }
        }
    }
}
