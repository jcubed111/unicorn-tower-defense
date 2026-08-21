const MANA_POOL_POS = [16, 0];
const HEART_POS = [19, 0]


class Particle{
    age = 0;
    lifespan = 2;

    grad = [];
    colorFn() {
        return lerpGrad(this.grad, this.age / this.lifespan);
    }
    posFn() {
        const dist = this.age - 0.25 * Math.log(1 + 3.6 * this.age);
        return [
            this.pos[0] + this.asymptoticDriftVel[0] * dist,
            this.pos[1] + this.asymptoticDriftVel[1] * dist,
        ];
    }

    constructor(pos) {
        const [x, y] = this.pos = pos;
        this.asymptoticDriftVel = [
            3 * Math.sin(y * 0.10 + x * 0.01) + randFloat(-1, 1),
            1 * Math.sin(y * 0.01 + x * 0.05) + randFloat(-1, 1),
        ];
    }

    render(ctx) {
        ctx.fillStyle = colorAsString(this.colorFn());
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
        const [x, y] = this.pos;
        const [bx, by] = this.ctrlB;
        return [
            x + t * t * (MANA_POOL_POS[0] * 15 - x + 7) + 2 * t * (1 - t) * bx,
            y + t * t * (MANA_POOL_POS[1] * 15 - y + 7) + 2 * t * (1 - t) * by,
        ];
    }

    colorFn() {
        return (performance.now() % 1000) < 300 ? WHITE : [119, 204, 255, 255];
    }
}

class EnergyFadeParticle extends Particle{
    constructor(pos, baseColor, lifespan = 2) {
        super(pos);
        this.grad = [
            lerpColor(WHITE, baseColor, 0.5),
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
        return [
            this.pos[0] + this.vel[0] * this.age,
            this.pos[1] + this.vel[1] * this.age,
        ];
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

    spawnParticlePixelLine(aPos, bPos, makeParticleCb) {
        const [ax, ay, bx, by] = [...aPos, ...bPos].map(v => Math.floor(v * 15));
        const num = Math.max(...[ax - bx, ay - by].map(Math.abs));
        range(num + 1).map(i => this.addParticle(makeParticleCb([
            ax + (bx - ax) * i / num,
            ay + (by - ay) * i / num,
        ].map(Math.round))));
    }

    explodeSpritesAt([x, y], ...sprites) {
        sprites.forEach(sprite =>
            sprite.asIndexed.forEach(([fx, fy, color]) => {
                this.addParticle(new ExplodeFadeParticle(
                    [x * 15 + fx, y * 15 + fy],
                    color,
                ));
            })
        );
    }

    explodeManaAt([x, y], num) {
        range(num).forEach(_ => {
            this.addParticle(new ManaGainParticle([x * 15, y * 15]));
        });
    }
}
