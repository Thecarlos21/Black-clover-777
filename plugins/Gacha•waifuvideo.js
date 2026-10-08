import { promises as fs } from 'fs'

const charactersFilePath = './src/database/characters.json'

async function loadCharacters() {
    try {
        const data = await fs.readFile(charactersFilePath, 'utf-8')
        return JSON.parse(data)
    } catch {
        throw new Error('No se pudo cargar el archivo characters.json.')
    }
}

let handler = async (m, { conn, args }) => {
    try {
        if (!args.length) {
            return conn.reply(
                m.chat,
                `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵  ࿆
𐚁 ֹ ִ *ᴡᴀɪғᴜ ᴠɪᴅᴇᴏ* ! ୧ ֹ ִ

✐ Escribe el nombre de un personaje.

> 〄 Ejemplo: *wvideo Rias Gremory*
> 〄 También puedes usar *charvideo* o *waifuvideo*`,
                m
            )
        }

        const characters = await loadCharacters()

        if (!Array.isArray(characters) || !characters.length) {
            return conn.reply(
                m.chat,
                `𐚁 ֹ ִ *ᴇʀʀᴏʀ* ! ୧ ֹ ִ

✐ No hay personajes registrados.`,
                m
            )
        }

        const search = args.join(' ').toLowerCase().trim()

        let character = characters.find(c =>
            String(c?.name || '').toLowerCase().trim() === search
        )

        if (!character) {
            const results = characters.filter(c =>
                String(c?.name || '').toLowerCase().includes(search)
            )

            if (results.length === 1) {
                character = results[0]
            } else if (results.length > 1) {
                let text = `
࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵  ࿆
𐚁 ֹ ִ *ᴘᴇʀsᴏɴᴀᴊᴇs ᴇɴᴄᴏɴᴛʀᴀᴅᴏs* ! ୧ ֹ ִ

✐ Se encontraron varios resultados:

`

                results.slice(0, 10).forEach((c, i) => {
                    text += `> 〄 *${i + 1}.* ${c.name || 'Desconocido'}\n`
                })

                text += `\n✐ Escribe el nombre completo para continuar.`

                return conn.reply(m.chat, text.trim(), m)
            }
        }

        if (!character) {
            return conn.reply(
                m.chat,
                `𐚁 ֹ ִ *ᴘᴇʀsᴏɴᴀᴊᴇ ɴᴏ ᴇɴᴄᴏɴᴛʀᴀᴅᴏ* ! ୧ ֹ ִ

✐ No encontré:

> 〄 *${args.join(' ')}*

✐ Revisa el nombre e inténtalo nuevamente.`,
                m
            )
        }

        if (!Array.isArray(character.vid) || !character.vid.length) {
            return conn.reply(
                m.chat,
                `𐚁 ֹ ִ *sɪɴ ᴠɪᴅᴇᴏ* ! ୧ ֹ ִ

✐ *${character.name || 'Desconocido'}* no tiene videos disponibles.`,
                m
            )
        }

        const randomVideo =
            character.vid[Math.floor(Math.random() * character.vid.length)]

        const sendAsGif = Math.random() < 0.5

        const message = `
࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵  ࿆
𐚁 ֹ ִ *ᴡᴀɪғᴜ ᴠɪᴅᴇᴏ* ! ୧ ֹ ִ

✐ *${character.name || 'Desconocido'}*

> 〄 Género: *${character.gender || 'N/A'}*
> 〄 Fuente: *${character.source || 'Desconocida'}*
> 〄 Videos disponibles: *${character.vid.length}*

✐ *Disfruta tu video ♡*
`.trim()

        await m.react('🕦')

        await conn.sendMessage(
            m.chat,
            {
                video: { url: randomVideo },
                gifPlayback: sendAsGif,
                caption: message
            },
            { quoted: m }
        )

        await m.react('☑️')

    } catch (error) {
        await m.react('❌')

        await conn.reply(
            m.chat,
            `𐚁 ֹ ִ *ᴇʀʀᴏʀ* ! ୧ ֹ ִ

✐ No se pudo enviar el video.

> 〄 ${error?.message || 'Error desconocido'}`,
            m
        )
    }
}

handler.help = [
    'wvideo <nombre>',
    'charvideo <nombre>',
    'waifuvideo <nombre>'
]

handler.tags = ['anime']

handler.command = [
    'charvideo',
    'wvideo',
    'waifuvideo'
]

handler.group = true

export default handler