import axios from 'axios'

let handler = async (m, { command, conn }) => {
  try {
    const api = `https://raw.githubusercontent.com/davidprospero123/api-anime/main/BOT-JSON/anime-${command}.json`

    const res = await axios.get(api, {
      timeout: 15000
    })

    const images = Array.isArray(res.data) ? res.data : []

    if (!images.length) {
      throw new Error('No hay imágenes')
    }

    const image = images[Math.floor(Math.random() * images.length)]

    if (!image || !image.startsWith('http')) {
      throw new Error('La URL no es válida')
    }

    await conn.sendMessage(
      m.chat,
      {
        image: {
          url: image
        },
        caption: `*${command}*\n\n☘️ Código hecho x The Carlos 👑`
      },
      { quoted: m }
    )

  } catch (e) {
    console.error('Anime:', e)

    await conn.sendMessage(
      m.chat,
      {
        text: `⚠️ Error al obtener la imagen de *${command}*\n\n${e.message}`
      },
      { quoted: m }
    )
  }
}

handler.command = handler.help = [
  'alisa','aihoshino','remcham','akira','akiyama','anna','asuna','ayuzawa','boruto','chiho','chitoge',
  'deidara','erza','elaina','eba','emilia','hestia','hinata','inori','isuzu','itachi','itori','kaga',
  'kagura','kaori','keneki','kotori','kurumitokisaki','madara','mikasa','miku','minato','naruto',
  'nezuko','sagiri','sasuke','sakura'
]

handler.tags = ['anime']
handler.register = true

export default handler
