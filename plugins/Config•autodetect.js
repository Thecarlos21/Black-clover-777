export async function before(m, { conn }) {
  try {
    if (!m.isGroup || !m.messageStubType) return

    const chat = global?.db?.data?.chats?.[m.chat]

    if (!chat?.detect) return

    const senderId = m.sender || m.key?.participant

    if (!senderId) return

    let metadata

    try {
      metadata = await conn.groupMetadata(m.chat)
    } catch {
      return
    }

    const participants = metadata?.participants || []

    const normalize = value =>
      String(value || '')
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '')

    const findParticipant = target => {
      const targetIds = [
        target,
        m.key?.participant,
        m.key?.participantAlt,
        m.key?.senderPn,
        m.senderPn
      ]
        .filter(Boolean)
        .map(String)

      const targetNumbers = targetIds
        .map(normalize)
        .filter(n => n.length >= 7)

      return participants.find(p => {
        const ids = [
          p?.id,
          p?.jid,
          p?.lid,
          p?.phoneNumber,
          p?.senderPn,
          p?.pn
        ]
          .filter(Boolean)
          .map(String)

        const numbers = ids
          .map(normalize)
          .filter(n => n.length >= 7)

        return (
          ids.some(id => targetIds.includes(id)) ||
          numbers.some(number => targetNumbers.includes(number))
        )
      })
    }

    const participant = findParticipant(senderId)

    const realNumber =
      participant?.phoneNumber ||
      participant?.senderPn ||
      participant?.pn ||
      normalize(participant?.id) ||
      normalize(senderId)

    const usuario = `@${normalize(realNumber)}`

    const params = Array.isArray(m.messageStubParameters)
      ? m.messageStubParameters
      : []

    const fkontak = {
      key: {
        fromMe: false,
        participant: '0@s.whatsapp.net',
        remoteJid: 'status@broadcast'
      },
      message: {
        contactMessage: {
          vcard:
            `BEGIN:VCARD\nVERSION:3.0\nN:Bot;;;\nFN:Bot\nitem1.TEL;waid=${normalize(realNumber)}:${normalize(realNumber)}\nEND:VCARD`
        }
      }
    }

    let pp

    try {
      pp = await conn.profilePictureUrl(m.chat, 'image')
    } catch {
      pp = global.icons || 'https://qu.ax/QGAVS.jpg'
    }

    const isValidText = text =>
      typeof text === 'string' &&
      text.trim().length > 1 &&
      !text.includes('@')

    const t0 = params[0]

    let mensaje = null
    let mentions = [senderId]

    switch (m.messageStubType) {
      case 21:
        if (isValidText(t0)) {
          mensaje = `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *sɪsᴛᴇᴍᴀ* ! ୧ ֹ ִ

> ✐ ⚠️ *Nombre del grupo cambiado*
> 〄 👤 ${usuario}
> 〄 🌿 *Nuevo nombre:* ${t0}`
        }
        break

      case 22:
        mensaje = `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *sɪsᴛᴇᴍᴀ* ! ୧ ֹ ִ

> ✐ 🖼️ *Foto del grupo actualizada*
> 〄 👤 ${usuario}`
        break

      case 23:
        mensaje = `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *sɪsᴛᴇᴍᴀ* ! ୧ ֹ ִ

> ✐ ⚙️ *Configuración del grupo actualizada*
> 〄 👤 ${usuario}`
        break

      case 24:
        mensaje = `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *sɪsᴛᴇᴍᴀ* ! ୧ ֹ ִ

> ✐ 🔗 *Enlace del grupo reiniciado*
> 〄 👤 ${usuario}`
        break

      case 25:
        mensaje = `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *sɪsᴛᴇᴍᴀ* ! ୧ ֹ ִ

> ✐ 🔒 *Configuración de mensajes actualizada*
> 〄 👤 ${usuario}`
        break

      case 29:
      case 30: {
        const target = findParticipant(params[0])

        const targetNumber =
          target?.phoneNumber ||
          target?.senderPn ||
          target?.pn ||
          normalize(params[0])

        if (!targetNumber) return

        const tag = `@${normalize(targetNumber)}`

        mentions.push(
          target?.id ||
          target?.jid ||
          target?.lid ||
          params[0]
        )

        mensaje = m.messageStubType === 29
          ? `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *sɪsᴛᴇᴍᴀ* ! ୧ ֹ ִ

> ✐ 🥳 *Nuevo administrador*
> 〄 ${tag} ahora es administrador.
> 〄 👤 Por: ${usuario}`
          : `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *sɪsᴛᴇᴍᴀ* ! ୧ ֹ ִ

> ✐ 😿 *Administrador removido*
> 〄 ${tag} ya no es administrador.
> 〄 👤 Por: ${usuario}`

        break
      }

      default:
        return
    }

    if (!mensaje) return

    await conn.sendMessage(
      m.chat,
      m.messageStubType === 22
        ? {
            image: { url: pp },
            caption: mensaje,
            mentions
          }
        : {
            text: mensaje,
            mentions
          },
      {
        quoted: fkontak
      }
    )
  } catch (e) {
    console.error('error eventos grupo:', e)
  }
}