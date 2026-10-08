//código creado x The Carlos 👑 

let handler = async (m, { conn, args, participants }) => {
  let db = global.db.data.users

  let sender = m.sender
  let user = db[sender] || (db[sender] = {})

  user.monedas = Number.isFinite(Number(user.monedas)) ? Number(user.monedas) : 0
  user.antirobo = Number.isFinite(Number(user.antirobo)) ? Number(user.antirobo) : 0
  user.desbloqueo = Number.isFinite(Number(user.desbloqueo)) ? Number(user.desbloqueo) : 0

  let target = m.mentionedJid?.[0] || args[0]
  if (!target) return conn.reply(m.chat, 'tienes que mencionar a alguien', m)

  if (!db[target]) db[target] = {}

  let victim = db[target]

  victim.monedas = Number.isFinite(Number(victim.monedas)) ? Number(victim.monedas) : 0
  victim.antirobo = Number.isFinite(Number(victim.antirobo)) ? Number(victim.antirobo) : 0
  victim.desbloqueo = Number.isFinite(Number(victim.desbloqueo)) ? Number(victim.desbloqueo) : 0

  let cost = 100000
  let time = 3 * 60 * 1000

  if (user.monedas < cost) {
    return conn.reply(
      m.chat,
      `no tienes monedas suficientes\nnecesitas ${cost.toLocaleString('es-MX')} para esto`,
      m
    )
  }

  user.monedas -= cost

  if (user.monedas < 0 || !Number.isFinite(user.monedas)) {
    user.monedas = 0
  }

  victim.desbloqueo = Date.now() + time
  victim.antirobo = 0

  let nombre = null

  if (participants?.length) {
    let participante = participants.find(p => {
      return p.id === target ||
        p.jid === target ||
        p.lid === target ||
        p.phoneNumber === target
    })

    if (participante) {
      nombre = participante.name || participante.notify || participante.pushName
    }
  }

  if (!nombre && conn.store?.contacts) {
    let contacto = conn.store.contacts[target]

    if (contacto) {
      nombre = contacto.name || contacto.notify || contacto.verifiedName
    }
  }

  if (!nombre && conn.contacts) {
    let contacto = conn.contacts[target]

    if (contacto) {
      nombre = contacto.name || contacto.notify || contacto.verifiedName
    }
  }

  if (!nombre) {
    let numero = target.split('@')[0]
    nombre = `@${numero}`
  }

  return conn.reply(
    m.chat,
    `🔓 desbloqueaste a ${nombre}\nquedó vulnerable por unos minutos`,
    m
  )
}

handler.help = ['desbloquear @user']
handler.tags = ['gacha']
handler.command = ['desbloquear']

export default handler