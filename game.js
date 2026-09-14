'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

const COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#64b5f6', // J - azul pálido
  '#ffb74d', // L - orange
  '#b0bec5', // Tuerca - gris metálico
];

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // Tuerca (3x3, hueco central)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const comboEl = document.getElementById('combo');
const nextLabelEl = document.getElementById('next-label');
const freezeSection = document.getElementById('freeze-section');
const freezeValueEl = document.getElementById('freeze-value');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');
const themeToggleBtn = document.getElementById('theme-toggle');
const soundToggleBtn = document.getElementById('sound-toggle');
const helpToggleBtn = document.getElementById('help-toggle');
const helpCloseBtn = document.getElementById('help-close');
const helpModal = document.getElementById('help-modal');
const modeClassicBtn = document.getElementById('mode-classic-btn');
const modeFullBtn = document.getElementById('mode-full-btn');
const startScreen = document.getElementById('start-screen');
const startPlayBtn = document.getElementById('start-play-btn');
const startResetBtn = document.getElementById('start-reset-btn');
const startScoresEl = document.getElementById('start-scores');
const startBestComboEl = document.getElementById('start-best-combo');
const startMaxLinesEl = document.getElementById('start-max-lines');
const overlayExtra = document.getElementById('overlay-extra');
const overlayBestComboEl = document.getElementById('overlay-best-combo');
const overlayMaxLinesEl = document.getElementById('overlay-max-lines');
const overlayScoresEl = document.getElementById('overlay-scores');
const saveScoreRow = document.getElementById('save-score-row');
const saveScoreName = document.getElementById('save-score-name');
const saveScoreBtn = document.getElementById('save-score-btn');

const THEME_STORAGE_KEY = 'tetris-theme';
const MODE_STORAGE_KEY = 'tetris-mode';
const themeColors = { gridLine: '', blockHighlight: '', comodin: '' };
let gameMode = 'full'; // 'classic' | 'full'

let board, current, next, score, lines, level, combo, freezeRemaining,
  paused, gameOver, lastTime, dropAccum, dropInterval, animId, runBestCombo;

// Bloquea el bucle/los controles (incluidos los botones táctiles, que
// llaman a moveLeft/rotate/etc. directamente y no pasan por el listener de
// teclado) hasta que se pulse "Jugar" en la pantalla de inicio.
gameOver = true;

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * (PIECES.length - 1)) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function makePowerUpPiece(powerUp) {
  return { type: powerUp.code, shape: [[powerUp.code]], x: Math.floor(COLS / 2), y: 0, powerUp };
}

function nextPiece() {
  const powerUp = PowerUpSpawner.takePowerUp(powerUpContext);
  return powerUp ? makePowerUpPiece(powerUp) : randomPiece();
}

// --- Primitivas de tablero para el sistema de power-ups (powerups.js) ---

function isInside(x, y) {
  return x >= 0 && x < COLS && y >= 0 && y < ROWS;
}

function getCell(x, y) {
  return isInside(x, y) ? board[y][x] : 0;
}

function setCell(x, y, v) {
  if (isInside(x, y)) board[y][x] = v;
}

function clearCell(x, y) {
  setCell(x, y, 0);
}

function forEachCell(fn) {
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++)
      fn(x, y, board[y][x]);
}

function colorHex(index) {
  return COLORS[index];
}

function addScore(points) {
  score += points;
  updateHUD();
}

function getLevel() {
  return level;
}

function freeze(ms) {
  freezeRemaining = ms;
  Effects.removeType(FreezeOverlayEffect);
  Effects.spawn(new FreezeOverlayEffect(ms, COLS, ROWS));
}

// Compacta cada columna hacia abajo preservando el orden relativo de sus
// bloques; devuelve cuántas celdas se movieron y de dónde, para el efecto visual.
function applyGravity() {
  let count = 0;
  const streaks = [];
  for (let x = 0; x < COLS; x++) {
    const values = [];
    for (let y = 0; y < ROWS; y++) {
      const v = board[y][x];
      if (v) values.push({ origY: y, v });
    }
    for (let y = 0; y < ROWS; y++) board[y][x] = 0;
    let writeY = ROWS - 1;
    for (let i = values.length - 1; i >= 0; i--) {
      const { origY, v } = values[i];
      board[writeY][x] = v;
      if (writeY !== origY) {
        count++;
        streaks.push({ x, y: writeY, dist: writeY - origY });
      }
      writeY--;
    }
  }
  return { count, streaks };
}

// Fuerza la eliminación de una fila concreta (no tiene por qué estar llena),
// con la misma contabilidad de puntuación/nivel que una línea normal.
function clearRow(y) {
  const comodines = board[y].filter(v => v === 9).length;
  board.splice(y, 1);
  board.unshift(new Array(COLS).fill(0));
  applyLinesCleared(1, comodines);
  return 1;
}

// Vacía una columna entera (destrucción, no cuenta como línea limpiada).
function clearColumn(x) {
  let destroyed = 0;
  for (let y = 0; y < ROWS; y++) {
    if (board[y][x]) { board[y][x] = 0; destroyed++; }
  }
  return destroyed;
}

const powerUpContext = {
  ROWS, COLS,
  getCell, setCell, clearCell, isInside, forEachCell,
  clearRow, clearColumn, applyGravity,
  addScore, getLevel, colorHex, freeze,
  effects: Effects, sfx: Sfx,
};

function activatePowerUp(piece) {
  const instance = piece.powerUp;
  if (instance.consumesSelf) clearCell(piece.x, piece.y);
  return instance.activate(piece.x, piece.y) || 0;
}

function registerCombo(clearedCount) {
  if (clearedCount > 0) {
    combo++;
    // Se captura aquí, no al terminar la partida: `combo` vuelve a 0 en el
    // `else` de abajo en el siguiente lock que no limpie línea, así que leerlo
    // más tarde (p. ej. en endGame) ya sería tarde.
    runBestCombo = Math.max(runBestCombo, combo);
    Scores.updateBestCombo(combo);
    if (combo > 1) score += 50 * (combo - 1) * level;
  } else {
    combo = 0;
  }
  updateHUD();
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

// Una fila se limpia si cada hueco está cubierto por un comodín (el caso
// normal, sin comodines, exige que no haya ningún hueco).
function isRowClearable(row) {
  let gaps = 0, wilds = 0;
  for (const v of row) {
    if (v === 0) gaps++;
    else if (v === 9) wilds++;
  }
  return gaps <= wilds;
}

function applyLinesCleared(count, comodines = 0) {
  lines += count;
  // Con comodines varias filas pueden completarse a la vez fuera de las 1-4
  // habituales de una pieza normal; LINE_SCORES sólo cubre hasta 4.
  const base = (LINE_SCORES[Math.min(count, 4)] || 0) * level;
  const bonus = comodines > 0 ? Math.round(base * 0.5 * comodines) : 0;
  score += base + bonus;
  level = Math.floor(lines / 10) + 1;
  dropInterval = Math.max(100, 1000 - (level - 1) * 90);
  updateHUD();
}

function clearLines() {
  let cleared = 0;
  let comodines = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (isRowClearable(board[r])) {
      comodines += board[r].filter(v => v === 9).length;
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) applyLinesCleared(cleared, comodines);
  return { cleared, comodines };
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  PowerUpSpawner.onPiecePlaced();
  const puLines = current.powerUp ? activatePowerUp(current) : 0;
  const { cleared } = clearLines();
  const totalCleared = puLines + cleared;
  registerCombo(totalCleared);
  PowerUpSpawner.onLinesCleared(totalCleared);
  spawn();
}

function spawn() {
  current = next;
  next = nextPiece();
  drawNext();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
  comboEl.textContent = combo > 1 ? `x${combo}` : '—';
  if (freezeRemaining > 0) {
    freezeSection.classList.remove('hidden');
    freezeValueEl.textContent = `${Math.ceil(freezeRemaining / 1000)}s`;
  } else {
    freezeSection.classList.add('hidden');
  }
}

// Decodifica una celda del tablero: 1-8 color normal, 9 comodín (Tinte),
// 100+n celda de power-up. `puInstance` (opcional) es la instancia real de
// la pieza que está cayendo, para que cada power-up (p. ej. el color que
// eligió el Tinte) se pinte con su estado real en vez de un valor genérico.
function resolveCell(v, puInstance) {
  if (v >= 100) {
    if (puInstance) return { fill: puInstance.color, glyph: puInstance.glyph };
    return PowerUps.styleFor(v - 100);
  }
  if (v === 9) return { fill: themeColors.comodin, glyph: '✦' };
  return { fill: COLORS[v], glyph: null };
}

function drawBlock(context, x, y, colorIndex, size, alpha, puInstance) {
  if (!colorIndex) return;
  const style = resolveCell(colorIndex, puInstance);
  context.globalAlpha = alpha ?? 1;
  context.fillStyle = style.fill;
  context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  // highlight
  context.fillStyle = themeColors.blockHighlight;
  context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
  if (style.glyph) {
    const cx = x * size + size / 2;
    const cy = y * size + size / 2 + 1;
    context.font = `${Math.floor(size * 0.55)}px sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.lineWidth = 2;
    context.strokeStyle = 'rgba(0, 0, 0, 0.6)';
    context.strokeText(style.glyph, cx, cy);
    context.fillStyle = '#fff';
    context.fillText(style.glyph, cx, cy);
  }
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = themeColors.gridLine;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  const shakeOffset = Effects.getShakeOffset();
  ctx.translate(shakeOffset.x, shakeOffset.y);

  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  if (!gameOver) { // la pieza que colisionó no se dibuja sobre la pila
    // ghost
    const gy = ghostY();
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        if (current.shape[r][c])
          drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2, current.powerUp);

    // current piece
    for (let r = 0; r < current.shape.length; r++)
      for (let c = 0; c < current.shape[r].length; c++)
        drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK, undefined, current.powerUp);
  }

  Effects.draw(ctx, BLOCK);
  ctx.restore();
}

function drawNext() {
  const NB = 30;
  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
  const shape = next.shape;
  const single = shape.length === 1 && shape[0].length === 1;
  const offX = single ? 1.5 : Math.floor((4 - shape[0].length) / 2);
  const offY = single ? 1.5 : Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB, undefined, next.powerUp);
  nextLabelEl.textContent = next.powerUp ? next.powerUp.label : '';
}

function readThemeColors() {
  const styles = getComputedStyle(document.documentElement);
  themeColors.gridLine = styles.getPropertyValue('--grid-line').trim();
  themeColors.blockHighlight = styles.getPropertyValue('--block-highlight').trim();
  themeColors.comodin = styles.getPropertyValue('--comodin').trim();
}

function setTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // localStorage puede fallar en navegación privada (p. ej. Safari); el tema no persiste pero el juego sigue funcionando
  }
  themeToggleBtn.setAttribute('aria-pressed', String(theme === 'light'));
  themeToggleBtn.textContent = theme === 'light' ? '☀️' : '🌙';
  themeToggleBtn.setAttribute('aria-label', theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
  readThemeColors();
  if (current) draw();
  if (next) drawNext();
}

function toggleTheme() {
  const isLight = document.documentElement.dataset.theme === 'light';
  setTheme(isLight ? 'dark' : 'light');
}

function setMode(mode, { restart = true } = {}) {
  gameMode = mode === 'classic' ? 'classic' : 'full';
  try {
    localStorage.setItem(MODE_STORAGE_KEY, gameMode);
  } catch {
    // ver comentario de arriba sobre localStorage en navegación privada
  }
  PowerUpSpawner.config.enabled = gameMode === 'full';
  modeClassicBtn.setAttribute('aria-pressed', String(gameMode === 'classic'));
  modeFullBtn.setAttribute('aria-pressed', String(gameMode === 'full'));
  if (restart) init();
}

function moveLeft() {
  if (paused || gameOver) return;
  if (!collide(current.shape, current.x - 1, current.y)) current.x--;
  updateHUD();
}

function moveRight() {
  if (paused || gameOver) return;
  if (!collide(current.shape, current.x + 1, current.y)) current.x++;
  updateHUD();
}

function rotate() {
  if (paused || gameOver) return;
  tryRotate();
  updateHUD();
}

function doSoftDrop() {
  if (paused || gameOver) return;
  softDrop();
  updateHUD();
}

function doHardDrop() {
  if (paused || gameOver) return;
  hardDrop();
  updateHUD();
}

// Refleja los mejores globales persistidos (no los de esta partida) en un
// par de elementos <strong>; se usa tanto en la pantalla de inicio como en
// el overlay de game over.
function renderBests(comboEl, linesEl) {
  comboEl.textContent = Scores.getBestCombo() || '—';
  linesEl.textContent = Scores.getMaxLines() || '—';
}

function renderStartScreen() {
  renderBests(startBestComboEl, startMaxLinesEl);
  startScoresEl.innerHTML = Scores.renderTableHTML(Scores.getScores());
}

function renderGameOverScores(highlightIndex = -1, list = Scores.getScores()) {
  renderBests(overlayBestComboEl, overlayMaxLinesEl);
  overlayScoresEl.innerHTML = Scores.renderTableHTML(list, highlightIndex);
}

function endGame() {
  gameOver = true;
  stopRepeat();
  freezeRemaining = 0;
  // No se cancela el rAF: el bucle sigue vivo para que un efecto en curso
  // (p. ej. la explosión de una Bomba) termine de animarse tras el game over.
  draw(); // frame final inmediato: sin la pieza que colisionó
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;

  Scores.updateMaxLines(lines); // `lines` sólo se resetea en init(), es seguro leerlo aquí
  renderGameOverScores();
  if (Scores.qualifies(score)) {
    saveScoreName.value = '';
    saveScoreRow.classList.remove('hidden');
  } else {
    saveScoreRow.classList.add('hidden');
  }

  overlayExtra.classList.remove('hidden');
  overlay.classList.remove('hidden');
}

saveScoreBtn.addEventListener('click', () => {
  const { list, index } = Scores.addScore({
    name: saveScoreName.value,
    score,
    lines,
    level,
    combo: runBestCombo,
    mode: gameMode,
  });
  renderGameOverScores(index, list);
  saveScoreRow.classList.add('hidden');
});

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    overlay.classList.add('hidden');
    lastTime = performance.now();
    loop(lastTime);
  } else {
    stopRepeat();
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    // La tabla de récords/guardado es sólo para game over; el propio
    // #overlay sigue siendo compartido con la pausa por ahora.
    overlayExtra.classList.add('hidden');
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  const dt = Math.min(ts - lastTime, 100); // acota saltos grandes (pestaña en segundo plano)
  lastTime = ts;

  if (!paused && !gameOver) {
    if (freezeRemaining > 0) {
      freezeRemaining = Math.max(0, freezeRemaining - dt);
      if (freezeRemaining < 1) freezeRemaining = 0; // evita residuos de punto flotante casi-cero
      dropAccum = 0; // evita una caída instantánea al descongelar
    } else {
      dropAccum += dt;
      if (dropAccum >= dropInterval) {
        dropAccum = 0;
        if (!collide(current.shape, current.x, current.y + 1)) {
          current.y++;
        } else {
          lockPiece(); // puede fijar gameOver = true (spawn() -> endGame())
        }
      }
    }
  }

  updateHUD();
  Effects.update(dt);
  draw();

  // En pausa, el bucle se detiene siempre (togglePause() ya cancela el
  // frame pendiente; esto es un cierre defensivo por si este tick sigue
  // corriendo). En game over sí dejamos que un efecto en curso (p. ej. la
  // explosión de una Bomba) termine de animarse antes de parar del todo.
  if (paused) { animId = null; return; }
  if (gameOver && !Effects.active()) { animId = null; return; }
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  combo = 0;
  runBestCombo = 0;
  freezeRemaining = 0;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  PowerUpSpawner.reset();
  Effects.clear();
  next = nextPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

// --- Modal de ayuda ---
let helpCausedPause = false;

function isHelpOpen() {
  return !helpModal.classList.contains('hidden');
}

function openHelp() {
  if (!paused && !gameOver) {
    paused = true;
    stopRepeat();
    cancelAnimationFrame(animId);
    animId = null;
    helpCausedPause = true;
  }
  helpModal.classList.remove('hidden');
}

function closeHelp() {
  helpModal.classList.add('hidden');
  if (helpCausedPause) {
    helpCausedPause = false;
    paused = false;
    lastTime = performance.now();
    loop(lastTime);
  }
}

document.addEventListener('keydown', e => {
  // Además de los botones, exime los campos de texto (p. ej. el nombre al
  // guardar un récord) para que escribir no dispare pausa (KeyP) ni hard
  // drop (Space) mientras el usuario está tecleando.
  if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement || e.target.isContentEditable) return;
  if (isHelpOpen()) {
    if (e.code === 'Escape') closeHelp();
    return;
  }
  if (e.code === 'KeyP') { togglePause(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      moveLeft();
      break;
    case 'ArrowRight':
      moveRight();
      break;
    case 'ArrowDown':
      doSoftDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      rotate();
      break;
    case 'Space':
      e.preventDefault();
      doHardDrop();
      break;
  }
});

restartBtn.addEventListener('click', init);
themeToggleBtn.addEventListener('click', toggleTheme);

helpToggleBtn.addEventListener('click', openHelp);
helpCloseBtn.addEventListener('click', closeHelp);
helpModal.addEventListener('click', e => {
  if (e.target === helpModal) closeHelp(); // clic fuera de la caja de contenido
});

modeClassicBtn.addEventListener('click', () => setMode('classic'));
modeFullBtn.addEventListener('click', () => setMode('full'));

function updateSoundButton() {
  const muted = Sfx.isMuted();
  soundToggleBtn.setAttribute('aria-pressed', String(!muted));
  soundToggleBtn.textContent = muted ? '🔇' : '🔊';
  soundToggleBtn.setAttribute('aria-label', muted ? 'Activar sonido' : 'Silenciar sonido');
}

soundToggleBtn.addEventListener('click', () => {
  Sfx.setMuted(!Sfx.isMuted());
  updateSoundButton();
});
updateSoundButton();

// --- Controles táctiles ---
const REPEAT_DELAY = 250;
const REPEAT_INTERVAL = 100;
let repeatTimeout = null;
let repeatInterval = null;

function stopRepeat() {
  clearTimeout(repeatTimeout);
  clearInterval(repeatInterval);
  repeatTimeout = null;
  repeatInterval = null;
}

function startRepeat(action) {
  stopRepeat();
  action();
  repeatTimeout = setTimeout(() => {
    repeatInterval = setInterval(action, REPEAT_INTERVAL);
  }, REPEAT_DELAY);
}

function bindTouchButton(id, action, { repeat } = {}) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (repeat) startRepeat(action);
    else action();
  });
  if (repeat) {
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(evt =>
      btn.addEventListener(evt, stopRepeat)
    );
  }
}

bindTouchButton('touch-left', moveLeft, { repeat: true });
bindTouchButton('touch-right', moveRight, { repeat: true });
bindTouchButton('touch-down', doSoftDrop, { repeat: true });
bindTouchButton('touch-rotate', rotate);
bindTouchButton('touch-hard-drop', doHardDrop);
bindTouchButton('touch-pause', togglePause);

try {
  setTheme(localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark');
} catch {
  setTheme('dark');
}
try {
  setMode(localStorage.getItem(MODE_STORAGE_KEY) === 'classic' ? 'classic' : 'full', { restart: false });
} catch {
  setMode('full', { restart: false });
}

// --- Pantalla de inicio ---
// El juego ya no arranca solo: init() queda a la espera de "Jugar". Hasta
// entonces gameOver ya está a true (ver declaración de estado más arriba),
// así que moveLeft/rotate/etc. (llamados directamente por los botones
// táctiles, sin pasar por el listener de teclado) se rechazan sin tocar
// `board`/`current`, que todavía no existen.
renderStartScreen();

startPlayBtn.addEventListener('click', () => {
  startScreen.classList.add('hidden');
  init();
});

startResetBtn.addEventListener('click', () => {
  if (!confirm('¿Borrar todos los récords guardados?')) return;
  Scores.resetAll();
  renderStartScreen();
});
