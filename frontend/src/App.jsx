import { useEffect, useState } from 'react'

function App() {
  const [health, setHealth] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
    fetch(`${apiBase}/health`)
      .then((r) => r.json())
      .then((data) => setHealth(data))
      .catch((e) => setError(String(e)))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold">React + Tailwind Frontend</h1>
        <p className="mt-2 text-gray-600">Backend health check:</p>
        <pre className="mt-4 rounded bg-gray-900 p-4 text-sm text-green-300">
          {health ? JSON.stringify(health, null, 2) : error || 'Loading...'}
        </pre>
      </div>
    </div>
  )
}

export default App
