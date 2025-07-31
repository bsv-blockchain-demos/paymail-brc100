import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
    return Response.json({ 
        bsvalias: '1.0',
        capabilities: {
            "6745385c3fc0":false,
            "pki": `${process.env.NEXT_PUBLIC_BASE_URL}/api/paymail/pki/{alias}@{domain.tld}`,
            "paymentDestination": `${process.env.NEXT_PUBLIC_BASE_URL}/api/paymail/address/{alias}@{domain.tld}`,
            "f12f968c92d6": `${process.env.NEXT_PUBLIC_BASE_URL}/api/paymail/profile/{alias}@{domain.tld}`,
            "2a40af698840": `${process.env.NEXT_PUBLIC_BASE_URL}/api/paymail/destination/{alias}@{domain.tld}`,
            "5c55a7fdb7bb": `${process.env.NEXT_PUBLIC_BASE_URL}/api/paymail/beef/{alias}@{domain.tld}`,
            "5f1323cddf31": `${process.env.NEXT_PUBLIC_BASE_URL}/api/paymail/tx/{alias}@{domain.tld}`,
        }
     }, { status: 200 })
}