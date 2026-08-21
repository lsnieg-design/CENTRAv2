import {
  collection,
  query,
  where,
  orderBy,
  getDocs
} from 'firebase/firestore';

import {
  createPublicDocument,
  getPublicDocument,
  updatePublicDocument,
  deletePublicDocument,
  publicCollectionRef
} from './firestore';

import { COLLECTIONS } from './collections';

export async function getGroup(
  db,
  appId,
  groupId
) {
  return getPublicDocument(
    db,
    appId,
    COLLECTIONS.GROUPS,
    groupId
  );
}

export async function getGroups(
  db,
  appId,
  {
    activeOnly = true
  } = {}
) {
  const ref = publicCollectionRef(
    db,
    appId,
    COLLECTIONS.GROUPS
  );

  const constraints = [];

  if (activeOnly) {
    constraints.push(
      where('active', '==', true)
    );
  }

  constraints.push(
    orderBy('name', 'asc')
  );

  const snapshot = await getDocs(
    query(
      ref,
      ...constraints
    )
  );

  return snapshot.docs.map(
    doc => ({
      id: doc.id,
      ...doc.data()
    })
  );
}

export async function createGroup(
  db,
  appId,
  data
) {
  const now =
    new Date().toISOString();

  const normalized = {
    name:
      String(data.name || '')
        .trim(),

    siteId:
      data.siteId || null,

    levelId:
      data.levelId || null,

    sectionId:
      data.sectionId || null,

    // Un grupo puede funcionar en uno o varios turnos.
    turnIds:
      Array.isArray(data.turnIds)
        ? data.turnIds
        : [],

    scheduleType:
      data.scheduleType ||
      'simple',

    // Roles habilitados para este grupo.
    enabledRoles:
      Array.isArray(
        data.enabledRoles
      )
        ? data.enabledRoles
        : ['docente'],

    active:
      data.active !== false,

    createdAt:
      data.createdAt || now,

    updatedAt:
      now
  };

  if (!normalized.name) {
    throw new Error(
      'El grupo necesita un nombre.'
    );
  }

  if (
    !normalized.enabledRoles.includes(
      'docente'
    )
  ) {
    normalized.enabledRoles.unshift(
      'docente'
    );
  }

  return createPublicDocument(
    db,
    appId,
    COLLECTIONS.GROUPS,
    normalized
  );
}

export async function updateGroup(
  db,
  appId,
  groupId,
  data
) {
  const normalized = {
    ...data,
    updatedAt:
      new Date().toISOString()
  };

  if (
    Array.isArray(
      normalized.enabledRoles
    ) &&
    !normalized.enabledRoles.includes(
      'docente'
    )
  ) {
    normalized.enabledRoles.unshift(
      'docente'
    );
  }

  return updatePublicDocument(
    db,
    appId,
    COLLECTIONS.GROUPS,
    groupId,
    normalized
  );
}

export async function archiveGroup(
  db,
  appId,
  groupId
) {
  return updateGroup(
    db,
    appId,
    groupId,
    {
      active: false,
      archivedAt:
        new Date().toISOString()
    }
  );
}

export async function deleteGroup(
  db,
  appId,
  groupId
) {
  return deletePublicDocument(
    db,
    appId,
    COLLECTIONS.GROUPS,
    groupId
  );
}
