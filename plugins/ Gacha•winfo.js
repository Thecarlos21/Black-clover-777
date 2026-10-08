import { promises as fs } from 'fs'

const charactersFilePath = './src/database/characters.json'
const haremFilePath = './src/database/harem.json'

async function loadCharacters() {
    try {
        const data = await fs.readFile(charactersFilePath, 'utf-8')
        return JSON.parse(data)
    } catch {
        throw new Error('No se pudo cargar el archivo characters.json.')
    }
}

async function loadHarem() {
    try {
        const data = await fs.readFile(haremFilePath, 'utf-8')
        return JSON.parse(data)
    } catch {
        return []
    }
}

let handler = async (m, { conn, args }) => {
    try {
        if (!args.length) {
            return conn.reply(
                m.chat,
                `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵  ࿆
𐚁 ֹ ִ *ᴡᴀɪғᴜ ɪɴғᴏ* ! ୧ ֹ ִ

✐ Escribe el nombre de un personaje.

> 〄 Ejemplo: *winfo Aika Sano*
> 〄 También puedes usar *charinfo* o *waifuinfo*`,
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

                text += `\n✐ Escribe el nombre completo para ver su información.`

                return conn.reply(m.chat, text.trim(), m)
            }
        }

        if (!character) {
            return conn.reply(
                m.chat,
                `𐚁 ֹ ִ *ɴᴏ ᴇɴᴄᴏɴᴛʀᴀᴅᴏ* ! ୧ ֹ ִ

✐ No encontré:

> 〄 *${args.join(' ')}*

✐ Revisa el nombre e inténtalo nuevamente.`,
                m
            )
        }

        const harem = await loadHarem()

        const userEntry = harem.find(entry =>
            String(entry?.characterId) === String(character.id)
        )

        const ownerId = userEntry?.userId || null

        const sortedCharacters = [...characters].sort(
            (a, b) => Number(b.value || 0) - Number(a.value || 0)
        )

        const position = sortedCharacters.findIndex(
            c => String(c?.id) === String(character.id)
        ) + 1

        const totalCharacters = characters.length

        const value = Number(character.value || 0).toLocaleString()

        const images = Array.isArray(character.img)
            ? character.img.length
            : 0

        const videos = Array.isArray(character.vid)
            ? character.vid.length
            : 0

        let status
        let mentions = []

        if (ownerId) {
            const cleanOwner = ownerId.split('@')[0]
            status = `Reclamado por @${cleanOwner}`
            mentions = [ownerId]
        } else {
            status = 'Disponible para reclamar'
        }

        const message = `
࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵  ࿆
𐚁 ֹ ִ *ᴡᴀɪғᴜ ɪɴғᴏ* ! ୧ ֹ ִ

✐ *${character.name || 'Desconocido'}*

> 〄 Género: *${character.gender || 'N/A'}*
> 〄 Valor: *${value}*
> 〄 Ranking: *#${position} de ${totalCharacters}*
> 〄 Estado: *${status}*
> 〄 Fuente: *${character.source || 'Desconocida'}*
> 〄 Imágenes: *${images}*
> 〄 Videos: *${videos}*

✐ *Información actualizada ♡*
`.trim()

        return conn.reply(
            m.chat,
            message,
            m,
            { mentions }
        )

    } catch (error) {
        return conn.reply(
            m.chat,
            `𐚁 ֹ ִ *ᴇʀʀᴏʀ* ! ୧ ֹ ִ

✐ No se pudo cargar la información.

> 〄 ${error?.message || 'Error desconocido'}`,
            m
        )
    }
}

handler.help = [
    'charinfo <nombre>',
    'winfo <nombre>',
    'waifuinfo <nombre>'
]

handler.tags = ['anime']

handler.command = [
    'charinfo',
    'winfo',
    'waifuinfo'
]

handler.group = true
handler.register = true

export default handler