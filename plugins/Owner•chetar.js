const handler = async (m, { conn }) => {
    const user = global.db.data.users[m.sender]
    user.monedas = Number.MAX_SAFE_INTEGER
    user.level = Number.MAX_SAFE_INTEGER
    user.exp = Number.MAX_SAFE_INTEGER
    user.health = Number.MAX_SAFE_INTEGER
    user.mp = Number.MAX_SAFE_INTEGER
    user.atq = Number.MAX_SAFE_INTEGER
    user.def = Number.MAX_SAFE_INTEGER
    user.joincount = Number.MAX_SAFE_INTEGER
    await conn.sendMessage(m.chat, {
        text: `🚩 *@${m.sender.split('@')[0]} Ahora tienes recursos y stats ilimitados*`,
        mentions: [m.sender]
    }, { quoted: m })
}
handler.help = ['cheat']
handler.tags = ['owner']
handler.command = ['ilimitado', 'infiniy', 'chetar']
handler.rowner = true
handler.fail = null
export default handler