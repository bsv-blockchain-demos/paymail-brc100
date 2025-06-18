import { NextResponse } from "next/server";

export async function GET(req) {
    return NextResponse.json({
      bsvalias: '1.0',
      handle: `sweep@sweep.xn--nda.network`,
      pubkey: '026a71b29fe6dddac386266be2c598739177d2a0f87c767f5db55e9d0bd54a1ac5'
    }, { status: 200 })
}