import fs from 'fs'
import path from 'path'
import { tmpdir } from 'os'
import crypto from 'crypto'
import ffmpeg from 'fluent-ffmpeg'
import sharp from 'sharp'
import fetch from 'node-fetch'
import { fileTypeFromBuffer } from 'file-type'
import WebP from 'node-webpmux'

const tmpFile = ext =>
  path.join(tmpdir(), `${crypto.randomBytes(8).toString('hex')}.${ext}`)

async function fetchBuffer(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return Buffer.from(await res.arrayBuffer())
}

async function imageWebp(buffer, opts = {}) {
  const size = 512
  const mode = opts.mode || 'crop'

  let image = sharp(buffer, { failOn: 'none' }).rotate()

  if (opts.effect === 'grayscale') image = image.grayscale()
  if (opts.effect === 'sepia') image = image.modulate({ saturation: 0.5 })
  if (opts.effect === 'negate') image = image.negate()
  if (opts.effect === 'blur') image = image.blur(4)
  if (opts.effect === 'sharpen') image = image.sharpen()
  if (opts.effect === 'flop') image = image.flop()
  if (opts.effect === 'flip') image = image.flip()

  if (opts.effect === 'rotate90') image = image.rotate(90)
  if (opts.effect === 'rotate180') image = image.rotate(180)
  if (opts.effect === 'rotate270') image = image.rotate(270)

  if (opts.effect === 'pixelate') {
    const small = await image
      .resize(32, 32, { fit: 'cover' })
      .png()
      .toBuffer()

    return sharp(small)
      .resize(size, size, {
        kernel: sharp.kernel.nearest
      })
      .webp({ quality: 85 })
      .toBuffer()
  }

  const base = await image
    .resize(size, size, {
      fit: mode === 'full' ? 'contain' : 'cover',
      position: 'centre',
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .ensureAlpha()
    .png()
    .toBuffer()

  if (opts.shape) {
    let svg

    if (opts.shape === 'circle') {
      svg = `
      <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
        <circle cx="256" cy="256" r="256" fill="white"/>
      </svg>`
    } else if (opts.shape === 'heart') {
      svg = `
      <svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
        <path fill="white"
        d="M256 470
        C230 445 55 340 55 185
        C55 100 115 45 185 45
        C220 45 245 62 256 95
        C267 62 292 45 327 45
        C397 45 457 100 457 185
        C457 340 282 445 256 470Z"/>
      </svg>`
    } else {
      svg = `
      <svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
        <rect width="512" height="512" rx="80" ry="80" fill="white"/>
      </svg>`
    }

    const mask = await sharp(Buffer.from(svg))
      .resize(512, 512)
      .png()
      .toBuffer()

    const shaped = await sharp(base)
      .composite([
        {
          input: mask,
          blend: 'dest-in'
        }
      ])
      .png()
      .toBuffer()

    return sharp(shaped)
      .webp({
        quality: 85,
        alphaQuality: 100,
        lossless: false
      })
      .toBuffer()
  }

  return sharp(base)
    .webp({
      quality: 85,
      alphaQuality: 100,
      lossless: false
    })
    .toBuffer()
}

async function videoWebp(buffer, opts = {}) {
  const input = tmpFile('mp4')
  const output = tmpFile('webp')

  fs.writeFileSync(input, buffer)

  try {
    await new Promise((resolve, reject) => {
      const filter = opts.mode === 'full'
        ? 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0,fps=15'
        : 'scale=512:512:force_original_aspect_ratio=increase,crop=512:512,fps=15'

      ffmpeg(input)
        .outputOptions([
          '-vcodec', 'libwebp',
          '-vf', filter,
          '-loop', '0',
          '-t', '10',
          '-an',
          '-vsync', '0',
          '-q:v', '70'
        ])
        .toFormat('webp')
        .on('error', reject)
        .on('end', resolve)
        .save(output)
    })

    const result = fs.readFileSync(output)

    if (!result.length) {
      throw new Error('FFmpeg generó un WebP vacío')
    }

    return result
  } finally {
    if (fs.existsSync(input)) fs.unlinkSync(input)
    if (fs.existsSync(output)) fs.unlinkSync(output)
  }
}

export async function imageToWebp(buffer, opts = {}) {
  return imageWebp(buffer, opts)
}

export async function videoToWebp(buffer, opts = {}) {
  return videoWebp(buffer, opts)
}

export async function addExif(
  webpSticker,
  packname = '',
  author = '',
  categories = ['🤖', '⚡', '🔥']
) {
  if (!Buffer.isBuffer(webpSticker) || !webpSticker.length) {
    throw new Error('WebP inválido')
  }

  const json = {
    'sticker-pack-id': crypto.randomBytes(32).toString('hex'),
    'sticker-pack-name': String(packname || ''),
    'sticker-pack-publisher': String(author || ''),
    emojis: Array.isArray(categories) ? categories : ['🤖']
  }

  const exifAttr = Buffer.from([
    0x49, 0x49, 0x2A, 0x00,
    0x08, 0x00, 0x00, 0x00,
    0x01, 0x00,
    0x41, 0x57,
    0x07, 0x00,
    0x00, 0x00,
    0x00, 0x00,
    0x16, 0x00,
    0x00, 0x00
  ])

  const jsonBuffer = Buffer.from(JSON.stringify(json), 'utf8')
  const exif = Buffer.concat([exifAttr, jsonBuffer])

  exif.writeUInt32LE(jsonBuffer.length, 14)

  const img = new WebP.Image()

  await img.load(webpSticker)

  img.exif = exif

  const result = await img.save(null)

  if (!Buffer.isBuffer(result) || !result.length) {
    throw new Error('No se pudo agregar EXIF al sticker')
  }

  return result
}

export async function sticker(
  img,
  url,
  packname = '',
  author = '',
  categories = ['🍧'],
  _size = 512,
  opts = {}
) {
  if (!img && url) {
    img = await fetchBuffer(url)
  }

  if (!Buffer.isBuffer(img) || !img.length) {
    throw new Error('Buffer inválido o vacío')
  }

  const type = await fileTypeFromBuffer(img)
  const mime = type?.mime || ''

  let result

  if (mime.startsWith('video/')) {
    result = await videoToWebp(img, opts)
  } else if (mime === 'image/gif') {
    result = await videoToWebp(img, opts)
  } else if (mime.startsWith('image/')) {
    result = await imageToWebp(img, opts)
  } else {
    throw new Error(`Formato no soportado: ${mime || 'desconocido'}`)
  }

  if (!Buffer.isBuffer(result) || !result.length) {
    throw new Error('No se pudo generar el WebP')
  }

  return await addExif(
    result,
    packname,
    author,
    categories
  )
}

function escapeXml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function wrapText(text, maxChars = 18) {
  const words = String(text).split(/\s+/)
  const lines = []
  let line = ''

  for (const word of words) {
    if ((line + ' ' + word).trim().length > maxChars) {
      if (line) lines.push(line)
      line = word
    } else {
      line = (line + ' ' + word).trim()
    }
  }

  if (line) lines.push(line)

  return lines.slice(0, 8)
}

export async function textToSticker(
  text,
  packname = '',
  author = '',
  opts = {}
) {
  const style = opts.style || 'brat'
  const size = 512
  const safe = escapeXml(text)

  let background = '#ffffff'
  let color = '#000000'
  let fontSize = 48
  let weight = 700

  if (style === 'brat') {
    background = '#ffffff'
    color = '#000000'
    fontSize = 50
    weight = 700
  }

  if (style === 'normal') {
    background = '#111111'
    color = '#ffffff'
    fontSize = 46
  }

  if (style === 'quote') {
    background = '#111111'
    color = '#ffffff'
    fontSize = 40
  }

  if (style === 'emoji') {
    background = '#ffffff'
    color = '#000000'
    fontSize = 110
    weight = 400
  }

  const lines = wrapText(safe, style === 'emoji' ? 5 : 18)

  const lineHeight = fontSize * 1.15
  const startY = 256 - ((lines.length - 1) * lineHeight) / 2

  const textSvg = lines.map((line, index) => `
    <text
      x="256"
      y="${startY + index * lineHeight}"
      text-anchor="middle"
      dominant-baseline="middle"
      font-family="Arial, Helvetica, sans-serif"
      font-size="${fontSize}px"
      font-weight="${weight}"
      fill="${color}">
      ${line}
    </text>
  `).join('')

  const svg = `
  <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="512" height="512" fill="${background}"/>
    ${textSvg}
  </svg>`

  const png = await sharp(Buffer.from(svg))
    .png()
    .toBuffer()

  const webp = await sharp(png)
    .webp({
      quality: 90,
      alphaQuality: 100
    })
    .toBuffer()

  return await addExif(
    webp,
    packname,
    author,
    ['🤖', '⚡', '🔥']
  )
}

export const support = {
  ffmpeg: true,
  ffprobe: true,
  ffmpegWebp: true,
  convert: false,
  magick: false,
  gm: false,
  find: false
}

export default {
  sticker,
  textToSticker,
  imageToWebp,
  videoToWebp,
  addExif,
  support
}