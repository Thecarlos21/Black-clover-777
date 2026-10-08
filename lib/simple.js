import path from 'path'
import { toAudio } from './converter.js'
import chalk from 'chalk'
import fetch from 'node-fetch'
import PhoneNumber from 'awesome-phonenumber'
import fs from 'fs'
import util from 'util'
import { fileTypeFromBuffer } from 'file-type'
import { format } from 'util'
import { fileURLToPath } from 'url'
import store from './store.js'
import pino from 'pino'
import * as baileys from '@whiskeysockets/baileys'
import { randomBytes } from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const {
    makeWASocket: _makeWaSocket,
    makeWALegacySocket,
    proto,
    downloadContentFromMessage,
    jidDecode,
    areJidsSameUser,
    generateWAMessage,
    generateForwardMessageContent,
    generateWAMessageFromContent,
    WAMessageStubType,
    extractMessageContent,
    prepareWAMessageMedia,
} = baileys

const S_WHATSAPP_NET = 's.whatsapp.net'

const normalizeJidValue = jid => {
    if (!jid) return ''
    if (typeof jid !== 'string') jid = String(jid)

    jid = jid.trim()
    if (!jid) return ''

    if (jid.includes('@')) {
        const [user, server] = jid.split('@')
        if (!user || !server) return jid

        if (
            server === 'g.us' ||
            server === 'broadcast' ||
            server === 'newsletter' ||
            server === 'lid'
        ) {
            return `${user}@${server}`
        }

        if (server === 's.whatsapp.net') {
            return `${user.split(':')[0]}@s.whatsapp.net`
        }

        return `${user.split(':')[0]}@${server}`
    }

    const number = jid.replace(/\D/g, '')
    return number ? `${number}@s.whatsapp.net` : jid
}

const decodeJidValue = jid => {
    if (!jid || typeof jid !== 'string') return jid || ''

    jid = jid.trim()

    if (!jid.includes('@')) {
        const number = jid.replace(/\D/g, '')
        return number ? `${number}@s.whatsapp.net` : jid
    }

    if (
        jid.endsWith('@lid') ||
        jid.endsWith('@g.us') ||
        jid.endsWith('@broadcast') ||
        jid.endsWith('@newsletter')
    ) {
        return jid
    }

    try {
        const decoded = jidDecode(jid)

        if (decoded?.user && decoded?.server) {
            return `${decoded.user}@${decoded.server}`
        }
    } catch {}

    return normalizeJidValue(jid)
}

const getParticipantNumber = participant => {
    if (!participant) return ''

    const values = [
        participant.phoneNumber,
        participant.pn,
        participant.senderPn,
        participant.participantPn,
        participant.jid,
        participant.wid,
        participant.id
    ].filter(Boolean)

    for (const value of values) {
        const str = String(value)

        if (
            str.endsWith('@s.whatsapp.net') ||
            (!str.includes('@') && /^\+?\d{5,20}$/.test(str))
        ) {
            const number = str.split('@')[0].replace(/\D/g, '')

            if (number.length >= 5 && number.length <= 20) {
                return number
            }
        }
    }

    return ''
}

const findParticipantByJid = (participants = [], jid = '') => {
    if (!jid) return null

    const input = String(jid)
    const inputUser = input.split('@')[0]

    for (const participant of participants) {
        const candidates = [
            participant?.id,
            participant?.jid,
            participant?.wid,
            participant?.lid,
            participant?.phoneNumber,
            participant?.pn
        ].filter(Boolean)

        for (const candidate of candidates) {
            if (String(candidate).split('@')[0] === inputUser) {
                return participant
            }
        }
    }

    return null
}

export function makeWASocket(connectionOptions, options = {}) {
    const conn = (global.opts?.legacy && makeWALegacySocket ? makeWALegacySocket : _makeWaSocket)(
        connectionOptions
    )

    const sock = Object.defineProperties(conn, {
        chats: {
            value: {
                ...(options.chats || {})
            },
            writable: true,
        },

        decodeJid: {
            value(jid) {
                return decodeJidValue(jid)
            },
            enumerable: true,
        },

        logger: {
            get() {
                return {
                    info() {},
                    error() {},
                    warn() {},
                    trace() {},
                    debug() {}
                }
            },
            enumerable: true,
        },

        sendSylph: {
            async value(jid, text = '', buffer, title, body, url, quoted, options = {}) {
                if (buffer) {
                    try {
                        const type = await conn.getFile(buffer)
                        buffer = type.data
                    } catch {}
                }

                const prep = generateWAMessageFromContent(
                    jid,
                    {
                        extendedTextMessage: {
                            text,
                            contextInfo: {
                                externalAdReply: {
                                    title,
                                    body,
                                    thumbnail: buffer,
                                    sourceUrl: url
                                },
                                mentionedJid: conn.parseMention(text)
                            }
                        }
                    },
                    {
                        quoted
                    }
                )

                return conn.relayMessage(
                    jid,
                    prep.message,
                    {
                        messageId: prep.key.id,
                        ...options
                    }
                )
            }
        },

        sendSylphy: {
            async value(jid, medias, options = {}) {
                if (typeof jid !== 'string') {
                    throw new TypeError(`jid must be string, received: ${jid}`)
                }

                if (!Array.isArray(medias)) {
                    throw new TypeError('medias must be an array')
                }

                for (const media of medias) {
                    if (!media.type || !['image', 'video'].includes(media.type)) {
                        throw new TypeError(`media.type must be "image" or "video", received: ${media.type}`)
                    }

                    if (!media.data || (!media.data.url && !Buffer.isBuffer(media.data))) {
                        throw new TypeError('media.data must contain url or Buffer')
                    }
                }

                if (medias.length < 2) {
                    throw new RangeError('Minimum 2 media')
                }

                const msgDelay = !isNaN(options.delay) ? options.delay : 500
                delete options.delay

                const album = generateWAMessageFromContent(
                    jid,
                    {
                        messageContextInfo: {},
                        albumMessage: {
                            expectedImageCount: medias.filter(media => media.type === 'image').length,
                            expectedVideoCount: medias.filter(media => media.type === 'video').length,
                            ...(options.quoted
                                ? {
                                    contextInfo: {
                                        remoteJid: options.quoted.key.remoteJid,
                                        fromMe: options.quoted.key.fromMe,
                                        stanzaId: options.quoted.key.id,
                                        participant: options.quoted.key.participant || options.quoted.key.remoteJid,
                                        quotedMessage: options.quoted.message
                                    }
                                }
                                : {})
                        }
                    },
                    {}
                )

                await conn.relayMessage(
                    album.key.remoteJid,
                    album.message,
                    {
                        messageId: album.key.id
                    }
                )

                for (const media of medias) {
                    const { type, data, caption } = media

                    const message = await generateWAMessage(
                        album.key.remoteJid,
                        {
                            [type]: data,
                            caption: caption || ''
                        },
                        {
                            upload: conn.waUploadToServer
                        }
                    )

                    message.message.messageContextInfo = {
                        messageAssociation: {
                            associationType: 1,
                            parentMessageKey: album.key
                        }
                    }

                    await conn.relayMessage(
                        message.key.remoteJid,
                        message.message,
                        {
                            messageId: message.key.id
                        }
                    )

                    await new Promise(resolve => setTimeout(resolve, msgDelay))
                }

                return album
            }
        },

        sendNyanCat: {
            async value(jid, text = '', buffer, title, body, url, quoted, options = {}) {
                if (buffer) {
                    try {
                        const type = await conn.getFile(buffer)
                        buffer = type.data
                    } catch {}
                }

                const prep = generateWAMessageFromContent(
                    jid,
                    {
                        extendedTextMessage: {
                            text,
                            contextInfo: {
                                externalAdReply: {
                                    title,
                                    body,
                                    thumbnail: buffer,
                                    sourceUrl: url
                                },
                                mentionedJid: conn.parseMention(text)
                            }
                        }
                    },
                    {
                        quoted
                    }
                )

                return conn.relayMessage(
                    jid,
                    prep.message,
                    {
                        messageId: prep.key.id,
                        ...options
                    }
                )
            }
        },

        sendPayment: {
            async value(jid, amount, text, quoted, options = {}) {
                return conn.relayMessage(
                    jid,
                    {
                        requestPaymentMessage: {
                            currencyCodeIso4217: 'PEN',
                            amount1000: amount,
                            requestFrom: null,
                            noteMessage: {
                                extendedTextMessage: {
                                    text,
                                    contextInfo: {
                                        externalAdReply: {
                                            showAdAttribution: true
                                        },
                                        mentionedJid: conn.parseMention(text)
                                    }
                                }
                            }
                        }
                    },
                    {
                        ...options,
                        quoted
                    }
                )
            }
        },

        getFile: {
            async value(PATH, saveToFile = false) {
                let res
                let filename
                let data

                if (Buffer.isBuffer(PATH)) {
                    data = PATH
                } else if (PATH instanceof ArrayBuffer) {
                    data = Buffer.from(PATH)
                } else if (typeof PATH === 'string' && /^data:.*?\/.*?;base64,/i.test(PATH)) {
                    data = Buffer.from(PATH.split(',')[1], 'base64')
                } else if (typeof PATH === 'string' && /^https?:\/\//i.test(PATH)) {
                    res = await fetch(PATH)

                    if (!res.ok) {
                        throw new Error(`HTTP ${res.status}: ${res.statusText}`)
                    }

                    data = Buffer.from(await res.arrayBuffer())
                } else if (typeof PATH === 'string' && fs.existsSync(PATH)) {
                    filename = PATH
                    data = await fs.promises.readFile(PATH)
                } else if (typeof PATH === 'string') {
                    data = Buffer.from(PATH)
                } else {
                    data = Buffer.alloc(0)
                }

                if (!Buffer.isBuffer(data)) {
                    throw new TypeError('Result is not a buffer')
                }

                const type = (await fileTypeFromBuffer(data)) || {
                    mime: 'application/octet-stream',
                    ext: 'bin'
                }

                if (data && saveToFile && !filename) {
                    const tmpDir = path.join(__dirname, '../tmp')

                    await fs.promises.mkdir(tmpDir, {
                        recursive: true
                    })

                    filename = path.join(
                        tmpDir,
                        `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${type.ext}`
                    )

                    await fs.promises.writeFile(filename, data)
                }

                return {
                    res,
                    filename,
                    ...type,
                    data,
                    deleteFile() {
                        return filename && fs.promises.unlink(filename).catch(() => {})
                    }
                }
            },
            enumerable: true
        },

        waitEvent: {
            value(eventName, is = () => true, maxTries = 25) {
                return new Promise((resolve, reject) => {
                    let tries = 0

                    const on = (...args) => {
                        if (++tries > maxTries) {
                            conn.ev.off(eventName, on)
                            reject(new Error('Max tries reached'))
                            return
                        }

                        if (is(...args)) {
                            conn.ev.off(eventName, on)
                            resolve(args.length <= 1 ? args[0] : args)
                        }
                    }

                    conn.ev.on(eventName, on)
                })
            }
        },

        relayWAMessage: {
            async value(message) {
                const result = await conn.relayMessage(
                    message.key.remoteJid,
                    message.message,
                    {
                        messageId: message.key.id
                    }
                )

                conn.ev.emit('messages.upsert', {
                    messages: [message],
                    type: 'append'
                })

                return result
            }
        },

        sendFile: {
            async value(jid, filePath, filename = '', caption = '', quoted, ptt = false, options = {}) {
                const type = await conn.getFile(filePath, true)

                let {
                    res,
                    data: file,
                    filename: pathFile
                } = type

                if ((res && !res.ok) || file.length <= 65536) {
                    try {
                        const json = JSON.parse(file.toString())
                        throw json
                    } catch (e) {
                        if (e && typeof e === 'object' && !(e instanceof SyntaxError)) {
                            throw e
                        }
                    }
                }

                const opt = quoted ? { quoted } : {}

                let mtype = ''
                let mimetype = options.mimetype || type.mime
                let convert

                if (/webp/i.test(type.mime) || (/image/i.test(type.mime) && options.asSticker)) {
                    mtype = 'sticker'
                } else if (/image/i.test(type.mime) || (/webp/i.test(type.mime) && options.asImage)) {
                    mtype = 'image'
                } else if (/video/i.test(type.mime)) {
                    mtype = 'video'
                } else if (/audio/i.test(type.mime)) {
                    convert = await toAudio(file, type.ext)
                    file = convert.data
                    pathFile = convert.filename
                    mtype = 'audio'
                    mimetype = options.mimetype || 'audio/mpeg; codecs=opus'
                } else {
                    mtype = 'document'
                }

                if (options.asDocument) {
                    mtype = 'document'
                }

                delete options.asSticker
                delete options.asLocation
                delete options.asVideo
                delete options.asDocument
                delete options.asImage

                const message = {
                    ...options,
                    caption,
                    ptt,
                    [mtype]: {
                        url: pathFile
                    },
                    mimetype,
                    fileName: filename || path.basename(pathFile || `file.${type.ext}`)
                }

                let result

                try {
                    result = await conn.sendMessage(
                        jid,
                        message,
                        {
                            ...opt,
                            ...options
                        }
                    )
                } catch {
                    result = null
                }

                if (!result) {
                    result = await conn.sendMessage(
                        jid,
                        {
                            ...message,
                            [mtype]: file
                        },
                        {
                            ...opt,
                            ...options
                        }
                    )
                }

                if (pathFile && pathFile !== type.filename && type.filename) {
                    await fs.promises.unlink(pathFile).catch(() => {})
                }

                return result
            },
            enumerable: true
        },

        sendContact: {
            async value(jid, data, quoted, options) {
                if (!Array.isArray(data[0]) && typeof data[0] === 'string') data = [data]
                let contacts = []

                for (let [number, name] of data) {
                    number = number.replace(/[^0-9]/g, '')
                    let njid = number + '@s.whatsapp.net'
                    let biz = await conn.getBusinessProfile(njid).catch(_ => null) || {}

                    let vcard = `
BEGIN:VCARD
VERSION:3.0
N:;${name.replace(/\n/g, '\\n')};;;
FN:${name.replace(/\n/g, '\\n')}
TEL;type=CELL;type=VOICE;waid=${number}:${PhoneNumber('+' + number).getNumber('international')}${biz.description ? `
X-WA-BIZ-NAME:${(conn.chats[njid]?.vname || conn.getName(njid) || name).replace(/\n/, '\\n')}
X-WA-BIZ-DESCRIPTION:${biz.description.replace(/\n/g, '\\n')}
`.trim() : ''}
END:VCARD`.trim()

                    contacts.push({
                        vcard,
                        displayName: name
                    })
                }

                return await conn.sendMessage(
                    jid,
                    {
                        contacts: {
                            displayName: (contacts.length >= 2 ? `${contacts.length} contactos` : contacts[0].displayName) || null,
                            contacts
                        }
                    },
                    {
                        quoted,
                        ...options
                    }
                )
            },
            enumerable: true
        },

        reply: {
            async value(jid, text = '', quoted, options) {
                if (Buffer.isBuffer(text)) {
                    return conn.sendFile(jid, text, 'file', '', quoted, false, options)
                }

                const canalId = [
                    '120363419782804545@newsletter',
                    '120363419782804545@newsletter',
                    '120363419782804545@newsletter',
                    '120363419782804545@newsletter'
                ]

                const canalNombre = [
                    '⏤͟͞㋡ 𝐓𝐇𝐄 𝐋𝐄𝐆𝐄𝐍𝐃𝐒',
                    '⏤͟͞㋡ 𝐓𝐇𝐄 𝐋𝐄𝐆𝐄𝐍𝐃𝐒',
                    '—͟͟͞͞𖣘𝐓𝐡𝐞 𝐂𝐚𝐫𝐥𝐨𝐬 ㊗ ',
                    '𝕭𝖑𝖆𝖈𝖐 𝕮𝖑𝖔𝖛𝖊𝖗 | 𝕳𝖆𝖐 v777 🥷🏻'
                ]

                const randomIndex = Math.floor(Math.random() * canalId.length)

                const contextInfo = {
                    mentionedJid: await conn.parseMention(text),
                    isForwarded: true,
                    forwardingScore: 1,
                    forwardedNewsletterMessageInfo: {
                        newsletterJid: canalId[randomIndex],
                        newsletterName: canalNombre[randomIndex],
                        serverMessageId: 100
                    }
                }

                const messageOptions = {
                    ...options,
                    text,
                    contextInfo
                }

                return conn.sendMessage(
                    jid,
                    messageOptions,
                    {
                        quoted,
                        ...options
                    }
                )
            },
            enumerable: true
        },

        sendContactArray: {
            async value(jid, data, quoted, options) {
                if (!Array.isArray(data[0]) && typeof data[0] === 'string') data = [data]
                let contacts = []

                for (let [number, name, isi, isi1, isi2, isi3, isi4, isi5] of data) {
                    number = number.replace(/[^0-9]/g, '')
                    let njid = number + '@s.whatsapp.net'
                    let biz = await conn.getBusinessProfile(njid).catch(_ => null) || {}

                    let vcard = `
BEGIN:VCARD
VERSION:3.0
N:Sy;Bot;;;
FN:${name.replace(/\n/g, '\\n')}
item.ORG:${isi}
item1.TEL;waid=${number}:${PhoneNumber('+' + number).getNumber('international')}
item1.X-ABLabel:${isi1}
item2.EMAIL;type=INTERNET:${isi2}
item2.X-ABLabel:📧 Email
item3.ADR:;;${isi3};;;;
item3.X-ABADR:ac
item3.X-ABLabel:📍 Region
item4.URL:${isi4}
item4.X-ABLabel:Website
item5.X-ABLabel:${isi5}
END:VCARD`.trim()

                    contacts.push({
                        vcard,
                        displayName: name
                    })
                }

                return await conn.sendMessage(
                    jid,
                    {
                        contacts: {
                            displayName: (contacts.length > 1 ? `${contacts.length} contactos` : contacts[0].displayName) || null,
                            contacts
                        }
                    },
                    {
                        quoted,
                        ...options
                    }
                )
            },
            enumerable: true
        },

        sendButton: {
            async value(jid, text = '', footer = '', buffer, buttons = [], copy, urls, quoted, options = {}) {
                let imageMessage
                let videoMessage

                if (buffer) {
                    try {
                        if (typeof buffer === 'string' && /^https?:\/\//i.test(buffer)) {
                            const res = await fetch(buffer)

                            if (res.ok) {
                                const mime = res.headers.get('content-type') || ''

                                if (/^image\//i.test(mime)) {
                                    const prepared = await prepareWAMessageMedia(
                                        {
                                            image: {
                                                url: buffer
                                            }
                                        },
                                        {
                                            upload: conn.waUploadToServer
                                        }
                                    )

                                    imageMessage = prepared.imageMessage
                                } else if (/^video\//i.test(mime)) {
                                    const prepared = await prepareWAMessageMedia(
                                        {
                                            video: {
                                                url: buffer
                                            }
                                        },
                                        {
                                            upload: conn.waUploadToServer
                                        }
                                    )

                                    videoMessage = prepared.videoMessage
                                }
                            }
                        } else {
                            const type = await conn.getFile(buffer)

                            if (/^image\//i.test(type.mime)) {
                                const prepared = await prepareWAMessageMedia(
                                    {
                                        image: type.data
                                    },
                                    {
                                        upload: conn.waUploadToServer
                                    }
                                )

                                imageMessage = prepared.imageMessage
                            } else if (/^video\//i.test(type.mime)) {
                                const prepared = await prepareWAMessageMedia(
                                    {
                                        video: type.data
                                    },
                                    {
                                        upload: conn.waUploadToServer
                                    }
                                )

                                videoMessage = prepared.videoMessage
                            }
                        }
                    } catch {}
                }

                const nativeButtons = []

                for (const btn of Array.isArray(buttons) ? buttons : []) {
                    if (Array.isArray(btn)) {
                        nativeButtons.push({
                            name: 'quick_reply',
                            buttonParamsJson: JSON.stringify({
                                display_text: String(btn[0] || 'Aceptar'),
                                id: String(btn[1] || btn[0] || '')
                            })
                        })
                        continue
                    }

                    if (!btn || typeof btn !== 'object') continue

                    if (btn.type === 'url' || btn.url) {
                        nativeButtons.push({
                            name: 'cta_url',
                            buttonParamsJson: JSON.stringify({
                                display_text: String(btn.text || btn.display_text || 'Abrir'),
                                url: String(btn.url),
                                merchant_url: String(btn.merchant_url || btn.url)
                            })
                        })
                        continue
                    }

                    if (btn.type === 'copy' || btn.copy) {
                        nativeButtons.push({
                            name: 'cta_copy',
                            buttonParamsJson: JSON.stringify({
                                display_text: String(btn.text || btn.display_text || 'Copiar'),
                                copy_code: String(btn.copy || btn.code || '')
                            })
                        })
                        continue
                    }

                    nativeButtons.push({
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: String(btn.text || btn.display_text || 'Aceptar'),
                            id: String(btn.id || btn.command || btn.text || '')
                        })
                    })
                }

                if (copy) {
                    nativeButtons.push({
                        name: 'cta_copy',
                        buttonParamsJson: JSON.stringify({
                            display_text: 'Copiar',
                            copy_code: String(copy)
                        })
                    })
                }

                if (Array.isArray(urls)) {
                    for (const url of urls) {
                        if (!Array.isArray(url) || !url[1]) continue

                        nativeButtons.push({
                            name: 'cta_url',
                            buttonParamsJson: JSON.stringify({
                                display_text: String(url[0] || 'Abrir'),
                                url: String(url[1]),
                                merchant_url: String(url[1])
                            })
                        })
                    }
                }

                const interactiveMessage = {
                    body: {
                        text: String(text || '')
                    },
                    footer: {
                        text: String(footer || '')
                    },
                    header: {
                        title: '',
                        hasMediaAttachment: Boolean(imageMessage || videoMessage),
                        ...(imageMessage ? { imageMessage } : {}),
                        ...(videoMessage ? { videoMessage } : {})
                    },
                    nativeFlowMessage: {
                        buttons: nativeButtons,
                        messageParamsJson: ''
                    }
                }

                const content = {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadataVersion: 2,
                                deviceListMetadata: {}
                            },
                            interactiveMessage
                        }
                    }
                }

                const msg = generateWAMessageFromContent(
                    jid,
                    content,
                    {
                        quoted,
                        userJid: conn.user?.jid,
                        ...options
                    }
                )

                return conn.relayMessage(
                    jid,
                    msg.message,
                    {
                        messageId: msg.key.id,
                        ...options
                    }
                )
            },
            enumerable: true
        },

        sendList: {
            async value(jid, title, text, buttonText, listSections = [], quoted, options = {}) {
                const sections = Array.isArray(listSections)
                    ? listSections
                    : []

                const content = {
                    viewOnceMessage: {
                        message: {
                            messageContextInfo: {
                                deviceListMetadataVersion: 2,
                                deviceListMetadata: {}
                            },
                            interactiveMessage: {
                                header: {
                                    title: String(title || '')
                                },
                                body: {
                                    text: String(text || '')
                                },
                                nativeFlowMessage: {
                                    buttons: [
                                        {
                                            name: 'single_select',
                                            buttonParamsJson: JSON.stringify({
                                                title: String(buttonText || 'Seleccionar'),
                                                sections
                                            })
                                        }
                                    ],
                                    messageParamsJson: ''
                                }
                            }
                        }
                    }
                }

                const msg = generateWAMessageFromContent(
                    jid,
                    content,
                    {
                        quoted,
                        userJid: conn.user?.jid,
                        ...options
                    }
                )

                return conn.relayMessage(
                    jid,
                    msg.message,
                    {
                        messageId: msg.key.id,
                        ...options
                    }
                )
            },
            enumerable: true
        },

        sendEvent: {
            async value(jid, text, des, loc, link, options = {}) {
                const msg = generateWAMessageFromContent(
                    jid,
                    {
                        messageContextInfo: {
                            messageSecret: randomBytes(32)
                        },
                        eventMessage: {
                            isCanceled: false,
                            name: text,
                            description: des,
                            location: {
                                degreesLatitude: 0,
                                degreesLongitude: 0,
                                name: loc
                            },
                            joinLink: link,
                            startTime: Date.now()
                        }
                    },
                    {
                        userJid: conn.user?.jid,
                        ...options
                    }
                )

                return conn.relayMessage(
                    jid,
                    msg.message,
                    {
                        messageId: msg.key.id,
                        ...options
                    }
                )
            },
            enumerable: true
        },

        sendPoll: {
            async value(jid, name = '', optiPoll = [], options = {}) {
                if (!Array.isArray(optiPoll)) {
                    optiPoll = [optiPoll]
                }

                const pollMessage = {
                    name: String(name),
                    options: optiPoll.map(btn => ({
                        optionName: Array.isArray(btn)
                            ? String(btn[0] || '')
                            : String(btn || '')
                    })),
                    selectableOptionsCount: options.selectableOptionsCount || 1
                }

                return conn.relayMessage(
                    jid,
                    {
                        pollCreationMessage: pollMessage
                    },
                    options
                )
            },
            enumerable: true
        },

        cMod: {
            value(jid, message, text = '', sender = '', options = {}) {
                if (!message) return message

                if (!sender) {
                    sender = conn.user?.jid || conn.user?.id || ''
                }

                if (options.mentions && !Array.isArray(options.mentions)) {
                    options.mentions = [options.mentions]
                }

                const copy = proto.WebMessageInfo.toObject(
                    proto.WebMessageInfo.fromObject(message)
                )

                if (!copy.message) return message

                delete copy.message.messageContextInfo
                delete copy.message.senderKeyDistributionMessage

                const mtype = Object.keys(copy.message)[0]

                if (!mtype) return message

                const msg = copy.message
                const content = msg[mtype]

                if (typeof content === 'string') {
                    msg[mtype] = text || content
                } else if (content?.caption) {
                    content.caption = text || content.caption
                } else if (content?.text) {
                    content.text = text || content.text
                }

                if (typeof content !== 'string' && content) {
                    msg[mtype] = {
                        ...content,
                        ...options,
                        contextInfo: {
                            ...(content.contextInfo || {}),
                            mentionedJid: options.mentions || content.contextInfo?.mentionedJid || []
                        }
                    }
                }

                if (copy.participant) {
                    copy.participant = sender || copy.participant
                } else if (copy.key?.participant) {
                    copy.key.participant = sender || copy.key.participant
                }

                if (copy.key?.remoteJid?.endsWith('@s.whatsapp.net')) {
                    sender = sender || copy.key.remoteJid
                } else if (copy.key?.remoteJid?.endsWith('@broadcast')) {
                    sender = sender || copy.key.remoteJid
                }

                copy.key.remoteJid = jid
                copy.key.fromMe = areJidsSameUser(
                    decodeJidValue(sender),
                    decodeJidValue(conn.user?.id || '')
                )

                return proto.WebMessageInfo.fromObject(copy)
            },
            enumerable: true
        },

        copyNForward: {
            async value(jid, message, forwardingScore = true, options = {}) {
                if (!message?.message) return null

                let vtype

                if (
                    options.readViewOnce &&
                    message.message.viewOnceMessage?.message
                ) {
                    vtype = Object.keys(message.message.viewOnceMessage.message)[0]

                    if (vtype) {
                        delete message.message.viewOnceMessage.message[vtype].viewOnce

                        message.message = proto.Message.fromObject(
                            JSON.parse(
                                JSON.stringify(
                                    message.message.viewOnceMessage.message
                                )
                            )
                        )
                    }
                }

                const mtype = Object.keys(message.message)[0]

                if (!mtype) return null

                let content = generateForwardMessageContent(
                    message,
                    !!forwardingScore
                )

                const ctype = Object.keys(content)[0]

                if (!ctype) return null

                if (
                    forwardingScore &&
                    typeof forwardingScore === 'number' &&
                    forwardingScore > 1
                ) {
                    content[ctype].contextInfo = {
                        ...(content[ctype].contextInfo || {}),
                        forwardingScore
                    }
                }

                content[ctype].contextInfo = {
                    ...(message.message[mtype].contextInfo || {}),
                    ...(content[ctype].contextInfo || {})
                }

                const msg = generateWAMessageFromContent(
                    jid,
                    content,
                    {
                        ...options,
                        userJid: conn.user?.jid
                    }
                )

                await conn.relayMessage(
                    jid,
                    msg.message,
                    {
                        messageId: msg.key.id
                    }
                )

                return msg
            },
            enumerable: true
        },

        fakeReply: {
            value(
                jid,
                text = '',
                fakeJid = conn.user?.jid,
                fakeText = '',
                fakeGroupJid,
                options = {}
            ) {
                return conn.reply(
                    jid,
                    text,
                    {
                        key: {
                            fromMe: areJidsSameUser(
                                fakeJid,
                                conn.user?.id
                            ),
                            participant: fakeJid,
                            ...(fakeGroupJid
                                ? {
                                    remoteJid: fakeGroupJid
                                }
                                : {})
                        },
                        message: {
                            conversation: fakeText
                        },
                        ...options
                    }
                )
            },
            enumerable: true
        },

        downloadM: {
            async value(m, type, saveToFile = false) {
                if (!m || (!m.url && !m.directPath)) {
                    return Buffer.alloc(0)
                }

                const stream = await downloadContentFromMessage(m, type)
                const chunks = []

                for await (const chunk of stream) {
                    chunks.push(chunk)
                }

                const buffer = Buffer.concat(chunks)

                if (saveToFile) {
                    const file = await conn.getFile(buffer, true)
                    return file.filename
                }

                return buffer
            },
            enumerable: true
        },

        parseMention: {
            value(text = '') {
                if (!text || typeof text !== 'string') return []

                const result = []
                const regex = /@(\d{5,20})/g
                let match

                while ((match = regex.exec(text))) {
                    const number = match[1]

                    if (number.length >= 5) {
                        result.push(`${number}@s.whatsapp.net`)
                    }
                }

                return [...new Set(result)]
            }
        },

        getName: {
            value(jid = '', withoutContact = false) {
                try {
                    if (
                        !jid ||
                        typeof jid !== 'string' ||
                        jid.includes('No SenderKeyRecord')
                    ) {
                        return ''
                    }

                    jid = conn.decodeJid(jid)
                    withoutContact = conn.withoutContact || withoutContact

                    if (jid.endsWith('@g.us')) {
                        return new Promise(async resolve => {
                            try {
                                let v = conn.chats[jid] || {}

                                if (!(v.name || v.subject)) {
                                    v = await conn.groupMetadata(jid).catch(() => ({}))
                                }

                                resolve(
                                    v.name ||
                                    v.subject ||
                                    jid
                                )
                            } catch {
                                resolve('')
                            }
                        })
                    }

                    const v =
                        jid === '0@s.whatsapp.net'
                            ? {
                                jid,
                                vname: 'WhatsApp'
                            }
                            : areJidsSameUser(jid, conn.user?.id)
                                ? conn.user
                                : conn.chats[jid] || {}

                    if (withoutContact) {
                        return v.vname ||
                            v.notify ||
                            v.verifiedName ||
                            jid.split('@')[0]
                    }

                    return (
                        v.name ||
                        v.subject ||
                        v.vname ||
                        v.notify ||
                        v.verifiedName ||
                        (jid.endsWith('@lid')
                            ? jid.split('@')[0]
                            : PhoneNumber(
                                `+${jid.replace('@s.whatsapp.net', '')}`
                            ).getNumber('international'))
                    )
                } catch {
                    return ''
                }
            }
        },

        loadMessage: {
            value(messageID, chatId) {
                if (!messageID) return null

                if (chatId && conn.chats[chatId]?.messages?.[messageID]) {
                    return conn.chats[chatId].messages[messageID]
                }

                for (const chat of Object.values(conn.chats || {})) {
                    if (!chat?.messages) continue

                    if (chat.messages[messageID]) {
                        return chat.messages[messageID]
                    }

                    for (const message of Object.values(chat.messages)) {
                        if (message?.key?.id === messageID) {
                            return message
                        }
                    }
                }

                return null
            },
            enumerable: true
        },

        sendGroupV4Invite: {
            async value(
                jid,
                participant,
                inviteCode,
                inviteExpiration,
                groupName = 'unknown subject',
                caption = 'Invitation to join my WhatsApp group',
                jpegThumbnail,
                options = {}
            ) {
                const msg = proto.Message.fromObject({
                    groupInviteMessage: proto.GroupInviteMessage.fromObject({
                        inviteCode,
                        inviteExpiration:
                            parseInt(inviteExpiration) ||
                            Date.now() + 3 * 86400000,
                        groupJid: jid,
                        groupName:
                            groupName ||
                            await conn.getName(jid) ||
                            null,
                        jpegThumbnail:
                            Buffer.isBuffer(jpegThumbnail)
                                ? jpegThumbnail
                                : null,
                        caption
                    })
                })

                const message = generateWAMessageFromContent(
                    participant,
                    msg,
                    {
                        ...options,
                        userJid: conn.user?.jid
                    }
                )

                await conn.relayMessage(
                    participant,
                    message.message,
                    {
                        messageId: message.key.id
                    }
                )

                return message
            },
            enumerable: true
        },

        processMessageStubType: {
            async value(m) {
                if (!m?.messageStubType) return

                const chat = conn.decodeJid(
                    m.key?.remoteJid ||
                    m.message?.senderKeyDistributionMessage?.groupId ||
                    ''
                )

                if (!chat || chat === 'status@broadcast') return

                const emitGroupUpdate = update => {
                    conn.ev.emit('groups.update', [
                        {
                            id: chat,
                            ...update
                        }
                    ])
                }

                switch (m.messageStubType) {
                    case WAMessageStubType.REVOKE:
                    case WAMessageStubType.GROUP_CHANGE_INVITE_LINK:
                        emitGroupUpdate({
                            revoke: m.messageStubParameters?.[0]
                        })
                        break

                    case WAMessageStubType.GROUP_CHANGE_ICON:
                        emitGroupUpdate({
                            icon: m.messageStubParameters?.[0]
                        })
                        break
                }

                if (!chat.endsWith('@g.us')) return

                let chats = conn.chats[chat]

                if (!chats) {
                    chats = conn.chats[chat] = {
                        id: chat
                    }
                }

                chats.isChats = true

                const metadata = await conn.groupMetadata(chat).catch(() => null)

                if (!metadata) return

                chats.subject = metadata.subject
                chats.metadata = metadata
            },
            enumerable: true
        },

        insertAllGroup: {
            async value() {
                const groups =
                    (await conn.groupFetchAllParticipating().catch(() => null)) || {}

                for (const group in groups) {
                    conn.chats[group] = {
                        ...(conn.chats[group] || {}),
                        id: group,
                        subject: groups[group].subject,
                        isChats: true,
                        metadata: groups[group]
                    }
                }

                return conn.chats
            },
            enumerable: true
        },

        pushMessage: {
            async value(m) {
                if (!m) return

                if (!Array.isArray(m)) {
                    m = [m]
                }

                for (const message of m) {
                    try {
                        if (!message) continue

                        if (
                            message.messageStubType &&
                            message.messageStubType !== WAMessageStubType.CIPHERTEXT
                        ) {
                            conn.processMessageStubType(message).catch(() => {})
                        }

                        const messageTypes = Object.keys(message.message || {})

                        const mtype =
                            (!['senderKeyDistributionMessage', 'messageContextInfo'].includes(messageTypes[0]) &&
                                messageTypes[0]) ||
                            (messageTypes.length >= 3 &&
                                messageTypes[1] !== 'messageContextInfo' &&
                                messageTypes[1]) ||
                            messageTypes[messageTypes.length - 1]

                        const chat = conn.decodeJid(
                            message.key?.remoteJid ||
                            message.message?.senderKeyDistributionMessage?.groupId ||
                            ''
                        )

                        if (
                            message.message?.[mtype]?.contextInfo?.quotedMessage
                        ) {
                            const context =
                                message.message[mtype].contextInfo

                            let participant = conn.decodeJid(
                                context.participantPn ||
                                context.senderPn ||
                                context.participantAlt ||
                                context.participant ||
                                ''
                            )

                            const remoteJid = conn.decodeJid(
                                context.remoteJid ||
                                chat ||
                                participant
                            )

                            const quoted = context.quotedMessage

                            if (
                                remoteJid &&
                                remoteJid !== 'status@broadcast' &&
                                quoted
                            ) {
                                let qMtype = Object.keys(quoted)[0]

                                if (qMtype === 'conversation') {
                                    quoted.extendedTextMessage = {
                                        text: quoted[qMtype]
                                    }

                                    delete quoted.conversation
                                    qMtype = 'extendedTextMessage'
                                }

                                if (!quoted[qMtype]?.contextInfo) {
                                    quoted[qMtype].contextInfo = {}
                                }

                                quoted[qMtype].contextInfo.mentionedJid =
                                    context.mentionedJid ||
                                    quoted[qMtype].contextInfo.mentionedJid ||
                                    []

                                const isGroup = remoteJid.endsWith('@g.us')

                                if (isGroup && !participant) {
                                    participant = remoteJid
                                }

                                const qM = {
                                    key: {
                                        remoteJid,
                                        fromMe: areJidsSameUser(
                                            conn.user?.jid,
                                            participant || remoteJid
                                        ),
                                        id: context.stanzaId,
                                        participant
                                    },
                                    message: JSON.parse(
                                        JSON.stringify(quoted)
                                    ),
                                    ...(isGroup
                                        ? {
                                            participant
                                        }
                                        : {})
                                }

                                const qChatId =
                                    isGroup
                                        ? participant || remoteJid
                                        : remoteJid

                                let qChats = conn.chats[qChatId]

                                if (!qChats) {
                                    qChats = conn.chats[qChatId] = {
                                        id: qChatId,
                                        isChats: !isGroup
                                    }
                                }

                                if (!qChats.messages) {
                                    qChats.messages = {}
                                }

                                if (
                                    context.stanzaId &&
                                    !qChats.messages[context.stanzaId] &&
                                    !qM.key.fromMe
                                ) {
                                    qChats.messages[context.stanzaId] = qM
                                }

                                const qMessages =
                                    Object.entries(qChats.messages)

                                if (qMessages.length > 40) {
                                    qChats.messages =
                                        Object.fromEntries(
                                            qMessages.slice(-30)
                                        )
                                }
                            }
                        }

                        if (!chat || chat === 'status@broadcast') {
                            continue
                        }

                        const isGroup = chat.endsWith('@g.us')

                        let chats = conn.chats[chat]

                        if (!chats) {
                            chats = conn.chats[chat] = {
                                id: chat,
                                isChats: true,
                                ...(conn.chats[chat] || {})
                            }
                        }

                        let metadata
                        let sender = ''

                        if (isGroup) {
                            if (!chats.subject || !chats.metadata) {
                                metadata =
                                    await conn.groupMetadata(chat).catch(() => ({}))

                                if (!chats.subject) {
                                    chats.subject =
                                        metadata.subject || ''
                                }

                                if (!chats.metadata) {
                                    chats.metadata = metadata
                                }
                            }

                            sender = conn.decodeJid(
                                message.key?.fromMe
                                    ? conn.user?.jid
                                    : message.key?.senderPn ||
                                      message.key?.participantAlt ||
                                      message.key?.participant ||
                                      message.participantPn ||
                                      message.participant ||
                                      chat
                            )

                            if (sender && sender !== chat) {
                                let senderChat = conn.chats[sender]

                                if (!senderChat) {
                                    senderChat = conn.chats[sender] = {
                                        id: sender
                                    }
                                }

                                if (!senderChat.name) {
                                    senderChat.name =
                                        message.pushName ||
                                        senderChat.name ||
                                        ''
                                }
                            }
                        } else if (!chats.name) {
                            chats.name =
                                message.pushName ||
                                chats.name ||
                                ''
                        }

                        if (
                            ['senderKeyDistributionMessage', 'messageContextInfo'].includes(
                                mtype
                            )
                        ) {
                            continue
                        }

                        chats.isChats = true

                        if (!chats.messages) {
                            chats.messages = {}
                        }

                        const fromMe =
                            message.key?.fromMe ||
                            areJidsSameUser(
                                sender || chat,
                                conn.user?.id
                            )

                        if (
                            !['protocolMessage'].includes(mtype) &&
                            !fromMe &&
                            message.messageStubType !== WAMessageStubType.CIPHERTEXT &&
                            message.message
                        ) {
                            delete message.message.messageContextInfo
                            delete message.message.senderKeyDistributionMessage

                            if (message.key?.id) {
                                chats.messages[message.key.id] =
                                    JSON.parse(
                                        JSON.stringify(message)
                                    )
                            }

                            const chatsMessages =
                                Object.entries(chats.messages)

                            if (chatsMessages.length > 40) {
                                chats.messages =
                                    Object.fromEntries(
                                        chatsMessages.slice(-30)
                                    )
                            }
                        }
                    } catch (e) {
                        console.error(e)
                    }
                }
            },
            enumerable: true
        },

        serializeM: {
            value(m) {
                return smsg(conn, m)
            },
            enumerable: true
        },

        ...(typeof conn.chatRead !== 'function'
            ? {
                chatRead: {
                    value(jid, participant = conn.user?.jid, messageID) {
                        if (!messageID) return

                        return conn.sendReadReceipt(
                            jid,
                            participant,
                            [messageID]
                        )
                    },
                    enumerable: true
                }
            }
            : {}),

        ...(typeof conn.setStatus !== 'function'
            ? {
                setStatus: {
                    value(status) {
                        return conn.query({
                            tag: 'iq',
                            attrs: {
                                to: S_WHATSAPP_NET,
                                type: 'set',
                                xmlns: 'status'
                            },
                            content: [
                                {
                                    tag: 'status',
                                    attrs: {},
                                    content: Buffer.from(
                                        String(status),
                                        'utf-8'
                                    )
                                }
                            ]
                        })
                    },
                    enumerable: true
                }
            }
            : {})
    })

    if (sock.user?.id) {
        sock.user.jid = sock.decodeJid(sock.user.id)
    }

    store.bind(sock)

    return sock
}

export function smsg(conn, m, hasParent) {
    if (!m) return m

    const M = proto.WebMessageInfo

    try {
        m = M.fromObject(m)
        m.conn = conn

        let protocolMessageKey

        if (m.message) {
            if (m.mtype === 'protocolMessage' && m.msg?.key) {
                protocolMessageKey = m.msg.key

                if (protocolMessageKey.remoteJid === 'status@broadcast') {
                    protocolMessageKey.remoteJid = m.chat || ''
                }

                if (
                    !protocolMessageKey.participant ||
                    protocolMessageKey.participant === 'status_me'
                ) {
                    protocolMessageKey.participant =
                        typeof m.sender === 'string'
                            ? m.sender
                            : ''
                }

                const decodedParticipant =
                    conn?.decodeJid?.(
                        protocolMessageKey.participant
                    ) || ''

                protocolMessageKey.fromMe =
                    areJidsSameUser(
                        decodedParticipant,
                        conn?.user?.id || ''
                    )

                if (
                    !protocolMessageKey.fromMe &&
                    protocolMessageKey.remoteJid ===
                        (conn?.user?.id || '')
                ) {
                    protocolMessageKey.remoteJid =
                        typeof m.sender === 'string'
                            ? m.sender
                            : ''
                }
            }

            if (m.quoted && !m.quoted.mediaMessage) {
                delete m.quoted.download
            }
        }

        if (!m.mediaMessage) {
            delete m.download
        }

        if (
            protocolMessageKey &&
            m.mtype === 'protocolMessage'
        ) {
            try {
                conn.ev.emit(
                    'message.delete',
                    protocolMessageKey
                )
            } catch {}
        }

        return m
    } catch (e) {
        console.error('Error en smsg:', e)
        return m
    }
}

export function serialize() {
    if (!proto?.WebMessageInfo) {
        console.error(
            'proto.WebMessageInfo no disponible, revisa Baileys'
        )
        return
    }

    const MediaType = [
        'imageMessage',
        'videoMessage',
        'audioMessage',
        'stickerMessage',
        'documentMessage'
    ]

    const properties = {
        conn: {
            value: undefined,
            enumerable: false,
            writable: true
        },

        id: {
            get() {
                return this.key?.id || ''
            },
            enumerable: true
        },

        isBaileys: {
            get() {
                const id = this.id || ''

                return Boolean(
                    (this.fromMe ||
                        areJidsSameUser(
                            this.conn?.user?.id,
                            this.sender
                        )) &&
                    id.startsWith('3EB0')
                )
            },
            enumerable: true
        },

        chat: {
            get() {
                const groupId =
                    this.message
                        ?.senderKeyDistributionMessage
                        ?.groupId

                const jid =
                    this.key?.remoteJid ||
                    (
                        groupId &&
                        groupId !== 'status@broadcast'
                            ? groupId
                            : ''
                    )

                return this.conn?.decodeJid
                    ? this.conn.decodeJid(jid || '')
                    : decodeJidValue(jid || '')
            },
            enumerable: true
        },

        isGroup: {
            get() {
                return (this.chat || '').endsWith('@g.us')
            },
            enumerable: true
        },

        sender: {
            get() {
                const raw =
                    this.key?.fromMe
                        ? this.conn?.user?.jid ||
                          this.conn?.user?.id ||
                          ''
                        : this.key?.participantAlt ||
                          this.key?.senderPn ||
                          this.key?.participantPn ||
                          this.key?.participant ||
                          this.participant ||
                          this.chat ||
                          ''

                return decodeJidValue(raw)
            },
            enumerable: true
        },

        fromMe: {
            get() {
                return Boolean(
                    this.key?.fromMe ||
                    areJidsSameUser(
                        this.conn?.user?.id,
                        this.sender
                    )
                )
            },
            enumerable: true
        },

        mtype: {
            get() {
                if (!this.message) return ''

                const type = Object.keys(this.message)

                return (
                    (![
                        'senderKeyDistributionMessage',
                        'messageContextInfo'
                    ].includes(type[0]) &&
                        type[0]) ||
                    (type.length >= 3 &&
                        type[1] !== 'messageContextInfo' &&
                        type[1]) ||
                    type[type.length - 1] ||
                    ''
                )
            },
            enumerable: true
        },

        msg: {
            get() {
                if (!this.message) return null
                return this.message[this.mtype]
            },
            enumerable: true
        },

        mediaMessage: {
            get() {
                if (!this.message) return null

                const Message =
                    (
                        this.msg?.url ||
                        this.msg?.directPath
                    )
                        ? { ...this.message }
                        : extractMessageContent(this.message)

                if (!Message) return null

                const mtype = Object.keys(Message)[0]

                return MediaType.includes(mtype)
                    ? Message
                    : null
            },
            enumerable: true
        },

        mediaType: {
            get() {
                const message = this.mediaMessage

                if (!message) return null

                return Object.keys(message)[0]
            },
            enumerable: true
        },

        quoted: {
            get() {
                const self = this
                const msg = self.msg
                const contextInfo = msg?.contextInfo
                const quoted = contextInfo?.quotedMessage

                if (!msg || !contextInfo || !quoted) {
                    return null
                }

                const type = Object.keys(quoted)[0]

                if (!type) return null

                const q = quoted[type]

                const text =
                    typeof q === 'string'
                        ? q
                        : q?.text

                const data = JSON.parse(
                    JSON.stringify(
                        typeof q === 'string'
                            ? { text: q }
                            : q || {}
                    )
                )

                return Object.defineProperties(
                    data,
                    {
                        mtype: {
                            get() {
                                return type
                            },
                            enumerable: true
                        },

                        mediaMessage: {
                            get() {
                                const Message =
                                    (
                                        q?.url ||
                                        q?.directPath
                                    )
                                        ? { ...quoted }
                                        : extractMessageContent(
                                            quoted
                                        )

                                if (!Message) return null

                                const mtype =
                                    Object.keys(Message)[0]

                                return MediaType.includes(
                                    mtype
                                )
                                    ? Message
                                    : null
                            },
                            enumerable: true
                        },

                        mediaType: {
                            get() {
                                const message =
                                    this.mediaMessage

                                if (!message) return null

                                return Object.keys(
                                    message
                                )[0]
                            },
                            enumerable: true
                        },

                        id: {
                            get() {
                                return (
                                    contextInfo.stanzaId ||
                                    ''
                                )
                            },
                            enumerable: true
                        },

                        chat: {
                            get() {
                                const jid =
                                    contextInfo.remoteJid ||
                                    self.chat ||
                                    ''

                                return self.conn?.decodeJid
                                    ? self.conn.decodeJid(jid)
                                    : decodeJidValue(jid)
                            },
                            enumerable: true
                        },

                        isBaileys: {
                            get() {
                                const id = this.id || ''

                                return Boolean(
                                    (
                                        this.fromMe ||
                                        areJidsSameUser(
                                            self.conn?.user?.id,
                                            this.sender
                                        )
                                    ) &&
                                    id.startsWith('3EB0')
                                )
                            },
                            enumerable: true
                        },

                        sender: {
                            get() {
                                const raw =
                                    contextInfo.participantPn ||
                                    contextInfo.senderPn ||
                                    contextInfo.participantAlt ||
                                    contextInfo.participant ||
                                    contextInfo.remoteJid ||
                                    self.chat ||
                                    ''

                                return self.conn?.decodeJid
                                    ? self.conn.decodeJid(raw)
                                    : decodeJidValue(raw)
                            },
                            enumerable: true
                        },

                        fromMe: {
                            get() {
                                return areJidsSameUser(
                                    this.sender,
                                    self.conn?.user?.jid ||
                                    self.conn?.user?.id ||
                                    ''
                                )
                            },
                            enumerable: true
                        },

                        text: {
                            get() {
                                return (
                                    text ||
                                    this.caption ||
                                    this.contentText ||
                                    this.selectedDisplayText ||
                                    ''
                                )
                            },
                            enumerable: true
                        },

                        mentionedJid: {
                            get() {
                                return (
                                    q?.contextInfo
                                        ?.mentionedJid ||
                                    []
                                )
                            },
                            enumerable: true
                        },

                        name: {
                            get() {
                                return this.sender
                                    ? self.conn?.getName(
                                          this.sender
                                      )
                                    : null
                            },
                            enumerable: true
                        },

                        vM: {
                            get() {
                                return proto.WebMessageInfo.fromObject({
                                    key: {
                                        fromMe:
                                            this.fromMe,
                                        remoteJid:
                                            this.chat,
                                        id: this.id,
                                        ...(self.isGroup
                                            ? {
                                                participant:
                                                    this.sender
                                            }
                                            : {})
                                    },
                                    message: quoted
                                })
                            },
                            enumerable: true
                        },

                        fakeObj: {
                            get() {
                                return this.vM
                            },
                            enumerable: true
                        },

                        download: {
                            value(saveToFile = false) {
                                const mtype =
                                    this.mediaType

                                if (
                                    !mtype ||
                                    !this.mediaMessage
                                ) {
                                    return Buffer.alloc(0)
                                }

                                return self.conn?.downloadM(
                                    this.mediaMessage[mtype],
                                    mtype.replace(
                                        /message/i,
                                        ''
                                    ),
                                    saveToFile
                                )
                            },
                            enumerable: true,
                            configurable: true
                        },

                        reply: {
                            value(
                                text,
                                chatId,
                                options
                            ) {
                                return self.conn?.reply(
                                    chatId || this.chat,
                                    text,
                                    this.vM,
                                    options
                                )
                            },
                            enumerable: true
                        },

                        copy: {
                            value() {
                                return smsg(
                                    self.conn,
                                    proto.WebMessageInfo.fromObject(
                                        proto.WebMessageInfo.toObject(
                                            this.vM
                                        )
                                    )
                                )
                            },
                            enumerable: true
                        },

                        forward: {
                            value(
                                jid,
                                force = false,
                                options = {}
                            ) {
                                return self.conn?.sendMessage(
                                    jid,
                                    {
                                        forward:
                                            this.vM,
                                        force,
                                        ...options
                                    },
                                    options
                                )
                            },
                            enumerable: true
                        },

                        copyNForward: {
                            value(
                                jid,
                                forceForward = false,
                                options = {}
                            ) {
                                return self.conn?.copyNForward(
                                    jid,
                                    this.vM,
                                    forceForward,
                                    options
                                )
                            },
                            enumerable: true
                        },

                        cMod: {
                            value(
                                jid,
                                text = '',
                                sender = this.sender,
                                options = {}
                            ) {
                                return self.conn?.cMod(
                                    jid,
                                    this.vM,
                                    text,
                                    sender,
                                    options
                                )
                            },
                            enumerable: true
                        },

                        delete: {
                            value() {
                                return self.conn?.sendMessage(
                                    this.chat,
                                    {
                                        delete:
                                            this.vM.key
                                    }
                                )
                            },
                            enumerable: true
                        },

                        react: {
                            value(text) {
                                return self.conn?.sendMessage(
                                    this.chat,
                                    {
                                        react: {
                                            text,
                                            key:
                                                this.vM.key
                                        }
                                    }
                                )
                            },
                            enumerable: true
                        }
                    }
                )
            },
            enumerable: true
        },

        _text: {
            value: null,
            writable: true,
            enumerable: false
        },

        text: {
            get() {
                const msg = this.msg

                const text =
                    (
                        typeof msg === 'string'
                            ? msg
                            : msg?.text
                    ) ||
                    msg?.caption ||
                    msg?.contentText ||
                    ''

                if (typeof this._text === 'string') {
                    return this._text
                }

                return (
                    text?.selectedDisplayText ||
                    text?.hydratedTemplate
                        ?.hydratedContentText ||
                    text ||
                    ''
                )
            },

            set(str) {
                this._text = str
            },

            enumerable: true
        },

        mentionedJid: {
            get() {
                return (
                    this.msg?.contextInfo
                        ?.mentionedJid || []
                )
            },
            enumerable: true
        },

        name: {
            get() {
                return (
                    this.pushName ||
                    this.conn?.getName(
                        this.sender
                    )
                )
            },
            enumerable: true
        },

        download: {
            value(saveToFile = false) {
                const mtype = this.mediaType

                if (
                    !mtype ||
                    !this.mediaMessage
                ) {
                    return Buffer.alloc(0)
                }

                return this.conn?.downloadM(
                    this.mediaMessage[mtype],
                    mtype.replace(
                        /message/i,
                        ''
                    ),
                    saveToFile
                )
            },
            enumerable: true,
            configurable: true
        },

        reply: {
            value(text, chatId, options) {
                return this.conn?.reply(
                    chatId || this.chat,
                    text,
                    this,
                    options
                )
            },
            enumerable: true
        },

        copy: {
            value() {
                return smsg(
                    this.conn,
                    proto.WebMessageInfo.fromObject(
                        proto.WebMessageInfo.toObject(
                            this
                        )
                    )
                )
            },
            enumerable: true
        },

        forward: {
            value(
                jid,
                force = false,
                options = {}
            ) {
                return this.conn?.sendMessage(
                    jid,
                    {
                        forward: this,
                        force,
                        ...options
                    },
                    options
                )
            },
            enumerable: true
        },

        copyNForward: {
            value(
                jid,
                forceForward = false,
                options = {}
            ) {
                return this.conn?.copyNForward(
                    jid,
                    this,
                    forceForward,
                    options
                )
            },
            enumerable: true
        },

        cMod: {
            value(
                jid,
                text = '',
                sender = this.sender,
                options = {}
            ) {
                return this.conn?.cMod(
                    jid,
                    this,
                    text,
                    sender,
                    options
                )
            },
            enumerable: true
        },

        getQuotedObj: {
            value() {
                if (!this.quoted?.id) {
                    return null
                }

                const loaded =
                    this.conn?.loadMessage(
                        this.quoted.id,
                        this.chat
                    )

                const raw =
                    loaded ||
                    this.quoted.vM

                if (!raw) {
                    return null
                }

                return smsg(
                    this.conn,
                    proto.WebMessageInfo.fromObject(
                        raw
                    )
                )
            },
            enumerable: true
        },

        getQuotedMessage: {
            get() {
                return this.getQuotedObj()
            },
            enumerable: true
        },

        delete: {
            value() {
                return this.conn?.sendMessage(
                    this.chat,
                    {
                        delete: this.key
                    }
                )
            },
            enumerable: true
        },

        react: {
            value(text) {
                return this.conn?.sendMessage(
                    this.chat,
                    {
                        react: {
                            text,
                            key: this.key
                        }
                    }
                )
            },
            enumerable: true
        }
    }

    return Object.defineProperties(
        proto.WebMessageInfo.prototype,
        properties
    )
}

export function logic(check, inp, out) {
    if (inp.length !== out.length) {
        throw new Error(
            'Input and Output must have same length'
        )
    }

    for (const i in inp) {
        if (
            util.isDeepStrictEqual(
                check,
                inp[i]
            )
        ) {
            return out[i]
        }
    }

    return null
}

export function protoType() {
    Buffer.prototype.toArrayBuffer =
        function toArrayBufferV2() {
            const ab =
                new ArrayBuffer(this.length)

            const view =
                new Uint8Array(ab)

            for (
                let i = 0;
                i < this.length;
                ++i
            ) {
                view[i] = this[i]
            }

            return ab
        }

    Buffer.prototype.toArrayBufferV2 =
        function toArrayBuffer() {
            return this.buffer.slice(
                this.byteOffset,
                this.byteOffset +
                    this.byteLength
            )
        }

    ArrayBuffer.prototype.toBuffer =
        function toBuffer() {
            return Buffer.from(
                new Uint8Array(this)
            )
        }

    Uint8Array.prototype.getFileType =
        ArrayBuffer.prototype.getFileType =
        Buffer.prototype.getFileType =
            async function getFileType() {
                return await fileTypeFromBuffer(
                    this
                )
            }

    String.prototype.isNumber =
        Number.prototype.isNumber =
            isNumber

    String.prototype.capitalize =
        function capitalize() {
            return (
                this.charAt(0).toUpperCase() +
                this.slice(1)
            )
        }

    String.prototype.capitalizeV2 =
        function capitalizeV2() {
            return this
                .split(' ')
                .map(v => v.capitalize())
                .join(' ')
        }

    String.prototype.resolveLidToRealJid =
        (function () {
            const lidCache = new Map()

            return async function (
                groupChatId,
                conn,
                maxRetries = 2,
                retryDelay = 1500
            ) {
                const inputJid =
                    this.toString().trim()

                if (
                    !inputJid.endsWith('@lid') ||
                    !groupChatId?.endsWith('@g.us')
                ) {
                    return inputJid.includes('@')
                        ? inputJid
                        : `${inputJid}@s.whatsapp.net`
                }

                if (lidCache.has(inputJid)) {
                    return lidCache.get(inputJid)
                }

                const lid =
                    inputJid.split('@')[0]

                for (
                    let attempt = 0;
                    attempt < maxRetries;
                    attempt++
                ) {
                    try {
                        const metadata =
                            await conn?.groupMetadata(
                                groupChatId
                            )

                        if (!metadata?.participants) {
                            throw new Error('No participants')
                        }

                        for (const participant of metadata.participants) {
                            const realNumber =
                                getParticipantNumber(participant)

                            if (realNumber) {
                                const candidateLid = [
                                    participant?.lid,
                                    participant?.id
                                ]
                                    .filter(Boolean)
                                    .find(value =>
                                        String(value).endsWith('@lid') &&
                                        String(value).split('@')[0] === lid
                                    )

                                if (candidateLid) {
                                    const real =
                                        `${realNumber}@s.whatsapp.net`

                                    lidCache.set(
                                        inputJid,
                                        real
                                    )

                                    return real
                                }
                            }

                            const candidates = [
                                participant?.id,
                                participant?.jid,
                                participant?.wid,
                                participant?.lid,
                                participant?.phoneNumber,
                                participant?.pn
                            ].filter(Boolean)

                            for (const candidate of candidates) {
                                if (
                                    String(candidate).split('@')[0] === lid
                                ) {
                                    const realNumber =
                                        getParticipantNumber(participant)

                                    if (realNumber) {
                                        const real =
                                            `${realNumber}@s.whatsapp.net`

                                        lidCache.set(
                                            inputJid,
                                            real
                                        )

                                        return real
                                    }

                                    lidCache.set(
                                        inputJid,
                                        candidate
                                    )

                                    return candidate
                                }

                                try {
                                    const checked =
                                        await conn?.onWhatsApp(candidate)

                                    const found =
                                        checked?.find(
                                            item =>
                                                item?.lid?.split('@')[0] === lid
                                        )

                                    if (found?.jid) {
                                        const real =
                                            decodeJidValue(found.jid)

                                        lidCache.set(
                                            inputJid,
                                            real
                                        )

                                        return real
                                    }
                                } catch {}
                            }
                        }

                        break
                    } catch {
                        if (attempt < maxRetries - 1) {
                            await new Promise(
                                resolve =>
                                    setTimeout(
                                        resolve,
                                        retryDelay
                                    )
                            )
                        }
                    }
                }

                lidCache.set(
                    inputJid,
                    inputJid
                )

                return inputJid
            }
        })()

    String.prototype.decodeJid =
        function decodeJid() {
            return decodeJidValue(
                this.toString()
            )
        }

    Number.prototype.toTimeString =
        function toTimeString() {
            const seconds = Math.floor(
                (this / 1000) % 60
            )

            const minutes = Math.floor(
                (this / (60 * 1000)) % 60
            )

            const hours = Math.floor(
                (this / (60 * 60 * 1000)) % 24
            )

            const days = Math.floor(
                this / (24 * 60 * 60 * 1000)
            )

            return (
                (days ? `${days} day(s) ` : '') +
                (hours ? `${hours} hour(s) ` : '') +
                (minutes ? `${minutes} minute(s) ` : '') +
                (seconds ? `${seconds} second(s)` : '')
            ).trim()
        }

    Number.prototype.getRandom =
        String.prototype.getRandom =
        Array.prototype.getRandom =
            getRandom
}

export async function parseUserTargets(
    m,
    text = '',
    participants = [],
    conn,
    options = {}
) {
    const targets = []

    const addTarget = value => {
        if (!value) return

        if (
            typeof value === 'string' &&
            value.includes('@')
        ) {
            const jid =
                value.endsWith('@lid') ||
                value.endsWith('@g.us') ||
                value.endsWith('@newsletter') ||
                value.endsWith('@broadcast')
                    ? value
                    : normalizeJidValue(value)

            if (jid) targets.push(jid)
            return
        }

        const number = String(value)
            .replace(/\D/g, '')

        if (
            number.length >= 5 &&
            number.length <= 20
        ) {
            targets.push(
                `${number}@s.whatsapp.net`
            )
        }
    }

    if (Array.isArray(m?._mentionedJidResolved)) {
        for (const target of m._mentionedJidResolved) {
            addTarget(target)
        }
    } else if (Array.isArray(m?.mentionedJid)) {
        for (const target of m.mentionedJid) {
            addTarget(target)
        }
    }

    if (m?.quoted?.sender) {
        addTarget(m.quoted.sender)
    }

    if (text?.trim()) {
        const matches =
            text.match(/@?(\d{5,20})/g) || []

        for (const match of matches) {
            addTarget(
                match.replace(/^@/, '')
            )
        }
    }

    let result = [
        ...new Set(
            targets.filter(Boolean)
        )
    ]

    if (
        Array.isArray(participants) &&
        participants.length
    ) {
        const map = new Map()

        for (const participant of participants) {
            const candidates = [
                participant?.id,
                participant?.jid,
                participant?.wid,
                participant?.lid,
                participant?.phoneNumber,
                participant?.pn
            ].filter(Boolean)

            const realNumber =
                getParticipantNumber(participant)

            for (const candidate of candidates) {
                const jid =
                    normalizeJidValue(candidate)

                if (!jid) continue

                const key =
                    jid.split('@')[0]

                if (!map.has(key)) {
                    map.set(
                        key,
                        realNumber
                            ? `${realNumber}@s.whatsapp.net`
                            : jid
                    )
                }
            }

            if (realNumber) {
                map.set(
                    realNumber,
                    `${realNumber}@s.whatsapp.net`
                )
            }
        }

        result = result
            .map(target => {
                const key =
                    target.split('@')[0]

                return (
                    map.get(key) ||
                    target
                )
            })
            .filter(Boolean)
    }

    if (
        options?.waCheck &&
        conn &&
        typeof conn.onWhatsApp === 'function'
    ) {
        const checked = []

        for (const target of result) {
            if (target.endsWith('@lid')) {
                try {
                    const response =
                        await conn.onWhatsApp(target)

                    const item = response?.[0]

                    if (item?.jid) {
                        checked.push(
                            decodeJidValue(item.jid)
                        )
                    } else {
                        checked.push(target)
                    }
                } catch {
                    checked.push(target)
                }

                continue
            }

            try {
                const response =
                    await conn.onWhatsApp(target)

                const item =
                    response?.[0]

                if (item?.jid) {
                    checked.push(
                        decodeJidValue(item.jid)
                    )
                } else {
                    checked.push(target)
                }
            } catch {
                checked.push(target)
            }
        }

        result = checked
    }

    return [
        ...new Set(
            result.filter(Boolean)
        )
    ]
}

export async function getUserInfo(
    jid,
    participants = [],
    conn
) {
    const normalized =
        jid?.includes('@')
            ? normalizeJidValue(jid)
            : jid
                ? `${String(jid).replace(/\D/g, '')}@s.whatsapp.net`
                : ''

    const key =
        normalized.split('@')[0]

    let participant =
        findParticipantByJid(
            participants,
            normalized
        )

    if (
        !participant &&
        normalized.endsWith('@lid') &&
        conn &&
        typeof conn.onWhatsApp === 'function'
    ) {
        try {
            const response =
                await conn.onWhatsApp(
                    normalized
                )

            const found = response?.find(
                item =>
                    item?.lid?.split('@')[0] === key
            )

            if (found?.jid) {
                const realJid =
                    decodeJidValue(found.jid)

                participant =
                    findParticipantByJid(
                        participants,
                        realJid
                    )

                if (participant) {
                    jid = realJid
                }
            }
        } catch {}
    }

    let name = ''

    try {
        if (
            conn &&
            typeof conn.getName === 'function'
        ) {
            name =
                await conn.getName(
                    participant?.phoneNumber ||
                    participant?.pn ||
                    participant?.jid ||
                    normalized
                )
        }
    } catch {}

    const realNumber =
        getParticipantNumber(
            participant
        ) ||
        (
            normalized.endsWith('@s.whatsapp.net')
                ? key
                : ''
        )

    const adminFlag =
        typeof participant?.admin !== 'undefined'
            ? participant.admin
            : participant?.isAdmin
                ? 'admin'
                : null

    const isSuperAdmin =
        adminFlag === 'superadmin'

    const isAdmin =
        isSuperAdmin ||
        adminFlag === 'admin'

    return {
        jid: normalized,
        realJid: realNumber
            ? `${realNumber}@s.whatsapp.net`
            : normalized,
        number: realNumber,
        name:
            name ||
            (
                realNumber
                    ? `+${realNumber}`
                    : normalized.endsWith('@lid')
                        ? key
                        : `+${key}`
            ),
        isAdmin,
        isSuperAdmin,
        adminRole:
            adminFlag || null,
        exists:
            Boolean(participant)
    }
}

function isNumber() {
    const value = String(this)
        .trim()

    if (!value) return false

    return /^-?\d+(\.\d+)?$/.test(
        value
    )
}

function getRandom() {
    if (
        Array.isArray(this) ||
        this instanceof String
    ) {
        return this[
            Math.floor(
                Math.random() *
                    this.length
            )
        ]
    }

    return Math.floor(
        Math.random() * this
    )
}

function nullish(args) {
    return (
        args === null ||
        args === undefined
    )
}