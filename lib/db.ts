import { MongoClient, Db, Collection, Document } from 'mongodb'

const uri = process.env.MONGO_URI || 'mongodb://localhost:27017'
const dbName = process.env.DB_NAME || 'paymail_bridge'

let client: MongoClient | null = null
let db: Db | null = null

export async function connectToDatabase(): Promise<{ db: Db, client: MongoClient }> {
  if (!client) {
    client = new MongoClient(uri)
    await client.connect()
  }
  
  if (!db) {
    db = client.db(dbName)
  }
  
  return { db, client }
}

export async function dbc(collectionName: string): Promise<Collection<Document>> {
  const { db } = await connectToDatabase()
  return db.collection<Document>(collectionName)
}

export async function closeConnection(): Promise<void> {
  if (client) {
    await client.close()
    client = null
    db = null
  }
}

// Graceful shutdown for Next.js
if (typeof window === 'undefined') {
  process.on('SIGINT', async () => {
    await closeConnection()
    process.exit(0)
  })
  
  process.on('SIGTERM', async () => {
    await closeConnection()
    process.exit(0)
  })
}
