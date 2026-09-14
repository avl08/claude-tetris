'use strict';

// Sistema de skins visuales, desacoplado del motor del juego (mismo patrón
// que powerups.js/effects.js: game.js sólo llama a Skins.setActive/getActive/
// colorFor/paint, nunca toca los literales de color o el pintado de cada
// skin directamente).
//
// Cada skin es un eje ORTOGONAL al tema claro/oscuro (`data-theme` /
// `tetris-theme` / setTheme() en game.js): este módulo no lee ni escribe
// nada relacionado con ese sistema.
//
// Cada entrada de la tabla aporta:
//   - colors: paleta de 9 posiciones (índice 0 sin usar) para las piezas 1-8,
//     con el mismo formato que el COLORS original de game.js.
//   - paint(ctx, x, y, size, fill, highlight): estrategia de pintado del
//     cuerpo del bloque (sin el glifo, que sigue siendo genérico y lo pinta
//     drawBlock() en game.js).
//   - effects: paleta de colores para effects.js (Effects.setPalette()).

const RETRO_COLORS = [
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

const NEON_COLORS = [
  null,
  '#00e5ff',
  '#ffea00',
  '#e040fb',
  '#00e676',
  '#ff1744',
  '#2979ff',
  '#ff9100',
  '#e0e0e0',
];

const PASTEL_COLORS = [
  null,
  '#a7e8ec',
  '#fff3b0',
  '#d9b8e0',
  '#bfe3bd',
  '#f3b6b6',
  '#b8d4f0',
  '#f7d3ab',
  '#d6dbe0',
];

const PIXEL_COLORS = [
  null,
  '#26c6da',
  '#fbc02d',
  '#8e24aa',
  '#43a047',
  '#d32f2f',
  '#1e88e5',
  '#f57c00',
  '#78909c',
];

// --- Estrategias de pintado -------------------------------------------

// Retro: el pintado plano original (relleno + franja de brillo superior).
function paintFlat(ctx, x, y, size, fill, highlight) {
  ctx.fillStyle = fill;
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
  ctx.fillStyle = highlight;
  ctx.fillRect(x * size + 1, y * size + 1, size - 2, 4);
}

// Neón: mismo relleno, con glow vía shadowBlur/shadowColor. save()/restore()
// garantiza que shadowBlur nunca se filtre a la cuadrícula ni a dibujos
// posteriores (p. ej. si se llamara sin restore, el resto del frame quedaría
// "brillando").
function paintNeon(ctx, x, y, size, fill, highlight) {
  const px = x * size + 1, py = y * size + 1, s = size - 2;
  ctx.save();
  ctx.shadowColor = fill;
  ctx.shadowBlur = size * 0.55;
  ctx.fillStyle = fill;
  ctx.fillRect(px, py, s, s);
  // segunda pasada sin sombra para un núcleo nítido bajo el glow
  ctx.shadowBlur = 0;
  ctx.fillStyle = highlight;
  ctx.fillRect(px, py, s, 4);
  ctx.restore();
}

function roundRectPath(ctx, x, y, w, h, r) {
  if (typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    return;
  }
  // Fallback manual (arcos) para navegadores sin CanvasRenderingContext2D.roundRect
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Pastel: esquinas redondeadas simuladas (roundRect si existe, si no arcos
// manuales) con un ligero inset para reforzar la sensación de borde suave.
function paintPastel(ctx, x, y, size, fill, highlight) {
  const inset = 1.5;
  const px = x * size + inset, py = y * size + inset, s = size - inset * 2;
  ctx.save();
  roundRectPath(ctx, px, py, s, s, s * 0.28);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.save();
  ctx.clip(); // recorta al mismo camino redondeado para que el brillo no sobresalga de la esquina
  ctx.fillStyle = highlight;
  ctx.fillRect(px, py, s, size * 0.15);
  ctx.restore();
  ctx.restore();
}

// Pixel art: relleno plano + una pequeña rejilla 3x3 a cuadros y un
// contorno marcado, para simular textura sin coste por frame relevante
// (un puñado de fillRect/strokeRect extra por bloque).
function paintPixel(ctx, x, y, size, fill, highlight) {
  const px = x * size + 1, py = y * size + 1, s = size - 2;
  ctx.save();
  ctx.fillStyle = fill;
  ctx.fillRect(px, py, s, s);
  ctx.fillStyle = highlight;
  ctx.fillRect(px, py, s, 4);

  const cell = s / 3;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.16)';
  for (let gy = 0; gy < 3; gy++) {
    for (let gx = 0; gx < 3; gx++) {
      if ((gx + gy) % 2 === 0) {
        ctx.fillRect(px + gx * cell, py + gy * cell, cell, cell);
      }
    }
  }
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 0.5, py + 0.5, s - 1, s - 1);
  ctx.restore();
}

// --- Tabla de skins ------------------------------------------------------

const SKIN_TABLE = {
  retro: {
    id: 'retro',
    label: 'Retro',
    colors: RETRO_COLORS,
    paint: paintFlat,
    effects: {
      ring: '#ffb74d',
      particle: '#ff7043',
      beam: '#4dd0e1',
      flash: '#ffd54f',
      streak: '#81c784',
      freezeTint: '#4fc3f7',
      freezeText: '#e1f5fe',
    },
  },
  neon: {
    id: 'neon',
    label: 'Neón',
    colors: NEON_COLORS,
    paint: paintNeon,
    effects: {
      ring: '#ffea00',
      particle: '#ff1744',
      beam: '#00e5ff',
      flash: '#e040fb',
      streak: '#00e676',
      freezeTint: '#00e5ff',
      freezeText: '#e0fbff',
    },
  },
  pastel: {
    id: 'pastel',
    label: 'Pastel',
    colors: PASTEL_COLORS,
    paint: paintPastel,
    effects: {
      ring: '#f7d3ab',
      particle: '#f3b6b6',
      beam: '#a7e8ec',
      flash: '#fff3b0',
      streak: '#bfe3bd',
      freezeTint: '#b8d4f0',
      freezeText: '#fdfaf5',
    },
  },
  pixel: {
    id: 'pixel',
    label: 'Pixel',
    colors: PIXEL_COLORS,
    paint: paintPixel,
    effects: {
      ring: '#f57c00',
      particle: '#d32f2f',
      beam: '#26c6da',
      flash: '#fbc02d',
      streak: '#43a047',
      freezeTint: '#1e88e5',
      freezeText: '#eceff1',
    },
  },
};

const Skins = (() => {
  const ORDER = ['retro', 'neon', 'pastel', 'pixel'];
  let activeId = 'retro';

  function normalize(id) {
    // hasOwnProperty evita que un id "envenenado" (p. ej. 'constructor',
    // 'toString', heredado de Object.prototype) cuele como si fuera una
    // skin válida y luego reviente al pintar (SKIN_TABLE[id].paint no
    // sería una función).
    return Object.prototype.hasOwnProperty.call(SKIN_TABLE, id) ? id : 'retro';
  }

  function setActive(id) {
    activeId = normalize(id);
    return SKIN_TABLE[activeId];
  }

  function getActive() {
    return SKIN_TABLE[activeId];
  }

  function get(id) {
    return SKIN_TABLE[normalize(id)];
  }

  // Color de pieza (índice 1-8) según la skin activa.
  function colorFor(index) {
    return SKIN_TABLE[activeId].colors[index];
  }

  // Pinta el cuerpo de un bloque (sin glifo) con la estrategia de la skin activa.
  function paint(ctx, x, y, size, fill, highlight) {
    SKIN_TABLE[activeId].paint(ctx, x, y, size, fill, highlight);
  }

  return { ORDER, setActive, getActive, get, colorFor, paint };
})();
