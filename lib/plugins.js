import { readdirSync, existsSync, readFileSync, watch } from 'fs'
import { join, resolve } from 'path'
import { format } from 'util'
import syntaxerror from 'syntax-error'
import importFile from './import.js'
import Helper from './helper.js'

const __dirname = Helper.__dirname(import.meta)
const defaultPluginFolder = join(__dirname, '../plugins')
const pluginFilter = filename => /\.(mc)?js$/.test(filename)

const watcher = {}
const plugins = {}
const pluginFolders = []
const reloadTimers = new Map()
const reloadLocks = new Map()

async function filesInit(folderPath = defaultPluginFolder, filter = pluginFilter, conn) {
  const folder = resolve(folderPath)

  if (pluginFolders.includes(folder)) {
    return plugins
  }

  if (!existsSync(folder)) {
    return plugins
  }

  pluginFolders.push(folder)

  let files

  try {
    files = readdirSync(folder, {
      withFileTypes: true
    })
      .filter(entry => entry.isFile() && filter(entry.name))
      .map(entry => entry.name)
  } catch (e) {
    conn?.logger?.error(`[plugins:${folder}]`, e)

    const index = pluginFolders.indexOf(folder)

    if (index !== -1) {
      pluginFolders.splice(index, 1)
    }

    return plugins
  }

  await Promise.all(
    files.map(async filename => {
      try {
        const file = Helper.__filename(
          join(folder, filename)
        )

        const module = await importFile(file)

        if (module) {
          plugins[filename] = module
        }
      } catch (e) {
        conn?.logger?.error(
          `[plugin:${filename}]`,
          e
        )

        Reflect.deleteProperty(
          plugins,
          filename
        )
      }
    })
  )

  try {
    const watching = watch(
      folder,
      {
        persistent: true
      },
      (event, filename) => {
        if (!filename) return

        filename = filename.toString()

        if (!filter(filename)) return

        scheduleReload(
          conn,
          folder,
          filter,
          event,
          filename
        )
      }
    )

    watching.on(
      'error',
      err => {
        conn?.logger?.error(
          `[watcher:${folder}]`,
          err
        )
      }
    )

    watching.on(
      'close',
      () => deletePluginFolder(folder, true)
    )

    watcher[folder] = watching
  } catch (e) {
    conn?.logger?.error(
      `[watcher:${folder}]`,
      e
    )

    const index = pluginFolders.indexOf(folder)

    if (index !== -1) {
      pluginFolders.splice(index, 1)
    }
  }

  return plugins
}

function scheduleReload(
  conn,
  pluginFolder,
  filter,
  event,
  filename
) {
  const key = `${resolve(pluginFolder)}:${filename}`

  const previous = reloadTimers.get(key)

  if (previous) {
    clearTimeout(previous)
  }

  const timer = setTimeout(() => {
    reloadTimers.delete(key)

    reload(
      conn,
      pluginFolder,
      filter,
      event,
      filename
    ).catch(e => {
      conn?.logger?.error(
        `[reload:${filename}]`,
        e
      )
    })
  }, 120)

  reloadTimers.set(key, timer)
}

function deletePluginFolder(
  folder,
  isAlreadyClosed = false
) {
  const resolved = resolve(folder)

  const watching = watcher[resolved]

  if (watching) {
    try {
      if (!isAlreadyClosed) {
        watching.close()
      }
    } catch {}

    Reflect.deleteProperty(
      watcher,
      resolved
    )
  }

  for (const [key, timer] of reloadTimers) {
    if (key.startsWith(`${resolved}:`)) {
      clearTimeout(timer)
      reloadTimers.delete(key)
    }
  }

  for (const key of reloadLocks.keys()) {
    if (key.startsWith(`${resolved}:`)) {
      reloadLocks.delete(key)
    }
  }

  const index = pluginFolders.indexOf(resolved)

  if (index !== -1) {
    pluginFolders.splice(index, 1)
  }
}

async function reload(
  conn,
  pluginFolder,
  filter,
  _ev,
  filename
) {
  if (!filename || !filter(filename)) {
    return
  }

  const folder = resolve(pluginFolder)
  const fullPath = join(folder, filename)
  const dir = Helper.__filename(fullPath, true)
  const lockKey = `${folder}:${filename}`

  const previousLock = reloadLocks.get(lockKey)

  if (previousLock) {
    await previousLock
    return
  }

  const task = (async () => {
    if (filename in plugins) {
      if (existsSync(dir)) {
        conn?.logger?.info(
          `updated plugin - '${filename}'`
        )
      } else {
        conn?.logger?.warn(
          `deleted plugin - '${filename}'`
        )

        Reflect.deleteProperty(
          plugins,
          filename
        )

        return
      }
    } else {
      if (!existsSync(dir)) {
        return
      }

      conn?.logger?.info(
        `new plugin - '${filename}'`
      )
    }

    if (!existsSync(dir)) {
      return
    }

    let source

    try {
      source = readFileSync(
        dir,
        'utf8'
      )
    } catch (e) {
      conn?.logger?.error(
        `read error '${filename}'\n${format(e)}`
      )

      return
    }

    const err = syntaxerror(
      source,
      filename,
      {
        sourceType: 'module',
        allowAwaitOutsideFunction: true
      }
    )

    if (err) {
      conn?.logger?.error(
        `syntax error in '${filename}'\n${format(err)}`
      )

      return
    }

    try {
      const module = await importFile(dir)

      if (!module) {
        return
      }

      plugins[filename] = module

      const sortedKeys = Object.keys(
        plugins
      ).sort((a, b) =>
        a.localeCompare(b)
      )

      const sorted = {}

      for (const key of sortedKeys) {
        sorted[key] = plugins[key]
      }

      for (const key of Object.keys(plugins)) {
        Reflect.deleteProperty(
          plugins,
          key
        )
      }

      Object.assign(
        plugins,
        sorted
      )
    } catch (e) {
      conn?.logger?.error(
        `error loading plugin '${filename}'\n${format(e)}`
      )

      Reflect.deleteProperty(
        plugins,
        filename
      )
    }
  })()

  reloadLocks.set(
    lockKey,
    task
  )

  try {
    await task
  } finally {
    if (reloadLocks.get(lockKey) === task) {
      reloadLocks.delete(lockKey)
    }
  }
}

export {
  defaultPluginFolder as pluginFolder,
  pluginFilter,
  plugins,
  watcher,
  pluginFolders,
  filesInit,
  deletePluginFolder,
  reload
}