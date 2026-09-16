const {test} = require('node:test');
const assert = require('node:assert/strict');
const {generateKeyPairSync, sign} = require('node:crypto');
const {OAuth2Client} = require('google-auth-library');
const {verifyCredential} = require('./verify');
const pair = generateKeyPairSync('rsa', {modulusLength:2048});
const nonce = 'a'.repeat(72);
const claims = {iss:'https://accounts.google.com', aud:'client', azp:'client', sub:'123', email:'user@gmail.com',
  email_verified:true, nonce, iat:Math.floor(Date.now()/1000), exp:Math.floor(Date.now()/1000)+3600};
const encode = value => Buffer.from(JSON.stringify(value)).toString('base64url');
function token(payload, key = pair.privateKey) {
  const input = encode({alg:'RS256', kid:'test'}) + '.' + encode(payload);
  return input + '.' + sign('RSA-SHA256', Buffer.from(input), key).toString('base64url');
}
function client() {
  const client = new OAuth2Client('client');
  client.getFederatedSignonCertsAsync = async () => ({certs:{test:pair.publicKey.export({type:'spki',format:'pem'})}});
  return client;
}
test('real Google library verifies RSA signature; service returns a random opaque session', async () => {
  const first = await verifyCredential(client(), 'client', token(claims), nonce);
  const second = await verifyCredential(client(), 'client', token(claims), nonce);
  assert.equal(first.email, 'user@gmail.com');
  assert.equal(first.emailAuthoritative, true);
  assert.match(first.sessionToken, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(first.sessionToken, second.sessionToken);
});
test('rejects bad signatures, issuer, audience, expiry, email state and nonce', async () => {
  const attacker = generateKeyPairSync('rsa', {modulusLength:2048});
  await assert.rejects(verifyCredential(client(), 'client', token(claims, attacker.privateKey), nonce));
  for (const [key,value] of [['iss','evil'], ['aud','evil'], ['azp','evil'], ['exp',0], ['email_verified',false], ['nonce','evil'], ['sub','']]) {
    await assert.rejects(verifyCredential(client(), 'client', token({...claims,[key]:value}), nonce), key);
  }
});
test('third-party Google identity can sign in but cannot use email ACLs; Workspace can', async () => {
  const external = await verifyCredential(client(), 'client', token({...claims,email:'user@example.com'}), nonce);
  assert.equal(external.emailAuthoritative, false);
  const workspace = await verifyCredential(client(), 'client', token({...claims,email:'user@example.com',hd:'example.com'}), nonce);
  assert.equal(workspace.emailAuthoritative, true);
});
