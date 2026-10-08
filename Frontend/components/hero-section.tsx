"use client"

import { useEffect, useRef } from "react"
import { ScrambleTextOnHover } from "@/components/scramble-text"
import { SplitFlapText, SplitFlapMuteToggle, SplitFlapAudioProvider } from "@/components/split-flap-text"
import { AnimatedNoise } from "@/components/animated-noise"
import { BitmapChevron } from "@/components/bitmap-chevron"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sectionRef.current || !contentRef.current) return

    const ctx = gsap.context(() => {
      gsap.to(contentRef.current, {
        y: -100,
        opacity: 0,
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
        },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} id="hero" className="relative min-h-screen flex items-center pl-6 md:pl-28 pr-6 md:pr-12">
      <AnimatedNoise opacity={0.03} />

      {/* Left vertical labels */}
      <div className="absolute left-4 md:left-6 top-1/2 -translate-y-1/2">
        <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground -rotate-90 origin-left block whitespace-nowrap">
          SIGNAL
        </span>
      </div>

      {/* Main content */}
      <div ref={contentRef} className="flex-1 w-full">
        <SplitFlapAudioProvider>
          <div className="relative">
            <SplitFlapText text="INFRGATE" speed={80} />
            <div className="mt-4">
              <SplitFlapMuteToggle />
            </div>
          </div>
        </SplitFlapAudioProvider>

        <h2 className="font-[var(--font-bebas)] text-muted-foreground/60 text-[clamp(1rem,3vw,2rem)] mt-4 tracking-wide">
          Decentralized Inference Settlement Gateway
        </h2>
        


        <p className="mt-8 max-w-md font-mono text-sm text-muted-foreground leading-relaxed">
          High-Availability Multi-Model AI Routing for BOT Chain Agents. Guarantee reliability across LLM providers with zero-downtime failover, rate limit protection, and token spend caps.
        </p>

        <div className="mt-16 flex flex-wrap items-center gap-6">
          <a
            href="/app"
            className="group inline-flex items-center gap-3 border border-foreground/20 px-6 py-3 font-mono text-xs uppercase tracking-widest text-foreground hover:border-accent hover:text-accent transition-all duration-200"
          >
            <ScrambleTextOnHover text="Open Dashboard" as="span" duration={0.6} />
            <BitmapChevron className="transition-transform duration-[400ms] ease-in-out group-hover:rotate-45" />
          </a>

          <a
            href="/demo"
            className="group inline-flex items-center gap-3 border border-accent/30 bg-accent/5 px-6 py-3 font-mono text-xs uppercase tracking-widest text-accent hover:bg-accent/10 transition-all duration-200"
          >
            <ScrambleTextOnHover text="Try Demo" as="span" duration={0.6} />
            <BitmapChevron className="transition-transform duration-[400ms] ease-in-out group-hover:rotate-45" />
          </a>
          
          <div className="flex items-center gap-2 border border-border/50 bg-muted/20 px-4 py-3">
            <span className="font-mono text-xs text-muted-foreground">$</span>
            <code className="font-mono text-xs text-foreground">npm i @infrgate/botchain-sdk</code>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 border border-border/50 bg-muted/10 px-4 py-2 hover:border-accent/30 transition-colors duration-300 shadow-sm shadow-black/10">
            <a href="https://botchain.ai" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 group border-b sm:border-b-0 sm:border-r border-border/50 pb-2 sm:pb-0 sm:pr-4">
              <img src="/icon_title_logo.png" alt="BOT Chain" className="h-7 w-auto object-contain filter drop-shadow-sm group-hover:scale-105 transition-transform" />
              <div className="flex flex-col">
                <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground group-hover:text-accent transition-colors">Powered by</span>
                <span className="font-mono text-xs text-foreground group-hover:text-accent transition-colors">BOT Chain</span>
              </div>
            </a>
            <a href="https://scan.botchain.ai/address/0xd4Ec81e92cD14a60d0F497eEcC9aDF320f6C0D6b" target="_blank" rel="noopener noreferrer" className="flex flex-col group sm:pl-2 pt-1 sm:pt-0">
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground group-hover:text-accent transition-colors">Verified Contract</span>
              <code className="font-mono text-[11px] text-foreground/80 group-hover:text-accent transition-colors">0xd4Ec81...C0D6b</code>
            </a>
          </div>
        </div>
      </div>

      {/* Floating info tag */}
      <div className="absolute bottom-8 right-8 md:bottom-12 md:right-12">
        <div className="border border-border px-4 py-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          v.01 / Enterprise Ready
        </div>
      </div>
    </section>
  )
}
