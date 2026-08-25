
class Terrain{
    size = 16;
    isGround = grid2d(this.size, 0);
    goalLocation = [0, 0];
    // raw towers stores primary color + level for each square.
    rawTowers = grid2d(this.size, [0, 0]); // [x][y] -> Tuple<0 | 1 (r) | 2 (g) | 3 (b), level: number = 0>
    mana = STARTING_MANA;
    health = STARTING_HEALTH;  // hits you can take before dying
    wavesComplete = false;

    computedTowersArr = [];
    computedTowersByLocation = grid2d(this.size, 0);  // Grid2d<Tower | 0>
    computedTowerCache = {};  // Record<key, Tower>
    towerDrawCosts = TOWER_BASE_COSTS.slice();

    descentMap = [];  // Grid2d<number>
    spawnLocations = [];

    enemies = new Set;
    terrainTotalTime = 0;
    actionQueue = new Set;  // Set<[delayTime, cb]>
    manaPassiveClock = 0;

    upcomingWaves = [];  // Array<[timeTillStart, startWaveFn]>
    totalWaves = 0;

    screenShake = 0;  // px; decays over time in render
    timeRate = 1;

    tileHoverEls = grid2d(this.size, null);  // Grid2d<Element | null>

    constructor(goalLocation, terrainString, waves, onEndCb) {
        terrainString.split('').forEach((c, i) => this.isGround[i % this.size][~~(i / this.size)] = c.charCodeAt(0) - 46);
        this.goalLocation = goalLocation;
        this.onEndCb = onEndCb;
        this._setWaves(waves);

        this.recomputeDerivedValues();
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
        // error if any enemy is inside (or behind) a wall
        for(const e of this.enemies) {
            const [x, y] = e.getSquare();
            if(e.landBased && y >= 0 && this.descentMap[x][y] >= DESCENT_WALL) throw 1;
        }
        // reset target if enemy is walking into a wall
        for(const e of this.enemies) {
            if(e.landBased && e.targetLocation) {
                const [tx, ty] = e.targetLocation;
                if(this.descentMap[~~tx][~~ty] >= DESCENT_WALL) {
                    e.targetLocation = null;
                }
            }
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
                        let fits = true;
                        let prevTower;  // outside closure so we can use it for charge retention
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
                        forEachGrid2d(towerCells, maybeTower => {
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
        if(!towerType) return true;  // so we don't make an error noise
        const cost = this.towerDrawCosts[towerType];
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
            this.towerDrawCosts[towerType] += TOWER_INCREMENT_COSTS[towerType];
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
        dt *= this.timeRate;

        if(this.upcomingWaves.length) {
            this.upcomingWaves[0][0] -= dt;
            if(this.upcomingWaves[0][0] < 0) {
                this.upcomingWaves.shift()[1]();
            }
        }else if(!this.enemies.size && !this.actionQueue.size) {
            this.onEndCb(true);
            this.onEndCb = () => 0;
        }

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
        ParticleSystem.explodeManaAt([1.25, 0.5], ~~this.manaPassiveClock);
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
                this.mana += ~~(e.maxHp * e.manaOnKillMult);
                ParticleSystem.explodeManaAt(
                    e.pos.map(v => v - 0.5),
                    ~~(e.maxHp * e.manaOnKillMult),
                );
                ParticleSystem.explodeSpritesAt(
                    e.pos.map(v => v - 0.5),
                    ...e.getSprites(),
                );
                AudioSystem.playEnemyDeath();
                this.screenShake += 0.2;

            }else if(sx == tx && sy == ty) {
                if(this.health >= 0) {
                    ParticleSystem.explodeSpritesAt(
                        HEART_POS,
                        sprites[29].withColor([20, 20, 20, 255]),
                    );
                    AudioSystem.playRespawn();
                }
                if(this.health >= e.banishDamage) {
                    this.health -= e.banishDamage;
                    const [sx, sy] = randChoice(e.resetSpawnLocations ?? this.spawnLocations);
                    const resetLocation = [sx + 0.5, sy + 1.5];
                    ParticleSystem.spawnParticlePixelLine(
                        e.pos,
                        resetLocation,
                        pos => new ResetUnicornParticle(pos, [], 2),
                    );
                    this.screenShake += 2;
                    e.manaOnKillMult = 0;
                    e.banishDamage *= 2;
                    e.setLocation(resetLocation);
                }else{
                    this.lose();
                }
            }
        }
    }

    lose() {
        if(this.health >= 0) {
            this.screenShake += 6;
            const [gx, gy] = this.goalLocation;
            ParticleSystem.explodeSpritesAt(
                [gx, gy - 0.333],  // needs to match wizard pos in render
                sprites[31],
            );
        }
        this.health = -1;
        this.onEndCb(false);
        this.onEndCb = () => 0;
    }

    startNextWaveNow() {
        if(this.upcomingWaves.length) {
            this.timeRate ||= 1;  // set time rate to 1 if frozen
            this.manaPassiveClock += Math.max(0, this.upcomingWaves[0][0]) * MANA_PASSIVE_RATE;
            this.upcomingWaves[0][0] = 0;
        }
    }

    _setWaves(enemyConstructors) {
        this.totalWaves = enemyConstructors.length;
        let ignoreButton = false;
        GameState.startNextWaveButton.addEventListener('click', e => {
            if(ignoreButton) return;
            this.startNextWaveNow();
            // Prevent double clicking
            ignoreButton = true;
            setTimeout(_ => ignoreButton = false, 250);
        });

        console.log('--------------------')
        console.log('Wave list:')

        this.upcomingWaves = enemyConstructors.map((WaveCls, waveIndex) => {
            // Derive the wave metrics
            const targetTotalHp = 15 + 2.5 * waveIndex ** 2;
            const sampleEnemy = new WaveCls(waveIndex, [0, 0]);

            // delay per monster
            const enemyDelay = sampleEnemy.delayPerMonster;
            // number of enemies
            const numEnemies = Math.round((targetTotalHp / sampleEnemy.hpToNumRatio) ** 0.5)
                || 1;  // always produce at least 1 enemy
            const enemyHp = Math.round(targetTotalHp / numEnemies)
                || 1;  // always have at least 1 hp

            console.log(
                'Wave', waveIndex + 1, ':',
                numEnemies, 'x',
                sampleEnemy.displayName,
                '@', enemyHp, 'hp', sampleEnemy.armor, 'armor');

            return [waveIndex == 0 ? STARTING_WAVE_DELAY : WAVE_DELAY, () => {
                GameState.toastWaveInfo(
                    `Wave ${waveIndex + 1}`,
                    `${sampleEnemy.displayName} × ${numEnemies}`,
                );
                range(numEnemies).forEach(i => {
                    this.actionQueue.add([
                        this.terrainTotalTime + i * enemyDelay,
                        () => {
                            const e = new WaveCls(waveIndex, randChoice(this.spawnLocations));
                            e.hp = e.maxHp = enemyHp;
                            this.enemies.add(e);
                        },
                    ]);
                });
            }];
        });
    }

    renderSpecialEffects(dt, ctx) {
        // Draw wave indicator
        const i = this.totalWaves - this.upcomingWaves.length;
        GameState.topLeftDisplay.innerText = `Wave ${i} / ${this.totalWaves}`;

        const timeToNext = this.upcomingWaves[0]?.[0] ?? -1;
        GameState.startNextWaveButton.innerText =
            timeToNext < 0
                ? ``
                : timeToNext > 0
                    ? `Start Wave ${i + 1} (${Math.ceil(timeToNext)})`
                    : `Start Wave ${i + 1}`;

        if(i == 0) {
            ParticleSystem.sparkleRect(
                [0.167, 0.167],
                [
                    GameState.startNextWaveButton.offsetWidth / GameState.pxCssSize / 15,
                    GameState.startNextWaveButton.offsetHeight / GameState.pxCssSize / 15,
                ],
                dt * 0.3,
                [213, 60, 255, 255],
            );
        }

        // Draw mana pool
        const rate = this.mana / (this.mana + 200);
        const colorRate = 255 * this.mana / (this.mana + 50);
        const col = [~~colorRate, ~~colorRate, ~~colorRate, 255];
        renderSprite(ctx, ...MANA_POOL_POS, sprites[25].withColor(col));
        ParticleSystem.sparkleSpriteAt(
            sprites[25],
            MANA_POOL_POS,
            rate * dt,
        );

        // Draw heart
        renderSprite(ctx, ...HEART_POS, sprites[29]);
    }
}


class MockTerrain extends Terrain{
    constructor(terrainString, onEndCb = _ => 0) {
        super([-1, -1], terrainString, [], onEndCb);
    }
    // override the methods we don't want to use
    renderSpecialEffects() {}
    recomputeDerivedValues() {}
    step() {}
    placeTower() { return true; }
}


class LevelSelectTerrain extends MockTerrain{
    levelIndices = grid2d(this.size, 0);
    levelIsUnlocked = getLevelIsUnlockedMap();
    passedLevelSet = getPassedSet();
    perfectedLevelSet = getLevelPerfectedSet();

    constructor(
        terrainString,
        levelIndexString,
        onEndCb,
    ) {
        super(terrainString, onEndCb);
        levelIndexString.split('').forEach((c, i) => {
            const x = i % this.size;
            const y = ~~(i / this.size);
            const level = c == '.' ? 0 : c.charCodeAt(0) - 96;
            this.levelIndices[x][y] = level;
            if(level && this.levelIsUnlocked[level] && levelData[level]) {
                this.tileHoverEls[x][y] = div('',
                    div('C--infoTitle', `Level ${level}`),
                    div('', `${levelData[level]?.waves?.length} Waves`),
                    makeSpriteCanvas(ctx => {
                        renderTerrainBase(ctx, 0,
                            new Terrain(
                                levelData[level]?.goalLocation,
                                levelData[level]?.terrainString,
                                [],
                                _ => 0,
                            ),
                        );
                    }, 16, 16, 45),
                );
            }else if(level) {
                this.tileHoverEls[x][y] = div('', `Locked`);
            }
        });
    }

    renderSpecialEffects(dt, ctx) {
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        forEachGrid2d(this.levelIndices, (i, [x, y]) => {
            if(!i) return;
            if(this.levelIsUnlocked[i]) {
                if(this.perfectedLevelSet.has(i)) {
                    renderSprite(ctx, x, y - 0.1, sprites[21]);
                    ctx.fillStyle = '#fff';
                }else if(this.passedLevelSet.has(i)) {
                    renderSprite(ctx, x, y - 0.1, sprites[36]);
                    ctx.fillStyle = '#06b04e';
                }else{
                    ctx.fillStyle = '#fff';
                }
                ctx.fillText(i, x * 15 + 7.5, y * 15 + 10);
            }else{
                renderSprite(ctx, x, y, sprites[32].withColor([10, 56, 10, 255]));
            }
        });
    }

    placeTower([x, y]) {
        // this just gets called on click, so we can use it for
        // level select.
        // Return false to make an error noise.
        const level = this.levelIndices[x][y];
        if(!level || !this.levelIsUnlocked[level]) return false;
        this.onEndCb(level);
        return true;
    }
}
