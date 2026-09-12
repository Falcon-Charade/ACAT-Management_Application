
/**
 * ACAT Member Tracking Web App
 * ----------------------------
 * Configure spreadsheet IDs, sheet names and authorized user lists below.
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

  // Optional allow-lists.
  // If arrays are empty, access falls back to spreadsheet permissions.
  ADMINS: [
    'conradfolscher.cf@gmail.com',
    'tsutek92@gmail.com',
    'unstablef1shgaming@gmail.com'
  ],

  ADMIN_GROUPS: [
    'acat-admins@googlegroups.com'
  ],

  TRAINERS: [
    'falconcharade@gmail.com'
  ],

  TRAINER_GROUPS: [
    'acat-trainers@googlegroups.com'
  ],

  RECRUITERS: [
    'othersock93@gmail.com',
    'torquegirl96@gmail.com'
  ],

  RECRUITER_GROUPS: [
    'acat-recruiters@googlegroups.com'
  ],

  MISSIONCREATORS: [
    'footyfanatic99@gmail.com',
    'othersock93@gmail.com',
    'falconcharade@gmail.com'
  ],

  MISSIONCREATOR_GROUPS: [
    'acat-mission-creators@googlegroups.com'
  ],

  MISSIONCREATORNAMES: [
    // 'creator@example.com'
    'Falcon Charade',
    'HumeyBoi',
    'reapers_insanity',
    'Socks'
  ],

  RECRUITERNAMES: [
    'Socks',
    'Falcon Charade',
    'TorqueGirl'
  ],
};

function doGet() {
  return HtmlService
    .createHtmlOutputFromFile('Index')
    .setTitle(CONFIG.APP_NAME)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function getBootstrapData() {
  return {
    appName: CONFIG.APP_NAME,
    user: getCurrentUser(),
    permissions: getPermissions(),
    members: getMembers(),
    pmcRecords: getPMCRecords(),
    trainingSheets: CONFIG.TRAINING_SHEETS,
    trainerCount: getActiveTrainerCount(),
    missionCreators: getNamesByRole('Mission Creator'),//CONFIG.MISSIONCREATORSNAMES,
    recruiters: getNamesByRole('Recruiter'),//CONFIG.RECRUITERNAMES,
    trainers: getNamesByRole('Trainer'),
    admins: getNamesByRole('Administrator'),

    webAppUrl:
      ScriptApp
        .getService()
        .getUrl()
  };
}

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

/* -------------------------------------------------------------------------- */
/* Spreadsheet helpers                                                        */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Members                                                                    */
/* -------------------------------------------------------------------------- */

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

/* -------------------------------------------------------------------------- */
/* Training                                                                   */
/* -------------------------------------------------------------------------- */

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
    .filter(row => String(row[0] || '').trim() !== '')
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

function updateTrainingConfig(
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

function getArchivedTrainingRecords() {
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

function deleteArchivedTrainingRecord(
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

  return getArchivedTrainingRecords();
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

/* -------------------------------------------------------------------------- */
/* PMC Tracking                                                               */
/* -------------------------------------------------------------------------- */

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

function addPMCRecordIgnoringArchived(memberName) {
  requireAdmin_();

  memberName =
    String(memberName || '').trim();

  if (!memberName) {
    throw new Error(
      'Member name is required.'
    );
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

  return getPMCRecords();
}

/* -------------------------------------------------------------------------- */
/* Administration                                                             */
/* -------------------------------------------------------------------------- */


function getTrainingConfig() {
  requireAdmin_();

  return getTrainingConfig_();
}

function getTrainingExpiryPreview(trainingArea, lastDateString) {
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

function getRoleRecords() {
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

function saveRoleRecords(records) {
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

  const emails = normalizedRecords.map(record => record.email);

  const currentUserEmail = String(
    Session.getActiveUser().getEmail() || ''
  )
    .trim()
    .toLowerCase();
  
  const currentUserRecord = normalizedRecords.find(
    record => record.email === currentUserEmail
  );
  
  if (
    currentUserRecord &&
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

  return getRoleRecords();
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

function getDashboardCounts() {
  return {
    trainerCount:
      getActiveTrainerCount()
  };
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

function getTrainingGraphData(
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

function testGroupMembership() {
  const email =
    Session.getActiveUser().getEmail();

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

function updateRoleNamesConfig() {
  const roles = [
    'Administrator',
    'Mission Creator',
    'Trainer',
    'Recruiter'
  ];

  const config = {};

  roles.forEach(role => {
    config[role] = getNamesByRole(role);
  });

  PropertiesService.getScriptProperties().setProperty(
    'ROLE_NAMES_CONFIG',
    JSON.stringify(config)
  );

  return config;
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