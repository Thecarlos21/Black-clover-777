import { WAMessageStubType } from '@whiskeysockets/baileys'
import PhoneNumber from 'awesome-phonenumber'
import chalk from 'chalk'
import { watchFile, unwatchFile } from 'fs'
import { fileURLToPath } from 'url'
import moment from 'moment-timezone'

let terminalImage = ''
if (global.opts?.['img']) {
  try {
    terminalImage = (await import('terminal-image')).default
  } catch {}
}

const ALERT_WORDS = ['@admin', 'error', 'fallo', 'ayuda', 'problema', 'ban', 'spam']
const IGNORE_CHATS = ['status@broadcast']
const IGNORE_COMMANDS = [/^\/ping$/i, /^\/estado$/i, /^\/menu$/i]
const MUTE_USERS = []

const formatSize = bytes => {
  try {
    if (bytes === undefined || bytes === null) return '0B'

    if (typeof bytes === 'object') {
      if (typeof bytes.low === 'number') bytes = bytes.low
      else if (typeof bytes.toString === 'function') bytes = Number(bytes.toString())
    }

    bytes = Number(bytes)

    if (!Number.isFinite(bytes) || bytes <= 0) return '0B'

    const units = ['', 'K', 'M', 'G', 'T']
    const i = Math.min(
      Math.floor(Math.log(bytes) / Math.log(1024)),
      units.length - 1
    )

    return `${(bytes / Math.pow(1024, i)).toFixed(1)}${units[i]}B`
  } catch {
    return '0B'
  }
}

const normalizeJid = jid => {
  if (!jid || typeof jid !== 'string') return ''
  return jid.trim()
}

const getAltJid = m => {
  try {
    const candidates = [
      m?.key?.participantAlt,
      m?.key?.remoteJidAlt,
      m?.participantAlt,
      m?.remoteJidAlt,
      m?.senderPn,
      m?.participantPn,
      m?.key?.senderPn,
      m?.key?.participantPn
    ]

    for (const jid of candidates) {
      if (
        typeof jid === 'string' &&
        jid.endsWith('@s.whatsapp.net')
      ) {
        return jid
      }
    }

    return ''
  } catch {
    return ''
  }
}

const resolveSenderJid = m => {
  const sender = normalizeJid(m?.sender)

  if (!sender) return ''

  if (!sender.endsWith('@lid')) return sender

  const alt = getAltJid(m)

  if (alt) return alt

  return sender
}

const getName = (jid, conn) => {
  try {
    jid = normalizeJid(jid)
    if (!jid) return ''

    const contacts = conn?.contacts || {}
    const contact = contacts[jid]

    if (contact?.name) return contact.name
    if (contact?.notify) return contact.notify
    if (contact?.verifiedName) return contact.verifiedName
    if (contact?.subject) return contact.subject

    if (jid.endsWith('@g.us')) {
      return contact?.subject || jid.split('@')[0]
    }

    if (jid.endsWith('@lid')) {
      return contact?.name || contact?.notify || jid.split('@')[0]
    }

    const number = jid.split('@')[0]

    if (/^\d+$/.test(number)) {
      const parsed = PhoneNumber('+' + number)
      const international = parsed.getNumber('international')

      if (international) return international
    }

    return number
  } catch {
    return jid?.split('@')[0] || ''
  }
}

const getSenderName = (jid, conn) => {
  try {
    jid = normalizeJid(jid)
    if (!jid) return ''

    const name = getName(jid, conn)

    if (name && name !== jid.split('@')[0]) return name

    return jid.split('@')[0]
  } catch {
    return jid?.split('@')[0] || ''
  }
}

const getFileSize = m => {
  try {
    const msg = m?.msg

    if (!msg) return m?.text?.length || 0

    if (msg.fileLength !== undefined) {
      if (
        typeof msg.fileLength === 'object' &&
        msg.fileLength?.low !== undefined
      ) {
        return Number(msg.fileLength.low) || 0
      }

      return Number(msg.fileLength) || 0
    }

    if (msg.vcard) return msg.vcard.length

    if (msg.axolotlSenderKeyDistributionMessage)
      return msg.axolotlSenderKeyDistributionMessage.length

    return m?.text?.length || 0
  } catch {
    return m?.text?.length || 0
  }
}

const getBotNumber = conn => {
  try {
    const jid = conn?.user?.jid || ''
    const number = jid.split('@')[0]

    if (!number || !/^\d+$/.test(number)) return jid

    return (
      PhoneNumber('+' + number).getNumber('international') ||
      number
    )
  } catch {
    return conn?.user?.jid || ''
  }
}

export default async function (m, conn = { user: {} }) {
  try {
    if (!m) return

    if (IGNORE_CHATS.includes(m.chat)) return
    if (MUTE_USERS.includes(m.sender)) return

    if (
      typeof m.text === 'string' &&
      IGNORE_COMMANDS.some(rx => rx.test(m.text.trim()))
    ) return

    const originalSenderJid = normalizeJid(m.sender)
    const senderJid = resolveSenderJid(m)
    const chatJid = normalizeJid(m.chat)

    const senderName = getSenderName(senderJid, conn)
    const senderNum = senderJid.split('@')[0]

    let sender = senderName

    if (senderJid.endsWith('@s.whatsapp.net')) {
      const international = /^\d+$/.test(senderNum)
        ? PhoneNumber('+' + senderNum).getNumber('international')
        : senderNum

      sender = international || senderNum

      if (
        senderName &&
        senderName !== senderNum &&
        senderName !== international
      ) {
        sender += ` ~${senderName}`
      }
    } else if (originalSenderJid.endsWith('@lid')) {
      sender = `${senderName} [LID]`
    }

    const chat = getName(chatJid, conn)

    let img = null

    try {
      if (
        terminalImage &&
        global.opts?.['img'] &&
        /sticker|image/gi.test(m.mtype || '')
      ) {
        const buffer = await m.download?.()

        if (buffer)
          img = await terminalImage.buffer(buffer)
      }
    } catch {}

    const filesize = getFileSize(m)
    const user = global.db?.data?.users?.[senderJid] || {}

    const botJid = conn?.user?.jid || ''
    const me = getBotNumber(conn)

    const isP = Boolean(
      global.conn?.user?.jid &&
      botJid &&
      global.conn.user.jid === botJid
    )

    const uptime = process.uptime()

    const uptimeStr =
      `${Math.floor(uptime / 3600)}h ` +
      `${Math.floor((uptime % 3600) / 60)}m ` +
      `${Math.floor(uptime % 60)}s`

    const messageType = m.mtype
      ? m.mtype
          .replace(/message$/i, '')
          .replace(/^./, v => v.toUpperCase())
      : 'TEXT'

    const stubType = m.messageStubType
      ? WAMessageStubType[m.messageStubType] ||
        String(m.messageStubType)
      : 'MSG'

    const chatDisplay = chatJid.endsWith('@g.us')
      ? chat || chatJid
      : chatJid

    const header = `
${chalk.hex('#00FF9F').bold('┈────────────── ꒰ ⚔️ ꒱')}
≡ ✯ ${chalk.cyan(me + ' ➝ ' + (isP ? '(Principal)' : '(SubBot)'))}
≡ ✢ ${chalk.black(chalk.bgHex('#FF006E')(
  moment().tz('America/Mexico_City').format('HH:mm:ss')
))}
≡ ⏱ ${chalk.hex('#B4FF00')('Up: ' + uptimeStr)}
≡ ‣ ${chalk.black(chalk.bgHex('#FB5607')(stubType))}
≡ ◆ ${chalk.hex('#8338EC')(`${filesize} [${formatSize(filesize)}]`)}

≡ ⎗ ${chalk.hex('#FF006E')(sender)}
≡ ❑ ${chalk.hex('#00FF9F')(`XP: ${user.exp || 0}`)} ${chalk.hex('#FFBE0B')(`💎 ${user.diamond || 0}`)} ${chalk.hex('#FB5607')(`LV: ${user.level || 0}`)}
≡ ✞ ${chatJid.endsWith('@g.us')
  ? chalk.hex('#00F5FF')(chatDisplay)
  : chalk.hex('#8338EC')(chatDisplay)}
≡ ⎙ ${chalk.black(chalk.bgHex('#00FF9F')(messageType))}
${chalk.hex('#00FF9F').bold('┈────────────── ꒰ 𝕭𝖑𝖆𝖈𝖐 𝕮𝖑𝖔𝖛𝖊𝖗 ☘:꒱')}
`

    console.log(header)

    if (img) console.log(img.trimEnd())

    let log = ''

    if (typeof m.text === 'string' && m.text) {
      log = m.text.replace(/\u200e+/g, '')

      const mdRegex =
        /(?<=(?:^|[\s\n])\S?)(?:([*_~])(.+?)\1|```((?:.||[\n\r])+?)```)(?=\S?(?:[\s\n]|$))/g

      const mdFormat = (depth = 4) => (_, type, text, monospace) => {
        const types = {
          _: 'italic',
          '*': 'bold',
          '~': 'strikethrough'
        }

        text = text || monospace

        return !types[type] || depth < 1
          ? text
          : chalk[types[type]](
              text.replace(
                mdRegex,
                mdFormat(depth - 1)
              )
            )
      }

      log = log.replace(mdRegex, mdFormat(4))

      if (m.mentionedJid?.length) {
        for (const jid of m.mentionedJid) {
          const name = getSenderName(jid, conn)
          const number = jid.split('@')[0]

          if (!number) continue

          const escapedNumber = number.replace(
            /[.*+?^${}()|[\]\\]/g,
            '\\$&'
          )

          log = log.replace(
            new RegExp(`@${escapedNumber}`, 'g'),
            chalk.hex('#FF006E')('@' + name)
          )
        }
      }

      const lowerLog = log.toLowerCase()

      const isAlert = ALERT_WORDS.some(word =>
        lowerLog.includes(word.toLowerCase())
      )

      const isOwner = Boolean(
        global.owner?.some(([id]) =>
          String(id).replace(/\D/g, '') ===
          senderNum.replace(/\D/g, '')
        )
      )

      if (isAlert) {
        console.log(
          chalk.bgHex('#FF006E').white.bold('[ALERTA] ') +
          chalk.hex('#FF006E')(log)
        )
      } else if (isOwner) {
        console.log(
          chalk.bgHex('#00FF9F').black.bold('[OWNER] ') +
          chalk.hex('#00FF9F')(log)
        )
      } else if (m.isCommand) {
        console.log(chalk.hex('#FFBE0B')(log))
      } else {
        console.log(chalk.white(log))
      }
    }

    if (/document/i.test(m.mtype || '')) {
      console.log(
        chalk.hex('#00F5FF')(
          `📄 ${m.msg?.fileName || m.msg?.displayName || 'Document'}`
        )
      )
    } else if (/ContactsArray/i.test(m.mtype || '')) {
      console.log(
        chalk.hex('#8338EC')('👨‍👩‍👧‍👦 Contactos')
      )
    } else if (/contact/i.test(m.mtype || '')) {
      console.log(
        chalk.hex('#8338EC')(
          `👨 ${m.msg?.displayName || ''}`
        )
      )
    } else if (/audio/i.test(m.mtype || '')) {
      const duration = Number(m.msg?.seconds || 0)

      console.log(
        chalk.hex('#FB5607')(
          `${m.msg?.ptt ? '🎤 (PTT' : '🎵 (AUDIO'} ` +
          `${Math.floor(duration / 60).toString().padStart(2, '0')}:` +
          `${(duration % 60).toString().padStart(2, '0')})`
        )
      )
    } else if (/video/i.test(m.mtype || '')) {
      console.log(
        chalk.hex('#FF006E')(
          `🎥 Video ${Number(m.msg?.seconds || 0)}s`
        )
      )
    } else if (/sticker/i.test(m.mtype || '')) {
      console.log(
        chalk.hex('#FFBE0B')(
          `🎴 Sticker ${m.msg?.isAnimated ? 'Animado' : 'Static'}`
        )
      )
    }

    console.log()
  } catch (e) {
    console.log(
      chalk.bgHex('#FF006E').white.bold('[PRINT ERROR] ') +
      chalk.hex('#FF006E')(
        e?.stack || e?.message || String(e)
      )
    )
  }
}

const file = fileURLToPath(import.meta.url)

watchFile(file, () => {
  unwatchFile(file)
  console.log(
    chalk.hex('#FF006E').bold("Update 'lib/print.js'")
  )
  import(`${file}?update=${Date.now()}`)
})