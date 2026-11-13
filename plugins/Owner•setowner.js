let handler = async (m, { conn, text }) => {
  if (!text) return m.reply('Ingresa el número a agregar como owner. Ej: 5215544876071')
  const nums = text.split(/\s+/).map(n => n.replace(/\D/g, '')).filter(Boolean)
  if (!global.owner) global.owner = []
  for (const num of nums) {
    const clean = String(num)
    const exists = global.owner.some(o => String(o[0]).replace(/\D/g,'') === clean)
    if (!exists) global.owner.push([clean])
  }
  try { await global.db?.write?.() } catch {}
  try { global.db?.save?.() } catch {}
  return m.reply(`Owner actualizado. Total owners: ${global.owner.length}`)
}
handler.help = ['setowner <number>']
handler.tags = ['owner']
handler.command = ['setowner','addowner']
handler.rowner = true
export default handler