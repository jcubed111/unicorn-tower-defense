const MANA_POOL_POS = [16, 0];
const HEART_POS = [18, 0]
// Where mana gain particles land, in sprite pixels
const MANA_POOL_PARTICLE_TARGET = addVec(scaleVec(MANA_POOL_POS, 15), [7, 7]);


class Particle{
    age = 0;
    lifespan = 2;

    grad = [];
    _colorCache;

    colorFn(agePct, ageSec) {
        return lerpGrad(this.grad, agePct);
    }
    posFn() {
        const dist = this.age - 0.25 * Math.log(1 + 3.6 * this.age);
        return addVec(this.pos, scaleVec(this.asymptoticDriftVel, dist));
    }

    constructor(pos) {
        const [x, y] = this.pos = pos;
        this.asymptoticDriftVel = [
            3 * Math.sin(y * 0.10 + x * 0.01) + randFloat(-1, 1),
            1 * Math.sin(y * 0.01 + x * 0.05) + randFloat(-1, 1),
        ];
    }

    render(ctx) {
        this._colorCache ??= range(256).map(
            i => colorAsString(this.colorFn(i / 255, i / 255 * this.lifespan))
        );
        ctx.fillStyle = this._colorCache[~~(this.age / this.lifespan * 256)];
        ctx.fillRect(...this.posFn(), 1, 1);
    }
}


class ManaGainParticle extends Particle{
    /** @type {number} */
    lifespan = randFloat(1, 1.3);
    /** @type {!Array<number>} */
    ctrlB = randVec(randFloat(30, 75));

    posFn() {
        const t = this.age / this.lifespan;
        return addVec(
            scaleVec(this.pos, 1 - t * t),
            scaleVec(MANA_POOL_PARTICLE_TARGET, t * t),
            scaleVec(this.ctrlB, 2 * t * (1 - t)),
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
}

class ExplodeFadeParticle extends Particle{
    constructor(pos, color, speed = randFloat(15, 25)) {
        super(pos);
        this.grad = [color, withAlpha(color, 0)];
        this.vel = randVec(speed);
    }

    posFn() {
        return addVec(this.pos, scaleVec(this.vel, this.age));
    }
}


const ParticleSystem = new class{
    particles = new Set;
    addParticle(p) {
        this.particles.add(p);
    }

    render(ctx) {
        for(const p of this.particles) p.render(ctx);
    }

    step(dt) {
        for(const p of this.particles) {
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
        const num = Math.max(...addVec(b, scaleVec(a, -1)).map(Math.abs));
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
                    addVec(scaleVec(pos, 15), [fx, fy]),
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
                    makeParticleCb(addVec(scaleVec(pos, 15), [fx, fy]), color)
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
            .filter(([x, y]) =>
                GameState.terrain.isGround[~~x]?.[~~y]
                && !GameState.terrain.computedTowersByLocation[~~x]?.[~~y]
            )
            .forEach(pos =>
                this.addParticle(new FireParticle(
                    scaleVec(pos, 15).map(v => ~~v),
                ))
            );
    }
}
