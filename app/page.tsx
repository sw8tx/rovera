export default function Page() {
  return (
    <main className="marketplace-page">
      <header className="marketplace-nav">
        <a className="brand" href="/" aria-label="Rovera home"><span className="brand-mark">R</span><span>Rovera</span></a>
        <nav className="main-links" aria-label="Marketplace categories">
          <a className="active" href="#top">Shop</a><a href="#rocket-league">Rocket League</a><a href="#discord">Discord</a><a href="#roblox">Roblox</a><a href="#cs2">CS2</a><a href="#minecraft">Minecraft</a><a href="#tiktok">TikTok</a><a href="#instagram">Instagram</a><a href="#steam">Steam</a>
        </nav>
        <div className="nav-actions"><label className="search-box"><span aria-hidden="true">?</span><input aria-label="Search items" placeholder="Search games, items & codes" /></label><a className="cart-button" href="#cart">Cart <b>0</b></a><a className="profile-link" href="#profile">Profile</a></div>
      </header>
      <section className="marketplace-content blank-marketplace" id="top" aria-label="Rovera marketplace"></section>
      <footer className="marketplace-footer"><span>Copyright 2026 Rovera - Digital Gaming Shop</span><div><a href="/tos/">Terms</a><a href="/privacy/">Privacy</a><a href="mailto:help@rovera.xyz">Support</a></div></footer>
    </main>
  )
}
