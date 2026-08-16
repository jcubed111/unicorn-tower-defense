# Technical notes
Try run length encoding on the image assets:
- indexed color; 6 bits available per char.

# Ideas

## Dexterity
Infinite Runner (lol)
    - 3d? You have to dodge obstacles and pass through rainbows?

Unicorn bullet hell

Rainbow Narwhal/Rhino

## Puzzle

Puzzle Game
    - something with light refraction?


## RTS
Simulation
    - unicorn farmer
    - unicorn cafe

### Tower Defense
- multiple colors of towers
- combining colors (in patterns?) creates different effects
- eg, start with only primary colors of rgb
    - [r] bolt
    - [g] poison
    - [b] slow
- then [r][g] -> [yllw] (lightning)

> An EVIL WIZARD has descended upon the realm (that's you)
> You've stolen the GOLDEN HORN, but the unicorns want it back (obviously)
> Defend your RIGHTEOUSLY STOLEN BOOTY from the attacking hoards! (or die trying)

Tower types:
- red $5: area blast (long cooldown, hits all in range)
- green $3: bolt (short cooldown, hits one)
- blue $1: wall (blocks path)

- r-g-r: orange, applies fire aoe
- r-g: yellow, lightning, chain=sum(level)
- g-b: cyan, freeze single target for sum(level) secs
- g-g-r: greenyellow, poison single target (ignores armor)
- 2x2b square: lightblue, passive slow aoe
- r-b magenta:
- b-b-r-b-b: purple, fear tower, makes enemies flee for some time

The tower combination algo works from most cells -> least. So dual towers will break easily but large shapes are stickier. Combo algo should be idempotent, so recomputing doesn't create new tower objects. Maybe key results by pos+type?


### Unicorn auto battler

### "Unicorn Warlord"
    - send waves of unicorns into battle against [enemy]
    - like that base defense flash game, except waves of enemies (so asymmetric)
    - killing enemies gives mana, which you use to upgrade your infra
    - get a score based on how many waves you survive / enemies killed
    - power scaling is linear but enemy strength is ≥linear, so the goal is to build up strength while you're ahead, but then enemies will overwhelm you eventually.
    - different units:
        - basic unicorn
        - pegasus (flying unicorn, to counter flying enemies)

## KTC
Something like kingdom two crowns? But maybe on a circular planet?
    - Evil wizards are coming to steal your magic
    - Kill wizards, collect gold, build infrastructure.
    - Rainbows link multiple planets??

Or just 2d kingdom two crowns
    - "Don't let the _rainbow dell_ fall to the forces of the dark wizards"
    - Multiple tower types you can build
    - 2.5D??
    - moves are [left], [right], dash [space] (rainbow effect, stab with horn & knockback), jump [up], activate [down]

Unicorn vs Alien Wizards
    - game is run on a circular planet
    - build infra to defend base
    -
