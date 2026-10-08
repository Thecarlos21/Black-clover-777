import fetch from 'node-fetch'
import { FormData, Blob } from 'formdata-node'
import { fileTypeFromBuffer } from 'file-type'
const FETCH_TIMEOUT = 20000
async function request(url, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT)
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    })
  } finally {
    clearTimeout(timer)
  }
}
async function toBuffer(input) {
  if (Buffer.isBuffer(input)) return input
  if (input instanceof Uint8Array) return Buffer.from(input)
  if (input instanceof ArrayBuffer) return Buffer.from(input)
  return Buffer.from(input)
}
const uploadQuAx = async buffer => {
  buffer = await toBuffer(buffer)
  if (!buffer.length) {
    throw new Error('El archivo está vacío')
  }
  const type = await fileTypeFromBuffer(buffer)
  if (!type?.ext || !type?.mime) {
    throw new Error('No se pudo detectar el tipo de archivo')
  }
  const form = new FormData()
  const blob = new Blob(
    [
      buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength
      )
    ],
    {
      type: type.mime
    }
  )
  form.append(
    'files[]',
    blob,
    `tmp.${type.ext}`
  )
  const res = await request(
    'https://qu.ax/upload.php',
    {
      method: 'POST',
      body: form
    }
  )
  const text = await res.text()
  if (!res.ok) {
    throw new Error(
      `qu.ax ${res.status}: ${text}`
    )
  }
  let result
  try {
    result = JSON.parse(text)
  } catch {
    throw new Error(
      `Respuesta inválida de qu.ax: ${text}`
    )
  }
  const url = result?.files?.[0]?.url
  if (!result?.success || !url) {
    throw new Error(
      result?.message ||
      result?.error ||
      'Failed to upload the file to qu.ax'
    )
  }
  return url
}
const uploadTelegraPh = async buffer => {
  buffer = await toBuffer(buffer)
  if (!buffer.length) {
    throw new Error('El archivo está vacío')
  }
  const type = await fileTypeFromBuffer(buffer)
  if (!type?.ext) {
    throw new Error('No se pudo detectar el tipo de imagen')
  }
  const supported = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif'
  }
  const mime = supported[type.ext]
  if (!mime) {
    throw new Error(
      'Telegra.ph solo soporta imágenes JPG, JPEG, PNG o GIF'
    )
  }
  const form = new FormData()
  const blob = new Blob([buffer], {
    type: mime
  })
  form.append(
    'file',
    blob,
    `tmp.${type.ext}`
  )
  const res = await request(
    'https://telegra.ph/upload',
    {
      method: 'POST',
      body: form
    }
  )
  const text = await res.text()
  if (!res.ok) {
    throw new Error(
      `Telegra.ph ${res.status}: ${text}`
    )
  }
  let result
  try {
    result = JSON.parse(text)
  } catch {
    throw new Error(
      `Respuesta inválida de Telegra.ph: ${text}`
    )
  }
  if (result?.error) {
    throw new Error(result.error)
  }
  const src = result?.[0]?.src
  if (!src) {
    throw new Error(
      `Telegra.ph no devolvió una URL válida: ${text}`
    )
  }
  return `https://telegra.ph${src}`
}
export default async function uploadFile(buffer) {
  buffer = await toBuffer(buffer)
  if (!buffer.length) {
    throw new Error('El archivo está vacío')
  }
  let lastError
  try {
    return await uploadQuAx(buffer)
  } catch (error) {
    lastError = error
  }
  try {
    return await uploadTelegraPh(buffer)
  } catch (error) {
    lastError = error
  }
  throw lastError || new Error('No se pudo subir el archivo')
}
export {
  uploadQuAx,
  uploadTelegraPh
}

Con esto queda qu.ax → Telegra.ph como fallback, pero una API que no responda no se queda colgada indefinidamente. También se conserva el Buffer sin convertirlo a string, evitando una copia innecesaria de los archivos.