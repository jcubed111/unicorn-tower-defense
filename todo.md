TODO:
- style wave info & start now button

- wave toast & sound effect
- enemy types
    - narwal-i-corn (swims, gives large mana. Dark shadow in water)
    - rhino-i-corn
    - dash-i-corn (dashes every n seconds, starting on first damage, using a rainbow trail effect)

- enemy graphics
    - unicorns should sparkle
        - rainbow trails?
    - banished enemies should come back with a zombie effect (black, red eyes?) And show that they're banished in their hover info.

- tower types
    - fear

- add rainbow bridges to terrain

- game flow:
    - level select
    - intro text
    - win/loss screen
        - special win screen if perfect (no enemies reach tower)
        - maybe mark perfected levels on the level select?
    - transition animation
    - delay first wave till user clicks

- speed up, pause?

- animate sea waves
- add wave effects to ocean

- sound / screenshake on enemy death

## Feature Ideas

- allow enemies to move diagonal?

- show ghost tower symbol when placing a tower
- it'd be nice to know which stats will get boosted when a tower is upgraded

- make mana gain delay till particle arrival?
- allow hovering runebook entires
- clicking start wave should spawn mana particles

- click to focus enemy
- shift click to place multiple towers
- spells: remove rune, meteor (damage + fire, get stronger each cast), freeze
    - what if remove tower could also create new land?
- set tower target mode??

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
