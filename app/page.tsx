const categories = [
  { icon: '◈', name: 'Rocket League', meta: 'Items · Accounts · Credits' },
  { icon: '◉', name: 'Discord', meta: 'Nitro · Accounts · Boosts' },
  { icon: '◇', name: 'Roblox', meta: 'Robux · Accounts · Items' },
  { icon: '▣', name: 'Minecraft', meta: 'Accounts · Keys · Items' },
  { icon: '▰', name: 'CS2', meta: 'Skins · Accounts · Keys' },
  { icon: '♪', name: 'TikTok', meta: 'Accounts · Followers · Likes' },
  { icon: '◎', name: 'Instagram', meta: 'Accounts · Followers · Likes' },
  { icon: '●', name: 'Steam', meta: 'Accounts · Keys · Wallet' },
]

const products = [
  { icon: '▣', category: 'Minecraft', name: 'Premium Account', price: '$14.99', tone: 'green' },
  { icon: '▰', category: 'CS2', name: 'AK-47 | Redline (FT)', price: '$18.99', tone: 'red' },
  { icon: '♪', category: 'TikTok', name: '10,000 Followers', price: '$12.99', tone: 'pink' },
  { icon: '◎', category: 'Instagram', name: '5,000 Followers', price: '$8.99', tone: 'purple' },
  { icon: '●', category: 'Steam', name: 'Steam Wallet Code', price: '$19.99', tone: 'blue' },
]

const benefits = [
  { icon: '♢', title: 'Trusted sellers', text: 'Buy from verified sellers with clear information.' },
  { icon: '▤', title: 'Secure checkout', text: 'Straightforward payments with trusted providers.' },
  { icon: '♙', title: 'Buyer protection', text: 'Get help if something is not as described.' },
  { icon: 'ϟ', title: 'Fast delivery', text: 'Most items are delivered instantly or within minutes.' },
]

export default function Page() {
  return (
    <main className="marketplace-page">
      <header className="marketplace-nav">
        <a className="brand" href="/" aria-label="Rovera home">
          <img src="/rovera-logo.png" alt="" />
          <span>Rovera</span>
        </a>
        <nav className="main-links" aria-label="Marketplace categories">
          <a className="active" href="#marketplace">Marketplace</a>
          <a href="#rocket-league">Rocket League</a>
          <a href="#discord">Discord</a>
          <a href="#roblox">Roblox</a>
          <a href="#minecraft">Minecraft</a>
          <a href="#cs2">CS2</a>
          <a href="#tiktok">TikTok</a>
          <a href="#instagram">Instagram</a>
          <a href="#steam">Steam</a>
        </nav>
        <div className="nav-actions">
          <label className="search-box"><span>⌕</span><input aria-label="Search items" placeholder="Search items" /></label>
          <a className="nav-action" href="#vouchers"><span>♢</span> Vouchers</a>
          <a className="profile-button" href="#profile"><span>♙</span> Profile</a>
        </div>
      </header>

      <section className="marketplace-content" id="marketplace">
        <div className="marketplace-hero">
          <div>
            <p className="eyebrow">THE DIGITAL MARKETPLACE</p>
            <h1>Everything digital.<br /><span>All in one place.</span></h1>
            <p className="hero-copy">Find accounts, items, codes, and services across the platforms you already use.</p>
            <a className="hero-button" href="#products">Explore marketplace <span>→</span></a>
          </div>
          <div className="hero-orbit" aria-hidden="true"><span>◈</span><span>◉</span><span>◇</span><span>♪</span><span>●</span></div>
        </div>

        <div className="section-heading"><div><p className="eyebrow">BROWSE BY PLATFORM</p><h2>Find what you need</h2></div><a href="#products">View all <span>→</span></a></div>
        <div className="category-grid">
          {categories.map((category) => <a className="category-card" id={category.name.toLowerCase().replaceAll(' ', '-')} href="#products" key={category.name}><span className="category-icon">{category.icon}</span><strong>{category.name}</strong><small>{category.meta}</small><b>›</b></a>)}
        </div>

        <div className="section-heading products-heading" id="products"><div><p className="eyebrow">FEATURED TODAY</p><h2>Popular digital goods</h2></div><a href="#marketplace">View all <span>→</span></a></div>
        <div className="product-grid">
          {products.map((product) => <a className={`product-card ${product.tone}`} href="#product" key={product.name}><div className="product-art"><span className="product-label">{product.category}</span><strong>{product.icon}</strong></div><div className="product-info"><span>{product.name}</span><b>{product.price}</b></div><button aria-label={`Add ${product.name} to cart`}>＋</button></a>)}
        </div>

        <div className="section-heading why-heading"><div><p className="eyebrow">WHY ROVERA</p><h2>A simpler way to buy digital goods.</h2></div></div>
        <div className="benefit-grid">{benefits.map((benefit) => <div className="benefit-card" key={benefit.title}><span className="benefit-icon">{benefit.icon}</span><div><h3>{benefit.title}</h3><p>{benefit.text}</p></div></div>)}</div>

        <footer className="marketplace-footer"><span>© 2026 Rovera</span><div><a href="/tos/">Terms</a><a href="/privacy/">Privacy</a><a href="/refund/">Refund</a><a href="mailto:help@rovera.xyz">Contact</a></div></footer>
      </section>
    </main>
  )
}
