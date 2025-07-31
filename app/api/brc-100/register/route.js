import { Signature, BigNumber, Utils, Hash, ECDSA, PublicKey } from "@bsv/sdk"

export async function POST(req) {
    try {
        const body = await req.json()
        const { alias, identityKey, protocolID, keyID, signature } = body

        const msg = new BigNumber(Hash.sha256(Utils.toArray(alias, 'utf8')))
        const sig = Signature.fromHex(signature)
        const pubKey = PublicKey.fromHex(identityKey)

        // check that the signature is valid for the identityKey
        const isValid = ECDSA.verify(msg, sig, pubKey)
        if (!isValid) return Response.json({ error: 'Invalid signature' }, { status: 400 })      
    

        // check if alias is available
        const existingRecord = await req.db.collection('aliases').findOne({ alias })
        if (existingRecord) return Response.json({ error: 'Alias already exists' }, { status: 400 })

        // if yes then create a record mapping the alias to the identityKey and return success
        const success = await req.db.collection('aliases').insertOne({ alias, identityKey, signature })
        if (!success) return Response.json({ error: 'Failed to register alias' }, { status: 400 })

        return Response.json({ [alias]: identityKey }, { status: 200 })
    } catch (error) {
        console.log({ error })
        return Response.json({ error: error.message }, { status: 400 })
    }
}