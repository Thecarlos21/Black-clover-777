import Database from 'better-sqlite3'
import { readFileSync, existsSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const args    = process.argv.slice(2)
const getArg  = (flag) => { const i = args.indexOf(flag); return i !== -1 ? args[i + 1] : null }

const JSON_PATH = getArg('--json') || join(__dirname, 'src/database/database.json')
const DB_PATH   = getArg('--db')   || join(__dirname, 'src/database/database.db')

const COLLECTIONS = ['users', 'chats', 'stats', 'msgs', 'sticker', 'settings', 'antidelete']

if (!existsSync(JSON_PATH)) {
  console.error(`❌  No se encontró el JSON en: ${JSON_PATH}`)
  process.exit(1)
}

const dir = dirname(DB_PATH)
if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('synchronous = NORMAL')

for (const col of COLLECTIONS) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${col} (
      id    TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `)
}

let jsonData
try {
  jsonData = JSON.parse(readFileSync(JSON_PATH, 'utf8'))
} catch (e) {
  console.error('❌  Error leyendo el JSON:', e.message)
  process.exit(1)
}

let totalRows = 0

for (const col of COLLECTIONS) {
  const collection = jsonData[col]
  if (!collection || typeof collection !== 'object') {
    console.log(`⚠️   ${col}: vacío o no existe, se omite`)
    continue
  }

  const entries = Object.entries(collection)
  if (entries.length === 0) {
    console.log(`⚠️   ${col}: 0 registros, se omite`)
    continue
  }

  const upsert = db.prepare(`
    INSERT INTO ${col} (id, value)
    VALUES (@id, @value)
    ON CONFLICT(id) DO UPDATE SET value = excluded.value
  `)

  const insertMany = db.transaction((items) => {
    for (const [id, value] of items) {
      upsert.run({ id, value: JSON.stringify(value) })
    }
  })

  insertMany(entries)
  totalRows += entries.length
  console.log(` ${col}: ${entries.length} registros migrados`)
}

db.close()

console.log(`\nMigración completa — ${totalRows} registros en total`)
console.log(`Base de datos SQLite guardada en: ${DB_PATH}`)
console.log(`\n Siguiente paso: elimina la línea lowdb/JSONFile de start.js`)
console.log(`    y usa el nuevo lib/database.js (ver instrucciones en README)`)
