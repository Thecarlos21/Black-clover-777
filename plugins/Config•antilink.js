const linkRegex = /(?:https?:\/\/)?(?:www\.)?(?:chat\.whatsapp\.com\/[\w-]{10,}|whatsapp\.com\/channel\/[\w-]+|(?:t|telegram)\.me\/\S+)/gi

const isRealJid = value => /^\d+@s\.whatsapp\.net$/.test(String(value || ''))

const toNumber = value =>
  String(value || '')
    .split('@')[0]
    .split(':')[0]
    .replace(/\D/g, '')

const cleanJid = value => {
  const text = String(value || '').trim()

  if (!text) return ''

  if (!text.includes('@')) {
    const number = text.replace(/\D/g, '')
    return number ? `${number}@s.whatsapp.net` : ''
  }

  const [user, server] = text.split('@')
  const base = user.split(':')[0]

  return base ? `${base}@${server}` : ''
}

const realJidOf = participant => {
  const values = [
    participant?.phoneNumber,
    participant?.pn,
    participant?.senderPn,
    participant?.jid,
    participant?.id
  ]

  for (const value of values) {
    const jid = cleanJid(value)

    if (isRealJid(jid)) return jid
  }

  return ''
}

export async function before(m, { conn, participants, groupMetadata, isAdmin, isBotAdmin }) {
  if (m.fromMe) return true
  if (!m.isGroup) return false

  const chat = global.db.data.chats[m.chat]

  if (!chat?.antiLink) return true

  const text = m.text || ''
  const textLinks = text.match(linkRegex) || []

  const groupInvite = m.message?.groupInviteMessage || null
  const channelInvite = m.message?.newsletterAdminInviteMessage || null

  if (!textLinks.length && !groupInvite && !channelInvite) return true

  const sender = m.sender || m.key?.participant

  if (!sender) return true

  let list = groupMetadata?.participants || participants || []

  if (!list.length) {
    try {
      const metadata = await conn.groupMetadata(m.chat)
      list = metadata?.participants || []
    } catch (e) {
      console.error('AntiLink metadata error:', e)
      return true
    }
  }

  const resolveJid = async value => {
    const jid = cleanJid(value)

    if (!jid) return ''

    if (isRealJid(jid)) return jid

    if (jid.endsWith('@lid')) {
      const found = list.find(p =>
        [p?.lid, p?.id].some(item => cleanJid(item) === jid)
      )

      const fromList = realJidOf(found)

      if (fromList) return fromList

      try {
        const pn = await conn?.signalRepository?.lidMapping?.getPNForLID?.(jid)
        const mapped = cleanJid(pn)

        if (isRealJid(mapped)) return mapped
      } catch {}
    }

    return jid
  }

  let senderJid = ''

  for (const candidate of [
    m.senderResolved,
    sender,
    m.key?.participantAlt,
    m.key?.participantPn,
    m.key?.senderPn,
    m.senderPn
  ]) {
    const jid = await resolveJid(candidate)

    if (isRealJid(jid)) {
      senderJid = jid
      break
    }

    if (!senderJid && jid) senderJid = jid
  }

  const senderIds = [sender, senderJid].map(cleanJid).filter(Boolean)
  const senderNumber = toNumber(senderJid || sender)

  const participant = list.find(p => {
    const ids = [p?.id, p?.jid, p?.lid, p?.phoneNumber, p?.pn, p?.senderPn]
      .filter(Boolean)
      .map(cleanJid)

    return (
      ids.some(id => senderIds.includes(id)) ||
      ids.some(id => toNumber(id) && toNumber(id) === senderNumber)
    )
  })

  if (participant?.admin === 'superadmin') {
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

  if (!isBotAdmin) {
    await conn.reply(
      m.chat,
      '🚫 *Detecté un enlace prohibido, pero no soy admin y no puedo borrarlo ni expulsar al usuario.*',
      m
    )
    return true
  }

  let ownCode = ''

  try {
    ownCode = (await conn.groupInviteCode(m.chat)) || ''
  } catch (e) {
    console.error('AntiLink invite code error:', e)
  }

  const foreignTextLinks = textLinks.filter(link => !(ownCode && link.includes(ownCode)))

  const foreignGroupInvite = Boolean(
    groupInvite &&
    !(
      (ownCode && groupInvite.inviteCode === ownCode) ||
      groupInvite.groupJid === m.chat
    )
  )

  if (!foreignTextLinks.length && !foreignGroupInvite && !channelInvite) return true

  const targetJid = participant?.id || senderJid || sender
  const mentionJid = senderJid || targetJid

  await conn.reply(
    m.chat,
    `📎 *¡ALERTA DE ENLACE PROHIBIDO!*\n\n⚠️ *@${toNumber(mentionJid)}* ha compartido un enlace sospechoso.\n💀 *Eliminación inminente...*`,
    m,
    {
      mentions: [mentionJid]
    }
  )

  const settings = globalThis.setting || global.db.data.settings[conn.user?.jid] || {}

  if (!settings.restrict) {
    await conn.reply(
      m.chat,
      `⚙️ *Restricción desactivada.* No puedo expulsar a @${toNumber(mentionJid)}`,
      m,
      {
        mentions: [mentionJid]
      }
    )
    return true
  }

  try {
    await conn.sendMessage(m.chat, { delete: m.key })
  } catch (e) {
    console.error('AntiLink delete error:', e)
  }

  await new Promise(resolve => setTimeout(resolve, 500))

  try {
    await conn.groupParticipantsUpdate(m.chat, [targetJid], 'remove')
  } catch (e) {
    console.error('AntiLink remove error:', e)

    await conn.reply(
      m.chat,
      `🚫 *No pude expulsar al usuario.*\n\n${e.message || e}`,
      m
    )
  }

  return true
}