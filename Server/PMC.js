/**
 * @file PMC.js
 * @description Manages Potential Mission Creator (PMC) records and progression
 * within the ACAT Management Application.
 *
 * Responsibilities:
 * - Retrieves active PMC records from the configured spreadsheet.
 * - Creates PMC records for eligible full members.
 * - Updates PMC phases, permissions, and consecutive good-mission counts.
 * - Derives script and asset permissions from the selected PMC phase.
 * - Archives, restores, and permanently deletes PMC records.
 * - Detects active duplicates and previously archived records.
 *
 * Important:
 * - Creating or updating PMC records requires Mission Creator or administrator
 *   access.
 * - Archiving, restoring, and deleting records requires administrator access.
 * - Only members whose current role is `Member` can receive a PMC record.
 * - Each member can have only one active PMC record.
 * - Changing a PMC phase resets the consecutive good-mission count to zero.
 * - Phase 1 permits no scripts or assets, Phase 2 permits assets only, and
 *   Phase 3 permits both scripts and assets.
 * - Sheet column names must remain compatible with the headers used here.
 *
 * Dependencies:
 * - `CONFIG.SHEETS.PMCS` from Config.js.
 * - Permission checks from Permissions.js.
 * - Member retrieval from Members.js.
 * - Spreadsheet, header, row-conversion, and archive helper functions.
 * - Google Apps Script Spreadsheet service.
 */

function getPMCRecords() {
  const sheet = getPMCSpreadsheet_().getSheetByName(
    CONFIG.SHEETS.PMCS
  );

  if (!sheet) {
    return [];
  }

  return rowsToObjects_(sheet)
    .filter(record =>
      !isArchived_(
        record['Archived']
      )
    );
}

function addPMCRecord(memberName) {
  requireMissionCreatorOrAdmin_();

  memberName = String(memberName || '').trim();

  if (!memberName) {
    throw new Error('Member name is required.');
  }

  const member =
    getMembers().find(item =>
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

  const sheet = getSheetOrThrow_(
    getPMCSpreadsheet_(),
    CONFIG.SHEETS.PMCS
  );

  const headers = getHeaderMap_(sheet);

  const idIndex = findHeader_(headers, ['ID']);
  const memberNameIndex = findHeader_(headers, ['Member Name']);
  const phaseIndex = findHeader_(headers, ['Phase']);
  const scriptsIndex = findHeader_(headers, ['Scripts Allowed']);
  const assetsIndex = findHeader_(headers, ['Assets Allowed']);
  const goodMissionsIndex = findHeader_(headers, ['Consecutive Good Missions']);
  const archivedIndex = findHeader_(headers, ['Archived']);

  if (idIndex == null) {
    throw new Error('Could not find the "ID" column.');
  }

  if (memberNameIndex == null) {
    throw new Error('Could not find the "Member Name" column.');
  }

  // Find duplicate records
  const existingRecords =
    rowsToObjects_(sheet);
  
  const matchingRecords =
    existingRecords.filter(record =>
      String(
        record['Member Name'] || ''
      )
        .trim()
        .toLowerCase() ===
      memberName.toLowerCase()
    );
  
  const activeRecord =
    matchingRecords.find(record =>
      !isArchived_(
        record['Archived']
      )
    );
  
  if (activeRecord) {
    throw new Error(
      `${memberName} already has an active PMC record.`
    );
  }
  
  const archivedRecords =
    matchingRecords
      .filter(record =>
        isArchived_(
          record['Archived']
        )
      )
      .map(record => ({
        row: record._row,
        id: record['ID'] || '',
        memberName:
          record['Member Name'] || '',
        phase:
          record['Phase'] || '',
        scriptsAllowed:
          record['Scripts Allowed'] || '',
        assetsAllowed:
          record['Assets Allowed'] || '',
        goodMissions:
          record[
            'Consecutive Good Missions'
          ] || 0
      }))
      .sort((a, b) =>
        Number(b.id || 0) -
        Number(a.id || 0)
      );
  
  if (archivedRecords.length) {
    return {
      status: 'archivedExists',
      memberName,
      archivedRecords
    };
  }

  // Find the highest existing ID
  let nextId = 1;

  const lastRow = sheet.getLastRow();

  if (lastRow >= 2) {
    const idValues = sheet
      .getRange(2, idIndex + 1, lastRow - 1, 1)
      .getValues()
      .flat();

    const numericIds = idValues
      .map(value => Number(value))
      .filter(value => Number.isFinite(value));

    if (numericIds.length > 0) {
      nextId = Math.max(...numericIds) + 1;
    }
  }

  // Build new row
  const row = new Array(sheet.getLastColumn()).fill('');

  row[idIndex] = nextId;
  row[memberNameIndex] = memberName;

  if (phaseIndex != null) {
    row[phaseIndex] = 'Phase 1';
  }

  if (scriptsIndex != null) {
    row[scriptsIndex] = 'No';
  }

  if (assetsIndex != null) {
    row[assetsIndex] = 'No';
  }

  if (goodMissionsIndex != null) {
    row[goodMissionsIndex] = 0;
  }

  if (archivedIndex != null) {
    row[archivedIndex] = false;
  }

  sheet.appendRow(row);

  return {
    status: 'created',
    records: getPMCRecords()
  };
}

function updatePMCRecord(rowNumber, updates) {
  requireMissionCreatorOrAdmin_();

  const sheet = getSheetOrThrow_(
    getPMCSpreadsheet_(),
    CONFIG.SHEETS.PMCS
  );

  const headers = getHeaderMap_(sheet);

  rowNumber = Number(rowNumber);

  if (
    !Number.isInteger(rowNumber) ||
    rowNumber < 2 ||
    rowNumber > sheet.getLastRow()
  ) {
    throw new Error('Invalid PMC row.');
  }

  /* -------------------------------- */
  /* Required columns                 */
  /* -------------------------------- */

  const phaseIndex =
    findHeader_(
      headers,
      ['Phase']
    );

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

  if (
    phaseIndex == null ||
    scriptsIndex == null ||
    assetsIndex == null ||
    goodMissionsIndex == null
  ) {
    throw new Error(
      'PMC sheet is missing required columns.'
    );
  }


  /* -------------------------------- */
  /* Compare old and new Phase        */
  /* -------------------------------- */

  const originalPhase =
    String(
      sheet
        .getRange(
          rowNumber,
          phaseIndex + 1
        )
        .getValue() || ''
    ).trim();

  const newPhase =
    String(
      updates?.['Phase'] || ''
    ).trim();


  /* -------------------------------- */
  /* Derive permissions from Phase    */
  /* -------------------------------- */

  let scriptsAllowed;
  let assetsAllowed;

  switch (newPhase) {

    case 'Phase 1':
      scriptsAllowed = 'No';
      assetsAllowed = 'No';
      break;

    case 'Phase 2':
      scriptsAllowed = 'No';
      assetsAllowed = 'Yes';
      break;

    case 'Phase 3':
      scriptsAllowed = 'Yes';
      assetsAllowed = 'Yes';
      break;

    default:
      throw new Error(
        'Invalid PMC phase.'
      );
  }


  /* -------------------------------- */
  /* Consecutive mission counter      */
  /* -------------------------------- */

  const phaseChanged =
    originalPhase !== newPhase;

  let goodMissions;

  if (phaseChanged) {

    // Any Phase change resets progress.
    goodMissions = 0;

  } else {

    // Same Phase: preserve the value
    // submitted by the administrator.
    goodMissions =
      Number(
        updates?.[
          'Consecutive Good Missions'
        ] ?? 0
      );

    if (
      !Number.isInteger(goodMissions) ||
      goodMissions < 0
    ) {
      throw new Error(
        'Consecutive Good Missions must be zero or greater.'
      );
    }
  }


  /* -------------------------------- */
  /* Save                             */
  /* -------------------------------- */

  sheet
    .getRange(
      rowNumber,
      phaseIndex + 1
    )
    .setValue(newPhase);

  sheet
    .getRange(
      rowNumber,
      scriptsIndex + 1
    )
    .setValue(scriptsAllowed);

  sheet
    .getRange(
      rowNumber,
      assetsIndex + 1
    )
    .setValue(assetsAllowed);

  sheet
    .getRange(
      rowNumber,
      goodMissionsIndex + 1
    )
    .setValue(goodMissions);

  return getPMCRecords();
}

function archivePMCRecord(rowNumber) {
  requireAdmin_();

  const sheet =
    getSheetOrThrow_(
      getPMCSpreadsheet_(),
      CONFIG.SHEETS.PMCS
    );

  rowNumber =
    Number(rowNumber);

  if (
    !Number.isInteger(rowNumber) ||
    rowNumber < 2 ||
    rowNumber > sheet.getLastRow()
  ) {
    throw new Error(
      'Invalid PMC row.'
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
      'PMC sheet does not contain an Archived column.'
    );
  }

  sheet
    .getRange(
      rowNumber,
      archivedIndex + 1
    )
    .setValue(true);

  return getPMCRecords();
}

function unarchivePMCRecord(rowNumber) {
  requireAdmin_();

  const sheet =
    getSheetOrThrow_(
      getPMCSpreadsheet_(),
      CONFIG.SHEETS.PMCS
    );

  rowNumber =
    Number(rowNumber);

  if (
    !Number.isInteger(rowNumber) ||
    rowNumber < 2 ||
    rowNumber > sheet.getLastRow()
  ) {
    throw new Error(
      'Invalid PMC row.'
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
      'PMC sheet does not contain an Archived column.'
    );
  }

  sheet
    .getRange(
      rowNumber,
      archivedIndex + 1
    )
    .setValue(false);

  return getPMCRecords();
}

function deletePMCRecord(rowNumber) {
  requireAdmin_();

  const sheet = getSheetOrThrow_(
    getPMCSpreadsheet_(),
    CONFIG.SHEETS.PMCS
  );

  rowNumber = Number(rowNumber);

  if (
    !Number.isInteger(rowNumber) ||
    rowNumber < 2 ||
    rowNumber > sheet.getLastRow()
  ) {
    throw new Error('Invalid PMC row.');
  }

  sheet.deleteRow(rowNumber);

  return getPMCRecords();
}