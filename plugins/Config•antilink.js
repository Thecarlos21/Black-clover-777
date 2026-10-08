const linkRegex = /(https?:\/\/(?:www\.)?(?:t\.me|telegram\.me|whatsapp\.com)\/\S+)|(https?:\/\/chat\.whatsapp\.com\/\S+)|(https?:\/\/whatsapp\.com\/channel\/\S+)/i

export async function before(m, { conn, isAdmin, getUserDisplay }) {
  if (m.isBaileys && m.fromMe) return true
  if (!m.isGroup) return false

  const text = m.text || ''
  if (!text) return true

  const chat = global.db.data.chats[m.chat]
  const settings = global.db.data.settings[conn.user.jid] || {}

  if (!chat?.antiLink) return true

  const isGroupLink = text.match(linkRegex)
  if (!isGroupLink) return true

  let metadata

  try {
    metadata = await conn.groupMetadata(m.chat)
  } catch (e) {
    console.error('AntiLink metadata error:', e)
    return true
  }

  const sender = m.sender || m.key?.participant
  if (!sender) return true

  const senderDisplay = await getUserDisplay(sender)
  const senderJid = senderDisplay?.jid || sender

  const participant = metadata?.participants?.find(p => {
    const ids = [
      p.id,
      p.jid,
      p.lid,
      p.phoneNumber,
      p.pn
    ].filter(Boolean)

    return ids.includes(sender) || ids.includes(senderJid)
  })

  const isSuperAdmin = participant?.admin === 'superadmin'

  const hasGroupLink = /https?:\/\/(?:chat\.)?whatsapp\.com\/\S+|https?:\/\/whatsapp\.com\/channel\/\S+/i.test(text)

  if (isSuperAdmin && hasGroupLink) {
    await conn.reply(
      m.chat,
      '⚔️ *Anti-Enlace activado, pero eres el creador del grupo (superadmin). Te salvaste.*',
      m
    )
    return true
  }

  if (isAdmin) {
    await conn.reply(
      m.chat,
      '⚠️ *Eres admin, el sistema no te expulsará aunque compartas enlaces.*',
      m
    )
    return true
  }

  let thisGroupLink = ''

  try {
    const inviteCode = await conn.groupInviteCode(m.chat)

    if (inviteCode) {
      thisGroupLink = `https://chat.whatsapp.com/${inviteCode}`
    }
  } catch (e) {
    console.error('AntiLink invite code error:', e)
  }

  if (thisGroupLink && text.includes(thisGroupLink)) return true

  const targetJid = participant?.id || senderJid
  const realNumber = senderDisplay?.number || targetJid.split('@')[0]

  await conn.reply(
    m.chat,
    `📎 *¡ALERTA DE ENLACE PROHIBIDO!*\n\n⚠️ *@${realNumber}* ha compartido un enlace sospechoso.\n💀 *Eliminación inminente...*`,
    m,
    {
      mentions: [targetJid]
    }
  )

  if (settings.restrict) {
    try {
      await conn.sendMessage(m.chat, {
        delete: m.key
      })

      await new Promise(resolve => setTimeout(resolve, 500))

      await conn.groupParticipantsUpdate(
        m.chat,
        [targetJid],
        'remove'
      )
    } catch (e) {
      console.error('AntiLink action error:', e)

      return conn.reply(
        m.chat,
        `🚫 *No pude eliminar o expulsar al usuario.*\n\n${e.message || e}`,
        m
      )
    }
  } else {
    await conn.reply(
      m.chat,
      `⚙️ *Restricción desactivada.* No puedo expulsar a @${realNumber}`,
      m,
      {
        mentions: [targetJid]
      }
    )
  }

  return true
}