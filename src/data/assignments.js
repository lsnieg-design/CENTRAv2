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
// NORMALIZACIÓN DE ASIGNACIONES DE ESTUDIANTES
// ============================================================

const normalizePlacements = assignment => {
  // Modelo nuevo
  if (
    Array.isArray(
      assignment?.placements
    ) &&
    assignment.placements.length > 0
  ) {
    return assignment.placements
      .filter(
        placement =>
          placement?.groupId &&
          placement?.turnId
      )
      .map(placement => ({
        groupId: placement.groupId,
        turnId: placement.turnId
      }));
  }

  // Compatibilidad con modelo anterior
  const groupId =
    assignment?.groupId || '';

  const turnIds =
    Array.isArray(
      assignment?.turnIds
    )
      ? assignment.turnIds
      : [];

  if (!groupId) {
    return [];
  }

  return turnIds.map(turnId => ({
    groupId,
    turnId
  }));
};

const normalizeStudentAssignment =
  assignment => {
    if (!assignment) {
      return null;
    }

    const placements =
      normalizePlacements(
        assignment
      );

    return {
      ...assignment,

      placements,

      // Compatibilidad con código existente
      groupId:
        assignment.groupId ||
        placements[0]?.groupId ||
        '',

      turnIds:
        Array.isArray(
          assignment.turnIds
        ) &&
        assignment.turnIds.length > 0
          ? assignment.turnIds
          : placements.map(
              placement =>
                placement.turnId
            ),

      scheduleType:
        assignment.scheduleType ||
        'simple'
    };
  };

// ============================================================
// ESTUDIANTE → GRUPO
// ============================================================

export async function getStudentGroupAssignments(
  db,
  appId,
  studentId
) {
  const ref =
    publicCollectionRef(
      db,
      appId,
      COLLECTIONS.STUDENT_GROUP_ASSIGNMENTS
    );

  const snapshot =
    await getDocs(
      query(
        ref,
        where(
          'studentId',
          '==',
          studentId
        )
      )
    );

  return snapshot.docs.map(
    item =>
      normalizeStudentAssignment({
        id: item.id,
        ...item.data()
      })
  );
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
        item.status ===
          ASSIGNMENT_STATUS.ACTIVE &&
        !item.validTo
    ) || null
  );
}

export async function getStudentGroupAssignmentsForGroup(
  db,
  appId,
  groupId
) {
  const ref =
    publicCollectionRef(
      db,
      appId,
      COLLECTIONS.STUDENT_GROUP_ASSIGNMENTS
    );

  const snapshot =
    await getDocs(ref);

  return snapshot.docs
    .map(item =>
      normalizeStudentAssignment({
        id: item.id,
        ...item.data()
      })
    )
    .filter(assignment => {
      if (
        assignment.groupId ===
        groupId
      ) {
        return true;
      }

      return assignment.placements?.some(
        placement =>
          placement.groupId ===
          groupId
      );
    });
}

// ============================================================
// CREAR ASIGNACIÓN DE ESTUDIANTE
// ============================================================

export async function createStudentGroupAssignment(
  db,
  appId,
  data
) {
  if (!data.studentId) {
    throw new Error(
      'La asignación necesita un estudiante.'
    );
  }

  let placements = [];

  // Modelo nuevo
  if (
    Array.isArray(
      data.placements
    )
  ) {
    placements =
      data.placements
        .filter(
          placement =>
            placement?.groupId &&
            placement?.turnId
        )
        .map(placement => ({
          groupId:
            placement.groupId,
          turnId:
            placement.turnId
        }));
  }

  // Compatibilidad con llamada antigua
  if (
    placements.length === 0 &&
    data.groupId
  ) {
    const turnIds =
      Array.isArray(
        data.turnIds
      )
        ? data.turnIds
        : [];

    placements =
      turnIds.map(turnId => ({
        groupId:
          data.groupId,
        turnId
      }));
  }

  // Puede existir una asignación sin grupo,
  // pero no la creamos vacía.
  if (
    placements.length === 0
  ) {
    throw new Error(
      'La asignación necesita al menos un grupo y un turno.'
    );
  }

  const normalizedTurnIds = [
    ...new Set(
      placements.map(
        placement =>
          placement.turnId
      )
    )
  ];

  // Primer grupo para compatibilidad
  const firstGroupId =
    placements[0]?.groupId ||
    '';

  return createPublicDocument(
    db,
    appId,
    COLLECTIONS.STUDENT_GROUP_ASSIGNMENTS,
    {
      studentId:
        data.studentId,

      // --------------------------------------------------------
      // MODELO NUEVO
      // --------------------------------------------------------

      placements,

      // --------------------------------------------------------
      // COMPATIBILIDAD CON EL MODELO ANTERIOR
      // --------------------------------------------------------

      groupId:
        data.groupId ||
        firstGroupId,

      turnIds:
        normalizedTurnIds,

      scheduleType:
        data.scheduleType ||
        'simple',

      validFrom:
        data.validFrom ||
        todayISO(),

      validTo:
        data.validTo ||
        null,

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
        validTo ||
        todayISO(),

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
  const ref =
    publicCollectionRef(
      db,
      appId,
      COLLECTIONS.STAFF_GROUP_ASSIGNMENTS
    );

  const snapshot =
    await getDocs(
      query(
        ref,
        where(
          'staffId',
          '==',
          staffId
        )
      )
    );

  return snapshot.docs.map(
    doc => ({
      id: doc.id,
      ...doc.data()
    })
  );
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
  const ref =
    publicCollectionRef(
      db,
      appId,
      COLLECTIONS.STAFF_GROUP_ASSIGNMENTS
    );

  const snapshot =
    await getDocs(
      query(
        ref,
        where(
          'groupId',
          '==',
          groupId
        )
      )
    );

  return snapshot.docs.map(
    doc => ({
      id: doc.id,
      ...doc.data()
    })
  );
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
      staffId:
        data.staffId,

      groupId:
        data.groupId,

      roleId:
        data.roleId,

      turnIds:
        Array.isArray(
          data.turnIds
        )
          ? data.turnIds
          : [],

      validFrom:
        data.validFrom ||
        todayISO(),

      validTo:
        data.validTo ||
        null,

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
        validTo ||
        todayISO(),

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
