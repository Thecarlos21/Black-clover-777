import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { spawn } from 'child_process'

const tmp = path.join(process.cwd(), 'tmp')

async function ensureTmp() {
    await fs.promises.mkdir(tmp, { recursive: true })
}

function isUrl(source) {
    return typeof source === 'string' &&
        /^https?:\/\//i.test(source)
}

async function toBuffer(source) {
    if (Buffer.isBuffer(source)) return source
    if (source instanceof Uint8Array) return Buffer.from(source)
    if (source instanceof ArrayBuffer) return Buffer.from(source)

    if (source && typeof source.toArrayBuffer === 'function') {
        return Buffer.from(await source.toArrayBuffer())
    }

    if (isUrl(source)) {
        const response = await fetch(source)

        if (!response.ok) {
            throw new Error(`No se pudo descargar el archivo: ${response.status}`)
        }

        return Buffer.from(await response.arrayBuffer())
    }

    throw new TypeError('Source must be a URL or Buffer')
}

async function createTempFile(buffer, ext = 'webp') {
    await ensureTmp()

    const file = path.join(
        tmp,
        `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`
    )

    await fs.promises.writeFile(file, buffer)
    return file
}

async function removeFile(file) {
    if (!file) return
    await fs.promises.unlink(file).catch(() => {})
}

async function runFFmpeg(input, args = []) {
    return await new Promise((resolve, reject) => {
        const chunks = []

        const ffmpeg = spawn('ffmpeg', [
            '-hide_banner',
            '-loglevel',
            'error',
            '-y',
            '-i',
            input,
            ...args,
            '-f',
            'image2pipe',
            'pipe:1'
        ])

        let errorOutput = ''

        ffmpeg.stdout.on('data', chunk => {
            chunks.push(chunk)
        })

        ffmpeg.stderr.on('data', chunk => {
            errorOutput += chunk.toString()
        })

        ffmpeg.on('error', reject)

        ffmpeg.on('close', code => {
            if (code !== 0) {
                return reject(
                    new Error(
                        errorOutput.trim() ||
                        `FFmpeg terminó con código ${code}`
                    )
                )
            }

            const result = Buffer.concat(chunks)

            if (!result.length) {
                return reject(new Error('FFmpeg no generó ningún archivo'))
            }

            resolve(result)
        })
    })
}

async function webp2png(source) {
    const buffer = await toBuffer(source)

    if (!buffer.length) {
        throw new Error('El archivo WebP está vacío')
    }

    const input = await createTempFile(buffer, 'webp')

    try {
        return await runFFmpeg(input, [
            '-frames:v',
            '1',
            '-vcodec',
            'png'
        ])
    } finally {
        await removeFile(input)
    }
}

async function webp2mp4(source) {
    const buffer = await toBuffer(source)

    if (!buffer.length) {
        throw new Error('El archivo WebP está vacío')
    }

    const input = await createTempFile(buffer, 'webp')
    const output = path.join(
        tmp,
        `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.mp4`
    )

    try {
        await new Promise((resolve, reject) => {
            const ffmpeg = spawn('ffmpeg', [
                '-hide_banner',
                '-loglevel',
                'error',
                '-y',
                '-i',
                input,
                '-movflags',
                '+faststart',
                '-c:v',
                'libx264',
                '-pix_fmt',
                'yuv420p',
                '-an',
                output
            ])

            let errorOutput = ''

            ffmpeg.stderr.on('data', chunk => {
                errorOutput += chunk.toString()
            })

            ffmpeg.on('error', reject)

            ffmpeg.on('close', code => {
                if (code !== 0) {
                    return reject(
                        new Error(
                            errorOutput.trim() ||
                            `FFmpeg terminó con código ${code}`
                        )
                    )
                }

                resolve()
            })
        })

        return await fs.promises.readFile(output)
    } finally {
        await removeFile(input)
        await removeFile(output)
    }
}

export {
    webp2mp4,
    webp2png
}