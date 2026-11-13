import fs from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import fetch from 'node-fetch'

const possibleChars = [
  './src/database/characters.json',
  './database/characters.json',
  path.join(process.cwd(), 'src/database/characters.json'),
  path.join(process.cwd(), 'database/characters.json')
]

const possibleHarem = [
  './src/database/harem.json',
  './database/harem.json',
  path.join(process.cwd(), 'src/database/harem.json'),
  path.join(process.cwd(), 'database/harem.json')
]

const getValidPath = (paths) => {
  for (let p of paths) if (existsSync(p)) return p
  return paths[0]
}

const charsFile = getValidPath(possibleChars)
const haremFile = getValidPath(possibleHarem)
let cd = {}

const ensureFile = async (file) => {
  if (!existsSync(file)) {
    await fs.mkdir(path.dirname(file), { recursive: true })
    await fs.writeFile(file, '[]')
  }
}

// ESTA ES LA PARTE QUE ARREGLA TU JSON
const loadChars = async () => {
  try {
    await ensureFile(charsFile)
    let data = await fs.readFile(charsFile, 'utf8')
    if (!data.trim()) return []
    let parsed = JSON.parse(data)

    // Caso 1: tu formato actual { "id_grupo": { characters: [...] } }
    if (!Array.isArray(parsed)) {
      let flat = []
      for (let key in parsed) {
        let group = parsed[key]
        if (group?.characters && Array.isArray(group.characters)) {
          for (let c of group.characters) {
            flat.push({
              ...c,
              groupName: group.name || 'Sin grupo',
              groupId: key,
              // si no tiene img, usamos el primer tag como referencia
              img: c.img || c.image || null,
              tags: c.tags || []
            })
          }
        }
      }
      console.log(`[RW] Convertido formato objeto -> ${flat.length} personajes`)
      return flat
    }

    // Caso 2: formato array viejo
    return parsed
  } catch (e) {
    console.log('[RW] loadChars error', e.message)
    return []
  }
}

const loadHarem = async () => {
  try {
    await ensureFile(haremFile)
    let data = await fs.readFile(haremFile, 'utf8')
    if (!data.trim()) return []
    let parsed = JSON.parse(data)
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

const saveHarem = async (data) => {
  await ensureFile(haremFile)
  await fs.writeFile(haremFile, JSON.stringify(data, null, 2))
}

// Busca imagen por tag si no tiene img
const getImageByTag = async (tags) => {
  try {
    if (!tags || !tags.length) return null
    let tag = tags[0]
    // Usa stellar API que ya usabas
    let res = await fetch(`https://api.stellarwa.xyz/search/danbooru?tag=${encodeURIComponent(tag)}&key=proyectsV2`)
    let json = await res.json()
    let url = json?.data?.url || json?.url || json?.data?.[0]?.url
    if (url) return url
  } catch {}
  return null
}

let handler = async (m, { conn, usedPrefix }) => {
  let user = m.sender
  let now = Date.now()

  if (cd[user] && cd[user] > now) {
    let t = Math.ceil((cd[user] - now) / 1000)
    let mnt = Math.floor(t / 60)
    let sec = t % 60
    return conn.sendMessage(m.chat, { text: `⏳ Espera ${mnt}m ${sec}s para volver a rolear` }, { quoted: m })
  }

  try {
    let chars = await loadChars()
    if (!chars.length) return conn.reply(m.chat, `📕 No hay personajes registrados en el grimorio\n📁 Ruta: ${charsFile}\nTotal: 0`, m)

    let r = chars[Math.floor(Math.random() * chars.length)]
    if (!r?.id || !r?.name) return conn.reply(m.chat, '❌ Error al elegir personaje', m)

    // Imagen: si es array elige una, si no tiene busca por tag, si no usa placeholder
    let img = null
    if (Array.isArray(r.img) && r.img.length) img = r.img[Math.floor(Math.random() * r.img.length)]
    else if (typeof r.img === 'string' && r.img.startsWith('http')) img = r.img
    else {
      img = await getImageByTag(r.tags)
    }

    if (!img) {
      return conn.reply(m.chat, `⚠️ *${r.name}* no tiene imagen y no se encontró por tag ${r.tags?.[0] || ''}\nID: ${r.id}`, m)
    }

    let harem = await loadHarem()
    let inHarem = harem.find(v => v.characterId === r.id)

    let status = 'Libre ✅'
    let mentions = []
    let isTaken = false

    if (r.user) {
      status = `Reclamado por @${r.user.split('@')[0]}`
      mentions.push(r.user)
      isTaken = true
    } else if (inHarem?.userId) {
      status = `Reclamado por @${inHarem.userId.split('@')[0]}`
      mentions.push(inHarem.userId)
      isTaken = true
    }

    let text = `✦ *${r.name}*

✦ Grupo: *${r.groupName || 'N/A'}*
✦ Género: *${r.gender || 'N/A'}*
✦ Valor: *${Number(r.value || 0).toLocaleString()}*
✦ Estado: ${status}
✦ ID: *${r.id}*`

    let buttons = [
      { buttonId: `${usedPrefix}rw`, buttonText: { displayText: '🎲 Siguiente' }, type: 1 }
    ]
    if (!isTaken) {
      buttons.unshift({ buttonId: `${usedPrefix}claim ${r.id}`, buttonText: { displayText: '💍 Reclamar' }, type: 1 })
    }

    await conn.sendMessage(m.chat, {
      image: { url: img },
      caption: text,
      footer: 'Black Clover RPG 2026',
      buttons: buttons,
      headerType: 4,
      mentions
    }, { quoted: m })

    cd[user] = now + (2 * 60 * 1000)

  } catch (e) {
    console.error(e)
    return conn.reply(m.chat, `❎ Error grimorio: ${e.message}`, m)
  }
}

handler.help = ['ver', 'rw', 'rollwaifu']
handler.tags = ['gacha']
handler.command = ['ver', 'rw', 'rollwaifu']
handler.group = true
export default handler
