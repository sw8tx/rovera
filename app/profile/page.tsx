import ProfilePanel from './profile-panel'

export default function ProfilePage() {
  return (
    <main className="profile-page">
      <nav className="profile-nav">
        <a href="https://rovera.xyz/" className="profile-back">← Rovera</a>
        <span>Account settings</span>
        <a className="profile-settings-link" href="https://rovera.xyz/profile/" aria-label="Account settings">⚙</a>
      </nav>
      <ProfilePanel />
    </main>
  )
}
