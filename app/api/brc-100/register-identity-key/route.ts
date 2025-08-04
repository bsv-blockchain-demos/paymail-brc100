import { NextRequest } from 'next/server'
import { MongoClient } from 'mongodb'
import { PublicKey } from '@bsv/sdk'
import { dbc } from '@/lib/db'

export async function POST(request: NextRequest) {
    try {
        const { identityKey } = await request.json()
        
        if (!identityKey) {
            return Response.json({ error: 'Identity key is required' }, { status: 400 })
        }

        // Validate the identity key format
        let publicKey: PublicKey
        try {
            publicKey = PublicKey.fromString(identityKey)
        } catch (error) {
            return Response.json({ error: 'Invalid identity key format' }, { status: 400 })
        }

        // Generate alias from public key address
        const alias = publicKey.toAddress()

        const aliases = await dbc('aliases')

        // Check if alias already exists
        const existingAlias = await aliases.findOne({ alias })
        if (existingAlias) {
            return Response.json({ error: 'This identity key is already registered' }, { status: 400 })
        }

        // Insert new alias
        await aliases.insertOne({
            alias,
            identityKey,
            createdAt: new Date()
        })

        return Response.json({ 
            success: true, 
            alias,
            paymail: `${alias}@${process.env.NEXT_PUBLIC_HOST || 'paymail-bridge.example.com'}`
        })

    } catch (error) {
        console.error('Registration error:', error)
        return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
}
