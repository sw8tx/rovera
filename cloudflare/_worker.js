const enc = new TextEncoder()

function b64(value) {
  const bytes = typeof value === 'string' ? enc.encode(value) : value
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function unb64(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(normalized + '='.repeat((4 - normalized.length % 4) % 4))
  return Uint8Array.from(binary, (char) => char.charCodeAt(0))
}

function getCookies(request) {
  return Object.fromEntries((request.headers.get('Cookie') || '').split(';').filter(Boolean).map((part) => {
    const index = part.indexOf('=')
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())]
  }))
}

function makeCookie(name, value, maxAge) {
  return name + '=' + encodeURIComponent(value) + '; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + maxAge
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return b64(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(value))))
}

async function hash(value) {
  return b64(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(value))))
}

function secureHeaders(headers = {}) {
  const result = new Headers(headers)
  result.set('X-Content-Type-Options', 'nosniff')
  result.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  result.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  return result
}

function json(requestBody, status = 200, headers = {}) {
  const responseHeaders = secureHeaders({ 'Content-Type': 'application/json' })
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) value.forEach((item) => responseHeaders.append(name, item))
    else responseHeaders.set(name, value)
  }
  return new Response(JSON.stringify(requestBody), { status, headers: responseHeaders })
}

function secureResponse(response) {
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: secureHeaders(response.headers) })
}

async function readBody(request) {
  try { return await request.json() } catch { return {} }
}

async function makeEmailChallenge(email, secret) {
  const digits = String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, '0')
  const code = 'RO-' + digits
  const payload = b64(JSON.stringify({ email, code: await hash(code), exp: Date.now() + 480000, attempts: 0 }))
  return { code, cookie: payload + '.' + await sign(payload, secret) }
}

async function makeChallengeCookie(challenge, secret) {
  const payload = b64(JSON.stringify(challenge))
  return payload + '.' + await sign(payload, secret)
}

async function readEmailChallenge(request, secret) {
  const value = getCookies(request).rovera_email_challenge
  if (!value || !value.includes('.')) return null
  const parts = value.split('.')
  if (parts[1] !== await sign(parts[0], secret)) return null
  try {
    const data = JSON.parse(new TextDecoder().decode(unb64(parts[0])))
    return data.exp > Date.now() ? data : null
  } catch { return null }
}

async function makeSession(user, secret) {
  const payload = b64(JSON.stringify({ ...user, exp: Date.now() + 604800000 }))
  return payload + '.' + await sign(payload, secret)
}

async function readSession(request, secret) {
  const value = getCookies(request).rovera_session
  if (!value || !value.includes('.')) return null
  const parts = value.split('.')
  if (parts[1] !== await sign(parts[0], secret)) return null
  try {
    const data = JSON.parse(new TextDecoder().decode(unb64(parts[0])))
    return data.exp > Date.now() ? data : null
  } catch {
    return null
  }
}

function getClientAddress(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0].trim() || 'unknown'
}

async function consumeRateLimit(db, rateKey, now = Date.now()) {
  const existing = await db.prepare('SELECT window_started, request_count, blocked_until FROM auth_rate_limits WHERE rate_key = ?').bind(rateKey).first()
  const windowMs = 15 * 60 * 1000
  if (!existing || now - Number(existing.window_started) >= windowMs) {
    await db.prepare('INSERT INTO auth_rate_limits (rate_key, window_started, request_count, blocked_until) VALUES (?, ?, 1, 0) ON CONFLICT(rate_key) DO UPDATE SET window_started = excluded.window_started, request_count = 1, blocked_until = 0').bind(rateKey, now).run()
    return { ok: true, retryAfter: 0 }
  }
  if (Number(existing.blocked_until) > now) return { ok: false, retryAfter: Math.ceil((Number(existing.blocked_until) - now) / 1000) }
  if (Number(existing.request_count) >= 5) {
    const blockedUntil = now + windowMs
    await db.prepare('UPDATE auth_rate_limits SET blocked_until = ? WHERE rate_key = ?').bind(blockedUntil, rateKey).run()
    return { ok: false, retryAfter: Math.ceil(windowMs / 1000) }
  }
  await db.prepare('UPDATE auth_rate_limits SET request_count = request_count + 1 WHERE rate_key = ?').bind(rateKey).run()
  return { ok: true, retryAfter: 0 }
}

async function saveUser(env, user) {
  if (!env.ROVERA_DB) throw new Error('Account database is not configured')
  const now = Date.now()
  await env.ROVERA_DB.prepare(`INSERT INTO users (id, provider, provider_subject, email, name, picture, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(provider_subject) DO UPDATE SET email = excluded.email, name = excluded.name, picture = excluded.picture, updated_at = excluded.updated_at`)
    .bind(user.id, user.provider, user.providerSubject, user.email, user.name || '', user.picture || '', now, now).run()
  return user
}

async function readUser(env, id) {
  if (!env.ROVERA_DB || !id) return null
  return env.ROVERA_DB.prepare('SELECT id, provider, email, name, picture FROM users WHERE id = ?').bind(id).first()
}

function redirect(location, headers = {}) {
  const responseHeaders = secureHeaders({ Location: location })
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) value.forEach((item) => responseHeaders.append(name, item))
    else responseHeaders.set(name, value)
  }
  return new Response(null, { status: 302, headers: responseHeaders })
}

async function handleAuth(request, env, url) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.AUTH_SECRET) return new Response('OAuth is not configured', { status: 500 })
  if (!env.ROVERA_DB) return json({ error: 'Account storage is not configured' }, 503)
  const callback = url.origin + '/api/auth/callback/google'

  if (url.pathname === '/api/auth/google') {
    const state = b64(crypto.getRandomValues(new Uint8Array(32)))
    const google = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    google.search = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, redirect_uri: callback, response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account' })
    return redirect(google.toString(), { 'Set-Cookie': makeCookie('rovera_oauth_state', state, 600) })
  }

  if (url.pathname === '/api/auth/callback/google') {
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    if (!code || !state || state !== getCookies(request).rovera_oauth_state) return new Response('Invalid OAuth state', { status: 400 })
    const body = new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: callback, grant_type: 'authorization_code' })
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
    if (!tokenResponse.ok) return new Response('Google token exchange failed', { status: 502 })
    const token = await tokenResponse.json()
    const profileResponse = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token.id_token))
    if (!profileResponse.ok) return new Response('Google identity verification failed', { status: 401 })
    const profile = await profileResponse.json()
    if (profile.aud !== env.GOOGLE_CLIENT_ID || profile.iss !== 'https://accounts.google.com' || profile.email_verified !== 'true') return new Response('Invalid Google identity', { status: 401 })
    const user = await saveUser(env, { id: 'google:' + profile.sub, provider: 'google', providerSubject: profile.sub, email: profile.email, name: profile.name || '', picture: profile.picture || '' })
    const session = await makeSession({ uid: user.id }, env.AUTH_SECRET)
    return redirect('/', { 'Set-Cookie': [makeCookie('rovera_session', session, 604800), makeCookie('rovera_oauth_state', '', 0)] })
  }

  if (url.pathname === '/api/auth/session') {
    const session = await readSession(request, env.AUTH_SECRET)
    const user = session?.uid ? await readUser(env, session.uid) : null
    return json(user ? { user } : null)
  }
  if (url.pathname === '/api/auth/logout') return redirect('/', { 'Set-Cookie': makeCookie('rovera_session', '', 0) })
  if (url.pathname === '/api/account/profile') {
    const session = await readSession(request, env.AUTH_SECRET)
    const user = session?.uid ? await readUser(env, session.uid) : null
    if (!user) return json({ error: 'You must be signed in.' }, 401)
    if (request.method === 'GET') return json({ user })
    if (request.method === 'PUT') {
      const body = await readBody(request)
      const name = String(body.name || '').trim()
      if (name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) return json({ error: 'Enter a valid display name.' }, 400)
      await env.ROVERA_DB.prepare('UPDATE users SET name = ?, updated_at = ? WHERE id = ?').bind(name, Date.now(), user.id).run()
      return json({ user: { ...user, name } })
    }
    return json({ error: 'Method not allowed.' }, 405, { Allow: 'GET, PUT' })
  }
  if (url.pathname === '/api/auth/email/request' && request.method === 'POST') {
    if (!env.RESEND_API_KEY) return json({ error: 'Email provider is not configured' }, 503)
    const body = await readBody(request)
    const email = String(body.email || '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Enter a valid email address.' }, 400)
    const rateKey = await hash(email + '|' + getClientAddress(request) + '|' + env.AUTH_SECRET)
    const rate = await consumeRateLimit(env.ROVERA_DB, rateKey)
    if (!rate.ok) return json({ error: 'Too many code requests. Please try again later.' }, 429, { 'Retry-After': String(rate.retryAfter) })
    const challenge = await makeEmailChallenge(email, env.AUTH_SECRET)
    try {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Rovera <help@rovera.xyz>',
          to: [email],
          reply_to: ['help@rovera.xyz'],
          subject: `${challenge.code} is your Rovera sign-in code`,
          text: `Rovera sign-in\n\nYour one-time sign-in code is: ${challenge.code}\n\nThis code expires in 8 minutes. If you did not request this code, you can ignore this email.\n\nRovera\nhttps://rovera.xyz/`,
          html: `<div style="margin:0;background:#f5f5f3;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#171717"><div style="display:none;max-height:0;overflow:hidden;opacity:0">Your one-time Rovera sign-in code is ${challenge.code}.</div><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e1;border-radius:14px"><tr><td style="padding:28px 30px"><img src="https://rovera.xyz/rovera-logo.png" width="44" height="44" alt="Rovera" style="display:block;border:0;border-radius:10px;margin-bottom:22px"><p style="margin:0 0 8px;font-size:11px;letter-spacing:.14em;color:#777;font-weight:700">ROVERA ACCOUNT</p><h1 style="margin:0 0 14px;font-size:26px;line-height:1.2;font-weight:700">Sign in to Rovera</h1><p style="margin:0;color:#555;line-height:1.6">Use the one-time code below to finish signing in.</p><div style="margin:24px 0;padding:16px;text-align:center;background:#f2f2f0;border-radius:10px"><span style="font-size:28px;letter-spacing:.16em;font-weight:700;color:#171717">${challenge.code}</span></div><p style="margin:0;color:#777;font-size:13px;line-height:1.6">This code expires in 8 minutes. If you did not request it, you can safely ignore this email.</p><div style="margin-top:24px"><a href="https://rovera.xyz/" style="display:inline-block;background:#e5e5e3;color:#333;text-decoration:none;font-size:13px;font-weight:700;padding:11px 18px;border-radius:7px">Visit Rovera</a></div></td></tr><tr><td style="padding:18px 30px;background:#fafaf9;border-top:1px solid #eeeeeb;color:#999;font-size:12px;line-height:1.7"><a href="https://rovera.xyz/privacy" style="color:#777">Privacy</a><span style="padding:0 8px">·</span><a href="https://rovera.xyz/tos" style="color:#777">Terms</a><span style="padding:0 8px">·</span><a href="mailto:help@rovera.xyz" style="color:#777">Help</a><br><span>© 2026 Rovera. All rights reserved.</span></td></tr></table></div>`,
        }),
      })
      if (!emailResponse.ok) throw new Error('Resend returned ' + emailResponse.status)
    } catch (error) {
      console.error('Email send failed', error)
      return json({ error: 'The login email could not be sent.' }, 502)
    }
    return json({ ok: true }, 200, { 'Set-Cookie': makeCookie('rovera_email_challenge', challenge.cookie, 480) })
  }
  if (url.pathname === '/api/auth/email/verify' && request.method === 'POST') {
    const challenge = await readEmailChallenge(request, env.AUTH_SECRET)
    if (!challenge) return json({ error: 'This code has expired. Request a new one.' }, 410)
    const body = await readBody(request)
    const code = String(body.code || '').trim().toUpperCase()
    if (await hash(code) !== challenge.code) {
      const attempts = Number(challenge.attempts || 0) + 1
      if (attempts >= 5) return json({ error: 'Too many incorrect attempts. Request a new code.' }, 429, { 'Set-Cookie': makeCookie('rovera_email_challenge', '', 0) })
      const updatedChallenge = { ...challenge, attempts }
      const remaining = Math.max(1, Math.ceil((Number(challenge.exp) - Date.now()) / 1000))
      return json({ error: 'That code is not correct.' }, 401, { 'Set-Cookie': makeCookie('rovera_email_challenge', await makeChallengeCookie(updatedChallenge, env.AUTH_SECRET), remaining) })
    }
    const emailId = await hash(challenge.email)
    const user = await saveUser(env, { id: 'email:' + emailId, provider: 'email', providerSubject: emailId, email: challenge.email, name: challenge.email, picture: '' })
    const session = await makeSession({ uid: user.id }, env.AUTH_SECRET)
    return json({ ok: true }, 200, { 'Set-Cookie': [makeCookie('rovera_session', session, 604800), makeCookie('rovera_email_challenge', '', 0)] })
  }
  return null
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/auth/') || url.pathname.startsWith('/api/account/')) {
      const response = await handleAuth(request, env, url)
      if (response) return response
    }
    return secureResponse(await env.ASSETS.fetch(request))
  }
}
