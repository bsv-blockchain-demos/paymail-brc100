'use client'
import React, { useState, useRef } from 'react'
import { PrivateKey, Transaction, ARC, P2PKH, Script } from '@bsv/sdk'

interface UTXO {
  txid: string;
  vout: number;
  satoshis: number;
  script: string;
}

interface PaymailResponse {
  outputs?: Array<{ satoshis: number; script: string }>;
  reference?: string;
  txid?: string;
  error?: string;
}

interface WocUtxo {
  tx_hash: string;
  tx_pos: number;
  value: number;
}

interface WocResponse {
  result?: WocUtxo[];
  script?: string;
}

const arc = new ARC('https://arc.taal.com', process.env.API_KEY)

// https://api.whatsonchain.com/v1/bsv/main/exchangerate
class WocClient {
    private api: string;
    private key: string | undefined;

    constructor() {
        this.api = 'https://api.whatsonchain.com/v1/bsv/main'
        this.key = process.env.API_KEY
    }

    async getJson(route: string): Promise<WocResponse> {
        return await (await fetch(this.api + route, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                // "Authorization": 'Bearer ' + this.key
            },
        })).json()
    }

    async get(route: string): Promise<string> {
        return await (await fetch(this.api + route, {
            method: 'GET',
            headers: {
                'Accept': 'plain/text',
                // "Authorization": 'Bearer ' + this.key
            },
        })).text()
    }

    async post(route: string, body: any): Promise<any> {
        return await (await fetch(this.api + route, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                // "Authorization": 'Bearer ' + this.key
            },
            body: JSON.stringify(body)
        })).json()
    }

    async getUtxos(address: string): Promise<UTXO[]> {
        console.log({ getUtxo: address })
        let confirmed: WocResponse = { result: [] }
        let unconfirmed: WocResponse = { result: [] }
        try {
            confirmed = await this.getJson(`/address/${address}/confirmed/unspent`)
        } catch (error) {
            console.log({ error })
        }
        try {
            unconfirmed = await this.getJson(`/address/${address}/unconfirmed/unspent`)
        } catch (error) {
            console.log({ error })
        }
        const combined: WocUtxo[] = []
        confirmed?.result?.map((utxo: WocUtxo) => combined.push(utxo))
        unconfirmed?.result?.map((utxo: WocUtxo) => combined.push(utxo))
        const script = confirmed?.script || unconfirmed?.script || ''
        const formatted: UTXO[] = combined.map((u: WocUtxo) => ({ txid: u.tx_hash, vout: u.tx_pos, satoshis: u.value, script }))
        console.log({ confirmed, unconfirmed, combined, formatted })
        return formatted
    }

    async getTx(txid: string): Promise<string> {
        return this.get(`/tx/${txid}/hex`)
    }

    async getMerklePath(txid: string): Promise<any> {
        return this.getJson(`/tx/${txid}/tsc`)
    }
}

const post = async (body: any): Promise<PaymailResponse> => {
    return await (await fetch('/api', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
        body: JSON.stringify(body)
    })).json()
}

const wc = new WocClient()

export default function Home() {
    const [error, setError] = useState('')
    const [paymail, setPaymail] = useState('')
    const [wif, setWif] = useState('')
    const [sats, setSats] = useState(0)
    const [txid, setTxid] = useState('')

    const checkPaymail = async () => {
        try {
            const paymail = paymailInput?.current?.value || ''
            const pki = await post({ paymail, method: 'pki' })
            console.log({ pki })
            setPaymail(paymail)
        } catch (error) {
            setError(String(error))
            console.log({ error })
        }
    }

    const sweepFunds = async () => {
        try {
            const w = wifInput?.current?.value || ''
            setWif(w)
            // app requests utxos at a specific address
            const privKey = PrivateKey.fromWif(w)
            const address = privKey.toAddress()
            const utxos = await wc.getUtxos(address)
            console.log({ utxos })
            const satoshis = utxos.reduce((a: number, b: UTXO) => a + b.satoshis, 0) - 10
            setSats(satoshis)
            console.log({ satoshis })

            const outputsResponse = await post({ paymail, method: 'outputs', data: { satoshis }})

            console.log({ outputsResponse })

            const outputs = outputsResponse.outputs ?? []

            const tx = new Transaction()
            const template = new P2PKH()
            await Promise.all(utxos.map(async utxo => {
                // gets each sourceTransaction in full
                const sourceOutputIndex = utxo.vout
                const rawtx = await wc.getTx(utxo.txid)
                console.log({ rawtx })
                const sourceTransaction = Transaction.fromHex(rawtx)
                tx.addInput({ sourceTransaction, sourceOutputIndex, unlockingScriptTemplate: template.unlock(privKey) })
                return true
            }))
            
            // gets a merkle path for each (later)
            
            // builds a new tx paying to a paymail as specified using a paymail client
            outputs.map((output: { satoshis: number; script: string }) => tx.addOutput({ satoshis: output.satoshis, lockingScript: Script.fromHex(output.script) }))

            await tx.sign()

            console.log('tx', tx.toHex())
            // sends that transaction to the paymail recipient
            const response = await post({ paymail, method: 'send', data: { hex: tx.toHex(), reference: outputsResponse?.reference }})
            console.log({ response })
            if (!!response.error) throw response.error

            // responds with txid
            setTxid(response.txid || '')
        } catch (error) {
            console.log({ error })
            setError(JSON.stringify(error ?? {}))
        }
    }

    // deploy

    const paymailInput = useRef<HTMLInputElement>(null)
    const wifInput = useRef<HTMLInputElement>(null)

    // console.log({ error, paymail, wif, txid })
    // L3PVGoUsQ1PEk2ydHA39qSKndSw92RBHommq283tDvatogHZwJHR

    if (error !== '') return <>
        <p>{error}</p>
    </>

    if (paymail === '' || paymail === undefined) return <>
        <p>1. Set your destination Paymail</p>
        <input ref={paymailInput} type='text' />
        <button onClick={checkPaymail}>
            Validate
        </button>
    </>

    if (wif === '') return <>
        <p>1. All funds will be swept to {paymail} ✅</p>
        <p>2. Scan or enter a private key.</p>
        <input ref={wifInput} type='text' />
        <button onClick={sweepFunds}>
            Sweep
        </button>
    </>

    if (txid === '') return <>
        <p>1. All funds will be swept to {paymail} ✅</p>
        <p>2. {wif} will be used to sign transaction ✅</p>
        <p>3. Sweeping...</p>
    </>

    return <>
        <p>1. All funds will be swept to {paymail} ✅</p>
        <p>2. {wif} will be used to sign transaction ✅</p>
        <p>3. Swept {sats.toLocaleString(['en'], { maximumFractionDigits: 0, minimumFractionDigits: 0 })} satoshis ✅</p>
        <p>4. Check transaction status: <a target="_BLANK" href={`https://whatsonchain.com/tx/${txid}`}>{txid}</a></p>
    </>
}