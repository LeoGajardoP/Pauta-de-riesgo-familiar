/*
 * Verificación del generador de QR propio (assets/js/qr.js) contra la librería
 * de referencia `qrcode` de Python (implementación de ISO/IEC 18004).
 *
 * Requisitos:  node 18+  y  pip3 install qrcode
 * Ejecución:   node tools/verificar-qr.mjs
 *
 * Comprueba dos cosas para cada combinación de texto × nivel × máscara (0-7):
 *   1. la matriz final es idéntica módulo a módulo a la de la referencia;
 *   2. la puntuación de penalización de las 4 reglas de máscara coincide.
 *
 * Nota sobre la máscara elegida automáticamente: la referencia puntúa matrices
 * "de prueba" (con bits de formato ficticios, ver QRCode.best_mask_pattern),
 * así que a veces elige otra máscara que la nuestra. Sobre la matriz final —lo
 * que dice la norma— ambas puntuaciones coinciden y nosotros nos quedamos con
 * la de menor penalización. Cualquiera de las 8 máscaras produce un QR válido:
 * el lector sabe cuál se usó porque va escrita en los bits de formato.
 */
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

const require = createRequire(import.meta.url);
const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QR = require(path.join(raiz, "assets/js/qr.js"));

const TEXTOS = [
  "https://leoydani.cl",
  "https://leoydani.cl/#fotos",
  "https://photos.app.goo.gl/EjEmPlOeJeMpLo123",
  "https://leoydani.github.io/boda/#/fotos?mesa=12",
  "Mesa 7 — Leo & Dani — 14 de febrero",
  "ñandú, cumbia y piscola en la playa 🎉",
  "https://ejemplo.com/" + "a".repeat(120),
];
const NIVELES = ["L", "M", "Q", "H"];

const SCRIPT_REFERENCIA = `
import json, sys, qrcode
from qrcode import util
from qrcode.constants import ERROR_CORRECT_L, ERROR_CORRECT_M, ERROR_CORRECT_Q, ERROR_CORRECT_H
niveles = {"L": ERROR_CORRECT_L, "M": ERROR_CORRECT_M, "Q": ERROR_CORRECT_Q, "H": ERROR_CORRECT_H}
d = json.load(sys.stdin)
qr = qrcode.QRCode(error_correction=niveles[d["nivel"]], border=0, box_size=1,
                   mask_pattern=d["mascara"])
qr.add_data(d["texto"])
qr.make(fit=True)
print(json.dumps({
  "version": qr.version,
  "penalizacion": util.lost_point(qr.modules),
  "modulos": [[1 if c else 0 for c in fila] for fila in qr.modules],
}))
`;

function referencia(texto, nivel, mascara) {
  const salida = execFileSync("python3", ["-c", SCRIPT_REFERENCIA], {
    input: JSON.stringify({ texto, nivel, mascara }),
    encoding: "utf8",
  });
  return JSON.parse(salida);
}

function iguales(a, b) {
  if (a.length !== b.length) return false;
  for (let y = 0; y < a.length; y++) {
    for (let x = 0; x < a.length; x++) if (a[y][x] !== b[y][x]) return false;
  }
  return true;
}

let matrices = 0;
let penalizaciones = 0;
let omitidos = 0;
let fallos = 0;

for (const texto of TEXTOS) {
  for (const nivel of NIVELES) {
    for (let mascara = 0; mascara < 8; mascara++) {
      const esperado = referencia(texto, nivel, mascara);
      if (esperado.version > 10) { omitidos++; continue; } // fuera del alcance declarado

      const nuestro = QR.construir(texto, { ecc: nivel, version: esperado.version, mascara });

      if (iguales(nuestro.matriz, esperado.modulos)) matrices++;
      else {
        fallos++;
        console.error(`✗ matriz distinta: nivel=${nivel} máscara=${mascara} v=${esperado.version} "${texto.slice(0, 40)}"`);
      }

      if (nuestro.penalizacion === esperado.penalizacion) penalizaciones++;
      else {
        fallos++;
        console.error(`✗ penalización distinta: nivel=${nivel} máscara=${mascara} ` +
          `nuestra=${nuestro.penalizacion} referencia=${esperado.penalizacion}`);
      }
    }

    // La versión que elegimos sola debe ser la misma que la de la referencia.
    const ref = referencia(texto, nivel, 0);
    if (ref.version <= 10) {
      const auto = QR.construir(texto, { ecc: nivel });
      if (auto.version !== ref.version) {
        fallos++;
        console.error(`✗ versión distinta: nivel=${nivel} nuestra=${auto.version} referencia=${ref.version}`);
      }
    } else {
      // Fuera de alcance: debe fallar de forma limpia, no generar un QR inválido.
      let lanzo = false;
      try { QR.construir(texto, { ecc: nivel }); } catch { lanzo = true; }
      if (!lanzo) {
        fallos++;
        console.error(`✗ debería rechazar un texto que no cabe en v10: nivel=${nivel}`);
      }
    }
  }
}

console.log(`matrices idénticas:      ${matrices}`);
console.log(`penalizaciones iguales:  ${penalizaciones}`);
console.log(`omitidos (versión > 10): ${omitidos}`);
console.log(`fallos:                  ${fallos}`);
process.exit(fallos === 0 ? 0 : 1);
