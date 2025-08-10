import { useEffect, useMemo, useRef, useState } from 'react'

function App() {
  const [creditBalance, setCreditBalance] = useState(null)
  const [remainingTime, setRemainingTime] = useState(null)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(null)

  const pollingIntervalRef = useRef(null)
  const countdownIntervalRef = useRef(null)

  // Derive an API base that targets /api (strip trailing /v1 if present)
  const apiBase = useMemo(() => {
    const raw = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
    return raw.replace(/\/?v1\/?$/, '')
  }, [])

  const getAuthToken = () => localStorage.getItem('token')
  const setAuthToken = (token) => localStorage.setItem('token', token)
  const clearAuth = () => localStorage.removeItem('token')

  const redirectToLogin = () => {
    window.location.href = '/login.html'
  }

  const authorizedFetch = async (input, init = {}) => {
    const token = getAuthToken()
    const headers = {
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
    return fetch(input, { ...init, headers })
  }

  const fetchBalance = async () => {
    try {
      const response = await authorizedFetch(`${apiBase}/user/balance`)
      if (response.status === 401) {
        clearAuth()
        redirectToLogin()
        return
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setCreditBalance(data.credit_balance)
      setRemainingTime(data.remaining_time)
      setCountdown(data.remaining_time * 60)
      setError('')

      if (Number(data.credit_balance) <= 0) {
        await handleAutoLogout()
      }
    } catch (e) {
      setError(String(e))
    }
  }

  const handleAutoLogout = async () => {
    try {
      const response = await authorizedFetch(`${apiBase}/logout`, { method: 'POST' })
      if (response.status === 401) {
        // already logged out
      }
    } catch (_) {
      // ignore
    } finally {
      clearAuth()
      redirectToLogin()
    }
  }

  // Demo-only: if no token present, set a placeholder so auth header exists.
  useEffect(() => {
    if (!getAuthToken()) {
      setAuthToken('demo-token')
    }
  }, [])

  useEffect(() => {
    fetchBalance()
    pollingIntervalRef.current = setInterval(fetchBalance, 60_000)
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
    }
  }, [])

  // Countdown timer
  useEffect(() => {
    if (typeof countdown !== 'number') return
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        const next = typeof prev === 'number' ? Math.max(prev - 1, 0) : 0
        if (next === 0) {
          handleAutoLogout()
        }
        return next
      })
    }, 1000)

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    }
  }, [countdown])

  const formatCountdown = (totalSeconds) => {
    if (typeof totalSeconds !== 'number') return '—'
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold">User Dashboard</h1>
        <p className="mt-2 text-gray-600">Credit and time overview</p>

        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <div className="text-sm text-gray-500">Credit Balance</div>
              <div className="mt-1 text-2xl font-semibold">{creditBalance ?? '—'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Remaining Time (minutes)</div>
              <div className="mt-1 text-2xl font-semibold">{remainingTime ?? '—'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Countdown</div>
              <div className="mt-1 text-2xl font-semibold">{formatCountdown(countdown)}</div>
            </div>
          </div>
          {error && (
            <div className="mt-4 rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}
          {!error && creditBalance === null && remainingTime === null && (
            <div className="mt-4 text-sm text-gray-500">Loading...</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
