const UNLIMITED = 999999999999

const handler = async (m, { conn }) => {
  const users = global.db?.data?.users
  if (!users) return conn.reply(m.chat, '❌ DB no disponible', m)

  let jid = m.senderResolved || conn.decodeJid(m.sender) || m.sender
  
  let user = users[jid] || users[m.sender]
  if (!user) {
    users[jid] = {}
    user = users[jid]
  }

  // RECURSOS - sin diamantes
  user.monedas = UNLIMITED
  user.money = UNLIMITED
  user.limit = UNLIMITED
  user.level = UNLIMITED
  user.exp = UNLIMITED
  user.joincount = UNLIMITED

  // PREMIUM
  user.premium = true
  user.premiumTime = UNLIMITED
  user.premiumPermanent = true
  user.prem = true
  user.premTime = Date.now() + 1000 * 60 * 60 * 24 * 365 * 10

  // Guardado
  users[jid] = user
  if (users[m.sender] && m.sender !== jid) users[m.sender] = user

  await global.db.write?.()
  await global.db.save?.()

  await conn.sendMessage(m.chat, {
    text: `🚩 *Listo @${jid.split('@')[0]}*\n\n💰 Monedas: ∞\n⚡ Nivel: ∞\n✨ Exp: ∞\n👑 Premium: *ACTIVADO PERMANENTE*`,
    mentions: [jid]
  }, { quoted: m })
}

handler.help = ['chetar']
handler.tags = ['owner']
handler.command = ['ilimitado', 'infinity', 'chetar', 'cheat']
handler.rowner = true

export default handler