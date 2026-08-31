//código creado x The Carlos 👑 
//no quiten créditos 

var handler = async (m, { conn }) => {
  try {
    if (!m.isGroup) return conn.reply(m.chat, '❌ Solo en grupos.', m)
    const normalize = j => j?.split('@')[0]?.replace(/\D/g, '') || ''
    let groupMeta = await conn.groupMetadata(m.chat)
    const senderIds = [m.sender, m.key?.participantAlt, m.key?.senderPn, m.key?.participant].filter(Boolean)
    const senderNums = senderIds.map(j => normalize(j))
    const ownerNums = (global.owner || []).map(o => normalize(Array.isArray(o)? o[0] : o))
    const isRealOwner = ownerNums.some(n => senderNums.includes(n)) || m.fromMe

    const senderIsAdmin = groupMeta.participants.some(p => {
      let pid = normalize(p.id || p.jid || p.lid || p.phoneNumber || '')
      return senderNums.includes(pid) &&!!p.admin
    })

    if (!senderIsAdmin &&!isRealOwner) {
      return conn.reply(m.chat, '🚩 Solo admins pueden usar este comando.', m)
    }

    let target = m.mentionedJid?.[0] || m.quoted?.sender || m.quoted?.key?.participantAlt || m.quoted?.key?.participant
    if (!target) return conn.reply(m.chat, '> Responde o etiqueta a quien quieres expulsar.', m)

    let targetNum = normalize(target)
    let botNum = normalize(conn.user.jid || conn.user.id)
    let ownerGroupNum = normalize(groupMeta.owner || '')

    if ([botNum, ownerGroupNum,...ownerNums].includes(targetNum)) {
      return conn.reply(m.chat, '🚩 No puedo expulsar al creador, al bot o a mi owner.', m)
    }

    let targetIsAdmin = groupMeta.participants.some(p => {
      let pid = normalize(p.id || p.jid || p.lid || '')
      return pid === targetNum &&!!p.admin
    })

    if (targetIsAdmin) {
      return conn.reply(m.chat, '🚩 No puedo expulsar a otro admin.', m)
    }

    await conn.groupParticipantsUpdate(m.chat, [target], 'remove')
    await conn.reply(m.chat, `✅ Usuario @${targetNum} fue expulsado del grupo.`, m, { mentions: [target] })

  } catch (e) {
    console.error(e)
    let msg = e.message || ''
    if (msg.includes('not-authorized')) {
      return conn.reply(m.chat, '❌ No soy admin o no tengo permiso.', m)
    }
    conn.reply(m.chat, `❌ Error: ${msg}`, m)
  }
}

handler.help = ['kick @usuario']
handler.tags = ['grupo']
handler.command = ['kick', 'echar', 'sacar', 'ban', 'kickear']
handler.admin = false
handler.group = true
handler.botAdmin = false

export default handler