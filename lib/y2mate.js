import fetch from 'node-fetch'
import cheerio from 'cheerio'

const Y2MATE_BASE = 'https://www.y2mate.com/mates/en68'
const FETCH_TIMEOUT = 20000

const headers = {
    accept: '*/*',
    'accept-language': 'en-US,en;q=0.9',
    'content-type': 'application/x-www-form-urlencoded; charset=UTF-8'
}

const extractYTId = url => {
    if (typeof url !== 'string' || !url.trim()) return null

    const match = url.match(
        /(?:https?:\/\/)?(?:www\.)?(?:youtube(?:-nocookie)?\.com\/(?:watch\?.*?[?&]v=|embed\/|v\/)|youtu\.be\/)([-_0-9A-Za-z]{11})/
    )

    return match?.[1] || null
}

const post = async (url, formdata) => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers,
            body: new URLSearchParams(formdata),
            signal: controller.signal
        })

        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`)
        }

        return response
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('Y2Mate request timed out')
        }

        throw error
    } finally {
        clearTimeout(timeout)
    }
}

const getJSON = async response => {
    try {
        return await response.json()
    } catch {
        throw new Error('Invalid response from Y2Mate')
    }
}

const y2mate = async (yutub, format = 'mp4') => {
    const ytId = extractYTId(yutub)

    if (!ytId) {
        throw new Error('Invalid YouTube URL')
    }

    if (format !== 'mp4' && format !== 'mp3') {
        throw new Error('Invalid format')
    }

    const url = `https://youtu.be/${ytId}`

    const response = await post(`${Y2MATE_BASE}/analyze/ajax`, {
        url,
        q_auto: 0,
        ajax: 1
    })

    const data = await getJSON(response)
    const result = data?.result

    if (!result) {
        throw new Error('Y2Mate returned an empty result')
    }

    const $ = cheerio.load(result)

    const thumb = $('.thumbnail.cover > a > img').attr('src') || ''
    const title = $('.thumbnail.cover > div > b').text().trim()

    const id = result.match(/var k__id\s*=\s*"([^"]+)"/)?.[1]

    if (!id) {
        throw new Error('Could not extract k__id')
    }

    const rowSelector =
        format === 'mp4'
            ? '#mp4 > table > tbody > tr'
            : '#mp3 > table > tbody > tr'

    const row = $(rowSelector).first()

    const size = row.find('td:nth-child(2)').text().trim()
    const linkElement = row.find('td:nth-child(3) > a').first()

    const tipe = linkElement.attr('data-ftype') || ''
    const quality = linkElement.attr('data-fquality') || ''

    if (!tipe || !quality) {
        throw new Error(`No ${format} format available`)
    }

    const output = `${title || ytId}.${tipe}`

    const response2 = await post(`${Y2MATE_BASE}/convert`, {
        type: 'youtube',
        _id: id,
        v_id: ytId,
        ajax: 1,
        token: '',
        ftype: tipe,
        fquality: quality
    })

    const converted = await getJSON(response2)
    const convertResult = converted?.result

    if (!convertResult) {
        throw new Error('Y2Mate conversion failed')
    }

    const $result = cheerio.load(convertResult)
    const link = $result('a[href]').first().attr('href') || ''

    if (!link) {
        throw new Error('Y2Mate did not return a download link')
    }

    return {
        thumb,
        title,
        quality,
        tipe,
        size,
        output,
        link
    }
}

const ytv = url => y2mate(url, 'mp4')
const yta = url => y2mate(url, 'mp3')

export {
    ytv,
    yta
}