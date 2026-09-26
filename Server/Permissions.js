/** Identity is established only by api() after server-side session validation. */
let requestUser_ = null;

function getCurrentUser_() {
  return requestUser_ || getAnonymousAccess_();
}

function getPermissions_() {
  return getCurrentUser_().permissions;
}

function getAnonymousAccess_() {
  return resolveUserPermissions_(null);
}

function resolveUserPermissions_(identity) {
  let records = [];
  if (identity && identity.emailAuthoritative !== false) {
    const sheet = getAdminSpreadsheet_().getSheetByName(CONFIG.SHEETS.ROLES);
    if (sheet) records = rowsToObjects_(sheet).filter(record =>
      parseEmailList_(record.Email ?? record.email).includes(identity.email.toLowerCase()));
  }
  const hasRole = role => records.some(record => {
    const key = Object.keys(record).find(key => key.trim().toLowerCase() === role.toLowerCase());
    return key !== undefined && isTrue_(record[key]);
  });
  const isAdmin = hasRole('Administrator');
  const isTrainer = isAdmin || hasRole('Trainer');
  const isRecruiter = isAdmin || hasRole('Recruiter');
  const isMissionCreator = isAdmin || hasRole('Mission Creator');
  const roles = ['Administrator', 'Trainer', 'Recruiter', 'Mission Creator'].filter(hasRole);
  return {
    authenticated: Boolean(identity),
    email: identity ? identity.email : null,
    googleSubject: identity ? identity.googleSubject : null,
    name: String(records[0]?.['Member Name'] || ''),
    roles,
    permissions: {
      isAdmin, isTrainer, isRecruiter, isMissionCreator, canView: true,
      readOnly: !(isAdmin || isTrainer || isRecruiter || isMissionCreator),
      members: {read: true, create: isAdmin, edit: isRecruiter, delete: isRecruiter, viewNotes: isRecruiter},
      training: {read: true, edit: isTrainer, archive: isAdmin},
      pmc: {read: true, edit: isMissionCreator, archive: isAdmin},
      admin: {access: isAdmin}
    }
  };
}

function requirePermission_(capability) {
  const user = getCurrentUser_();
  if (!user.authenticated) throw new Error('AUTH_REQUIRED: Sign in to continue.');
  if (!capability.split('.').reduce((value, key) => value && value[key], user.permissions)) {
    throw new Error('ACCESS_DENIED: Permission required.');
  }
}
function requireAdmin_() { requirePermission_('admin.access'); }
function requireTrainer_() { requirePermission_('training.edit'); }
function requireRecruiterOrAdmin_() { requirePermission_('members.edit'); }
function requireMissionCreatorOrAdmin_() { requirePermission_('pmc.edit'); }

function getNamesByRole_(role) {
  const sheet = getAdminSpreadsheet_().getSheetByName(
    CONFIG.SHEETS.ROLES
  );
  
  if (!sheet) {
    return [];
  }
  
  return rowsToObjects_(sheet)
    .filter(record =>
      String(record[role]).trim().toLowerCase() === 'true'
    )
    .map(record =>
      record['Member Name']
    );
}

function parseEmailList_(value) {
  return String(value || '')
    .split(';')
    .map(email =>
      email
        .trim()
        .toLowerCase()
    )
    .filter(Boolean);
}