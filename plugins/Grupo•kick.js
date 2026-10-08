var handler = async (m, { conn, getUserDisplay }) => {
  try {
    if (!m.isGroup) return conn.reply(m.chat, '❌ Solo en grupos.', m)

    let groupMeta = await conn.groupMetadata(m.chat)
    let participants = groupMeta.participants || []

    const senderIds = [
      m.sender,
      m.key?.participantAlt,
      m.key?.senderPn,
      m.key?.participant
    ].filter(Boolean)

    const senderDisplay = await Promise.all(
      senderIds.map(jid => getUserDisplay(jid).catch(() => null))
    )

    const senderNums = senderDisplay
      .map(x => x?.number)
      .filter(Boolean)

    const ownerNums = (global.owner || [])
      .map(o => Array.isArray(o) ? o[0] : o)
      .map(o => String(o || '').split('@')[0].replace(/\D/g, ''))
      .filter(Boolean)

    const isRealOwner =
      senderNums.some(n => ownerNums.includes(n)) || m.fromMe

    const senderIsAdmin = participants.some(p => {
      const ids = [
        p.id,
        p.jid,
        p.lid,
        p.phoneNumber,
        p.pn,
        p.senderPn
      ].filter(Boolean)

      return ids.some(id =>
        senderIds.includes(id) ||
        senderNums.includes(String(id).split('@')[0].replace(/\D/g, ''))
      ) && !!p.admin
    })

    if (!senderIsAdmin && !isRealOwner) {
      return conn.reply(m.chat, '🚩 Solo admins pueden usar este comando.', m)
    }

    const target = m.mentionedJid?.[0] ||
      m.quoted?.sender ||
      m.quoted?.key?.participantAlt ||
      m.quoted?.key?.participant

    if (!target) {
      return conn.reply(m.chat, '> Responde o etiqueta a quien quieres expulsar.', m)
    }

    const targetDisplay = await getUserDisplay(target).catch(() => null)

    const targetJid = targetDisplay?.jid || target
    const realNumber = targetDisplay?.number || ''

    const targetParticipant = participants.find(p => {
      const ids = [
        p.id,
        p.jid,
        p.lid,
        p.phoneNumber,
        p.pn,
        p.senderPn
      ].filter(Boolean)

      const numbers = ids
        .map(id => String(id).split('@')[0].replace(/\D/g, ''))
        .filter(Boolean)

      return ids.includes(target) ||
        ids.includes(targetJid) ||
        (realNumber && numbers.includes(realNumber))
    })

    if (!targetParticipant) {
      return conn.reply(m.chat, '❌ No encontré al usuario dentro del grupo.', m)
    }

    const finalJid =
      targetParticipant.id ||
      targetParticipant.jid ||
      targetJid

    const finalNumber =
      realNumber ||
      String(
        targetParticipant.phoneNumber ||
        targetParticipant.senderPn ||
        targetParticipant.pn ||
        ''
      ).split('@')[0].replace(/\D/g, '')

    const targetIds = [
      targetParticipant.id,
      targetParticipant.jid,
      targetParticipant.lid,
      targetParticipant.phoneNumber,
      targetParticipant.pn,
      targetParticipant.senderPn
    ].filter(Boolean)

    const botIds = [
      conn.user?.jid,
      conn.user?.id,
      conn.user?.lid,
      conn.user?.phoneNumber,
      conn.user?.pn
    ].filter(Boolean)

    const ownerGroupIds = [
      groupMeta.owner,
      groupMeta.ownerPn
    ].filter(Boolean)

    if (
      targetIds.some(id => botIds.includes(id)) ||
      targetIds.some(id => ownerGroupIds.includes(id)) ||
      (finalNumber && ownerNums.includes(finalNumber))
    ) {
      return conn.reply(m.chat, '🚩 No puedo expulsar al creador, al bot o a mi owner.', m)
    }

    if (targetParticipant.admin) {
      return conn.reply(m.chat, '🚩 No puedo expulsar a otro admin.', m)
    }

    await conn.groupParticipantsUpdate(m.chat, [finalJid], 'remove')

    await conn.reply(
      m.chat,
      `✅ Usuario @${finalNumber || 'usuario'} fue expulsado del grupo.`,
      m,
      { mentions: [finalJid] }
    )

  } catch (e) {
    console.error(e)

    const msg = e?.message || ''

    if (msg.includes('not-authorized') || msg.includes('forbidden')) {
      return conn.reply(m.chat, '❌ No soy admin o no tengo permiso.', m)
    }

    return conn.reply(m.chat, `❌ Error: ${msg}`, m)
  }
}

handler.help = ['kick @usuario']
handler.tags = ['grupo']
handler.command = ['kick', 'echar', 'sacar', 'ban', 'kickear']
handler.admin = false
handler.group = true
handler.botAdmin = false

export default handler