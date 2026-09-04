const tileSize = 15;


const makeSpriteCanvas = (ctxCb, w = 1, h = 1, cssWidthRem = w * 7.5) => {
    const canvas = styled('canvas');
    canvas.width = w * tileSize;
    canvas.height = h * tileSize;
    canvas.style.width = cssWidthRem + 'rem';
    const ctx = canvas.getContext('2d');
    // No imageSmoothingEnabled here: this canvas is painted with fillRect and
    // blitted at 1:1, neither of which smooths. renderSprite still sets it on
    // whatever ctx it draws into, which is where scaling actually happens.
    ctxCb(ctx);
    return canvas;
}

const spriteListToEl = sprites => makeSpriteCanvas(
    ctx =>
        sprites.forEach(s => ctx.drawImage(s.asImage, 0, 0))
);

class Sprite{
    constructor(data2d, scale=1) {
        this.data2d = data2d;
        this.scale = scale;
        // as indexed drops transparent pixels. Entries are [y, x, color].
        this.asIndexed = grid2dToIndexed(data2d).filter(([, , c]) => c[3] > 0);

        // This uses more space since `putImageData`, `ImageData`, and `Uint8ClampedArray`
        // are all unique strings.
        // this.asImage = makeSpriteCanvas(
        //     ctx => ctx.putImageData(
        //         // flat(2) gives us a flat run of r,g,b,a,r,g,b,a,...
        //         new ImageData(new Uint8ClampedArray(data2d.flat(2)), tileSize),
        //         0,
        //         0,
        //     ),
        // );
        this.asImage = makeSpriteCanvas(ctx =>
            this.asIndexed.forEach(([y, x, c]) => {
                ctx.fillStyle = colorAsString(c);
                ctx.fillRect(x, y, 1, 1);
            })
        );
    }

    _withColorCache = {};
    withColor(c) {
        return this._withColorCache[colorAsString(c)] ??= new Sprite(
            mapGrid2d(this.data2d, v => multiplyColor(v, c)),
            this.scale,
        );
    }

    _withRotCache = {};
    withRot(n) {
        return this._withRotCache[n] ??= new Sprite(
            rotGrid2dMulti(this.data2d, n),
            this.scale,
        );
    }

    withScale(n) {
        return new Sprite(this.data2d, n);
    }
}

function renderSprite(ctx, pos, sprite, rot=0) {
    // renderSprite expects a ctx where 15 units = 1 tile
    ctx.imageSmoothingEnabled = false;
    ctx.save();
    ctx.scale(tileSize, tileSize);
    ctx.translate(...addVec(pos, [0.5, 0.5]));
    ctx.rotate(rot);
    ctx.scale(sprite.scale, sprite.scale);
    ctx.drawImage(sprite.asImage, -0.5, -0.5, 1, 1);
    ctx.restore();
}

