'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Link from 'next/link'

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
  const [newsletter, setNewsletter] = useState(false)
  const [unsubscribeUrl, setUnsubscribeUrl] = useState('')
  const [securityMessage, setSecurityMessage] = useState('')
  const [advanced, setAdvanced] = useState({ compact: false, reducedMotion: false, beta: false })
  const [display, setDisplay] = useState({ theme: 'system', accent: 'violet', timezone: 'Europe/Berlin', previews: true, personalization: true })

  const t = copy[language]

  useEffect(() => {
    fetch('/api/auth/session', { credentials: 'same-origin' }).then((response) => response.ok ? response.json() : null).then((session) => {
      const nextUser = session?.user ?? session ?? null
      setUser(nextUser)
      setName(nextUser?.name || '')
    }).catch(() => setUser(null)).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const saved = window.localStorage.getItem('rovera-language')
      if (saved === 'en' || saved === 'de') setLanguage(saved)
      const savedAdvanced = window.localStorage.getItem('rovera-advanced')
      if (savedAdvanced) {
        try { setAdvanced((current) => ({ ...current, ...JSON.parse(savedAdvanced) })) } catch { /* ignore malformed local preferences */ }
      }
      const savedDisplay = window.localStorage.getItem('rovera-display')
      if (savedDisplay) {
        try { setDisplay((current) => ({ ...current, ...JSON.parse(savedDisplay) })) } catch { /* ignore malformed local preferences */ }
      }
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (!user) return
    void reloadSessions()
    fetch('/api/account/preferences', { credentials: 'same-origin', cache: 'no-store' }).then((response) => response.ok ? response.json() : null).then((result) => {
      const settings = result?.settings || {}
      if (settings.language === 'en' || settings.language === 'de') setLanguage(settings.language)
      if (settings.notifications) setNotifications({ ...defaultNotifications, ...settings.notifications })
      if (typeof settings.newsletter === 'boolean') setNewsletter(settings.newsletter)
      if (typeof settings.unsubscribeUrl === 'string') setUnsubscribeUrl(settings.unsubscribeUrl)
    }).catch(() => {})
  }, [user])

  const sections = [
    { id: 'my-account', label: t.myAccount }, { id: 'security', label: t.security }, { id: 'notifications', label: t.notifications }, { id: 'purchases', label: t.purchases }, { id: 'sell', label: t.sell }, { id: 'privacy', label: t.privacy }, { id: 'connected', label: t.connected }, { id: 'language', label: t.language }, { id: 'emails', label: t.emails }, { id: 'advanced', label: language === 'de' ? 'Erweitert' : 'Advanced' },
  ]

  if (loading) return <section className="profile-card profile-loading">Loading account...</section>
  if (!user) return <section className="profile-card profile-compact"><p className="profile-kicker">ROVERA ACCOUNT</p><h1>{t.accountSettings}</h1><p className="profile-copy">Sign in to manage your account settings.</p><Link className="profile-action" href="/">Back to login</Link></section>

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setMessage('')
    try { const response = await fetch('/api/account/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ name }) }); const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Could not save your username.'); setUser(result.user); setMessage(t.saved) } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save your username.') } finally { setSaving(false) }
  }

  async function savePreferences(next: Partial<{ language: Language; notifications: Notifications; newsletter: boolean }>) {
    try {
      const response = await fetch('/api/account/preferences', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(next) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not save this setting.')
      setMessage(t.saved)
      return result.settings as Record<string, unknown>
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save this setting.')
      return null
    }
  }

  async function changeLanguage(next: Language) {
    const previous = language
    setLanguage(next)
    window.localStorage.setItem('rovera-language', next)
    if (!user) return
    const saved = await savePreferences({ language: next })
    if (!saved) { setLanguage(previous); window.localStorage.setItem('rovera-language', previous) }
  }

  async function reloadSessions() {
    try {
      const response = await fetch('/api/account/sessions', { credentials: 'same-origin', cache: 'no-store' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not load your active sessions.')
      setSessions(result.sessions || [])
      return true
    } catch (error) {
      setSecurityMessage(error instanceof Error ? error.message : 'Could not load your active sessions.')
      return false
    }
  }

  async function revokeSession(id: string) {
    setSecurityMessage('')
    try {
      const response = await fetch('/api/account/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ id }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not sign out this device.')
      setSecurityMessage('Device signed out.')
    } catch (error) {
      setSecurityMessage(error instanceof Error ? error.message : 'Could not sign out this device.')
    }
    await reloadSessions()
  }

  async function revokeOthers() {
    setSecurityMessage('')
    try {
      const response = await fetch('/api/account/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify({ allOther: true }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not sign out other devices.')
      setSecurityMessage('Other devices signed out.')
    } catch (error) {
      setSecurityMessage(error instanceof Error ? error.message : 'Could not sign out other devices.')
    }
    await reloadSessions()
  }

  async function deactivateAccount() {
    if (!window.confirm(`${t.deactivate}?`)) return
    try {
      const response = await fetch('/api/account/deactivate', { method: 'POST', credentials: 'same-origin' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not deactivate your account.')
      window.location.href = '/'
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not deactivate your account.') }
  }

  async function deleteAccount() {
    if (!window.confirm(`${t.delete}?`)) return
    if (!window.confirm(t.delete + '? This cannot be undone.')) return
    setMessage('')
    try {
      const response = await fetch('/api/account/delete', { method: 'POST', credentials: 'same-origin' })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not delete your account.')
      window.location.href = '/'
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not delete your account.') }
  }

  const activeUser = user
  const provider = activeUser.provider === 'email' ? 'Email code' : activeUser.provider === 'discord' ? 'Discord' : 'Google'
  const currentSessions = sessions.filter((session) => session.current)
  const otherSessions = sessions.filter((session) => !session.current)
  async function toggleNotification(key: keyof Notifications, value: boolean) {
    setMessage('')
    const next = { ...notifications, [key]: value }
    const saved = await savePreferences({ notifications: next })
    if (saved?.notifications) setNotifications({ ...defaultNotifications, ...(saved.notifications as Partial<Notifications>) })
  }

  async function toggleNewsletter(value: boolean) {
    setMessage('')
    const saved = await savePreferences({ newsletter: value })
    if (saved && typeof saved.newsletter === 'boolean') {
      setNewsletter(saved.newsletter)
      setUnsubscribeUrl(typeof saved.unsubscribeUrl === 'string' ? saved.unsubscribeUrl : '')
    }
  }
  function toggleAdvanced(key: keyof typeof advanced) { const next = { ...advanced, [key]: !advanced[key] }; setAdvanced(next); window.localStorage.setItem('rovera-advanced', JSON.stringify(next)) }
  function updateDisplay(key: keyof typeof display, value: string | boolean) { const next = { ...display, [key]: value }; setDisplay(next); window.localStorage.setItem('rovera-display', JSON.stringify(next)); if (key === 'theme') document.documentElement.dataset.roveraTheme = String(value) }
  function clearLocalPreferences() { window.localStorage.removeItem('rovera-language'); window.localStorage.removeItem('rovera-advanced'); window.localStorage.removeItem('rovera-display'); setLanguage('en'); setAdvanced({ compact: false, reducedMotion: false, beta: false }); setDisplay({ theme: 'system', accent: 'violet', timezone: 'Europe/Berlin', previews: true, personalization: true }); document.documentElement.dataset.roveraTheme = 'system'; setMessage(t.saved) }

  function unavailable(title: string) { return <div className="settings-panel"><h2>{title}</h2><div className="settings-unavailable"><strong>{t.unavailable}</strong><p>{t.unavailableText}</p></div></div> }

  function renderPanel() {
    if (section === 'my-account') return <div className="settings-panel"><h2>{t.myAccount}</h2><p className="settings-description">{t.profileText}</p><div className="settings-avatar-row">{activeUser.picture ? <img src={activeUser.picture} alt="" /> : <div>{(activeUser.name || activeUser.email || 'R').slice(0, 1).toUpperCase()}</div>}<span>{activeUser.email}</span></div><form className="profile-settings" onSubmit={saveProfile}><label htmlFor="profile-name">{t.username}</label><div className="profile-setting-row"><input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoComplete="name" /><button className="profile-save" type="submit" disabled={saving}>{saving ? '...' : t.save}</button></div>{message && <p className="profile-message" role="status">{message}</p>}</form><div className="settings-readonly"><span>{t.email}</span><strong>{activeUser.email}</strong><span>{t.provider}</span><strong>{provider}</strong></div></div>
    if (section === 'security') return <div className="settings-panel"><h2>{t.security}</h2><p className="settings-description">{t.securityText}</p><div className="settings-unavailable"><strong>{t.unavailable}: Password and 2FA</strong><p>{t.unavailableText}</p></div><div className="session-toolbar"><strong>{t.loggedDevices}</strong>{otherSessions.length > 0 && <button className="security-revoke-all" type="button" onClick={revokeOthers}>{t.logoutOthers}</button>}</div>{securityMessage && <p className="profile-message" role="status">{securityMessage}</p>}<div className="session-list">{currentSessions.length > 0 && <p className="session-group-title">{t.currentDevice}</p>}{currentSessions.map((session) => <div className="session-row" key={session.id}><div><strong>{session.device}</strong><span>{session.country} · {session.location} · {session.ip}</span><small>Last active {new Date(session.lastSeen).toLocaleString()}</small></div></div>)}{otherSessions.length > 0 && <p className="session-group-title">{t.otherDevices}</p>}{otherSessions.map((session) => <div className="session-row" key={session.id}><div><strong>{session.device}</strong><span>{session.country} · {session.location} · {session.ip}</span><small>Last active {new Date(session.lastSeen).toLocaleString()}</small></div><button className="session-revoke" type="button" onClick={() => revokeSession(session.id)}>{t.logout}</button></div>)}{!sessions.length && <span className="security-copy">{t.noSessions}</span>}</div></div>
    if (section === 'notifications') return <div className="settings-panel"><h2>{t.notifications}</h2><p className="settings-description">{t.notificationsText}</p><div className="notification-grid"><div><h3>{t.emailChannel}</h3>{[['emailOrders', t.orders], ['emailBuyRequests', t.buyRequests], ['emailPayouts', t.payouts], ['emailSecurity', t.securityEvents]].map(([key, label]) => <label key={key}><span>{label}</span><input type="checkbox" checked={notifications[key as keyof Notifications]} onChange={(event) => toggleNotification(key as keyof Notifications, event.target.checked)} /></label>)}</div><div><h3>{t.website}</h3>{[['websiteOrders', t.orders], ['websiteBuyRequests', t.buyRequests], ['websitePayouts', t.payouts], ['websiteSecurity', t.securityEvents]].map(([key, label]) => <label key={key}><span>{label}</span><input type="checkbox" checked={notifications[key as keyof Notifications]} onChange={(event) => toggleNotification(key as keyof Notifications, event.target.checked)} /></label>)}</div></div>{message && <p className="profile-message" role="status">{message}</p>}</div>
    if (section === 'language') return <div className="settings-panel"><h2>{t.language}</h2><p className="settings-description">{t.languageText}</p><div className="language-buttons"><button className={language === 'en' ? 'active' : ''} type="button" onClick={() => changeLanguage('en')}>English</button><button className={language === 'de' ? 'active' : ''} type="button" onClick={() => changeLanguage('de')}>Deutsch</button></div></div>
    if (section === 'emails') return <div className="settings-panel"><h2>{t.emails}</h2><p className="settings-description">{t.newsletterText}</p><label className="preference-toggle"><span><strong>{t.newsletter}</strong><small>{t.newsletterText}</small></span><input type="checkbox" checked={newsletter} onChange={(event) => void toggleNewsletter(event.target.checked)} /></label>{unsubscribeUrl && <p className="profile-message">{language === 'de' ? <>Dein Abmeldelink: <a href={unsubscribeUrl}>Newsletter abbestellen</a></> : <>Your unsubscribe link: <a href={unsubscribeUrl}>Unsubscribe from marketing emails</a></>}</p>}{message && <p className="profile-message" role="status">{message}</p>}</div>
    if (section === 'privacy') return <div className="settings-panel"><h2>{t.privacy}</h2><p className="settings-description">{t.privacyText}</p><div className="settings-unavailable"><strong>{t.unavailable}: Data download</strong><p>{t.unavailableText}</p></div><div className="danger-zone"><button type="button" onClick={deactivateAccount}>{t.deactivate}</button><button type="button" onClick={deleteAccount}>{t.delete}</button></div>{message && <p className="profile-message" role="status">{message}</p>}<p className="security-copy">Temporarily deactivated accounts can be restored by contacting <a href="mailto:help@rovera.xyz">help@rovera.xyz</a>.</p><p className="security-copy">Account deletion requires a recent sign-in. Sign out and sign in again shortly before continuing.</p></div>
    if (section === 'connected') return <div className="settings-panel"><h2>{t.connected}</h2><p className="settings-description">OAuth tokens are never shown or stored in the frontend.</p><div className="connected-row"><span>{provider}</span><strong>Connected</strong></div><div className="settings-unavailable"><strong>{t.unavailable}: Connect or disconnect providers</strong><p>{t.unavailableText}</p></div></div>
    if (section === 'advanced') return <div className="settings-panel settings-advanced-panel"><h2>{language === 'de' ? 'Erweiterte Einstellungen' : 'Advanced settings'}</h2><p className="settings-description">{language === 'de' ? 'Darstellung, Vorschauen und weitere Optionen für diesen Browser.' : 'Appearance, previews, and more options for this browser.'}</p><div className="advanced-info"><span className="advanced-info-icon">i</span><p>{language === 'de' ? 'Diese Optionen wirken nur in diesem Browser. Kontosicherheit und Zugangsdaten bleiben unverändert.' : 'These options only affect this browser. Account security and credentials are not changed.'}</p></div><div className="advanced-list"><div className="advanced-row advanced-plan"><span><strong>{language === 'de' ? 'Theme' : 'Theme'}</strong><small>{language === 'de' ? 'Wähle das Farbschema von Rovera.' : 'Choose Rovera’s color scheme.'}</small></span><select aria-label="Theme" value={display.theme} onChange={(event) => updateDisplay('theme', event.target.value)}><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></div><div className="advanced-row advanced-plan"><span><strong>{language === 'de' ? 'Akzentfarbe' : 'Accent color'}</strong><small>{language === 'de' ? 'Die Farbe für aktive Elemente und Buttons.' : 'The color used for active controls and buttons.'}</small></span><select aria-label="Accent color" value={display.accent} onChange={(event) => updateDisplay('accent', event.target.value)}><option value="violet">Violet</option><option value="blue">Blue</option><option value="green">Green</option></select></div><div className="advanced-row advanced-plan"><span><strong>{language === 'de' ? 'Zeitzone' : 'Time zone'}</strong><small>{language === 'de' ? 'Wird für Zeitangaben in Rovera verwendet.' : 'Used for dates and times in Rovera.'}</small></span><select aria-label="Time zone" value={display.timezone} onChange={(event) => updateDisplay('timezone', event.target.value)}><option value="Europe/Berlin">Europe/Berlin</option><option value="Europe/London">Europe/London</option><option value="America/New_York">America/New_York</option><option value="America/Los_Angeles">America/Los_Angeles</option></select></div><label className="advanced-row"><span><strong>{language === 'de' ? 'Kompakte Einstellungen' : 'Compact settings'}</strong><small>{language === 'de' ? 'Verwendet engere Abstände auf der gesamten Einstellungsseite.' : 'Use tighter spacing throughout the settings page.'}</small></span><input type="checkbox" checked={advanced.compact} onChange={() => toggleAdvanced('compact')} /></label><label className="advanced-row"><span><strong>{language === 'de' ? 'Weniger Animationen' : 'Reduce motion'}</strong><small>{language === 'de' ? 'Reduziert Animationen auf diesem Gerät.' : 'Reduce interface animations on this device.'}</small></span><input type="checkbox" checked={advanced.reducedMotion} onChange={() => toggleAdvanced('reducedMotion')} /></label><label className="advanced-row"><span><strong>{language === 'de' ? 'Link-Vorschauen' : 'Link previews'}</strong><small>{language === 'de' ? 'Zeigt Vorschaukarten für unterstützte Links.' : 'Show preview cards for supported links.'}</small></span><input type="checkbox" checked={display.previews} onChange={(event) => updateDisplay('previews', event.target.checked)} /></label><label className="advanced-row"><span><strong>{language === 'de' ? 'Personalisierung' : 'Personalization'}</strong><small>{language === 'de' ? 'Erlaubt lokale Empfehlungen und zuletzt verwendete Bereiche.' : 'Allow local recommendations and recently used areas.'}</small></span><input type="checkbox" checked={display.personalization} onChange={(event) => updateDisplay('personalization', event.target.checked)} /></label><label className="advanced-row"><span><strong>{language === 'de' ? 'Vorschau-Funktionen' : 'Preview features'}</strong><small>{language === 'de' ? 'Zeigt Funktionen, die noch getestet werden.' : 'Show features that are still being tested.'}</small></span><input type="checkbox" checked={advanced.beta} onChange={() => toggleAdvanced('beta')} /></label><div className="advanced-row advanced-plan"><span><strong>{language === 'de' ? 'Kontotarif' : 'Account plan'}</strong><small>Standard</small></span><span className="settings-status-pill">Standard</span></div></div><div className="advanced-clear"><div><strong>{language === 'de' ? 'Lokale Einstellungen löschen' : 'Clear local preferences'}</strong><small>{language === 'de' ? 'Entfernt Sprache, Theme und Anzeigeeinstellungen aus diesem Browser.' : 'Removes language, theme, and display preferences from this browser.'}</small></div><button type="button" onClick={clearLocalPreferences}>{language === 'de' ? 'Löschen' : 'Clear'}</button></div></div>
    return unavailable(sections.find((item) => item.id === section)?.label || t.accountSettings)
  }

  return <section className={`settings-shell${advanced.compact ? ' settings-compact' : ''}${advanced.reducedMotion ? ' settings-reduced-motion' : ''}`}><aside className="settings-sidebar-panel"><div className="settings-brand"><div className="account-square">{activeUser.picture ? <img src={activeUser.picture} alt="" /> : (activeUser.name || activeUser.email || 'R').slice(0, 1).toUpperCase()}</div><div><p className="profile-kicker">ROVERA</p><h1>{t.accountSettings}</h1></div></div><p className="settings-nav-label">{t.account}</p><nav className="settings-nav">{sections.slice(0, 2).map((item) => <button className={section === item.id ? 'active' : ''} type="button" key={item.id} onClick={() => setSection(item.id)}>{item.label}</button>)}</nav><p className="settings-nav-label">{t.information}</p><nav className="settings-nav">{sections.slice(2).map((item) => <button className={section === item.id ? 'active' : ''} type="button" key={item.id} onClick={() => setSection(item.id)}>{item.label}</button>)}</nav><button className="profile-logout settings-logout" type="button" onClick={() => { window.location.href = '/api/auth/logout' }}>{t.logout}</button></aside><main className="settings-main">{renderPanel()}</main></section>
}
