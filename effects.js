'use strict';

// Capa de efectos visuales, independiente del estado del juego.
// update(dt) y draw(context, BLOCK) están separados a propósito: setTheme()
// llama a draw() fuera del bucle de juego y no debe hacer avanzar el tiempo.

class Effect {
  constructor(duration) {
    this.t = 0;
    this.duration = duration;
  }
  // Devuelve true mientras el efecto siga vivo.
  update(dt) {
    this.t += dt;
    return this.t < this.duration;
  }
  get progress() {
    return Math.min(1, this.t / this.duration);
  }
  draw(_context, _BLOCK) {}
}

class ExplosionEffect extends Effect {
  constructor(cx, cy) {
    super(420);
    this.cx = cx; // centro en coordenadas de celda (puede ser fraccional)
    this.cy = cy;
    this.particles = Array.from({ length: 14 }, (_, i) => {
      const angle = (Math.PI * 2 * i) / 14 + Math.random() * 0.3;
      const speed = 1.5 + Math.random() * 2;
      return { angle, speed };
    });
  }
  draw(context, BLOCK) {
    const p = this.progress;
    const px = (this.cx + 0.5) * BLOCK;
    const py = (this.cy + 0.5) * BLOCK;

    // anillo expansivo
    context.save();
    context.globalAlpha = 1 - p;
    context.strokeStyle = '#ffb74d';
    context.lineWidth = 4 * (1 - p) + 1;
    context.beginPath();
    context.arc(px, py, p * BLOCK * 2.4, 0, Math.PI * 2);
    context.stroke();
    context.restore();

    // partículas
    context.save();
    context.globalAlpha = 1 - p;
    context.fillStyle = '#ff7043';
    for (const part of this.particles) {
      const dist = part.speed * p * BLOCK * 2;
      const x = px + Math.cos(part.angle) * dist;
      const y = py + Math.sin(part.angle) * dist;
      context.beginPath();
      context.arc(x, y, Math.max(0, 3 * (1 - p)), 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }
}

class BeamEffect extends Effect {
  constructor(dir, index, cols, rows) {
    super(320);
    this.dir = dir; // 'row' | 'col'
    this.index = index;
    this.cols = cols;
    this.rows = rows;
  }
  draw(context, BLOCK) {
    const p = this.progress;
    context.save();
    context.globalAlpha = 1 - p;
    context.fillStyle = '#4dd0e1';
    if (this.dir === 'row') {
      const y = this.index * BLOCK;
      const h = BLOCK * (1 - p * 0.6);
      context.fillRect(0, y + (BLOCK - h) / 2, this.cols * BLOCK, h);
    } else {
      const x = this.index * BLOCK;
      const w = BLOCK * (1 - p * 0.6);
      context.fillRect(x + (BLOCK - w) / 2, 0, w, this.rows * BLOCK);
    }
    context.restore();
  }
}

class CellFlashEffect extends Effect {
  constructor(cells) {
    super(380);
    this.cells = cells; // [{x, y}]
  }
  draw(context, BLOCK) {
    const p = this.progress;
    context.save();
    context.globalAlpha = 1 - p;
    context.strokeStyle = '#ffd54f';
    context.lineWidth = 2;
    for (const { x, y } of this.cells) {
      const size = BLOCK * (0.5 + p * 0.6);
      const cx = (x + 0.5) * BLOCK;
      const cy = (y + 0.5) * BLOCK;
      context.strokeRect(cx - size / 2, cy - size / 2, size, size);
    }
    context.restore();
  }
}

class FallStreakEffect extends Effect {
  constructor(cells) {
    super(300);
    this.cells = cells; // [{x, y, dist}]
  }
  draw(context, BLOCK) {
    const p = this.progress;
    context.save();
    context.globalAlpha = 1 - p;
    context.strokeStyle = '#81c784';
    context.lineWidth = 3;
    for (const { x, y, dist } of this.cells) {
      const cx = (x + 0.5) * BLOCK;
      const topY = (y - dist) * BLOCK;
      const bottomY = y * BLOCK + BLOCK * 0.3;
      context.beginPath();
      context.moveTo(cx, topY);
      context.lineTo(cx, bottomY);
      context.stroke();
    }
    context.restore();
  }
}

class FreezeOverlayEffect extends Effect {
  constructor(duration, cols, rows) {
    super(duration);
    this.cols = cols;
    this.rows = rows;
  }
  get remainingMs() {
    return Math.max(0, this.duration - this.t);
  }
  draw(context, BLOCK) {
    context.save();
    context.globalAlpha = 0.14;
    context.fillStyle = '#4fc3f7';
    context.fillRect(0, 0, this.cols * BLOCK, this.rows * BLOCK);
    context.restore();

    const seconds = Math.ceil(this.remainingMs / 1000);
    context.save();
    context.globalAlpha = 0.85;
    context.fillStyle = '#e1f5fe';
    context.font = 'bold 22px monospace';
    context.textAlign = 'center';
    context.fillText(`❄ ${seconds}`, (this.cols * BLOCK) / 2, 28);
    context.restore();
  }
}

const Effects = (() => {
  let list = [];
  let shakeMagnitude = 0;
  let shakeT = 0;
  const SHAKE_DURATION = 250;

  function spawn(effect) {
    list.push(effect);
  }

  function removeType(cls) {
    list = list.filter(e => !(e instanceof cls));
  }

  function shake(magnitude = 6) {
    shakeMagnitude = magnitude;
    shakeT = 0;
  }

  function update(dt) {
    list = list.filter(e => e.update(dt));
    if (shakeMagnitude > 0) {
      shakeT += dt;
      if (shakeT >= SHAKE_DURATION) shakeMagnitude = 0;
    }
  }

  function draw(context, BLOCK) {
    for (const e of list) e.draw(context, BLOCK);
  }

  function getShakeOffset() {
    if (shakeMagnitude <= 0) return { x: 0, y: 0 };
    const decay = 1 - shakeT / SHAKE_DURATION;
    const amp = shakeMagnitude * decay;
    return {
      x: (Math.random() * 2 - 1) * amp,
      y: (Math.random() * 2 - 1) * amp,
    };
  }

  function active() {
    return list.length > 0 || shakeMagnitude > 0;
  }

  function clear() {
    list = [];
    shakeMagnitude = 0;
    shakeT = 0;
  }

  return { spawn, removeType, update, draw, shake, getShakeOffset, active, clear };
})();
