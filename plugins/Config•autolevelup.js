import { canLevelUp } from '../lib/levelling.js'
import moment from 'moment-timezone'

export async function before(m, { conn }) {
  try {
    if (!m || !m.isGroup) return true

    global.db.data.users[m.sender] = global.db.data.users[m.sender] || {}
    global.db.data.chats[m.chat] = global.db.data.chats[m.chat] || {}

    const user = global.db.data.users[m.sender]
    const chat = global.db.data.chats[m.chat]

    if (!chat.autolevelup) return true

    if (typeof user.level !== 'number') {
      user.level = 0
    }

    if (typeof user.exp !== 'number') {
      user.exp = 0
    }

    if (typeof user.role !== 'string') {
      user.role = 'Novato'
    }

    const oldLevel = user.level

    while (
      canLevelUp(
        user.level,
        user.exp,
        global.multiplier || 1
      )
    ) {
      user.level++
    }

    if (oldLevel === user.level) return true

    const fecha = moment
      .tz('America/Mexico_City')
      .format('DD/MM/YY')

    await conn.reply(
      m.chat,
      `*🎉 ¡ F E L I C I D A D E S ! 🎉*

💫 Nivel Actual » *${user.level}*
🌵 Rango » *${user.role}*
📆 Fecha » *${fecha}*

> *\`¡Has alcanzado un Nuevo Nivel!\`*`,
      m
    )

    return true
  } catch (e) {
    console.error(
      'AutoLevelUp error:',
      e && e.stack ? e.stack : e
    )

    return true
  }
}