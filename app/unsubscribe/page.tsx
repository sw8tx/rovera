'use client'

import { useEffect, useState, type FormEvent } from 'react'

export default function UnsubscribePage() {
  const [token, setToken] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setToken(new URLSearchParams(window.location.search).get('token') || ''))
    return () => window.cancelAnimationFrame(frame)
  }, [])

  async function unsubscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setMessage('')
    try {
      const response = await fetch('/api/newsletter/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        body: JSON.stringify({ token }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error || 'This unsubscribe link could not be used.')
      setMessage('You are unsubscribed from Rovera marketing emails. This change is saved.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Please try again later.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="legal-page">
      <nav aria-label="Rovera"><a href="https://rovera.xyz/">Rovera</a></nav>
      <article className="legal-content">
        <h1>Email preferences</h1>
        <p>Use this secure link to unsubscribe from Rovera marketing emails. Your account and security emails are not affected.</p>
        {message ? <p role="status">{message}</p> : <form onSubmit={unsubscribe}>
          {!token && <p>This unsubscribe link is missing or invalid. Please use the complete link from your Rovera email.</p>}
          <button type="submit" disabled={!token || busy}>{busy ? 'Saving…' : 'Unsubscribe'}</button>
        </form>}
      </article>
    </main>
  )
}
