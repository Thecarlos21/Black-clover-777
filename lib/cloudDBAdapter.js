import got from 'got'

const stringify = JSON.stringify

const parse = str => {
    if (!str?.trim()) return {}

    try {
        return JSON.parse(str, (_, value) => {
            if (
                value &&
                typeof value === 'object' &&
                value.type === 'Buffer' &&
                Array.isArray(value.data)
            ) {
                return Buffer.from(value.data)
            }
            return value
        })
    } catch {
        return {}
    }
}

class CloudDBAdapter {
    constructor(
        url,
        {
            serialize = stringify,
            deserialize = parse,
            fetchOptions = {}
        } = {}
    ) {
        if (typeof url !== 'string' || !url.trim()) {
            throw new Error('CloudDBAdapter necesita una URL válida')
        }

        this.url = url.trim()
        this.serialize = serialize
        this.deserialize = deserialize

        this.client = got.extend({
            timeout: {
                request: 15000
            },
            retry: {
                limit: 3,
                methods: ['GET', 'POST'],
                statusCodes: [408, 413, 429, 500, 502, 503, 504]
            },
            throwHttpErrors: false,
            headers: {
                accept: 'application/json,text/plain;q=0.9'
            },
            ...fetchOptions
        })
    }

    async read() {
        try {
            const res = await this.client.get(this.url, {
                responseType: 'text'
            })

            if (res.statusCode < 200 || res.statusCode >= 300) {
                return {}
            }

            return this.deserialize(res.body)
        } catch (err) {
            console.error('[CloudDBAdapter:read]', err?.message || err)
            return {}
        }
    }

    async write(obj) {
        try {
            const res = await this.client.post(this.url, {
                headers: {
                    'content-type': 'application/json'
                },
                body: this.serialize(obj),
                responseType: 'text'
            })

            if (res.statusCode < 200 || res.statusCode >= 300) {
                throw new Error(
                    `HTTP ${res.statusCode}: ${res.body || 'sin respuesta'}`
                )
            }

            return res.body
        } catch (err) {
            console.error('[CloudDBAdapter:write]', err?.message || err)
            throw err
        }
    }
}

export default CloudDBAdapter