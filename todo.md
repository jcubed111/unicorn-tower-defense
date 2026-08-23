TODO:
- speed up, pause?

- wave start sound effect
- clicking start wave should spawn mana particles
- explode wizard sprite on death
- clear particles on cloud
- add level hover info to level select screen
    - use a sprite renderer to render the terrain as a minimap to show? Extract the logic from the main render.
- add movement to intro screen? Maybe the rainbow path sparkle will do this.
- need a way to restart level during level. Menu/esc. annoying to shoot for perfect without that feature.
- make start wave toast longer?


- game flow:
    - highlight the start wave button before the start of the level. Or maybe give it a 30s timeout?

- spells
    - click to focus enemy
    - shift click to place multiple towers
    - spells: remove rune, meteor (damage + fire, get stronger each cast), freeze
        - what if remove tower could also create new land?
    - set tower target mode??

- enemy types
    - narwal-i-corn (swims, gives large mana. Dark shadow in water)
    - rhino-i-corn
    - dash-i-corn (dashes every n seconds, starting on first damage, using a rainbow trail effect)
    - manticorn

- enemy graphics
    - unicorns should sparkle
        - rainbow trails?
    - banished enemies should come back with a zombie effect (black, red eyes?) And show that they're banished in their hover info.

- tower types
    - fear?
    - zombie? -> turns unicorns to allies on death
    - a better big hitter tower besides green & sniper


- animate sea waves
- add wave effects to ocean
- keyboard controls for tower building
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
