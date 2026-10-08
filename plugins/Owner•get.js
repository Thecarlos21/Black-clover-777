import fs from 'fs'
import path from 'path'

let handler = async (m, { conn }) => {
  const sessionPath = path.resolve('./blackSession')

  if (!fs.existsSync(sessionPath)) {
    return m.reply(
      `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆\n` +
      `𐚁 ֹ ִ *ᴄʟᴇᴀɴ ᴅᴇᴠɪᴄᴇ* ! ୧ ֹ ִ\n\n` +
      `> ✐ La carpeta *blackSession* no existe.\n\n` +
      `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆`
    )
  }

  let eliminados = 0

  try {
    const archivos = fs.readdirSync(sessionPath)

    for (const archivo of archivos) {
      if (!/^device-list-.*\.json$/i.test(archivo)) continue

      const archivoPath = path.join(sessionPath, archivo)

      if (fs.statSync(archivoPath).isFile()) {
        fs.unlinkSync(archivoPath)
        eliminados++
      }
    }

    return m.reply(
      `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆\n` +
      `𐚁 ֹ ִ *ᴄʟᴇᴀɴ ᴅᴇᴠɪᴄᴇ* ! ୧ ֹ ִ\n\n` +
      `> ✐ Archivos eliminados › *${eliminados}*\n` +
      `> ✐ Carpeta › *blackSession*\n` +
      `> ✐ Estado › Limpieza completada\n\n` +
      `> ✿ *creds.json* y los demás archivos de sesión no fueron tocados.\n\n` +
      `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆`
    )
  } catch (e) {
    return m.reply(
      `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆\n` +
      `𐚁 ֹ ִ *ᴇʀʀᴏʀ* ! ୧ ֹ ִ\n\n` +
      `> ✐ ${e.message}\n\n` +
      `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆`
    )
  }
}

handler.help = ['cleandevice']
handler.tags = ['owner']
handler.command = ['cleandevice', 'cleandevices']
handler.rowner = true

export default handler