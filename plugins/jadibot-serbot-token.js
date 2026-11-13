import fs from 'fs'
import path from 'path'

async function handler(m, { conn }) {

  const sender =
    m.senderResolved ||
    m.sender ||
    m.key?.participant ||
    m.key?.participantAlt ||
    ''

  const user =
    String(sender)
      .split('@')[0]
      .replace(/[^0-9]/g, '')

  if (!user)
    return await conn.reply(
      m.chat,
      `🚩 *No se pudo identificar tu número correctamente.*`,
      m
    )

  const sessionDir =
    path.join(
      process.cwd(),
      'núcleo•clover',
      'blackJadiBot',
      user
    )

  const credsFile =
    path.join(
      sessionDir,
      'creds.json'
    )

  if (
    !fs.existsSync(credsFile)
  ) {
    return await conn.reply(
      m.chat,
      `🚩 *No tienes ningún token activo, usa .qr o .code para crear una sesión.*`,
      m
    )
  }

  try {

    const token =
      Buffer.from(
        fs.readFileSync(
          credsFile
        )
      ).toString('base64')

    await conn.reply(
      m.chat,
      `🍄 *El token te permite iniciar sesión en otros bots, recomendamos no compartirlo con nadie.*\n\n*Tu token es:*`,
      m
    )

    await conn.reply(
      m.chat,
      token,
      m
    )

  } catch {

    await conn.reply(
      m.chat,
      `🚩 *No se pudo obtener el token de tu sesión.*`,
      m
    )
  }
}

handler.help = [
  'token',
  'gettoken',
  'serbottoken'
]

handler.command = [
  'token',
  'gettoken',
  'serbottoken'
]

handler.tags = [
  'jadibot'
]

handler.private = true
handler.register = true

export default handler