import fetch from 'node-fetch'

const name = 'Descargas - black clover'
const API_KEY = 'evogb-72KVdRHK'
const API_URL = 'https://api.evogb.org/dl/youtubeplay'

const pendientes = new Map()

const cleanFileName = title => {
  return String(title || 'Descarga de YouTube')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim()
    .slice(0, 100) || 'Descarga de YouTube'
}

const getApiData = async (url, type) => {
  const params = new URLSearchParams({
    key: API_KEY,
    query: url,
    type,
    quality: 'auto'
  })

  const response = await fetch(`${API_URL}?${params.toString()}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'Mozilla/5.0'
    }
  })

  const text = await response.text()

  if (!response.ok) {
    throw new Error(`La API respondió con ${response.status}`)
  }

  let data

  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('La API no devolvió una respuesta JSON válida')
  }

  if (!data?.status) {
    throw new Error(
      data?.message ||
      data?.error ||
      'La API rechazó la solicitud'
    )
  }

  const result = data?.data || data

  const downloadUrl =
    result?.dl ||
    result?.download ||
    result?.url

  if (!downloadUrl) {
    throw new Error('La API no devolvió el enlace de descarga')
  }

  return {
    url: downloadUrl,
    title: result?.title || 'Descarga de YouTube',
    quality: result?.quality || 'Auto',
    duration: result?.duration || ''
  }
}

const downloadFile = async url => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  })

  if (!response.ok) {
    throw new Error(`No se pudo descargar el archivo: ${response.status}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

const descargar = async (m, conn, url, type) => {
  const isVideo = type === 'video'

  try {
    await m.react('🕦')

    const data = await getApiData(url, type)
    const title = cleanFileName(data.title)
    const buffer = await downloadFile(data.url)

    if (!buffer?.length) {
      throw new Error('El archivo descargado está vacío')
    }

    if (isVideo) {
      await conn.sendMessage(
        m.chat,
        {
          video: buffer,
          mimetype: 'video/mp4',
          fileName: `${title}.mp4`,
          caption: `☘️ *BLACK CLOVER BOT*

🎬 *Título:* ${data.title}
📺 *Calidad:* ${data.quality}${data.duration ? `\n⏱️ *Duración:* ${data.duration}` : ''}`
        },
        { quoted: m }
      )
    } else {
      await conn.sendMessage(
        m.chat,
        {
          audio: buffer,
          mimetype: 'audio/mpeg',
          fileName: `${title}.mp3`,
          ptt: false
        },
        { quoted: m }
      )
    }

    await m.react('☑️')
  } catch (error) {
    await m.react('❌')

    await conn.reply(
      m.chat,
      `🚩 *Error:* ${error?.message || 'No se pudo realizar la descarga'}`,
      m
    )
  }
}

const handler = async (m, { conn, args, command }) => {
  if (command === 'play') {
    if (!args[0]) {
      return conn.reply(
        m.chat,
        '🚩 Ingresa un link de YouTube\n\nEjemplo:\n.play https://youtu.be/ve629wmQcNw',
        m
      )
    }

    const url = args[0].trim()

    pendientes.set(m.sender, url)

    const text = `
࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵  ࿆
𐚁 ֹ ִ *ʏᴏᴜᴛᴜʙᴇ ᴘʟᴀʏ* ! ୧ ֹ ִ

✐ *Selecciona una opción*

> 〄 *1.* Descargar en MP4 🎥
> 〄 *2.* Descargar en MP3 🎵

✐ *Escribe 1 o 2 para continuar y solo funciona una vez xd.*

📸 *Sígueme en Instagram*
> @the_carlos.zx
https://www.instagram.com/the_carlos.zx
`.trim()

    return conn.reply(m.chat, text, m)
  }

  if (!args[0]) {
    return conn.reply(
      m.chat,
      `🚩 Ingresa un link de YouTube\n\nEjemplo:\n.${command} https://youtu.be/ve629wmQcNw`,
      m
    )
  }

  const url = args[0].trim()
  const type = command === 'ytmp4' || command === 'mp4'
    ? 'video'
    : 'audio'

  await descargar(m, conn, url, type)
}

handler.before = async (m, { conn }) => {
  if (!m.text) return
  if (m.text.startsWith('.')) return

  const seleccion = m.text.trim()

  if (seleccion !== '1' && seleccion !== '2') return

  const url = pendientes.get(m.sender)

  if (!url) return

  pendientes.delete(m.sender)

  await descargar(
    m,
    conn,
    url,
    seleccion === '1' ? 'video' : 'audio'
  )

  return true
}

handler.command = [
  'play',
  'ytmp4',
  'ytmp3',
  'mp4',
  'mp3'
]

handler.tags = ['descargas']

handler.help = [
  'play <link>',
  'ytmp4 <link>',
  'ytmp3 <link>'
]

export default handler