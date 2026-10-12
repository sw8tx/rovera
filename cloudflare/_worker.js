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
  return name + '=' + encodeURIComponent(value) + '; Domain=.rovera.xyz; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=' + maxAge
}

async function sign(value, secret) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return b64(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(value))))
}

async function hash(value) {
  return b64(new Uint8Array(await crypto.subtle.digest('SHA-256', enc.encode(value))))
}

async function makeUnsubscribeToken(subscription, secret) {
  const payload = b64(JSON.stringify({ id: subscription.id, consentedAt: subscription.consented_at }))
  return payload + '.' + await sign(payload, secret)
}

function secureHeaders(headers = {}) {
  const result = new Headers(headers)
  result.set('X-Content-Type-Options', 'nosniff')
  result.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  result.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  result.set('Cache-Control', 'no-store')
  result.set('Content-Security-Policy-Report-Only', "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' https://images.dmca.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://cdn.discordapp.com https://lh3.googleusercontent.com https://images.dmca.com; font-src 'self' data:; connect-src 'self'; worker-src 'self' blob:")
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

async function makeEmailChallenge(email, secret, now = Date.now()) {
  const digits = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0')
  const code = 'RO-' + digits
  const id = b64(crypto.getRandomValues(new Uint8Array(32)))
  return { id, email, code, codeHash: await sign(code, secret), createdAt: now, expiresAt: now + 480000 }
}

async function makeSession(env, user, request, secret) {
  const now = Date.now()
  const sid = b64(crypto.getRandomValues(new Uint8Array(24)))
  const expiresAt = now + 604800000
  await env.ROVERA_DB.prepare('INSERT INTO auth_sessions (id, user_id, ip_address, country, colo, user_agent, created_at, last_seen, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(sid, user.uid, getClientAddress(request), request.headers.get('CF-IPCountry') || '', request.headers.get('CF-Ray')?.split('-')[1] || '', (request.headers.get('User-Agent') || '').slice(0, 240), now, now, expiresAt).run()
  const payload = b64(JSON.stringify({ ...user, sid, exp: expiresAt, authTime: now }))
  return payload + '.' + await sign(payload, secret)
}

async function readSession(request, env, secret) {
  const value = getCookies(request).rovera_session
  if (!value || !value.includes('.')) return null
  const parts = value.split('.')
  if (parts[1] !== await sign(parts[0], secret)) return null
  try {
    const data = JSON.parse(new TextDecoder().decode(unb64(parts[0])))
    if (data.exp <= Date.now() || !data.sid) return null
    const session = await env.ROVERA_DB.prepare('SELECT id, user_id, ip_address, country, colo, user_agent, created_at, last_seen, expires_at FROM auth_sessions WHERE id = ? AND user_id = ? AND revoked_at = 0 AND expires_at > ?').bind(data.sid, data.uid, Date.now()).first()
    if (!session) return null
    await env.ROVERA_DB.prepare('UPDATE auth_sessions SET last_seen = ? WHERE id = ?').bind(Date.now(), data.sid).run()
    return { ...data, record: session }
  } catch {
    return null
  }
}

function getClientAddress(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For')?.split(',')[0].trim() || 'unknown'
}

function hasTrustedOrigin(request) {
  const originHeader = request.headers.get('Origin')
  if (!originHeader || request.headers.get('Sec-Fetch-Site') === 'cross-site') return false
  try {
    const origin = new URL(originHeader)
    if (origin.origin !== originHeader) return false
    if (origin.origin === 'https://rovera.xyz' || origin.origin === 'https://settings.rovera.xyz') return true
    const requestUrl = new URL(request.url)
    return ['localhost', '127.0.0.1'].includes(requestUrl.hostname) && origin.origin === requestUrl.origin
  } catch {
    return false
  }
}

function maskIp(ip) {
  if (!ip) return 'Unknown'
  if (ip.includes(':')) return ip.split(':').slice(0, 3).join(':') + ':…'
  const parts = ip.split('.')
  return parts.length === 4 ? parts.slice(0, 2).join('.') + '.*.*' : 'Hidden'
}

function describeUserAgent(userAgent) {
  if (/mobile|android|iphone|ipad/i.test(userAgent)) return 'Mobile device'
  if (/edg\//i.test(userAgent)) return 'Microsoft Edge'
  if (/chrome\//i.test(userAgent)) return 'Google Chrome'
  if (/firefox\//i.test(userAgent)) return 'Mozilla Firefox'
  if (/safari\//i.test(userAgent)) return 'Safari'
  return 'Web browser'
}

async function consumeRateLimit(db, rateKey, limit = 5, now = Date.now(), windowMs = 15 * 60 * 1000) {
  // One UPSERT, not a read-then-write sequence: concurrent requests cannot
  // observe the same counter value and all pass the limit together.
  const row = await db.prepare(`INSERT INTO auth_rate_limits (rate_key, window_started, request_count, blocked_until)
    VALUES (?, ?, 1, 0)
    ON CONFLICT(rate_key) DO UPDATE SET
      window_started = CASE
        WHEN auth_rate_limits.blocked_until > ? THEN auth_rate_limits.window_started
        WHEN ? - auth_rate_limits.window_started >= ? THEN excluded.window_started
        ELSE auth_rate_limits.window_started END,
      request_count = CASE
        WHEN auth_rate_limits.blocked_until > ? THEN auth_rate_limits.request_count
        WHEN ? - auth_rate_limits.window_started >= ? THEN 1
        ELSE auth_rate_limits.request_count + 1 END,
      blocked_until = CASE
        WHEN auth_rate_limits.blocked_until > ? THEN auth_rate_limits.blocked_until
        WHEN ? - auth_rate_limits.window_started >= ? THEN 0
        WHEN auth_rate_limits.request_count >= ? THEN ? + ?
        ELSE 0 END
    RETURNING request_count, blocked_until`).bind(
    rateKey, now, now, now, windowMs, now, now, windowMs, now, now, windowMs, limit, now, windowMs,
  ).first()
  const blockedUntil = Number(row?.blocked_until || 0)
  return blockedUntil > now || Number(row?.request_count || 0) > limit
    ? { ok: false, retryAfter: Math.max(1, Math.ceil((blockedUntil - now) / 1000)) }
    : { ok: true, retryAfter: 0 }
}

async function saveUser(env, user) {
  if (!env.ROVERA_DB) throw new Error('Account database is not configured')
  const now = Date.now()
  const inserted = await env.ROVERA_DB.prepare(`INSERT OR IGNORE INTO users (id, provider, provider_subject, email, name, picture, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(user.id, user.provider, user.providerSubject, user.email, user.name || '', user.picture || '', now, now).run()
  const isNew = Number(inserted?.meta?.changes || 0) > 0
  if (!isNew) await env.ROVERA_DB.prepare(`UPDATE users SET email = ?, name = CASE WHEN name = '' THEN ? ELSE name END, picture = ?, updated_at = MAX(?, updated_at + 1)
    WHERE provider_subject = ?`).bind(user.email, user.name || '', user.picture || '', now, user.providerSubject).run()
  const saved = await env.ROVERA_DB.prepare('SELECT id, provider, email, name, picture, account_status FROM users WHERE provider_subject = ?').bind(user.providerSubject).first()
  return { ...(saved || user), isNew }
}

async function sendWelcomeEmail(env, user) {
  if (!user.isNew || !env.RESEND_API_KEY || !user.email) return
  const now = Date.now()
  const claim = await env.ROVERA_DB.prepare(`INSERT OR IGNORE INTO auth_welcome_emails (user_id, status, created_at, sent_at)
    VALUES (?, 'pending', ?, NULL)`).bind(user.id, now).run()
  if (Number(claim?.meta?.changes || 0) !== 1) return
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + env.RESEND_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Rovera <help@rovera.xyz>',
        to: [user.email],
        reply_to: ['help@rovera.xyz'],
        subject: 'Welcome to Rovera',
        text: 'Your Rovera account is ready.\n\nVisit your account: https://rovera.xyz/profile/\n\nNeed help? Email help@rovera.xyz.\nPrivacy: https://rovera.xyz/privacy\nTerms: https://rovera.xyz/tos\n\nThis is an account message, not a marketing subscription.',
        html: `<div style="margin:0;background:#f5f5f3;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#171717"><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e4e4e1;border-radius:14px"><tr><td style="padding:28px 30px"><img src="https://rovera.xyz/rovera-mark-dark.png" width="40" height="40" alt="Rovera" style="display:block;border:0;margin-bottom:22px"><p style="margin:0 0 8px;font-size:11px;letter-spacing:.14em;color:#777;font-weight:700">ROVERA ACCOUNT</p><h1 style="margin:0 0 14px;font-size:26px;line-height:1.2">Welcome to Rovera</h1><p style="margin:0;color:#555;line-height:1.6">Your account is ready. You can review your profile and account settings any time.</p><div style="margin-top:24px"><a href="https://rovera.xyz/profile/" style="display:inline-block;background:#171717;color:#fff;text-decoration:none;font-size:13px;font-weight:700;padding:12px 18px;border-radius:7px">View your account</a></div><p style="margin:24px 0 0;color:#777;font-size:13px;line-height:1.6">Need help? <a href="mailto:help@rovera.xyz" style="color:#555">Contact Rovera support</a>.</p></td></tr><tr><td style="padding:18px 30px;background:#fafaf9;border-top:1px solid #eeeeeb;color:#999;font-size:12px;line-height:1.7"><a href="https://rovera.xyz/privacy" style="color:#777">Privacy</a><span style="padding:0 8px">·</span><a href="https://rovera.xyz/tos" style="color:#777">Terms</a><br><span>This is an account message. It does not sign you up for marketing email.<br>© 2026 Rovera. All rights reserved.</span></td></tr></table></div>`,
      }),
    })
    if (!response.ok) throw new Error('Resend returned ' + response.status)
    await env.ROVERA_DB.prepare("UPDATE auth_welcome_emails SET status = 'sent', sent_at = ? WHERE user_id = ?").bind(Date.now(), user.id).run()
  } catch (error) {
    console.error('Account welcome email failed', error)
    await env.ROVERA_DB.prepare("UPDATE auth_welcome_emails SET status = 'failed' WHERE user_id = ? AND status = 'pending'").bind(user.id).run()
  }
}

async function readUser(env, id) {
  if (!env.ROVERA_DB || !id) return null
  return env.ROVERA_DB.prepare("SELECT id, provider, email, name, picture, settings_json, account_status FROM users WHERE id = ? AND account_status = 'active'").bind(id).first()
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
  if (!env.AUTH_SECRET) return new Response('Authentication is not configured', { status: 500 })
  if (!env.ROVERA_DB) return json({ error: 'Account storage is not configured' }, 503)
  const appOrigin = 'https://rovera.xyz'
  const googleCallback = appOrigin + '/api/auth/callback/google'
  const discordCallback = appOrigin + '/api/auth/callback/discord'

  if (url.pathname === '/api/auth/google') {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return new Response('Google login is not configured', { status: 503 })
    const state = b64(crypto.getRandomValues(new Uint8Array(32)))
    const google = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    google.search = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID, redirect_uri: googleCallback, response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account' })
    return redirect(google.toString(), { 'Set-Cookie': makeCookie('rovera_google_state', state + '.' + await sign(state, env.AUTH_SECRET), 600) })
  }

  if (url.pathname === '/api/auth/callback/google') {
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return new Response('Google login is not configured', { status: 503 })
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const storedState = getCookies(request).rovera_google_state || ''
    const stateParts = storedState.split('.')
    if (!code || !state || stateParts.length !== 2 || state !== stateParts[0] || stateParts[1] !== await sign(state, env.AUTH_SECRET)) return new Response('Invalid OAuth state', { status: 400 })
    const body = new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: googleCallback, grant_type: 'authorization_code' })
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body })
    if (!tokenResponse.ok) return new Response('Google token exchange failed', { status: 502 })
    const token = await tokenResponse.json()
    const profileResponse = await fetch('https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token.id_token))
    if (!profileResponse.ok) return new Response('Google identity verification failed', { status: 401 })
    const profile = await profileResponse.json()
    if (profile.aud !== env.GOOGLE_CLIENT_ID || profile.iss !== 'https://accounts.google.com' || profile.email_verified !== 'true') return new Response('Invalid Google identity', { status: 401 })
    const user = await saveUser(env, { id: 'google:' + profile.sub, provider: 'google', providerSubject: profile.sub, email: profile.email, name: profile.name || '', picture: profile.picture || '' })
    if (user.account_status !== 'active') return redirect('/?authError=account_deactivated', { 'Set-Cookie': makeCookie('rovera_google_state', '', 0) })
    await sendWelcomeEmail(env, user)
    const session = await makeSession(env, { uid: user.id }, request, env.AUTH_SECRET)
    return redirect('/', { 'Set-Cookie': [makeCookie('rovera_session', session, 604800), makeCookie('rovera_google_state', '', 0)] })
  }

  if (url.pathname === '/api/auth/discord') {
    if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET) return new Response('Discord login is not configured', { status: 503 })
    const state = b64(crypto.getRandomValues(new Uint8Array(32)))
    const discord = new URL('https://discord.com/oauth2/authorize')
    discord.search = new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID, redirect_uri: discordCallback, response_type: 'code', scope: 'identify email', state, prompt: 'consent' })
    return redirect(discord.toString(), { 'Set-Cookie': makeCookie('rovera_discord_state', state + '.' + await sign(state, env.AUTH_SECRET), 600) })
  }

  if (url.pathname === '/api/auth/callback/discord') {
    if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET) return new Response('Discord login is not configured', { status: 503 })
    const code = url.searchParams.get('code')
    const state = url.searchParams.get('state')
    const storedState = getCookies(request).rovera_discord_state || ''
    const stateParts = storedState.split('.')
    if (!state || stateParts.length !== 2 || state !== stateParts[0] || stateParts[1] !== await sign(state, env.AUTH_SECRET)) return new Response('Invalid OAuth state', { status: 400 })
    if (url.searchParams.get('error') === 'access_denied') return redirect('/?authError=discord_denied', { 'Set-Cookie': makeCookie('rovera_discord_state', '', 0) })
    if (!code) return redirect('/?authError=discord_failed', { 'Set-Cookie': makeCookie('rovera_discord_state', '', 0) })
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ client_id: env.DISCORD_CLIENT_ID, client_secret: env.DISCORD_CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: discordCallback }),
    })
    if (!tokenResponse.ok) return new Response('Discord token exchange failed', { status: 502 })
    const token = await tokenResponse.json()
    const profileResponse = await fetch('https://discord.com/api/users/@me', { headers: { Authorization: 'Bearer ' + token.access_token } })
    if (!profileResponse.ok) return new Response('Discord identity verification failed', { status: 401 })
    const profile = await profileResponse.json()
    if (!profile.id || !profile.email || profile.verified === false) return new Response('A verified Discord email is required', { status: 401 })
    const picture = profile.avatar ? 'https://cdn.discordapp.com/avatars/' + encodeURIComponent(profile.id) + '/' + encodeURIComponent(profile.avatar) + '.png?size=128' : ''
    const user = await saveUser(env, { id: 'discord:' + profile.id, provider: 'discord', providerSubject: profile.id, email: profile.email, name: profile.global_name || profile.username || profile.email, picture })
    if (user.account_status !== 'active') return redirect('/?authError=account_deactivated', { 'Set-Cookie': makeCookie('rovera_discord_state', '', 0) })
    await sendWelcomeEmail(env, user)
    const session = await makeSession(env, { uid: user.id }, request, env.AUTH_SECRET)
    return redirect('/', { 'Set-Cookie': [makeCookie('rovera_session', session, 604800), makeCookie('rovera_discord_state', '', 0)] })
  }

  if (url.pathname === '/api/auth/session') {
    const session = await readSession(request, env, env.AUTH_SECRET)
    const user = session?.uid ? await readUser(env, session.uid) : null
    return json(user ? { user } : null)
  }
  if (url.pathname === '/api/auth/logout') {
    const session = await readSession(request, env, env.AUTH_SECRET)
    if (session?.sid) await env.ROVERA_DB.prepare('UPDATE auth_sessions SET revoked_at = ? WHERE id = ?').bind(Date.now(), session.sid).run()
    return redirect('/', { 'Set-Cookie': makeCookie('rovera_session', '', 0) })
  }
  if (url.pathname === '/api/account/profile') {
    const session = await readSession(request, env, env.AUTH_SECRET)
    const user = session?.uid ? await readUser(env, session.uid) : null
    if (!user) return json({ error: 'You must be signed in.' }, 401)
    if (request.method === 'GET') return json({ user })
    if (request.method === 'PUT') {
      if (!hasTrustedOrigin(request)) return json({ error: 'This request could not be verified.' }, 403)
      const body = await readBody(request)
      const name = String(body.name || '').trim()
      if (name.length > 80 || /[\u0000-\u001f\u007f]/.test(name)) return json({ error: 'Enter a valid display name.' }, 400)
      await env.ROVERA_DB.prepare('UPDATE users SET name = ?, updated_at = ? WHERE id = ?').bind(name, Date.now(), user.id).run()
      return json({ user: { ...user, name } })
    }
    return json({ error: 'Method not allowed.' }, 405, { Allow: 'GET, PUT' })
  }
  if (url.pathname === '/api/account/sessions') {
    const session = await readSession(request, env, env.AUTH_SECRET)
    const user = session?.uid ? await readUser(env, session.uid) : null
    if (!user) return json({ error: 'You must be signed in.' }, 401)
    if (request.method === 'GET') {
      const result = await env.ROVERA_DB.prepare('SELECT id, ip_address, country, colo, user_agent, created_at, last_seen, expires_at FROM auth_sessions WHERE user_id = ? AND revoked_at = 0 AND expires_at > ? ORDER BY last_seen DESC').bind(user.id, Date.now()).all()
      return json({ sessions: (result.results || []).map((item) => ({ id: item.id, device: describeUserAgent(item.user_agent || ''), ip: item.ip_address || 'Unknown', country: item.country || 'Unknown', location: item.colo || 'Unknown', createdAt: item.created_at, lastSeen: item.last_seen, current: item.id === session.sid })) })
    }
    if (request.method === 'POST') {
      if (!hasTrustedOrigin(request)) return json({ error: 'This request could not be verified.' }, 403)
      const body = await readBody(request)
      if (body.allOther === true) await env.ROVERA_DB.prepare('UPDATE auth_sessions SET revoked_at = ? WHERE user_id = ? AND id != ? AND revoked_at = 0').bind(Date.now(), user.id, session.sid).run()
      else if (body.id && body.id !== session.sid) await env.ROVERA_DB.prepare('UPDATE auth_sessions SET revoked_at = ? WHERE user_id = ? AND id = ?').bind(Date.now(), user.id, String(body.id)).run()
      return json({ ok: true })
    }
    return json({ error: 'Method not allowed.' }, 405, { Allow: 'GET, POST' })
  }
  if (url.pathname === '/api/account/preferences') {
    const session = await readSession(request, env, env.AUTH_SECRET)
    const user = session?.uid ? await readUser(env, session.uid) : null
    if (!user) return json({ error: 'You must be signed in.' }, 401)
    let settings = {}
    try { settings = JSON.parse(user.settings_json || '{}') } catch {}
    if (request.method === 'GET') {
      const subscription = await env.ROVERA_DB.prepare('SELECT id, status, consented_at FROM newsletter_subscriptions WHERE email = ?').bind(user.email).first()
      const optedIn = subscription?.status === 'subscribed'
      return json({ settings: { ...settings, newsletter: optedIn, ...(optedIn ? { unsubscribeUrl: 'https://rovera.xyz/unsubscribe?token=' + encodeURIComponent(await makeUnsubscribeToken(subscription, env.AUTH_SECRET)) } : {}) } })
    }
    if (request.method === 'PUT') {
      if (!hasTrustedOrigin(request)) return json({ error: 'This request could not be verified.' }, 403)
      const body = await readBody(request)
      const next = { ...settings }
      if (body.language === 'en' || body.language === 'de') next.language = body.language
      if (body.notifications && typeof body.notifications === 'object') next.notifications = {
        emailOrders: body.notifications.emailOrders !== false,
        emailBuyRequests: body.notifications.emailBuyRequests !== false,
        emailPayouts: body.notifications.emailPayouts !== false,
        emailSecurity: body.notifications.emailSecurity !== false,
        websiteOrders: body.notifications.websiteOrders !== false,
        websiteBuyRequests: body.notifications.websiteBuyRequests !== false,
        websitePayouts: body.notifications.websitePayouts !== false,
        websiteSecurity: body.notifications.websiteSecurity !== false,
      }
      const now = Date.now()
      const statements = [env.ROVERA_DB.prepare('UPDATE users SET settings_json = ?, updated_at = ? WHERE id = ?').bind(JSON.stringify(next), now, user.id)]
      if (typeof body.newsletter === 'boolean') {
        if (body.newsletter) {
          const id = b64(crypto.getRandomValues(new Uint8Array(24)))
          statements.push(env.ROVERA_DB.prepare(`INSERT INTO newsletter_subscriptions (id, email, status, consented_at, consent_source, consent_version, unsubscribed_at)
            VALUES (?, ?, 'subscribed', ?, 'account-settings', 'newsletter-2026-10-v1', NULL)
            ON CONFLICT(email) DO UPDATE SET id = excluded.id, status = 'subscribed', consented_at = excluded.consented_at, consent_source = excluded.consent_source, consent_version = excluded.consent_version, unsubscribed_at = NULL`).bind(id, user.email, now))
        } else {
          statements.push(env.ROVERA_DB.prepare(`INSERT INTO newsletter_subscriptions (id, email, status, consented_at, consent_source, consent_version, unsubscribed_at)
            VALUES (?, ?, 'unsubscribed', NULL, NULL, NULL, ?)
            ON CONFLICT(email) DO UPDATE SET status = 'unsubscribed', unsubscribed_at = excluded.unsubscribed_at`).bind(b64(crypto.getRandomValues(new Uint8Array(24))), user.email, now))
        }
      }
      await env.ROVERA_DB.batch(statements)
      const subscription = await env.ROVERA_DB.prepare('SELECT id, status, consented_at FROM newsletter_subscriptions WHERE email = ?').bind(user.email).first()
      const optedIn = subscription?.status === 'subscribed'
      const savedSettings = { ...next, newsletter: optedIn, ...(optedIn ? { unsubscribeUrl: 'https://rovera.xyz/unsubscribe?token=' + encodeURIComponent(await makeUnsubscribeToken(subscription, env.AUTH_SECRET)) } : {}) }
      return json({ settings: savedSettings })
    }
    return json({ error: 'Method not allowed.' }, 405, { Allow: 'GET, PUT' })
  }
  if (url.pathname === '/api/newsletter/unsubscribe' && request.method === 'POST') {
    if (!hasTrustedOrigin(request)) return json({ error: 'This request could not be verified. Reload the unsubscribe page and try again.' }, 403)
    const { token = '' } = await readBody(request)
    const parts = String(token).split('.')
    if (parts.length !== 2 || !/^[A-Za-z0-9_-]{40,400}$/.test(parts[0]) || parts[1] !== await sign(parts[0], env.AUTH_SECRET)) return json({ error: 'This unsubscribe link is invalid or expired.' }, 400)
    let payload
    try { payload = JSON.parse(new TextDecoder().decode(unb64(parts[0]))) } catch { return json({ error: 'This unsubscribe link is invalid or expired.' }, 400) }
    if (typeof payload.id !== 'string' || !Number.isSafeInteger(payload.consentedAt)) return json({ error: 'This unsubscribe link is invalid or expired.' }, 400)
    const updated = await env.ROVERA_DB.prepare(`UPDATE newsletter_subscriptions SET status = 'unsubscribed', unsubscribed_at = ?
      WHERE id = ? AND consented_at = ? AND status = 'subscribed' RETURNING email`).bind(Date.now(), payload.id, payload.consentedAt).first()
    if (!updated) return json({ ok: true, alreadyUnsubscribed: true })
    return json({ ok: true })
  }
  if (url.pathname === '/api/account/deactivate' && request.method === 'POST') {
    if (!hasTrustedOrigin(request)) return json({ error: 'This request could not be verified.' }, 403)
    const session = await readSession(request, env, env.AUTH_SECRET)
    const user = session?.uid ? await readUser(env, session.uid) : null
    if (!user) return json({ error: 'You must be signed in.' }, 401)
    await env.ROVERA_DB.prepare("UPDATE users SET account_status = 'deactivated', updated_at = ? WHERE id = ?").bind(Date.now(), user.id).run()
    await env.ROVERA_DB.prepare('UPDATE auth_sessions SET revoked_at = ? WHERE user_id = ?').bind(Date.now(), user.id).run()
    return json({ ok: true }, 200, { 'Set-Cookie': makeCookie('rovera_session', '', 0) })
  }
  if (url.pathname === '/api/account/delete' && request.method === 'POST') {
    if (!hasTrustedOrigin(request)) return json({ error: 'This request could not be verified. Reload Rovera and try again.' }, 403)
    const session = await readSession(request, env, env.AUTH_SECRET)
    const user = session?.uid ? await readUser(env, session.uid) : null
    if (!user) return json({ error: 'You must be signed in.' }, 401)
    if (!Number.isFinite(session.authTime) || Date.now() - session.authTime > 10 * 60 * 1000) {
      return json({ error: 'For your security, sign in again before deleting your account.' }, 428)
    }
    await env.ROVERA_DB.batch([
      env.ROVERA_DB.prepare('DELETE FROM auth_welcome_emails WHERE user_id = ?').bind(user.id),
      env.ROVERA_DB.prepare('DELETE FROM auth_email_challenges WHERE email = ?').bind(user.email),
      env.ROVERA_DB.prepare('DELETE FROM auth_sessions WHERE user_id = ?').bind(user.id),
      env.ROVERA_DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id),
    ])
    return json({ ok: true }, 200, { 'Set-Cookie': makeCookie('rovera_session', '', 0) })
  }
  if (url.pathname === '/api/auth/email/request' && request.method === 'POST') {
    if (!env.RESEND_API_KEY) return json({ error: 'Email provider is not configured' }, 503)
    const body = await readBody(request)
    const email = String(body.email || '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Enter a valid email address.' }, 400)
    const ip = getClientAddress(request)
    const emailRate = await consumeRateLimit(env.ROVERA_DB, await hash('email-request|' + email), 3)
    const ipRate = await consumeRateLimit(env.ROVERA_DB, await hash('ip-email-request|' + ip), 10)
    const rate = !emailRate.ok ? emailRate : ipRate
    if (!rate.ok) return json({ error: 'Too many code requests. Please try again later.' }, 429, { 'Retry-After': String(rate.retryAfter) })
    const challenge = await makeEmailChallenge(email, env.AUTH_SECRET)
    const db = env.ROVERA_DB
    await db.batch([
      db.prepare('UPDATE auth_email_challenges SET consumed_at = ? WHERE email = ? AND consumed_at IS NULL').bind(Date.now(), email),
      db.prepare('INSERT INTO auth_email_challenges (challenge_id, email, code_hash, created_at, expires_at, attempts, consumed_at) VALUES (?, ?, ?, ?, ?, 0, NULL)').bind(challenge.id, email, challenge.codeHash, challenge.createdAt, challenge.expiresAt),
    ])
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
      await db.prepare('UPDATE auth_email_challenges SET consumed_at = ? WHERE challenge_id = ? AND consumed_at IS NULL').bind(Date.now(), challenge.id).run()
      return json({ error: 'The login email could not be sent.' }, 502)
    }
    return json({ ok: true }, 200, { 'Set-Cookie': makeCookie('rovera_email_challenge', challenge.id, 480) })
  }
  if (url.pathname === '/api/auth/email/verify' && request.method === 'POST') {
    const body = await readBody(request)
    const code = String(body.code || '').trim().toUpperCase()
    const challengeId = getCookies(request).rovera_email_challenge || ''
    const clearChallenge = { 'Set-Cookie': makeCookie('rovera_email_challenge', '', 0) }
    const ipRate = await consumeRateLimit(env.ROVERA_DB, await hash('ip-email-verify|' + getClientAddress(request)), 30)
    if (!ipRate.ok) return json({ error: 'Too many attempts. Please try again later.' }, 429, { ...clearChallenge, 'Retry-After': String(ipRate.retryAfter) })
    if (!/^[A-Za-z0-9_-]{40,48}$/.test(challengeId)) return json({ error: 'This code has expired. Request a new one.' }, 410, clearChallenge)

    const now = Date.now()
    const challenge = await env.ROVERA_DB.prepare(`UPDATE auth_email_challenges
      SET attempts = attempts + 1
      WHERE challenge_id = ? AND consumed_at IS NULL AND expires_at > ? AND attempts < 5
      RETURNING email, code_hash, attempts`).bind(challengeId, now).first()
    if (!challenge) return json({ error: 'This code has expired or is no longer valid. Request a new one.' }, 410, clearChallenge)

    if (!/^RO-\d{6}$/.test(code) || await sign(code, env.AUTH_SECRET) !== challenge.code_hash) {
      if (Number(challenge.attempts) >= 5) {
        await env.ROVERA_DB.prepare('UPDATE auth_email_challenges SET consumed_at = ? WHERE challenge_id = ? AND consumed_at IS NULL').bind(now, challengeId).run()
        return json({ error: 'Too many incorrect attempts. Request a new code.' }, 429, clearChallenge)
      }
      return json({ error: 'That code is not correct.' }, 401)
    }

    // Consume conditionally before creating the session; only one concurrent
    // request can turn a challenge into an authenticated session.
    const consumed = await env.ROVERA_DB.prepare(`UPDATE auth_email_challenges SET consumed_at = ?
      WHERE challenge_id = ? AND consumed_at IS NULL AND expires_at > ? RETURNING email`).bind(now, challengeId, now).first()
    if (!consumed) return json({ error: 'This code has already been used. Request a new one.' }, 410, clearChallenge)
    const emailId = await hash(consumed.email)
    const user = await saveUser(env, { id: 'email:' + emailId, provider: 'email', providerSubject: emailId, email: consumed.email, name: consumed.email, picture: '' })
    if (user.account_status !== 'active') return json({ error: 'This account is temporarily deactivated. Contact help@rovera.xyz to request reactivation.' }, 423, clearChallenge)
    await sendWelcomeEmail(env, user)
    const session = await makeSession(env, { uid: user.id }, request, env.AUTH_SECRET)
    return json({ ok: true }, 200, { 'Set-Cookie': [makeCookie('rovera_session', session, 604800), makeCookie('rovera_email_challenge', '', 0)] })
  }
  return null
}

const worker = {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.hostname === 'settings.rovera.xyz' && url.pathname === '/') return redirect('https://rovera.xyz/profile/')
    if (url.pathname.startsWith('/api/auth/') || url.pathname.startsWith('/api/account/') || url.pathname.startsWith('/api/newsletter/')) {
      const response = await handleAuth(request, env, url)
      if (response) return response
    }
    return secureResponse(await env.ASSETS.fetch(request))
  }
}

export default worker
