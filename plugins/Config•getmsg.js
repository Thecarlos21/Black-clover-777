export async function all(m) {
  try {
    if (!m || !m.chat) return

    if (
      !m.chat.endsWith('.net') ||
      m.fromMe ||
      m.key?.remoteJid === 'status@broadcast' ||
      m.isBaileys
    ) {
      return
    }

    const chats =
      global.db &&
      global.db.data &&
      global.db.data.chats

    const users =
      global.db &&
      global.db.data &&
      global.db.data.users

    const msgs =
      global.db &&
      global.db.data &&
      global.db.data.msgs

    if (!chats || !users || !msgs) return

    const chat = chats[m.chat]
    const user = users[m.sender]

    if (chat?.isBanned) return
    if (user?.banned) return

    if (!m.text || typeof m.text !== 'string') return

    if (!Object.prototype.hasOwnProperty.call(msgs, m.text)) {
      return
    }

    const stored = msgs[m.text]

    if (!stored) return

    const serialized = JSON.parse(
      JSON.stringify(
        stored,
        function (_, value) {
          if (
            value !== null &&
            typeof value === 'object' &&
            value.type === 'Buffer' &&
            Array.isArray(value.data)
          ) {
            return Buffer.from(value.data)
          }

          return value
        }
      )
    )

    if (typeof this.serializeM !== 'function') {
      console.error(
        'AutoMsg: serializeM no está disponible'
      )
      return
    }

    const message = this.serializeM(serialized)

    if (!message) return

    await message.copyNForward(
      m.chat,
      true
    )

  } catch (e) {
    console.error(
      'AutoMsg error:',
      e && e.stack ? e.stack : e
    )
  }
}