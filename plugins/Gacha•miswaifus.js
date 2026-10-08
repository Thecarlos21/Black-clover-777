import fs from 'fs/promises'

const file = './src/database/characters.json'

const load = async () => {
  try {
    let data = await fs.readFile(file, 'utf8')
    return JSON.parse(data || '[]')
  } catch {
    throw new Error('no se pudo leer characters.json')
  }
}

let handler = async (m, { conn }) => {
  try {
    let user = m.sender
    let chars = await load()

    if (!Array.isArray(chars)) {
      return conn.reply(m.chat, 'no se pudo obtener la lista de waifus', m)
    }

    let mine = chars.filter(v => {
      if (!v?.user) return false
      return v.user === user
    })

    if (!mine.length) {
      return conn.reply(m.chat, 'no tienes waifus todavía', m)
    }

    let txt = `✨ *Tus waifus (${mine.length})*\n\n`

    mine.forEach((w, i) => {
      let nombre = w?.name || 'Sin nombre'
      let id = w?.id || 'Sin ID'

      txt += `${i + 1}. *${nombre}* | ID: *${id}*\n`
    })

    return conn.reply(m.chat, txt.trim(), m)

  } catch (e) {
    return conn.reply(m.chat, 'error al obtener tus waifus', m)
  }
}

handler.help = ['miswaifus']
handler.tags = ['gacha']
handler.command = ['miswaifus', 'mywaifus']
handler.group = true

export default handler