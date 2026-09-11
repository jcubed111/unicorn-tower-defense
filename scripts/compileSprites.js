const fs = require("fs");
const { PNG } = require("pngjs");

const [inFile, outFile, spriteSizeArg] = process.argv.slice(2);

if(!inFile || !outFile || !spriteSizeArg) {
    console.error("usage: node scripts/compileSprites.js <inFile> <outFile> <spriteSize>");
    process.exit(1);
}

const spriteSize = +spriteSizeArg;

const image = PNG.sync.read(fs.readFileSync(inFile)); // .data is flat rgba

if(image.width % spriteSize || image.height % spriteSize) {
    throw new Error(`${inFile} (${image.width}x${image.height}) isn't divisible into ${spriteSize}x${spriteSize} sprites`);
}

const getPixel = (x, y) => [...image.data.subarray((y * image.width + x) * 4, (y * image.width + x + 1) * 4)];


const colors = []; // in order of first use, so index 0 is the top left pixel
const colorIndex = new Map();

function charFor(color) {
    // fully transparent pixels are all the same to us, no matter their rgb
    if(!color[3]) color = [0, 0, 0, 0];

    const key = color.join();
    if(!colorIndex.has(key)) {
        colorIndex.set(key, colors.length);
        colors.push(color);
    }
    return String.fromCharCode(35 + colorIndex.get(key)); // 35 == '#'
}

// grab the pixels first, so that sprites we end up dropping don't put their
// colors in the index
const spritePixels = [];
for(let sy = 0; sy < image.height; sy += spriteSize) {
    for(let sx = 0; sx < image.width; sx += spriteSize) {
        const pixels = [];
        for(let y = sy; y < sy + spriteSize; y++) {
            for(let x = sx; x < sx + spriteSize; x++) {
                pixels.push(getPixel(x, y));
            }
        }
        spritePixels.push(pixels);
    }
}

const isEmpty = pixels => pixels.every(p => !p[3]);

// drop the empty sprites off the end entirely, and blank out the rest so that
// the ones after them keep their index
while(spritePixels.length && isEmpty(spritePixels.at(-1))) spritePixels.pop();

const sprites = spritePixels.map(
    pixels => isEmpty(pixels) ? "" : pixels.map(charFor).join(""),
);

if(colors.length > 92) {
    // 35 + 92 == 127, which is DEL, and it only gets worse from there
    throw new Error(`${colors.length} colors is too many to encode as chars`);
}

const out = `// This file is auto generated: DO NOT MODIFY

const spriteColors = [\n${colors.map(c => `    [${c}]`).join(",\n")}\n];

const sprites = [
${sprites.map(s => `    ${JSON.stringify(s)},`).join("\n")}
].map(s => s && new Sprite(chunked(${spriteSize}, s.split('').map(c => spriteColors[c.charCodeAt(0) - 35]))))
`;

fs.writeFileSync(outFile, out);
