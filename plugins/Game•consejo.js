const handler = async (m, { conn }) => {
  const consejo = global.consejo[Math.floor(Math.random() * global.consejo.length)]

  await conn.reply(m.chat, `࿆𐚁 ֹ ִ *ᴄᴏɴsᴇᴊᴏ* ! ୧ ֹ ִ

† ${consejo}

࿆𐚁 ֹ ִ *ᴄʟᴏᴠᴇʀ ᴍᴅ* †`, m, {
    contextInfo: {
      externalAdReply: {
        title: '🍀 ᴄᴏɴsᴇᴊᴏ ᴅᴇʟ ᴅɪ́ᴀ',
        body: typeof dev !== 'undefined' ? dev : '',
        sourceUrl: typeof channel !== 'undefined' ? channel : '',
        thumbnail: typeof icons !== 'undefined' ? icons : undefined,
        mediaType: 1,
        renderLargerThumbnail: true
      }
    }
  })
}

handler.help = ['consejo']
handler.tags = ['fun']
handler.command = ['consejo']
handler.fail = null
handler.exp = 0

export default handler

global.consejo = [
  "Recuerda que no puedes fallar en ser tú mismo (Wayne Dyer)",
  "Siempre es temprano para rendirse (Jorge Álvarez Camacho)",
  "Sólo una cosa convierte en imposible un sueño: el miedo a fracasar (Paulo Coelho)",
  "Lo que haces hoy puede mejorar todos tus mañanas (Ralph Marston)",
  "Las pequeñas acciones de cada día hacen o deshacen el carácter (Oscar Wilde)",
  "Cáete siete veces y levántate ocho (Proverbio japonés)",
  "Para que los cambios tengan un valor verdadero deben ser consistentes y duraderos (Anthony Robbins)",
  "Nada sucede hasta que algo se mueve (Albert Einstein)",
  "Ser un buen perdedor es aprender cómo ganar (Carl Sandburg)",
  "Todos nuestros sueños pueden hacerse realidad, si tenemos el coraje de perseguirlos (Walt Disney)",
  "Quien se transforma a sí mismo, transforma el mundo (Dalai Lama)",
  "Tu tiempo es limitado, así que no lo malgastes viviendo la vida de alguien más… ten el valor de seguir tu corazón y tu intuición (Steve Jobs)",
  "No es que tengamos poco tiempo, es que perdemos mucho (Séneca)",
  "La confianza en sí mismo es el primer secreto del éxito (Ralph Waldo Emerson)",
  "La vida comienza al final de la zona de confort (Neale Donald Walsch)",
  "Debes hacer las cosas que piensas que no puedes hacer (Eleanor Roosevelt)",
  "El mayor error que una persona puede cometer es tener miedo de cometer un error (Elbert Hubbard)",
  "De una pequeña semilla un poderoso tronco puede crecer (Esquilo)",
  "La medida de lo que somos es lo que hacemos con lo que tenemos (Vince Lombardi)",
  "Nos convertimos en lo que pensamos (Earl Nightingale)",
  "El poder de la imaginación nos hace infinitos (John Muir)",
  "Antes que nada, la preparación es la llave del éxito (Alexander Graham Bell)",
  "El problema es que piensas que tienes tiempo (Buda)",
  "No se sale adelante celebrando éxitos sino superando fracasos (Orison Swett Marden)",
  "El miedo puede paralizar, pero ante un atisbo de valentía cederá terreno rápidamente (Jose Antonio Marina)",
  "No te desanimes. A menudo la última llave que te queda por probar abre el candado. (Anónimo)",
  "Un líder es alguien que conoce el camino, lo recorre y lo muestra (John C. Maxwell)",
  "Todos los éxitos resultan de trabajar y saber perseverar (Og Mandino)",
  "Cuando está muy oscuro puedes ver las estrellas (Proverbio persa)",
  "Solo yo puedo cambiar mi vida. Nadie puede hacerlo por mí (Carol Burnett)",
  "Siempre parece imposible… hasta que se hace (Nelson Mandela)",
  "Nada en la vida debe ser temido, solamente comprendido. Es hora de comprender más y temer menos (Marie Curie)",
  "La victoria es más dulce cuando ya conociste la derrota (Malcolm Forbes)",
  "Lo que no te mata te hace más fuerte (Friedrich Nietzsche)",
  "La fortaleza y crecimiento llegan solo a través de esfuerzo y lucha continuas (Napoleon Hill)",
  "Cuando tienes un sueño tienes que agarrarlo y nunca dejarlo ir (Carol Burnett)",
  "Cuanto más hacemos, más podemos hacer (William Hazlitt)",
  "La forma más efectiva de hacerlo, es hacerlo (Amelia Earhart)",
  "No puedes derrotar a la persona que nunca se rinde (Babe Ruth)",
  "Un sueño es solo un sueño. Una meta es un sueño con un plan y una fecha límite (Harvey Mackay)",
  "La determinación es el punto inicial de todo logro (W. Clement Stone)",
  "Lo que no se empieza nunca tendrá un final (Johann Wolfgang von Goethe)",
  "El mayor riesgo es no asumir ningún riesgo (Mark Zuckerberg)",
  "Puedo aceptar el fracaso, todos fracasan en algo. Pero no puedo aceptar no intentarlo (Michael Jordan)",
  "Hazlo, o no lo hagas, pero no lo intentes (Yoda)",
  "Sé tú mismo. Todos los demás ya están ocupados (Oscar Wilde)",
  "Sé la mejor versión de ti mismo (Anónimo)",
  "Sé el cambio que quieres ver en el mundo (Mahatma Gandhi)",
  "El momento que da más miedo es siempre justo antes de empezar (Anónimo)",
  "Cuando pierdas, no pierdas la lección (Dalai Lama)",
  "No esperes. Nunca va a ser el momento adecuado (Napoleon Hill)",
  "Puedes más de lo que te imaginas, vales más de lo que crees",
  "La energía y la persistencia conquistan todas las cosas (Benjamin Franklin)",
  "Tu mejor profesor es tu mayor error (HacheJota)",
  "Todas las mañanas, levántate con la idea de comerte el mundo",
  "No cuentes los días, haz que los días cuenten (Anónimo)"
]
