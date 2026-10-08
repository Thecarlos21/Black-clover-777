import { DOMImplementation, XMLSerializer } from 'xmldom'
import JsBarcode from 'jsbarcode'
import { JSDOM } from 'jsdom'
import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const src = join(__dirname, '..', 'src')

const welcomeSvg = readFileSync(
    join(src, 'welcome.svg'),
    'utf-8'
)

const avatarPath = join(src, 'avatar_contact.png')
const backgroundPath = join(src, 'Aesthetic', 'Aesthetic_000.jpeg')

const avatarBase64 = toBase64(
    readFileSync(avatarPath),
    'image/png'
)

const backgroundBase64 = toBase64(
    readFileSync(backgroundPath),
    'image/jpeg'
)

const domImpl = new DOMImplementation()
const xmlSerializer = new XMLSerializer()

const barcode = data => {
    const document = domImpl.createDocument(
        'http://www.w3.org/1999/xhtml',
        'html',
        null
    )

    const svgNode = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'svg'
    )

    JsBarcode(svgNode, String(data || ''), {
        xmlDocument: document
    })

    return xmlSerializer.serializeToString(svgNode)
}

const imageSetter = (img, value) => {
    if (!img || !value) return

    img.setAttributeNS(
        'http://www.w3.org/1999/xlink',
        'xlink:href',
        value
    )
}

const textSetter = (el, value) => {
    if (!el) return
    el.textContent = value == null ? '' : String(value)
}

const toBase64 = (buffer, mime) => {
    if (!buffer?.length) return ''
    return `data:${mime};base64,${buffer.toString('base64')}`
}

const createSvgDocument = () => {
    return new JSDOM(welcomeSvg).window.document
}

const genSVG = async ({
    wid = '',
    pp = avatarPath,
    title = '',
    name = '',
    text = '',
    background = ''
} = {}) => {
    const svg = createSvgDocument()

    const elements = [
        [
            '#_1661899539392 > g:nth-child(6) > image',
            imageSetter,
            toBase64(
                await toImg(
                    barcode(String(wid).replace(/\D/g, '')),
                    'png'
                ),
                'image/png'
            )
        ],
        [
            '#_1661899539392 > g:nth-child(3) > image',
            imageSetter,
            pp
        ],
        [
            '#_1661899539392 > text.fil1.fnt0',
            textSetter,
            text
        ],
        [
            '#_1661899539392 > text.fil2.fnt1',
            textSetter,
            title
        ],
        [
            '#_1661899539392 > text.fil2.fnt2',
            textSetter,
            name
        ],
        [
            '#_1661899539392 > g:nth-child(2) > image',
            imageSetter,
            background
        ]
    ]

    for (const [selector, setter, value] of elements) {
        const element = svg.querySelector(selector)
        setter(element, value)
    }

    return svg.documentElement.outerHTML
}

const toImg = (svgContent, format = 'png') => {
    return new Promise((resolve, reject) => {
        if (!svgContent) {
            resolve(Buffer.alloc(0))
            return
        }

        const buffers = []

        const im = spawn(
            'magick',
            [
                '-',
                '-background',
                'none',
                `${format}:-`
            ],
            {
                stdio: ['pipe', 'pipe', 'pipe']
            }
        )

        let stderr = ''

        im.stdout.on('data', chunk => {
            buffers.push(chunk)
        })

        im.stderr.on('data', chunk => {
            stderr += chunk.toString()
        })

        im.on('error', reject)

        im.on('close', code => {
            if (code === 0) {
                resolve(Buffer.concat(buffers))
                return
            }

            reject(
                new Error(
                    `ImageMagick exited with code ${code}${stderr ? `: ${stderr.trim()}` : ''}`
                )
            )
        })

        im.stdin.on('error', reject)

        im.stdin.end(Buffer.from(svgContent))
    })
}

const render = async ({
    wid = '',
    pp = avatarBase64,
    name = '',
    title = '',
    text = '',
    background = backgroundBase64
} = {}, format = 'png') => {
    const svgContent = await genSVG({
        wid,
        pp,
        name,
        text,
        background,
        title
    })

    return await toImg(svgContent, format)
}

export {
    barcode,
    genSVG,
    toImg,
    toBase64,
    render
}

export default render