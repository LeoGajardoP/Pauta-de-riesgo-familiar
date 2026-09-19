/* ===========================================================================
 *  app.js — arma la página a partir de window.DATOS.
 *  Sin frameworks ni dependencias: así funciona abriendo el archivo y también
 *  con mala señal en el salón.
 * ======================================================================== */
(function () {
  "use strict";

  var D = window.DATOS;
  if (!D) { console.error("Falta assets/js/datos.js"); return; }

  var $ = function (sel, raiz) { return (raiz || document).querySelector(sel); };
  var $$ = function (sel, raiz) { return Array.prototype.slice.call((raiz || document).querySelectorAll(sel)); };

  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
    "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
  var DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

  /* ------------------------------------------------------------ utilidades */

  // Quita tildes y pasa a minúsculas para que la búsqueda no dependa de cómo
  // escriba su nombre el invitado ("José" encuentra "jose").
  function normalizar(texto) {
    return String(texto)
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .trim();
  }

  // Combina la fecha de la boda con una hora "HH:MM".
  // Las horas de 00:00 a 05:59 se entienden como la madrugada del día siguiente.
  function fechaHora(hora) {
    var f = D.evento.fecha.split("-").map(Number);
    var h = hora.split(":").map(Number);
    var d = new Date(f[0], f[1] - 1, f[2], h[0], h[1], 0, 0);
    if (h[0] < 6) d.setDate(d.getDate() + 1);
    return d;
  }

  function fechaLarga() {
    var f = D.evento.fecha.split("-").map(Number);
    var d = new Date(f[0], f[1] - 1, f[2]);
    return DIAS[d.getDay()] + " " + d.getDate() + " de " + MESES[d.getMonth()] + " de " + d.getFullYear();
  }

  function crear(etiqueta, clase, texto) {
    var el = document.createElement(etiqueta);
    if (clase) el.className = clase;
    if (texto != null) el.textContent = texto;
    return el;
  }

  /* ---------------------------------------------------------------- cabecera */

  function pintarCabecera() {
    var e = D.evento;
    var nombres = e.novio + " & " + e.novia;
    document.title = nombres + " · Nuestra boda";
    $("#marca-nombres").textContent = nombres;
    $("#portada-novio").textContent = e.novio;
    $("#portada-novia").textContent = e.novia;
    $("#portada-lugar").textContent = [e.lugar, e.ciudad].filter(Boolean).join(" · ");
    $("#portada-fecha").textContent = fechaLarga() + " · " + e.horaCeremonia + " h";
    $("#pie-nombres").textContent = e.novio + " y " + e.novia;
    $("#pie-hashtag").textContent = e.hashtag || nombres;
    $("#cartel-kicker").textContent = e.hashtag || nombres;
  }

  /* --------------------------------------------------------- cuenta regresiva */

  function cuentaRegresiva() {
    var objetivo = fechaHora(D.evento.horaCeremonia);
    var caja = $("#cuenta");
    var hoy = $("#cuenta-hoy");

    function tic() {
      var falta = objetivo - new Date();
      if (falta <= 0) {
        caja.hidden = true;
        hoy.hidden = false;
        hoy.textContent = falta > -14 * 3600 * 1000
          ? "¡Hoy es el día! 🎉"
          : "Gracias por acompañarnos ❤️";
        return;
      }
      var seg = Math.floor(falta / 1000);
      $("#c-dias").textContent = Math.floor(seg / 86400);
      $("#c-horas").textContent = String(Math.floor(seg / 3600) % 24).padStart(2, "0");
      $("#c-min").textContent = String(Math.floor(seg / 60) % 60).padStart(2, "0");
      $("#c-seg").textContent = String(seg % 60).padStart(2, "0");
    }
    tic();
    setInterval(tic, 1000);
  }

  /* -------------------------------------------------------------- nosotros */

  function pintarNosotros() {
    var n = D.nosotros || {};
    if (n.titulo) $("#nosotros-titulo").textContent = n.titulo;
    $("#nosotros-bajada").textContent = n.bajada || "";
    $("#nosotros-iniciales").textContent =
      (D.evento.novio[0] || "") + "&" + (D.evento.novia[0] || "");

    var contenedor = $("#nosotros-parrafos");
    (n.parrafos || []).forEach(function (p) {
      contenedor.appendChild(crear("p", null, p));
    });

    if (n.foto) {
      var img = new Image();
      img.src = n.foto;
      img.alt = "Foto de " + D.evento.novio + " y " + D.evento.novia;
      img.addEventListener("load", function () {
        var caja = $("#nosotros-foto");
        caja.innerHTML = "";
        caja.appendChild(img);
      });
    }

    var lista = $("#nosotros-fichas");
    (n.fichas || []).forEach(function (f) {
      var li = crear("li");
      if (f.emoji) li.appendChild(crear("span", "emoji", f.emoji));
      li.appendChild(crear("h3", null, f.titulo));
      li.appendChild(crear("p", null, f.texto));
      lista.appendChild(li);
    });
  }

  /* ------------------------------------------------------------ itinerario */

  var itemsItinerario = [];

  function pintarItinerario() {
    var ol = $("#linea-tiempo");
    (D.itinerario || []).forEach(function (ev) {
      var li = crear("li");
      li.appendChild(crear("div", "linea__hora", ev.hora));

      var punto = crear("div", "linea__punto");
      punto.setAttribute("aria-hidden", "true");
      li.appendChild(punto);

      var caja = crear("div", "linea__caja");
      var h3 = crear("h3");
      if (ev.emoji) {
        var em = crear("span", "linea__emoji", ev.emoji);
        em.setAttribute("aria-hidden", "true");
        h3.appendChild(em);
      }
      h3.appendChild(document.createTextNode(ev.titulo));
      caja.appendChild(h3);
      if (ev.detalle) caja.appendChild(crear("p", null, ev.detalle));
      li.appendChild(caja);

      ol.appendChild(li);
      itemsItinerario.push({ li: li, titulo: h3, inicio: fechaHora(ev.hora), datos: ev });
    });

    actualizarEnVivo();
    setInterval(actualizarEnVivo, 30000);
  }

  // Marca qué está pasando ahora y qué viene. Solo se activa el día del evento.
  function actualizarEnVivo() {
    if (!itemsItinerario.length) return;
    var ahora = new Date();
    var primero = itemsItinerario[0].inicio;
    var ultimo = itemsItinerario[itemsItinerario.length - 1].inicio;
    var enVentana = ahora >= new Date(primero.getTime() - 3 * 3600 * 1000) &&
                    ahora <= new Date(ultimo.getTime() + 2 * 3600 * 1000);

    var aviso = $("#aviso-vivo");

    itemsItinerario.forEach(function (it) {
      it.li.classList.remove("es-ahora", "es-pasado");
      var etiqueta = $(".etiqueta-ahora, .etiqueta-sigue", it.titulo);
      if (etiqueta) etiqueta.remove();
    });

    if (!enVentana) { aviso.hidden = true; return; }

    var actual = -1;
    for (var i = 0; i < itemsItinerario.length; i++) {
      if (itemsItinerario[i].inicio <= ahora) actual = i;
    }

    for (var j = 0; j < actual; j++) itemsItinerario[j].li.classList.add("es-pasado");

    if (actual >= 0) {
      var it = itemsItinerario[actual];
      it.li.classList.add("es-ahora");
      it.titulo.appendChild(crear("span", "etiqueta-ahora", "ahora"));
    }

    var siguiente = itemsItinerario[actual + 1];
    if (siguiente) {
      siguiente.titulo.appendChild(crear("span", "etiqueta-sigue", "a continuación"));
      var minutos = Math.max(0, Math.round((siguiente.inicio - ahora) / 60000));
      aviso.hidden = false;
      $("#aviso-vivo-texto").textContent = actual >= 0
        ? "Ahora: " + itemsItinerario[actual].datos.titulo + " · en " + minutos + " min, " + siguiente.datos.titulo
        : "Empezamos en " + minutos + " min con " + siguiente.datos.titulo;
    } else if (actual >= 0) {
      aviso.hidden = false;
      $("#aviso-vivo-texto").textContent = "Ahora: " + itemsItinerario[actual].datos.titulo;
    } else {
      aviso.hidden = true;
    }
  }

  /* ----------------------------------------------------------------- mesas */

  var indiceInvitados = [];   // { nombre, normalizado, mesa }
  var nodosMesa = {};         // id -> { boton, tarjeta }

  function construirIndice() {
    (D.mesas || []).forEach(function (mesa) {
      (mesa.invitados || []).forEach(function (nombre) {
        indiceInvitados.push({ nombre: nombre, normalizado: normalizar(nombre), mesa: mesa });
      });
    });
  }

  function pintarPlano() {
    var lienzo = $("#plano-lienzo");
    var lista = $("#lista-mesas");

    (D.mesas || []).forEach(function (mesa) {
      var forma = mesa.forma || "redonda";
      var boton = crear("button", "mesa mesa--" + forma);
      boton.type = "button";
      boton.style.left = mesa.x + "%";
      boton.style.top = mesa.y + "%";
      boton.appendChild(document.createTextNode(mesa.nombre));
      var n = (mesa.invitados || []).length;
      boton.appendChild(crear("span", "mesa__cuenta", n + (n === 1 ? " persona" : " personas")));
      boton.setAttribute("aria-label", mesa.nombre + ", " + n + " personas. Ver quiénes se sientan aquí.");
      boton.addEventListener("click", function () { abrirDetalle(mesa); });
      lienzo.appendChild(boton);

      var tarjeta = crear("div", "tarjeta-mesa");
      tarjeta.appendChild(crear("h4", null, mesa.nombre));
      var ul = crear("ul");
      (mesa.invitados || []).forEach(function (inv) { ul.appendChild(crear("li", null, inv)); });
      tarjeta.appendChild(ul);
      lista.appendChild(tarjeta);

      nodosMesa[mesa.id] = { boton: boton, tarjeta: tarjeta };
    });
  }

  var dialogo = null;

  function abrirDetalle(mesa) {
    if (!dialogo) {
      dialogo = document.createElement("dialog");
      dialogo.className = "detalle-mesa";
      document.body.appendChild(dialogo);
      dialogo.addEventListener("click", function (ev) {
        if (ev.target === dialogo) dialogo.close();
      });
    }
    dialogo.innerHTML = "";

    var cab = crear("div", "detalle-mesa__cabecera");
    cab.appendChild(crear("h3", null, mesa.nombre));
    var n = (mesa.invitados || []).length;
    cab.appendChild(crear("p", null, n + (n === 1 ? " persona" : " personas") + " en esta mesa"));
    cab.querySelector("p").style.margin = "0";
    dialogo.appendChild(cab);

    var cuerpo = crear("div", "detalle-mesa__cuerpo");
    var ul = crear("ul");
    (mesa.invitados || []).forEach(function (inv) { ul.appendChild(crear("li", null, inv)); });
    cuerpo.appendChild(ul);

    var cerrar = crear("button", "boton boton--primario", "Cerrar");
    cerrar.type = "button";
    cerrar.addEventListener("click", function () { dialogo.close(); });
    cuerpo.appendChild(cerrar);
    dialogo.appendChild(cuerpo);

    if (typeof dialogo.showModal === "function") dialogo.showModal();
    else dialogo.setAttribute("open", "");
  }

  function destacar(ids) {
    Object.keys(nodosMesa).forEach(function (id) {
      var activo = ids.indexOf(id) !== -1;
      nodosMesa[id].boton.classList.toggle("es-destacada", activo);
      nodosMesa[id].tarjeta.classList.toggle("es-destacada", activo);
    });
  }

  function buscar(consulta) {
    var q = normalizar(consulta);
    if (!q) return [];
    var palabras = q.split(/\s+/);
    return indiceInvitados.filter(function (inv) {
      return palabras.every(function (p) { return inv.normalizado.indexOf(p) !== -1; });
    });
  }

  function pintarResultados(consulta) {
    var caja = $("#resultados");
    caja.innerHTML = "";
    $("#limpiar").hidden = !consulta;

    if (!consulta) { destacar([]); return; }

    var encontrados = buscar(consulta);
    if (!encontrados.length) {
      var vacio = crear("div", "sin-resultado");
      vacio.appendChild(crear("strong", null, "No encontramos ese nombre."));
      vacio.appendChild(crear("p", null,
        "Prueba solo con el nombre o solo con el apellido. Si sigue sin aparecer, " +
        "pregúntale a quien te recibió en la entrada."));
      vacio.querySelector("p").style.margin = ".35rem 0 0";
      caja.appendChild(vacio);
      destacar([]);
      return;
    }

    encontrados.slice(0, 8).forEach(function (inv) {
      var t = crear("div", "tarjeta-resultado");
      t.appendChild(crear("div", "tarjeta-resultado__nombre", inv.nombre));
      t.appendChild(crear("div", "tarjeta-resultado__mesa", inv.mesa.nombre));

      var otros = (inv.mesa.invitados || []).filter(function (x) { return x !== inv.nombre; });
      var p = crear("p", "tarjeta-resultado__companeros");
      if (otros.length) {
        p.appendChild(crear("strong", null, "Te acompañan: "));
        p.appendChild(document.createTextNode(otros.join(", ")));
      } else {
        p.textContent = "Mesa reservada.";
      }
      t.appendChild(p);

      var ver = crear("button", "boton boton--claro", "Ver en el plano");
      ver.type = "button";
      ver.style.marginTop = ".8rem";
      ver.addEventListener("click", function () {
        mostrarVista("plano");
        nodosMesa[inv.mesa.id].boton.scrollIntoView({ block: "center", behavior: "smooth" });
        abrirDetalle(inv.mesa);
      });
      t.appendChild(ver);

      caja.appendChild(t);
    });

    if (encontrados.length > 8) {
      caja.appendChild(crear("p", null, "…y " + (encontrados.length - 8) + " coincidencias más. Afina la búsqueda."));
    }

    destacar(encontrados.map(function (i) { return i.mesa.id; }));
  }

  function mostrarVista(cual) {
    var esPlano = cual === "plano";
    $("#plano").hidden = !esPlano;
    $("#lista-mesas").hidden = esPlano;
    $("#ver-plano").classList.toggle("es-activo", esPlano);
    $("#ver-lista").classList.toggle("es-activo", !esPlano);
    $("#ver-plano").setAttribute("aria-pressed", String(esPlano));
    $("#ver-lista").setAttribute("aria-pressed", String(!esPlano));
  }

  function conectarMesas() {
    construirIndice();
    pintarPlano();

    var input = $("#busqueda");
    input.addEventListener("input", function () { pintarResultados(input.value); });
    $("#buscador").addEventListener("submit", function (ev) { ev.preventDefault(); });
    $("#limpiar").addEventListener("click", function () {
      input.value = "";
      pintarResultados("");
      input.focus();
    });
    $("#ver-plano").addEventListener("click", function () { mostrarVista("plano"); });
    $("#ver-lista").addEventListener("click", function () { mostrarVista("lista"); });
  }

  /* ----------------------------------------------------------------- fotos */

  // Devuelve la URL a la que apunta el QR, o "" si falta configurarla.
  function destinoFotos() {
    var f = D.fotos || {};
    if (f.modo === "servidor") {
      var base = (f.urlServidor || "").replace(/\/+$/, "");
      if (base) return base + "/subir.html";
      // Sin urlServidor: asumimos que esta misma página la sirve el servidor.
      if (location.protocol === "http:" || location.protocol === "https:") {
        return new URL("subir.html", location.href).href;
      }
      return "";
    }
    return f.urlAlbum || "";
  }

  function pintarFotos() {
    var f = D.fotos || {};
    if (f.titulo) $("#fotos-titulo").textContent = f.titulo;
    $("#fotos-mensaje").textContent = f.mensaje || "";
    $("#cartel-titulo").textContent = f.titulo || "Súbete al álbum";
    $("#cartel-pie").textContent = f.pieCartel || "";

    var destino = destinoFotos();
    var enlace = $("#qr-enlace");

    if (!destino) {
      enlace.parentElement.hidden = true;
      $("#btn-cartel").disabled = true;
      $("#btn-imprimir").disabled = true;
      return;
    }

    $("#qr-pendiente").remove();
    enlace.href = destino;
    enlace.textContent = destino;
    $("#cartel-url").textContent = destino;

    // El QR se dibuja con nuestro propio generador (assets/js/qr.js), sin
    // servicios externos: funciona aunque el salón no tenga internet.
    var opciones = { ecc: "M", margen: 3, oscuro: "#2a1b4a", claro: "#ffffff", etiqueta: "Código QR para subir fotos" };
    try {
      $("#qr-contenedor").innerHTML = QR.svg(destino, opciones);
      $("#cartel-qr").innerHTML = QR.svg(destino, opciones);
    } catch (e) {
      $("#qr-contenedor").textContent = "No se pudo generar el QR: " + e.message;
      return;
    }

    var cartel = $("#cartel");
    function abrirCartel() {
      cartel.hidden = false;
      document.body.style.overflow = "hidden";
      $("#cartel-cerrar").focus();
    }
    function cerrarCartel() {
      cartel.hidden = true;
      document.body.style.overflow = "";
    }
    $("#btn-cartel").addEventListener("click", abrirCartel);
    $("#cartel-cerrar").addEventListener("click", cerrarCartel);
    document.addEventListener("keydown", function (ev) {
      if (ev.key === "Escape" && !cartel.hidden) cerrarCartel();
    });
    $("#btn-imprimir").addEventListener("click", function () {
      abrirCartel();
      setTimeout(function () { window.print(); }, 120);
    });

    if (f.modo === "servidor") mural();
  }

  // Muro de fotos: solo tiene sentido con el servidor de servidor-fotos/.
  function mural() {
    var f = D.fotos || {};
    var base = (f.urlServidor || "").replace(/\/+$/, "") ||
      (location.protocol.indexOf("http") === 0 ? location.origin : "");
    if (!base) return;

    var caja = $("#mural");
    var rejilla = $("#mural-rejilla");

    function refrescar() {
      fetch(base + "/api/fotos", { cache: "no-store" })
        .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error(r.status)); })
        .then(function (datos) {
          var lista = datos.fotos || [];
          if (!lista.length) { caja.hidden = true; return; }
          caja.hidden = false;
          rejilla.innerHTML = "";
          lista.slice(0, 60).forEach(function (nombre) {
            var img = new Image();
            img.src = base + "/fotos/" + encodeURIComponent(nombre);
            img.alt = "Foto subida por un invitado";
            img.loading = "lazy";
            rejilla.appendChild(img);
          });
        })
        .catch(function () { /* el servidor no está encendido: no pasa nada */ });
    }
    refrescar();
    setInterval(refrescar, 20000);
  }

  /* ------------------------------------------------------------------ info */

  function pintarInfo() {
    var lista = $("#info-fichas");
    (D.info || []).forEach(function (i) {
      var li = crear("li");
      if (i.emoji) li.appendChild(crear("span", "emoji", i.emoji));
      li.appendChild(crear("h3", null, i.titulo));
      li.appendChild(crear("p", null, i.texto));
      lista.appendChild(li);
    });

    var e = D.evento;
    $("#lugar-nombre").textContent = e.lugar || "";
    $("#lugar-direccion").textContent = [e.direccion, e.ciudad].filter(Boolean).join(" · ");
    $("#lugar-vestimenta").textContent = e.codigoVestimenta ? "Vestimenta: " + e.codigoVestimenta : "";
    if (e.mapa) {
      var boton = $("#lugar-mapa");
      boton.href = e.mapa;
      boton.target = "_blank";
      boton.rel = "noopener";
      boton.hidden = false;
    }
  }

  /* --------------------------------------------------------- navegación */

  function conectarNavegacion() {
    var boton = $("#btn-menu");
    var menu = $("#menu-movil");
    boton.addEventListener("click", function () {
      var abierto = menu.hidden;
      menu.hidden = !abierto;
      boton.setAttribute("aria-expanded", String(abierto));
    });
    $$("#menu-movil a").forEach(function (a) {
      a.addEventListener("click", function () {
        menu.hidden = true;
        boton.setAttribute("aria-expanded", "false");
      });
    });

    var enlaces = $$(".barra__nav a");
    if (!("IntersectionObserver" in window)) return;
    var observador = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        enlaces.forEach(function (a) {
          a.classList.toggle("es-activo", a.getAttribute("href") === "#" + e.target.id);
        });
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ["nosotros", "itinerario", "mesas", "fotos", "info"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) observador.observe(el);
    });
  }

  /* ------------------------------------------------------------------ init */

  pintarCabecera();
  cuentaRegresiva();
  pintarNosotros();
  pintarItinerario();
  conectarMesas();
  pintarFotos();
  pintarInfo();
  conectarNavegacion();

  // Caché offline. Solo funciona en https o localhost; si no, se ignora.
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () { /* sin caché */ });
    });
  }
})();
