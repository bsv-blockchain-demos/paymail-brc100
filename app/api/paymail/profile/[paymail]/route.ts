import { NextResponse, NextRequest } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ paymail: string }> }) {
    const { paymail } = await params
    const [name, domain] = paymail.split('@')
    return NextResponse.json({
      name,
      domain,
      avatar: 'https://paymail.us/apple-touch-icon.png'
    }, { status: 200 })
}