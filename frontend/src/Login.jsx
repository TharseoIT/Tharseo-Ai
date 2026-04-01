import { useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://129.213.95.95:8000'

export default function Login({ onLogin }) {
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
    <div className="dark min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-10 gap-4">
          <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center p-2">
            <img src="/tharseo-logo.svg" alt="Tharseo" className="w-full h-full" />
          </div>
          <div className="text-center">
            <h1 className="font-headline text-3xl font-extrabold tracking-tighter text-on-surface">Tharseo AI</h1>
            <p className="text-on-surface-variant text-sm mt-1">Your AI team, always on.</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-surface-container rounded-xl p-8 border border-outline-variant/10">
          <h2 className="font-headline font-bold text-on-surface mb-6 text-sm uppercase tracking-widest">
            Sign in
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant block mb-1.5">Work Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full bg-surface-container-high border border-outline-variant/20 rounded-lg px-4 py-2.5 text-on-surface text-sm font-body focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="you@tharseoit.com"
              />
            </div>
            <div>
              <label className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant block mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-surface-container-high border border-outline-variant/20 rounded-lg px-4 py-2.5 text-on-surface text-sm font-body focus:outline-none focus:border-primary/50 transition-colors"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-error text-xs font-label">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-on-primary font-headline font-bold py-3 rounded-lg transition-all hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Please wait...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center text-on-surface-variant text-xs mt-6 font-label">
          Need access? Contact Antonio.
        </p>

      </div>
    </div>
  )
}
