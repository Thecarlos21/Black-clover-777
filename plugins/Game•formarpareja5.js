let R = Math.random
let Fl = Math.floor
let handler = async (m, { groupMetadata, getUserDisplay }) => {
    let ps = groupMetadata.participants.map(v => v.id)

    if (ps.length < 10) return m.reply('❌ Se necesitan al menos 10 participantes.')

    let usados = []
    let a, b, c, d, e, f, g, h, i, j

    do a = ps[Fl(R() * ps.length)]
    while (usados.includes(a))
    usados.push(a)

    do b = ps[Fl(R() * ps.length)]
    while (usados.includes(b))
    usados.push(b)

    do c = ps[Fl(R() * ps.length)]
    while (usados.includes(c))
    usados.push(c)

    do d = ps[Fl(R() * ps.length)]
    while (usados.includes(d))
    usados.push(d)

    do e = ps[Fl(R() * ps.length)]
    while (usados.includes(e))
    usados.push(e)

    do f = ps[Fl(R() * ps.length)]
    while (usados.includes(f))
    usados.push(f)

    do g = ps[Fl(R() * ps.length)]
    while (usados.includes(g))
    usados.push(g)

    do h = ps[Fl(R() * ps.length)]
    while (usados.includes(h))
    usados.push(h)

    do i = ps[Fl(R() * ps.length)]
    while (usados.includes(i))
    usados.push(i)

    do j = ps[Fl(R() * ps.length)]
    while (usados.includes(j))
    usados.push(j)

    let usuarios = await Promise.all(
        [a, b, c, d, e, f, g, h, i, j].map(v => getUserDisplay(v))
    )

    let toM = (n, v) => '@' + (usuarios[n]?.number || v.split('@')[0])
    let mentions = usuarios.map((v, n) => v?.jid || [a, b, c, d, e, f, g, h, i, j][n])

    m.reply(
        `*_😍Las 5 mejores parejas del grupo😍_*
        
*_1.- ${toM(0, a)} y ${toM(1, b)}_*
- Esta pareja esta destinada a estar junta 💙

*_2.- ${toM(2, c)} y ${toM(3, d)}_*
- Esta pareja son dos pequeños tortolitos enamorados ✨

*_3.- ${toM(4, e)} y ${toM(5, f)}_*
- Ufff y que decir de esta pareja, ya hasta familia deberian tener 🤱🧑‍🍼

*_4.- ${toM(6, g)} y ${toM(7, h)}_*
- Estos ya se casaron en secreto 💍

*_5.- ${toM(8, i)} y ${toM(9, j)}_*
- Esta pareja se esta de luna de miel ✨🥵😍❤️*`,
        null,
        {
            mentions
        }
    )
}

handler.help = ['formarpareja5']
handler.tags = ['main', 'fun']
handler.command = ['formarpareja5']
handler.register = true
handler.group = true

export default handler