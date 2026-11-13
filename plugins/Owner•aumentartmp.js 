import { existsSync, mkdirSync, statSync } from 'fs'
import { join } from 'path'

let handler = async (m, { conn, command }) => {
  try {
    const tmp = global.tmpDir || join(process.cwd(), 'tmp')

    if (!existsSync(tmp)) {
      mkdirSync(tmp, { recursive: true })
    }

    const stats = statSync(tmp)

    return m.reply(
      `✓ TMP configurado correctamente\n\n` +
      `📂 Ruta: ${tmp}\n` +
      `💾 Almacenamiento: disco principal\n` +
      `📦 Límite: según espacio disponible`
    )
  } catch (e) {
    return m.reply(
      `✗ No se pudo configurar TMP\n\n${e?.message || e}`
    )
  }
}

handler.help = ['increasetmp']
handler.tags = ['owner']
handler.command = ['increasetmp', 'aumentartmp']
handler.rowner = true

export default handler