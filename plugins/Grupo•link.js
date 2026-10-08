const handler = async (m, { conn }) => {
  try {
    const metadata = await conn.groupMetadata(m.chat)
    const participants = metadata?.participants || []

    const botJid = conn.user?.jid || conn.user?.id
    const botLid = conn.user?.lid

    const normalize = jid => {
      if (!jid) return ''
      return jid.split(':')[0].trim().toLowerCase()
    }

    const botJidNormalized = normalize(botJid)
    const botLidNormalized = normalize(botLid)

    const bot = participants.find(p => {
      const ids = [
        p?.id,
        p?.jid,
        p?.lid,
        p?.phoneNumber
      ].filter(Boolean).map(normalize)

      return ids.includes(botJidNormalized) || ids.includes(botLidNormalized)
    })

    const isBotAdmin =
      bot?.admin === 'admin' ||
      bot?.admin === 'superadmin' ||
      bot?.isAdmin === true ||
      bot?.isSuperAdmin === true

    if (!isBotAdmin) {
      return await conn.reply(
        m.chat,
        `🤖 *BOT SIN PERMISOS SUFICIENTES*\n\n> Debo tener permisos de *Administrador* para ejecutar esta acción.\n\n🔍 Ejecuta: *dar al bot admin*\n🔒 Estado actual: *no admin XD*`,
        m
      )
    }

    const code = await conn.groupInviteCode(m.chat)

    if (!code) {
      return await conn.reply(
        m.chat,
        '❌ No pude obtener el enlace de invitación del grupo.',
        m
      )
    }

    const link = `https://chat.whatsapp.com/${code}`

    await conn.reply(
      m.chat,
      `🚩 Aquí tienes el link del grupo:\n${link}`,
      m,
      { detectLink: true }
    )

  } catch (error) {
    console.error('Error en comando link:', error)

    await conn.reply(
      m.chat,
      '❌ Ocurrió un error al generar el link. Asegúrate de que soy administrador.',
      m
    )
  }
}

handler.help = ['link']
handler.tags = ['grupo']
handler.command = ['link']
handler.group = true

export default handler
