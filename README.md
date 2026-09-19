# Leo & Dani — app de boda

Aplicación web para organizar y **usar en vivo** el día de la boda: itinerario que
se ilumina solo según la hora, buscador de mesas, plano del salón, sección de los
novios y un QR para que los invitados suban fotos.

Sin frameworks, sin `npm install`, sin build. Son archivos estáticos: se abren
directo en el navegador o se publican en cualquier hosting.

---

## ⚠️ Antes que nada: qué hay que rellenar

**Todos los textos, nombres, horas y mesas que trae el repo son de ejemplo.**
No conozco los datos reales de Leo y Dani, así que no los inventé como si fueran
ciertos: están puestos como plantilla. Todo lo que diga `EJEMPLO` hay que
cambiarlo antes de enseñárselo a nadie.

Se edita **un solo archivo**: [`assets/js/datos.js`](assets/js/datos.js).
Ahí está el evento, la historia de los novios, el itinerario, las mesas con sus
invitados, la configuración de las fotos y la info práctica. No hay que tocar
HTML, CSS ni JavaScript para personalizar la boda.

Lo que sí o sí hay que completar:

| Dónde | Qué |
|---|---|
| `evento.fecha`, `evento.horaCeremonia` | mueven la cuenta regresiva y el modo en vivo |
| `evento.lugar`, `evento.direccion`, `evento.mapa` | portada e info práctica |
| `nosotros.parrafos`, `nosotros.fichas` | la historia real de Leo y Dani |
| `itinerario` | el minuto a minuto de verdad |
| `mesas` | los nombres reales de los invitados |
| `fotos.urlAlbum` **o** `fotos.urlServidor` | el destino del QR (ver más abajo) |

---

## Cómo se ve y qué hace

- **Portada** con cuenta regresiva en vivo; el mismo día cambia a "¡Hoy es el día!".
- **Nosotros**: foto (o degradado con las iniciales si aún no hay foto), la
  historia en párrafos y tarjetitas cortas.
- **Itinerario**: el día del evento marca en rosa lo que está pasando **ahora**,
  atenúa lo ya pasado, etiqueta lo que viene y muestra arriba un aviso del tipo
  *"Ahora: Primer baile · en 20 min, Torta y postres"*. Se refresca solo cada 30 s.
- **Mesas**: buscador que ignora tildes y mayúsculas (escribir `jose` encuentra
  `Josefa`), plano del salón con las mesas colocadas por coordenadas, la mesa
  encontrada parpadea, y al tocar cualquier mesa se abre quién se sienta ahí.
  Hay vista **Plano** y vista **Lista**.
- **Fotos**: QR grande, instrucciones en 3 pasos, botón **"Ver en grande"**
  (cartel a pantalla completa para proyectar o dejar en una mesa) y botón de
  **imprimir** ese cartel.
- **Info práctica**: vestimenta, cómo llegar, regalos, niños, dirección y mapa.

Detalles pensados para el salón: se puede instalar en el teléfono (PWA), guarda
la página en caché para que funcione con mala señal, respeta
`prefers-reduced-motion` y los botones tienen tamaño de dedo (mínimo 48 px).

---

## Las fotos por QR: elige uno de los dos modos

Esta es la parte donde hay que tomar una decisión real, así que la explico entera.

### Modo `album` (recomendado si no quieres complicaciones)

```js
fotos: { modo: "album", urlAlbum: "https://photos.app.goo.gl/xxxxxxxx" }
```

El QR lleva directo a un álbum compartido (Google Fotos, iCloud, un Drive, lo que
uses). No necesitas ningún servidor encendido ni depender del wifi del salón.

Antes del evento **verifica tú mismo** dos cosas, porque dependen del servicio y
pueden haber cambiado desde mi última actualización:

1. Que el álbum esté con **colaboración activada** (que los invitados puedan
   *añadir* fotos, no solo verlas).
2. Hasta donde yo sé, para *añadir* fotos a un álbum de Google Fotos el invitado
   necesita tener cuenta de Google; para *verlas* basta el enlace. **No lo doy
   por seguro: pruébalo con el teléfono de otra persona antes de la boda.**

Haz una prueba real: escanea el QR con un teléfono que no sea el tuyo y sube una
foto. Es cinco minutos y te evita el problema el día del evento.

### Modo `servidor` (fotos tuyas, sin depender de internet)

```js
fotos: { modo: "servidor", urlServidor: "http://192.168.1.50:8080" }
```

Incluye un servidor propio, sin dependencias, en
[`servidor-fotos/servidor.mjs`](servidor-fotos/servidor.mjs):

```bash
node servidor-fotos/servidor.mjs
# opciones: --puerto 8080  --destino ./fotos-boda  --max-mb 30
```

Al arrancar imprime la dirección de la red local (`http://192.168.1.50:8080`):
esa es la que va en `fotos.urlServidor`. El servidor sirve la app **y** recibe las
fotos, así que todo queda en el mismo sitio.

Qué hace:

- `POST /api/fotos` — recibe las fotos de [`subir.html`](subir.html) y las guarda
  en `fotos-subidas/` con fecha y hora en el nombre.
- `GET /api/fotos` — lista lo subido; la app lo usa para el mural que aparece
  bajo el QR y se refresca cada 20 s (útil para proyectar en la fiesta).
- `GET /fotos/<archivo>` — devuelve cada foto.

Límites y comprobaciones que ya trae: solo extensiones de imagen y vídeo, tamaño
máximo por archivo (30 MB por defecto, con error claro en el teléfono si se pasa),
nombres de archivo saneados y no se puede salir de la carpeta de fotos.

**Lo que este modo NO tiene, dicho claro:** no hay contraseña ni usuarios.
Cualquiera que esté en la misma red y conozca la dirección puede subir y ver las
fotos. Para el wifi de un salón está bien; para exponerlo a internet abierto hace
falta más (autenticación, HTTPS, un proxy delante).

Y algo práctico: si el computador que hace de servidor se apaga o se duerme, se
acabaron las subidas. Déjalo enchufado y con la suspensión desactivada.

---

## Publicarlo

### GitHub Pages (lo más simple para tener una URL real)

Settings → Pages → *Deploy from a branch* → rama `main` (o la que uses), carpeta
`/ (root)`. Queda en `https://<usuario>.github.io/<repo>/`. Esa URL es la que
conviene meter en el QR si usas modo álbum con una página intermedia, y la que
compartes con los invitados.

### Cualquier hosting estático

Sube todos los archivos tal cual (Netlify, Vercel, un hosting con FTP). No hay
proceso de build.

### Sin internet, en el propio salón

Arranca `servidor-fotos/servidor.mjs` en un portátil conectado al wifi del lugar
y entrega la dirección local. Todo —app, mesas, itinerario y fotos— funciona sin
salir a internet.

> Nota: la caché offline (service worker) solo se activa en `https` o
> `localhost`; es una regla de los navegadores, no del código. En una dirección
> `http://192.168...` la app funciona igual, simplemente sin esa caché.

---

## El generador de QR

El QR se dibuja en el navegador con [`assets/js/qr.js`](assets/js/qr.js), escrito
para este proyecto: sin CDN ni servicio externo, así funciona aunque el salón no
tenga señal y nadie tiene que confiar en un tercero para el enlace.

Cubre modo byte (UTF-8), versiones 1 a 10 y niveles de corrección L/M/Q/H — a
nivel M son hasta 216 bytes, de sobra para una URL.

No hay que creerme que funciona, está comprobado:

```bash
pip3 install qrcode          # librería de referencia (implementa ISO/IEC 18004)
node tools/verificar-qr.mjs
```

Compara la matriz **módulo a módulo** contra la referencia para 7 textos × 4
niveles × 8 máscaras. Resultado en el último paso: **216 matrices idénticas, 216
puntuaciones de máscara iguales, 0 fallos**.

Además el QR se capturó de la pantalla y se decodificó con OpenCV: tanto el de la
sección de fotos como el del cartel a pantalla completa devuelven exactamente la
URL configurada.

---

## Comprobaciones

```bash
node tools/verificar-qr.mjs      # QR contra la librería de referencia (necesita: pip3 install qrcode)
node tools/probar-servidor.mjs   # servidor de fotos: subidas, límites, listado, rutas
```

El segundo arranca el servidor en un puerto de prueba, sube archivos reales y
comprueba 9 cosas: que acepta fotos, que sanea nombres tipo `../../fuera.png`,
que rechaza extensiones raras, que devuelve 413 en vez de cortar la conexión
cuando el archivo se pasa de tamaño, el listado, la descarga, el 404, que sirve
la app y que no se puede salir de la carpeta de fotos.

La interfaz también se revisó en navegador (Chromium, escritorio y móvil):
búsqueda sin tildes, mesa destacada, detalle de mesa, vista lista, cartel del QR,
página de subida y el modo en vivo del itinerario simulando la hora del evento.

---

## Estructura

```
index.html                  la app
subir.html                  página a la que llega el invitado desde el QR (modo servidor)
manifest.webmanifest        para instalarla en el teléfono
sw.js                       caché offline
assets/
  css/estilo.css            todo el estilo
  js/datos.js               👈 lo único que hay que editar
  js/qr.js                  generador de QR propio
  js/app.js                 lógica de la página
  img/icono.svg
servidor-fotos/servidor.mjs servidor opcional para recibir fotos
tools/verificar-qr.mjs      verificación del QR
tools/probar-servidor.mjs   pruebas del servidor
```

---

## Checklist para el día del evento

- [ ] `datos.js` completo, sin ningún `EJEMPLO` a la vista.
- [ ] Lista de invitados revisada por alguien más (los nombres mal escritos no
      aparecen en el buscador).
- [ ] QR probado con **dos teléfonos distintos**, uno Android y uno iPhone, y con
      una foto subida de verdad hasta el final.
- [ ] Cartel del QR impreso (botón *Imprimir cartel*) y puesto en varias mesas.
- [ ] Alguien con el enlace corto a mano por si a un invitado le falla la cámara.
- [ ] Si usas el modo servidor: portátil enchufado, suspensión desactivada y
      espacio libre en disco de sobra.
- [ ] Probado también con datos móviles, no solo con el wifi del salón.
