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

        const msg = Utils.toUTF8(data)
        if (msg !== 'please give me my transactions') {
            return Response.json({ error: 'Invalid message' }, { status: 400 })
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

        const txc = await dbc('transactions')
        const transactions = await txc.find({ acknowledged: false, identityKey }).toArray()

        return Response.json({ transactions }, { status: 200 })
    } catch (error) {
        console.log({ error })
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return Response.json({ error: errorMessage }, { status: 400 })
    }
}