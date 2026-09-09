"use client"

import { useConnect, useAccount, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { useState, useEffect } from 'react'
import { botchainTestnet } from '@/lib/wagmi-config'

export function CustomConnectButton() {
  const { connect, isPending } = useConnect()
  const { address, isConnected, chain } = useAccount()
  const { disconnect } = useDisconnect()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return <div className="h-10 w-32 bg-accent/10 animate-pulse border border-border" />

  if (isConnected) {
    return (
      <div className="flex items-center gap-4">
        <button 
          onClick={() => disconnect()} 
          className="border border-border/50 bg-background hover:bg-accent/10 font-mono text-xs uppercase tracking-widest px-6 py-3 transition-colors"
        >
          {address?.slice(0,6)}...{address?.slice(-4)} (Disconnect)
        </button>
      </div>
    )
  }

  return (
    <button 
      onClick={() => connect({ connector: injected() })}
      disabled={isPending}
      className="bg-foreground text-background hover:opacity-90 font-mono text-xs uppercase tracking-widest px-6 py-3 transition-opacity"
    >
      {isPending ? 'Connecting...' : 'Connect MetaMask'}
    </button>
  )
}
