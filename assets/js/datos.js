/* ===========================================================================
 *  datos.js — TODO lo editable de la boda está en este archivo.
 *
 *  ⚠️  IMPORTANTE: los textos, nombres, horarios y mesas de abajo son DATOS DE
 *      EJEMPLO. Yo no conozco los datos reales de Leo y Dani, así que no me los
 *      inventé como si fueran ciertos: están puestos como plantilla para que los
 *      reemplaces. Todo lo que diga "EJEMPLO" hay que cambiarlo.
 *
 *  No hace falta tocar ningún otro archivo para personalizar la boda.
 * ======================================================================== */

window.DATOS = {

  /* ---------------------------------------------------------------- Evento */
  evento: {
    novia: "Dani",
    novio: "Leo",
    // Formato YYYY-MM-DD. Se usa para la cuenta regresiva y para el modo en vivo.
    fecha: "2027-02-15",                       // lunes 15 de febrero de 2027
    horaCeremonia: "17:00",                    // EJEMPLO
    lugar: "Casona Las Buganvilias",           // EJEMPLO
    ciudad: "Olmué, Región de Valparaíso",     // EJEMPLO
    direccion: "Camino El Olivar 1450, Olmué", // EJEMPLO
    // Enlace del mapa. Déjalo vacío ("") para que no aparezca el botón.
    mapa: "",                                  // EJEMPLO: pega aquí el link de Google Maps
    hashtag: "#LeoYDani",
    codigoVestimenta: "Formal de verano · tonos tierra, mostaza y burdeos bienvenidos", // EJEMPLO
  },

  /* -------------------------------------------------------------- Nosotros */
  // ⚠️ Texto de ejemplo. No sé la historia real de Leo y Dani: reemplázalo.
  nosotros: {
    titulo: "Leo & Dani",
    bajada: "Dos personas, un montón de historias y una fiesta que llevamos tiempo imaginando.",
    parrafos: [
      "EJEMPLO — Aquí va cómo se conocieron: el año, el lugar, quién habló primero y quién tardó tres semanas en responder el mensaje.",
      "EJEMPLO — Aquí va lo que hicieron juntos desde entonces: los viajes, la mudanza, la mascota, la manía compartida.",
      "EJEMPLO — Y aquí, por qué eligieron este lugar y esta fecha para casarse, y qué significa que estés en esta fiesta.",
    ],
    // Tarjetitas cortas. Pon las que quieras (o deja la lista vacía: []).
    fichas: [
      { emoji: "📍", titulo: "Nos conocimos en", texto: "EJEMPLO — un asado al que ninguno quería ir" },
      { emoji: "🎶", titulo: "Nuestra canción", texto: "EJEMPLO — la que suena en cada viaje" },
      { emoji: "🐕", titulo: "El tercero en discordia", texto: "EJEMPLO — quien manda de verdad en la casa" },
      { emoji: "🍕", titulo: "Plan favorito", texto: "EJEMPLO — jueves de pizza y serie" },
    ],
    // Ruta a una foto propia, p. ej. "assets/img/leo-y-dani.jpg".
    // Si la dejas vacía se muestra un degradado con las iniciales.
    foto: "",
  },

  /* ------------------------------------------------------------ Itinerario */
  // Ordénalo por hora. Las horas después de medianoche (00:00–05:59) se
  // entienden como de la madrugada siguiente al día de la boda.
  itinerario: [
    { hora: "16:30", titulo: "Llegada de invitados", detalle: "Recepción con limonada de menta y sombra asegurada.", emoji: "🌿" },
    { hora: "17:00", titulo: "Ceremonia", detalle: "En el jardín de los naranjos. Puntualidad, por favor.", emoji: "💍" },
    { hora: "17:45", titulo: "Brindis y fotos", detalle: "Cóctel en la terraza mientras robamos a la familia para las fotos.", emoji: "🥂" },
    { hora: "19:00", titulo: "Cena", detalle: "Busca tu mesa en la sección Mesas de esta app.", emoji: "🍽️" },
    { hora: "21:00", titulo: "Primer baile", detalle: "Y después, la pista es de todos.", emoji: "💃" },
    { hora: "21:30", titulo: "Torta y postres", detalle: "Mesa dulce abierta toda la noche.", emoji: "🍰" },
    { hora: "22:00", titulo: "Fiesta", detalle: "DJ hasta que aguanten los pies.", emoji: "🎉" },
    { hora: "01:30", titulo: "Cierre", detalle: "Último brindis y a casa con los zapatos en la mano.", emoji: "🌙" },
  ],

  /* ----------------------------------------------------------------- Mesas */
  // x e y son porcentajes (0-100) dentro del plano del salón: x = izquierda a
  // derecha, y = arriba (escenario/novios) hacia abajo (entrada).
  // forma: "redonda" | "larga" | "honor"
  mesas: [
    { id: "honor", nombre: "Mesa de novios", forma: "honor", x: 50, y: 12,
      invitados: ["Leo", "Dani"] },

    { id: "1", nombre: "Mesa 1 · Jazmín", forma: "redonda", x: 22, y: 30,
      invitados: ["María Fernanda Rojas", "Pedro Rojas", "Carmen Silva", "Andrés Silva", "Javiera Rojas", "Tomás Rojas"] },
    { id: "2", nombre: "Mesa 2 · Buganvilia", forma: "redonda", x: 50, y: 32,
      invitados: ["Claudia Gajardo", "Rodrigo Gajardo", "Isidora Gajardo", "Matías Pérez", "Valentina Pérez", "Sofía Pérez"] },
    { id: "3", nombre: "Mesa 3 · Hibisco", forma: "redonda", x: 78, y: 30,
      invitados: ["Patricia Muñoz", "Jorge Muñoz", "Camila Muñoz", "Ignacio Torres", "Antonia Torres", "Benjamín Torres"] },

    { id: "4", nombre: "Mesa 4 · Copihue", forma: "redonda", x: 18, y: 52,
      invitados: ["Francisca Vera", "Cristóbal Vera", "Josefa Lagos", "Nicolás Lagos", "Emilia Lagos", "Vicente Lagos"] },
    { id: "5", nombre: "Mesa 5 · Lavanda", forma: "redonda", x: 42, y: 54,
      invitados: ["Daniela Contreras", "Sebastián Contreras", "Paula Herrera", "Felipe Herrera", "Amanda Herrera", "Bruno Herrera"] },
    { id: "6", nombre: "Mesa 6 · Girasol", forma: "redonda", x: 66, y: 54,
      invitados: ["Macarena Díaz", "Gonzalo Díaz", "Constanza Fuentes", "Álvaro Fuentes", "Renata Fuentes", "Simón Fuentes"] },
    { id: "7", nombre: "Mesa 7 · Amapola", forma: "redonda", x: 86, y: 52,
      invitados: ["Bárbara Soto", "Diego Soto", "Trinidad Reyes", "Martín Reyes", "Laura Reyes", "Pablo Reyes"] },

    { id: "8", nombre: "Mesa 8 · Cactus", forma: "redonda", x: 22, y: 74,
      invitados: ["Catalina Vargas", "Joaquín Vargas", "Elena Navarro", "Rafael Navarro", "Agustina Navarro", "Lucas Navarro"] },
    { id: "9", nombre: "Mesa 9 · Palmera", forma: "redonda", x: 50, y: 76,
      invitados: ["Antonia Cáceres", "Esteban Cáceres", "Romina Salas", "Mauricio Salas", "Florencia Salas", "Emilio Salas"] },
    { id: "10", nombre: "Mesa 10 · Limonero", forma: "redonda", x: 78, y: 74,
      invitados: ["Fernanda Bravo", "Álvaro Bravo", "Pía Espinoza", "Cristián Espinoza", "Martina Espinoza", "Gabriel Espinoza"] },

    { id: "ninos", nombre: "Mesa de los niños", forma: "larga", x: 50, y: 92,
      invitados: ["Los primos chicos", "Las primas chicas", "Y quien se porte mal"] },
  ],

  /* ----------------------------------------------------------------- Fotos */
  fotos: {
    /* modo: "album"    -> el QR lleva a un álbum compartido (Google Fotos,
     *                     iCloud, Drive...). Es lo más simple y no necesita
     *                     que tú tengas ningún servidor encendido.
     * modo: "servidor" -> el QR lleva a la página de subida de esta misma app,
     *                     que guarda las fotos en el servidor de servidor-fotos/.
     *                     Funciona sin internet si todos están en el mismo wifi. */
    modo: "album",

    // Solo para modo "album": pega aquí el enlace del álbum compartido.
    urlAlbum: "",   // EJEMPLO: "https://photos.app.goo.gl/xxxxxxxx"

    // Solo para modo "servidor": dirección donde corre servidor-fotos/,
    // tal como la escribirían los invitados en el teléfono.
    urlServidor: "", // EJEMPLO: "http://192.168.1.50:8080"

    titulo: "Súbete al álbum",
    mensaje: "Escanea el código con la cámara del teléfono y sube las fotos que tomes. Sin apps, sin registros.",
    // Texto que se imprime bajo el QR en el cartel.
    pieCartel: "Apunta la cámara · sube tus fotos · nosotros las vemos todas mañana con resaca",
  },

  /* -------------------------------------------------------- Info práctica */
  // Cada bloque es opcional: borra los que no uses.
  info: [
    { emoji: "👗", titulo: "Vestimenta", texto: "EJEMPLO — Formal de verano. El suelo es de pasto y tierra: los tacos de aguja lo van a pasar mal." },
    { emoji: "🚗", titulo: "Cómo llegar", texto: "EJEMPLO — Hay estacionamiento en el lugar. Si tomas, deja el auto: tenemos convenio con radiotaxi." },
    { emoji: "🎁", titulo: "Regalos", texto: "EJEMPLO — Tu presencia basta. Si insistes, habrá un buzón en la entrada." },
    { emoji: "🧒", titulo: "Niños", texto: "EJEMPLO — Bienvenidos. Hay mesa y actividades para ellos." },
  ],
};
