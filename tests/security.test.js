const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const files = fs.readdirSync('Server').filter(f => f.endsWith('.js'));
const source = files.map(f => fs.readFileSync('Server/' + f, 'utf8')).join('\n');
const routes = [...fs.readFileSync('Server/Api.js', 'utf8').matchAll(/(\w+): \[(\w+), (null|'[^']+')\]/g)]
  .map(([, name, handler, capability]) => ({name, handler, capability: capability === 'null' ? null : capability.slice(1,-1)}));
function env() {
  const cache = new Map();
  const props = new Map([['GOOGLE_CLIENT_ID', 'client'], ['AUTH_VERIFIER_URL', 'https://verifier.example/verify'], ['AUTH_VERIFIER_SECRET', 'secret']]);
  let roles = [];
  const context = vm.createContext({console, Date, Set, Map,
    CacheService: {getScriptCache: () => ({get: k => cache.get(k), put: (k,v) => cache.set(k,v), remove: k => cache.delete(k)})},
    PropertiesService: {getScriptProperties: () => ({getProperty: k => props.get(k)})},
    Utilities: {getUuid: crypto.randomUUID, DigestAlgorithm: {SHA_256: 'sha256'},
      computeDigest: (_, value) => crypto.createHash('sha256').update(value).digest(),
      base64EncodeWebSafe: bytes => Buffer.from(bytes).toString('base64url')},
    LockService: {getScriptLock: () => ({waitLock(){}, releaseLock(){}})},
    UrlFetchApp: {fetch: () => {throw new Error('Unexpected network');}}
  });
  vm.runInContext(source, context);
  context.getAdminSpreadsheet_ = () => ({getSheetByName: () => ({})});
  context.rowsToObjects_ = () => roles;
  function session(role, emailAuthoritative = true) {
    roles = role ? [{'Member Name': 'Test', Email: 'first@gmail.com; user@gmail.com', [role]: 'TRUE'}] : [];
    const token = crypto.randomBytes(32).toString('base64url');
    cache.set(context.sessionKey_(token), JSON.stringify({expiresAt: Date.now() + 60000,
      identity: {email: 'user@gmail.com', googleSubject: '123', emailAuthoritative}}));
    return token;
  }
  return {context, cache, props, session, setRoles: value => {roles = value;}};
}
test('only intended entry points are remotely callable; no Session identity or direct frontend data RPC', () => {
  const exposed = [...source.matchAll(/^function (\w+)\(/gm)].map(m => m[1]).filter(n => !n.endsWith('_')).sort();
  assert.deepEqual(exposed, ['api', 'authenticateGoogleUser', 'doGet', 'getAuthConfig', 'logoutSession']);
  assert.doesNotMatch(source, /Session\.get(?:Active|Effective)User/);
  assert.ok(routes.length >= 30);
});
test('every protected route rejects anonymous, forged identities, readers and wrong roles before invoking its handler', () => {
  const {context: c, session} = env();
  for (const route of routes.filter(r => r.capability)) {
    c[route.handler] = () => {throw new Error('HANDLER_REACHED');};
    for (const token of ['', {email: 'admin@gmail.com', isAdmin: true}, 'forged', session(null)]) {
      assert.throws(() => c.api(route.name, [], token), /AUTH_REQUIRED|AUTH_EXPIRED|ACCESS_DENIED/, route.name);
    }
    for (const role of ['Administrator', 'Trainer', 'Recruiter', 'Mission Creator']) {
      const token = session(role);
      const permissions = c.getSessionUser_(token).permissions;
      const allowed = route.capability.split('.').reduce((v,k) => v[k], permissions);
      assert.throws(() => c.api(route.name, [], token), allowed ? /HANDLER_REACHED/ : /ACCESS_DENIED/, `${role}: ${route.name}`);
    }
  }
});
test('private mutation implementations also fail closed without dispatcher context', () => {
  const {context: c} = env();
  for (const r of routes.filter(r => r.capability)) {
    if (r.name === 'getNamesByRole') continue;
    assert.throws(() => c[r.handler](), /AUTH_REQUIRED/, r.name);
  }
});
test('role revocation, multiple roles, aliases, untrusted third-party emails, logout and expiry', () => {
  const {context: c, session, cache, setRoles} = env();
  const token = session('Administrator');
  assert.equal(c.getSessionUser_(token).permissions.isTrainer, true);
  setRoles([{Email:'USER@gmail.com', Trainer:true}, {Email:'user@gmail.com', Recruiter:true}]);
  assert.equal(c.getSessionUser_(token).permissions.isAdmin, false);
  assert.equal(c.getSessionUser_(token).permissions.isTrainer, true);
  assert.equal(c.getSessionUser_(token).permissions.isRecruiter, true);
  assert.equal(c.getSessionUser_(session('Administrator', false)).permissions.isAdmin, false);
  c.logoutSession(token);
  assert.throws(() => c.getSessionUser_(token), /AUTH_EXPIRED/);
  const expired = session(null);
  cache.set(c.sessionKey_(expired), JSON.stringify({expiresAt: 0}));
  assert.throws(() => c.getSessionUser_(expired), /AUTH_EXPIRED/);
  for (const operation of ['constructor', '__proto__', 'getMembers_', 'include', 'logoutSession']) {
    assert.throws(() => c.api(operation, [], ''), /Invalid operation/);
  }
});
test('public members exclude notes and banned rows while retaining other sheet fields', () => {
  const {context: c, session} = env();
  const members = [{'Member Id':1, 'Member Name':'Visible', Role:'Member', Recruiter:'Secret', 'Notes / Observations':'PRIVATE', Extra:'SECRET'},
    {'Member Id':2, 'Member Name':'Hidden', Role:'Banned', Extra:'SECRET'}];
  c.getMembers_ = () => members;
  c.getPMCRecords_ = () => members.map(m => ({...m, Phase:'Phase 1', _row: 12}));
  c.getTrainingByArea_ = () => [{memberName:'Hidden', area:'Medical'}, {memberName:'Visible', area:'Medical', status:'Current', extra:'SECRET', row:12}];
  c.getTrainingForMember_ = () => [{sheet:'Medical', status:'Current', record: {notes:'SECRET'}}];
  for (const token of ['', session(null), session('Trainer')]) {
    const data = JSON.parse(JSON.stringify(c.api('getMembers', [], token)));
    assert.deepEqual(data, [{'Member Id':1, 'Member Name':'Visible', Role:'Member', Recruiter:'Secret', Extra:'SECRET'}]);
    assert.doesNotMatch(JSON.stringify(data), /PRIVATE|Hidden|_row/);
    assert.doesNotMatch(JSON.stringify(c.api('getPMCRecords', [], token)), /Hidden|SECRET|PRIVATE|_row/);
    assert.doesNotMatch(JSON.stringify(c.api('getTrainingByArea', [], token)), /Hidden|SECRET|row/);
    assert.equal(c.api('getTrainingForMember', ['Hidden'], token).length, 0);
    assert.doesNotMatch(JSON.stringify(c.api('getTrainingForMember', ['Visible'], token)), /record|SECRET/);
  }
  assert.match(JSON.stringify(c.api('getMembers', [], session('Recruiter'))), /PRIVATE/);
});
test('login challenge is consumed once and verifier claims are checked before session creation', () => {
  const {context: c, cache} = env();
  const nonce = c.getAuthConfig().nonce;
  const verified = {iss:'https://accounts.google.com', aud:'client', exp:Math.floor(Date.now()/1000)+3600,
    email:'user@gmail.com', email_verified:true, emailAuthoritative:true, sub:'123', nonce,
    sessionToken:crypto.randomBytes(32).toString('base64url')};
  c.UrlFetchApp.fetch = (url, opts) => {
    assert.equal(opts.followRedirects, false);
    assert.equal(url, 'https://verifier.example/verify');
    return {getResponseCode: () => 200, getContentText: () => JSON.stringify(verified)};
  };
  const result = c.authenticateGoogleUser('signed-token', nonce);
  assert.equal(c.getSessionUser_(result.sessionToken).authenticated, true);
  assert.ok(result.expiresAt <= Date.now() + 1800000);
  assert.throws(() => c.authenticateGoogleUser('signed-token', nonce), /expired/);
  for (const [key, value] of [['aud','evil'], ['iss','evil'], ['exp',0], ['email_verified',false], ['sub',''], ['nonce','wrong']]) {
    const next = c.getAuthConfig().nonce;
    const invalid = {...verified, nonce:next, [key]:value};
    c.UrlFetchApp.fetch = () => ({getResponseCode: () => 200, getContentText: () => JSON.stringify(invalid)});
    assert.throws(() => c.authenticateGoogleUser('token', next), /Invalid verified/);
  }
  assert.equal([...cache.keys()].filter(k => k.startsWith('session:')).length, 1);
});
