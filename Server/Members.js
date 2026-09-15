/**
 * @file Members.js
 * @description Manages member records and progression within the ACAT
 * Management Application.
 *
 * Responsibilities:
 * - Retrieves member records from the configured Members sheet.
 * - Creates members with a unique sequential ID and initial role and stage.
 * - Updates permitted member fields and recalculates progression readiness.
 * - Automatically updates roles and stages from recorded progression dates.
 * - Deletes member records and locates spreadsheet rows by member ID.
 *
 * Important:
 * - Adding members requires administrator access.
 * - Updating or deleting members requires recruiter or administrator access.
 * - Member IDs and the "Ready to Progress" field cannot be updated directly.
 * - A member is ready to progress after attending at least three main missions,
 *   or at least two main missions and four other missions.
 * - Automatic progression follows Member, New Member, then Applicant priority.
 * - Manual Left, On Break, and Banned states may override automatic progression.
 * - Sheet column names must remain compatible with the headers used here.
 *
 * Dependencies:
 * - `CONFIG.SHEETS.MEMBERS` from Config.js.
 * - Permission checks from Permissions.js.
 * - Spreadsheet, header, row-conversion, and date-parsing helper functions.
 * - Google Apps Script Spreadsheet service.
 */

function getMembers() {
  const sheet = getSheetOrThrow_(getMemberSpreadsheet_(), CONFIG.SHEETS.MEMBERS);
  return rowsToObjects_(sheet);
}

function addMember(member) {
  requireAdmin_();

  const name = String(member?.name || '').trim();

  if (!name) {
    throw new Error('Member name is required.');
  }

  const sheet = getSheetOrThrow_(
    getMemberSpreadsheet_(),
    CONFIG.SHEETS.MEMBERS
  );

  const headers = getHeaderMap_(sheet);

  const memberIdIndex =
    findHeader_(headers, ['Member Id', 'Member ID', 'ID']);

  const memberNameIndex =
    findHeader_(headers, ['Member Name', 'Name']);
  
  const recruiterIndex =
    findHeader_(
      headers,
      ['Recruiter']
    );
  
  const discordJoinDateIndex =
    findHeader_(
      headers,
      ['Discord Join Date']
    );

  if (memberIdIndex == null) {
    throw new Error(
      'Could not find the "Member Id" column.'
    );
  }

  if (memberNameIndex == null) {
    throw new Error(
      'Could not find the "Member Name" column.'
    );
  }

  const roleIndex =
    findHeader_(
      headers,
      ['Role']
    );
  
  const stageIndex =
    findHeader_(
      headers,
      ['Stage']
    );

  // Find highest existing Member Id
  let nextId = 1;

  const lastRow = sheet.getLastRow();

  if (lastRow >= 2) {
    const idValues = sheet
      .getRange(
        2,
        memberIdIndex + 1,
        lastRow - 1,
        1
      )
      .getValues()
      .flat();

    const numericIds = idValues
      .map(value => Number(value))
      .filter(value => Number.isFinite(value));

    if (numericIds.length > 0) {
      nextId = Math.max(...numericIds) + 1;
    }
  }

  const row =
    new Array(sheet.getLastColumn()).fill('');

  row[memberIdIndex] = nextId;
  row[memberNameIndex] = name;

  if (
    headers['Status'] != null &&
    member.status
  ) {
    row[headers['Status']] = member.status;
  }

  if (recruiterIndex != null) {
    row[recruiterIndex] =
      String(member?.recruiter || '').trim();
  }
  
  if (
    discordJoinDateIndex != null &&
    member?.discordJoinDate
  ) {
    row[discordJoinDateIndex] =
      parseDateInput_(
        member.discordJoinDate
      );
  }

  if (roleIndex != null) {
    row[roleIndex] =
      'Awaiting Induction';
  }

  if (stageIndex != null) {
    row[stageIndex] =
      'Probation';
  }

  sheet.appendRow(row);

  return getMembers();
}

function updateMember(
  memberId,
  updates
) {
  requireRecruiterOrAdmin_();

  const sheet =
    getSheetOrThrow_(
      getMemberSpreadsheet_(),
      CONFIG.SHEETS.MEMBERS
    );

  const headers =
    getHeaderMap_(sheet);

  const rowNumber =
    findMemberRowById_(
      memberId
    );

  if (
    !Number.isInteger(
      rowNumber
    ) ||
    rowNumber < 2 ||
    rowNumber >
      sheet.getLastRow()
  ) {
    throw new Error(
      'Invalid member row.'
    );
  }


  /* -------------------------------- */
  /* Protected / calculated fields    */
  /* -------------------------------- */

  const protectedFields = [
    'Member Id',
    'Member ID',
    'ID',
    'Ready to Progress'
  ];


  /* -------------------------------- */
  /* Save submitted fields            */
  /* -------------------------------- */

  Object.entries(
    updates || {}
  ).forEach(
    ([key, value]) => {

      if (
        protectedFields
          .includes(key)
      ) {
        return;
      }

      const index =
        findHeader_(
          headers,
          [key]
        );

      if (
        index != null
      ) {
        sheet
          .getRange(
            rowNumber,
            index + 1
          )
          .setValue(value);
      }
    }
  );


  /* -------------------------------- */
  /* Ready to Progress                */
  /* -------------------------------- */

  const mainMissionsIndex =
    findHeader_(
      headers,
      ['Main Missions Joined']
    );

  const otherMissionsIndex =
    findHeader_(
      headers,
      ['Other Missions Joined']
    );

  const readyIndex =
    findHeader_(
      headers,
      ['Ready to Progress']
    );

  if (
    mainMissionsIndex != null &&
    otherMissionsIndex != null &&
    readyIndex != null
  ) {

    const mainMissions =
      Number(
        sheet
          .getRange(
            rowNumber,
            mainMissionsIndex + 1
          )
          .getValue()
      ) || 0;

    const otherMissions =
      Number(
        sheet
          .getRange(
            rowNumber,
            otherMissionsIndex + 1
          )
          .getValue()
      ) || 0;

    const readyToProgress =
      mainMissions >= 3 ||
      (
        mainMissions >= 2 &&
        otherMissions >= 4
      );

    sheet
      .getRange(
        rowNumber,
        readyIndex + 1
      )
      .setValue(
        readyToProgress
      );
  }


  /* -------------------------------- */
  /* Automatic Role / Stage           */
  /* -------------------------------- */
  
  const roleIndex =
    findHeader_(
      headers,
      ['Role']
    );
  
  const stageIndex =
    findHeader_(
      headers,
      ['Stage']
    );
  
  const progressionToApplicantIndex =
    findHeader_(
      headers,
      [
        'Progression to Applicant'
      ]
    );
  
  const progressionToNewMemberIndex =
    findHeader_(
      headers,
      [
        'Progression to New Member'
      ]
    );
  
  const progressionToMemberIndex =
    findHeader_(
      headers,
      [
        'Progression to Member'
      ]
    );
  
  
  /*
   * Read values AFTER submitted changes
   * have already been written.
   */
  
  const progressionToApplicant =
    progressionToApplicantIndex == null
      ? ''
      : sheet
          .getRange(
            rowNumber,
            progressionToApplicantIndex + 1
          )
          .getValue();
  
  const progressionToNewMember =
    progressionToNewMemberIndex == null
      ? ''
      : sheet
          .getRange(
            rowNumber,
            progressionToNewMemberIndex + 1
          )
          .getValue();
  
  const progressionToMember =
    progressionToMemberIndex == null
      ? ''
      : sheet
          .getRange(
            rowNumber,
            progressionToMemberIndex + 1
          )
          .getValue();
  
  
  /*
   * Read the current Role and Stage AFTER
   * the administrator's submitted changes.
   */
  
  const currentRole =
    roleIndex == null
      ? ''
      : String(
          sheet
            .getRange(
              rowNumber,
              roleIndex + 1
            )
            .getValue() || ''
        ).trim();
  
  const currentStage =
    stageIndex == null
      ? ''
      : String(
          sheet
            .getRange(
              rowNumber,
              stageIndex + 1
            )
            .getValue() || ''
        ).trim();
  
  
  /*
   * Manual override states.
   *
   * These must take priority over
   * automatic progression.
   */
  
  const roleOverride =
    [
      'Left',
      'Banned'
    ].includes(
      currentRole
    );
  
  const stageOverride =
    [
      'Left',
      'On Break',
      'Banned'
    ].includes(
      currentStage
    );
  
  
  /*
   * Highest progression:
   * Progression to Member
   *
   * Role -> Member
   * Stage -> Complete
   *
   * unless manually overridden.
   */
  
  if (progressionToMember) {
  
    if (
      roleIndex != null &&
      !roleOverride
    ) {
      sheet
        .getRange(
          rowNumber,
          roleIndex + 1
        )
        .setValue(
          'Member'
        );
    }
  
    if (
      stageIndex != null &&
      !stageOverride
    ) {
      sheet
        .getRange(
          rowNumber,
          stageIndex + 1
        )
        .setValue(
          'Complete'
        );
    }
  
  
  /*
   * Progression to New Member
   *
   * Role -> New Member
   *
   * unless manually overridden.
   */
  
  } else if (
    progressionToNewMember
  ) {
  
    if (
      roleIndex != null &&
      !roleOverride
    ) {
      sheet
        .getRange(
          rowNumber,
          roleIndex + 1
        )
        .setValue(
          'New Member'
        );
    }
  
  
  /*
   * Progression to Applicant
   *
   * Role -> Applicant
   *
   * unless manually overridden.
   */
  
  } else if (
    progressionToApplicant
  ) {
  
    if (
      roleIndex != null &&
      !roleOverride
    ) {
      sheet
        .getRange(
          rowNumber,
          roleIndex + 1
        )
        .setValue(
          'Applicant'
        );
    }
  }


  /* -------------------------------- */
  /* Return refreshed data            */
  /* -------------------------------- */

  return getMembers();
}

function deleteMember(memberId) {
  requireRecruiterOrAdmin_();

  const sheet = getSheetOrThrow_(getMemberSpreadsheet_(), CONFIG.SHEETS.MEMBERS);

  const rowNumber = findMemberRowById_(memberId);
  if (!Number.isInteger(rowNumber) || rowNumber < 2 || rowNumber > sheet.getLastRow()) {
    throw new Error('Invalid member row.');
  }

  sheet.deleteRow(rowNumber);
  return getMembers();
}

function findMemberRowById_(memberId) {
  const sheet = getSheetOrThrow_(
    getMemberSpreadsheet_(),
    CONFIG.SHEETS.MEMBERS
  );

  const headers = getHeaderMap_(sheet);
  const idIndex = findHeader_(headers, ['Member Id']);

  if (idIndex == null) {
    throw new Error('Could not find the "Member Id" column.');
  }

  const lastRow = sheet.getLastRow();

  if (lastRow < 2) {
    throw new Error('Member not found.');
  }

  const ids = sheet
    .getRange(2, idIndex + 1, lastRow - 1, 1)
    .getValues()
    .flat();

  const matchIndex = ids.findIndex(
    id => String(id) === String(memberId)
  );

  if (matchIndex === -1) {
    throw new Error(
      `Member ID ${memberId} was not found.`
    );
  }

  return matchIndex + 2;
}