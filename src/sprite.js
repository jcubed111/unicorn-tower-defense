class Sprite{
    constructor(data2d) {
        this.data2d = data2d;
        const height = data2d.length;
        const width = data2d[0].length;

        (this.asImage = new OffscreenCanvas(width, height))
            .getContext('2d').putImageData(
                // flat(2) gives us a flat run of r,g,b,a,r,g,b,a,...
                new ImageData(new Uint8ClampedArray(data2d.flat(2)), width),
                0,
                0,
            );
    }

    _withColorCache = {};
    withColor(c) {
        return this._withColorCache[colorAsString(c)] ??= new Sprite(
            mapGrid2d(this.data2d, v => multiplyColor(v, c))
        );
    }

    _withRotCache = {};
    withRot(n) {
        return this._withRotCache[n] ??= new Sprite(rotGrid2dMulti(this.data2d, n));
    }
}
