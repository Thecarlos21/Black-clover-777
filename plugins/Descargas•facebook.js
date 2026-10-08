import { igdl } from 'ruhend-scraper'

const handler = async (m, { conn, args }) => {
    const url = args[0]?.trim()

    if (!url) {
        return conn.reply(
            m.chat,
            `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *ғᴀᴄᴇʙᴏᴏᴋ* ! ୧ ֹ ִ

✐ Ingresa un enlace de Facebook.

> 〄 Ejemplo: *.fb https://www.facebook.com/...*`,
            m
        )
    }

    if (!/^(https?:\/\/)?(www\.)?(facebook\.com|fb\.watch)\//i.test(url)) {
        return conn.reply(
            m.chat,
            `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *ᴇɴʟᴀᴄᴇ ɪɴᴠᴀ́ʟɪᴅᴏ* ! ୧ ֹ ִ

✐ El enlace no parece ser de Facebook.`,
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
                `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *sɪɴ ʀᴇsᴜʟᴛᴀᴅᴏs* ! ୧ ֹ ִ

✐ No se encontró ningún video.`,
                m
            )
        }

        const data =
            results.find(x => /720p/i.test(x?.resolution || '')) ||
            results.find(x => /360p/i.test(x?.resolution || '')) ||
            results.find(x => x?.url)

        if (!data?.url) {
            await m.react('❌')
            return conn.reply(
                m.chat,
                `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *ᴠɪᴅᴇᴏ ɴᴏ ᴅɪsᴘᴏɴɪʙʟᴇ* ! ୧ ֹ ִ

✐ No se encontró una resolución compatible.`,
                m
            )
        }

        await conn.sendMessage(
            m.chat,
            {
                video: { url: data.url },
                fileName: 'facebook.mp4',
                mimetype: 'video/mp4',
                caption: `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *ғᴀᴄᴇʙᴏᴏᴋ* ! ୧ ֹ ִ

> 〄 Calidad: *${data.resolution || 'Auto'}*
> 〄 Formato: *MP4*

✐ *Descarga completada ♡*`
            },
            { quoted: m }
        )

        await m.react('☑️')

    } catch (error) {
        await m.react('❌')

        return conn.reply(
            m.chat,
            `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *ᴇʀʀᴏʀ* ! ୧ ֹ ִ

> 〄 ${error?.message || 'No se pudo descargar el video.'}`,
            m
        )
    }
}

handler.help = ['facebook <url>', 'fb <url>']
handler.tags = ['descargas']
handler.command = ['facebook', 'fb']
handler.cookies = 1
handler.register = true

export default handler
