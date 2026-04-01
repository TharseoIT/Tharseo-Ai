import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import Login from './Login'

const API_BASE = import.meta.env.VITE_API_URL || 'http://129.213.95.95:8000'

const ALL_AGENTS = [
  {
    id: 'lead',
    label: 'Nexus',
    desc: 'Strategic Operations',
    icon: 'person_search',
    about: 'Your company strategist. Ask about projects, priorities, decisions, and anything Tharseo-related.',
    prompts: [
      'What projects is Tharseo currently working on?',
      'Help me write a project status update',
      'What should we prioritize this week?',
    ],
  },
  {
    id: 'cloud',
    label: 'Terra',
    desc: 'Cloud Infrastructure',
    icon: 'cloud_done',
    about: 'Your cloud architect. Ask about OCI, Terraform, Terragrunt, networking, and infrastructure.',
    prompts: [
      'How do I create a VCN in OCI with Terraform?',
      "What's the difference between an NSG and a Security List?",
      'Review my Terragrunt folder structure',
    ],
  },
  {
    id: 'executive',
    label: 'Apex',
    desc: 'Executive Intelligence',
    icon: 'business_center',
    about: 'Your executive advisor. Strategy, communications, business decisions, and company intelligence.',
    prompts: [
      'Give me a summary of our current business priorities',
      'Help me draft a board update',
      'What are our biggest risks this quarter?',
    ],
  },
  {
    id: 'sales',
    label: 'Forge',
    desc: 'Sales & Growth',
    icon: 'trending_up',
    about: 'Your sales strategist. Proposals, pipeline, client strategy, and competitive intelligence.',
    prompts: [
      'Help me write a proposal for a new client',
      'How should I handle a stalled deal?',
      'What are our key differentiators against competitors?',
    ],
  },
  {
    id: 'security',
    label: 'Sentinel',
    desc: 'Security & Compliance',
    icon: 'security',
    about: 'Your security advisor. Cybersecurity, compliance frameworks, risk assessments, and incident response.',
    prompts: [
      'Review our current security posture',
      'What compliance frameworks should we prioritize?',
      'Help me write a security incident response plan',
    ],
  },
]

const ROLE_AGENTS = {
  admin:     ['lead', 'cloud', 'executive', 'sales', 'security'],
  executive: ['executive'],
  sales:     ['sales'],
  security:  ['security'],
}

function Icon({ name, className = '' }) {
  return <span className={`material-symbols-outlined ${className}`}>{name}</span>
}

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('tharseo_token'))
  const [username, setUsername] = useState(() => localStorage.getItem('tharseo_user') || '')
  const [userRole, setUserRole] = useState(() => localStorage.getItem('tharseo_role') || 'security')
  const [activeAgent, setActiveAgent] = useState(() => {
    const role = localStorage.getItem('tharseo_role') || 'security'
    return (ROLE_AGENTS[role] || ['security'])[0]
  })
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showChangePw, setShowChangePw] = useState(false)
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const bottomRef = useRef(null)

  const AGENTS = ALL_AGENTS.filter(a => (ROLE_AGENTS[userRole] || []).includes(a.id))
  const agent = AGENTS.find(a => a.id === activeAgent) || AGENTS[0]

  // Load history from DB whenever agent changes
  useEffect(() => {
    if (!token) return
    setMessages([])
    fetch(`${API_BASE}/conversations/${activeAgent}`, { headers: authHeaders(token) })
      .then(r => {
        if (r.status === 401) { handleLogout(); return null }
        return r.json()
      })
      .then(data => {
        if (!data) return
        setMessages(data.map(m => ({ role: m.role, content: m.content, ts: new Date(m.ts) })))
      })
      .catch(() => {})
  }, [activeAgent, token])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  function handleLogin(newToken, newUsername, newRole) {
    localStorage.setItem('tharseo_token', newToken)
    localStorage.setItem('tharseo_user', newUsername)
    localStorage.setItem('tharseo_role', newRole)
    setToken(newToken)
    setUsername(newUsername)
    setUserRole(newRole)
    setActiveAgent((ROLE_AGENTS[newRole] || ['security'])[0])
  }

  function handleLogout() {
    localStorage.removeItem('tharseo_token')
    localStorage.removeItem('tharseo_user')
    localStorage.removeItem('tharseo_role')
    setToken(null)
    setUsername('')
    setUserRole('security')
    setMessages([])
  }

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    setMessages(prev => [...prev, { role: 'user', content: text, ts: new Date() }])
    setInput('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ message: text, agent: activeAgent }),
      })
      if (res.status === 401) { handleLogout(); return }
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'ai', content: data.response, ts: new Date() }])
    } catch {
      setMessages(prev => [...prev, { role: 'ai', content: '⚠️ Could not reach the backend.', ts: new Date() }])
    } finally {
      setLoading(false)
    }
  }

  async function clearChat() {
    try {
      await fetch(`${API_BASE}/chat/${activeAgent}/clear`, { method: 'POST', headers: authHeaders(token) })
    } catch {}
    setMessages([])
  }

  function switchAgent(id) {
    setActiveAgent(id)
  }

  async function handleChangePw(e) {
    e.preventDefault()
    setPwError('')
    if (pwForm.next !== pwForm.confirm) { setPwError('New passwords do not match'); return }
    setPwLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify({ current_password: pwForm.current, new_password: pwForm.next }),
      })
      const data = await res.json()
      if (!res.ok) { setPwError(data.detail || 'Something went wrong'); return }
      setPwSuccess(true)
      setTimeout(() => { setShowChangePw(false); setPwForm({ current: '', next: '', confirm: '' }); setPwSuccess(false) }, 1500)
    } catch { setPwError('Could not reach the server') }
    finally { setPwLoading(false) }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  function fmt(date) {
    return date instanceof Date && !isNaN(date)
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : ''
  }

  if (!token) return <Login onLogin={handleLogin} />

  return (
    <div className="dark flex h-screen overflow-hidden bg-background">

      {/* ── Sidebar ─────────────────────────────────────────────── */}
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
            className="w-full bg-primary-container hover:bg-[#1f3d1a] text-on-primary-container py-2.5 px-4 rounded flex items-center justify-center gap-2 transition-all font-headline font-semibold text-sm active:scale-95"
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

        {/* User + logout */}
        <div className="px-4 border-t border-outline-variant/10 pt-4 space-y-1">
          <div className="flex items-center gap-3 px-4 py-2">
            <Icon name="account_circle" className="text-on-surface-variant" />
            <span className="text-sm font-label text-on-surface-variant truncate flex-1">{username}</span>
          </div>
          <button
            onClick={() => { setShowChangePw(true); setPwError(''); setPwSuccess(false) }}
            className="w-full flex items-center gap-3 text-on-surface-variant hover:text-primary px-4 py-2.5 transition-colors rounded hover:bg-surface-container text-sm font-headline"
          >
            <Icon name="lock" />
            Change password
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 text-on-surface-variant hover:text-error px-4 py-2.5 transition-colors rounded hover:bg-error-container/10 text-sm font-headline"
          >
            <Icon name="logout" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────── */}
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
            <div className="flex flex-col items-center justify-center h-full text-center space-y-8 py-16">
              <div className="w-20 h-20 rounded-2xl bg-surface-container flex items-center justify-center p-3">
                <img src="/tharseo-logo.svg" alt="Tharseo" className="w-full h-full" />
              </div>
              <div>
                <h2 className="font-headline text-4xl font-extrabold tracking-tighter text-on-surface">Tharseo AI</h2>
                <p className="text-on-surface-variant mt-2 text-sm">Your AI team, always on. Select an agent or click a prompt to get started.</p>
              </div>

              <div className="grid grid-cols-2 gap-6 max-w-3xl w-full text-left">
                {AGENTS.map(a => (
                  <div key={a.id} className="flex flex-col rounded-xl bg-surface-container-low border border-outline-variant/10 overflow-hidden">
                    <button
                      onClick={() => switchAgent(a.id)}
                      className={`flex items-center gap-3 px-5 py-4 transition-all hover:bg-surface-container w-full text-left
                        ${activeAgent === a.id ? 'border-l-2 border-tharseo-yellow' : 'border-l-2 border-transparent'}`}
                    >
                      <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0">
                        <Icon name={a.icon} className="text-primary" />
                      </div>
                      <div>
                        <div className="font-headline font-bold text-sm text-on-surface">{a.label}</div>
                        <div className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-label">{a.desc}</div>
                      </div>
                    </button>
                    <p className="text-xs text-on-surface-variant/70 leading-relaxed px-5 pb-3">{a.about}</p>
                    <div className="flex flex-col gap-1.5 px-5 pb-5">
                      {a.prompts.map(prompt => (
                        <button
                          key={prompt}
                          onClick={() => { switchAgent(a.id); setInput(prompt) }}
                          className="text-left text-xs text-on-surface-variant hover:text-primary bg-surface-container hover:bg-surface-container-high px-3 py-2.5 rounded-lg transition-all flex items-center gap-2 group"
                        >
                          <Icon name="arrow_forward" className="text-sm text-on-surface-variant/30 group-hover:text-primary shrink-0" />
                          {prompt}
                        </button>
                      ))}
                    </div>
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
                <div className="bg-surface-container p-6 rounded-xl border-l-2 border-secondary/30 max-w-3xl w-full shadow-lg prose-tharseo">
                  <ReactMarkdown
                    components={{
                      p:      ({children}) => <p className="text-on-surface-variant text-sm leading-relaxed mb-3 last:mb-0">{children}</p>,
                      h1:     ({children}) => <h1 className="font-headline font-bold text-on-surface text-lg mb-3 mt-4 first:mt-0">{children}</h1>,
                      h2:     ({children}) => <h2 className="font-headline font-bold text-on-surface text-base mb-2 mt-4 first:mt-0">{children}</h2>,
                      h3:     ({children}) => <h3 className="font-headline font-semibold text-on-surface text-sm mb-2 mt-3 first:mt-0">{children}</h3>,
                      ul:     ({children}) => <ul className="list-disc list-inside space-y-1 mb-3 text-sm text-on-surface-variant">{children}</ul>,
                      ol:     ({children}) => <ol className="list-decimal list-inside space-y-1 mb-3 text-sm text-on-surface-variant">{children}</ol>,
                      li:     ({children}) => <li className="leading-relaxed">{children}</li>,
                      code:   ({node, inline, className, children, ...props}) => {
                        const isBlock = !inline
                        return isBlock
                          ? <pre className="bg-surface-container-lowest rounded-lg p-4 overflow-x-auto mb-3 mt-1"><code className="text-primary text-xs font-mono whitespace-pre">{children}</code></pre>
                          : <code className="bg-surface-container-high text-primary px-1.5 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>
                      },
                      pre: ({children}) => <>{children}</>,
                      strong: ({children}) => <strong className="font-semibold text-on-surface">{children}</strong>,
                      a:      ({href, children}) => <a href={href} className="text-primary underline hover:text-tharseo-green-light" target="_blank" rel="noreferrer">{children}</a>,
                      blockquote: ({children}) => <blockquote className="border-l-2 border-secondary/50 pl-4 italic text-on-surface-variant/70 my-3">{children}</blockquote>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
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
                  {[0,1,2].map(i => (
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
      {/* ── Change Password Modal ───────────────────────────────── */}
      {showChangePw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container rounded-xl p-8 w-full max-w-sm border border-outline-variant/10 shadow-2xl">
            <h2 className="font-headline font-bold text-on-surface mb-6 text-sm uppercase tracking-widest">Change Password</h2>
            {pwSuccess ? (
              <p className="text-primary text-sm font-label text-center py-4">Password updated successfully.</p>
            ) : (
              <form onSubmit={handleChangePw} className="flex flex-col gap-4">
                {[
                  { label: 'Current Password', key: 'current' },
                  { label: 'New Password',     key: 'next' },
                  { label: 'Confirm New',      key: 'confirm' },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant block mb-1.5">{label}</label>
                    <input
                      type="password"
                      value={pwForm[key]}
                      onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
                      required
                      className="w-full bg-surface-container-high border border-outline-variant/20 rounded-lg px-4 py-2.5 text-on-surface text-sm font-body focus:outline-none focus:border-primary/50 transition-colors"
                      placeholder="••••••••"
                    />
                  </div>
                ))}
                {pwError && <p className="text-error text-xs font-label">{pwError}</p>}
                <div className="flex gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowChangePw(false)}
                    className="flex-1 py-2.5 rounded-lg border border-outline-variant/20 text-on-surface-variant text-sm font-headline hover:bg-surface-container-high transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={pwLoading}
                    className="flex-1 bg-primary text-on-primary py-2.5 rounded-lg text-sm font-headline font-bold hover:brightness-110 disabled:opacity-50 transition-all"
                  >
                    {pwLoading ? 'Saving...' : 'Update'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
