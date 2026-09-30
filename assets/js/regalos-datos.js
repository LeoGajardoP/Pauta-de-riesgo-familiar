/* ===========================================================================
 *  regalos-datos.js — TODO lo editable de la lista de regalos está aquí.
 *
 *  ⚠️  Los montos, las experiencias y —sobre todo— LOS DATOS BANCARIOS de abajo
 *      son de ejemplo. Yo no conozco los tuyos y no me los invento: cámbialos.
 *      Mientras diga "EJEMPLO" o "0000", nadie puede transferir.
 *
 *  ⚠️  Ten presente que esta página es pública: cualquiera con el enlace ve el
 *      número de cuenta. Es lo normal en una lista de novios, pero decídelo a
 *      conciencia. Si prefieres no publicarlo, deja `transferencia.publica` en
 *      false y la sección pedirá escribirles a ustedes por el dato.
 * ======================================================================== */

window.REGALOS = {

  /* --------------------------------------------------------------- Pareja */
  pareja: {
    novio: "Leo",
    novia: "Dani",
    fecha: "2027-02-15",
    hashtag: "#LeoYDani",
    // Enlace de vuelta a la app de la boda. Vacío ("") = no se muestra.
    volverA: "",
  },

  /* ---------------------------------------------------------- Encabezado */
  intro: {
    kicker: "Lista de regalos",
    titulo: "Regálanos una experiencia",
    // ⚠️ Texto de ejemplo: cámbialo por el suyo.
    bajada: "Ya tenemos la juguera, el tostador y tres sets de toallas. Lo que " +
      "no tenemos todavía son estos recuerdos. Si quieres regalarnos algo, elige " +
      "una de estas experiencias y ayúdanos a hacerla real.",
    nota: "Ojo: esto es una idea, no una lista de precios ni una obligación. " +
      "Que vengas a la fiesta ya es el regalo.",
  },

  /* ---------------------------------------------------------- Experiencias */
  // monto en pesos chilenos. Puedes poner cualquier cantidad de experiencias.
  // Si prefieres no mostrar el monto de alguna, pon monto: null.
  experiencias: [
    {
      id: "cena",
      emoji: "🍷",
      titulo: "Una cena romántica",
      descripcion: "De esas con mantel largo, mesa junto a la ventana y nadie mirando el celular.",
      monto: 90000,          // EJEMPLO
    },
    {
      id: "sur",
      emoji: "🌲",
      titulo: "Un viaje al sur",
      descripcion: "Cabaña, lluvia en el techo, termas y un libro que no vamos a terminar.",
      monto: 250000,         // EJEMPLO
    },
    {
      id: "estanque",
      emoji: "⛽",
      titulo: "La llenada del estanque",
      descripcion: "El regalo menos romántico y el más necesario: lo que nos lleva a todos lados.",
      monto: 45000,          // EJEMPLO
    },
    {
      id: "desayuno",
      emoji: "🥐",
      titulo: "Desayuno en la cama",
      descripcion: "Un domingo entero sin levantarse, con café de verdad y pan recién comprado.",
      monto: 30000,          // EJEMPLO
    },
    {
      id: "masaje",
      emoji: "💆",
      titulo: "Un día de spa para los dos",
      descripcion: "Después de organizar un matrimonio, esto es casi una indicación médica.",
      monto: 120000,         // EJEMPLO
    },
    {
      id: "concierto",
      emoji: "🎸",
      titulo: "Entradas a un concierto",
      descripcion: "Ver en vivo a esa banda que escuchamos en cada viaje en auto.",
      monto: 80000,          // EJEMPLO
    },
    {
      id: "fotos",
      emoji: "📷",
      titulo: "Una sesión de fotos",
      descripcion: "Para tener una foto juntos que no sea una selfie con el brazo estirado.",
      monto: 150000,         // EJEMPLO
    },
    {
      id: "arbol",
      emoji: "🌳",
      titulo: "Un árbol para la casa",
      descripcion: "Uno que plantemos el primer año y nos dé sombra en veinte más.",
      monto: 35000,          // EJEMPLO
    },
  ],

  /* --------------------------------------------------------- Aporte libre */
  aporteLibre: {
    activo: true,
    emoji: "💛",
    titulo: "El monto que tú quieras",
    descripcion: "Si prefieres no elegir ninguna experiencia en particular, también vale. " +
      "Lo juntamos todo para la luna de miel.",
  },

  /* --------------------------------------------------------- Transferencia */
  transferencia: {
    // false = no se muestran los datos y se pide escribirles a ustedes.
    publica: true,
    titular: "EJEMPLO — Nombre y apellido del titular",
    rut: "00.000.000-0",                 // EJEMPLO
    banco: "EJEMPLO — Nombre del banco",
    tipoCuenta: "Cuenta corriente",
    numero: "0000000000",                // EJEMPLO
    correo: "ejemplo@correo.cl",         // EJEMPLO — al que llega el comprobante
    // Qué pedimos que escriban en el comentario/glosa de la transferencia.
    // {experiencia} se reemplaza por el regalo elegido.
    glosa: "{experiencia} · {nombre}",
    contacto: "Escríbenos por WhatsApp y te pasamos los datos.", // si publica = false
  },

  /* ------------------------------------------------------------- Bancos */
  // ⚠️ VERIFICA ESTAS DIRECCIONES antes de publicar. Las escribí de memoria y
  //    no pude comprobarlas desde donde trabajo (la red de aquí bloquea los
  //    sitios de bancos). Hay un comando para revisarlas todas de una vez:
  //        node tools/revisar-enlaces.mjs
  //    Un botón que lleva a un sitio caído el día del evento es peor que no
  //    tener el botón.
  //
  //    El botón SOLO abre la web del banco. No transfiere nada ni lleva datos:
  //    el invitado entra a su banco y pega los datos que copió aquí.
  bancos: [
    { nombre: "Banco de Chile",  url: "https://www.bancochile.cl" },
    { nombre: "BancoEstado",     url: "https://www.bancoestado.cl" },
    { nombre: "Santander",       url: "https://www.santander.cl" },
    { nombre: "BCI",             url: "https://www.bci.cl" },
    { nombre: "Scotiabank",      url: "https://www.scotiabankchile.cl" },
    { nombre: "Itaú",            url: "https://www.itau.cl" },
    { nombre: "Banco Falabella", url: "https://www.bancofalabella.cl" },
    { nombre: "Banco Ripley",    url: "https://www.bancoripley.cl" },
    { nombre: "Banco Security",  url: "https://www.security.cl" },
    { nombre: "Banco BICE",      url: "https://www.bice.cl" },
    { nombre: "Banco Consorcio", url: "https://www.consorcio.cl" },
    { nombre: "Coopeuch",        url: "https://www.coopeuch.cl" },
    { nombre: "Tenpo",           url: "https://www.tenpo.cl" },
    { nombre: "Mercado Pago",    url: "https://www.mercadopago.cl" },
  ],

  /* -------------------------------------------------------- Pago con tarjeta */
  // Para cobrar con tarjeta hace falta un enlace de pago externo. Esta página
  // no procesa pagos ni puede hacerlo: solo abre el enlace que pegues aquí.
  // Mientras `url` esté vacío, la sección de tarjeta no aparece.
  //
  // Opciones reales en Chile (revisa comisiones y requisitos tú mismo, cambian):
  //   · Link de Pago Webpay.cl, de Transbank  -> https://publico.transbank.cl/link-de-pago
  //   · Flow                                   -> https://www.flow.cl
  //   · Mercado Pago                           -> https://www.mercadopago.cl
  //   · Khipu (transferencia, no tarjeta)      -> https://khipu.com
  pagoTarjeta: {
    url: "",                                  // p. ej. tu link de Webpay.cl
    etiqueta: "Pagar con tarjeta",
    proveedor: "",                            // "Webpay", "Flow", "Mercado Pago"…
    nota: "Te lleva al sitio del medio de pago. Nosotros no vemos ni guardamos " +
      "los datos de tu tarjeta.",
  },

  /* ------------------------------------------------------------- Cierre */
  cierre: {
    titulo: "Gracias, de verdad",
    texto: "Cada uno de estos regalos va a terminar en una foto que te vamos a mostrar. " +
      "Nos vemos el 15 de febrero.",
  },
};
