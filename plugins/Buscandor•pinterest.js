import { pinterest } from 'btch-downloader'
import crypto from 'crypto'

const extractPinterestImages = (data) => {
  const images = new Set()

  const scan = (value) => {
    if (!value) return

    if (typeof value === 'string') {
      if (
        value.startsWith('http') &&
        value.includes('pinimg.com') &&
        !value.includes('/75x75') &&
        !value.includes('/30x30') &&
        !value.includes('/60x60')
      ) {
        images.add(value)
      }
      return
    }

    if (Array.isArray(value)) {
      for (const item of value) scan(item)
      return
    }

    if (typeof value !== 'object') return

    for (const [key, item] of Object.entries(value)) {
      if (
        typeof item === 'string' &&
        item.startsWith('http') &&
        item.includes('pinimg.com') &&
        !item.includes('/75x75') &&
        !item.includes('/30x30') &&
        !item.includes('/60x60')
      ) {
        images.add(item)
      }

      scan(item)
    }
  }

  scan(data)

  return [...images]
}

const getPinterestImages = async (query) => {
  const data = await pinterest(query)
  return extractPinterestImages(data)
}

const getOriginalUrl = (url) => {
  if (!url.includes('pinimg.com')) return url

  return url
    .replace(/\/\d+x\d+_RS\//, '/originals/')
    .replace(/\/\d+x\d+\//, '/originals/')
}

const downloadImage = async (url) => {
  const originalUrl = getOriginalUrl(url)

  const response = await fetch(originalUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36',
      'Referer': 'https://www.pinterest.com/'
    }
  })

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }

  return {
    buffer: Buffer.from(await response.arrayBuffer()),
    url: originalUrl
  }
}

const getDifferentImages = async (urls) => {
  const results = []
  const hashes = new Set()

  for (const url of urls) {
    try {
      const { buffer, url: originalUrl } = await downloadImage(url)

      const hash = crypto
        .createHash('sha1')
        .update(buffer)
        .digest('hex')

      if (hashes.has(hash)) continue

      hashes.add(hash)

      results.push({
        buffer,
        url: originalUrl
      })

      if (results.length >= 8) break
    } catch {}
  }

  return results
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
  const text = args.join(' ').trim()

  if (!text) {
    return conn.reply(
      m.chat,
      `⚠️ Ingresa algo para buscar en Pinterest.\n\nEjemplo:\n${usedPrefix + command} black clover`,
      m
    )
  }

  await m.react('⏳')

  try {
    const images = await getPinterestImages(text)

    if (!images.length) {
      await m.react('❌')
      return conn.reply(
        m.chat,
        `⚠️ Sin resultados para: ${text}`,
        m
      )
    }

    const differentImages = await getDifferentImages(images)

    if (!differentImages.length) {
      await m.react('❌')
      return conn.reply(
        m.chat,
        `⚠️ No pude encontrar una imagen HD válida para: ${text}`,
        m
      )
    }

    const selected =
      differentImages[
        Math.floor(Math.random() * differentImages.length)
      ]

    await conn.sendMessage(
      m.chat,
      {
        image: selected.buffer,
        caption:
          `乂 *P I N T E R E S T* 乂\n\n` +
          `🔍 *Búsqueda:* ${text}\n` +
          `✨ *Calidad:* HD\n\n` +
          `> *by The Carlos 👑*`
      },
      { quoted: m }
    )

    await m.react('✅')

  } catch (e) {
    console.error('Pinterest:', e)

    await m.react('❌')

    return conn.reply(
      m.chat,
      `❌ Error al buscar la imagen:\n${e.message}`,
      m
    )
  }
}

handler.pinmore = async (m, { conn, args, usedPrefix }) => {
  const text = args.join(' ').trim()

  if (!text) {
    return m.reply(
      `⚠️ Escribe una búsqueda.\n\nEjemplo:\n${usedPrefix}pinmore black clover`
    )
  }

  await m.react('⏳')

  try {
    const images = await getPinterestImages(text)

    if (!images.length) {
      await m.react('❌')
      return m.reply(`❌ Sin resultados para: ${text}`)
    }

    const differentImages = await getDifferentImages(images)

    if (!differentImages.length) {
      await m.react('❌')
      return m.reply(`❌ No encontré imágenes HD válidas.`)
    }

    const selected =
      differentImages[
        Math.floor(Math.random() * differentImages.length)
      ]

    await conn.sendMessage(
      m.chat,
      {
        image: selected.buffer,
        caption:
          `📸 *Pinterest HD*\n\n` +
          `🔍 *Búsqueda:* ${text}\n` +
          `✨ *Calidad original*\n\n` +
          `> *by The Carlos 👑*`
      },
      { quoted: m }
    )

    await m.react('✅')

  } catch (e) {
    console.error('Pinterest More:', e)

    await m.react('❌')

    return m.reply(
      `❌ Error al buscar la imagen:\n${e.message}`
    )
  }
}

handler.pindl = async (m, { conn, args }) => {
  const url = args.join(' ').trim()

  if (!url || !url.startsWith('http')) {
    return m.reply('❌ URL inválida')
  }

  await m.react('⏳')

  try {
    const { buffer } = await downloadImage(url)

    await conn.sendMessage(
      m.chat,
      {
        document: buffer,
        mimetype: 'image/jpeg',
        fileName: `pinterest_HD_${Date.now()}.jpg`,
        caption: '⬇️ *Pinterest HD Original*\n\n> by The Carlos 👑'
      },
      { quoted: m }
    )

    await m.react('✅')

  } catch (e) {
    console.error('Pinterest Download:', e)

    await m.react('❌')

    return m.reply(
      `❌ Error al descargar:\n${e.message}`
    )
  }
}

handler.before = async (m, { conn }) => {
  const text = m.text || ''

  if (text.startsWith('.pinmore ')) {
    const args = text.slice(9).trim().split(/\s+/)

    return handler.pinmore(m, {
      conn,
      args,
      usedPrefix: '.'
    })
  }

  if (text.startsWith('.pindl ')) {
    const args = text.slice(7).trim().split(/\s+/)

    return handler.pindl(m, {
      conn,
      args
    })
  }
}

handler.help = [
  'pinterest <búsqueda>',
  'pin <búsqueda>',
  'pinmore <búsqueda>',
  'pindl <url>'
]

handler.tags = ['search']

handler.command = [
  'pinterest',
  'pin',
  'pinmore',
  'pindl'
]

handler.limit = true

export default handler