process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '1'
import './config.js'
import cluster from 'cluster'
const { setupMaster, fork } = cluster
import { watchFile, unwatchFile } from 'fs'
import cfonts from 'cfonts'
import { createRequire } from 'module'
import { fileURLToPath, pathToFileURL } from 'url'
import { platform } from 'process'
import * as ws from 'ws'
import fs, { readdirSync, statSync, unlinkSync, existsSync, mkdirSync, readFileSync, rmSync, watch } from 'fs'
import yargs from 'yargs'
import { spawn } from 'child_process'
import lodash from 'lodash'
import { blackJadiBot } from '../plugins/jadibot-serbot.js'
import chalk from 'chalk'
import syntaxerror from 'syntax-error'
import { tmpdir } from 'os'
import { format } from 'util'
import boxen from 'boxen'
import pino from 'pino'
import path, { join, dirname } from 'path'
import { Boom } from '@hapi/boom'
import { makeWASocket, protoType, serialize } from '../lib/simple.js'
import { Low, JSONFile } from 'lowdb'
import store from '../lib/store.js'
const { proto } = (await import('@whiskeysockets/baileys')).default
import pkg from 'google-libphonenumber'
const { PhoneNumberUtil } = pkg
const phoneUtil = PhoneNumberUtil.getInstance()
const { DisconnectReason, useMultiFileAuthState, MessageRetryMap, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, jidNormalizedUser } = await import('@whiskeysockets/baileys')
import readline, { createInterface } from 'readline'
import NodeCache from 'node-cache'

const { CONNECTING } = ws
const { chain } = lodash
const PORT = process.env.PORT || process.env.SERVER_PORT || 3000

protoType()
serialize()

if (!global.reconnectAttempts) global.reconnectAttempts = 0
if (!global.msgQueue) global.msgQueue = new Map()
if (!global.presenceConfig) global.presenceConfig = new Map()

global.__filename = function filename(pathURL = import.meta.url, rmPrefix = platform!== 'win32') {
  return rmPrefix? /file:\/\/\//.test(pathURL)? fileURLToPath(pathURL) : pathURL : pathToFileURL(pathURL).toString()
}
global.__dirname = function dirname(pathURL) {
  return path.dirname(global.__filename(pathURL, true))
}
global.__require = function require(dir = import.meta.url) {
  return createRequire(dir)
}

global.API = (name, path = '/', query = {}, apikeyqueryname) => (name in global.APIs? global.APIs[name] : name) + path + (query || apikeyqueryname? '?' + new URLSearchParams(Object.entries({...query,...(apikeyqueryname? { [apikeyqueryname]: global.APIKeys[name in global.APIs? global.APIs[name] : name] } : {}) })) : '')

global.timestamp = { start: new Date }

const __dirname = global.__dirname(import.meta.url)

global.opts = new Object(yargs(process.argv.slice(2)).exitProcess(false).parse())
global.prefix = new RegExp('^[#/!.]')

global.db = new Low(/https?:\/\//.test(opts['db'] || '')? new JSONFile('./src/database/database.json'))

global.DATABASE = global.db
global.loadDatabase = async function loadDatabase() {
  if (global.db.READ) {
    return new Promise((resolve) => setInterval(async function () {
      if (!global.db.READ) {
        clearInterval(this)
        resolve(global.db.data == null? global.loadDatabase() : global.db.data)
      }
    }, 1000))
  }
  if (global.db.data!== null) return
  global.db.READ = true
  await global.db.read().catch(console.error)
  global.db.READ = null
  global.db.data = {
    users: {},
    chats: {},
    stats: {},
    msgs: {},
    sticker: {},
    settings: {},
...(global.db.data || {}),
  }
  global.db.chain = chain(global.db.data)
}
loadDatabase()

const { state, saveState, saveCreds } = await useMultiFileAuthState(global.sessions)
const msgRetryCounterCache = new NodeCache({ stdTTL: 300, checkperiod: 60 })
const msgRetryCounterMap = (MessageRetryMap) => {}
const { version } = await fetchLatestBaileysVersion()
let phoneNumber = global.botNumber

const methodCodeQR = process.argv.includes("qr")
const methodCode =!!phoneNumber || process.argv.includes("code")
const MethodMobile = process.argv.includes("mobile")

const theme = {
  banner: chalk.bgGreen.black,
  accent: chalk.bold.yellowBright,
  highlight: chalk.bold.greenBright,
  text: chalk.bold.white,
  prompt: chalk.bold.magentaBright
}

const rl = createInterface({ input: process.stdin, output: process.stdout })
const question = (texto) => new Promise((resolver) => rl.question(texto, resolver))

let opcion
if (methodCodeQR) opcion = '1'

const credsExist = existsSync(`./${global.sessions}/creds.json`)

async function isValidPhoneNumber(number) {
  try {
    const parsed = phoneUtil.parseAndKeepRawInput(number)
    return phoneUtil.isValidNumber(parsed)
  } catch {
    return false
  }
}

if (!methodCodeQR &&!methodCode &&!credsExist) {
  do {
    opcion = await question(
      theme.banner('⌬ Elija una opción:\n') +
      theme.highlight('1. Con código QR\n') +
      theme.text('2. Con código de texto de 8 dígitos\n--> ')
    )
    if (!/^[1-2]$/.test(opcion)) {
      console.log(chalk.bold.redBright(`✞ No se permiten numeros que no sean 1 o 2, tampoco letras o símbolos especiales.`))
    }
  } while ((opcion!== '1' && opcion!== '2') || credsExist)
}

console.info = () => {}
console.debug = () => {}

const connectionOptions = {
  logger: pino({ level: 'silent' }),
  printQRInTerminal: opcion == '1'? true : methodCodeQR? true : false,
  mobile: MethodMobile,
  browser: opcion == '1'? [`${global.nameqr}`, 'Edge', '20.0.04'] : methodCodeQR? [`${global.nameqr}`, 'Edge', '20.0.04'] : ['Ubuntu', 'Edge', '110.0.1587.56'],
  auth: {
    creds: state.creds,
    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
  },
  markOnlineOnConnect: false,
  generateHighQualityLinkPreview: false,
  syncFullHistory: false,
  shouldIgnoreJid: () => false,
  getMessage: async (clave) => {
    try {
      let jid = jidNormalizedUser(clave.remoteJid)
      let msg = await store.loadMessage(jid, clave.id)
      return msg?.message || undefined
    } catch {
      return undefined
    }
  },
  msgRetryCounterCache,
  msgRetryCounterMap,
  defaultQueryTimeoutMs: undefined,
  version,
}

global.conn = makeWASocket(connectionOptions)

if (!existsSync(`./${global.sessions}/creds.json`)) {
  if (opcion === '2' || methodCode) {
    opcion = '2'
    if (!conn.authState.creds.registered) {
      let addNumber
      if (!!phoneNumber) {
        addNumber = phoneNumber.replace(/[^0-9]/g, '')
      } else {
        do {
          phoneNumber = await question(chalk.bgBlack(chalk.bold.greenBright(`✞ Por favor, Ingrese el número de WhatsApp.\n${chalk.bold.magentaBright('---> ')}`)))
          phoneNumber = phoneNumber.replace(/\D/g,'')
          if (!phoneNumber.startsWith('+')) {
            phoneNumber = `+${phoneNumber}`
          }
        } while (!await isValidPhoneNumber(phoneNumber))
        rl.close()
        addNumber = phoneNumber.replace(/\D/g, '')
        setTimeout(async () => {
          let codeBot = await conn.requestPairingCode(addNumber)
          codeBot = codeBot?.match(/.{1,4}/g)?.join("-") || codeBot
          console.log(chalk.bold.white(chalk.bgMagenta(`✞ Código:`)), chalk.bold.white(chalk.white(codeBot)))
        }, 3000)
      }
    }
  }
}

conn.isInit = false
conn.well = false
conn.logger.info(` ✞ H E C H O\n`)

if (!opts['test']) {
  if (global.db) setInterval(async () => {
    if (global.db.data) await global.db.write().catch(() => {})
  }, 1000 * 120)
}

async function connectionUpdate(update) {
  const { connection, lastDisconnect, isNewLogin, qr } = update
  const reason = new Boom(lastDisconnect?.error)?.output?.statusCode
  global.stopped = connection
  if (isNewLogin) conn.isInit = true
  if (!global.db.data) await loadDatabase()
  if ((qr && qr!== '0') || methodCodeQR) {
    if (opcion === '1' || methodCodeQR) {
      console.log(chalk.bold.yellow(`\n❐ ESCANEA EL CÓDIGO QR - EXPIRA EN 45 SEGUNDOS`))
    }
  }
  if (connection === 'open') {
    global.reconnectAttempts = 0
    console.log(chalk.bold.green('\n🧙‍♂️ BLACK CLOVER BOT CONECTADO ✞'))
    return
  }
  if (connection === 'close') {
    switch (reason) {
      case DisconnectReason.badSession:
      case DisconnectReason.loggedOut:
        console.log(chalk.bold.redBright(`\n⚠︎ SESIÓN INVÁLIDA O CERRADA, BORRA LA CARPETA ${global.sessions} Y ESCANEA EL CÓDIGO QR ⚠︎`))
        return
      case DisconnectReason.connectionClosed:
        console.log(chalk.bold.magentaBright(`\n⚠︎ CONEXIÓN CERRADA, REINICIANDO...`))
        await global.autoReconnectV2()
        return
      case DisconnectReason.connectionLost:
        console.log(chalk.bold.blueBright(`\n⚠︎ CONEXIÓN PERDIDA, RECONECTANDO...`))
        await global.autoReconnectV2()
        return
      case DisconnectReason.connectionReplaced:
        console.log(chalk.bold.yellowBright(`\n⚠︎ CONEXIÓN REEMPLAZADA, OTRA SESIÓN INICIADA`))
        return
      case DisconnectReason.restartRequired:
        console.log(chalk.bold.cyanBright(`\n☑ REINICIANDO SESIÓN...`))
        await global.autoReconnectV2()
        return
      case DisconnectReason.timedOut:
        console.log(chalk.bold.yellowBright(`\n⚠︎ TIEMPO AGOTADO, REINTENTANDO CONEXIÓN...`))
        await global.autoReconnectV2()
        return
      default:
        console.log(chalk.bold.redBright(`\n⚠︎ DESCONEXIÓN DESCONOCIDA (${reason || 'Desconocido'})`))
        await global.autoReconnectV2()
        return
    }
  }
}

process.on('uncaughtException', console.error)

let isInit = true
let handler = await import('./handler.js')

global.reloadHandler = async function(restatConn) {
  try {
    const Handler = await import(`./handler.js?update=${Date.now()}`).catch(console.error)
    if (Handler && (Handler.handler || Handler.default)) {
      handler = Handler.default || Handler
    }
  } catch (e) {
    console.error(e)
  }
  if (restatConn) {
    const oldChats = global.conn.chats
    try {
      global.conn.ws.close()
    } catch {}
    global.conn.ev.removeAllListeners()
    global.conn = makeWASocket(connectionOptions, { chats: oldChats })
    isInit = true
  }
  if (!isInit) {
    global.conn.ev.off('messages.upsert', global.conn.handler)
    global.conn.ev.off('connection.update', global.conn.connectionUpdate)
    global.conn.ev.off('creds.update', global.conn.credsUpdate)
  }
  global.conn.handler = (handler.handler || handler).bind(global.conn)
  global.conn.connectionUpdate = connectionUpdate.bind(global.conn)
  global.conn.credsUpdate = saveCreds.bind(global.conn, true)
  global.conn.ev.on('messages.upsert', global.conn.handler)
  global.conn.ev.on('connection.update', global.conn.connectionUpdate)
  global.conn.ev.on('creds.update', global.conn.credsUpdate)
  isInit = false
  return true
}

global.rutaJadiBot = join(__dirname, '../núcleo•clover/blackJadiBot')

if (global.blackJadibts) {
  if (!existsSync(global.rutaJadiBot)) {
    mkdirSync(global.rutaJadiBot, { recursive: true })
    console.log(chalk.bold.cyan(`La carpeta: ${global.sessions} se creó correctamente.`))
  }
  const readRutaJadiBot = readdirSync(global.rutaJadiBot)
  if (readRutaJadiBot.length > 0) {
    const creds = 'creds.json'
    for (const gjbts of readRutaJadiBot) {
      const botPath = join(global.rutaJadiBot, gjbts)
      const readBotPath = readdirSync(botPath)
      if (readBotPath.includes(creds)) {
        blackJadiBot({ pathblackJadiBot: botPath, m: null, conn, args: '', usedPrefix: '/', command: 'serbot' })
      }
    }
  }
}

const pluginFolder = global.__dirname(join(__dirname, '../plugins/index'))
const pluginFilter = (filename) => /\.js$/.test(filename)
global.plugins = {}

async function filesInit() {
  for (const filename of readdirSync(pluginFolder).filter(pluginFilter)) {
    try {
      const file = global.__filename(join(pluginFolder, filename))
      const module = await import(file)
      global.plugins[filename] = module.default || module
    } catch (e) {
      conn.logger.error(e)
      delete global.plugins[filename]
    }
  }
}
filesInit().then((_) => Object.keys(global.plugins)).catch(console.error)

global.reload = async (_ev, filename) => {
  if (pluginFilter(filename)) {
    const dir = global.__filename(join(pluginFolder, filename), true)
    if (filename in global.plugins) {
      if (existsSync(dir)) conn.logger.info(` updated plugin - '${filename}'`)
      else {
        conn.logger.warn(`deleted plugin - '${filename}'`)
        return delete global.plugins[filename]
      }
    } else conn.logger.info(`new plugin - '${filename}'`)
    const err = syntaxerror(readFileSync(dir), filename, { sourceType: 'module', allowAwaitOutsideFunction: true })
    if (err) conn.logger.error(`syntax error while loading '${filename}'\n${format(err)}`)
    else {
      try {
        const module = await import(`${global.__filename(dir)}?update=${Date.now()}`)
        global.plugins[filename] = module.default || module
      } catch (e) {
        conn.logger.error(`error require plugin '${filename}\n${format(e)}'`)
      } finally {
        global.plugins = Object.fromEntries(Object.entries(global.plugins).sort(([a], [b]) => a.localeCompare(b)))
      }
    }
  }
}
Object.freeze(global.reload)
watch(pluginFolder, global.reload)
await global.reloadHandler()

async function _quickTest() {
  const test = await Promise.all([
    spawn('ffmpeg'),
    spawn('ffprobe'),
    spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-filter_complex', 'color', '-frames:v', '1', '-f', 'webp', '-']),
    spawn('convert'),
    spawn('magick'),
    spawn('gm'),
    spawn('find', ['--version'])
  ].map(p => Promise.race([
    new Promise(r => p.on('close', c => r(c!== 127))),
    new Promise(r => p.on('error', () => r(false)))
  ])))
  const [ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find] = test
  Object.freeze(global.support = { ffmpeg, ffprobe, ffmpegWebp, convert, magick, gm, find })
}

function clearTmp() {
  try {
    const tmpDir = join(process.cwd(), 'tmp')
    if (!existsSync(tmpDir)) mkdirSync(tmpDir, { recursive: true })
    const files = readdirSync(tmpDir)
    for (const file of files) {
      try { unlinkSync(join(tmpDir, file)) } catch {}
    }
  } catch {}
}

function purgeSession() {
  try {
    for (const file of readdirSync(`./${global.sessions}`).filter(f => f.startsWith('pre-key-'))) {
      try { unlinkSync(`./${global.sessions}/${file}`) } catch {}
    }
  } catch {}
}

function purgeSessionSB() {
  try {
    for (const dir of readdirSync(global.rutaJadiBot)) {
      const full = join(global.rutaJadiBot, dir)
      if (!statSync(full).isDirectory()) continue
      for (const f of readdirSync(full).filter(x => x.startsWith('pre-key-') && x!== 'creds.json')) {
        try { unlinkSync(join(full, f)) } catch {}
      }
    }
  } catch (e) {
    console.log(chalk.bold.red(`Error eliminando pre-keys de SB:\n${e}`))
  }
}

function purgeBadMAC() {
  try {
    let dir = `./${global.sessions}`
    if (!existsSync(dir)) return
    for (const file of readdirSync(dir)) {
      if (file.startsWith('sender-key-') || file.startsWith('session-')) {
        try { unlinkSync(join(dir, file)) } catch {}
      }
    }
  } catch {}
}

function interceptBadMAC() {
  let originalError = console.error
  let originalLog = console.log
  let handle = (...args) => {
    let txt = args.join(' ')
    if (txt.includes('Bad MAC') || txt.includes('Failed to decrypt') || txt.includes('Session error') || txt.includes('decrypt message with any known session')) {
      try { purgeBadMAC() } catch {}
    }
  }
  console.error = function(...args) {
    handle(...args)
    return originalError.apply(this, args)
  }
  console.log = function(...args) {
    handle(...args)
    return originalLog.apply(this, args)
  }
}
interceptBadMAC()

global.backupcreds = async function() {
  const backupPath = join(process.cwd(), 'backup_creds')
  if (!existsSync(backupPath)) mkdirSync(backupPath, { recursive: true })
  const credsPath = `./${global.sessions}/creds.json`
  if (!existsSync(credsPath)) return false
  const ts = Date.now()
  fs.copyFileSync(credsPath, join(backupPath, `creds_${ts}.json`))
  console.log(chalk.greenBright(`Backup creado: creds_${ts}.json`))
  return true
}

global.clearsubs = function() {
  try {
    rmSync(global.rutaJadiBot, { recursive: true, force: true })
    mkdirSync(global.rutaJadiBot, { recursive: true })
    console.log(chalk.greenBright(`Todos los Sub-Bots eliminados`))
    return true
  } catch { return false }
}

global.pingbot = function() {
  return { ping: Date.now() - global.timestamp.start, uptime: process.uptime() * 1000 }
}

global.autoReconnectV2 = async function() {
  if (global.reconnectAttempts >= 5) {
    console.log(chalk.red.bold('Maximo de reconexiones alcanzado'))
    return false
  }
  global.reconnectAttempts++
  await new Promise(r => setTimeout(r, 3000 * global.reconnectAttempts))
  return await global.reloadHandler(true)
}

let isCleaning = false
async function runCleanup(task) {
  if (stopped === true || global.stopped === 'close' ||!global.conn?.user || isCleaning) return
  isCleaning = true
  try { await task() } catch (e) { console.error(e) }
  isCleaning = false
}

setInterval(() => runCleanup(clearTmp), 600000)
setInterval(() => runCleanup(purgeSession), 1800000)
setInterval(() => runCleanup(purgeSessionSB), 1800000)
setInterval(() => runCleanup(purgeBadMAC), 60000)

_quickTest().then(() => conn.logger.info(chalk.bold(`✞ H E C H O`))).catch(console.error)

global.healthcheck = function() {
  const mem = process.memoryUsage()
  const subs = global.conns?.filter(c => c.user && c.ws?.socket?.readyState!== ws.CLOSED).length || 0
  const s = Math.floor(process.uptime())
  const h = String(Math.floor(s / 3600)).padStart(2, '0')
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  return {
    ram: `${(mem.rss / 1024 / 1024).toFixed(2)} MB`,
    heap: `${(mem.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    uptime: `${h}:${m}:${sec}`,
    subbots: subs,
    status: global.conn?.user? 'online' : 'offline'
  }
}