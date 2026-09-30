/*
 * Revisa que todos los enlaces de la lista de regalos respondan: los sitios de
 * los bancos y el enlace de pago con tarjeta.
 *
 *   node tools/revisar-enlaces.mjs
 *
 * Corre esto DESDE TU COMPUTADOR antes de publicar la página. Yo no pude
 * comprobarlos desde donde trabajo porque la red del entorno bloquea los
 * sitios de bancos, así que las direcciones que vienen en el archivo de datos
 * están puestas de memoria y hay que verificarlas.
 *
 * Un 200 significa "el sitio responde", no "esta es la página correcta de tu
 * banco": ábrela igual para confirmarlo.
 */
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// El archivo de datos está escrito para el navegador (window.REGALOS), así que
// lo ejecutamos en un contexto con un `window` de mentira.
const codigo = await fs.readFile(path.join(raiz, "assets/js/regalos-datos.js"), "utf8");
const contexto = { window: {} };
vm.createContext(contexto);
vm.runInContext(codigo, contexto);
const D = contexto.window.REGALOS;

const objetivos = [];
for (const b of D.bancos || []) {
  if (b.url) objetivos.push({ tipo: "banco", nombre: b.nombre, url: b.url });
}
if (D.pagoTarjeta?.url) {
  objetivos.push({ tipo: "pago", nombre: D.pagoTarjeta.proveedor || "enlace de pago", url: D.pagoTarjeta.url });
}
if (D.pareja?.volverA) {
  objetivos.push({ tipo: "volver", nombre: "volver a la boda", url: D.pareja.volverA });
}

if (!objetivos.length) {
  console.log("No hay enlaces configurados que revisar.");
  process.exit(0);
}

console.log(`\nRevisando ${objetivos.length} enlaces…\n`);

let malos = 0;

for (const o of objetivos) {
  let estado;
  try {
    const control = AbortSignal.timeout(15000);
    let r = await fetch(o.url, { method: "HEAD", redirect: "follow", signal: control });
    // Algunos sitios no aceptan HEAD; reintentamos con GET antes de darlo por malo.
    if (r.status === 405 || r.status === 501) {
      r = await fetch(o.url, { method: "GET", redirect: "follow", signal: AbortSignal.timeout(15000) });
    }
    estado = r.ok ? `✓ ${r.status}` : `✗ ${r.status}`;
    if (!r.ok) malos++;
  } catch (e) {
    estado = `✗ ${e.name === "TimeoutError" ? "sin respuesta (timeout)" : e.message}`;
    malos++;
  }
  console.log(`  ${estado.padEnd(26)} ${o.nombre.padEnd(18)} ${o.url}`);
}

console.log(malos === 0
  ? "\nTodos responden. Ábrelos igual una vez para confirmar que son la página correcta.\n"
  : `\n${malos} enlace(s) no respondieron. Corrígelos en assets/js/regalos-datos.js antes de publicar.\n`);

process.exit(malos === 0 ? 0 : 1);
