import { spawn } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const fontDir = join(__dirname, '../src/font')
const fontLevel = join(fontDir, 'level_c.otf')
const fontTexts = join(fontDir, 'texts.otf')
const template = join(__dirname, '../src/lvlup_template.jpg')

const requiredFiles = [fontLevel, fontTexts, template]

function sanitizeText(text = '') {
    return String(text)
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\r?\n/g, '\\n')
        .slice(0, 200)
}

function getCommand() {
    if (global.support?.gm) return 'gm'
    if (global.support?.magick) return 'magick'
    if (global.support?.convert) return 'convert'
    return null
}

function getLevelPosition(level) {
    if (level > 999) return '+1210+260'
    if (level > 100) return '+1260+260'
    if (level > 50) return '+1310+260'
    if (level > 10) return '+1330+260'
    if (level > 2) return '+1370+260'
    return '+1385+260'
}

for (const file of requiredFiles) {
    if (!existsSync(file)) {
        throw new Error(`Archivo requerido no encontrado: ${file}`)
    }
}

export function levelup(teks = '', level = 0) {
    return new Promise((resolve, reject) => {
        const cmd = getCommand()

        if (!cmd) {
            return reject(new Error('ImageMagick/GraphicsMagick no soportado en este entorno.'))
        }

        const lvl = Number.isFinite(Number(level)) ? Number(level) : 0
        const text = sanitizeText(teks)
        const anotations = getLevelPosition(lvl)

        const args = [
            ...(cmd === 'gm' ? ['convert'] : []),
            template,
            '-font', fontTexts,
            '-fill', '#0F3E6A',
            '-size', '1024x784',
            '-pointsize', '68',
            '-interline-spacing', '-7.5',
            '-annotate', '+153+200', text,
            '-font', fontLevel,
            '-fill', '#0A2A48',
            '-size', '1024x784',
            '-pointsize', '140',
            '-interline-spacing', '-1.2',
            '-annotate', anotations, String(lvl),
            '-append',
            'jpg:-'
        ]

        const proc = spawn(cmd, args, {
            stdio: ['ignore', 'pipe', 'pipe'],
            windowsHide: true
        })

        const bufs = []
        const errs = []

        proc.stdout.on('data', chunk => bufs.push(chunk))
        proc.stderr.on('data', chunk => errs.push(chunk))

        proc.once('error', err => {
            reject(new Error(`Error ejecutando ${cmd}: ${err.message}`))
        })

        proc.once('close', code => {
            if (code !== 0) {
                const stderr = Buffer.concat(errs).toString().trim()
                return reject(new Error(`Proceso falló con código ${code}: ${stderr || 'sin output'}`))
            }

            const output = Buffer.concat(bufs)

            if (!output.length) {
                return reject(new Error('No se generó imagen'))
            }

            resolve(output)
        })
    })
}