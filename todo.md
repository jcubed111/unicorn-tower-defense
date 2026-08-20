TODO:
- style wave info & start now button

- wave toast & sound effect
- enemy types
    - enemy rainbow trails?
    - armored

- tower types
    - enemy status effects
        - fire
        - poison
        - fear

- animate sea waves
- add wave effects to ocean

- add rainbow bridges to terrain

- game flow:
    - level select
    - intro text
    - win/loss screen
    - transition animation
    - delay first wave till user clicks

- speed up mode

## Feature Ideas
- narwal-i-corn (swims, gives large mana. Dark shadow in water)
- rhino-i-corn

- make unicorns blockier
- banished enemies should come back with a zombie effect (black, red eyes?) And show that they're banished in their hover info.

- play noise when a tower can't be placed

- make mana gain delay till particle arrival?
- allow hovering runebook entires
- clicking start wave should spawn mana particles

- mana gen tower (cyan? Or magenta?)

- click to focus enemy
- shift click to place multiple towers
- spells: bomb, remove tower, ???

- use audio tree for playing sounds
- find a classical piece to "play" on piano. Each note is [time, freqIndex, vol, hold, INSTRUMENT] Where instrument defines the note quality, optional reverb, optional distortion
- chop bg music into bits so we can dynamically queue up next based on mood of game.

# scaling notes

green tower: 1.5 dmg/sec * 10s/wave = 15dmg / wave => 15 mana



`t *= 1.5` per wave

15.0
22.5
33.75
50.625
75.9375
113.90625
170.859375
256.2890625
384.43359375
