const isRealJid = value =>
  /^\d+@s\.whatsapp\.net$/.test(String(value || ''))

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

const paramCandidates = raw => {
  const text = String(raw || '').trim()

  if (!text) return []

  if (text.startsWith('{')) {
    try {
      const data = JSON.parse(text)

      return [
        data.phone_number,
        data.phoneNumber,
        data.pn,
        data.jid,
        data.id,
        data.lid
      ].filter(Boolean).map(String)
    } catch {}
  }

  return [text]
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

export async function before(m, { conn, participants: handlerParticipants, groupMetadata }) {
  try {
    if (!m.isGroup || !m.messageStubType) return

    const chat = global.db?.data?.chats?.[m.chat]

    if (!chat?.detect) return

    if (!m.sender && !m.key?.participant) return

    let participants =
      groupMetadata?.participants ||
      handlerParticipants ||
      []

    if (!participants.length) {
      try {
        const metadata = await conn.groupMetadata(m.chat)
        participants = metadata?.participants || []
      } catch (e) {
        console.error('autodetect metadata:', e?.message || e)
      }
    }

    const resolveJid = async value => {
      const jid = cleanJid(value)

      if (!jid) return ''

      if (isRealJid(jid)) return jid

      if (jid.endsWith('@lid')) {
        const participant = participants.find(p =>
          [p?.lid, p?.id].some(
            item => cleanJid(item) === jid
          )
        )

        const fromMetadata = realJidOf(participant)

        if (fromMetadata) return fromMetadata

        try {
          const mapping = conn?.signalRepository?.lidMapping
          const pn = await mapping?.getPNForLID?.(jid)
          const mapped = cleanJid(pn)

          if (isRealJid(mapped)) return mapped
        } catch {}
      }

      return jid
    }

    const resolveAny = async list => {
      let fallback = ''

      for (const item of list) {
        const jid = await resolveJid(item)

        if (isRealJid(jid)) return jid

        if (!fallback && jid) fallback = jid
      }

      return fallback
    }

    const actor = await resolveAny([
      m.senderResolved,
      m.key?.participantAlt,
      m.key?.participantPn,
      m.key?.senderPn,
      m.senderPn,
      m.sender,
      m.key?.participant
    ])

    if (!actor) return

    const actorNumber = toNumber(actor)
    const usuario = actorNumber ? `@${actorNumber}` : 'Usuario'

    const params = Array.isArray(m.messageStubParameters)
      ? m.messageStubParameters
      : []

    const mentions = []

    if (isRealJid(actor)) mentions.push(actor)

    const isValidText = text =>
      typeof text === 'string' &&
      text.trim().length > 1 &&
      !text.includes('@')

    const t0 = params[0]

    let mensaje = null

    const header = `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *sɪsᴛᴇᴍᴀ* ! ୧ ֹ ִ`

    switch (m.messageStubType) {
      case 21:
        if (!isValidText(t0)) return

        mensaje = `${header}

> ✐ ⚠️ *Nombre del grupo cambiado*
> 〄 👤 ${usuario}
> 〄 🌿 *Nuevo nombre:* ${t0}`
        break

      case 22:
        mensaje = `${header}

> ✐ 🖼️ *Foto del grupo actualizada*
> 〄 👤 ${usuario}`
        break

      case 23:
        mensaje = `${header}

> ✐ ⚙️ *Configuración del grupo actualizada*
> 〄 👤 ${usuario}`
        break

      case 24:
        mensaje = `${header}

> ✐ 🔗 *Enlace del grupo reiniciado*
> 〄 👤 ${usuario}`
        break

      case 25:
        mensaje = `${header}

> ✐ 🔒 *Configuración de mensajes actualizada*
> 〄 👤 ${usuario}`
        break

      case 29:
      case 30: {
        const target = await resolveAny(
          paramCandidates(params[0])
        )

        if (!target) return

        const targetNumber = toNumber(target)

        const tag = targetNumber
          ? `@${targetNumber}`
          : 'Usuario'

        if (
          isRealJid(target) &&
          !mentions.includes(target)
        ) {
          mentions.push(target)
        }

        mensaje = m.messageStubType === 29
          ? `${header}

> ✐ 🥳 *Nuevo administrador*
> 〄 ${tag} ahora es administrador.
> 〄 👤 Por: ${usuario}`
          : `${header}

> ✐ 😿 *Administrador removido*
> 〄 ${tag} ya no es administrador.
> 〄 👤 Por: ${usuario}`

        break
      }

      default:
        return
    }

    if (!mensaje) return

    let pp = null

    if (m.messageStubType === 22) {
      try {
        pp = await conn.profilePictureUrl(m.chat, 'image')
      } catch {
        pp = global.icons ||
          'https://raw.githubusercontent.com/Frimemoloxz/DataBase/main/1791852638655.jpeg'
      }
    }

    const sendText = async () => {
      return conn.sendMessage(
        m.chat,
        {
          text: mensaje,
          mentions
        }
      )
    }

    if (m.messageStubType === 22 && pp) {
      try {
        await conn.sendMessage(
          m.chat,
          {
            image: { url: pp },
            caption: mensaje,
            mentions
          }
        )

        return
      } catch (e) {
        console.error(
          'autodetect imagen:',
          e?.message || e
        )
      }
    }

    try {
      await sendText()
    } catch (e) {
      console.error(
        'autodetect mensaje:',
        e?.message || e
      )
    }

  } catch (e) {
    console.error(
      'error eventos grupo:',
      e?.stack || e
    )
  }
}