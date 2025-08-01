import { NextResponse, NextRequest } from "next/server";
import { KeyDeriver, WalletProtocol, P2PKH, Utils } from "@bsv/sdk"
import { dbc } from "@/lib/db"

export async function POST(req: NextRequest, { params }: { params: Promise<{ paymail: string }> }) {
    const body = await req.json()
    const { satoshis } = body
    const { paymail } = await params
    if (!paymail) return NextResponse.json({ error: 'Invalid paymail' }, { status: 400 })
    const [alias, domain] = paymail.split('@')
    if (domain !== process.env.NEXT_PUBLIC_HOST) return NextResponse.json({ error: 'Invalid domain' }, { status: 400 })
    
    const aliases = await dbc('aliases')
    const document = await aliases.findOne({ alias })
    if (!document) return NextResponse.json({ error: 'Alias not found' }, { status: 404 })
    const { identityKey } = document
    

    const keyDeriver = new KeyDeriver('anyone')
    const protocolID = [2, '3241645161d8'] as WalletProtocol
    const derivationPrefix = Utils.toBase64(Utils.toArray(alias, 'utf8'))
    const derivationSuffix =  Utils.toBase64(Utils.toArray(new Date().toISOString(), 'utf8'))
    const senderIdentityKey = keyDeriver.identityKey
    const keyID = derivationPrefix + ' ' + derivationSuffix
    const publicKey = keyDeriver.derivePublicKey(protocolID, keyID, identityKey)

    const p2pkh = new P2PKH()
    const script = p2pkh.lock(publicKey.toAddress()).toHex()
    
    const destinations = await dbc('destinations')
    const success = await destinations.insertOne({
      publicKey: publicKey.toString(),
      satoshis,
      keyID,
      derivationPrefix,
      derivationSuffix,
      senderIdentityKey,
      alias,
      identityKey,
      script,
    })
    if (!success) return NextResponse.json({ error: 'Failed to register destination' }, { status: 400 })

    return NextResponse.json({
      reference: keyID,
      outputs: [
        {
          satoshis,
          script
        }
      ]
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