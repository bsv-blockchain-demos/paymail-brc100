'use client'
import React, { useState } from 'react'
import { WalletClient, Utils, WalletProtocol } from '@bsv/sdk'

interface RegistrationResponse {
  [key: string]: string;
}

interface ErrorResponse {
  error: string;
}

export default function Home() {
    const [alias, setAlias] = useState<string>('')
    const [loading, setLoading] = useState<boolean>(false)
    const [success, setSuccess] = useState<boolean>(false)
    const [error, setError] = useState<string>('')
    const [registeredAlias, setRegisteredAlias] = useState<string>('')

    // Get host from environment or use default
    const host = process.env.NEXT_PUBLIC_HOST || 'paymail-bridge.example.com'

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        
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
            const wallet = new WalletClient()
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

    const resetForm = () => {
        setSuccess(false)
        setError('')
        setRegisteredAlias('')
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
            <div className="w-full max-w-lg">
                {/* Header Section */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-full mb-6 shadow-xl">
                        <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                    </div>
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-cyan-700 bg-clip-text text-transparent mb-3">
                        Paymail Bridge
                    </h1>
                    <p className="text-gray-600 text-xl font-medium">
                        Connect your BSV payments to Metanet Wallet
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
                    {/* Card Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-6 text-center">
                        <h2 className="text-2xl font-bold text-white mb-2">Register Your Alias</h2>
                        <p className="text-blue-100">Create a memorable paymail address for receiving BSV payments</p>
                    </div>
                    
                    {/* Card Content */}
                    <div className="p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-3">
                                <label htmlFor="alias" className="block text-sm font-semibold text-gray-700">
                                    Choose Your Alias
                                </label>
                                <div className="relative">
                                    <input
                                        id="alias"
                                        type="text"
                                        value={alias}
                                        onChange={(e) => setAlias(e.target.value)}
                                        placeholder="your-alias"
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

                        {/* How it works */}
                        <div className="mt-8 pt-6 border-t border-gray-200">
                            <h3 className="text-sm font-semibold text-gray-900 mb-4 text-center">How it works</h3>
                            <div className="space-y-3">
                                <div className="flex items-center space-x-3 text-sm">
                                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-blue-600 font-semibold text-xs">1</span>
                                    </div>
                                    <span className="text-gray-600">Register your preferred alias</span>
                                </div>
                                <div className="flex items-center space-x-3 text-sm">
                                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-green-600 font-semibold text-xs">2</span>
                                    </div>
                                    <span className="text-gray-600">Share {alias || 'your-alias'}@{host} to receive BSV</span>
                                </div>
                                <div className="flex items-center space-x-3 text-sm">
                                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-purple-600 font-semibold text-xs">3</span>
                                    </div>
                                    <span className="text-gray-600">Return here to collect your payments</span>
                                </div>
                            </div>
                        </div>

                        {/* Benefits */}
                        <div className="mt-6 grid grid-cols-3 gap-4">
                            <div className="text-center">
                                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                                    <span className="text-blue-600 font-bold">⚡</span>
                                </div>
                                <p className="text-xs text-gray-600 font-medium">Instant</p>
                            </div>
                            <div className="text-center">
                                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                                    <span className="text-green-600 font-bold">🔒</span>
                                </div>
                                <p className="text-xs text-gray-600 font-medium">Secure</p>
                            </div>
                            <div className="text-center">
                                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                                    <span className="text-purple-600 font-bold">✨</span>
                                </div>
                                <p className="text-xs text-gray-600 font-medium">Simple</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
