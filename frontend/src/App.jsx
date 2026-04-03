import { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import Login from './Login'
import Icon from './components/Icon'
import Sidebar from './components/Sidebar'
import EmptyState from './components/EmptyState'
import ChatInput from './components/ChatInput'
import ChangePasswordModal from './components/ChangePasswordModal'

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
  executive: ['lead', 'executive', 'sales', 'security'],
  sales:     ['lead', 'executive', 'sales', 'security'],
  security:  ['lead', 'executive', 'sales', 'security'],
}

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

function fmt(date) {
  return date instanceof Date && !isNaN(date)
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : ''
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
  const [docs, setDocs] = useState([])
  const [docsOpen, setDocsOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sessionExpired, setSessionExpired] = useState(false)
  const fileInputRef = useRef(null)
  const chatFileInputRef = useRef(null)
  const bottomRef = useRef(null)

  const AGENTS = ALL_AGENTS.filter(a => (ROLE_AGENTS[userRole] || []).includes(a.id))
  const agent = AGENTS.find(a => a.id === activeAgent) || AGENTS[0]

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

  useEffect(() => {
    if (!token) { setDocs([]); return }
    fetch(`${API_BASE}/documents`, { headers: authHeaders(token) })
      .then(r => r.ok ? r.json() : [])
      .then(data => setDocs(data))
      .catch(() => {})
  }, [token])

  useEffect(() => {
    if (!token) return
    fetch(`${API_BASE}/auth/me`, { headers: authHeaders(token) })
      .then(r => {
        if (r.status === 401) { setSessionExpired(true); handleLogout() }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!token) return
    const id = setInterval(() => {
      fetch(`${API_BASE}/auth/refresh`, { method: 'POST', headers: authHeaders(token) })
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data?.access_token) {
            localStorage.setItem('tharseo_token', data.access_token)
            setToken(data.access_token)
          }
        })
        .catch(() => {})
    }, 12 * 60 * 60 * 1000)
    return () => clearInterval(id)
  }, [token])

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
    setDocs([])
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
    setSidebarOpen(false)
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch(`${API_BASE}/documents/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      })
      if (!res.ok) { const err = await res.json(); setUploadError(err.detail || 'Upload failed'); return }
      const newDoc = await res.json()
      setDocs(prev => [newDoc, ...prev])
      setDocsOpen(true)
    } catch { setUploadError('Could not reach the server') }
    finally { setUploading(false); e.target.value = '' }
  }

  async function handleDeleteDoc(docId) {
    try {
      await fetch(`${API_BASE}/documents/${docId}`, { method: 'DELETE', headers: authHeaders(token) })
      setDocs(prev => prev.filter(d => d.id !== docId))
    } catch {}
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

  if (!token) return <Login onLogin={handleLogin} sessionExpired={sessionExpired} />

  return (
    <div className="dark flex h-screen overflow-hidden relative" style={{ background: '#050d1a' }}>

      {/* Aurora background */}
      <div className="aurora-bg">
        <div className="aurora-orb aurora-orb-1" />
        <div className="aurora-orb aurora-orb-2" />
        <div className="aurora-orb aurora-orb-3" />
        <div className="aurora-orb aurora-orb-4" />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        agents={AGENTS}
        activeAgent={activeAgent}
        onSwitchAgent={switchAgent}
        onNewSession={clearChat}
        sidebarOpen={sidebarOpen}
        docs={docs}
        docsOpen={docsOpen}
        onToggleDocs={() => setDocsOpen(o => !o)}
        uploading={uploading}
        uploadError={uploadError}
        fileInputRef={fileInputRef}
        onUpload={handleUpload}
        onDeleteDoc={handleDeleteDoc}
        username={username}
        onChangePassword={() => { setShowChangePw(true); setPwError(''); setPwSuccess(false) }}
        onLogout={handleLogout}
      />

      <main className="flex flex-col h-screen w-full md:ml-[260px] relative z-10">

        {/* Top bar */}
        <header className="h-16 px-4 md:px-10 flex items-center justify-between border-b border-white/5 bg-black/20 backdrop-blur-xl sticky top-0 z-40 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="md:hidden p-2 rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-colors shrink-0"
            >
              <Icon name={sidebarOpen ? 'close' : 'menu'} />
            </button>
            <div className="min-w-0">
              <h2 className="font-headline text-base font-extrabold text-white tracking-tight truncate">{agent.label}</h2>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/35 hidden sm:block">{agent.desc}</p>
            </div>
          </div>
          <span className={`text-[10px] uppercase tracking-widest shrink-0 ${loading ? 'text-[#95B552] animate-pulse' : 'text-white/20'}`}>
            {loading ? 'Thinking...' : 'Ready'}
          </span>
        </header>

        {/* Messages */}
        <section className="flex-1 overflow-y-auto no-scrollbar px-4 md:px-10 py-6 md:py-8 space-y-8">

          {messages.length === 0 && !loading && (
            <EmptyState
              agents={AGENTS}
              activeAgent={activeAgent}
              onSwitchAgent={switchAgent}
              onSetInput={setInput}
            />
          )}

          {messages.map((msg, i) =>
            msg.role === 'user' ? (
              <div key={i} className="flex flex-col items-end max-w-3xl ml-auto w-full">
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/30 mb-2">You • {fmt(msg.ts)}</div>
                <div className="bg-[#175873]/70 backdrop-blur-sm text-white px-5 py-3.5 rounded-2xl rounded-tr-sm max-w-xl shadow-lg border border-white/10">
                  <p className="leading-relaxed text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ) : (
              <div key={i} className="flex flex-col items-start w-full">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-xl bg-white/8 backdrop-blur-sm flex items-center justify-center border border-white/10">
                    <Icon name={agent.icon} className="text-[#95B552] text-base" />
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/30">{agent.label} • {fmt(msg.ts)}</div>
                </div>
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/8 max-w-3xl w-full shadow-xl">
                  <ReactMarkdown
                    components={{
                      p:      ({children}) => <p className="text-white/80 text-sm leading-relaxed mb-3 last:mb-0">{children}</p>,
                      h1:     ({children}) => <h1 className="font-extrabold text-white text-xl mb-3 mt-4 first:mt-0 tracking-tight">{children}</h1>,
                      h2:     ({children}) => <h2 className="font-bold text-white text-lg mb-2 mt-4 first:mt-0 tracking-tight">{children}</h2>,
                      h3:     ({children}) => <h3 className="font-semibold text-white text-base mb-2 mt-3 first:mt-0">{children}</h3>,
                      ul:     ({children}) => <ul className="list-disc list-inside space-y-1.5 mb-3 text-sm text-white/70">{children}</ul>,
                      ol:     ({children}) => <ol className="list-decimal list-inside space-y-1.5 mb-3 text-sm text-white/70">{children}</ol>,
                      li:     ({children}) => <li className="leading-relaxed">{children}</li>,
                      code:   ({node, inline, className, children, ...props}) => {
                        const isBlock = !inline
                        return isBlock
                          ? <pre className="bg-black/30 backdrop-blur-sm rounded-xl p-4 overflow-x-auto mb-3 mt-1 border border-white/5"><code className="text-[#95B552] text-xs font-mono whitespace-pre">{children}</code></pre>
                          : <code className="bg-black/20 text-[#95B552] px-1.5 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>
                      },
                      pre: ({children}) => <>{children}</>,
                      strong: ({children}) => <strong className="font-semibold text-white">{children}</strong>,
                      a:      ({href, children}) => <a href={href} className="text-[#95B552] underline hover:text-[#aed06a]" target="_blank" rel="noreferrer">{children}</a>,
                      blockquote: ({children}) => <blockquote className="border-l-2 border-[#95B552]/40 pl-4 italic text-white/50 my-3">{children}</blockquote>,
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
                <div className="w-8 h-8 rounded-xl bg-white/8 backdrop-blur-sm flex items-center justify-center border border-white/10">
                  <Icon name={agent.icon} className="text-[#95B552] text-base" />
                </div>
                <div className="text-[10px] uppercase tracking-[0.18em] text-white/30">{agent.label} • thinking...</div>
              </div>
              <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/8 shadow-xl">
                <div className="flex gap-1.5 items-center h-4">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1.5 h-1.5 bg-[#95B552] rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </section>

        <ChatInput
          fileInputRef={chatFileInputRef}
          uploading={uploading}
          onUpload={handleUpload}
          input={input}
          onInputChange={setInput}
          onKeyDown={handleKeyDown}
          onSend={sendMessage}
          loading={loading}
          agentLabel={agent.label}
        />

      </main>

      {showChangePw && (
        <ChangePasswordModal
          onClose={() => setShowChangePw(false)}
          onSubmit={handleChangePw}
          form={pwForm}
          onChange={(key, val) => setPwForm(f => ({ ...f, [key]: val }))}
          error={pwError}
          success={pwSuccess}
          loading={pwLoading}
        />
      )}

    </div>
  )
}
