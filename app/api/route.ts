import { PaymailClient } from '@bsv/paymail'
import { PrivateKey, Transaction } from '@bsv/sdk'
import { NextRequest } from 'next/server'

interface RequestBody {
  paymail: string;
  method: string;
  data?: {
    satoshis?: number;
    hex?: string;
    reference?: string;
  };
}

const pmc = new PaymailClient()

export async function POST(req: NextRequest) {
    try {
        const body: RequestBody = await req.json()
        const { paymail, method, data } = body
        console.log({ paymail, method, data })
        
        const pk = PrivateKey.fromWif('L3PVGoUsQ1PEk2ydHA39qSKndSw92RBHommq283tDvatogHZwJHR')
        const publicKey = pk.toPublicKey()
        const tx = Transaction.fromHex(data?.hex || '')
        const metadata = {
            sender: 'sweep@sweep.xn--nda.network',
            pubkey: publicKey.toString(),
            signature: pmc.createP2PSignature(tx.id('hex'), pk),
            note: 'hello world'
        }
        
        let response: any
        switch (method) {
            case 'outputs':
                response = await pmc.getP2pPaymentDestination(paymail, data?.satoshis || 0)
                break
            case 'send':
                response = await pmc.sendTransactionP2P(paymail, data?.hex || '', data?.reference || '', metadata)
                break
            case 'pki':
            default:
                response = await pmc.getPki(paymail)
                break
        }

        return Response.json(response, { status: 200 })
    } catch (error) {
        console.log({ error })
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        return Response.json({ error: errorMessage }, { status: 400 })
    }
}