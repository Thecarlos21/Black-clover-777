import yargs from 'yargs'
import os from 'os'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'
import fs from 'fs'
import Stream, { Readable } from 'stream'

const __filename = (pathURL = import.meta.url, rmPrefix = os.platform() !== 'win32') => {
    const value = typeof pathURL === 'string'
        ? pathURL
        : pathURL?.url || pathURL

    if (!value) return process.cwd()

    try {
        return rmPrefix && value.startsWith('file://')
            ? fileURLToPath(value)
            : value
    } catch {
        return value
    }
}

const __dirname = (pathURL = import.meta.url) => {
    return path.dirname(__filename(pathURL, true)).replace(/[\\/]+$/, '')
}

const __require = (dir = import.meta.url) => {
    const value = typeof dir === 'string'
        ? dir
        : dir?.url || dir

    return createRequire(value)
}

const checkFileExists = async file => {
    try {
        await fs.promises.access(file, fs.constants.F_OK)
        return true
    } catch {
        return false
    }
}

const API = (name, apiPath = '/', query = {}, apikeyqueryname) => {
    const base = global.APIs?.[name] || name
    const params = { ...query }
    const key = global.APIKeys?.[base] || global.APIKeys?.[name]

    if (apikeyqueryname && key) {
        params[apikeyqueryname] = key
    }

    const entries = Object.entries(params)

    if (!entries.length) {
        return base + apiPath
    }

    const queryString = new URLSearchParams(entries).toString()

    return `${base}${apiPath}?${queryString}`
}

const opts = yargs(process.argv.slice(2))
    .exitProcess(false)
    .parse()

const prefixStr = opts.prefix || '‎xzXZ/i!#$%+£¢€¥^°=¶∆×÷π√✓©®:;?&.\\-'
const escapedPrefix = prefixStr
    .replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
    .replace(/-/g, '\\-')

const prefix = new RegExp(`^[${escapedPrefix}]`)

const saveStreamToFile = (stream, file) => {
    return new Promise((resolve, reject) => {
        const writable = fs.createWriteStream(file)

        const cleanup = err => {
            writable.destroy()
            stream.destroy?.()

            if (err) reject(err)
        }

        stream.once('error', cleanup)

        writable.once('error', cleanup)

        writable.once('finish', resolve)

        stream.pipe(writable)
    })
}

const kDestroyed = Symbol('kDestroyed')
const kIsReadable = Symbol('kIsReadable')

const isReadableNodeStream = (obj, strict = false) => {
    if (!obj || typeof obj.pipe !== 'function' || typeof obj.on !== 'function') {
        return false
    }

    if (!strict) return true

    return typeof obj.pause === 'function' &&
        typeof obj.resume === 'function'
}

const isNodeStream = obj => {
    if (!obj) return false

    return !!(
        obj._readableState ||
        obj._writableState ||
        (typeof obj.write === 'function' && typeof obj.on === 'function') ||
        (typeof obj.pipe === 'function' && typeof obj.on === 'function')
    )
}

const isDestroyed = stream => {
    if (!isNodeStream(stream)) return null

    const state = stream._readableState || stream._writableState

    return !!(
        stream.destroyed ||
        stream[kDestroyed] ||
        state?.destroyed
    )
}

const isReadableFinished = (stream, strict) => {
    if (!isReadableNodeStream(stream)) return null

    const state = stream._readableState

    if (state?.errored) return false

    return !!(
        state?.endEmitted ||
        (strict === false && state?.ended && state?.length === 0)
    )
}

const isReadableStream = stream => {
    if (typeof Stream.isReadable === 'function') {
        return Stream.isReadable(stream)
    }

    if (stream && stream[kIsReadable] != null) {
        return stream[kIsReadable]
    }

    if (typeof stream?.readable !== 'boolean') {
        return null
    }

    if (isDestroyed(stream)) {
        return false
    }

    return (
        (
            isReadableNodeStream(stream) &&
            !!stream.readable &&
            !isReadableFinished(stream)
        ) ||
        stream instanceof fs.ReadStream ||
        stream instanceof Readable
    )
}

export default {
    __filename,
    __dirname,
    __require,
    checkFileExists,
    API,
    saveStreamToFile,
    isReadableStream,
    opts,
    prefix
}