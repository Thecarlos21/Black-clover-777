import fetch from 'node-fetch'
import yts from 'yt-search'

// =====================================
// CONFIGURACIÓN
// =====================================

const BASE_URL = 'https://cnv.cx'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ' +
  'AppleWebKit/537.36 (KHTML, like Gecko) ' +
  'Chrome/151.0.0.0 Safari/537.36'

const SERVERS = [
  {
    name: 'y2meta-uk',
    origin: 'https://iframe.y2meta-uk.com',
    referer: 'https://iframe.y2meta-uk.com/'
  },
  {
    name: 'mp3yt',
    origin: 'https://mp3yt.is',
    referer: 'https://mp3yt.is/'
  }
]

const PENDING_TTL = 2 * 60 * 1000
const DOWNLOAD_TIMEOUT = 120000
const MAX_MEDIA_BYTES = 100 * 1024 * 1024

const pendientes = new Map()
const procesos = new Set()

const getPendingKey = m =>
  `${m.chat}:${m.sender}`

// =====================================
// FUNCIONES GENERALES
// =====================================

const extractYouTubeId = value => {
  try {
    const u = new URL(String(value || '').trim())

    if (!['http:', 'https:'].includes(u.protocol)) {
      return ''
    }

    const host = u.hostname.toLowerCase()
      .replace(/^www\./, '')

    let id = ''

    if (host === 'youtu.be') {
      id = u.pathname.split('/').filter(Boolean)[0] || ''
    } else if (
      host === 'youtube.com' ||
      host.endsWith('.youtube.com')
    ) {
      if (u.pathname === '/watch') {
        id = u.searchParams.get('v') || ''
      } else {
        const parts = u.pathname.split('/').filter(Boolean)

        if (
          ['shorts', 'embed', 'live'].includes(parts[0])
        ) {
          id = parts[1] || ''
        }
      }
    }

    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : ''

  } catch {
    return ''
  }
}

const isYoutubeUrl = text =>
  Boolean(extractYouTubeId(text))

const cleanFileName = title =>
  String(title || 'Descarga de YouTube')
    .replace(/[\\/:*?"<>|\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100) || 'Descarga de YouTube'

const formatDuration = value => {
  if (!value) return ''

  if (typeof value === 'string') {
    return value
  }

  if (
    typeof value !== 'number' ||
    !Number.isFinite(value)
  ) {
    return ''
  }

  const total = Math.max(0, Math.floor(value))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = String(total % 60).padStart(2, '0')

  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}`
    : `${minutes}:${seconds}`
}

const react = async (m, emoji) => {
  try {
    await m.react(emoji)
  } catch {}
}

// =====================================
// CONEXIÓN CON CNV
// =====================================

const headersFor = server => ({
  Accept: '*/*',
  Origin: server.origin,
  Referer: server.referer,
  'User-Agent': USER_AGENT,
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache'
})

const fetchWithTimeout = async (
  url,
  options = {},
  timeoutMs = 12000
) => {
  const controller = new AbortController()

  const timer = setTimeout(
    () => controller.abort(),
    timeoutMs
  )

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: 'follow'
    })
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(
        `Tiempo agotado después de ${timeoutMs}ms`
      )
    }

    throw error
  } finally {
    clearTimeout(timer)
  }
}

const readJson = async (response, label) => {
  const text = await response.text()

  let data

  try {
    data = JSON.parse(text)
  } catch {
    throw new Error(
      `${label}: respuesta no JSON (${response.status})`
    )
  }

  if (!response.ok) {
    const detail =
      data?.errorMsg ||
      data?.error?.message ||
      data?.message ||
      `HTTP ${response.status}`

    throw new Error(`${label}: ${detail}`)
  }

  return data
}

const freshKey = async (server, payload) => {
  const videoId = extractYouTubeId(payload.link)

  if (!videoId) {
    throw new Error(
      `${server.name}: ID de YouTube inválido`
    )
  }

  const keyUrl = new URL(`${BASE_URL}/v2/sanity/key`)

  keyUrl.searchParams.set('id', videoId)

  const response = await fetchWithTimeout(
    keyUrl.toString(),
    {
      method: 'GET',
      headers: headersFor(server)
    },
    10000
  )

  const data = await readJson(
    response,
    `${server.name} key`
  )

  if (!data?.key || typeof data.key !== 'string') {
    throw new Error(
      `${server.name}: no devolvió una key válida`
    )
  }

  return data.key
}

const convertWithServer = async (server, payload) => {
  const key = await freshKey(server, payload)

  const response = await fetchWithTimeout(
    `${BASE_URL}/v2/converter`,
    {
      method: 'POST',
      headers: {
        ...headersFor(server),
        'Content-Type': 'application/x-www-form-urlencoded',
        key
      },
      body: new URLSearchParams(payload).toString()
    },
    32000
  )

  const data = await readJson(
    response,
    `${server.name} converter`
  )

  if (
    data?.error === true ||
    !data?.url
  ) {
    const detail =
      data?.errorMsg ||
      data?.error?.message ||
      data?.message ||
      data?.status ||
      'No devolvió un enlace de descarga'

    throw new Error(`${server.name}: ${detail}`)
  }

  return {
    ...data,
    provider: server.name
  }
}

const cnvConvert = async payload => {
  const startedAt = Date.now()

  const attempts = SERVERS.map(server =>
    convertWithServer(server, payload).catch(error => {
      throw new Error(
        `${server.name}: ${error?.message || error}`
      )
    })
  )

  try {
    return await Promise.any(attempts)
  } catch (aggregate) {
    const errors = Array.isArray(aggregate?.errors)
      ? aggregate.errors.map(
          error => error?.message || String(error)
        )
      : [aggregate?.message || 'Error desconocido']

    const elapsedMs = Date.now() - startedAt

    throw new Error(
      `Los servidores CNV fallaron (${elapsedMs}ms): ${errors.join(' | ')}`
    )
  }
}

// =====================================
// BUSCAR VIDEO EN YOUTUBE
// =====================================

const buscarVideo = async query => {
  const result = await yts(query)

  const video = result?.videos?.find(v =>
    v.seconds > 0 &&
    isYoutubeUrl(v.url)
  )

  if (!video) {
    throw new Error(
      'No encontré resultados para esa búsqueda'
    )
  }

  return {
    url: `https://www.youtube.com/watch?v=${extractYouTubeId(video.url)}`,
    title: video.title || '',
    author: video.author?.name || 'Desconocido',
    duration: video.timestamp || '',
    views: video.views
      ? video.views.toLocaleString('es-MX')
      : '',
    thumbnail: video.thumbnail || ''
  }
}

const resolverVideo = async query => {
  const id = extractYouTubeId(query)

  if (id) {
    return {
      url: `https://www.youtube.com/watch?v=${id}`,
      thumbnail: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
    }
  }

  if (/^https?:\/\//i.test(query)) {
    throw new Error(
      'El enlace no es un video válido de YouTube'
    )
  }

  return buscarVideo(query)
}

// =====================================
// CONVERTIR VIDEO O AUDIO
// =====================================

const getApiData = async (youtubeUrl, type) => {
  const video = type === 'video'

  const data = await cnvConvert({
    link: youtubeUrl,
    format: video ? 'mp4' : 'mp3',
    audioBitrate: '128',
    videoQuality: '720',
    filenameStyle: 'pretty',
    vCodec: 'h264'
  })

  if (
    data?.error === true ||
    !data?.url ||
    typeof data.url !== 'string'
  ) {
    throw new Error(
      data?.errorMsg ||
      data?.message ||
      'CNV no devolvió el enlace multimedia'
    )
  }

  let mediaUrl

  try {
    mediaUrl = new URL(
      data.url.replace('/tunnel?', '/tunnel/?'),
      BASE_URL
    )
  } catch {
    throw new Error(
      'CNV devolvió una URL inválida'
    )
  }

  if (
    !['http:', 'https:'].includes(mediaUrl.protocol)
  ) {
    throw new Error(
      'Protocolo de descarga inválido'
    )
  }

  return {
    url: mediaUrl.toString(),
    title: data.title || '',
    quality: data.quality || (
      video ? '720p solicitada' : '128 kbps solicitados'
    ),
    duration: formatDuration(data.duration)
  }
}

// =====================================
// DESCARGAR ARCHIVO
// COMPATIBLE CON NODE-FETCH
// =====================================

const downloadFile = async (url, type) => {
  const controller = new AbortController()

  const timer = setTimeout(
    () => controller.abort(),
    DOWNLOAD_TIMEOUT
  )

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: '*/*',
        Referer: 'https://iframe.y2meta-uk.com/'
      },
      redirect: 'follow',
      signal: controller.signal
    })

    if (!response.ok) {
      throw new Error(
        `Error al descargar: HTTP ${response.status}`
      )
    }

    const contentType = (
      response.headers.get('content-type') || ''
    ).toLowerCase()

    if (
      contentType.includes('text/html') ||
      contentType.includes('application/json')
    ) {
      throw new Error(
        'CNV devolvió una página en lugar del archivo'
      )
    }

    const declaredSize = Number(
      response.headers.get('content-length') || 0
    )

    if (declaredSize > MAX_MEDIA_BYTES) {
      throw new Error(
        'El archivo supera el límite de 100 MiB'
      )
    }

    if (!response.body) {
      throw new Error(
        'La descarga no contiene datos'
      )
    }

    const chunks = []
    let bytes = 0

    const addChunk = value => {
      const chunk = Buffer.from(value)

      bytes += chunk.length

      if (bytes > MAX_MEDIA_BYTES) {
        throw new Error(
          'El archivo supera el límite de 100 MiB'
        )
      }

      chunks.push(chunk)
    }

    // Node-fetch utiliza streams de Node.js
    if (
      typeof response.body[Symbol.asyncIterator] ===
      'function'
    ) {
      for await (const chunk of response.body) {
        addChunk(chunk)
      }
    }

    // Soporte para fetch nativo
    else if (
      typeof response.body.getReader === 'function'
    ) {
      const reader = response.body.getReader()

      try {
        while (true) {
          const { done, value } = await reader.read()

          if (done) break

          addChunk(value)
        }
      } finally {
        reader.releaseLock()
      }
    }

    // Respaldo para otras implementaciones
    else if (
      typeof response.arrayBuffer === 'function'
    ) {
      const arrayBuffer = await response.arrayBuffer()
      addChunk(arrayBuffer)
    }

    else {
      throw new Error(
        'El servidor utiliza un stream incompatible'
      )
    }

    if (!bytes) {
      throw new Error(
        'El archivo descargado está vacío'
      )
    }

    const buffer = Buffer.concat(chunks, bytes)

    // Comprobar que no sea HTML o JSON
    const inicio = buffer
      .subarray(0, 120)
      .toString('utf8')
      .trimStart()
      .toLowerCase()

    if (
      inicio.startsWith('<!doctype') ||
      inicio.startsWith('<html') ||
      inicio.startsWith('{"')
    ) {
      throw new Error(
        'El proveedor devolvió un error en lugar del archivo'
      )
    }

    // Validar archivo MP4
    if (type === 'video') {
      const atom = buffer
        .subarray(4, 8)
        .toString('ascii')

      if (atom !== 'ftyp') {
        throw new Error(
          'El archivo recibido no es un MP4 válido'
        )
      }
    }

    // Validar archivo MP3
    else {
      const hasID3 =
        buffer.subarray(0, 3)
          .toString('ascii') === 'ID3'

      const hasMpegFrame =
        buffer.length >= 2 &&
        buffer[0] === 0xff &&
        (buffer[1] & 0xe0) === 0xe0

      if (!hasID3 && !hasMpegFrame) {
        throw new Error(
          'El archivo recibido no es un MP3 válido'
        )
      }
    }

    return buffer

  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(
        'La descarga tardó más de 120 segundos'
      )
    }

    throw error

  } finally {
    clearTimeout(timer)
  }
}

// =====================================
// ENVIAR DESCARGAS
// =====================================

const descargar = async (
  m,
  conn,
  value,
  type,
  fallbackTitle = '',
  searchFirst = false
) => {
  const key = getPendingKey(m)

  if (procesos.has(key)) {
    return conn.reply(
      m.chat,
      '⏳ Ya tienes una descarga en proceso. Espera a que termine.',
      m
    )
  }

  procesos.add(key)

  try {
    await react(m, '🕦')

    const video = searchFirst
      ? await resolverVideo(value)
      : {
          url: value,
          title: fallbackTitle
        }

    const data = await getApiData(
      video.url,
      type
    )

    const rawTitle =
      data.title ||
      video.title ||
      fallbackTitle ||
      'Descarga de YouTube'

    const title = cleanFileName(rawTitle)

    const buffer = await downloadFile(
      data.url,
      type
    )

    if (type === 'video') {
      await conn.sendMessage(
        m.chat,
        {
          video: buffer,
          mimetype: 'video/mp4',
          fileName: `${title}.mp4`,
          caption: `☘️ *BLACK CLOVER BOT*

🎬 *Título:* ${rawTitle}
📺 *Calidad:* ${data.quality}${data.duration ? `\n⏱️ *Duración:* ${data.duration}` : ''}`
        },
        { quoted: m }
      )
    } else {
      await conn.sendMessage(
        m.chat,
        {
          audio: buffer,
          mimetype: 'audio/mpeg',
          fileName: `${title}.mp3`,
          ptt: false
        },
        { quoted: m }
      )
    }

    await react(m, '☑️')

  } catch (error) {
    await react(m, '❌')

    console.error('[PLAY CNV]', error)

    await conn.reply(
      m.chat,
      `🚩 *Error:* ${error?.message || 'No se pudo realizar la descarga'}`,
      m
    )
  } finally {
    // Libera el usuario incluso si la descarga falla
    procesos.delete(key)
  }
}

// =====================================
// COMANDOS PRINCIPALES
// =====================================

const handler = async (
  m,
  { conn, args, command, usedPrefix }
) => {
  const prefix = usedPrefix || '.'
  const cmd = String(command || '').toLowerCase()
  const query = (args || []).join(' ').trim()

  if (!query) {
    return conn.reply(
      m.chat,
      `🚩 Ingresa el nombre de una canción o un enlace de YouTube.

*Ejemplos:*
${prefix}${cmd} yan block 444
${prefix}${cmd} https://youtu.be/5M_n2UCe7DQ`,
      m
    )
  }

  if (
    /^https?:\/\//i.test(query) &&
    !isYoutubeUrl(query)
  ) {
    return conn.reply(
      m.chat,
      '🚩 El enlace proporcionado no es válido. Utiliza un enlace de YouTube.',
      m
    )
  }

  const key = getPendingKey(m)

  if (procesos.has(key)) {
    return conn.reply(
      m.chat,
      '⏳ Ya tienes una descarga en proceso. Espera a que termine.',
      m
    )
  }

  // =====================================
  // COMANDO .PLAY
  // =====================================

  if (cmd === 'play') {
    procesos.add(key)

    try {
      await react(m, '⏳')

      const video = await resolverVideo(query)

      const info = video.title
        ? `🎵 *Título:* ${video.title}
👤 *Canal:* ${video.author || 'Desconocido'}
${video.duration ? `⏱️ *Duración:* ${video.duration}\n` : ''}${video.views ? `👁️ *Vistas:* ${video.views}\n` : ''}`
        : '🎵 *Video encontrado correctamente*'

      const caption = `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵  ࿆
𐚁 ֹ ִ *ʏᴏᴜᴛᴜʙᴇ ᴘʟᴀʏ* ! ୧ ֹ ִ

${info}
✐ *Selecciona una opción*

> 〄 *1.* Descargar en MP4 🎥
> 〄 *2.* Descargar en MP3 🎵

✐ *Escribe 1 o 2 para continuar.*
✐ *La selección solo puede utilizarse una vez.*

📸 *Sígueme en Instagram*
> @cxrlios.7
https://www.instagram.com/cxrlitos.7`

      if (video.thumbnail) {
        await conn.sendMessage(
          m.chat,
          {
            image: {
              url: video.thumbnail
            },
            caption
          },
          { quoted: m }
        )
      } else {
        await conn.reply(
          m.chat,
          caption,
          m
        )
      }

      pendientes.set(key, {
        url: video.url,
        title: video.title || '',
        time: Date.now()
      })

      await react(m, '☑️')

    } catch (error) {
      await react(m, '❌')

      await conn.reply(
        m.chat,
        `🚩 *Error:* ${error?.message || 'No se pudo buscar el video'}`,
        m
      )
    } finally {
      procesos.delete(key)
    }

    return
  }

  // =====================================
  // DESCARGAS DIRECTAS
  // =====================================

  const type = ['ytmp4', 'mp4'].includes(cmd)
    ? 'video'
    : 'audio'

  return descargar(
    m,
    conn,
    query,
    type,
    '',
    true
  )
}

// =====================================
// RESPUESTA 1 / 2 DEL .PLAY
// =====================================

handler.before = async (m, { conn }) => {
  if (!m.text || m.fromMe) return

  const seleccion = m.text.trim()

  if (
    seleccion !== '1' &&
    seleccion !== '2'
  ) {
    return
  }

  const key = getPendingKey(m)

  const pending = pendientes.get(key)

  if (!pending) return

  if (procesos.has(key)) {
    return true
  }

  if (
    Date.now() - pending.time > PENDING_TTL
  ) {
    pendientes.delete(key)

    await conn.reply(
      m.chat,
      '⌛ La selección ha expirado. Ejecuta nuevamente .play.',
      m
    )

    return true
  }

  // Una sola selección por búsqueda
  pendientes.delete(key)

  await descargar(
    m,
    conn,
    pending.url,
    seleccion === '1' ? 'video' : 'audio',
    pending.title
  )

  return true
}

// =====================================
// CONFIGURACIÓN DEL PLUGIN
// =====================================

handler.command = [
  'play',
  'ytmp4',
  'ytmp3',
  'mp4',
  'mp3'
]

handler.tags = ['descargas']

handler.help = [
  'play <nombre o link>',
  'ytmp4 <nombre o link>',
  'ytmp3 <nombre o link>',
  'mp4 <nombre o link>',
  'mp3 <nombre o link>'
]

export default handler
