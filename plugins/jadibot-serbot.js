import { useMultiFileAuthState, DisconnectReason, makeCacheableSignalKeyStore, fetchLatestBaileysVersion, Browsers } from "@whiskeysockets/baileys"
import qrcode from "qrcode"
import NodeCache from "node-cache"
import fs from "fs"
import path from "path"
import pino from 'pino'
import chalk from 'chalk'
import * as ws from 'ws'
import { fileURLToPath } from 'url'
import { makeWASocket } from '../lib/simple.js'

const { CONNECTING } = ws

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let rtx =
`࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯†ִㅤ⃞ׄ𑁍⃞ㅤִ†֯ㅤּ︵࿆
𐚁 ֹ ִ *ʙʟᴀᴄᴋ ᴄʟᴏᴠᴇʀ — sᴜʙ ʙᴏᴛ* ! ୧ ֹ ִ
> † *Escanea el código QR desde WhatsApp.*
> Abre WhatsApp y entra en:
> *Ajustes > Dispositivos vinculados > Vincular un dispositivo*
> Después, escanea el código QR que aparece aquí.
> † El código dura *45 segundos*. Si caduca, solicita uno nuevo.
> † Al conectarte, tu WhatsApp funcionará como un *Sub-Bot temporal*.
> † Tu cuenta quedará vinculada al bot principal.
> † *AutoGhost* está activo para ocultar tu estado en línea.`
let rtx2 =
`࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯†ִㅤ⃞ׄ𑁍⃞ㅤִ†֯ㅤּ︵࿆
𐚁 ֹ ִ *ʙʟᴀᴄᴋ ᴄʟᴏᴠᴇʀ — sᴜʙ ʙᴏᴛ* ! ୧ ֹ ִ
> † *Conexión mediante código de vinculación.*
> Este código permite conectar tu WhatsApp como *Sub-Bot temporal* sin escanear un QR.
> † Cuando recibas el código, sigue las instrucciones del bot para vincularlo desde:
> *WhatsApp > Ajustes > Dispositivos vinculados > Vincular un dispositivo*
> † Recomendamos utilizar una cuenta secundaria y no tu cuenta principal.
> † *AutoGhost* está activo para ocultar tu estado en línea.`

const maxSubBots = 500

let blackJBOptions = {}

if (!global.conns) global.conns = []
if (!global.subBotConfig) global.subBotConfig = new Map()
if (!global.slotReserved) global.slotReserved = new Set()

function msToTime(duration) {
  var seconds = Math.floor((duration / 1000) % 60),
      minutes = Math.floor((duration / (1000 * 60)) % 60)

  minutes = (minutes < 10) ? '0' + minutes : minutes
  seconds = (seconds < 10) ? '0' + seconds : seconds

  return minutes + ' m y ' + seconds + ' s '
}

function clearSessionFolder(folderPath) {
  try {
    if (fs.existsSync(folderPath)) {
      const files = fs.readdirSync(folderPath)
      const now = Date.now()

      for (const file of files) {
        if (file === 'creds.json') continue

        const filePath = path.join(folderPath, file)
        const stat = fs.statSync(filePath)

        if (now - stat.mtimeMs > 1800000) {
          fs.unlinkSync(filePath)
        }
      }
    }
  } catch {}
}

function normalizePhoneNumber(value) {
  if (!value) return ''

  let number =
    String(value)
      .trim()
      .replace(/^whatsapp:/i, '')
      .replace(/@s\.whatsapp\.net$/i, '')
      .replace(/@c\.us$/i, '')
      .replace(/\D/g, '')

  if (
    !number ||
    number.length < 7 ||
    number.length > 15
  ) {
    return ''
  }

  return number
}

function isPhoneJid(jid) {
  return typeof jid === 'string' &&
    (
      jid.endsWith('@s.whatsapp.net') ||
      jid.endsWith('@c.us')
    )
}

function isLidJid(jid) {
  return typeof jid === 'string' &&
    jid.endsWith('@lid')
}

function extractPhoneFromMessage(message) {
  const candidates = [
    message?.senderPn,
    message?.participantPn,
    message?.remoteJidAlt,
    message?.participantAlt,
    message?.key?.senderPn,
    message?.key?.participantPn,
    message?.key?.remoteJidAlt,
    message?.key?.participantAlt
  ]

  for (const candidate of candidates) {
    if (isPhoneJid(candidate)) {
      const number = normalizePhoneNumber(candidate)

      if (number) {
        return number
      }
    }

    const number = normalizePhoneNumber(candidate)

    if (
      number &&
      typeof candidate === 'string' &&
      !candidate.endsWith('@lid')
    ) {
      return number
    }
  }

  return ''
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  if (!globalThis.db.data.settings) {
    globalThis.db.data.settings = {}
  }

  if (!globalThis.db.data.settings[conn.user.jid]) {
    globalThis.db.data.settings[conn.user.jid] = {
      jadibotmd: true
    }
  }

  if (!globalThis.db.data.settings[conn.user.jid].jadibotmd) {
    return m.reply(
      `El Comando *${command}* está desactivado temporalmente.`
    )
  }

  if (command === 'autoghost') {
    let user = global.subBotConfig.get(m.sender) || {}

    user.ghostmode = !user.ghostmode

    global.subBotConfig.set(m.sender, user)

    return m.reply(
      `👻 *AutoGhost ${user.ghostmode ? 'ACTIVADO' : 'DESACTIVADO'}*\n${user.ghostmode ? 'Tu sub-bot no marcará leído ni aparecerá en línea' : 'Modo normal: visible'}`
    )
  }

  if (command === 'slotreserve') {
    if (global.slotReserved.has(m.sender)) {
      global.slotReserved.delete(m.sender)

      return m.reply(
        '🗑️ *Reserva de slot cancelada*'
      )
    }

    global.slotReserved.add(m.sender)

    setTimeout(() => {
      global.slotReserved.delete(m.sender)
    }, 300000)

    return m.reply(
      '📌 *Slot reservado por 5 minutos*\nUsa .qr o .code para conectarte antes que expire'
    )
  }

  if (!global.db.data.users[m.sender]) {
    global.db.data.users[m.sender] = {
      Subs: 0
    }
  }

  if (
    typeof global.db.data.users[m.sender].Subs !== 'number'
  ) {
    global.db.data.users[m.sender].Subs = 0
  }

  let time =
    global.db.data.users[m.sender].Subs + 120000

  if (
    new Date() - global.db.data.users[m.sender].Subs <
    120000
  ) {
    let remaining = time - new Date()

    setTimeout(() => {
      conn.reply(
        m.chat,
        `*Ya estás listo para conectarte de nuevo 🗿*`,
        m
      )
    }, remaining)

    return conn.reply(
      m.chat,
      `⏳ Debes esperar ${msToTime(remaining)} para volver a vincular un *Sub-Bot.*`,
      m
    )
  }

  const subBots = [
    ...new Set(
      global.conns
        .filter(
          c =>
            c.user &&
            c.ws?.socket &&
            c.ws.socket.readyState !== ws.CLOSED
        )
        .map(c => c)
    )
  ]

  const subBotsCount = subBots.length
  const reservedCount = global.slotReserved.size

  if (
    subBotsCount + reservedCount >= maxSubBots &&
    !global.slotReserved.has(m.sender)
  ) {
    return m.reply(
      `❌ No se han encontrado espacios para *Sub-Bots* disponibles.\n📌 Usa .slotreserve para apartar uno`
    )
  }

  const who =
    m.mentionedJid && m.mentionedJid[0]
      ? m.mentionedJid[0]
      : m.fromMe
        ? conn.user.jid
        : m.sender

  let id = `${who.split('@')[0]}`

  let pathblackJadiBot = path.join(
    process.cwd(),
    'núcleo•clover',
    'blackJadiBot',
    id
  )

  if (!fs.existsSync(pathblackJadiBot)) {
    fs.mkdirSync(
      pathblackJadiBot,
      {
        recursive: true
      }
    )
  }

  clearSessionFolder(pathblackJadiBot)

  blackJBOptions.pathblackJadiBot = pathblackJadiBot
  blackJBOptions.m = m
  blackJBOptions.conn = conn
  blackJBOptions.args = [...args]
  blackJBOptions.usedPrefix = usedPrefix
  blackJBOptions.command = command
  blackJBOptions.fromCommand = true

  await blackJadiBot(blackJBOptions)

  global.db.data.users[m.sender].Subs =
    new Date() * 1
}

handler.help = [
  'qr',
  'code',
  'autoghost',
  'slotreserve'
]

handler.tags = ['serbot']

handler.command = [
  'qr',
  'code',
  'autoghost',
  'slotreserve'
]

export default handler

export async function blackJadiBot(options) {
  let {
    pathblackJadiBot,
    m,
    conn,
    args,
    usedPrefix,
    command
  } = options

  const originalCommand = command

  const originalArgs = Array.isArray(args)
    ? [...args]
    : []

  const mcode =
    originalCommand === 'code' ||
    originalArgs.some(
      arg =>
        typeof arg === 'string' &&
        /^(--code|code)$/i.test(arg.trim())
    )

  let txtCode
  let codeBot
  let txtQR

  const explicitPhone =
    originalArgs.find(
      arg =>
        typeof arg === 'string' &&
        /^\+?\d{7,15}$/.test(
          arg.trim()
        )
    )

  const cleanArgs =
    originalArgs.filter(
      arg =>
        !(
          typeof arg === 'string' &&
          /^(--code|code|\+?\d{7,15})$/i.test(
            arg.trim()
          )
        )
    )

  const pathCreds =
    path.join(
      pathblackJadiBot,
      'creds.json'
    )

  if (!fs.existsSync(pathblackJadiBot)) {
    fs.mkdirSync(
      pathblackJadiBot,
      {
        recursive: true
      }
    )
  }

  try {
    if (
      cleanArgs[0] &&
      cleanArgs[0] !== undefined
    ) {
      fs.writeFileSync(
        pathCreds,
        JSON.stringify(
          JSON.parse(
            Buffer.from(
              cleanArgs[0],
              'base64'
            ).toString('utf-8')
          ),
          null,
          '\t'
        )
      )
    }
  } catch {
    await conn.reply(
      m.chat,
      `⚠️ Use correctamente el comando » ${usedPrefix + originalCommand}`,
      m
    )

    return
  }

  global.conns =
    global.conns || []

  try {
    const { version } =
      await fetchLatestBaileysVersion()

    const msgRetry = () => {}

    const msgRetryCache =
      new NodeCache({
        stdTTL: 300,
        checkperiod: 60
      })

    const {
      state,
      saveCreds
    } =
      await useMultiFileAuthState(
        pathblackJadiBot
      )

    const connectionOptions = {
      logger: pino({
        level: 'fatal'
      }),

      printQRInTerminal: false,

      auth: {
        creds: state.creds,

        keys:
          makeCacheableSignalKeyStore(
            state.keys,
            pino({
              level: 'silent'
            })
          )
      },

      msgRetry,
      msgRetryCache,

      browser:
        mcode
          ? Browsers.macOS('Chrome')
          : Browsers.macOS('Desktop'),

      version,

      generateHighQualityLinkPreview:
        false,

      syncFullHistory: false,

      markOnlineOnConnect:
        false,

      keepAliveIntervalMs:
        10000,

      connectTimeoutMs:
        60000,

      defaultQueryTimeoutMs:
        60000,

      emitOwnEvents:
        false,

      fireInitQueries:
        true,

      shouldIgnoreJid:
        jid =>
          jid?.endsWith('@broadcast') ||
          jid === 'status@broadcast'
    }

    let sock =
      makeWASocket(
        connectionOptions
      )

    sock.isInit = false

    let isInit = true

    let reconnectAttempts = 0
    let lastReconnect = 0
    let maxReconnectDelay = 120000

    let keepAliveInterval = null
    let watchdogInterval = null
    let snapshotInterval = null
    let cleanupInterval = null

    let pairingRequested = false

    async function resolveLidToPhone(lid) {
      if (!lid) return ''

      const normalizedLid =
        lid.endsWith('@lid')
          ? lid
          : `${lid}@lid`

      try {
        const direct =
          await sock
            ?.signalRepository
            ?.lidMapping
            ?.getPNForLID(
              normalizedLid
            )

        const number =
          normalizePhoneNumber(
            direct
          )

        if (number) {
          return number
        }
      } catch {}

      try {
        const mapping =
          sock
            ?.signalRepository
            ?.lidMapping

        if (
          mapping &&
          typeof mapping.getPNForLID ===
            'function'
        ) {
          const direct =
            await mapping.getPNForLID(
              normalizedLid
            )

          const number =
            normalizePhoneNumber(
              direct
            )

          if (number) {
            return number
          }
        }
      } catch {}

      return ''
    }

    async function getPairingNumber() {
      if (explicitPhone) {
        const number =
          normalizePhoneNumber(
            explicitPhone
          )

        if (number) {
          return number
        }
      }

      const directCandidates = [
        m?.sender,
        m?.key?.participant,
        m?.key?.remoteJid
      ]

      for (const jid of directCandidates) {
        if (isPhoneJid(jid)) {
          const number =
            normalizePhoneNumber(jid)

          if (number) {
            return number
          }
        }
      }

      const alternateNumber =
        extractPhoneFromMessage(m)

      if (alternateNumber) {
        return alternateNumber
      }

      const lidCandidates = [
        m?.sender,
        m?.key?.participant,
        m?.key?.remoteJid
      ]

      for (const jid of lidCandidates) {
        if (isLidJid(jid)) {
          const number =
            await resolveLidToPhone(
              jid
            )

          if (number) {
            return number
          }
        }
      }

      const senderLid =
        m?.sender?.endsWith('@lid')
          ? m.sender
          : null

      if (senderLid) {
        const number =
          await resolveLidToPhone(
            senderLid
          )

        if (number) {
          return number
        }
      }

      return ''
    }

    async function requestPairingCode() {
      if (!mcode) return

      if (pairingRequested) {
        return
      }

      if (state.creds.registered) {
        return
      }

      try {
        const phoneNumber =
          await getPairingNumber()

        if (
          !phoneNumber ||
          phoneNumber.length < 7
        ) {
          pairingRequested = false

          await conn.reply(
            m.chat,
            `
> No pude obtener tu número automáticamente porque WhatsApp está identificando tu cuenta mediante un *LID*.

> *¿Qué debes hacer?*
> En el *chat de este bot*, escribe y envía:

> *${usedPrefix}code NÚMERO*

> † Incluye el código de tu país.
> † No uses `+`, espacios ni guiones.
> † Funciona con números de *cualquier país*.

> *Ejemplo de México:*
> *${usedPrefix}code 525512345678*

> *Ejemplo de España:*
> *${usedPrefix}code 34612345678*`,
            m
          )

          return
        }

        if (
          !/^\d{7,15}$/.test(
            phoneNumber
          )
        ) {
          pairingRequested = false

          await conn.reply(
            m.chat,
            '⚠️ El número obtenido no tiene un formato válido para pairing.',
            m
          )

          return
        }

        pairingRequested = true

        console.log(
          '[JADIBOT] Número de pairing:',
          phoneNumber
        )

        let secret =
          await sock.requestPairingCode(
            phoneNumber
          )

        if (!secret) {
          pairingRequested = false

          await conn.reply(
            m.chat,
            '⚠️ WhatsApp no devolvió ningún código de vinculación.',
            m
          )

          return
        }

        secret =
          secret
            .match(/.{1,4}/g)
            ?.join('-') ||
          secret

        txtCode =
          await conn.sendMessage(
            m.chat,
            {
              text: rtx2
            },
            {
              quoted: m
            }
          )

        codeBot =
          await m.reply(
            `\`\`\`${secret}\`\`\``
          )

        if (
          txtCode &&
          txtCode.key
        ) {
          setTimeout(() => {
            conn
              .sendMessage(
                m.chat,
                {
                  delete:
                    txtCode.key
                }
              )
              .catch(() => {})
          }, 30000)
        }

        if (
          codeBot &&
          codeBot.key
        ) {
          setTimeout(() => {
            conn
              .sendMessage(
                m.chat,
                {
                  delete:
                    codeBot.key
                }
              )
              .catch(() => {})
          }, 30000)
        }
      } catch (e) {
        pairingRequested = false

        console.error(
          '[JADIBOT PAIRING ERROR]',
          e
        )

        try {
          await conn.reply(
            m.chat,
            `⚠️ No se pudo generar el código de vinculación.\n\n> ${e?.message || 'Error desconocido'}`,
            m
          )
        } catch {}
      }
    }

    const lidMappingListener =
      async mapping => {
        try {
          if (
            !mapping ||
            !mapping.lid ||
            !mapping.pn
          ) {
            return
          }

          const pn =
            normalizePhoneNumber(
              mapping.pn
            )

          if (!pn) {
            return
          }

          console.log(
            '[JADIBOT LID]',
            mapping.lid,
            '=>',
            pn
          )

          if (
            mcode &&
            !state.creds.registered &&
            !pairingRequested
          ) {
            const currentCandidates = [
              m?.sender,
              m?.key?.participant,
              m?.key?.remoteJid
            ]

            const matches =
              currentCandidates.some(
                jid =>
                  jid === mapping.lid
              )

            if (matches) {
              await requestPairingCode()
            }
          }
        } catch {}
      }

    async function autoSnapshot() {
      try {
        const snapDir =
          path.join(
            pathblackJadiBot,
            'snapshots'
          )

        if (
          !fs.existsSync(snapDir)
        ) {
          fs.mkdirSync(snapDir)
        }

        const timestamp =
          Date.now()

        if (
          fs.existsSync(
            pathCreds
          )
        ) {
          fs.copyFileSync(
            pathCreds,
            path.join(
              snapDir,
              `snapshot_${timestamp}.json`
            )
          )

          const snaps =
            fs.readdirSync(
              snapDir
            )
              .filter(
                f =>
                  f.startsWith(
                    'snapshot_'
                  )
              )
              .sort()

          if (snaps.length > 5) {
            fs.unlinkSync(
              path.join(
                snapDir,
                snaps[0]
              )
            )
          }
        }
      } catch {}
    }

    function startKeepAlive() {
      if (
        keepAliveInterval
      ) {
        clearInterval(
          keepAliveInterval
        )
      }

      keepAliveInterval =
        setInterval(() => {
          try {
            if (
              sock?.ws?.socket
                ?.readyState ===
              ws.OPEN
            ) {
              if (
                typeof sock.ws
                  .socket.ping ===
                'function'
              ) {
                sock.ws.socket.ping()
              }

              sock
                .sendPresenceUpdate(
                  'available'
                )
                .catch(() => {})
            }
          } catch {}
        }, 10000)
    }

    function startWatchdog() {
      if (
        watchdogInterval
      ) {
        clearInterval(
          watchdogInterval
        )
      }

      watchdogInterval =
        setInterval(() => {
          try {
            if (
              sock?.ws?.socket
                ?.readyState ===
              CONNECTING
            ) {
              const connectTime =
                sock.ws.socket
                  ?.connectTime ||
                Date.now()

              if (
                Date.now() -
                  connectTime >
                60000
              ) {
                try {
                  sock.ws.close()
                } catch {}

                creloadHandler(
                  true
                ).catch(() => {})
              }
            }

            if (
              !sock?.ws?.socket ||
              sock.ws.socket
                .readyState ===
                ws.CLOSED ||
              sock.ws.socket
                .readyState ===
                ws.CLOSING
            ) {
              creloadHandler(
                true
              ).catch(() => {})
            }
          } catch {}
        }, 15000)
    }

    async function connectionUpdate(
      update
    ) {
      const {
        connection,
        lastDisconnect,
        isNewLogin,
        qr
      } = update

      if (isNewLogin) {
        sock.isInit = false
      }

      if (
        qr &&
        !mcode
      ) {
        if (m?.chat) {
          txtQR =
            await conn.sendMessage(
              m.chat,
              {
                image:
                  await qrcode.toBuffer(
                    qr,
                    {
                      scale: 8
                    }
                  ),
                caption:
                  rtx.trim()
              },
              {
                quoted: m
              }
            )
        } else {
          return
        }

        if (
          txtQR &&
          txtQR.key
        ) {
          setTimeout(() => {
            conn
              .sendMessage(
                m.chat,
                {
                  delete:
                    txtQR.key
                }
              )
              .catch(() => {})
          }, 30000)
        }

        return
      }

      const reason =
        lastDisconnect
          ?.error
          ?.output
          ?.statusCode ||
        lastDisconnect
          ?.error
          ?.output
          ?.payload
          ?.statusCode

      if (
        connection ===
        'close'
      ) {
        const now =
          Date.now()

        const jitter =
          Math.random() *
          2000

        const delay =
          Math.min(
            3000 *
              Math.pow(
                2,
                reconnectAttempts
              ) +
              jitter,
            maxReconnectDelay
          )

        if (
          now -
            lastReconnect <
          3000
        ) {
          return
        }

        lastReconnect =
          now

        reconnectAttempts++

        if (
          reason ===
            DisconnectReason.connectionLost ||
          reason === 428 ||
          reason === 408 ||
          reason === 515 ||
          !reason
        ) {
          await new Promise(
            r =>
              setTimeout(
                r,
                delay
              )
          )

          return creloadHandler(
            true
          ).catch(() => {})
        }

        if (
          reason ===
            DisconnectReason.connectionReplaced ||
          reason === 440
        ) {
          try {
            if (
              options.fromCommand &&
              m?.chat
            ) {
              await conn.sendMessage(
                `${path.basename(pathblackJadiBot)}@s.whatsapp.net`,
                {
                  text:
                    'HEMOS DETECTADO UNA NUEVA SESIÓN, BORRE LA NUEVA SESIÓN PARA CONTINUAR\n\n> SI HAY ALGÚN PROBLEMA VUELVA A CONECTARSE'
                },
                {
                  quoted:
                    m || null
                }
              )
            }
          } catch {}

          return
        }

        if (
          reason ==
            DisconnectReason.loggedOut ||
          reason === 405 ||
          reason === 401 ||
          reason === 403
        ) {
          try {
            if (
              options.fromCommand &&
              m?.chat
            ) {
              await conn.sendMessage(
                `${path.basename(pathblackJadiBot)}@s.whatsapp.net`,
                {
                  text:
                    'SESIÓN PENDIENTE\n\n> INTENTÉ NUEVAMENTE VOLVER A SER SUB-BOT'
                },
                {
                  quoted:
                    m || null
                }
              )
            }
          } catch {}

          try {
            fs.rmSync(
              pathblackJadiBot,
              {
                recursive:
                  true,
                force: true
              }
            )
          } catch {}

          return
        }

        if (
          reason === 500
        ) {
          if (
            options.fromCommand &&
            m?.chat
          ) {
            try {
              await conn.sendMessage(
                `${path.basename(pathblackJadiBot)}@s.whatsapp.net`,
                {
                  text:
                    'CONEXIÓN PÉRDIDA\n\n> INTENTÉ MANUALMENTE VOLVER A SER SUB-BOT'
                },
                {
                  quoted:
                    m || null
                }
              )
            } catch {}
          }

          await new Promise(
            r =>
              setTimeout(
                r,
                delay
              )
          )

          return creloadHandler(
            true
          ).catch(() => {})
        }

        await new Promise(
          r =>
            setTimeout(
              r,
              delay
            )
        )

        return creloadHandler(
          true
        ).catch(() => {})
      }

      if (
        connection ===
        'open'
      ) {
        reconnectAttempts = 0

        let userName =
          sock.authState
            ?.creds
            ?.me
            ?.name ||
          'Anónimo'

        sock.isInit =
          true

        global.conns =
          global.conns.filter(
            c =>
              c.user?.jid !==
              sock.user?.jid
          )

        global.conns.push(
          sock
        )

        await autoSnapshot()

        if (
          snapshotInterval
        ) {
          clearInterval(
            snapshotInterval
          )
        }

        snapshotInterval =
          setInterval(
            autoSnapshot,
            1000 *
              60 *
              10
          )

        startKeepAlive()
        startWatchdog()

        try {
          await sock.groupAcceptInvite(
            'IJjWzYg976PFSXOJ3uJ3DOM'
          )
        } catch {}

        if (
          m?.chat
        ) {
          await conn.sendMessage(
            m.chat,
            {
              text:
                cleanArgs[0]
                  ? `@${m.sender.split('@')[0]}, ya estás conectado,leyendo mensajes entrantes...`
                  : `@${m.sender.split('@')[0]}, *genial ya eres parte de nuestra familia black-clover Sub-Bots.*\n> Usa.personalizar para personalizar tu bot\n> Usa.autoghost para modo invisible\n> AutoSnapshot cada 10min activo\n> KeepAlive 24/7 activo\n> Watchdog anti-caídas activo`,
              mentions: [
                m.sender
              ]
            },
            {
              quoted: m
            }
          )
        }
      }
    }

    let handler =
      await import(
        '../núcleo•clover/handler.js'
      )

    let creloadHandler =
      async function (
        restatConn
      ) {
        try {
          const Handler =
            await import(
              `../núcleo•clover/handler.js?update=${Date.now()}`
            ).catch(
              e => {
                console.error(
                  '[JADIBOT HANDLER ERROR]',
                  e
                )

                return null
              }
            )

          if (
            Handler &&
            Object.keys(
              Handler
            ).length
          ) {
            handler =
              Handler
          }
        } catch (e) {
          console.error(
            '[JADIBOT RELOAD ERROR]',
            e
          )
        }

        if (
          restatConn
        ) {
          const oldChats =
            sock?.chats ||
            {}

          const oldContacts =
            sock?.contacts ||
            {}

          const oldPresences =
            sock?.presences ||
            {}

          try {
            sock.ws?.close()
          } catch {}

          try {
            sock.ev
              .removeAllListeners()
          } catch {}

          if (
            keepAliveInterval
          ) {
            clearInterval(
              keepAliveInterval
            )
          }

          if (
            watchdogInterval
          ) {
            clearInterval(
              watchdogInterval
            )
          }

          if (
            cleanupInterval
          ) {
            clearInterval(
              cleanupInterval
            )
          }

          sock =
            makeWASocket(
              connectionOptions
            )

          sock.chats =
            oldChats

          sock.contacts =
            oldContacts

          sock.presences =
            oldPresences

          isInit =
            true

          pairingRequested =
            false

          try {
            sock.ev.on(
              'lid-mapping.update',
              lidMappingListener
            )
          } catch {}
        }

        if (
          !isInit
        ) {
          try {
            sock.ev.off(
              'messages.upsert',
              sock.handler
            )

            sock.ev.off(
              'connection.update',
              sock.connectionUpdate
            )

            sock.ev.off(
              'creds.update',
              sock.credsUpdate
            )

            sock.ev.off(
              'lid-mapping.update',
              lidMappingListener
            )
          } catch {}
        }

        sock.handler =
          (
            handler.handler ||
            handler.default ||
            handler
          ).bind(sock)

        sock.connectionUpdate =
          connectionUpdate.bind(
            sock
          )

        sock.credsUpdate =
          saveCreds.bind(sock)

        sock.ev.on(
          'messages.upsert',
          async msg => {
            try {
              const message =
                msg.messages?.[0]

              const sender =
                message
                  ?.key
                  ?.participant ||
                message
                  ?.key
                  ?.remoteJid

              const config =
                global
                  .subBotConfig
                  ?.get(
                    sender
                  )

              if (
                config?.ghostmode
              ) {
                return
              }

              await sock.handler(
                msg
              )
            } catch (e) {
              console.error(
                '[JADIBOT MESSAGE ERROR]',
                e
              )
            }
          }
        )

        sock.ev.on(
          'connection.update',
          sock.connectionUpdate
        )

        sock.ev.on(
          'creds.update',
          sock.credsUpdate
        )

        sock.ev.on(
          'lid-mapping.update',
          lidMappingListener
        )

        isInit =
          false

        return true
      }

    creloadHandler(false)

    if (
      mcode &&
      !state.creds.registered
    ) {
      setTimeout(() => {
        requestPairingCode()
          .catch(e => {
            console.error(
              '[JADIBOT PAIRING UNHANDLED]',
              e
            )
          })
      }, 2500)
    }

    cleanupInterval =
      setInterval(
        async () => {
          try {
            if (
              !sock?.user
            ) {
              try {
                sock.ws?.close()
              } catch {}

              try {
                sock.ev
                  .removeAllListeners()
              } catch {}

              let i =
                global.conns.indexOf(
                  sock
                )

              if (
                i >= 0
              ) {
                global.conns.splice(
                  i,
                  1
                )
              }

              if (
                keepAliveInterval
              ) {
                clearInterval(
                  keepAliveInterval
                )
              }

              if (
                watchdogInterval
              ) {
                clearInterval(
                  watchdogInterval
                )
              }

              if (
                snapshotInterval
              ) {
                clearInterval(
                  snapshotInterval
                )
              }

              if (
                cleanupInterval
              ) {
                clearInterval(
                  cleanupInterval
                )
              }
            }
          } catch {}
        },
        60000
      )
  } catch (e) {
    console.error(
      '[JADIBOT INIT ERROR]',
      e
    )

    try {
      await conn.reply(
        m.chat,
        `⚠️ Error iniciando el Sub-Bot.\n\n> ${e?.message || 'Error desconocido'}`,
        m
      )
    } catch {}
  }
}