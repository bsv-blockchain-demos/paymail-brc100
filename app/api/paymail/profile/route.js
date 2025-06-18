import { NextResponse } from "next/server";

export async function GET(req) {
    return NextResponse.json({
      name: 'Bridge',
      domain: 'paymail.us',
      avatar: 'paymail.us/apple-touch-icon.png'
    }, { status: 200 })
}