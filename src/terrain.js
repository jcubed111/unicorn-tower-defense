
class Terrain{
    size = 16;
    isGround = grid2d(this.size, 0);
    goalLocation = [0, 0];
    // raw towers stores primary color + level for each square.
    rawTowers = grid2d(this.size, [0, 0]); // [x][y] -> Tuple<0 | 1 (r) | 2 (g) | 3 (b), level: number = 0>
    mana = 150;
    waves = 0;
    health = 15;  // hits you can take before dying

    computedTowersArr = [];
    computedTowersByLocation = grid2d(this.size, 0);  // Grid2d<Tower | 0>
    computedTowerCache = {};  // Record<key, Tower>

    descentMap = [];  // Grid2d<number>
    spawnLocations = [];

    enemies = new Set;
    terrainTotalTime = 0;
    actionQueue = new Set;  // Set<[delayTime, cb]>
    manaPassiveClock = 0;

    screenShake = 0;  // px; decays over time in render

    constructor(goalLocation, terrainString) {
        terrainString.split('').forEach((c, i) => this.isGround[i % this.size][~~(i / this.size)] = c.charCodeAt(0) - 46);
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

        this.descentMap = grid2d(this.size, DESCENT_MAX);
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
        const prevComputedTowersByLocation = this.computedTowersByLocation;
        this.computedTowersByLocation = grid2d(this.size, 0);
        this.computedTowersArr = [];

        for(const CandidateTower of orderedTowerTypes) {
            range(this.size).map(x => {
                range(this.size).map(y => {
                    CandidateTower.sourcePattern.allForms.forEach(sourcePatternForm => {

                        // Do the whole test/gen op as one map
                        var fits = true;
                        var prevTower;  // outside closure so we can use it for charge retention
                        const usedPrevTowerCounts = new Map();  // Map[Tower, usedCells: number]
                        // towerCells: Grid2d<[type, level, x, y]>
                        // typed as such so it fits nicely into `towerGridToElement`
                        const towerCells = mapGrid2d(sourcePatternForm, (maybeNeededTower, [dx, dy]) => {
                            if(!maybeNeededTower) return null;
                            if(maybeNeededTower[0] != unjoinedTowerColors[x + dx]?.[y + dy]) {
                                fits = false;
                                return null;
                            }
                            // count how many cells of each previous tower we used
                            prevTower = prevComputedTowersByLocation[x + dx][y + dy];
                            if(prevTower) {
                                usedPrevTowerCounts.set(
                                    prevTower,
                                    usedPrevTowerCounts.getOrInsert(prevTower, 0) + 1,
                                );
                            }
                            return [
                                ...this.rawTowers[x + dx][y + dy],
                                x + dx,
                                y + dy,
                            ];
                        });
                        if(!fits) return;
                        // We don't allow breaking towers during re-joining, so a new tower is
                        // only valid if it uses every piece of each of the previous towers.
                        if([...usedPrevTowerCounts].some(([tower, count]) => count != tower.size)) {
                            return;
                        }

                        const key = JSON.stringify(towerCells);
                        const tower = this.computedTowerCache[key] ??= new CandidateTower(
                            towerCells,
                            // Keep charge when upgrading to a higher level of the same tower.
                            // This works because prevTower will have a deterministic value in this
                            // case, and will be a different type if this isn't a level upgrade.
                            prevTower.constructor === CandidateTower ? prevTower.charge : 0,
                        );
                        mapGrid2d(towerCells, maybeTower => {
                            if(!maybeTower) return;
                            const [t, l, x, y] = maybeTower;
                            unjoinedTowerColors[x][y] = 0;
                            this.computedTowersByLocation[x][y] = tower;
                        });
                        this.computedTowersArr.push(tower);
                        tower.setDiscovered();
                    })
                })
            });
        }
    }

    eventToPos(e) {  // -> [x, y]
        const { x, y, height } = e.target.getBoundingClientRect();
        return [
            // this.size == the height, not the width.
            (e.clientX - x) / height * this.size,
            (e.clientY - y) / height * this.size,
        ];
    }

    placeTower([x, y], towerType) {  // -> boolean, whether the tower could be placed
        if(!towerType) return;
        const cost = this.getDrawCost(towerType);
        const [current, currentLevel] = this.rawTowers[x][y];
        if(
            (current && current != towerType )
            || currentLevel >= MAX_TOWER_LEVEL
            || this.isGround[x][y] != 1
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
        this.terrainTotalTime += dt;
        for(const val of this.actionQueue) {
            const [at, cb] = val;
            if(at <= this.terrainTotalTime) {
                this.actionQueue.delete(val);
                cb();
            }
        }

        this.manaPassiveClock += dt * MANA_PASSIVE_RATE;
        this.mana += ~~this.manaPassiveClock;
        this.manaPassiveClock %= 1;

        for(const e of this.enemies) {
            e.step(dt);
        }

        for(const t of this.computedTowersArr) {
            t.step(dt);
        }

        for(const e of this.enemies) {
            const [sx, sy] = e.getSquare();
            const [tx, ty] = this.goalLocation;
            if(e.hp <= 0) {
                this.enemies.delete(e);
                this.mana += e.maxHp * e.manaOnKillMult;
                ParticleSystem.explodeManaAt(
                    e.pos.map(v => v - 0.5),
                    e.maxHp * e.manaOnKillMult,
                );
                ParticleSystem.explodeSpritesAt(
                    e.pos.map(v => v - 0.5),
                    ...e.getSprites(),
                );

            }else if(sx == tx && sy == ty) {
                if(this.health >= e.banishDamage) {
                    this.health -= e.banishDamage;
                    const resetLocation = [randChoice(this.spawnLocations)[0] + 0.5, 0.5];
                    ParticleSystem.spawnParticlePixelLine(
                        e.pos,
                        resetLocation,
                        pos => new ResetUnicornParticle(pos, [], 2),
                    );
                    ParticleSystem.explodeSpritesAt(
                        HEART_POS,
                        sprites[29].withColor([20, 20, 20, 255]),
                    );
                    e.setLocation(resetLocation);
                    e.manaOnKillMult = 0;
                    e.banishDamage *= 2;
                    AudioSystem.playRespawn();
                    this.screenShake += 2;
                }else{
                    console.log('You lose!');
                }
            }
        }
    }

    nextWaveTime = -1;
    startNextWaveNow() {
        if(this.nextWaveTime < 0) return;
        this.manaPassiveClock += (this.nextWaveTime - this.terrainTotalTime) * MANA_PASSIVE_RATE;
        this.terrainTotalTime = this.nextWaveTime;
        GameState.startNextWaveButton.style.display = 'none';
    }

    setWaves(...enemyConstructors) {
        GameState.startNextWaveButton.addEventListener('click', () => this.startNextWaveNow());
        var prevEndTime = 0;

        const expandedWaves = enemyConstructors.map((WaveCls, waveIndex) => {
            // Derive the wave metrics
            const targetTotalHp = 15 * 1.5 ** waveIndex;
            const sampleEnemy = new WaveCls(waveIndex, [0, 0]);

            // wave start
            const startTime = 10 + 20 * waveIndex;
            // delay per monster
            const enemyDelay = sampleEnemy.delayPerMonster;
            // number of enemies
            const numEnemies = Math.ceil(targetTotalHp * sampleEnemy.totalHpModifier / sampleEnemy.maxHp);

            console.log('wave', waveIndex + 1, 'num enemies', numEnemies, 'hp', sampleEnemy.maxHp);

            // Pre-wave countdown
            range(startTime - prevEndTime).forEach(dt => {
                this.actionQueue.add([startTime - dt, () => {
                    GameState.topLeftDisplay.innerText =
                        (waveIndex ? `Wave ${waveIndex}/${enemyConstructors.length}\n` : '')
                        + `Next wave in ${dt}...`;

                    GameState.startNextWaveButton.style.display = 'block';
                    this.nextWaveTime = startTime;
                }]);
            });

            // Wave start
            this.actionQueue.add([startTime, () => {
                GameState.topLeftDisplay.innerText = `Wave ${waveIndex + 1}/${enemyConstructors.length}`;

                GameState.startNextWaveButton.style.display = 'none';
                this.nextWaveTime = -1;
            }]);

            // Enemies
            range(numEnemies).forEach(i => {
                this.actionQueue.add([
                    startTime + i * enemyDelay,
                    () => {
                        const e = new WaveCls(waveIndex, randChoice(this.spawnLocations));
                        e.hp = e.maxHp;
                        this.enemies.add(e);
                    },
                ]);
            });

            prevEndTime = Math.ceil(startTime + enemyDelay * numEnemies);
        });
    }
}
