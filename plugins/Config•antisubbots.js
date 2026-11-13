import { areJidsSameUser } from '@whiskeysockets/baileys'

export async function before(m, { participants, conn }) {
  try {
    if (!m.isGroup) return

    const chat = global?.db?.data?.chats?.[m.chat]
    if (!chat?.antiBot2) return
    if (chat.__antiBot2Leaving) return

    const mainConn = global.mainBot?.user?.jid
      ? global.mainBot
      : global.conn

    if (!mainConn?.user?.jid || !conn?.user?.jid) return

    const resolveJid = async (jid, socket) => {
      if (!jid || typeof jid !== 'string') return null

      if (!jid.endsWith('@lid')) return jid

      try {
        const mapping = socket?.signalRepository?.lidMapping

        if (mapping?.getPNForLID) {
          const pn = await mapping.getPNForLID(jid)
          if (pn) return pn
        }
      } catch {}

      return jid
    }

    const mainOriginalJid = mainConn.user.jid
    const thisOriginalJid = conn.user.jid

    const mainJid = await resolveJid(mainOriginalJid, mainConn)
    const thisJid = await resolveJid(thisOriginalJid, conn)

    if (!mainJid || !thisJid) return

    if (
      areJidsSameUser(mainJid, thisJid) ||
      areJidsSameUser(mainOriginalJid, thisOriginalJid)
    ) return

    const metadata = await conn.groupMetadata(m.chat).catch(() => null)

    const list =
      Array.isArray(participants) && participants.length
        ? participants
        : metadata?.participants || []

    let isMainBotPresent = false

    for (const participant of list) {
      const participantJid =
        participant?.id ||
        participant?.jid ||
        participant?.lid ||
        participant?.phoneNumber ||
        participant?.phoneNumberJid

      if (!participantJid) continue

      const resolvedParticipant = await resolveJid(
        participantJid,
        conn
      )

      if (!resolvedParticipant) continue

      if (
        areJidsSameUser(resolvedParticipant, mainJid) ||
        areJidsSameUser(resolvedParticipant, mainOriginalJid)
      ) {
        isMainBotPresent = true
        break
      }
    }

    if (!isMainBotPresent) return

    chat.__antiBot2Leaving = true

    await conn.sendMessage(m.chat, {
      text: '✦ Bot principal detectado.\nMe retiro para evitar spam.'
    }).catch(() => {})

    setTimeout(async () => {
      try {
        await conn.groupLeave(m.chat)
      } catch {} finally {
        if (chat) {
          chat.__antiBot2Leaving = false
        }
      }
    }, 3000)

  } catch (err) {
    console.error('antiBot2 error:', err)

    const chat = global?.db?.data?.chats?.[m.chat]

    if (chat) {
      chat.__antiBot2Leaving = false
    }
  }
}