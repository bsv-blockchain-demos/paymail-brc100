import { Utils, ProtoWallet, WalletProtocol } from "@bsv/sdk"
import { NextRequest } from 'next/server'
import { dbc } from '@/lib/db'

interface RequestBody {
  data: number[];
  identityKey: string;
  protocolID: WalletProtocol;
  keyID: string;
  signature: number[];
  alias: string;
}

export async function POST(req: NextRequest) {
    try {
        const body: RequestBody = await req.json()
        const { data, identityKey, protocolID, keyID, signature, alias } = body

        // Check keyID timestamp to prevent replay attacks
        const keyIDDate = new Date(keyID)
        const now = new Date()
        const timeDiff = now.getTime() - keyIDDate.getTime()
        if (timeDiff > 10000 || timeDiff < 0) {
            return Response.json({ error: 'Request expired or invalid timestamp' }, { status: 400 })
        }

        // Basic alias validation
        if (!alias || !/^[a-zA-Z0-9_-]+$/.test(alias)) {
            return Response.json({ error: 'Invalid alias format' }, { status: 400 })
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

        // Check if alias exists and belongs to this user
        const aliases = await dbc('aliases')
        const existingRecord = await aliases.findOne({ alias, identityKey })
        if (!existingRecord) {
            return Response.json({ error: 'Alias not found or you do not have permission to delete it' }, { status: 404 })
        }

        // Delete the alias
        const deleteResult = await aliases.deleteOne({ alias, identityKey })
        if (deleteResult.deletedCount === 0) {
            return Response.json({ error: 'Failed to delete alias' }, { status: 400 })
        }

        return Response.json({ success: true, message: `Alias '${alias}' deleted successfully` }, { status: 200 })
    } catch (error) {
        console.log({ error })
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return Response.json({ error: errorMessage }, { status: 400 })
    }
}
