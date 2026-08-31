import fs            from 'fs'
import path          from 'path'
import { tmpdir }    from 'os'
import Crypto        from 'crypto'
import ff            from 'fluent-ffmpeg'
import webp          from 'node-webpmux'
import sharp         from 'sharp'
import fetch         from 'node-fetch'
import { fileTypeFromBuffer } from 'file-type'

function tmpFile(ext) {
  return path.join(tmpdir(), `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.${ext}`)
}

async function fetchBuffer(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`fetchBuffer: ${url} → ${res.status} ${res.statusText}`)
  return Buffer.from(await res.arrayBuffer())
}

function buildMaskSvg(shape, size) {
  if (shape === 'circle') {
    const r = size / 2
    return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${r}" cy="${r}" r="${r}" fill="#fff"/>
    </svg>`
  }
  if (shape === 'heart') {
    return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path fill="#fff" d="M50 88
        C 20 65, 5 45, 5 28
        C 5 12, 18 2, 32 2
        C 42 2, 48 8, 50 15
        C 52 8, 58 2, 68 2
        C 82 2, 95 12, 95 28
        C 95 45, 80 65, 50 88 Z"/>
    </svg>`
  }
  return null
}

async function applyShapeMask(inputBuffer, shape, size = 512) {
  const base = await sharp(inputBuffer)
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .ensureAlpha()
    .png()
    .toBuffer()

  const maskSvg = buildMaskSvg(shape, size)
  if (!maskSvg) return base

  const mask = await sharp(Buffer.from(maskSvg)).png().toBuffer()
  return sharp(base)
    .composite([{ input: mask, blend: 'dest-in' }])
    .png()
    .toBuffer()
}

async function buildMaskPng(shape, size) {
  const svg = buildMaskSvg(shape, size)
  if (!svg) return null
  return sharp(Buffer.from(svg)).png().toBuffer()
}

async function toWebp(media, type, opts = {}) {
  const { mode = 'square', shape = null } = opts
  const size   = 512
  const tmpIn  = tmpFile(type === 'video' ? 'mp4' : 'png')
  const tmpOut = tmpFile('webp')

  let inputBuffer = media
  let maskPath    = null

  if (shape && type === 'image') {
    inputBuffer = await applyShapeMask(media, shape, size)
  }

  fs.writeFileSync(tmpIn, inputBuffer)

  try {
    await new Promise((resolve, reject) => {
      let cmd = ff(tmpIn)

      if (type === 'video') {
        if (shape) {
          // Video con forma: alphamerge con máscara
          buildMaskPng(shape, size).then(maskPng => {
            if (!maskPng) return reject(new Error('Máscara vacía'))
            maskPath = tmpFile('png')
            fs.writeFileSync(maskPath, maskPng)

            ff(tmpIn)
              .input(maskPath)
              .complexFilter(
                `[0:v]scale=${size}:${size}:force_original_aspect_ratio=increase,crop=${size}:${size},fps=15[base];` +
                `[1:v]format=gray[mask];` +
                `[base][mask]alphamerge,format=rgba[out]`
              )
              .addOutputOptions([
                '-map', '[out]',
                '-vcodec', 'libwebp',
                '-loop', '0', '-ss', '00:00:00', '-t', '00:00:05',
                '-preset', 'default', '-an', '-vsync', '0'
              ])
              .on('error', reject)
              .on('end', () => resolve())
              .toFormat('webp')
              .save(tmpOut)
          }).catch(reject)
          return
        }

        if (mode === 'full') {
          cmd.addOutputOptions([
            '-vcodec', 'libwebp',
            `-vf`, `scale='min(${size},iw)':'min(${size},ih)':force_original_aspect_ratio=decrease,pad=${size}:${size}:(ow-iw)/2:(oh-ih)/2:color=00000000,fps=15`,
            '-loop', '0', '-ss', '00:00:00', '-t', '00:00:05',
            '-preset', 'default', '-an', '-vsync', '0'
          ])
        } else {
          cmd.addOutputOptions([
            '-vcodec', 'libwebp',
            '-vf', 'scale=320:320:force_original_aspect_ratio=increase,crop=320:320,fps=15',
            '-loop', '0', '-ss', '00:00:00', '-t', '00:00:05',
            '-preset', 'default', '-an', '-vsync', '0'
          ])
        }

      } else {
        if (shape) {
          cmd.addOutputOptions(['-vcodec', 'libwebp'])
        } else if (mode === 'full') {
          cmd.addOutputOptions([
            '-vcodec', 'libwebp',
            `-vf`, `scale='min(${size},iw)':'min(${size},ih)':force_original_aspect_ratio=decrease,pad=${size}:${size}:(ow-iw)/2:(oh-ih)/2:color=00000000`
          ])
        } else {
          cmd.addOutputOptions([
            '-vcodec', 'libwebp',
            '-vf', 'scale=320:320:force_original_aspect_ratio=increase,crop=320:320'
          ])
        }
      }

      cmd
        .on('error', reject)
        .on('end', () => resolve())
        .toFormat('webp')
        .save(tmpOut)
    })

    return fs.readFileSync(tmpOut)

  } finally {
    if (fs.existsSync(tmpIn))               fs.unlinkSync(tmpIn)
    if (fs.existsSync(tmpOut))              fs.unlinkSync(tmpOut)
    if (maskPath && fs.existsSync(maskPath)) fs.unlinkSync(maskPath)
  }
}

export async function imageToWebp(media, opts = {}) {
  return toWebp(media, 'image', opts)
}

export async function videoToWebp(media, opts = {}) {
  return toWebp(media, 'video', opts)
}

export async function addExif(webpBuffer, packname = '', author = '', categories = ['🍧'], extra = {}) {
  const tmpIn  = tmpFile('webp')
  const tmpOut = tmpFile('webp')
  fs.writeFileSync(tmpIn, webpBuffer)

  try {
    const img  = new webp.Image()
    const json = {
      'sticker-pack-id':        `BlackClover-${Crypto.randomBytes(4).toString('hex')}`,
      'sticker-pack-name':      packname,
      'sticker-pack-publisher': author,
      'emojis':                 categories,
      ...extra
    }
    const exifAttr = Buffer.from([
      0x49,0x49,0x2a,0x00,0x08,0x00,0x00,0x00,
      0x01,0x00,0x41,0x57,0x07,0x00,0x00,0x00,
      0x00,0x00,0x16,0x00,0x00,0x00
    ])
    const jsonBuf = Buffer.from(JSON.stringify(json), 'utf-8')
    const exif    = Buffer.concat([exifAttr, jsonBuf])
    exif.writeUIntLE(jsonBuf.length, 14, 4)

    await img.load(tmpIn)
    img.exif = exif
    await img.save(tmpOut)

    return fs.readFileSync(tmpOut)
  } finally {
    if (fs.existsSync(tmpIn))  fs.unlinkSync(tmpIn)
    if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut)
  }
}

export async function sticker(img, url, packname = '', author = '', categories = ['🍧'], _size, opts = {}) {
  if (!img && url)  img = await fetchBuffer(url)
  if (!Buffer.isBuffer(img)) throw new Error('sticker: se requiere un Buffer o una URL válida')

  const { mime } = await fileTypeFromBuffer(img) || { mime: 'application/octet-stream' }
  const isVideo  = /video/.test(mime)

  const webpBuf = isVideo
    ? await videoToWebp(img, opts)
    : await imageToWebp(img, opts)

  try {
    return await addExif(webpBuf, packname, author, categories)
  } catch {
    return webpBuf
  }
}

export const support = {
  ffmpeg:     true,
  ffprobe:    true,
  ffmpegWebp: true,
  convert:    false,
  magick:     false,
  gm:         false,
  find:       false
}

export default { sticker, imageToWebp, videoToWebp, addExif, support }
