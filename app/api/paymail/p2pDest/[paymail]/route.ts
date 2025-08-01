import { NextResponse, NextRequest } from "next/server";
import { KeyDeriver, PrivateKey, WalletProtocol, P2PKH } from "@bsv/sdk"
import { dbc } from "@/lib/db"
const key = PrivateKey.fromWif(process.env.SERVER_KEY || '')

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
    const protocolID = [0, 'paymail destination'] as WalletProtocol
    const keyID = new Date().toISOString()
    const publicKey = keyDeriver.derivePublicKey(protocolID, keyID, identityKey)

    const destinations = await dbc('destinations')
    const success = await destinations.insertOne({
      publicKey: publicKey.toString(),
      satoshis,
      keyID,
      alias,
      identityKey,
    })
    if (!success) return NextResponse.json({ error: 'Failed to register destination' }, { status: 400 })

    const p2pkh = new P2PKH()
    return NextResponse.json({
      reference: keyID,
      outputs: [
        {
          satoshis,
          script: p2pkh.lock(publicKey.toAddress()).toHex()
        }
      ]
    }, { status: 200 })
}