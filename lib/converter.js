import { promises as fs } from 'fs'
import { join, dirname } from 'path'
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { randomBytes } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const tmpDir = join(__dirname, '../tmp')

let tmpReady = null

function ensureTmpDir() {
    if (!tmpReady) {
        tmpReady = fs.mkdir(tmpDir, { recursive: true }).catch(() => {})
    }
    return tmpReady
}

function createId() {
    return `${Date.now()}_${randomBytes(6).toString('hex')}`
}

function ffmpeg(buffer, args = [], ext = '', ext2 = '') {
    return new Promise(async (resolve, reject) => {
        let input
        let output
        let proc

        try {
            if (!Buffer.isBuffer(buffer) || !buffer.length) {
                throw new TypeError('El buffer recibido no es válido')
            }

            await ensureTmpDir()

            const id = createId()
            input = join(tmpDir, `${id}.${ext}`)
            output = `${input}.${ext2}`

            await fs.writeFile(input, buffer)

            proc = spawn('ffmpeg', [
                '-hide_banner',
                '-loglevel', 'error',
                '-y',
                '-i', input,
                ...args,
                output
            ], {
                stdio: ['ignore', 'ignore', 'pipe'],
                windowsHide: true
            })

            let stderr = ''

            proc.stderr.on('data', chunk => {
                stderr += chunk.toString()
            })

            proc.once('error', async err => {
                await fs.unlink(input).catch(() => {})
                await fs.unlink(output).catch(() => {})
                reject(new Error(`Fallo al ejecutar ffmpeg: ${err.message}`))
            })

            proc.once('close', async code => {
                await fs.unlink(input).catch(() => {})

                if (code !== 0) {
                    await fs.unlink(output).catch(() => {})
                    return reject(
                        new Error(
                            `ffmpeg salió con código ${code}${stderr ? `\n${stderr.trim()}` : ''}`
                        )
                    )
                }

                try {
                    const data = await fs.readFile(output)

                    resolve({
                        data,
                        filename: output,
                        delete() {
                            return fs.unlink(output).catch(() => {})
                        }
                    })
                } catch (err) {
                    await fs.unlink(output).catch(() => {})
                    reject(err)
                }
            })
        } catch (err) {
            if (input) await fs.unlink(input).catch(() => {})
            if (output) await fs.unlink(output).catch(() => {})
            if (proc) proc.kill()
            reject(err)
        }
    })
}

function toPTT(buffer, ext) {
    return ffmpeg(buffer, [
        '-vn',
        '-c:a', 'libopus',
        '-b:a', '128k',
        '-vbr', 'on',
        '-application', 'voip'
    ], ext, 'ogg')
}

function toAudio(buffer, ext) {
    return ffmpeg(buffer, [
        '-vn',
        '-c:a', 'libopus',
        '-b:a', '128k',
        '-vbr', 'on'
    ], ext, 'opus')
}

function toVideo(buffer, ext) {
    return ffmpeg(buffer, [
        '-c:v', 'libx264',
        '-c:a', 'aac',
        '-b:a', '128k',
        '-ar', '44100',
        '-crf', '28',
        '-preset', 'veryfast',
        '-movflags', '+faststart'
    ], ext, 'mp4')
}

export { ffmpeg, toAudio, toPTT, toVideo }