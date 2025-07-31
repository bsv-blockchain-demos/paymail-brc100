import { Signature, BigNumber, Utils, ProtoWallet, ECDSA, PublicKey, WalletProtocol } from "@bsv/sdk"
import { NextRequest } from 'next/server'

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

        const alias = Utils.toUTF8(data)

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
        // Note: Database access would need to be implemented with proper DB connection
        // const existingRecord = await db.collection('aliases').findOne({ alias })
        // if (existingRecord) return Response.json({ error: 'Alias already exists' }, { status: 400 })

        // if yes then create a record mapping the alias to the identityKey and return success
        // const success = await db.collection('aliases').insertOne({ alias, identityKey, signature })
        // if (!success) return Response.json({ error: 'Failed to register alias' }, { status: 400 })

        return Response.json({ [alias]: identityKey }, { status: 200 })
    } catch (error) {
        console.log({ error })
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return Response.json({ error: errorMessage }, { status: 400 })
    }
}