/**
 * @file Utils.js
 * @description Provides shared spreadsheet, header, date, and record-handling
 * utilities for the ACAT Management Application.
 *
 * Responsibilities:
 * - Opens the configured member, training, PMC, and administration spreadsheets.
 * - Retrieves required sheets and reports missing-sheet configuration errors.
 * - Maps spreadsheet headers to zero-based column indexes.
 * - Converts populated spreadsheet rows into JavaScript objects.
 * - Finds column headers using case-insensitive candidate matching.
 * - Parses date input and compares calendar dates.
 * - Normalizes archived values from Boolean or string representations.
 *
 * Important:
 * - Spreadsheet IDs must be defined in Config.js before they can be opened.
 * - Spreadsheet headers are read from the first row.
 * - `rowsToObjects_()` uses displayed cell values and adds the source row number
 *   to each record as `_row`.
 * - Date input must use the `YYYY-MM-DD` format.
 * - `sameDate_()` compares year, month, and day while ignoring the time.
 * - Functions ending in an underscore are intended for internal server use.
 *
 * Dependencies:
 * - Spreadsheet IDs from Config.js.
 * - Google Apps Script `SpreadsheetApp` service.
 */

function getMemberSpreadsheet_() {
  if (!CONFIG.MEMBER_SPREADSHEET_ID) {
    throw new Error(
      'Member spreadsheet ID is not configured.'
    );
  }

  return SpreadsheetApp.openById(
    CONFIG.MEMBER_SPREADSHEET_ID
  );
}

function getTrainingSpreadsheet_() {
  if (!CONFIG.TRAINING_SPREADSHEET_ID) {
    throw new Error(
      'Training spreadsheet ID is not configured.'
    );
  }

  return SpreadsheetApp.openById(
    CONFIG.TRAINING_SPREADSHEET_ID
  );
}

function getPMCSpreadsheet_() {
  if (!CONFIG.PMC_SPREADSHEET_ID) {
    throw new Error(
      'PMC spreadsheet ID is not configured.'
    );
  }

  return SpreadsheetApp.openById(
    CONFIG.PMC_SPREADSHEET_ID
  );
}

function getAdminSpreadsheet_() {
  if (!CONFIG.ADMIN_SPREADSHEET_ID) {
    throw new Error(
      'Admin spreadsheet ID is not configured.'
    );
  }

  return SpreadsheetApp.openById(
    CONFIG.ADMIN_SPREADSHEET_ID
  );
}

function getSheetOrThrow_(ss, name) {
  const sheet = ss.getSheetByName(name);
  if (!sheet) throw new Error(`Sheet "${name}" was not found.`);
  return sheet;
}

function getHeaderMap_(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) throw new Error(`Sheet "${sheet.getName()}" has no columns.`);

  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];

  return headers.reduce((map, header, index) => {
    if (header !== '') map[String(header).trim()] = index;
    return map;
  }, {});
}

function rowsToObjects_(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow < 2 || lastColumn < 1) return [];

  const values = sheet.getRange(1, 1, lastRow, lastColumn).getDisplayValues();
  const headers = values[0].map(String);

  return values.slice(1)
    .filter(row => row.some(v => String(v).trim() !== ''))
    .map((row, i) => {
      const obj = { _row: i + 2 };
      headers.forEach((h, j) => {
        if (h) obj[h] = row[j];
      });
      return obj;
    });
}

function findHeader_(headers, candidates) {
  const normalized = {};
  Object.entries(headers).forEach(([header, index]) => {
    normalized[header.toLowerCase()] = index;
  });

  for (const candidate of candidates) {
    const key = String(candidate).toLowerCase();
    if (normalized[key] != null) return normalized[key];
  }

  return null;
}

function parseDateInput_(value) {
  const parts = String(value).split('-');

  if (parts.length !== 3) {
    throw new Error('Invalid date.');
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  return new Date(
    year,
    month - 1,
    day
  );
}

function isArchived_(value) {
  return (
    value === true ||
    String(value || '')
      .trim()
      .toLowerCase() === 'true'
  );
}

function sameDate_(a, b) {
  if (!a || !b) {
    return false;
  }

  const dateA =
    new Date(a);

  const dateB =
    new Date(b);

  return (
    dateA.getFullYear() ===
      dateB.getFullYear() &&
    dateA.getMonth() ===
      dateB.getMonth() &&
    dateA.getDate() ===
      dateB.getDate()
  );
}