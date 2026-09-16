/**
 * @file Config.js
 * @description Central configuration for the ACAT Management Application.
 *
 * Responsibilities:
 * - Defines the application name and Google Spreadsheet IDs.
 * - Maps the sheet and range names used by the application.
 * - Lists supported training areas and the training-history sheet.
 * - Defines optional Google Group addresses for group-membership utilities.
 *
 * Important:
 * - Keep spreadsheet, sheet, and range names synchronized with Google Sheets.
 * - Current application permissions are resolved from the configured Roles
 *   sheet, not directly from these Google Group arrays.
 * - Group arrays only affect code that explicitly calls the group-membership
 *   utilities.
 * - Update dependent code if configuration keys are renamed or removed.
 * - Do not add passwords, API keys, access tokens, or other secrets here.
 *
 * Dependencies:
 * - Google Sheets referenced by the configured spreadsheet IDs.
 * - Google Groups when the optional group-membership utilities are used.
 */

const CONFIG = {
  APP_NAME: 'ACAT Management Application',

  ADMIN_SPREADSHEET_ID: '1gx09NAhsu-BlkpiCsFulpLcT4YZ7vJI9BYy0L1-5jKg',
  MEMBER_SPREADSHEET_ID: '1Q7W23Cru5LyRmWiPBC-sTgTERI6qr8LhLbpBU2D3Wm0',
  TRAINING_SPREADSHEET_ID: '1AFRtA26gJtdepfDbpwt4pVsQSc5JGGfWceVGNBDZNZ0',
  PMC_SPREADSHEET_ID: '1sMyFKy_6EySm9fOKsmb37Z98EhmMNfCLNcXjDBAPCGM',

  SHEETS: {
    MEMBERS: 'Member Tracking',
    PMCS: 'MemberOverview',
    ROLES: 'Roles'
  },

  // Training Expiry Dates
  TRAINING_CONFIG: {
    SHEET: 'FunctionHelper',
    RANGE: 'L1:N10'
  },

  // Training tabs can be expanded/renamed here.
  TRAINING_SHEETS: [
    'Medical',
    'Support',
    'Crewman',
    'Leadership',
    'Rotary',
    'Fixed Wing',
    'UAVs and UGVs',
    'Forward Recon/Sniper',
    'Advanced Leadership/Combat Controller'
  ],

  // Training history tab
  TRAINING_HISTORY_SHEET: 'TrainingHistory',

  // Optional server-side group diagnostics only. Roles sheet controls access.

  ADMIN_GROUPS: [
    'acat-admins@googlegroups.com'
  ],

  TRAINER_GROUPS: [
    'acat-trainers@googlegroups.com'
  ],

  RECRUITER_GROUPS: [
    'acat-recruiters@googlegroups.com'
  ],

  MISSIONCREATOR_GROUPS: [
    'acat-mission-creators@googlegroups.com'
  ],
};