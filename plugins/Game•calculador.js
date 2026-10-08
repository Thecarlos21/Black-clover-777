const handler = async (m, { conn, command, text }) => {
    if (!text) {
        return conn.reply(
            m.chat,
            `𐚁 ֹ ִ *ᴄᴀʟᴄᴜʟᴀᴅᴏʀᴀ sᴏᴄɪᴀʟ* ! ୧ ֹ ִ

> † Menciona a alguien o escribe un nombre.

> 〄 Ejemplo: *.gay @usuario*`,
            m
        )
    }

    const porcentaje = Math.floor(Math.random() * 101)
    const nombre = text.trim().toUpperCase()

    const resultados = {
        gay: ['🏳️‍🌈', 'Nivel bajo, casi normal.', 'Sospechoso... bastante sospechoso.', 'Confirmado por la NASA.'],
        lesbiana: ['🏳️‍🌈', 'Curiosidad leve.', 'Hay sentimientos ocultos.', 'Amor extremo detectado.'],
        pajero: ['😏💦', 'Bastante tranquilo.', 'Nivel promedio de actividad.', 'Necesita descanso urgente.'],
        pajera: ['😏💦', 'Bastante tranquila.', 'Nivel promedio de actividad.', 'Necesita descanso urgente.'],
        puto: ['🔥🥵', 'Aún tiene salvación.', 'Ya está en el camino.', 'Profesional certificado.'],
        puta: ['🔥🥵', 'Aún tiene salvación.', 'Ya está en el camino.', 'Profesional certificada.'],
        manco: ['💩', 'Aún puede mejorar.', 'Problemas de habilidad.', 'Caso perdido.'],
        manca: ['💩', 'Aún puede mejorar.', 'Problemas de habilidad.', 'Caso perdido.'],
        rata: ['🐁', 'No es tan rata.', 'Le gusta ahorrar demasiado.', 'Rey de la rata economía.'],
        prostituto: ['🫦👅', 'Bajo nivel de actividad.', 'Negocio activo.', 'Empresa registrada oficialmente.'],
        prostituta: ['🫦👅', 'Bajo nivel de actividad.', 'Negocio activo.', 'Empresa registrada oficialmente.']
    }

    const data = resultados[command]

    if (!data) {
        return conn.reply(m.chat, '𐚁 ֹ ִ *ᴄᴏᴍᴀɴᴅᴏ ɪɴᴠᴀ́ʟɪᴅᴏ* ! ୧ ֹ ִ', m)
    }

    const nivel = porcentaje < 30 ? data[1] : porcentaje < 70 ? data[2] : data[3]

    const respuestas = [
        'El universo ha hablado.',
        'Los científicos lo confirman.',
        'Resultado procesado por IA.',
        'Análisis completado con éxito.',
        'Sistema emocional activado.'
    ]

    const respuesta = respuestas[Math.floor(Math.random() * respuestas.length)]

    const { key } = await conn.sendMessage(
        m.chat,
        {
            text: `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯†ִㅤ⃞ׄ†⃞ㅤִ†֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *ᴀɴᴀʟɪᴢᴀɴᴅᴏ* ! ୧ ֹ ִ

> † *sᴜᴊᴇᴛᴏ* › ${nombre}
> † *ᴇsᴛᴀᴅᴏ* › 10%

〔█▒▒▒▒▒▒▒▒▒〕`
        },
        { quoted: m }
    )

    const pasos = [
        [30, '███▒▒▒▒▒▒▒'],
        [50, '█████▒▒▒▒▒'],
        [70, '███████▒▒▒'],
        [90, '█████████▒'],
        [100, '██████████']
    ]

    for (const [porcentajeCarga, barra] of pasos) {
        await new Promise(resolve => setTimeout(resolve, 500))

        await conn.sendMessage(
            m.chat,
            {
                text: `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯†ִㅤ⃞ׄ†⃞ㅤִ†֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *ᴀɴᴀʟɪᴢᴀɴᴅᴏ* ! ୧ ֹ ִ

> † *sᴜᴊᴇᴛᴏ* › ${nombre}
> † *ᴇsᴛᴀᴅᴏ* › ${porcentajeCarga}%

〔${barra}〕`
            },
            { edit: key }
        )
    }

    await new Promise(resolve => setTimeout(resolve, 300))

    await conn.sendMessage(
        m.chat,
        {
            text: `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯†ִㅤ⃞ׄ†⃞ㅤִ†֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *ᴄᴀʟᴄᴜʟᴀᴅᴏʀᴀ sᴏᴄɪᴀʟ* ! ୧ ֹ ִ

> † *sᴜᴊᴇᴛᴏ* › ${nombre}
> † *ᴛɪᴘᴏ* › ${command.toUpperCase()}
> † *ʀᴇsᴜʟᴛᴀᴅᴏ* › ${porcentaje}% ${data[0]}

> 〄 *${nivel}*

> † ${respuesta}`
        },
        { edit: key }
    )

    await m.react('☑️')
}

handler.help = [
    'gay',
    'lesbiana',
    'pajero',
    'pajera',
    'puto',
    'puta',
    'manco',
    'manca',
    'rata',
    'prostituta',
    'prostituto'
]

handler.tags = ['fun']

handler.command = [
    'gay',
    'lesbiana',
    'pajero',
    'pajera',
    'puto',
    'puta',
    'manco',
    'manca',
    'rata',
    'prostituta',
    'prostituto'
]

handler.register = true
handler.group = true

export default handler
