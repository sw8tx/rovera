import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

let DatabaseSync
try { ({ DatabaseSync } = await import('node:sqlite')) } catch { /* Node versions without the built-in SQLite module skip the SQL integration check. */ }

const workerSource = await readFile(new URL('../cloudflare/_worker.js', import.meta.url), 'utf8')
const { default: worker } = await import(`data:text/javascript;base64,${Buffer.from(workerSource).toString('base64')}`)

function makeDb() {
  const rates = new Map()
  const challenges = new Map()
  const users = new Map()
  const sessions = new Map()
  const rateStatements = []
  const subscriptions = new Map()
  const welcomeEmails = new Map()
  const sentEmails = []

  function execute(sql, values) {
    if (sql.includes('INSERT INTO auth_rate_limits')) {
      rateStatements.push({ sql, values })
      const [key, now] = values
      const limit = values[11]
      const windowMs = values[13]
      let row = rates.get(key)
      if (!row || now - row.window_started >= windowMs) row = { window_started: now, request_count: 0, blocked_until: 0 }
      if (row.blocked_until <= now) {
        row.request_count += 1
        if (row.request_count > limit) row.blocked_until = now + windowMs
      }
      rates.set(key, row)
      return { request_count: row.request_count, blocked_until: row.blocked_until }
    }
    if (sql.includes('SET attempts = attempts + 1')) {
      const [id, now] = values
      const row = challenges.get(id)
      if (!row || row.consumed_at !== null || row.expires_at <= now || row.attempts >= 5) return null
      row.attempts += 1
      return { email: row.email, code_hash: row.code_hash, attempts: row.attempts }
    }
    if (sql.includes('UPDATE auth_email_challenges') && sql.includes('WHERE email = ?')) {
      const [now, email] = values
      for (const row of challenges.values()) if (row.email === email && row.consumed_at === null) row.consumed_at = now
      return { success: true }
    }
    if (sql.includes('UPDATE auth_email_challenges SET consumed_at')) {
      const [now, id, expiresAt] = values
      const row = challenges.get(id)
      if (!row || row.consumed_at !== null || (expiresAt !== undefined && row.expires_at <= expiresAt)) return null
      row.consumed_at = now
      return { email: row.email }
    }
    if (sql.includes('INSERT INTO auth_email_challenges')) {
      const [id, email, code_hash, created_at, expires_at] = values
      challenges.set(id, { challenge_id: id, email, code_hash, created_at, expires_at, attempts: 0, consumed_at: null })
      return { success: true }
    }
    if (sql.startsWith('INSERT INTO newsletter_subscriptions')) {
      const [id, email, time] = values
      const optedIn = sql.includes("VALUES (?, ?, 'subscribed'")
      const old = subscriptions.get(email)
      const row = optedIn
        ? { id, email, status: 'subscribed', consented_at: time, consent_source: 'account-settings', consent_version: 'newsletter-2026-10-v1', unsubscribed_at: null }
        : { ...(old || {}), id: old?.id || id, email, status: 'unsubscribed', consented_at: old?.consented_at ?? null, consent_source: old?.consent_source ?? null, consent_version: old?.consent_version ?? null, unsubscribed_at: time }
      subscriptions.set(email, row)
      return { success: true }
    }
    if (sql.startsWith('UPDATE newsletter_subscriptions SET status')) {
      const [time, id, consentedAt] = values
      const row = [...subscriptions.values()].find((item) => item.id === id && item.consented_at === consentedAt && item.status === 'subscribed')
      if (!row) return null
      row.status = 'unsubscribed'
      row.unsubscribed_at = time
      return { email: row.email }
    }
    if (sql.startsWith('INSERT OR IGNORE INTO users')) {
      const [id, provider, provider_subject, email, name, picture, created_at, updated_at] = values
      if (users.has(provider_subject)) return { success: true, changes: 0 }
      users.set(provider_subject, { id, provider, provider_subject, email, name, picture, created_at, updated_at, account_status: 'active' })
      return { success: true, changes: 1 }
    }
    if (sql.startsWith('UPDATE users SET email =')) {
      const [email, name, picture, updated_at, subject] = values
      const row = users.get(subject)
      if (row) { row.email = email; if (!row.name) row.name = name; row.picture = picture; row.updated_at = Math.max(updated_at, row.updated_at + 1) }
      return { success: true, changes: row ? 1 : 0 }
    }
    if (sql.startsWith('INSERT OR IGNORE INTO auth_welcome_emails')) {
      const [user_id, created_at] = values
      if (welcomeEmails.has(user_id)) return { success: true, changes: 0 }
      welcomeEmails.set(user_id, { user_id, status: 'pending', created_at, sent_at: null })
      return { success: true, changes: 1 }
    }
    if (sql.startsWith('UPDATE auth_welcome_emails SET status')) {
      const sent = sql.includes("status = 'sent'")
      const [time, user_id] = values
      const row = welcomeEmails.get(user_id)
      if (row) { row.status = sent ? 'sent' : 'failed'; if (sent) row.sent_at = time }
      return { success: true, changes: row ? 1 : 0 }
    }
    if (sql.startsWith('DELETE FROM auth_welcome_emails')) {
      welcomeEmails.delete(values[0])
      return { success: true, changes: 1 }
    }
    if (sql.includes('INSERT INTO auth_sessions')) {
      const [id, user_id, ip_address, country, colo, user_agent, created_at, last_seen, expires_at] = values
      sessions.set(id, { id, user_id, ip_address, country, colo, user_agent, created_at, last_seen, expires_at, revoked_at: 0 })
      return { success: true }
    }
    if (sql.startsWith('UPDATE auth_sessions SET last_seen')) {
      const [last_seen, id] = values
      const row = sessions.get(id)
      if (row) row.last_seen = last_seen
      return { success: true }
    }
    if (sql.startsWith('UPDATE auth_sessions SET revoked_at')) {
      const [revokedAt, userId, targetId] = values
      if (sql.includes('WHERE user_id = ?') && !sql.includes('AND id')) {
        for (const row of sessions.values()) {
          if (row.user_id === userId && row.revoked_at === 0) row.revoked_at = revokedAt
        }
        return { success: true }
      }
      const revokeOthers = sql.includes('id != ?')
      const revokeAll = !sql.includes('id = ?') && !revokeOthers
      for (const row of sessions.values()) if (row.user_id === userId && (revokeAll || (revokeOthers ? row.id !== targetId : row.id === targetId)) && row.revoked_at === 0) row.revoked_at = revokedAt
      return { success: true }
    }
    if (sql.startsWith('DELETE FROM auth_email_challenges')) {
      const [email] = values
      for (const [id, row] of challenges) if (row.email === email) challenges.delete(id)
      return { success: true }
    }
    if (sql.startsWith('DELETE FROM auth_sessions')) {
      const [userId] = values
      for (const [id, row] of sessions) if (row.user_id === userId) sessions.delete(id)
      return { success: true }
    }
    if (sql.startsWith('DELETE FROM users')) {
      const [id] = values
      for (const [subject, row] of users) if (row.id === id) users.delete(subject)
      return { success: true }
    }
    if (sql.startsWith('UPDATE users SET name')) {
      const [name, updated_at, id] = values
      const row = [...users.values()].find((user) => user.id === id)
      if (row) { row.name = name; row.updated_at = updated_at }
      return { success: true }
    }
    if (sql.startsWith('UPDATE users SET settings_json')) {
      const [settings, , id] = values
      const row = [...users.values()].find((user) => user.id === id)
      if (row) row.settings_json = settings
      return { success: true }
    }
    if (sql.startsWith('UPDATE users SET account_status')) {
      const [updated_at, id] = values
      const row = [...users.values()].find((user) => user.id === id)
      if (row) { row.account_status = 'deactivated'; row.updated_at = updated_at }
      return { success: true, changes: row ? 1 : 0 }
    }
    throw new Error(`Unexpected test SQL: ${sql}`)
  }

  return {
    challenges,
    rates,
    rateStatements,
    subscriptions,
    welcomeEmails,
    sentEmails,
    sessions,
    prepare(sql) {
      return { bind(...values) {
        return {
          first: async () => {
            if (sql.startsWith('SELECT id, provider, email, name, picture, account_status FROM users')) {
              return [...users.values()].find((user) => user.provider_subject === values[0]) || null
            }
            if (sql.startsWith('SELECT id, user_id, ip_address')) {
              const [id, userId, now] = values
              const row = sessions.get(id)
              return row && row.user_id === userId && row.revoked_at === 0 && row.expires_at > now ? row : null
            }
            if (sql.startsWith('SELECT id, provider, email, name, picture, settings_json')) {
              const [id] = values
              const row = [...users.values()].find((user) => user.id === id)
              return row ? { ...row, settings_json: row.settings_json || '{}' } : null
            }
            if (sql.startsWith('SELECT id, status, consented_at FROM newsletter_subscriptions')) return subscriptions.get(values[0]) || null
            return execute(sql, values)
          },
          run: async () => {
            const result = execute(sql, values)
            return { meta: { changes: Number(result?.changes ?? (result?.success === false ? 0 : 1)) } }
          },
          all: async () => sql.startsWith('SELECT id, ip_address, country, colo, user_agent, created_at, last_seen, expires_at FROM auth_sessions')
            ? { results: [...sessions.values()].filter((row) => row.user_id === values[0] && row.revoked_at === 0 && row.expires_at > values[1]) }
            : { results: [] },
        }
      } }
    },
    async batch(statements) {
      const results = []
      for (const statement of statements) results.push(await statement.run())
      return results
    },
  }
}

test('email/IP rate-limit UPSERT runs against SQLite and resets only after its window', async (t) => {
  if (!DatabaseSync) { t.skip('Built-in node:sqlite is unavailable on this Node version.') ; return }
  const { env, db } = setup(t)
  await requestCode(worker, env, 'sql-check@example.com', '203.0.113.81')
  const { sql } = db.rateStatements[0]
  const sqlite = new DatabaseSync(':memory:')
  t.after(() => sqlite.close())
  sqlite.exec(await readFile(new URL('../migrations/0001_accounts.sql', import.meta.url), 'utf8'))
  sqlite.exec(await readFile(new URL('../migrations/0004_email_login_challenges.sql', import.meta.url), 'utf8'))
  sqlite.exec(await readFile(new URL('../migrations/0005_newsletter_consents.sql', import.meta.url), 'utf8'))
  sqlite.exec(await readFile(new URL('../migrations/0006_welcome_emails.sql', import.meta.url), 'utf8'))
  const now = 1_800_000_000_000
  const args = (at) => ['test-rate-key', at, at, at, 900_000, at, at, 900_000, at, at, 900_000, 3, at, 900_000]
  const statement = sqlite.prepare(sql)
  for (let count = 1; count <= 3; count += 1) {
    assert.equal(Number(statement.get(...args(now + count)).blocked_until), 0)
  }
  const blocked = statement.get(...args(now + 4))
  assert.equal(Number(blocked.request_count), 4)
  assert.equal(Number(blocked.blocked_until), now + 4 + 900_000)
  assert.equal(Number(statement.get(...args(now + 5)).request_count), 4, 'blocked requests must not extend or reset the counter')
  assert.equal(Number(statement.get(...args(now + 900_005)).request_count), 1, 'counter resets when the window expires')
})

function setup(t) {
  const db = makeDb()
  const sentEmails = db.sentEmails
  const env = { AUTH_SECRET: 'test-only-auth-secret', RESEND_API_KEY: 'test-only-resend-key', ROVERA_DB: db }
  let sentCode = ''
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (_url, init) => {
    const payload = JSON.parse(init.body)
    sentEmails.push(payload)
    if (payload.subject.match(/RO-\d{6}/)) sentCode = payload.subject.match(/RO-\d{6}/)[0]
    return new Response('{}', { status: 200 })
  }
  t.after(() => { globalThis.fetch = originalFetch })
  return { db, env, getCode: () => sentCode, sentEmails }
}

function post(path, body, cookie = '', ip = '203.0.113.24') {
  const headers = { 'Content-Type': 'application/json', 'CF-Connecting-IP': ip, Origin: 'https://rovera.xyz' }
  if (cookie) headers.Cookie = cookie
  return new Request(`https://rovera.xyz${path}`, { method: 'POST', headers, body: JSON.stringify(body) })
}

function cookieFrom(response, name) {
  const headers = response.headers.getSetCookie?.() || [response.headers.get('set-cookie') || '']
  const found = headers.map((header) => header.match(new RegExp(`${name}=([^;]+)`))).find(Boolean)
  return found ? `${name}=${decodeURIComponent(found[1])}` : ''
}

async function requestCode(worker, env, email = 'user@example.com', ip) {
  const response = await worker.fetch(post('/api/auth/email/request', { email }, '', ip), env)
  const rawCookie = response.headers.get('set-cookie') || ''
  const match = rawCookie.match(/rovera_email_challenge=([^;]+)/)
  return { response, cookie: match ? `rovera_email_challenge=${decodeURIComponent(match[1])}` : '', id: match ? decodeURIComponent(match[1]) : '' }
}

test('email challenge cookie and API reply contain no code or verifier', async (t) => {
  const { env, db, getCode } = setup(t)
  const { response, id } = await requestCode(worker, env)
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ok: true })
  assert.equal(response.headers.get('cache-control'), 'no-store')
  assert.match(response.headers.get('content-security-policy-report-only'), /frame-ancestors 'none'/)
  assert.match(id, /^[A-Za-z0-9_-]{40,48}$/)
  assert.equal(getCode().length, 9)
  assert.doesNotMatch(id, /RO-\d{6}|code_hash|email|attempts/)
  assert.equal(db.challenges.get(id).email, 'user@example.com')
  assert.notEqual(db.challenges.get(id).code_hash, getCode())
  assert.equal(db.challenges.get(id).attempts, 0)
})

test('replaying the original cookie does not reset server-side attempts', async (t) => {
  const { env, db, getCode } = setup(t)
  const { cookie, id } = await requestCode(worker, env)
  const wrong = getCode() === 'RO-999999' ? 'RO-999998' : 'RO-999999'
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const response = await worker.fetch(post('/api/auth/email/verify', { code: wrong }, cookie), env)
    assert.equal(response.status, 401)
  }
  const blocked = await worker.fetch(post('/api/auth/email/verify', { code: wrong }, cookie), env)
  assert.equal(blocked.status, 429)
  assert.equal(db.challenges.get(id).attempts, 5)
  const replay = await worker.fetch(post('/api/auth/email/verify', { code: wrong }, cookie), env)
  assert.equal(replay.status, 410)
})

test('successful verification consumes the challenge and concurrent replay cannot sign in twice', async (t) => {
  const { env, db, getCode } = setup(t)
  const { cookie, id } = await requestCode(worker, env)
  const responses = await Promise.all([
    worker.fetch(post('/api/auth/email/verify', { code: getCode() }, cookie), env),
    worker.fetch(post('/api/auth/email/verify', { code: getCode() }, cookie), env),
  ])
  assert.deepEqual(responses.map((response) => response.status).sort(), [200, 410])
  assert.notEqual(db.challenges.get(id).consumed_at, null)
  const usedAgain = await worker.fetch(post('/api/auth/email/verify', { code: getCode() }, cookie), env)
  assert.equal(usedAgain.status, 410)
  assert.equal(db.sessions.size, 1)
})

test('a first successful registration sends one separate non-marketing welcome message', async (t) => {
  const { env, getCode, sentEmails, db } = setup(t)
  const firstChallenge = await requestCode(worker, env, 'welcome@example.com')
  const firstLogin = await worker.fetch(post('/api/auth/email/verify', { code: getCode() }, firstChallenge.cookie), env)
  assert.equal(firstLogin.status, 200)
  const welcome = sentEmails.filter((email) => email.subject === 'Welcome to Rovera')
  assert.equal(welcome.length, 1)
  assert.equal(welcome[0].to[0], 'welcome@example.com')
  assert.match(welcome[0].text, /This is an account message, not a marketing subscription/)
  assert.match(welcome[0].html, /\/profile\//)
  const userId = [...db.welcomeEmails.keys()][0]
  assert.equal(db.welcomeEmails.get(userId).status, 'sent')

  const nextChallenge = await requestCode(worker, env, 'welcome@example.com')
  const nextLogin = await worker.fetch(post('/api/auth/email/verify', { code: getCode() }, nextChallenge.cookie), env)
  assert.equal(nextLogin.status, 200)
  assert.equal(sentEmails.filter((email) => email.subject === 'Welcome to Rovera').length, 1)
})

test('expired challenges cannot be verified', async (t) => {
  const { env, getCode } = setup(t)
  const originalNow = Date.now
  let now = originalNow()
  Date.now = () => now
  t.after(() => { Date.now = originalNow })
  const { cookie } = await requestCode(worker, env)
  now += 8 * 60 * 1000 + 1
  const response = await worker.fetch(post('/api/auth/email/verify', { code: getCode() }, cookie), env)
  assert.equal(response.status, 410)
})

test('email code requests are bounded by both email and source IP', async (t) => {
  const { env } = setup(t)
  const requests = []
  for (let index = 0; index < 4; index += 1) requests.push(requestCode(worker, env, 'same@example.com', '203.0.113.88'))
  const responses = await Promise.all(requests)
  assert.equal(responses.filter(({ response }) => response.status === 200).length, 3)
  assert.equal(responses.filter(({ response }) => response.status === 429).length, 1)
})

test('Discord login asks only for identity scopes and no longer requires guild-join secrets', async (t) => {
  const { env } = setup(t)
  env.DISCORD_CLIENT_ID = 'discord-client-id'
  env.DISCORD_CLIENT_SECRET = 'discord-client-secret'
  const response = await worker.fetch(new Request('https://rovera.xyz/api/auth/discord'), env)
  assert.equal(response.status, 302)
  const authorize = new URL(response.headers.get('location'))
  assert.equal(authorize.searchParams.get('scope'), 'identify email')
})

test('a chosen email-profile name survives a later email-provider login', async (t) => {
  const { env, getCode } = setup(t)
  const firstChallenge = await requestCode(worker, env, 'name@example.com')
  const firstSignIn = await worker.fetch(post('/api/auth/email/verify', { code: getCode() }, firstChallenge.cookie), env)
  const sessionCookie = cookieFrom(firstSignIn, 'rovera_session')
  assert.equal(firstSignIn.status, 200)

  const update = await worker.fetch(new Request('https://rovera.xyz/api/account/profile', {
    method: 'PUT', headers: { Cookie: sessionCookie, 'Content-Type': 'application/json', Origin: 'https://rovera.xyz' },
    body: JSON.stringify({ name: 'RoveraFan' }),
  }), env)
  assert.equal(update.status, 200)

  const nextChallenge = await requestCode(worker, env, 'name@example.com')
  const secondSignIn = await worker.fetch(post('/api/auth/email/verify', { code: getCode() }, nextChallenge.cookie), env)
  const nextSession = cookieFrom(secondSignIn, 'rovera_session')
  const profile = await worker.fetch(new Request('https://rovera.xyz/api/account/profile', { headers: { Cookie: nextSession } }), env)
  assert.equal((await profile.json()).user.name, 'RoveraFan')
})

test('account deletion requires a trusted Origin and a fresh sign-in', async (t) => {
  const { env, getCode } = setup(t)
  const challenge = await requestCode(worker, env, 'delete@example.com')
  const signedIn = await worker.fetch(post('/api/auth/email/verify', { code: getCode() }, challenge.cookie), env)
  const sessionCookie = cookieFrom(signedIn, 'rovera_session')
  const originalNow = Date.now
  const signedInAt = originalNow()
  Date.now = () => signedInAt + 11 * 60 * 1000
  t.after(() => { Date.now = originalNow })

  const noOrigin = await worker.fetch(new Request('https://rovera.xyz/api/account/delete', { method: 'POST', headers: { Cookie: sessionCookie } }), env)
  assert.equal(noOrigin.status, 403)
  const staleAuth = await worker.fetch(new Request('https://rovera.xyz/api/account/delete', { method: 'POST', headers: { Cookie: sessionCookie, Origin: 'https://rovera.xyz' } }), env)
  assert.equal(staleAuth.status, 428)
})

test('newsletter is opt-in, records consent, and a signed public link suppresses future mail', async (t) => {
  const { env, db, getCode } = setup(t)
  const challenge = await requestCode(worker, env, 'newsletter@example.com')
  const login = await worker.fetch(post('/api/auth/email/verify', { code: getCode() }, challenge.cookie), env)
  assert.equal(login.status, 200)
  const sessionCookie = cookieFrom(login, 'rovera_session')
  const getPreferences = () => worker.fetch(new Request('https://rovera.xyz/api/account/preferences', { headers: { Cookie: sessionCookie } }), env)
  let response = await getPreferences()
  assert.equal((await response.json()).settings.newsletter, false)
  response = await worker.fetch(new Request('https://rovera.xyz/api/account/preferences', { method: 'PUT', headers: { Cookie: sessionCookie, 'Content-Type': 'application/json', Origin: 'https://rovera.xyz' }, body: JSON.stringify({ newsletter: true }) }), env)
  assert.equal(response.status, 200)
  const result = await response.json()
  assert.equal(result.settings.newsletter, true)
  assert.match(result.settings.unsubscribeUrl, /^https:\/\/rovera\.xyz\/unsubscribe\?token=/)
  const row = db.subscriptions.get('newsletter@example.com')
  assert.equal(row.status, 'subscribed')
  assert.equal(row.consent_source, 'account-settings')
  assert.equal(row.consent_version, 'newsletter-2026-10-v1')
  assert.ok(row.consented_at > 0)
  const token = new URL(result.settings.unsubscribeUrl).searchParams.get('token')
  response = await worker.fetch(post('/api/newsletter/unsubscribe', { token }, '', '203.0.113.77'), env)
  assert.equal(response.status, 200)
  assert.equal(db.subscriptions.get('newsletter@example.com').status, 'unsubscribed')
  assert.equal((await (await getPreferences()).json()).settings.newsletter, false)
  response = await worker.fetch(post('/api/newsletter/unsubscribe', { token }), env)
  assert.equal((await response.json()).alreadyUnsubscribed, true)
  response = await worker.fetch(new Request('https://rovera.xyz/api/account/preferences', { method: 'PUT', headers: { Cookie: sessionCookie, 'Content-Type': 'application/json', Origin: 'https://rovera.xyz' }, body: JSON.stringify({ newsletter: false }) }), env)
  assert.equal(response.status, 200)
  assert.equal(db.subscriptions.get('newsletter@example.com').status, 'unsubscribed')
  const resubscribe = await worker.fetch(new Request('https://rovera.xyz/api/account/preferences', { method: 'PUT', headers: { Cookie: sessionCookie, 'Content-Type': 'application/json', Origin: 'https://rovera.xyz' }, body: JSON.stringify({ newsletter: true }) }), env)
  const renewedLink = (await resubscribe.json()).settings.unsubscribeUrl
  response = await worker.fetch(post('/api/newsletter/unsubscribe', { token }), env)
  assert.equal((await response.json()).alreadyUnsubscribed, true, 'old links cannot unsubscribe a renewed consent')
  assert.equal(db.subscriptions.get('newsletter@example.com').status, 'subscribed')
  assert.notEqual(renewedLink, result.settings.unsubscribeUrl)
})

test('session revocation removes only the selected other session after server confirmation', async (t) => {
  const { env, getCode, db } = setup(t)
  const firstChallenge = await requestCode(worker, env, 'sessions@example.com')
  const firstLogin = await worker.fetch(post('/api/auth/email/verify', { code: getCode() }, firstChallenge.cookie), env)
  const firstCookie = cookieFrom(firstLogin, 'rovera_session')
  const firstId = JSON.parse(Buffer.from(firstCookie.split('=')[1].split('.')[0], 'base64url').toString()).sid
  const nextChallenge = await requestCode(worker, env, 'sessions@example.com')
  const nextLogin = await worker.fetch(post('/api/auth/email/verify', { code: getCode() }, nextChallenge.cookie), env)
  const currentCookie = cookieFrom(nextLogin, 'rovera_session')
  const currentId = JSON.parse(Buffer.from(currentCookie.split('=')[1].split('.')[0], 'base64url').toString()).sid
  assert.equal(db.sessions.size, 2)
  const revoke = await worker.fetch(post('/api/account/sessions', { id: firstId }, currentCookie), env)
  assert.equal(revoke.status, 200)
  assert.ok(db.sessions.get(firstId).revoked_at > 0)
  assert.equal(db.sessions.get(currentId).revoked_at, 0)
  const oldSession = await worker.fetch(new Request('https://rovera.xyz/api/auth/session', { headers: { Cookie: firstCookie } }), env)
  assert.equal(await oldSession.json(), null)
})

test('a deactivated account cannot receive a new session and gets the support recovery path', async (t) => {
  const { env, getCode, db } = setup(t)
  const challenge = await requestCode(worker, env, 'reactivate@example.com')
  const login = await worker.fetch(post('/api/auth/email/verify', { code: getCode() }, challenge.cookie), env)
  const sessionCookie = cookieFrom(login, 'rovera_session')
  const deactivate = await worker.fetch(post('/api/account/deactivate', {}, sessionCookie), env)
  assert.equal(deactivate.status, 200)
  assert.ok([...db.sessions.values()][0].revoked_at > 0, JSON.stringify([...db.sessions.values()]))
  const nextChallenge = await requestCode(worker, env, 'reactivate@example.com')
  const rejected = await worker.fetch(post('/api/auth/email/verify', { code: getCode() }, nextChallenge.cookie), env)
  assert.equal(rejected.status, 423)
  assert.match((await rejected.json()).error, /help@rovera\.xyz.*reactivation/)
  assert.equal(db.sessions.size, 1, 'deactivation revoked the existing session; failed re-entry must not create another')
})

test('settings root redirects to the canonical public account page', async () => {
  const response = await worker.fetch(new Request('https://settings.rovera.xyz/'), {})
  assert.equal(response.status, 302)
  assert.equal(response.headers.get('location'), 'https://rovera.xyz/profile/')
})
