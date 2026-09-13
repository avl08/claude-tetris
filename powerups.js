'use strict';

// Sistema de power-ups, desacoplado del motor del juego.
// game.js sólo construye un "contexto" (powerUpContext) con primitivas
// acotadas (leer/escribir celdas, limpiar líneas, sumar puntuación, etc.)
// y llama a instance.activate(x, y); ninguna clase de aquí toca los
// globales del juego directamente.

class PowerUp {
  static id = '';
  static label = '';
  static color = '#ffffff';
  static glyph = '?';
  static weight = 1;
  static description = '';
  static code = 0; // asignado por PowerUpRegistry.register()

  constructor(ctx) {
    this.ctx = ctx;
  }
  get code() { return this.constructor.code; }
  get consumesSelf() { return true; }
  get color() { return this.constructor.color; }
  get glyph() { return this.constructor.glyph; }
  get label() { return this.constructor.label; }
  // Devuelve el nº de líneas que la activación contó como "limpiadas"
  // (para el combo). 0 si sólo destruye bloques sin ser una línea real.
  activate(_x, _y) { throw new Error('activate() no implementado'); }
}

const PowerUpRegistry = (() => {
  const entries = [];

  function register(cls) {
    const code = 100 + entries.length;
    cls.code = code;
    entries.push({ code, id: cls.id, cls });
    return code;
  }

  function byCode(code) {
    return entries[code - 100];
  }

  function byId(id) {
    return entries.find(e => e.id === id);
  }

  function all() {
    return entries;
  }

  return { register, byCode, byId, all };
})();

// --- Bomba ---------------------------------------------------------------

class Bomb extends PowerUp {
  static id = 'bomb';
  static label = 'BOMBA';
  static color = '#ff7043';
  static glyph = '✷';
  static weight = 3;
  static description = 'Destruye un área 3×3 al colocarse.';

  activate(x, y) {
    const { ctx } = this;
    let destroyed = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (!ctx.isInside(nx, ny)) continue;
        if (ctx.getCell(nx, ny)) {
          ctx.clearCell(nx, ny);
          destroyed++;
        }
      }
    }
    ctx.effects.spawn(new ExplosionEffect(x, y));
    ctx.effects.shake(7);
    ctx.sfx.play('explosion');
    ctx.applyGravity();
    ctx.addScore(10 * destroyed * ctx.getLevel());
    return 0;
  }
}

// --- Rayo (fila / columna, decidido al generarse la pieza) ---------------

class LightningRow extends PowerUp {
  static id = 'lightningRow';
  static label = 'RAYO';
  static color = '#4dd0e1';
  static glyph = '↔';
  static weight = 2;
  static description = 'Limpia toda la fila donde aterrice.';

  activate(x, y) {
    const { ctx } = this;
    ctx.effects.spawn(new BeamEffect('row', y, ctx.COLS, ctx.ROWS));
    ctx.sfx.play('zap');
    return ctx.clearRow(y); // cuenta como línea real: puntuación + combo
  }
}

class LightningCol extends PowerUp {
  static id = 'lightningCol';
  static label = 'RAYO';
  static color = '#4dd0e1';
  static glyph = '↕';
  static weight = 2;
  static description = 'Limpia toda la columna donde aterrice.';

  activate(x, y) {
    const { ctx } = this;
    const destroyed = ctx.clearColumn(x);
    ctx.effects.spawn(new BeamEffect('col', x, ctx.COLS, ctx.ROWS));
    ctx.sfx.play('zap');
    ctx.applyGravity();
    ctx.addScore(10 * destroyed * ctx.getLevel());
    return 0;
  }
}

// --- Tinte -----------------------------------------------------------------

class Dye extends PowerUp {
  static id = 'dye';
  static label = 'TINTE';
  static glyph = '◆';
  static weight = 2;
  static description = 'Convierte un color en comodines (✦).';

  constructor(ctx) {
    super(ctx);
    this.targetColor = Dye.pickColor(ctx);
  }

  static pickColor(ctx) {
    const present = new Set();
    ctx.forEachCell((_x, _y, v) => {
      if (v >= 1 && v <= 8) present.add(v);
    });
    const options = present.size ? [...present] : [1, 2, 3, 4, 5, 6, 7, 8];
    return options[Math.floor(Math.random() * options.length)];
  }

  get color() { return this.ctx.colorHex(this.targetColor); }

  activate(_x, _y) {
    const { ctx } = this;
    const cells = [];
    ctx.forEachCell((x, y, v) => {
      if (v === this.targetColor) {
        ctx.setCell(x, y, 9);
        cells.push({ x, y });
      }
    });
    ctx.effects.spawn(new CellFlashEffect(cells));
    ctx.sfx.play('dye');
    ctx.addScore(25 * cells.length);
    return 0;
  }
}

// --- Gravedad ----------------------------------------------------------

class GravityPowerUp extends PowerUp {
  static id = 'gravity';
  static label = 'GRAVEDAD';
  static color = '#81c784';
  static glyph = '⇩';
  static weight = 2;
  static description = 'Compacta todos los huecos del tablero.';

  activate(_x, _y) {
    const { ctx } = this;
    const { count, streaks } = ctx.applyGravity();
    ctx.effects.spawn(new FallStreakEffect(streaks));
    ctx.sfx.play('gravity');
    ctx.addScore(5 * count);
    return 0;
  }
}

// --- Congelar ------------------------------------------------------------

class Freeze extends PowerUp {
  static id = 'freeze';
  static label = 'CONGELAR';
  static color = '#4fc3f7';
  static glyph = '❄';
  static weight = 2;
  static description = 'Detiene la caída automática 5 s.';

  activate(_x, _y) {
    const { ctx } = this;
    ctx.freeze(5000);
    ctx.sfx.play('freeze');
    ctx.addScore(50 * ctx.getLevel());
    return 0;
  }
}

// El orden de registro fija el código (100+n). Para añadir un power-up
// nuevo: crear su clase y registrarla SIEMPRE al final de esta lista.
PowerUpRegistry.register(Bomb);
PowerUpRegistry.register(LightningRow);
PowerUpRegistry.register(LightningCol);
PowerUpRegistry.register(Dye);
PowerUpRegistry.register(GravityPowerUp);
PowerUpRegistry.register(Freeze);

const PowerUps = {
  styleFor(code) {
    const entry = PowerUpRegistry.byCode(100 + code);
    if (!entry) return { fill: '#ffffff', glyph: '?' };
    return { fill: entry.cls.color, glyph: entry.cls.glyph };
  },
};

// --- Spawner (frecuencia configurable) ------------------------------------

const PowerUpSpawner = (() => {
  const config = {
    enabled: true,
    minGap: 8,      // piezas mínimas entre dos power-ups
    chance: 0.15,   // probabilidad por pieza, una vez pasado minGap
    maxGap: 25,     // garantiza uno como muy tarde
    linesWeight: 1, // cada línea limpiada cuenta como pieza(s) extra
    weights: {
      bomb: 3, lightningRow: 2, lightningCol: 2, dye: 2, gravity: 2, freeze: 2,
    },
  };

  let sinceLast = 0;
  let forcedNext = null;

  function onPiecePlaced() {
    sinceLast++;
  }

  function onLinesCleared(n) {
    if (n > 0) sinceLast += n * config.linesWeight;
  }

  function reset() {
    sinceLast = 0;
    forcedNext = null;
  }

  function weightOf(entry) {
    return config.weights[entry.id] ?? entry.cls.weight ?? 1;
  }

  function pickWeighted() {
    const entries = PowerUpRegistry.all();
    const total = entries.reduce((sum, e) => sum + weightOf(e), 0);
    let roll = Math.random() * total;
    for (const entry of entries) {
      roll -= weightOf(entry);
      if (roll <= 0) return entry;
    }
    return entries[entries.length - 1];
  }

  function takePowerUp(ctx) {
    if (!config.enabled) return null;

    if (forcedNext) {
      const entry = PowerUpRegistry.byId(forcedNext);
      forcedNext = null;
      sinceLast = 0;
      return entry ? new entry.cls(ctx) : null;
    }

    if (sinceLast < config.minGap) return null;
    const shouldSpawn = sinceLast >= config.maxGap || Math.random() < config.chance;
    if (!shouldSpawn) return null;

    sinceLast = 0;
    const entry = pickWeighted();
    return entry ? new entry.cls(ctx) : null;
  }

  function forceNext(id) {
    forcedNext = id;
  }

  return { config, onPiecePlaced, onLinesCleared, reset, takePowerUp, forceNext };
})();

// Ayuda de desarrollo: fuerza el siguiente power-up desde la consola,
// p. ej. __spawnPowerUp('bomb'). Ids válidos: bomb, lightningRow,
// lightningCol, dye, gravity, freeze.
window.__spawnPowerUp = id => PowerUpSpawner.forceNext(id);
