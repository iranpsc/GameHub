import { useEffect, useMemo, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom'
import { authorizedFetch, clearAuth, fetchJsonOrThrow, getAuthToken, getApiBase, redirectToLogin } from './api'

export function Dashboard() {
  const [creditBalance, setCreditBalance] = useState(null)
  const [remainingTime, setRemainingTime] = useState(null)
  const [error, setError] = useState('')
  const [countdown, setCountdown] = useState(null)

  const pollingIntervalRef = useRef(null)
  const countdownIntervalRef = useRef(null)

  const apiBase = useMemo(() => getApiBase(), [])

  const fetchBalance = async () => {
    try {
      const response = await authorizedFetch(`${apiBase}/user/balance`)
      const data = await fetchJsonOrThrow(response)
      setCreditBalance(data.credit_balance)
      setRemainingTime(data.remaining_time)
      setCountdown(data.remaining_time * 60)
      setError('')

      if (Number(data.credit_balance) <= 0) {
        await handleAutoLogout()
      }
    } catch (e) {
      setError(String(e.message || e))
    }
  }

  const handleAutoLogout = async () => {
    try {
      const response = await authorizedFetch(`${apiBase}/logout`, { method: 'POST' })
      if (!response.ok && response.status !== 401) {
        // ignore
      }
    } catch {
      // ignore
    } finally {
      clearAuth()
      redirectToLogin()
    }
  }

  useEffect(() => {
    if (!getAuthToken()) {
      // Demo-only: set a placeholder token so header exists
      localStorage.setItem('token', 'demo-token')
    }
  }, [])

  useEffect(() => {
    fetchBalance()
    pollingIntervalRef.current = setInterval(fetchBalance, 60_000)
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current)
    }
  }, [])

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
    <div className="container">
      <h1 className="text-3xl font-bold">User Dashboard</h1>
      <p className="sub">Credit and time overview</p>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="grid">
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
  )
}

export function AdminUsers() {
  const apiBase = useMemo(() => `${getApiBase()}/v1`, [])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [editingUser, setEditingUser] = useState(null)

  const loadUsers = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await authorizedFetch(`${apiBase}/users`)
      const data = await fetchJsonOrThrow(res)
      const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
      setUsers(list)
    } catch (e) {
      setError(String(e.message || e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      const res = await authorizedFetch(`${apiBase}/users`, {
        method: 'POST',
        body: JSON.stringify(form),
      })
      await fetchJsonOrThrow(res)
      setForm({ name: '', email: '', password: '' })
      loadUsers()
    } catch (e) {
      alert(e.message || String(e))
    }
  }

  const handleUpdate = async (userId) => {
    try {
      const res = await authorizedFetch(`${apiBase}/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(editingUser),
      })
      await fetchJsonOrThrow(res)
      setEditingUser(null)
      loadUsers()
    } catch (e) {
      alert(e.message || String(e))
    }
  }

  const handleDelete = async (userId) => {
    if (!confirm('Delete this user?')) return
    try {
      const res = await authorizedFetch(`${apiBase}/users/${userId}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) await fetchJsonOrThrow(res)
      loadUsers()
    } catch (e) {
      alert(e.message || String(e))
    }
  }

  return (
    <div className="container">
      <h2>Users</h2>
      <div className="card" style={{ marginTop: 16 }}>
        <form onSubmit={handleCreate}>
          <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(4, 1fr)' }}>
            <input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <input placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
            <input placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            <button type="submit">Add</button>
          </div>
        </form>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        {loading ? 'Loading...' : error ? <div style={{ color: 'crimson' }}>{error}</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left' }}>ID</th>
                <th style={{ textAlign: 'left' }}>Name</th>
                <th style={{ textAlign: 'left' }}>Email</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.id}</td>
                  <td>
                    {editingUser?.id === u.id ? (
                      <input value={editingUser.name} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} />
                    ) : u.name}
                  </td>
                  <td>
                    {editingUser?.id === u.id ? (
                      <input value={editingUser.email} onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })} />
                    ) : u.email}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {editingUser?.id === u.id ? (
                      <>
                        <button onClick={() => handleUpdate(u.id)}>Save</button>
                        <button onClick={() => setEditingUser(null)} style={{ marginLeft: 8 }}>Cancel</button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setEditingUser({ id: u.id, name: u.name, email: u.email })}>Edit</button>
                        <button onClick={() => handleDelete(u.id)} style={{ marginLeft: 8, color: 'crimson' }}>Delete</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export function AdminRecharge() {
  const apiBase = useMemo(() => getApiBase(), [])
  const [form, setForm] = useState({ user_id: '', amount: '', description: '' })
  const [status, setStatus] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus('')
    try {
      const res = await authorizedFetch(`${apiBase}/admin/recharge`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: Number(form.user_id),
          amount: Number(form.amount),
          description: form.description || undefined,
        }),
      })
      await fetchJsonOrThrow(res)
      setStatus('Recharged successfully')
      setForm({ user_id: '', amount: '', description: '' })
    } catch (e) {
      setStatus(e.message || String(e))
    }
  }

  return (
    <div className="container">
      <h2>Manual Credit Recharge</h2>
      <div className="card" style={{ marginTop: 16 }}>
        <form onSubmit={handleSubmit}>
          <label>User ID</label>
          <input type="number" value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} required />
          <label>Amount</label>
          <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          <label>Description (optional)</label>
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <div style={{ marginTop: 12 }}>
            <button type="submit">Recharge</button>
          </div>
          {status && <div style={{ marginTop: 12 }}>{status}</div>}
        </form>
      </div>
    </div>
  )
}

export function AdminLogs() {
  const apiBase = useMemo(() => getApiBase(), [])
  const [logs, setLogs] = useState([])
  const [filters, setFilters] = useState({ user_id: '', action_type: '' })
  const [status, setStatus] = useState('')

  const loadLogs = async () => {
    setStatus('')
    try {
      const qs = new URLSearchParams()
      if (filters.user_id) qs.set('user_id', filters.user_id)
      if (filters.action_type) qs.set('action_type', filters.action_type)
      const res = await authorizedFetch(`${apiBase}/admin/logs?${qs.toString()}`)
      const data = await fetchJsonOrThrow(res)
      const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
      setLogs(list)
    } catch (e) {
      setStatus(e.message || String(e))
    }
  }

  useEffect(() => { loadLogs() }, [])

  return (
    <div className="container">
      <h2>User Activity Logs</h2>
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input placeholder="User ID" value={filters.user_id} onChange={(e) => setFilters({ ...filters, user_id: e.target.value })} />
          <input placeholder="Action Type" value={filters.action_type} onChange={(e) => setFilters({ ...filters, action_type: e.target.value })} />
          <button onClick={loadLogs}>Filter</button>
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        {status && <div style={{ color: 'crimson' }}>{status}</div>}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>ID</th>
              <th style={{ textAlign: 'left' }}>User</th>
              <th style={{ textAlign: 'left' }}>Action</th>
              <th style={{ textAlign: 'left' }}>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td>{l.id}</td>
                <td>{l.user?.email || l.user_id}</td>
                <td>{l.action_type}</td>
                <td>{l.timestamp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function AdminSessions() {
  const apiBase = useMemo(() => getApiBase(), [])
  const [sessions, setSessions] = useState([])
  const [filters, setFilters] = useState({ user_id: '', active: '' })
  const [status, setStatus] = useState('')

  const loadSessions = async () => {
    setStatus('')
    try {
      const qs = new URLSearchParams()
      if (filters.user_id) qs.set('user_id', filters.user_id)
      if (filters.active !== '') qs.set('active', filters.active)
      const res = await authorizedFetch(`${apiBase}/admin/sessions?${qs.toString()}`)
      const data = await fetchJsonOrThrow(res)
      const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : [])
      setSessions(list)
    } catch (e) {
      setStatus(e.message || String(e))
    }
  }

  useEffect(() => { loadSessions() }, [])

  return (
    <div className="container">
      <h2>Login/Logout Sessions</h2>
      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input placeholder="User ID" value={filters.user_id} onChange={(e) => setFilters({ ...filters, user_id: e.target.value })} />
          <select value={filters.active} onChange={(e) => setFilters({ ...filters, active: e.target.value })}>
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Ended</option>
          </select>
          <button onClick={loadSessions}>Filter</button>
        </div>
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        {status && <div style={{ color: 'crimson' }}>{status}</div>}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>ID</th>
              <th style={{ textAlign: 'left' }}>User</th>
              <th style={{ textAlign: 'left' }}>Start</th>
              <th style={{ textAlign: 'left' }}>End</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td>{s.user?.email || s.user_id}</td>
                <td>{s.start_time}</td>
                <td>{s.end_time || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Nav() {
  return (
    <nav className="container" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <Link to="/">Dashboard</Link>
      <span style={{ opacity: 0.5 }}>|</span>
      <Link to="/admin/users">Users</Link>
      <Link to="/admin/recharge">Recharge</Link>
      <Link to="/admin/logs">Logs</Link>
      <Link to="/admin/sessions">Sessions</Link>
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Nav />
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/recharge" element={<AdminRecharge />} />
        <Route path="/admin/logs" element={<AdminLogs />} />
        <Route path="/admin/sessions" element={<AdminSessions />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}
