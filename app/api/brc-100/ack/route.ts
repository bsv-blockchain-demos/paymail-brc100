import { NextRequest } from 'next/server'
import { dbc } from '@/lib/db'

interface RequestBody {
  txids: string[]
}

export async function POST(req: NextRequest) {
    try {
        const body: RequestBody = await req.json()

        const { txids } = body
        
        const transactions = await dbc('transactions')
        
        const { acknowledged } = await transactions.updateMany({ txid: { $in: txids } }, { $set: { acknowledged: true } })

        if (!acknowledged) return Response.json({ error: 'Failed to acknowledge transactions' }, { status: 400 })

        return Response.json({ acknowledged }, { status: 200 })
    } catch (error) {
        console.log({ error })
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return Response.json({ error: errorMessage }, { status: 400 })
    }
}