import cheerio from 'cheerio'
import axios from 'axios'
import qs from 'querystring'

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0.0.0 Safari/537.36'

const http = axios.create({
  timeout: 15000,
  maxRedirects: 5,
  headers: {
    'User-Agent': USER_AGENT,
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  }
})

const logError = (name, error) => {
  console.error(
    `${name} error:`,
    error?.message || error
  )
}

async function sekaikomikDl(url) {
  if (!url || typeof url !== 'string') {
    return []
  }

  try {
    const { data: html } = await http.get(url)

    if (!html || typeof html !== 'string') {
      return []
    }

    const $ = cheerio.load(html)

    let images = []

    $('script').each((_, el) => {
      if (images.length) return

      const script = $(el).html()

      if (!script || !/wp-content/i.test(script)) {
        return
      }

      const match = script.match(
        /"images"\s*:\s*(\[[\s\S]*?\])/
      )

      if (!match) {
        return
      }

      try {
        const parsed = JSON.parse(match[1])

        if (Array.isArray(parsed)) {
          images = parsed
        }
      } catch {}
    })

    return [
      ...new Set(
        images
          .filter(
            img =>
              typeof img === 'string' &&
              img.length
          )
          .map(img => encodeURI(img))
      )
    ]
  } catch (error) {
    logError(
      'sekaikomikDl',
      error
    )

    return []
  }
}

async function facebookDl(url) {
  if (!url || typeof url !== 'string') {
    return {}
  }

  try {
    const response = await http.get(
      'https://fdownloader.net/',
      {
        headers: {
          Referer: 'https://fdownloader.net/'
        }
      }
    )

    const html = response.data

    if (!html || typeof html !== 'string') {
      return {}
    }

    const $ = cheerio.load(html)

    const token = $(
      'input[name="__RequestVerificationToken"]'
    ).val()

    const cookie =
      response.headers['set-cookie']?.join('; ') || ''

    if (!token) {
      return {}
    }

    const res = await http.post(
      'https://fdownloader.net/api/ajaxSearch',
      qs.stringify({
        __RequestVerificationToken: token,
        q: url
      }),
      {
        headers: {
          cookie,
          'content-type':
            'application/x-www-form-urlencoded',
          referer:
            'https://fdownloader.net/'
        }
      }
    )

    const htmlResult =
      res.data?.data

    if (
      !htmlResult ||
      typeof htmlResult !== 'string'
    ) {
      return {}
    }

    const $$ = cheerio.load(htmlResult)
    const result = {}

    $$(
      '.button.is-success.is-small.download-link-fb'
    ).each((_, el) => {
      const element = $$(el)

      const title =
        element.attr('title') || ''

      const link =
        element.attr('href')

      if (!link) {
        return
      }

      const parts = title.trim().split(/\s+/)
      const quality =
        parts[1] || title.trim()

      if (quality) {
        result[quality] = link
      }
    })

    return result
  } catch (error) {
    logError(
      'facebookDl',
      error
    )

    return {}
  }
}

async function tiktokStalk(user) {
  if (!user || typeof user !== 'string') {
    return {}
  }

  user = user
    .trim()
    .replace(/^@/, '')

  if (!user) {
    return {}
  }

  try {
    const { data: html } =
      await http.get(
        `https://urlebird.com/user/${encodeURIComponent(user)}/`
      )

    if (!html || typeof html !== 'string') {
      return {}
    }

    const $ = cheerio.load(html)

    const followersText = $(
      'div.col-7.col-md-auto.text-truncate'
    )
      .first()
      .text()
      .trim()

    const followingText = $(
      'div.col-auto.d-none.d-sm-block.text-truncate'
    )
      .first()
      .text()
      .trim()

    const followers =
      followersText.match(
        /[\d,.]+/
      )?.[0] || '0'

    const following =
      followingText.match(
        /[\d,.]+/
      )?.[0] || '0'

    return {
      pp_user:
        $('div.col-md-auto.justify-content-center.text-center img')
          .first()
          .attr('src') || '',

      name:
        $('h1.user')
          .first()
          .text()
          .trim() || '',

      username:
        $('div.content > h5')
          .first()
          .text()
          .trim() || '',

      followers,
      following,

      description:
        $('div.content > p')
          .first()
          .text()
          .trim() || ''
    }
  } catch (error) {
    logError(
      'tiktokStalk',
      error
    )

    return {}
  }
}

async function igStalk(username) {
  if (
    !username ||
    typeof username !== 'string'
  ) {
    return {}
  }

  username = username
    .trim()
    .replace(/^@/, '')

  if (!username) {
    return {}
  }

  try {
    const { data: html } =
      await http.get(
        `https://dumpor.com/v/${encodeURIComponent(username)}`
      )

    if (!html || typeof html !== 'string') {
      return {}
    }

    const $ = cheerio.load(html)

    const name =
      $('div.user__title h1')
        .first()
        .text()
        .trim()

    const Uname =
      $('div.user__title h4')
        .first()
        .text()
        .trim()

    const description =
      $('div.user__info-desc')
        .first()
        .text()
        .trim()

    const style =
      $('div.user__img')
        .first()
        .attr('style') || ''

    const profilePic =
      style.match(
        /url\(\s*['"]?(.*?)['"]?\s*\)/
      )?.[1] || ''

    const list =
      $('ul.list > li.list__item')

    const getNumber = index =>
      Number(
        list
          .eq(index)
          .text()
          .replace(/\D/g, '')
      ) || 0

    return {
      name,
      username: Uname,
      description,
      posts: getNumber(0),
      followers: getNumber(1),
      following: getNumber(2),
      profilePic
    }
  } catch (error) {
    logError(
      'igStalk',
      error
    )

    return {}
  }
}

export {
  sekaikomikDl,
  facebookDl,
  tiktokStalk,
  igStalk
}