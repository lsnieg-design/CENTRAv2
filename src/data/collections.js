// -----------------------------------------------------------------------------
// CENTRA - Colecciones Firestore
// -----------------------------------------------------------------------------
// Un solo lugar para definir los nombres de las colecciones principales.
// Las vistas y servicios nuevos deben usar estas constantes en lugar de
// escribir los nombres de Firestore directamente.
// -----------------------------------------------------------------------------

export const COLLECTIONS = {
  // Personas
  PEOPLE: 'people',
  STUDENT_PROFILES: 'student_profiles',
  STAFF_PROFILES: 'staff_profiles',

  // Cuentas de acceso
  USERS: 'users',

  // Estructura institucional
  GROUPS: 'groups',

  // Relaciones
  STUDENT_GROUP_ASSIGNMENTS:
    'student_group_assignments',

  STAFF_GROUP_ASSIGNMENTS:
    'staff_group_assignments',

  // Módulos generales que ya utiliza CENTRA
  EVENTS: 'events',
  TASKS: 'tasks',
  RESOURCES: 'resources',
  ANNOUNCEMENTS: 'announcements',
  NOTIFICATIONS: 'notifications',

  // Registro / trazabilidad
  ACTIVITY_LOG: 'activity_log'
};
