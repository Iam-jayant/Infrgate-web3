"use client"

import { useState, useEffect } from "react"
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from "wagmi"
import { CustomConnectButton } from "@/components/custom-connect-button"
import { parseEther, parseUnits } from "viem"
import { infrgateSubscriptionAbi } from "@/lib/abi"
import { erc20Abi } from "viem"
import { AnimatedNoise } from "@/components/animated-noise"
import { ScrambleTextOnHover } from "@/components/scramble-text"

const SUBSCRIPTION_CONTRACT = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000" // Should be set in .env.local
const USDT_CONTRACT = process.env.NEXT_PUBLIC_USDT_ADDRESS || "0xaBabc7Ddc03e501d190C676BF3d92ef0e6e87a3C"

export default function Dashboard() {
  const [mounted, setMounted] = useState(false)
  const { address, isConnected } = useAccount()
  const [status, setStatus] = useState<any>(null)
  const [loadingStatus, setLoadingStatus] = useState(false)

  // Hydration protection
  useEffect(() => {
    setMounted(true)
  }, [])

  // Fetch subscription status from the backend
  useEffect(() => {
    async function fetchStatus() {
      if (!address) return
      setLoadingStatus(true)
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
        const res = await fetch(`${apiUrl}/v1/web3/subscription/${address}`)
        if (res.ok) {
          const data = await res.json()
          setStatus(data)
        } else {
          setStatus(null)
        }
      } catch (err) {
        console.error("Failed to fetch status", err)
      } finally {
        setLoadingStatus(false)
      }
    }
    fetchStatus()
  }, [address])

  const { writeContractAsync: writeSubscribeBOT, isPending: isSubscribingBOT } = useWriteContract()
  const { writeContractAsync: writeApprove, isPending: isApproving } = useWriteContract()
  const { writeContractAsync: writeSubscribeUSDT, isPending: isSubscribingUSDT } = useWriteContract()
  
  const publicClient = usePublicClient()

  // 1-Click Native BOT Subscription
  const handleSubscribeBOT = async (tier: number, priceEther: string) => {
    try {
      const txHash = await writeSubscribeBOT({
        abi: infrgateSubscriptionAbi,
        address: SUBSCRIPTION_CONTRACT as `0x${string}`,
        functionName: "subscribeWithBOT",
        args: [tier],
        value: parseEther(priceEther),
      })
      alert("Transaction submitted! Waiting for confirmation...")
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: txHash })
      }
      alert("Transaction confirmed! Check your subscription status shortly.")
    } catch (err: any) {
      console.error(err)
      alert("Failed to subscribe: " + (err.shortMessage || err.message))
    }
  }

  // 2-Step USDT Subscription
  const handleSubscribeUSDT = async (tier: number, usdtAmount: string) => {
    try {
      const amount = parseUnits(usdtAmount, 6) // Assuming 6 decimals for USDT on BOT Chain

      // Step 1: Approve
      const approveHash = await writeApprove({
        abi: erc20Abi,
        address: USDT_CONTRACT as `0x${string}`,
        functionName: "approve",
        args: [SUBSCRIPTION_CONTRACT as `0x${string}`, amount],
      })
      
      alert("Approve transaction submitted. Please wait for it to confirm before the Subscribe popup appears...")
      
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: approveHash })
      }

      // Step 2: Subscribe
      const subHash = await writeSubscribeUSDT({
        abi: infrgateSubscriptionAbi,
        address: SUBSCRIPTION_CONTRACT as `0x${string}`,
        functionName: "subscribeWithUSDT",
        args: [tier],
      })
      
      alert("Subscribe transaction submitted! Waiting for confirmation...")
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash: subHash })
      }
      alert("Subscription confirmed! Your API keys will be provisioned in a few seconds.")
    } catch (err: any) {
      console.error(err)
      alert("Transaction failed: " + (err.shortMessage || err.message))
    }
  }

  if (!mounted) return null

  return (
    <main className="relative min-h-screen pt-32 px-6 md:px-28">
      <AnimatedNoise opacity={0.03} />

      <div className="absolute left-4 md:left-6 top-32">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground -rotate-90 origin-left block whitespace-nowrap">
          DASHBOARD
        </span>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-16 gap-6">
          <div>
            <h1 className="font-[var(--font-bebas)] text-5xl tracking-wide">
              Agent Control Plane
            </h1>
            <p className="font-mono text-sm text-muted-foreground mt-2">
              Manage your Web3 API keys and token quotas.
            </p>
          </div>
          <CustomConnectButton />
        </div>

        {!isConnected ? (
          <div className="border border-border/50 p-12 text-center">
            <h3 className="font-mono text-xl uppercase tracking-widest mb-4 text-muted-foreground">
              Wallet Disconnected
            </h3>
            <p className="font-mono text-sm text-muted-foreground">
              Please connect your BOT Chain compatible wallet to access your agent's API keys.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {loadingStatus ? (
              <div className="font-mono text-sm text-muted-foreground animate-pulse">
                Fetching on-chain status...
              </div>
            ) : status && status.is_active ? (
              <div className="border border-accent bg-accent/5 p-8">
                <h3 className="font-mono text-xl uppercase tracking-widest mb-6 text-accent">
                  Active Subscription
                </h3>
                <div className="grid grid-cols-2 gap-8 font-mono text-sm">
                  <div>
                    <span className="text-muted-foreground block mb-1">Plan</span>
                    <span className="uppercase text-foreground">{status.plan}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">API Key Prefix</span>
                    <span className="text-foreground">{status.api_key_prefix}****************</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Tokens Used</span>
                    <span className="text-foreground">{status.current_spend_cents}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Total Quota</span>
                    <span className="text-foreground">{status.token_quota}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Expires At</span>
                    <span className="text-foreground">{new Date(status.expires_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-border/50 p-8">
                <h3 className="font-mono text-xl uppercase tracking-widest mb-4">
                  No Active Plan
                </h3>
                <p className="font-mono text-sm text-muted-foreground mb-8">
                  Your agent requires a valid subscription. Select a tier below to provision your API key. (1-Click BOT Native payment recommended)
                </p>
                
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Standard Tier */}
                  <div className="border border-border/30 p-6">
                    <h4 className="font-mono text-lg uppercase tracking-widest mb-2">Standard</h4>
                    <p className="font-mono text-xs text-muted-foreground mb-6">1M Tokens / Month</p>
                    <div className="space-y-3">
                      <button 
                        onClick={() => handleSubscribeBOT(1, "1")}
                        disabled={isSubscribingBOT}
                        className="w-full bg-foreground text-background font-mono text-xs uppercase tracking-widest py-3 hover:opacity-90"
                      >
                        <ScrambleTextOnHover text="Pay 1 BOT (1-Click)" as="span" duration={0.4} />
                      </button>
                      <button 
                        onClick={() => handleSubscribeUSDT(1, "10")}
                        disabled={isApproving || isSubscribingUSDT}
                        className="w-full border border-border/50 text-foreground font-mono text-xs uppercase tracking-widest py-3 hover:border-foreground"
                      >
                        <ScrambleTextOnHover text="Pay 10 USDT" as="span" duration={0.4} />
                      </button>
                    </div>
                  </div>

                  {/* Enterprise Tier */}
                  <div className="border border-border/30 p-6">
                    <h4 className="font-mono text-lg uppercase tracking-widest mb-2 text-accent">Enterprise</h4>
                    <p className="font-mono text-xs text-muted-foreground mb-6">10M Tokens / Month</p>
                    <div className="space-y-3">
                      <button 
                        onClick={() => handleSubscribeBOT(2, "500")}
                        disabled={isSubscribingBOT}
                        className="w-full bg-accent text-background font-mono text-xs uppercase tracking-widest py-3 hover:opacity-90"
                      >
                        <ScrambleTextOnHover text="Pay 500 BOT (1-Click)" as="span" duration={0.4} />
                      </button>
                      <button 
                        onClick={() => handleSubscribeUSDT(2, "50")}
                        disabled={isApproving || isSubscribingUSDT}
                        className="w-full border border-accent/50 text-accent font-mono text-xs uppercase tracking-widest py-3 hover:border-accent"
                      >
                        <ScrambleTextOnHover text="Pay 50 USDT" as="span" duration={0.4} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
