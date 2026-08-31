import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync, existsSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))

const COLLECTIONS = ['users', 'chats', 'stats', 'msgs', 'sticker', 'settings', 'antidelete']

const DEFAULTS = {
  users:       {},
  chats:       {},
  stats:       {},
  msgs:        {},
  sticker:     {},
  settings:    {},
  antidelete:  {}
}

class SQLiteDB {
  constructor(dbPath = join(__dirname, '../src/database/database.db')) {
    const dir = dirname(dbPath)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })

    this._db = new Database(dbPath)
    this._db.pragma('journal_mode = WAL')
    this._db.pragma('synchronous = NORMAL')

    this._initTables()

    this.data = null
    this.READ  = false
  }

  _initTables() {
    for (const col of COLLECTIONS) {
      this._db.exec(`
        CREATE TABLE IF NOT EXISTS ${col} (
          id    TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `)
    }
  }

  _loadCollection(col) {
    const rows = this._db.prepare(`SELECT id, value FROM ${col}`).all()
    const obj  = {}
    for (const row of rows) {
      try { obj[row.id] = JSON.parse(row.value) }
      catch { obj[row.id] = row.value }
    }
    return obj
  }

  _saveCollection(col, obj) {
    if (!obj || typeof obj !== 'object') return

    const upsert = this._db.prepare(`
      INSERT INTO ${col} (id, value)
      VALUES (@id, @value)
      ON CONFLICT(id) DO UPDATE SET value = excluded.value
    `)
    const remove = this._db.prepare(`DELETE FROM ${col} WHERE id = @id`)

    const existingIds = new Set(
      this._db.prepare(`SELECT id FROM ${col}`).all().map(r => r.id)
    )
    const newIds = new Set(Object.keys(obj))

    const run = this._db.transaction(() => {
      for (const [id, value] of Object.entries(obj)) {
        upsert.run({ id, value: JSON.stringify(value) })
      }
      for (const id of existingIds) {
        if (!newIds.has(id)) remove.run({ id })
      }
    })
    run()
  }

  async read() {
    const loaded = {}
    for (const col of COLLECTIONS) {
      loaded[col] = this._loadCollection(col)
    }

    this.data = {
      ...DEFAULTS,
      ...loaded
    }
    return this.data
  }

  async write() {
    if (!this.data) return
    for (const col of COLLECTIONS) {
      if (col in this.data) {
        this._saveCollection(col, this.data[col])
      }
    }
  }

  close() {
    this._db.close()
  }
}

export default SQLiteDB
