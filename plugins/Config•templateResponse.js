const {
  proto,
  generateWAMessage,
  areJidsSameUser
} = (await import('@whiskeysockets/baileys')).default

export async function all(m, chatUpdate) {
  try {
    if (!m || m.isBaileys) return
    if (!m.message) return

    const message = m.message

    if (
      !message.buttonsResponseMessage &&
      !message.templateButtonReplyMessage &&
      !message.listResponseMessage &&
      !message.interactiveResponseMessage
    ) {
      return
    }

    let id = ''
    let displayText = ''

    if (message.buttonsResponseMessage) {
      id = message.buttonsResponseMessage.selectedButtonId || ''
      displayText = message.buttonsResponseMessage.selectedDisplayText || ''
    }

    if (message.templateButtonReplyMessage) {
      id = message.templateButtonReplyMessage.selectedId || ''
      displayText = message.templateButtonReplyMessage.selectedDisplayText || ''
    }

    if (message.listResponseMessage) {
      const response = message.listResponseMessage.singleSelectReply

      id = response?.selectedRowId || ''
      displayText = message.listResponseMessage.title || ''
    }

    if (message.interactiveResponseMessage) {
      const interactive = message.interactiveResponseMessage
      const nativeFlow = interactive.nativeFlowResponseMessage

      if (nativeFlow?.paramsJson) {
        try {
          const params = JSON.parse(nativeFlow.paramsJson)

          if (params && typeof params === 'object') {
            id =
              params.id ||
              params.selectedId ||
              params.buttonId ||
              params.rowId ||
              ''
          }
        } catch {}
      }

      if (!id) {
        displayText =
          interactive.body?.text ||
          displayText ||
          ''
      }
    }

    const text = id || displayText

    if (!text) return

    const botJid =
      this.user?.id ||
      this.user?.jid

    if (!botJid) return

    const mentions = Array.isArray(m.mentionedJid)
      ? m.mentionedJid
      : []

    const generated = await generateWAMessage(
      m.chat,
      {
        text,
        mentions
      },
      {
        userJid: botJid,
        quoted: m.quoted?.fakeObj || m,
        generateLinkPreview: false
      }
    )

    if (!generated?.key) return

    generated.key.fromMe = areJidsSameUser(
      m.sender,
      botJid
    )

    if (m.key?.id) {
      generated.key.id = m.key.id
    }

    if (m.name) {
      generated.pushName = m.name
    }

    if (m.isGroup && m.sender) {
      generated.key.participant = m.sender
      generated.participant = m.sender
    }

    const webMessage =
      proto.WebMessageInfo.fromObject(generated)

    webMessage.conn = this

    const update = {
      ...(chatUpdate || {}),
      messages: [webMessage],
      type: 'append'
    }

    if (!this.ev) return

    this.ev.emit(
      'messages.upsert',
      update
    )

  } catch (e) {
    console.error(
      'TemplateResponse error:',
      e?.stack || e
    )
  }
}