import EventEmitter from 'events'

const isNumber = x =>
  typeof x === 'number' &&
  Number.isFinite(x)

const delay = ms =>
  isNumber(ms) && ms > 0
    ? new Promise(resolve => setTimeout(resolve, ms))
    : Promise.resolve()

const DEFAULT_QUEUE_DELAY = 5000
const DEFAULT_TIMEOUT = 30000

export default class Queue extends EventEmitter {
  #queue = new Set()
  #delayTime = DEFAULT_QUEUE_DELAY
  #timeouts = new Map()
  #processing = new Set()

  constructor(delayTime = DEFAULT_QUEUE_DELAY) {
    super()

    this.setMaxListeners(0)

    if (isNumber(delayTime) && delayTime >= 0) {
      this.#delayTime = delayTime
    }
  }

  add(item) {
    if (item == null) {
      throw new TypeError(
        'Item cannot be null/undefined'
      )
    }

    this.#queue.add(item)

    return this
  }

  has(item) {
    return this.#queue.has(item)
  }

  delete(item) {
    this.#clearTimeout(item)
    this.#processing.delete(item)

    return this.#queue.delete(item)
  }

  first() {
    return this.#queue.values().next().value
  }

  last() {
    let last

    for (const item of this.#queue) {
      last = item
    }

    return last
  }

  isFirst(item) {
    return this.first() === item
  }

  isLast(item) {
    return this.last() === item
  }

  getIndex(item) {
    let index = 0

    for (const value of this.#queue) {
      if (value === item) {
        return index
      }

      index++
    }

    return -1
  }

  getSize() {
    return this.#queue.size
  }

  isEmpty() {
    return this.#queue.size === 0
  }

  unqueue(item) {
    const target = item ?? this.first()

    if (target == null) {
      return false
    }

    if (!this.has(target)) {
      return false
    }

    if (!this.isFirst(target)) {
      throw new Error(
        'Item is not first in queue'
      )
    }

    this.delete(target)
    this.emit(target)

    return true
  }

  #clearTimeout(item) {
    const timeout = this.#timeouts.get(item)

    if (!timeout) {
      return
    }

    clearTimeout(timeout)
    this.#timeouts.delete(item)
  }

  waitQueue(
    item,
    timeout = DEFAULT_TIMEOUT
  ) {
    return new Promise((resolve, reject) => {
      if (!this.has(item)) {
        reject(
          new Error('Item not found')
        )

        return
      }

      if (this.#processing.has(item)) {
        reject(
          new Error('Item is already processing')
        )

        return
      }

      this.#processing.add(item)

      let finished = false

      const cleanup = () => {
        this.#clearTimeout(item)
        this.removeListener(
          item,
          onItem
        )
        this.#processing.delete(item)
      }

      const finish = (
        error = null
      ) => {
        if (finished) {
          return
        }

        finished = true
        cleanup()

        if (error) {
          reject(error)
        } else {
          resolve()
        }
      }

      const onTimeout = () => {
        if (!this.has(item)) {
          finish(
            new Error('Item not found')
          )

          return
        }

        this.delete(item)

        finish(
          new Error('Queue timeout')
        )
      }

      const processItem = async () => {
        if (!this.has(item)) {
          finish(
            new Error('Item not found')
          )

          return
        }

        try {
          await delay(
            this.#delayTime
          )

          if (!this.has(item)) {
            finish(
              new Error('Item removed from queue')
            )

            return
          }

          if (!this.isFirst(item)) {
            finish(
              new Error('Item is not first in queue')
            )

            return
          }

          this.unqueue(item)
          finish()
        } catch (error) {
          this.delete(item)
          finish(error)
        }
      }

      const onItem = () => {
        if (this.isFirst(item)) {
          processItem()
        }
      }

      if (this.isFirst(item)) {
        processItem()
        return
      }

      this.once(
        item,
        onItem
      )

      if (
        isNumber(timeout) &&
        timeout > 0
      ) {
        this.#timeouts.set(
          item,
          setTimeout(
            onTimeout,
            timeout
          )
        )
      }
    })
  }

  clear() {
    for (
      const timeout
      of this.#timeouts.values()
    ) {
      clearTimeout(timeout)
    }

    this.#timeouts.clear()
    this.#processing.clear()
    this.removeAllListeners()
    this.#queue.clear()
  }
}