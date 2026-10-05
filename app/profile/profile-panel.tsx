'use client'

import { useEffect, useState } from 'react'

type User = { name?: string; email?: string; picture?: string }

export default function ProfilePanel() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/session', { credentials: 'same-origin' })
      .then((response) => response.ok ? response.json() : null)
      .then((session) => setUser(session?.user ?? session ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <section className="profile-card profile-loading">Loading account…</section>

  if (!user) {
    return (
      <section className="profile-card">
        <p className="profile-kicker">ROVERA ACCOUNT</p>
        <h1>Sign in to view your settings</h1>
        <p className="profile-copy">Your Google profile details will appear here after you sign in.</p>
        <a className="profile-action" href="/">Back to login</a>
      </section>
    )
  }

  return (
    <section className="profile-card">
      <div className="profile-heading">
        {user.picture ? <img className="profile-avatar" src={user.picture} alt="" /> : <div className="profile-avatar profile-avatar-fallback">{(user.name || user.email || 'R').slice(0, 1).toUpperCase()}</div>}
        <div>
          <p className="profile-kicker">ROVERA ACCOUNT</p>
          <h1>Profile settings</h1>
        </div>
      </div>
      <div className="profile-fields">
        <div><span>Name</span><strong>{user.name || 'Not provided'}</strong></div>
        <div><span>Email</span><strong>{user.email || 'Not provided'}</strong></div>
        <div><span>Sign-in method</span><strong>Google</strong></div>
      </div>
      <p className="profile-note">These details come from your Google account and are used to identify your Rovera account.</p>
      <div className="profile-actions">
        <a className="profile-action" href="/">Continue shopping</a>
        <button className="profile-logout" type="button" onClick={() => { window.location.href = '/api/auth/logout' }}>Log out</button>
      </div>
    </section>
  )
}
