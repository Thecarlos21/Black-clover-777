import { readFileSync, writeFileSync, existsSync, renameSync, unlinkSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
const { initAuthCreds, BufferJSON, proto } = (
  await import('@whiskeysockets/baileys')
).default
const __dirname = dirname(fileURLToPath(import.meta.url))
function bind(conn) {
  if (!conn.chats) conn.chats = {}
  const decodeJid = jid => {
    try {
      return conn.decodeJid?.(jid) || jid
    } catch {
      return jid
    }
  }
  const getChat = id => {
    if (!conn.chats[id]) {
      conn.chats[id] = { id }
    }
    return conn.chats[id]
  }
  const updateNameToDb = contacts => {
    if (!contacts) return
    try {
      contacts = contacts.contacts || contacts
      for (const contact of contacts) {
        const id = decodeJid(contact.id)
        if (!id || id === 'status@broadcast') continue
        const chats = getChat(id)
        const isGroup = id.endsWith('@g.us')
        Object.assign(chats, contact, { id })
        if (isGroup) {
          chats.subject =
            contact.subject ||
            contact.name ||
            chats.subject ||
            ''
        } else {
          chats.name =
            contact.notify ||
            contact.name ||
            chats.name ||
            chats.notify ||
            ''
        }
      }
    } catch (e) {
      console.error(e)
    }
  }
  conn.ev.on('contacts.upsert', updateNameToDb)
  conn.ev.on('groups.update', updateNameToDb)
  conn.ev.on('contacts.set', updateNameToDb)
  conn.ev.on('chats.set', async ({ chats = [] }) => {
    try {
      for (const chat of chats) {
        let { id, name, readOnly } = chat
        id = decodeJid(id)
        if (!id || id === 'status@broadcast') continue
        const isGroup = id.endsWith('@g.us')
        const current = getChat(id)
        current.isChats = !readOnly
        if (name) {
          current[isGroup ? 'subject' : 'name'] = name
        }
        if (!isGroup) continue
        const metadata = await conn.groupMetadata(id).catch(() => null)
        if (name || metadata?.subject) {
          current.subject = name || metadata.subject
        }
        if (metadata) {
          current.metadata = metadata
        }
      }
    } catch (e) {
      console.error(e)
    }
  })
  conn.ev.on(
    'group-participants.update',
    async ({ id }) => {
      if (!id) return
      id = decodeJid(id)
      if (!id || id === 'status@broadcast') return
      const chats = getChat(id)
      chats.isChats = true
      const groupMetadata = await conn
        .groupMetadata(id)
        .catch(() => null)
      if (!groupMetadata) return
      chats.subject = groupMetadata.subject
      chats.metadata = groupMetadata
    }
  )
  conn.ev.on('groups.update', async groupsUpdates => {
    try {
      for (const update of groupsUpdates) {
        const id = decodeJid(update.id)
        if (!id || id === 'status@broadcast') continue
        if (!id.endsWith('@g.us')) continue
        const chats = getChat(id)
        chats.isChats = true
        const metadata = await conn
          .groupMetadata(id)
          .catch(() => null)
        if (metadata) {
          chats.metadata = metadata
        }
        if (update.subject || metadata?.subject) {
          chats.subject = update.subject || metadata.subject
        }
      }
    } catch (e) {
      console.error(e)
    }
  })
  conn.ev.on('chats.upsert', chatsUpsert => {
    try {
      const { id } = chatsUpsert
      if (!id || id === 'status@broadcast') return
      const jid = decodeJid(id)
      conn.chats[jid] = {
        ...(conn.chats[jid] || {}),
        ...chatsUpsert,
        id: jid,
        isChats: true
      }
      if (jid.endsWith('@g.us')) {
        conn.insertAllGroup?.().catch(() => null)
      }
    } catch (e) {
      console.error(e)
    }
  })
  conn.ev.on(
    'presence.update',
    async ({ id, presences = {} }) => {
      try {
        const sender = Object.keys(presences)[0] || id
        const decodedSender = decodeJid(sender)
        const presence =
          presences[sender]?.lastKnownPresence || 'composing'
        const chats = getChat(decodedSender)
        chats.presences = presence
        if (id?.endsWith('@g.us')) {
          getChat(decodeJid(id))
        }
      } catch (e) {
        console.error(e)
      }
    }
  )
  return conn
}
const KEY_MAP = {
  'pre-key': 'preKeys',
  session: 'sessions',
  'sender-key': 'senderKeys',
  'app-state-sync-key': 'appStateSyncKeys',
  'app-state-sync-version': 'appStateVersions',
  'sender-key-memory': 'senderKeyMemory'
}
function useSingleFileAuthState(filename, logger) {
  let creds
  let keys = {}
  let saveCount = 0
  let saving = false
  const saveState = forceSave => {
    saveCount++
    if (!forceSave && saveCount <= 5) return
    if (saving) return
    saving = true
    try {
      logger?.trace?.('saving auth state')
      const data = JSON.stringify(
        {
          creds,
          keys
        },
        BufferJSON.replacer
      )
      const tempFile = `${filename}.${process.pid}.tmp`
      writeFileSync(tempFile, data)
      renameSync(tempFile, filename)
      saveCount = 0
    } catch (e) {
      try {
        unlinkSync(`${filename}.${process.pid}.tmp`)
      } catch {}
      logger?.error?.(e)
    } finally {
      saving = false
    }
  }
  if (existsSync(filename)) {
    try {
      const result = JSON.parse(
        readFileSync(filename, 'utf-8'),
        BufferJSON.reviver
      )
      creds = result?.creds || initAuthCreds()
      keys = result?.keys || {}
    } catch (e) {
      logger?.error?.(e)
      creds = initAuthCreds()
      keys = {}
    }
  } else {
    creds = initAuthCreds()
    keys = {}
  }
  for (const key of Object.values(KEY_MAP)) {
    if (!keys[key]) keys[key] = {}
  }
  return {
    state: {
      creds,
      keys: {
        get: (type, ids) => {
          const key = KEY_MAP[type]
          if (!key || !Array.isArray(ids)) return {}
          const source = keys[key] || {}
          return ids.reduce((dict, id) => {
            let value = source[id]
            if (!value) return dict
            if (type === 'app-state-sync-key') {
              value = proto.AppStateSyncKeyData.fromObject(value)
            }
            dict[id] = value
            return dict
          }, {})
        },
        set: data => {
          if (!data) return
          for (const type in data) {
            const key = KEY_MAP[type]
            if (!key) continue
            if (!keys[key]) {
              keys[key] = {}
            }
            Object.assign(keys[key], data[type])
          }
          saveState()
        }
      }
    },
    saveState: () => saveState(true)
  }
}
function loadMessage(jid, id = null) {
  if (!jid) return null
  if (!id) {
    id = jid
    jid = null
  }
  return null
}
export default {
  bind,
  useSingleFileAuthState,
  loadMessage
}
