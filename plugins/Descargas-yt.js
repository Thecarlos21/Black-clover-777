import fetch from 'node-fetch'

const name = 'Descargas - black clover'

let handler = async (m, { conn, args, command }) => {
  if (!args[0]) {
    return conn.reply(
      m.chat,
      `🚩 Ingresa un link de YouTube\n\nEjemplo:\n.${command} https://youtu.be/ve629wmQcNw`,
      m
    )
  }

  try {
    await conn.sendMessage(m.chat, {
      react: { text: '⏳', key: m.key }
    })

    let url = args[0]
    let isVideo = command === 'ytmp4' || command === 'mp4'

    let endpoint = isVideo
      ? 'https://api.evogb.org/dl/ytmp4'
      : 'https://api.evogb.org/dl/ytmp3'

    let params = new URLSearchParams({
      url: url,
      key: 'evogb-72KVdRHK'
    })

    if (isVideo) {
      params.set('quality', 'auto')
    }

    let apiUrl = `${endpoint}?${params.toString()}`

    console.log(`${name}:`, apiUrl)

    let response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    })

    let text = await response.text()

    if (!response.ok) {
      console.log(`${name} API ERROR:`, text)

      throw new Error(`La API respondió con ${response.status}`)
    }

    let res

    try {
      res = JSON.parse(text)
    } catch {
      console.log(`${name} respuesta:`, text)
      throw new Error('La API no devolvió JSON')
    }

    if (!res?.status || !res?.data?.dl) {
      console.log(`${name} JSON:`, res)
      throw new Error(
        res?.message ||
        res?.error ||
        'La API no devolvió el enlace de descarga'
      )
    }

    let mediaUrl = res.data.dl
    let title = res.data.title || 'Descarga de YouTube'
    let quality = res.data.quality || 'Auto'

    let mediaResponse = await fetch(mediaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      }
    })

    if (!mediaResponse.ok) {
      throw new Error(
        `Error al descargar el archivo: ${mediaResponse.status}`
      )
    }

    let buffer = Buffer.from(await mediaResponse.arrayBuffer())

    if (isVideo) {
      await conn.sendMessage(m.chat, {
        video: buffer,
        caption: `╭─〔 ${name} 〕
│
│ 🎬 *Título:* ${title}
│ 📺 *Calidad:* ${quality}
│
╰────────────────`,
        mimetype: 'video/mp4',
        fileName: `${title.replace(/[\\/:*?"<>|]/g, '')}.mp4`
      }, { quoted: m })

    } else {
      await conn.sendMessage(m.chat, {
        audio: buffer,
        mimetype: 'audio/mpeg',
        fileName: `${title.replace(/[\\/:*?"<>|]/g, '')}.mp3`,
        ptt: false
      }, { quoted: m })
    }

    await conn.sendMessage(m.chat, {
      react: { text: '✅', key: m.key }
    })

  } catch (e) {
    console.log(`${name}:`, e)

    await conn.sendMessage(m.chat, {
      react: { text: '❌', key: m.key }
    })

    await conn.reply(
      m.chat,
      `🚩 *Error:* ${e.message}`,
      m
    )
  }
}

handler.command = ['ytmp4', 'ytmp3', 'mp4', 'mp3']
handler.tags = ['descargas']
handler.help = [
  'ytmp4 <link>',
  'ytmp3 <link>'
]

export default handler