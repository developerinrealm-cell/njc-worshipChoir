import { useEffect, useState, useCallback } from 'react'
import axios from 'axios'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export default function AuthGate({ children }) {
  const [status, setStatus] = useState('checking') // checking | loggedIn | loggedOut
  const [error, setError] = useState('')

  const checkAuth = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/auth/me')
      setStatus(data.loggedIn ? 'loggedIn' : 'loggedOut')
    } catch {
      setStatus('loggedOut')
    }
  }, [])

  useEffect(() => { checkAuth() }, [checkAuth])

  useEffect(() => {
    if (status !== 'loggedOut' || !window.google) return
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: async (response) => {
        try {
          await axios.post('/api/auth/google', { credential: response.credential })
          setError('')
          checkAuth()
        } catch (e) {
          setError(e.response?.data?.error || 'Login failed')
        }
      },
    })
    window.google.accounts.id.renderButton(
      document.getElementById('google-signin-btn'),
      { theme: 'filled_black', size: 'large', width: 280 }
    )
  }, [status, checkAuth])

  if (status === 'checking') {
    return <div className="flex h-screen items-center justify-center" style={{ color: 'var(--text3)' }}>Loading…</div>
  }

  if (status === 'loggedOut') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <p className="text-lg font-medium" style={{ color: 'var(--text)' }}>Worship team login</p>
        <div id="google-signin-btn"></div>
        {error && <p className="text-sm" style={{ color: 'var(--red)' }}>{error}</p>}
      </div>
    )
  }

  return children
}