/*
 * Prueba de humo del servidor de fotos: arranca el servidor en un puerto libre,
 * sube archivos de verdad y comprueba el listado, la descarga, los límites y
 * que no se pueda salir de la carpeta de fotos.
 *
 *   node tools/probar-servidor.mjs
 */
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUERTO = 8137;
const base = `http://127.0.0.1:${PUERTO}`;
const destino = await fs.mkdtemp(path.join(os.tmpdir(), "fotos-boda-"));

let fallos = 0;
function comprobar(nombre, condicion, detalle) {
  if (condicion) console.log(`  ✓ ${nombre}`);
  else { fallos++; console.error(`  ✗ ${nombre}${detalle ? " — " + detalle : ""}`); }
}

const servidor = spawn(process.execPath,
  [path.join(raiz, "servidor-fotos/servidor.mjs"), "--puerto", String(PUERTO), "--destino", destino, "--max-mb", "1"],
  { stdio: ["ignore", "pipe", "inherit"] });

// Esperamos a que el puerto responda.
for (let i = 0; i < 50; i++) {
  try { await fetch(base + "/api/fotos"); break; } catch { await new Promise((r) => setTimeout(r, 100)); }
}

function formData(nombreArchivo, contenido, campo = "foto") {
  const fd = new FormData();
  fd.append(campo, new Blob([contenido]), nombreArchivo);
  return fd;
}

try {
  console.log("\nservidor de fotos");

  let r = await fetch(base + "/api/fotos", { method: "POST", body: formData("playa.jpg", "contenido-1") });
  comprobar("acepta una foto", r.status === 201, "status " + r.status);

  r = await fetch(base + "/api/fotos", { method: "POST", body: formData("../../fuera.png", "contenido-2") });
  const subida = await r.json();
  comprobar("neutraliza rutas en el nombre",
    r.status === 201 && !subida.guardados[0].includes("/") && !subida.guardados[0].includes(".."),
    JSON.stringify(subida));

  r = await fetch(base + "/api/fotos", { method: "POST", body: formData("script.js", "alert(1)") });
  comprobar("rechaza extensiones no permitidas", r.status === 415, "status " + r.status);

  r = await fetch(base + "/api/fotos", { method: "POST", body: formData("enorme.jpg", "x".repeat(2 * 1024 * 1024)) });
  comprobar("rechaza archivos sobre el límite", r.status === 413, "status " + r.status);

  r = await fetch(base + "/api/fotos");
  const lista = await r.json();
  comprobar("lista las fotos subidas", lista.total === 2, JSON.stringify(lista));

  r = await fetch(`${base}/fotos/${encodeURIComponent(lista.fotos[0])}`);
  comprobar("sirve la foto", r.status === 200 && (await r.text()).length > 0);

  r = await fetch(base + "/fotos/no-existe.jpg");
  comprobar("404 si la foto no existe", r.status === 404);

  r = await fetch(base + "/");
  comprobar("sirve la app", r.status === 200 && (await r.text()).includes("<html"));

  const fuera = path.join(destino, "..", "escapada.txt");
  await fs.writeFile(fuera, "secreto");
  r = await fetch(base + "/fotos/..%2Fescapada.txt");
  comprobar("no deja salir de la carpeta de fotos", r.status === 404, "status " + r.status);
  await fs.rm(fuera, { force: true });

} finally {
  servidor.kill();
  await fs.rm(destino, { recursive: true, force: true });
}

console.log(fallos === 0 ? "\ntodo correcto\n" : `\n${fallos} fallo(s)\n`);
process.exit(fallos === 0 ? 0 : 1);
