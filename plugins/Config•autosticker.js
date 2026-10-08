import { sticker } from '../lib/sticker.js'

const isUrl = text => {
  if (typeof text !== 'string') return false
  return /^https?:\/\/[^\s]+$/i.test(text.trim())
}

let handler = m => m

handler.all = async function (m) {
  const conn = this

  try {
    if (!conn) return true
    if (!m || !m.isGroup) return true

    global.db.data.chats[m.chat] = global.db.data.chats[m.chat] || {}
    global.db.data.users[m.sender] = global.db.data.users[m.sender] || {}

    const chat = global.db.data.chats[m.chat]

    if (!chat.autosticker) return true

    const q = m
    const msg = q.msg || q

    const mime =
      msg.mimetype ||
      q.mimetype ||
      q.mediaType ||
      ''

    const pack =
      global.packname ||
      'Black Clover'

    const author =
      global.author ||
      'The Carlos'

    if (/webp/i.test(mime)) {
      return true
    }

    if (/image/i.test(mime)) {
      const buffer = await q.download?.()

      if (!buffer) return true

      const stiker = await sticker(
        buffer,
        false,
        pack,
        author
      )

      if (!stiker) return true

      await conn.sendMessage(
        m.chat,
        {
          sticker: stiker
        },
        {
          quoted: m
        }
      )

      return true
    }

    if (/video/i.test(mime)) {
      const seconds = Number(
        msg.seconds ||
        msg.duration ||
        0
      )

      if (seconds > 7) {
        await conn.reply(
          m.chat,
          '᥀·࣭࣪̇˖🚩◗ *El video no debe durar más de 7 segundos, inténtalo de nuevo.*',
          m
        )

        return true
      }

      const buffer = await q.download?.()

      if (!buffer) return true

      const stiker = await sticker(
        buffer,
        false,
        pack,
        author
      )

      if (!stiker) return true

      await conn.sendMessage(
        m.chat,
        {
          sticker: stiker
        },
        {
          quoted: m
        }
      )

      return true
    }

    const text =
      typeof m.text === 'string'
        ? m.text.trim()
        : ''

    if (!text) return true

    const url = text.split(/\s+/)[0]

    if (!isUrl(url)) return true

    const stiker = await sticker(
      false,
      url,
      pack,
      author
    )

    if (!stiker) return true

    await conn.sendMessage(
      m.chat,
      {
        sticker: stiker
      },
      {
        quoted: m
      }
    )

    return true

  } catch (e) {
    console.error(
      'Black Clover AutoSticker:',
      e && e.stack ? e.stack : e
    )

    return true
  }
}

export default handler
