
let handler = async (m, { conn, getUserDisplay }) => {
  if (!m.isGroup) return m.reply('❌ Este comando solo funciona en grupos.')

  const chat = global.db?.data?.chats?.[m.chat]

  if (chat && chat.nsfw === false) {
    return m.reply('[❗] 𝐋𝐨𝐬 𝐜𝐨𝐦𝐚𝐧𝐝𝐨𝐬 +𝟏𝟖 𝐞𝐬𝐭𝐚́𝐧 𝐝𝐞𝐬𝐚𝐜𝐭𝐢𝐯𝐚𝐝𝐨𝐬 𝐞𝐧 𝐞𝐬𝐭𝐞 𝐠𝐫𝐮𝐩𝐨.\n> 𝐒𝐢 𝐞𝐬 𝐚𝐝𝐦𝐢𝐧 𝐲 𝐝𝐞𝐬𝐞𝐚 𝐚𝐜𝐭𝐢𝐯𝐚𝐫𝐥𝐨𝐬, 𝐮𝐬𝐞 .enable nsfw')
  }

  const mentioned = m.mentionedJid || []
  const who = mentioned[0] || m.quoted?.sender || m.sender

  const getName = async jid => {
    try {
      if (typeof getUserDisplay === 'function') {
        const user = await getUserDisplay(jid)
        if (user?.name) return user.name
      }

      const stored = global.db?.data?.users?.[jid]
      return stored?.name || await conn.getName?.(jid) || `@${String(jid).split('@')[0]}`
    } catch {
      return `@${String(jid).split('@')[0]}`
    }
  }

  const name = await getName(who)
  const name2 = await getName(m.sender)

  const str = mentioned.length
    ? `*${name2}* le está agarrando las tetas a *${name}*.`
    : m.quoted
      ? `*${name2}* está agarrando las tetas de *${name}*.`
      : `*${name2}* está agarrando unas ricas tetas >.<`

  const videos = [
    'https://telegra.ph/file/e6bf14b93dfe22c4972d0.mp4',
    'https://telegra.ph/file/075db3ebba7126d2f0d95.mp4',
    'https://telegra.ph/file/37c21753892b5d843b9ce.mp4',
    'https://telegra.ph/file/04bbf490e29158f03e348.mp4',
    'https://telegra.ph/file/82d32821f3b57b62359f2.mp4',
    'https://telegra.ph/file/36149496affe5d02c8965.mp4',
    'https://telegra.ph/file/61d85d10baf2e3b9a4cde.mp4',
    'https://telegra.ph/file/538c95e4f1c481bcc3cce.mp4',
    'https://telegra.ph/file/e999ef6e67a1a75a515d6.mp4',
    'https://telegra.ph/file/05c1bd3a2ec54428ac2fc.mp4'
  ]

  const video = videos[Math.floor(Math.random() * videos.length)]
  const mentions = [...new Set([m.sender, who].filter(Boolean))]

  await conn.sendMessage(
    m.chat,
    {
      video: { url: video },
      gifPlayback: true,
      caption: str,
      mentions
    },
    { quoted: m }
  )

  await m.react('🔥')
}

handler.help = ['grabboobs', 'agarrartetas']
handler.tags = ['emox']
handler.command = ['grabboobs', 'agarrartetas']
handler.group = true

export default handler

