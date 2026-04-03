import { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://129.213.95.95:8000'

export default function Login({ onLogin, sessionExpired = false }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.detail || 'Something went wrong')
        return
      }

      localStorage.setItem('tharseo_token', data.access_token)
      localStorage.setItem('tharseo_user', data.username)
      localStorage.setItem('tharseo_role', data.user_role)
      onLogin(data.access_token, data.username, data.user_role)
    } catch {
      setError('Could not reach the server. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dark min-h-screen flex items-center justify-center px-4 relative overflow-hidden">

      {/* Aurora background */}
      <div className="aurora-bg">
        <div className="aurora-orb aurora-orb-1" />
        <div className="aurora-orb aurora-orb-2" />
        <div className="aurora-orb aurora-orb-3" />
        <div className="aurora-orb aurora-orb-4" />
      </div>

      <div className="w-full max-w-sm relative z-10">

        {/* Logo */}
        <div className="flex flex-col items-center mb-10 gap-5">
          <img src="/tharseo-logo.png" alt="Tharseo" className="w-40 h-auto drop-shadow-lg" />
          <div className="text-center">
            <h1 className="font-headline text-4xl font-extrabold tracking-tighter text-white">Tharseo AI</h1>
            <p className="text-white/50 text-sm mt-2 tracking-wide">Your AI team, always on.</p>
          </div>
        </div>

        {sessionExpired && (
          <div className="mb-4 bg-red-500/10 border border-red-400/20 text-red-300 text-xs font-label rounded-xl px-4 py-3 text-center backdrop-blur-sm">
            Your session expired. Please sign in again.
          </div>
        )}

        {/* Glass card */}
        <div className="bg-white/5 backdrop-blur-2xl rounded-2xl p-8 border border-white/10 shadow-2xl">
          <h2 className="font-headline font-bold text-white/60 mb-6 text-xs uppercase tracking-[0.2em]">
            Sign in
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="text-[10px] uppercase tracking-[0.18em] text-white/40 block mb-2">Work Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 focus:bg-white/8 transition-all placeholder:text-white/20"
                placeholder="you@tharseoit.com"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.18em] text-white/40 block mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-white/30 focus:bg-white/8 transition-all placeholder:text-white/20"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-red-400 text-xs">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#175873] hover:bg-[#1e6d8e] text-white font-bold py-3 rounded-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2 text-sm tracking-wide shadow-lg shadow-[#175873]/30"
            >
              {loading ? 'Please wait...' : 'Sign in →'}
            </button>
          </form>
        </div>

        <p className="text-center text-white/25 text-xs mt-6">
          Need access? Contact Antonio.
        </p>

      </div>
    </div>
  )
}
