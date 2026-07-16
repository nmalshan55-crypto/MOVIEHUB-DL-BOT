const { initAuthCreds, BufferJSON, proto } = require('@whiskeysockets/baileys')

// A minimal, self-contained MongoDB-backed auth state for Baileys.
// Avoids third-party wrapper packages that can fall out of sync with newer Baileys versions.
async function useMongoAuthState(collection) {
  const writeData = async (data, id) => {
    const serialized = JSON.parse(JSON.stringify(data, BufferJSON.replacer))
    await collection.updateOne(
      { _id: id },
      { $set: { value: serialized } },
      { upsert: true }
    )
  }

  const readData = async (id) => {
    const doc = await collection.findOne({ _id: id })
    if (!doc || doc.value === undefined) return null
    return JSON.parse(JSON.stringify(doc.value), BufferJSON.reviver)
  }

  const removeData = async (id) => {
    await collection.deleteOne({ _id: id })
  }

  const creds = (await readData('creds')) || initAuthCreds()

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {}
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}`)
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value)
              }
              data[id] = value
            })
          )
          return data
        },
        set: async (data) => {
          const tasks = []
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id]
              const key = `${category}-${id}`
              tasks.push(value ? writeData(value, key) : removeData(key))
            }
          }
          await Promise.all(tasks)
        }
      }
    },
    saveCreds: () => writeData(creds, 'creds')
  }
}

module.exports = { useMongoAuthState }
