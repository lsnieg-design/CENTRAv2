import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

const DEFAULT_ROLES = [
  {
    id: 'admin',
    name: 'Administrador',
    description: 'Acceso general a la administración de CENTRA.',
    systemRole: true
  },
  {
    id: 'directivo',
    name: 'Equipo Directivo',
    description: 'Gestión institucional y supervisión.',
    systemRole: false
  }
];

const DEFAULT_STAFF_ROLES = [
  {
    id: 'docente',
    name: 'Docente',
    description: 'Responsable pedagógico de grupo o estudiante.',
    requiredForGroup: true
  }
];

const DEFAULT_TURNS = [
  {
    id: 'turno_manana',
    name: 'Mañana',
    shortName: 'Mañana',
    active: true
  },
  {
    id: 'turno_tarde',
    name: 'Tarde',
    shortName: 'Tarde',
    active: true
  }
];

const DEFAULT_SCHEDULE_TYPES = [
  {
    id: 'simple',
    name: 'Jornada simple',
    active: true
  },
  {
    id: 'double',
    name: 'Doble jornada',
    active: true
  }
];

/**
 * Inicializa una instalación nueva de CENTRA.
 *
 * Esta función:
 * - vincula el primer usuario con una persona;
 * - crea el perfil de personal;
 * - crea la cuenta institucional;
 * - guarda la configuración inicial;
 * - guarda los valores base de arquitectura;
 * - deja preparados roles, cargos, turnos y jornadas.
 *
 * No crea datos institucionales ficticios.
 */
export async function initializeCENTRAInstallation({
  db,
  appId,
  authUser,
  adminProfile
}) {
  if (!db) {
    throw new Error(
      'No hay conexión con Firebase.'
    );
  }

  if (!appId) {
    throw new Error(
      'No se encontró el identificador de la instalación.'
    );
  }

  if (!authUser?.uid) {
    throw new Error(
      'No se encontró el usuario autenticado.'
    );
  }

  const basePath = [
    'artifacts',
    appId,
    'public',
    'data'
  ];

  const now = serverTimestamp();

  const personId =
    adminProfile?.personId ||
    authUser.uid;

  const institutionId = appId;

  const firstName =
    adminProfile?.firstName || '';

  const lastName =
    adminProfile?.lastName || '';

  const fullName =
    adminProfile?.fullName ||
    `${firstName} ${lastName}`.trim();

  const email =
    adminProfile?.email ||
    authUser.email ||
    '';

  // =========================================================
  // 1. PERSONA
  // =========================================================

  await setDoc(
    doc(
      db,
      ...basePath,
      'people',
      personId
    ),
    {
      firstName,
      lastName,
      fullName,
      email,

      type: 'staff',

      active: true,

      createdAt: now,
      updatedAt: now
    },
    {
      merge: true
    }
  );

  // =========================================================
  // 2. PERFIL DE PERSONAL
  // =========================================================

  await setDoc(
    doc(
      db,
      ...basePath,
      'staff_profiles',
      personId
    ),
    {
      personId,

      createdAt: now,
      updatedAt: now
    },
    {
      merge: true
    }
  );

  // =========================================================
  // 3. CUENTA DE USUARIO
  // =========================================================

  await setDoc(
    doc(
      db,
      ...basePath,
      'users',
      authUser.uid
    ),
    {
      personId,
      authUid: authUser.uid,

      accessRoleId: 'admin',
      accessRole: 'Administrador',

      active: true,

      createdAt: now,
      updatedAt: now
    },
    {
      merge: true
    }
  );

  // =========================================================
  // 4. CONFIGURACIÓN INSTITUCIONAL INICIAL
  // =========================================================

  await setDoc(
    doc(
      db,
      ...basePath,
      'config',
      'institution'
    ),
    {
      institutionId,

      installationComplete: true,

      architectureVersion: 1,

      appVersion: '1.0.0',

      roles: DEFAULT_ROLES,

      staffRoles:
        DEFAULT_STAFF_ROLES,

      turns:
        DEFAULT_TURNS,

      scheduleTypes:
        DEFAULT_SCHEDULE_TYPES,

      updatedAt: now
    },
    {
      merge: true
    }
  );

  // =========================================================
  // 5. CONTROL DE INSTALACIÓN
  // =========================================================

  await setDoc(
    doc(
      db,
      ...basePath,
      'system',
      'setup'
    ),
    {
      initialized: true,

      architectureVersion: 1,

      appVersion: '1.0.0',

      institutionId,

      initializedBy:
        authUser.uid,

      initializedAt: now,

      updatedAt: now
    },
    {
      merge: true
    }
  );

  return {
    personId,

    institutionId,

    architectureVersion: 1,

    appVersion: '1.0.0'
  };
}
