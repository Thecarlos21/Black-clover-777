const handler = m => m

export async function all() {
  try {
    if (!global.db || !global.db.data) return

    const users = global.db.data.users || {}
    const now = Date.now()

    for (const [jid, user] of Object.entries(users)) {
      if (!user || !user.premium || !user.premiumTime) continue

      const premiumTime = Number(user.premiumTime)

      if (!Number.isFinite(premiumTime) || premiumTime <= 0) {
        user.premium = false
        user.premiumTime = 0
        user.premiumExpireNotified = false
        continue
      }

      const timeLeft = premiumTime - now

      if (timeLeft <= 0) {
        user.premiumTime = 0
        user.premium = false
        user.premiumExpireNotified = false

        const text =
          '「✐」*Tu tiempo premium ha expirado*\n\n' +
          'Renueva con: *.premium*'

        try {
          await this.sendMessage(
            jid,
            {
              text,
              mentions: [jid]
            }
          )
        } catch {}

        continue
      }

      if (
        timeLeft <= 86400000 &&
        !user.premiumExpireNotified
      ) {
        user.premiumExpireNotified = true

        const hours = Math.max(
          1,
          Math.floor(timeLeft / 3600000)
        )

        const text =
          '「⚠️」*Aviso Premium*\n\n' +
          'Tu suscripción expira en *' +
          hours +
          ' hora' +
          (hours !== 1 ? 's' : '') +
          '*\n\n' +
          'Renueva con: *.premium*'

        try {
          await this.sendMessage(
            jid,
            { text }
          )
        } catch {}
      }
    }
  } catch (e) {
    console.error(
      'Black Clover Premium:',
      e && e.stack ? e.stack : e
    )
  }
}

handler.checkPremium = async function (jid) {
  try {
    if (!global.db || !global.db.data) {
      return {
        active: false,
        timeLeft: 0,
        days: 0,
        hours: 0
      }
    }

    const user = global.db.data.users[jid]

    if (
      !user ||
      !user.premium ||
      !user.premiumTime
    ) {
      return {
        active: false,
        timeLeft: 0,
        days: 0,
        hours: 0
      }
    }

    const premiumTime = Number(user.premiumTime)

    if (!Number.isFinite(premiumTime)) {
      user.premium = false
      user.premiumTime = 0

      return {
        active: false,
        timeLeft: 0,
        days: 0,
        hours: 0
      }
    }

    const timeLeft =
      premiumTime - Date.now()

    if (timeLeft <= 0) {
      user.premium = false
      user.premiumTime = 0
      user.premiumExpireNotified = false

      return {
        active: false,
        timeLeft: 0,
        days: 0,
        hours: 0
      }
    }

    return {
      active: true,
      timeLeft,
      days: Math.floor(
        timeLeft / 86400000
      ),
      hours: Math.floor(
        (timeLeft % 86400000) / 3600000
      )
    }
  } catch {
    return {
      active: false,
      timeLeft: 0,
      days: 0,
      hours: 0
    }
  }
}

handler.addPremium = async function (
  jid,
  days = 30
) {
  try {
    if (!global.db || !global.db.data) {
      return false
    }

    global.db.data.users[jid] =
      global.db.data.users[jid] || {}

    const user =
      global.db.data.users[jid]

    const duration =
      Number(days) * 86400000

    if (
      !Number.isFinite(duration) ||
      duration <= 0
    ) {
      return false
    }

    const now = Date.now()
    const currentTime =
      Number(user.premiumTime) || 0

    user.premium = true

    user.premiumTime =
      currentTime > now
        ? currentTime + duration
        : now + duration

    user.premiumExpireNotified = false

    return true
  } catch (e) {
    console.error(
      'Black Clover addPremium:',
      e && e.stack ? e.stack : e
    )

    return false
  }
}

export default handler