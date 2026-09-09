"use client"

import { useState, useRef, useEffect } from "react"
import { SideNav } from "@/components/side-nav"

export default function DemoPage() {
  const [apiKey, setApiKey] = useState("")
  const [messages, setMessages] = useState<{role: string, content: string}[]>([])
  const [input, setInput] = useState("")
  const [traceLogs, setTraceLogs] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, traceLogs])

  const addTrace = (log: string) => {
    setTraceLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${log}`])
  }

  const handleSend = async () => {
    if (!input.trim() || !apiKey.trim()) return

    const userMessage = { role: "user", content: input }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    
    addTrace("Initiating request to InfrGate Gateway...")
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      addTrace(`POST ${apiUrl}/v1/chat/completions`)
      
      const payload = {
        model: "gemini-2.5-flash",
        messages: [...messages, userMessage],
        stream: true,
        max_tokens: 1024,
      }
      
      const res = await fetch(`${apiUrl}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errorText = await res.text()
        addTrace(`Error: HTTP ${res.status} - ${errorText}`)
        setMessages(prev => [...prev, { role: "system", content: `Error: ${res.status} - ${errorText}` }])
        setIsLoading(false)
        return
      }

      const reader = res.body?.getReader()
      const decoder = new TextDecoder("utf-8")
      let done = false
      let buffer = ""
      
      addTrace("Streaming response received. Processing chunks...")
      
      setMessages(prev => [...prev, { role: "assistant", content: "" }])
      
      while (reader && !done) {
        const { value, done: readerDone } = await reader.read()
        done = readerDone
        if (value) {
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ""
          
          for (const line of lines) {
            if (line.trim().startsWith('data: ') && line.trim() !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.trim().slice(6))
                if (data.error) {
                   addTrace(`Gateway Error: ${data.error.message}`)
                   break
                }
                const delta = data.choices?.[0]?.delta?.content || ""
                if (delta) {
                  setMessages(prev => {
                    const newMessages = [...prev]
                    newMessages[newMessages.length - 1].content += delta
                    return newMessages
                  })
                }
              } catch (e) {
                // Ignore parse errors for incomplete chunks
              }
            }
          }
        }
      }
      
      addTrace("Request completed successfully.")
      
    } catch (err: any) {
      addTrace(`Network Error: ${err.message}`)
      setMessages(prev => [...prev, { role: "system", content: `Network Error: ${err.message}` }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen bg-background text-foreground selection:bg-accent selection:text-background">
      <SideNav />
      <div className="grid-bg fixed inset-0 opacity-20 pointer-events-none" aria-hidden="true" />
      
      <div className="relative z-10 flex min-h-screen pt-24 pb-12 px-6 md:px-12 max-w-7xl mx-auto gap-8">
        
        {/* Left Side - Chat UI */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border border-border/50 bg-background/50 backdrop-blur-md p-4 gap-4">
            <h1 className="font-mono text-xl font-bold uppercase tracking-widest text-foreground">InfrGate</h1>
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center w-full sm:w-auto">
              <input
                type="password"
                placeholder="Paste API Key (sk-infr_...)"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-transparent border border-border/50 px-4 py-2 font-mono text-xs text-foreground focus:outline-none focus:border-accent flex-1 sm:w-64"
              />
              <select className="bg-transparent border border-border/50 px-4 py-2 font-mono text-xs text-foreground focus:outline-none focus:border-accent cursor-pointer">
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              </select>
            </div>
          </div>

          <div className="bg-orange-950/30 border border-orange-500/50 p-4 text-orange-500 text-sm font-mono">
            <span className="font-bold mr-2">!</span> 
            Note: Only <strong className="font-bold">Gemini 2.5 Flash</strong> is fully configured for this demo. Other models may not respond.
          </div>

          <div className="flex-1 border border-border/50 bg-background/30 backdrop-blur-md p-6 overflow-y-auto flex flex-col gap-4 font-mono text-sm min-h-[400px]">
            {messages.length === 0 ? (
              <div className="border border-border/30 bg-background/50 p-6 text-muted-foreground max-w-2xl">
                Welcome to the InfrGate AI Gateway Demo! Paste your Demo Tenant API Key above. Just send a message to see the gateway route your request, enforce rate limits, and stream the response back.
              </div>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`p-4 max-w-[80%] whitespace-pre-wrap break-words ${msg.role === 'user' ? 'bg-accent/10 border border-accent/30 text-foreground' : msg.role === 'system' ? 'bg-red-950/30 border border-red-500/30 text-red-400' : 'bg-background/80 border border-border/50 text-foreground'}`}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="flex flex-col sm:flex-row gap-4 border border-border/50 bg-background/50 p-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type a message..."
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground font-mono text-sm focus:outline-none"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim() || !apiKey.trim()}
              className="bg-accent text-background font-mono font-bold uppercase tracking-widest px-8 py-3 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? '...' : 'Send'}
            </button>
          </div>
        </div>

        {/* Right Side - Gateway Trace */}
        <div className="w-full md:w-96 flex flex-col border border-border/50 bg-background/30 backdrop-blur-md">
          <div className="border-b border-border/50 p-6">
            <h2 className="font-mono text-sm font-bold uppercase tracking-widest flex items-center gap-2">
              <svg className="w-4 h-4 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Gateway Execution Trace
            </h2>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto font-mono text-xs">
            {traceLogs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground text-center">
                Send a message to see the lifecycle of the request through the gateway.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {traceLogs.map((log, i) => (
                  <div key={i} className={`${log.includes('Error') ? 'text-red-400' : 'text-muted-foreground'} break-words`}>
                    {log}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

      </div>
    </main>
  )
}
