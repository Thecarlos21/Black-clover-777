import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'
import FormData from 'form-data'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const uploaders = [
  {
    name: 'Catbox',
    fn: async (buffer, filename) => {
      const form = new FormData()
      form.append('reqtype', 'fileupload')
      form.append('fileToUpload', buffer, {
        filename,
        contentType: 'application/octet-stream'
      })

      const res = await fetch('https://catbox.moe/user/api.php', {
        method: 'POST',
        body: form,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          ...form.getHeaders()
        }
      })

      const url = await res.text()

      if (!res.ok) throw new Error(`Catbox HTTP ${res.status}`)
      if (!url?.trim().startsWith('https://files.catbox.moe/')) {
        throw new Error(url || 'Catbox no devolvió una URL')
      }

      return url.trim()
    }
  },
  {
    name: 'Tmpfiles',
    fn: async (buffer, filename) => {
      const form = new FormData()

      form.append('file', buffer, {
        filename,
        contentType: 'application/octet-stream'
      })

      const res = await fetch('https://tmpfiles.org/api/v1/upload', {
        method: 'POST',
        body: form,
        headers: form.getHeaders()
      })

      const json = await res.json()

      if (!res.ok || !json?.data?.url) {
        throw new Error(json?.message || 'Tmpfiles falló')
      }

      return json.data.url.replace(
        'https://tmpfiles.org/',
        'https://tmpfiles.org/dl/'
      )
    }
  },
  {
    name: 'Pomf2',
    fn: async (buffer, filename) => {
      const form = new FormData()

      form.append('files[]', buffer, {
        filename,
        contentType: 'application/octet-stream'
      })

      const res = await fetch('https://pomf2.lain.la/upload.php', {
        method: 'POST',
        body: form,
        headers: form.getHeaders()
      })

      const json = await res.json()

      if (!res.ok || !json?.success || !json?.files?.[0]?.url) {
        throw new Error('Pomf2 falló')
      }

      return json.files[0].url
    }
  }
]

const handler = async (m, { usedPrefix, command }) => {
  const q = m.quoted || m
  const mime = (q.msg || q).mimetype || q.mediaType || ''

  if (!mime || !/image\/(jpe?g|png|webp)|video|audio|sticker/.test(mime)) {
    return m.reply(`> Responde a una imagen, video, audio o sticker con ${usedPrefix + command}`)
  }

  await m.react('⏳')

  try {
    const media = await q.download?.()

    if (!media) throw new Error('No se pudo descargar el archivo')

    let ext = 'bin'

    if (mime.includes('/')) {
      ext = mime.split('/')[1]?.split(';')[0] || 'bin'
    }

    if (mime.includes('jpeg') || mime.includes('jpg')) ext = 'jpg'
    if (mime.includes('png')) ext = 'png'
    if (mime.includes('webp')) ext = 'webp'
    if (mime.includes('gif')) ext = 'gif'
    if (mime.includes('mp4')) ext = 'mp4'
    if (mime.includes('3gp')) ext = '3gp'
    if (mime.includes('mpeg')) ext = 'mp3'
    if (mime.includes('ogg')) ext = 'ogg'
    if (mime.includes('opus')) ext = 'opus'

    let url = null
    let server = ''
    const errors = []

    for (const uploader of uploaders) {
      try {
        url = await uploader.fn(media, `file.${ext}`)
        server = uploader.name
        break
      } catch (e) {
        errors.push(`> ${uploader.name}: ${e?.message || 'Error'}`)
      }
    }

    if (!url) {
      await m.react('❌')
      return m.reply(
        `> ❌ Fallaron todos los servidores\n\n${errors.join('\n')}`
      )
    }

    await m.react('✅')

    const size = (media.length / 1024 / 1024).toFixed(2)

    await m.reply(
      `> 🔗 URL: ${url}\n` +
      `> 📦 Tipo: ${mime}\n` +
      `> 📏 Tamaño: ${size} MB\n` +
      `> 🖥️ Servidor: ${server}`
    )

  } catch (e) {
    console.error('[TOURL]', e)
    await m.react('❌')
    await m.reply(`> ❌ Error: ${e?.message || 'Error desconocido'}`)
  }
}

handler.help = ['tourl']
handler.tags = ['herramientas']
handler.command = ['tourl', 'upload', 'imgurl', 'url']
handler.limit = true

export default handler