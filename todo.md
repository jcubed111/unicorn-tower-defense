TODO:
- wave start sound effect
- add more movement to intro screen? Unicorns running around?
- subtract fire acc from hp bar display?
- should enemies have a slight shade variation per enemy?
- Add more narwal-i-corns
    - one pre-boss one
- add wave effects to ocean


- Level ideas:
    - wide open path
    - all-ish swarm
    - all-ish armor
    - Pegacorn focus
    - fixed unicorn path (rainbow bridge?) - almost have this

- spells
    - would help with spending mana in final wave
    - click to focus enemy
    - shift click to place multiple towers
    - spells: remove rune, meteor (damage + fire, get stronger each cast), freeze
        - what if remove tower could also create new land?
    - set tower target mode??

- enemy types
    - add dedicated rhino-i-corn sprite?
    - manticorn

- enemy graphics
    - unicorns should sparkle
        - rainbow trails?
    - banished enemies should come back with a zombie effect (black, red eyes?) And show that they're banished in their hover info.

- tower types
    - fear?
    - zombie? -> turns unicorns to allies on death
    - a 5 cell tower

- rainbow the title?

NOTE: swapping scroll back for rune back would save 0.8%


## Feature Ideas

- allow enemies to move diagonal?
    - problem: this will cut down on the spread effect we get currently; enemies will always greedily use a diag if available.

- it'd be nice to show which stats will get boosted when a tower is upgraded

- make mana gain delay till particle arrival?


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
