import { NextResponse } from "next/server";

export async function GET(req) {
    return NextResponse.json({
      name: 'Sweep',
      domain: 'sweep.xn--nda.network',
      avatar: 'https://thispersondoesnotexist.com'
    }, { status: 200 })
}