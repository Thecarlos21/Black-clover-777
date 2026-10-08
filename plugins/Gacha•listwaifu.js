//Código creado x The Carlos 👑 

import fs from 'fs/promises'

const file = './src/database/characters.json'

const load = async () => {
  try {
    let data = await fs.readFile(file, 'utf8')
    return JSON.parse(data || '[]')
  } catch {
    return []
  }
}

let handler = async (m, { conn }) => {
  try {
    let chars = await load()

    if (!Array.isArray(chars) || !chars.length) {
      return conn.reply(m.chat, 'no hay waifus registradas', m)
    }

    let text = '📜 *LISTA DE WAIFUS*\n\n'

    for (let c of chars) {
      let nombre = c?.name || 'Sin nombre'
      let id = c?.id || 'Sin ID'
      let dueño = c?.user || null
      let nombreDueño = 'nadie'

      if (dueño) {
        try {
          let participante = m.isGroup
            ? (await conn.groupMetadata(m.chat)).participants.find(p =>
                p.id === dueño ||
                p.jid === dueño ||
                p.lid === dueño
              )
            : null

          nombreDueño = participante?.name || participante?.notify || participante?.pushName || null

          if (!nombreDueño && typeof conn.getName === 'function') {
            let resultado = conn.getName(dueño)
            if (resultado) nombreDueño = resultado
          }
        } catch {}

        if (!nombreDueño) {
          nombreDueño = `@${dueño.split('@')[0]}`
        }
      }

      text += `👤 *${nombre}*\n`
      text += `🆔 ID: *${id}*\n`
      text += `👑 Dueño: *${nombreDueño}*\n\n`
    }

    return conn.reply(m.chat, text.trim(), m)

  } catch (e) {
    return conn.reply(m.chat, 'error al leer la base de datos', m)
  }
}

handler.help = ['listawaifus']
handler.tags = ['gacha']
handler.command = ['listawaifus']
handler.group = true

export default handler