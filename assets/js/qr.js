/*
 * qr.js — Generador de códigos QR (modo byte, versiones 1 a 10).
 *
 * Implementación propia y sin dependencias: la app necesita generar el QR de
 * las fotos aunque el salón no tenga internet, así que no se puede depender
 * de un servicio externo ni de un CDN.
 *
 * Cobertura: modo byte (UTF-8), versiones 1-10, niveles de corrección L/M/Q/H.
 * A nivel M eso permite hasta 216 bytes, de sobra para una URL.
 *
 * Verificado contra la librería `qrcode` de Python (ver tools/verificar-qr.mjs).
 *
 * Uso:  QR.svg("https://...", { ecc: "M", margen: 4 })  -> string con un <svg>
 *       QR.matriz("https://...")                        -> array 2D de 0/1
 */
(function (global) {
  "use strict";

  // [codewords de corrección por bloque, [[nº de bloques, codewords de datos por bloque], ...]]
  // Tabla oficial ISO/IEC 18004 para versiones 1-10.
  var BLOQUES = {
    L: [
      [7, [[1, 19]]], [10, [[1, 34]]], [15, [[1, 55]]], [20, [[1, 80]]], [26, [[1, 108]]],
      [18, [[2, 68]]], [20, [[2, 78]]], [24, [[2, 97]]], [30, [[2, 116]]], [18, [[2, 68], [2, 69]]]
    ],
    M: [
      [10, [[1, 16]]], [16, [[1, 28]]], [26, [[1, 44]]], [18, [[2, 32]]], [24, [[2, 43]]],
      [16, [[4, 27]]], [18, [[4, 31]]], [22, [[2, 38], [2, 39]]], [22, [[3, 36], [2, 37]]], [26, [[4, 43], [1, 44]]]
    ],
    Q: [
      [13, [[1, 13]]], [22, [[1, 22]]], [18, [[2, 17]]], [26, [[2, 24]]], [18, [[2, 15], [2, 16]]],
      [24, [[4, 19]]], [18, [[2, 14], [4, 15]]], [22, [[4, 18], [2, 19]]], [20, [[4, 16], [4, 17]]], [24, [[6, 19], [2, 20]]]
    ],
    H: [
      [17, [[1, 9]]], [28, [[1, 16]]], [22, [[2, 13]]], [16, [[4, 9]]], [22, [[2, 11], [2, 12]]],
      [28, [[4, 15]]], [26, [[4, 13], [1, 14]]], [26, [[4, 14], [2, 15]]], [24, [[4, 12], [4, 13]]], [28, [[6, 15], [2, 16]]]
    ]
  };

  // Centros de los patrones de alineación por versión (índice = versión - 1).
  var ALINEACION = [
    [], [6, 18], [6, 22], [6, 26], [6, 30],
    [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]
  ];

  var NIVEL_BITS = { L: 1, M: 0, Q: 3, H: 2 }; // codificación del nivel en el formato

  // ---------------------------------------------------------------- GF(256)
  var EXP = new Uint8Array(512);
  var LOG = new Uint8Array(256);
  (function initGF() {
    var x = 1;
    for (var i = 0; i < 255; i++) {
      EXP[i] = x;
      LOG[x] = i;
      x <<= 1;
      if (x & 0x100) x ^= 0x11d; // polinomio primitivo x^8+x^4+x^3+x^2+1
    }
    for (var j = 255; j < 512; j++) EXP[j] = EXP[j - 255];
  })();

  function gfMul(a, b) {
    if (a === 0 || b === 0) return 0;
    return EXP[LOG[a] + LOG[b]];
  }

  // Polinomio generador de grado `grado`.
  function generador(grado) {
    var poly = [1];
    for (var i = 0; i < grado; i++) {
      var next = new Array(poly.length + 1).fill(0);
      for (var j = 0; j < poly.length; j++) {
        next[j] ^= poly[j];
        next[j + 1] ^= gfMul(poly[j], EXP[i]);
      }
      poly = next;
    }
    return poly;
  }

  // Codewords de corrección de errores Reed-Solomon para un bloque de datos.
  function corregir(datos, numEC) {
    var gen = generador(numEC);
    var resto = new Array(datos.length + numEC).fill(0);
    for (var i = 0; i < datos.length; i++) resto[i] = datos[i];
    for (var k = 0; k < datos.length; k++) {
      var factor = resto[k];
      if (factor === 0) continue;
      for (var j = 1; j < gen.length; j++) {
        resto[k + j] ^= gfMul(gen[j], factor);
      }
    }
    return resto.slice(datos.length);
  }

  // ------------------------------------------------------------------- BCH
  function bch(valor, generador_, gradoGen) {
    var v = valor << gradoGen;
    var genBits = gradoGen + 1;
    while (bitLength(v) >= genBits) {
      v ^= generador_ << (bitLength(v) - genBits);
    }
    return (valor << gradoGen) | v;
  }

  function bitLength(n) {
    var len = 0;
    while (n !== 0) { len++; n >>>= 1; }
    return len;
  }

  function bitsFormato(nivel, mascara) {
    var datos = (NIVEL_BITS[nivel] << 3) | mascara;
    return bch(datos, 0x537, 10) ^ 0x5412;
  }

  function bitsVersion(version) {
    return bch(version, 0x1f25, 12);
  }

  // ------------------------------------------------------------- Codificación
  function utf8(texto) {
    var bytes = [];
    var codificado = unescape(encodeURIComponent(texto));
    for (var i = 0; i < codificado.length; i++) bytes.push(codificado.charCodeAt(i) & 0xff);
    return bytes;
  }

  function capacidadDatos(version, nivel) {
    var info = BLOQUES[nivel][version - 1];
    var total = 0;
    info[1].forEach(function (g) { total += g[0] * g[1]; });
    return total;
  }

  function elegirVersion(numBytes, nivel) {
    for (var v = 1; v <= 10; v++) {
      var bitsCabecera = 4 + (v <= 9 ? 8 : 16);
      if (bitsCabecera + numBytes * 8 <= capacidadDatos(v, nivel) * 8) return v;
    }
    return null;
  }

  function codewordsDatos(bytes, version, nivel) {
    var bits = [];
    function push(valor, n) {
      for (var i = n - 1; i >= 0; i--) bits.push((valor >>> i) & 1);
    }
    push(0b0100, 4);                       // modo byte
    push(bytes.length, version <= 9 ? 8 : 16);
    bytes.forEach(function (b) { push(b, 8); });

    var capacidadBits = capacidadDatos(version, nivel) * 8;
    var terminador = Math.min(4, capacidadBits - bits.length);
    push(0, terminador);
    while (bits.length % 8 !== 0) bits.push(0);

    var cws = [];
    for (var i = 0; i < bits.length; i += 8) {
      var b = 0;
      for (var j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      cws.push(b);
    }
    var relleno = [0xec, 0x11];
    var k = 0;
    while (cws.length < capacidadDatos(version, nivel)) cws.push(relleno[k++ % 2]);
    return cws;
  }

  // Divide en bloques, calcula corrección e intercala según la norma.
  function secuenciaFinal(cws, version, nivel) {
    var info = BLOQUES[nivel][version - 1];
    var numEC = info[0];
    var bloquesDatos = [];
    var bloquesEC = [];
    var offset = 0;
    info[1].forEach(function (grupo) {
      for (var i = 0; i < grupo[0]; i++) {
        var datos = cws.slice(offset, offset + grupo[1]);
        offset += grupo[1];
        bloquesDatos.push(datos);
        bloquesEC.push(corregir(datos, numEC));
      }
    });

    var salida = [];
    var maxDatos = Math.max.apply(null, bloquesDatos.map(function (b) { return b.length; }));
    for (var i = 0; i < maxDatos; i++) {
      for (var j = 0; j < bloquesDatos.length; j++) {
        if (i < bloquesDatos[j].length) salida.push(bloquesDatos[j][i]);
      }
    }
    for (var e = 0; e < numEC; e++) {
      for (var b = 0; b < bloquesEC.length; b++) salida.push(bloquesEC[b][e]);
    }
    return salida;
  }

  // --------------------------------------------------------------- Matriz
  function nuevaMatriz(tam) {
    var m = [];
    for (var i = 0; i < tam; i++) m.push(new Array(tam).fill(null));
    return m;
  }

  function ponerFinder(m, fila, col) {
    for (var r = -1; r <= 7; r++) {
      for (var c = -1; c <= 7; c++) {
        var y = fila + r, x = col + c;
        if (y < 0 || y >= m.length || x < 0 || x >= m.length) continue;
        var borde = (r === 0 || r === 6) && c >= 0 && c <= 6;
        var lado = (c === 0 || c === 6) && r >= 0 && r <= 6;
        var centro = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        m[y][x] = (borde || lado || centro) ? 1 : 0;
      }
    }
  }

  function ponerAlineacion(m, version) {
    var centros = ALINEACION[version - 1];
    for (var i = 0; i < centros.length; i++) {
      for (var j = 0; j < centros.length; j++) {
        var fila = centros[i], col = centros[j];
        if (m[fila][col] !== null) continue; // choca con un finder
        for (var r = -2; r <= 2; r++) {
          for (var c = -2; c <= 2; c++) {
            var borde = Math.max(Math.abs(r), Math.abs(c));
            m[fila + r][col + c] = (borde !== 1) ? 1 : 0;
          }
        }
      }
    }
  }

  function ponerTiming(m) {
    for (var i = 8; i < m.length - 8; i++) {
      var v = (i % 2 === 0) ? 1 : 0;
      if (m[6][i] === null) m[6][i] = v;
      if (m[i][6] === null) m[i][6] = v;
    }
  }

  function reservarFormato(m) {
    var tam = m.length;
    for (var i = 0; i <= 8; i++) {
      if (m[8][i] === null) m[8][i] = 0;
      if (m[i][8] === null) m[i][8] = 0;
    }
    for (var j = 0; j < 8; j++) {
      if (m[8][tam - 1 - j] === null) m[8][tam - 1 - j] = 0;
      if (m[tam - 1 - j][8] === null) m[tam - 1 - j][8] = 0;
    }
    m[tam - 8][8] = 1; // módulo oscuro fijo
  }

  function escribirFormato(m, nivel, mascara) {
    var bits = bitsFormato(nivel, mascara);
    var tam = m.length;
    for (var i = 0; i < 15; i++) {
      var bit = (bits >>> i) & 1;
      // copia 1: alrededor del finder superior izquierdo
      if (i < 6) m[i][8] = bit;
      else if (i < 8) m[i + 1][8] = bit;
      else if (i === 8) m[8][7] = bit;
      else m[8][14 - i] = bit;
      // copia 2: bajo el finder superior derecho / a la derecha del inferior izquierdo
      if (i < 8) m[8][tam - 1 - i] = bit;
      else m[tam - 15 + i][8] = bit;
    }
  }

  function escribirVersion(m, version) {
    if (version < 7) return;
    var bits = bitsVersion(version);
    var tam = m.length;
    for (var i = 0; i < 18; i++) {
      var bit = (bits >>> i) & 1;
      var fila = Math.floor(i / 3);
      var col = i % 3;
      m[fila][tam - 11 + col] = bit;
      m[tam - 11 + col][fila] = bit;
    }
  }

  function esFuncion(reservada, y, x) { return reservada[y][x]; }

  function colocarDatos(m, reservada, secuencia) {
    var tam = m.length;
    var bitIndex = 0;
    var totalBits = secuencia.length * 8;
    var subiendo = true;
    for (var col = tam - 1; col > 0; col -= 2) {
      if (col === 6) col--; // la columna de timing no cuenta
      for (var paso = 0; paso < tam; paso++) {
        var fila = subiendo ? tam - 1 - paso : paso;
        for (var d = 0; d < 2; d++) {
          var x = col - d;
          if (esFuncion(reservada, fila, x)) continue;
          var bit = 0;
          if (bitIndex < totalBits) {
            bit = (secuencia[bitIndex >>> 3] >>> (7 - (bitIndex & 7))) & 1;
          }
          m[fila][x] = bit;
          bitIndex++;
        }
      }
      subiendo = !subiendo;
    }
  }

  function aplicarMascara(m, reservada, mascara) {
    var tam = m.length;
    for (var y = 0; y < tam; y++) {
      for (var x = 0; x < tam; x++) {
        if (reservada[y][x]) continue;
        var invertir;
        switch (mascara) {
          case 0: invertir = (y + x) % 2 === 0; break;
          case 1: invertir = y % 2 === 0; break;
          case 2: invertir = x % 3 === 0; break;
          case 3: invertir = (y + x) % 3 === 0; break;
          case 4: invertir = (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0; break;
          case 5: invertir = ((y * x) % 2) + ((y * x) % 3) === 0; break;
          case 6: invertir = (((y * x) % 2) + ((y * x) % 3)) % 2 === 0; break;
          default: invertir = (((y + x) % 2) + ((y * x) % 3)) % 2 === 0; break;
        }
        if (invertir) m[y][x] ^= 1;
      }
    }
  }

  function penalizacion(m) {
    var tam = m.length, total = 0, y, x;

    // Regla 1: rachas de 5 o más módulos iguales.
    function rachas(get) {
      var p = 0;
      for (var i = 0; i < tam; i++) {
        var run = 1;
        for (var j = 1; j < tam; j++) {
          if (get(i, j) === get(i, j - 1)) {
            run++;
            if (run === 5) p += 3;
            else if (run > 5) p += 1;
          } else run = 1;
        }
      }
      return p;
    }
    total += rachas(function (i, j) { return m[i][j]; });
    total += rachas(function (i, j) { return m[j][i]; });

    // Regla 2: bloques de 2x2 del mismo color.
    for (y = 0; y < tam - 1; y++) {
      for (x = 0; x < tam - 1; x++) {
        var v = m[y][x];
        if (v === m[y][x + 1] && v === m[y + 1][x] && v === m[y + 1][x + 1]) total += 3;
      }
    }

    // Regla 3: patrones tipo finder (1:1:3:1:1 con zona clara).
    var patronA = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
    var patronB = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
    function coincide(y0, x0, dy, dx, patron) {
      for (var k = 0; k < 11; k++) {
        var yy = y0 + dy * k, xx = x0 + dx * k;
        if (m[yy][xx] !== patron[k]) return false;
      }
      return true;
    }
    for (y = 0; y < tam; y++) {
      for (x = 0; x < tam; x++) {
        if (x + 10 < tam) {
          if (coincide(y, x, 0, 1, patronA)) total += 40;
          if (coincide(y, x, 0, 1, patronB)) total += 40;
        }
        if (y + 10 < tam) {
          if (coincide(y, x, 1, 0, patronA)) total += 40;
          if (coincide(y, x, 1, 0, patronB)) total += 40;
        }
      }
    }

    // Regla 4: desviación respecto al 50% de módulos oscuros.
    var oscuros = 0;
    for (y = 0; y < tam; y++) for (x = 0; x < tam; x++) oscuros += m[y][x];
    var porcentaje = (oscuros * 100) / (tam * tam);
    total += Math.floor(Math.abs(porcentaje - 50) / 5) * 10;

    return total;
  }

  function construir(texto, opciones) {
    opciones = opciones || {};
    var nivel = (opciones.ecc || "M").toUpperCase();
    if (!BLOQUES[nivel]) throw new Error("Nivel de corrección desconocido: " + nivel);

    var bytes = utf8(String(texto));
    var version = opciones.version || elegirVersion(bytes.length, nivel);
    if (!version) {
      throw new Error("Texto demasiado largo para las versiones soportadas (1-10)");
    }

    var secuencia = secuenciaFinal(codewordsDatos(bytes, version, nivel), version, nivel);
    var tam = version * 4 + 17;

    var base = nuevaMatriz(tam);
    ponerFinder(base, 0, 0);
    ponerFinder(base, 0, tam - 7);
    ponerFinder(base, tam - 7, 0);
    ponerAlineacion(base, version);
    ponerTiming(base);
    escribirVersion(base, version);
    reservarFormato(base);

    // Todo lo escrito hasta aquí son patrones de función: no se enmascara ni
    // se sobrescribe con datos.
    var reservada = base.map(function (fila) {
      return fila.map(function (v) { return v !== null; });
    });

    // Con `opciones.mascara` se fuerza una máscara concreta (lo usa la
    // verificación contra la implementación de referencia).
    var candidatas = (opciones.mascara == null) ? [0, 1, 2, 3, 4, 5, 6, 7] : [opciones.mascara];

    var mejor = null;
    for (var i = 0; i < candidatas.length; i++) {
      var mascara = candidatas[i];
      var m = base.map(function (fila) { return fila.slice(); });
      colocarDatos(m, reservada, secuencia);
      aplicarMascara(m, reservada, mascara);
      escribirFormato(m, nivel, mascara);
      var p = penalizacion(m);
      if (mejor === null || p < mejor.penalizacion) {
        mejor = { matriz: m, penalizacion: p, mascara: mascara };
      }
    }
    mejor.version = version;
    mejor.nivel = nivel;
    return mejor;
  }

  function matriz(texto, opciones) {
    return construir(texto, opciones).matriz;
  }

  function svg(texto, opciones) {
    opciones = opciones || {};
    var margen = opciones.margen == null ? 4 : opciones.margen;
    var claro = opciones.claro || "#ffffff";
    var oscuro = opciones.oscuro || "#1d1440";
    var m = matriz(texto, opciones);
    var tam = m.length + margen * 2;

    var camino = [];
    for (var y = 0; y < m.length; y++) {
      for (var x = 0; x < m.length; x++) {
        if (m[y][x]) camino.push("M" + (x + margen) + " " + (y + margen) + "h1v1h-1z");
      }
    }

    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + tam + " " + tam + '" ' +
      'shape-rendering="crispEdges" role="img" aria-label="' +
      (opciones.etiqueta || "Código QR") + '">' +
      '<rect width="' + tam + '" height="' + tam + '" fill="' + claro + '"/>' +
      '<path d="' + camino.join("") + '" fill="' + oscuro + '"/>' +
      "</svg>";
  }

  var API = { svg: svg, matriz: matriz, construir: construir };

  if (typeof module !== "undefined" && module.exports) module.exports = API;
  global.QR = API;
})(typeof window !== "undefined" ? window : globalThis);
