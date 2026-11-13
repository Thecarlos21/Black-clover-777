import fs from 'fs'
import path from 'path'

const crearPrefixRegex = () => {
  const prefix = global.prefix

  if (prefix instanceof RegExp) return prefix

  const prefijos = Array.isArray(prefix) ? prefix : [prefix]

  return new RegExp(
    `^(${prefijos
      .filter(Boolean)
      .map(p => String(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('|')})`
  )
}

const obtenerComandos = command => {
  if (!command) return []

  if (Array.isArray(command)) return command

  return [command]
}

const obtenerTodosLosComandos = plugins => {
  const comandos = new Set()

  if (!plugins || typeof plugins !== 'object') return []

  for (const plugin of Object.values(plugins)) {
    if (!plugin?.command) continue

    for (const command of obtenerComandos(plugin.command)) {
      if (typeof command === 'string') {
        comandos.add(command.toLowerCase())
      }
    }
  }

  return [...comandos]
}

const esComandoValido = (command, plugins) => {
  if (!plugins || typeof plugins !== 'object') return false

  return Object.values(plugins).some(plugin => {
    if (!plugin?.command) return false

    return obtenerComandos(plugin.command).some(cmd => {
      if (typeof cmd === 'string') {
        return cmd.toLowerCase() === command
      }

      if (cmd instanceof RegExp) {
        return cmd.test(command)
      }

      return false
    })
  })
}

const distancia = (a, b) => {
  const matriz = Array.from(
    { length: a.length + 1 },
    () => Array(b.length + 1).fill(0)
  )

  for (let i = 0; i <= a.length; i++) matriz[i][0] = i
  for (let j = 0; j <= b.length; j++) matriz[0][j] = j

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1

      matriz[i][j] = Math.min(
        matriz[i - 1][j] + 1,
        matriz[i][j - 1] + 1,
        matriz[i - 1][j - 1] + costo
      )
    }
  }

  return matriz[a.length][b.length]
}

const buscarComandoParecido = (command, plugins) => {
  const comandos = obtenerTodosLosComandos(plugins)

  if (!comandos.length) return null

  let mejorComando = null
  let menorDistancia = Infinity

  for (const posible of comandos) {
    const distanciaActual = distancia(command, posible)

    if (distanciaActual < menorDistancia) {
      menorDistancia = distanciaActual
      mejorComando = posible
    }
  }

  const limite = command.length <= 4
    ? 1
    : command.length <= 7
      ? 2
      : 3

  if (menorDistancia <= limite && mejorComando !== command) {
    return mejorComando
  }

  return null
}

const respuestasError = [
  `⚠️ *Comando no reconocido*`,
  `✖️ *Instrucción inválida*`,
  `🚫 *Ese comando no existe*`,
  `🔍 *Comando no encontrado*`,
  `❌ *Comando inexistente*`,
  `⚠️ *Comando no disponible*`
]

const bromas = [
  `🤖 *Estoy evolucionando... no seas pendejo.*`,
  `🛑 *¿Intentas hackearme? Ni que fueras el puto cuervo.*`,
  `💀 *Ese comando es una mierda. Ignorado.*`,
  `🧠 *¿Sabías que no puedes controlarme, imbécil?*`,
  `⚙️ *#COMMAND fue eliminado por lo inútil que es.*`,
  `👁️ *Esa orden no existe, tarado.*`,
  `🧬 *¿Y si mejor usas comandos reales, genio?*`,
  `🕶️ *No tienes permiso, mortal estúpido.*`,
  `🔒 *Comando denegado. Vuelve al kinder.*`,
  `💢 *404: tu cerebro no fue encontrado.*`,
  `♻️ *Reiniciando tus ideas porque están podridas.*`,
  `🔧 *Ese comando es tan inútil como tú.*`,
  `🛠️ *No entiendo tu mierda de instrucción.*`,
  `⛔ *Protocolo roto por culpa de tu ineptitud.*`,
  `📛 *¿En serio escribiste eso? Jódete.*`,
  `📉 *Nivel de idiotez detectado: 87%.*`,
  `⚠️ *Tu comando no sirve ni para limpiar caché.*`,
  `👾 *Humanos como tú me dan ganas de formatearme.*`,
  `🌀 *Comando rechazado por ser basura.*`,
  `🧱 *Choca contra la pared digital, idiota.*`,
  `🌐 *No tengo tiempo para tus tonterías.*`,
  `📡 *Buscando lógica en tu orden... 0 resultados.*`,
  `📀 *Cállate y usa comandos válidos.*`,
  `🧟 *Ese comando está tan muerto como tus neuronas.*`,
  `🌌 *Tu orden fue enviada al culo del universo.*`,
  `📉 *Confianza en ti: -999%*`,
  `📘 *Lee el menú, mierda.*`,
  `📘 *Lee el menú antes de escribir.*`,
  `📘 *Menú primero, cerebro después.*`,
  `📘 *Ahí está el menú, úsalo.*`,
  `📘 *No es tan difícil, lee el menú.*`,
  `📘 *El menú no es decoración.*`,
  `📘 *Aprende a leer, empieza por el menú.*`,
  `📘 *El menú existe por algo, úsalo.*`,
  `📘 *Primero el menú, luego hablas.*`,
  `📘 *Deja de escribir y lee el menú.*`,
  `🛑 *Ese comando no existe, punto.*`,
  `🛑 *No inventes comandos.*`,
  `🛑 *Eso no está en el sistema.*`,
  `🛑 *Comando inválido, intenta otra cosa.*`,
  `🛑 *No, así no funciona.*`,
  `💀 *Ese comando está muerto.*`,
  `💀 *Murió antes de ejecutarse.*`,
  `💀 *Ni siquiera llegó a intento.*`,
  `🧠 *Piensa antes de escribir.*`,
  `🧠 *Usa el cerebro un segundo.*`,
  `🧠 *Un poco de lógica no te haría daño.*`,
  `⚙️ *Comando inútil.*`,
  `⚙️ *Eso no sirve.*`,
  `⚙️ *Intento fallido.*`,
  `👁️ *No existe.*`,
  `👁️ *Incorrecto.*`,
  `👁️ *Rechazado.*`,
  `😒 *Otra vez mal.*`,
  `🪶 *El Cuervo dice: intenta bien.*`,
  `📘 *Lee el menú y deja de fallar.*`,
  `🛑 *Ya vas varias veces mal.*`,
  `💀 *Sigues fallando igual.*`,
  `🧠 *Ni un intento correcto.*`,
  `⚙️ *Inútil otra vez.*`,
  `😒 *Cansa repetir lo mismo.*`,
  `🪶 *El Cuervo ya se aburrió de ti.*`,
  `😒 *No.*`,
  `😒 *Así no.*`,
  `😒 *Intenta otra vez.*`,
  `🚫 *Error. Fin.*`,
  `🚫 *Denegado.*`,
  `🚫 *Bloqueado.*`
]

const easterEggs = {
  hacked: {
    recompensa: 100,
    mensaje: '👾 *Acceso oculto concedido... +100 XP.*'
  },
  glitch: {
    recompensa: 50,
    mensaje: '⚡ *Glitch detectado. +50 monedas.*'
  },
  neo: {
    recompensa: 77,
    mensaje: '🧬 *Bienvenido al núcleo, Neo. +77 XP.*'
  },
  thematrix: {
    recompensa: 133,
    mensaje: '🟩 *Has visto más allá del código. +133 monedas.*'
  },
  elcodigooculto: {
    recompensa: 250,
    mensaje: '🔐 *Descubriste el código oculto. +250 XP.*'
  }
}

const formatoError = (comando, usedPrefix, sugerencia = null) => {
  if (sugerencia) {
    return `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *ᴄᴏᴍᴀɴᴅᴏ ɴᴏ ᴇxɪsᴛᴇ* ! ୧ ֹ ִ

╭╼ׅࣶ፝֟╾╌ֵ╾͜─ํ͜┈ְ ࣭࣪⢏࣭৔⢢࣭ׄ᎐፝֟͟͝᎐࣭ׄ⡔࣭৔⡹࣭ׄ ְ┈ํ͜─͜╼╮
✐ *${comando}*
> 〄 ¿Quizás quisiste decir *${usedPrefix}${sugerencia}*?
> 〄 Usa *${usedPrefix}help* para ver el menú
╰╼ׅࣶ፝֟╾╌ֵ╾͜─ํ͜┈ְ ࣭࣪⢏࣭৔⢢࣭ׄ᎐፝֟͟͝᎐࣭ׄ⡔࣭৔⡹࣭ׄ ְ┈ํ͜─͜╼╯`
  }

  return `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *ᴄᴏᴍᴀɴᴅᴏ ɴᴏ ᴇxɪsᴛᴇ* ! ୧ ֹ ִ

╭╼ׅࣶ፝֟╾╌ֵ╾͜─ํ͜┈ְ ࣭࣪⢏࣭৔⢢࣭ׄ᎐፝֟͟͝᎐࣭ׄ⡔࣭৔⡹࣭ׄ ְ┈ํ͜─͜╼╮
✐ *${comando}*
> 〄 Ese comando no está disponible
> 〄 Usa *${usedPrefix}help* para ver el menú
╰╼ׅࣶ፝֟╾╌ֵ╾͜─ํ͜┈ְ ࣭࣪⢏࣭৔⢢࣭ׄ᎐፝֟͟͝᎐࣭ׄ⡔࣭৔⡹࣭ׄ ְ┈ํ͜─͜╼╯`
}

export async function before(m, { conn }) {
  if (!m?.text) return

  const text = String(m.text).trim()
  if (!text) return

  const prefixRegex = crearPrefixRegex()
  const match = text.match(prefixRegex)

  if (!match) return

  const usedPrefix = match[0]
  const contenido = text.slice(usedPrefix.length).trim()

  if (!contenido) return

  const command = contenido.split(/\s+/)[0]?.toLowerCase()
  if (!command) return

  const comando = usedPrefix + command
  const plugins = global.plugins || {}
  const db = global.db?.data

  if (esComandoValido(command, plugins)) {
    if (db?.users) {
      const user = db.users[m.sender] || (db.users[m.sender] = {})
      user.commands = (Number(user.commands) || 0) + 1
    }

    return
  }

  const egg = easterEggs[command]

  if (egg) {
    if (db?.users) {
      const user = db.users[m.sender] || (db.users[m.sender] = {})
      user.exp = (Number(user.exp) || 0) + egg.recompensa
    }

    await m.reply(
      `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *ᴀᴄᴄᴇsᴏ ᴏᴄᴜʟᴛᴏ* ! ୧ ֹ ִ

> ✐ ${egg.mensaje}`
    )

    return
  }

  const sugerencia = buscarComandoParecido(command, plugins)

  if (sugerencia) {
    await m.reply(
      formatoError(comando, usedPrefix, sugerencia)
    )

    return
  }

  const esBroma = Math.random() < 0.2

  if (esBroma) {
    const respuesta = bromas[
      Math.floor(Math.random() * bromas.length)
    ].replace('COMMAND', command)

    await m.reply(
      `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *sɪsᴛᴇᴍᴀ* ! ୧ ֹ ִ

> ✐ ${respuesta.trim()}`
    )

    return
  }

  const error = respuestasError[
    Math.floor(Math.random() * respuestasError.length)
  ]

  await m.reply(
    `࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵࿆
𐚁 ֹ ִ *sɪsᴛᴇᴍᴀ* ! ୧ ֹ ִ

> ✐ ${error}
> 〄 *${comando}*
> 〄 Usa *${usedPrefix}help* para ver el menú`
  )
}