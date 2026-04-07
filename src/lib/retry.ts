const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = MAX_RETRIES,
): Promise<Response> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, init)

      if (response.ok) return response

      // Don't retry client errors (4xx)
      if (response.status >= 400 && response.status < 500) {
        return response
      }

      // Retry on 5xx or network errors
      lastError = new Error(`API error ${response.status}: ${await response.text().catch(() => response.statusText)}`)
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }

    if (attempt < retries) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError ?? new Error('Request failed after retries')
}
