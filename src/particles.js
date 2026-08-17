class Particle{
    age = 0;
    lifespan = 2;
    constructor(x, y) {
        this.pos = [x, y];
    }

    // render(ctx)  // implement in derived classes

    _render(ctx, x, y, color) {
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
    }
}

class EnergyFadeParticle extends Particle{
    constructor(x, y, baseColor) {
        super(x, y);
        this.baseColor = baseColor;
        this.asymptoticVel = [
            3 * Math.sin(y * 0.10 + x * 0.01) + randFloat(-1, 1),
            1 * Math.sin(y * 0.01 + x * 0.05) + randFloat(-1, 1),
        ];
    }

    render(ctx) {
        // for first 25% of life, fade from 50% white -> base color
        // then fade from base color -> transparent
        const normalizedAge = this.age / this.lifespan;
        const color = colorAsString(
            normalizedAge < 0.25
            ? lerpColor([255,255,255,255], this.baseColor, normalizedAge * 2 + 0.5)
            : lerpColor(this.baseColor, [...this.baseColor.slice(0, -1), 0], (normalizedAge - 0.25) / 0.75)
        );

        // asymptotic approach towards `dist = age`
        const dist = this.age - 0.25 * Math.log(1 + 3.6 * this.age);

        this._render(
            ctx,
            this.pos[0] + this.asymptoticVel[0] * dist,
            this.pos[1] + this.asymptoticVel[1] * dist,
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
}
