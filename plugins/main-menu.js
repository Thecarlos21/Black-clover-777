import { xpRange } from '../lib/levelling.js'
import fs from 'fs'
import path from 'path'
import fetch from 'node-fetch'

const charset = {
  a:'ᴀ',b:'ʙ',c:'ᴄ',d:'ᴅ',e:'ᴇ',f:'ꜰ',g:'ɢ',h:'ʜ',i:'ɪ',
  j:'ᴊ',k:'ᴋ',l:'ʟ',m:'ᴍ',n:'ɴ',o:'ᴏ',p:'ᴘ',q:'ǫ',r:'ʀ',
  s:'ꜱ',t:'ᴛ',u:'ᴜ',v:'ᴠ',w:'ᴡ',x:'x',y:'ʏ',z:'ᴢ'
}

const textCyberpunk = t =>
  t.replace(/[a-z]/gi, c =>
    charset[c.toLowerCase()] || c
  )

const fontBold = {
  A:'𝐀',B:'𝐁',C:'𝐂',D:'𝐃',E:'𝐄',F:'𝐅',G:'𝐆',H:'𝐇',I:'𝐈',
  J:'𝐉',K:'𝐊',L:'𝐋',M:'𝐌',N:'𝐍',O:'𝐎',P:'𝐏',Q:'𝐐',R:'𝐑',
  S:'𝐒',T:'𝐓',U:'𝐔',V:'𝐕',W:'𝐖',X:'𝐗',Y:'𝐘',Z:'𝐙',
  a:'𝐚',b:'𝐛',c:'𝐜',d:'𝐝',e:'𝐞',f:'𝐟',g:'𝐠',h:'𝐡',i:'𝐢',
  j:'𝐣',k:'𝐤',l:'𝐥',m:'𝐦',n:'𝐧',o:'𝐨',p:'𝐩',q:'𝐪',r:'𝐫',
  s:'𝐬',t:'𝐭',u:'𝐮',v:'𝐯',w:'𝐰',x:'𝐱',y:'𝐲',z:'𝐳'
}

const textBold = t =>
  t.replace(/[a-z]/gi, c =>
    fontBold[c] || c
  )

const tags = {
  main: '⚙️ ' + textCyberpunk('sistema'),
  group: '👥 ' + textCyberpunk('grupos'),
  serbot: '🤖 ' + textCyberpunk('sub bots'),
  rpg: '🏛️ ' + textCyberpunk('rpg'),
  downloader: '📥 ' + textCyberpunk('descargas'),
  tools: '🛠️ ' + textCyberpunk('herramientas'),
  game: '🎮 ' + textCyberpunk('juegos'),
  fun: '🎉 ' + textCyberpunk('diversión'),
  anime: '🌸 ' + textCyberpunk('anime'),
  owner: '👑 ' + textCyberpunk('creador')
}

const defaultMenu = {
  before: `
—͟͟͞͞ ♱ *Menu Clover MD* »
${textBold('👤')} @%name
${textBold('Rango')} » %rank
${textBold('Nivel')} » %level | ${textBold('Exp')} » %maxexp
${textBold('Comandos')} » %totalcmd
${textBold('Modo')} » %mode
${textBold('Activo')} » %muptime
${textBold('Usuarios')} » %totalreg
—͟͟͞͞ ⋆♱꙳•❅‧*₊⋆♱꙳︎‧*❆₊♱⋆ —͟͟͞͞ ╯
%readmore
`.trim(),

  header: '\n⧼⋆꙳•〔 ♱ %category 〕⋆꙳•⧽',
  body: '> 𖣘 %cmd',
  footer: '╰⋆꙳•❅‧*₊⋆꙳︎‧*❆₊⋆╯',
  after: '\n⌬ 𝗖𝗬𝗕𝗘𝗥 𝗠𝗘𝗡𝗨 🧬 - Sistema ejecutado con éxito.'
}

const menuDir = './media/menu'
const newsletterId = '120363419782804545@newsletter'
const newsletterName = 'The Legends'

fs.mkdirSync(menuDir, {
  recursive: true
})

const getMenuMediaFile = jid =>
  path.join(
    menuDir,
    `menuMedia_${jid.replace(/[:@.]/g, '_')}.json`
  )

const loadMenuMedia = jid => {
  const file = getMenuMediaFile(jid)

  if (!fs.existsSync(file))
    return {}

  try {
    return JSON.parse(
      fs.readFileSync(file, 'utf8')
    )
  } catch {
    return {}
  }
}

const fetchBuffer = async url => {
  const res = await fetch(url)

  if (!res.ok)
    throw new Error(
      `No se pudo descargar la imagen: ${res.status}`
    )

  return Buffer.from(
    await res.arrayBuffer()
  )
}

let defaultThumb = null

try {
  defaultThumb = await fetchBuffer(
    'https://raw.githubusercontent.com/JTxs00/uploads/main/1780717405556.jpeg'
  )
} catch {}

const getRank = level => {
  if (level >= 100)
    return textBold('Rey Mago') + ' 👑'

  if (level >= 80)
    return textBold('Gran Caballero') + ' 🔱'

  if (level >= 60)
    return textBold('Caballero Superior') + ' ⚜️'

  if (level >= 40)
    return textBold('Caballero Intermedio') + ' 🛡️'

  if (level >= 20)
    return textBold('Caballero') + ' ⚔️'

  if (level >= 10)
    return textBold('Junior') + ' 🌟'

  return textBold('Novato') + ' 🌱'
}

const clockString = ms =>
  [3600000, 60000, 1000]
   .map((v, i) =>
      String(
        Math.floor(ms / v) %
        (i? 60 : 99)
      ).padStart(2, '0')
    )
   .join(':')

let handler = async (
  m,
  { conn, usedPrefix }
) => {

  await conn.sendMessage(
    m.chat,
    {
      react: {
        text: '☘️',
        key: m.key
      }
    }
  )

  const botJid = conn.user.jid

  const menuMedia =
    loadMenuMedia(botJid)

  const menu =
    global.subBotMenus?.[botJid] ||
    defaultMenu

  const user =
    global.db.data.users[m.sender] || {
      level: 0,
      exp: 0
    }

  const {
    min,
    xp
  } = xpRange(
    user.level,
    global.multiplier
  )

  const plugins =
    Object.values(
      global.plugins || {}
    ).filter(
      p =>!p.disabled
    )

  const totalCmd =
    plugins.reduce(
      (a, b) =>
        a + (b.help?.length || 0),
      0
    )

  const replace = {
    name:
      await conn.getName(m.sender),

    level:
      user.level,

    exp:
      user.exp - min,

    maxexp:
      xp,

    rank:
      getRank(user.level),

    totalreg:
      Object.keys(
        global.db.data.users || {}
      ).length,

    totalcmd:
      totalCmd,

    mode:
      global.opts.self
       ? textBold('Privado') + ' 🔒'
        : textBold('Público') + ' 🌍',

    muptime:
      clockString(
        process.uptime() * 1000
      )
  }

  const seenCommands =
    new Set()

  const help =
    plugins
     .map(p => ({
        help:
          [].concat(
            p.help || []
          ).filter(h => {

            const cmd =
              p.prefix
               ? h
                : usedPrefix + h

            if (
              seenCommands.has(cmd)
            )
              return false

            seenCommands.add(cmd)

            return true
          }),

        tags:
          [].concat(
            p.tags || []
          ),

        prefix:
          'customPrefix' in p
      }))
     .filter(
        p => p.help.length
      )

  for (const { tags: tg } of help) {
    for (const t of tg) {
      if (
        t &&
       !tags[t]
      ) {
        tags[t] =
          '🔥 ' +
          textCyberpunk(t)
      }
    }
  }

  const beforeText =
    menu.before.replace(
      /%(\w+)/g,
      (_, k) =>
        replace[k]?? ''
    )

  const menuParts = []

  for (
    const tag of Object.keys(tags)
  ) {

    const commands =
      help
       .filter(p =>
          p.tags.includes(tag)
        )
       .flatMap(p =>
          p.help.map(command =>
            menu.body.replace(
              '%cmd',
              p.prefix
               ? command
                : usedPrefix + command
            )
          )
        )

    if (!commands.length)
      continue

    const category =
      menu.header.replace(
        '%category',
        tags[tag]
      )

    menuParts.push(
      category +
      '\n' +
      commands.join('\n') +
      '\n' +
      menu.footer
    )
  }

  const readmore = String.fromCharCode(8206).repeat(4001)
  const commandsText = menuParts.join('\n')
  const afterText = menu.after

  const caption = beforeText + readmore + '\n\n' + commandsText + '\n' + afterText

  let thumb = null

  if (
    menuMedia.thumbnail &&
    fs.existsSync(
      menuMedia.thumbnail
    )
  ) {
    try {
      thumb =
        fs.readFileSync(
          menuMedia.thumbnail
        )
    } catch {
      thumb =
        defaultThumb
    }
  } else {
    thumb =
      defaultThumb
  }

  await conn.sendMessage(
    m.chat,
    {
      image: thumb,
      caption: caption,
      mentions: [
        m.sender
      ],
      contextInfo: {
        forwardedNewsletterMessageInfo: {
          newsletterJid: newsletterId,
          newsletterName: newsletterName
        }
      }
    },
    {
      quoted: m
    }
  )
}

handler.help = [
  'menu',
  'menú'
]

handler.tags = [
  'main'
]

handler.command = [
  'menu',
  'menú',
  'help',
  'ayuda'
]

handler.register = true

export default handler