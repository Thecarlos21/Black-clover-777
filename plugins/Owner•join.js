let linkRegex = /chat\.whatsapp\.com\/(?:invite\/)?([0-9A-Za-z]{20,24})/i

let handler = async (m, { conn, text, usedPrefix, command }) => {
  let isROwner = m.fromMe
  if (!isROwner) {
    try {
      let ownerList = global.owner.map(v => String(v[0]).replace(/\D/g,''))
      let senderNum = String(m.sender).split('@')[0].replace(/\D/g,'')
      let senderPn = String(m.senderPn || '').split('@')[0].replace(/\D/g,'')
      isROwner = ownerList.some(o => senderNum.includes(o) || o.includes(senderNum) || senderPn.includes(o) || o.includes(senderPn))
    } catch { isROwner = false }
  }

  if (!isROwner) {
    return conn.reply(m.chat, `🛑 *ACCESO RESTRINGIDO*\n\n> Solo el *Creador Supremo* puede ejecutar este protocolo.\n\n🧬 Usuario Autorizado: 👑 𝙏𝙃𝙀 𝘾𝘼𝙍𝙇𝙊𝙎`, m)
  }

  if (!text) return m.reply(`🚩 Ingresa el enlace\nEjemplo: ${usedPrefix + command} https://chat.whatsapp.com/xxxx`)

  let code = text.match(linkRegex)
  if (!code) return m.reply('🐢 Enlace inválido')
  code = code[1]

  try {
    let res = await conn.groupAcceptInvite(code)
    await m.react('✅')
    return m.reply(`✅ Me uní correctamente a:\n${res}`)
  } catch (e) {
    await m.react('❌')
    return m.reply(`❌ No pude unirme\n> ${e.message}`)
  }
}

handler.help = ['join <link>']
handler.tags = ['owner']
handler.command = ['join', 'entrar']
handler.rowner = false
handler.owner = false

export default handler