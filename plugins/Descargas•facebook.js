import fetch from 'node-fetch'

let handler = async (m, { conn, args }) => {
  if (!args[0]) return conn.reply(m.chat, '🚩 Ingresa un link de Facebook', m)

  try {
    await conn.sendMessage(m.chat, {
      react: { text: '🕒', key: m.key }
    })

    let url = args[0]

    let apiUrl = `https://api.evogb.org/dl/facebook?url=${encodeURIComponent(url)}&key=evogb-72KVdRHK`

    let response = await fetch(apiUrl)

    if (!response.ok) {
      throw new Error(`API respondió con ${response.status}`)
    }

    let res = await response.json()

    if (!res.status || !Array.isArray(res.resultados)) {
      throw new Error('La API no devolvió resultados')
    }

    let media =
      res.resultados.find(x => x.quality === '1080p') ||
      res.resultados.find(x => x.quality === '720p (HD)') ||
      res.resultados.find(x => x.quality === '640p') ||
      res.resultados.find(x => x.quality === '360p (SD)')

    if (!media?.url || media.url === '/') {
      throw new Error('No se encontró un video válido')
    }

    let videoResponse = await fetch(media.url)

    if (!videoResponse.ok) {
      throw new Error(`Error al descargar el video: ${videoResponse.status}`)
    }

    let buff = Buffer.from(await videoResponse.arrayBuffer())

    await conn.sendMessage(m.chat, {
      video: buff,
      caption: `🚩 *Facebook - Black Clover Bot*\n\n📹 *Calidad:* ${media.quality}\n🔗 *Link:* ${url}`,
      mimetype: 'video/mp4'
    }, { quoted: m })

    await conn.sendMessage(m.chat, {
      react: { text: '✅', key: m.key }
    })

  } catch (e) {
    console.log('Facebook Downloader:', e)

    await conn.sendMessage(m.chat, {
      react: { text: '❌', key: m.key }
    })

    await conn.reply(m.chat, `🚩 Error: ${e.message}`, m)
  }
}

handler.command = ['fb', 'facebook']
handler.tags = ['descargas']
handler.help = ['fb <link>']

export default handler