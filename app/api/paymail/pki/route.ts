import { NextResponse, NextRequest } from "next/server";
import { PrivateKey } from "@bsv/sdk"
const key = PrivateKey.fromString(process.env.SERVER_KEY || '')

export async function GET(req: NextRequest) {
    return NextResponse.json({
      bsvalias: '1.0',
      handle: `bridge@${process.env.NEXT_PUBLIC_HOST || 'paymail-bridge.example.com'}`,
      pubkey: key.toPublicKey().toString()
    }, { status: 200 })
}