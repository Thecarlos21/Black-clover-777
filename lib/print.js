import { WAMessageStubType } from '@whiskeysockets/baileys'
import PhoneNumber from 'awesome-phonenumber'
import chalk from 'chalk'
import { watchFile, unwatchFile } from 'fs'
import { fileURLToPath } from 'url'

const ALERT_WORDS = ['@admin', 'error', 'fallo', 'ayuda', 'problema', 'ban', 'spam']
const IGNORE_CHATS = ['status@broadcast']
const MUTE_USERS = []

const formatSize = (bytes) => {
  if (!bytes) return '0B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)}${units[i]}`
}

const getName = (jid, conn) => {
  try {
    if (!jid) return ''
    if (conn.contacts?.[jid]?.name) return conn.contacts[jid].name
    if (conn.contacts?.[jid]?.notify) return conn.contacts[jid].notify
    return PhoneNumber('+' + jid.replace(/@.+/, '')).getNumber('international') || jid.split('@')[0]
  } catch { return jid.split('@')[0] }
}

export default async function (m, conn = { user: {} }) {
  if (IGNORE_CHATS.includes(m.chat) || MUTE_USERS.includes(m.sender)) return
  let _name = getName(m.sender, conn)
  let sender = PhoneNumber('+' + m.sender.replace(/@.+/, '')).getNumber('international') + (_name? ' ~' + _name : '')
  let chat = getName(m.chat, conn)
  let filesize = m.msg?.fileLength?.low || m.msg?.fileLength || m.text?.length || 0
  let user = global.db?.data?.users?.[m.sender] || {}
  let me = PhoneNumber('+' + (conn.user?.jid || '').replace(/@.+/, '')).getNumber('international')
  let isP = global.conn?.user?.jid === conn.user?.jid
  let uptime = process.uptime()
  let uptimeStr = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m`
  const time = new Date().toLocaleTimeString('es-MX', { timeZone: 'America/Mexico_City', hour12: false })

  console.log(`
${chalk.hex('#00FF9F').bold('┈────────────── ꒰ ⚔️ ꒱')}
≡ ✯ ${chalk.cyan(me + ' ➝ ' + (isP? "(Principal)" : "(SubBot)"))}
≡ ✢ ${chalk.bgHex('#FF006E')(time)} ⏱ ${chalk.hex('#B4FF00')(uptimeStr)}
≡ ◆ ${chalk.hex('#8338EC')(formatSize(filesize))}
≡ ⎗ ${chalk.hex('#FF006E')(sender)}
≡ ✞ ${m.chat.endsWith('@g.us')? chalk.hex('#00F5FF')(chat) : chalk.hex('#8338EC')(m.chat)}
≡ ⎙ ${chalk.bgHex('#00FF9F').black(m.mtype || 'TEXT')}
${chalk.hex('#00FF9F').bold('┈────────────── ꒰ 𝕭𝖑𝖆𝖈𝖐 𝕮𝖑𝖔𝖛𝖊𝖗 ☘:꒱')}
`)

  if (typeof m.text === 'string' && m.text) {
    let log = m.text.replace(/\u200e+/g, '')
    const isAlert = ALERT_WORDS.some(w => log.toLowerCase().includes(w))
    const isOwner = global.owner?.some(([id]) => m.sender.includes(id))
    if (isAlert) console.log(chalk.bgRed.white.bold('[ALERTA] ') + log)
    else if (isOwner) console.log(chalk.bgGreen.black.bold('[OWNER] ') + log)
    else console.log(log)
  }
  console.log()
}

let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.hex('#FF006E').bold("Update 'lib/print.js'"))
  import(`${file}?update=${Date.now()}`)
})