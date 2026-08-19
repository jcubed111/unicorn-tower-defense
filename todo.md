TODO:
- style the sidebar
- show the wizard & hp

- wave toast & sound effect
- enemy armor
- enemy types
    - enemy rainbow trails?
- enemy status effects
- enemy hover info

- tower types
- hide undiscovered runebook entires
    - show them as shape only? With "???" names?
- make towers stable

- animate sea waves

## Feature Ideas
- narwal-i-corn (swims, gives large mana. Dark shadow in water)
- rhino-i-corn

- explode mana to mana pool on enemy death
- mana particles that curve to pool

- add rainbow bridges to terrain
- add wave effects to ocean

- mana gen tower (cyan? Or magenta?)

- reusable scroll (the paper kind) box effect (dark on color? Color as a param?)

- click to focus enemy
- shift click to place multiple towers
- spells: bomb, remove tower, ???

- banish when reaching tower

- wave list can just be a list of Enemy Constructors, and we can derive number from there. Make the constructors scale stats by level like tower.

- make unicorns blockier (look up Minecraft horse?)

- use audio tree for playing sounds
- find a classical piece to "play" on piano. Each note is [time, freqIndex, vol, hold, INSTRUMENT] Where instrument defines the note quality, optional reverb, optional distortion
- chop bg music into bits so we can dynamically queue up next based on mood of game.

## optimization ideas
- use js-like chars for the inline image data: (){}, etc


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
