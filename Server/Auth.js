/** Public authentication endpoints. Secrets exist only in Script Properties. */
function authorizeOwnerServices_() {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty('AUTH_VERIFIER_URL');
  const secret = props.getProperty('AUTH_VERIFIER_SECRET');
  if (!url || !/^https:\/\//.test(url) || !secret) {
    throw new Error('Configure AUTH_VERIFIER_URL and AUTH_VERIFIER_SECRET first.');
  }
  // This intentionally invalid request proves the owner can reach the verifier
  // and forces Apps Script to request the external_request scope. A 401 is the
  // expected response because no Google credential is included.
  const response = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: {'X-ACAT-Verifier-Key': secret},
    payload: '{}',
    followRedirects: false,
    muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 401) {
    throw new Error('Unexpected verifier authorization-test response.');
  }

  const spreadsheetIds = [
    CONFIG.ADMIN_SPREADSHEET_ID,
    CONFIG.MEMBER_SPREADSHEET_ID,
    CONFIG.TRAINING_SPREADSHEET_ID,
    CONFIG.PMC_SPREADSHEET_ID
  ];
  spreadsheetIds.forEach(id => {
    // Opening and reading the name verifies access without modifying data.
    SpreadsheetApp.openById(id).getName();
  });

  return 'Owner external-request and spreadsheet authorization is configured.';
}

function getAuthConfig() {
  const props = PropertiesService.getScriptProperties();
  const clientId = props.getProperty('GOOGLE_CLIENT_ID') || '';
  const verifierUrl = props.getProperty('AUTH_VERIFIER_URL') || '';
  if (!clientId || !/^https:\/\/.+\/verify$/.test(verifierUrl) ||
      !props.getProperty('AUTH_VERIFIER_SECRET')) {
    return {clientId: '', nonce: '', signInUrl: ''};
  }
  // A one-use login challenge, not a bearer session credential.
  const nonce = Utilities.getUuid() + Utilities.getUuid();
  CacheService.getScriptCache().put('login:' + nonce, '1', 300);
  return {clientId, nonce, signInUrl: verifierUrl.replace(/\/verify$/, '/signin')};
}

function verifyGoogleCredential_(credential, nonce) {
  if (typeof credential !== 'string' || credential.length > 8192 ||
      typeof nonce !== 'string' || !/^[a-f0-9-]{72}$/.test(nonce)) {
    throw new Error('Invalid sign-in credential.');
  }
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty('AUTH_VERIFIER_URL');
  const secret = props.getProperty('AUTH_VERIFIER_SECRET');
  const clientId = props.getProperty('GOOGLE_CLIENT_ID');
  if (!url || !/^https:\/\//.test(url) || !secret || !clientId) {
    throw new Error('Sign-in has not been configured.');
  }
  const response = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json',
    headers: {'X-ACAT-Verifier-Key': secret},
    payload: JSON.stringify({credential, nonce}),
    followRedirects: false, muteHttpExceptions: true
  });
  if (response.getResponseCode() !== 200) throw new Error('Google sign-in verification failed.');
  const data = JSON.parse(response.getContentText());
  if (!['accounts.google.com', 'https://accounts.google.com'].includes(data.iss) ||
      data.aud !== clientId || data.nonce !== nonce || data.email_verified !== true ||
      !Number.isFinite(data.exp) || data.exp * 1000 <= Date.now() ||
      typeof data.sub !== 'string' || !data.sub ||
      typeof data.email !== 'string' || !data.email ||
      !/^[A-Za-z0-9_-]{43}$/.test(data.sessionToken)) {
    throw new Error('Invalid verified identity.');
  }
  return data;
}

function authenticateGoogleUser(credential, nonce) {
  const cache = CacheService.getScriptCache();
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    if (typeof nonce !== 'string' || nonce.length !== 72 || !cache.get('login:' + nonce)) {
      throw new Error('Sign-in expired. Please try again.');
    }
    cache.remove('login:' + nonce);
  } finally { lock.releaseLock(); }
  const verified = verifyGoogleCredential_(credential, nonce);
  const identity = {email: verified.email.trim().toLowerCase(), googleSubject: verified.sub, emailAuthoritative: verified.emailAuthoritative === true};
  const user = resolveUserPermissions_(identity);
  const expiresAt = Math.min(Date.now() + 30 * 60 * 1000, verified.exp * 1000);
  cache.put(sessionKey_(verified.sessionToken), JSON.stringify({identity, expiresAt}),
    Math.max(1, Math.floor((expiresAt - Date.now()) / 1000)));
  return {sessionToken: verified.sessionToken, expiresAt, user};
}

function sessionKey_(token) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    throw new Error('AUTH_EXPIRED: Please sign in again.');
  }
  return 'session:' + Utilities.base64EncodeWebSafe(
    Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, token));
}

function getSessionUser_(token) {
  if (token === null || token === undefined || token === '') return getAnonymousAccess_();
  const raw = CacheService.getScriptCache().get(sessionKey_(token));
  if (!raw) throw new Error('AUTH_EXPIRED: Please sign in again.');
  const session = JSON.parse(raw);
  if (session.expiresAt <= Date.now()) throw new Error('AUTH_EXPIRED: Please sign in again.');
  // Resolve roles on every request so removing a role takes effect immediately.
  return resolveUserPermissions_(session.identity);
}

function logoutSession(token) {
  if (token) CacheService.getScriptCache().remove(sessionKey_(token));
  return true;
}
