const linkRegex = /\b((https?:\/\/|www\.)?[\w-]+\.[\w-]+(?:\.[\w-]+)*(\/[\w.\-/?=&%#]*)?)\b/i

export async function before(m, { isAdmin, isBotAdmin }) {
  if (m.isBaileys && m.fromMe) return true
  if (!m.isGroup) return false

  const chat = global.db.data.chats[m.chat]
  const settings = global.db.data.settings[m.conn?.user?.jid || this.user?.jid] || {}
  const text = m.text || ''
  const sender = m.sender || m.key?.participant

  if (!chat?.antiLink2 || !text || !sender) return true

  const isLink = linkRegex.test(text)

  if (!isLink || isAdmin) return true

  const conn = this
  const user = `@${sender.split('@')[0]}`

  if (isBotAdmin) {
    let linkThisGroup = ''

    try {
      const inviteCode = await conn.groupInviteCode(m.chat)
      linkThisGroup = `https://chat.whatsapp.com/${inviteCode}`
    } catch {}

    const linkThisGroup2 = 'https://www.youtube.com/'
    const linkThisGroup3 = 'https://youtu.be/'

    if (linkThisGroup && text.includes(linkThisGroup)) return true
    if (text.includes(linkThisGroup2)) return true
    if (text.includes(linkThisGroup3)) return true
  }

  await conn.sendMessage(
    m.chat,
    {
      text: `*「 𝐀𝐍𝐓𝐈 𝐋𝐈𝐍𝐊𝐒 」*\n𝐍𝐮𝐧𝐜𝐚 𝐚𝐩𝐫𝐞𝐧𝐝𝐞𝐧 🙄 ${user} 𝐀𝐬 𝐫𝐨𝐭𝐨 𝐥𝐚𝐬 𝐫𝐞𝐠𝐥𝐚𝐬 𝐝𝐞𝐥 𝐠𝐫𝐮𝐩𝐨, 𝐬𝐞𝐫𝐚𝐬 𝐞𝐱𝐩𝐮𝐥𝐬𝐚𝐝𝐨/𝐚...!!`,
      mentions: [sender]
    },
    {
      quoted: m
    }
  )

  if (!isBotAdmin) {
    return m.reply(
      '[🚫] 𝐍𝐨 𝐬𝐨𝐲 𝐚𝐝𝐦𝐢𝐧 ! 𝐩𝐨𝐫 𝐭𝐚𝐧𝐭𝐨 𝐧𝐨 𝐩𝐮𝐞𝐝𝐨 𝐞𝐣𝐞𝐜𝐮𝐭𝐚𝐫 𝐥𝐚 𝐚𝐜𝐜𝐢𝐨𝐧 𝐝𝐞 𝐞𝐱𝐩𝐮𝐥𝐬𝐚𝐫'
    )
  }

  if (!settings.restrict) {
    return m.reply(
      '*[🚫] 𝐄𝐥 𝐎𝐰𝐧𝐞𝐫 𝐧𝐨 𝐭𝐢𝐞𝐧𝐞 𝐚𝐜𝐭𝐢𝐯𝐚 𝐥𝐚 𝐨𝐩𝐜𝐢𝐨́𝐧 𝐝𝐞 𝐫𝐞𝐬𝐭𝐫𝐢𝐧𝐠𝐢𝐫, 𝐍𝐨 𝐩𝐮𝐞𝐝𝐨 𝐞𝐣𝐞𝐜𝐮𝐭𝐚𝐫 𝐥𝐚 𝐚𝐜𝐜𝐢𝐨́𝐧*'
    )
  }

  try {
    await conn.sendMessage(
      m.chat,
      {
        delete: m.key
      }
    )

    const response = await conn.groupParticipantsUpdate(
      m.chat,
      [sender],
      'remove'
    )

    if (response?.[0]?.status === '404') return true

  } catch (e) {
    console.error('AntiLink2 error:', e)

    return conn.reply(
      m.chat,
      `❌ No pude expulsar a ${user}.\n\n${e.message || e}`,
      m,
      {
        mentions: [sender]
      }
    )
  }

  return true
}