import { jest } from '@jest/globals'
import { authorizedFetch, fetchJsonOrThrow, getApiBase, getAuthToken, setAuthToken } from './api'

beforeEach(() => {
  localStorage.clear()
})

test('getApiBase strips /v1 suffix', () => {
  expect(getApiBase()).toBe('http://localhost:8000/api')
})

test('authorizedFetch sends token header when present', async () => {
  setAuthToken('abc')
  global.fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true }) })
  await authorizedFetch('/x', { method: 'GET' })
  expect(global.fetch).toHaveBeenCalledWith('/x', expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer abc' }) }))
})

test('fetchJsonOrThrow handles 401 by clearing auth and redirecting', async () => {
  setAuthToken('abc')
  delete window.location
  window.location = { href: '/', assign: jest.fn() }
  const resp = { ok: false, status: 401, text: async () => '' }
  await expect(fetchJsonOrThrow(resp)).rejects.toThrow('Unauthenticated')
  expect(getAuthToken()).toBeNull()
  expect(window.location.href).toBe('/login.html')
})

test('fetchJsonOrThrow throws message on non-OK', async () => {
  const resp = { ok: false, status: 500, text: async () => 'boom' }
  await expect(fetchJsonOrThrow(resp)).rejects.toThrow('boom')
})