const imagen1 = 'https://raw.githubusercontent.com/JTxs00/uploads/main/1776310123337.jpeg'

let handler = async (m, { conn, usedPrefix, getUserDisplay }) => {
  const users = global.db?.data?.users

  if (!users) {
    return m.reply('❌ La base de datos de usuarios no está disponible.')
  }

  const who = m.mentionedJid?.[0] || m.quoted?.sender || m.sender
  let display = null

  if (typeof getUserDisplay === 'function') {
    try {
      display = await getUserDisplay(who)
    } catch {}
  }

  const userKey = display?.jid || who

  if (!users[userKey] && users[who]) {
    users[userKey] = users[who]
  }

  if (!users[userKey]) {
    users[userKey] = {}
  }

  const user = users[userKey]

  user.premium = Boolean(user.premium)
  user.level = Math.max(0, Number(user.level) || 0)
  user.exp = Math.max(0, Number(user.exp) || 0)
  user.lastclaim = Number(user.lastclaim) || 0
  user.registered = Boolean(user.registered)
  user.regTime = Number(user.regTime ?? -1)
  user.age = Number(user.age) || 0
  user.role = user.role || '⭑ Novato ⭑'
  user.monedas = Number(user.monedas) || 0
  user.health = Math.max(0, Number(user.health ?? 100))
  user.mp = Math.max(0, Number(user.mp ?? 100))
  user.atq = Math.max(0, Number(user.atq ?? 50))
  user.def = Math.max(0, Number(user.def ?? 50))
  user.personajes = Array.isArray(user.personajes) ? user.personajes : []
  user.chat = Number(user.chat) || 0
  user.joincount = Number(user.joincount) || 0

  if (!user.premium) {
    user.role = obtenerRango(user.level)
  }

  const {
    premium,
    level,
    exp,
    registered,
    role,
    monedas,
    health,
    mp,
    atq,
    def,
    personajes,
    chat,
    joincount
  } = user

  let username = display?.name

  if (!username || username === 'Usuario') {
    username = user.name
  }

  if (!username || username === 'Usuario') {
    try {
      username = await conn.getName(userKey)
    } catch {}
  }

  if (!username || username === 'Usuario') {
    username = `@${String(userKey).split('@')[0]}`
  }

  let number = display?.number || String(userKey).split('@')[0]

  if (!number || number === 'undefined') {
    number = String(who).split('@')[0]
  }

  let pp = imagen1

  try {
    pp = await conn.profilePictureUrl(userKey, 'image') || imagen1
  } catch {}

  const xpParaSiguiente = 1000 + level * 100
  const porcentaje = Math.min(100, Math.max(0, exp / xpParaSiguiente * 100)).toFixed(1)
  const barraXp = barra(exp, xpParaSiguiente, 10)

  const usuarios = Object.entries(users)
    .sort((a, b) => (Number(b[1]?.level) || 0) - (Number(a[1]?.level) || 0))

  const rank = Math.max(1, usuarios.findIndex(([id]) => id === userKey || id === who) + 1)

  const totalRiqueza = monedas
  const poderTotal = Math.floor((atq + def + level) * (health / 100))

  const animacion = `〘 *Sistema Mágico* 〙📖

🔒 Detectando energía mágica...
⏳ Analizando grimorio del portador...
💠 Sincronizando con el maná...

✨✨✨ 𝙰𝙲𝚃𝙸𝚅𝙰𝙲𝙸𝙾́𝙽 𝙲𝙾𝙼𝙿𝙻𝙴𝚃𝙰 ✨✨✨

*El grimorio se ha abierto...*`

  await conn.sendMessage(m.chat, { text: animacion }, { quoted: m })
  await delay(1000)

  let noprem = `『 ＧＲＩＭＯＲＩＯ ＢＡＳＥ 』📕

⚔️ *Portador:* ${username}
🆔 *Número:* ${number}
📜 *Registrado:* ${registered ? '✅ Activado' : '❌ No'}
🏆 *Ranking:* #${rank}

🧪 *Estado Mágico:*
⚡ *Nivel:* ${level}
✨ *Exp:* ${exp.toLocaleString()}/${xpParaSiguiente.toLocaleString()} (${porcentaje}%)
${barraXp}
📈 *Rango:* ${role}
🔮 *Premium:* ❌ No activo

💰 *Economía:*
➤ Monedas: ${monedas.toLocaleString()}
➤ Riqueza: ${totalRiqueza.toLocaleString()}

⚔️ *Combate:*
➤ Vida: ${health}/100
➤ Mana: ${mp}/100
➤ Ataque: ${atq} | Defensa: ${def}
➤ Poder: ${poderTotal.toLocaleString()}

📊 *Stats:*
➤ Mensajes: ${chat.toLocaleString()}
➤ Personajes: ${personajes.length}
➤ Tokens: ${joincount.toLocaleString()}

📔 *Grimorio:* Básico de 1 hoja 📘
🔒 *Elemento:* Desconocido

📌 Mejora tu grimorio para desbloquear más magia...
━━━━━━━━━━━━━━━━━━`

  let prem = `👹〘 𝐌𝐎𝐃𝐎 𝐃𝐄𝐌𝐎𝐍𝐈𝐎: *𝐀𝐂𝐓𝐈𝐕𝐀𝐃𝐎* 〙👹

🌌 ＧＲＩＭＯＲＩＯ ５ＨＯＪＡＳ

🧛 *Portador Élite:* ${username}
🧿 *Número:* ${number}
✅ *Registrado:* ${registered ? 'Sí' : 'No'}
👑 *Rango:* 🟣 *Supremo Demoníaco*
🏆 *Ranking Global:* #${rank}

🔮 *Energía Oscura:*
⚡ *Nivel:* ${level}
🌟 *Exp:* ${exp.toLocaleString()}/${xpParaSiguiente.toLocaleString()} (${porcentaje}%)
${barraXp}
🪄 *Rango Mágico:* ${role}
💠 *Estado Premium:* ✅ ACTIVADO

💎 *Economía Élite:*
➤ Monedas: ${monedas.toLocaleString()}
➤ Riqueza Total: ${totalRiqueza.toLocaleString()}

⚔️ *Stats Demoníacas:*
➤ Vida: ${health}/100
➤ Mana: ${mp}/100
➤ Ataque: ${atq} | Defensa: ${def}
➤ Poder Total: ${poderTotal.toLocaleString()}

📊 *Estadísticas:*
➤ Mensajes: ${chat.toLocaleString()}
➤ Personajes: ${personajes.length}
➤ Tokens: ${joincount.toLocaleString()}

📕 *Grimorio:* ☯️ Anti-Magia de 5 hojas
🔥 *Modo Especial:* ✦ *Despertar Oscuro de Asta*
🧩 *Elemento:* Anti-Magia & Espada Demoníaca

📜 *Hechizo Desbloqueado:*
❖ 「𝙱𝚕𝚊𝚌𝚔 the Legends ⚡」
↳ Daño masivo a bots enemigos.

📔 *Nota:* Este usuario ha superado sus límites... ☄️
🌌⟣══════════════⟢🌌`

  const botones = [
    {
      buttonId: `${usedPrefix}inventario`,
      buttonText: { displayText: '🎒 Inventario' },
      type: 1
    },
    {
      buttonId: `${usedPrefix}top`,
      buttonText: { displayText: '🏆 Ranking' },
      type: 1
    },
    {
      buttonId: `${usedPrefix}premium`,
      buttonText: { displayText: '💎 Premium' },
      type: 1
    }
  ]

  await conn.sendMessage(
    m.chat,
    {
      image: { url: pp },
      caption: premium ? prem : noprem,
      footer: 'Black Clover RPG 2026',
      buttons: botones,
      headerType: 4,
      mentions: [userKey]
    },
    { quoted: m }
  )

  return true
}

handler.help = ['profile', 'perfil', 'me']
handler.register = true
handler.group = true
handler.tags = ['rg', 'rpg']
handler.command = ['profile', 'perfil', 'me']

export default handler

function obtenerRango(level) {
  if (level >= 200) return '🔱 Dios Arcano'
  if (level >= 150) return '👑 Rey Mago'
  if (level >= 100) return '⚜️ Emperador Arcano'
  if (level >= 80) return '🛡️ Capitán Supremo'
  if (level >= 60) return '🔮 Gran Hechicero'
  if (level >= 40) return '⚔️ Caballero Mágico'
  if (level >= 25) return '✨ Mago Avanzado'
  if (level >= 10) return '📘 Aprendiz'
  return '⭑ Novato ⭑'
}

function barra(valor, max, tamaño = 10) {
  const progreso = Math.min(1, Math.max(0, valor / max))
  const llenos = Math.round(progreso * tamaño)
  return '█'.repeat(llenos) + '░'.repeat(tamaño - llenos)
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}