const handler = async (m, { conn }) => {
  const mentioned = Array.isArray(m.mentionedJid) ? m.mentionedJid : []
  const who = mentioned[0] || m.quoted?.sender || m.sender

  const getName = jid => {
    if (jid === m.sender && m.pushName) return m.pushName
    return conn.getName(jid) || jid.split('@')[0]
  }

  const senderName = getName(m.sender)
  const targetName = getName(who)

  await m.react('👊')

  const text = who === m.sender
    ? `\`${senderName}\` se golpeó a sí mismo.`
    : `\`${senderName}\` golpeó a \`${targetName}\`.`

  const videos = [
    'https://telegra.ph/file/8e60a6379c1b72e4fbe0f.mp4',
    'https://telegra.ph/file/8ac9ca359cac4c8786194.mp4',
    'https://telegra.ph/file/cc20935de6993dd391af1.mp4',
    'https://telegra.ph/file/9c0bba4c6b71979e56f55.mp4',
    'https://telegra.ph/file/5d22649b472e539f27df9.mp4',
    'https://telegra.ph/file/804eada656f96a04ebae8.mp4',
    'https://telegra.ph/file/3a2ef7a12eecbb6d6df53.mp4',
    'https://telegra.ph/file/c4c27701496fec28d6f8a.mp4',
    'https://telegra.ph/file/c8e5a210a3a34e23391ee.mp4',
    'https://telegra.ph/file/70bac5a760539efad5aad.mp4'
  ]

  const video = videos[Math.floor(Math.random() * videos.length)]

  await conn.sendMessage(
    m.chat,
    {
      video: { url: video },
      gifPlayback: true,
      caption: text,
      mentions: who === m.sender ? [] : [who]
    },
    { quoted: m }
  )
}

handler.help = ['punch', 'pegar', 'golpear']
handler.tags = ['emox']
handler.command = ['punch', 'pegar', 'golpear']
handler.group = true

export default handler