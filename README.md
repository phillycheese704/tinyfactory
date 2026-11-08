# 🏭 Tiny Factory

A self-contained browser factory game. Place machines, route and process products,
manage power, expand to more factory pages, and grow your production line.

**Play:** https://phillycheese704.github.io/tinyfactory/

## Controls

| Action | Mouse / keyboard | Touch | Controller |
| --- | --- | --- | --- |
| Place or select | Click a tile | Tap a tile | D-pad / left stick, then A |
| Rotate / move / delete tools | `R` / `M` / `X` | Inventory bar | X to rotate |
| Pause | `P` | Pause button | Start |
| Undo / redo | `Ctrl+Z` / `Ctrl+Y` | Action bar | — |

The factory board automatically fits the available screen space. It does not
pan or zoom with touch gestures, mouse wheel, keyboard or controller input.
The shop, money display, inventory and page navigation remain fixed.

For the full control reference, open **ⓘ Factory information** in the game.

## Music & sound effects 🎶

The game has an original, looping chiptune and short synthesized sound effects
for buying and placing machines, selling blobs, and other factory actions.
All audio is generated locally with Web Audio: no downloads or third-party
music files are needed, so it works offline too.

Browsers require a tap, click, or key press before audio starts. Use **🔊 / 🔇**
next to the factory controls to mute everything, or open **ⓘ Factory
information → Music & sound** to adjust the music and sound-effect volumes
independently. Audio preferences are saved on your device separately from
factory progress. Music stays quiet while the game is paused or the tab is
hidden; sound effects for very busy sale lines are rate-limited.

## Running locally

Open `index.html` in a modern browser. No bundler, runtime dependencies, or
network services are needed for the game itself. Serving the directory over
HTTP is also supported; on HTTPS, the service worker enables offline reloads.

Factory progress is stored in the browser's local storage. Clearing site data
will erase that local save.

## Tests

The dependency-free model and save regression suite:

```sh
node tests/machine-regression.cjs
```

Browser smoke tests include desktop and phone Chromium, iPad WebKit (portrait
and landscape), and controller input. They verify the main UI as well as
a stationary board during wheel, touch, pinch and keyboard input:

```sh
npm install --no-save playwright
npx playwright install chromium webkit
node tests/browser-smoke.cjs
```

The GitHub Actions workflow runs both suites on pushes and pull requests.

## Project layout

- `index.html` — complete game UI, styles, simulation and controls in one offline-friendly page.
- `sw.js`, `manifest.webmanifest`, `icon.svg` — offline/PWA assets.
- `tests/machine-regression.cjs` — logic and persistence regressions without external packages.
- `tests/browser-smoke.cjs` — multi-device browser interaction and visual smoke tests.
- `.github/workflows/factory-compatibility.yml` — CI.

Keeping the game in one HTML file is intentional: it can be opened directly as
`file://` and downloaded without a build step.
