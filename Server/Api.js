/** The only data RPC. Every implementation ends in _ (private to Apps Script). */
function api(operation, args, sessionToken) {
  const routes = {
    getBootstrapData: [getBootstrapData_, null],
    getCurrentUser: [getCurrentUser_, null], getPermissions: [getPermissions_, null],
    getMembers: [getMembers_, null], getPMCRecords: [getPMCRecords_, null],
    getTrainingForMember: [getTrainingForMember_, null], getTrainingByArea: [getTrainingByArea_, null],
    getDashboardCounts: [getDashboardCounts_, null], getActiveTrainerCount: [getActiveTrainerCount_, null],
    getTrainingGraphData: [getTrainingGraphData_, null],
    addMember: [addMember_, 'members.create'], updateMember: [updateMember_, 'members.edit'],
    deleteMember: [deleteMember_, 'members.delete'],
    addPMCRecord: [addPMCRecord_, 'pmc.edit'], updatePMCRecord: [updatePMCRecord_, 'pmc.edit'],
    archivePMCRecord: [archivePMCRecord_, 'pmc.archive'], unarchivePMCRecord: [unarchivePMCRecord_, 'pmc.archive'],
    deletePMCRecord: [deletePMCRecord_, 'pmc.archive'], addPMCRecordIgnoringArchived: [addPMCRecordIgnoringArchived_, 'admin.access'],
    upsertTrainingRecord: [upsertTrainingRecord_, 'training.edit'], getTrainingExpiryPreview: [getTrainingExpiryPreview_, 'training.edit'],
    archiveTrainingRecord: [archiveTrainingRecord_, 'training.archive'], unarchiveTrainingRecord: [unarchiveTrainingRecord_, 'training.archive'],
    getArchivedTrainingRecords: [getArchivedTrainingRecords_, 'admin.access'],
    deleteArchivedTrainingRecord: [deleteArchivedTrainingRecord_, 'admin.access'],
    searchTrainingHistory: [searchTrainingHistory_, 'admin.access'],
    setTrainingHistoryArchived: [setTrainingHistoryArchived_, 'admin.access'],
    deleteTrainingHistoryRecord: [deleteTrainingHistoryRecord_, 'admin.access'],
    getTrainingConfig: [getAdminTrainingConfig_, 'admin.access'], updateTrainingConfig: [updateTrainingConfig_, 'admin.access'],
    getRoleRecords: [getRoleRecords_, 'admin.access'], saveRoleRecords: [saveRoleRecords_, 'admin.access'],
    getNamesByRole: [getNamesByRole_, 'admin.access'], updateRoleNamesConfig: [updateRoleNamesConfig_, 'admin.access'],
    testGroupMembership: [testGroupMembership_, 'admin.access']
  };
  if (typeof operation !== 'string' || !Object.prototype.hasOwnProperty.call(routes, operation) ||
      !Array.isArray(args) || args.length > 8) throw new Error('Invalid operation.');
  try {
    requestUser_ = getSessionUser_(sessionToken);
    const [handler, permission] = routes[operation];
    if (permission) requirePermission_(permission);
    return filterApiResult_(operation, handler.apply(null, args), args);
  } finally {
    requestUser_ = null;
  }
}

function pickFields_(record, fields) {
  const result = {};
  fields.forEach(field => { if (Object.prototype.hasOwnProperty.call(record, field)) result[field] = record[field]; });
  return result;
}

function publicMembers_(records) {
  return records.filter(row => !isArchived_(row.Archived) && String(row.Role || '').trim().toLowerCase() !== 'banned')
    .map(row => Object.keys(row).reduce((publicRow, key) => {
      const normalized = key.trim().toLowerCase();
      if (normalized !== 'notes / observations' && key !== '_row') {
        publicRow[key] = row[key];
      }
      return publicRow;
    }, {}));
}

function visibleMemberNames_() {
  return new Set(publicMembers_(getMembers_()).map(row => String(row['Member Name'] || '').trim().toLowerCase()));
}

function publicPMC_(records) {
  const names = visibleMemberNames_();
  return records.filter(row => !isArchived_(row.Archived) && names.has(String(row['Member Name'] || '').trim().toLowerCase()))
    .map(row => pickFields_(row, ['Member Name', 'Phase', 'Scripts Allowed', 'Assets Allowed', 'Consecutive Good Missions']));
}

function filterApiResult_(operation, result, args) {
  const p = getPermissions_();
  if (operation === 'getBootstrapData') {
    result.members = p.members.viewNotes ? result.members : publicMembers_(result.members);
    result.pmcRecords = p.pmc.edit ? result.pmcRecords : publicPMC_(result.pmcRecords);
  }
  if (operation === 'getMembers' && !p.members.viewNotes) return publicMembers_(result);
  if (operation === 'getPMCRecords' && !p.pmc.edit) return publicPMC_(result);
  if (operation === 'getTrainingByArea' && !p.isAdmin) {
    const names = visibleMemberNames_();
    return result.filter(row => names.has(String(row.memberName).trim().toLowerCase()))
      .map(row => pickFields_(row, ['memberName', 'area', 'status', 'trainingDate', 'expiryDate']));
  }
  if (operation === 'getTrainingForMember' || operation === 'upsertTrainingRecord') {
    if (!p.isAdmin && operation === 'getTrainingForMember' &&
        !visibleMemberNames_().has(String(args[0] || '').trim().toLowerCase())) return [];
    // Even trainers receive no arbitrary nested spreadsheet columns.
    return result.map(row => pickFields_(row, ['sheet', 'row', 'status', 'lastCompetenciesDate', 'competenciesExpiry']));
  }
  return result;
}
