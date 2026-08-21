import {
  query,
  where,
  getDocs
} from 'firebase/firestore';

import {
  createPublicDocument,
  updatePublicDocument,
  deletePublicDocument,
  publicCollectionRef
} from './firestore';

import { COLLECTIONS } from './collections';

const todayISO = () =>
  new Date().toISOString().slice(0, 10);

export const ASSIGNMENT_STATUS = {
  ACTIVE: 'active',
  CLOSED: 'closed'
};

// ============================================================
// ESTUDIANTE → GRUPO
// ============================================================

export async function getStudentGroupAssignments(
  db,
  appId,
  studentId
) {
  const ref = publicCollectionRef(
    db,
    appId,
    COLLECTIONS.STUDENT_GROUP_ASSIGNMENTS
  );

  const snapshot = await getDocs(
    query(
      ref,
      where('studentId', '==', studentId)
    )
  );

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

export async function getActiveStudentGroupAssignment(
  db,
  appId,
  studentId
) {
  const assignments =
    await getStudentGroupAssignments(
      db,
      appId,
      studentId
    );

  return (
    assignments.find(
      item =>
        item.status === ASSIGNMENT_STATUS.ACTIVE &&
        !item.validTo
    ) || null
  );
}

export async function getStudentGroupAssignmentsForGroup(
  db,
  appId,
  groupId
) {
  const ref = publicCollectionRef(
    db,
    appId,
    COLLECTIONS.STUDENT_GROUP_ASSIGNMENTS
  );

  const snapshot = await getDocs(
    query(
      ref,
      where('groupId', '==', groupId)
    )
  );

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

export async function createStudentGroupAssignment(
  db,
  appId,
  data
) {
  if (!data.studentId || !data.groupId) {
    throw new Error(
      'La asignación necesita estudiante y grupo.'
    );
  }

  return createPublicDocument(
    db,
    appId,
    COLLECTIONS.STUDENT_GROUP_ASSIGNMENTS,
    {
      studentId: data.studentId,

      groupId: data.groupId,

      turnIds: Array.isArray(data.turnIds)
        ? data.turnIds
        : [],

      scheduleType:
        data.scheduleType || 'simple',

      validFrom:
        data.validFrom || todayISO(),

      validTo:
        data.validTo || null,

      status:
        data.status ||
        ASSIGNMENT_STATUS.ACTIVE,

      createdAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString()
    }
  );
}

export async function closeStudentGroupAssignment(
  db,
  appId,
  assignmentId,
  validTo
) {
  return updatePublicDocument(
    db,
    appId,
    COLLECTIONS.STUDENT_GROUP_ASSIGNMENTS,
    assignmentId,
    {
      status:
        ASSIGNMENT_STATUS.CLOSED,

      validTo:
        validTo || todayISO(),

      updatedAt:
        new Date().toISOString()
    }
  );
}

// ============================================================
// PERSONAL → GRUPO
// ============================================================

export async function getStaffGroupAssignments(
  db,
  appId,
  staffId
) {
  const ref = publicCollectionRef(
    db,
    appId,
    COLLECTIONS.STAFF_GROUP_ASSIGNMENTS
  );

  const snapshot = await getDocs(
    query(
      ref,
      where('staffId', '==', staffId)
    )
  );

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

export async function getActiveStaffGroupAssignments(
  db,
  appId,
  staffId
) {
  const assignments =
    await getStaffGroupAssignments(
      db,
      appId,
      staffId
    );

  return assignments.filter(
    item =>
      item.status ===
        ASSIGNMENT_STATUS.ACTIVE &&
      !item.validTo
  );
}

export async function getStaffGroupAssignmentsForGroup(
  db,
  appId,
  groupId
) {
  const ref = publicCollectionRef(
    db,
    appId,
    COLLECTIONS.STAFF_GROUP_ASSIGNMENTS
  );

  const snapshot = await getDocs(
    query(
      ref,
      where('groupId', '==', groupId)
    )
  );

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

export async function createStaffGroupAssignment(
  db,
  appId,
  data
) {
  if (
    !data.staffId ||
    !data.groupId ||
    !data.roleId
  ) {
    throw new Error(
      'La asignación necesita personal, grupo y rol.'
    );
  }

  return createPublicDocument(
    db,
    appId,
    COLLECTIONS.STAFF_GROUP_ASSIGNMENTS,
    {
      staffId: data.staffId,

      groupId: data.groupId,

      roleId: data.roleId,

      turnIds: Array.isArray(data.turnIds)
        ? data.turnIds
        : [],

      validFrom:
        data.validFrom || todayISO(),

      validTo:
        data.validTo || null,

      status:
        data.status ||
        ASSIGNMENT_STATUS.ACTIVE,

      createdAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString()
    }
  );
}

export async function closeStaffGroupAssignment(
  db,
  appId,
  assignmentId,
  validTo
) {
  return updatePublicDocument(
    db,
    appId,
    COLLECTIONS.STAFF_GROUP_ASSIGNMENTS,
    assignmentId,
    {
      status:
        ASSIGNMENT_STATUS.CLOSED,

      validTo:
        validTo || todayISO(),

      updatedAt:
        new Date().toISOString()
    }
  );
}

export async function deleteStaffGroupAssignment(
  db,
  appId,
  assignmentId
) {
  return deletePublicDocument(
    db,
    appId,
    COLLECTIONS.STAFF_GROUP_ASSIGNMENTS,
    assignmentId
  );
}
