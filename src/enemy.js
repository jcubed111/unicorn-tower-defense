class Enemy{
    displayName = 'Unicorn';
    speed = 2;  // squares/sec
    armor = 0;
    extraDescription;

    targetLocation = null;
    facing = 3;

    constructor(pos, hp) {
        // Take the starting square, but place in center of square
        this.pos = pos.map(v => v + 0.5);
        this.hp = this.maxHp = hp;
    }

    _asHoverElResult;
    asHoverEl() {
        return this._asHoverElResult ??= div('',
            spriteListToEl(...this.getSprites()),
            div('', `${this.displayName}`),
            div('', `hp: ${this.hp} / ${this.maxHp}`),
            div('', `speed: ${this.speed}`),
            div('', `armor: ${this.armor}`),
            div('', this.extraDescription),
        );
    }

    getSquare() {
        return this.pos.map(Math.floor);
    }

    *getSprites() {
        yield sprites[16 + Math.floor(performance.now() / 200 * this.speed) % 4];
    }

    takeDamage(amt) {
        this.hp -= Math.max(0, amt - this.armor);
    }

    step(dt) {
        if(!this.targetLocation) {
            // TODO: support diagonals?
            const [sx, sy] = this.getSquare();
            this.targetLocation = minByTiesRand(
                [
                    [sx + 1, sy],
                    [sx - 1, sy],
                    [sx, sy - 1],
                    [sx, sy + 1],
                ],
                ([x, y]) => GameState.terrain.descentMap[x]?.[y] ?? 1e8,
            ).map(v => v + randFloat(0.4, 0.6));
        }
        const [x, y] = this.pos;
        const [tx, ty] = this.targetLocation;
        const dx = tx - x, dy = ty - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const moveAmount = this.speed * dt;
        if(dist <= moveAmount) {
            this.pos = [tx, ty];
            this.targetLocation = null;
        }else{
            this.pos = [
                x + dx * moveAmount / dist,
                y + dy * moveAmount / dist,
            ];
        }

        // update facing direction
        const facingError = Math.atan2(dx, -dy) - this.facing;
        if(Math.abs(facingError) > Math.PI) this.facing += Math.PI * 2 * Math.sign(facingError);
        // moveAmount is speed * dt, so we stil lscale correctly with time step
        this.facing += (Math.atan2(dx, -dy) - this.facing) * (1 - 2 ** (-5 * moveAmount));
    }
}
