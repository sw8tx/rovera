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

function json(requestBody, status = 200, headers = {}) {
  const responseHeaders = new Headers({ 'Content-Type': 'application/json' })
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) value.forEach((item) => responseHeaders.append(name, item))
    else responseHeaders.set(name, value)
  }
  return new Response(JSON.stringify(requestBody), { status, headers: responseHeaders })
}

async function readBody(request) {
  try { return await request.json() } catch { return {} }
}

async function makeEmailChallenge(email, secret) {
  const digits = String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, '0')
  const code = 'RO-' + digits
  const payload = b64(JSON.stringify({ email, code: await hash(code), exp: Date.now() + 480000 }))
  return { code, cookie: payload + '.' + await sign(payload, secret) }
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

function redirect(location, headers = {}) {
  const responseHeaders = new Headers({ Location: location })
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) value.forEach((item) => responseHeaders.append(name, item))
    else responseHeaders.set(name, value)
  }
  return new Response(null, { status: 302, headers: responseHeaders })
}

async function handleAuth(request, env, url) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.AUTH_SECRET) return new Response('OAuth is not configured', { status: 500 })
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
    const session = await makeSession({ sub: profile.sub, email: profile.email, name: profile.name || '', picture: profile.picture || '' }, env.AUTH_SECRET)
    return redirect('/', { 'Set-Cookie': [makeCookie('rovera_session', session, 604800), makeCookie('rovera_oauth_state', '', 0)] })
  }

  if (url.pathname === '/api/auth/session') return Response.json(await readSession(request, env.AUTH_SECRET))
  if (url.pathname === '/api/auth/logout') return redirect('/', { 'Set-Cookie': makeCookie('rovera_session', '', 0) })
  if (url.pathname === '/api/auth/email/request' && request.method === 'POST') {
    if (!env.RESEND_API_KEY) return json({ error: 'Email provider is not configured' }, 503)
    const body = await readBody(request)
    const email = String(body.email || '').trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: 'Enter a valid email address.' }, 400)
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
          html: `<div style="margin:0;background:#f5f5f3;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#171717"><div style="display:none;max-height:0;overflow:hidden;opacity:0">Your one-time Rovera sign-in code is ${challenge.code}.</div><table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e1;border-radius:14px"><tr><td style="padding:28px 30px"><img src="https://rovera.xyz/rovera-logo.png" width="44" height="44" alt="Rovera" style="display:block;border:0;border-radius:10px;margin-bottom:22px"><p style="margin:0 0 8px;font-size:11px;letter-spacing:.14em;color:#777;font-weight:700">ROVERA ACCOUNT</p><h1 style="margin:0 0 14px;font-size:26px;line-height:1.2;font-weight:700">Sign in to Rovera</h1><p style="margin:0;color:#555;line-height:1.6">Use the one-time code below to finish signing in.</p><div style="margin:24px 0;padding:16px;text-align:center;background:#f2f2f0;border-radius:10px"><span style="font-size:28px;letter-spacing:.16em;font-weight:700;color:#171717">${challenge.code}</span></div><p style="margin:0;color:#777;font-size:13px;line-height:1.6">This code expires in 8 minutes. If you did not request it, you can safely ignore this email.</p><p style="margin:24px 0 0;color:#999;font-size:12px">Rovera · <a href="https://rovera.xyz/" style="color:#777">rovera.xyz</a></p></td></tr></table></div>`,
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
    if (await hash(code) !== challenge.code) return json({ error: 'That code is not correct.' }, 401)
    const session = await makeSession({ sub: 'email:' + challenge.email, email: challenge.email, name: challenge.email, picture: '' }, env.AUTH_SECRET)
    return json({ ok: true }, 200, { 'Set-Cookie': [makeCookie('rovera_session', session, 604800), makeCookie('rovera_email_challenge', '', 0)] })
  }
  return null
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/auth/')) {
      const response = await handleAuth(request, env, url)
      if (response) return response
    }
    return env.ASSETS.fetch(request)
  }
}
