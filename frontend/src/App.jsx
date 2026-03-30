import { useState, useRef, useEffect } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://129.213.95.95:8000'

const AGENTS = [
  { id: 'lead',  label: 'Lead Agent',  desc: 'PM & Strategic Advisor',           icon: 'person_search' },
  { id: 'cloud', label: 'Cloud Agent', desc: 'OCI, Terraform & Cloud Specialist', icon: 'cloud_done'    },
]

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

export default function App() {
  const [activeAgent, setActiveAgent] = useState('lead')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  const agent = AGENTS.find(a => a.id === activeAgent)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    setMessages(prev => [...prev, { role: 'user', content: text, ts: new Date() }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, agent: activeAgent }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'ai', content: data.response, ts: new Date() }])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: '⚠️ Could not reach the backend. Make sure the server is running.', ts: new Date() }])
    } finally {
      setLoading(false)
    }
  }

  async function clearChat() {
    try { await fetch(`${API_BASE}/chat/${activeAgent}/clear`, { method: 'POST' }) } catch {}
    setMessages([])
  }

  function switchAgent(id) {
    setActiveAgent(id)
    setMessages([])
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  function fmt(date) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="dark flex h-screen overflow-hidden bg-background">

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className="w-[260px] h-screen fixed left-0 top-0 bg-surface-container-lowest flex flex-col py-6 z-50">

        {/* Brand */}
        <div className="px-6 mb-8">
          <div className="flex items-center gap-3">
            <img src="/tharseo-logo.svg" alt="Tharseo" className="w-10 h-10" />
            <div>
              <h1 className="font-headline text-xl font-bold text-primary tracking-tighter">Tharseo AI</h1>
              <p className="font-label text-[10px] uppercase tracking-[0.18em] text-on-surface-variant opacity-60">Your AI team, always on.</p>
            </div>
          </div>
        </div>

        {/* New Session */}
        <div className="px-4 mb-6">
          <button
            onClick={clearChat}
            className="w-full bg-primary-container hover:bg-[#366848] text-on-primary-container py-2.5 px-4 rounded flex items-center justify-center gap-2 transition-all font-headline font-semibold text-sm active:scale-95"
          >
            <Icon name="add" className="text-sm" />
            New Session
          </button>
        </div>

        {/* Agent list */}
        <nav className="flex-1">
          {AGENTS.map(a => (
            <button
              key={a.id}
              onClick={() => switchAgent(a.id)}
              className={`w-full text-left px-6 py-3.5 flex items-center gap-3 transition-all text-sm font-headline tracking-tight
                ${activeAgent === a.id
                  ? 'border-l-2 border-tharseo-yellow bg-tharseo-teal/20 text-tharseo-green font-semibold'
                  : 'text-on-surface-variant hover:text-tharseo-green hover:bg-surface-container'}`}
            >
              <Icon name={a.icon} />
              {a.label}
            </button>
          ))}
        </nav>

        {/* Clear memory */}
        <div className="px-4 border-t border-outline-variant/10 pt-4">
          <button
            onClick={clearChat}
            className="w-full flex items-center gap-3 text-on-surface-variant hover:text-error px-4 py-3 transition-colors rounded hover:bg-error-container/10 text-sm font-headline"
          >
            <Icon name="delete_sweep" />
            Clear Chat
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────── */}
      <main className="ml-[260px] flex flex-col h-screen bg-surface w-full">

        {/* Top bar */}
        <header className="h-16 px-10 flex items-center justify-between border-b border-outline-variant/15 bg-surface/60 backdrop-blur-xl sticky top-0 z-40">
          <div>
            <h2 className="font-headline text-sm font-bold text-primary tracking-tight">{agent.label}</h2>
            <p className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">{agent.desc}</p>
          </div>
          <span className={`text-[10px] font-label uppercase tracking-widest ${loading ? 'text-secondary animate-pulse' : 'text-on-surface-variant/40'}`}>
            {loading ? 'Thinking...' : 'Ready'}
          </span>
        </header>

        {/* Messages */}
        <section className="flex-1 overflow-y-auto no-scrollbar px-10 py-8 space-y-8">

          {/* Empty state */}
          {messages.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-6 py-24">
              <div className="w-24 h-24 rounded-2xl bg-surface-container flex items-center justify-center p-3">
                <img src="/tharseo-logo.svg" alt="Tharseo" className="w-full h-full" />
              </div>
              <div>
                <h2 className="font-headline text-4xl font-extrabold tracking-tighter text-on-surface">Tharseo AI</h2>
                <p className="text-on-surface-variant mt-2 text-sm">Your AI team, always on.</p>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4 max-w-xl text-left">
                {AGENTS.map(a => (
                  <div
                    key={a.id}
                    onClick={() => switchAgent(a.id)}
                    className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/10 hover:border-primary/20 transition-all cursor-pointer"
                  >
                    <Icon name={a.icon} className="text-primary mb-2 block" />
                    <h4 className="font-headline font-bold text-sm mb-1 text-on-surface">{a.label}</h4>
                    <p className="text-xs text-on-surface-variant/70 leading-relaxed">{a.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message thread */}
          {messages.map((msg, i) =>
            msg.role === 'user' ? (
              <div key={i} className="flex flex-col items-end max-w-3xl ml-auto w-full">
                <div className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant mb-1.5">You • {fmt(msg.ts)}</div>
                <div className="bg-primary-container text-on-surface px-5 py-3.5 rounded-xl rounded-tr-none max-w-xl shadow-lg">
                  <p className="font-body leading-relaxed text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ) : (
              <div key={i} className="flex flex-col items-start w-full">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-7 h-7 rounded-lg bg-surface-container-highest flex items-center justify-center border border-outline-variant/20">
                    <Icon name={agent.icon} className="text-secondary text-base" />
                  </div>
                  <div className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">{agent.label} • {fmt(msg.ts)}</div>
                </div>
                <div className="bg-surface-container p-6 rounded-xl border-l-2 border-secondary/30 max-w-3xl w-full shadow-lg">
                  <p className="font-body text-on-surface-variant text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            )
          )}

          {/* Typing indicator */}
          {loading && (
            <div className="flex flex-col items-start w-full">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-lg bg-surface-container-highest flex items-center justify-center border border-outline-variant/20">
                  <Icon name={agent.icon} className="text-secondary text-base" />
                </div>
                <div className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">{agent.label} • thinking...</div>
              </div>
              <div className="bg-surface-container p-5 rounded-xl border-l-2 border-secondary/30 shadow-lg">
                <div className="flex gap-1.5 items-center h-4">
                  {[0, 1, 2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </section>

        {/* Input */}
        <div className="px-10 pb-8 bg-gradient-to-t from-surface via-surface/90 to-transparent">
          <div className="max-w-4xl mx-auto">
            <div className="bg-surface-container-high/80 backdrop-blur-2xl rounded-xl p-2 border border-outline-variant/20 shadow-2xl flex items-end gap-2 focus-within:border-primary/30 transition-all">
              <textarea
                rows={1}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${agent.label}...`}
                className="flex-1 bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-on-surface-variant/40 py-3 px-3 resize-none font-body text-sm outline-none"
                style={{ minHeight: '44px', maxHeight: '160px' }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || loading}
                className="bg-primary text-on-primary p-3 rounded-lg transition-all active:scale-90 hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center mb-0.5"
              >
                <Icon name="arrow_upward" />
              </button>
            </div>
            <p className="mt-2 text-center font-label text-[10px] uppercase tracking-widest text-on-surface-variant/30">
              Shift+Enter for new line · Enter to send
            </p>
          </div>
        </div>

      </main>
    </div>
  )
}
