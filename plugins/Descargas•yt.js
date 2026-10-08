import fetch from 'node-fetch'

const name = 'Descargas - black clover'
const API_KEY = 'evogb-72KVdRHK'
const API_URL = 'https://api.evogb.org/dl/youtubeplay'

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
    console.log(`${name} API ERROR:`, text)
    throw new Error(`La API respondió con ${response.status}`)
  }

  let data

  try {
    data = JSON.parse(text)
  } catch {
    console.log(`${name} respuesta inválida:`, text)
    throw new Error('La API no devolvió una respuesta JSON válida')
  }

  if (!data?.status) {
    console.log(`${name} JSON:`, data)

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
    console.log(`${name} sin enlace:`, data)
    throw new Error('La API no devolvió el enlace de descarga')
  }

  return {
    url: downloadUrl,
    title: result?.title || 'Descarga de YouTube',
    quality: result?.quality || 'Auto',
    duration: result?.duration || '',
    thumbnail: result?.thumbnail || ''
  }
}

const downloadFile = async url => {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  })

  if (!response.ok) {
    throw new Error(
      `No se pudo descargar el archivo: ${response.status}`
    )
  }

  return Buffer.from(await response.arrayBuffer())
}

const handler = async (m, { conn, args, command }) => {
  if (!args[0]) {
    return conn.reply(
      m.chat,
      `🚩 Ingresa un link de YouTube\n\nEjemplo:\n.${command} https://youtu.be/ve629wmQcNw`,
      m
    )
  }

  const url = args[0].trim()

  const isVideo =
    command === 'ytmp4' ||
    command === 'mp4'

  const type = isVideo
    ? 'video'
    : 'audio'

  try {
    await conn.sendMessage(m.chat, {
      react: {
        text: '⏳',
        key: m.key
      }
    })

    console.log(`${name}: solicitando ${type}`)
    console.log('URL:', url)

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
          caption: `╭─〔 ${name} 〕
│
│ 🎬 *Título:* ${data.title}
│ 📺 *Calidad:* ${data.quality}
${data.duration ? `│ ⏱️ *Duración:* ${data.duration}` : ''}
│
╰────────────────`
        },
        {
          quoted: m
        }
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
        {
          quoted: m
        }
      )
    }

    await conn.sendMessage(m.chat, {
      react: {
        text: '✅',
        key: m.key
      }
    })

    console.log(`${name}: descarga completada`)
  } catch (error) {
    console.error(
      `${name}:`,
      error?.stack || error?.message || error
    )

    await conn.sendMessage(m.chat, {
      react: {
        text: '❌',
        key: m.key
      }
    })

    await conn.reply(
      m.chat,
      `🚩 *Error:* ${error?.message || 'No se pudo realizar la descarga'}`,
      m
    )
  }
}

handler.command = [
  'ytmp4',
  'ytmp3',
  'mp4',
  'mp3'
]

handler.tags = [
  'descargas'
]

handler.help = [
  'ytmp4 <link>',
  'ytmp3 <link>'
]

export default handler