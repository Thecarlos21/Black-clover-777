
import axios from 'axios'
import { uploadImage } from '../lib/functions.js'

let handler = async (m, { conn }) => {
  try {
    let q = m.quoted ? m.quoted : m
    let mime = (q.msg || q).mimetype || ''

    if (!/image/.test(mime)) {
      return conn.reply(m.chat, `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ︵࿆
𐚁 ֹ ִ *sɪsᴛᴇᴍᴀ* ! ୧ ֹ ִ

> ✐ ✖️ *No se pudo mejorar la imagen*
> 〄 Error: Falta url

> ᥀ Envía o responde a una imagen.`, m)
    }

    await conn.reply(m.chat, `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ︵࿆
𐚁 ֹ ִ *sɪsᴛᴇᴍᴀ* ! ୧ ֹ ִ

> ✐ ⏳ *Mejorando imagen...*
> 〄 Procesando en HD.`, m)

    let media = await q.download()

    if (!media) throw new Error('No se pudo descargar la imagen original')

    let url = await uploadImage(media)

    if (!url) throw new Error('No se pudo subir la imagen')

    let api = `https://api.neoxr.eu/api/remini?image=${encodeURIComponent(url)}&apikey=russellxz`

    let response = await axios.get(api, {
      responseType: 'arraybuffer',
      validateStatus: () => true,
      timeout: 120000
    })

    let contentType = response.headers['content-type'] || ''
    let buffer
    let imageUrl

    if (contentType.includes('image/')) {
      buffer = Buffer.from(response.data)
    } else {
      let result

      try {
        result = JSON.parse(Buffer.from(response.data).toString())
      } catch {
        throw new Error('La API devolvió una respuesta inválida')
      }

      console.log('Neoxr:', result)

      if (result.status === false) {
        throw new Error(result.message || result.msg || 'Error en Neoxr')
      }

      imageUrl = result?.data?.url ||
                 result?.data?.image ||
                 result?.url ||
                 result?.image

      if (!imageUrl) {
        throw new Error(result.message || result.msg || 'La API no devolvió una imagen')
      }

      let download = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 120000
      })

      let downloadType = download.headers['content-type'] || ''

      if (!downloadType.startsWith('image/')) {
        throw new Error('El resultado descargado no es una imagen')
      }

      buffer = Buffer.from(download.data)
    }

    if (!buffer || !buffer.length) {
      throw new Error('La imagen recibida está vacía')
    }

    await conn.sendMessage(m.chat, {
      image: buffer,
      mimetype: 'image/jpeg',
      caption: `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ︵࿆
𐚁 ֹ ִ *sɪsᴛᴇᴍᴀ* ! ୧ ֹ ִ

> ✐ ✔️ *Imagen mejorada correctamente*
> 〄 Calidad: HD

> ᥀ Procesamiento completado.`
    }, { quoted: m })

  } catch (e) {
    console.error('ERROR HD:', e)

    await conn.reply(m.chat, `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤּ︵࿆
𐚁 ֹ ִ *sɪsᴛᴇᴍᴀ* ! ୧ ֹ ִ

> ✐ ✖️ *No se pudo mejorar la imagen*
> 〄 Error: ${e.message}`, m)
  }
}

handler.help = ['hd']
handler.tags = ['tools']
handler.command = ['hd', 'remini']

export default handler
