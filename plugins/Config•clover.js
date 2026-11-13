import fs from 'fs'
import fetch from 'node-fetch'
import axios from 'axios'
import moment from 'moment-timezone'

const TIMEZONE = 'America/Mexico_City'
const DATABASE_PATH = './src/database/db.json'

const CHANNELS = [
  {
    id: '120363419782804545@newsletter',
    name: '⏤͟͞㋡ 𝐓𝐇𝐄 𝐋𝐄𝐆𝐄𝐍𝐃𝐒 '
  },
  {
    id: '120363419782804545@newsletter',
    name: '㋡ 𝐓𝐇𝐄 𝐋𝐄𝐆𝐄𝐍𝐃𝐒 '
  }
]

const SOCIAL_LINKS = [
  'https://whatsapp.com/channel/0029VbB36XC8aKvQevh8Bp04',
  'https://github.com/thecarlos19',
  'https://github.com/thecarlos19/black-clover-MD',
  'carloscristobal30@gmail.com'
]

const EMOJIS = ['🥷', '👻', '⚔️', '🍭']

const ICON_URLS = [
  'https://raw.githubusercontent.com/JTxs00/uploads/main/1776302012214.jpeg'
]

const pickRandom = list => {
  if (!Array.isArray(list) || !list.length) return null
  return list[Math.floor(Math.random() * list.length)]
}

const getRandomChannel = () => {
  return pickRandom(CHANNELS) || CHANNELS[0]
}

const formatRuntime = seconds => {
  let value = Number(seconds)

  if (!Number.isFinite(value) || value < 0) {
    value = 0
  }

  value = Math.floor(value)

  const days = Math.floor(value / 86400)
  const hours = Math.floor((value % 86400) / 3600)
  const minutes = Math.floor((value % 3600) / 60)
  const secs = value % 60

  const result = []

  if (days) {
    result.push(`${days} ${days === 1 ? 'día' : 'días'}`)
  }

  if (hours) {
    result.push(`${hours} ${hours === 1 ? 'hora' : 'horas'}`)
  }

  if (minutes) {
    result.push(`${minutes} ${minutes === 1 ? 'minuto' : 'minutos'}`)
  }

  if (secs || !result.length) {
    result.push(`${secs} ${secs === 1 ? 'segundo' : 'segundos'}`)
  }

  return result.join(', ')
}

const getGreeting = () => {
  const hour = Number(
    moment.tz(TIMEZONE).format('HH')
  )

  if (hour >= 4 && hour < 11) {
    return 'Buena Madrugada 🌄'
  }

  if (hour >= 11 && hour < 15) {
    return 'Buenos Días ☀️'
  }

  if (hour >= 15 && hour < 18) {
    return 'Buenas Tardes 🌅'
  }

  return 'Buenas Noches 🌙'
}

const getSaludo = () => {
  const hour = Number(
    moment.tz(TIMEZONE).format('HH')
  )

  if (hour <= 2) {
    return 'Lɪɴᴅᴀ Nᴏᴄʜᴇ 🌃'
  }

  if (hour <= 6) {
    return 'Lɪɴᴅᴀ Mᴀɴ̃ᴀɴᴀ 🌄'
  }

  if (hour === 7) {
    return 'Lɪɴᴅᴀ Mᴀɴ̃ᴀɴᴀ 🌅'
  }

  if (hour <= 9) {
    return 'Lɪɴᴅᴀ Mᴀɴ̃ᴀɴᴀ 🌄'
  }

  if (hour <= 13) {
    return 'Lɪɴᴅᴏ Dɪᴀ 🌤'
  }

  if (hour <= 17) {
    return 'Lɪɴᴅᴀ Tᴀʀᴅᴇ 🌆'
  }

  return 'Lɪɴᴅᴀ Nᴏᴄʜᴇ 🌃'
}

const getDateInfo = () => {
  const date = moment.tz(TIMEZONE)

  return {
    date: date.toDate(),
    dia: date.locale('es').format('dddd'),
    fecha: date.locale('es').format('D/M/YYYY'),
    mes: date.locale('es').format('MMMM'),
    año: date.format('YYYY'),
    tiempo: date.format('h:mm:ss A')
  }
}

const getBotNumber = conn => {
  const jid =
    conn?.user?.jid ||
    conn?.user?.id ||
    ''

  return String(jid).split('@')[0]
}

const loadRandomIcon = async () => {
  try {
    if (!fs.existsSync(DATABASE_PATH)) {
      return null
    }

    const content = fs.readFileSync(
      DATABASE_PATH,
      'utf8'
    )

    const database = JSON.parse(content)
    const links = database?.links?.imagen

    if (!Array.isArray(links) || !links.length) {
      return null
    }

    const url = pickRandom(links)

    if (!url) return null

    const response = await fetch(url)

    if (!response.ok) {
      return null
    }

    return await response.buffer()
  } catch {
    return null
  }
}

global.getBuffer = async function getBuffer(url, options = {}) {
  try {
    if (!url) return null

    const response = await axios({
      method: 'GET',
      url,
      headers: {
        DNT: '1',
        'User-Agent': 'Mozilla/5.0',
        'Upgrade-Insecure-Requests': '1'
      },
      responseType: 'arraybuffer',
      timeout: 15000,
      ...options
    })

    return response.data
  } catch (error) {
    console.error(
      '[getBuffer]',
      error?.message || error
    )

    return null
  }
}

global.getJson = async function getJson(url, options = {}) {
  try {
    if (!url) return null

    const response = await axios({
      method: 'GET',
      url,
      headers: {
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 15000,
      ...options
    })

    return response.data
  } catch {
    return null
  }
}

global.ucapan = getGreeting
global.runtime = formatRuntime

global.creador = 'Wa.me/525544876071'
global.asistencia = 'Wa.me/525544876071'

global.ofcbot = ''

global.namechannel = '⏤͟͞㋡ 𝐓𝐇𝐄 𝐋𝐄𝐆𝐄𝐍𝐃𝐒 '
global.namegrupo = ' 𝕭𝖑𝖆𝖈𝖐 𝕮𝖑𝖔𝖛𝖊𝖗 ☘︎'
global.namecomu = '𝗖𝗼𝗺𝘂𝗻𝗶𝗱𝗮𝗱 ⏤͟͞ 𝐓𝐇𝐄 𝐋𝐄𝐆𝐄𝐍𝐃𝐒 '
global.listo = '⚔️ *Aquí tienes perra*'

global.canalIdM = CHANNELS.map(channel => channel.id)
global.canalNombreM = CHANNELS.map(channel => channel.name)

global.idchannel = CHANNELS[0].id
global.channelRD = getRandomChannel()

const dateInfo = getDateInfo()

global.d = dateInfo.date
global.locale = 'es'
global.dia = dateInfo.dia
global.fecha = dateInfo.fecha
global.mes = dateInfo.mes
global.año = dateInfo.año
global.tiempo = dateInfo.tiempo

global.rwait = '⏳'
global.done = '✅'
global.error = '✖️'

global.emoji = '🥷'
global.emoji2 = '👻'
global.emoji3 = '⚔️'
global.emoji4 = '🍭'
global.emojis = pickRandom(EMOJIS)

global.redes = pickRandom(SOCIAL_LINKS)

global.icons = null

const initialIcon = await loadRandomIcon()

if (initialIcon) {
  global.icons = initialIcon
}

const handler = m => m

handler.all = async function (m) {
  try {
    if (!m) return

    const channel = global.channelRD || CHANNELS[0]

    const sender = String(
      m.sender || ''
    )

    const chat = String(
      m.chat || ''
    )

    const nombre = m.pushName || 'Anónimo'

    global.ofcbot = getBotNumber(this)

    global.nombre = nombre

    global.taguser = sender
      ? `@${sender.split('@')[0]}`
      : '@usuario'

    const more = String.fromCharCode(8206)

    global.readMore = more.repeat(850)

    const senderNumber = sender
      .split('@')[0]
      .replace(/\D/g, '')

    global.fkontak = {
      key: {
        participant: '0@s.whatsapp.net',
        ...(chat ? { remoteJid: chat } : {})
      },
      message: {
        contactMessage: {
          displayName: nombre,
          vcard: [
            'BEGIN:VCARD',
            'VERSION:3.0',
            `N:XL;${nombre},;;;`,
            `FN:${nombre}`,
            `item1.TEL;waid=${senderNumber}:${senderNumber}`,
            'item1.X-ABLabel:Ponsel',
            'END:VCARD'
          ].join('\n'),
          jpegThumbnail: null,
          thumbnail: null,
          sendEphemeral: true
        }
      }
    }

    global.fake = {
      contextInfo: {
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: channel.id,
          newsletterName: channel.name,
          serverMessageId: -1
        },
        quoted: m
      }
    }

    global.icono = pickRandom(ICON_URLS)

    global.rcanal = {
      contextInfo: {
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: channel.id,
          serverMessageId: 100,
          newsletterName: channel.name
        },
        externalAdReply: {
          showAdAttribution: true,
          title: '𝕭𝖑𝖆𝖈𝖐 𝕮𝖑𝖔𝖛𝖊𝖗 ☘',
          body: '𝐓𝐇𝐄 𝐂𝐀𝐑𝐋𝐎𝐒',
          mediaUrl: null,
          description: null,
          previewType: 'PHOTO',
          thumbnailUrl: global.icono,
          sourceUrl: global.redes,
          mediaType: 1,
          renderLargerThumbnail: false
        }
      }
    }

    global.saludo = getSaludo()
  } catch (error) {
    console.error(
      '[GLOBAL HANDLER]',
      error?.message || error
    )
  }
}

export default handler