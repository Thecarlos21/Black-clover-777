import { generateWAMessageFromContent } from '@whiskeysockets/baileys'
import { smsg } from '../lib/simple.js'
import { format } from 'util'
import { fileURLToPath } from 'url'
import path, { join } from 'path'
import { unwatchFile, watchFile } from 'fs'
import fs from 'fs'
import chalk from 'chalk'
import ws from 'ws'

const { proto } = (await import('@whiskeysockets/baileys')).default
const isNumber = x => typeof x === 'number' &&!isNaN(x)
const delay = ms => isNumber(ms) && new Promise(resolve => setTimeout(resolve, ms))

const jidCache      = new Map()
const metadataCache = new Map()

const JID_TTL_DM    = 7  * 24 * 60 * 60_000
const JID_TTL_GROUP = 24 * 60 * 60_000
const META_TTL      = 24 * 60 * 60_000

setInterval(() => {
  const now = Date.now()
  for (const [key, val] of jidCache) {
    if (now > val.exp) jidCache.delete(key)
  }
}, 10 * 60_000)

const normalizeJid = jid => String(jid || '').split('@')[0].replace(/\D/g, '')

function isRealJid(jid) {
  return /^\d+@s\.whatsapp\.net$/.test(String(jid || ''))
}

function normalizeToJid(phone) {
  if (!phone) return null
  const base = typeof phone === 'number' ? phone.toString() : String(phone).replace(/\D/g, '')
  return base ? `${base}@s.whatsapp.net` : null
}

async function resolveLidToRealJid(lid, conn, groupChatId) {
  const input = String(lid || '').trim()
  if (!input) return input
  if (isRealJid(input)) return input

  const isLid = input.endsWith('@lid')
  if (!isLid && !groupChatId?.endsWith('@g.us')) return input

  const hit = jidCache.get(input)
  if (hit) return hit.resolved

  if (!groupChatId?.endsWith('@g.us')) {
    try {
      const result = await Promise.race([
        conn.onWhatsApp(input),
        new Promise((_, rej) => setTimeout(() => rej('timeout'), 2000))
      ])
      const realJid = result?.[0]?.jid
      if (realJid) {
        jidCache.set(input, { resolved: realJid, exp: Date.now() + JID_TTL_DM })
        return realJid
      }
    } catch {}
    return input
  }

  let metadata = null

  const globalMeta = global.groupMetaCache?.get?.(groupChatId)
  if (globalMeta && Date.now() - globalMeta.ts < META_TTL) metadata = globalMeta.data

  if (!metadata) {
    const cached = metadataCache.get(groupChatId)
    if (cached && Date.now() - cached.ts < META_TTL) metadata = cached.data
  }

  if (!metadata) {
    try {
      metadata = await Promise.race([
        conn.groupMetadata(groupChatId),
        new Promise((_, rej) => setTimeout(() => rej('timeout'), 3000))
      ])
      metadataCache.set(groupChatId, { data: metadata, ts: Date.now() })
    } catch {
      return input
    }
  }

  const participants = metadata?.participants || []
  const participant  = participants.find(p =>
    p.id === input ||
    p.lid === input ||
    p.id?.split(':')[0] === input.split(':')[0] ||
    p.id?.split('@')[0] === input.split('@')[0]
  )

  if (participant) {
    if (participant.phoneNumber) {
      const realJid = normalizeToJid(participant.phoneNumber)
      if (realJid) {
        if (jidCache.size >= 500) jidCache.delete(jidCache.keys().next().value)
        jidCache.set(input, { resolved: realJid, exp: Date.now() + JID_TTL_GROUP })
        return realJid
      }
    }
    if (isRealJid(participant.id)) {
      jidCache.set(input, { resolved: participant.id, exp: Date.now() + JID_TTL_GROUP })
      return participant.id
    }
  }

  return input
}

async function resolveJid(sender, conn, chat) {
  const hit = jidCache.get(sender)
  if (hit) return hit.resolved

  if (isRealJid(sender)) {
    const ttl = chat?.endsWith('@g.us') ? JID_TTL_GROUP : JID_TTL_DM
    jidCache.set(sender, { resolved: sender, exp: Date.now() + ttl })
    return sender
  }

  const resolved = await resolveLidToRealJid(sender, conn, chat)
  const ttl = chat?.endsWith('@g.us') ? JID_TTL_GROUP : JID_TTL_DM
  if (jidCache.size >= 500) jidCache.delete(jidCache.keys().next().value)
  jidCache.set(sender, { resolved, exp: Date.now() + ttl })
  return resolved
}
const getRawOwner = v => Array.isArray(v)? String(v[0]) : String(v || '')

const emojiList = ['❤️','😂','😍','🔥','😎','👍','😭','🥵','😳','🙏','💀','🤡','✨','💯','🌚','😈','🤙','🥶','🤔','😴']

export async function handler(chatUpdate) {
    this.msgqueque ||= []
    this.uptime ||= Date.now()
    if (!chatUpdate) return
    let m = chatUpdate.messages[chatUpdate.messages.length - 1]
    if (!m) return
    const msgTimestamp = m.messageTimestamp ? (typeof m.messageTimestamp === 'object' ? m.messageTimestamp.low : m.messageTimestamp) : 0
    if (msgTimestamp && (Date.now() / 1000) - msgTimestamp > 60) return
    if (!global.db.data) await global.loadDatabase()
    try {
        m = smsg(this, m) || m
        if (!m) return
        global.mconn = m
        m.exp = 0
        m.monedas = false
        let user = global.db.data.users[m.sender]
        if (!user || typeof user!== 'object') global.db.data.users[m.sender] = user = {}
        Object.assign(user, {
            exp: isNumber(user.exp)? user.exp : 0,
            monedas: isNumber(user.monedas)? user.monedas : 10,
            joincount: isNumber(user.joincount)? user.joincount : 1,
            diamond: isNumber(user.diamond)? user.diamond : 3,
            lastadventure: isNumber(user.lastadventure)? user.lastadventure : 0,
            lastclaim: isNumber(user.lastclaim)? user.lastclaim : 0,
            health: isNumber(user.health)? user.health : 100,
            crime: isNumber(user.crime)? user.crime : 0,
            lastcofre: isNumber(user.lastcofre)? user.lastcofre : 0,
            lastdiamantes: isNumber(user.lastdiamantes)? user.lastdiamantes : 0,
            lastpago: isNumber(user.lastpago)? user.lastpago : 0,
            lastcode: isNumber(user.lastcode)? user.lastcode : 0,
            lastcodereg: isNumber(user.lastcodereg)? user.lastcodereg : 0,
            lastduel: isNumber(user.lastduel)? user.lastduel : 0,
            lastmining: isNumber(user.lastmining)? user.lastmining : 0,
            muto: 'muto' in user? user.muto : false,
            premium: 'premium' in user? user.premium : false,
            premiumTime: user.premium? user.premiumTime || 0 : 0,
            registered: 'registered' in user? user.registered : false,
            genre: user.genre || '',
            birth: user.birth || '',
            marry: user.marry || '',
            description: user.description || '',
            packstickers: user.packstickers || null,
            name: user.name || m.name,
            age: isNumber(user.age)? user.age : -1,
            regTime: isNumber(user.regTime)? user.regTime : -1,
            afk: isNumber(user.afk)? user.afk : -1,
            afkReason: user.afkReason || '',
            role: user.role || 'Nuv',
            banned: 'banned' in user? user.banned : false,
            useDocument: 'useDocument' in user? user.useDocument : false,
            level: isNumber(user.level)? user.level : 0,
            bank: isNumber(user.bank)? user.bank : 0,
            warn: isNumber(user.warn)? user.warn : 0
        })
        let chat = global.db.data.chats[m.chat]
        if (!chat || typeof chat!== 'object') global.db.data.chats[m.chat] = chat = {}
        Object.assign(chat, {
            isBanned: 'isBanned' in chat? chat.isBanned : false,
            sAutoresponder: chat.sAutoresponder || '',
            welcome: 'welcome' in chat? chat.welcome : true,
            autolevelup: 'autolevelup' in chat? chat.autolevelup : false,
            autoAceptar: 'autoAceptar' in chat? chat.autoAceptar : true,
            autosticker: 'autosticker' in chat? chat.autosticker : false,
            autoRechazar: 'autoRechazar' in chat? chat.autoRechazar : true,
            autoresponder: 'autoresponder' in chat? chat.autoresponder : false,
            detect: 'detect' in chat? chat.detect : true,
            antiBot: 'antiBot' in chat? chat.antiBot : true,
            antiBot2: 'antiBot2' in chat? chat.antiBot2 : true,
            modoadmin: 'modoadmin' in chat? chat.modoadmin : false,
            antiLink: 'antiLink' in chat? chat.antiLink : true,
            reaction: 'reaction' in chat? chat.reaction : false,
            nsfw: 'nsfw' in chat? chat.nsfw : false,
            antifake: 'antifake' in chat? chat.antifake : false,
            delete: 'delete' in chat? chat.delete : false,
            antidelete: 'antidelete' in chat? chat.antidelete : false,
            expired: isNumber(chat.expired)? chat.expired : 0,
            lastReact: isNumber(chat.lastReact)? chat.lastReact : 0
        })
        const botJid = this.user?.id || this.user?.jid
        if (!botJid) return
        let settings = global.db.data.settings[botJid] || {}
        Object.assign(settings, {
            self: 'self' in settings? settings.self : false,
            restrict: 'restrict' in settings? settings.restrict : true,
            jadibotmd: 'jadibotmd' in settings? settings.jadibotmd : true,
            antiPrivate: 'antiPrivate' in settings? settings.antiPrivate : false,
            autoread: 'autoread' in settings? settings.autoread : false,
            status: settings.status || 0
        })
        global.db.data.settings[botJid] = settings
        if (typeof m.text!== "string") m.text = ""
        globalThis.setting = settings




        const senderLidEarly = await resolveJid(m.sender, this, m.chat)

        const senderIds = [
            senderLidEarly,
            m.sender,
            m.key?.participant,
            m.key?.participantAlt,
            m.key?.senderPn,
            m.key?.senderPnAlt
        ].filter(Boolean).map(v => String(v))

        const senderNums = senderIds.map(v => normalizeJid(v)).filter(Boolean)
        const senderFullStr = senderIds.join(' ')
        const senderNumber = senderNums[0] || normalizeJid(senderLidEarly || m.sender)

        const parseList = (arr) => {
            if (!arr) return []
            return arr.map(v => getRawOwner(v)).filter(Boolean).map(v => normalizeJid(v)).filter(Boolean)
        }
        const parseListRaw = (arr) => {
            if (!arr) return []
            return arr.map(v => getRawOwner(v)).filter(Boolean)
        }

        const ownerNorm = [...parseList(global.owner),...parseList(global.mods),...parseListRaw(global.owner).map(v => normalizeJid(v))]
        const modsNorm = [...parseList(global.mods),...parseListRaw(global.mods).map(v => normalizeJid(v))]
        const premsNorm = [...parseList(global.prems),...parseListRaw(global.prems).map(v => normalizeJid(v))]

        const checkOwner = (list) => {
            if (!list ||!list.length) return false
            return senderNums.some(sn => list.some(o => o && (sn === o || sn.includes(o) || o.includes(sn)))) || list.some(o => senderFullStr.includes(o))
        }

        const isROwner = m.fromMe || checkOwner(ownerNorm)
        const isOwner = isROwner || m.fromMe
        const isMods = isOwner || checkOwner(modsNorm)
        const isPrems = isROwner || user.premiumTime > 0 || checkOwner(premsNorm) || checkOwner(ownerNorm)

        if (opts['queque'] && m.text &&!isMods) {
            const queque = this.msgqueque
            const previousID = queque[queque.length - 1]
            queque.push(m.id || m.key.id)
            setTimeout(() => {
                const idx = queque.indexOf(previousID)
                if (idx!== -1) queque.splice(idx, 1)
            }, 5000)
        }
        if (m.isBaileys) return
        global.db.data.antidelete = global.db.data.antidelete || {}
        global.db.data.antidelete[m.chat] = global.db.data.antidelete[m.chat] || {}
        if (m.message &&!m.message?.protocolMessage) {
            global.db.data.antidelete[m.chat][m.id] = {
                msg: m,
                type: Object.keys(m.message)[0],
                timestamp: Date.now()
            }
        }
        if (m.message?.protocolMessage?.type === 0) {
            let deletedMsg = global.db.data.antidelete[m.chat]?.[m.message.protocolMessage.key.id]
            if (deletedMsg && chat.antidelete &&!m.fromMe) {
                let msg = deletedMsg.msg
                let txt = `🗑️ *ANTIDELETE*\n\n👤 *Usuario:* @${msg.sender.split('@')[0]}\n📝 *Tipo:* ${deletedMsg.type.replace('Message', '')}\n⏰ *Enviado:* ${new Date(deletedMsg.timestamp).toLocaleString('es-MX')}\n\n`
                if (msg.text) txt += `💬 *Mensaje:* ${msg.text}`
                await this.reply(m.chat, txt, msg, { mentions: [msg.sender] })
            }
            return
        }
        m.exp += Math.ceil(Math.random() * 10)
        let usedPrefix


        const botNumber  = normalizeJid(botJid)
        const botLid     = await resolveJid(botJid, this, m.chat)
        let groupMetadata = null
        let participants = []
        if (m.isGroup) {
            const cached = metadataCache.get(m.chat)
            if (cached?.participants?.length) {
                groupMetadata = cached
            } else {
                try {
                    groupMetadata = await Promise.race([
                        this.groupMetadata(m.chat),
                        new Promise((_, rej) => setTimeout(() => rej('timeout'), 5000))
                    ])
                } catch {
                    groupMetadata = null
                }
                if (groupMetadata?.participants?.length) {
                    metadataCache.set(m.chat, groupMetadata)
                    setTimeout(() => metadataCache.delete(m.chat), 60000)
                }
            }
            participants = groupMetadata?.participants || []
        }

        const norm = id => String(id || '').split('@')[0].replace(/\D/g, '')
        const senderNum = norm(senderLidEarly || m.sender)
        const botNum    = norm(botJid)

        const matchSender = (p) => {
            if (!p) return false
            if (p.id === senderLidEarly)  return true
            if (p.id === m.sender)        return true
            if (p.lid === m.sender)       return true
            if (p.lid === senderLidEarly) return true

            if (p.phoneNumber && norm(String(p.phoneNumber)) === senderNum) return true

            const pn = norm(p.id || p.jid || p.lid)
            if (pn && pn.length >= 7 && (pn === senderNum || senderNum.endsWith(pn) || pn.endsWith(senderNum))) return true
            return false
        }

        const matchBot = (p) => {
            if (!p) return false
            if (p.id === botJid)    return true
            if (p.lid === botLid)   return true
            if (p.phoneNumber && norm(String(p.phoneNumber)) === botNum) return true
            const pn = norm(p.id || p.jid || p.lid)
            if (pn && pn.length >= 7 && (pn === botNum || botNum.endsWith(pn) || pn.endsWith(botNum))) return true
            return false
        }

        let participant = {}, botParticipant = {}
        for (const p of participants) {
            if (!participant.id && matchSender(p)) participant = p
            if (!botParticipant.id && matchBot(p)) botParticipant = p
            if (participant.id && botParticipant.id) break
        }


        if (m.isGroup) {
            console.log('[ADMIN DEBUG] senderLidEarly:', senderLidEarly)
            console.log('[ADMIN DEBUG] m.sender:', m.sender)
            console.log('[ADMIN DEBUG] senderNum:', senderNum)
            console.log('[ADMIN DEBUG] participant encontrado:', participant?.id || 'NINGUNO')
            console.log('[ADMIN DEBUG] participant.admin:', participant?.admin || 'null')
            console.log('[ADMIN DEBUG] participants IDs:', participants.map(p => p.id).join(', '))
        }

        const isRAdmin = participant.admin === 'superadmin'
        const isAdmin = isRAdmin || participant.admin === 'admin'
        const isBotAdmin =!!botParticipant.admin
        const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins')
        if (chat?.reaction &&!m.fromMe && m.message && m.isGroup &&!m.key.remoteJid.endsWith('status@broadcast')) {
            try {
                let now = new Date() * 1
                if (now - (chat.lastReact || 0) > 3000) {
                    let emoji = emojiList[Math.floor(Math.random() * emojiList.length)]
                    await this.sendMessage(m.chat, { react: { text: emoji, key: m.key } })
                    chat.lastReact = now
                }
            } catch {}
        }
        for (const name in global.plugins) {
            const plugin = global.plugins[name]
            if (!plugin || plugin.disabled) continue
            const __filename = join(___dirname, name)
            if (typeof plugin.all === 'function') {
                try {
                    await plugin.all.call(this, m, { chatUpdate, __dirname: ___dirname, __filename })
                } catch (e) {
                    console.error(e)
                }
            }
            if (!opts['restrict'] && plugin.tags?.includes('admin')) continue
            const str2Regex = str => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
            let _prefix = plugin.customPrefix || global.prefix
            let match = (_prefix instanceof RegExp? [[_prefix.exec(m.text), _prefix]] :
                Array.isArray(_prefix)? _prefix.map(p => [p instanceof RegExp? p.exec(m.text) : new RegExp(str2Regex(p)).exec(m.text), p instanceof RegExp? p : new RegExp(str2Regex(p))]) :
                [[new RegExp(str2Regex(_prefix)).exec(m.text), new RegExp(str2Regex(_prefix))]]
            ).find(p => p[1])
            if (typeof plugin.before === 'function') {
                if (await plugin.before.call(this, m, { match, conn: this, participants, groupMetadata, user: participant, bot: botParticipant, isROwner, isOwner, isRAdmin, isAdmin, isBotAdmin, isPrems, chatUpdate, __dirname: ___dirname, __filename })) continue
            }
            if (typeof plugin!== 'function') continue
            if ((usedPrefix = (match[0] || '')[0])) {
                const noPrefix = m.text.replace(usedPrefix, '')
                let [command,...args] = noPrefix.trim().split` `.filter(Boolean)
                args = args || []
                const _args = noPrefix.trim().split` `.slice(1)
                const text = _args.join` `
                command = (command || '').toLowerCase()
                const fail = plugin.fail || global.dfail
                const isAccept = plugin.command instanceof RegExp? plugin.command.test(command) :
                    Array.isArray(plugin.command)? plugin.command.some(cmd => cmd instanceof RegExp? cmd.test(command) : cmd === command) :
                    plugin.command === command
                global.comando = command
                if ((m.id.startsWith('NJX-') || (m.id.startsWith('BAE5') && m.id.length === 16) || (m.id.startsWith('B24E') && m.id.length === 20))) return
                if (!isAccept) continue
                m.plugin = name
                if (!['grupo-unbanchat.js', 'owner-exec.js', 'owner-exec2.js'].includes(name) && chat?.isBanned &&!isROwner) return
                if (m.text && user.banned &&!isROwner) {
                    m.reply(`《✦》Estas baneado/a, no puedes usar comandos!\n\n${user.bannedReason? `✰ *Motivo:* ${user.bannedReason}` : '✰ *Motivo:* Sin Especificar'}`)
                    return
                }
                const adminMode = chat.modoadmin
                const mini = `${plugin.botAdmin || plugin.admin || plugin.group || noPrefix || usedPrefix || command}`
                if (adminMode &&!isOwner &&!isROwner && m.isGroup &&!isAdmin && mini) return
                if (plugin.rowner && plugin.owner &&!(isROwner || isOwner)) { fail('owner', m, this); continue }
                if (plugin.rowner &&!isROwner) { fail('rowner', m, this); continue }
                if (plugin.owner &&!isOwner) { fail('owner', m, this); continue }
                if (plugin.mods &&!isMods) { fail('mods', m, this); continue }
                if (plugin.premium &&!isPrems) { fail('premium', m, this); continue }
                if (plugin.group &&!m.isGroup) { fail('group', m, this); continue }
                if (plugin.botAdmin &&!isBotAdmin) { fail('botAdmin', m, this); continue }
                if (plugin.admin &&!isAdmin) { fail('admin', m, this); continue }
                if (plugin.private && m.isGroup) { fail('private', m, this); continue }
                if (plugin.register &&!user.registered) { fail('unreg', m, this); continue }
                m.isCommand = true
                const xp = 'exp' in plugin? parseInt(plugin.exp) : 10
                m.exp += xp
                if (!isPrems && plugin.monedas && user.monedas < plugin.monedas) {
                    this.reply(m.chat, `❮✦❯ Se agotaron tus ${global.monedas}`, m)
                    continue
                }
                if (plugin.level > user.level) {
                    this.reply(m.chat, `❮✦❯ Se requiere nivel: *${plugin.level}*\n\n• Tu nivel: *${user.level}*\n\n• Usa: *${usedPrefix}levelup*`, m)
                    continue
                }
                const extra = { match, usedPrefix, noPrefix, _args, args, command, text, conn: this, participants, groupMetadata, user: participant, bot: botParticipant, isROwner, isOwner, isRAdmin, isAdmin, isBotAdmin, isPrems, chatUpdate, __dirname: ___dirname, __filename }
                try {
                    await plugin.call(this, m, extra)
                    if (!isPrems) m.monedas = m.monedas || plugin.monedas || false
                } catch (e) {
                    m.error = e
                    console.log(chalk.red(`[PLUGIN ERROR] ${name}:`), e)
                } finally {
                    if (typeof plugin.after === 'function') await plugin.after.call(this, m, extra).catch(console.error)
                    if (m.monedas) this.reply(m.chat, `❮✦❯ Utilizaste ${+m.monedas} ${global.monedas}`, m)
                }
                break
            }
        }
    } catch (e) {
        console.error(e)
    } finally {
        if (opts['queque'] && m.text) {
            const quequeIndex = this.msgqueque.indexOf(m.id || m.key.id)
            if (quequeIndex!== -1) this.msgqueque.splice(quequeIndex, 1)
        }
        if (m) {
            const utente = global.db.data.users[m.sender]
            if (utente?.muto) await this.sendMessage(m.chat, { delete: { remoteJid: m.chat, fromMe: false, id: m.key.id, participant: m.key.participant } })
            if (utente) {
                utente.exp += m.exp
                utente.monedas -= m.monedas
            }
        }
        const stats = global.db.data.stats
        if (m.plugin) {
            const now = +new Date()
            const stat = stats[m.plugin] || { total: 0, success: 0, last: 0, lastSuccess: 0 }
            stat.total += 1
            stat.last = now
            if (!m.error) { stat.success += 1; stat.lastSuccess = now }
            stats[m.plugin] = stat
        }
        try { if (!opts['noprint']) await (await import('../lib/print.js')).default(m, this) } catch (e) { console.log(m, m.quoted, e) }
        if (opts['autoread']) await this.readMessages([m.key])
    }
}

global.dfail = (type, m, conn) => {
        let msg = {
        rowner: `🛑 *ACCESO RESTRINGIDO*\n\n> Solo el *Creador Supremo* puede ejecutar este protocolo.\n\n🧬 Usuario Autorizado: 👑 𝙏𝙃𝙀 𝘾𝘼𝙍𝙇𝙊𝙎`,
        owner: `⚙️🔒 *MÓDULO DEV: ACCESO BLOQUEADO*\n\n> Esta función está anclada a permisos de *𝙳𝙴𝚂𝙰𝚁𝙾𝙻𝙻𝙰𝙳𝙾𝚁*.`,
        mods: `🛡️ *SOLO MODERADORES*\n\n> Comando exclusivo para mods del bot.`,
        premium: `*REQUIERE CUENTA PREMIUM*\n\n> 🚫 Módulo exclusivo para usuarios *𝙑𝙄𝙋 - 𝙋𝙍𝙀𝙈𝙄𝙐𝙈*.\n\n📡 Actualiza tu plan con: */vip*`,
        group: `👥 *SOLO GRUPOS*\n\n> Este comando solo funciona en grupos.`,
        private: `🔒 *SOLO CHAT PRIVADO* 📲\n\n> Este comando no puede ejecutarse en grupos por razones de seguridad.\n\n🧬 Ejecuta este protocolo directamente en el chat privado.`,
        admin: `🛡️ *FUNCIÓN RESTRINGIDA*\n\n> Solo los administradores del *Grupo* tienen acceso.\n\n⚠️ Intento no autorizado.`,
        unreg: `🧾 *NO REGISTRADO EN EL SISTEMA*\n\n> 🚫 *Acceso denegado:* No puedes usar los comandos sin registrarte.\n\n🔐 Regístrate con: */reg nombre.edad*\n📍 Ejemplo: */reg Asta.20*\n\n> 🥷🏻 *Instagram oficial del creador del bot :*\nhttps://www.instagram.com/_carlitos.zx\n\n📂 *Creador del bot:* The Carlos`,
        restrict: `🚷 *FUNCIÓN GLOBALMENTE BLOQUEADA*\n\n> Este comando fue deshabilitado por el *Operador Global* por motivos de seguridad cibernética.\n\n🔧 Módulo: /xvideos`
    }[type]
    if (msg) return conn.reply(m.chat, msg, m).then(() => m.react('✖️'))
}

const file = global.__filename(import.meta.url, true)
watchFile(file, async () => {
    unwatchFile(file)
    console.log(chalk.magenta("Se actualizo 'handler.js'"))
    import(`${file}?update=${Date.now()}`)
})