const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {JSDOM} = require('jsdom');
function include(html) {
  return html.replace(/<\?!=\s*include_\(['"](.+?)['"]\);\s*\?>/g,
    (_,name) => include(fs.readFileSync('Frontend/'+name+'.html','utf8')));
}
async function browser(role = 'anonymous', setup) {
  const errors = [];
  const html = include(fs.readFileSync('Frontend/Index.html','utf8')).replace(/<script\b[^>]*src=[^>]*><\/script>/g, '');
  const dom = new JSDOM(html, {url:'http://localhost:5173/?mockRole='+role, runScripts:'dangerously',
    beforeParse(window) {
      window.HTMLDialogElement.prototype.showModal = function(){ this.open = true; };
      window.HTMLDialogElement.prototype.close = function(){ this.open = false; };
      window.structuredClone = structuredClone;
      window.addEventListener('error', event => errors.push(event.error));
      window.eval(fs.readFileSync('dev/google-script-run.js','utf8'));
      window.google.charts = {load(){}, setOnLoadCallback(){}};
      setup?.(window);
    }});
  await new Promise(resolve => setTimeout(resolve, 300));
  return {dom, window:dom.window, errors};
}
test('anonymous startup renders public data and no edit controls without Google library', async () => {
  const {dom, window:w, errors} = await browser();
  try {
    assert.deepEqual(errors, []);
    const hostile = `Name'); window.compromised = true; //`;
    const element = w.document.createElement('div');
    element.innerHTML = `<button onclick="window.safeName = ${w.escapeJsArgument(hostile)}">Test</button>`;
    element.firstChild.click();
    assert.equal(w.safeName, hostile);
    assert.equal(w.compromised, undefined);
    assert.equal(w.document.getElementById('appLoadingDialog').open, false);
    assert.match(w.document.getElementById('userDisplay').textContent, /Read-only/);
    for (const id of ['adminNavButton','addMemberButton','addPMCButton','editTrainingButton']) {
      assert.equal(w.document.getElementById(id).style.display, 'none');
    }
    assert.match(w.document.getElementById('membersTable').innerHTML, /Recruiter|onclick/);
    assert.doesNotMatch(JSON.stringify(w.eval('state.members')), /Notes \/ Observations/);
    assert.ok(w.eval('state.admins.length') > 0);
    assert.match(w.document.getElementById('membersTable').textContent, /Member/);
  } finally {dom.window.close();}
});
test('each role retains its controls; sign-out clears privileged state and stale responses', async () => {
  for (const role of ['admin','trainer','recruiter','missionCreator','reader']) {
    const {dom, window:w, errors} = await browser(role);
    try {
      assert.deepEqual(errors, []);
      assert.equal(w.document.getElementById('adminNavButton').style.display, role === 'admin' ? '' : 'none');
      assert.equal(w.document.getElementById('editTrainingButton').style.display, ['admin','trainer'].includes(role) ? '' : 'none');
      w.eval('sessionToken = "local-mock-token"');
      w.eval('acatRun().withSuccessHandler(() => { window.staleCallback = true; }).getMembers()');
      w.signOutACAT();
      assert.equal(w.document.getElementById('adminNavButton').style.display, 'none');
      assert.equal(w.eval('state.members.length'), 0);
      await new Promise(resolve => setTimeout(resolve, 300));
      assert.equal(w.staleCallback, undefined);
      assert.equal(w.eval('state.permissions.isAdmin'), false);
      assert.equal(w.document.getElementById('signOutButton').hidden, true);
      assert.deepEqual(errors, []);
    } finally {dom.window.close();}
  }
});

test('hosted GIS iframe uses nonce, validates its message, sends only the ACAT session, and expires', async () => {
  let receivedCredential, receivedNonce, receivedSession;
  const {dom, window:w, errors} = await browser('reader', window => {
    const native = window.google.script.run;
    const runner = (success, failure) => new Proxy({}, {get(_, method) {
      if (method === 'withSuccessHandler') return fn => runner(fn, failure);
      if (method === 'withFailureHandler') return fn => runner(success, fn);
      if (method === 'getAuthConfig') return () => setTimeout(() => success({
        clientId:'test-client', nonce:'a'.repeat(72),
        signInUrl:'https://auth.example/signin'
      }), 0);
      if (method === 'authenticateGoogleUser') return (credential, nonce) => {
        receivedCredential = credential; receivedNonce = nonce;
        setTimeout(() => success({sessionToken:'opaque-acat-session', expiresAt:Date.now()+1500}), 0);
      };
      return (...args) => {
        if (method === 'api') receivedSession = args[2];
        native.withSuccessHandler(success).withFailureHandler(failure)[method](...args);
      };
    }});
    window.google.script.run = runner();
  });
  try {
    const frame = w.document.querySelector('#googleSignIn iframe');
    assert.ok(frame);
    assert.match(frame.src, /^https:\/\/auth\.example\/signin\?nonce=a{72}&embed=1$/);
    assert.equal(frame.getAttribute('allow'), 'identity-credentials-get');
    w.dispatchEvent(new w.MessageEvent('message', {
      origin:'https://evil.example', source:frame.contentWindow,
      data:{type:'acat-google-credential', credential:'EVIL', nonce:'a'.repeat(72)}
    }));
    assert.equal(receivedCredential, undefined);
    w.dispatchEvent(new w.MessageEvent('message', {
      origin:'https://auth.example', source:frame.contentWindow,
      data:{type:'acat-google-credential', credential:'GOOGLE_ID_CREDENTIAL', nonce:'a'.repeat(72)}
    }));
    await new Promise(resolve => setTimeout(resolve, 250));
    assert.equal(receivedCredential, 'GOOGLE_ID_CREDENTIAL');
    assert.equal(receivedNonce, 'a'.repeat(72));
    assert.equal(receivedSession, 'opaque-acat-session');
    assert.doesNotMatch(w.sessionStorage.getItem('acat.session'), /GOOGLE_ID/);
    w.eval('authExpiresAt = Date.now() - 1; renderAuthState()');
    await new Promise(resolve => setTimeout(resolve, 250));
    assert.equal(w.sessionStorage.getItem('acat.session'), null);
    assert.equal(w.eval('sessionToken'), '');
    assert.equal(w.document.getElementById('signOutButton').hidden, true);
    assert.deepEqual(errors, []);
  } finally {w.close();}
});
