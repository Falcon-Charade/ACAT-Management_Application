(function () {
  // In Apps Script production, google.script.run already exists.
  if (window.google?.script?.run) {
    return;
  }

  const useremail = "tsutek@example.com";

  console.info('[ACAT DEV] Using mock google.script.run');

  const mockState = {
    members: [
      {
        "Member Id": 1,
        "Member Name": "Tsutek",
        "Role": "Member",
        "Recruiter": "",
        "Stage": "Complete",
        "Discord Join Date": "08/09/2025",
        "Training/Induction Done": false,
        "Progression to Applicant": "05/08/2025",
        "Main Missions Joined": "",
        "Other Missions Joined": "",
        "Ready to Progress": false,
        "Progression to New Member": "05/08/2025",
        "Progression to Member": "05/08/2025",
        "Notes / Observations": ""
      },
      {
        "Member Id": 2,
        "Member Name": "Falcon Charade",
        "Role": "Member",
        "Recruiter": "",
        "Stage": "Complete",
        "Discord Join Date": "",
        "Training/Induction Done": false,
        "Progression to Applicant": "14/08/2025",
        "Main Missions Joined": "",
        "Other Missions Joined": "",
        "Ready to Progress": false,
        "Progression to New Member": "14/08/2025",
        "Progression to Member": "14/08/2025",
        "Notes / Observations": ""
      },
      {
        "Member Id": 3,
        "Member Name": "TorqueGirl",
        "Role": "Member",
        "Recruiter": "",
        "Stage": "Complete",
        "Discord Join Date": "",
        "Training/Induction Done": false,
        "Progression to Applicant": "22/08/2025",
        "Main Missions Joined": "",
        "Other Missions Joined": "",
        "Ready to Progress": false,
        "Progression to New Member": "22/08/2025",
        "Progression to Member": "22/08/2025",
        "Notes / Observations": ""
      },
      {
        "Member Id": 4,
        "Member Name": "UnstableF1sh",
        "Role": "Member",
        "Recruiter": "",
        "Stage": "Complete",
        "Discord Join Date": "",
        "Training/Induction Done": false,
        "Progression to Applicant": "05/08/2025",
        "Main Missions Joined": "",
        "Other Missions Joined": "",
        "Ready to Progress": false,
        "Progression to New Member": "05/08/2025",
        "Progression to Member": "05/08/2025",
        "Notes / Observations": ""
      },
      {
        "Member Id": 5,
        "Member Name": "HumeyBoi",
        "Role": "Member",
        "Recruiter": "",
        "Stage": "Complete",
        "Discord Join Date": "",
        "Training/Induction Done": false,
        "Progression to Applicant": "05/08/2025",
        "Main Missions Joined": "",
        "Other Missions Joined": "",
        "Ready to Progress": false,
        "Progression to New Member": "05/08/2025",
        "Progression to Member": "05/08/2025",
        "Notes / Observations": ""
      },
      {
        "Member Id": 6,
        "Member Name": "King of Kings",
        "Role": "Member",
        "Recruiter": "",
        "Stage": "Complete",
        "Discord Join Date": "",
        "Training/Induction Done": false,
        "Progression to Applicant": "05/08/2025",
        "Main Missions Joined": "",
        "Other Missions Joined": "",
        "Ready to Progress": false,
        "Progression to New Member": "05/08/2025",
        "Progression to Member": "05/08/2025",
        "Notes / Observations": ""
      },
      {
        "Member Id": 7,
        "Member Name": "L3ad_Magn3t",
        "Role": "New Member",
        "Recruiter": "",
        "Stage": "Complete",
        "Discord Join Date": "",
        "Training/Induction Done": false,
        "Progression to Applicant": "21/08/2025",
        "Main Missions Joined": "",
        "Other Missions Joined": "",
        "Ready to Progress": false,
        "Progression to New Member": "21/08/2025",
        "Progression to Member": "21/08/2025",
        "Notes / Observations": ""
      },
      {
        "Member Id": 8,
        "Member Name": "PBRStreetgang",
        "Role": "New Member",
        "Recruiter": "",
        "Stage": "Complete",
        "Discord Join Date": "",
        "Training/Induction Done": false,
        "Progression to Applicant": "23/08/2025",
        "Main Missions Joined": "",
        "Other Missions Joined": "",
        "Ready to Progress": false,
        "Progression to New Member": "23/08/2025",
        "Progression to Member": "23/08/2025",
        "Notes / Observations": ""
      },
      {
        "Member Id": 9,
        "Member Name": "reapers_insanity",
        "Role": "Applicant",
        "Recruiter": "",
        "Stage": "Complete",
        "Discord Join Date": "",
        "Training/Induction Done": false,
        "Progression to Applicant": "14/08/2025",
        "Main Missions Joined": "",
        "Other Missions Joined": "",
        "Ready to Progress": false,
        "Progression to New Member": "14/08/2025",
        "Progression to Member": "14/08/2025",
        "Notes / Observations": ""
      },
      {
        "Member Id": 10,
        "Member Name": "KioCipher",
        "Role": "Applicant",
        "Recruiter": "Falcon Charade",
        "Stage": "Complete",
        "Discord Join Date": "",
        "Training/Induction Done": false,
        "Progression to Applicant": "05/08/2025",
        "Main Missions Joined": "",
        "Other Missions Joined": "",
        "Ready to Progress": false,
        "Progression to New Member": "05/08/2025",
        "Progression to Member": "05/08/2025",
        "Notes / Observations": ""
      }
    ],

    pmcRecords: [
      {
        ID: 1,
        'Member Name': 'Test Member',
        Phase: 'Phase 2',
        'Scripts Allowed': 'No',
        'Assets Allowed': 'Yes',
        'Consecutive Good Missions': 2,
        Archived: false
      },
      {
        ID: 2,
        'Member Name': 'Test Member',
        Phase: 'Phase 1',
        'Scripts Allowed': 'No',
        'Assets Allowed': 'No',
        'Consecutive Good Missions': 2,
        Archived: false
      },
      {
        ID: 3,
        'Member Name': 'Test Member',
        Phase: 'Phase 3',
        'Scripts Allowed': 'Yes',
        'Assets Allowed': 'Yes',
        'Consecutive Good Missions': 2,
        Archived: false
      },
      {
        ID: 4,
        'Member Name': 'Falcon Charade',
        Phase: 'Phase 2',
        'Scripts Allowed': 'No',
        'Assets Allowed': 'Yes',
        'Consecutive Good Missions': 2,
        Archived: true
      },
      {
        ID: 5,
        'Member Name': 'Falcon Charade',
        Phase: 'Phase 2',
        'Scripts Allowed': 'No',
        'Assets Allowed': 'Yes',
        'Consecutive Good Missions': 2,
        Archived: true
      },
    ],

    trainingRecords: [
      {
        sheet: 'Medical',
        row: 2,
        status: 'Current',
        lastCompetenciesDate: '01/09/2026',
        competenciesExpiry: '01/03/2027',
        record: {
          'Member Name': 'Test Member',
          'Competencies Status': 'Current',
          'Training Completion Date': '01/09/2026',
          'Competencies Expiry': '01/03/2027',
          Archived: false
        }
      }
    ],

    roleRecords: [
      {
        sheet: 'Roles',
        row: 2,
        record: {
          'Member Name': 'Tsutek',
          'Email': 'tsutek@example.com',
          'Administrator': true,
          'Mission Creator': false,
          'Recruiter': false,
          'Trainer': true
        }
      },
      {
        sheet: 'Roles',
        row: 3,
        record: {
          'Member Name': 'Falcon Charade',
          'Email': 'falcon@example.com',
          'Administrator': false,
          'Mission Creator': true,
          'Recruiter': false,
          'Trainer': true
        }
      },
      {
        sheet: 'Roles',
        row: 4,
        record: {
          'Member Name': 'TorqueGirl',
          'Email': 'torque@example.com',
          'Administrator': false,
          'Mission Creator': false,
          'Recruiter': true,
          'Trainer': true
        }
      },
      {
        sheet: 'Roles',
        row: 5,
        record: {
          'Member Name': 'Admin User',
          'Email': 'admin@example.com',
          'Administrator': true,
          'Mission Creator': false,
          'Recruiter': false,
          'Trainer': false
        }
      },
      {
        sheet: 'Roles',
        row: 6,
        record: {
          'Member Name': 'Read Only User',
          'Email': 'readonly@example.com',
          'Administrator': false,
          'Mission Creator': false,
          'Recruiter': false,
          'Trainer': false
        }
      }
    ],

    trainingHistoryRecords: [
      {
        "Member Id": 4,
        "Member Name": "UnstableF1sh",
        "Area": "Medical",
        "Training Date": "12/10/2025",
        "Expiry Date": "12/04/2026",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 3,
        "Member Name": "TorqueGirl",
        "Area": "Support",
        "Training Date": "25/10/2025",
        "Expiry Date": "25/04/2026",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 31,
        "Member Name": "Wenza",
        "Area": "Crewman",
        "Training Date": "08/11/2025",
        "Expiry Date": "08/05/2026",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 6,
        "Member Name": "King of Kings",
        "Area": "Leadership",
        "Training Date": "22/11/2025",
        "Expiry Date": "22/05/2026",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 2,
        "Member Name": "Falcon Charade",
        "Area": "Rotary",
        "Training Date": "06/12/2025",
        "Expiry Date": "06/06/2026",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 12,
        "Member Name": "Socks",
        "Area": "Fixed Wing",
        "Training Date": "20/12/2025",
        "Expiry Date": "20/06/2026",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 14,
        "Member Name": "Hazmat",
        "Area": "UAVs and UGVs",
        "Training Date": "10/01/2026",
        "Expiry Date": "10/07/2026",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 18,
        "Member Name": "BMATT",
        "Area": "Forward Recon/Sniper",
        "Training Date": "24/01/2026",
        "Expiry Date": "24/07/2026",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 1,
        "Member Name": "Tsutek",
        "Area": "Advanced Leadership/Combat Controller",
        "Training Date": "07/02/2026",
        "Expiry Date": "07/08/2026",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 4,
        "Member Name": "UnstableF1sh",
        "Area": "Support",
        "Training Date": "21/02/2026",
        "Expiry Date": "21/08/2026",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 3,
        "Member Name": "TorqueGirl",
        "Area": "Medical",
        "Training Date": "07/03/2026",
        "Expiry Date": "07/09/2026",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 31,
        "Member Name": "Wenza",
        "Area": "Leadership",
        "Training Date": "14/03/2026",
        "Expiry Date": "14/09/2026",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 6,
        "Member Name": "King of Kings",
        "Area": "Crewman",
        "Training Date": "28/03/2026",
        "Expiry Date": "28/09/2026",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 2,
        "Member Name": "Falcon Charade",
        "Area": "Fixed Wing",
        "Training Date": "11/04/2026",
        "Expiry Date": "11/10/2026",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 12,
        "Member Name": "Socks",
        "Area": "Medical",
        "Training Date": "25/04/2026",
        "Expiry Date": "25/10/2026",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 14,
        "Member Name": "Hazmat",
        "Area": "Rotary",
        "Training Date": "09/05/2026",
        "Expiry Date": "09/11/2026",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 18,
        "Member Name": "BMATT",
        "Area": "UAVs and UGVs",
        "Training Date": "16/05/2026",
        "Expiry Date": "16/11/2026",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 1,
        "Member Name": "Tsutek",
        "Area": "Forward Recon/Sniper",
        "Training Date": "30/05/2026",
        "Expiry Date": "30/11/2026",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 4,
        "Member Name": "UnstableF1sh",
        "Area": "Medical",
        "Training Date": "06/06/2026",
        "Expiry Date": "06/12/2026",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 3,
        "Member Name": "TorqueGirl",
        "Area": "Advanced Leadership/Combat Controller",
        "Training Date": "13/06/2026",
        "Expiry Date": "13/12/2026",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 31,
        "Member Name": "Wenza",
        "Area": "Fixed Wing",
        "Training Date": "20/06/2026",
        "Expiry Date": "20/12/2026",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 6,
        "Member Name": "King of Kings",
        "Area": "Forward Recon/Sniper",
        "Training Date": "27/06/2026",
        "Expiry Date": "27/12/2026",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 2,
        "Member Name": "Falcon Charade",
        "Area": "Support",
        "Training Date": "04/07/2026",
        "Expiry Date": "04/01/2027",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 12,
        "Member Name": "Socks",
        "Area": "Leadership",
        "Training Date": "11/07/2026",
        "Expiry Date": "11/01/2027",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 14,
        "Member Name": "Hazmat",
        "Area": "Crewman",
        "Training Date": "18/07/2026",
        "Expiry Date": "18/01/2027",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 18,
        "Member Name": "BMATT",
        "Area": "Rotary",
        "Training Date": "25/07/2026",
        "Expiry Date": "25/01/2027",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 1,
        "Member Name": "Tsutek",
        "Area": "Medical",
        "Training Date": "01/08/2026",
        "Expiry Date": "01/02/2027",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 4,
        "Member Name": "UnstableF1sh",
        "Area": "Advanced Leadership/Combat Controller",
        "Training Date": "08/08/2026",
        "Expiry Date": "08/02/2027",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 3,
        "Member Name": "TorqueGirl",
        "Area": "UAVs and UGVs",
        "Training Date": "15/08/2026",
        "Expiry Date": "15/02/2027",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 31,
        "Member Name": "Wenza",
        "Area": "Support",
        "Training Date": "22/08/2026",
        "Expiry Date": "22/02/2027",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 6,
        "Member Name": "King of Kings",
        "Area": "Medical",
        "Training Date": "29/08/2026",
        "Expiry Date": "28/02/2027",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 2,
        "Member Name": "Falcon Charade",
        "Area": "Advanced Leadership/Combat Controller",
        "Training Date": "02/09/2026",
        "Expiry Date": "02/03/2027",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 12,
        "Member Name": "Socks",
        "Area": "Forward Recon/Sniper",
        "Training Date": "04/09/2026",
        "Expiry Date": "04/03/2027",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 14,
        "Member Name": "Hazmat",
        "Area": "Fixed Wing",
        "Training Date": "06/09/2026",
        "Expiry Date": "06/03/2027",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 18,
        "Member Name": "BMATT",
        "Area": "Crewman",
        "Training Date": "08/09/2026",
        "Expiry Date": "08/03/2027",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 1,
        "Member Name": "Tsutek",
        "Area": "Leadership",
        "Training Date": "10/09/2026",
        "Expiry Date": "10/03/2027",
        "Archived": false,
        "Training Type": "Trainer"
      },
      {
        "Member Id": 4,
        "Member Name": "UnstableF1sh",
        "Area": "Rotary",
        "Training Date": "12/09/2026",
        "Expiry Date": "12/03/2027",
        "Archived": false,
        "Training Type": "Trainer"
      }
    ],
    archivedTrainingRecords: []
  };

  const trainingSheets = [
    'Medical',
    'Support',
    'Crewman',
    'Leadership',
    'Rotary',
    'Fixed Wing',
    'UAVs and UGVs',
    'Forward Recon/Sniper',
    'Advanced Leadership/Combat Controller'
  ];

  const handlers = {
    getBootstrapData() {
      const roleNames = this.updateRoleNamesConfig();
    
      const roleRecord = mockState.roleRecords.find(({ record }) =>
        String(record.Email ?? record.email ?? '')
          .trim()
          .toLowerCase() === useremail.trim().toLowerCase()
      );
      
      const user = {
        email: useremail,
        name: roleRecord?.record?.['Member Name'] || ''
      };
    
      return {
        appName: 'ACAT Management Application (LOCAL MOCK)',
        user,
        permissions: this.getPermissions(user.email),
    
        // Existing bootstrap properties...
        members: structuredClone(mockState.members),
        pmcRecords: this.getPMCRecords(),
        trainingSheets,
    
        admins: roleNames.admins,
        missionCreators: roleNames.missionCreators,
        recruiters: roleNames.recruiters,
        trainers: roleNames.trainers,
        trainerCount: roleNames.trainers.length,
        webAppUrl: window.location.origin
      };
    },

    getRoleRecords() {
      if (!this.getPermissions(useremail).isAdmin) {
        throw new Error('Administrator access required.');
      }
    
      return structuredClone(
        mockState.roleRecords.map(item => ({
          row: item.row,
          memberName: item.record['Member Name'] || '',
          email: item.record.Email ?? item.record.email ?? '',
          administrator:
            item.record.Administrator === true,
          missionCreator:
            item.record['Mission Creator'] === true,
          recruiter:
            item.record.Recruiter === true,
          trainer:
            item.record.Trainer === true
        }))
      );
    },
    
    saveRoleRecords(records) {
      if (!this.getPermissions(useremail).isAdmin) {
        throw new Error('Administrator access required.');
      }
    
      if (!Array.isArray(records)) {
        throw new Error('Invalid role records.');
      }
    
      const normalizedRecords = records.map(record => {
        const memberName =
          String(record.memberName || '').trim();
    
        const email =
          String(record.email || '')
            .trim()
            .toLowerCase();
    
        if (!memberName) {
          throw new Error(
            'Every role record requires a member name.'
          );
        }
    
        if (!email) {
          throw new Error(
            `${memberName} requires an email address.`
          );
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
    
      const emails =
        normalizedRecords.map(record => record.email);
    
      if (new Set(emails).size !== emails.length) {
        throw new Error(
          'Role email addresses must be unique.'
        );
      }
    
      const currentUserEmail =
        useremail.trim().toLowerCase();
    
      const currentUserRecord =
        normalizedRecords.find(
          record => record.email === currentUserEmail
        );
    
      if (!currentUserRecord) {
        throw new Error(
          'You cannot remove your own role record or change your own email.'
        );
      }
    
      if (!currentUserRecord.administrator) {
        throw new Error(
          'You cannot remove your own administrator access.'
        );
      }
    
      normalizedRecords.forEach(record => {
        let storedRecord = mockState.roleRecords.find(
          item => item.row === record.row
        );
    
        if (!storedRecord) {
          const nextRow =
            Math.max(
              1,
              ...mockState.roleRecords.map(
                item => Number(item.row) || 1
              )
            ) + 1;
    
          storedRecord = {
            sheet: 'Roles',
            row: nextRow,
            record: {}
          };
    
          mockState.roleRecords.push(storedRecord);
        }
    
        storedRecord.record = {
          'Member Name': record.memberName,
          Email: record.email,
          Administrator: record.administrator,
          'Mission Creator': record.missionCreator,
          Recruiter: record.recruiter,
          Trainer: record.trainer
        };
      });
    
      this.updateRoleNamesConfig();
    
      return this.getRoleRecords();
    },

    getPermissions(email) {
      const normalizedEmail =
        String(email || '').trim().toLowerCase();
    
      const roleRecord = mockState.roleRecords
        .map(item => item.record)
        .find(record =>
          String(record.Email ?? record.email ?? '')
            .trim()
            .toLowerCase() === normalizedEmail
        );
    
      const hasRole = role => {
        const roleKey = Object.keys(roleRecord || {}).find(
          key =>
            key.trim().toLowerCase() ===
            role.trim().toLowerCase()
        );
    
        return Boolean(roleKey) &&
          String(roleRecord[roleKey])
            .trim()
            .toLowerCase() === 'true';
      };
    
      const isAdmin = hasRole('Administrator');
    
      return {
        isAdmin,
        isTrainer: isAdmin || hasRole('Trainer'),
        isRecruiter: isAdmin || hasRole('Recruiter'),
        isMissionCreator:
          isAdmin || hasRole('Mission Creator'),
        canView: true
      };
    },

    getMembers() {
      return structuredClone(mockState.members);
    },

    addMember(member) {
      const nextId = Math.max(0, ...mockState.members.map(m => Number(m['Member Id']) || 0)) + 1;
      mockState.members.push({
        'Member Id': nextId,
        'Member Name': member?.name || '',
        'Role': 'Awaiting Induction',
        'Stage': 'Probation',
        'Recruiter': member?.recruiter || '',
        'Discord Join Date': member?.discordJoinDate || '',
        'Main Missions Joined': 0,
        'Other Missions Joined': 0,
        'Ready to Progress': false
      });
      return structuredClone(mockState.members);
    },

    updateMember(memberId, updates) {
      const member = mockState.members.find(m => String(m['Member Id']) === String(memberId));
      if (!member) throw new Error(`Member ID ${memberId} was not found.`);
      Object.assign(member, updates || {});
      return structuredClone(mockState.members);
    },

    deleteMember(memberId) {
      const index = mockState.members.findIndex(m => String(m['Member Id']) === String(memberId));
      if (index === -1) throw new Error(`Member ID ${memberId} was not found.`);
      mockState.members.splice(index, 1);
      return structuredClone(mockState.members);
    },

    getTrainingByArea(area) {
      if (!area || area === 'All') {
        return structuredClone(mockState.trainingRecords);
      }
      return structuredClone(mockState.trainingRecords.filter(r => r.sheet === area));
    },

    getTrainingForMember(memberName) {
      return structuredClone(
        mockState.trainingRecords.filter(r =>
          String(r.record?.['Member Name'] || '').toLowerCase() === String(memberName || '').toLowerCase()
        )
      );
    },

    upsertTrainingRecord(payload) {
      const record = {
        sheet: payload.trainingSheet,
        row: mockState.trainingRecords.length + 2,
        status: payload.isTrainerRecord ? 'Trainer' : 'Current',
        lastCompetenciesDate: payload.lastCompetenciesDate || '',
        competenciesExpiry: payload.isTrainerRecord ? '' : '01/03/2027',
        record: {
          'Member Name': payload.memberName,
          'Competencies Status': payload.isTrainerRecord ? 'Trainer' : 'Current',
          'Training Completion Date': payload.lastCompetenciesDate || '',
          'Competencies Expiry': payload.isTrainerRecord ? '' : '01/03/2027',
          Archived: false
        }
      };
      mockState.trainingRecords.push(record);
      return this.getTrainingForMember(payload.memberName);
    },

    getTrainingExpiryPreview() {
      return '01/03/2027';
    },

    getTrainingConfig() {
      return trainingSheets.map(area => ({
        role: area,
        expiryMonths: 6,
        reviewDays: 30
      }));
    },

    updateTrainingConfig() {
      return this.getTrainingConfig();
    },

    getArchivedTrainingRecords() {
      return structuredClone(mockState.archivedTrainingRecords);
    },

    archiveTrainingRecord() {
      return true;
    },

    unarchiveTrainingRecord() {
      return structuredClone(mockState.archivedTrainingRecords);
    },

    deleteArchivedTrainingRecord() {
      return structuredClone(mockState.archivedTrainingRecords);
    },

    searchTrainingHistory() {
      return structuredClone(mockState.trainingHistoryRecords);
    },

    updateTrainingHistoryArchived() {
      return true;
    },

    deleteTrainingHistoryRecord() {
      return true;
    },

    getPMCRecords() {
      return structuredClone(
        mockState.pmcRecords.filter(record => {
          const archived = String(record.Archived ?? '')
            .trim()
            .toLowerCase();
    
          return !['true', 'yes', '1'].includes(archived);
        })
      );
    },

    addPMCRecord(memberName) {
      return this.createMockPMCRecord(memberName, false);
    },
    
    addPMCRecordIgnoringArchived(memberName) {
      return this.createMockPMCRecord(memberName, true).records;
    },
    
    createMockPMCRecord(memberName, ignoreArchived) {
      memberName = String(memberName || '').trim();
    
      if (!memberName) {
        throw new Error('Member name is required.');
      }
    
      const isArchived = record =>
        ['true', 'yes', '1'].includes(
          String(record.Archived ?? '').trim().toLowerCase()
        );
    
      const matchingRecords = mockState.pmcRecords.filter(record =>
        String(record['Member Name'] || '').trim().toLowerCase() ===
        memberName.toLowerCase()
      );
    
      if (matchingRecords.some(record => !isArchived(record))) {
        throw new Error(
          `${memberName} already has an active PMC record.`
        );
      }
    
      const archivedRecords = matchingRecords
        .filter(isArchived)
        .map(record => ({
          row: record._row ?? record.ID,
          id: record.ID,
          memberName: record['Member Name'],
          phase: record.Phase || '',
          scriptsAllowed: record['Scripts Allowed'] || '',
          assetsAllowed: record['Assets Allowed'] || '',
          goodMissions: record['Consecutive Good Missions'] || 0
        }))
        .sort((a, b) => Number(b.id) - Number(a.id));
    
      if (!ignoreArchived && archivedRecords.length) {
        return {
          status: 'archivedExists',
          memberName,
          archivedRecords
        };
      }
    
      const nextId = Math.max(
        0,
        ...mockState.pmcRecords.map(record => Number(record.ID) || 0)
      ) + 1;
    
      const nextRow = Math.max(
        1,
        ...mockState.pmcRecords.map(record =>
          Number(record._row ?? record.ID) || 0
        )
      ) + 1;
    
      mockState.pmcRecords.push({
        _row: nextRow,
        ID: nextId,
        'Member Name': memberName,
        Phase: 'Phase 1',
        'Scripts Allowed': 'No',
        'Assets Allowed': 'No',
        'Consecutive Good Missions': 0,
        Archived: false
      });
    
      return {
        status: 'created',
        records: structuredClone(
          mockState.pmcRecords.filter(record => !isArchived(record))
        )
      };
    },

    updatePMCRecord(row, payload) {
      const record = mockState.pmcRecords.find(
        r => String(r._row ?? r.ID) === String(row)
      );
    
      if (record) {
        Object.assign(record, payload || {});
      }
    
      return this.getPMCRecords();
    },
    
    deletePMCRecord(row) {
      const index = mockState.pmcRecords.findIndex(
        r => String(r._row ?? r.ID) === String(row)
      );
    
      if (index >= 0) {
        mockState.pmcRecords.splice(index, 1);
      }
    
      return this.getPMCRecords();
    },

    archivePMCRecord(row) {
      const record = mockState.pmcRecords.find(r => String(r._row ?? r.ID) === String(row));
      if (record) record.Archived = true;
      return structuredClone(mockState.pmcRecords.filter(r => !r.Archived));
    },

    unarchivePMCRecord(row) {
      const record = mockState.pmcRecords.find(r => String(r._row ?? r.ID) === String(row));
      if (record) record.Archived = false;
      return structuredClone(mockState.pmcRecords.filter(r => !r.Archived));
    },

    getTrainingGraphData(area, startDateString, endDateString) {
      const parseInputDate = value => {
        const [year, month, day] = value.split('-').map(Number);
        return new Date(year, month - 1, day);
      };
    
      const parseSheetDate = value => {
        const [day, month, year] = value.split('/').map(Number);
        return new Date(year, month - 1, day);
      };
    
      const formatDate = date => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
    
        return `${year}-${month}-${day}`;
      };
    
      const startDate = parseInputDate(startDateString);
      const endDate = parseInputDate(endDateString);
    
      const records = mockState.trainingHistoryRecords
        .filter(record => {
          if (record.Archived === true) {
            return false;
          }
    
          return (
            !area ||
            area === 'All' ||
            record.Area === area
          );
        })
        .map(record => ({
          memberId: String(record['Member Id']),
          area: record.Area,
          trainingDate: parseSheetDate(record['Training Date']),
          expiryDate: parseSheetDate(record['Expiry Date'])
        }));
    
      const result = [];
    
      for (
        const current = new Date(startDate);
        current <= endDate;
        current.setDate(current.getDate() + 1)
      ) {
        const activeCompetencies = new Set();
    
        records.forEach(record => {
          if (
            record.trainingDate <= current &&
            record.expiryDate >= current
          ) {
            activeCompetencies.add(
              `${record.memberId}|${record.area}`
            );
          }
        });
    
        result.push({
          date: formatDate(current),
          count: activeCompetencies.size
        });
      }
    
      return result;
    },

    getDashboardCounts() {
      return {
        trainerCount: mockState.trainers.length,
        pmcCount: mockState.pmcRecords.filter(r => !r.Archived).length,
        missionCreatorCount: 4
      };
    },

    getNamesByRole(role) {
      if (!role) return [];
      return mockState.roleRecords
        .filter(r => String(r.record?.[role] || '').toLowerCase() === 'true')
        .map(r => r.record?.['Member Name'] || '')
        .filter(name => name);
    },

    updateRoleNamesConfig() {
      const roleNames = {
        admins: this.getNamesByRole('Administrator'),
        missionCreators: this.getNamesByRole('Mission Creator'),
        recruiters: this.getNamesByRole('Recruiter'),
        trainers: this.getNamesByRole('Trainer')
      };
    
      Object.assign(mockState, roleNames);
    
      return roleNames;
    }
  };

  function cloneResult(value) {
    if (value === undefined || value === null) return value;
    try {
      return structuredClone(value);
    } catch {
      return value;
    }
  }

  function createRunner(successHandler = null, failureHandler = null) {
    return new Proxy({}, {
      get(_target, property) {
        if (property === 'withSuccessHandler') {
          return handler => createRunner(handler, failureHandler);
        }

        if (property === 'withFailureHandler') {
          return handler => createRunner(successHandler, handler);
        }

        if (property === 'withUserObject') {
          return () => createRunner(successHandler, failureHandler);
        }

        return (...args) => {
          setTimeout(() => {
            try {
              const handler = handlers[property];

              if (!handler) {
                throw new Error(
                  `[LOCAL MOCK] No mock has been created for Apps Script function "${String(property)}".`
                );
              }

              const result = handler.apply(handlers, args);
              successHandler?.(cloneResult(result));
            } catch (error) {
              console.error(error);
              if (failureHandler) {
                failureHandler(error);
              } else {
                throw error;
              }
            }
          }, 75);
        };
      }
    });
  }

  window.google = window.google || {};
  window.google.script = window.google.script || {};
  window.google.script.run = createRunner();
})();
