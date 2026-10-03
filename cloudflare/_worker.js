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
