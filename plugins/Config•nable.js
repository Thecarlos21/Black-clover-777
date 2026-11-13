const handler = async (m, { conn, usedPrefix, command, args, isOwner, isAdmin, isROwner }) => {
  var fkontak = {
    key: { participants: '0@s.whatsapp.net', remoteJid: 'status@broadcast', fromMe: false, id: 'Halo' },
    message: { contactMessage: { vcard: 'BEGIN:VCARD\nVERSION:3.0\nN:Sy;Bot;;;\nFN:y\nitem1.TEL;waid=' + m.sender.split('@')[0] + ':' + m.sender.split('@')[0] + '\nitem1.X-ABLabel:Ponsel\nEND:VCARD' } },
    participant: '0@s.whatsapp.net'
  }

  var miniopcion = '⚔️ *OPCIONES PARA GRUPOS*\n\n' +
  usedPrefix + 'enable welcome\n' +
  usedPrefix + 'enable autoresponder\n' +
  usedPrefix + 'enable autoaceptar\n' +
  usedPrefix + 'enable detect\n' +
  usedPrefix + 'enable antidelete\n' +
  usedPrefix + 'enable antilink\n' +
  usedPrefix + 'enable antilink2\n' +
  usedPrefix + 'enable nsfw\n' +
  usedPrefix + 'enable autolevelup\n' +
  usedPrefix + 'enable autosticker\n' +
  usedPrefix + 'enable reaction\n' +
  usedPrefix + 'enable antitoxic\n' +
  usedPrefix + 'enable audios\n' +
  usedPrefix + 'enable modoadmin\n' +
  usedPrefix + 'enable antifake\n' +
  usedPrefix + 'enable antibot\n' +
  usedPrefix + 'enable antisubots\n' +
  usedPrefix + 'enable serbot\n\n' +
  '🥷 *OPCIONES PARA MI PROPIETARIO*\n\n' +
  usedPrefix + 'enable public\n' +
  usedPrefix + 'enable status\n' +
  usedPrefix + 'enable restrict\n' +
  usedPrefix + 'enable autoread\n' +
  usedPrefix + 'enable antispam\n' +
  usedPrefix + 'enable antiprivado'

  // FIX OWNER LID - doble check
  const normalize = j => j?.split('@')[0]?.replace(/\D/g,'') || ''
  const allIds = [m.sender, m.key?.participantAlt, m.key?.senderPn, m.key?.participant, m.key?.remoteJidAlt].filter(Boolean)
  const ownerNums = global.owner.map(([n]) => normalize(n))
  const senderNums = allIds.map(j => normalize(j))
  const isRealROwner = isROwner || ownerNums.some(n => senderNums.includes(n) || allIds.some(id => id.includes(n))) || global.isOwner(m.sender) || global.isOwner(m.key?.participantAlt || '')

  var realROwner = isRealROwner === true || isRealROwner
  var realOwner = isOwner === true || isROwner === true || isRealROwner
  var isEnable = /true|enable|(turn)?on|1/i.test(command)
  if (!global.db.data.chats[m.chat]) global.db.data.chats[m.chat] = {}
  if (!global.db.data.settings[conn.user.jid]) global.db.data.settings[conn.user.jid] = {}
  var chat = global.db.data.chats[m.chat]
  var bot = global.db.data.settings[conn.user.jid]
  var type = (args[0] || '').toLowerCase()
  var isAll = false

  var fail = function(t) { global.dfail(t, m, conn); throw false }
  var needGroupAdmin = function() {
    if (!m.isGroup) fail('group')
    if (!isAdmin &&!realOwner) fail('admin')
  }
  var needOwner = function() { if (!realOwner) fail('owner') }
  var needROwner = function() { if (!realROwner) fail('rowner') }

  switch (type) {
    case 'welcome': case 'bienvenida':
      needGroupAdmin(); chat.welcome = isEnable; break
    case 'autoaceptar': case 'aceptarnuevos':
      needGroupAdmin(); chat.autoAceptar = isEnable; break
    case 'autorechazar': case 'rechazarnuevos':
      needGroupAdmin(); chat.autoRechazar = isEnable; break
    case 'detect': case 'avisos':
      needGroupAdmin(); chat.detect = isEnable; break
    case 'antibot':
      needGroupAdmin(); chat.antiBot = isEnable; break
    case 'antisubots': case 'antisub': case 'antisubot': case 'antibot2':
      needGroupAdmin(); chat.antiBot2 = isEnable; break
    case 'antidelete': case 'antieliminar': case 'delete':
      needGroupAdmin(); chat.antidelete = isEnable; break
    case 'public': case 'publico':
      isAll = true; needROwner(); global.opts['self'] =!isEnable; break
    case 'antilink': case 'antienlace':
      needGroupAdmin(); chat.antiLink = isEnable; break
    case 'antilink2': case 'antienlace2':
      needGroupAdmin(); chat.antiLink2 = isEnable; break
    case 'status': case 'autobiografia': case 'bio': case 'biografia':
      isAll = true; needROwner(); bot.autobio = isEnable; break
    case 'frases': case 'autofrases':
      isAll = true; needROwner(); bot.frases = isEnable; break
    case 'autoresponder': case 'autorespond':
      needGroupAdmin(); chat.autoresponder = isEnable; break
    case 'nsfw': case 'nsfwhot': case 'nsfwhorny':
      needGroupAdmin(); chat.nsfw = isEnable; break
    case 'autolevelup': case 'autonivel': case 'nivelautomatico':
      needGroupAdmin(); chat.autolevelup = isEnable; break
    case 'autosticker':
      needGroupAdmin(); chat.autosticker = isEnable; break
    case 'reaction': case 'reaccion': case 'emojis': case 'reacciones':
      needGroupAdmin(); chat.reaction = isEnable; break
    case 'antitoxic': case 'antitoxicos': case 'antimalos':
      needGroupAdmin(); chat.antitoxic = isEnable; break
    case 'audios':
      needGroupAdmin(); chat.audios = isEnable; break
    case 'modoadmin': case 'soloadmin': case 'modeadmin':
      needGroupAdmin(); chat.modoadmin = isEnable; break
    case 'antifake': case 'antiextranjeros': case 'antiinternacional':
      needGroupAdmin(); chat.antifake = isEnable; break
    case 'serbot': case 'jadibot':
      needGroupAdmin(); bot.jadibotmd = isEnable; break
    case 'restrict':
      isAll = true; needOwner(); bot.restrict = isEnable; break
    case 'autoread':
      isAll = true; needROwner(); bot.autoread2 = isEnable; global.opts['autoread'] = isEnable; break
    case 'antiprivado':
      isAll = true; needROwner(); bot.antiPrivate = isEnable; break
    case 'antispam':
      isAll = true; needOwner(); bot.antiSpam = isEnable; break
    default:
      return conn.reply(m.chat, miniopcion, fkontak)
  }

  return conn.reply(m.chat, '⚔️ *La funcion "' + type + '" ha sido ' + (isEnable? 'activada' : 'desactivada') + ' ' + (isAll? 'en todo el bot' : 'en este chat') + '.*', fkontak)
}

handler.help = ['enable', 'disable']
handler.tags = ['owner', 'group']
handler.command = ['enable', 'disable', 'on', 'off', '1', '0']
export default handler