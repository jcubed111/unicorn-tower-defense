
class Terrain{
    size = 16;
    isGround = grid2d(this.size, 0);
    goalLocation = [0, 0];
    // raw towers stores primary color + level for each square.
    rawTowers = grid2d(this.size, [0, 0]); // [x][y] -> Tuple<0 | 1 (r) | 2 (g) | 3 (b), level: number = 0>
    mana = STARTING_MANA;
    health = STARTING_HEALTH;  // hits you can take before dying

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

    defaultHoverInfoContent;  // Element, thing to put in hover box when nothing is hovered

    // Holds special terrain info
    tileHoverEls = grid2d(this.size, null);  // Grid2d<Element | null>
    markedTileSprites = grid2d(this.size, []);

    constructor(
        goalLocation,
        terrainString,
        waves,
        onEndCb,
        // narwhalData is stored collapsed as [path, ...waveIndices]
        narwhalData = [],
        extraSetup = _ => 0,
    ) {
        terrainString.split('').forEach((c, i) => this.isGround[i % this.size][~~(i / this.size)] = c.charCodeAt(0) - 46);
        this.onEndCb = onEndCb;
        this.invalidPlacementLocations = [
            this.goalLocation = goalLocation
        ];
        this._setWaves(waves, narwhalData);
        extraSetup(this);
        this.recomputeDerivedValues();
        this.spawnLocations = range(this.size)
            .filter(x => this.isGround[x][0])
            .map(x => [x, -1]);
    }

    markLocation([x, y], sprites, hoverInfo) {
        this.tileHoverEls[x][y] = hoverInfo;
        this.markedTileSprites[x][y] = sprites;
        this.invalidPlacementLocations.push([x, y]);
    }

    // -> true if the map is left with no valid path for the enemies
    recomputeDerivedValues() {
        /* Monster descent map */
        const DESCENT_MAX = 1e8;
        const DESCENT_WALL = 1e4;

        this.descentMap = grid2d(this.size, DESCENT_MAX);
        const next = [[this.goalLocation, 0]];
        while(next.length) {
            let [pos, val] = next.shift();
            const [x, y] = pos;
            // grid2dAt returns undefined off the grid, so this also bounds-checks
            if(!grid2dAt(this.isGround, pos)) continue;

            // make the descent map work through walls, but make it cost a ton. This allows monsters
            // to still move even if they get caught under a placed tower.
            if(grid2dAt(this.rawTowers, pos)[0]) val += DESCENT_WALL;

            if(grid2dAt(this.descentMap, pos) <= val) continue;
            this.descentMap[x][y] = val;
            next.push(...CARDINAL_DIRS.map(dir => [addVec(pos, dir), val + 1]));
        }
        const isSpawnBlocked = this.spawnLocations.some(
            ([x]) => this.descentMap[x][0] >= DESCENT_WALL
        );
        // We don't need to check enemies above y=0, since we already ensure
        // that every spawn point is unblocked
        const isAnyEnemyWalledIn = [...this.enemies].some(
            e => e.landBased && grid2dAt(this.descentMap, e.getSquare()) >= DESCENT_WALL
        );
        if(isSpawnBlocked || isAnyEnemyWalledIn) return true;

        // reset target if enemy is walking into a wall
        for(const e of this.enemies) {
            if(
                e.landBased
                && e.targetLocation
                && grid2dAt(this.descentMap, e.targetLocation) >= DESCENT_WALL
            ) {
                e.targetLocation = null;
            }
        }

        /* joined towers */
        const unjoinedTowerColors = mapGrid2d(this.rawTowers, t => t[0]);
        const prevComputedTowersByLocation = this.computedTowersByLocation;
        this.computedTowersByLocation = grid2d(this.size, 0);
        this.computedTowersArr = [];
        const shadowAddSquares = {};  // Record<[x,y], addLevel>

        orderedTowerTypes.forEach(CandidateTower =>
            // We can pick any Grid2d[this.size] here, but this.rawTowers was used above
            forEachGrid2d(this.rawTowers, (_, pos) =>
                CandidateTower.sourcePattern.allForms.forEach(sourcePatternForm => {
                    // Do the whole test/gen op as one map
                    let fits = true;
                    let prevTower;  // outside closure so we can use it for charge retention
                    const usedPrevTowerCounts = new Map();  // Map<Tower, usedCells: number>
                    // towerCells: Grid2d<[type, level, pos]>
                    // typed as such so it fits nicely into `towerGridToElement`
                    const towerCells = mapGrid2d(sourcePatternForm, (maybeNeededTower, d) => {
                        if(!maybeNeededTower) return null;
                        const cellPos = addVec(pos, d);
                        if(maybeNeededTower[0] != grid2dAt(unjoinedTowerColors, cellPos)) {
                            fits = false;
                            return null;
                        }
                        // count how many cells of each previous tower we used
                        prevTower = grid2dAt(prevComputedTowersByLocation, cellPos);
                        if(prevTower) {
                            usedPrevTowerCounts.set(
                                prevTower,
                                (usedPrevTowerCounts.get(prevTower) ?? 0) + 1,
                            );
                        }
                        return [
                            ...grid2dAt(this.rawTowers, cellPos),
                            cellPos,
                        ];
                    });
                    if(!fits) return;
                    // We don't allow breaking towers during re-joining, so a new tower is
                    // only valid if it uses every piece of each of the previous towers.
                    if([...usedPrevTowerCounts].some(([tower, count]) => count != tower.size)) {
                        return;
                    }

                    // Apply any shadow tower additions to this tower's level
                    // unless we are a shadow tower. Also add this to the cache key.
                    const addLevel = CandidateTower == Boost
                        ? 0
                        : towerCells
                            .flat()
                            .filter(a => a)
                            .map(([t, l, pos]) => shadowAddSquares[pos] ?? 0)
                            .reduce((acc, v) => acc + v, 0);
                    // Array.toString flattens nested arrays with commas, which
                    // is a discriminating a cache key here
                    // (every cell is null or a fixed [type, level, [x, y]]).
                    const key = '' + towerCells + '|' + addLevel;
                    const tower = this.computedTowerCache[key] ??= new CandidateTower(
                        towerCells,
                        // Keep charge when upgrading to a higher level of the same tower.
                        // This works because prevTower will have a deterministic value in this
                        // case, and will be a different type if this isn't a level upgrade.
                        prevTower.constructor === CandidateTower ? prevTower.charge : 0,
                        addLevel,
                    );
                    forEachGrid2d(towerCells, maybeTower => {
                        if(!maybeTower) return;
                        const [x, y] = maybeTower[2];
                        unjoinedTowerColors[x][y] = 0;
                        this.computedTowersByLocation[x][y] = tower;
                    });
                    if(tower.boostByLevelSquare) {
                        shadowAddSquares[tower.boostByLevelSquare] = tower.level;
                    }
                    this.computedTowersArr.push(tower);
                    tower.setDiscovered();
                })
            )
        );
    }

    eventToPos(e) {  // -> [x, y]
        const { x, y, height } = e.target.getBoundingClientRect();
        // this.size == the height, not the width.
        return scaleVec([e.clientX - x, e.clientY - y], this.size / height);
    }

    extraTowerValidation(pos, towerType) {
        return true;
    }

    placeTower(pos, towerType) {  // -> boolean, whether the tower could be placed
        if(!towerType) return true;  // so we don't make an error noise
        const [x, y] = pos;
        const cost = this.towerDrawCosts[towerType];
        const [current, currentLevel] = grid2dAt(this.rawTowers, pos);
        if(
            (current && current != towerType)
            || currentLevel >= MAX_TOWER_LEVEL
            || grid2dAt(this.isGround, pos) != 1
            || this.invalidPlacementLocations.some(
                p2 => dist2Vec(p2, pos) == 0
            )
            || cost > this.mana
            || !this.extraTowerValidation(pos, towerType)
        ) {
            return false;
        }
        this.rawTowers[x][y] = [towerType, (currentLevel ?? 0) + 1];
        if(this.recomputeDerivedValues()) {
            // the placement left the map with no valid path -- undo it
            this.rawTowers[x][y] = [current, currentLevel];
            this.recomputeDerivedValues();
            return false;
        }
        this.mana -= cost;
        this.towerDrawCosts[towerType] += TOWER_INCREMENT_COST;
        if(DEBUG) {
            window.debugTowerBuildLog.push(`buildTowerAt(${towerType}, [${x}, ${y}])`);
        }
        AudioSystem.playTowerPlacement();
        return true;
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
                e.onDeath();
                this.enemies.delete(e);
                const reward = ~~(e.maxHp * e.manaOnKillMult);
                this.mana += reward;
                ParticleSystem.explodeManaAt(e.pos, reward);
                ParticleSystem.explodeSpritesAt(
                    addVec(e.pos, [-0.5, -0.5]),
                    ...e.getSprites()
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
                    ParticleSystem.spawnParticlePixelLine(
                        e.pos,
                        e.respawnLocation,
                        pos => new ResetUnicornParticle(pos, [], 2),
                    );
                    this.screenShake += 2;
                    e.manaOnKillMult = 0;
                    e.banishDamage *= 2;
                    e.setLocation(e.respawnLocation);
                }else{
                    this.lose();
                }
            }
        }
    }

    lose() {
        if(this.health >= 0) {
            this.screenShake += 6;
            ParticleSystem.explodeSpritesAt(
                addVec(this.goalLocation, [0, -0.333]),  // needs to match wizard pos in render
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

    _setWaves(enemyConstructors, narwhalData) {
        this.totalWaves = enemyConstructors.length;
        let ignoreButton = false;
        GameState.startNextWaveButton.addEventListener('click', e => {
            if(ignoreButton) return;
            this.startNextWaveNow();
            // Prevent double clicking
            ignoreButton = true;
            setTimeout(_ => ignoreButton = false, 250);
        });

        // Array<[waveIndex, sampleEnemy, numTotal, hp, Cls]>
        const solvedWaves = enemyConstructors.map((WaveCls, waveIndex) => {
            // Derive the wave metrics
            const sampleEnemy = new WaveCls(waveIndex, [0, 0]);
            const targetTotalHp = (15 + 2.5 * waveIndex ** 2) * sampleEnemy.totalHpModifier;

            // number of enemies
            const numEnemies = Math.round((targetTotalHp / sampleEnemy.hpToNumRatio) ** 0.5)
                || 1;  // always produce at least 1 enemy
            const enemyHp = Math.round(targetTotalHp / numEnemies)
                || 1;  // always have at least 1 hp

            return [waveIndex, sampleEnemy, numEnemies, enemyHp, WaveCls];
        });

        const makeWaveListHoverInfo = (startingWaveIndex, num = 6) => {
            this.defaultHoverInfoContent =
                startingWaveIndex < solvedWaves.length
                ? div('',
                    div('C--infoTitle', 'Upcoming Waves'),
                    // div('C--infoGrid C--infoGridThree',
                    div('C--infoGrid',
                        ...solvedWaves
                            .slice(startingWaveIndex, startingWaveIndex + num)
                            .map(([waveIndex, sampleEnemy, numTotal, hp, WaveCls]) => {
                                return [
                                    // div('C--secondary', waveIndex + 1, '.'),
                                    div('', '- ', sampleEnemy.displayName),
                                    div('', '× ', numTotal),
                                    // div('C--secondary', hp, 'hp'),
                                ];
                            }),
                    )
                )
                : '';
        }

        makeWaveListHoverInfo(0);

        this.upcomingWaves = solvedWaves.map(
            ([waveIndex, sampleEnemy, numTotal, hp, WaveCls]) => [
                waveIndex == 0 ? STARTING_WAVE_DELAY : WAVE_DELAY,
                () => {
                    if(DEBUG) {
                        window.debugTowerBuildLog.push(`waitForWaveIndex(${waveIndex})`);
                    }
                    if(narwhalData?.includes(waveIndex)) {
                        this.enemies.add(new Narwhalicorn(waveIndex, narwhalData[0]));
                    }
                    GameState.toastWaveInfo(
                        `Wave ${waveIndex + 1}`,
                        div('C--secondary', `${sampleEnemy.displayName} × ${numTotal}`),
                    );
                    makeWaveListHoverInfo(waveIndex + 1);
                    range(numTotal).forEach(i => {
                        this.actionQueue.add([
                            this.terrainTotalTime + i * sampleEnemy.delayPerMonster,
                            () => {
                                const e = new WaveCls(waveIndex, randChoice(this.spawnLocations));
                                e.hp = e.maxHp = hp;
                                this.enemies.add(e);
                            },
                        ]);
                    });
                },
            ],
        );
    }

    renderSpecialEffects(dt, ctx) {
        // Draw wave indicator
        const i = this.totalWaves - this.upcomingWaves.length;
        GameState.topLeftDisplay.innerText = `Wave ${i} / ${this.totalWaves}`;

        const timeToNext = this.upcomingWaves[0]?.[0] ?? -1;
        GameState.startNextWaveButton.innerText = timeToNext < 0
            ? ``
            : `Start Wave ${i + 1}${timeToNext > 0 ? ` (${Math.ceil(timeToNext)})` : ``}`;

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
        // The `& ~7` drops the lowest order bits, effectively rounding down to the nearest 8.
        // this prevents generating (and caching) 255 different sprites, instead
        // caching only around 32
        const c = (255 * this.mana / (this.mana + 50)) & ~7;
        renderSprite(ctx, MANA_POOL_POS, sprites[25].withColor([c, c, c, 255]));
        ParticleSystem.sparkleSpriteAt(
            sprites[25],
            MANA_POOL_POS,
            rate * dt,
        );

        // Draw heart
        renderSprite(ctx, HEART_POS, sprites[29]);
    }
}

class LevelSelectTerrain extends Terrain{
    levelIndices = grid2d(this.size, 0);
    levelIsUnlocked = getLevelIsUnlockedMap();
    passedLevelSet = getLevelSet('p');
    perfectedLevelSet = getLevelSet('q');

    // `level` is a levelData entry: the level select map lives at levelData[0]
    // and the home screen at levelData.at(-1).
    constructor(levelIndexString, level, onEndCb = _ => 0) {
        super(
            level.goalLocation,
            level.terrainString,
            level.waves,
            onEndCb,
            level.narwhalData,
            level.extraSetup,
        );
        levelIndexString.split('').forEach((c, i) => {
            const x = i % this.size;
            const y = ~~(i / this.size);
            const level = c == '.' ? 0 : c.charCodeAt(0) - 96;
            this.levelIndices[x][y] = level;
            if(level && this.levelIsUnlocked[level]) {
                this.tileHoverEls[x][y] = div('',
                    div('C--infoTitle', `Level ${level}`),
                    div('', `${levelData[level]?.waves?.length} Waves`),
                    makeSpriteCanvas(ctx => {
                        renderTerrainBase(ctx, 0,
                            getTerrainForLevel(level, _ => 0),
                        );
                    }, 16, 16, 45),
                );
            }else if(level) {
                this.tileHoverEls[x][y] = div('', `Locked`);
            }
        });
        this.defaultHoverInfoContent = div('', 'Select a level')
    }

    recomputeDerivedValues() {}

    renderSpecialEffects(dt, ctx) {
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'center';
        forEachGrid2d(this.levelIndices, (i, pos) => {
            if(!i) return;
            if(this.levelIsUnlocked[i]) {
                if(this.perfectedLevelSet.has(i)) {
                    renderSprite(ctx, addVec(pos, [0, -0.1]), sprites[21]);
                    ctx.fillStyle = '#fff';
                }else if(this.passedLevelSet.has(i)) {
                    renderSprite(ctx, addVec(pos, [0, -0.1]), sprites[36]);
                    ctx.fillStyle = '#06b04e';
                }else{
                    ctx.fillStyle = '#fff';
                }
                ctx.fillText(i, ...addVecWithBScaled([7.5, 10], pos, 15));
            }else{
                renderSprite(ctx, pos, sprites[32].withColor([10, 56, 10, 255]));
            }
        });
    }

    step(dt) {
        // Only do the enemy step, so we can see narwhals move
        for(const e of this.enemies) {
            e.step(dt);
        }
    }

    placeTower(pos) {
        // this just gets called on click, so we can use it for
        // level select.
        // Return false to make an error noise.
        const level = grid2dAt(this.levelIndices, pos);
        if(!level || !this.levelIsUnlocked[level]) return false;
        this.onEndCb(level);
        return true;
    }
}
