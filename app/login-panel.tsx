'use client'

import { useEffect, useState } from 'react'

type SessionUser = {
  name?: string
  email?: string
  picture?: string
}

export default function LoginPanel() {
  const [open, setOpen] = useState(false)
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/session', { credentials: 'same-origin' })
      .then((response) => response.ok ? response.json() : null)
      .then((session) => setUser(session?.user ?? session ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <span className="login-loading" aria-hidden="true" />

  if (user) {
    return (
      <div className="logged-in-user">
        {user.picture && <img src={user.picture} alt="" className="logged-in-avatar" />}
        <span className="logged-in-name">{user.name || user.email || 'Account'}</span>
        <button className="logout-button" type="button" onClick={() => { window.location.href = '/api/auth/logout' }}>Log out</button>
      </div>
    )
  }

  return (
    <>
      <button className="login-button" type="button" onClick={() => setOpen(true)}>
        Log in
      </button>

      {open && (
        <div className="login-overlay" role="presentation" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setOpen(false)
        }}>
          <section className="login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title">
            <button className="login-close" type="button" aria-label="Close login" onClick={() => setOpen(false)}>×</button>
            <p className="login-kicker">ROVERA ACCOUNT</p>
            <h2 id="login-title">Welcome back</h2>
            <p className="login-copy">Sign in to manage your orders, saved items, and account details.</p>
            <button className="google-login" type="button" onClick={() => { window.location.href = '/api/auth/google' }}><img className="google-mark" src="/google-g.svg" alt="" />Continue with Google</button>
            <div className="login-divider"><span>or</span></div>
            <label className="login-label" htmlFor="login-email">Email address</label>
            <input className="login-input" id="login-email" type="email" placeholder="you@example.com" />
            <button className="email-login" type="button">Continue with email</button>
            <p className="login-note">No password needed. We&apos;ll send you a secure sign-in link.</p>
          </section>
        </div>
      )}
    </>
  )
}
