const handler = async (m, { conn, getUserDisplay }) => {
  const mentioned = Array.isArray(m.mentionedJid) ? m.mentionedJid : []
  const who = mentioned[0] || m.quoted?.sender || m.sender

  const target = await getUserDisplay(who)
  const sender = await getUserDisplay(m.sender)

  const senderName = sender?.name || conn.getName(sender?.jid || m.sender) || sender?.number || 'Alguien'
  const targetName = target?.name || conn.getName(target?.jid || who) || target?.number || 'esa persona'

  await m.react('😨')

  const text = (target?.jid || who) === (sender?.jid || m.sender)
    ? `\`${senderName}\` está asustad﹫.`
    : `\`${senderName}\` está asustad﹫ de \`${targetName}\`.`

  const videos = [
    'https://telegra.ph/file/9c1e963fa4d8269fb17a7.mp4',
    'https://telegra.ph/file/0c802b4fa616aaf1da229.mp4',
    'https://telegra.ph/file/d0b166d9a363765e51657.mp4',
    'https://telegra.ph/file/eae6dd9d45e45fe3a95ab.mp4',
    'https://telegra.ph/file/1785e535a4463c2a337c5.mp4',
    'https://telegra.ph/file/c1673b418bc61db1e51a0.mp4',
    'https://telegra.ph/file/9774e1d74c3abf083ae01.mp4',
    'https://telegra.ph/file/dcde646a58d8e9bf44867.mp4'
  ]

  const video = videos[Math.floor(Math.random() * videos.length)]

  await conn.sendMessage(
    m.chat,
    {
      video: { url: video },
      gifPlayback: true,
      caption: text,
      mentions: (target?.jid || who) === (sender?.jid || m.sender) ? [] : [target?.jid || who]
    },
    { quoted: m }
  )
}

handler.help = ['scared', 'asustada']
handler.tags = ['emox']
handler.command = ['scared', 'asustada']
handler.group = true

export default handler