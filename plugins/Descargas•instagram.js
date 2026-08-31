import fetch from 'node-fetch'

let handler = async (m, { conn, args }) => {
  if (!args[0]) return conn.reply(m.chat, '🚩 Ingresa un link de Instagram', m)

  try {
    await conn.sendMessage(m.chat, { react: { text: '🕒', key: m.key } })

    let url = args[0]
    let apiUrl = `https://api.evogb.org/dl/instagram?url=${encodeURIComponent(url)}&key=evogb-72KVdRHK`
    let res = await fetch(apiUrl).then(r => r.json())

    let mediaUrl = res?.data?.find(x => x.type === 'video')?.url

    if (!mediaUrl) throw new Error('No se pudo obtener el video')

    let response = await fetch(mediaUrl)

    if (!response.ok) {
      throw new Error(`Error al descargar el video: ${response.status}`)
    }

    let buff = Buffer.from(await response.arrayBuffer())

    await conn.sendMessage(m.chat, {
      video: buff,
      caption: `🚩 *Instagram - Black Clover Bot*\n*Link:* ${url}`,
      mimetype: 'video/mp4'
    }, { quoted: m })

    await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })

  } catch (e) {
    console.log(e)
    await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
    await conn.reply(m.chat, `🚩 Error: ${e.message}`, m)
  }
}

handler.command = ['ig', 'instagram', 'reel']
handler.tags = ['descargas']
handler.help = ['ig <link>']

export default handler