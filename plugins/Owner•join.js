
let linkRegex = /(?:https?:\/\/)?chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/gi

let handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    return m.reply(`🚩 Ingresa el enlace del grupo.

Ejemplo: ${usedPrefix + command} https://chat.whatsapp.com/xxxx`)
  }

  let links = [...text.matchAll(linkRegex)]

  if (!links.length) return m.reply('🐢 Enlace inválido.')

  let exitos = 0
  let fallidos = 0
  let resultados = []
  let vistos = new Set()

  const cleanJid = jid => {
    if (!jid) return ''
    return jid.replace(/:\d+/, '').toLowerCase()
  }

  let participating = await conn.groupFetchAllParticipating().catch(() => ({}))

  for (let match of links) {
    let code = match[1]

    if (vistos.has(code)) continue
    vistos.add(code)

    try {
      let metadata = await conn.groupGetInviteInfo(code).catch(() => null)

      if (!metadata?.id) {
        resultados.push(`❌ Link inválido o expirado`)
        fallidos++
        continue
      }

      let groupJid = metadata.id
      let groupName = metadata.subject || 'Grupo'

      let yaEsta = Object.keys(participating || {}).some(jid =>
        cleanJid(jid) === cleanJid(groupJid)
      )

      if (yaEsta) {
        resultados.push(`⚠️ ${groupName} - Ya estoy ahí`)
        fallidos++
        continue
      }

      if (Number(metadata.size || 0) >= 1023) {
        resultados.push(`❌ ${groupName} - Grupo lleno`)
        fallidos++
        continue
      }

      let res = await conn.groupAcceptInvite(code)

      if (!res) throw new Error('No se recibió el JID del grupo')

      await new Promise(resolve => setTimeout(resolve, 2000))

      await conn.sendMessage(res, {
        text: `《✧》 *Black Clover* se unió al grupo

👑 Gracias por la invitación
⚔️ Usa ${usedPrefix}menu para ver los comandos`
      }).catch(() => {})

      resultados.push(`✅ ${groupName} - Unido`)
      exitos++

      participating[res] = { id: res }

    } catch (e) {
      console.error('Error join:', e)

      let error = String(e.message || '').toLowerCase()

      if (error.includes('not-authorized')) {
        resultados.push(`❌ ${groupName || 'Grupo'} - No autorizado`)
      } else if (error.includes('already')) {
        resultados.push(`⚠️ ${groupName || 'Grupo'} - Ya estoy ahí`)
      } else {
        resultados.push(`❌ Error: ${e.message || 'Desconocido'}`)
      }

      fallidos++
    }
  }

  await m.reply(`*📊 REPORTE DE UNIÓN*

${resultados.join('\n')}

✅ Exitosos: ${exitos}
❌ Fallidos: ${fallidos}`)
}

handler.help = ['join <link>']
handler.tags = ['owner']
handler.command = ['join', 'entrar']
handler.rowner = true

export default handler

