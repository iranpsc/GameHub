import { useEffect, useMemo, useState } from 'react'

function App() {
  const [creditBalance, setCreditBalance] = useState(null)
  const [remainingTime, setRemainingTime] = useState(null)
  const [error, setError] = useState('')

  // Derive an API base that targets /api (strip trailing /v1 if present)
  const apiBase = useMemo(() => {
    const raw = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
    return raw.replace(/\/?v1\/?$/, '')
  }, [])

  const fetchBalance = async () => {
    try {
      const response = await fetch(`${apiBase}/user/balance`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const data = await response.json()
      setCreditBalance(data.credit_balance)
      setRemainingTime(data.remaining_time)
      setError('')
    } catch (e) {
      setError(String(e))
    }
  }

  useEffect(() => {
    fetchBalance()
    const interval = setInterval(fetchBalance, 60_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold">User Dashboard</h1>
        <p className="mt-2 text-gray-600">Credit and time overview</p>

        <div className="mt-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <div className="text-sm text-gray-500">Credit Balance</div>
              <div className="mt-1 text-2xl font-semibold">{creditBalance ?? '—'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Remaining Time (minutes)</div>
              <div className="mt-1 text-2xl font-semibold">{remainingTime ?? '—'}</div>
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
