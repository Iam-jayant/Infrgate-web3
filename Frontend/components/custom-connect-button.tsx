"use client"

import { ConnectButton } from '@rainbow-me/rainbowkit'

export function CustomConnectButton() {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        authenticationStatus,
        mounted,
      }) => {
        const ready = mounted && authenticationStatus !== 'loading'
        const connected =
          ready &&
          account &&
          chain &&
          (!authenticationStatus ||
            authenticationStatus === 'authenticated')

        if (!ready) {
          return (
            <div
              className="h-10 w-32 bg-accent/10 animate-pulse border border-border"
              aria-hidden={true}
            />
          )
        }

        if (!connected) {
          return (
            <button
              onClick={openConnectModal}
              type="button"
              className="bg-foreground text-background hover:opacity-90 font-mono text-xs uppercase tracking-widest px-6 py-3 transition-opacity"
            >
              Connect Wallet
            </button>
          )
        }

        if (chain.unsupported) {
          return (
            <button
              onClick={openChainModal}
              type="button"
              className="bg-destructive text-destructive-foreground hover:opacity-90 font-mono text-xs uppercase tracking-widest px-6 py-3 transition-opacity"
            >
              Wrong network
            </button>
          )
        }

        return (
          <div className="flex items-center gap-4">
            <button
              onClick={openAccountModal}
              type="button"
              className="border border-border/50 bg-background hover:bg-accent/10 font-mono text-xs uppercase tracking-widest px-6 py-3 transition-colors"
            >
              {account.displayName}
            </button>
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}
