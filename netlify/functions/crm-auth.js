const crypto = require('node:crypto');

const SESSION_TTL_SECONDS = 60 * 60 * 8;

function response(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers },
    body: JSON.stringify(body)
  };
}

function credentials() {
  return {
    username: process.env.CRM_USERNAME || '',
    password: process.env.CRM_PASSWORD || ''
  };
}

function sign(payload) {
  return crypto.createHmac('sha256', process.env.CRM_SESSION_SECRET || '').update(payload).digest('base64url');
}

function sessionFromEvent(event) {
  const cookie = event.headers.cookie || '';
  const token = cookie.split(';').map((item) => item.trim()).find((item) => item.startsWith('blackout_crm='))?.slice(13);
  if (!token) return null;
  const [payload, signature] = token.split('.');
  const expectedSignature = payload ? sign(payload) : '';
  if (!payload || !signature || signature.length !== expectedSignature.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

exports.requireSession = sessionFromEvent;

exports.handler = async (event) => {
  if (!process.env.CRM_SESSION_SECRET) {
    console.error('Missing CRM session configuration.');
    return response(500, { error: 'CRM session is not configured.' });
  }
  if (event.httpMethod === 'GET') {
    const session = sessionFromEvent(event);
    return response(200, { authenticated: Boolean(session), user: session?.username || null });
  }
  if (event.httpMethod === 'DELETE') {
    return response(200, { success: true }, { 'Set-Cookie': 'blackout_crm=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0' });
  }
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed.' });
  let request;
  try {
    request = JSON.parse(event.body || '{}');
  } catch {
    return response(400, { error: 'Invalid request body.' });
  }
  const { username, password } = credentials();
  if (!username || !password) {
    console.error('Missing CRM credentials configuration.');
    return response(500, { error: 'CRM credentials are not configured.' });
  }
  if (!username || !password || request.username !== username || request.password !== password) {
    return response(401, { error: 'Credenciales no autorizadas.' });
  }
  const payload = Buffer.from(JSON.stringify({ username, expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000 })).toString('base64url');
  return response(200, { authenticated: true, user: username }, {
    'Set-Cookie': `blackout_crm=${payload}.${sign(payload)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_SECONDS}`
  });
};