const http = require('node:http');
const {timingSafeEqual} = require('node:crypto');
const {OAuth2Client} = require('google-auth-library');
const {verifyCredential} = require('./verify');
const clientId = process.env.GOOGLE_CLIENT_ID;
const secret = process.env.AUTH_VERIFIER_SECRET;
const appOrigin = process.env.ACAT_APP_ORIGIN;
if (!clientId || !secret || secret.length < 32 || !appOrigin) {
  throw new Error('Configure GOOGLE_CLIENT_ID, AUTH_VERIFIER_SECRET and ACAT_APP_ORIGIN');
}
const parsedAppOrigin = new URL(appOrigin);
if (parsedAppOrigin.protocol !== 'https:' ||
    !parsedAppOrigin.hostname.endsWith('-script.googleusercontent.com') ||
    parsedAppOrigin.origin !== appOrigin) {
  throw new Error('ACAT_APP_ORIGIN must be an exact Apps Script sandbox origin');
}
const client = new OAuth2Client(clientId);

function signInPage(nonce, embedded) {
  const config = JSON.stringify({clientId, nonce, appOrigin, embedded});
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Sign in to ACAT</title>
  <script src="https://accounts.google.com/gsi/client" async></script>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center;
      font: 16px system-ui, sans-serif; color: #1f2937; background: #f3f4f6; }
    main { width: min(360px, calc(100% - 32px)); padding: 28px; text-align: center;
      background: white; border: 1px solid #e5e7eb; border-radius: 12px; }
    h1 { margin: 0 0 10px; font-size: 22px; }
    p { margin: 0 0 22px; color: #4b5563; }
    #googleButton > div { margin: auto; }
    body.embedded { min-height: 44px; background: transparent; }
    body.embedded main { width: auto; padding: 0; border: 0; background: transparent; }
    body.embedded h1, body.embedded p { display: none; }
  </style>
</head>
<body class="${embedded ? 'embedded' : ''}">
  <main>
    <h1>ACAT Management Application</h1>
    <p>Sign in with Google to check your ACAT permissions.</p>
    <div id="googleButton">Loading Google sign-in…</div>
  </main>
  <script>
    const config = ${config};
    const start = () => {
      const destination = window.opener ||
        (config.embedded && window.parent !== window ? window.parent : null);
      if (!destination) {
        document.getElementById('googleButton').textContent = 'Open sign-in from the ACAT application.';
        return;
      }
      google.accounts.id.initialize({
        client_id: config.clientId,
        nonce: config.nonce,
        auto_select: false,
        ux_mode: 'popup',
        use_fedcm_for_button: false,
        callback: response => {
          destination.postMessage({
            type: 'acat-google-credential',
            credential: response.credential,
            nonce: config.nonce
          }, config.appOrigin);
          if (window.opener) window.close();
        }
      });
      const target = document.getElementById('googleButton');
      target.textContent = '';
      google.accounts.id.renderButton(target, {theme: 'outline', size: 'large'});
    };
    if (window.google?.accounts?.id) start();
    else window.addEventListener('load', start, {once: true});
  </script>
</body>
</html>`;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const requestUrl = new URL(req.url, 'https://localhost');
  if (req.method === 'GET' && requestUrl.pathname === '/signin') {
    const nonce = requestUrl.searchParams.get('nonce') || '';
    const embedded = requestUrl.searchParams.get('embed') === '1';
    if (!/^[a-f0-9-]{72}$/.test(nonce)) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.writeHead(400).end('Invalid or expired sign-in request.');
      return;
    }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
    res.setHeader('Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/client; " +
      "frame-src https://accounts.google.com/gsi/; connect-src https://accounts.google.com/gsi/; " +
      "style-src 'self' 'unsafe-inline' https://accounts.google.com/gsi/style; " +
      `frame-ancestors ${appOrigin} https://script.google.com`);
    res.end(signInPage(nonce, embedded));
    return;
  }
  res.setHeader('Content-Type', 'application/json');
  const supplied = Buffer.from(String(req.headers['x-acat-verifier-key'] || ''));
  const expected = Buffer.from(secret);
  if (req.method !== 'POST' || requestUrl.pathname !== '/verify' ||
      supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    res.writeHead(403).end('{"error":"Forbidden"}');
    return;
  }
  try {
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (Buffer.byteLength(body) > 16384) throw new Error('Request too large');
    }
    const {credential, nonce} = JSON.parse(body);
    const result = await verifyCredential(client, clientId, credential, nonce);
    res.end(JSON.stringify(result));
  } catch (_) {
    // Never log tokens, request bodies, API keys or verification exceptions.
    res.writeHead(401).end('{"error":"Identity verification failed"}');
  }
});
server.requestTimeout = 15000;
server.listen(Number(process.env.PORT || 8080), '0.0.0.0');
