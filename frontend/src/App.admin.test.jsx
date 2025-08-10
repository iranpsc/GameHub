import { render, screen, waitFor, fireEvent, act, within } from '@testing-library/react'
import { jest } from '@jest/globals'
import { AdminUsers, AdminRecharge, AdminLogs, AdminSessions, Dashboard } from './App'

function mockFetchOnce(json, init = { status: 200 }) {
  global.fetch.mockResolvedValueOnce({
    ok: init.status >= 200 && init.status < 300,
    status: init.status,
    json: async () => json,
    text: async () => JSON.stringify(json),
  })
}

describe('Dashboard (unit)', () => {
  test('shows values after fetch', async () => {
    mockFetchOnce({ credit_balance: 2, remaining_time: 3 })
    render(<Dashboard />)
    await screen.findByText('Credit Balance')
    await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument())
  })

  test('auto-logs out when credit is zero', async () => {
    // initial fetch triggers immediate auto logout path
    mockFetchOnce({ credit_balance: 0, remaining_time: 0 })
    // logout call
    mockFetchOnce({})

    render(<Dashboard />)
    await screen.findByText('Credit Balance')

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/logout$/),
        expect.objectContaining({ method: 'POST' })
      )
    })
  })
})

describe('AdminUsers (unit)', () => {
  test('renders list and create flow', async () => {
    mockFetchOnce({ data: [] })
    render(<AdminUsers />)
    await screen.findByText('Users')

    mockFetchOnce({ id: 1, name: 'Bob', email: 'b@example.com' })
    mockFetchOnce({ data: [{ id: 1, name: 'Bob', email: 'b@example.com' }] })

    fireEvent.change(screen.getByPlaceholderText('Name'), { target: { value: 'Bob' } })
    fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'b@example.com' } })
    const pwd = screen.getByPlaceholderText('Password')
    fireEvent.change(pwd, { target: { value: 'pw' } })
    fireEvent.submit(pwd.closest('form'))

    await screen.findByText('b@example.com')
  })
})

describe('AdminRecharge (unit)', () => {
  test('submits and shows status', async () => {
    render(<AdminRecharge />)
    const inputs = screen.getAllByRole('spinbutton')
    fireEvent.change(inputs[0], { target: { value: '1' } })
    fireEvent.change(inputs[1], { target: { value: '500' } })

    mockFetchOnce({ message: 'Balance recharged' })

    fireEvent.click(screen.getByText('Recharge', { selector: 'button' }))
    await screen.findByText('Recharged successfully')
  })
})

describe('AdminLogs/AdminSessions (unit)', () => {
  test('loads logs and sessions', async () => {
    // Logs component
    render(<AdminLogs />)
    mockFetchOnce({ data: [{ id: 1, action_type: 'login', user: { email: 'x@y' }, timestamp: 'now' }] })
    fireEvent.click(screen.getByText('Filter', { selector: 'button' }))
    await screen.findByText('login')

    // Sessions component
    render(<AdminSessions />)
    mockFetchOnce({ data: [{ id: 2, start_time: 'now', end_time: null, user: { email: 'x@y' } }] })
    const buttons = screen.getAllByText('Filter', { selector: 'button' })
    fireEvent.click(buttons[buttons.length - 1])
    await screen.findByText('—')
  })
})