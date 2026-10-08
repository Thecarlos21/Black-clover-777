//código creado x The Carlos 
//no olviden dejar créditos 

const TIEMPO_BLOQUEO_MS = 2 * 24 * 60 * 60 * 1000

export async function before(m, { conn, isAdmin, isBotAdmin, isOwner, isROwner }) {
  try {
    if (!m || !m.message) return false
    if (m.isBaileys && m.fromMe) return true
    if (typeof m.text !== 'string') return false

    const text = m.text.toUpperCase()
    const exentos = ['PIEDRA', 'PAPEL', 'TIJERA', 'SERBOT', 'JADIBOT']
    const comandoPermitidoBloqueado = ['CODE']

    global.db.data ||= {}
    global.db.data.users ||= {}
    global.db.data.settings ||= {}

    const bot = global.db.data.settings[conn.user.jid] || {}
    const user = global.db.data.users[m.sender] || (global.db.data.users[m.sender] = {})
    const gp1 = global.gp1 || 'https://chat.whatsapp.com/LqidiNoYuDY5aA60c8fuDP?mode=gi_t'

    if (exentos.find(v => text.includes(v))) return true
    if (comandoPermitidoBloqueado.find(v => text.startsWith(v))) return true

    if (user.bloqueado && user.tiempoBloqueo) {
      const ahora = Date.now()
      const tiempoPasado = ahora - user.tiempoBloqueo

      if (tiempoPasado >= TIEMPO_BLOQUEO_MS) {
        await conn.updateBlockStatus(m.sender, 'unblock').catch(() => {})

        user.bloqueado = false
        user.tiempoBloqueo = 0
        user.warnPrivado = 0

        await conn.sendMessage(m.chat, {
          text: `> 🔓 DESBLOQUEO DEL SISTEMA
> 👤 Usuario: @${m.sender.split('@')[0]}
> ⚡ Estado: ACTIVO
> 🟢 Acceso restaurado
> 🧬 Sistema: CYBERPUNK`,
          mentions: [m.sender]
        })

        return true
      } else {
        return false
      }
    }

    if (!m.isGroup && bot.antiPrivate && !isOwner && !isROwner) {
      user.warnPrivado = (user.warnPrivado || 0) + 1

      if (user.warnPrivado >= 3) {
        await conn.sendMessage(m.chat, {
          text: `> 💀 BLOQUEO DEL SISTEMA
> 👤 Usuario: @${m.sender.split('@')[0]}
> 🚫 Acceso: DENEGADO
> ⏳ Duración: 2 días
> ⚠️ Motivo: Uso indebido en privado
> 
> 🌐 GRUPO OFICIAL
> ${gp1}
> 
> 🧬 CYBERPUNK SECURITY`,
          mentions: [m.sender]
        })

        await conn.updateBlockStatus(m.sender, 'block').catch(() => {})

        user.warnPrivado = 0
        user.bloqueado = true
        user.tiempoBloqueo = Date.now()

        return false
      }

      await conn.sendMessage(m.chat, {
        text: `> ⚠️ ADVERTENCIA DEL SISTEMA
> 👤 Usuario: @${m.sender.split('@')[0]}
> 🚫 El bot no puede utilizarse en privado
> 🔢 Intentos: ${user.warnPrivado}/3
> 
> 💡 Usa el bot dentro del grupo
> ${gp1}
> 
> 🧬 CYBERPUNK SECURITY`,
        mentions: [m.sender]
      })

      return false
    }

    return true

  } catch (e) {
    console.error('anti privado error', e)
    return true
  }
}