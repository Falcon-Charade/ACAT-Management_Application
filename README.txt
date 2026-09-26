ACAT MANAGEMENT APPLICATION

Google Apps Script web app for Members, Training, PMC and administration.
Frontend/ holds modular HTML; Server/ holds private operations, identity,
permissions and the public API. Server/Config.js defines spreadsheet mappings.

AUTHENTICATION AND DEPLOYMENT

Read docs/AUTHENTICATION.md before deploying. The app is prepared to execute
as the deploying account and allow anonymous, filtered read-only access.
Optional Google Identity Services sign-in requires a Web client ID and the
separate services/auth-verifier HTTPS service. No visitor Sheets/Drive access
is requested. Sign-in stays disabled until Script Properties are configured.

LOCAL DEVELOPMENT

  npm ci
  npm ci --prefix services/auth-verifier
  npm test
  npm run dev

Open http://localhost:5173 for anonymous fixtures. Add ?mockRole=admin,
trainer, recruiter, missionCreator or reader to exercise role-specific UI.
These are local fixtures only; the mock does not authenticate Google users.

BUILD

  npm run build

This flattens Frontend/ and Server/ into dist/ with unique Apps Script names
and copies appsscript.json. .clasp.json uses dist as its root.

  npm run push

This builds and pushes source. Update the versioned web-app deployment
separately. Never upload dev/, tests/, node_modules/ or services/ to Apps Script.
The verifier has its own package lockfile and Dockerfile; see the setup guide.
