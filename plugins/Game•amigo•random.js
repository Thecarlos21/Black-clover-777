const handler = async (m, { groupMetadata }) => {
  const participants = groupMetadata?.participants || []

  if (participants.length < 2) {
    return m.reply('❌ Se necesitan al menos 2 participantes para hacer una amistad.')
  }

  const cleanNumber = jid => {
    const value = jid?.phoneNumber || jid?.jid || jid?.id || jid?.participantPn || jid?.participantAlt || jid?.participant
    return String(value || '')
      .replace(/@.*$/, '')
      .replace(/\D/g, '')
  }

  const getMention = participant => `@${cleanNumber(participant)}`

  const first = participants[Math.floor(Math.random() * participants.length)]

  let second
  do {
    second = participants[Math.floor(Math.random() * participants.length)]
  } while (second === first)

  const firstJid = first.phoneNumber || first.jid || first.id || first.participantPn || first.participantAlt || first.participant
  const secondJid = second.phoneNumber || second.jid || second.id || second.participantPn || second.participantAlt || second.participant

  const text = `${emoji} Vamos a hacer algunas amistades.

*Oye ${getMention(first)}, háblale al privado a ${getMention(second)} para que jueguen y hagan una nueva amistad 🙆*

*Las mejores amistades empiezan con un juego 😉.*`

  await m.reply(text, null, {
    mentions: [firstJid, secondJid]
  })
}

handler.help = ['amistad']
handler.tags = ['fun']
handler.command = ['amigorandom', 'amistad']
handler.group = true
handler.register = true

export default handler