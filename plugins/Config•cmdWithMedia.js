import {
  generateWAMessage,
  areJidsSameUser,
  proto
} from '@whiskeysockets/baileys'

export async function all(m, chatUpdate) {
  try {
    if (!m || !m.message || !m.msg || !m.msg.fileSha256) return

    if (
      !global.db ||
      !global.db.data ||
      !global.db.data.sticker
    ) {
      return
    }

    const fileSha = Buffer
      .from(m.msg.fileSha256)
      .toString('base64')

    const stickers = global.db.data.sticker

    if (!Object.prototype.hasOwnProperty.call(stickers, fileSha)) {
      return
    }

    const hash = stickers[fileSha]

    if (!hash || typeof hash !== 'object') return

    const text =
      typeof hash.text === 'string'
        ? hash.text
        : ''

    if (!text) return

    const mentionedJid =
      Array.isArray(hash.mentionedJid)
        ? hash.mentionedJid
        : []

    const botJid =
      this.user?.id ||
      this.user?.jid

    if (!botJid) return

    const message = await generateWAMessage(
      m.chat,
      {
        text,
        mentions: mentionedJid
      },
      {
        userJid: botJid,
        quoted: m.quoted?.fakeObj || m
      }
    )

    if (!message || !message.key) return

    message.key.fromMe = areJidsSameUser(
      m.sender,
      botJid
    )

    message.key.id = m.key?.id || message.key.id

    if (m.pushName) {
      message.pushName = m.pushName
    }

    if (m.isGroup && m.sender) {
      message.participant = m.sender
    }

    const update = {
      ...chatUpdate,
      messages: [
        proto.WebMessageInfo.fromObject(message)
      ],
      type: 'append'
    }

    if (this.ev) {
      this.ev.emit(
        'messages.upsert',
        update
      )
    }

  } catch (e) {
    console.error(
      'Sticker Hash AutoReply:',
      e && e.stack ? e.stack : e
    )
  }
}