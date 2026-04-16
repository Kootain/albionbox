import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'

export default function KookCallbackPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [error, setError] = useState('')
  const processing = useRef(false)

  useEffect(() => {
    if (processing.current) return
    processing.current = true

    const code = searchParams.get('code')
    if (!code) {
      setError('No code provided by Kook')
      return
    }

    const redirectUri = window.location.origin + location.pathname
    const state = searchParams.get('state')

    const processAuth = async () => {
      try {
        if (state === 'bind') {
          const res = await api.users.oauth.kook.bind.$post({ json: { code, redirectUri } })
          if (res.ok) {
            navigate('/profile')
          } else {
            const data = await res.json() as any
            setError(data.error || 'Failed to bind Kook account')
          }
        } else {
          const res = await api.users.oauth.kook.login.$post({ json: { code, redirectUri } })
          if (res.ok) {
            const data = await res.json() as any
            if (data.token) {
              await login(data.token)
              navigate('/')
            }
          } else {
            const data = await res.json() as any
            setError(data.error || 'Login failed')
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      }
    }

    processAuth()
  }, [searchParams, navigate, login, location.pathname])

  if (error) {
    return (
      <div className="min-h-screen bg-black-bg flex items-center justify-center p-6 font-sans">
        <div className="bg-black-card border border-red-500/20 p-8 rounded-2xl max-w-md w-full">
          <h2 className="text-red-500 font-bold text-xl mb-4">Error</h2>
          <p className="text-slate-300">{error}</p>
          <button 
            onClick={() => navigate('/login')}
            className="mt-6 bg-black-bg border border-black-border px-4 py-2 rounded text-white"
          >
            Back to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black-bg flex flex-col items-center justify-center font-sans">
      <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-slate-400 font-bold tracking-widest uppercase">Processing Kook Auth...</p>
    </div>
  )
}
