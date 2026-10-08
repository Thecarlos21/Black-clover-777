import fs from 'fs'

const timeout = 60000
const poin = 10000

const handler = async (m, { conn }) => {
    conn.tekateki = conn.tekateki || {}

    const id = m.chat

    if (conn.tekateki[id]) {
        return conn.reply(
            m.chat,
            `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵  ࿆
𐚁 ֹ ִ *ᴀᴄᴇʀᴛɪᴊᴏ ᴀᴄᴛɪᴠᴏ* ! ୧ ֹ ִ

✐ Ya hay un acertijo pendiente en este chat.

> 〄 Responde al acertijo anterior antes de iniciar otro.`,
            conn.tekateki[id][0]
        )
    }

    let tekateki

    try {
        tekateki = JSON.parse(
            fs.readFileSync('./src/game/acertijo.json', 'utf-8')
        )
    } catch {
        return conn.reply(
            m.chat,
            `𐚁 ֹ ִ *ᴇʀʀᴏʀ* ! ୧ ֹ ִ

✐ No se pudo cargar la base de acertijos.`,
            m
        )
    }

    if (!Array.isArray(tekateki) || !tekateki.length) {
        return conn.reply(
            m.chat,
            `𐚁 ֹ ִ *ᴀᴄᴇʀᴛɪᴊᴏs* ! ୧ ֹ ִ

✐ No hay acertijos disponibles.`,
            m
        )
    }

    const disponibles = tekateki.filter(x =>
        x?.question && x?.response
    )

    if (!disponibles.length) {
        return conn.reply(
            m.chat,
            `𐚁 ֹ ִ *ᴇʀʀᴏʀ* ! ୧ ֹ ִ

✐ No hay acertijos válidos en la base de datos.`,
            m
        )
    }

    const json =
        disponibles[Math.floor(Math.random() * disponibles.length)]

    const respuesta = String(json.response).trim()
    const pista = respuesta
        .replace(/[A-Za-zÁÉÍÓÚáéíóúÑñ]/g, '_')

    const caption = `
࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵  ࿆
𐚁 ֹ ִ *ᴀᴄᴇʀᴛɪᴊᴏs* ! ୧ ֹ ִ

✐ *${json.question}*

> 〄 Pista: *${pista}*
> 〄 Tiempo: *${timeout / 1000} segundos*
> 〄 Premio: *+${poin.toLocaleString()}* 🪙

✐ *Responde directamente con la respuesta.*
`.trim()

    await m.react('🧩')

    const msg = await conn.reply(m.chat, caption, m)

    const timer = setTimeout(async () => {
        if (!conn.tekateki[id]) return

        await conn.reply(
            m.chat,
            `𐚁 ֹ ִ *ᴛɪᴇᴍᴘᴏ ᴀɢᴏᴛᴀᴅᴏ* ! ୧ ֹ ִ

✐ Nadie consiguió resolver el acertijo.

> 〄 Respuesta: *${respuesta}*
> 〄 Premio perdido: *${poin.toLocaleString()}* 🪙`,
            msg
        )

        await m.react('⏱️')

        delete conn.tekateki[id]
    }, timeout)

    conn.tekateki[id] = [
        msg,
        json,
        poin,
        timer
    ]
}

handler.before = async (m, { conn }) => {
    conn.tekateki = conn.tekateki || {}

    const id = m.chat
    const juego = conn.tekateki[id]

    if (!juego || !m.text) return

    if (m.key?.fromMe) return

    const respuestaCorrecta =
        String(juego[1]?.response || '')
            .trim()
            .toLowerCase()

    const respuestaUsuario =
        String(m.text)
            .trim()
            .toLowerCase()

    if (!respuestaCorrecta || respuestaUsuario !== respuestaCorrecta) {
        return
    }

    clearTimeout(juego[3])
    delete conn.tekateki[id]

    const premio = Number(juego[2] || poin)

    global.db.data.users[m.sender] =
        global.db.data.users[m.sender] || {}

    global.db.data.users[m.sender].monedas =
        Number(global.db.data.users[m.sender].monedas || 0) + premio

    await m.react('☑️')

    await conn.reply(
        m.chat,
        `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵  ࿆
𐚁 ֹ ִ *ᴀᴄᴇʀᴛɪᴊᴏ ʀᴇsᴜᴇʟᴛᴏ* ! ୧ ֹ ִ

✐ ¡Correcto! 🎉

> 〄 Respuesta: *${juego[1].response}*
> 〄 Ganador: @${m.sender.split('@')[0]}
> 〄 Premio: *+${premio.toLocaleString()}* 🪙

✐ *¡Buen trabajo! ♡*`,
        juego[0],
        { mentions: [m.sender] }
    )

    return true
}

handler.help = ['acertijo', 'acert', 'adivinanza', 'tekateki']
handler.tags = ['fun']
handler.command = ['acertijo', 'acert', 'adivinanza', 'tekateki']

export default handler