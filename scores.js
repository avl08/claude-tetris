'use strict';

// Tabla de récords locales. Único módulo del proyecto que guarda un valor
// estructurado (JSON) en localStorage — todo lo demás (tema, sonido, modo)
// guarda una cadena simple — así que aquí sí hace falta validar a fondo lo
// que se lee: puede faltar, estar corrupto, o no ser ni siquiera un array.
// Desacoplado de game.js igual que audio.js/effects.js/powerups.js: expone
// un objeto `Scores` con funciones puras de almacenamiento + un pequeño
// helper de render a HTML para no duplicar el marcado de la tabla entre la
// pantalla de inicio y el overlay de game over.

const Scores = (() => {
  const SCORES_KEY = 'tetris-highscores';
  const BEST_COMBO_KEY = 'tetris-best-combo';
  const MAX_LINES_KEY = 'tetris-max-lines';
  const MAX_ENTRIES = 5;
  const MAX_NAME_LENGTH = 16;

  const MODE_LABELS = { classic: 'CLÁSICO', full: 'COMPLETO' };

  function isValidEntry(e) {
    return e && typeof e === 'object' &&
      typeof e.name === 'string' &&
      Number.isFinite(e.score) &&
      Number.isFinite(e.lines) &&
      Number.isFinite(e.level) &&
      Number.isFinite(e.combo) &&
      typeof e.mode === 'string' &&
      typeof e.date === 'string';
  }

  function loadScores() {
    try {
      const raw = localStorage.getItem(SCORES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(isValidEntry).slice(0, MAX_ENTRIES);
    } catch {
      return []; // JSON corrupto o localStorage no disponible (navegación privada)
    }
  }

  function saveScores(list) {
    try {
      localStorage.setItem(SCORES_KEY, JSON.stringify(list));
    } catch {
      // localStorage puede fallar en navegación privada; el récord no persiste
    }
  }

  function readInt(key) {
    try {
      const raw = localStorage.getItem(key);
      const n = raw === null ? 0 : parseInt(raw, 10);
      return Number.isFinite(n) && n > 0 ? n : 0;
    } catch {
      return 0;
    }
  }

  function writeInt(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch {
      // ver comentario de arriba
    }
  }

  // Devuelve el top 5 actual, ordenado de mayor a menor puntuación.
  function getScores() {
    return loadScores().sort((a, b) => b.score - a.score);
  }

  function getBestCombo() {
    return readInt(BEST_COMBO_KEY);
  }

  function getMaxLines() {
    return readInt(MAX_LINES_KEY);
  }

  // Actualiza el máximo global persistido si el valor dado lo supera.
  // Devuelve el máximo resultante (nuevo o el que ya había).
  function updateBestCombo(combo) {
    const best = getBestCombo();
    if (combo > best) {
      writeInt(BEST_COMBO_KEY, combo);
      return combo;
    }
    return best;
  }

  function updateMaxLines(lines) {
    const best = getMaxLines();
    if (lines > best) {
      writeInt(MAX_LINES_KEY, lines);
      return lines;
    }
    return best;
  }

  // ¿Entraría esta puntuación en el top 5 actual?
  function qualifies(score) {
    const list = getScores();
    if (list.length < MAX_ENTRIES) return true;
    return score > list[list.length - 1].score;
  }

  function sanitizeName(name) {
    const trimmed = String(name || '').trim().slice(0, MAX_NAME_LENGTH);
    return trimmed || 'Jugador';
  }

  // Inserta una nueva puntuación, reordena y trunca a 5. Devuelve la lista
  // resultante junto con el índice de la nueva entrada (-1 si quedó fuera
  // del top 5, p. ej. si otra pestaña guardó récords mejores mientras tanto).
  function addScore({ name, score, lines, level, combo, mode }) {
    const entry = {
      name: sanitizeName(name),
      score: Number.isFinite(score) ? score : 0,
      lines: Number.isFinite(lines) ? lines : 0,
      level: Number.isFinite(level) ? level : 1,
      combo: Number.isFinite(combo) ? combo : 0,
      mode: mode === 'classic' ? 'classic' : 'full',
      date: new Date().toISOString(),
    };
    const list = loadScores();
    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    const truncated = list.slice(0, MAX_ENTRIES);
    saveScores(truncated);
    return { list: truncated, index: truncated.indexOf(entry) };
  }

  function resetAll() {
    try {
      localStorage.removeItem(SCORES_KEY);
      localStorage.removeItem(BEST_COMBO_KEY);
      localStorage.removeItem(MAX_LINES_KEY);
    } catch {
      // ver comentario de arriba
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString();
    } catch {
      return '';
    }
  }

  // Genera el marcado de la tabla top-5. `highlightIndex` (opcional) marca
  // visualmente una fila recién insertada (score-row--new).
  function renderTableHTML(list, highlightIndex = -1) {
    if (!list.length) {
      return '<p class="score-empty">Sin puntuaciones todavía.</p>';
    }
    const rows = list.map((e, i) => {
      const cls = i === highlightIndex ? 'score-row score-row--new' : 'score-row';
      const modeLabel = MODE_LABELS[e.mode] || '';
      return `<li class="${cls}">` +
        `<span class="score-rank">${i + 1}</span>` +
        `<span class="score-name">${escapeHtml(e.name)}</span>` +
        `<span class="score-points">${e.score.toLocaleString()}</span>` +
        `<span class="score-meta">Nv.${e.level} · ${e.lines} líneas · combo x${e.combo} · ${modeLabel} · ${formatDate(e.date)}</span>` +
        `</li>`;
    }).join('');
    return `<ol class="score-table">${rows}</ol>`;
  }

  return {
    MAX_ENTRIES,
    getScores,
    getBestCombo,
    getMaxLines,
    updateBestCombo,
    updateMaxLines,
    qualifies,
    addScore,
    resetAll,
    renderTableHTML,
  };
})();
