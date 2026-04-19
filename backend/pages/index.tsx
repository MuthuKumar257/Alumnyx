import { useEffect, useState } from 'react'

type HealthResponse = {
  message?: string
}

export default function Page() {
  const [status, setStatus] = useState('Checking API...')

  useEffect(() => {
    async function checkApi() {
      try {
        const response = await fetch('/api')
        if (!response.ok) {
          setStatus(`API check failed (${response.status})`)
          return
        }

        const payload = (await response.json()) as HealthResponse
        setStatus(payload.message || 'API is up')
      } catch (error) {
        setStatus(`API check failed: ${error instanceof Error ? error.message : 'unknown error'}`)
      }
    }

    checkApi()
  }, [])

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: '24px' }}>
      <h1>Alumnyx Backend</h1>
      <p>{status}</p>
    </main>
  )
}
