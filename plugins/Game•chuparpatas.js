let handler = async (m, { conn, getUserDisplay }) => {
    let who

    if (m.mentionedJid?.length) {
        who = m.mentionedJid[0]
    } else if (m.quoted?.sender) {
        who = m.quoted.sender
    } else {
        who = m.sender
    }

    const target = await getUserDisplay(who)
    const sender = await getUserDisplay(m.sender)

    const name = target?.name || conn.getName(target?.jid || who) || target?.number || 'esa persona'
    const name2 = sender?.name || conn.getName(sender?.jid || m.sender) || sender?.number || 'Alguien'

    await m.react('👣')

    let str

    if (m.mentionedJid?.length) {
        str = `> † *${name2}* está chupando la pata de *${name}* 😆🦶`
    } else if (m.quoted) {
        str = `> † *${name2}* está chupando la pata de *${name}* 🥵🦶`
    } else {
        str = `> † *${name2}* está chupando patas por aquí 🥵🦶`
    }

    if (!m.isGroup) return

    const videos = [
        'https://files.catbox.moe/zuwr3w.mp4',
        'https://files.catbox.moe/vkllyl.mp4',
        'https://files.catbox.moe/es3aji.mp4'
    ]

    const video = videos[Math.floor(Math.random() * videos.length)]

    await conn.sendMessage(
        m.chat,
        {
            video: { url: video },
            gifPlayback: true,
            caption: str,
            mentions: [target?.jid || who]
        },
        { quoted: m }
    )
}

handler.help = ['chuparpata @tag']
handler.tags = ['emox']
handler.command = ['chuparpata', 'chupaepatas']
handler.group = true

export default handler