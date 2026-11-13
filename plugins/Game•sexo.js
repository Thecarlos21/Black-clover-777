const handler = async (m, { conn, getUserDisplay }) => {
  const chat = global.db.data.chats[m.chat]

  if (m.isGroup && !chat?.nsfw) {
    return m.reply('[❗] 𝐋𝐨𝐬 𝐜𝐨𝐦𝐚𝐧𝐝𝐨𝐬 +𝟏𝟖 𝐞𝐬𝐭𝐚́𝐧 𝐝𝐞𝐬𝐚𝐜𝐭𝐢𝐯𝐚𝐝𝐨𝐬 𝐞𝐧 𝐞𝐬𝐭𝐞 𝐠𝐫𝐮𝐩𝐨.\n> 𝐬𝐢 𝐞𝐬 𝐚𝐝𝐦𝐢𝐧 𝐲 𝐝𝐞𝐬𝐞𝐚 𝐚𝐜𝐭𝐢𝐯𝐚𝐫𝐥𝐨𝐬 𝐮𝐬𝐞 .enable nsfw')
  }

  const mentioned = Array.isArray(m.mentionedJid) ? m.mentionedJid : []
  const who = mentioned[0] || m.quoted?.sender || m.sender

  const target = await getUserDisplay(who)
  const sender = await getUserDisplay(m.sender)

  const senderName = sender?.name || conn.getName(sender?.jid || m.sender) || sender?.number || 'Alguien'
  const targetName = target?.name || conn.getName(target?.jid || who) || target?.number || 'esa persona'

  await m.react('🥵')

  const sameUser = (target?.jid || who) === (sender?.jid || m.sender)

  const text = sameUser
    ? `\`${senderName}\` está disfrutando apasionadamente.`
    : `\`${senderName}\` está interactuando con \`${targetName}\`.`

  const videos = [
    'https://telegra.ph/file/a2ad1dd463a935d5dfd17.mp4',
    'https://telegra.ph/file/e3abb2e79cd1ccf709e91.mp4',
    'https://telegra.ph/file/c5be4a906531c6731cd41.mp4',
    'https://telegra.ph/file/9c4b894e034c290df75e4.mp4',
    'https://telegra.ph/file/3246f62c61a0ebebcb5c8.mp4',
    'https://telegra.ph/file/820460f05d76bb2329bbc.mp4',
    'https://telegra.ph/file/22d0ef801c93c1b2ac074.mp4',
    'https://telegra.ph/file/6f66fd1974e8df1496768.mp4'
  ]

  const video = videos[Math.floor(Math.random() * videos.length)]

  await conn.sendMessage(
    m.chat,
    {
      video: { url: video },
      gifPlayback: true,
      caption: text,
      mentions: sameUser ? [] : [target?.jid || who]
    },
    { quoted: m }
  )
}

handler.help = ['sexo', 'sex']
handler.tags = ['emox']
handler.command = ['sexo', 'sex']
handler.group = true

export default handler
