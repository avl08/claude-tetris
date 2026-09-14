'use strict';

// Menú de pausa: overlay con Reanudar / Reiniciar / Ver controles y el
// selector de nivel inicial, desacoplado del motor del juego. game.js sólo
// llama a PauseMenu.init(callbacks) una vez al arrancar, a
// PauseMenu.open()/close()/isOpen() desde togglePause()/init(), y a
// PauseMenu.getStartLevel() desde init() — igual que el powerUpContext,
// ningún estado de game.js se toca directamente desde aquí.

const PauseMenu = (() => {
  const START_LEVEL_STORAGE_KEY = 'tetris-start-level';
  const MIN_LEVEL = 1;
  const MAX_LEVEL = 10;

  const menuEl = document.getElementById('pause-menu');
  const resumeBtn = document.getElementById('pause-resume-btn');
  const restartBtn = document.getElementById('pause-restart-btn');
  const controlsBtn = document.getElementById('pause-controls-btn');
  const levelInput = document.getElementById('start-level-input');

  let startLevel = MIN_LEVEL;

  function clamp(v) {
    const n = Math.round(Number(v));
    if (!Number.isFinite(n)) return MIN_LEVEL;
    return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, n));
  }

  function loadStartLevel() {
    try {
      const stored = localStorage.getItem(START_LEVEL_STORAGE_KEY);
      return stored !== null ? clamp(stored) : MIN_LEVEL;
    } catch {
      // localStorage puede fallar en navegación privada; se usa el valor por defecto
      return MIN_LEVEL;
    }
  }

  function persistStartLevel(v) {
    try {
      localStorage.setItem(START_LEVEL_STORAGE_KEY, String(v));
    } catch {
      // ver comentario de arriba: el nivel inicial no persiste pero el juego sigue funcionando
    }
  }

  function setStartLevel(v) {
    startLevel = clamp(v);
    levelInput.value = String(startLevel);
    persistStartLevel(startLevel);
  }

  // Nivel con el que empezará la PRÓXIMA partida (init() lo lee una sola vez
  // al arrancar; cambiar el selector mientras la partida en curso está en
  // pausa no altera su nivel actual).
  function getStartLevel() {
    return startLevel;
  }

  function isOpen() {
    return !menuEl.classList.contains('hidden');
  }

  function open() {
    menuEl.classList.remove('hidden');
    // Mueve el foco al propio contenedor (tiene tabindex="-1"), no a un
    // <button>: game.js ignora TODO el teclado mientras un <button> tiene el
    // foco (`e.target instanceof HTMLButtonElement`), así que enfocar
    // "Reanudar" directamente dejaría KeyP/Escape sin efecto hasta que el
    // usuario haga clic en algo. Enfocar el contenedor sí anuncia el menú a
    // lectores de pantalla y deja Tab listo para entrar en "Reanudar".
    menuEl.focus();
  }

  function close() {
    // Si el foco quedó en un control del menú (p. ej. el selector de nivel
    // tras teclear un valor), lo soltamos para que las flechas/Espacio no
    // sigan interactuando con él una vez reanudado el juego.
    if (menuEl.contains(document.activeElement)) {
      document.activeElement.blur();
    }
    menuEl.classList.add('hidden');
  }

  // callbacks: { onResume, onRestart, onControls }
  function init(callbacks) {
    startLevel = loadStartLevel();
    levelInput.value = String(startLevel);

    resumeBtn.addEventListener('click', () => {
      resumeBtn.blur(); // evita que el listener de teclado quede bloqueado (ver game.js)
      callbacks.onResume();
    });
    restartBtn.addEventListener('click', () => {
      restartBtn.blur();
      callbacks.onRestart();
    });
    controlsBtn.addEventListener('click', () => {
      controlsBtn.blur();
      callbacks.onControls();
    });
    levelInput.addEventListener('change', () => {
      setStartLevel(levelInput.value);
      levelInput.blur();
    });
  }

  return { init, open, close, isOpen, getStartLevel };
})();
