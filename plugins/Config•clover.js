import pkg from '@whiskeysockets/baileys'
import fs from 'fs'
import fetch from 'node-fetch'
import axios from 'axios'
import moment from 'moment-timezone'
const { generateWAMessageFromContent, prepareWAMessageMedia, proto } = pkg

var handler = m => m
handler.all = async function (m) {

  const pickRandom = list => list[Math.floor(Math.random() * list.length)]
  const getRandomChannel = async () => {
    let i = Math.floor(Math.random() * canalIdM.length)
    return { id: canalIdM[i], name: canalNombreM[i] }
  }

  global.getBuffer = async (url, options = {}) => {
    try {
      const res = await axios({ method: "get", url, headers: { 'DNT': 1, 'User-Agent': 'GoogleBot', 'Upgrade-Insecure-Request': 1 },...options, responseType: 'arraybuffer' })
      return res.data
    } catch { return null }
  }

  global.getJson = async (url, options = {}) => {
    try {
      const res = await axios({ method: 'GET', url, headers: { 'User-Agent': 'Mozilla/5.0' },...options })
      return res.data
    } catch { return null }
  }

  global.ucapan = () => {
    const h = parseInt(moment.tz('America/Mexico_City').format('HH'))
    if (h >= 18) return "Buenas Noches 🌙"
    if (h >= 15) return "Buenas Tardes 🌅"
    if (h > 10) return "Buenos Días ☀️"
    if (h >= 4) return "Buena Madrugada 🌄"
    return "Buenas Noches 🌙"
  }

  global.runtime = (seconds) => {
    seconds = Number(seconds)
    let d = Math.floor(seconds / 86400)
    let h = Math.floor(seconds % 86400 / 3600)
    let m = Math.floor(seconds % 3600 / 60)
    let s = Math.floor(seconds % 60)
    let dDisplay = d? `${d} ${d == 1? "día, " : "días, "}` : ""
    let hDisplay = h? `${h} ${h == 1? "hora, " : "horas, "}` : ""
    let mDisplay = m? `${m} ${m == 1? "minuto, " : "minutos, "}` : ""
    let sDisplay = s? `${s} ${s == 1? "segundo" : "segundos"}` : ""
    return dDisplay + hDisplay + mDisplay + sDisplay
  }

  global.creador = 'Wa.me/525544876071'
  global.ofcbot = `${conn?.user?.jid?.split('@')[0] || ''}`
  global.asistencia = 'Wa.me/525544876071'
  global.namechannel = '⏤͟͞㋡ 𝐓𝐇𝐄 𝐋𝐄𝐆𝐄𝐍𝐃𝐒 '
  global.namegrupo = ' 𝕭𝖑𝖆𝖈𝖐 𝕮𝖑𝖔𝖛𝖊𝖗 ☘︎'
  global.namecomu = '𝗖𝗼𝗺𝘂𝗻𝗶𝗱𝗮𝗱 ⏤͟͞ 𝐓𝐇𝐄 𝐋𝐄𝐆𝐄𝐍𝐃𝐒 '
  global.listo = '⚔️ *Aquí tienes perra*'

  global.canalIdM = ["120363419782804545@newsletter", "120363419782804545@newsletter"]
  global.canalNombreM = ["⏤͟͞㋡ 𝐓𝐇𝐄 𝐋𝐄𝐆𝐄𝐍𝐃𝐒 ", "㋡ 𝐓𝐇𝐄 𝐋𝐄𝐆𝐄𝐍𝐃𝐒 "]
  global.idchannel = canalIdM[0]
  global.channelRD = await getRandomChannel()

  global.d = moment.tz('America/Mexico_City').toDate()
  global.locale = 'es'
  global.dia = global.d.toLocaleDateString(global.locale, { weekday: 'long' })
  global.fecha = global.d.toLocaleDateString('es', { day: 'numeric', month: 'numeric', year: 'numeric' })
  global.mes = global.d.toLocaleDateString('es', { month: 'long' })
  global.año = global.d.toLocaleDateString('es', { year: 'numeric' })
  global.tiempo = global.d.toLocaleString('en-US', { hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true })

  global.rwait = '⏳'
  global.done = '✅'
  global.error = '✖️'
  global.emoji = '🥷'
  global.emoji2 = '👻'
  global.emoji3 = '⚔️'
  global.emoji4 = '🍭'
  global.emojis = pickRandom([global.emoji, global.emoji2, global.emoji3, global.emoji4])

  var canal = 'https://whatsapp.com/channel/0029VbB36XC8aKvQevh8Bp04'
  let canal2 = 'https://whatsapp.com/channel/0029VbB36XC8aKvQevh8Bp04'
  var git = 'https://github.com/thecarlos19'
  var youtube = ''
  var github = 'https://github.com/thecarlos19/black-clover-MD'
  let correo = 'carloscristobal30@gmail.com'
  global.redes = pickRandom([canal, git, github, correo])

  try {
    const dbPath = './src/database/db.json'
    if (fs.existsSync(dbPath)) {
      const db_ = JSON.parse(fs.readFileSync(dbPath))
      const links = db_?.links?.imagen
      if (links?.length) {
        const link = pickRandom(links)
        const res = await fetch(link).catch(() => null)
        const buf = await res?.buffer().catch(() => null)
        if (buf) global.icons = buf
      }
    }
  } catch { global.icons = null }

  const hourNow = new Date().getHours()
  global.saludo = hourNow <= 2? 'Lɪɴᴅᴀ Nᴏᴄʜᴇ 🌃' : hourNow <= 6? 'Lɪɴᴅᴀ Mᴀɴ̃ᴀɴᴀ 🌄' : hourNow == 7? 'Lɪɴᴅᴀ Mᴀɴ̃ᴀɴᴀ 🌅' : hourNow <= 9? 'Lɪɴᴅᴀ Mᴀɴ̃ᴀɴᴀ 🌄' : hourNow <= 13? 'Lɪɴᴅᴏ Dɪᴀ 🌤' : hourNow <= 17? 'Lɪɴᴅᴀ Tᴀʀᴅᴇ 🌆' : 'Lɪɴᴅᴀ Nᴏᴄʜᴇ 🌃'

  global.nombre = m.pushName || 'Anónimo'
  global.taguser = '@' + m.sender.split("@s.whatsapp.net")[0]
  global.readMore = String.fromCharCode(8206).repeat(850)

  global.fkontak = { key: { participant: `0@s.whatsapp.net`,...(m.chat? { remoteJid: m.chat } : {}) }, message: { 'contactMessage': { 'displayName': `${nombre}`, 'vcard': `BEGIN:VCARD\nVERSION:3.0\nN:XL;${nombre},;;;\nFN:${nombre},\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD`, 'jpegThumbnail': null, thumbnail: null, sendEphemeral: true } } }
  global.fake = { contextInfo: { isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: channelRD.id, newsletterName: channelRD.name, serverMessageId: -1 }, quoted: m } }
  global.icono = pickRandom(['https://raw.githubusercontent.com/JTxs00/uploads/main/1776302012214.jpeg'])
  global.rcanal = { contextInfo: { isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: channelRD.id, serverMessageId: 100, newsletterName: channelRD.name }, externalAdReply: { showAdAttribution: true, title: "𝕭𝖑𝖆𝖈𝖐 𝕮𝖑𝖔𝖛𝖊𝖗 ☘", body: "𝐓𝐇𝐄 𝐂𝐀𝐑𝐋𝐎𝐒", mediaUrl: null, description: null, previewType: "PHOTO", thumbnailUrl: icono, sourceUrl: redes, mediaType: 1, renderLargerThumbnail: false } } }
}

export default handler