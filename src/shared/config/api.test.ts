import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('API Configuration', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  describe('validateEnv', () => {
    it('does not throw at module import time when VITE_API_BASE_URL is missing', async () => {
      vi.stubEnv('DEV', true)
      vi.stubEnv('VITE_API_BASE_URL', '')
      vi.stubEnv('VITE_FRONTEND_BASE_URL', 'http://localhost:5173')

      const mod = await import('./api')

      expect(mod.API_BASE_URL).toBe('http://localhost:8080')
    })

    it('throws in dev when VITE_API_BASE_URL is missing during explicit validation', async () => {
      vi.stubEnv('DEV', true)
      vi.stubEnv('VITE_API_BASE_URL', '')
      vi.stubEnv('VITE_FRONTEND_BASE_URL', 'http://localhost:5173')

      const mod = await import('./api')

      expect(() => mod.validateEnv()).toThrow('VITE_API_BASE_URL is not set')
    })

    it('throws in production when VITE_API_BASE_URL is missing during explicit validation', async () => {
      vi.stubEnv('DEV', false)
      vi.stubEnv('PROD', true)
      vi.stubEnv('VITE_API_BASE_URL', '')
      vi.stubEnv('VITE_FRONTEND_BASE_URL', 'http://localhost:5173')

      const mod = await import('./api')

      expect(() => mod.validateEnv()).toThrow('VITE_API_BASE_URL is not set')
    })

    it('throws when VITE_API_BASE_URL is not an absolute URL', async () => {
      vi.stubEnv('DEV', false)
      vi.stubEnv('PROD', true)
      vi.stubEnv('VITE_API_BASE_URL', 'api.localhost')
      vi.stubEnv('VITE_FRONTEND_BASE_URL', 'http://localhost:5173')

      const mod = await import('./api')

      expect(() => mod.validateEnv()).toThrow('VITE_API_BASE_URL must be a valid absolute URL')
    })

    it('throws when VITE_API_BASE_URL uses a non-http protocol', async () => {
      vi.stubEnv('DEV', false)
      vi.stubEnv('PROD', true)
      vi.stubEnv('VITE_API_BASE_URL', 'ftp://api.example.com')
      vi.stubEnv('VITE_FRONTEND_BASE_URL', 'http://localhost:5173')

      const mod = await import('./api')

      expect(() => mod.validateEnv()).toThrow('VITE_API_BASE_URL must use http or https')
    })

    it('throws when VITE_FRONTEND_BASE_URL is set to an invalid URL', async () => {
      vi.stubEnv('DEV', false)
      vi.stubEnv('PROD', true)
      vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
      vi.stubEnv('VITE_FRONTEND_BASE_URL', 'grainlify.local')

      const mod = await import('./api')

      expect(() => mod.validateEnv()).toThrow('VITE_FRONTEND_BASE_URL must be a valid absolute URL')
    })

    it('passes when required URLs are valid', async () => {
      vi.stubEnv('DEV', false)
      vi.stubEnv('PROD', true)
      vi.stubEnv('VITE_API_BASE_URL', 'https://api.example.com')
      vi.stubEnv('VITE_FRONTEND_BASE_URL', 'https://grainlify.example.com')

      const mod = await import('./api')

      expect(() => mod.validateEnv()).not.toThrow()
    })
  })

  describe('API_BASE_URL', () => {
    it('reads from VITE_API_BASE_URL', async () => {
      vi.stubEnv('VITE_API_BASE_URL', 'http://test-api.com')
      vi.stubEnv('VITE_FRONTEND_BASE_URL', 'http://localhost:5173')
      vi.stubEnv('DEV', false)

      const mod = await import('./api')
      expect(mod.API_BASE_URL).toBe('http://test-api.com')
    })

    it('strips trailing slash', async () => {
      vi.stubEnv('VITE_API_BASE_URL', 'http://test-api.com/')
      vi.stubEnv('VITE_FRONTEND_BASE_URL', 'http://localhost:5173')
      vi.stubEnv('DEV', false)

      const mod = await import('./api')
      expect(mod.API_BASE_URL).toBe('http://test-api.com')
    })

    it('strips multiple trailing slashes', async () => {
      vi.stubEnv('VITE_API_BASE_URL', 'http://test-api.com///')
      vi.stubEnv('VITE_FRONTEND_BASE_URL', 'http://localhost:5173')
      vi.stubEnv('DEV', false)

      const mod = await import('./api')
      expect(mod.API_BASE_URL).toBe('http://test-api.com')
    })
  })

  describe('FRONTEND_BASE_URL', () => {
    it('reads from VITE_FRONTEND_BASE_URL when set', async () => {
      vi.stubEnv('VITE_FRONTEND_BASE_URL', 'https://myapp.com')
      vi.stubEnv('VITE_API_BASE_URL', 'http://test-api.com')
      vi.stubEnv('DEV', false)

      const mod = await import('./api')
      expect(mod.FRONTEND_BASE_URL).toBe('https://myapp.com')
    })

    it('defaults to window.location.origin when not set', async () => {
      vi.stubEnv('VITE_FRONTEND_BASE_URL', '')
      vi.stubEnv('VITE_API_BASE_URL', 'http://test-api.com')
      vi.stubEnv('DEV', false)

      const mod = await import('./api')
      expect(mod.FRONTEND_BASE_URL).toBe(window.location.origin)
    })

    it('uses a safe fallback when window is unavailable', async () => {
      vi.stubGlobal('window', undefined)
      vi.stubEnv('VITE_FRONTEND_BASE_URL', '')
      vi.stubEnv('VITE_API_BASE_URL', 'http://test-api.com')
      vi.stubEnv('DEV', false)

      const mod = await import('./api')
      expect(mod.FRONTEND_BASE_URL).toBe('http://localhost:5173')
    })

    it('strips trailing slash from FRONTEND_BASE_URL', async () => {
      vi.stubEnv('VITE_FRONTEND_BASE_URL', 'https://myapp.com/')
      vi.stubEnv('VITE_API_BASE_URL', 'http://test-api.com')
      vi.stubEnv('DEV', false)

      const mod = await import('./api')
      expect(mod.FRONTEND_BASE_URL).toBe('https://myapp.com')
    })
  })

  describe('OAUTH_CALLBACK_URL', () => {
    it('constructs callback URL from FRONTEND_BASE_URL', async () => {
      vi.stubEnv('VITE_FRONTEND_BASE_URL', 'https://myapp.com')
      vi.stubEnv('VITE_API_BASE_URL', 'http://test-api.com')
      vi.stubEnv('DEV', false)

      const mod = await import('./api')
      expect(mod.OAUTH_CALLBACK_URL).toBe('https://myapp.com/auth/callback')
    })
  })
})
