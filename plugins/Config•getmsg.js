export async function all(m) {
  if (!m.chat?.endsWith('@g.us') &&!m.chat?.endsWith('@s.whatsapp.net')) return
  if (m.fromMe || m.isBaileys || m.key.remoteJid.endsWith('status@broadcast')) return
  const chat = global.db.data.chats[m.chat]
  const user = global.db.data.users[m.sender]
  if (chat?.isBanned || user?.banned) return
  let msgs = global.db.data.msgs
  if (!msgs ||!(m.text in msgs)) return
  try {
    let _m = this.serializeM(JSON.parse(JSON.stringify(msgs[m.text]), (_, v) => {
      if (v?.type === 'Buffer' && Array.isArray(v?.data)) return Buffer.from(v.data)
      return v
    }))
    await _m.copyNForward(m.chat, true)
  } catch {}
}