/**
 * @file Dashboard.js
 * @description Calculates server-side summary metrics for the ACAT Management
 * Application dashboard.
 *
 * Responsibilities:
 * - Builds the collection of counts returned to the frontend dashboard.
 * - Counts unique active trainers across all configured training areas.
 * - Excludes archived, non-Trainer, and unnamed records from trainer totals.
 * - Prevents the same trainer being counted more than once.
 *
 * Important:
 * - A record counts only when Competencies Status is `Trainer`.
 * - Archived records and records without a member name are excluded.
 * - Member names are compared case-insensitively.
 * - A trainer appearing in multiple training sheets is counted only once.
 * - Additional server-derived metrics can be added to `getDashboardCounts()`.
 *
 * Dependencies:
 * - `CONFIG.TRAINING_SHEETS` from Config.js.
 * - The configured training spreadsheet and training-area sheets.
 * - Spreadsheet row-conversion and archive helper functions from Utils.js.
 * - Google Apps Script Spreadsheet service.
 */

function getDashboardCounts() {
  return {
    trainerCount:
      getActiveTrainerCount()
  };
}

function getActiveTrainerCount() {
  const ss =
    getTrainingSpreadsheet_();

  const trainerNames =
    new Set();

  CONFIG.TRAINING_SHEETS.forEach(
    sheetName => {

      const sheet =
        ss.getSheetByName(
          sheetName
        );

      if (!sheet) {
        return;
      }

      const rows =
        rowsToObjects_(sheet);

      rows.forEach(row => {

        /*
         * Archived trainer records
         * do not count.
         */
        if (
          isArchived_(
            row['Archived']
          )
        ) {
          return;
        }

        const status =
          String(
            row[
              'Competencies Status'
            ] || ''
          )
            .trim()
            .toLowerCase();

        if (
          status !== 'trainer'
        ) {
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

        /*
         * Lowercase so the same person
         * cannot be counted twice due to
         * casing differences.
         */
        trainerNames.add(
          memberName.toLowerCase()
        );
      });
    }
  );

  return trainerNames.size;
}