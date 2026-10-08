import axios from 'axios'
import path from 'path'
import fs from 'fs'
import { lookup } from 'mime-types'
import cheerio from 'cheerio'

let handler = async (m, { conn, usedPrefix, command, text }) => {
  if (!text) return m.reply(
    `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *MEDIAFIRE* ! ୧ ֹ ִ

> ✐ Usa el comando así:
> ${usedPrefix + command} https://www.mediafire.com/...

࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆`
  )

  let tempFile = null

  try {
    if (!/^https?:\/\/(www\.)?mediafire\.com\/.+/i.test(text)) {
      return m.reply(
        `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *ERROR* ! ୧ ֹ ִ

> ✐ El enlace no es válido.

࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆`
      )
    }

    await m.reply(
      `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *MEDIAFIRE* ! ୧ ֹ ִ

> ✐ Obteniendo información...
> ✐ Espera un momento.

࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆`
    )

    const scraped = await mediafireDl(text)

    if (!scraped?.downloadLink) {
      throw new Error('No se encontró el enlace de descarga')
    }

    const title = (scraped.filename || 'archivo').trim()
    const ext = path.extname(title) || (scraped.type ? `.${scraped.type}` : '')
    const tipo = lookup(ext.toLowerCase()) || 'application/octet-stream'

    const tmpDir = path.resolve('./tmp')

    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true })
    }

    const stats = fs.statfsSync(tmpDir)
    const freeSpace = Number(stats.bavail) * Number(stats.bsize)

    if (freeSpace < 100 * 1024 * 1024) {
      throw new Error(
        `No hay suficiente espacio en ./tmp. Espacio disponible: ${formatBytes(freeSpace)}`
      )
    }

    const safeName = title.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')

    tempFile = path.join(
      tmpDir,
      `mediafire_${Date.now()}_${Math.random().toString(36).slice(2)}_${safeName}`
    )

    const response = await axios.get(scraped.downloadLink, {
      responseType: 'stream',
      timeout: 180000,
      maxRedirects: 5,
      headers: {
        'User-Agent': UA,
        Accept: '*/*'
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity
    })

    const contentLength = Number(response.headers?.['content-length'] || 0)

    if (contentLength > 0 && contentLength > freeSpace) {
      throw new Error(
        `El archivo pesa ${formatBytes(contentLength)} y solo hay ${formatBytes(freeSpace)} disponibles en ./tmp`
      )
    }

    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(tempFile)

      response.data.pipe(writer)

      writer.on('finish', resolve)
      writer.on('error', reject)
      response.data.on('error', reject)
    })

    const fileBuffer = fs.readFileSync(tempFile)

    let info = `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *MEDIAFIRE* ! ୧ ֹ ִ

> ✐ *Nombre* › ${title}
> ✐ *Tipo* › ${tipo}`

    if (scraped.size) {
      info += `\n> ✐ *Peso* › ${scraped.size}`
    }

    if (scraped.uploaded) {
      info += `\n> ✐ *Subido* › ${scraped.uploaded}`
    }

    info += `\n> ✐ *Estado* › Completado

> ✐ Archivo descargado correctamente.

࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆`

    await conn.sendMessage(
      m.chat,
      {
        document: fileBuffer,
        mimetype: tipo,
        fileName: title,
        caption: info,
        mentions: [m.sender]
      },
      { quoted: m }
    )

    if (tempFile && fs.existsSync(tempFile)) {
      fs.unlinkSync(tempFile)
      tempFile = null
    }

  } catch (e) {
    if (tempFile && fs.existsSync(tempFile)) {
      try {
        fs.unlinkSync(tempFile)
      } catch {}
    }

    return m.reply(
      `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *ᴇʀʀᴏʀ* ! ୧ ֹ ִ

> ✐ ${e?.message || 'Ocurrió un error durante la descarga.'}

࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆`
    )
  }
}

handler.help = ['mediafire <url>', 'mf <url>']
handler.tags = ['downloads']
handler.command = ['mediafire', 'mf']
handler.register = true

export default handler

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36'

function cleanText(x) {
  return String(x || '').replace(/\s+/g, ' ').trim()
}

function normalizeUrl(u) {
  const s = cleanText(u)

  if (!s) return null

  if (/^https?:\/\//i.test(s)) return s

  if (s.startsWith('//')) {
    return 'https:' + s
  }

  if (s.startsWith('/')) {
    return 'https://www.mediafire.com' + s
  }

  return s
}

function pickFilename($) {
  let filename = cleanText($('.intro .filename').text())

  if (!filename) {
    filename = cleanText($('meta[property="og:title"]').attr('content'))
  }

  if (!filename) {
    filename = cleanText($('title').text())
  }

  return filename || null
}

function pickFiletypeText($) {
  const type = cleanText($('.filetype').text())
  return type || null
}

function pickTypeFromFilename(name) {
  if (!name) return null

  const match = String(name).match(/\.([a-z0-9]{1,10})$/i)

  return match?.[1]?.toLowerCase() || null
}

function pickDetails($) {
  let size = null
  let uploaded = null

  $('ul.details li').each((_, el) => {
    const text = cleanText($(el).text())

    if (!size && /File size:/i.test(text)) {
      size = cleanText($(el).find('span').text()) || null
    }

    if (!uploaded && /Uploaded:/i.test(text)) {
      uploaded = cleanText($(el).find('span').text()) || null
    }
  })

  return {
    size,
    uploaded
  }
}

async function mediafireDl(url, timeout = 45000) {
  const mediafireUrl = cleanText(url)

  if (!mediafireUrl) {
    throw new Error('URL requerida')
  }

  const res = await axios.get(mediafireUrl, {
    timeout,
    maxRedirects: 5,
    headers: {
      'User-Agent': UA,
      'Accept-Language': 'en-US,en;q=0.9',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.8,*/*;q=0.7'
    },
    validateStatus: () => true
  })

  if (res.status < 200 || res.status >= 400) {
    throw new Error(`MediaFire HTTP ${res.status}`)
  }

  const $ = cheerio.load(String(res.data || ''))

  const downloadLinkRaw =
    $('#downloadButton').attr('href') ||
    $('a#downloadButton').attr('href') ||
    null

  const downloadLink = normalizeUrl(downloadLinkRaw)

  if (!downloadLink) {
    throw new Error('No se encontró el enlace de descarga')
  }

  const filename = pickFilename($)
  const filetype = pickFiletypeText($)
  const { size, uploaded } = pickDetails($)

  const type =
    pickTypeFromFilename(filename) ||
    (filetype ? cleanText(filetype).toLowerCase() : null)

  return {
    downloadLink,
    filename,
    filetype,
    size,
    uploaded,
    type
  }
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  )

  return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`
}
