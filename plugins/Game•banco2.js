let handler = async (m, { conn, text, usedPrefix }) => {
    const users = global.db.data.users[m.sender]

    if (!users) return conn.reply(m.chat, '🚩 No se pudo encontrar tu cuenta.', m)

    if (typeof users.monedas !== 'number') users.monedas = 0
    if (!users.deuda || typeof users.deuda !== 'object') {
        users.deuda = {
            monto: 0,
            total: 0,
            interes: 0.05,
            vencimiento: null
        }
    }

    if (typeof users.deuda.monto !== 'number') users.deuda.monto = 0
    if (typeof users.deuda.total !== 'number') users.deuda.total = 0
    if (typeof users.deuda.interes !== 'number') users.deuda.interes = 0.05
    if (typeof users.bloqueado !== 'boolean') users.bloqueado = false

    const args = text?.trim().split(/\s+/).filter(Boolean) || []
    const accion = args[0]?.toLowerCase()

    const formato = cantidad =>
        Number(cantidad || 0).toLocaleString('es-MX')

    if (!accion) {
        return conn.reply(
            m.chat,
            `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯†ִㅤ⃞ׄ†⃞ㅤִ†֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *ʙᴀɴᴄᴏ* ! ୧ ֹ ִ

> † *${usedPrefix}banco saldo*
> † *${usedPrefix}banco pedir <cantidad>*
> † *${usedPrefix}banco pagar <cantidad>*
> † *${usedPrefix}banco deuda*

> 〄 Préstamo máximo › *1,000,000*
> 〄 Interés › *5%*
> 〄 Duración › *24 horas*`,
            m
        )
    }

    if (accion === 'saldo' || accion === 'balance') {
        return conn.reply(
            m.chat,
            `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯†ִㅤ⃞ׄ†⃞ㅤִ†֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *ᴛᴜ ᴄᴜᴇɴᴛᴀ* ! ୧ ֹ ִ

> † *ᴍᴏɴᴇᴅᴀs* › ${formato(users.monedas)}
> † *ᴅᴇᴜᴅᴀ* › ${formato(users.deuda.total || users.deuda.monto)}

> 〄 *Estado:* ${users.deuda.monto > 0 ? 'Préstamo activo' : 'Sin deuda'}`,
            m
        )
    }

    if (accion === 'deuda' || accion === 'estado') {
        if (users.deuda.monto <= 0) {
            return conn.reply(
                m.chat,
                `𐚁 ֹ ִ *ᴅᴇᴜᴅᴀ* ! ୧ ֹ ִ

> † No tienes ningún préstamo pendiente.
> † Tu cuenta está en buen estado.`,
                m
            )
        }

        const vencimiento = users.deuda.vencimiento
            ? new Date(users.deuda.vencimiento).toLocaleString('es-MX')
            : 'No definido'

        const total = users.deuda.total || users.deuda.monto

        return conn.reply(
            m.chat,
            `𐚁 ֹ ִ *ᴅᴇᴜᴅᴀ ᴀᴄᴛᴜᴀʟ* ! ୧ ֹ ִ

> † *ᴅᴇᴜᴅᴀ* › ${formato(users.deuda.monto)}
> † *ᴛᴏᴛᴀʟ* › ${formato(total)}
> † *ɪɴᴛᴇʀᴇ́ѕ* › 5%
> † *ᴠᴇɴᴄɪᴍɪᴇɴᴛᴏ* › ${vencimiento}`,
            m
        )
    }

    if (accion === 'pedir' || accion === 'prestamo') {
        const monto = Number(args[1])

        if (!Number.isInteger(monto) || monto <= 0) {
            return conn.reply(
                m.chat,
                `𐚁 ֹ ִ *ᴍᴏɴᴛᴏ ɪɴᴠᴀ́ʟɪᴅᴏ* ! ୧ ֹ ִ

> † Usa: *${usedPrefix}banco pedir 50000*`,
                m
            )
        }

        if (monto > 1000000) {
            return conn.reply(
                m.chat,
                `𐚁 ֹ ִ *ʟɪ́ᴍɪᴛᴇ sᴜᴘᴇʀᴀᴅᴏ* ! ୧ ֹ ִ

> † El máximo préstamo es de *1,000,000 monedas*.`,
                m
            )
        }

        if (users.deuda.monto > 0) {
            return conn.reply(
                m.chat,
                `𐚁 ֹ ִ *ᴘʀᴇ́sᴛᴀᴍᴏ ᴀᴄᴛɪᴠᴏ* ! ୧ ֹ ִ

> † Ya tienes una deuda de *${formato(users.deuda.monto)} monedas*.
> † Primero liquida tu préstamo actual.`,
                m
            )
        }

        const interes = Math.ceil(monto * 0.05)
        const total = monto + interes
        const vencimiento = Date.now() + 24 * 60 * 60 * 1000

        users.deuda = {
            monto: total,
            total,
            interes: 0.05,
            vencimiento
        }

        users.monedas += monto
        users.bloqueado = true

        return conn.reply(
            m.chat,
            `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯†ִㅤ⃞ׄ†⃞ㅤִ†֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *ᴘʀᴇ́sᴛᴀᴍᴏ ᴀᴘʀᴏʙᴀᴅᴏ* ! ୧ ֹ ִ

> † *ʀᴇᴄɪʙɪsᴛᴇ* › ${formato(monto)}
> † *ɪɴᴛᴇʀᴇ́s* › ${formato(interes)}
> † *ᴅᴇᴜᴅᴀ ᴛᴏᴛᴀʟ* › ${formato(total)}
> † *ᴠᴇɴᴄᴇ* › ${new Date(vencimiento).toLocaleString('es-MX')}

> 〄 *El banco confía en ti ♡*`,
            m
        )
    }

    if (accion === 'pagar' || accion === 'pago') {
        if (users.deuda.monto <= 0) {
            return conn.reply(
                m.chat,
                `𐚁 ֹ ִ *sɪɴ ᴅᴇᴜᴅᴀ* ! ୧ ֹ ִ

> † No tienes ningún préstamo pendiente.`,
                m
            )
        }

        let pago = Number(args[1])

        if (args[1]?.toLowerCase() === 'todo' || args[1]?.toLowerCase() === 'total') {
            pago = users.deuda.monto
        }

        if (!Number.isInteger(pago) || pago <= 0) {
            return conn.reply(
                m.chat,
                `𐚁 ֹ ִ *ᴘᴀɢᴏ ɪɴᴠᴀ́ʟɪᴅᴏ* ! ୧ ֹ ִ

> † Usa: *${usedPrefix}banco pagar 10000*
> † También puedes usar: *${usedPrefix}banco pagar todo*`,
                m
            )
        }

        if (pago > users.monedas) {
            return conn.reply(
                m.chat,
                `𐚁 ֹ ִ *sᴀʟᴅᴏ ɪɴsᴜғɪᴄɪᴇɴᴛᴇ* ! ୧ ֹ ִ

> † Tienes › *${formato(users.monedas)}*
> † Necesitas › *${formato(pago)}*`,
                m
            )
        }

        const deudaAntes = users.deuda.monto
        const pagoReal = Math.min(pago, deudaAntes)

        users.monedas -= pagoReal
        users.deuda.monto -= pagoReal

        if (users.deuda.monto <= 0) {
            users.deuda.monto = 0
            users.deuda.total = 0
            users.deuda.vencimiento = null
            users.bloqueado = false

            return conn.reply(
                m.chat,
                `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯†ִㅤ⃞ׄ†⃞ㅤִ†֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *ᴅᴇᴜᴅᴀ ᴘᴀɢᴀᴅᴀ* ! ୧ ֹ ִ

> † *ᴘᴀɢᴀsᴛᴇ* › ${formato(pagoReal)}
> † *ᴅᴇᴜᴅᴀ* › 0
> † *sᴀʟᴅᴏ* › ${formato(users.monedas)}

> 〄 *Tu cuenta vuelve a estar desbloqueada ♡*`,
                m
            )
        }

        return conn.reply(
            m.chat,
            `𐚁 ֹ ִ *ᴘᴀɢᴏ ʀᴇᴀʟɪᴢᴀᴅᴏ* ! ୧ ֹ ִ

> † *ᴘᴀɢᴀsᴛᴇ* › ${formato(pagoReal)}
> † *ᴅᴇᴜᴅᴀ ʀᴇsᴛᴀɴᴛᴇ* › ${formato(users.deuda.monto)}
> † *sᴀʟᴅᴏ* › ${formato(users.monedas)}

> 〄 *Sigue pagando para desbloquear tu cuenta ♡*`,
            m
        )
    }

    return conn.reply(
        m.chat,
        `𐚁 ֹ ִ *ᴏᴘᴄɪᴏ́ɴ ɴᴏ ᴠᴀ́ʟɪᴅᴀ* ! ୧ ֹ ִ

> † Usa *${usedPrefix}banco* para ver las opciones disponibles.`,
        m
    )
}

handler.help = [
    'banco',
    'banco saldo',
    'banco pedir <cantidad>',
    'banco pagar <cantidad>',
    'banco pagar todo',
    'banco deuda'
]

handler.tags = ['economy']
handler.command = ['banco', 'bank', 'banco2', 'bank2']
handler.register = true
handler.group = true

export default handler