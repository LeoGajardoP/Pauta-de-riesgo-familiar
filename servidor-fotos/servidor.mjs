/* ===========================================================================
 *  servidor-fotos/servidor.mjs
 *
 *  Servidor mínimo para el modo "servidor" del álbum de fotos:
 *    · sirve la app (index.html, subir.html, assets…)
 *    · recibe las fotos que suben los invitados  (POST /api/fotos)
 *    · lista lo subido para el mural en pantalla (GET  /api/fotos)
 *    · devuelve cada archivo                     (GET  /fotos/<archivo>)
 *
 *  Sin dependencias: solo Node 18 o superior.
 *
 *      node servidor-fotos/servidor.mjs
 *      node servidor-fotos/servidor.mjs --puerto 8080 --destino ./fotos-boda
 *
 *  Al arrancar imprime las direcciones de la red local: esa es la que hay que
 *  poner en datos.js -> fotos.urlServidor para que el QR apunte bien.
 *
 *  Pensado para una red local de confianza (el wifi del salón). No tiene
 *  autenticación: cualquiera que esté en la misma red y conozca la dirección
 *  puede subir y ver fotos. Para exponerlo a internet hace falta algo más.
 * ======================================================================== */

import http from "node:http";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const RAIZ_APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* ------------------------------------------------------------- argumentos */
function argumento(nombre, porDefecto) {
  const i = process.argv.indexOf("--" + nombre);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : porDefecto;
}

const PUERTO = Number(argumento("puerto", process.env.PUERTO || 8080));
const DESTINO = path.resolve(argumento("destino", path.join(RAIZ_APP, "fotos-subidas")));
const MAX_MB = Number(argumento("max-mb", 30));
const MAX_BYTES = MAX_MB * 1024 * 1024;

const EXTENSIONES_OK = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic", ".heif", ".avif",
  ".mp4", ".mov", ".m4v", ".webm",
]);

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".gif": "image/gif", ".webp": "image/webp", ".avif": "image/avif",
  ".heic": "image/heic", ".heif": "image/heif",
  ".mp4": "video/mp4", ".mov": "video/quicktime", ".m4v": "video/x-m4v", ".webm": "video/webm",
  ".ico": "image/x-icon", ".txt": "text/plain; charset=utf-8",
};

/* ------------------------------------------------------ multipart casero */
/* Devuelve [{ campo, archivo, tipo, datos }] a partir de un cuerpo
 * multipart/form-data. Solo lo que necesitamos: sin streaming a disco, con el
 * cuerpo entero en memoria y un límite de tamaño por petición. */
export function parsearMultipart(cuerpo, frontera) {
  const separador = Buffer.from("\r\n--" + frontera);
  const completo = Buffer.concat([Buffer.from("\r\n"), cuerpo]);
  const partes = [];

  let inicio = completo.indexOf(separador);
  while (inicio !== -1) {
    let desde = inicio + separador.length;
    // Fin del cuerpo: "--" tras la frontera.
    if (completo[desde] === 0x2d && completo[desde + 1] === 0x2d) break;
    // Saltamos el \r\n que sigue a la frontera.
    if (completo[desde] === 0x0d && completo[desde + 1] === 0x0a) desde += 2;

    const siguiente = completo.indexOf(separador, desde);
    if (siguiente === -1) break;

    const bloque = completo.subarray(desde, siguiente);
    const corte = bloque.indexOf("\r\n\r\n");
    if (corte !== -1) {
      const cabeceras = bloque.subarray(0, corte).toString("utf8");
      const datos = bloque.subarray(corte + 4);
      const disposicion = /content-disposition:[^\n]*/i.exec(cabeceras)?.[0] || "";
      const campo = /name="([^"]*)"/i.exec(disposicion)?.[1] || "";
      const archivo = /filename\*?="?([^";\n]*)"?/i.exec(disposicion)?.[1] || "";
      const tipo = /content-type:\s*([^\r\n;]+)/i.exec(cabeceras)?.[1] || "";
      partes.push({ campo, archivo, tipo, datos });
    }
    inicio = siguiente;
  }
  return partes;
}

/* Nombre de archivo seguro: nada de rutas, nada de caracteres raros. */
export function nombreSeguro(original) {
  const base = path.basename(String(original || "").replace(/\\/g, "/"));
  const ext = path.extname(base).toLowerCase();
  const sinExt = base.slice(0, base.length - ext.length)
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "foto";
  return { sinExt, ext };
}

function marcaDeTiempo() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/* ------------------------------------------------------------- respuestas */
function json(res, codigo, cuerpo) {
  const texto = JSON.stringify(cuerpo);
  res.writeHead(codigo, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(texto),
    "access-control-allow-origin": "*",
  });
  res.end(texto);
}

/* Lee el cuerpo de la petición con un tope de tamaño.
 *
 * Si se pasa del límite NO cortamos la conexión de golpe: seguimos vaciando el
 * socket sin guardar nada para poder contestar un 413 que el teléfono entienda.
 * Si el que envía se pasa muchísimo (4 veces el límite) ahí sí cortamos, para
 * no quedarnos tragando datos indefinidamente. */
function leerCuerpo(req, limite) {
  return new Promise((resolver, rechazar) => {
    const trozos = [];
    let total = 0;
    let excedido = false;

    req.on("data", (t) => {
      total += t.length;
      if (!excedido && total > limite) {
        excedido = true;
        trozos.length = 0;   // soltamos lo acumulado: ya no sirve
      }
      if (excedido) {
        if (total > limite * 4) req.destroy();
        return;
      }
      trozos.push(t);
    });

    req.on("aborted", () => resolver({ excedido: true, cuerpo: Buffer.alloc(0) }));
    req.on("end", () => resolver({ excedido, cuerpo: excedido ? Buffer.alloc(0) : Buffer.concat(trozos) }));
    req.on("error", rechazar);
  });
}

async function servirArchivo(res, archivo) {
  try {
    const datos = await fsp.readFile(archivo);
    res.writeHead(200, {
      "content-type": TIPOS[path.extname(archivo).toLowerCase()] || "application/octet-stream",
      "content-length": datos.length,
      "cache-control": "no-cache",
      "access-control-allow-origin": "*",
    });
    res.end(datos);
    return true;
  } catch {
    return false;
  }
}

/* ---------------------------------------------------------------- rutas */
async function manejar(req, res) {
  const url = new URL(req.url, "http://" + (req.headers.host || "localhost"));
  const ruta = decodeURIComponent(url.pathname);

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, OPTIONS",
      "access-control-allow-headers": "content-type",
    });
    return res.end();
  }

  // --- subir una foto
  if (req.method === "POST" && ruta === "/api/fotos") {
    const tipo = req.headers["content-type"] || "";
    const frontera = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(tipo);
    if (!frontera) return json(res, 400, { error: "Se esperaba multipart/form-data" });

    let leido;
    try {
      leido = await leerCuerpo(req, MAX_BYTES);
    } catch {
      return json(res, 400, { error: "No se pudo leer el archivo" });
    }
    if (leido.excedido) {
      return json(res, 413, { error: `El archivo supera los ${MAX_MB} MB` });
    }

    const partes = parsearMultipart(leido.cuerpo, frontera[1] || frontera[2]).filter((p) => p.archivo);
    if (!partes.length) return json(res, 400, { error: "No llegó ningún archivo" });

    const guardados = [];
    for (const parte of partes) {
      const { sinExt, ext } = nombreSeguro(parte.archivo);
      if (!EXTENSIONES_OK.has(ext)) {
        return json(res, 415, { error: `Tipo de archivo no permitido: ${ext || "(sin extensión)"}` });
      }
      let nombre = `${marcaDeTiempo()}-${sinExt}${ext}`;
      let intento = 1;
      while (fs.existsSync(path.join(DESTINO, nombre))) {
        nombre = `${marcaDeTiempo()}-${sinExt}-${intento++}${ext}`;
      }
      await fsp.writeFile(path.join(DESTINO, nombre), parte.datos);
      guardados.push(nombre);
      console.log(`  ✓ ${nombre}  (${(parte.datos.length / 1024 / 1024).toFixed(1)} MB)`);
    }
    return json(res, 201, { ok: true, guardados });
  }

  // --- listar lo subido (para el mural)
  if (req.method === "GET" && ruta === "/api/fotos") {
    let archivos = [];
    try {
      const entradas = await fsp.readdir(DESTINO, { withFileTypes: true });
      const conFecha = [];
      for (const e of entradas) {
        if (!e.isFile()) continue;
        if (!EXTENSIONES_OK.has(path.extname(e.name).toLowerCase())) continue;
        const st = await fsp.stat(path.join(DESTINO, e.name));
        conFecha.push({ nombre: e.name, t: st.mtimeMs });
      }
      conFecha.sort((a, b) => b.t - a.t);
      archivos = conFecha.map((x) => x.nombre);
    } catch { /* carpeta vacía o inexistente */ }
    return json(res, 200, { fotos: archivos, total: archivos.length });
  }

  // --- servir una foto subida
  if (req.method === "GET" && ruta.startsWith("/fotos/")) {
    const pedido = path.basename(ruta.slice("/fotos/".length));
    const archivo = path.join(DESTINO, pedido);
    if (!archivo.startsWith(DESTINO + path.sep)) { res.writeHead(403); return res.end("No"); }
    if (await servirArchivo(res, archivo)) return;
    res.writeHead(404); return res.end("No encontrada");
  }

  // --- estáticos de la app
  if (req.method === "GET") {
    const relativo = ruta === "/" ? "index.html" : ruta.replace(/^\/+/, "");
    const archivo = path.resolve(RAIZ_APP, relativo);
    if (!archivo.startsWith(RAIZ_APP + path.sep) && archivo !== RAIZ_APP) {
      res.writeHead(403); return res.end("No");
    }
    if (await servirArchivo(res, archivo)) return;
  }

  res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
  res.end("404");
}

/* ------------------------------------------------------------- arranque */
function direccionesLocales() {
  const salida = [];
  const interfaces = os.networkInterfaces();
  for (const nombre of Object.keys(interfaces)) {
    for (const i of interfaces[nombre] || []) {
      if (i.family === "IPv4" && !i.internal) salida.push(i.address);
    }
  }
  return salida;
}

// Cuando se importa desde un test no arrancamos el servidor.
const esEjecucionDirecta = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (esEjecucionDirecta) {
  await fsp.mkdir(DESTINO, { recursive: true });

  http.createServer((req, res) => {
    manejar(req, res).catch((e) => {
      console.error("error:", e);
      if (!res.headersSent) res.writeHead(500);
      res.end("error");
    });
  }).listen(PUERTO, () => {
    const ips = direccionesLocales();
    console.log("\n  💐  Servidor de fotos de la boda en marcha");
    console.log("  ────────────────────────────────────────────");
    console.log(`  Guardando en:  ${DESTINO}`);
    console.log(`  Límite:        ${MAX_MB} MB por archivo\n`);
    console.log(`  En este equipo:    http://localhost:${PUERTO}`);
    ips.forEach((ip) => console.log(`  En el wifi del salón: http://${ip}:${PUERTO}`));
    console.log("\n  Pon esa última dirección en assets/js/datos.js -> fotos.urlServidor");
    console.log("  y deja fotos.modo en \"servidor\". El QR se regenera solo.\n");
  });
}

export { manejar, DESTINO, PUERTO };
