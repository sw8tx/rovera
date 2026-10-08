'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'

type User = { id?: string; provider?: string; name?: string; email?: string; picture?: string; settings_json?: string }
type AccountSession = { id: string; device: string; ip: string; country: string; location: string; lastSeen: number; current: boolean }
type Language = 'en' | 'de'
type Notifications = Record<'emailOrders' | 'emailBuyRequests' | 'emailPayouts' | 'emailSecurity' | 'websiteOrders' | 'websiteBuyRequests' | 'websitePayouts' | 'websiteSecurity', boolean>

const copy = {
  en: { accountSettings: 'Account settings', account: 'Account', information: 'Information', myAccount: 'My account', security: 'Security', notifications: 'Notifications', purchases: 'Purchases', sell: 'Sell to Rovera', privacy: 'Privacy', connected: 'Connected accounts', language: 'Language', emails: 'Emails', username: 'Username', email: 'Email', save: 'Save', saved: 'Saved.', loggedDevices: 'Logged-in devices', currentDevice: 'Current device', otherDevices: 'Other devices', logout: 'Log out', logoutOthers: 'Log out others', unavailable: 'Not available yet', unavailableText: 'This feature is not connected to Rovera yet. We will add it when the required backend is ready.', profileText: 'Manage the name shown on your Rovera account.', securityText: 'Review active sessions and account access.', notificationsText: 'Choose which account events may notify you.', website: 'Website', emailChannel: 'Email', orders: 'Orders', buyRequests: 'Buy requests', payouts: 'Payouts', securityEvents: 'Security', newsletter: 'Receive Newsletter', newsletterText: 'Marketing emails are not active until a compliant sending flow is configured.', privacyText: 'Download and account lifecycle controls.', deactivate: 'Deactivate account', delete: 'Delete account', languageText: 'Choose the language for this settings page.', provider: 'Sign-in method', noSessions: 'No active sessions found.' },
  de: { accountSettings: 'Kontoeinstellungen', account: 'Konto', information: 'Informationen', myAccount: 'Mein Konto', security: 'Sicherheit', notifications: 'Benachrichtigungen', purchases: 'Käufe', sell: 'An Rovera verkaufen', privacy: 'Datenschutz', connected: 'Verbundene Konten', language: 'Sprache', emails: 'E-Mails', username: 'Benutzername', email: 'E-Mail', save: 'Speichern', saved: 'Gespeichert.', loggedDevices: 'Angemeldete Geräte', currentDevice: 'Aktuelles Gerät', otherDevices: 'Andere Geräte', logout: 'Abmelden', logoutOthers: 'Andere abmelden', unavailable: 'Noch nicht verfügbar', unavailableText: 'Diese Funktion ist noch nicht an Rovera angebunden. Sie wird ergänzt, sobald das benötigte Backend bereitsteht.', profileText: 'Verwalte den Namen, der in deinem Rovera-Konto angezeigt wird.', securityText: 'Prüfe aktive Sitzungen und den Kontozugriff.', notificationsText: 'Wähle, welche Kontoereignisse dich benachrichtigen.', website: 'Website', emailChannel: 'E-Mail', orders: 'Bestellungen', buyRequests: 'Ankauf-Anfragen', payouts: 'Auszahlungen', securityEvents: 'Sicherheit', newsletter: 'Newsletter erhalten', newsletterText: 'Werbe-E-Mails bleiben deaktiviert, bis ein rechtskonformer Versand eingerichtet ist.', privacyText: 'Datenexport und Kontolebenszyklus.', deactivate: 'Konto deaktivieren', delete: 'Konto löschen', languageText: 'Wähle die Sprache für diese Einstellungsseite.', provider: 'Anmeldemethode', noSessions: 'Keine aktiven Sitzungen gefunden.' },
}

const defaultNotifications: Notifications = { emailOrders: true, emailBuyRequests: true, emailPayouts: true, emailSecurity: true, websiteOrders: true, websiteBuyRequests: true, websitePayouts: true, websiteSecurity: true }

export default function ProfilePanel() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState('my-account')
  const [language, setLanguage] = useState<Language>('en')
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [sessions, setSessions] = useState<AccountSession[]>([])
  const [notifications, setNotifications] = useState<Notifications>(defaultNotifications)
  const [newsletter, setNewsletter] = useState(true)

  const t = copy[language]

  useEffect(() => {
    fetch('/api/auth/session', { credentials: 'same-origin' }).then((response) => response.ok ? response.json() : null).then((session) => {
      const nextUser = session?.user ?? session ?? null
      setUser(nextUser)
      setName(nextUser?.name || '')
    }).catch(() => setUser(null)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const saved = window.localStorage.getItem('rovera-language')
    if (saved === 'en' || saved === 'de') setLanguage(saved)
  }, [])

  useEffect(() => {
    if (!user) return
    fetch('/api/account/sessions', { credentials: 'same-origin', cache: 'no-store' }).then((response) => response.ok ? response.json() : null).then((result) => setSessions(result?.sessions || [])).catch(() => {})
    fetch('/api/account/preferences', { credentials: 'same-origin', cache: 'no-store' }).then((response) => response.ok ? response.json() : null).then((result) => {
      const settings = result?.settings || {}
      if (settings.language === 'en' || settings.language === 'de') setLanguage(settings.language)
      if (settings.notifications) setNotifications({ ...defaultNotifications, ...settings.notifications })
      if (typeof settings.newsletter === 'boolean') setNewsletter(settings.newsletter)
    }).catch(() => {})
  }, [user?.id])

  const sections = useMemo(() => [
    { id: 'my-account', label: t.myAccount }, { id: 'security', label: t.security }, { id: 'notifications', label: t.notifications }, { id: 'purchases', label: t.purchases }, { id: 'sell', label: t.sell }, { id: 'privacy', label: t.privacy }, { id: 'connected', label: t.connected }, { id: 'language', label: t.language }, { id: 'emails', label: t.emails },
  ], [t])

  if (loading) return <section className="profile-card profile-loading">Loading account...</section>
  if (!user) return <section className="profile-card profile-compact"><p className="profile-kicker">ROVERA ACCOUNT</p><h1>{t.accountSettings}</h1><p className="profile-copy">Sign in to manage your account settings.</p><a className="profile-action" href="/">Back to login</a></section>

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage('')
    try { const response = await fetch('/api/account/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ name }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Could not save your username.'); setUser(result.user); setMessage(t.saved) } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save your username.') } finally { setSaving(false) }
  }

  async function savePreferences(next: Partial<{ language: Language; notifications: Notifications; newsletter: boolean }>) {
    const response = await fetch('/api/account/preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(next) })
    if (!response.ok) setMessage('Could not save this setting.')
  }

  function changeLanguage(next: Language) { setLanguage(next); window.localStorage.setItem('rovera-language', next); void savePreferences({ language: next }) }

  async function revokeSession(id: string) { await fetch('/api/account/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); setSessions(sessions.filter((item) => item.id !== id)) }
  async function revokeOthers() { await fetch('/api/account/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ allOther: true }) }); setSessions(sessions.filter((item) => item.current)) }
  async function deactivateAccount() { if (!window.confirm(`${t.deactivate}?`)) return; const response = await fetch('/api/account/deactivate', { method: 'POST', credentials: 'same-origin' }); if (response.ok) window.location.href = '/' }
  async function deleteAccount() { if (!window.confirm(`${t.delete}?`)) return; if (!window.confirm(t.delete + '? This cannot be undone.')) return; const response = await fetch('/api/account/delete', { method: 'POST', credentials: 'same-origin' }); if (response.ok) window.location.href = '/' }

  const activeUser = user
  const provider = activeUser.provider === 'email' ? 'Email code' : activeUser.provider === 'discord' ? 'Discord' : 'Google'
  const currentSessions = sessions.filter((session) => session.current)
  const otherSessions = sessions.filter((session) => !session.current)
  const toggleNotification = (key: keyof Notifications, value: boolean) => { const next = { ...notifications, [key]: value }; setNotifications(next); void savePreferences({ notifications: next }) }

  function unavailable(title: string) { return <div className="settings-panel"><h2>{title}</h2><div className="settings-unavailable"><strong>{t.unavailable}</strong><p>{t.unavailableText}</p></div></div> }

  function renderPanel() {
    if (section === 'my-account') return <div className="settings-panel"><h2>{t.myAccount}</h2><p className="settings-description">{t.profileText}</p><div className="settings-avatar-row">{activeUser.picture ? <img src={activeUser.picture} alt="" /> : <div>{(activeUser.name || activeUser.email || 'R').slice(0, 1).toUpperCase()}</div>}<span>{activeUser.email}</span></div><form className="profile-settings" onSubmit={saveProfile}><label htmlFor="profile-name">{t.username}</label><div className="profile-setting-row"><input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoComplete="name" /><button className="profile-save" type="submit" disabled={saving}>{saving ? '...' : t.save}</button></div>{message && <p className="profile-message" role="status">{message}</p>}</form><div className="settings-readonly"><span>{t.email}</span><strong>{activeUser.email}</strong><span>{t.provider}</span><strong>{provider}</strong></div></div>
    if (section === 'security') return <div className="settings-panel"><h2>{t.security}</h2><p className="settings-description">{t.securityText}</p><div className="settings-unavailable"><strong>{t.unavailable}: Password and 2FA</strong><p>{t.unavailableText}</p></div><div className="session-toolbar"><strong>{t.loggedDevices}</strong>{otherSessions.length > 0 && <button className="security-revoke-all" type="button" onClick={revokeOthers}>{t.logoutOthers}</button>}</div><div className="session-list">{currentSessions.length > 0 && <p className="session-group-title">{t.currentDevice}</p>}{currentSessions.map((session) => <div className="session-row" key={session.id}><div><strong>{session.device}</strong><span>{session.country} · {session.location} · {session.ip}</span><small>Last active {new Date(session.lastSeen).toLocaleString()}</small></div></div>)}{otherSessions.length > 0 && <p className="session-group-title">{t.otherDevices}</p>}{otherSessions.map((session) => <div className="session-row" key={session.id}><div><strong>{session.device}</strong><span>{session.country} · {session.location} · {session.ip}</span><small>Last active {new Date(session.lastSeen).toLocaleString()}</small></div><button className="session-revoke" type="button" onClick={() => revokeSession(session.id)}>{t.logout}</button></div>)}{!sessions.length && <span className="security-copy">{t.noSessions}</span>}</div></div>
    if (section === 'notifications') return <div className="settings-panel"><h2>{t.notifications}</h2><p className="settings-description">{t.notificationsText}</p><div className="notification-grid"><div><h3>{t.emailChannel}</h3>{[['emailOrders', t.orders], ['emailBuyRequests', t.buyRequests], ['emailPayouts', t.payouts], ['emailSecurity', t.securityEvents]].map(([key, label]) => <label key={key}><span>{label}</span><input type="checkbox" checked={notifications[key as keyof Notifications]} onChange={(event) => toggleNotification(key as keyof Notifications, event.target.checked)} /></label>)}</div><div><h3>{t.website}</h3>{[['websiteOrders', t.orders], ['websiteBuyRequests', t.buyRequests], ['websitePayouts', t.payouts], ['websiteSecurity', t.securityEvents]].map(([key, label]) => <label key={key}><span>{label}</span><input type="checkbox" checked={notifications[key as keyof Notifications]} onChange={(event) => toggleNotification(key as keyof Notifications, event.target.checked)} /></label>)}</div></div></div>
    if (section === 'language') return <div className="settings-panel"><h2>{t.language}</h2><p className="settings-description">{t.languageText}</p><div className="language-buttons"><button className={language === 'en' ? 'active' : ''} type="button" onClick={() => changeLanguage('en')}>English</button><button className={language === 'de' ? 'active' : ''} type="button" onClick={() => changeLanguage('de')}>Deutsch</button></div></div>
    if (section === 'emails') return <div className="settings-panel"><h2>{t.emails}</h2><p className="settings-description">{t.newsletterText}</p><label className="preference-toggle"><span><strong>{t.newsletter}</strong><small>{t.newsletterText}</small></span><input type="checkbox" checked={newsletter} onChange={(event) => { setNewsletter(event.target.checked); void savePreferences({ newsletter: event.target.checked }) }} /></label></div>
    if (section === 'privacy') return <div className="settings-panel"><h2>{t.privacy}</h2><p className="settings-description">{t.privacyText}</p><div className="settings-unavailable"><strong>{t.unavailable}: Data download</strong><p>{t.unavailableText}</p></div><div className="danger-zone"><button type="button" onClick={deactivateAccount}>{t.deactivate}</button><button type="button" onClick={deleteAccount}>{t.delete}</button></div></div>
    if (section === 'connected') return <div className="settings-panel"><h2>{t.connected}</h2><p className="settings-description">OAuth tokens are never shown or stored in the frontend.</p><div className="connected-row"><span>{provider}</span><strong>Connected</strong></div><div className="settings-unavailable"><strong>{t.unavailable}: Connect or disconnect providers</strong><p>{t.unavailableText}</p></div></div>
    return unavailable(sections.find((item) => item.id === section)?.label || t.accountSettings)
  }

  return <section className="settings-shell"><aside className="settings-sidebar-panel"><div className="settings-brand"><div className="account-square">{activeUser.picture ? <img src={activeUser.picture} alt="" /> : (activeUser.name || activeUser.email || 'R').slice(0, 1).toUpperCase()}</div><div><p className="profile-kicker">ROVERA</p><h1>{t.accountSettings}</h1></div></div><p className="settings-nav-label">{t.account}</p><nav className="settings-nav">{sections.slice(0, 2).map((item) => <button className={section === item.id ? 'active' : ''} type="button" key={item.id} onClick={() => setSection(item.id)}>{item.label}</button>)}</nav><p className="settings-nav-label">{t.information}</p><nav className="settings-nav">{sections.slice(2).map((item) => <button className={section === item.id ? 'active' : ''} type="button" key={item.id} onClick={() => setSection(item.id)}>{item.label}</button>)}</nav><button className="profile-logout settings-logout" type="button" onClick={() => { window.location.href = '/api/auth/logout' }}>{t.logout}</button></aside><main className="settings-main">{renderPanel()}</main></section>
}
