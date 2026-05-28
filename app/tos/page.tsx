'use client'

export default function TosPage() {
  return (
    <main style={{
      minHeight: '100vh',
      background: '#0a0a0a',
      padding: '80px 24px',
      maxWidth: '760px',
      margin: '0 auto',
    }}>
      <a href="/" style={{
        display: 'inline-block',
        marginBottom: '60px',
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: '28px',
        letterSpacing: '0.1em',
        color: '#f0f0f0',
        opacity: 0.5,
      }}>← ROVERA</a>

      <h1 style={{
        fontFamily: "'Bebas Neue', sans-serif",
        fontSize: 'clamp(40px, 8vw, 72px)',
        letterSpacing: '0.05em',
        marginBottom: '12px',
        color: '#f0f0f0',
      }}>Terms of Service</h1>
      <p style={{ color: '#555', fontSize: '13px', marginBottom: '56px', letterSpacing: '0.05em' }}>
        Last updated: May 2026
      </p>

      {[
        {
          title: 'General Information',
          body: 'These terms govern the use of Rovera and any related agreement or legal relationship with the operator. By accessing or using Rovera, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.',
        },
        {
          title: 'Use of Service',
          body: 'Rovera provides its services for lawful purposes only. You agree not to misuse, reverse-engineer, or attempt to gain unauthorized access to any part of the platform. We reserve the right to suspend or terminate access at any time without notice.',
        },
        {
          title: 'Intellectual Property',
          body: 'All content, branding, and assets on Rovera are the property of their respective owners. Unauthorized reproduction or distribution is strictly prohibited.',
        },
        {
          title: 'Limitation of Liability',
          body: 'Rovera is provided "as is" without warranties of any kind. We are not liable for any indirect, incidental, or consequential damages arising from use of the service.',
        },
        {
          title: 'Changes to Terms',
          body: 'We reserve the right to modify these terms at any time. Continued use of Rovera after changes constitutes acceptance of the updated terms.',
        },
        {
          title: 'Contact',
          body: 'For questions regarding these terms, please reach out via our official channels once Rovera launches.',
        },
      ].map((section, i) => (
        <div key={i} style={{
          marginBottom: '44px',
          paddingBottom: '44px',
          borderBottom: '1px solid #1a1a1a',
        }}>
          <h2 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '22px',
            letterSpacing: '0.08em',
            color: '#f0f0f0',
            marginBottom: '14px',
          }}>{section.title}</h2>
          <p style={{
            fontSize: '14px',
            lineHeight: '1.8',
            color: '#888',
            fontWeight: 300,
          }}>{section.body}</p>
        </div>
      ))}
    </main>
  )
}
