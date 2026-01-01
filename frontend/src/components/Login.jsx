import { useState } from 'react'
import { login, checkAuth } from '../api/auth'

function Login({ onLogin }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await login(password)
      // Store token in localStorage
      localStorage.setItem('auth_token', response.access_token)
      // Notify parent component
      onLogin()
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F0D12] px-4">
      <div className="w-full max-w-md">
        <div className="bg-[#17131D] rounded-lg shadow-xl p-8 border border-white/10">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-medium text-text-primary mb-2">canvas</h1>
            <p className="text-text-secondary">Enter password to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-primary mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-12 px-4 bg-[#1C1824] border-none rounded-lg text-sm text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent/30 transition-all"
                placeholder="Enter password"
                autoFocus
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              className="w-full h-12 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover active:bg-accent-active transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login

