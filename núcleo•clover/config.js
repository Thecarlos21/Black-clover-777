import { watchFile, unwatchFile } from 'fs'
import chalk from 'chalk'
import { fileURLToPath } from 'url'
import fs from 'fs'
import cheerio from 'cheerio'
import fetch from 'node-fetch'
import axios from 'axios'
import moment from 'moment-timezone'
import { performance } from 'perf_hooks'
import os from 'os'
import process from 'process'

const VERSION = '7.7.7'
const BUILD = '2026.09-RC'

global.core = {
  name: '𝕭𝖑𝖆𝖈𝖐 𝕮𝖑𝖔𝖛𝖊𝖗 ☘',
  version: VERSION,
  build: BUILD,
  engine: 'Baileys',
  engineVer: '6.7.9',
  node: process.version,
  mode: process.env.PREFIX?.includes('com.termux') ? 'termux' : 'server',
  arch: process.arch,
  platform: process.platform
}

global.botNumber = ''

global.owner = [
  ['5215544876071', '🜲 𝗖𝗿𝗲𝗮𝗱𝗼𝗿 👻', true],
  ['5217971289909'],
  ['5213332329453', 'Z', true],
  ['5217971282613', '', false],
  ['573244278232', 'Brayan uchiha 🐦‍⬛', true]
]

global.mods = ['5215544876071']
global.suittag = ['5215544876071']
global.prems = ['5215544876071']

global.libreria = 'Baileys'
global.baileys = 'Thecarlos'
global.languaje = 'Español'
global.vs = VERSION
global.vsJB = '5.0'
global.nameqr = 'black clover- Bot'
global.sessions = 'blackSession'
global.jadi = 'blackJadiBot'
global.blackJadibts = true
global.build = BUILD

global.packsticker = '𝕭𝖑𝖆𝖈𝖐 𝕮𝖑𝖔𝖛𝖊𝖗 ᚲ 𝐓𝐇𝐄 𝐂𝐀𝐑𝐋𝐎𝐒'
global.packname = '𝕭𝖑𝖆𝖈𝖐 𝕮𝖑𝖔𝖛𝖊𝖗 ☘'
global.author = '♾'
global.wm = '𝕭𝖑𝖆𝖈𝖐 𝕮𝖑𝖔𝖛𝖊𝖗 ☘'
global.titulowm = '𝕭𝖑𝖆𝖈𝖐 𝕮𝖑𝖔𝖛𝖊𝖗 ☘'
global.igfg = 'ᥫ𝐓𝐇𝐄 𝐂𝐀𝐑𝐋𝐎𝐒'
global.botname = '𝕭𝖑𝖆𝖈𝖐 𝕮𝖑𝖔𝖛𝖊𝖗 ☘'
global.dev = '© ⍴᥆ᥕᥱrᥱძ ᑲᥡ the Legends ⚡'
global.textbot = '𝑩𝑳𝑨𝑪𝑲 𝑪𝑳𝑶𝑽𝑬𝑹 : 𝐓𝐇𝐄 𝐂𝐀𝐑𝐋𝐎𝐒'
global.gt = '͟͞𝕭𝖑𝖆𝖈𝖐 𝕮𝖑𝖔𝖛𝖊𝖗 ☘͟͞'
global.namechannel = '𝑩𝑳𝑨𝑪𝑲 𝑪𝑳𝑶𝑽𝑬𝑹 / 𝐓𝐇𝐄 𝐂𝐀𝐑𝐋𝐎𝐒'
global.monedas = 'monedas'

global.gp1 = 'https://chat.whatsapp.com/IbADO35sBSC4G1FBTGbHIE?mode=ac_t'
global.gp2 = 'https://chat.whatsapp.com/FiBcPMYEO7mG4m16gBbwpP?mode=ac_t'
global.comunidad1 = 'https://chat.whatsapp.com/FgQ4q11AjaO8ddyc1LvK4r?mode=ac_t'
global.channel = 'https://whatsapp.com/channel/0029VbB36XC8aKvQevh8Bp04'
global.cn = global.channel
global.yt = 'https://www.youtube.com/@ElCarlos.87'
global.md = 'https://github.com/thecarlos19/black-clover-MD'
global.correo = 'thecarlospcok@gmail.com'
global.redes = global.channel

const catalogoURL = new URL('../src/catalogo.jpg', import.meta.url)

global.catalogo = fs.existsSync(catalogoURL)
  ? fs.readFileSync(catalogoURL)
  : null

global.photoSity = global.catalogo ? [global.catalogo] : []
global.icons = global.catalogo
global.thumb = global.catalogo

global.estilo = {
  key: {
    fromMe: false,
    participant: '0@s.whatsapp.net'
  },
  message: {
    orderMessage: {
      itemCount: 1,
      status: 1,
      surface: 1,
      message: global.packname,
      orderTitle: 'Bang',
      thumbnail: global.catalogo,
      sellerJid: '0@s.whatsapp.net'
    }
  }
}

global.ch = {
  ch1: '120363419782804545@newsletter'
}

global.rcanal = global.ch.ch1

global.cheerio = cheerio
global.fs = fs
global.fetch = fetch
global.axios = axios
global.moment = moment
global.performance = performance
global.os = os

global.multiplier = 69
global.maxwarn = 3

global.emojis = [
  '⚔️',
  '🔥',
  '☘️',
  '👑',
  '✨',
  '💀',
  '🗡️',
  '🛡️'
]

global.getRandom = (ext = '') => {
  return `${Math.floor(Math.random() * 1000000)}${ext}`
}

global.formatSize = (bytes = 0) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  )

  return `${(bytes / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`
}

const normalize = jid => {
  if (!jid) return ''
  return String(jid).split('@')[0].replace(/\D/g, '')
}

const raw = value => {
  if (Array.isArray(value)) return String(value[0] || '')
  return String(value || '')
}

const getJidNumbers = jid => {
  if (!jid) return []

  return [
    jid,
    jid?.participantAlt,
    jid?.senderPn,
    jid?.senderPnAlt
  ]
    .flat(Infinity)
    .filter(Boolean)
    .map(normalize)
    .filter(Boolean)
}

global.isOwner = jid => {
  if (!jid) return false

  const owners = [
    ...(global.owner || []),
    ...(global.mods || [])
  ]
    .map(raw)
    .map(normalize)
    .filter(Boolean)

  const numbers = getJidNumbers(jid)

  return numbers.some(number =>
    owners.some(owner =>
      number === owner || number.includes(owner)
    )
  )
}

global.isMod = jid => {
  if (!jid) return false
  if (global.isOwner(jid)) return true

  const mods = (global.mods || [])
    .map(raw)
    .map(normalize)
    .filter(Boolean)

  const numbers = getJidNumbers(jid)

  return numbers.some(number =>
    mods.some(mod =>
      number === mod || number.includes(mod)
    )
  )
}

global.isPrems = jid => {
  if (!jid) return false
  if (global.isOwner(jid)) return true

  const premium = (global.prems || [])
    .map(raw)
    .map(normalize)
    .filter(Boolean)

  const numbers = getJidNumbers(jid)

  return numbers.some(number =>
    premium.some(prem =>
      number === prem || number.includes(prem)
    )
  )
}

global.sysStats = () => {
  const cpus = os.cpus()

  return {
    platform: os.platform(),
    arch: os.arch(),
    node: process.version,
    uptime: typeof global.runtime === 'function'
      ? global.runtime(process.uptime())
      : `${Math.floor(process.uptime())}s`,
    ram: global.formatSize(os.totalmem() - os.freemem()),
    totalRam: global.formatSize(os.totalmem()),
    cpu: cpus?.[0]?.model || 'Unknown',
    cores: cpus.length
  }
}

const file = fileURLToPath(import.meta.url)

watchFile(file, { interval: 1000 }, () => {
  unwatchFile(file)

  console.log(
    chalk.hex('#00FF9F').bold(
      "Update 'núcleo•clover/config.js'"
    )
  )

  import(`${file}?update=${Date.now()}`)
})

console.log(
  chalk.hex('#00FF9F').bold(
    `${global.core.name} v${global.core.version} | Build ${global.core.build}`
  )
)

console.log(
  chalk.hex('#B4FF00')(
    `[ ENGINE ] ${global.core.engine} ${global.core.engineVer} | Node ${global.core.node}`
  )
)

console.log(
  chalk.hex('#FF006E').bold(
    `[ MODE ] ${global.core.mode.toUpperCase()} | ${global.core.platform} | ${global.core.arch}`
  )
)

console.log(
  chalk.hex('#00FFFF')(
    `[ SYSTEM ] ${os.cpus().length} CPU | ${global.formatSize(os.totalmem())} RAM`
  )
)