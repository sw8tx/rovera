import ProfilePanel from './profile-panel'

export default function ProfilePage() {
  return (
    <main className="profile-page">
      <nav className="profile-nav">
        <a href="/" className="profile-back">← Rovera</a>
        <span>Account settings</span>
        <a className="profile-settings-link" href="https://settings.rovera.xyz/" aria-label="Open settings">⚙</a>
      </nav>
      <ProfilePanel />
    </main>
  )
}
