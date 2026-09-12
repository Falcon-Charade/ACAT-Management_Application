ACAT MANAGEMENT APPLICATION

The ACAT Management Application is a Google Apps Script web app for managing
members, training records, progression, roles, and PMC records. The browser
interface is in Index.html and the server-side Apps Script functions are in
Code.js.


HOW IT WORKS

1. A user opens the deployed web-app URL.

2. Apps Script runs doGet(), which serves Index.html and sets the application
   title.

3. The page calls getBootstrapData() through google.script.run. This returns:
   - The current user's email and display name.
   - Permission flags for administrator, trainer, recruiter, and mission
     creator access.
   - Member and PMC records.
   - Training areas and role-based name lists used by the interface.

4. The browser renders the dashboard and available controls from that payload.

5. User actions call server-side functions through google.script.run. These
   functions read or update Google Sheets and return the refreshed data or an
   error. Permission checks are performed on the server before protected
   operations run.


DATA SOURCES

The spreadsheet IDs and sheet names are configured near the top of Code.js.
The application currently uses separate spreadsheets for:

- Administration and roles: the Roles sheet controls identity and permissions.
- Members: the Member Tracking sheet stores member records and progression.
- Training: each configured training area has its own sheet. TrainingHistory
  stores training changes and archive information.
- PMC: the MemberOverview sheet stores PMC records.

The first row of each sheet is treated as the header row. Code.js maps records
from those headers, so sheet column order can change as long as the expected
header names remain available.


ROLES AND ACCESS

- Administrators can manage roles and member records and inherit all other
  permissions.
- Trainers can create and update training records.
- Recruiters can manage recruitment-related member information.
- Mission creators can manage PMC-related records.
- All users can view the application when they have access to the deployed
  web app.

The Roles sheet is the primary source for user roles. The optional email and
Google Group allow-lists in CONFIG can also be used for role membership and
should be reviewed before deploying to a new environment.


LOCAL DEVELOPMENT

The local server provides a browser-only mock of google.script.run. It uses
sample in-memory records and does not connect to Google Sheets or write
production data.

1. Open a terminal in this project folder.

2. Install dependencies:
     npm install

3. Start the local server:
     npm run dev

4. Browse to:
     http://localhost:5173

The server injects dev/google-script-run.js only for the localhost response.
Production files are not modified. Changes made locally are lost when the
server restarts unless the mock is edited.

To add a local implementation for another Apps Script function, add a handler
to the handlers object in dev/google-script-run.js. If no handler exists, the
browser console reports:
     [LOCAL MOCK] No mock has been created for Apps Script function "...".


DEPLOYMENT

1. Create or open the Google Apps Script project for this application.

2. Add Code.js, Index.html, and appsscript.json to the project. Do not deploy
   the files in dev/ as Apps Script server code.

3. Update CONFIG in Code.js with the correct spreadsheet IDs, sheet names,
   email allow-lists, and Google Group names.

4. Confirm that the Admin Directory advanced service is enabled if group
   membership checks are used.

5. Deploy the project as a web app. The included manifest is configured to run
   as the user accessing the app and allows anyone with the deployment URL to
   open it; review those settings against the organization's access policy.

6. Complete the authorization prompts and test with representative accounts
   for each role before sharing the deployment URL.


IMPORTANT FILES

- Code.js: Apps Script entry point, permissions, spreadsheet access, and data
  operations.
- Index.html: browser UI, rendering, dialogs, and calls to server functions.
- appsscript.json: Apps Script runtime, OAuth scopes, and web-app settings.
- dev/server.js: local Express server.
- dev/google-script-run.js: local google.script.run mock and sample data.
- package.json: local development command and Express dependency.
