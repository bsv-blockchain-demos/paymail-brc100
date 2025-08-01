import { Utils, ProtoWallet, WalletProtocol } from "@bsv/sdk"
import { NextRequest } from 'next/server'
import { dbc } from '@/lib/db'

interface RequestBody {
  data: number[];
  identityKey: string;
  protocolID: WalletProtocol;
  keyID: string;
  signature: number[];
}

export async function POST(req: NextRequest) {
    try {
        const body: RequestBody = await req.json()
        const { data, identityKey, protocolID, keyID, signature } = body

        // Check keyID timestamp to prevent replay attacks
        const keyIDDate = new Date(keyID)
        const now = new Date()
        const timeDiff = now.getTime() - keyIDDate.getTime()
        if (timeDiff > 10000 || timeDiff < 0) {
            return Response.json({ error: 'Request expired or invalid timestamp' }, { status: 400 })
        }

        const alias = Utils.toUTF8(data)

        // Basic alias validation
        if (!/^[a-zA-Z0-9_-]+$/.test(alias)) {
            return Response.json({ error: 'Alias can only contain letters, numbers, hyphens, and underscores' }, { status: 400 })
        }

        const wallet = new ProtoWallet('anyone')
        const { valid } = await wallet.verifySignature({
            data,
            signature,
            protocolID,
            keyID,
            counterparty: identityKey
        })
        if (!valid) return Response.json({ error: 'Invalid signature' }, { status: 400 })      
    

        // check if alias is available
        const aliases = await dbc('aliases')
        const existingRecord = await aliases.findOne({ alias })
        if (existingRecord) return Response.json({ error: 'Alias already exists' }, { status: 400 })

        // if yes then create a record mapping the alias to the identityKey and return success
        const success = await aliases.insertOne({ 
            alias, 
            data,
            signature,
            protocolID,
            keyID,
            identityKey
        })
        if (!success) return Response.json({ error: 'Failed to register alias' }, { status: 400 })

        return Response.json({ [alias]: identityKey }, { status: 200 })
    } catch (error) {
        console.log({ error })
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return Response.json({ error: errorMessage }, { status: 400 })
    }
}