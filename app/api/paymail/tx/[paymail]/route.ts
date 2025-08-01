import { NextResponse, NextRequest } from "next/server";
import { Transaction } from "@bsv/sdk"
import { dbc } from "@/lib/db"

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
    // save the tx for the user to pickup.
    const transactions = await dbc('transactions')
    const success = await transactions.insertOne({
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