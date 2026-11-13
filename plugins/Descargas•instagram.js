import { igdl } from 'ruhend-scraper'

const handler = async (m, { args, conn }) => {
    const url = args[0]?.trim()

    if (!url) {
        return conn.reply(
            m.chat,
            `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯†ִㅤ⃞ׄ†⃞ㅤִ†֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *ɪɴsᴛᴀɢʀᴀᴍ* ! ୧ ֹ ִ

† Ingresa un enlace de Instagram.

> 〄 Ejemplo: *.ig https://www.instagram.com/reel/...*`,
            m
        )
    }

    if (!/^(https?:\/\/)?(www\.)?instagram\.com\//i.test(url)) {
        return conn.reply(
            m.chat,
            `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯†ִㅤ⃞ׄ†⃞ㅤִ†֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *ᴇɴʟᴀᴄᴇ ɪɴᴠᴀ́ʟɪᴅᴏ* ! ୧ ֹ ִ

† El enlace no parece ser de Instagram.`,
            m
        )
    }

    try {
        await m.react('🕦')

        const res = await igdl(url)
        const results = Array.isArray(res?.data) ? res.data : []

        if (!results.length) {
            await m.react('❌')
            return conn.reply(
                m.chat,
                `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯†ִㅤ⃞ׄ†⃞ㅤִ†֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *sɪɴ ʀᴇsᴜʟᴛᴀᴅᴏs* ! ୧ ֹ ִ

† No se encontraron medios para este enlace.`,
                m
            )
        }

        const media = results
            .filter(x => x?.url)
            .sort((a, b) => {
                const resA = parseInt(a?.resolution) || 0
                const resB = parseInt(b?.resolution) || 0
                return resB - resA
            })[0]

        if (!media?.url) {
            await m.react('❌')
            return conn.reply(
                m.chat,
                `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯†ִㅤ⃞ׄ†⃞ㅤִ†֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *ᴠɪᴅᴇᴏ ɴᴏ ᴅɪsᴘᴏɴɪʙʟᴇ* ! ୧ ֹ ִ

† No se encontró un video compatible.`,
                m
            )
        }

        await conn.sendMessage(
            m.chat,
            {
                video: { url: media.url },
                fileName: 'instagram.mp4',
                mimetype: 'video/mp4',
                caption: `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯†ִㅤ⃞ׄ†⃞ㅤִ†֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *ɪɴsᴛᴀɢʀᴀᴍ* ! ୧ ֹ ִ

> † *ᴄᴀʟɪᴅᴀᴅ* › ${media.resolution || 'Auto'}
> † *ғᴏʀᴍᴀᴛᴏ* › MP4
> † *ᴇsᴛᴀᴅᴏ* › Completado

> 〄 *Video listo para disfrutar ♡*`
            },
            { quoted: m }
        )

        await m.react('☑️')

    } catch (error) {
        console.error(error)
        await m.react('❌')

        return conn.reply(
            m.chat,
            `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯†ִㅤ⃞ׄ†⃞ㅤִ†֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *ᴇʀʀᴏʀ* ! ୧ ֹ ִ

> † ${error?.message || 'No se pudo descargar el video.'}`,
            m
        )
    }
}

handler.command = ['instagram', 'ig']
handler.tags = ['descargas']
handler.help = ['instagram <url>', 'ig <url>']
handler.register = true

export default handler
