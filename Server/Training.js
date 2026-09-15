/**
 * @file Training.js
 * @description Manages member training competencies, trainer assignments, and
 * training history for the ACAT Management Application.
 *
 * Responsibilities:
 * - Retrieves active training records by member or training area.
 * - Creates and updates competency and trainer records.
 * - Calculates competency status and expiry dates.
 * - Archives and restores training records and matching history entries.
 * - Searches, archives, restores, and permanently deletes history records.
 * - Formats training-history dates for display.
 *
 * Important:
 * - Creating or updating training records requires trainer access.
 * - Only administrators can assign Trainer status or manage archived records.
 * - Archived records are excluded from current training results.
 * - Training areas must be listed in `CONFIG.TRAINING_SHEETS`.
 * - Competency expiry rules are determined by the configured training area.
 * - Member names must match a record in the Members sheet before history can
 *   be created.
 * - Training sheet and TrainingHistory column names must remain compatible
 *   with the headers referenced in this file.
 *
 * Dependencies:
 * - Training configuration from Config.js.
 * - Permission checks from Permissions.js.
 * - Member retrieval from Members.js.
 * - Spreadsheet, header, date, expiry, status, and archive helper functions.
 * - Google Apps Script Spreadsheet, Session, and Utilities services.
 */

function getTrainingForMember(memberName) {
  const ss = getTrainingSpreadsheet_();
  const results = [];

  CONFIG.TRAINING_SHEETS.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;

    const headers = getHeaderMap_(sheet);
    const nameIndex = findHeader_(headers, ['Member Name', 'Name']);
    if (nameIndex == null) return;

    const rows = rowsToObjects_(sheet);
    const matches = rows.filter(row => {
      if (isArchived_(row['Archived'])) { return false; }
      const candidate = row['Member Name'] ?? row['Name'] ?? '';
      return String(candidate).trim().toLowerCase() === String(memberName).trim().toLowerCase();
    });

    matches.forEach(match => {
      const status =
        match['Competencies Status'] || '';
      
      const isTrainer =
        status.toLowerCase() === 'trainer';
      
      results.push({
        sheet: sheetName,
        row: match._row,
        status: status,
        lastCompetenciesDate:
          isTrainer
            ? ''
            : match['Training Completion Date'] || '',
        competenciesExpiry:
          isTrainer
            ? ''
            : match['Competencies Expiry'] || '',
        
        record: match
      })
    });
  });

  return results;
}

function getTrainingByArea(area) {
  const ss =
    getTrainingSpreadsheet_();

  area =
    String(area || 'All').trim();

  if (
    area !== 'All' &&
    !CONFIG.TRAINING_SHEETS.includes(area)
  ) {
    throw new Error(
      'Invalid training area.'
    );
  }

  const areas =
    area === 'All'
      ? CONFIG.TRAINING_SHEETS
      : [area];

  const results = [];

  areas.forEach(sheetName => {

    const sheet =
      ss.getSheetByName(sheetName);

    if (!sheet) {
      return;
    }

    const rows =
      rowsToObjects_(sheet);

    rows.forEach(row => {

      // Archived records are hidden.
      if (isArchived_(row['Archived'])) {
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

      const isTrainer =
        status.toLowerCase() ===
        'trainer';

      results.push({
        row: row._row,
        memberName,
        area: sheetName,
        status,

        trainingDate:
          isTrainer
            ? ''
            : row[
                'Training Completion Date'
              ] || '',

        expiryDate:
          isTrainer
            ? ''
            : row[
                'Competencies Expiry'
              ] || ''
      });
    });
  });

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

function upsertTrainingRecord(payload) {
  requireTrainer_();

  const memberName = String(payload?.memberName || '').trim();
  const trainingSheet = String(payload?.trainingSheet || '').trim();

  const permissions = getPermissions();
  const requestedTrainer =
    payload?.isTrainerRecord  === true;

  if (requestedTrainer && !permissions.isAdmin) {
    throw new Error(
      'Only administrators can assign Trainer status.'
    );
  }

  const isTrainerRecord  =
    permissions.isAdmin && requestedTrainer;

  if (!memberName) throw new Error('Member name is required.');
  if (!CONFIG.TRAINING_SHEETS.includes(trainingSheet)) {
    throw new Error('Invalid training sheet.');
  }

  const ss = getTrainingSpreadsheet_();
  const sheet = getSheetOrThrow_(ss, trainingSheet);
  const headers = getHeaderMap_(sheet);
  const nameIndex = findHeader_(headers, ['Member Name', 'Name']);
  const statusIndex = findHeader_(headers, ['Competencies Status']);
  const lastDateIndex = findHeader_(headers, ['Training Completion Date']);
  const expiryIndex = findHeader_(headers, ['Competencies Expiry']);

  if (nameIndex == null) {
    throw new Error(`"${trainingSheet}" does not contain a Member Name column.`);
  }
  if (statusIndex == null) {
    throw new Error(`"${trainingSheet}" does not contain a Competencies Status column.`);
  }
  if (lastDateIndex == null) {
    throw new Error(`"${trainingSheet}" does not contain a Training Completion Date column.`);
  }
  if (expiryIndex == null) {
    throw new Error(`"${trainingSheet}" does not contain a Competencies Expiry column.`);
  }

  let status = '';
  let lastDate = '';
  let expiryDate = '';

  /* ------------------------------------------------ */
  /* Trainer                                          */
  /* ------------------------------------------------ */
  if (isTrainerRecord) {
    const dateString =
      String(
        payload?.lastCompetenciesDate || ''
      ).trim();

    if (!dateString) {
      throw new Error(
        'Training Completion Date is required.'
      );
    }

    status = 'Trainer';

    lastDate =
      parseDateInput_(
        dateString
      );

    /*
     * Current trainer records do not have an
     * expiry while active.
     */
    expiryDate = '';
  }

  /* ------------------------------------------------ */
  /* Normal competency                                */
  /* ------------------------------------------------ */

  else {
    const dateString =
      String(
        payload?.lastCompetenciesDate || ''
      ).trim();

    if (!dateString) {
      throw new Error(
        'Training Completion Date is required.'
      );
    }

    lastDate = parseDateInput_(dateString);

    expiryDate =
      calculateTrainingExpiry_(
        lastDate,
        trainingSheet
      );

    status =
      calculateTrainingStatus_(
        expiryDate,
        trainingSheet
      );
  }

  /* ------------------------------------------------ */
  /* Find existing member                             */
  /* ------------------------------------------------ */
  const rows = rowsToObjects_(sheet);
  const existing = rows.find(row => {

    // Never overwrite an archived record.
    if (isArchived_(row['Archived'])) {
      return false;
    }
    const candidate = row['Member Name'] ?? row['Name'] ?? '';
    return String(candidate).trim().toLowerCase() === memberName.toLowerCase();
  });
  
  let rowNumber;

  if (existing) {
    rowNumber = existing._row;
  } else {
    rowNumber = sheet.getLastRow() + 1;
    sheet
     .getRange(
        rowNumber,
        nameIndex + 1
     )
     .setValue(memberName);
  }

  sheet
    .getRange(
      rowNumber,
      statusIndex + 1
    )
    .setValue(status);
    
  sheet
    .getRange(
      rowNumber,
      lastDateIndex + 1
    )
    .setValue(lastDate);
    
  sheet
    .getRange(
      rowNumber,
      expiryIndex + 1
    )
    .setValue(expiryDate);

  if (isTrainerRecord) {
    const trainerHistoryExpiry =
      new Date(
        9999,
        11,
        31
      );

    addTrainingHistory_(
      memberName,
      trainingSheet,
      lastDate,
      trainerHistoryExpiry,
      'Trainer'
    );

  } else {

    addTrainingHistory_(
      memberName,
      trainingSheet,
      lastDate,
      expiryDate,
      'Competency'
    );
  }
    
  return getTrainingForMember(memberName);
}

function archiveTrainingRecord(
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

  const nameIndex =
    findHeader_(
      headers,
      ['Member Name', 'Name']
    );
  
  const statusIndex =
    findHeader_(
      headers,
      ['Competencies Status']
    );

  const completionIndex =
    findHeader_(
      headers,
      ['Training Completion Date']
    );

  const expiryIndex =
    findHeader_(
      headers,
      ['Competencies Expiry']
    );

  const archivedIndex =
    findHeader_(
      headers,
      ['Archived']
    );

  if (nameIndex == null) {
    throw new Error(
      `"${trainingArea}" has no Member Name column.`
    );
  }

  if (archivedIndex == null) {
    throw new Error(
      `"${trainingArea}" has no Archived column.`
    );
  }

  /*
   * Read the actual spreadsheet values,
   * not values supplied by the browser.
   */
  const memberName =
    String(
      sheet
        .getRange(
          rowNumber,
          nameIndex + 1
        )
        .getValue() || ''
    ).trim();

  const status =
    statusIndex == null
      ? ''
      : String(
          sheet
            .getRange(
              rowNumber,
              statusIndex + 1
            )
            .getValue() || ''
        ).trim();

  const isTrainer =
    status.toLowerCase() ===
    'trainer';

  const trainingDate =
    completionIndex == null
      ? ''
      : sheet
          .getRange(
            rowNumber,
            completionIndex + 1
          )
          .getValue();

  const expiryDate =
    expiryIndex == null
      ? ''
      : sheet
          .getRange(
            rowNumber,
            expiryIndex + 1
          )
          .getValue();

  let effectiveExpiryDate =
    expiryDate;
  
  if (
    isTrainer &&
    expiryIndex != null
  ) {
    effectiveExpiryDate =
      new Date();
  
    effectiveExpiryDate.setHours(
      0,
      0,
      0,
      0
    );
  
    sheet
      .getRange(
        rowNumber,
        expiryIndex + 1
      )
      .setValue(
        effectiveExpiryDate
      );
  }

  /*
   * Archive the current-state record.
   */
  sheet
    .getRange(
      rowNumber,
      archivedIndex + 1
    )
    .setValue(true);

  /*
   * Trainer records have no actual
   * competency history record.
   */
  if (
    trainingDate &&
    expiryDate
  ) {
    archiveMatchingTrainingHistory_(
      memberName,
      trainingArea,
      trainingDate,
      expiryDate
    );
  }

  return getTrainingByArea(
    trainingArea
  );
}

function unarchiveTrainingRecord(
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

  const nameIndex =
    findHeader_(
      headers,
      ['Member Name', 'Name']
    );

  const statusIndex =
    findHeader_(
      headers,
      ['Competencies Status']
    );

  const completionIndex =
    findHeader_(
      headers,
      ['Training Completion Date']
    );

  const expiryIndex =
    findHeader_(
      headers,
      ['Competencies Expiry']
    );

  const archivedIndex =
    findHeader_(
      headers,
      ['Archived']
    );

  if (nameIndex == null) {
    throw new Error(
      `"${trainingArea}" has no Member Name column.`
    );
  }

  if (archivedIndex == null) {
    throw new Error(
      `"${trainingArea}" has no Archived column.`
    );
  }

  const memberName =
    String(
      sheet
        .getRange(
          rowNumber,
          nameIndex + 1
        )
        .getValue() || ''
    ).trim();

  const status =
    statusIndex == null
      ? ''
      : String(
          sheet
            .getRange(
              rowNumber,
              statusIndex + 1
            )
            .getValue() || ''
        ).trim();
  
  const isTrainer =
    status.toLowerCase() ===
    'trainer';

  const trainingDate =
    completionIndex == null
      ? ''
      : sheet
          .getRange(
            rowNumber,
            completionIndex + 1
          )
          .getValue();

  const expiryDate =
    expiryIndex == null
      ? ''
      : sheet
          .getRange(
            rowNumber,
            expiryIndex + 1
          )
          .getValue();

  if (
    isTrainer &&
    expiryIndex != null
  ) {
    sheet
      .getRange(
        rowNumber,
        expiryIndex + 1
      )
      .clearContent();
  }

  // Restore current training record.
  sheet
    .getRange(
      rowNumber,
      archivedIndex + 1
    )
    .setValue(false);

  /*
   * Competency records also have matching
   * TrainingHistory entries.
   *
   * Trainer records do not.
   */
  if (
    trainingDate &&
    expiryDate
  ) {
    unarchiveMatchingTrainingHistory_(
      memberName,
      trainingArea,
      trainingDate,
      expiryDate
    );
  }

  return getArchivedTrainingRecords();
}

function addTrainingHistory_(
  memberName,
  area,
  trainingDate,
  expiryDate,
  trainingType = 'Competency'
  ) {
  const ss = getTrainingSpreadsheet_();

  const historySheet = getSheetOrThrow_(
    ss,
    CONFIG.TRAINING_HISTORY_SHEET
  );

  // Find the member ID from the main member database
  const members = getMembers();

  const member = members.find(m =>
    String(m['Member Name'] || '')
      .trim()
      .toLowerCase() ===
    String(memberName)
      .trim()
      .toLowerCase()
  );

  if (!member) {
    throw new Error(
      `Could not find member "${memberName}".`
    );
  }

  historySheet.appendRow([
    member['Member Id'],
    memberName,
    area,
    trainingDate,
    expiryDate,
    false,
    trainingType
  ]);
}

function archiveMatchingTrainingHistory_(
  memberName,
  area,
  trainingDate,
  expiryDate
) {
  const ss =
    getTrainingSpreadsheet_();

  const sheet =
    getSheetOrThrow_(
      ss,
      CONFIG.TRAINING_HISTORY_SHEET
    );

  const headers =
    getHeaderMap_(sheet);

  const memberIdIndex =
    findHeader_(headers, ['Member Id']);

  const memberNameIndex =
    findHeader_(headers, ['Member Name']);

  const areaIndex =
    findHeader_(headers, ['Area']);

  const trainingDateIndex =
    findHeader_(headers, ['Training Date']);

  const expiryDateIndex =
    findHeader_(headers, ['Expiry Date']);

  const archivedIndex =
    findHeader_(headers, ['Archived']);

  if (
    areaIndex == null ||
    trainingDateIndex == null ||
    expiryDateIndex == null ||
    archivedIndex == null
  ) {
    throw new Error(
      'TrainingHistory is missing required columns.'
    );
  }

  /*
   * Prefer Member Id as the identity.
   */
  const members =
    getMembers();

  const member =
    members.find(item =>
      String(item['Member Name'] || '')
        .trim()
        .toLowerCase() ===
      memberName.toLowerCase()
    );

  const memberId =
    member?.['Member Id'];

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return;
  }

  const values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        sheet.getLastColumn()
      )
      .getValues();

  values.forEach((row, index) => {

    let sameMember;

    if (
      memberIdIndex != null &&
      memberId != null
    ) {
      sameMember =
        String(row[memberIdIndex]) ===
        String(memberId);
    } else {
      sameMember =
        String(
          row[memberNameIndex] || ''
        )
          .trim()
          .toLowerCase() ===
        memberName.toLowerCase();
    }

    if (!sameMember) {
      return;
    }

    if (
      String(row[areaIndex])
        .trim() !==
      area
    ) {
      return;
    }

    if (
      !sameDate_(
        row[trainingDateIndex],
        trainingDate
      )
    ) {
      return;
    }

    if (
      !sameDate_(
        row[expiryDateIndex],
        expiryDate
      )
    ) {
      return;
    }

    /*
     * Archive every exact duplicate match.
     *
     * This is useful because you previously
     * encountered duplicate TrainingHistory
     * writes.
     */
    sheet
      .getRange(
        index + 2,
        archivedIndex + 1
      )
      .setValue(true);
  });
}

function unarchiveMatchingTrainingHistory_(
  memberName,
  area,
  trainingDate,
  expiryDate
) {
  const ss =
    getTrainingSpreadsheet_();

  const sheet =
    getSheetOrThrow_(
      ss,
      CONFIG.TRAINING_HISTORY_SHEET
    );

  const headers =
    getHeaderMap_(sheet);

  const memberIdIndex =
    findHeader_(
      headers,
      ['Member Id']
    );

  const memberNameIndex =
    findHeader_(
      headers,
      ['Member Name']
    );

  const areaIndex =
    findHeader_(
      headers,
      ['Area']
    );

  const trainingDateIndex =
    findHeader_(
      headers,
      ['Training Date']
    );

  const expiryDateIndex =
    findHeader_(
      headers,
      ['Expiry Date']
    );

  const archivedIndex =
    findHeader_(
      headers,
      ['Archived']
    );

  if (
    areaIndex == null ||
    trainingDateIndex == null ||
    expiryDateIndex == null ||
    archivedIndex == null
  ) {
    throw new Error(
      'TrainingHistory is missing required columns.'
    );
  }

  const members =
    getMembers();

  const member =
    members.find(item =>
      String(
        item['Member Name'] || ''
      )
        .trim()
        .toLowerCase() ===
      memberName
        .trim()
        .toLowerCase()
    );

  const memberId =
    member?.['Member Id'];

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return;
  }

  const values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        sheet.getLastColumn()
      )
      .getValues();

  values.forEach(
    (row, index) => {

      let sameMember;

      if (
        memberIdIndex != null &&
        memberId != null
      ) {
        sameMember =
          String(
            row[memberIdIndex]
          ) ===
          String(memberId);
      } else {
        sameMember =
          String(
            row[memberNameIndex] || ''
          )
            .trim()
            .toLowerCase() ===
          memberName
            .trim()
            .toLowerCase();
      }

      if (!sameMember) {
        return;
      }

      if (
        String(
          row[areaIndex]
        ).trim() !== area
      ) {
        return;
      }

      if (
        !sameDate_(
          row[trainingDateIndex],
          trainingDate
        )
      ) {
        return;
      }

      if (
        !sameDate_(
          row[expiryDateIndex],
          expiryDate
        )
      ) {
        return;
      }

      sheet
        .getRange(
          index + 2,
          archivedIndex + 1
        )
        .setValue(false);
    }
  );
}

function searchTrainingHistory(
  fromDateString,
  toDateString,
  memberName,
  area
) {
  requireAdmin_();

  fromDateString =
    String(fromDateString || '').trim();

  toDateString =
    String(toDateString || '').trim();

  memberName =
    String(memberName || '').trim();

  area =
    String(area || 'All').trim();

  if (
    !fromDateString ||
    !toDateString
  ) {
    throw new Error(
      'From and To dates are required.'
    );
  }

  if (
    area !== 'All' &&
    !CONFIG.TRAINING_SHEETS.includes(area)
  ) {
    throw new Error(
      'Invalid training area.'
    );
  }

  const fromDate =
    parseDateInput_(fromDateString);

  const toDate =
    parseDateInput_(toDateString);

  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(23, 59, 59, 999);

  if (fromDate > toDate) {
    throw new Error(
      'From date cannot be after To date.'
    );
  }

  const sheet =
    getSheetOrThrow_(
      getTrainingSpreadsheet_(),
      CONFIG.TRAINING_HISTORY_SHEET
    );

  const headers =
    getHeaderMap_(sheet);

  const memberNameIndex =
    findHeader_(
      headers,
      ['Member Name']
    );

  const areaIndex =
    findHeader_(
      headers,
      ['Area']
    );

  const trainingDateIndex =
    findHeader_(
      headers,
      ['Training Date']
    );

  const expiryDateIndex =
    findHeader_(
      headers,
      ['Expiry Date']
    );

  const archivedIndex =
    findHeader_(
      headers,
      ['Archived']
    );

  if (
    memberNameIndex == null ||
    areaIndex == null ||
    trainingDateIndex == null ||
    expiryDateIndex == null ||
    archivedIndex == null
  ) {
    throw new Error(
      'TrainingHistory is missing required columns.'
    );
  }

  const lastRow =
    sheet.getLastRow();

  if (lastRow < 2) {
    return [];
  }

  const values =
    sheet
      .getRange(
        2,
        1,
        lastRow - 1,
        sheet.getLastColumn()
      )
      .getValues();

  const memberFilter =
    memberName.toLowerCase();

  return values
    .map((row, index) => {

      const trainingDate =
        row[trainingDateIndex];

      if (!trainingDate) {
        return null;
      }

      const date =
        trainingDate instanceof Date
          ? new Date(trainingDate)
          : new Date(trainingDate);

      if (isNaN(date.getTime())) {
        return null;
      }

      date.setHours(0, 0, 0, 0);

      if (
        date < fromDate ||
        date > toDate
      ) {
        return null;
      }

      const rowMemberName =
        String(
          row[memberNameIndex] || ''
        ).trim();

      if (
        memberFilter &&
        !rowMemberName
          .toLowerCase()
          .includes(memberFilter)
      ) {
        return null;
      }

      const rowArea =
        String(
          row[areaIndex] || ''
        ).trim();

      if (
        area !== 'All' &&
        rowArea !== area
      ) {
        return null;
      }

      return {
        row: index + 2,

        memberName:
          rowMemberName,

        area:
          rowArea,

        trainingDate:
          formatTrainingHistoryDate_(
            row[trainingDateIndex]
          ),

        expiryDate:
          formatTrainingHistoryDate_(
            row[expiryDateIndex]
          ),

        archived:
          isArchived_(
            row[archivedIndex]
          )
      };
    })
    .filter(Boolean)
    .sort((a, b) => {

      const dateCompare =
        new Date(
          b.trainingDate
            .split('/')
            .reverse()
            .join('-')
        ) -
        new Date(
          a.trainingDate
            .split('/')
            .reverse()
            .join('-')
        );

      if (dateCompare !== 0) {
        return dateCompare;
      }

      return a.memberName.localeCompare(
        b.memberName
      );
    });
}

function setTrainingHistoryArchived(
  rowNumber,
  archived
) {
  requireAdmin_();

  rowNumber =
    Number(rowNumber);

  archived =
    archived === true;

  const sheet =
    getSheetOrThrow_(
      getTrainingSpreadsheet_(),
      CONFIG.TRAINING_HISTORY_SHEET
    );

  if (
    !Number.isInteger(rowNumber) ||
    rowNumber < 2 ||
    rowNumber > sheet.getLastRow()
  ) {
    throw new Error(
      'Invalid training history row.'
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
      'TrainingHistory has no Archived column.'
    );
  }

  sheet
    .getRange(
      rowNumber,
      archivedIndex + 1
    )
    .setValue(archived);

  return true;
}

function deleteTrainingHistoryRecord(
  rowNumber
) {
  requireAdmin_();

  rowNumber =
    Number(rowNumber);

  const sheet =
    getSheetOrThrow_(
      getTrainingSpreadsheet_(),
      CONFIG.TRAINING_HISTORY_SHEET
    );

  if (
    !Number.isInteger(rowNumber) ||
    rowNumber < 2 ||
    rowNumber > sheet.getLastRow()
  ) {
    throw new Error(
      'Invalid training history row.'
    );
  }

  sheet.deleteRow(
    rowNumber
  );

  return true;
}

function formatTrainingHistoryDate_(value) {
  if (!value) {
    return '';
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (isNaN(date.getTime())) {
    return '';
  }

  return Utilities.formatDate(
    date,
    Session.getScriptTimeZone(),
    'dd/MM/yyyy'
  );
}