/* Service worker: deja la página disponible aunque el salón no tenga señal.
 * Solo se registra en https (o localhost); en http normal el navegador lo ignora. */
var CACHE = "boda-v1";
var BASICOS = [
  "./",
  "index.html",
  "subir.html",
  "assets/css/estilo.css",
  "assets/js/datos.js",
  "assets/js/qr.js",
  "assets/js/app.js",
  "assets/img/icono.svg",
  "manifest.webmanifest",
];

self.addEventListener("install", function (ev) {
  ev.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(BASICOS); }).then(function () {
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (ev) {
  ev.waitUntil(
    caches.keys().then(function (claves) {
      return Promise.all(claves.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (ev) {
  var url = new URL(ev.request.url);
  if (ev.request.method !== "GET") return;
  // Las fotos y la API siempre van a la red: no queremos verlas congeladas.
  if (url.pathname.indexOf("/api/") === 0 || url.pathname.indexOf("/fotos/") === 0) return;

  ev.respondWith(
    caches.match(ev.request).then(function (guardada) {
      var red = fetch(ev.request).then(function (r) {
        if (r.ok && url.origin === location.origin) {
          var copia = r.clone();
          caches.open(CACHE).then(function (c) { c.put(ev.request, copia); });
        }
        return r;
      }).catch(function () { return guardada; });
      return guardada || red;
    })
  );
});
