import { NextResponse, NextRequest } from "next/server";
import { PrivateKey } from "@bsv/sdk"
const key = new PrivateKey(1)

export async function GET(req: NextRequest, { params }: { params: Promise<{ paymail: string }> }) {
    const { paymail } = await params
    if (!paymail) return NextResponse.json({ error: 'Invalid paymail' }, { status: 400 })
    return NextResponse.json({
      bsvalias: '1.0',
      handle: paymail,
      pubkey: key.toPublicKey().toString()
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