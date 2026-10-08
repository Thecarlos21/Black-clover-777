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

    const name = target?.name || conn.getName(target?.jid || who) || 'esa persona'
    const name2 = sender?.name || conn.getName(sender?.jid || m.sender) || 'Alguien'

    await m.react('🍑')

    if (!m.isGroup) return

    const gifs = [
        'https://files.catbox.moe/yjulgu.mp4',
        'https://files.catbox.moe/erm82k.mp4',
        'https://files.catbox.moe/9m1nkp.mp4',
        'https://files.catbox.moe/rzijb5.mp4'
    ]

    const gif = gifs[Math.floor(Math.random() * gifs.length)]

    const text = `> † *${name2}* está agarrando las nalgas de *${name}* 🍑`

    await conn.sendMessage(
        m.chat,
        {
            video: { url: gif },
            gifPlayback: true,
            caption: text,
            mentions: [target?.jid || who]
        },
        { quoted: m }
    )
}

handler.help = ['agarrarnalgas @tag']
handler.tags = ['emox']
handler.command = ['agarrarnalgas']
handler.group = true

export default handler