import { smsg } from '../lib/simple.js'
import { fileURLToPath } from 'url'
import path, { join } from 'path'
import { unwatchFile, watchFile } from 'fs'
import chalk from 'chalk'

const opts = global.opts || {}

const isNumber = value =>
  typeof value === 'number' && Number.isFinite(value)

const withTimeout = async (task, ms, label = 'timeout') => {
  let timer

  try {
    const promise =
      typeof task === 'function'
        ? task()
        : task

    return await Promise.race([
      Promise.resolve(promise),
      new Promise((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(label)),
          ms
        )
      })
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

const safeRun = async (task, ms) => {
  try {
    return await withTimeout(task, ms)
  } catch (error) {
    const message =
      String(error?.message || '').toLowerCase()

    if (message.includes('timeout')) {
      console.error(
        chalk.yellow(`[TIMEOUT] ${ms}ms`)
      )
      return undefined
    }

    console.error(
      chalk.red('[SAFE RUN ERROR]'),
      error
    )

    return undefined
  }
}

const jidCache = new Map()
const metadataCache = new Map()
const metadataInflight = new Map()

const JID_TTL_DM = 7 * 24 * 60 * 60_000
const JID_TTL_GROUP = 24 * 60 * 60_000
const META_TTL = 24 * 60 * 60_000
const MAX_JID_CACHE = 1000
const MAX_META_CACHE = 300

const normalizeNumber = value => {
  if (!value) return ''

  return String(value)
    .split('@')[0]
    .split(':')[0]
    .replace(/\D/g, '')
}

const normalizeJid = value => {
  if (!value) return ''

  const string = String(value).trim()

  if (string.endsWith('@s.whatsapp.net')) {
    const number = normalizeNumber(string)

    return number
      ? `${number}@s.whatsapp.net`
      : ''
  }

  if (string.endsWith('@lid')) {
    return string
  }

  const number = normalizeNumber(string)

  return number
    ? `${number}@s.whatsapp.net`
    : ''
}

const isRealJid = jid =>
  /^\d+@s\.whatsapp\.net$/.test(
    String(jid || '')
  )

const isLid = jid =>
  String(jid || '').endsWith('@lid')

const isGroupJid = jid =>
  String(jid || '').endsWith('@g.us')

const getRawOwner = value => {
  if (Array.isArray(value)) {
    return String(value[0] || '')
  }

  if (value && typeof value === 'object') {
    return String(
      value.id ||
      value.jid ||
      value.number ||
      value.phone ||
      value.phoneNumber ||
      ''
    )
  }

  return String(value || '')
}

const getIds = jid => {
  if (!jid) return []

  const values = [
    jid,
    jid?.id,
    jid?.jid,
    jid?.lid,
    jid?.participant,
    jid?.participantAlt,
    jid?.senderPn,
    jid?.senderPnAlt,
    jid?.phoneNumber,
    jid?.pn,
    jid?.phone,
    jid?.remoteJid,
    jid?.remoteJidAlt
  ]

  return [
    ...new Set(
      values
        .flat(Infinity)
        .filter(Boolean)
        .map(value => String(value).trim())
    )
  ]
}

const getNumbers = jid =>
  [
    ...new Set(
      getIds(jid)
        .map(value => {
          if (
            String(value).endsWith(
              '@s.whatsapp.net'
            )
          ) {
            return normalizeNumber(value)
          }

          return normalizeNumber(value)
        })
        .filter(number => number.length >= 7)
    )
  ]

const cacheSet = (map, key, value) => {
  if (!key || !value) return

  if (map.size >= MAX_JID_CACHE) {
    const first = map.keys().next().value

    if (first) {
      map.delete(first)
    }
  }

  map.set(key, value)
}

const metadataCacheSet = (key, value) => {
  if (!key || !value) return

  if (metadataCache.size >= MAX_META_CACHE) {
    const first = metadataCache.keys().next().value

    if (first) {
      metadataCache.delete(first)
    }
  }

  metadataCache.set(key, {
    data: value,
    ts: Date.now()
  })
}

const getCachedMetadata = chat => {
  const cached = metadataCache.get(chat)

  if (!cached) return null

  if (
    Date.now() - cached.ts >
    META_TTL
  ) {
    metadataCache.delete(chat)
    return null
  }

  return cached.data
}

const storeLidMapping = async (
  conn,
  lid,
  pn
) => {
  if (
    !conn?.signalRepository?.lidMapping ||
    !lid ||
    !pn
  ) {
    return
  }

  const cleanLid =
    String(lid).endsWith('@lid')
      ? String(lid)
      : `${String(lid)}@lid`

  const cleanPn =
    normalizeJid(pn)

  if (
    !isLid(cleanLid) ||
    !isRealJid(cleanPn)
  ) {
    return
  }

  try {
    const mapping =
      conn.signalRepository.lidMapping

    if (
      typeof mapping.storeLIDPNMappings ===
      'function'
    ) {
      await mapping.storeLIDPNMappings([
        {
          lid: cleanLid,
          pn: cleanPn
        }
      ])
    } else if (
      typeof mapping.storeLIDPNMapping ===
      'function'
    ) {
      await mapping.storeLIDPNMapping(
        cleanLid,
        cleanPn
      )
    }
  } catch {}
}

const getPnFromLidMapping = async (
  conn,
  lid
) => {
  if (
    !conn?.signalRepository?.lidMapping ||
    !isLid(lid)
  ) {
    return ''
  }

  try {
    const mapping =
      conn.signalRepository.lidMapping

    if (
      typeof mapping.getPNForLID ===
      'function'
    ) {
      const result =
        await mapping.getPNForLID(lid)

      if (result) {
        const pn =
          normalizeJid(result)

        if (isRealJid(pn)) {
          return pn
        }
      }
    }
  } catch {}

  return ''
}

const saveMetadataMappings = async (
  conn,
  metadata
) => {
  if (!metadata?.participants) return

  for (
    const participant of metadata.participants
  ) {
    const lid =
      participant?.id?.endsWith?.('@lid')
        ? participant.id
        : participant?.lid

    const pn =
      participant?.phoneNumber ||
      participant?.senderPn ||
      participant?.pn

    if (
      lid &&
      pn
    ) {
      await storeLidMapping(
        conn,
        lid,
        pn
      )
    }
  }

  if (
    metadata.owner &&
    metadata.ownerPn
  ) {
    await storeLidMapping(
      conn,
      metadata.owner,
      metadata.ownerPn
    )
  }
}

const fetchGroupMetadataDeduped = async (
  conn,
  chatId
) => {
  const cached =
    getCachedMetadata(chatId)

  if (cached) return cached

  if (metadataInflight.has(chatId)) {
    return metadataInflight.get(chatId)
  }

  const promise = (async () => {
    try {
      const meta = await safeRun(
        () =>
          conn.groupMetadata(chatId),
        4000
      )

      if (meta) {
        metadataCacheSet(
          chatId,
          meta
        )

        await saveMetadataMappings(
          conn,
          meta
        )
      }

      return meta || null
    } finally {
      metadataInflight.delete(chatId)
    }
  })()

  metadataInflight.set(
    chatId,
    promise
  )

  return promise
}

const resolveParticipantNumber =
  participant => {
    if (!participant) return ''

    const values = [
      participant.phoneNumber,
      participant.senderPn,
      participant.senderPnAlt,
      participant.pn,
      participant.phone,
      participant.number,
      participant.id
    ]

    for (const value of values) {
      if (
        String(value || '').endsWith(
          '@lid'
        )
      ) {
        continue
      }

      const number =
        normalizeNumber(value)

      if (
        number &&
        number.length >= 7
      ) {
        return number
      }
    }

    return ''
  }

const participantMatches = (
  participant,
  target
) => {
  if (!participant || !target) {
    return false
  }

  const targetIds =
    getIds(target)

  const targetNumbers =
    getNumbers(target)

  const participantIds =
    getIds(participant)

  const participantNumbers =
    getNumbers(participant)

  if (
    participantIds.some(id =>
      targetIds.includes(id)
    )
  ) {
    return true
  }

  return participantNumbers.some(
    number =>
      targetNumbers.some(
        targetNumber =>
          number === targetNumber ||
          number.endsWith(targetNumber) ||
          targetNumber.endsWith(number)
      )
  )
}

async function resolveLidToRealJid(
  lid,
  conn,
  groupChatId
) {
  const input =
    String(lid || '').trim()

  if (!input) return input

  if (isRealJid(input)) {
    return input
  }

  const cached =
    jidCache.get(input)

  if (
    cached &&
    Date.now() < cached.exp
  ) {
    return cached.resolved
  }

  if (!isLid(input)) {
    return input
  }

  const mapped =
    await getPnFromLidMapping(
      conn,
      input
    )

  if (mapped) {
    cacheSet(
      jidCache,
      input,
      {
        resolved: mapped,
        exp:
          Date.now() +
          JID_TTL_DM
      }
    )

    return mapped
  }

  if (isGroupJid(groupChatId)) {
    let metadata =
      getCachedMetadata(
        groupChatId
      )

    if (!metadata) {
      metadata =
        await fetchGroupMetadataDeduped(
          conn,
          groupChatId
        )
    }

    if (metadata) {
      const participant =
        metadata.participants?.find(
          p =>
            participantMatches(
              p,
              input
            )
        )

      if (participant) {
        const number =
          resolveParticipantNumber(
            participant
          )

        if (number) {
          const resolved =
            `${number}@s.whatsapp.net`

          await storeLidMapping(
            conn,
            input,
            resolved
          )

          cacheSet(
            jidCache,
            input,
            {
              resolved,
              exp:
                Date.now() +
                JID_TTL_GROUP
            }
          )

          return resolved
        }

        if (
          isRealJid(
            participant.id
          )
        ) {
          cacheSet(
            jidCache,
            input,
            {
              resolved:
                participant.id,
              exp:
                Date.now() +
                JID_TTL_GROUP
            }
          )

          return participant.id
        }
      }
    }
  }

  return input
}

async function resolveJid(
  sender,
  conn,
  chat,
  alternate
) {
  if (!sender && !alternate) return ''

  const candidates = [
    sender,
    alternate
  ].filter(Boolean)

  for (
    const candidate of candidates
  ) {
    const input =
      String(candidate)

    if (isRealJid(input)) {
      cacheSet(
        jidCache,
        input,
        {
          resolved: input,
          exp:
            isGroupJid(chat)
              ? Date.now() +
                JID_TTL_GROUP
              : Date.now() +
                JID_TTL_DM
        }
      )

      return input
    }

    if (isLid(input)) {
      const resolved =
        await resolveLidToRealJid(
          input,
          conn,
          chat
        )

      if (
        resolved &&
        isRealJid(resolved)
      ) {
        return resolved
      }
    }
  }

  return String(sender || alternate || '')
}

const parseNumbers = list => {
  if (!list) return []

  const source =
    Array.isArray(list)
      ? list
      : [list]

  return [
    ...new Set(
      source
        .map(getRawOwner)
        .map(normalizeNumber)
        .filter(
          number =>
            number.length >= 7
        )
    )
  ]
}

const numberMatchesList = (
  numbers,
  list
) => {
  if (
    !numbers.length ||
    !list.length
  ) {
    return false
  }

  return numbers.some(
    number =>
      list.some(
        owner =>
          number === owner ||
          number.endsWith(owner) ||
          owner.endsWith(number)
      )
  )
}

const getPermissionNumbers =
  jid =>
    [
      ...new Set(
        getNumbers(jid)
      )
    ]

const emojiList = [
  '❤️',
  '😂',
  '😍',
  '🔥',
  '😎',
  '👍',
  '😭',
  '🥵',
  '😳',
  '🙏',
  '💀',
  '🤡',
  '✨',
  '💯',
  '🌚',
  '😈',
  '🤙',
  '🥶',
  '🤔',
  '😴'
]

setInterval(() => {
  const now =
    Date.now()

  for (
    const [
      key,
      value
    ] of jidCache
  ) {
    if (
      !value?.exp ||
      now > value.exp
    ) {
      jidCache.delete(key)
    }
  }

  for (
    const [
      key,
      value
    ] of metadataCache
  ) {
    if (
      !value?.ts ||
      now - value.ts >
        META_TTL
    ) {
      metadataCache.delete(key)
    }
  }
}, 10 * 60_000)

const extractTextForAntiDelete =
  msgObj => {
    if (!msgObj) return ''

    return (
      msgObj.text ||
      msgObj.caption ||
      msgObj.conversation ||
      ''
    )
  }

const senderNumberSafe =
  value =>
    normalizeNumber(value)

export async function handler(
  chatUpdate
) {
  this.msgqueque ||= []
  this.uptime ||= Date.now()

  if (
    !chatUpdate?.messages?.length
  ) {
    return
  }

  let m =
    chatUpdate.messages[
      chatUpdate.messages.length - 1
    ]

  if (!m) return

  const timestamp =
    typeof m.messageTimestamp ===
    'object'
      ? m.messageTimestamp?.low
      : m.messageTimestamp

  if (
    timestamp &&
    Date.now() / 1000 -
      Number(timestamp) >
      120
  ) {
    return
  }

  try {
    if (!global.db?.data) {
      await global.loadDatabase()
    }

    m = smsg(this, m) || m

    if (!m) return

    global.mconn = m

    m.exp = 0
    m.monedas = false

    global.db.data.users ||= {}
    global.db.data.chats ||= {}
    global.db.data.settings ||= {}
    global.db.data.stats ||= {}

    const alternateSender =
      m.key?.participantAlt ||
      m.key?.senderPn ||
      m.senderPn ||
      m.phoneNumber ||
      ''

    const rawLid =
      [
        m.sender,
        m.key?.participant
      ].find(isLid) || ''

    const senderResolvedInitial =
      await safeRun(
        () =>
          resolveJid(
            m.sender,
            this,
            m.chat,
            alternateSender
          ),
        3000
      ) || m.sender

    const senderKey =
      (isRealJid(senderResolvedInitial)
        ? senderResolvedInitial
        : '') ||
      (isRealJid(alternateSender)
        ? alternateSender
        : '') ||
      senderResolvedInitial ||
      m.sender ||
      ''

    let user =
      global.db.data.users[
        senderKey
      ]

    for (
      const oldKey of new Set([
        m.sender,
        m.key?.participant,
        m.key?.participantAlt,
        rawLid
      ])
    ) {
      if (
        !oldKey ||
        oldKey === senderKey
      ) continue

      const oldUser =
        global.db.data.users[
          oldKey
        ]

      if (
        oldUser &&
        typeof oldUser === 'object'
      ) {
        user =
          user &&
          typeof user === 'object'
            ? Object.assign(
                {},
                oldUser,
                user
              )
            : oldUser

        global.db.data.users[
          senderKey
        ] = user

        delete global.db.data.users[
          oldKey
        ]
      }
    }

    if (
      !user ||
      typeof user !== 'object'
    ) {
      global.db.data.users[
        senderKey
      ] = user = {}
    }

    const pushName =
      m.pushName ||
      m.name ||
      ''

    const number =
      normalizeNumber(senderKey)

    if (
      pushName &&
      (!user.name ||
        user.name === 'Usuario')
    ) {
      user.name = pushName
    }

    Object.assign(user, {
      exp: isNumber(user.exp)
        ? user.exp
        : 0,
      monedas: isNumber(user.monedas)
        ? user.monedas
        : 10,
      joincount: isNumber(
        user.joincount
      )
        ? user.joincount
        : 1,
      diamond: isNumber(
        user.diamond
      )
        ? user.diamond
        : 3,
      lastadventure: isNumber(
        user.lastadventure
      )
        ? user.lastadventure
        : 0,
      lastclaim: isNumber(
        user.lastclaim
      )
        ? user.lastclaim
        : 0,
      health: isNumber(
        user.health
      )
        ? user.health
        : 100,
      crime: isNumber(
        user.crime
      )
        ? user.crime
        : 0,
      lastcofre: isNumber(
        user.lastcofre
      )
        ? user.lastcofre
        : 0,
      lastdiamantes: isNumber(
        user.lastdiamantes
      )
        ? user.lastdiamantes
        : 0,
      lastpago: isNumber(
        user.lastpago
      )
        ? user.lastpago
        : 0,
      lastcode: isNumber(
        user.lastcode
      )
        ? user.lastcode
        : 0,
      lastcodereg: isNumber(
        user.lastcodereg
      )
        ? user.lastcodereg
        : 0,
      lastduel: isNumber(
        user.lastduel
      )
        ? user.lastduel
        : 0,
      lastmining: isNumber(
        user.lastmining
      )
        ? user.lastmining
        : 0,
      muto:
        'muto' in user
          ? Boolean(user.muto)
          : false,
      premium:
        'premium' in user
          ? Boolean(user.premium)
          : false,
      premiumTime:
        user.premium
          ? user.premiumTime || 0
          : 0,
      registered:
        'registered' in user
          ? Boolean(user.registered)
          : false,
      genre:
        user.genre || '',
      birth:
        user.birth || '',
      marry:
        user.marry || '',
      description:
        user.description || '',
      packstickers:
        user.packstickers || null,
      name:
        user.name ||
        pushName ||
        `+${number}`,
      number,
      jid: senderKey,
      lid:
        rawLid ||
        user.lid ||
        '',
      age: isNumber(user.age)
        ? user.age
        : -1,
      regTime: isNumber(
        user.regTime
      )
        ? user.regTime
        : -1,
      afk: isNumber(user.afk)
        ? user.afk
        : -1,
      afkReason:
        user.afkReason || '',
      role:
        user.role || 'Nuv',
      banned:
        'banned' in user
          ? Boolean(user.banned)
          : false,
      useDocument:
        'useDocument' in user
          ? Boolean(
              user.useDocument
            )
          : false,
      level: isNumber(
        user.level
      )
        ? user.level
        : 0,
      bank: isNumber(user.bank)
        ? user.bank
        : 0,
      warn: isNumber(user.warn)
        ? user.warn
        : 0
    })

    let chat =
      global.db.data.chats[
        m.chat
      ]

    if (
      !chat ||
      typeof chat !== 'object'
    ) {
      global.db.data.chats[
        m.chat
      ] = chat = {}
    }

    Object.assign(chat, {
      isBanned:
        'isBanned' in chat
          ? Boolean(chat.isBanned)
          : false,
      sAutoresponder:
        chat.sAutoresponder || '',
      welcome:
        'welcome' in chat
          ? Boolean(chat.welcome)
          : true,
      autolevelup:
        'autolevelup' in chat
          ? Boolean(
              chat.autolevelup
            )
          : false,
      autoAceptar:
        'autoAceptar' in chat
          ? Boolean(
              chat.autoAceptar
            )
          : true,
      autosticker:
        'autosticker' in chat
          ? Boolean(
              chat.autosticker
            )
          : false,
      autoRechazar:
        'autoRechazar' in chat
          ? Boolean(
              chat.autoRechazar
            )
          : true,
      autoresponder:
        'autoresponder' in chat
          ? Boolean(
              chat.autoresponder
            )
          : false,
      detect:
        'detect' in chat
          ? Boolean(chat.detect)
          : true,
      antiBot:
        'antiBot' in chat
          ? Boolean(chat.antiBot)
          : true,
      antiBot2:
        'antiBot2' in chat
          ? Boolean(chat.antiBot2)
          : true,
      modoadmin:
        'modoadmin' in chat
          ? Boolean(chat.modoadmin)
          : false,
      antiLink:
        'antiLink' in chat
          ? Boolean(chat.antiLink)
          : true,
      reaction:
        'reaction' in chat
          ? Boolean(chat.reaction)
          : false,
      nsfw:
        'nsfw' in chat
          ? Boolean(chat.nsfw)
          : false,
      antifake:
        'antifake' in chat
          ? Boolean(chat.antifake)
          : false,
      delete:
        'delete' in chat
          ? Boolean(chat.delete)
          : false,
      antidelete:
        'antidelete' in chat
          ? Boolean(
              chat.antidelete
            )
          : false,
      expired: isNumber(
        chat.expired
      )
        ? chat.expired
        : 0,
      lastReact: isNumber(
        chat.lastReact
      )
        ? chat.lastReact
        : 0
    })

    const botJid =
      this.user?.id ||
      this.user?.jid ||
      this.user?.lid

    if (!botJid) return

    const botRealJid =
      await safeRun(
        () =>
          resolveJid(
            botJid,
            this,
            m.chat,
            this.user?.phoneNumber ||
            this.user?.pn
          ),
        3000
      ) || botJid

    const settingsKey =
      botRealJid ||
      botJid

    let settings =
      global.db.data.settings[
        settingsKey
      ]

    if (
      !settings ||
      typeof settings !== 'object'
    ) {
      settings = {}
    }

    Object.assign(settings, {
      self:
        'self' in settings
          ? Boolean(settings.self)
          : false,
      restrict:
        'restrict' in settings
          ? Boolean(
              settings.restrict
            )
          : true,
      jadibotmd:
        'jadibotmd' in settings
          ? Boolean(
              settings.jadibotmd
            )
          : true,
      antiPrivate:
        'antiPrivate' in settings
          ? Boolean(
              settings.antiPrivate
            )
          : false,
      autoread:
        'autoread' in settings
          ? Boolean(
              settings.autoread
            )
          : false,
      status:
        isNumber(settings.status)
          ? settings.status
          : 0
    })

    global.db.data.settings[
      settingsKey
    ] = settings

    globalThis.setting =
      settings

    if (
      typeof m.text !== 'string'
    ) {
      m.text = ''
    }

    const senderResolved =
      await safeRun(
        () =>
          resolveJid(
            m.sender,
            this,
            m.chat,
            m.key?.participantAlt ||
            m.senderPn ||
            m.senderPnAlt ||
            m.phoneNumber
          ),
        3000
      ) || m.sender

    m.senderResolved =
      senderResolved

    const senderIds = [
      senderResolved,
      m.sender,
      m.key?.participant,
      m.key?.participantAlt,
      m.key?.senderPn,
      m.key?.senderPnAlt,
      m.senderPn,
      m.senderPnAlt,
      m.phoneNumber
    ].filter(Boolean)

    const senderNumbers =
      getPermissionNumbers(
        senderIds
      )

    const ownerNumbers = [
      ...parseNumbers(
        global.owner
      ),
      ...parseNumbers(
        global.ownerNumber
      ),
      ...parseNumbers(
        global.creators
      )
    ]

    const modNumbers =
      parseNumbers(global.mods)

    const premiumNumbers =
      parseNumbers(global.prems)

    const isROwner =
      Boolean(m.fromMe) ||
      numberMatchesList(
        senderNumbers,
        ownerNumbers
      )

    const isOwner =
      isROwner

    const isMods =
      isOwner ||
      numberMatchesList(
        senderNumbers,
        modNumbers
      )

    const isPrems =
      isOwner ||
      user.premium === true ||
      Number(user.premiumTime) >
        Date.now() ||
      numberMatchesList(
        senderNumbers,
        premiumNumbers
      )

    m.isROwner = isROwner
    m.isOwner = isOwner
    m.isMods = isMods
    m.isPrems = isPrems
    m.senderNumber =
      senderNumberSafe(
        senderResolved
      )
    m.botNumber =
      senderNumberSafe(
        botRealJid
      )

    if (
      opts?.queque &&
      m.text &&
      !isMods
    ) {
      const queue =
        this.msgqueque

      const currentId =
        m.id ||
        m.key?.id

      if (
        currentId &&
        !queue.includes(
          currentId
        )
      ) {
        queue.push(
          currentId
        )

        setTimeout(() => {
          const index =
            queue.indexOf(
              currentId
            )

          if (index !== -1) {
            queue.splice(
              index,
              1
            )
          }
        }, 5000)
      }
    }

    if (m.isBaileys) return

    global.db.data.antidelete ||= {}
    global.db.data.antidelete[
      m.chat
    ] ||= {}

    if (
      m.message &&
      !m.message?.protocolMessage
    ) {
      const messageType =
        Object.keys(
          m.message
        )[0]

      const textContent =
        extractTextForAntiDelete(
          m
        )

      global.db.data.antidelete[
        m.chat
      ][m.id] = {
        sender:
          senderResolved ||
          m.sender,
        text: textContent
          ? String(
              textContent
            ).slice(0, 2000)
          : '',
        type: messageType,
        timestamp: Date.now()
      }

      const messages =
        Object.entries(
          global.db.data.antidelete[
            m.chat
          ]
        )

      if (
        messages.length > 100
      ) {
        messages
          .sort(
            (a, b) =>
              (a[1]?.timestamp || 0) -
              (b[1]?.timestamp || 0)
          )
          .slice(
            0,
            messages.length - 100
          )
          .forEach(
            ([key]) => {
              delete global.db.data
                .antidelete[
                m.chat
              ][key]
            }
          )
      }
    }

    if (
      m.message?.protocolMessage
        ?.type === 0
    ) {
      const deletedId =
        m.message
          .protocolMessage
          .key?.id

      const deletedMsg =
        global.db.data
          .antidelete[
          m.chat
        ]?.[deletedId]

      if (
        deletedMsg &&
        chat.antidelete &&
        !m.fromMe
      ) {
        let text =
          `🗑️ *ANTIDELETE*\n\n` +
          `👤 *Usuario:* @${String(deletedMsg.sender || '').split('@')[0]}\n` +
          `📝 *Tipo:* ${String(deletedMsg.type || '').replace('Message', '')}\n` +
          `⏰ *Enviado:* ${new Date(deletedMsg.timestamp).toLocaleString('es-MX')}\n\n`

        if (deletedMsg.text) {
          text +=
            `💬 *Mensaje:* ${deletedMsg.text}`
        }

        await safeRun(
          () =>
            this.reply(
              m.chat,
              text,
              m,
              {
                mentions:
                  deletedMsg.sender
                    ? [
                        deletedMsg.sender
                      ]
                    : []
              }
            ),
          5000
        )
      }

      return
    }

    m.exp += Math.ceil(
      Math.random() * 10
    )

    let groupMetadata = null
    let participants = []

    if (m.isGroup) {
      groupMetadata =
        getCachedMetadata(
          m.chat
        )

      if (!groupMetadata) {
        groupMetadata =
          await fetchGroupMetadataDeduped(
            this,
            m.chat
          )
      }

      participants =
        groupMetadata?.participants ||
        []
    }

    const senderLid =
      m.sender

    const senderAlt =
      m.key?.participantAlt ||
      m.senderPn ||
      m.senderPnAlt ||
      ''

    const botLid =
      this.user?.lid ||
      botJid

    const botAlt =
      this.user?.id ||
      this.user?.jid ||
      this.user?.phoneNumber ||
      ''

    const senderNumber =
      normalizeNumber(
        senderResolved ||
        senderAlt ||
        senderLid
      )

    const botNumber =
      normalizeNumber(
        botRealJid ||
        botAlt ||
        botJid
      )

    const findParticipant =
      target => {
        if (
          !target ||
          !participants.length
        ) {
          return null
        }

        return (
          participants.find(
            participant =>
              participantMatches(
                participant,
                target
              )
          ) || null
        )
      }

    const participant =
      findParticipant(
        senderResolved
      ) ||
      findParticipant(
        senderAlt
      ) ||
      findParticipant(
        senderLid
      )

    const botParticipant =
      findParticipant(
        botRealJid
      ) ||
      findParticipant(
        botAlt
      ) ||
      findParticipant(
        botLid
      )

    const participantAdmin =
      participant?.admin ||
      null

    const botParticipantAdmin =
      botParticipant?.admin ||
      null

    const isRAdmin =
      participantAdmin ===
      'superadmin'

    const isAdmin =
      isRAdmin ||
      participantAdmin ===
      'admin'

    const isBotAdmin =
      botParticipantAdmin ===
        'admin' ||
      botParticipantAdmin ===
        'superadmin'

    const isGroupOwner =
      isRAdmin

    const ___dirname =
      path.join(
        path.dirname(
          fileURLToPath(
            import.meta.url
          )
        ),
        './plugins'
      )

    if (
      chat.reaction &&
      !m.fromMe &&
      m.message &&
      m.isGroup &&
      !String(
        m.key?.remoteJid || ''
      ).endsWith(
        'status@broadcast'
      )
    ) {
      const now =
        Date.now()

      if (
        now -
          Number(
            chat.lastReact || 0
          ) >
        3000
      ) {
        const emoji =
          emojiList[
            Math.floor(
              Math.random() *
                emojiList.length
            )
          ]

        await safeRun(
          () =>
            this.sendMessage(
              m.chat,
              {
                react: {
                  text: emoji,
                  key: m.key
                }
              }
            ),
          3000
        )

        chat.lastReact =
          now
      }
    }

    const str2Regex =
      string =>
        String(string).replace(
          /[|\\{}()[\]^$+*?.]/g,
          '\\$&'
        )

    for (
      const name in global.plugins
    ) {
      const plugin =
        global.plugins[name]

      if (
        !plugin ||
        plugin.disabled
      ) {
        continue
      }

      const __filename =
        join(
          ___dirname,
          name
        )

      if (
        typeof plugin.all ===
        'function'
      ) {
        try {
          await safeRun(
            () =>
              plugin.all.call(
                this,
                m,
                {
                  chatUpdate,
                  __dirname:
                    ___dirname,
                  __filename
                }
              ),
            8000
          )
        } catch (error) {
          console.error(
            `[PLUGIN ALL ERROR] ${name}`,
            error
          )
        }
      }

      let _prefix =
        plugin.customPrefix ??
        global.prefix

      let match = null

      const resetAndExec =
        (
          regex,
          text
        ) => {
          try {
            if (regex.global) {
              regex.lastIndex = 0
            }

            return regex.exec(
              text
            )
          } catch {
            return null
          }
        }

      if (
        _prefix instanceof RegExp
      ) {
        const result =
          resetAndExec(
            _prefix,
            m.text
          )

        if (result) {
          match = [
            result,
            _prefix
          ]
        }
      } else if (
        Array.isArray(_prefix)
      ) {
        for (
          const prefix of _prefix
        ) {
          const regex =
            prefix instanceof RegExp
              ? prefix
              : new RegExp(
                  str2Regex(
                    prefix
                  )
                )

          const result =
            resetAndExec(
              regex,
              m.text
            )

          if (result) {
            match = [
              result,
              regex
            ]
            break
          }
        }
      } else {
        const regex =
          new RegExp(
            str2Regex(
              _prefix || ''
            )
          )

        const result =
          resetAndExec(
            regex,
            m.text
          )

        if (result) {
          match = [
            result,
            regex
          ]
        }
      }

      if (
        typeof plugin.before ===
        'function'
      ) {
        try {
          const beforeRes =
            await safeRun(
              () =>
                plugin.before.call(
                  this,
                  m,
                  {
                    match,
                    conn: this,
                    participants,
                    groupMetadata,
                    user:
                      participant,
                    bot:
                      botParticipant,
                    isROwner,
                    isOwner,
                    isRAdmin,
                    isAdmin,
                    isBotAdmin,
                    isGroupOwner,
                    isPrems,
                    chatUpdate,
                    __dirname:
                      ___dirname,
                    __filename
                  }
                ),
              8000
            )

          if (beforeRes) {
            continue
          }
        } catch (error) {
          console.error(
            `[PLUGIN BEFORE ERROR] ${name}`,
            error
          )
        }
      }

      if (
        typeof plugin !==
        'function'
      ) {
        continue
      }

      if (!match) {
        continue
      }

      const usedPrefix =
        match[0] || ''

      if (!usedPrefix) {
        continue
      }

      const noPrefix =
        m.text.slice(
          usedPrefix.length
        )

      const parts =
        noPrefix
          .trim()
          .split(/\s+/)
          .filter(Boolean)

      let command =
        parts.shift() || ''

      const args =
        parts

      const _args =
        args

      const text =
        args.join(' ')

      command =
        String(
          command
        ).toLowerCase()

      global.comando =
        command

      const isAccept =
        plugin.command instanceof
        RegExp
          ? (() => {
              if (
                plugin.command
                  .global
              ) {
                plugin.command
                  .lastIndex = 0
              }

              return plugin.command.test(
                command
              )
            })()
          : Array.isArray(
              plugin.command
            )
            ? plugin.command.some(
                cmd =>
                  cmd instanceof
                  RegExp
                    ? (() => {
                        if (
                          cmd.global
                        ) {
                          cmd.lastIndex = 0
                        }

                        return cmd.test(
                          command
                        )
                      })()
                    : String(
                        cmd
                      ).toLowerCase() ===
                      command
              )
            : typeof plugin.command ===
                'string'
              ? plugin.command
                  .toLowerCase() ===
                command
              : false

      if (!isAccept) {
        continue
      }

      if (
        m.id?.startsWith(
          'NJX-'
        ) ||
        (
          m.id?.startsWith(
            'BAE5'
          ) &&
          m.id.length === 16
        ) ||
        (
          m.id?.startsWith(
            'B24E'
          ) &&
          m.id.length === 20
        )
      ) {
        return
      }

      m.plugin = name

      if (
        ![
          'grupo-unbanchat.js',
          'owner-exec.js',
          'owner-exec2.js'
        ].includes(name) &&
        chat.isBanned &&
        !isROwner
      ) {
        return
      }

      if (
        m.text &&
        user.banned &&
        !isROwner
      ) {
        await safeRun(
          () =>
            m.reply(
              `《✦》Estas baneado/a, no puedes usar comandos!\n\n${user.bannedReason ? `✰ *Motivo:* ${user.bannedReason}` : '✰ *Motivo:* Sin Especificar'}`
            ),
          5000
        )

        return
      }

      if (
        chat.modoadmin &&
        !isOwner &&
        m.isGroup &&
        !isAdmin
      ) {
        continue
      }

      const fail =
        plugin.fail ||
        global.dfail

      if (
        plugin.rowner &&
        !isROwner
      ) {
        await safeRun(
          () =>
            fail?.(
              'rowner',
              m,
              this
            ),
          5000
        )

        continue
      }

      if (
        plugin.owner &&
        !isOwner
      ) {
        await safeRun(
          () =>
            fail?.(
              'owner',
              m,
              this
            ),
          5000
        )

        continue
      }

      if (
        plugin.mods &&
        !isMods
      ) {
        await safeRun(
          () =>
            fail?.(
              'mods',
              m,
              this
            ),
          5000
        )

        continue
      }

      if (
        plugin.premium &&
        !isPrems
      ) {
        await safeRun(
          () =>
            fail?.(
              'premium',
              m,
              this
            ),
          5000
        )

        continue
      }

      if (
        plugin.group &&
        !m.isGroup
      ) {
        await safeRun(
          () =>
            fail?.(
              'group',
              m,
              this
            ),
          5000
        )

        continue
      }

      if (
        plugin.botAdmin &&
        !isBotAdmin
      ) {
        await safeRun(
          () =>
            fail?.(
              'botAdmin',
              m,
              this
            ),
          5000
        )

        continue
      }

      if (
        plugin.admin &&
        !isAdmin
      ) {
        await safeRun(
          () =>
            fail?.(
              'admin',
              m,
              this
            ),
          5000
        )

        continue
      }

      if (
        plugin.private &&
        m.isGroup
      ) {
        await safeRun(
          () =>
            fail?.(
              'private',
              m,
              this
            ),
          5000
        )

        continue
      }

      if (
        plugin.register &&
        !user.registered
      ) {
        await safeRun(
          () =>
            fail?.(
              'unreg',
              m,
              this
            ),
          5000
        )

        continue
      }

      m.isCommand = true

      const xp =
        'exp' in plugin
          ? parseInt(
              plugin.exp
            ) || 0
          : 10

      m.exp += xp

      if (
        !isPrems &&
        plugin.monedas &&
        user.monedas <
          plugin.monedas
      ) {
        await safeRun(
          () =>
            this.reply(
              m.chat,
              `❮✦❯ Se agotaron tus ${global.monedas}`,
              m
            ),
          5000
        )

        continue
      }

      if (
        plugin.level &&
        user.level <
          plugin.level
      ) {
        await safeRun(
          () =>
            this.reply(
              m.chat,
              `❮✦❯ Se requiere nivel: *${plugin.level}*\n\n• Tu nivel: *${user.level}*\n\n• Usa: *${usedPrefix}levelup*`,
              m
            ),
          5000
        )

        continue
      }

      const getUserDisplay = async jidOrLid => {
        const key =
          (await safeRun(
            () =>
              resolveJid(
                jidOrLid,
                this,
                m.chat
              ),
            3000
          )) ||
          jidOrLid ||
          ''

        const number =
          normalizeNumber(key)

        const stored =
          global.db.data.users?.[key]

        const name =
          (stored?.name &&
            stored.name !== 'Usuario'
            ? stored.name
            : '') ||
          this.getName?.(key) ||
          `+${number}`

        return {
          jid: key,
          number,
          name,
          mention: `@${number}`
        }
      }

      const extra = {
        match,
        usedPrefix,
        noPrefix,
        _args,
        args,
        command,
        text,
        conn: this,
        participants,
        groupMetadata,
        user:
          participant,
        getUserDisplay,
        bot:
          botParticipant,
        isROwner,
        isOwner,
        isRAdmin,
        isAdmin,
        isBotAdmin,
        isGroupOwner,
        isPrems,
        chatUpdate,
        __dirname:
          ___dirname,
        __filename
      }

      try {
        await safeRun(
          () =>
            plugin.call(
              this,
              m,
              extra
            ),
          60000
        )

        if (
          !isPrems &&
          plugin.monedas
        ) {
          m.monedas =
            m.monedas ||
            plugin.monedas
        }
      } catch (error) {
        m.error =
          error

        console.error(
          chalk.red(
            `[PLUGIN ERROR] ${name}`
          ),
          error
        )
      } finally {
        if (
          typeof plugin.after ===
          'function'
        ) {
          try {
            await safeRun(
              () =>
                plugin.after.call(
                  this,
                  m,
                  extra
                ),
              8000
            )
          } catch (error) {
            console.error(
              `[PLUGIN AFTER ERROR] ${name}`,
              error
            )
          }
        }

        if (m.monedas) {
          await safeRun(
            () =>
              this.reply(
                m.chat,
                `❮✦❯ Utilizaste ${Number(m.monedas)} ${global.monedas}`,
                m
              ),
            5000
          )
        }
      }

      break
    }
  } catch (error) {
    console.error(
      chalk.red(
        '[HANDLER ERROR]'
      ),
      error
    )
  } finally {
    try {
      const messageId =
        m?.id ||
        m?.key?.id

      if (
        opts?.queque &&
        m?.text &&
        messageId
      ) {
        const queueIndex =
          this.msgqueque?.indexOf(
            messageId
          )

        if (
          queueIndex !==
            undefined &&
          queueIndex !== -1
        ) {
          this.msgqueque.splice(
            queueIndex,
            1
          )
        }
      }

      if (m) {
        const sender =
          m.senderResolved ||
          m.sender ||
          m.key?.participantAlt ||
          m.key?.participant ||
          m.key?.remoteJidAlt

        const currentUser =
          global.db?.data?.users?.[
            sender
          ] ||
          global.db?.data?.users?.[
            m.sender
          ] ||
          global.db?.data?.users?.[
            m.senderNumber
              ? `${m.senderNumber}@s.whatsapp.net`
              : ''
          ]

        if (
          currentUser?.muto
        ) {
          await safeRun(
            () =>
              this.sendMessage(
                m.chat,
                {
                  delete: {
                    remoteJid:
                      m.chat,
                    fromMe: false,
                    id:
                      m.key?.id,
                    participant:
                      m.key
                        ?.participant
                  }
                }
              ),
            3000
          )
        }

        if (currentUser) {
          currentUser.exp =
            Number(
              currentUser.exp || 0
            ) +
            Number(
              m.exp || 0
            )

          if (m.monedas) {
            currentUser.monedas =
              Math.max(
                0,
                Number(
                  currentUser.monedas ||
                    0
                ) -
                  Number(
                    m.monedas ||
                      0
                  )
              )
          }
        }

        if (m.plugin) {
          global.db.data.stats ||= {}

          const now =
            Date.now()

          const stat =
            global.db.data.stats[
              m.plugin
            ] ||
            {
              total: 0,
              success: 0,
              last: 0,
              lastSuccess: 0
            }

          stat.total++
          stat.last =
            now

          if (!m.error) {
            stat.success++
            stat.lastSuccess =
              now
          }

          global.db.data.stats[
            m.plugin
          ] = stat
        }

        if (!opts?.noprint) {
          try {
            const print =
              (
                await import(
                  '../lib/print.js'
                )
              ).default

            if (
              typeof print ===
              'function'
            ) {
              await safeRun(
                () =>
                  print(
                    m,
                    this
                  ),
                2000
              )
            }
          } catch (error) {
            console.error(
              '[PRINT ERROR]',
              error
            )
          }
        }

        if (
          opts?.autoread &&
          m.key
        ) {
          await safeRun(
            () =>
              this.readMessages([
                m.key
              ]),
            2000
          )
        }
      }

      await safeRun(
        () => global.db?.write?.(),
        5000
      )
      global.db?.save?.()
    } catch (error) {
      console.error(
        '[HANDLER FINALLY ERROR]',
        error
      )
    }
  }
}

global.dfail = (
  type,
  m,
  conn
) => {
  const messages = {
    rowner:
      `🛑 *ACCESO RESTRINGIDO*\n\n> Solo el *Creador Supremo* puede ejecutar este protocolo.\n\n🧬 Usuario Autorizado: 👑 𝙏𝙃𝙀 𝘾𝘼𝙍𝙇𝙊𝙎`,
    owner:
      `⚙️🔒 *MÓDULO DEV: ACCESO BLOQUEADO*\n\n> Esta función está anclada a permisos de *DESARROLLADOR*.`,
    mods:
      `🛡️ *SOLO MODERADORES*\n\n> Comando exclusivo para mods del bot.`,
    premium:
      `💎 *REQUIERE CUENTA PREMIUM*\n\n> 🚫 Módulo exclusivo para usuarios *VIP - PREMIUM*.\n\n📡 Actualiza tu plan con: */vip*`,
    group:
      `👥 *SOLO GRUPOS*\n\n> Este comando solo funciona en grupos.`,
    private:
      `🔒 *SOLO CHAT PRIVADO* 📲\n\n> Este comando no puede ejecutarse en grupos por razones de seguridad.`,
    admin:
      `🛡️ *FUNCIÓN RESTRINGIDA*\n\n> Solo los administradores del *Grupo* tienen acceso.`,
    botAdmin:
      `🤖 *NECESITO SER ADMINISTRADOR*\n\n> El bot necesita permisos de administrador para ejecutar este comando.`,
    unreg:
      `🧾 *NO REGISTRADO EN EL SISTEMA*\n\n> 🚫 *Acceso denegado:* No puedes usar los comandos sin registrarte.\n\n🔐 Regístrate con: */reg nombre.edad*\n📍 Ejemplo: */reg Asta.20*\n\n> 🥷🏻 *Instagram oficial del creador del bot:*\nhttps://www.instagram.com/the_carlos.zx?stkn=dXZ0YXZ2ajQ2eDRy&utm_source=qr\n\n📂 *Creador del bot:* The Carlos`,
    restrict:
      `🚷 *FUNCIÓN GLOBALMENTE BLOQUEADA*\n\n> Este comando fue deshabilitado por el *Operador Global* por motivos de seguridad.`
  }

  const message =
    messages[type]

  if (!message) return

  return conn
    .reply(
      m.chat,
      message,
      m
    )
    .then(
      () =>
        m.react(
          '✖️'
        ).catch(
          () => {}
        )
    )
}

const file =
  global.__filename
    ? global.__filename(
        import.meta.url,
        true
      )
    : fileURLToPath(
        import.meta.url
      )

watchFile(
  file,
  async () => {
    unwatchFile(file)

    console.log(
      chalk.magenta(
        "Se actualizó 'handler.js'"
      )
    )

    try {
      await import(
        `${file}?update=${Date.now()}`
      )
    } catch (error) {
      console.error(
        '[HOT RELOAD ERROR]',
        error
      )
    }
  }
)