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

const fileIO = async buffer => {
    buffer = await toBuffer(buffer)

    if (!buffer.length) {
        throw new Error('El archivo está vacío')
    }

    const type = await fileTypeFromBuffer(buffer)

    if (!type?.ext || !type?.mime) {
        throw new Error('No se pudo detectar el tipo de archivo')
    }

    const form = new FormData()
    const blob = new Blob([buffer], {
        type: type.mime
    })

    form.append('file', blob, `tmp.${type.ext}`)

    const res = await request(
        'https://file.io/?expires=1d',
        {
            method: 'POST',
            body: form
        }
    )

    const text = await res.text()

    if (!res.ok) {
        throw new Error(`file.io ${res.status}: ${text}`)
    }

    let json

    try {
        json = JSON.parse(text)
    } catch {
        throw new Error(`Respuesta inválida de file.io: ${text}`)
    }

    if (!json?.success || !json?.link) {
        throw new Error(
            json?.message ||
            json?.error ||
            `Error subiendo a file.io: ${text}`
        )
    }

    return json.link
}

const RESTfulAPI = async inp => {
    const isArray = Array.isArray(inp)
    const buffers = isArray ? inp : [inp]

    if (!buffers.length) {
        throw new Error('No se proporcionaron archivos')
    }

    const form = new FormData()

    for (let i = 0; i < buffers.length; i++) {
        const buffer = await toBuffer(buffers[i])

        if (!buffer.length) {
            throw new Error(`El archivo ${i + 1} está vacío`)
        }

        const blob = new Blob([buffer], {
            type: 'application/octet-stream'
        })

        form.append('file', blob, `file-${i}`)
    }

    const res = await request(
        'https://storage.restfulapi.my.id/upload',
        {
            method: 'POST',
            body: form
        }
    )

    const text = await res.text()

    if (!res.ok) {
        throw new Error(
            `RESTfulAPI ${res.status}: ${text}`
        )
    }

    let json

    try {
        json = JSON.parse(text)
    } catch {
        throw new Error(
            `Error parseando respuesta de RESTfulAPI: ${text}`
        )
    }

    if (!Array.isArray(json?.files)) {
        throw new Error(
            `Respuesta inválida de RESTfulAPI: ${text}`
        )
    }

    const urls = json.files
        .map(file => file?.url)
        .filter(Boolean)

    if (!urls.length) {
        throw new Error(
            `RESTfulAPI no devolvió URLs: ${text}`
        )
    }

    return isArray ? urls : urls[0]
}

export default async function uploadFile(inp) {
    if (Array.isArray(inp)) {
        if (!inp.length) {
            throw new Error('No se proporcionaron archivos')
        }
    } else {
        inp = await toBuffer(inp)

        if (!inp.length) {
            throw new Error('El archivo está vacío')
        }
    }

    let lastError

    try {
        return await RESTfulAPI(inp)
    } catch (error) {
        lastError = error
    }

    try {
        return await fileIO(inp)
    } catch (error) {
        lastError = error
    }

    throw lastError || new Error('No se pudo subir el archivo')
}

export {
    fileIO,
    RESTfulAPI
}