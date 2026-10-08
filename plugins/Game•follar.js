import fs from 'fs'
import path from 'path'

let handler = async (m, { conn, getUserDisplay }) => {
    let who

    if (!db.data.chats[m.chat].nsfw && m.isGroup) {
        return m.reply('*[❗] 𝐋𝐨𝐬 𝐜𝐨𝐦𝐚𝐧𝐝𝐨𝐬 +𝟏𝟖 𝐞𝐬𝐭𝐚́𝐧 𝐝𝐞𝐬𝐚𝐜𝐭𝐢𝐯𝐚𝐝𝐨𝐬 𝐞𝐧 𝐞𝐬𝐭𝐞 𝐠𝐫𝐮𝐩𝐨.*\n> 𝐬𝐢 𝐞𝐬 𝐚𝐝𝐦𝐢𝐧 𝐲 𝐝𝐞𝐬𝐞𝐚 𝐚𝐜𝐭𝐢𝐯𝐚𝐫𝐥𝐨𝐬 𝐮𝐬𝐞 .enable nsfw')
    }

    if (m.mentionedJid?.length > 0) {
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

    await m.react('🥵')

    let str

    if (m.mentionedJid?.length > 0) {
        str = `\`${name2}\` *follo fuertemente a la perra de* \`${name}\`.`
    } else if (m.quoted) {
        str = `\`${name2}\` *se la metió durísimo a la perrita de* \`${name}\`.`
    } else {
        str = `\`${name2}\` *está follando ricamente.*`.trim()
    }

    if (m.isGroup) {
        const videos = [
            'https://files.catbox.moe/7ito13.mp4',
            'https://files.catbox.moe/6to3zj.mp4',
            'https://files.catbox.moe/8j94sh.mp4',
            'https://files.catbox.moe/ylfpb7.mp4',
            'https://files.catbox.moe/kccjc7.mp4',
            'https://files.catbox.moe/lt9e1u.mp4'
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
}

handler.help = ['follar @tag']
handler.tags = ['nsfws']
handler.command = ['follar']
handler.group = true

export default handler