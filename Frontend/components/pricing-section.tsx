"use client"

import { useRef } from "react"
import { BitmapChevron } from "@/components/bitmap-chevron"
import { AnimatedNoise } from "@/components/animated-noise"
import { ScrambleTextOnHover } from "@/components/scramble-text"
import Link from "next/link"

const tiers = [
  {
    name: "Standard",
    price: "1",
    token: "BOT",
    usdtPrice: "10 USDT",
    description: "Perfect for autonomous agents needing high-availability inference.",
    features: [
      "1,000,000 Tokens / Month",
      "Standard Priority Routing",
      "Access to all Base Models",
      "99.9% Uptime SLA",
    ],
  },
  {
    name: "Enterprise",
    price: "500",
    token: "BOT",
    usdtPrice: "50 USDT",
    description: "For high-volume agents requiring priority execution and support.",
    features: [
      "10,000,000 Tokens / Month",
      "High Priority Routing",
      "Early Access to New Models",
      "99.99% Uptime SLA",
      "Dedicated Slack Support",
    ],
    highlighted: true,
  },
]

export function PricingSection() {
  const sectionRef = useRef<HTMLElement>(null)

  return (
    <section ref={sectionRef} id="pricing" className="relative py-32 px-6 md:px-28 border-t border-border/30">
      <AnimatedNoise opacity={0.02} />
      
      <div className="absolute left-4 md:left-6 top-32">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground -rotate-90 origin-left block whitespace-nowrap">
          PRICING
        </span>
      </div>

      <div className="max-w-6xl mx-auto">
        <div className="mb-16">
          <h2 className="font-[var(--font-bebas)] text-4xl tracking-wide">
            On-Chain Inference Settlement
          </h2>
          <p className="mt-4 font-mono text-sm text-muted-foreground max-w-xl">
            Pay directly on BOT Chain using BOT or USDT. Connect your agent's wallet to instantly provision high-throughput API keys.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {tiers.map((tier) => (
            <div 
              key={tier.name}
              className={`relative border p-8 transition-colors duration-300 ${
                tier.highlighted 
                  ? "border-accent bg-accent/5" 
                  : "border-border/50 hover:border-border"
              }`}
            >
              <h3 className="font-mono text-xl uppercase tracking-widest mb-2">
                {tier.name}
              </h3>
              <p className="font-mono text-sm text-muted-foreground mb-8 min-h-[40px]">
                {tier.description}
              </p>
              
              <div className="mb-8">
                <span className="font-[var(--font-bebas)] text-5xl">
                  {tier.price}
                </span>
                <span className="font-mono text-sm text-muted-foreground ml-2 uppercase">
                  {tier.token} / mo
                </span>
                <div className="font-mono text-xs text-muted-foreground mt-1">
                  or {tier.usdtPrice} / mo
                </div>
              </div>

              <ul className="space-y-4 mb-12">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 font-mono text-sm">
                    <span className="text-accent mt-0.5">■</span>
                    <span className="text-muted-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Link 
                href="/app"
                className={`w-full group inline-flex items-center justify-between gap-3 border px-6 py-4 font-mono text-xs uppercase tracking-widest transition-all duration-200 ${
                  tier.highlighted
                    ? "border-accent bg-accent text-background hover:bg-transparent hover:text-accent"
                    : "border-border/50 hover:border-foreground"
                }`}
              >
                <ScrambleTextOnHover text="Connect Wallet" as="span" duration={0.6} />
                <BitmapChevron className={`transition-transform duration-[400ms] ease-in-out group-hover:translate-x-1 ${tier.highlighted ? "invert group-hover:invert-0" : ""}`} />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
