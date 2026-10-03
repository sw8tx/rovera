'use client'

import { useState } from 'react'

export default function LoginPanel() {
  const [open, setOpen] = useState(false)

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
            <button className="google-login" type="button" onClick={() => { window.location.href = '/api/auth/google' }}><span className="google-mark">G</span>Continue with Google</button>
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
