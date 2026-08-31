import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function before(m, { conn, groupMetadata }) {
  if (!m.isGroup) return
  const chat = global.db.data.chats[m.chat]
  if (!chat?.welcome) return

  let metadata = groupMetadata || await conn.groupMetadata(m.chat).catch(() => null)
  if (!metadata) return

  let groupName = metadata.subject
  let pp = await conn.profilePictureUrl(m.chat, 'image').catch(() => null)

  const audioFolder = path.resolve('./src/welcomeaudios')
  const tmpFolder = path.resolve('./tmp')
  if (!fs.existsSync(tmpFolder)) fs.mkdirSync(tmpFolder, { recursive: true })
  if (!fs.existsSync(audioFolder)) return

  const welcomeTitles = ['👋 Welcome','✨ Bienvenido','🍀 Nuevo integrante','⚔️ Se une un mago','🌟 Llegó alguien nuevo']
  const byeTitles = ['👋 Goodbye','⚠️ Alguien salió','🌙 Hasta luego','🍂 Se fue un miembro','🚪 Salida del grupo']

  const getRandomAudio = (type) => {
    const files = fs.readdirSync(audioFolder).filter(f => /\.(mp3|ogg|wav|m4a)$/i.test(f) && f.toLowerCase().startsWith(type))
    if (!files.length) return null
    return path.join(audioFolder, files[Math.floor(Math.random() * files.length)])
  }

  const sendPTT = async (audioPath, contextInfo) => {
    const output = path.join(tmpFolder, `${Date.now()}.ogg`)
    try {
      await execAsync(`ffmpeg -i "${audioPath}" -vn -c:a libopus -b:a 128k "${output}" -y`)
      await conn.sendMessage(m.chat, { audio: { url: output }, mimetype: 'audio/ogg; codecs=opus', ptt: true, contextInfo })
    } catch {} finally {
      try { if (fs.existsSync(output)) fs.unlinkSync(output) } catch {}
    }
  }

  if ([27, 31].includes(m.messageStubType)) {
    const contextInfo = { externalAdReply: { showAdAttribution: false, title: welcomeTitles[Math.floor(Math.random() * welcomeTitles.length)], body: groupName, mediaType: 2, sourceUrl: global.redes || '', thumbnailUrl: pp } }
    const audio = getRandomAudio('bienvenida')
    if (audio) await sendPTT(audio, contextInfo)
  }

  if ([28, 32].includes(m.messageStubType)) {
    const contextInfo = { externalAdReply: { showAdAttribution: false, title: byeTitles[Math.floor(Math.random() * byeTitles.length)], body: groupName, mediaType: 2, sourceUrl: global.redes || '', thumbnailUrl: pp } }
    const audio = getRandomAudio('bye')
    if (audio) await sendPTT(audio, contextInfo)
  }
}