# Tetris

Implementación del clásico **Tetris** en JavaScript vanilla, usando HTML5 Canvas y CSS. Sin dependencias externas, sin frameworks, sin proceso de build: solo abrir y jugar.

![Tech](https://img.shields.io/badge/HTML5-Canvas-orange)
![Tech](https://img.shields.io/badge/CSS3-blueviolet)
![Tech](https://img.shields.io/badge/JavaScript-Vanilla-yellow)

---

## Tabla de contenidos

- [Tetris](#tetris)
  - [Tabla de contenidos](#tabla-de-contenidos)
  - [Qué hace el proyecto](#qué-hace-el-proyecto)
  - [Cómo ejecutar el juego](#cómo-ejecutar-el-juego)
    - [Opción 1: abrir el archivo directamente](#opción-1-abrir-el-archivo-directamente)
    - [Opción 2: servidor local (recomendado)](#opción-2-servidor-local-recomendado)
  - [Controles](#controles)
  - [Power-ups](#power-ups)
  - [Tabla de récords](#tabla-de-récords)
  - [Cómo funciona](#cómo-funciona)
    - [1. `index.html`](#1-indexhtml)
    - [2. `style.css`](#2-stylecss)
    - [3. `game.js` y el sistema de power-ups](#3-gamejs-y-el-sistema-de-power-ups)
    - [Skins visuales (`skins.js`)](#skins-visuales-skinsjs)
    - [Flujo del juego](#flujo-del-juego)
  - [Tecnologías](#tecnologías)
  - [Estructura del proyecto](#estructura-del-proyecto)
  - [Personalización](#personalización)
  - [Licencia](#licencia)

---

## Qué hace el proyecto

Es una versión jugable del Tetris clásico con todas las mecánicas que esperarías:

- Tablero de **10 × 20** celdas.
- Las **7 piezas estándar** (I, O, T, S, Z, J, L), más una 8ª pieza reto: la **tuerca**, un anillo 3×3 con hueco central.
- **Rotación** con _wall kicks_ básicos (pequeños desplazamientos para que la pieza pueda rotar pegada a la pared).
- **Soft drop** (bajada acelerada) y **hard drop** (caída instantánea).
- **Pieza fantasma** (_ghost piece_): muestra dónde aterrizará la pieza actual.
- **Vista previa** de la siguiente pieza.
- **Sistema de puntuación** clásico de Tetris (100 / 300 / 500 / 800 multiplicado por nivel), más **combo** por limpiezas de línea consecutivas.
- **Niveles** que aumentan cada 10 líneas y aceleran la caída.
- **Power-ups aleatorios**: de vez en cuando, en vez de una pieza normal, cae una pieza especial de 1×1 que se activa al colocarse. Ver la sección dedicada más abajo.
- **Modo Clásico / Completo**: un selector bajo el título permite jugar el Tetris de siempre (sin power-ups) o la versión completa con power-ups. Cambiar de modo reinicia la partida.
- **Modal de ayuda** (botón `❓`): explica controles, puntuación, combos, los dos modos de juego y cada power-up. Pausa la partida mientras está abierto.
- **Menú de pausa** (`P` o `Escape`): overlay con **Reanudar**, **Reiniciar** (nueva partida sin recargar la página), **Ver controles** (abre el modal de ayuda sin perder la pausa) y un selector de **nivel inicial** (1–10, se recuerda entre partidas) para la próxima partida. Mientras está abierto, el teclado no mueve piezas.
- **Pausa** y **Game Over** con opción de reinicio.
- **Sonido** (efectos sintetizados, sin ficheros de audio) con botón de silenciar, y **tema claro/oscuro**.
- **Tabla de récords local**: pantalla de inicio con el top 5 de puntuaciones, mejor combo y máximo de líneas conseguidas, guardado en `localStorage`. Al terminar la partida, si la puntuación entra en el top 5 se puede guardar con nombre; la fila nueva se resalta. Incluye botón para borrar todos los récords. Ver la sección dedicada más abajo.
- **Skins visuales**: un selector bajo el de modo permite elegir entre **Retro** (el estilo plano de siempre), **Neón** (fondo negro con glow), **Pastel** (colores suaves, esquinas redondeadas) y **Pixel art** (textura a cuadros sobre cada bloque). Es un eje independiente del tema claro/oscuro — activar cualquier skin nunca rompe el tema, aunque algunas skins (p. ej. Neón) imponen su propio fondo oscuro por encima del tema elegido, ya que cada una define una "apariencia completa" — y la elección se guarda en `localStorage`.

---

## Cómo ejecutar el juego

No hay nada que instalar ni compilar. Tienes dos opciones:

### Opción 1: abrir el archivo directamente

```bash
open index.html        # macOS
xdg-open index.html    # Linux
start index.html       # Windows
```

### Opción 2: servidor local (recomendado)

Cualquier servidor estático funciona. Algunos ejemplos:

```bash
# Con Python 3
python3 -m http.server 8000

# Con Node.js (npx)
npx serve .

# Con PHP
php -S localhost:8000
```

Después abre `http://localhost:8000` en el navegador.

---

## Controles

| Tecla     | Acción                            |
| --------- | --------------------------------- |
| `←` / `→` | Mover la pieza horizontalmente    |
| `↑` o `X` | Rotar la pieza en sentido horario |
| `↓`       | Soft drop (bajar más rápido)      |
| `Espacio` | Hard drop (caída instantánea)     |
| `P` / `Esc` | Pausar / reanudar (abre el menú de pausa) |

En móvil (Safari, Chrome, Firefox) se muestra automáticamente un panel de botones táctiles equivalente: ◀ / ▶ para mover, ⟳ para rotar, ▽ para soft drop, ⤓ para hard drop y ❚❚ para pausa. Mantener pulsado ◀, ▶ o ▽ repite la acción.

---

## Power-ups

De vez en cuando, en lugar de una pieza normal, cae una **pieza especial de 1×1**. El panel lateral anuncia con antelación cuál es (nombre bajo el preview `NEXT`, y `↔`/`↕` para el Rayo). Se activa automáticamente al fijarse en el tablero:

| Power-up | Glifo | Efecto |
| --- | --- | --- |
| **Bomba** | ✷ | Destruye el área de 3×3 a su alrededor, aplica gravedad y suma puntos por cada bloque destruido. Explosión visual + sonido. |
| **Rayo** | ↔ / ↕ | Limpia toda la fila o la columna donde aterriza (la dirección se decide al generarse la pieza, y se ve en el preview). La fila cuenta como línea real (combo incluido); la columna sólo destruye. |
| **Tinte** | ◆ | Convierte todos los bloques de un color en **comodines** (✦): cada comodín de una fila cubre un hueco, así que una fila con huecos cubiertos por comodines también se limpia. |
| **Gravedad** | ⇩ | Compacta todos los huecos del tablero hacia abajo, columna por columna, sin alterar el orden relativo de los bloques. |
| **Congelar** | ❄ | Detiene la caída automática 5 segundos (los controles manuales siguen funcionando) con una cuenta atrás visible en el tablero y en el panel. |

La frecuencia con la que aparecen es configurable (`POWERUP_CONFIG` en `powerups.js`: probabilidad por pieza, piezas mínimas/máximas entre dos power-ups) y está pensada para ser notoria sin ser excesiva. Desde la consola del navegador, `window.__spawnPowerUp('bomb' | 'lightningRow' | 'lightningCol' | 'dye' | 'gravity' | 'freeze')` fuerza que el próximo power-up sea uno concreto — útil para probarlos sin esperar a que salgan al azar.

---

## Tabla de récords

El juego ya no arranca directamente: al cargar la página se muestra una **pantalla de inicio** con el top 5 de puntuaciones, el mejor combo y el máximo de líneas conseguidas hasta ahora, y un botón **Jugar** que arranca la partida.

- Se guardan las **5 mejores puntuaciones**, cada una con nombre del jugador, puntuación, líneas, nivel, combo máximo de esa partida y modo (Clásico/Completo).
- Al terminar la partida (**Game Over**), si la puntuación obtenida entra en el top 5 aparece un campo de texto para introducir el nombre (por defecto "Jugador") y un botón **Guardar**; la tabla se reordena y la fila nueva se resalta.
- El **mejor combo** y el **máximo de líneas** se guardan aparte como récords globales (no sólo los de la puntuación ganadora) y se muestran tanto en la pantalla de inicio como en el overlay de Game Over.
- El botón **Borrar récords** (en la pantalla de inicio) borra todo lo anterior tras confirmar, y refresca la tabla al momento.

Todo se guarda en `localStorage` (clave `tetris-highscores` para el top 5, `tetris-best-combo` y `tetris-max-lines` para los récords globales) — persiste entre sesiones en el mismo navegador, pero es local a cada dispositivo/navegador, no hay servidor ni cuenta de usuario.

---

## Cómo funciona

El juego se compone de `index.html`, `style.css` y siete scripts que se cargan en este orden: `audio.js`, `effects.js`, `powerups.js`, `scores.js`, `skins.js`, `pausemenu.js`, `game.js`.

### 1. `index.html`

Define la estructura visual:

- Un `<canvas id="board">` de **300 × 600** píxeles donde se renderiza el tablero.
- Un panel lateral con `SCORE`, `LINES`, `LEVEL`, vista de la siguiente pieza y la lista de controles.
- Un overlay de **pantalla de inicio** (`#start-screen`, visible desde el arranque) con la tabla de récords y el botón **Jugar**.
- Un overlay para **GAME OVER**, con la tabla de récords y el formulario para guardar la puntuación.
- Un **menú de pausa** independiente (`#pause-menu`) con reanudar, reiniciar, ver controles y el selector de nivel inicial.

### 2. `style.css`

Aporta el aspecto visual con estética _dark / retro arcade_: fondo oscuro, tipografía monoespaciada para los marcadores y _backdrop blur_ en los overlays.

### 3. `game.js` y el sistema de power-ups

`game.js` contiene la lógica central del juego. A grandes rasgos:

- **Modelo del tablero**: una matriz `ROWS × COLS` donde cada celda guarda `0` (vacía), un índice de color `1–8` (pieza normal), `9` (comodín, creado por el Tinte) o `100 + n` (celda de un power-up, transitoria — sólo existe entre que la pieza se fija y se activa).
- **Piezas**: definidas como matrices cuadradas. Para rotar se calcula la transposición + reverso de filas (`rotateCW`), operación que es un no-op tanto para la tuerca simétrica como para las piezas de power-up (1×1).
- **Detección de colisiones** (`collide`): comprueba que ninguna celda de la pieza salga del tablero ni se solape con bloques ya fijados.
- **Wall kicks** (`tryRotate`): si la rotación choca, intenta desplazar la pieza ±1 y ±2 columnas antes de descartar el giro.
- **Game loop** (`loop`): basado en `requestAnimationFrame` (con el `dt` acotado a 100 ms), acumula el tiempo transcurrido y baja la pieza una fila cuando se supera `dropInterval` — salvo mientras un Congelar esté activo, que mantiene `dropAccum` a 0. Los efectos visuales se actualizan y dibujan siempre, incluso en pausa o game over, para que una animación en curso (p. ej. una explosión) pueda terminar.
- **Limpieza de líneas** (`clearLines` / `isRowClearable`): una fila se limpia si el número de huecos es menor o igual que el número de comodines que contiene (el caso clásico, sin comodines, exige cero huecos).
- **Puntuación**: usa la tabla clásica `[0, 100, 300, 500, 800]` multiplicada por el nivel actual, con un bonus si la limpieza incluye comodines; el hard drop suma 2 puntos por celda recorrida y el soft drop 1 punto por fila. Los locks consecutivos que limpian líneas acumulan un **combo** que también suma puntos.
- **Nivel y velocidad**: el nivel sube cada 10 líneas; la velocidad de caída se calcula como `max(100, 1000 − (level − 1) × 90)` milisegundos.
- **Ghost piece** (`ghostY`): proyecta la posición final de la pieza actual hacia abajo y la dibuja con `globalAlpha = 0.2`.

El sistema de power-ups vive en tres scripts separados, desacoplados de `game.js`:

- **`powerups.js`**: la clase base `PowerUp`, sus cinco subclases (`Bomb`, `LightningRow`, `LightningCol`, `Dye`, `GravityPowerUp`, `Freeze`) y `PowerUpRegistry`/`PowerUpSpawner`. Ninguna clase toca los globales de `game.js`: reciben un `powerUpContext` con primitivas acotadas (leer/escribir celdas, limpiar una fila/columna, aplicar gravedad, sumar puntuación, congelar...). Añadir un power-up nuevo es escribir la clase y registrarla al final de la lista en este archivo.
- **`effects.js`**: capa de efectos visuales (explosión, haz del rayo, destello del tinte, estelas de gravedad, overlay del congelado), con `update(dt)` y `draw()` separados para no acoplarse al bucle del juego. Sus colores se leen de una paleta interna sustituible con `Effects.setPalette(...)`, que `setSkin()` llama cada vez que cambia la skin.
- **`audio.js`**: efectos de sonido sintetizados con WebAudio (sin ficheros de audio), con silencio persistido en `localStorage`.
- **`skins.js`**: sistema de skins visuales (ver más abajo), igual de desacoplado — expone `Skins.setActive/getActive/colorFor/paint`, y `game.js` sólo consulta esa API.

### Skins visuales (`skins.js`)

Eje **independiente** del tema claro/oscuro (`data-theme` / `tetris-theme` / `setTheme()`): las skins se controlan con el atributo `data-skin` en `<html>` y se persisten bajo la clave `tetris-skin`, así que ambos ejes se combinan sin conflicto (p. ej. Neón + modo claro).

Cada skin define, en una tabla dentro de `skins.js`:

- Una **paleta de colores** de pieza (posiciones 1-8, mismo formato que el `COLORS` original de `game.js`).
- Una **estrategia de pintado** de bloque (`paint(ctx, x, y, size, fill, highlight)`), que sustituye únicamente el relleno del bloque — el glifo (comodín, power-up) lo sigue dibujando `drawBlock()` en `game.js` de forma genérica.
- Una **paleta de colores para `effects.js`**, aplicada con `Effects.setPalette(...)`.

Las cuatro skins:

| Skin | Aspecto |
| --- | --- |
| **Retro** | El estilo plano original: relleno sólido + franja de brillo superior. |
| **Neón** | Fondo casi negro y bloques con `shadowBlur`/`shadowColor` (glow), reseteado tras cada bloque para no filtrarse a la cuadrícula. |
| **Pastel** | Colores suaves y esquinas redondeadas simuladas (`ctx.roundRect`, con reserva manual por arcos si el navegador no lo soporta). |
| **Pixel** | Paleta saturada + una rejilla 3×3 a cuadros y contorno marcado sobre cada bloque, para simular una textura pixel art barata de dibujar. |

`resolveCell()`/`colorHex()` en `game.js` consultan `Skins.colorFor(index)` en vez del array `COLORS` (que se conserva como referencia/valor por defecto de la skin Retro); `drawBlock()` delega el pintado del cuerpo del bloque en `Skins.paint(...)` manteniendo su firma y los cuatro puntos de llamada (tablero, ghost, pieza actual, preview `NEXT`) intactos. El comodín (`v === 9`) y las celdas de power-up (`v >= 100`) no pasan por la skin — siguen usando `themeColors.comodin` y `PowerUps.styleFor`/`puInstance.color` como antes.

Y, en el mismo espíritu desacoplado, **`scores.js`** expone un objeto `Scores` con el almacenamiento del top 5 y los récords globales (mejor combo, máximo de líneas) en `localStorage`, más un pequeño helper para generar el HTML de la tabla — usado tanto por la pantalla de inicio como por el overlay de Game Over.

El menú de pausa vive aparte en **`pausemenu.js`** (objeto `PauseMenu`), con el mismo patrón de desacoplo: expone `init(callbacks)`, `open()`, `close()`, `isOpen()` y `getStartLevel()`, y `game.js` sólo llama a esas funciones desde `togglePause()`/`init()`/el listener de teclado. El nivel inicial elegido se guarda en `localStorage` (`tetris-start-level`) y sólo se aplica a la *siguiente* partida (`init()` lo lee una vez al arrancar).

### Flujo del juego

```
pantalla de inicio (#start-screen, visible al cargar)
  └─ botón "Jugar" → oculta #start-screen → init()

init()
  ├─ createBoard()                  → matriz vacía
  ├─ next = nextPiece()             → ¿toca power-up? si no, randomPiece()
  ├─ spawn()                        → mueve next a current y genera nueva next
  └─ requestAnimationFrame(loop)
        ↓
   loop(timestamp)
     ├─ acumula dt (si no está congelado)
     ├─ si dt ≥ dropInterval → baja la pieza o llama a lockPiece()
     │     lockPiece(): merge → activatePowerUp (si aplica) → clearLines →
     │                  registerCombo (captura el mejor combo) → spawn
     ├─ Effects.update(dt) + draw()  (grid + tablero + ghost + pieza + efectos)
     └─ requestAnimationFrame(loop)

   keydown → mover / rotar / soft-drop / hard-drop / pausa
```

Cuando una pieza recién generada ya colisiona al aparecer (`spawn`), se dispara `endGame()`, que actualiza el récord de líneas, muestra el overlay de **Game Over** con la tabla de récords y, si la puntuación entra en el top 5, el formulario para guardarla con nombre.

---

## Tecnologías

- **HTML5** — marcado y dos elementos `<canvas>` (tablero y vista previa).
- **CSS3** — _flexbox_, variables de color, `backdrop-filter` y `box-shadow`.
- **JavaScript (ES6+) vanilla** — `const`/`let`, _classes_, _arrow functions_, _spread operator_, `Array.from`, _template literals_…
- **Canvas 2D API** — para todo el renderizado del juego, incluidos los efectos visuales.
- **Web Audio API** — para los efectos de sonido sintetizados (sin ficheros de audio).
- **`requestAnimationFrame`** — para el bucle de juego sincronizado con el navegador.

**Sin dependencias.** No hay `package.json`, ni bundler, ni transpilador.

---

## Estructura del proyecto

```
03-tetris/
├── index.html      # Estructura del DOM y los dos canvas
├── style.css       # Estilos del juego (dark/light theme + skins visuales)
├── audio.js        # Efectos de sonido (WebAudio, sintetizados)
├── effects.js      # Capa de efectos visuales (explosiones, rayo, etc.)
├── powerups.js     # PowerUp (clase base) + las 5 piezas + registro + spawner
├── scores.js       # Tabla de récords local (top 5, mejor combo, máx. líneas) en localStorage
├── skins.js        # Skins visuales (paletas de color + estrategias de pintado de bloque)
├── pausemenu.js    # Menú de pausa (Reanudar/Reiniciar/Ver controles/Nivel inicial)
├── game.js         # Lógica central del Tetris e integración con power-ups/skins
└── README.md
```

---

## Personalización

Algunos parámetros fáciles de tunear:

| Constante             | Dónde         | Significado                              | Por defecto            |
| ---------------------- | ------------- | ----------------------------------------- | ----------------------- |
| `COLS`                 | `game.js`     | Columnas del tablero                      | `10`                     |
| `ROWS`                 | `game.js`     | Filas del tablero                         | `20`                     |
| `BLOCK`                | `game.js`     | Tamaño en píxeles de cada celda           | `30`                     |
| `COLORS`               | `game.js`     | Paleta de colores por tipo de pieza       | 8 colores                |
| `LINE_SCORES`          | `game.js`     | Puntos por 1, 2, 3 o 4 líneas eliminadas  | `[0,100,300,500,800]`    |
| `dropInterval`         | `game.js`     | Velocidad inicial de caída en ms          | `1000`                   |
| `POWERUP_CONFIG`       | `powerups.js` | Frecuencia y pesos de los power-ups       | `minGap:8, chance:0.15, maxGap:25` |
| `SKIN_TABLE`           | `skins.js`    | Paleta de color + pintado de bloque por skin | `retro`, `neon`, `pastel`, `pixel` |

> Si cambias `COLS`, `ROWS` o `BLOCK`, recuerda ajustar también `width` y `height` del `<canvas id="board">` en `index.html` para que coincida (`COLS × BLOCK` × `ROWS × BLOCK`).

---

## Licencia

Proyecto de uso libre con fines educativos y de práctica.
