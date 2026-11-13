// Código creado x The Carlos 👑
// No olvides dejar créditos

import fs from 'fs'
import path from 'path'

const menuDir = './media/menu'

if (!fs.existsSync(menuDir)) {
  fs.mkdirSync(menuDir, { recursive: true })
}

function normalizeJid(jid = '') {
  return jid
    .split(':')[0]
    .replace(/@lid|@s\.whatsapp\.net|@c\.us/g, '')
}

async function resolveJid(jid, conn) {
  if (!jid || typeof jid !== 'string') return ''

  if (!jid.endsWith('@lid')) {
    return normalizeJid(jid)
  }

  try {
    const mapping =
      conn?.signalRepository?.lidMapping

    if (mapping?.getPNForLID) {
      const pn =
        await mapping.getPNForLID(jid)

      if (pn) {
        return normalizeJid(pn)
      }
    }
  } catch {}

  return normalizeJid(jid)
}

function getMenuMediaFile(botJid) {
  const botId =
    botJid.replace(/[:@.]/g, '_')

  return path.join(
    menuDir,
    `menuMedia_${botId}.json`
  )
}

function getBotMediaPath(botJid, ext) {
  const botId =
    botJid.replace(/[:@.]/g, '_')

  return path.join(
    menuDir,
    `${botId}${ext}`
  )
}

function loadMenuMedia(botJid) {
  const file =
    getMenuMediaFile(botJid)

  if (!fs.existsSync(file))
    return {}

  try {
    return JSON.parse(
      fs.readFileSync(
        file,
        'utf8'
      )
    )
  } catch {
    return {}
  }
}

function saveMenuMedia(
  botJid,
  data
) {
  fs.writeFileSync(
    getMenuMediaFile(botJid),
    JSON.stringify(
      data,
      null,
      2
    )
  )
}

function deleteFile(file) {
  try {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file)
    }
  } catch {}
}

const handler = async (
  m,
  {
    conn,
    command,
    usedPrefix,
    text
  }
) => {

  const sender =
    await resolveJid(
      m.sender,
      conn
    )

  const botJid =
    conn?.user?.jid ||
    conn?.user?.id ||
    ''

  const botNumber =
    await resolveJid(
      botJid,
      conn
    )

  const owners =
    Array.isArray(global.owner)
      ? global.owner.map(
          ([number]) =>
            normalizeJid(`${number}`)
        )
      : []

  const isOwner =
    owners.includes(sender)

  const isSubBot =
    sender === botNumber

  if (
    !isSubBot &&
    !isOwner
  ) {
    return m.reply(
      `❌ El comando *${command}* solo puede ser usado por el Sub-Bot o el Owner.`
    )
  }

  let menuMedia =
    loadMenuMedia(botJid)

  try {

    switch (command) {

      case 'setmenuimg': {
        const q =
          m.quoted || m

        const mime =
          (q.msg || q).mimetype || ''

        if (
          !/^(image\/(png|jpe?g)|video\/mp4)$/i.test(
            mime
          )
        ) {
          return m.reply(
            `❌ *Archivo no válido.*\n\n` +
            `Responde a una *imagen JPG/PNG* o a un *video MP4* y usa:\n\n` +
            `> ${usedPrefix}setmenuimg`
          )
        }

        const media =
          await q.download()

        if (!media) {
          return m.reply(
            '❌ No se pudo descargar el archivo.'
          )
        }

        const botId =
          botJid.replace(
            /[:@.]/g,
            '_'
          )

        const imagePath =
          path.join(
            menuDir,
            `${botId}.jpg`
          )

        const videoPath =
          path.join(
            menuDir,
            `${botId}.mp4`
          )

        deleteFile(imagePath)
        deleteFile(videoPath)

        menuMedia =
          menuMedia || {}

        if (
          mime.startsWith('video/')
        ) {

          fs.writeFileSync(
            videoPath,
            media
          )

          menuMedia.video =
            videoPath

          menuMedia.thumbnail =
            null

          menuMedia.type =
            'video'

          delete menuMedia.image

          saveMenuMedia(
            botJid,
            menuMedia
          )

          return m.reply(
            `✅ *Video del menú actualizado.*\n\n` +
            `🎬 Formato: MP4\n` +
            `📂 ${path.basename(videoPath)}`
          )
        }

        fs.writeFileSync(
          imagePath,
          media
        )

        menuMedia.image =
          imagePath

        menuMedia.thumbnail =
          imagePath

        menuMedia.type =
          'image'

        delete menuMedia.video

        saveMenuMedia(
          botJid,
          menuMedia
        )

        return m.reply(
          `✅ *Imagen del menú actualizada.*\n\n` +
          `🖼️ Formato: JPG/PNG\n` +
          `📂 ${path.basename(imagePath)}`
        )
      }

      case 'setmenutitle': {
        if (!text?.trim()) {
          return m.reply(
            `❌ Escribe el nombre del Sub-Bot.\n\n` +
            `Ejemplo:\n` +
            `> ${usedPrefix}setmenutitle Ángel`
          )
        }

        menuMedia =
          menuMedia || {}

        menuMedia.menuTitle =
          text.trim()

        saveMenuMedia(
          botJid,
          menuMedia
        )

        return m.reply(
          `✅ *Nombre del Sub-Bot actualizado.*\n\n` +
          `☘️ SUB BOT DE ${text.trim().toUpperCase()}`
        )
      }

      case 'setmenufont': {
        const fonts = [
          'cyber',
          'gothic',
          'minimal',
          'default'
        ]

        if (!text?.trim()) {
          return m.reply(
            `❌ Escribe una fuente.\n\n` +
            `Disponibles:\n` +
            fonts
              .map(v => `> ${v}`)
              .join('\n') +
            `\n\nEjemplo:\n` +
            `> ${usedPrefix}setmenufont cyber`
          )
        }

        const font =
          text.trim().toLowerCase()

        if (
          !fonts.includes(font)
        ) {
          return m.reply(
            `❌ Fuente no válida.\n\n` +
            `Disponibles:\n` +
            fonts
              .map(v => `> ${v}`)
              .join('\n')
          )
        }

        menuMedia =
          menuMedia || {}

        menuMedia.fontStyle =
          font

        saveMenuMedia(
          botJid,
          menuMedia
        )

        return m.reply(
          `✅ *Fuente actualizada.*\n\n` +
          `✦ ${font}`
        )
      }

      case 'setmenucolor': {
        if (!text?.trim()) {
          return m.reply(
            `❌ Escribe un color HEX.\n\n` +
            `Ejemplo:\n` +
            `> ${usedPrefix}setmenucolor #FF0000`
          )
        }

        const color =
          text.trim()

        if (
          !/^#[0-9A-F]{6}$/i.test(
            color
          )
        ) {
          return m.reply(
            `❌ Color HEX inválido.\n\n` +
            `Ejemplo:\n` +
            `> ${usedPrefix}setmenucolor #FF0000`
          )
        }

        menuMedia =
          menuMedia || {}

        menuMedia.accentColor =
          color.toUpperCase()

        saveMenuMedia(
          botJid,
          menuMedia
        )

        return m.reply(
          `✅ *Color guardado.*\n\n` +
          `🎨 ${color.toUpperCase()}\n\n` +
          `El color se guardó para la personalización, pero no se mostrará en el menú.`
        )
      }

      case 'subpfp':
      case 'subimagen': {
        const q =
          m.quoted || m

        const mime =
          (q.msg || q).mimetype || ''

        if (
          !/^image\/(png|jpe?g)$/i.test(
            mime
          )
        ) {
          return m.reply(
            `❌ Responde a una imagen JPG o PNG.\n\n` +
            `Ejemplo:\n` +
            `1. Envía una imagen.\n` +
            `2. Responde con *${usedPrefix}subpfp*.`
          )
        }

        const media =
          await q.download()

        if (!media) {
          return m.reply(
            '❌ No se pudo descargar la imagen.'
          )
        }

        await conn.updateProfilePicture(
          conn.user.jid,
          media
        )

        return m.reply(
          '✅ *Foto de perfil del Sub-Bot actualizada.*'
        )
      }

      case 'substatus':
      case 'subbio': {
        if (!text?.trim()) {
          return m.reply(
            `❌ Escribe la nueva biografía.\n\n` +
            `Ejemplo:\n` +
            `> ${usedPrefix}subbio Black Clover Bot`
          )
        }

        const bio =
          text.trim()

        if (
          bio.length > 139
        ) {
          return m.reply(
            '❌ La biografía no puede superar los 139 caracteres.'
          )
        }

        await conn.updateProfileStatus(
          bio
        )

        return m.reply(
          `✅ *Biografía actualizada.*\n\n${bio}`
        )
      }

      case 'subusername':
      case 'subuser': {
        if (!text?.trim()) {
          return m.reply(
            `❌ Escribe el nuevo nombre.\n\n` +
            `Ejemplo:\n` +
            `> ${usedPrefix}subuser Ángel`
          )
        }

        const name =
          text.trim()

        if (
          name.length > 25
        ) {
          return m.reply(
            '❌ El nombre no puede superar los 25 caracteres.'
          )
        }

        await conn.updateProfileName(
          name
        )

        return m.reply(
          `✅ *Nombre del Sub-Bot actualizado.*\n\n` +
          `👼 ${name}`
        )
      }

      case 'backupconfig': {
        const configFile =
          getMenuMediaFile(
            botJid
          )

        if (
          !fs.existsSync(
            configFile
          )
        ) {
          return m.reply(
            '❌ No existe ninguna configuración para respaldar.'
          )
        }

        const botId =
          botJid.replace(
            /[:@.]/g,
            '_'
          )

        const backupPath =
          path.join(
            menuDir,
            `backup_${botId}_${Date.now()}.json`
          )

        fs.copyFileSync(
          configFile,
          backupPath
        )

        return m.reply(
          `✅ *Backup creado correctamente.*\n\n` +
          `📂 ${path.basename(backupPath)}`
        )
      }

      case 'resetmenu': {
        const configFile =
          getMenuMediaFile(
            botJid
          )

        const imageFile =
          getBotMediaPath(
            botJid,
            '.jpg'
          )

        const videoFile =
          getBotMediaPath(
            botJid,
            '.mp4'
          )

        deleteFile(configFile)
        deleteFile(imageFile)
        deleteFile(videoFile)

        return m.reply(
          `✅ *Personalización restablecida.*\n\n` +
          `El menú volverá a la configuración predeterminada.`
        )
      }

      case 'personalizar': {
        return m.reply(`
╭━━━〔 ⚙️ *PERSONALIZAR SUB-BOT* 〕
┃
┃ 👑 *PERMISOS*
┃
┃ Owner y Sub-Bot pueden usar
┃ todas las opciones.
┃
┃ 🎨 *MENÚ*
┃
┃ 🖼️ *IMAGEN*
┃ Envía una imagen JPG/PNG
┃ y responde con:
┃
┃ > ${usedPrefix}setmenuimg
┃
┃ 🎬 *VIDEO*
┃ Envía un video MP4
┃ y responde con:
┃
┃ > ${usedPrefix}setmenuimg
┃
┃ 👼 *NOMBRE DEL SUB-BOT*
┃ > ${usedPrefix}setmenutitle Ángel
┃
┃ Resultado:
┃ ☘️ SUB BOT DE ÁNGEL
┃
┃ 🔤 *FUENTE*
┃ > ${usedPrefix}setmenufont cyber
┃
┃ Disponibles:
┃ cyber • gothic • minimal • default
┃
┃ 🎨 *COLOR*
┃ > ${usedPrefix}setmenucolor #FF0000
┃
┃ El color se guarda pero no
┃ aparece escrito en el menú.
┃
┃ 👤 *FOTO DE PERFIL*
┃ Responde a una imagen:
┃ > ${usedPrefix}subpfp
┃
┃ 📝 *BIOGRAFÍA*
┃ > ${usedPrefix}subbio Mi Sub-Bot
┃
┃ 👑 *NOMBRE DE WHATSAPP*
┃ > ${usedPrefix}subuser Ángel
┃
┃ 💾 *BACKUP*
┃ > ${usedPrefix}backupconfig
┃
┃ ♻️ *RESTAURAR*
┃ > ${usedPrefix}resetmenu
┃
╰━━━━━━━━━━━━━━╯

☘️ *Personaliza tu Sub-Bot a tu gusto.*
`.trim())
      }
    }

  } catch (e) {
    console.error(
      '❌ Error en personalización:',
      e
    )

    return m.reply(
      `⚠️ *Ocurrió un error.*\n\n` +
      `> ${e.message}`
    )
  }
}

handler.help = [
  'personalizar',
  'setmenuimg',
  'setmenutitle',
  'setmenufont',
  'setmenucolor',
  'subpfp',
  'subimagen',
  'substatus',
  'subbio',
  'subusername',
  'subuser',
  'backupconfig',
  'resetmenu'
]

handler.tags = [
  'subbot'
]

handler.command = [
  'personalizar',
  'setmenuimg',
  'setmenutitle',
  'setmenufont',
  'setmenucolor',
  'subpfp',
  'subimagen',
  'substatus',
  'subbio',
  'subusername',
  'subuser',
  'backupconfig',
  'resetmenu'
]

export default handler