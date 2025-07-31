import { NextResponse, NextRequest } from "next/server";
import { PrivateKey } from "@bsv/sdk"
const key = PrivateKey.fromWif(process.env.SERVER_KEY || '')

export async function GET(req: NextRequest) {
    return NextResponse.json({
      bsvalias: '1.0',
      handle: `bridge@paymail.us`,
      pubkey: key.toPublicKey().toString()
    }, { status: 200 })
}