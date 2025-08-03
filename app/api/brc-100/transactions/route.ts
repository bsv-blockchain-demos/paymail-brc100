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

interface TransactionRecord {
  txid: string;
  satoshis: number;
  acknowledged: boolean;
  alias: string;
  outputIndex: number;
  script: string;
  publicKey: string;
  keyID: string;
  identityKey: string;
  derivationPrefix: string;
  derivationSuffix: string;
  senderIdentityKey: string;
  beef?: number[];
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

        // Get all transactions for this identityKey (both acknowledged and unacknowledged)
        const txc = await dbc('transactions')
        const transactions = await txc.find({ identityKey }).sort({ _id: -1 }).toArray()

        // Map to include all fields needed for display and internalizeAction
        const transactionList = transactions.map((tx: any) => ({
            txid: tx.txid,
            satoshis: tx.satoshis,
            acknowledged: tx.acknowledged,
            alias: tx.alias,
            beef: tx.beef,
            outputIndex: tx.outputIndex,
            derivationPrefix: tx.derivationPrefix,
            derivationSuffix: tx.derivationSuffix,
            senderIdentityKey: tx.senderIdentityKey
        }))

        return Response.json({ transactions: transactionList }, { status: 200 })
    } catch (error) {
        console.log({ error })
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return Response.json({ error: errorMessage }, { status: 400 })
    }
}
