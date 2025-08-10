import { jest } from '@jest/globals'
import '@testing-library/jest-dom'

beforeEach(() => {
  jest.useFakeTimers()
  global.fetch = jest.fn()
})

afterEach(() => {
  jest.useRealTimers()
  jest.resetAllMocks()
})