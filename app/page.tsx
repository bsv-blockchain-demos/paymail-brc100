'use client'
import React, { useState, useEffect } from 'react'
import { WalletClient, Utils, WalletProtocol, WalletInterface } from '@bsv/sdk'

interface RegistrationResponse {
  [key: string]: string;
}

interface TransactionRecord {
  beef: number[];
  txid: string;
  outputIndex: number;
  satoshis: number;
  script: string;
  publicKey: string;
  keyID: string;
  identityKey: string;
  alias: string;
  derivationPrefix: string;
  derivationSuffix: string;
  senderIdentityKey: string;
}

interface CollectResponse {
  transactions: TransactionRecord[]
}

interface ErrorResponse {
  error: string;
}

export default function Home() {
    const [alias, setAlias] = useState<string>('')
    const [loading, setLoading] = useState<boolean>(false)
    const [collecting, setCollecting] = useState<boolean>(false)
    const [success, setSuccess] = useState<boolean>(false)
    const [error, setError] = useState<string>('')
    const [status, setStatus] = useState<string>('')
    const [registeredAlias, setRegisteredAlias] = useState<string>('')
    const [aliases, setAliases] = useState<string[]>([])
    const [loadingAliases, setLoadingAliases] = useState<boolean>(false)
    const [aliasesError, setAliasesError] = useState<string>('')
    const [deletingAlias, setDeletingAlias] = useState<string>('')
    const [transactions, setTransactions] = useState<Array<{txid: string, satoshis: number, acknowledged: boolean, alias: string}>>([])
    const [loadingTransactions, setLoadingTransactions] = useState<boolean>(false)
    const [transactionsError, setTransactionsError] = useState<string>('')
    const [wallet, setWallet] = useState<WalletInterface | null>(null)
    const [walletAuthenticated, setWalletAuthenticated] = useState<boolean>(false)
    const [walletError, setWalletError] = useState<string>('')

    // Get host from environment or use default
    const host = process.env.NEXT_PUBLIC_HOST || 'paymail-bridge.example.com'

    // Helper function to add timeout to promises
    const withTimeout = (promise: Promise<unknown>, timeoutMs: number) => {
        return Promise.race([
            promise,
            new Promise<never>((_, reject) => 
                setTimeout(() => reject(new Error('Operation timeout')), timeoutMs)
            )
        ])
    }

    // Initialize wallet and check authentication
    useEffect(() => {
        const initializeWallet = async () => {
            try {
                const walletClient = new WalletClient()
                setWallet(walletClient)
                
                // Check if wallet is authenticated with timeout
                const { authenticated } = await Promise.race([
                    walletClient.isAuthenticated(),
                    new Promise<{ authenticated: boolean }>((resolve, reject) => 
                        setTimeout(() => resolve({ authenticated: false }), 3000)
                    )
                ])
                setWalletAuthenticated(authenticated)
                
                if (authenticated) {
                    // Load aliases and transactions if wallet is authenticated
                    fetchAliases()
                    fetchTransactions()
                } else {
                    setWalletError('Wallet is not authenticated')
                }
            } catch (error) {
                console.error('Wallet initialization error:', error)
                setWalletError('Wallet is not available or connection timed out')
                setWallet(null)
                setWalletAuthenticated(false)
            }
        }

        initializeWallet()
    }, [])

    // Load aliases and transactions when wallet becomes available
    useEffect(() => {
        if (wallet && walletAuthenticated) {
            fetchAliases()
            fetchTransactions()
        }
    }, [wallet, walletAuthenticated])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!wallet) {
            setError('Wallet is not available')
            return
        }
        if (!alias.trim()) {
            setError('Please enter an alias')
            return
        }

        // Basic alias validation
        if (!/^[a-zA-Z0-9_-]+$/.test(alias)) {
            setError('Alias can only contain letters, numbers, hyphens, and underscores')
            return
        }

        setLoading(true)
        setError('')
        setSuccess(false)

        try {
            const keyID = new Date().toISOString()
            const data = Utils.toArray(alias, 'utf8')
            const protocolID = [0, 'paymail alias'] as WalletProtocol
            const { signature } = await wallet.createSignature({
                counterparty: 'anyone',
                keyID,
                protocolID,
                data
            })
            const { publicKey: identityKey } = await wallet.getPublicKey({
                identityKey: true
            })
            const response = await fetch('/api/brc-100/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data,
                    identityKey,
                    protocolID,
                    keyID,
                    signature
                })
            })

            if (response.ok) {
                const result: RegistrationResponse = await response.json()
                setSuccess(true)
                setRegisteredAlias(alias.trim())
                setAlias('')
                // Refresh aliases list to include the new one
                fetchAliases()
            } else {
                const errorData: ErrorResponse = await response.json()
                setError(errorData.error || 'Registration failed')
            }
        } catch (err) {
            setError('Network error. Please try again.')
            console.error('Registration error:', err)
        }
        
        setLoading(false)
    }

    const handleCollect = async (e: React.FormEvent) => {
        try {
            e.preventDefault()
            if (!wallet) {
                setError('Wallet is not available')
                return
            }
            setCollecting(true)
            setError('')
            setStatus('Checking inbound transactions...')
            const keyID = new Date().toISOString()
            const data = Utils.toArray('please give me my transactions', 'utf8')
            const protocolID = [0, 'paymail collect'] as WalletProtocol
            const { publicKey: identityKey } = await wallet.getPublicKey({
                identityKey: true
            })
            const { signature } = await wallet.createSignature({
                counterparty: 'anyone',
                keyID,
                protocolID,
                data
            })
            const response = await fetch('/api/brc-100/collect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data,
                    identityKey,
                    protocolID,
                    keyID,
                    signature
                })
            })

            if (response.ok) {
                const result: CollectResponse = await response.json()

                if (result.transactions.length === 0) {
                    setStatus('No transactions found')
                    return
                }

                result.transactions.forEach(async t => {
                    setStatus('Sending tx to your wallet')
                    console.log({t})
                    try {
                        const { accepted } = await wallet.internalizeAction({
                            tx: t.beef,
                            description: 'collect paymail transactions',
                            labels: ['paymail'],
                            outputs: [
                                {
                                    protocol: 'wallet payment',
                                    outputIndex: t.outputIndex,
                                    paymentRemittance: {
                                        derivationPrefix: t.derivationPrefix,
                                        derivationSuffix: t.derivationSuffix,
                                        senderIdentityKey: t.senderIdentityKey,
                                    }
                                }
                            ]
                        })
                        if (accepted) {
                            const ackResponse = await fetch('/api/brc-100/ack', {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    txids: [t.txid]
                                })
                            })
            
                            if (!ackResponse.ok) {
                                setError('Failed to acknowledge transactions')
                                return
                            }
                            setStatus('Transaction ' + t.txid.slice(0, 8) + '... processed')
                        } else {
                            setStatus('Error processing transaction ' + t.txid.slice(0, 8) + '...')
                        }
                    } catch (error) {
                        console.error('Error internalizing action:', error)
                        setStatus('Error processing transaction ' + t.txid.slice(0, 8) + '...')
                    }
                })
                
                // Refresh transactions list after collection
                fetchTransactions()
                setAlias('')
            } else {
                const errorData: ErrorResponse = await response.json()
                setStatus(errorData.error || 'Registration failed')
            }
            
        } catch (error) {
            console.error('Error collecting payment:', error)
            setStatus('Failed to collect payment. Please try again.')
        } finally {
            setCollecting(false)
        }
    }

    const resetForm = () => {
        setSuccess(false)
        setError('')
        setRegisteredAlias('')
    }

    const fetchAliases = async () => {
        try {
            if (!wallet) {
                setError('Wallet is not available')
                return
            }
            setLoadingAliases(true)
            setAliasesError('')
            
            const keyID = new Date().toISOString()
            const data = Utils.toArray('list my aliases', 'utf8')
            const protocolID = [0, 'paymail list aliases'] as WalletProtocol
            const { publicKey: identityKey } = await wallet.getPublicKey({
                identityKey: true
            })
            const { signature } = await wallet.createSignature({
                counterparty: 'anyone',
                keyID,
                protocolID,
                data
            })
            
            const response = await fetch('/api/brc-100/aliases', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data,
                    identityKey,
                    protocolID,
                    keyID,
                    signature
                })
            })
            
            if (response.ok) {
                const result = await response.json()
                setAliases(result.aliases || [])
            } else {
                const errorData = await response.json()
                setAliasesError(errorData.error || 'Failed to fetch aliases')
            }
        } catch (err) {
            setAliasesError('Network error. Please try again.')
            console.error('Fetch aliases error:', err)
        } finally {
            setLoadingAliases(false)
        }
    }

    const deleteAlias = async (aliasToDelete: string) => {
        // Confirm deletion
        if (!confirm(`Are you sure you want to delete the alias "${aliasToDelete}@${host}"? This action cannot be undone.`)) {
            return
        }
        
        try {
            if (!wallet) {
                setError('Wallet is not available')
                return
            }
            setDeletingAlias(aliasToDelete)
            setAliasesError('')
            
            const keyID = new Date().toISOString()
            const data = Utils.toArray(`delete alias ${aliasToDelete}`, 'utf8')
            const protocolID = [0, 'paymail delete alias'] as WalletProtocol
            const { publicKey: identityKey } = await wallet.getPublicKey({
                identityKey: true
            })
            const { signature } = await wallet.createSignature({
                counterparty: 'anyone',
                keyID,
                protocolID,
                data
            })
            
            const response = await fetch('/api/brc-100/delete-alias', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data,
                    identityKey,
                    protocolID,
                    keyID,
                    signature,
                    alias: aliasToDelete
                })
            })
            
            if (response.ok) {
                // Remove the deleted alias from the local state
                setAliases(prev => prev.filter(alias => alias !== aliasToDelete))
            } else {
                const errorData = await response.json()
                setAliasesError(errorData.error || 'Failed to delete alias')
            }
        } catch (err) {
            setAliasesError('Network error. Please try again.')
            console.error('Delete alias error:', err)
        } finally {
            setDeletingAlias('')
        }
    }

    const fetchTransactions = async () => {
        try {
            if (!wallet) {
                setError('Wallet is not available')
                return
            }
            setLoadingTransactions(true)
            setTransactionsError('')
            
            const keyID = new Date().toISOString()
            const data = Utils.toArray('list my transactions', 'utf8')
            const protocolID = [0, 'paymail list transactions'] as WalletProtocol
            const { publicKey: identityKey } = await wallet.getPublicKey({
                identityKey: true
            })
            const { signature } = await wallet.createSignature({
                counterparty: 'anyone',
                keyID,
                protocolID,
                data
            })
            
            const response = await fetch('/api/brc-100/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    data,
                    identityKey,
                    protocolID,
                    keyID,
                    signature
                })
            })
            
            if (response.ok) {
                const result = await response.json()
                setTransactions(result.transactions || [])
            } else {
                const errorData = await response.json()
                setTransactionsError(errorData.error || 'Failed to fetch transactions')
            }
        } catch (err) {
            setTransactionsError('Network error. Please try again.')
            console.error('Fetch transactions error:', err)
        } finally {
            setLoadingTransactions(false)
        }
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-50 to-cyan-100 flex items-center justify-center p-6">
                <div className="w-full max-w-lg">
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                        {/* Success Header */}
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-8 text-center">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h1 className="text-3xl font-bold text-white mb-2">Success! 🎉</h1>
                            <p className="text-green-100 text-lg">Your paymail is ready to use</p>
                        </div>
                        
                        {/* Success Content */}
                        <div className="p-8 space-y-6">
                            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
                                <div className="text-center">
                                    <p className="text-sm text-gray-600 mb-3">Your new paymail address:</p>
                                    <div className="bg-white rounded-lg p-4 border-2 border-dashed border-blue-300 shadow-sm">
                                        <code className="text-xl font-mono font-bold text-blue-700">
                                            {registeredAlias}@{host}
                                        </code>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-4">
                                <div className="flex items-start space-x-3">
                                    <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                    <div>
                                        <h4 className="font-semibold text-amber-800 text-sm">Important Reminder</h4>
                                        <p className="text-amber-700 text-sm mt-1">
                                            Return to this app to collect your inbound BSV payments. Your funds will be held securely until you retrieve them.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button 
                                    onClick={resetForm}
                                    className="w-full px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                                >
                                    Register Another
                                </button>
                                <button 
                                    className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all font-medium shadow-lg"
                                    onClick={() => window.location.reload()}
                                >
                                    💰 Collect Payments
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-50 to-cyan-100 flex items-center justify-center p-6">
            <div className="w-full max-w-4xl">
                {/* Header Section */}
                <div className="text-center mb-8">
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-cyan-700 bg-clip-text text-transparent p-5">
                        Paymail Bridge
                    </h1>
                    <p className="text-gray-600 text-xl font-medium">
                        Connect your BSV payments to Metanet Wallet
                    </p>
                </div>

                {/* Two-Step Process */}
                <div className="grid md:grid-cols-2 gap-8">
                    {/* Step 1: Register Alias */}
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                        {/* Step 1 Header */}
                        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 text-center relative">
                            <div className="absolute top-4 left-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold text-sm">1</span>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Register Your Alias</h2>
                            <p className="text-blue-100">One-time setup for your paymail address</p>
                        </div>
                        
                        {/* Step 1 Content */}
                        <div className="p-8">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-3">
                                    <label htmlFor="alias" className="block text-sm font-semibold text-gray-700">
                                        Create Alias
                                    </label>
                                    <div className="relative">
                                        <input
                                            id="alias"
                                            type="text"
                                            value={alias}
                                            onChange={(e) => setAlias(e.target.value)}
                                            placeholder="alias"
                                            disabled={loading}
                                            className="w-full px-4 py-4 pr-40 text-lg border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                            autoComplete="off"
                                        />
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
                                            <span className="text-gray-500 font-semibold text-lg">@{host}</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-500 font-medium">
                                        ✓ Letters, numbers, hyphens, and underscores only
                                    </p>
                                </div>

                                {error && (
                                    <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-4">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                            <p className="text-red-800 text-sm font-semibold">{error}</p>
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || !alias.trim()}
                                    className="w-full py-4 text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:from-blue-700 hover:to-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg transform hover:scale-105"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3 inline-block"></div>
                                            Registering...
                                        </>
                                    ) : (
                                        <>
                                            Register Alias →
                                        </>
                                    )}
                                </button>
                            </form>

                            {/* Your Existing Aliases */}
                            {aliases.length > 0 && (
                                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
                                    <h4 className="font-semibold text-blue-800 text-sm mb-3">Your Existing Aliases:</h4>
                                    <div className="space-y-2">
                                        {aliases.map((aliasName, index) => (
                                            <div key={index} className="bg-white rounded-lg p-3 border border-blue-200 shadow-sm flex items-center justify-between">
                                                <code className="text-blue-700 font-mono font-semibold text-sm">
                                                    {aliasName}@{host}
                                                </code>
                                                <button
                                                    onClick={() => deleteAlias(aliasName)}
                                                    disabled={deletingAlias === aliasName}
                                                    className="ml-3 px-3 py-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded-md hover:bg-red-100 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    title={`Delete ${aliasName}@${host}`}
                                                >
                                                    {deletingAlias === aliasName ? (
                                                        <>
                                                            <div className="animate-spin rounded-full h-3 w-3 border-b border-red-600 inline-block mr-1"></div>
                                                            Deleting...
                                                        </>
                                                    ) : (
                                                        'Delete'
                                                    )}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Aliases Error */}
                            {aliasesError && (
                                <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-4">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                        <p className="text-red-800 text-sm font-semibold">{aliasesError}</p>
                                    </div>
                                </div>
                            )}

                            {/* Loading Aliases */}
                            {loadingAliases && (
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
                                    <div className="flex items-center justify-center space-x-2">
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                        <p className="text-blue-800 text-sm font-semibold">Loading your aliases...</p>
                                    </div>
                                </div>
                            )}

                            {/* Step 1 Info */}
                            <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-blue-600 font-bold text-sm">ℹ️</span>
                                    </div>
                                    <div>
                                        <p className="text-blue-800 text-sm font-semibold">First Time Setup</p>
                                        <p className="text-blue-700 text-xs">You only need to do this once to create your paymail address</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Collect Payments */}
                    <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                        {/* Step 2 Header */}
                        <div className="bg-gradient-to-r from-emerald-600 to-green-600 p-6 text-center relative">
                            <div className="absolute top-4 left-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                                <span className="text-white font-bold text-sm">2</span>
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Collect Payments</h2>
                            <p className="text-emerald-100">Retrieve BSV sent to your paymail address</p>
                        </div>
                        
                        {/* Step 2 Content */}
                        <div className="p-8">
                            <div className="space-y-6">
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-gradient-to-r from-emerald-100 to-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <span className="text-3xl">💰</span>
                                    </div>
                                    <p className="text-gray-600 text-sm mb-6">
                                        Click below to check for and collect any BSV payments sent to your paymail address
                                    </p>
                                </div>

                                <button
                                    onClick={handleCollect}
                                    disabled={collecting}
                                    className="w-full py-4 text-xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl hover:from-emerald-700 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg transform hover:scale-105"
                                >
                                    {collecting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3 inline-block"></div>
                                            Collecting Payments...
                                        </>
                                    ) : (
                                        <>
                                            💰 Collect Payments
                                        </>
                                    )}
                                </button>

                                {/* Collection Status */}
                                {status && (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                                        <div className="space-y-3">
                                            <div className="flex items-center space-x-3">
                                                <div className="animate-pulse w-3 h-3 bg-blue-500 rounded-full delay-300"></div>
                                                <span className="text-blue-800 text-sm font-medium">{status}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Transaction History */}
                                {transactions.length > 0 && (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                                        <h4 className="font-semibold text-emerald-800 text-sm mb-3">Your Transaction History:</h4>
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {transactions.map((tx, index) => (
                                                <div 
                                                    key={index} 
                                                    className="bg-white rounded-lg p-3 border border-emerald-200 shadow-sm hover:bg-emerald-50 hover:border-emerald-300 cursor-pointer transition-colors"
                                                    onClick={() => window.open(`https://whatsonchain.com/tx/${tx.txid}`, '_blank')}
                                                    title={`View transaction ${tx.txid} on WhatsOnChain`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center space-x-2 mb-1">
                                                                <code className="text-emerald-700 font-mono font-semibold text-xs truncate">
                                                                    {tx.txid.length > 16 ? `${tx.txid.substring(0, 16)}...` : tx.txid}
                                                                </code>
                                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                                                                    tx.acknowledged 
                                                                        ? 'bg-green-100 text-green-800' 
                                                                        : 'bg-yellow-100 text-yellow-800'
                                                                }`}>
                                                                    {tx.acknowledged ? 'Collected' : 'Pending'}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-gray-600">
                                                                Alias: {tx.alias}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-emerald-700 font-bold text-sm">
                                                                {tx.satoshis.toLocaleString()} sats
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Transactions Error */}
                                {transactionsError && (
                                    <div className="bg-red-50 border-l-4 border-red-400 rounded-lg p-4">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                            <p className="text-red-800 text-sm font-semibold">{transactionsError}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Loading Transactions */}
                                {loadingTransactions && (
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                                        <div className="flex items-center justify-center space-x-2">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                                            <p className="text-emerald-800 text-sm font-semibold">Loading transactions...</p>
                                        </div>
                                    </div>
                                )}

                                {/* No Transactions Message */}
                                {!loadingTransactions && transactions.length === 0 && !transactionsError && (
                                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                                        <p className="text-gray-600 text-sm">No transactions found. Share your paymail address to receive payments!</p>
                                    </div>
                                )}

                                {/* Step 2 Info */}
                                <div className="p-4 bg-emerald-50 rounded-xl">
                                    <div className="flex items-center space-x-3">
                                        <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                                            <span className="text-emerald-600 font-bold text-sm">🔄</span>
                                        </div>
                                        <div>
                                            <p className="text-emerald-800 text-sm font-semibold">Recurring Action</p>
                                            <p className="text-emerald-700 text-xs">Come back anytime to collect new payments</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* How it works - moved to bottom */}
                <div className="mt-8 bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">How it works</h3>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="text-center">
                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="text-blue-600 font-bold">1</span>
                            </div>
                            <h4 className="font-semibold text-gray-800 mb-2">Register & View</h4>
                            <p className="text-gray-600 text-sm">Create aliases and see all your paymail addresses</p>
                        </div>
                        <div className="text-center">
                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                <span className="text-green-600 font-bold">2</span>
                            </div>
                            <h4 className="font-semibold text-gray-800 mb-2">Share & Collect</h4>
                            <p className="text-gray-600 text-sm">Give out your addresses and collect BSV payments</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
