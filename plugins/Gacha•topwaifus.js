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
        const characters = await loadCharacters()

        if (!Array.isArray(characters) || !characters.length) {
            return conn.reply(m.chat, '𐚁 ֹ ִ *No hay personajes registrados.*', m)
        }

        const sortedCharacters = [...characters].sort(
            (a, b) => Number(b.value || 0) - Number(a.value || 0)
        )

        const search = args.join(' ').trim()

        if (search && isNaN(search)) {
            const found = sortedCharacters.filter(x =>
                String(x.name || '').toLowerCase().includes(search.toLowerCase())
            )

            if (!found.length) {
                return conn.reply(
                    m.chat,
                    `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵  ࿆
𐚁 ֹ ִ *ʙᴜ́sǫᴜᴇᴅᴀ* ! ୧ ֹ ִ

✐ No encontré ningún personaje con el nombre:

> 〄 *${search}*`,
                    m
                )
            }

            let text = `
࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵  ࿆
𐚁 ֹ ִ *ʙᴜ́sǫᴜᴇᴅᴀ ᴅᴇ ᴡᴀɪғᴜs* ! ୧ ֹ ִ

✐ *Resultados encontrados*

`

            found.slice(0, 10).forEach((character, index) => {
                const position = sortedCharacters.indexOf(character) + 1

                text += `> 〄 *${position}.* ${character.name || 'Desconocido'}\n`
                text += `>    ✦ Valor: *${Number(character.value || 0).toLocaleString()}*\n\n`
            })

            text += `✐ *Resultados:* ${found.length}`

            return conn.reply(m.chat, text.trim(), m)
        }

        const page = Math.max(parseInt(args[0]) || 1, 1)
        const itemsPerPage = 10
        const totalCharacters = sortedCharacters.length
        const totalPages = Math.max(Math.ceil(totalCharacters / itemsPerPage), 1)

        if (page > totalPages) {
            return conn.reply(
                m.chat,
                `𐚁 ֹ ִ *Página inexistente* ! ୧ ֹ ִ\n\n✐ Solo existen *${totalPages} páginas*.`,
                m
            )
        }

        const startIndex = (page - 1) * itemsPerPage
        const charactersToShow = sortedCharacters.slice(
            startIndex,
            startIndex + itemsPerPage
        )

        let message = `
࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ︵  ࿆
𐚁 ֹ ִ *ᴛᴏᴘ ᴡᴀɪғᴜs* ! ୧ ֹ ִ

✐ *Personajes con mayor valor*

`

        charactersToShow.forEach((character, index) => {
            const position = startIndex + index + 1
            const medal =
                position === 1 ? '🥇' :
                position === 2 ? '🥈' :
                position === 3 ? '🥉' : '✦'

            message += `> ${medal} *${position}.* ${character.name || 'Desconocido'}\n`
            message += `>    └─ Valor: *${Number(character.value || 0).toLocaleString()}*\n\n`
        })

        message += `✐ *Página:* ${page}/${totalPages}\n`
        message += `✐ *Personajes:* ${totalCharacters}\n\n`
        message += `> 〄 Usa *topwaifus 2* para ver la siguiente página.\n`
        message += `> 〄 Usa *topwaifus nombre* para buscar.`

        return conn.reply(m.chat, message.trim(), m)

    } catch (error) {
        return conn.reply(
            m.chat,
            `𐚁 ֹ ִ *ᴇʀʀᴏʀ* ! ୧ ֹ ִ

✐ No se pudo cargar el ranking.

> 〄 ${error.message}`,
            m
        )
    }
}

handler.help = [
    'topwaifus',
    'topwaifus [página]',
    'topwaifus [nombre]'
]

handler.tags = ['anime']

handler.command = [
    'topwaifus',
    'waifustop',
    'waifusboard'
]

handler.group = true
handler.register = true

export default handler