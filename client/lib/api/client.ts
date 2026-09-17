/**
 * FSO Centralized API Client
 *
 * Requirements:
 * - Uses NEXT_PUBLIC_API_URL (defaults to http://localhost:5000)
 * - Automatically routes through /api/v1
 * - Secure credential transport (httpOnly cookies for refreshToken)
 * - In-memory accessToken storage (never exposed to localStorage)
 * - Automatic 401 interceptor & refresh token queue
 * - Sanitized ApiError abstraction
 */

export class ApiError extends Error {
  code: string
  status: number
  details?: unknown

  constructor(message: string, status: number, code: string = 'API_ERROR', details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean
  params?: Record<string, string | number | boolean | undefined | null>
}

class ApiClient {
  private baseUrl: string
  private accessToken: string | null = null
  private isRefreshing: boolean = false
  private refreshSubscribers: Array<(token: string | null) => void> = []
  private authStateListeners: Array<(isAuthenticated: boolean) => void> = []

  constructor() {
    // Read base URL from env or fallback to localhost:5000
    const envUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
    this.baseUrl = envUrl.replace(/\/+$/, '')
  }

  public setAccessToken(token: string | null): void {
    this.accessToken = token
    this.notifyAuthStateListeners(Boolean(token))
  }

  public getAccessToken(): string | null {
    return this.accessToken
  }

  public onAuthStateChange(listener: (isAuthenticated: boolean) => void): () => void {
    this.authStateListeners.push(listener)
    return () => {
      this.authStateListeners = this.authStateListeners.filter((l) => l !== listener)
    }
  }

  private notifyAuthStateListeners(isAuthenticated: boolean): void {
    this.authStateListeners.forEach((listener) => {
      try {
        listener(isAuthenticated)
      } catch (err) {
        console.error('Error in auth state listener:', err)
      }
    })
  }

  private subscribeTokenRefresh(cb: (token: string | null) => void): void {
    this.refreshSubscribers.push(cb)
  }

  private onTokenRefreshed(token: string | null): void {
    this.refreshSubscribers.forEach((cb) => cb(token))
    this.refreshSubscribers = []
  }

  /**
   * Attempt to refresh the access token using httpOnly cookie at /api/v1/auth/refresh
   */
  private async refreshAccessToken(): Promise<string | null> {
    try {
      const refreshUrl = `${this.baseUrl}/api/v1/auth/refresh`
      const res = await fetch(refreshUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      })

      if (!res.ok) {
        this.setAccessToken(null)
        return null
      }

      const data = await res.json()
      const newToken = data.accessToken || data.token
      if (newToken) {
        this.setAccessToken(newToken)
        return newToken
      }
      this.setAccessToken(null)
      return null
    } catch {
      this.setAccessToken(null)
      return null
    }
  }

  /**
   * Core request executor with 401 automatic retry
   */
  public async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { skipAuth = false, params, ...customConfig } = options

    // Normalize endpoint path
    let cleanPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
    if (!cleanPath.startsWith('/api/')) {
      cleanPath = `/api/v1${cleanPath}`
    }

    // Append query parameters if provided
    let url = `${this.baseUrl}${cleanPath}`
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, String(value))
        }
      })
      const queryString = searchParams.toString()
      if (queryString) {
        url += (url.includes('?') ? '&' : '?') + queryString
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((customConfig.headers as Record<string, string>) || {}),
    }

    // Attach Bearer token if available and not skipped
    if (!skipAuth && this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }

    const config: RequestInit = {
      ...customConfig,
      headers,
      credentials: 'include', // Always send cookies (for refresh token)
    }

    let response: Response
    try {
      response = await fetch(url, config)
    } catch (networkError) {
      throw new ApiError(
        'Unable to connect to FSO services. Please verify your internet connection or try again later.',
        0,
        'NETWORK_ERROR',
        networkError
      )
    }

    // Handle 401 Unauthorized with token refresh and request replay
    if (response.status === 401 && !skipAuth && !cleanPath.includes('/auth/login') && !cleanPath.includes('/auth/refresh')) {
      if (!this.isRefreshing) {
        this.isRefreshing = true
        const newToken = await this.refreshAccessToken()
        this.isRefreshing = false
        this.onTokenRefreshed(newToken)

        if (newToken) {
          headers['Authorization'] = `Bearer ${newToken}`
          return fetch(url, { ...config, headers }).then(this.handleResponse<T>)
        }
      } else {
        // Queue this request until current refresh completes
        return new Promise<T>((resolve, reject) => {
          this.subscribeTokenRefresh((newToken) => {
            if (newToken) {
              headers['Authorization'] = `Bearer ${newToken}`
              fetch(url, { ...config, headers })
                .then(this.handleResponse<T>)
                .then(resolve)
                .catch(reject)
            } else {
              reject(new ApiError('Session expired. Please sign in again.', 401, 'UNAUTHORIZED'))
            }
          })
        })
      }
    }

    return this.handleResponse<T>(response)
  }

  private handleResponse = async <T>(response: Response): Promise<T> => {
    let data: unknown
    const contentType = response.headers.get('content-type')

    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json()
      } catch {
        data = null
      }
    } else {
      data = await response.text()
    }

    if (!response.ok) {
      let errorMessage = 'An unexpected error occurred. Please try again.'
      let errorCode = `HTTP_${response.status}`
      let errorDetails: unknown = undefined

      if (typeof data === 'object' && data !== null) {
        const errorPayload = data as Record<string, unknown>
        if (errorPayload.error && typeof errorPayload.error === 'object') {
          const innerError = errorPayload.error as Record<string, unknown>
          errorMessage = (innerError.message as string) || errorMessage
          errorCode = (innerError.code as string) || errorCode
          errorDetails = innerError.details
        } else if (typeof errorPayload.message === 'string') {
          errorMessage = errorPayload.message
        }
      }

      throw new ApiError(errorMessage, response.status, errorCode, errorDetails)
    }

    // If backend wrapped in { success: true, data: ... }, unwrap data if consumer expects raw payload
    // or return directly if data already matches
    if (typeof data === 'object' && data !== null && 'success' in data && 'data' in data) {
      const wrapped = data as { success: boolean; data: T; meta?: unknown; message?: string }
      // Return wrapped directly or payload as needed
      return wrapped as unknown as T
    }

    return data as T
  }

  public get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  public post<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  }

  public put<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  }

  public patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  }

  public delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

export const apiClient = new ApiClient()
