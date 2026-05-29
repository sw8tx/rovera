'use client'

import { useEffect, useState } from 'react'

// ─── COUNTDOWN ───────────────────────────────────────────────────────────────

const TARGET = new Date('2025-07-03T00:00:00')

function getTimeLeft() {
  const now = new Date()
  const diff = Math.max(0, TARGET.getTime() - now.getTime())
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  }
}

function FlipUnit({ value, label }: { value: number; label: string }) {
  const [prev, setPrev] = useState(value)
  const [flipping, setFlipping] = useState(false)

  useEffect(() => {
    if (value !== prev) {
      setFlipping(true)
      const t = setTimeout(() => {
        setPrev(value)
        setFlipping(false)
      }, 300)
      return () => clearTimeout(t)
    }
  }, [value, prev])

  const display = String(value).padStart(2, '0')
  const prevDisplay = String(prev).padStart(2, '0')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
      <div style={{
        position: 'relative',
        width: 'clamp(64px, 14vw, 90px)',
        height: 'clamp(72px, 16vw, 104px)',
        perspective: '400px',
      }}>
        <div style={{
          position: 'absolute',
          inset: 0,
          background: '#141414',
          border: '1px solid #222',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 'clamp(36px, 8vw, 58px)',
          color: '#2a2a2a',
          letterSpacing: '0.02em',
          userSelect: 'none',
        }}>
          {display}
        </div>

        <div style={{
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '50%',
          overflow: 'hidden',
          background: '#181818',
          border: '1px solid #222',
          borderBottom: '1px solid #111',
          borderRadius: '6px 6px 0 0',
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}>
          <span style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(36px, 8vw, 58px)',
            lineHeight: 1,
            color: '#e8e8e8',
            transform: 'translateY(50%)',
            letterSpacing: '0.02em',
            userSelect: 'none',
          }}>{display}</span>
        </div>

        <div style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: '50%',
          overflow: 'hidden',
          background: '#131313',
          border: '1px solid #1e1e1e',
          borderTop: '1px solid #0a0a0a',
          borderRadius: '0 0 6px 6px',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
        }}>
          <span style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 'clamp(36px, 8vw, 58px)',
            lineHeight: 1,
            color: '#b0b0b0',
            transform: 'translateY(-50%)',
            letterSpacing: '0.02em',
            userSelect: 'none',
          }}>{display}</span>
        </div>

        {flipping && (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: '50%',
            overflow: 'hidden',
            background: '#202020',
            border: '1px solid #2a2a2a',
            borderRadius: '6px 6px 0 0',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            transformOrigin: 'bottom center',
            animation: 'flipDown 0.3s ease-in forwards',
            zIndex: 10,
          }}>
            <span style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 'clamp(36px, 8vw, 58px)',
              lineHeight: 1,
              color: '#e8e8e8',
              transform: 'translateY(50%)',
              letterSpacing: '0.02em',
              userSelect: 'none',
            }}>{prevDisplay}</span>
          </div>
        )}

        <div style={{
          position: 'absolute',
          top: '50%', left: 0, right: 0,
          height: '2px',
          background: '#0a0a0a',
          transform: 'translateY(-50%)',
          zIndex: 5,
        }} />
      </div>

      <span style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: '10px',
        letterSpacing: '0.2em',
        color: '#444',
        fontWeight: 400,
        textTransform: 'uppercase',
      }}>{label}</span>

      <style>{`
        @keyframes flipDown {
          0%   { transform: rotateX(0deg); }
          100% { transform: rotateX(-90deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────

export default function Page() {
  const [time, setTime] = useState(getTimeLeft())

  useEffect(() => {
    const id = setInterval(() => setTime(getTimeLeft()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at 50% 40%, #141414 0%, #0a0a0a 70%)',
      padding: '40px 24px',
      position: 'relative',
    }}>

      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        pointerEvents: 'none',
      }} />

      <div style={{
        position: 'relative',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0',
      }}>

        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 'clamp(72px, 18vw, 160px)',
          letterSpacing: '0.04em',
          lineHeight: 0.9,
          color: '#f0f0f0',
          marginBottom: '8px',
        }}>
          ROVERA
        </div>

        <div style={{
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '11px',
          letterSpacing: '0.35em',
          color: '#444',
          fontWeight: 400,
          textTransform: 'uppercase',
          marginBottom: '52px',
        }}>
          COMING SOON
        </div>

        <div style={{
          display: 'flex',
          gap: 'clamp(12px, 3vw, 24px)',
          alignItems: 'flex-start',
          marginBottom: '64px',
        }}>
          <FlipUnit value={time.days} label="Days" />
          <FlipUnit value={time.hours} label="Hours" />
          <FlipUnit value={time.minutes} label="Minutes" />
          <FlipUnit value={time.seconds} label="Seconds" />
        </div>

        <div style={{ display: 'flex', gap: '28px', alignItems: 'center' }}>
          <a href="/tos" style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '11px',
            letterSpacing: '0.15em',
            color: '#3a3a3a',
            textTransform: 'uppercase',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#888')}
          onMouseLeave={e => (e.currentTarget.style.color = '#3a3a3a')}
          >
            Policy
          </a>
          <span style={{ color: '#222', fontSize: '10px' }}>·</span>
          <a href="/tos" style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '11px',
            letterSpacing: '0.15em',
            color: '#3a3a3a',
            textTransform: 'uppercase',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#888')}
          onMouseLeave={e => (e.currentTarget.style.color = '#3a3a3a')}
          >
            Terms of Service
          </a>
        </div>
      </div>
    </main>
  )
}
