const fs = require("fs");
const { colord } = require("colord");

const stdin = fs.readFileSync(0, "utf8");

// replace long form colors with the shortest version
const transformed = stdin.replace(/(rgb[a]?\([^)]+\)|hsl[a]?\([^)]+\))/gi, match => {
    const c = colord(match);
    if(c.isValid()) {
        let hex = c.toHex().toLowerCase();
        if(hex[7] == 'f' && hex[8] == 'f') {
            hex = hex.slice(0, -2);
        }
        if(
            hex[1] == hex[2]
            && hex[3] == hex[4]
            && hex[5] == hex[6]
            && hex[7] == hex[8]
        ) {
            return `#${hex[1]}${hex[3]}${hex[5]}${hex[7] ?? ''}`;
        }
    }else{
        return match;
    }
    return c.isValid() ? c.toHex() : match;
});


fs.writeSync(1, transformed); // stdout
