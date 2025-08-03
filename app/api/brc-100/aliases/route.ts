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

interface AliasRecord {
  alias: string;
  identityKey: string;
  data: number[];
  signature: number[];
  protocolID: WalletProtocol;
  keyID: string;
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

        // Verify signature
        const wallet = new ProtoWallet('anyone')
        const { valid } = await wallet.verifySignature({
            data,
            signature,
            protocolID,
            keyID,
            counterparty: identityKey
        })
        if (!valid) return Response.json({ error: 'Invalid signature' }, { status: 400 })

        // Get all aliases for this identityKey
        const aliases = await dbc('aliases')
        const userAliases = await aliases.find({ identityKey }).toArray()

        // Map to just the alias names
        const aliasNames = userAliases.map((record: any) => record.alias)

        return Response.json({ aliases: aliasNames }, { status: 200 })
    } catch (error) {
        console.log({ error })
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return Response.json({ error: errorMessage }, { status: 400 })
    }
}
