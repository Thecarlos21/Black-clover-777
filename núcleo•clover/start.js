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
import SQLiteDB from '../lib/database.js'
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

const BOT_TMP =
  join(
    process.cwd(),
    'tmp'
  )

if (!existsSync(BOT_TMP)) {
  mkdirSync(
    BOT_TMP,
    {
      recursive: true
    }
  )
}

process.env.TMPDIR = BOT_TMP
process.env.TMP = BOT_TMP
process.env.TEMP = BOT_TMP

global.tmpDir = BOT_TMP

protoType()
serialize()

if (!global.reconnectAttempts) global.reconnectAttempts = 0
if (!global.reconnecting) global.reconnecting = false
if (!global.msgQueue) global.msgQueue = new Map()
if (!global.presenceConfig) global.presenceConfig = new Map()
if (!global.stopped) global.stopped = 'connecting'

const withTimeout = (promise, ms, label) => {
  let timer

  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(label || 'timeout'))
    }, ms)
  })

  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timer)
  })
}

const safeRun = async (promise, ms) => {
  try {
    return await withTimeout(promise, ms)
  } catch (e) {
    if (String(e?.message).toLowerCase().includes('timeout')) {
      return null
    }

    throw e
  }
}

global.__filename = function filename(pathURL = import.meta.url, rmPrefix = platform !== 'win32') {
  return rmPrefix
    ? /file:\/\/\//.test(pathURL)
      ? fileURLToPath(pathURL)
      : pathURL
    : pathToFileURL(pathURL).toString()
}

global.__dirname = function dirname(pathURL) {
  return path.dirname(global.__filename(pathURL, true))
}

global.__require = function require(dir = import.meta.url) {
  return createRequire(dir)
}

global.API = (name, path = '/', query = {}, apikeyqueryname) =>
  (name in global.APIs ? global.APIs[name] : name) +
  path +
  (query || apikeyqueryname
    ? '?' +
      new URLSearchParams(
        Object.entries({
          ...query,
          ...(apikeyqueryname
            ? {
                [apikeyqueryname]:
                  global.APIKeys[
                    name in global.APIs ? global.APIs[name] : name
                  ]
              }
            : {})
        })
      )
    : '')

global.timestamp = {
  start: new Date()
}

const __dirname = global.__dirname(import.meta.url)

global.opts = new Object(
  yargs(process.argv.slice(2))
    .exitProcess(false)
    .parse()
)

global.prefix = new RegExp('^[#/!.]')

global.db = new SQLiteDB('./src/database/database.db')
global.DATABASE = global.db

global.loadDatabase = async function loadDatabase() {
  if (global.db.READ) {
    const start = Date.now()

    while (global.db.READ) {
      if (Date.now() - start > 10000) {
        break
      }

      await new Promise(resolve => setTimeout(resolve, 200))
    }

    if (global.db.data !== null) {
      return global.db.data
    }
  }

  if (global.db.data !== null) {
    return global.db.data
  }

  global.db.READ = true

  try {
    await safeRun(global.db.read(), 8000)
  } catch {}

  global.db.READ = null
  global.db.chain = chain(global.db.data)

  return global.db.data
}

await global.loadDatabase()

const { state, saveCreds } =
  await useMultiFileAuthState(global.sessions)

const msgRetryCounterCache = new NodeCache({
  stdTTL: 300,
  checkperiod: 60
})

const msgRetryCounterMap = {}

let baileysVersion

try {
  const v = await withTimeout(
    fetchLatestBaileysVersion(),
    8000,
    'fetch version timeout'
  )

  baileysVersion = v?.version
} catch {
  baileysVersion = [2, 3000, 1023223821]
}

let phoneNumber = global.botNumber

const methodCodeQR = process.argv.includes('qr')
const methodCode =
  !!phoneNumber || process.argv.includes('code')

const MethodMobile =
  process.argv.includes('mobile')

const theme = {
  banner: chalk.bgGreen.black,
  accent: chalk.bold.yellowBright,
  highlight: chalk.bold.greenBright,
  text: chalk.bold.white,
  prompt: chalk.bold.magentaBright
}

const rl = createInterface({
  input: process.stdin,
  output: process.stdout
})

const question = texto =>
  new Promise(resolve =>
    rl.question(texto, resolve)
  )

let opcion

if (methodCodeQR) {
  opcion = '1'
}

const credsExist =
  existsSync(`./${global.sessions}/creds.json`)

async function isValidPhoneNumber(number) {
  try {
    const parsed =
      phoneUtil.parseAndKeepRawInput(number)

    return phoneUtil.isValidNumber(parsed)
  } catch {
    return false
  }
}

if (!methodCodeQR && !methodCode && !credsExist) {
  do {
    opcion = await question(
      theme.banner('⌬ Elija una opción:\n') +
      theme.highlight('1. Con código QR\n') +
      theme.text(
        '2. Con código de texto de 8 dígitos\n--> '
      )
    )

    if (!/^[1-2]$/.test(opcion)) {
      console.log(
        chalk.bold.redBright(
          `✞ No se permiten numeros que no sean 1 o 2, tampoco letras o símbolos especiales.`
        )
      )
    }
  } while (
    (opcion !== '1' && opcion !== '2') ||
    credsExist
  )
}

console.info = () => {}
console.debug = () => {}

const connectionOptions = {
  logger: pino({
    level: 'silent'
  }),

  printQRInTerminal:
    opcion === '1'
      ? true
      : methodCodeQR
        ? true
        : false,

  mobile: MethodMobile,

  browser:
    opcion === '1'
      ? [`${global.nameqr}`, 'Chrome', '120.0.0.0']
      : methodCodeQR
        ? [`${global.nameqr}`, 'Chrome', '120.0.0.0']
        : ['Ubuntu', 'Chrome', '120.0.0.0'],

  auth: {
    creds: state.creds,

    keys: makeCacheableSignalKeyStore(
      state.keys,
      pino({
        level: 'fatal'
      }).child({
        level: 'fatal'
      })
    )
  },

  markOnlineOnConnect: false,
  generateHighQualityLinkPreview: false,
  syncFullHistory: false,

  shouldIgnoreJid: () => false,

  getMessage: async clave => {
    try {
      const jid =
        jidNormalizedUser(clave.remoteJid)

      const msg =
        await store.loadMessage(
          jid,
          clave.id
        )

      return msg?.message || undefined
    } catch {
      return undefined
    }
  },

  msgRetryCounterCache,
  msgRetryCounterMap,

  defaultQueryTimeoutMs: 60000,
  connectTimeoutMs: 60000,
  keepAliveIntervalMs: 25000,
  retryRequestDelayMs: 250,

  version: baileysVersion
}

global.conn =
  makeWASocket(connectionOptions)

let conn = global.conn

conn.isInit = false
conn.well = false

async function requestPairingCode() {
  if (state.creds.registered) {
    return true
  }

  if (opcion !== '2' && !methodCode) {
    return false
  }

  let addNumber =
    String(phoneNumber || '')
      .replace(/\D/g, '')

  if (!addNumber) {
    phoneNumber = await question(
      chalk.bgBlack(
        chalk.bold.greenBright(
          `✞ Por favor, Ingrese el número de WhatsApp.\n${chalk.bold.magentaBright('---> ')}`
        )
      )
    )

    phoneNumber =
      String(phoneNumber || '').trim()

    if (!phoneNumber.startsWith('+')) {
      phoneNumber = `+${phoneNumber}`
    }

    rl.close()

    addNumber =
      phoneNumber.replace(/\D/g, '')
  }

  if (!addNumber) {
    return false
  }

  try {
    if (state.creds.registered) {
      return true
    }

    const socket = global.conn

    if (!socket) {
      return false
    }

    let codeBot =
      await withTimeout(
        socket.requestPairingCode(addNumber),
        20000,
        'pairing timeout'
      )

    codeBot =
      codeBot?.match(/.{1,4}/g)?.join('-') ||
      codeBot

    console.log(
      chalk.bold.white(
        chalk.bgMagenta(`✞ Código:`)
      ),
      chalk.bold.white(codeBot)
    )

    console.log(
      chalk.bold.greenBright(
        `✞ Introduce este código en WhatsApp → Dispositivos vinculados → Vincular dispositivo → Vincular con número de teléfono.`
      )
    )

    return true
  } catch (error) {
    console.error(
      chalk.bold.redBright(
        `✞ Error obteniendo código de vinculación:`
      ),
      error?.message || error
    )

    return false
  }
}

if (!credsExist) {
  if (opcion === '2' || methodCode) {
    opcion = '2'
    await requestPairingCode()
  }
}

conn.logger.info(` ✞ H E C H O\n`)

if (!opts['test']) {
  if (global.db) {
    setInterval(async () => {
      if (
        global.db.data &&
        !global.db.READ
      ) {
        try {
          await safeRun(
            global.db.write(),
            10000
          )
        } catch {}
      }
    }, 1000 * 120)
  }
}

async function connectionUpdate(update) {
  const {
    connection,
    lastDisconnect,
    isNewLogin,
    qr
  } = update

  const reason =
    new Boom(
      lastDisconnect?.error
    )?.output?.statusCode

  if (connection) {
    global.stopped = connection
  }

  if (isNewLogin) {
    conn.isInit = true
  }

  if (!global.db.data) {
    await loadDatabase()
  }

  if (
    (qr && qr !== '0') ||
    methodCodeQR
  ) {
    if (
      opcion === '1' ||
      methodCodeQR
    ) {
      console.log(
        chalk.bold.yellow(
          `\n❐ ESCANEA EL CÓDIGO QR - EXPIRA EN 45 SEGUNDOS`
        )
      )
    }
  }

  if (connection === 'open') {
    global.reconnectAttempts = 0
    global.reconnecting = false
    global.stopped = 'open'

    conn.isInit = true
    conn.well = true

    console.log(
      chalk.bold.green(
        `\n🧙‍♂️ BLACK CLOVER BOT CONECTADO ✞`
      )
    )

    return
  }

  if (connection !== 'close') {
    return
  }

  conn.isInit = false
  conn.well = false
  global.stopped = 'close'

  switch (reason) {
    case DisconnectReason.badSession:
    case DisconnectReason.loggedOut:

      console.log(
        chalk.bold.redBright(
          `\n⚠︎ SESIÓN INVÁLIDA O CERRADA, BORRA LA CARPETA ${global.sessions} Y ESCANEA EL CÓDIGO QR ⚠︎`
        )
      )

      return

    case DisconnectReason.connectionClosed:

      console.log(
        chalk.bold.magentaBright(
          `\n⚠︎ CONEXIÓN CERRADA, REINICIANDO...`
        )
      )

      await global.autoReconnectV2()
      return

    case DisconnectReason.connectionLost:

      console.log(
        chalk.bold.blueBright(
          `\n⚠︎ CONEXIÓN PERDIDA, RECONECTANDO...`
        )
      )

      await global.autoReconnectV2()
      return

    case DisconnectReason.connectionReplaced:

      console.log(
        chalk.bold.yellowBright(
          `\n⚠︎ CONEXIÓN REEMPLAZADA, OTRA SESIÓN INICIADA`
        )
      )

      return

    case DisconnectReason.restartRequired:

      console.log(
        chalk.bold.cyanBright(
          `\n☑ REINICIANDO SESIÓN...`
        )
      )

      await global.autoReconnectV2()
      return

    case DisconnectReason.timedOut:

      console.log(
        chalk.bold.yellowBright(
          `\n⚠︎ TIEMPO AGOTADO, REINTENTANDO CONEXIÓN...`
        )
      )

      await global.autoReconnectV2()
      return

    default:

      console.log(
        chalk.bold.redBright(
          `\n⚠︎ DESCONEXIÓN DESCONOCIDA (${reason || 'Desconocido'})`
        )
      )

      await global.autoReconnectV2()
      return
  }
}

process.on(
  'uncaughtException',
  err => {
    console.error(
      chalk.red('[uncaughtException]'),
      err?.message || err
    )
  }
)

process.on(
  'unhandledRejection',
  err => {
    console.error(
      chalk.red('[unhandledRejection]'),
      err?.message || err
    )
  }
)

let isInit = true

let handler =
  await import('./handler.js')

global.reloadHandler =
  async function(restatConn) {

    try {
      const Handler =
        await import(
          `./handler.js?update=${Date.now()}`
        ).catch(console.error)

      if (
        Handler &&
        (Handler.handler ||
          Handler.default)
      ) {
        handler =
          Handler.default ||
          Handler
      }
    } catch (e) {
      console.error(e)
    }

    if (restatConn) {

      const oldConn = global.conn
      const oldChats = oldConn?.chats

      global.stopped = 'connecting'

      try {
        if (oldConn?.ev) {
          oldConn.ev.removeAllListeners(
            'messages.upsert'
          )

          oldConn.ev.removeAllListeners(
            'connection.update'
          )

          oldConn.ev.removeAllListeners(
            'creds.update'
          )
        }
      } catch {}

      try {
        if (oldConn?.ws) {
          oldConn.ws.close()
        }
      } catch {}

      await new Promise(
        resolve =>
          setTimeout(resolve, 500)
      )

      try {
        global.conn =
          makeWASocket(
            connectionOptions,
            oldChats
              ? {
                  chats: oldChats
                }
              : undefined
          )
      } catch (e) {

        global.stopped = 'close'

        console.error(
          chalk.bold.redBright(
            `✞ Error creando nueva conexión:`
          ),
          e?.message || e
        )

        return false
      }

      conn = global.conn

      conn.isInit = false
      conn.well = false

      isInit = true
    }

    if (!global.conn) {
      return false
    }

    if (!isInit) {
      try {
        global.conn.ev.off(
          'messages.upsert',
          global.conn.handler
        )

        global.conn.ev.off(
          'connection.update',
          global.conn.connectionUpdate
        )

        global.conn.ev.off(
          'creds.update',
          global.conn.credsUpdate
        )
      } catch {}
    }

    global.conn.handler =
      (handler.handler || handler)
        .bind(global.conn)

    global.conn.connectionUpdate =
      connectionUpdate.bind(global.conn)

    global.conn.credsUpdate =
      saveCreds.bind(global.conn)

    global.conn.ev.on(
      'messages.upsert',
      global.conn.handler
    )

    global.conn.ev.on(
      'connection.update',
      global.conn.connectionUpdate
    )

    global.conn.ev.on(
      'creds.update',
      global.conn.credsUpdate
    )

    isInit = false

    return true
  }

global.rutaJadiBot =
  join(
    __dirname,
    '../núcleo•clover/blackJadiBot'
  )

if (global.blackJadibts) {

  if (!existsSync(global.rutaJadiBot)) {

    mkdirSync(
      global.rutaJadiBot,
      {
        recursive: true
      }
    )

    console.log(
      chalk.bold.cyan(
        `La carpeta: ${global.sessions} se creó correctamente.`
      )
    )
  }

  const readRutaJadiBot =
    readdirSync(
      global.rutaJadiBot
    )

  if (readRutaJadiBot.length > 0) {

    const creds = 'creds.json'

    for (
      const gjbts of
      readRutaJadiBot
    ) {

      const botPath =
        join(
          global.rutaJadiBot,
          gjbts
        )

      const readBotPath =
        readdirSync(botPath)

      if (
        readBotPath.includes(creds)
      ) {
        blackJadiBot({
          pathblackJadiBot: botPath,
          m: null,
          conn,
          args: '',
          usedPrefix: '/',
          command: 'serbot'
        })
      }
    }
  }
}

const pluginFolder =
  global.__dirname(
    join(
      __dirname,
      '../plugins/index'
    )
  )

const pluginFilter =
  filename =>
    /\.js$/.test(filename)

global.plugins = {}

async function filesInit() {

  for (
    const filename of
    readdirSync(
      pluginFolder
    ).filter(pluginFilter)
  ) {

    try {

      const file =
        global.__filename(
          join(
            pluginFolder,
            filename
          )
        )

      const module =
        await import(file)

      global.plugins[filename] =
        module.default ||
        module

    } catch (e) {

      conn.logger.error(e)

      delete global.plugins[filename]
    }
  }
}

filesInit()
  .then(_ =>
    Object.keys(
      global.plugins
    )
  )
  .catch(console.error)

global.reload =
  async (_ev, filename) => {

    if (pluginFilter(filename)) {

      const dir =
        global.__filename(
          join(
            pluginFolder,
            filename
          ),
          true
        )

      if (
        filename in
        global.plugins
      ) {

        if (existsSync(dir)) {

          conn.logger.info(
            ` updated plugin - '${filename}'`
          )

        } else {

          conn.logger.warn(
            `deleted plugin - '${filename}'`
          )

          return delete global.plugins[
            filename
          ]
        }

      } else {

        conn.logger.info(
          `new plugin - '${filename}'`
        )
      }

      const err =
        syntaxerror(
          readFileSync(dir),
          filename,
          {
            sourceType: 'module',
            allowAwaitOutsideFunction: true
          }
        )

      if (err) {

        conn.logger.error(
          `syntax error while loading '${filename}'\n${format(err)}`
        )

      } else {

        try {

          const module =
            await import(
              `${global.__filename(dir)}?update=${Date.now()}`
            )

          global.plugins[filename] =
            module.default ||
            module

        } catch (e) {

          conn.logger.error(
            `error require plugin '${filename}\n${format(e)}'`
          )

        } finally {

          global.plugins =
            Object.fromEntries(
              Object.entries(
                global.plugins
              ).sort(
                ([a], [b]) =>
                  a.localeCompare(b)
              )
            )
        }
      }
    }
  }

Object.freeze(global.reload)

watch(
  pluginFolder,
  global.reload
)

await global.reloadHandler()

async function _quickTest() {

  const test =
    await Promise.all([
      spawn('ffmpeg'),
      spawn('ffprobe'),

      spawn(
        'ffmpeg',
        [
          '-hide_banner',
          '-loglevel',
          'error',
          '-filter_complex',
          'color',
          '-frames:v',
          '1',
          '-f',
          'webp',
          '-'
        ]
      ),

      spawn('convert'),
      spawn('magick'),
      spawn('gm'),

      spawn(
        'find',
        ['--version']
      )

    ].map(
      p =>
        Promise.race([

          new Promise(
            r =>
              p.on(
                'close',
                c =>
                  r(c !== 127)
              )
          ),

          new Promise(
            r =>
              p.on(
                'error',
                () =>
                  r(false)
              )
          ),

          new Promise(
            r =>
              setTimeout(
                () => {
                  try {
                    p.kill()
                  } catch {}

                  r(false)
                },
                5000
              )
          )

        ])
    ))

  const [
    ffmpeg,
    ffprobe,
    ffmpegWebp,
    convert,
    magick,
    gm,
    find
  ] = test

  Object.freeze(
    global.support = {
      ffmpeg,
      ffprobe,
      ffmpegWebp,
      convert,
      magick,
      gm,
      find
    }
  )
}

function clearTmp() {

  try {

    if (!existsSync(BOT_TMP)) {

      mkdirSync(
        BOT_TMP,
        {
          recursive: true
        }
      )

      return
    }

    const now =
      Date.now()

    for (
      const file of
      readdirSync(BOT_TMP)
    ) {

      const fullPath =
        join(
          BOT_TMP,
          file
        )

      try {

        const stats =
          statSync(
            fullPath
          )

        if (
          now -
            stats.mtimeMs <
          30 * 60 * 1000
        ) {
          continue
        }

        if (
          stats.isDirectory()
        ) {
          rmSync(
            fullPath,
            {
              recursive: true,
              force: true
            }
          )
        } else {
          unlinkSync(
            fullPath
          )
        }

      } catch {}
    }

  } catch {}
}

function purgeSession() {

  try {

    for (
      const file of
      readdirSync(
        `./${global.sessions}`
      ).filter(
        f =>
          f.startsWith(
            'pre-key-'
          )
      )
    ) {

      try {

        unlinkSync(
          `./${global.sessions}/${file}`
        )

      } catch {}
    }

  } catch {}
}

function purgeSessionSB() {

  try {

    for (
      const dir of
      readdirSync(
        global.rutaJadiBot
      )
    ) {

      const full =
        join(
          global.rutaJadiBot,
          dir
        )

      if (
        !statSync(full).isDirectory()
      ) {
        continue
      }

      for (
        const f of
        readdirSync(full).filter(
          x =>
            x.startsWith(
              'pre-key-'
            ) &&
            x !== 'creds.json'
        )
      ) {

        try {

          unlinkSync(
            join(
              full,
              f
            )
          )

        } catch {}
      }
    }

  } catch (e) {

    console.log(
      chalk.bold.red(
        `Error eliminando pre-keys de SB:\n${e}`
      )
    )
  }
}

function purgeBadMAC() {

  try {

    const dir =
      `./${global.sessions}`

    if (!existsSync(dir)) {
      return
    }

    for (
      const file of
      readdirSync(dir)
    ) {

      if (
        file.startsWith(
          'sender-key-'
        ) ||
        file.startsWith(
          'session-'
        )
      ) {

        try {

          unlinkSync(
            join(
              dir,
              file
            )
          )

        } catch {}
      }
    }

  } catch {}
}

function interceptBadMAC() {

  const originalError =
    console.error

  const originalLog =
    console.log

  const handle =
    (...args) => {

      const txt =
        args.join(' ')

      if (
        txt.includes('Bad MAC') ||
        txt.includes('Failed to decrypt') ||
        txt.includes('Session error') ||
        txt.includes(
          'decrypt message with any known session'
        )
      ) {

        try {
          purgeBadMAC()
        } catch {}
      }
    }

  console.error =
    function(...args) {

      handle(...args)

      return originalError.apply(
        this,
        args
      )
    }

  console.log =
    function(...args) {

      handle(...args)

      return originalLog.apply(
        this,
        args
      )
    }
}

interceptBadMAC()

global.backupcreds =
  async function() {

    const backupPath =
      join(
        process.cwd(),
        'backup_creds'
      )

    if (!existsSync(backupPath)) {

      mkdirSync(
        backupPath,
        {
          recursive: true
        }
      )
    }

    const credsPath =
      `./${global.sessions}/creds.json`

    if (!existsSync(credsPath)) {
      return false
    }

    const ts =
      Date.now()

    fs.copyFileSync(
      credsPath,
      join(
        backupPath,
        `creds_${ts}.json`
      )
    )

    console.log(
      chalk.greenBright(
        `Backup creado: creds_${ts}.json`
      )
    )

    return true
  }

global.clearsubs =
  function() {

    try {

      rmSync(
        global.rutaJadiBot,
        {
          recursive: true,
          force: true
        }
      )

      mkdirSync(
        global.rutaJadiBot,
        {
          recursive: true
        }
      )

      console.log(
        chalk.greenBright(
          `Todos los Sub-Bots eliminados`
        )
      )

      return true

    } catch {

      return false
    }
  }

global.pingbot =
  function() {

    return {
      ping:
        Date.now() -
        global.timestamp.start,

      uptime:
        process.uptime() *
        1000
    }
  }

global.autoReconnectV2 =
  async function() {

    if (
      global.stopped === 'open' &&
      global.conn?.user
    ) {
      return true
    }

    if (global.reconnecting) {
      return false
    }

    if (
      global.reconnectAttempts >= 5
    ) {
      global.reconnectAttempts = 0
    }

    global.reconnecting = true
    global.reconnectAttempts++

    try {

      await new Promise(
        resolve =>
          setTimeout(
            resolve,
            3000 *
            global.reconnectAttempts
          )
      )

      if (
        global.stopped === 'open' &&
        global.conn?.user
      ) {
        return true
      }

      return await withTimeout(
        global.reloadHandler(true),
        30000,
        'reloadHandler timeout'
      )

    } catch (e) {

      console.error(
        chalk.bold.redBright(
          `✞ Error durante la reconexión:`
        ),
        e?.message || e
      )

      return false

    } finally {

      global.reconnecting = false
    }
  }

let isCleaning = false

async function runCleanup(task) {

  if (
    global.stopped === true ||
    global.stopped === 'close' ||
    global.stopped === 'connecting' ||
    !global.conn?.user ||
    isCleaning
  ) {
    return
  }

  isCleaning = true

  try {

    await safeRun(
      task(),
      15000
    )

  } catch (e) {

    console.error(e)

  } finally {

    isCleaning = false
  }
}

setInterval(
  () => runCleanup(clearTmp),
  600000
)

setInterval(
  () => runCleanup(purgeSession),
  1800000
)

setInterval(
  () => runCleanup(purgeSessionSB),
  1800000
)

setInterval(
  () => runCleanup(purgeBadMAC),
  60000
)

_quickTest()
  .then(() =>
    conn.logger.info(
      chalk.bold(`✞ H E C H O`)
    )
  )
  .catch(console.error)

global.healthcheck =
  function() {

    const mem =
      process.memoryUsage()

    const subs =
      global.conns?.filter(
        c =>
          c.user &&
          c.ws?.socket?.readyState !==
          ws.CLOSED
      ).length || 0

    const s =
      Math.floor(
        process.uptime()
      )

    const h =
      String(
        Math.floor(
          s / 3600
        )
      ).padStart(2, '0')

    const m =
      String(
        Math.floor(
          (s % 3600) / 60
        )
      ).padStart(2, '0')

    const sec =
      String(
        s % 60
      ).padStart(2, '0')

    return {
      ram:
        `${(
          mem.rss /
          1024 /
          1024
        ).toFixed(2)} MB`,

      heap:
        `${(
          mem.heapUsed /
          1024 /
          1024
        ).toFixed(2)} MB`,

      uptime:
        `${h}:${m}:${sec}`,

      subbots:
        subs,

      tmp:
        BOT_TMP,

      status:
        global.conn?.user
          ? 'online'
          : 'offline'
    }
  }