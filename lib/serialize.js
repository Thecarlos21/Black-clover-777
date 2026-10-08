import {
  proto,
  delay,
  areJidsSameUser,
  generateWAMessage,
  generateWAMessageFromContent,
  downloadContentFromMessage,
  getContentType,
  getDevice,
  extractMessageContent,
  jidDecode
} from '@whiskeysockets/baileys'
import fs from 'fs'
import axios from 'axios'
import crypto from 'crypto'
import FileType from 'file-type'
import path from 'path'
import exif from './exif.js'
import db from '#db'
import { fileURLToPath } from 'url'
import GraphemeSplitter from 'grapheme-splitter'

const splitter = new GraphemeSplitter()
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = exif

class BoundedMap {
  #map = new Map()
  #max
  #ttl

  constructor(max, ttlMs = 0) {
    this.#max = max
    this.#ttl = ttlMs
  }

  #expired(e) {
    return this.#ttl > 0 && Date.now() - e.ts > this.#ttl
  }

  has(k) {
    const e = this.#map.get(k)
    if (!e) return false

    if (this.#expired(e)) {
      this.#map.delete(k)
      return false
    }

    return true
  }

  get(k) {
    const e = this.#map.get(k)
    if (!e) return undefined

    if (this.#expired(e)) {
      this.#map.delete(k)
      return undefined
    }

    return e.v
  }

  set(k, v) {
    if (this.#max > 0 && this.#map.size >= this.#max) {
      const first = this.#map.keys().next().value
      if (first !== undefined) this.#map.delete(first)
    }

    this.#map.set(k, {
      v,
      ts: Date.now()
    })

    return this
  }

  delete(k) {
    return this.#map.delete(k)
  }

  clear() {
    this.#map.clear()
  }

  get size() {
    return this.#map.size
  }
}

const groupMetaCache = new Map()
const lidCache = new BoundedMap(10000, 24 * 60 * 60_000)
const META_TTL = 300_000

function setCachedMeta(jid, meta) {
  if (!jid || !meta) return meta

  groupMetaCache.set(String(jid), {
    ...meta,
    ts: Date.now()
  })

  return meta
}

function getCachedMeta(jid) {
  if (!jid) return null

  const key = String(jid)
  const value = groupMetaCache.get(key)

  if (!value) return null

  if (Date.now() - value.ts > META_TTL) {
    groupMetaCache.delete(key)
    return null
  }

  return value
}

function deleteCachedMeta(jid) {
  if (!jid) return false
  return groupMetaCache.delete(String(jid))
}

const gcMeta = setInterval(() => {
  const now = Date.now()

  for (const [key, value] of groupMetaCache) {
    if (!value || now - value.ts > META_TTL) {
      groupMetaCache.delete(key)
    }
  }
}, 10 * 60 * 1000)

gcMeta.unref?.()

function normalizeJid(raw) {
  if (raw === null || raw === undefined) return null

  const s = typeof raw === 'number'
    ? String(raw)
    : String(raw).trim()

  if (!s) return null

  if (s.includes('@')) {
    if (/:.+@/.test(s)) {
      try {
        const decoded = jidDecode(s)

        if (decoded?.user && decoded?.server) {
          return `${decoded.user}@${decoded.server}`
        }
      } catch {}
    }

    return s
  }

  const digits = s.replace(/\D/g, '')

  if (digits.length >= 4 && digits.length <= 16) {
    return `${digits}@s.whatsapp.net`
  }

  return s
}

function decodeJid(raw) {
  if (!raw) return raw

  const jid = String(raw)

  if (!/:.+@/.test(jid)) return jid

  try {
    const decoded = jidDecode(jid)

    if (decoded?.user && decoded?.server) {
      return `${decoded.user}@${decoded.server}`
    }
  } catch {}

  return jid
}

function getJidCandidates(value) {
  if (!value) return []

  const result = []

  const add = value => {
    if (!value) return

    const normalized = normalizeJid(value)

    if (normalized && !result.includes(normalized)) {
      result.push(normalized)
    }
  }

  if (typeof value === 'string') {
    add(value)
    add(decodeJid(value))
  } else if (typeof value === 'object') {
    add(value.phoneNumber)
    add(value.participantPn)
    add(value.senderPn)
    add(value.jid)
    add(value.id)
    add(value.lid)
    add(value.participant)
    add(value.participantAlt)
  }

  return result
}

function getParticipantLid(p) {
  if (!p) return null

  if (typeof p === 'string') {
    const normalized = normalizeJid(p)

    return normalized?.endsWith('@lid')
      ? normalized
      : null
  }

  const values = [
    p.lid,
    p.id,
    p.participant,
    p.participantAlt,
    p.participantPn,
    p.jid
  ]

  for (const value of values) {
    if (!value) continue

    const normalized = normalizeJid(value)

    if (normalized?.endsWith('@lid')) {
      return normalized
    }
  }

  return null
}

function getParticipantPhone(p) {
  if (!p) return null

  const values = [
    p.phoneNumber,
    p.participantPn,
    p.senderPn,
    p.jid,
    p.participantAlt,
    p.participant,
    p.id
  ]

  for (const value of values) {
    if (!value) continue

    const normalized = normalizeJid(value)

    if (
      normalized &&
      normalized.endsWith('@s.whatsapp.net')
    ) {
      return normalized
    }
  }

  return null
}

function saveLidMapping(lid, phone) {
  if (!lid || !phone) return

  const normalizedLid = normalizeJid(lid)
  const normalizedPhone = normalizeJid(phone)

  if (
    !normalizedLid?.endsWith('@lid') ||
    !normalizedPhone?.endsWith('@s.whatsapp.net')
  ) {
    return
  }

  lidCache.set(
    normalizedLid,
    normalizedPhone
  )
}

function resolveParticipantJid(p) {
  if (!p) return null

  const phone = getParticipantPhone(p)
  const lid = getParticipantLid(p)

  if (phone && lid) {
    saveLidMapping(
      lid,
      phone
    )
  }

  if (phone) return phone

  if (
    lid &&
    lidCache.has(lid)
  ) {
    return lidCache.get(lid)
  }

  return lid || phone || null
}

function resolveParticipants(participants) {
  if (!Array.isArray(participants)) return []

  return participants.map(p => {
    const lid = getParticipantLid(p)
    const phone = getParticipantPhone(p)

    if (lid && phone) {
      saveLidMapping(
        lid,
        phone
      )
    }

    if (!phone && !lid) {
      return p
    }

    return {
      ...p,
      ...(phone
        ? {
            phoneNumber: phone
          }
        : {}),
      ...(lid
        ? {
            lid
          }
        : {})
    }
  })
}

function resolveJidSync(raw) {
  if (!raw) return null

  const norm = normalizeJid(raw)

  if (!norm) return null

  if (!norm.endsWith('@lid')) {
    return norm
  }

  if (lidCache.has(norm)) {
    return lidCache.get(norm)
  }

  return norm
}

async function resolveJidAsync(
  raw,
  sock,
  groupJid,
  alternate
) {
  if (!raw && !alternate) return null

  const candidates = [
    raw,
    alternate
  ].filter(Boolean)

  for (const candidate of candidates) {
    const normalized =
      normalizeJid(candidate)

    if (
      normalized &&
      normalized.endsWith('@s.whatsapp.net')
    ) {
      return normalized
    }
  }

  const norm =
    normalizeJid(
      raw ||
      alternate
    )

  if (!norm) return null

  if (!norm.endsWith('@lid')) {
    return norm
  }

  if (lidCache.has(norm)) {
    return lidCache.get(norm)
  }

  if (
    !groupJid?.endsWith('@g.us')
  ) {
    return norm
  }

  let meta =
    getCachedMeta(groupJid)

  if (!meta) {
    try {
      const original =
        sock?.__originalGroupMetadata ||
        sock?.groupMetadata

      if (
        typeof original ===
        'function'
      ) {
        meta =
          await original.call(
            sock,
            groupJid
          )

        if (
          meta?.participants
        ) {
          meta = {
            ...meta,
            participants:
              resolveParticipants(
                meta.participants
              )
          }

          setCachedMeta(
            groupJid,
            meta
          )
        }
      }
    } catch {}
  }

  const lidBase =
    norm.split('@')[0]

  for (
    const p of
    meta?.participants || []
  ) {
    const lid =
      getParticipantLid(p)

    const phone =
      getParticipantPhone(p)

    if (
      !lid ||
      !phone
    ) {
      continue
    }

    if (
      lid.split('@')[0] ===
      lidBase
    ) {
      saveLidMapping(
        lid,
        phone
      )

      return phone
    }
  }

  return norm
}

function getRealNumber(jid) {
  if (!jid) return ''

  const normalized =
    normalizeJid(jid)

  if (
    !normalized ||
    !normalized.endsWith(
      '@s.whatsapp.net'
    )
  ) {
    return ''
  }

  return normalized
    .split('@')[0]
}

function patchGroupMetadata(sock) {
  if (
    !sock ||
    sock.groupMetadataPatched
  ) {
    return
  }

  const original =
    typeof sock.groupMetadata ===
    'function'
      ? sock.groupMetadata.bind(sock)
      : null

  if (!original) return

  sock.__originalGroupMetadata =
    original

  sock.groupMetadataPatched =
    true

  sock.groupMetadata =
    async jid => {
      const normalized =
        normalizeJid(jid)

      if (!normalized) {
        return null
      }

      const cached =
        getCachedMeta(
          normalized
        )

      if (cached) {
        return cached
      }

      try {
        const meta =
          await original(
            normalized
          )

        if (!meta) {
          return null
        }

        if (
          Array.isArray(
            meta.participants
          )
        ) {
          meta.participants =
            resolveParticipants(
              meta.participants
            )
        }

        setCachedMeta(
          normalized,
          meta
        )

        return meta
      } catch {
        return null
      }
    }
}

export {
  normalizeJid,
  resolveParticipantJid,
  resolveJidSync,
  patchGroupMetadata,
  getCachedMeta,
  setCachedMeta,
  deleteCachedMeta,
  BoundedMap,
  getRealNumber
}

export async function getBuffer(
  url,
  options = {}
) {
  const res =
    await axios({
      method: 'get',
      url,
      headers: {
        DNT: '1',
        'Upgrade-Insecure-Requests': '1',
        ...(options.headers || {})
      },
      responseType:
        'arraybuffer',
      timeout: 30_000,
      ...options
    })

  return res.data
}

export async function smsg(
  sock,
  msg,
  store
) {
  if (!sock) return msg

  patchGroupMetadata(sock)

  if (!sock.decodeJid) {
    sock.decodeJid =
      jid =>
        decodeJid(jid)
  }

  if (!sock.downloadMediaMessage) {
    sock.downloadMediaMessage =
      async message => {
        const m =
          message?.msg ||
          message

        const mime =
          m?.mimetype ||
          ''

        const messageType =
          (
            message?.type ||
            mime.split('/')[0] ||
            getContentType(
              message
            ) ||
            ''
          ).replace(
            /Message/gi,
            ''
          )

        if (!messageType) {
          throw new Error(
            'Tipo de mensaje multimedia no encontrado'
          )
        }

        const stream =
          await downloadContentFromMessage(
            m,
            messageType
          )

        const chunks = []

        for await (
          const chunk of stream
        ) {
          chunks.push(chunk)
        }

        return Buffer.concat(
          chunks
        )
      }
  }

  if (!msg) return msg

  const botJid =
    normalizeJid(
      sock?.user?.jid ||
      sock?.user?.id ||
      ''
    )

  let botSetting = {}

  try {
    botSetting =
      db?.getSettings?.(
        botJid
      ) || {}
  } catch {}

  if (msg.key) {
    msg.id =
      msg.key.id ||
      ''

    msg.chat =
      normalizeJid(
        msg.key.remoteJid ||
        msg.key.remoteJidAlt ||
        ''
      )

    msg.fromMe =
      !!msg.key.fromMe

    msg.isBot =
      [
        'HSK',
        'BAE',
        'B1E',
        '3EB0',
        'B24E',
        'WA'
      ].some(
        a =>
          msg.id.startsWith(a) &&
          [
            12,
            16,
            20,
            22,
            40
          ].includes(
            msg.id.length
          )
      ) ||
      /(.)\1{5,}|[^a-zA-Z0-9]|[^0-9A-F]/.test(
        msg.id
      )

    msg.isGroup =
      msg.chat?.endsWith(
        '@g.us'
      ) ||
      false

    const rawSender =
      msg.fromMe
        ? sock?.user?.jid ||
          sock?.user?.id
        : msg.key?.participantPn ||
          msg.key?.senderPn ||
          msg.key?.participantAlt ||
          msg.key?.participant ||
          msg.participant ||
          msg.key?.remoteJid ||
          msg.key?.remoteJidAlt ||
          ''

    const senderAlternate =
      msg.fromMe
        ? null
        : msg.key?.participantPn ||
          msg.key?.senderPn ||
          msg.key?.participantAlt ||
          msg.key?.participant ||
          null

    msg.senderRaw =
      normalizeJid(
        msg.fromMe
          ? sock?.user?.jid ||
            sock?.user?.id
          : msg.key?.participant ||
            msg.key?.participantAlt ||
            msg.participant ||
            msg.key?.participantPn ||
            msg.key?.senderPn ||
            msg.key?.remoteJid ||
            msg.key?.remoteJidAlt ||
            ''
      )

    msg.sender =
      await resolveJidAsync(
        rawSender,
        sock,
        msg.isGroup
          ? msg.chat
          : null,
        senderAlternate
      )

    msg.senderNumber =
      getRealNumber(
        msg.sender
      )

    if (
      !msg.isGroup &&
      msg.chat?.endsWith('@lid')
    ) {
      msg.chat =
        await resolveJidAsync(
          msg.chat,
          sock,
          null,
          msg.key?.remoteJidAlt
        )
    }
  }

  if (msg.message) {
    msg.type =
      getContentType(
        msg.message
      ) ||
      Object.keys(
        msg.message
      )[0]

    let messageContent =
      msg.message[
        msg.type
      ]

    if (
      /viewOnceMessage|viewOnceMessageV2|viewOnceMessageV2Extension|editedMessage|ephemeralMessage|documentWithCaptionMessage/i.test(
        msg.type
      )
    ) {
      messageContent =
        messageContent?.message ||
        messageContent
    }

    const innerType =
      getContentType(
        messageContent
      ) ||
      Object.keys(
        messageContent || {}
      )[0]

    msg.msg =
      extractMessageContent(
        messageContent
      ) ||
      messageContent?.[
        innerType
      ] ||
      messageContent

    msg.body =
      msg.message?.conversation ||
      msg.msg?.text ||
      msg.msg?.conversation ||
      msg.msg?.caption ||
      msg.msg?.selectedButtonId ||
      msg.msg?.singleSelectReply
        ?.selectedRowId ||
      msg.msg?.selectedId ||
      msg.msg?.contentText ||
      msg.msg?.selectedDisplayText ||
      msg.msg?.title ||
      msg.msg?.name ||
      ''

    const rawMentioned =
      msg.msg?.contextInfo
        ?.mentionedJid ||
      msg.msg?.contextInfo
        ?.mentionedJidAlt ||
      []

    let metaParticipants =
      null

    if (
      msg.isGroup &&
      rawMentioned.some(
        j =>
          typeof j ===
            'string' &&
          j.endsWith('@lid')
      )
    ) {
      try {
        const meta =
          getCachedMeta(
            msg.chat
          ) ||
          await sock
            .groupMetadata(
              msg.chat
            )
            .catch(
              () => null
            )

        if (meta) {
          setCachedMeta(
            msg.chat,
            meta
          )

          metaParticipants =
            meta.participants ||
            null
        }
      } catch {}
    }

    const resolveMentionJid =
      raw => {
        if (!raw) return null

        const norm =
          normalizeJid(raw)

        if (!norm) return null

        if (
          norm.endsWith(
            '@s.whatsapp.net'
          )
        ) {
          return norm
        }

        if (
          !norm.endsWith(
            '@lid'
          )
        ) {
          return norm
        }

        if (
          lidCache.has(norm)
        ) {
          return lidCache.get(
            norm
          )
        }

        const base =
          norm.split('@')[0]

        for (
          const p of
          metaParticipants || []
        ) {
          const lid =
            getParticipantLid(p)

          const phone =
            getParticipantPhone(p)

          if (
            lid &&
            phone &&
            lid.split('@')[0] ===
              base
          ) {
            saveLidMapping(
              lid,
              phone
            )

            return phone
          }
        }

        return norm
      }

    msg.mentionedJid = [
      ...new Set(
        rawMentioned
          .map(
            resolveMentionJid
          )
          .filter(Boolean)
      )
    ]

    msg.mentionedJidRaw = [
      ...new Set(
        rawMentioned
          .map(
            normalizeJid
          )
          .filter(Boolean)
      )
    ]

    msg.text =
      msg.msg?.text ||
      msg.msg?.caption ||
      msg.message?.conversation ||
      msg.msg?.contentText ||
      msg.msg?.selectedDisplayText ||
      msg.msg?.title ||
      ''

    let activePrefixes = []

    if (
      botSetting.prefix === 1
    ) {
      activePrefixes = []
    } else if (
      Array.isArray(
        botSetting.prefix
      )
    ) {
      activePrefixes =
        botSetting.prefix
    } else if (
      typeof botSetting.prefix ===
        'string'
    ) {
      activePrefixes =
        splitter.splitGraphemes(
          botSetting.prefix
        )
    } else {
      activePrefixes = [
        '#',
        '/',
        '.',
        '!'
      ]
    }

    msg.usedPrefix = ''

    for (
      const prefix of
      activePrefixes
    ) {
      if (
        msg.body?.startsWith(
          prefix
        )
      ) {
        msg.usedPrefix =
          prefix
        break
      }
    }

    msg.command =
      msg.body
        ?.replace(
          msg.usedPrefix,
          ''
        )
        .trim()
        .split(/ +/)
        .shift() ||
      ''

    const prefixRegex =
      msg.usedPrefix
        ? new RegExp(
            '^' +
              msg.usedPrefix.replace(
                /[.*=+:\-?^${}()|[\]\\]/g,
                '\\$&'
              ),
            'i'
          )
        : null

    msg.args =
      msg.body
        ?.trim()
        .replace(
          prefixRegex ||
            /^/,
          ''
        )
        .replace(
          msg.command,
          ''
        )
        .trim()
        .split(/ +/)
        .filter(Boolean) ||
      []

    msg.device =
      msg.id
        ? getDevice(
            msg.id
          )
        : ''

    msg.expiration =
      msg.msg?.contextInfo
        ?.expiration ||
      msg?.metadata
        ?.ephemeralDuration ||
      0

    const timestamp =
      typeof msg.messageTimestamp ===
        'number'
        ? msg.messageTimestamp
        : msg.messageTimestamp?.low ??
          msg.messageTimestamp?.high ??
          0

    msg.timestamp =
      timestamp ||
      Math.floor(
        Number(
          msg.msg?.timestampMs ||
          0
        ) / 1000
      )

    msg.isMedia =
      !!msg.msg?.mimetype ||
      !!msg.msg
        ?.thumbnailDirectPath

    if (msg.isMedia) {
      msg.mime =
        msg.msg?.mimetype ||
        ''

      msg.size =
        msg.msg?.fileLength ||
        0

      msg.height =
        msg.msg?.height ||
        ''

      msg.width =
        msg.msg?.width ||
        ''

      if (
        /webp/i.test(
          msg.mime
        )
      ) {
        msg.isAnimated =
          !!msg.msg
            ?.isAnimated
      }
    }

    msg.quoted =
      msg.msg?.contextInfo
        ?.quotedMessage
        ? {}
        : null

    if (msg.quoted) {
      const context =
        msg.msg.contextInfo

      msg.quoted.message =
        extractMessageContent(
          context.quotedMessage
        ) ||
        context.quotedMessage

      msg.quoted.type =
        getContentType(
          msg.quoted.message
        ) ||
        Object.keys(
          msg.quoted.message ||
          {}
        )[0]

      msg.quoted.msg =
        extractMessageContent(
          msg.quoted.message?.[
            msg.quoted.type
          ]
        ) ||
        msg.quoted.message?.[
          msg.quoted.type
        ] ||
        msg.quoted.message

      msg.quoted.id =
        context.stanzaId ||
        context.quotedMessageId ||
        ''

      msg.quoted.device =
        msg.quoted.id
          ? getDevice(
              msg.quoted.id
            )
          : ''

      msg.quoted.chat =
        normalizeJid(
          context.remoteJid ||
          context.remoteJidAlt ||
          msg.chat
        )

      const quotedRaw =
        context.participantPn ||
        context.senderPn ||
        context.participantAlt ||
        context.participant ||
        ''

      const quotedAlternate =
        context.participantPn ||
        context.senderPn ||
        context.participantAlt ||
        context.participant ||
        null

      msg.quoted.senderRaw =
        normalizeJid(
          context.participant ||
          context.participantAlt ||
          context.participantPn ||
          context.senderPn ||
          ''
        )

      msg.quoted.sender =
        await resolveJidAsync(
          quotedRaw,
          sock,
          msg.chat,
          quotedAlternate
        )

      msg.quoted.senderNumber =
        getRealNumber(
          msg.quoted.sender
        )

      msg.quoted.fromMe =
        areJidsSameUser(
          msg.quoted.sender,
          sock.decodeJid(
            sock?.user?.jid ||
            sock?.user?.id ||
            ''
          )
        )

      msg.quoted.text =
        msg.quoted.msg?.text ||
        msg.quoted.msg?.caption ||
        msg.quoted.msg?.conversation ||
        msg.quoted.msg?.contentText ||
        msg.quoted.msg?.selectedDisplayText ||
        msg.quoted.msg?.title ||
        ''

      msg.quoted.body =
        msg.quoted.msg?.text ||
        msg.quoted.msg?.caption ||
        msg.quoted.message?.conversation ||
        msg.quoted.msg?.selectedButtonId ||
        msg.quoted.msg?.singleSelectReply
          ?.selectedRowId ||
        msg.quoted.msg?.selectedId ||
        msg.quoted.msg?.contentText ||
        msg.quoted.msg?.selectedDisplayText ||
        msg.quoted.msg?.title ||
        msg.quoted.msg?.name ||
        ''

      msg.quoted.mentionedJid =
        (
          msg.quoted.msg
            ?.contextInfo
            ?.mentionedJid ||
          msg.quoted.msg
            ?.contextInfo
            ?.mentionedJidAlt ||
          []
        )
          .map(
            resolveMentionJid
          )
          .filter(Boolean)

      msg.quoted.mentions =
        msg.quoted.mentionedJid

      msg.quoted.isGroup =
        msg.quoted.chat
          ?.endsWith(
            '@g.us'
          ) ||
        false

      let quotedPrefix = ''

      for (
        const prefix of
        activePrefixes
      ) {
        if (
          msg.quoted.body
            ?.startsWith(
              prefix
            )
        ) {
          quotedPrefix =
            prefix
          break
        }
      }

      msg.quoted.usedPrefix =
        quotedPrefix

      msg.quoted.command =
        msg.quoted.body
          ?.replace(
            msg.quoted.usedPrefix,
            ''
          )
          .trim()
          .split(/ +/)
          .shift() ||
        ''

      msg.quoted.isMedia =
        !!msg.quoted.msg
          ?.mimetype ||
        !!msg.quoted.msg
          ?.thumbnailDirectPath

      if (
        msg.quoted.isMedia
      ) {
        msg.quoted.fileSha256 =
          msg.quoted.msg
            ?.fileSha256 ||
          ''

        msg.quoted.mime =
          msg.quoted.msg
            ?.mimetype ||
          ''

        msg.quoted.size =
          msg.quoted.msg
            ?.fileLength ||
          0

        msg.quoted.height =
          msg.quoted.msg?.height ||
          ''

        msg.quoted.width =
          msg.quoted.msg?.width ||
          ''

        if (
          /webp/i.test(
            msg.quoted.mime
          )
        ) {
          msg.quoted.isAnimated =
            !!msg.quoted.msg
              ?.isAnimated
        }
      }

      msg.quoted.key = {
        remoteJid:
          msg.quoted.chat,
        participant:
          msg.quoted.senderRaw ||
          msg.quoted.sender,
        participantAlt:
          msg.quoted.senderRaw ||
          msg.quoted.sender,
        fromMe:
          msg.quoted.fromMe,
        id:
          msg.quoted.id
      }

      msg.quoted.fakeObj =
        proto.WebMessageInfo.fromObject(
          {
            key: {
              remoteJid:
                msg.quoted.chat,
              fromMe:
                msg.quoted.fromMe,
              id:
                msg.quoted.id,
              participant:
                msg.isGroup
                  ? (
                      msg.quoted.senderRaw ||
                      msg.quoted.sender
                    )
                  : undefined
            },
            message:
              msg.quoted.message,
            ...(msg.isGroup
              ? {
                  participant:
                    msg.quoted.senderRaw ||
                    msg.quoted.sender
                }
              : {})
          }
        )

      msg.getQuotedObj =
        async () => {
          if (
            !msg.quoted?.id
          ) {
            return false
          }

          const q =
            store
              ? await store
                  .loadMessage(
                    msg.chat,
                    msg.quoted.id
                  )
                  .catch(
                    () => null
                  )
              : null

          if (!q) {
            return msg.quoted.fakeObj
              ? smsg(
                  sock,
                  msg.quoted.fakeObj,
                  store
                )
              : false
          }

          return smsg(
            sock,
            q,
            store
          )
        }

      msg.quoted.download =
        () =>
          sock.downloadMediaMessage(
            msg.quoted
          )

      msg.quoted.delete =
        () =>
          sock.sendMessage(
            msg.quoted.chat,
            {
              delete: {
                remoteJid:
                  msg.quoted.chat,
                fromMe:
                  msg.quoted.fromMe,
                id:
                  msg.quoted.id,
                participant:
                  msg.quoted.senderRaw ||
                  msg.quoted.sender
              }
            }
          )
    }
  }

  msg.download =
    () =>
      sock.downloadMediaMessage(
        msg
      )

  msg.copy =
    () =>
      smsg(
        sock,
        proto.WebMessageInfo.fromObject(
          proto.WebMessageInfo.toObject(
            msg
          )
        ),
        store
      )

  msg.react =
    emoji =>
      sock.sendMessage(
        msg.chat,
        {
          react: {
            text: emoji,
            key: msg.key
          }
        }
      )

  msg.copyNForward = (
    jid = msg.chat,
    forceForward = false,
    options = {}
  ) =>
    sock.copyNForward
      ? sock.copyNForward(
          jid,
          msg,
          forceForward,
          options
        )
      : sock.sendMessage(
          jid,
          {
            forward: msg,
            forceForward
          },
          options
        )

  msg.reply =
    async (
      content,
      options = {}
    ) => {
      const quoted = msg
      const chat = msg.chat

      const ephemeralExpiration =
        options.ephemeralExpiration ??
        msg.expiration

      if (
        content &&
        typeof content ===
          'object' &&
        !Buffer.isBuffer(
          content
        )
      ) {
        return sock.sendMessage(
          chat,
          content,
          {
            ...options,
            quoted,
            ephemeralExpiration
          }
        )
      }

      if (
        Buffer.isBuffer(
          content
        )
      ) {
        return sock.sendFile(
          chat,
          content,
          'file',
          '',
          quoted,
          false,
          options
        )
      }

      if (
        typeof content !==
        'string'
      ) {
        return sock.sendMessage(
          chat,
          {
            text: String(
              content ?? ''
            )
          },
          {
            ...options,
            quoted,
            ephemeralExpiration
          }
        )
      }

      try {
        if (
          /^https?:\/\//i.test(
            content
          )
        ) {
          const data =
            await axios.get(
              content,
              {
                responseType:
                  'arraybuffer',
                timeout: 30_000
              }
            )

          const detected =
            await FileType.fromBuffer(
              data.data
            )

          const mime =
            data.headers?.[
              'content-type'
            ] ||
            detected?.mime ||
            ''

          if (
            /gif|image|video|audio|pdf/i.test(
              mime
            )
          ) {
            if (
              typeof sock.sendMedia ===
              'function'
            ) {
              return sock.sendMedia(
                chat,
                data.data,
                '',
                '',
                quoted,
                content,
                options
              )
            }

            return sock.sendFile(
              chat,
              data.data,
              'file',
              '',
              quoted,
              false,
              {
                ...options,
                mimetype: mime
              }
            )
          }
        }
      } catch {}

      return sock.sendMessage(
        chat,
        {
          text: content,
          ...options
        },
        {
          quoted,
          ephemeralExpiration
        }
      )
    }

  if (!sock.parseMention) {
    sock.parseMention =
      async text => {
        if (!text) return []

        const mentions = [
          ...String(
            text
          ).matchAll(
            /@([0-9]{4,16})/g
          )
        ]

        return [
          ...new Set(
            mentions.map(
              match =>
                `${match[1]}@s.whatsapp.net`
            )
          )
        ]
      }
  }

  if (!sock.sendImageAsSticker) {
    sock.sendImageAsSticker =
      async (
        jid,
        p,
        quoted,
        options = {}
      ) => {
        const buff =
          Buffer.isBuffer(p)
            ? p
            : /^data:.*?\/.*?;base64,/i.test(
                p
              )
              ? Buffer.from(
                  p.split(',')[1],
                  'base64'
                )
              : /^https?:\/\//i.test(
                  p
                )
                ? await getBuffer(p)
                : fs.existsSync(p)
                  ? fs.readFileSync(p)
                  : Buffer.alloc(0)

        if (!buff.length) {
          throw new Error(
            'Imagen inválida o vacía'
          )
        }

        const buffer =
          options?.packname ||
          options?.author
            ? await writeExifImg(
                buff,
                options
              )
            : await imageToWebp(
                buff
              )

        await sock.sendMessage(
          jid,
          {
            sticker: {
              url: buffer
            }
          },
          {
            quoted
          }
        )

        return buffer
      }
  }

  if (!sock.sendVideoAsSticker) {
    sock.sendVideoAsSticker =
      async (
        jid,
        p,
        quoted,
        options = {}
      ) => {
        const buff =
          Buffer.isBuffer(p)
            ? p
            : /^data:.*?\/.*?;base64,/i.test(
                p
              )
              ? Buffer.from(
                  p.split(',')[1],
                  'base64'
                )
              : /^https?:\/\//i.test(
                  p
                )
                ? await getBuffer(p)
                : fs.existsSync(p)
                  ? fs.readFileSync(p)
                  : Buffer.alloc(0)

        if (!buff.length) {
          throw new Error(
            'Video inválido o vacío'
          )
        }

        const buffer =
          options?.packname ||
          options?.author
            ? await writeExifVid(
                buff,
                options
              )
            : await videoToWebp(
                buff
              )

        await sock.sendMessage(
          jid,
          {
            sticker: {
              url: buffer
            }
          },
          {
            quoted
          }
        )

        return buffer
      }
  }

  if (!sock.sendFile) {
    sock.sendFile =
      async (
        jid,
        p,
        filename = 'file',
        caption = '',
        quoted = null,
        ptt = false,
        options = {}
      ) => {
        let buffer

        if (
          Buffer.isBuffer(p)
        ) {
          buffer = p
        } else if (
          typeof p ===
            'string' &&
          /^https?:\/\//i.test(
            p
          )
        ) {
          buffer =
            await getBuffer(p)
        } else if (
          typeof p ===
            'string' &&
          fs.existsSync(p)
        ) {
          buffer =
            fs.readFileSync(p)
        } else {
          throw new Error(
            'Ruta o buffer inválido'
          )
        }

        const type =
          (await FileType.fromBuffer(
            buffer
          )) || {
            mime:
              options.mimetype ||
              'application/octet-stream',
            ext: 'bin'
          }

        const mimetype =
          options.mimetype ||
          type.mime

        let mtype =
          'document'

        if (
          options.asSticker ||
          /webp/i.test(
            type.mime
          )
        ) {
          mtype = 'sticker'
        } else if (
          options.asImage ||
          /image/i.test(
            type.mime
          )
        ) {
          mtype = 'image'
        } else if (
          options.asVideo ||
          /video/i.test(
            type.mime
          )
        ) {
          mtype = 'video'
        } else if (
          /audio/i.test(
            type.mime
          )
        ) {
          mtype = 'audio'
        }

        if (
          options.asDocument
        ) {
          mtype =
            'document'
        }

        const clean = {
          ...options
        }

        ;[
          'asDocument',
          'asSticker',
          'asImage',
          'asVideo'
        ].forEach(
          key =>
            delete clean[key]
        )

        return sock.sendMessage(
          jid,
          {
            ...clean,
            caption,
            ptt,
            [mtype]:
              buffer,
            mimetype,
            fileName:
              filename
          },
          {
            quoted
          }
        )
      }
  }

  if (!sock.reply) {
    sock.reply =
      async (
        jid,
        text = '',
        quoted,
        options = {}
      ) => {
        if (
          Buffer.isBuffer(
            text
          )
        ) {
          return sock.sendFile(
            jid,
            text,
            'file',
            '',
            quoted,
            false,
            options
          )
        }

        if (
          text &&
          typeof text ===
            'object'
        ) {
          return sock.sendMessage(
            jid,
            text,
            {
              ...options,
              quoted
            }
          )
        }

        return sock.sendMessage(
          jid,
          {
            ...options,
            text: String(
              text ?? ''
            )
          },
          {
            quoted
          }
        )
      }
  }

  return msg
}