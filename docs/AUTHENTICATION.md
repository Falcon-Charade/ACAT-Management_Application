# ACAT identity, access and deployment

## Status and setup

The repository is prepared for anonymous reads and optional Google Identity Services (GIS) sign-in. No deployment, Google Cloud resources, OAuth clients or live spreadsheet changes were made by this refactor. Sign-in stays unavailable until the verifier and Script Properties below are configured. The local tests do not establish that GIS works inside your actual Apps Script iframe; complete the live acceptance checks before publishing an updated deployment.

1. Use a standard Google Cloud project. Configure Google Auth Platform branding, support contact, audience and data access. Use an External audience if people outside your Workspace need to sign in. During Testing, add test users; use In production when ready for the intended audience.
2. Create an OAuth 2.0 **Web application** client. GIS needs only its public client ID, never a client secret. Identity-only scopes are `openid`, `email`, `profile`. Do not add Sheets, Drive, Gmail, Docs, Directory or other service scopes to visitor sign-in. The code uses `google.accounts.id`, not the OAuth access-token client.
3. Configure exact authorized JavaScript origins (scheme, hostname, optional port; no path). Google forbids Apps Script's `script.googleusercontent.com` sandbox domain as an OAuth JavaScript origin, so GIS runs in a small embedded frame served by the verifier's stable Cloud Run `/signin` page. Add the exact Cloud Run origin, such as `https://acat-auth-verifier-PROJECT_NUMBER.REGION.run.app`. Do not add `/signin`, `/verify`, the Apps Script `/exec` URL, or the `script.googleusercontent.com` origin. No redirect URI is used. For development, `http://localhost` and `http://localhost:5173` may also be registered if a local hosted sign-in page is used.
4. Set the Cloud Run `ACAT_APP_ORIGIN` environment variable to the exact Apps Script sandbox origin found in the deployed `/exec` wrapper's `sandboxHost`. The hosted sign-in frame sends the ID credential only to this exact origin. Its `frame-ancestors` policy permits that sandbox origin and the outer `https://script.google.com` wrapper; browsers require every ancestor to be listed. ACAT checks both the message origin and source frame. A new Apps Script deployment may have a different sandbox origin and therefore requires a Cloud Run configuration update. Validate GIS on the deployed `/exec` page in supported browsers. Public reads continue if GIS is unavailable; do not fall back to Apps Script visitor OAuth or tokeninfo.
5. Deploy `services/auth-verifier` to a managed HTTPS Node service, for example Cloud Run. Its Dockerfile uses Node 22 and the lockfile. Set `GOOGLE_CLIENT_ID` to the same Web client ID and `ACAT_APP_ORIGIN` to the Apps Script sandbox origin. Generate a 32-byte random secret with a secure generator, store it in your secret manager, and supply it as `AUTH_VERIFIER_SECRET`. The public `/signin` route hosts GIS; `/verify` requires `X-ACAT-Verifier-Key`. If allowing unauthenticated Cloud Run ingress, that does not bypass the verification secret. Do not log request bodies, ID credentials or the custom header. Keep TLS termination on the managed service. This service needs no ACAT spreadsheets or owner OAuth token.
6. In Apps Script **Project Settings > Script Properties**, set `GOOGLE_CLIENT_ID`, `AUTH_VERIFIER_URL` (the HTTPS `/verify` URL), and `AUTH_VERIFIER_SECRET`. Only the client ID and login nonce are sent to the browser. Do not store these secrets in Config.js, HTML, source control or browser storage. Script editors are trusted administrators with access to these properties.
7. Run `npm ci`, `npm ci --prefix services/auth-verifier`, `npm test`, and `npm run build`. `npm run push` builds and runs `clasp push`; `.clasp.json` points at `dist`. The verifier, tests and local mock stay outside dist. Build preserves filename collision handling (`DashboardServer.js`, etc.).
8. The checked-in manifest now specifies `USER_DEPLOYING` and `ANYONE_ANONYMOUS`. In Manage deployments, create/update the web-app deployment as **Me** and **Anyone (including anonymous)**. A clasp push alone does not update an existing versioned deployment. The deploying account must have access to the four configured spreadsheets and authorize the owner scopes. Workspace policy may prevent anonymous deployment; repository code cannot override that policy.
   After pushing the manifest, select and run `authorizeOwnerServices_` once in the Apps Script editor. Approve the owner-only external-service and spreadsheet permissions. The helper sends an intentionally empty verifier payload and expects HTTP 401, then opens each configured ACAT spreadsheet and reads only its name to verify owner access without modifying data. A successful run returns `Owner external-request and spreadsheet authorization is configured.`
9. Owner Apps Script scopes are `spreadsheets` and `script.external_request`. The former accesses ACAT resources; the latter calls the verifier. They are not visitor permissions. `userinfo.email` was removed because Session identity is no longer used. Existing AdminDirectory advanced-service configuration remains, but group checks are optional diagnostics and not role inputs. If intentionally enabling Directory queries, configure the appropriate read-only Directory scope and owner privileges separately; a failed query denies group membership. Never request Directory permissions from visitors.

Identity-only scopes do not require sensitive/restricted-scope verification. Google can still require branding/domain verification and account-selection/basic-profile approval; this is distinct from an Apps Script service-access consent screen. See [GIS setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid), [server verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token), and [OAuth production readiness](https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification).

## Architecture and security boundary

Startup renders safe controls, loads public bootstrap data independently of GIS, and restores a tab-scoped session when available. `Frontend/App.html` contains the shared authentication helpers and `acatRun()` transport, keeping the existing frontend modules. The transport calls `api(operation, args, token)`. Every data operation is explicitly listed in Server/Api.js. Former global endpoints and the include helper end in `_`, making them private to `google.script.run`. There is no dynamic global-function lookup. New endpoints require a route and explicit permission decision. Existing mutation implementations also retain their own capability guards.

Sign-in obtains a Google ID token with a five-minute, one-use server nonce. Apps Script consumes that nonce under a script lock, then sends the credential to the configured HTTPS verifier. Google's `google-auth-library` checks the signature against Google keys, issuer, audience and lifetime; the service also checks expiry without grace, nonce, authorized party and verified email. Apps Script checks the returned issuer/audience/expiry/nonce/email claims again. Google's tokeninfo endpoint is intended for debugging, so production does not use it or custom RSA/JWT crypto. Tests exercise the real Google library with generated RSA keys and mocked certificate retrieval.

The verifier returns a fresh token from Node `crypto.randomBytes(32)`. Apps Script stores only a SHA-256-derived cache key and verified identity/absolute expiry in Script Cache. Sessions expire after at most 30 minutes or the Google token expiry, whichever is earlier. Cache eviction logs the user out safely. No roles are accepted from clients or cached across requests: the Roles sheet is read for each authenticated request. No email or role payload can impersonate a caller. Only script time-zone uses of Session remain.

The browser stores the opaque session and expiry in sessionStorage, with memory-only fallback when storage is blocked. It never stores the Google ID token in localStorage. ACAT tokens are bearer credentials: a stolen token can be replayed until logout, expiry or eviction. Keep the app free of XSS; modified inline JavaScript string arguments now use JSON plus HTML escaping. Sign-out clears state and dialogs immediately, invalidates the server cache entry, disables GIS auto-selection, and suppresses stale request callbacks. It does not sign out of Google. If network invalidation fails, the UI reports that the server token remains valid until expiry. Requests already executing at logout may finish; writes still enforce permissions at request start. Sessions in other tabs are independent, except duplicated tabs may inherit sessionStorage and share a token.

Only Gmail and verified Google Workspace email identities qualify for email-based ACL matching. For Google accounts using non-Google third-party email, Google warns that `email_verified` does not prove continuing ownership. These users can authenticate but stay read-only. No unsafe email-only elevation is performed. Supporting elevated access for those accounts requires a separate verified account-linking procedure using the immutable Google subject; that flow is not included.

Roles continue to come from the Roles sheet, with case-insensitive role headers and semicolon-separated email aliases. Matching records are combined so multiple roles work. Administrators inherit other capabilities. Admin-only member creation and archive operations, Recruiter member editing/deletion, Trainer training edits, and Mission Creator PMC creation/edits are preserved. Role editing checks duplicate email aliases and protects the caller's administrator membership using verified identity. Optional Google Groups arrays are not automatically activated.

## Public-data decisions

No schema formally classified public columns. The following conservative projections use fields already presented in read views; unclassified extra columns are withheld rather than exposed automatically.

- Members: all configured sheet fields are available to read-only users except `Notes / Observations`; internal `_row` metadata is also omitted. Banned and archived records remain excluded server-side. Recruiters/Admins receive notes and retain member-management actions. Public users receive no edit, add or delete controls.
- PMC: active visible-member name, phase, script/asset permissions and consecutive good missions. Unknown/banned/archived members are excluded for public reads. Mission Creators/Admins retain their existing management data.
- Training: visible-member name, area, status and completion/expiry dates. Public area responses omit row indexes. Per-member results never include the nested raw sheet record, including for trainers. Unknown/banned members cannot be queried to bypass member filtering. Admins retain archived/history tools.
- Dashboard: visible member and PMC totals, aggregate training graph, and the configured administrator, recruiter, trainer and mission-creator name lists are available to read-only users. Graphs disclose aggregate counts, not TrainingHistory rows.
- Administration, Roles, FunctionHelper configuration and TrainingHistory/archives require Admin access. There is no public sheet/range accessor. Backend errors and quota failures do not grant access.

## Before/after audit

Previously getCurrentUser/getPermissions used Session.getActiveUser. doGet served Index, App.boot fetched a single bootstrap payload, and the account-switch dialog navigated to Google's AccountChooser. The manifest executed as USER_ACCESSING with ANYONE and Sheets/userinfo.email scopes. Most mutation functions had role checks, but role-name cache updates and Directory diagnostics lacked guards. Members/PMC returned raw rows and getTrainingForMember nested raw training rows. Banned members and notes were hidden in frontend code rather than removed before transmission.

Now public entry points are doGet, api, getAuthConfig, authenticateGoogleUser and logoutSession. Helpers and implementation functions are private. The route inventory below is authoritative for this revision; Server/Api.js is the source of truth for future changes.

| Operation | Required capability |
| --- | --- |
| getBootstrapData | Public, filtered where applicable |
| getCurrentUser | Public, filtered where applicable |
| getPermissions | Public, filtered where applicable |
| getMembers | Public, filtered where applicable |
| getPMCRecords | Public, filtered where applicable |
| getTrainingForMember | Public, filtered where applicable |
| getTrainingByArea | Public, filtered where applicable |
| getDashboardCounts | Public, filtered where applicable |
| getActiveTrainerCount | Public, filtered where applicable |
| getTrainingGraphData | Public, filtered where applicable |
| addMember | members.create |
| updateMember | members.edit |
| deleteMember | members.delete |
| addPMCRecord | pmc.edit |
| updatePMCRecord | pmc.edit |
| archivePMCRecord | pmc.archive |
| unarchivePMCRecord | pmc.archive |
| deletePMCRecord | pmc.archive |
| addPMCRecordIgnoringArchived | admin.access |
| upsertTrainingRecord | training.edit |
| getTrainingExpiryPreview | training.edit |
| archiveTrainingRecord | training.archive |
| unarchiveTrainingRecord | training.archive |
| getArchivedTrainingRecords | admin.access |
| deleteArchivedTrainingRecord | admin.access |
| searchTrainingHistory | admin.access |
| setTrainingHistoryArchived | admin.access |
| deleteTrainingHistoryRecord | admin.access |
| getTrainingConfig | admin.access |
| updateTrainingConfig | admin.access |
| getRoleRecords | admin.access |
| saveRoleRecords | admin.access |
| getNamesByRole | admin.access |
| updateRoleNamesConfig | admin.access |
| testGroupMembership | admin.access |

## Validation and live acceptance

`npm test` covers all protected route/role combinations, forged tokens/identity objects, private mutation guards, role revocation, aliases, multiple roles, challenge replay, invalid verifier claims, session logout/expiry, public field projections, and real library signature rejection. jsdom tests cover anonymous startup, role UI, sign-out and stale callbacks; external Google Charts is stubbed. They do not call live Google Sheets or the GIS service.

The mock defaults to anonymous. Use `?mockRole=admin`, `trainer`, `recruiter`, `missionCreator`, or `reader` on localhost for UI fixtures. These flags exist only in dev/google-script-run.js and never influence production authorization. The mock does not accept real ID tokens and is not a security emulator.

On the versioned deployed `/exec` URL, check in a private browser: anonymous page loads with no Google account or Apps Script OAuth prompt; network responses omit notes/banned members/raw rows; direct old mutation names are unavailable and api rejects unauthenticated writes. Test a reader and each role against real sheet writes in a safe test copy, including protected Trainer assignment, role self-removal, archive restoration, and deletion. Verify GIS popup/callback origin behavior in supported browsers, expiry, sign-out, role revocation, and a failed Directory query. Confirm only the deploying account authorizes ACAT spreadsheet access. Production deployment and these live checks remain operator tasks.
