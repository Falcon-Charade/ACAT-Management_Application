/**
 * @file Permissions.js
 * @description Resolves user identities and enforces role-based access for the
 * ACAT Management Application.
 *
 * Responsibilities:
 * - Identifies the active Google Apps Script user.
 * - Reads user names and roles from the configured Roles sheet.
 * - Provides permission flags for administrators, trainers, recruiters, and
 *   mission creators.
 * - Enforces access requirements by throwing errors for unauthorized users.
 * - Retrieves member names by role and normalizes semicolon-separated emails.
 *
 * Important:
 * - Administrators inherit trainer, recruiter, and mission creator permissions.
 * - All users currently receive view access through the `canView` permission.
 * - Role values are considered enabled when set to Boolean `true` or the
 *   case-insensitive string `"true"`.
 * - Email comparisons are case-insensitive.
 * - Multiple emails in a role record must be separated with semicolons.
 *
 * Dependencies:
 * - Google Apps Script `Session` service.
 * - `CONFIG.SHEETS.ROLES` from Config.js.
 * - `getAdminSpreadsheet_()` for access to the administrative spreadsheet.
 * - `rowsToObjects_()` for converting role-sheet rows into records.
 */

function getCurrentUser() {
  const email = String(
    Session.getActiveUser().getEmail() || ''
  ).trim();

  if (!email) {
    return {
      email: '',
      name: ''
    };
  }

  const sheet = getAdminSpreadsheet_().getSheetByName(
    CONFIG.SHEETS.ROLES
  );

  if (!sheet) {
    return {
      email,
      name: ''
    };
  }

  const normalizedEmail = email.toLowerCase();

  const roleRecord =
    rowsToObjects_(sheet).find(record => {
  
      const emails =
        parseEmailList_(
          record.Email ??
          record.email ??
          ''
        );
  
      return emails.includes(
        normalizedEmail
      );
    });

  return {
    email,
    name: String(
      roleRecord?.['Member Name'] || ''
    ).trim()
  };
}

function getPermissions() {
  const email = String(
    Session.getActiveUser().getEmail() || ''
  )
    .trim()
    .toLowerCase();

  const sheet = getAdminSpreadsheet_().getSheetByName(
    CONFIG.SHEETS.ROLES
  );

  if (!email || !sheet) {
    return {
      isAdmin: false,
      isTrainer: false,
      isRecruiter: false,
      isMissionCreator: false,
      canView: true
    };
  }

  const roleRecord =
    rowsToObjects_(sheet).find(record => {
  
      const emails =
        parseEmailList_(
          record.Email ??
          record.email ??
          ''
        );
  
      return emails.includes(email);
    });

  const hasRole = role => {
    if (!roleRecord) {
      return false;
    }

    // Allows either "Administrator" or "administrator".
    const roleKey = Object.keys(roleRecord).find(
      key =>
        key.trim().toLowerCase() ===
        role.trim().toLowerCase()
    );

    if (!roleKey) {
      return false;
    }

    return (
      roleRecord[roleKey] === true ||
      String(roleRecord[roleKey])
        .trim()
        .toLowerCase() === 'true'
    );
  };

  const isAdmin =
    hasRole('Administrator');

  // Preserve the existing rule that administrators
  // inherit the other permissions.
  const isTrainer =
    isAdmin || hasRole('Trainer');

  const isRecruiter =
    isAdmin || hasRole('Recruiter');

  const isMissionCreator =
    isAdmin || hasRole('Mission Creator');

  return {
    isAdmin,
    isTrainer,
    isRecruiter,
    isMissionCreator,
    canView: true
  };
}

function requireAdmin_() {
  if (!getPermissions().isAdmin) {
    throw new Error('Administrator access required.');
  }
}

function requireTrainer_() {
  if (!getPermissions().isTrainer) {
    throw new Error('Trainer access required.');
  }
}

function requireRecruiterOrAdmin_() {
  const permissions = getPermissions();

  if (
    !permissions.isAdmin &&
    !permissions.isRecruiter
  ) {
    throw new Error(
      'Administrator or Recruiter access required.'
    );
  }
}

function requireMissionCreatorOrAdmin_() {
  const permissions = getPermissions();

  if (
    !permissions.isAdmin &&
    !permissions.isMissionCreator
  ) {
    throw new Error(
      'Administrator or Mission Creator access required.'
    );
  }
}

function getNamesByRole(role) {
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