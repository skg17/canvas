import { useState, useEffect } from 'react'
import Dashboard from './components/Dashboard'
import Login from './components/Login'
import { checkAuth } from './api/auth'
import './App.css'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(null) // null = checking, true = authenticated, false = not authenticated
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const verifyAuth = async () => {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setIsAuthenticated(false)
        setChecking(false)
        return
      }

      try {
        await checkAuth()
        setIsAuthenticated(true)
      } catch (error) {
        setIsAuthenticated(false)
        localStorage.removeItem('auth_token')
      } finally {
        setChecking(false)
      }
    }

    verifyAuth()
  }, [])

  const handleLogin = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    setIsAuthenticated(false)
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0F0D12]">
        <div className="text-text-secondary">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Dashboard onLogout={handleLogout} />
    </div>
  )
}

export default App

