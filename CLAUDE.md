# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Classic Tetris implemented in vanilla JavaScript with HTML5 Canvas and CSS. No dependencies, no build tools, no package.json — just three files (`index.html`, `style.css`, `game.js`).

## Running

There is no build/test/lint tooling in this repo. To run the game, open `index.html` directly in a browser, or serve it locally (needed if the browser blocks local file access):

```bash
python3 -m http.server 8000
# or
npx serve .
```

Then visit `http://localhost:8000`. To verify a change, open the page in a browser and play — there are no automated tests.

## Architecture

All game logic lives in `game.js` (~300 lines, single file, no modules). Key pieces:

- **Board model**: `board` is a `ROWS × COLS` matrix; each cell is `0` (empty) or a piece-color index `1–7`.
- **Pieces**: `PIECES` defines the 7 tetrominoes as square matrices. `rotateCW` rotates via transpose + row-reverse. `tryRotate` applies `rotateCW` then attempts wall kicks (`[0, -1, 1, -2, 2]` column offsets) until a non-colliding position is found.
- **Collision**: `collide(shape, ox, oy)` checks bounds and overlap against `board`; used for movement, rotation, ghost-piece projection, and drop-lock detection.
- **Game loop**: `loop(ts)` runs via `requestAnimationFrame`, accumulating elapsed time (`dropAccum`) against `dropInterval`; when exceeded, the piece drops one row or locks (`lockPiece`) if blocked.
- **Locking a piece**: `lockPiece` → `merge` (writes piece into `board`) → `clearLines` (removes full rows, shifts down, updates score/level/speed) → `spawn` (promotes `next` to `current`, generates new `next`, checks game-over via immediate collision).
- **Scoring/leveling**: `LINE_SCORES = [0,100,300,500,800]` × `level`; hard drop adds 2 pts/row, soft drop 1 pt/row. Level increases every 10 lines; `dropInterval = max(100, 1000 - (level-1)*90)`.
- **Rendering**: `draw()` clears and redraws the grid, locked board, ghost piece (`ghostY()` projects current piece straight down, drawn at `globalAlpha 0.2`), and the current piece each frame. `drawNext()` renders the preview canvas.
- **Input**: single `keydown` listener dispatches arrow keys/X/Space/P to movement, rotation, soft/hard drop, and pause.

Tunable constants at the top of `game.js`: `COLS`, `ROWS`, `BLOCK`, `COLORS`, `LINE_SCORES`, initial `dropInterval`. If `COLS`/`ROWS`/`BLOCK` change, update the `<canvas id="board">` `width`/`height` in `index.html` to match (`COLS × BLOCK`, `ROWS × BLOCK`).
