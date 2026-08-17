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

    _imageColorCache = {};
    asImageWithColor(c) {
        return this._imageColorCache[c] ??= (() => {
            const canvas = new OffscreenCanvas(this.asImage.width, this.asImage.height);
            const ctx = canvas.getContext('2d');
            ctx.drawImage(this.asImage, 0, 0);
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = c;
            ctx.fillRect(0, 0, 1e8, 1e8);
            return canvas;
        })();
    }
}
