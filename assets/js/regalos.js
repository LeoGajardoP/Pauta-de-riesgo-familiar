/* ===========================================================================
 *  regalos.js — arma la lista de regalos a partir de window.REGALOS.
 *
 *  Qué hace y qué NO hace, para que quede claro:
 *    · Muestra las experiencias y los datos para transferir, con botones para
 *      copiarlos.
 *    · El botón de cada banco SOLO abre la web de ese banco en otra pestaña.
 *      No transfiere, no rellena formularios y no envía ningún dato: los
 *      bancos chilenos no ofrecen una forma pública de hacer eso desde fuera.
 *    · El botón de tarjeta SOLO abre el enlace de pago que hayas configurado
 *      (Webpay.cl, Flow, Mercado Pago…). Esta página no procesa pagos ni ve
 *      datos de tarjetas en ningún momento.
 * ======================================================================== */
(function () {
  "use strict";

  var D = window.REGALOS;
  if (!D) { console.error("Falta assets/js/regalos-datos.js"); return; }

  var $ = function (s, r) { return (r || document).querySelector(s); };

  var MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio",
    "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

  var pesos = new Intl.NumberFormat("es-CL", {
    style: "currency", currency: "CLP", maximumFractionDigits: 0
  });

  var elegido = null;      // experiencia elegida
  var nombreInvitado = ""; // lo que el invitado escriba para la glosa

  function crear(etiqueta, clase, texto) {
    var el = document.createElement(etiqueta);
    if (clase) el.className = clase;
    if (texto != null) el.textContent = texto;
    return el;
  }

  function fechaLarga() {
    if (!D.pareja.fecha) return "";
    var f = D.pareja.fecha.split("-").map(Number);
    return f[2] + " de " + MESES[f[1] - 1] + " de " + f[0];
  }

  /* ------------------------------------------------------------ cabecera */
  function pintarCabecera() {
    var p = D.pareja, i = D.intro || {};
    document.title = p.novio + " & " + p.novia + " · Lista de regalos";
    if (i.kicker) $("#r-kicker").textContent = i.kicker;
    if (i.titulo) $("#r-titulo").textContent = i.titulo;
    $("#r-bajada").textContent = i.bajada || "";
    $("#r-nota").textContent = i.nota || "";
    $("#r-nombres").textContent = p.novio + " & " + p.novia +
      (fechaLarga() ? " · " + fechaLarga() : "");
    $("#r-pie-hashtag").textContent = p.hashtag || (p.novio + " & " + p.novia);

    var c = D.cierre || {};
    $("#r-cierre-titulo").textContent = c.titulo || "";
    $("#r-cierre-texto").textContent = c.texto || "";

    if (p.volverA) {
      var volver = $("#r-volver");
      volver.href = p.volverA;
      volver.hidden = false;
    }
  }

  /* -------------------------------------------------------- experiencias */
  function tarjeta(exp, esLibre) {
    var li = crear("li", "regalo" + (esLibre ? " regalo--libre" : ""));
    li.dataset.id = exp.id || "libre";

    var emoji = crear("div", "regalo__emoji", exp.emoji || "🎁");
    emoji.setAttribute("aria-hidden", "true");
    li.appendChild(emoji);

    li.appendChild(crear("h3", "regalo__titulo", exp.titulo));
    li.appendChild(crear("p", "regalo__texto", exp.descripcion || ""));

    if (exp.monto != null) {
      var monto = crear("div", "regalo__monto", pesos.format(exp.monto));
      monto.appendChild(crear("span", null, exp.aporteParcial ? " en total" : " aprox."));
      li.appendChild(monto);
    }

    // Los regalos caros no se esperan completos de una persona: se avisa.
    if (exp.aporteParcial) {
      li.appendChild(crear("p", "regalo__parcial", "Este se junta entre varios: aporta lo que quieras."));
    }

    var boton = crear("button", "boton boton--primario regalo__boton", "Aportar a esto");
    boton.type = "button";
    boton.addEventListener("click", function () { elegir(exp, li); });
    li.appendChild(boton);

    return li;
  }

  function pintarExperiencias() {
    var ul = $("#r-lista");
    (D.experiencias || []).forEach(function (exp) { ul.appendChild(tarjeta(exp, false)); });

    var libre = D.aporteLibre;
    if (libre && libre.activo) {
      ul.appendChild(tarjeta({
        id: "libre", emoji: libre.emoji, titulo: libre.titulo,
        descripcion: libre.descripcion, monto: null
      }, true));
    }
  }

  function elegir(exp, li) {
    elegido = exp;
    Array.prototype.forEach.call(document.querySelectorAll(".regalo"), function (n) {
      n.classList.toggle("es-elegido", n === li);
    });
    $("#r-elegido").hidden = false;
    $("#r-elegido-nombre").textContent = exp.titulo;
    actualizarGlosa();
    document.getElementById("aportar").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function quitarEleccion() {
    elegido = null;
    Array.prototype.forEach.call(document.querySelectorAll(".regalo"), function (n) {
      n.classList.remove("es-elegido");
    });
    $("#r-elegido").hidden = true;
    actualizarGlosa();
    document.getElementById("lista").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  /* ---------------------------------------------------- datos de la cuenta */
  var filaGlosa = null;

  function textoGlosa() {
    var plantilla = D.transferencia.glosa || "{experiencia} · {nombre}";
    return plantilla
      .replace("{experiencia}", elegido ? elegido.titulo : "Regalo de matrimonio")
      .replace("{nombre}", nombreInvitado || "tu nombre")
      .trim();
  }

  function actualizarGlosa() {
    if (filaGlosa) filaGlosa.textContent = textoGlosa();
  }

  function fila(etiqueta, valor, id) {
    var div = crear("div", "dato");
    var texto = crear("div", "dato__texto");
    texto.appendChild(crear("dt", null, etiqueta));
    var dd = crear("dd", null, valor);
    if (id) dd.id = id;
    texto.appendChild(dd);
    div.appendChild(texto);

    var boton = crear("button", "dato__copiar", "Copiar");
    boton.type = "button";
    boton.setAttribute("aria-label", "Copiar " + etiqueta.toLowerCase());
    boton.addEventListener("click", function () {
      copiar(dd.textContent, boton, etiqueta + " copiado");
    });
    div.appendChild(boton);
    return { nodo: div, dd: dd };
  }

  function pintarDatos() {
    var t = D.transferencia || {};

    if (t.publica === false) {
      $("#r-datos-publicos").hidden = true;
      $("#r-datos-privados").hidden = false;
      $("#r-contacto").textContent = t.contacto || "Escríbenos y te pasamos los datos.";
      return;
    }

    var dl = $("#r-datos");
    [
      ["Titular", t.titular],
      ["RUT", t.rut],
      ["Banco", t.banco],
      ["Tipo de cuenta", t.tipoCuenta],
      ["N.º de cuenta", t.numero],
      ["Correo", t.correo]
    ].forEach(function (par) {
      if (!par[1]) return;
      dl.appendChild(fila(par[0], par[1]).nodo);
    });

    // Campo para que el invitado ponga su nombre en el comentario.
    var caja = crear("div", "dato");
    var texto = crear("div", "dato__texto");
    texto.appendChild(crear("dt", null, "Comentario de la transferencia"));
    var dd = crear("dd", null, textoGlosa());
    texto.appendChild(dd);
    caja.appendChild(texto);
    var botonG = crear("button", "dato__copiar", "Copiar");
    botonG.type = "button";
    botonG.setAttribute("aria-label", "Copiar el comentario de la transferencia");
    botonG.addEventListener("click", function () { copiar(dd.textContent, botonG, "Comentario copiado"); });
    caja.appendChild(botonG);
    dl.appendChild(caja);
    filaGlosa = dd;

    var campo = crear("div", "dato");
    var envoltorio = crear("div", "dato__texto");
    var etiqueta = crear("dt");
    var label = crear("label", null, "Tu nombre, para saber de quién es");
    label.setAttribute("for", "r-nombre-invitado");
    etiqueta.appendChild(label);
    envoltorio.appendChild(etiqueta);
    var ddc = crear("dd");
    var input = document.createElement("input");
    input.type = "text";
    input.id = "r-nombre-invitado";
    input.placeholder = "Nombre y apellido";
    input.autocomplete = "name";
    input.style.cssText = "width:100%;font:inherit;padding:.4rem .6rem;border-radius:10px;" +
      "border:2px solid rgba(58,46,38,.18);background:#fff;color:inherit";
    input.addEventListener("input", function () {
      nombreInvitado = input.value.trim();
      actualizarGlosa();
    });
    ddc.appendChild(input);
    envoltorio.appendChild(ddc);
    campo.appendChild(envoltorio);
    dl.appendChild(campo);

    $("#r-copiar-todo").addEventListener("click", function () {
      var lineas = [
        t.titular && "Titular: " + t.titular,
        t.rut && "RUT: " + t.rut,
        t.banco && "Banco: " + t.banco,
        t.tipoCuenta && "Tipo de cuenta: " + t.tipoCuenta,
        t.numero && "Cuenta: " + t.numero,
        t.correo && "Correo: " + t.correo,
        "Comentario: " + textoGlosa()
      ].filter(Boolean);
      copiar(lineas.join("\n"), $("#r-copiar-todo"), "Datos copiados");
    });
  }

  /* --------------------------------------------------------- portapapeles */
  function avisar(mensaje, esError) {
    var aviso = $("#r-aviso");
    aviso.textContent = mensaje;
    aviso.classList.toggle("es-error", !!esError);
  }

  // Intenta la API moderna y, si el navegador no la deja (pasa en http y en
  // algunos navegadores antiguos), cae a seleccionar el texto a mano.
  function copiar(texto, boton, mensajeOk) {
    function ok() {
      avisar("✓ " + mensajeOk);
      if (boton) {
        boton.classList.add("es-copiado");
        var antes = boton.textContent;
        boton.textContent = "Copiado";
        setTimeout(function () {
          boton.classList.remove("es-copiado");
          boton.textContent = antes;
        }, 1800);
      }
    }
    function falla() {
      avisar("No pude copiar solo. Selecciona el texto y cópialo a mano.", true);
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(ok, function () { respaldo(texto, ok, falla); });
    } else {
      respaldo(texto, ok, falla);
    }
  }

  function respaldo(texto, ok, falla) {
    try {
      var area = document.createElement("textarea");
      area.value = texto;
      area.setAttribute("readonly", "");
      area.style.cssText = "position:fixed;top:-1000px;opacity:0";
      document.body.appendChild(area);
      area.select();
      var logrado = document.execCommand && document.execCommand("copy");
      document.body.removeChild(area);
      logrado ? ok() : falla();
    } catch (e) {
      falla();
    }
  }

  /* --------------------------------------------------------------- bancos */
  function pintarBancos() {
    var caja = $("#r-bancos");
    (D.bancos || []).forEach(function (b) {
      if (!b.url) return;
      var a = crear("a", "banco", b.nombre);
      a.href = b.url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.setAttribute("aria-label", "Abrir el sitio de " + b.nombre + " en una pestaña nueva");
      caja.appendChild(a);
    });
  }

  /* -------------------------------------------------------------- tarjeta */
  function pintarTarjeta() {
    var p = D.pagoTarjeta || {};
    if (!p.url) return;                       // sin enlace, no se muestra nada
    $("#r-forma-tarjeta").hidden = false;
    $("#r-tarjeta-nota").textContent = p.nota || "";
    $("#r-tarjeta-proveedor").textContent = p.proveedor ? "Vas a pagar a través de " + p.proveedor + "." : "";
    var boton = $("#r-tarjeta-boton");
    boton.href = p.url;
    boton.textContent = p.etiqueta || "Pagar con tarjeta";
  }

  /* ----------------------------------------------------------------- init */
  pintarCabecera();
  pintarExperiencias();
  pintarDatos();
  pintarBancos();
  pintarTarjeta();
  $("#r-elegido-quitar").addEventListener("click", quitarEleccion);
})();
