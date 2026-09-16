const {randomBytes} = require('node:crypto');

async function verifyCredential(client, clientId, credential, nonce) {
  if (typeof credential !== 'string' || credential.length > 8192 ||
      typeof nonce !== 'string' || !/^[a-f0-9-]{72}$/.test(nonce)) throw new Error('Invalid request');
  // Google library verifies signature, issuer, audience and token lifetime.
  const ticket = await client.verifyIdToken({idToken: credential, audience: clientId});
  const claims = ticket.getPayload();
  if (!claims || !['accounts.google.com', 'https://accounts.google.com'].includes(claims.iss) ||
      claims.aud !== clientId || (claims.azp && claims.azp !== clientId) ||
      !Number.isFinite(claims.exp) || claims.exp * 1000 <= Date.now() ||
      claims.nonce !== nonce || claims.email_verified !== true ||
      typeof claims.email !== 'string' || !claims.email ||
      typeof claims.sub !== 'string' || !claims.sub) throw new Error('Invalid identity');
  // Google is not authoritative for reassigned third-party email addresses.
  // Require Gmail or a verified Workspace domain before matching email ACLs.
  const emailAuthoritative = claims.email.toLowerCase().endsWith('@gmail.com') || Boolean(claims.hd);
  return {iss: claims.iss, aud: claims.aud, exp: claims.exp, sub: claims.sub,
    email: claims.email, email_verified: true, emailAuthoritative, nonce: claims.nonce,
    sessionToken: randomBytes(32).toString('base64url')};
}
module.exports = {verifyCredential};
