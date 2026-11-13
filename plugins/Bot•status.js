const handler = m => m

handler.all = async function (m) {
  if (!global.db?.data?.settings) return

  let jid = this.user?.jid || this.user?.id
  if (!jid) return

  let setting = global.db.data.settings[jid]
  if (!setting) return
  if (!setting.autobio) return

  let now = Date.now()

  if (now - (setting.lastBio || 0) < 60000) return

  try {
    let _uptime = process.uptime() * 1000
    let uptime = clockString(_uptime)

    let bio = `『${global.packname || 'Bot'}』 | 🕒 Activo: ${uptime} | </> Dev: The Carlos | ⚡`

    await this.updateProfileStatus(bio)

    setting.lastBio = now
    setting.status = now
  } catch {}
}

export default handler

function clockString(ms) {
  let d = isNaN(ms) ? 0 : Math.floor(ms / 86400000)
  let h = isNaN(ms) ? 0 : Math.floor(ms / 3600000) % 24
  let m = isNaN(ms) ? 0 : Math.floor(ms / 60000) % 60
  let s = isNaN(ms) ? 0 : Math.floor(ms / 1000) % 60

  return d > 0
    ? `${d}d ${h}h ${m}m`
    : `${h}h ${m}m ${s}s`
}