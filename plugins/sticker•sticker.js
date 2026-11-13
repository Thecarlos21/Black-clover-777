import { sticker, textToSticker } from '../lib/sticker.js'

global.packsticker = '𝕭𝖑𝖆𝖈𝖐 𝕮𝖑𝖔𝖛𝖊𝖗 ᚲ 𝐓𝐇𝐄 𝐂𝐀𝐑𝐋𝐎𝐒'
global.author = '👾'

let handler = async (m, { conn, args, usedPrefix, command }) => {
  let stiker = null

  try {
    const q = m.quoted ? m.quoted : m
    const msg = q.msg || q
    const mime = msg.mimetype || q.mediaType || ''
    const option = args[0]?.toLowerCase()

    if (/image|video|webp/.test(mime)) {
      if (/video/.test(mime) && msg.seconds > 10) {
        return m.reply('⚠️ *El video no puede durar más de 10 segundos.*')
      }

      const media = await q.download()

      if (!media) {
        return m.reply('❌ *No se pudo descargar el archivo. Responde a una imagen/video/gif.*')
      }

      const options = {
        full: { mode: 'full' },
        crop: { type: 'crop' },
        circle: { shape: 'circle' },
        heart: { shape: 'heart' },
        fullcircle: { mode: 'full', shape: 'circle' },
        fullheart: { mode: 'full', shape: 'heart' },
        square: { mode: 'square' },
        normal: { type: 'default' },
        gray: { effect: 'grayscale' },
        sepia: { effect: 'sepia' },
        invert: { effect: 'negate' },
        blur: { effect: 'blur' },
        sharpen: { effect: 'sharpen' },
        pixel: { effect: 'pixelate' },
        mirror: { effect: 'flop' },
        flip: { effect: 'flip' },
        rotate90: { effect: 'rotate90' },
        rotate180: { effect: 'rotate180' },
        rotate270: { effect: 'rotate270' },
        rounded: { shape: 'rounded' }
      }

      stiker = await sticker(
        media,
        false,
        global.packsticker,
        global.author,
        ['🤖', '⚡', '🔥'],
        512,
        options[option] || { type: 'default' }
      )

    } else if (args[0]) {
      if (option === 'brat' || option === 'text' || option === 'quote' || option === 'emoji') {
        const text = args.slice(1).join(' ').trim()

        if (!text) {
          return m.reply(`📛 *Usa: ${usedPrefix + command} ${option} <texto>*`)
        }

        if (text.length > 300) {
          return m.reply('⚠️ *El texto no puede superar 300 caracteres.*')
        }

        const styles = {
          brat: undefined,
          text: { style: 'normal' },
          quote: { style: 'quote' },
          emoji: { style: 'emoji' }
        }

        stiker = await textToSticker(
          text,
          global.packsticker,
          global.author,
          styles[option]
        )

      } else if (isUrl(args[0])) {
        const url = args[0]
        const urlOption = args[1]?.toLowerCase()

        const options = {
          full: { mode: 'full' },
          crop: { type: 'crop' },
          circle: { shape: 'circle' },
          heart: { shape: 'heart' },
          fullcircle: { mode: 'full', shape: 'circle' },
          fullheart: { mode: 'full', shape: 'heart' },
          gray: { effect: 'grayscale' },
          sepia: { effect: 'sepia' },
          invert: { effect: 'negate' },
          blur: { effect: 'blur' },
          sharpen: { effect: 'sharpen' },
          pixel: { effect: 'pixelate' },
          mirror: { effect: 'flop' },
          flip: { effect: 'flip' }
        }

        stiker = await sticker(
          false,
          url,
          global.packsticker,
          global.author,
          ['🤖', '⚡', '🔥'],
          512,
          options[urlOption] || { type: 'crop' }
        )

      } else {
        return m.reply(`📛 *Usa: ${usedPrefix + command} <imagen|video|url|brat|text|quote|emoji>*`)
      }

    } else {
      return m.reply(
        `📌 *Funciones disponibles:*\n\n` +
        `• ${usedPrefix + command} → Sticker normal\n` +
        `• ${usedPrefix + command} full → Completo\n` +
        `• ${usedPrefix + command} crop → Recortado\n` +
        `• ${usedPrefix + command} circle → Circular\n` +
        `• ${usedPrefix + command} heart → Corazón\n` +
        `• ${usedPrefix + command} fullcircle → Completo + círculo\n` +
        `• ${usedPrefix + command} fullheart → Completo + corazón\n` +
        `• ${usedPrefix + command} square → Cuadrado\n` +
        `• ${usedPrefix + command} gray → Escala de grises\n` +
        `• ${usedPrefix + command} sepia → Sepia\n` +
        `• ${usedPrefix + command} invert → Invertir colores\n` +
        `• ${usedPrefix + command} blur → Desenfoque\n` +
        `• ${usedPrefix + command} sharpen → Nitidez\n` +
        `• ${usedPrefix + command} pixel → Pixelado\n` +
        `• ${usedPrefix + command} mirror → Espejo\n` +
        `• ${usedPrefix + command} flip → Voltear\n` +
        `• ${usedPrefix + command} brat <texto> → Brat\n` +
        `• ${usedPrefix + command} text <texto> → Texto\n` +
        `• ${usedPrefix + command} quote <texto> → Quote\n` +
        `• ${usedPrefix + command} emoji <emoji> → Emoji\n\n` +
        `🌐 También puedes usar una URL de imagen o video.`
      )
    }

  } catch (e) {
    console.error('❌ Error al crear el sticker:', e)
    return m.reply('⚠️ *Ocurrió un error al crear el sticker. El archivo puede estar dañado.*')
  }

  if (!stiker) {
    return m.reply('❌ *No se pudo crear el sticker. Intenta con otro archivo.*')
  }

  try {
    const fileSize = Buffer.isBuffer(stiker) ? stiker.length : 0

    if (fileSize > 1000000) {
      return m.reply('❌ *El sticker pesa más de 1MB. WhatsApp no lo permite.*')
    }

    await conn.sendMessage(
      m.chat,
      { sticker: stiker },
      { quoted: m, ephemeralExpiration: m.isGroup ? 86400 : 0 }
    )

  } catch (e) {
    console.error('⚠️ Error al enviar el sticker:', e)
    return m.reply('❌ *No se pudo enviar el sticker. El formato no es válido para WhatsApp.*')
  }
}

handler.help = ['sticker', 'stiker', 's'].map(v => v + ' <imagen|video|url|brat|text|quote|emoji>')
handler.tags = ['sticker']
handler.command = [
  's',
  'sticker',
  'stiker',
  'full',
  'crop',
  'circle',
  'heart',
  'fullcircle',
  'fullheart',
  'square',
  'normal',
  'gray',
  'sepia',
  'invert',
  'blur',
  'sharpen',
  'pixel',
  'mirror',
  'flip',
  'rotate90',
  'rotate180',
  'rotate270',
  'rounded',
  'brat',
  'text',
  'quote',
  'emoji'
]
handler.group = false
handler.register = true
handler.limit = true

export default handler

function isUrl(text) {
  return /^https?:\/\/.*\.(jpe?g|gif|png|webp|mp4)(?:\?.*)?$/i.test(text)
}