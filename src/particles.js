const MANA_POOL_POS = [16, 0];
const HEART_POS = [18, 0]
// Where mana gain particles land, in sprite pixels
const MANA_POOL_PARTICLE_TARGET = addVecWithBScaled([7, 7], MANA_POOL_POS, 15);


// Record<key, color[]>
// Most particle's key into this is some class-unique int + their base color
// Pretty important that this doesn't have conflicts, NOR grow unbounded.
// So, like, don't incorporate anything random into the key.
const globalColorCache = {};


class Particle{
    age = 0;
    lifespan = 2;

    grad = [];
    _globalColorCacheKey;  // needs to be set in child

    colorFn(agePct, ageSec) {
        return lerpGrad(this.grad, agePct);
    }
    posFn() {
        const dist = this.age - 0.25 * Math.log(1 + 3.6 * this.age);
        return addVecWithBScaled(this.pos, this.asymptoticDriftVel, dist);
    }

    constructor(pos) {
        const [x, y] = this.pos = pos;
        this.asymptoticDriftVel = [
            3 * Math.sin(y * 0.10 + x * 0.01) + randFloat(-1, 1),
            1 * Math.sin(y * 0.01 + x * 0.05) + randFloat(-1, 1),
        ];
    }

    render(ctx) {
        if(!this._globalColorCacheKey) console.error('Need _globalColorCacheKey in particle')
        const _colorCache = globalColorCache[this._globalColorCacheKey] ??= range(256).map(
            i => colorAsString(this.colorFn(i / 255, i / 255 * this.lifespan))
        );
        ctx.fillStyle = _colorCache[~~(this.age / this.lifespan * 256)];
        ctx.fillRect(...this.posFn(), 1, 1);
    }
}


class ManaGainParticle extends Particle{
    /** @type {number} */
    lifespan = randFloat(1, 1.3);
    /** @type {!Array<number>} */
    ctrlB = randVec(randFloat(30, 75));

    _globalColorCacheKey = 1;

    // A quadratic bezier from the spawn point to the mana pool, with `ctrlB` as
    // the middle control point stored relative to the spawn point.
    // Substituting B = pos + ctrlB into the usual
    //     (1-t)^2 pos + 2t(1-t) B + t^2 target
    // gives 2t(1-t) pos worth of extra `pos`, and (1-t)^2 + 2t(1-t) == 1 - t^2,
    // so the two endpoint terms collapse into a single lerp by t^2:
    //     lerp(pos, target, t^2) + 2t(1-t) ctrlB
    // which is one lerp and one scaled add instead of three scales and two adds.
    posFn() {
        const t = this.age / this.lifespan;
        return addVecWithBScaled(
            lerpArr(this.pos, MANA_POOL_PARTICLE_TARGET, t * t),
            this.ctrlB,
            2 * t * (1 - t),
        );
    }

    colorFn(agePct, ageSec) {
        return (ageSec % 1) < 0.3 ? WHITE : [119, 204, 255, 255];
    }
}

class EnergyFadeParticle extends Particle{
    constructor(pos, baseColor, lifespan = 2) {
        super(pos);
        this.grad = [
            lerpArr(WHITE, baseColor, 0.5),
            baseColor,
            withAlpha(baseColor, 0),
        ];
        this.lifespan = lifespan;
        this._globalColorCacheKey = 2 + colorAsString(baseColor);
    }
}

class ResetUnicornParticle extends EnergyFadeParticle{
    constructor(...args) {
        super(...args);
        const c = ~~randFloat(0, 50);
        this.grad = [[c, c, c, 255], [c, c, c, 0]];
    }
}

class FireParticle extends Particle{
    /** @type {number} */
    lifespan = randFloat(2, 3);
    grad = [
        [255, 211, 101, 255], [255, 102, 0, 255], [185, 34, 0, 255],
        [75, 75, 75, 255], [49, 49, 49, 255], [5, 5, 5, 0]
    ];
    _globalColorCacheKey = 3;
}

class ExplodeFadeParticle extends Particle{
    constructor(pos, color, speed = randFloat(15, 25)) {
        super(pos);
        this.grad = [color, withAlpha(color, 0)];
        this.vel = randVec(speed);
        this._globalColorCacheKey = 4 + colorAsString(color);
    }

    posFn() {
        return addVecWithBScaled(this.pos, this.vel, this.age);
    }
}


const ParticleSystem = new class{
    particles = new Set;
    addParticle(p) {
        this.particles.add(p);
    }

    render(dt, ctx) {
        if(dt > 1/25 && this.particles.size > 200) {
            console.log("Slow frame, removing particles. Was: ", this.particles.size);
            // Note that iterating a set is in insertion order, so this removes
            // the 100 oldest particles.
            let i = 0;
            for(const p of this.particles) {
                this.particles.delete(p);
                if(++i > 100) break;
            }
        }

        for(const p of this.particles) {
            p.render(ctx);
            p.age += dt;
            if(p.age > p.lifespan) this.particles.delete(p);
        }
    }

    clear() {
        this.particles.clear();
    }

    spawnParticlePixelLine(aPos, bPos, makeParticleCb, density = 1) {
        const a = scaleVec(aPos, 15).map(Math.floor);
        const b = scaleVec(bPos, 15).map(Math.floor);
        const num = Math.max(...addVecWithBScaled(b, a, -1).map(Math.abs));
        range(num + 1).filter(_ => Math.random() < density).map(i => this.addParticle(makeParticleCb(
            lerpArr(a, b, i / num).map(Math.round),
        )));
    }

    sparkleRect(pos, size, density, color) {
        const makeParticleCb = p => new EnergyFadeParticle(p, color);
        const [w, h] = size;
        const acrossX = addVec(pos, [w, 0]);
        const acrossY = addVec(pos, [0, h]);
        const far = addVec(pos, size);
        this.spawnParticlePixelLine(pos, acrossX, makeParticleCb, density);
        this.spawnParticlePixelLine(acrossY, far, makeParticleCb, density);
        this.spawnParticlePixelLine(pos, acrossY, makeParticleCb, density);
        this.spawnParticlePixelLine(acrossX, far, makeParticleCb, density);
    }

    explodeSpritesAt(pos, ...sprites) {
        sprites.forEach(sprite =>
            // sprite data2d is row-major, so asIndexed entries are [y, x, color]
            sprite.asIndexed.forEach(([fy, fx, color]) => {
                this.addParticle(new ExplodeFadeParticle(
                    addVecWithBScaled([fx, fy], pos, 15),
                    color,
                ));
            })
        );
    }

    sparkleSpriteAt(
        sprite,
        pos,
        chance,
        makeParticleCb = (p, c) => new EnergyFadeParticle(p, c),
    ) {
        range(probRound(chance * sprite.asIndexed.length))
            .map(_ => randChoice(sprite.asIndexed))
            .forEach(([fy, fx, color]) =>
                ParticleSystem.addParticle(
                    makeParticleCb(addVecWithBScaled([fx, fy], pos, 15), color)
                )
            )
    }

    explodeManaAt(pos, num) {
        range(num).forEach(_ => {
            this.addParticle(new ManaGainParticle(scaleVec(pos, 15)));
        });
    }

    spawnFireCircleAt(center, radius, density) {
        range(probRound(density * radius * 15 * 6))
            .map(_ => addVec(center, randVec(radius)))
            .filter(pos =>
                grid2dAt(GameState.terrain.isGround, pos)
                && !grid2dAt(GameState.terrain.computedTowersByLocation, pos)
            )
            .forEach(pos =>
                this.addParticle(new FireParticle(
                    scaleVec(pos, 15).map(v => ~~v),
                ))
            );
    }
}
