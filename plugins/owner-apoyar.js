let handler = async (m, { conn }) => {
let texto = `
࿆ㅤ໋︵ּㅤׄ⏜ּㅤ֯✿ִㅤ⃞ׄ𑁍⃞ㅤִ❀֯ㅤּ⏜ׄㅤּ︵ ࿆
𐚁 ֹ ִ *ᴀᴘᴏʏᴀ ᴀʟ ᴄʀᴇᴀᴅᴏʀ*
ㅤㅤㅤㅤㅤㅤㅤㅤㅤㅤ
Si te gusta Black Clover y quieres que el proyecto siga creciendo, puedes apoyar al creador con una pequeña donación.

No importa si es 1 peso o 1 dólar, cada aporte ayuda a mejorar el bot, agregar nuevas funciones y seguir pagando el servidor para mantenerlo activo.

╭ׄ─ׅ─ׄ─ׅ─ׄ─ׅ─ׄ─ׅ─ׄ─ׅ─ׄ╮
│ ཻུ۪۪⸙ *ᴅᴀᴛᴏs ᴅᴇ ᴀᴘᴏʏᴏ*
│
│ 💳 *Tarjeta:*
│ 5101258565138733
│
│ ཻུ۪۪⸙ *¿ɴᴇᴄᴇsɪᴛᴀs ᴀʏᴜᴅᴀ?*
│
│ Si tienes dudas, necesitas ayuda
│ o quieres contactar al creador,
│ escribe el comando *owner* para
│ ver su información de contacto.
│
│ Gracias por apoyar este proyecto
│ y ayudarlo a seguir creciendo.
╰ׄ─ׅ─ׄ─ׅ─ׄ─ׅ─ׄ─ׅ─ׄ─ׅ─ׄ╯
ㅤ
> 𝕭𝖑𝖆𝖈𝖐 𝕮𝖑𝖔𝖛𝖊𝖗 | 𝕳𝖆𝖐 v777 ☘️
`.trim()

await conn.reply(m.chat, texto, m)
}

handler.help = ['apoyar']
handler.tags = ['info']
handler.command = ['apoyar', 'donar', 'donacion']

export default handler