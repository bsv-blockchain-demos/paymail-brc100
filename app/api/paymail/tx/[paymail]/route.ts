import { NextResponse, NextRequest } from "next/server";
import { Transaction, Utils } from "@bsv/sdk"
import { dbc } from "@/lib/db"
import { queuedFetch } from "@/lib/woc"

/**
 * Fetch BEEF data for a transaction with fallback to input transactions
 */
async function fetchBeefWithFallback(tx: Transaction): Promise<Transaction> {
    const txid = tx.id('hex')
    
    try {
        // Try to get BEEF directly first
        const beefResponse = await queuedFetch(`https://api.whatsonchain.com/v1/bsv/main/tx/${txid}/beef`)
        if (beefResponse.ok) {
            const beefHex = await beefResponse.text()
            return Transaction.fromHexBEEF(beefHex)
        }
    } catch (error) {
        console.warn(`Failed to fetch BEEF for ${txid}, falling back to input transactions:`, error)
    }
    
    // Fallback: fetch input transactions to build BEEF
    const inputTxids = tx.inputs.map(input => input.sourceTXID).filter((txid): txid is string => txid !== undefined)
    const uniqueTxids = Array.from(new Set(inputTxids))
    
    try {
        // Fetch all input transactions with throttling
        const inputTxPromises = uniqueTxids.map(async (inputTxid) => {
            const response = await queuedFetch(`https://api.whatsonchain.com/v1/bsv/main/tx/${inputTxid}/beef`)
            if (response.ok) {
              const sourceHex = await response.text()
              const sourceTx = Transaction.fromHexBEEF(sourceHex)
              tx.inputs.map(input => {
                  if (input.sourceTXID === inputTxid) {
                      input.sourceTransaction = sourceTx
                  }
              })
            }
            throw new Error(`Failed to fetch input tx ${inputTxid}`)
        })
        
        await Promise.all(inputTxPromises)
        
        return tx
        
    } catch (error) {
        console.error(`Failed to fetch input transactions for ${txid}:`, error)
        // Last resort: return just the transaction hex
        return tx
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ paymail: string }> }) {
    const body = await req.json()
    const { hex, reference, metadata } = body
    const { paymail } = await params
    if (!paymail) return NextResponse.json({ error: 'Invalid paymail' }, { status: 400 })
    const [alias, domain] = paymail.split('@')
    if (domain !== process.env.NEXT_PUBLIC_HOST) return NextResponse.json({ error: 'Invalid domain' }, { status: 400 })
    
    const destinations = await dbc('destinations')
    const document = await destinations.findOne({ reference })
    if (!document) return NextResponse.json({ error: 'Destination not found' }, { status: 404 })
    const { alias: documentedAlias} = document
    if (documentedAlias !== alias) return NextResponse.json({ error: 'Alias mismatch' }, { status: 400 })
    
    const tx = Transaction.fromHex(hex)
    let paid = false
    tx.outputs.map(output => {
      if (output.lockingScript.toHex() === document.script) {
        if (output.satoshis === document.satoshis) {
          paid = true
        }
      }
    })

    if (!paid) return NextResponse.json({ error: 'This tx does not pay the required destination the agreed amount.' }, { status: 404 })
    
    const arcRes = await tx.broadcast()
    if (arcRes.status !== 'success') return NextResponse.json({ error: 'Failed to broadcast transaction' }, { status: 400 })
    
    const txid = tx.id('hex')

    // Fetch BEEF data with fallback logic
    const beefTx = await fetchBeefWithFallback(tx)
    const beef = beefTx.toAtomicBEEF()

    // save the tx for the user to pickup.
    const transactions = await dbc('transactions')
    const success = await transactions.insertOne({
      beef,
      txid,
      reference,
      metadata,
      alias,
      domain,
      satoshis: document.satoshis,
      script: document.script,
      publicKey: document.publicKey,
      identityKey: document.identityKey,
      keyID: document.keyID,
      acknowledged: false
    })
    if (!success) return NextResponse.json({ error: 'Failed to save transaction' }, { status: 400 })
    
    return NextResponse.json({
      txid,
      note: 'Stored for retreival at ' + process.env.NEXT_PUBLIC_HOST
    }, { status: 200 })
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}