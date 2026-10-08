const activeCaptures = new Set()
export default function captureStdout(maxLength = 200) {
    maxLength = Math.max(1, Number(maxLength) || 200)
    const chunks = []
    const oldWrite = process.stdout.write
    let isActive = true
    const writeWrapper = function(chunk, encoding, callback) {
        if (typeof encoding === 'function') {
            callback = encoding
            encoding = 'utf8'
        }
        try {
            const buffer = Buffer.isBuffer(chunk)
                ? chunk
                : Buffer.from(String(chunk), encoding || 'utf8')
            chunks.push(buffer)
            while (chunks.length > maxLength) {
                chunks.shift()
            }
        } catch {}
        return oldWrite.call(process.stdout, chunk, encoding, callback)
    }
    const disable = () => {
        if (!isActive) return
        isActive = false
        if (process.stdout.write === writeWrapper) {
            process.stdout.write = oldWrite
        }
        activeCaptures.delete(capture)
    }
    const capture = {
        disable,
        get isModified() {
            return isActive
        },
        logs() {
            return chunks.length
                ? Buffer.concat(chunks)
                : Buffer.alloc(0)
        },
        clear() {
            chunks.length = 0
        }
    }
    process.stdout.write = writeWrapper
    activeCaptures.add(capture)
    return capture
}
export function logs() {
    if (!activeCaptures.size) {
        return Buffer.alloc(0)
    }
    const chunks = []
    for (const capture of activeCaptures) {
        try {
            const buffer = capture.logs()
            if (buffer.length) {
                chunks.push(buffer)
            }
        } catch {}
    }
    return chunks.length
        ? Buffer.concat(chunks)
        : Buffer.alloc(0)
}
export function isModified() {
    return activeCaptures.size > 0
}