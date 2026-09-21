/**
 * @file Code.js
 * @description Provides the main Google Apps Script web-app entry point,
 * bootstrap data, training configuration, administration, reporting, and
 * template-inclusion functions for the ACAT Management Application.
 *
 * Responsibilities:
 * - Serves the evaluated Index template as the web application.
 * - Builds the initial application data returned to the frontend.
 * - Reads, validates, and updates training expiry and review rules.
 * - Calculates training expiry dates and competency statuses.
 * - Retrieves and permanently deletes archived training records.
 * - Creates new PMC records when archived records already exist.
 * - Retrieves, validates, and saves application role assignments.
 * - Produces historical valid-competency data for training charts.
 * - Provides Google Group membership diagnostics.
 * - Refreshes cached role-name configuration.
 * - Includes frontend HTML partials in the main template.
 *
 * Important:
 * - Administrative configuration, archive, and role-management operations
 *   require administrator access.
 * - Training expiry previews require trainer access.
 * - Archived training records are verified server-side before deletion.
 * - Role email addresses must be present and unique.
 * - Administrators cannot remove their own administrator access.
 * - Training graph data excludes archived history and avoids duplicate
 *   member-and-area counts on the same date.
 * - Default frame protection is retained; arbitrary embedding is not enabled.
 *
 * Dependencies:
 * - Configuration from Config.js.
 * - Permission checks from Permissions.js.
 * - Member, PMC, training, dashboard, and spreadsheet utility functions.
 * - Google Apps Script HtmlService, ScriptApp, Spreadsheet, Session, Utilities,
 *   Properties, Lock, and Logger services.
 * - Advanced Admin SDK Directory service for Google Group checks.
 */

function doGet() {
  return HtmlService
    .createTemplateFromFile('Index')
    .evaluate()
    .setTitle(CONFIG.APP_NAME);
}

function getBootstrapData_() {
  return {
    appName: CONFIG.APP_NAME,
    user: getCurrentUser_(),
    permissions: getPermissions_(),
    members: getMembers_(),
    pmcRecords: getPMCRecords_(),
    trainingSheets: CONFIG.TRAINING_SHEETS,
    trainerCount: getActiveTrainerCount_(),
    missionCreatorCount: getNamesByRole_('Mission Creator').length,
    missionCreators: getNamesByRole_('Mission Creator'),//CONFIG.MISSIONCREATORSNAMES,
    recruiters: getNamesByRole_('Recruiter'),//CONFIG.RECRUITERNAMES,
    trainers: getNamesByRole_('Trainer'),
    admins: getNamesByRole_('Administrator'),

    webAppUrl:
      ScriptApp
        .getService()
        .getUrl()
  };
}

/* -------------------------------------------------------------------------- */
/* Spreadsheet helpers                                                        */
/* -------------------------------------------------------------------------- */



/* -------------------------------------------------------------------------- */
/* Members                                                                    */
/* -------------------------------------------------------------------------- */

/* -------------------------------------------------------------------------- */
/* Training                                                                   */
/* -------------------------------------------------------------------------- */





function getTrainingConfig_() {
  const ss = getTrainingSpreadsheet_();

  const sheet = getSheetOrThrow_(
    ss,
    CONFIG.TRAINING_CONFIG.SHEET
  );

  const values = sheet
    .getRange(CONFIG.TRAINING_CONFIG.RANGE)
    .getValues();

  if (values.length < 2) {
    return [];
  }

  // Skip header row
  return values
    .slice(1)
    .map(row => ({
      role: String(row[0]).trim(),
      expiryMonths: Number(row[1]),
      reviewDays: Number(row[2])
    }));
}

function getTrainingRule_(role) {
  const config = getTrainingConfig_();

  const rule = config.find(item =>
    item.role.toLowerCase() ===
    String(role).trim().toLowerCase()
  );

  if (!rule) {
    throw new Error(
      `No expiry configuration exists for "${role}".`
    );
  }

  if (
    !Number.isFinite(rule.expiryMonths) ||
    rule.expiryMonths < 0
  ) {
    throw new Error(
      `Invalid Expiry Limit for "${role}".`
    );
  }

  if (
    !Number.isFinite(rule.reviewDays) ||
    rule.reviewDays < 0
  ) {
    throw new Error(
      `Invalid Review Period for "${role}".`
    );
  }

  return rule;
}

function calculateTrainingExpiry_(lastDate, trainingArea) {
  const rule = getTrainingRule_(trainingArea);

  const expiry = new Date(lastDate);

  expiry.setMonth(
    expiry.getMonth() + rule.expiryMonths
  );

  return expiry;
}

function calculateTrainingStatus_(
  expiryDate,
  trainingArea
) {
  const rule = getTrainingRule_(trainingArea);

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  if (today > expiry) {
    return 'Expired';
  }

  const reviewDate = new Date(expiry);

  reviewDate.setDate(
    reviewDate.getDate() - rule.reviewDays
  );

  if (today >= reviewDate) {
    return 'Needs Review';
  }

  return 'Current';
}

function updateTrainingConfig_(
  role,
  expiryMonths,
  reviewDays
) {
  requireAdmin_();

  role = String(role || '').trim();
  expiryMonths = Number(expiryMonths);
  reviewDays = Number(reviewDays);

  if (!role) {
    throw new Error('Role is required.');
  }

  if (
    !Number.isInteger(expiryMonths) ||
    expiryMonths < 0
  ) {
    throw new Error(
      'Expiry months must be zero or greater.'
    );
  }

  if (
    !Number.isInteger(reviewDays) ||
    reviewDays < 0
  ) {
    throw new Error(
      'Review days must be zero or greater.'
    );
  }

  const ss = getTrainingSpreadsheet_();

  const sheet = getSheetOrThrow_(
    ss,
    CONFIG.TRAINING_CONFIG.SHEET
  );

  const range =
    sheet.getRange(
      CONFIG.TRAINING_CONFIG.RANGE
    );

  const values = range.getValues();

  for (
    let row = 1;
    row < values.length;
    row++
  ) {

    if (
      String(values[row][0])
        .trim()
        .toLowerCase() ===
      role.toLowerCase()
    ) {

      // L = role
      // M = expiry months
      // N = review days

      const sheetRow =
        range.getRow() + row;

      sheet
        .getRange(sheetRow, 13)
        .setValue(expiryMonths);

      sheet
        .getRange(sheetRow, 14)
        .setValue(reviewDays);

      return getTrainingConfig_();
    }
  }

  throw new Error(
    `Role "${role}" was not found.`
  );
}

function getArchivedTrainingRecords_() {
  requireAdmin_();

  const ss =
    getTrainingSpreadsheet_();

  const results = [];

  CONFIG.TRAINING_SHEETS.forEach(
    sheetName => {

      const sheet =
        ss.getSheetByName(sheetName);

      if (!sheet) {
        return;
      }

      const rows =
        rowsToObjects_(sheet);

      rows.forEach(row => {

        // We ONLY want archived records.
        if (!isArchived_(row['Archived'])) {
          return;
        }

        const memberName =
          String(
            row['Member Name'] ??
            row['Name'] ??
            ''
          ).trim();

        if (!memberName) {
          return;
        }

        const status =
          String(
            row['Competencies Status'] || ''
          ).trim();

        results.push({
          row: row._row,
          memberName,
          area: sheetName,
          status,

          trainingDate:
            row[
              'Training Completion Date'
            ] || '',

          expiryDate:
            row[
              'Competencies Expiry'
            ] || ''
        });
      });
    }
  );

  results.sort((a, b) => {

    const nameCompare =
      a.memberName.localeCompare(
        b.memberName
      );

    if (nameCompare !== 0) {
      return nameCompare;
    }

    return a.area.localeCompare(
      b.area
    );
  });

  return results;
}

function deleteArchivedTrainingRecord_(
  trainingArea,
  rowNumber
) {
  requireAdmin_();

  trainingArea =
    String(trainingArea || '').trim();

  rowNumber =
    Number(rowNumber);

  if (
    !CONFIG.TRAINING_SHEETS.includes(
      trainingArea
    )
  ) {
    throw new Error(
      'Invalid training area.'
    );
  }

  const ss =
    getTrainingSpreadsheet_();

  const sheet =
    getSheetOrThrow_(
      ss,
      trainingArea
    );

  if (
    !Number.isInteger(rowNumber) ||
    rowNumber < 2 ||
    rowNumber > sheet.getLastRow()
  ) {
    throw new Error(
      'Invalid training record.'
    );
  }

  const headers =
    getHeaderMap_(sheet);

  const archivedIndex =
    findHeader_(
      headers,
      ['Archived']
    );

  if (archivedIndex == null) {
    throw new Error(
      `"${trainingArea}" has no Archived column.`
    );
  }

  /*
   * Server-side safety check:
   * only archived records may be deleted
   * through this function.
   */
  const archivedValue =
    sheet
      .getRange(
        rowNumber,
        archivedIndex + 1
      )
      .getValue();

  if (!isArchived_(archivedValue)) {
    throw new Error(
      'Only archived training records can be deleted here.'
    );
  }

  sheet.deleteRow(
    rowNumber
  );

  return getArchivedTrainingRecords_();
}

/* -------------------------------------------------------------------------- */
/* PMC Tracking                                                               */
/* -------------------------------------------------------------------------- */

function addPMCRecordIgnoringArchived_(memberName) {
  requireAdmin_();

  memberName =
    String(memberName || '').trim();

  if (!memberName) {
    throw new Error(
      'Member name is required.'
    );
  }

  const member =
    getMembers_().find(item =>
      String(
        item['Member Name'] || ''
      )
        .trim()
        .toLowerCase() ===
      memberName.toLowerCase()
    );

  if (!member) {
    throw new Error(
      'Member could not be found.'
    );
  }

  if (
    String(member['Role'] || '')
      .trim()
      .toLowerCase() !== 'member'
  ) {
    throw new Error(
      'Only full members can be added as Potential Mission Creators.'
    );
  }

  const sheet =
    getSheetOrThrow_(
      getPMCSpreadsheet_(),
      CONFIG.SHEETS.PMCS
    );

  const headers =
    getHeaderMap_(sheet);

  const idIndex =
    findHeader_(headers, ['ID']);

  const memberNameIndex =
    findHeader_(
      headers,
      ['Member Name']
    );

  const phaseIndex =
    findHeader_(headers, ['Phase']);

  const scriptsIndex =
    findHeader_(
      headers,
      ['Scripts Allowed']
    );

  const assetsIndex =
    findHeader_(
      headers,
      ['Assets Allowed']
    );

  const goodMissionsIndex =
    findHeader_(
      headers,
      ['Consecutive Good Missions']
    );

  const archivedIndex =
    findHeader_(
      headers,
      ['Archived']
    );

  if (
    idIndex == null ||
    memberNameIndex == null
  ) {
    throw new Error(
      'PMC sheet is missing required columns.'
    );
  }

  /*
   * Make sure there is still no active
   * PMC record for this member.
   */
  const existingRecords =
    rowsToObjects_(sheet);

  const activeExists =
    existingRecords.some(record =>
      String(
        record['Member Name'] || ''
      )
        .trim()
        .toLowerCase() ===
        memberName.toLowerCase() &&
      !isArchived_(
        record['Archived']
      )
    );

  if (activeExists) {
    throw new Error(
      `${memberName} already has an active PMC record.`
    );
  }

  let nextId = 1;

  const lastRow =
    sheet.getLastRow();

  if (lastRow >= 2) {

    const idValues =
      sheet
        .getRange(
          2,
          idIndex + 1,
          lastRow - 1,
          1
        )
        .getValues()
        .flat();

    const numericIds =
      idValues
        .map(value =>
          Number(value)
        )
        .filter(value =>
          Number.isFinite(value)
        );

    if (numericIds.length) {
      nextId =
        Math.max(...numericIds) + 1;
    }
  }

  const row =
    new Array(
      sheet.getLastColumn()
    ).fill('');

  row[idIndex] =
    nextId;

  row[memberNameIndex] =
    memberName;

  if (phaseIndex != null) {
    row[phaseIndex] =
      'Phase 1';
  }

  if (scriptsIndex != null) {
    row[scriptsIndex] =
      'No';
  }

  if (assetsIndex != null) {
    row[assetsIndex] =
      'No';
  }

  if (goodMissionsIndex != null) {
    row[goodMissionsIndex] =
      0;
  }

  if (archivedIndex != null) {
    row[archivedIndex] =
      false;
  }

  sheet.appendRow(row);

  return getPMCRecords_();
}

/* -------------------------------------------------------------------------- */
/* Administration                                                             */
/* -------------------------------------------------------------------------- */
function getTrainingExpiryPreview_(trainingArea, lastDateString) {
  requireTrainer_();

  trainingArea = String(trainingArea || '').trim();
  lastDateString = String(lastDateString || '').trim();

  if (!trainingArea || !lastDateString) {
    return '';
  }

  const lastDate = parseDateInput_(lastDateString);

  const expiryDate = calculateTrainingExpiry_(
    lastDate,
    trainingArea
  );

  return Utilities.formatDate(
    expiryDate,
    Session.getScriptTimeZone(),
    'yyyy-MM-dd'
  );
}

function getRoleRecords_() {
  requireAdmin_();

  const sheet = getSheetOrThrow_(
    getAdminSpreadsheet_(),
    CONFIG.SHEETS.ROLES
  );

  return rowsToObjects_(sheet).map(record => ({
    row: record._row,
    memberName: record['Member Name'] || '',
    email: record.Email ?? record.email ?? '',
    administrator: isTrue_(record.Administrator),
    missionCreator: isTrue_(record['Mission Creator']),
    recruiter: isTrue_(record.Recruiter),
    trainer: isTrue_(record.Trainer)
  }));
}

function saveRoleRecords_(records) {
  requireAdmin_();

  if (!Array.isArray(records)) {
    throw new Error('Invalid role records.');
  }

  const sheet = getSheetOrThrow_(
    getAdminSpreadsheet_(),
    CONFIG.SHEETS.ROLES
  );

  const headers = getHeaderMap_(sheet);

  const columns = {
    memberName: findHeader_(headers, ['Member Name']),
    email: findHeader_(headers, ['Email']),
    administrator: findHeader_(headers, ['Administrator']),
    missionCreator: findHeader_(headers, ['Mission Creator']),
    recruiter: findHeader_(headers, ['Recruiter']),
    trainer: findHeader_(headers, ['Trainer'])
  };

  if (Object.values(columns).some(index => index == null)) {
    throw new Error(
      'Roles sheet must contain Member Name, Email, Administrator, ' +
      'Mission Creator, Recruiter and Trainer columns.'
    );
  }

  const normalizedRecords = records.map(record => {
    const memberName =
      String(record.memberName || '').trim();

    const email =
      String(record.email || '').trim().toLowerCase();

    if (!memberName) {
      throw new Error('Every role record requires a member name.');
    }

    if (!email) {
      throw new Error(`${memberName} requires an email address.`);
    }

    return {
      row: Number(record.row) || null,
      memberName,
      email,
      administrator: record.administrator === true,
      missionCreator: record.missionCreator === true,
      recruiter: record.recruiter === true,
      trainer: record.trainer === true
    };
  });

  const emails = normalizedRecords.flatMap(record => parseEmailList_(record.email));

  const currentUserEmail = String(
    getCurrentUser_().email || ''
  )
    .trim()
    .toLowerCase();
  
  const currentUserRecord = normalizedRecords.find(
    record => parseEmailList_(record.email).includes(currentUserEmail)
  );
  
  if (
    !currentUserRecord ||
    !currentUserRecord.administrator
  ) {
    throw new Error(
      'You cannot remove your own administrator access.'
    );
  }

  if (new Set(emails).size !== emails.length) {
    throw new Error('Role email addresses must be unique.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(30000);

  try {
    normalizedRecords.forEach(record => {
      let row = record.row;

      if (
        !Number.isInteger(row) ||
        row < 2 ||
        row > sheet.getLastRow()
      ) {
        row = sheet.getLastRow() + 1;
      }

      const values = {
        memberName: record.memberName,
        email: record.email,
        administrator: record.administrator,
        missionCreator: record.missionCreator,
        recruiter: record.recruiter,
        trainer: record.trainer
      };

      Object.entries(values).forEach(([field, value]) => {
        sheet.getRange(
          row,
          columns[field] + 1
        ).setValue(value);
      });
    });
  } finally {
    lock.releaseLock();
  }

  return getRoleRecords_();
}

function isTrue_(value) {
  return (
    value === true ||
    String(value || '').trim().toLowerCase() === 'true'
  );
}

/* -------------------------------------------------------------------------- */
/* Utility                                                                    */
/* -------------------------------------------------------------------------- */



function getTrainingGraphData_(
  area,
  startDateString,
  endDateString
) {
  const ss = getTrainingSpreadsheet_();

  const historySheet = getSheetOrThrow_(
    ss,
    CONFIG.TRAINING_HISTORY_SHEET
  );

  const values =
    historySheet.getDataRange().getValues();

  if (values.length < 2) {
    return [];
  }

  const headers = values[0].map(String);

  const memberIdIndex =
    headers.indexOf('Member Id');

  const areaIndex =
    headers.indexOf('Area');

  const trainingDateIndex =
    headers.indexOf('Training Date');

  const expiryDateIndex =
    headers.indexOf('Expiry Date');

  const archivedIndex =
    headers.indexOf('Archived');

  if (
    memberIdIndex === -1 ||
    areaIndex === -1 ||
    trainingDateIndex === -1 ||
    expiryDateIndex === -1 ||
    archivedIndex === -1
  ) {
    throw new Error(
      'TrainingHistory must contain Member Id, Area, Training Date, Expiry Date and Archived columns.'
    );
  }

  const startDate =
    parseDateInput_(startDateString);

  const endDate =
    parseDateInput_(endDateString);

  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  if (startDate > endDate) {
    throw new Error(
      'Graph start date cannot be after the end date.'
    );
  }

  const records = values
    .slice(1)
    .filter(row => {

      // Archived history never contributes
      // to the dashboard graph.
      if (isArchived_(row[archivedIndex])) {
        return false;
      }

      if (!row[memberIdIndex]) {
        return false;
      }

      if (
        area &&
        area !== 'All' &&
        String(row[areaIndex]) !== area
      ) {
        return false;
      }

      return (
        row[trainingDateIndex] &&
        row[expiryDateIndex]
      );
    })
    .map(row => {

      const trainingDate =
        row[trainingDateIndex] instanceof Date
          ? new Date(row[trainingDateIndex])
          : new Date(row[trainingDateIndex]);

      const expiryDate =
        row[expiryDateIndex] instanceof Date
          ? new Date(row[expiryDateIndex])
          : new Date(row[expiryDateIndex]);

      trainingDate.setHours(0, 0, 0, 0);
      expiryDate.setHours(0, 0, 0, 0);

      return {
        memberId: String(row[memberIdIndex]),
        area: String(row[areaIndex]),
        trainingDate,
        expiryDate
      };
    });

  const result = [];

  const current =
    new Date(startDate);

  while (current <= endDate) {

    const active =
      new Map();

    records.forEach(record => {

      // Training isn't valid yet.
      if (record.trainingDate > current) {
        return;
      }

      // Training has expired.
      if (record.expiryDate < current) {
        return;
      }

      /*
       * A particular member/area only counts once,
       * even if they retrained before the previous
       * competency expired.
       */
      const key =
        `${record.memberId}|${record.area}`;

      const existing =
        active.get(key);

      if (
        !existing ||
        record.trainingDate >
          existing.trainingDate
      ) {
        active.set(key, record);
      }
    });

    result.push({
      date: Utilities.formatDate(
        current,
        Session.getScriptTimeZone(),
        'yyyy-MM-dd'
      ),

      count: active.size
    });

    current.setDate(
      current.getDate() + 1
    );
  }

  return result;
}

function isUserInAnyGroup_(email, groups) {
  email =
    String(email || '')
      .trim()
      .toLowerCase();

  if (!email) {
    return false;
  }

  for (const groupEmail of groups || []) {
    try {
      const result =
        AdminDirectory.Members.hasMember(
          groupEmail,
          email
        );

      if (result?.isMember) {
        return true;
      }
    } catch (error) {
      console.error(
        `Unable to check group ${groupEmail}:`,
        error
      );
    }
  }

  return false;
}

function testGroupMembership_() {
  requireAdmin_();
  const email =
    getCurrentUser_().email;

  const group =
    'YOUR-ADMIN-GROUP@googlegroups.com';

  try {
    const result =
      AdminDirectory.Members.hasMember(
        group,
        email
      );

    Logger.log({
      email,
      group,
      result
    });

    return {
      email,
      group,
      result
    };

  } catch (error) {

    Logger.log(
      error.stack || error
    );

    return {
      email,
      group,
      error:
        error.message || String(error)
    };
  }
}

function updateRoleNamesConfig_() {
  requireAdmin_();
  const roles = [
    'Administrator',
    'Mission Creator',
    'Trainer',
    'Recruiter'
  ];

  const config = {};

  roles.forEach(role => {
    config[role] = getNamesByRole_(role);
  });

  PropertiesService.getScriptProperties().setProperty(
    'ROLE_NAMES_CONFIG',
    JSON.stringify(config)
  );

  return config;
}

function include_(filename) {
  return HtmlService
    .createHtmlOutputFromFile(filename)
    .getContent();
}