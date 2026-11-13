import yts from 'yt-search'

let handler = async (m, { conn, text }) => {
  const estilo = (titulo, contenido) => `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵  ࿆
𐚁 ֹ ִ *${titulo}* ! ୧ ֹ ִ

╭╼ׅࣶ፝֟╾╌ֵ╾͜─ํ͜┈ְ ࣭࣪⢏࣭ࣧ⢢࣭ׄ᎐፝֟͟͝᎐࣭ׄ⡔࣭১⡹࣭࣭ׄ࣪ ְ┈ํ͜─͜╼ꨪᰰ╾࣮╌╼ࣶׅ፝֟╾╮
${contenido}
╰╼ׅࣶ፝֟╾╌ֵ╾͜─ํ͜┈ְ ࣭࣪⢏࣭ࣧ⢢࣭ׄ᎐፝֟͟͝᎐࣭ׄ⡔࣭ࣧ⡹࣭ׄ ְ┈ํ͜─͜╼ꨪᰰ╾࣮╌╼ࣶׅ፝֟╾╯`

  if (!text) return m.reply(estilo('ʏᴏᴜᴛᴜʙᴇ', '> 〄 Escribe el nombre del video que deseas buscar.'))

  try {
    const res = await yts(text)
    const videos = res.videos.slice(0, 5)

    if (!videos.length)
      return m.reply(estilo('ᴇʀʀᴏʀ', '> 〄 No se encontraron videos.'))

    const resultado = videos.map((v, i) =>
      `> ✿ *${i + 1}. ${v.title}*\n` +
      `> 〄 Duración: ${v.timestamp}\n` +
      `> 〄 Vistas: ${v.views}\n` +
      `> 〄 ${v.url}`
    ).join('\n\n')

    await conn.reply(m.chat, estilo('ʙᴜsᴄᴀᴅᴏʀ ʏᴏᴜᴛᴜʙᴇ', resultado), m)
  } catch {
    await m.reply(estilo('ᴇʀʀᴏʀ', '> 〄 No se pudo realizar la búsqueda.'))
  }
}

handler.help = ['ytbuscar']
handler.tags = ['buscador']
handler.command = ['ytbuscar', 'yts']

export default handler