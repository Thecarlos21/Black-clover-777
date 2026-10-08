import mongoose from 'mongoose'
const { Schema, connect, model } = mongoose
const defaultOptions = {
    serverSelectionTimeoutMS: 5000,
    maxPoolSize: 10,
    minPoolSize: 1
}
export class mongoDB {
    constructor(url, options = {}) {
        if (typeof url !== 'string' || !url.trim()) {
            throw new TypeError('MongoDB necesita una URL válida')
        }
        this.url = url.trim()
        this.options = { ...defaultOptions, ...options }
        this.data = {}
        this._data = null
        this._model = null
        this._ready = null
        this._schema = new Schema(
            {
                data: {
                    type: Schema.Types.Mixed,
                    required: true,
                    default: {}
                }
            },
            {
                minimize: false
            }
        )
    }
    async _connect() {
        if (this._ready) return this._ready
        this._ready = connect(this.url, this.options)
            .then(() => {
                this._model =
                    mongoose.models.data ||
                    model('data', this._schema)
                return this._model
            })
            .catch(err => {
                this._ready = null
                throw err
            })
        return this._ready
    }
    async read() {
        const Model = await this._connect()
        this._data = await Model.findOne({})
        if (!this._data) {
            this._data = await Model.create({
                data: {}
            })
            this.data = {}
        } else {
            this.data = this._data.data || {}
        }
        return this.data
    }
    async write(data) {
        if (
            !data ||
            typeof data !== 'object' ||
            Array.isArray(data)
        ) {
            throw new TypeError('Data must be an object')
        }
        const Model = await this._connect()
        if (!this._data) {
            this._data = await Model.create({
                data
            })
        } else {
            this._data.data = data
            await this._data.save()
        }
        this.data = data
        return true
    }
}
export class mongoDBV2 {
    constructor(url, options = {}) {
        if (typeof url !== 'string' || !url.trim()) {
            throw new TypeError('MongoDB necesita una URL válida')
        }
        this.url = url.trim()
        this.options = { ...defaultOptions, ...options }
        this.data = {}
        this._ready = null
        this._listModel = null
        this._collectionSchema = new Schema(
            {
                data: Array
            },
            {
                minimize: false
            }
        )
        this._listSchema = new Schema(
            {
                data: [{
                    name: String
                }]
            },
            {
                minimize: false
            }
        )
    }
    async _connect() {
        if (this._ready) return this._ready
        this._ready = connect(this.url, this.options)
            .then(() => {
                this._listModel =
                    mongoose.models.lists ||
                    model('lists', this._listSchema)
                return this._listModel
            })
            .catch(err => {
                this._ready = null
                throw err
            })
        return this._ready
    }
    async read() {
        const ListModel = await this._connect()
        let listDoc = await ListModel.findOne({})
        if (!listDoc) {
            listDoc = await ListModel.create({
                data: []
            })
        }
        const result = {}
        const garbage = []
        for (const item of listDoc.data || []) {
            const name = item?.name
            if (!name || typeof name !== 'string') {
                continue
            }
            try {
                const Collection =
                    mongoose.models[name] ||
                    model(name, this._collectionSchema)
                const docs = await Collection
                    .find({})
                    .lean()
                result[name] = Object.fromEntries(
                    docs
                        .map(doc => doc.data)
                        .filter(Array.isArray)
                )
            } catch {
                garbage.push(name)
            }
        }
        if (garbage.length) {
            const invalid = new Set(garbage)
            listDoc.data = listDoc.data.filter(
                item => !invalid.has(item.name)
            )
            await listDoc.save()
        }
        this.data = result
        return result
    }
    async write(data) {
        if (
            !data ||
            typeof data !== 'object' ||
            Array.isArray(data)
        ) {
            throw new TypeError('Data must be an object')
        }
        const ListModel = await this._connect()
        const session = await mongoose.startSession()
        try {
            await session.withTransaction(async () => {
                let listDoc = await ListModel
                    .findOne({})
                    .session(session)
                if (!listDoc) {
                    listDoc = await ListModel.create(
                        [{
                            data: []
                        }],
                        { session }
                    ).then(result => result[0])
                }
                const listData = []
                for (const [key, value] of Object.entries(data)) {
                    if (
                        !value ||
                        typeof value !== 'object' ||
                        Array.isArray(value)
                    ) {
                        continue
                    }
                    const Collection =
                        mongoose.models[key] ||
                        model(key, this._collectionSchema)
                    await Collection.deleteMany(
                        {},
                        { session }
                    )
                    const entries = Object.entries(value)
                    if (entries.length) {
                        const bulkData = entries.map(
                            ([k, v]) => ({
                                data: [k, v]
                            })
                        )
                        await Collection.insertMany(
                            bulkData,
                            { session }
                        )
                    }
                    listData.push({
                        name: key
                    })
                }
                listDoc.data = listData
                await listDoc.save({
                    session
                })
            })
            this.data = data
            return true
        } finally {
            await session.endSession()
        }
    }
}