'use client'

import { useEffect, useState, type FormEvent } from 'react'

type User = { id?: string; provider?: string; name?: string; email?: string; picture?: string }
type AccountSession = { id: string; device: string; ip: string; country: string; location: string; createdAt: number; lastSeen: number; current: boolean }

export default function ProfilePanel() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [sessions, setSessions] = useState<AccountSession[]>([])
  const [sessionsMessage, setSessionsMessage] = useState('')
  const [sessionsOpen, setSessionsOpen] = useState(false)

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

  useEffect(() => {
    if (!user) return
    fetch('/api/account/sessions', { credentials: 'same-origin', cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => setSessions(result?.sessions || []))
      .catch(() => setSessionsMessage('Could not load active sessions.'))
  }, [user?.id])

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
        <div><span>Sign-in method</span><strong>{user.provider === 'email' ? 'Email code' : user.provider === 'discord' ? 'Discord' : 'Google'}</strong></div>
      </div>
      <form className="profile-settings" onSubmit={saveProfile}>
        <label htmlFor="profile-name">Display name</label>
        <div className="profile-setting-row">
          <input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoComplete="name" />
          <button className="profile-save" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        </div>
        {message && <p className="profile-message" role="status">{message}</p>}
      </form>
      <p className="profile-note">Your profile details are stored securely and used to identify your Rovera account.</p>
      <section className="security-section">
        <div className="security-heading"><div><p className="profile-kicker">SECURITY</p><h2>Active sessions</h2></div><button className="security-toggle" type="button" aria-expanded={sessionsOpen} onClick={() => setSessionsOpen((open) => !open)}>{sessionsOpen ? 'Hide sessions' : 'View sessions'} <span aria-hidden="true">{sessionsOpen ? '↑' : '↓'}</span></button></div>
        <p className="security-copy">Review the devices currently signed in to your Rovera account.</p>
        {sessionsOpen && <div className="session-details"><div className="session-toolbar"><span className="security-copy">Manage access to your account.</span><button className="security-revoke-all" type="button" onClick={async () => { await fetch('/api/account/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ allOther: true }) }); setSessions(sessions.filter((session) => session.current)) }}>Log out others</button></div><div className="session-list">
          {sessions.some((session) => session.current) && <p className="session-group-title">Current device</p>}
          {sessions.filter((session) => session.current).map((session) => <div className="session-row" key={session.id}><div><strong>{session.device}<span className="session-current">This device</span></strong><span>{session.country} · {session.location} · {session.ip}</span><small>Last active {new Date(session.lastSeen).toLocaleString()}</small></div></div>)}
          {sessions.some((session) => !session.current) && <p className="session-group-title">Other devices</p>}
          {sessions.filter((session) => !session.current).map((session) => <div className="session-row" key={session.id}><div><strong>{session.device}</strong><span>{session.country} · {session.location} · {session.ip}</span><small>Last active {new Date(session.lastSeen).toLocaleString()}</small></div><button className="session-revoke" type="button" onClick={async () => { await fetch('/api/account/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: session.id }) }); setSessions(sessions.filter((item) => item.id !== session.id)) }}>Log out</button></div>)}
          {!sessions.length && <span className="security-copy">No active sessions found.</span>}
        </div></div>}
        {sessionsMessage && <p className="profile-message" role="status">{sessionsMessage}</p>}
      </section>
      <div className="profile-actions">
        <a className="profile-action" href="/">Continue shopping</a>
        <button className="profile-logout" type="button" onClick={() => { window.location.href = '/api/auth/logout' }}>Log out</button>
      </div>
    </section>
  )
}
