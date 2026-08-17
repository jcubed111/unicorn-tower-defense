// const br = () => {
//     return plainElement('br');
// }

// const plainElement = (tagName, ...children) => {
//     return styled(tagName, '', {}, ...children);
// }

// const div = (className = '', ...children) => {
//     return styledDiv(className, {}, ...children);
// }

// const span = (className = '', ...children) => {
//     return styled('span', className, {}, ...children);
// }

// const styledDiv = (className = '', style = {}, ...children) => {
//     return styled("div", className, style, ...children);
// }

const styled = (tagName = "div", className = "", style = {}, ...children) => {
    const el = document.createElement(tagName);
    el.className = className;

    // This loop works for `-` properties
    for(const k in style) {
        el.style.setProperty(k, style[k]);
    }
    // This works for all other properties
    Object.assign(el.style, style);

    el.append(...children.flat().filter(c => c));
    return el;
}

/* Array Helpers */
const range = end => [...Array(end).keys()];
// NOTE: doesn't handle non-perfect sizes
const chunked = (size, arr) => range(arr.length / size).map(i => arr.slice(i * size, i * size + size));


/* 2d Grid Helpers */
const grid2d = (size, fill) => range(size).map(i => range(size).fill(fill));
const mapGrid2d = (grid, cb) => grid.map((row, x) => row.map((cell, y) => cb(cell, [x, y], grid)));

const transposeGrid2d = grid => grid[0].map((_, i) => grid.map(row => row[i]));
const rotGrid2d = grid => transposeGrid2d(grid).reverse();
const allFormsGrid2d = grid => {
    const result = [
        grid,
        grid = rotGrid2d(grid),
        grid = rotGrid2d(grid),
        rotGrid2d(grid),
    ];
    return [...result, ...result.map(transposeGrid2d)];
}

// T[][] => [x, y, T][]
const grid2dToIndexed = grid => grid.flatMap((row, x) => row.map((cell, y) => [x, y, cell]));


/* Color helpers */
// All the color helpers assume colors are 4 components, with EVERY component in [0, 255]
const lerpColor = (a, b, f) => a.map((v, i) => v * (1 - f) + b[i] * f);
const clampColorComponent = v => v < 0 ? 0 : v > 255 ? 255 : ~~v;
const colorAsString = c => `#` + c.map(v => clampColorComponent(v).toString(16).padStart(2, '0')).join('');
