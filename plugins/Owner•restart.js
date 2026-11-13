import fs from 'fs'
import os from 'os'
import path from 'path'

let handler = async (m, { conn, text: txt }) => {
  try {
    const args = txt?.trim().toLowerCase().split(/\s+/).filter(Boolean) || []

    if (args[0] === 'clean' || args[0] === 'limpiar') {
      const option = args[1]

      if (!option) {
        return m.reply(
          `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆\n` +
          `𐚁 ֹ ִ *ʟɪᴍᴘɪᴇᴢᴀ* ! ୧ ֹ ִ\n\n` +
          `> ✐ *.storage clean tmp*\n` +
          `> └ Limpia temporales del bot\n\n` +
          `> ✐ *.storage clean mediafire*\n` +
          `> └ Limpia archivos temporales de MediaFire\n\n` +
          `> ✐ *.storage clean devices*\n` +
          `> └ Elimina device-list antiguos\n\n` +
          `> ✐ *.storage clean logs*\n` +
          `> └ Limpia logs de PM2\n\n` +
          `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆`
        )
      }

      if (option === 'tmp') {
        const tmp = os.tmpdir()
        let deleted = 0
        let size = 0

        const files = fs.readdirSync(tmp)

        for (const file of files) {
          const fullPath = path.join(tmp, file)

          try {
            const stat = fs.statSync(fullPath)

            if (stat.isFile() && file.startsWith('mediafire_')) {
              size += stat.size
              fs.unlinkSync(fullPath)
              deleted++
            }
          } catch {}
        }

        return m.reply(
          `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆\n` +
          `𐚁 ֹ ִ *ᴛᴍᴘ ʟɪᴍᴘɪᴏ* ! ୧ ֹ ִ\n\n` +
          `> ✐ Archivos › ${deleted}\n` +
          `> ✐ Liberado › ${formatBytes(size)}\n\n` +
          `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆`
        )
      }

      if (option === 'mediafire') {
        const tmp = os.tmpdir()
        let deleted = 0
        let size = 0

        const files = fs.readdirSync(tmp)

        for (const file of files) {
          if (!file.toLowerCase().startsWith('mediafire_')) continue

          const fullPath = path.join(tmp, file)

          try {
            const stat = fs.statSync(fullPath)

            if (stat.isFile()) {
              size += stat.size
              fs.unlinkSync(fullPath)
              deleted++
            }
          } catch {}
        }

        return m.reply(
          `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆\n` +
          `𐚁 ֹ ִ *ᴍᴇᴅɪᴀғɪʀᴇ ʟɪᴍᴘɪᴏ* ! ୧ ֹ ִ\n\n` +
          `> ✐ Archivos › ${deleted}\n` +
          `> ✐ Liberado › ${formatBytes(size)}\n\n` +
          `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆`
        )
      }

      if (option === 'devices') {
        const sessionPath = path.resolve('./blackSession')
        let deleted = 0
        let size = 0

        if (fs.existsSync(sessionPath)) {
          const files = fs.readdirSync(sessionPath)

          for (const file of files) {
            if (!file.startsWith('device-list-') || !file.endsWith('.json')) continue

            const fullPath = path.join(sessionPath, file)

            try {
              const stat = fs.statSync(fullPath)

              if (stat.isFile()) {
                size += stat.size
                fs.unlinkSync(fullPath)
                deleted++
              }
            } catch {}
          }
        }

        return m.reply(
          `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆\n` +
          `𐚁 ֹ ִ *ᴅᴇᴠɪᴄᴇs ʟɪᴍᴘɪᴏs* ! ୧ ֹ ִ\n\n` +
          `> ✐ Archivos › ${deleted}\n` +
          `> ✐ Liberado › ${formatBytes(size)}\n\n` +
          `> ✐ *creds.json* › protegido\n` +
          `> ✐ *identity-key* › protegido\n\n` +
          `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆`
        )
      }

      if (option === 'logs') {
        const logPaths = [
          path.join(process.env.HOME || '', '.pm2', 'logs'),
          '/root/.pm2/logs'
        ]

        const logPath = logPaths.find(p => fs.existsSync(p))

        if (!logPath) {
          return m.reply(
            `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆\n` +
            `𐚁 ֹ ִ *ʟᴏɢs* ! ୧ ֹ ִ\n\n` +
            `> ✐ No se encontró la carpeta de logs de PM2.\n\n` +
            `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆`
          )
        }

        let deleted = 0
        let size = 0

        const files = fs.readdirSync(logPath)

        for (const file of files) {
          const fullPath = path.join(logPath, file)

          try {
            const stat = fs.statSync(fullPath)

            if (stat.isFile() && (file.endsWith('.log') || file.endsWith('.out'))) {
              size += stat.size
              fs.truncateSync(fullPath, 0)
              deleted++
            }
          } catch {}
        }

        return m.reply(
          `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆\n` +
          `𐚁 ֹ ִ *ʟᴏɢs ʟɪᴍᴘɪᴏs* ! ୧ ֹ ִ\n\n` +
          `> ✐ Archivos › ${deleted}\n` +
          `> ✐ Liberado › ${formatBytes(size)}\n\n` +
          `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆`
        )
      }

      return m.reply(
        `࿆ㅤ໋︵ּㅤׄ⏜ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆\n` +
        `𐚁 ֹ ִ *ᴏᴘᴄɪᴏɴ ɪɴᴠᴀʟɪᴅᴀ* ! ୧ ֹ ִ\n\n` +
        `> ✐ *.storage clean tmp*\n` +
        `> ✐ *.storage clean mediafire*\n` +
        `> ✐ *.storage clean devices*\n` +
        `> ✐ *.storage clean logs*\n\n` +
        `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆`
      )
    }

    const root = path.parse(process.cwd()).root
    const tmp = os.tmpdir()

    const rootStats = fs.statfsSync(root)
    const tmpStats = fs.statfsSync(tmp)

    const total = Number(rootStats.blocks) * Number(rootStats.bsize)
    const free = Number(rootStats.bavail) * Number(rootStats.bsize)
    const used = total - free

    const tmpTotal = Number(tmpStats.blocks) * Number(tmpStats.bsize)
    const tmpFree = Number(tmpStats.bavail) * Number(tmpStats.bsize)
    const tmpUsed = tmpTotal - tmpFree

    const sessionPath = path.resolve('./blackSession')
    const sessionSize = fs.existsSync(sessionPath)
      ? getFolderSize(sessionPath)
      : 0

    const botSize = getFolderSize(process.cwd(), [sessionPath])

    let storageText =
      `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆\n` +
      `𐚁 ֹ ִ *sᴛᴏʀᴀɢᴇ* ! ୧ ֹ ִ\n\n`

    storageText += `> ✐ *Servidor*\n`
    storageText += `> ├ Total › ${formatBytes(total)}\n`
    storageText += `> ├ Usado › ${formatBytes(used)}\n`
    storageText += `> ├ Libre › ${formatBytes(free)}\n`
    storageText += `> └ Uso › ${((used / total) * 100).toFixed(2)}%\n\n`

    storageText += `> ✐ *Bot*\n`
    storageText += `> └ Tamaño › ${formatBytes(botSize)}\n\n`

    storageText += `> ✐ *blackSession*\n`
    storageText += `> └ Tamaño › ${formatBytes(sessionSize)}\n\n`

    storageText += `> ✐ */tmp*\n`
    storageText += `> ├ Total › ${formatBytes(tmpTotal)}\n`
    storageText += `> ├ Usado › ${formatBytes(tmpUsed)}\n`
    storageText += `> └ Libre › ${formatBytes(tmpFree)}\n\n`

    storageText += `> ✐ *Estado* › ${getStatus(used, total)}\n\n`

    storageText += `> ✐ *Limpieza*\n`
    storageText += `> ├ *.storage clean tmp*\n`
    storageText += `> ├ *.storage clean mediafire*\n`
    storageText += `> ├ *.storage clean devices*\n`
    storageText += `> └ *.storage clean logs*\n\n`

    storageText += `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ︵࿆`

    await m.reply(storageText)

  } catch (e) {
    return m.reply(
      `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆\n` +
      `𐚁 ֹ ִ *ᴇʀʀᴏʀ* ! ୧ ֹ ִ\n\n` +
      `> ✐ ${e.message}\n\n` +
      `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ︵࿆`
    )
  }
}

handler.help = ['storage', 'disk']
handler.tags = ['owner']
handler.command = ['storage', 'disk']
handler.rowner = true

export default handler

function getFolderSize(folder, excluded = []) {
  let total = 0

  try {
    const files = fs.readdirSync(folder, { withFileTypes: true })

    for (const file of files) {
      const fullPath = path.join(folder, file.name)

      try {
        if (file.isSymbolicLink()) continue
        if (excluded.includes(fullPath)) continue

        if (file.isDirectory()) {
          total += getFolderSize(fullPath, excluded)
        } else if (file.isFile()) {
          total += fs.statSync(fullPath).size
        }
      } catch {}
    }
  } catch {}

  return total
}

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  )

  return `${(bytes / Math.pow(1024, index)).toFixed(2)} ${units[index]}`
}

function getStatus(used, total) {
  const percentage = (used / total) * 100

  if (percentage >= 95) return 'CRÍTICO'
  if (percentage >= 85) return 'MUY ALTO'
  if (percentage >= 70) return 'ALTO'

  return 'NORMAL'
}