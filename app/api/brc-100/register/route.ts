import { Signature, BigNumber, Utils, Hash, ECDSA, PublicKey } from "@bsv/sdk"
import { NextRequest } from 'next/server'

interface RequestBody {
  alias: string;
  identityKey: string;
  protocolID: string;
  keyID: string;
  signature: string;
}

export async function POST(req: NextRequest) {
    try {
        const body: RequestBody = await req.json()
        const { alias, identityKey, protocolID, keyID, signature } = body

        const msg = new BigNumber(Hash.sha256(Utils.toArray(alias, 'utf8')))
        const sig = Signature.fromDER(signature) // Changed from fromHex to fromDER
        const pubKey = PublicKey.fromString(identityKey) // Changed from fromHex to fromString

        // check that the signature is valid for the identityKey
        const isValid = ECDSA.verify(msg, sig, pubKey)
        if (!isValid) return Response.json({ error: 'Invalid signature' }, { status: 400 })      
    

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