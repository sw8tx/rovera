'use client'

import { useEffect, useState, type FormEvent } from 'react'

type User = { id?: string; provider?: string; name?: string; email?: string; picture?: string }

export default function ProfilePanel() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/auth/session', { credentials: 'same-origin' })
      .then((response) => response.ok ? response.json() : null)
      .then((session) => {
        const nextUser = session?.user ?? session ?? null
        setUser(nextUser)
        setName(nextUser?.name || '')
      })
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

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      const response = await fetch('/api/account/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ name }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not save your settings.')
      setUser(result.user)
      setMessage('Settings saved.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save your settings.')
    } finally { setSaving(false) }
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
        <div><span>Sign-in method</span><strong>{user.provider === 'email' ? 'Email code' : 'Google'}</strong></div>
      </div>
      <form className="profile-settings" onSubmit={saveProfile}>
        <label htmlFor="profile-name">Display name</label>
        <div className="profile-setting-row">
          <input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoComplete="name" />
          <button className="profile-save" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
        {message && <p className="profile-message" role="status">{message}</p>}
      </form>
      <p className="profile-note">These details come from your Google account and are used to identify your Rovera account.</p>
      <div className="profile-actions">
        <a className="profile-action" href="/">Continue shopping</a>
        <button className="profile-logout" type="button" onClick={() => { window.location.href = '/api/auth/logout' }}>Log out</button>
      </div>
    </section>
  )
}
