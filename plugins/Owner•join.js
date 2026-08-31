let linkRegex = /chat\.whatsapp\.com\/(?:invite\/)?([0-9A-Za-z]{20,24})/gi

let handler = async (m, { conn, text, usedPrefix, command }) => {

  if (!text) return m.reply(`🚩 Ingresa el enlace del grupo.\n\nEjemplo: ${usedPrefix + command} https://chat.whatsapp.com/xxxx`)

  let codes = [...new Set([...text.matchAll(linkRegex)].map(v => v[1]))]
  if (!codes.length) return m.reply('🐢 Enlace inválido. Asegúrate que sea un link de invitación.')
  if (codes.length > 10) return m.reply('⚠️ Máximo 10 enlaces por comando para evitar spam.')

  let exitos = 0
  let fallidos = 0
  let resultados = []
  const chats = global.db?.data?.chats || {}

  await m.react('⚔️')

  for (let code of codes) {
    try {
      let metadata = await conn.groupGetInviteInfo(code).catch(() => null)
      if (!metadata?.id) {
        resultados.push(`❌ \`${code}\` - Link inválido o expirado`)
        fallidos++
        continue
      }

      const groupSize = metadata.size || metadata.participants?.length || 0
      if (groupSize >= 1024) {
        resultados.push(`❌ *${metadata.subject || 'Sin nombre'}* - Grupo lleno (1024)`)
        fallidos++
        continue
      }

      if (chats[metadata.id]) {
        resultados.push(`⚠️ *${metadata.subject}* - Ya estoy ahí`)
        fallidos++
        continue
      }

      let res = await conn.groupAcceptInvite(code)
      if (!res) throw new Error('accept-failed')

      exitos++
      resultados.push(`✅ *${metadata.subject}* - Unido`)

      await conn.sendMessage(res, {
        text: `《✧》 *${global.botname || 'Black Clover'}* se unió\n\n👑 Gracias por invitarme\n⚔️ Usa *${usedPrefix}menu* para ver mis comandos\n☘️ Usa *${usedPrefix}enable welcome* para bienvenidas`,
      }).catch(() => {})

      await new Promise(r => setTimeout(r, 3000))

    } catch (e) {
      fallidos++
      let msg = (e?.message || '').toLowerCase()
      if (msg.includes('not-authorized') || msg.includes('invalid') || msg.includes('expired')) {
        resultados.push(`❌ \`${code}\` - Link inválido/expirado`)
      } else if (msg.includes('already') || msg.includes('participant')) {
        resultados.push(`⚠️ \`${code}\` - Ya estoy en ese grupo`)
      } else if (msg.includes('full') || msg.includes('1024') || msg.includes('1023')) {
        resultados.push(`❌ \`${code}\` - Grupo lleno`)
      } else if (msg.includes('banned') || msg.includes('blocked') || msg.includes('forbidden')) {
        resultados.push(`❌ \`${code}\` - No puedo unirme (baneado del grupo)`)
      } else {
        resultados.push(`❌ \`${code}\` - Error: ${e?.message?.slice(0,50) || 'desconocido'}`)
      }
    }
  }

  let reporte = `*📊 REPORTE DE UNIÓN - ${global.botname || 'Black Clover'}*\n\n${resultados.join('\n')}\n\n┏━━━━━━━━━━━━━┓\n┃ ✅ Exitosos: ${exitos}\n┃ ❌ Fallidos: ${fallidos}\n┃ 📥 Total: ${codes.length}\n┗━━━━━━━━━━━━━┛`

  await m.reply(reporte)
  await m.react(exitos? '✅' : '❌')
}

handler.help = ['join <link>']
handler.tags = ['owner']
handler.command = ['join', 'entrar', 'unirme']
handler.rowner = true

export default handler