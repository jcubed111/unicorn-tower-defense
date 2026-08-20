const MANA_POOL_POS = [16, 0];
const HEART_POS = [19, 0]


class Particle{
    age = 0;
    lifespan = 2;
    constructor(pos) {
        this.pos = pos;
    }

    // render(ctx)  // implement in derived classes

    _render(ctx, x, y, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
    }
}

class ManaGainParticle extends Particle{
    /** @type {number} */
    lifespan = randFloat(1, 1.3);

    constructor(pos) {
        super(pos);
        this.ctrlB = randVec(randFloat(30, 75));
    }

    render(ctx) {
        const t = this.age / this.lifespan;
        const [x, y] = this.pos;
        const [bx, by] = this.ctrlB;
        this._render(
            ctx,
            x + t * t * (MANA_POOL_POS[0] * 15 - x + 7) + 2 * t * (1 - t) * bx,
            y + t * t * (MANA_POOL_POS[1] * 15 - y + 7) + 2 * t * (1 - t) * by,
            (performance.now() % 1000) < 300 ? '#fff' : '#7cf',
        );
    }
}

class EnergyFadeParticle extends Particle{
    constructor(pos, baseColor, lifespan = 2) {
        super(pos);
        this.lifespan = lifespan;
        const [x, y] = pos;
        this.baseColor = baseColor;
        this.asymptoticVel = [
            3 * Math.sin(y * 0.10 + x * 0.01) + randFloat(-1, 1),
            1 * Math.sin(y * 0.01 + x * 0.05) + randFloat(-1, 1),
        ];
    }

    getColor() {
        // for first 25% of life, fade from 50% white -> base color
        // then fade from base color -> transparent
        const normalizedAge = this.age / this.lifespan;
        return colorAsString(
            normalizedAge < 0.25
            ? lerpColor([255,255,255,255], this.baseColor, normalizedAge * 2 + 0.5)
            : [...this.baseColor.slice(0, -1), this.baseColor[3] * (1 - normalizedAge) / 0.75]
        );
    }

    render(ctx) {
        // asymptotic approach towards `dist = age`
        const dist = this.age - 0.25 * Math.log(1 + 3.6 * this.age);

        this._render(
            ctx,
            this.pos[0] + this.asymptoticVel[0] * dist,
            this.pos[1] + this.asymptoticVel[1] * dist,
            this.getColor(),
        );
    }
}

class ResetUnicornParticle extends EnergyFadeParticle{
    v = ~~randFloat(0, 50);
    getColor() {
        return colorAsString(
            [this.v, this.v, this.v, 255 * (1 - this.age / this.lifespan)],
        );
    }
}

class ExplodeFadeParticle extends Particle{
    constructor(pos, color, speed = randFloat(20, 25)) {
        super(pos);
        this.color = color;
        this.vel = randVec(speed);
    }

    render(ctx) {
        // fade from base color -> transparent
        const color = colorAsString(lerpColor(
            this.color,
            [...this.color.slice(0, -1), 0],
            this.age / this.lifespan,
        ));

        this._render(
            ctx,
            this.pos[0] + this.vel[0] * this.age,
            this.pos[1] + this.vel[1] * this.age,
            color,
        );
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
