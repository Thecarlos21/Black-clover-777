import { resolve, dirname } from 'path'
import { promises as fs, existsSync, readFileSync } from 'fs'

const parseJSON = (str, reviver) => {
    try {
        return JSON.parse(str, (key, value) => {
            if (
                value &&
                typeof value === 'object' &&
                value.type === 'Buffer' &&
                Array.isArray(value.data)
            ) {
                return Buffer.from(value.data)
            }

            return reviver ? reviver(key, value) : value
        })
    } catch {
        return {}
    }
}

class Database {
    constructor(filepath, ...args) {
        this.file = resolve(filepath)
        this.logger = console
        this._jsonargs = args.length ? args : [null, 0]
        this._state = false
        this._queue = []
        this._data = {}
        this._saving = null
        this._loaded = false
        this._closed = false
        this._timer = null

        this._load()
    }

    get data() {
        return this._data
    }

    set data(value) {
        this._data = value
        this.save()
    }

    async load() {
        if (this._loaded) return this._data

        return new Promise((resolve, reject) => {
            this._queue.push({
                action: '_load',
                resolve,
                reject
            })

            this._processQueue()
        })
    }

    save() {
        if (this._closed) return

        if (!this._queue.some(task => task.action === '_save')) {
            this._queue.push({
                action: '_save'
            })
        }

        this._processQueue()
    }

    async _processQueue() {
        if (this._state || !this._queue.length || this._closed) return

        const task = this._queue.shift()
        this._state = true

        try {
            const result = await this[task.action]()
            task.resolve?.(result)
        } catch (err) {
            this.logger.error(`[Database:${task.action}]`, err)
            task.reject?.(err)
        } finally {
            this._state = false

            if (this._queue.length && !this._closed) {
                queueMicrotask(() => this._processQueue())
            }
        }
    }

    _load() {
        try {
            if (!existsSync(this.file)) {
                this._data = {}
                this._loaded = true
                return this._data
            }

            const content = readFileSync(this.file, 'utf8')
            this._data = parseJSON(content)
            this._loaded = true

            return this._data
        } catch (err) {
            this.logger.error('[Database:_load]', err)
            this._data = {}
            this._loaded = true

            return this._data
        }
    }

    async _save() {
        if (this._saving) return this._saving

        this._saving = (async () => {
            const dir = dirname(this.file)
            const tempFile = `${this.file}.${process.pid}.${Date.now()}.tmp`

            try {
                await fs.mkdir(dir, {
                    recursive: true
                })

                const json = JSON.stringify(
                    this._data,
                    ...this._jsonargs
                )

                await fs.writeFile(
                    tempFile,
                    json,
                    'utf8'
                )

                await fs.rename(
                    tempFile,
                    this.file
                )

                return this.file
            } catch (err) {
                await fs.unlink(tempFile).catch(() => {})
                this.logger.error('[Database:_save]', err)
                throw err
            } finally {
                this._saving = null
            }
        })()

        return this._saving
    }

    async close() {
        this._closed = true

        if (this._saving) {
            await this._saving
        }

        return this.file
    }
}

export default Database