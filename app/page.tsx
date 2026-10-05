import Script from 'next/script'
import LoginPanel from './login-panel'

export default function Page() {
  return (
    <main className="marketplace-page">
      <header className="marketplace-nav">
        <a className="brand" href="/" aria-label="Rovera home"><img className="brand-image" src="/rovera-logo.png" alt="Rovera logo" /><span>Rovera</span></a>
        <nav className="main-links" aria-label="Marketplace categories">
          <a className="active" href="#top">Shop</a><a href="#rocket-league">Rocket League</a><a href="#discord">Discord</a><a href="#roblox">Roblox</a><a href="#cs2">CS2</a><a href="#minecraft">Minecraft</a><a href="#tiktok">TikTok</a><a href="#instagram">Instagram</a><a href="#steam">Steam</a>
        </nav>
        <div className="nav-actions"><LoginPanel /></div>
      </header>
      <section className="marketplace-content blank-marketplace" id="top" aria-label="Rovera marketplace"></section>
      <footer className="marketplace-footer"><div className="footer-main"><div className="footer-about"><div className="footer-brand"><img className="brand-image" src="/rovera-logo.png" alt="Rovera logo" /><strong>Rovera</strong></div><p>A simple marketplace for digital game items.<br />Buy from the community. Sell your own stock.</p></div><div className="footer-column"><strong>MARKETPLACE</strong><a href="#top">Browse games</a><a href="#top">Sell stock</a></div><div className="footer-column"><strong>SUPPORT</strong><a href="/privacy/">Help center</a><a href="mailto:help@rovera.xyz">Contact</a></div><div className="footer-column"><strong>INFORMATION</strong><a href="/tos/">Terms</a><a href="/privacy/">Privacy</a></div></div><div className="footer-bottom"><div className="footer-meta"><span>© 2026 Rovera</span><span>All rights reserved</span><span className="footer-badge"><a href="https://www.dmca.com/Protection/Status.aspx?ID=0252601f-48b4-4191-a660-c7379f1a9de1" title="DMCA.com Protection Status" className="dmca-badge"><img src="https://images.dmca.com/Badges/dmca_protected_sml_120n.png?ID=0252601f-48b4-4191-a660-c7379f1a9de1" alt="DMCA.com Protection Status" /></a></span><div className="footer-icons" aria-label="Rovera platform icons"><img className="footer-icon" src="/icons/black/roblox.svg" alt="" /><img className="footer-icon" src="/icons/black/steam.svg" alt="" /><img className="footer-icon" src="/icons/black/rocketleague.svg" alt="" /><img className="footer-icon" src="/icons/black/discord.svg" alt="" /><img className="footer-icon" src="/icons/black/minecraft.svg" alt="" /><img className="footer-icon" src="/icons/black/instagram.svg" alt="" /><img className="footer-icon" src="/icons/black/tiktok.svg" alt="" /><img className="footer-icon" src="/icons/black/counterstrike.svg" alt="" /><img className="footer-icon" src="/rovera-logo.png" alt="" /></div></div><span>Digital goods marketplace</span></div><Script src="https://images.dmca.com/Badges/DMCABadgeHelper.min.js" strategy="afterInteractive" /></footer>
    </main>
  )
}
