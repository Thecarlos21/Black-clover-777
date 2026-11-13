let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (command === 'verreporte') {
        let reportes = global.db.data.users[m.sender].reportes || 0
        let lastReport = global.db.data.users[m.sender].lastReport || 'Ninguno'
        const buttons = [
            { buttonId: `${usedPrefix}reportar`, buttonText: { displayText: '📩 REPORTAR' }, type: 1 }
        ]
        return conn.sendMessage(m.chat, {
            text: `╭─「 *MIS REPORTES* 」─\n│📊 *Total enviados:* ${reportes}\n│📩 *Último reporte:* ${String(lastReport).slice(0, 50)}...\n╰──────────────`,
            footer: '𝕭𝖑𝖆𝖈𝖐 𝕮𝖑𝖔𝖛𝖊𝖗 | 𝕳𝖆𝖐 v777 ☘️',
            buttons: buttons,
            headerType: 1
        }, { quoted: m })
    }

    if (!text) throw '⚠ *_️Ingrese el error que desea reportar._*'
    if (text.length < 10) throw '⚠️ *_Especifique bien el error, mínimo 10 caracteres._*'
    if (text.length > 1000) throw '⚠️ *_Máximo 1000 caracteres para enviar el error._*'

    global.db.data.users[m.sender].reportes = (global.db.data.users[m.sender].reportes || 0) + 1
    global.db.data.users[m.sender].lastReport = text

    // Limpia el JID: quita @dominio, el sufijo de dispositivo (:0, :12...) y todo lo que no sea dígito
    const clean = jid => String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '')

    const resolveLidToPn = async lid => {
        try {
            if (!lid) return ''
            if (!String(lid).endsWith('@lid')) return ''
            const mapping = conn?.signalRepository?.lidMapping
            if (!mapping) return ''
            if (typeof mapping.getPNForLID === 'function') {
                const pn = await mapping.getPNForLID(lid)
                if (pn) return clean(pn)
            }
        } catch (e) {}
        return ''
    }

    const getRealNumber = async jid => {
        if (!jid) return ''
        const s = String(jid).trim()
        if (s.endsWith('@lid')) {
            const pn = await resolveLidToPn(s)
            if (pn) return pn
        }
        return clean(s)
    }

    const displayNumber = await getRealNumber(m.sender)

    const teks = `╭──────────────\n│⊷〘 *R E P O R T E* 🤍 〙⊷\n├─────────────────\n│⁖🧡꙰ *Cliente:*\n│✏️ Wa.me/${displayNumber}\n│📊 *Total reportes:* ${global.db.data.users[m.sender].reportes}\n│\n│⁖💚꙰ *Mensaje:*\n│📩 ${text}\n╰─────────────────`

    const buttons = [
        { buttonId: `${usedPrefix}verreporte`, buttonText: { displayText: '📋 MIS REPORTES' }, type: 1 }
    ]

    const target = (global.owner && global.owner[0] && global.owner[0][0]) ? `${global.owner[0][0]}@s.whatsapp.net` : null
    if (target) {
        await conn.reply(target, m.quoted ? teks + '\n\n' + (m.quoted?.text || '') : teks, m, { mentions: conn.parseMention(teks) })
    } else {
        await conn.sendMessage(m.chat, { text: 'No se ha podido notificar al creador: owner no configurado.' }, { quoted: m })
    }

    m.reply('⚠️ *_El reporte se envío a mi creador, cualquier informe falso puede ocasionar baneo._*')
    await conn.sendMessage(m.chat, {
        text: `✅ *_Reporte enviado correctamente._*`,
        footer: '𝕭𝖑𝖆𝖈𝖐 𝕮𝖑𝖔𝖛𝖊𝖗 | 𝕳𝖆𝖐 v777 ☘️',
        buttons: buttons,
        headerType: 1
    }, { quoted: m })
}

handler.help = ['reportar', 'verreporte']
handler.tags = ['info']
handler.command = ['reporte', 'report', 'reportar', 'bug', 'error', 'verreporte']
handler.register = true

export default handler