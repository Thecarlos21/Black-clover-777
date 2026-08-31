import yts from 'yt-search'
import { generateWAMessageContent } from '@whiskeysockets/baileys'
import moment from 'moment-timezone'

const handler = async (m, { conn, text, usedPrefix, command }) => {
  if (!text) {
    throw `❗ Ingresa un texto\nEjemplo: ${usedPrefix + command} Nombre`
  }

  if (m.isCommandAlreadyRun) return
  m.isCommandAlreadyRun = true

  try {
    const { all } = await yts(text)
    const videoInfo = all?.[0]

    if (!videoInfo) {
      throw '❗ No se encontró ningún resultado.'
    }

    const authorUrl = videoInfo.author?.url || videoInfo.url

    const greeting = getGreeting()

    const body =
      `${greeting} @${m.sender.split('@')[0]} 👋\n\n` +
      `🎵 *${videoInfo.title}*\n` +
      `👤 ${videoInfo.author?.name || 'Desconocido'}\n` +
      `⏱️ ${videoInfo.timestamp || 'Desconocido'}\n\n` +
      `📌 *Selecciona una opción:*`

    const { imageMessage } = await generateWAMessageContent(
      {
        image: {
          url: videoInfo.thumbnail
        }
      },
      {
        upload: conn.waUploadToServer
      }
    )

    const message = {
      interactiveMessage: {
        header: {
          title: '𝕭𝖑𝖆𝖈𝖐 𝕮𝖑𝖔𝖛𝖊𝖗 ☘︎',
          hasMediaAttachment: true,
          imageMessage
        },
        body: {
          text: body
        },
        footer: {
          text: '⚔️ Black Clover • YouTube Downloader'
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: '🎧 MP3',
                id: `${usedPrefix}ytmp3 ${videoInfo.url}`
              })
            },
            {
              name: 'quick_reply',
              buttonParamsJson: JSON.stringify({
                display_text: '📹 MP4',
                id: `${usedPrefix}ytmp4 ${videoInfo.url}`
              })
            },
            {
              name: 'single_select',
              buttonParamsJson: JSON.stringify({
                title: 'ᴼᴾᶜᴵᴼᴺᴱˢ',
                sections: [
                  {
                    title: '🎧 AUDIO',
                    rows: [
                      {
                        title: 'MP3',
                        description: videoInfo.timestamp || 'Audio',
                        id: `${usedPrefix}ytmp3 ${videoInfo.url}`
                      },
                      {
                        title: 'MP3 Doc',
                        description: 'Enviar como archivo',
                        id: `${usedPrefix}ytmp3doc ${videoInfo.url}`
                      }
                    ]
                  },
                  {
                    title: '📹 VIDEO',
                    rows: [
                      {
                        title: 'MP4',
                        description: videoInfo.timestamp || 'Video',
                        id: `${usedPrefix}ytmp4 ${videoInfo.url}`
                      },
                      {
                        title: 'MP4 Doc',
                        description: 'Enviar como archivo',
                        id: `${usedPrefix}ytmp4doc ${videoInfo.url}`
                      }
                    ]
                  },
                  {
                    title: 'ℹ️ INFORMACIÓN',
                    rows: [
                      {
                        title: 'YouTube',
                        description: 'Abrir video',
                        id: `${usedPrefix}ytlink ${videoInfo.url}`
                      },
                      {
                        title: 'Canal',
                        description: videoInfo.author?.name || 'Canal',
                        id: `${usedPrefix}ytchannel ${authorUrl}`
                      }
                    ]
                  }
                ]
              })
            }
          ]
        },
        contextInfo: {
          mentionedJid: [m.sender],
          forwardingScore: 1,
          isForwarded: true
        }
      }
    }

    const messageContent = {
      viewOnceMessage: {
        message
      }
    }

    const sent = await conn.relayMessage(
      m.chat,
      messageContent,
      {
        messageId: m.key?.id || `${Date.now()}`
      }
    )

    if (sent !== false) {
      await m.react('👾')
    }

  } catch (e) {
    console.error('PLAY ERROR:', e)

    throw `❗ ${e?.message || e || 'No se pudo mostrar el menú de Play.'}`
  }
}

handler.command = ['play', 'playvid', 'play2']
handler.tags = ['descargas']
handler.group = true
handler.limit = 6

export default handler

const getGreeting = () => {
  const h = moment().tz('America/Mexico_City').hour()

  return h < 12
    ? 'Buenos días'
    : h < 19
      ? 'Buenas tardes'
      : 'Buenas noches'
}