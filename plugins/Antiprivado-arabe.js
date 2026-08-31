const codigosArabes = ['212','971','20','966','964','963','973','968','974']
const regexArabe = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/
const regexComando = /^[\/!#.]/
if (!global.advertenciasArabes) global.advertenciasArabes = {}

export async function before(m, { conn, isOwner, isROwner }) {
  try {
    if (!m) return true
    if (!m.message) return true
    if (!m.sender) return true
    if (typeof m.text!== 'string') return true
    if (m.isBaileys) return true
    if (m.isGroup) return true
    if (isOwner) return true
    if (isROwner) return true

    var numero = m.sender
    var texto = m.text.trim()
    if (!texto) return true
    if (regexComando.test(texto)) return true

    var limpio = numero.replace(/\D/g, '')
    var esArabe = false
    if (regexArabe.test(texto)) esArabe = true
    if (!esArabe) {
      for (var i = 0; i < codigosArabes.length; i++) {
        if (limpio.indexOf(codigosArabes[i]) === 0) {
          esArabe = true
          break
        }
      }
    }
    if (!esArabe) return true

    if (!global.advertenciasArabes[numero]) global.advertenciasArabes[numero] = 0
    global.advertenciasArabes[numero] = global.advertenciasArabes[numero] + 1
    var count = global.advertenciasArabes[numero]

    if (count >= 3) {
      await m.reply('╭━〔 ⛔ BLOQUEO ACTIVADO 〕━⬣\n┃ 👤 Usuario: ' + numero + '\n┃ 🚫 Acceso: Denegado\n┃ ⚠️ Motivo: Contenido no permitido\n┃ 🔢 Intentos: 3/3\n┃ 🔒 Estado: bloqueado por seguridad\n╰━━━━━━━━━━━━━━━━⬣')
      await conn.updateBlockStatus(numero, 'block').catch(function() {})
      delete global.advertenciasArabes[numero]
      return false
    }

    await m.reply('╭━〔 ⚠️ ADVERTENCIA 〕━⬣\n┃ 👤 Usuario: ' + numero + '\n┃ 🚫 Contenido detectado\n┃ 🔢 Intentos: ' + count + '/3\n┃ 💡 Usa solo comandos permitidos\n┃ ⚠️ Al llegar a 3 seras bloqueado\n╰━━━━━━━━━━━━━━━━⬣')
    return false

  } catch (e) {
    console.error('error anti-arabe:', e)
    return true
  }
}