//Código creado x The Carlos <👑

import fs from 'fs/promises'

const file = './src/database/characters.json'
const cooldownFile = './src/database/waifu_cooldown.json'

const owner = '5215544876071@s.whatsapp.net'

const loadChars = async () => {
  try {
    let data = await fs.readFile(file, 'utf8')
    let parsed = JSON.parse(data || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const saveChars = async (data) => {
  await fs.writeFile(file, JSON.stringify(data, null, 2))
}

const loadCd = async () => {
  try {
    let data = await fs.readFile(cooldownFile, 'utf8')
    let parsed = JSON.parse(data || '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const saveCd = async (data) => {
  await fs.writeFile(cooldownFile, JSON.stringify(data, null, 2))
}

let handler = async (m, { conn, args }) => {
  try {
    let user = m.sender
    let id = String(args[0] || '').trim()

    if (!id) return conn.reply(m.chat, 'tienes que poner el id de la waifu', m)

    let chars = await loadChars()
    let cds = await loadCd()

    let waifu = chars.find(v => String(v?.id) === id)

    if (!waifu) {
      return conn.reply(m.chat, 'no existe esa waifu', m)
    }

    let old = waifu.user || null

    if (old === owner) {
      return conn.reply(m.chat, 'no puedes robar waifus del owner', m)
    }

    if (old === user) {
      return conn.reply(m.chat, 'esa waifu ya es tuya', m)
    }

    let ahora = Date.now()

    if (old && global.db.data.users[old]?.antirobo > ahora) {
      let restante = global.db.data.users[old].antirobo - ahora
      let minutos = Math.ceil(restante / 60000)

      return conn.reply(
        m.chat,
        `🛡️ esa waifu está protegida contra robos\n\n⏳ Protección restante: *${minutos} min*`,
        m
      )
    }

    if (user !== owner) {
      let cd = cds[user] || { count: 0, reset: 0 }

      if (!Number.isFinite(cd.count)) cd.count = 0
      if (!Number.isFinite(cd.reset)) cd.reset = 0

      if (ahora >= cd.reset) {
        cd.count = 0
        cd.reset = ahora + 10 * 60 * 1000
      }

      if (cd.count >= 2) {
        let left = Math.max(1, Math.ceil((cd.reset - ahora) / 60000))

        return conn.reply(
          m.chat,
          `🚫 ya robaste demasiado\n\n⏳ espera *${left} min* para volver a robar`,
          m
        )
      }

      cd.count++
      cds[user] = cd

      await saveCd(cds)
    }

    waifu.user = user

    await saveChars(chars)

    let nombreWaifu = waifu.name || 'Waifu desconocida'
    let nombreViejo = 'nadie'

    if (old) {
      try {
        if (typeof conn.getName === 'function') {
          let resultado = conn.getName(old)
          if (resultado) nombreViejo = resultado
        }
      } catch {}

      if (!nombreViejo || nombreViejo === 'undefined') {
        nombreViejo = `@${old.split('@')[0]}`
      }
    }

    await conn.reply(
      m.chat,
      `💰 *WAIFU ROBADA*\n\n` +
      `✨ Waifu: *${nombreWaifu}*\n` +
      `🆔 ID: *${waifu.id}*\n` +
      `👤 Antiguo dueño: *${nombreViejo}*\n` +
      `👑 Nuevo dueño: *${m.pushName || 'Tú'}*`,
      m
    )

    if (old && old !== user && old !== owner) {
      try {
        await conn.sendMessage(old, {
          text: `🚨 *Te han robado una waifu*\n\n✨ Waifu: *${nombreWaifu}*\n🆔 ID: *${waifu.id}*`
        })
      } catch {}
    }

  } catch (e) {
    return conn.reply(m.chat, 'error al robar waifu', m)
  }
}

handler.help = ['robarwaifu <id>']
handler.tags = ['gacha']
handler.command = ['robarwaifu']
handler.group = true

export default handler