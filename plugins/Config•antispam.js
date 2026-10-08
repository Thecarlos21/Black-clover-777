const spamData = global.blackCloverSpamData || (global.blackCloverSpamData = {})

let handler = m => m

handler.before = async function (m, { conn, isAdmin, isBotAdmin, isOwner, isROwner }) {
  try {
    if (!m || !m.isGroup) return

    global.db.data.chats[m.chat] = global.db.data.chats[m.chat] || {}
    global.db.data.settings[conn.user.jid] = global.db.data.settings[conn.user.jid] || {}

    const chat = global.db.data.chats[m.chat]
    const settings = global.db.data.settings[conn.user.jid]

    if (!settings.antiSpam) return

    if (chat.modoadmin && (isAdmin || isOwner || isROwner)) return

    const sender = m.sender || m.key?.participant

    if (!sender) return

    if (isAdmin || isOwner || isROwner) return

    global.db.data.users[sender] = global.db.data.users[sender] || {}

    const user = global.db.data.users[sender]
    const now = Date.now()

    const LIMIT_MESSAGES = 10
    const LIMIT_WINDOW = 5000
    const WARNING_RESET = 30000
    const SECOND_WARNING_RESET = 60000
    const DATA_CLEANUP = 120000
    const WARNING_COOLDOWN = 3000

    spamData[m.chat] = spamData[m.chat] || {}

    const groupData = spamData[m.chat]

    groupData[sender] = groupData[sender] || {
      messages: [],
      level: 0,
      lastWarning: 0,
      resetTimer: null,
      cleanupTimer: null
    }

    const data = groupData[sender]

    data.messages = data.messages.filter(function (time) {
      return now - time <= LIMIT_WINDOW
    })

    data.messages.push(now)

    if (data.messages.length < LIMIT_MESSAGES) {
      if (!data.cleanupTimer) {
        data.cleanupTimer = setTimeout(function () {
          if (!spamData[m.chat] || !spamData[m.chat][sender]) return

          const current = spamData[m.chat][sender]

          if (
            current.messages.length &&
            Date.now() - current.messages[current.messages.length - 1] >= DATA_CLEANUP
          ) {
            if (current.resetTimer) clearTimeout(current.resetTimer)
            if (current.cleanupTimer) clearTimeout(current.cleanupTimer)

            delete spamData[m.chat][sender]

            if (!Object.keys(spamData[m.chat]).length) {
              delete spamData[m.chat]
            }
          }

          if (spamData[m.chat] && spamData[m.chat][sender]) {
            spamData[m.chat][sender].cleanupTimer = null
          }
        }, DATA_CLEANUP)
      }

      return
    }

    const mention = '@' + sender.split('@')[0]

    if (now - data.lastWarning < WARNING_COOLDOWN) return

    data.lastWarning = now

    if (data.level === 0) {
      data.level = 1
      data.messages = []
      user.banned = true

      await conn.reply(
        m.chat,
        '🚩 *SPAM DETECTADO*\\n\\n👤 Usuario: ' + mention + '\\n⚠️ Primera advertencia.\\n\\n🚫 Si continúas enviando mensajes rápidamente, recibirás otra advertencia.',
        m,
        {
          mentions: [sender]
        }
      )

      if (data.resetTimer) clearTimeout(data.resetTimer)

      data.resetTimer = setTimeout(function () {
        if (!spamData[m.chat] || !spamData[m.chat][sender]) return

        const current = spamData[m.chat][sender]

        if (current.level === 1) {
          current.level = 0
          current.messages = []
          current.lastWarning = 0
          current.resetTimer = null
          user.banned = false
        }
      }, WARNING_RESET)

      return
    }

    if (data.level === 1) {
      data.level = 2
      data.messages = []
      user.banned = true

      await conn.reply(
        m.chat,
        '⚠️ *SEGUNDA ADVERTENCIA*\\n\\n👤 Usuario: ' + mention + '\\n🚨 Has vuelto a detectar spam.\\n\\n👺 Una nueva detección provocará tu expulsión.',
        m,
        {
          mentions: [sender]
        }
      )

      if (data.resetTimer) clearTimeout(data.resetTimer)

      data.resetTimer = setTimeout(function () {
        if (!spamData[m.chat] || !spamData[m.chat][sender]) return

        const current = spamData[m.chat][sender]

        if (current.level === 2) {
          current.level = 0
          current.messages = []
          current.lastWarning = 0
          current.resetTimer = null
          user.banned = false
        }
      }, SECOND_WARNING_RESET)

      return
    }

    if (data.level >= 2) {
      user.banned = true

      if (!isBotAdmin) {
        await conn.reply(
          m.chat,
          '🚫 *No puedo expulsar a ' + mention + ' porque no soy administrador del grupo.*',
          m,
          {
            mentions: [sender]
          }
        )

        data.messages = []
        return
      }

      await conn.reply(
        m.chat,
        '👺 *EXPULSIÓN POR SPAM*\\n\\n👤 Usuario: ' + mention + '\\n🚫 Has superado el límite de spam permitido.\\n\\n🍀 *Black Clover Anti-Spam*',
        m,
        {
          mentions: [sender]
        }
      )

      try {
        if (m.key && m.key.id) {
          await conn.sendMessage(m.chat, {
            delete: m.key
          })
        }
      } catch {}

      try {
        await conn.groupParticipantsUpdate(
          m.chat,
          [sender],
          'remove'
        )
      } catch (e) {
        console.error('AntiSpam expulsión:', e && e.message ? e.message : e)
      }

      if (data.resetTimer) clearTimeout(data.resetTimer)
      if (data.cleanupTimer) clearTimeout(data.cleanupTimer)

      delete groupData[sender]

      if (!Object.keys(groupData).length) {
        delete spamData[m.chat]
      }
    }
  } catch (e) {
    console.error('Black Clover AntiSpam:', e && e.message ? e.message : e)
  }
}

export default handler