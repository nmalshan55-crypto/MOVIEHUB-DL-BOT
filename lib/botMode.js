const { MongoClient } = require('mongodb')

let collection = null
let cachedMode = 'public'
let connectPromise = null

async function ensureConnected() {
    if (connectPromise) return connectPromise
    connectPromise = (async () => {
        const client = new MongoClient(process.env.MONGODB_URI)
        await client.connect()
        collection = client.db('whatsapp').collection('settings')
        const doc = await collection.findOne({ _id: 'mode' })
        cachedMode = (doc && doc.value) || 'public'
    })()
    return connectPromise
}

async function getMode() {
    await ensureConnected()
    return cachedMode
}

async function setMode(mode) {
    await ensureConnected()
    cachedMode = mode
    await collection.updateOne({ _id: 'mode' }, { $set: { value: mode } }, { upsert: true })
}

module.exports = { getMode, setMode }
