export const DEFAULT_APP_CONFIG = {
  // =========================================================
  // IDENTIDAD INSTITUCIONAL
  // =========================================================

  institutionName: 'Mi Institución',
  institutionShortName: 'Mi Institución',
  portalTitle: 'Portal Institucional',
  appName: 'Gestión Institucional',

  institutionType: 'Otro',
  institutionDescription: '',

  logoUrl: '/icon-192.png',

  // =========================================================
  // IDENTIDAD VISUAL
  // =========================================================

  primaryColor: '#6d28d9',
  secondaryColor: '#f97316',
  backgroundColor: '#f8fafc',
  textColor: '#1e293b',
  palette: 'violet-orange',

  // =========================================================
  // PERMISOS
  // =========================================================

  rolePermissions: {},

  // =========================================================
  // DOCUMENTOS
  // =========================================================

  document: {
    header: '',
    footer: '',
    signatureName: '',
    signatureRole: '',
    showLogo: true
  },

  // =========================================================
  // NOMBRES / NOMENCLATURAS
  // =========================================================

  labels: {
    person: 'Estudiante',
    people: 'Estudiantes',

    staff: 'Personal',

    group: 'Grupo',
    groups: 'Grupos',

    file: 'Legajo',
    files: 'Legajos',

    level: 'Nivel',
    levels: 'Niveles',

    section: 'Sección',
    sections: 'Secciones',

    area: 'Área',
    areas: 'Áreas',

    team: 'Equipo',
    teams: 'Equipos',

    site: 'Sede',
    sites: 'Sedes'
  },

  // =========================================================
  // DATOS INSTITUCIONALES
  // =========================================================

  address: '',
  phone: '',
  email: '',
  website: '',
  city: '',
  province: '',
  country: 'Argentina',

  schoolYear: new Date().getFullYear(),

  locale: 'es-AR',
  timezone: 'America/Argentina/Buenos_Aires',

  // =========================================================
  // LISTAS CONFIGURABLES
  // =========================================================

  turns: [
    'Mañana',
    'Tarde',
    'Alternado',
    'Vespertino',
    'Doble'
  ],

  modalities: [
    'Sede',
    'Inclusión'
  ],

  eventTypes: [
    'GENERAL',
    'ADMINISTRATIVO',
    'INFORMES',
    'EVENTOS',
    'ACTOS',
    'EFEMÉRIDES',
    'CUMPLEAÑOS'
  ],

  // Configuración visual de los tipos de evento.
  // eventTypes sigue siendo una lista de IDs para no romper
  // las secciones que todavía trabajan con strings.
  eventTypeSettings: {
    GENERAL: {
      name: 'General',
      color: '#64748b'
    },
    ADMINISTRATIVO: {
      name: 'Administrativo',
      color: '#f59e0b'
    },
    INFORMES: {
      name: 'Informes',
      color: '#3b82f6'
    },
    EVENTOS: {
      name: 'Eventos',
      color: '#8b5cf6'
    },
    ACTOS: {
      name: 'Actos',
      color: '#f97316'
    },
    EFEMÉRIDES: {
      name: 'Efemérides',
      color: '#06b6d4'
    },
    CUMPLEAÑOS: {
      name: 'Cumpleaños',
      color: '#ec4899'
    }
  },

  roles: [
    'Docente',
    'Equipo Directivo',
    'Equipo Técnico',
    'Auxiliar/Preceptor',
    'Profes Especiales',
    'Administración'
  ],

  holidays: [],

  // =========================================================
  // ESTRUCTURA INSTITUCIONAL
  // =========================================================

  sites: [],
  levels: [],
  sections: [],
  areas: [],
  teams: [],

  // =========================================================
  // MÓDULOS / FUNCIONALIDADES
  // =========================================================

  features: {
    calendar: true,
    tasks: true,
    studentFiles: true,
    resources: true,
    reports: true,
    social: true,
    medical: true,
    evaluations: true,
    externalReports: true,
    notifications: true
  },

  activeModules: {},

  // =========================================================
  // PLAN / PAQUETE
  // =========================================================

  plan: {
    name: 'Personalizado',
    key: 'custom'
  },

  // =========================================================
  // INSTALACIÓN
  // =========================================================

  installation: {
    complete: false
  },

  // =========================================================
  // CONFIGURACIÓN DE TAREAS
  // =========================================================

  taskSettings: {
    enabled: true,

    // Estados disponibles para las tareas
    statuses: [
      {
        id: 'pending',
        label: 'Pendiente'
      },
      {
        id: 'in_progress',
        label: 'En proceso'
      },
      {
        id: 'completed',
        label: 'Completada'
      }
    ],

    // Prioridades disponibles
    priorities: [
      {
        id: 'low',
        label: 'Baja'
      },
      {
        id: 'medium',
        label: 'Media'
      },
      {
        id: 'high',
        label: 'Alta'
      }
    ],

    // Tipos de tarea
    types: [
      'Administrativa',
      'Pedagógica',
      'Seguimiento',
      'Institucional'
    ],

    // Formas de asignar
    assignmentTypes: [
      'user',
      'role',
      'team'
    ],

    // Quiénes pueden crear tareas
    createAllowedRoles: [
      'Equipo Directivo',
      'Equipo Técnico',
      'Administración'
    ],

    // Si se permite asignar a usuarios
    allowUserAssignment: true,

    // Si se permite asignar a roles
    allowRoleAssignment: true,

    // Si se permite asignar a equipos
    allowTeamAssignment: true,

    // Si los comentarios están disponibles
    allowComments: true,

    // Si la fecha de vencimiento es obligatoria
    requireDueDate: false,

    // Si se puede programar la aparición
    allowScheduling: true,

    // Si se puede editar una tarea luego de crearla
    allowEditing: true,

    // Si el creador puede eliminar
    allowDeleting: true
  }
};


// =============================================================
// CLAVE DE STORAGE LOCAL
// =============================================================

export const APP_CONFIG_STORAGE_KEY = 'institution_app_config';


// =============================================================
// PALETAS
// =============================================================

export const PALETTES = {

  'violet-orange': {
    name: 'Violeta + naranja',
    primary: '#6d28d9',
    secondary: '#f97316',
    background: '#f8fafc',
    text: '#1e293b'
  },

  'blue-teal': {
    name: 'Azul + turquesa',
    primary: '#2563eb',
    secondary: '#0f766e',
    background: '#f8fafc',
    text: '#172033'
  },

  'rose-amber': {
    name: 'Rosa + ámbar',
    primary: '#e11d48',
    secondary: '#d97706',
    background: '#fffaf7',
    text: '#292524'
  },

  'navy-sky': {
    name: 'Azul noche + cielo',
    primary: '#0f3d66',
    secondary: '#0284c7',
    background: '#f5f9fc',
    text: '#172033'
  },

  'green-blue': {
    name: 'Verde + azul',
    primary: '#15803d',
    secondary: '#0f766e',
    background: '#f6fbf7',
    text: '#1b2a22'
  },

  neutral: {
    name: 'Neutros',
    primary: '#475569',
    secondary: '#64748b',
    background: '#f8fafc',
    text: '#1e293b'
  }
};


// =============================================================
// TIPOS DE INSTITUCIÓN
// =============================================================

export const INSTITUTION_TYPES = [
  'Escuela especial',
  'Escuela común',
  'Centro de día',
  'Centro terapéutico',
  'Instituto',
  'ONG',
  'Organización social',
  'Otro'
];


// =============================================================
// PLANES
// =============================================================

export const PLAN_OPTIONS = [

  {
    key: 'basic',
    name: 'Básico',
    description: 'Conjunto inicial de módulos esenciales.'
  },

  {
    key: 'standard',
    name: 'Intermedio',
    description: 'Incluye gestión, seguimiento y reportes.'
  },

  {
    key: 'complete',
    name: 'Completo',
    description: 'Acceso a todos los módulos disponibles.'
  },

  {
    key: 'custom',
    name: 'Personalizado',
    description: 'Módulos elegidos de forma específica para la institución.'
  }

];


// =============================================================
// MÓDULOS
// =============================================================

export const MODULES = [

  ['dashboard', 'Inicio'],

  ['tasks', 'Tareas'],

  ['calendar', 'Agenda'],

  ['groups', 'Mi Aula'],

  ['matricula', 'Legajos'],

  ['resources', 'Recursos'],

  ['social', 'Trabajo Social'],

  ['proyecto', 'Proyecto institucional'],

  ['informes', 'Informes pedagógicos'],

  ['informes_externos', 'Informes externos'],

  ['evaluations', 'Evaluaciones'],

  ['equipo', 'Equipo Técnico'],

  ['medical', 'Área médica'],

  ['admin', 'Administración'],

  ['personal', 'Personal'],

  ['notifications', 'Notificaciones'],

  ['users', 'Gestión de usuarios'],

  ['audit', 'Auditoría'],

  ['configuracion', 'Configuración']

];


// =============================================================
// CATÁLOGO DE MÓDULOS
// =============================================================

export const MODULE_CATALOG = {

  dashboard: {
    description: 'Inicio y resumen general',
    required: true,
    category: 'Núcleo'
  },

  tasks: {
    description: 'Tareas y pendientes',
    category: 'Gestión'
  },

  calendar: {
    description: 'Agenda, eventos y calendario',
    category: 'Gestión'
  },

  groups: {
    description: 'Aulas, grupos y estudiantes',
    category: 'Personas'
  },

  matricula: {
    description: 'Legajos y matrícula',
    category: 'Personas'
  },

  resources: {
    description: 'Recursos institucionales',
    category: 'Gestión'
  },

  social: {
    description: 'Seguimiento de Trabajo Social',
    category: 'Equipos'
  },

  proyecto: {
    description: 'Proyectos institucionales',
    category: 'Gestión'
  },

  informes: {
    description: 'Informes pedagógicos',
    category: 'Documentos'
  },

  informes_externos: {
    description: 'Informes para terceros',
    category: 'Documentos'
  },

  evaluations: {
    description: 'Evaluaciones por áreas',
    category: 'Seguimiento'
  },

  equipo: {
    description: 'Gestión del Equipo Técnico',
    category: 'Equipos'
  },

  medical: {
    description: 'Información y seguimiento del área médica',
    category: 'Equipos'
  },

  admin: {
    description: 'Documentación administrativa',
    category: 'Administración'
  },

  personal: {
    description: 'Gestión del personal',
    category: 'Administración'
  },

  notifications: {
    description: 'Avisos y notificaciones',
    category: 'Comunicación'
  },

  users: {
    description: 'Usuarios y permisos',
    category: 'Administración'
  },

  audit: {
    description: 'Auditoría y actividad del sistema',
    category: 'Administración'
  },

  configuracion: {
    description: 'Configuración de la institución',
    required: true,
    category: 'Núcleo'
  }

};


// =============================================================
// COMPATIBILIDAD CON FEATURES ANTIGUAS
// =============================================================

const LEGACY_FEATURE_MAP = {

  calendar: 'calendar',

  tasks: 'tasks',

  studentFiles: 'matricula',

  resources: 'resources',

  reports: 'informes',

  social: 'social',

  medical: 'medical',

  evaluations: 'evaluations',

  externalReports: 'informes_externos',

  notifications: 'notifications'

};


// =============================================================
// COMPROBAR SI UN MÓDULO ESTÁ ACTIVO
// =============================================================

export function isModuleEnabled(config, moduleId) {

  if (MODULE_CATALOG[moduleId]?.required) {
    return true;
  }

  if (
    config?.activeModules &&
    Object.prototype.hasOwnProperty.call(
      config.activeModules,
      moduleId
    )
  ) {

    return config.activeModules[moduleId] !== false;

  }

  const legacyKey = Object.entries(
    LEGACY_FEATURE_MAP
  ).find(
    ([, id]) => id === moduleId
  )?.[0];

  if (
    legacyKey &&
    config?.features &&
    config.features[legacyKey] === false
  ) {

    return false;

  }

  return true;
}


// =============================================================
// ETIQUETAS DE FEATURES ANTIGUAS
// =============================================================

export const FEATURE_LABELS = {

  calendar: 'Agenda',

  tasks: 'Tareas',

  studentFiles: 'Legajos',

  resources: 'Recursos',

  reports: 'Informes',

  social: 'Trabajo Social',

  medical: 'Área médica',

  evaluations: 'Evaluaciones',

  externalReports: 'Informes externos',

  notifications: 'Notificaciones'

};


// =============================================================
// PERMISOS POR ROL
// =============================================================

export function defaultPermissionsForRole(role) {

  const all = Object.fromEntries(
    MODULES.map(
      ([id]) => [id, false]
    )
  );

  all.dashboard = true;
  all.tasks = true;
  all.calendar = true;
  all.groups = true;

  if (
    [
      'admin',
      'super-admin',
      'Administración',
      'Equipo Directivo',
      'Dirección Inclusión'
    ].includes(role)
  ) {

    for (const [id] of MODULES) {
      all[id] = true;
    }

  } else if (
    [
      'Equipo Técnico',
      'Equipo Técnico Inclusión'
    ].includes(role)
  ) {

    [
      'matricula',
      'resources',
      'social',
      'proyecto',
      'informes',
      'informes_externos',
      'evaluations',
      'equipo',
      'notifications'
    ].forEach(
      id => {
        all[id] = true;
      }
    );

  } else if (
    [
      'Docente',
      'DAI',
      'Inclusión',
      'Profes Especiales'
    ].includes(role)
  ) {

    [
      'matricula',
      'resources',
      'social',
      'proyecto',
      'informes',
      'notifications'
    ].forEach(
      id => {
        all[id] = true;
      }
    );

  } else if (
    role === 'Auxiliar/Preceptor'
  ) {

    [
      'matricula',
      'resources',
      'notifications'
    ].forEach(
      id => {
        all[id] = true;
      }
    );

  }

  return all;
}


// =============================================================
// OBTENER PERMISOS DEL ROL
// =============================================================

export function getRolePermissions(
  config,
  role
) {

  const defaults =
    defaultPermissionsForRole(role);

  return {
    ...defaults,
    ...(config?.rolePermissions?.[role] || {})
  };

}


// =============================================================
// COMPROBAR ACCESO A MÓDULO
// =============================================================

export function canAccessModule(
  config,
  role,
  moduleId
) {

  if (
    !isModuleEnabled(
      config,
      moduleId
    )
  ) {
    return false;
  }

  if (
    role === 'super-admin' ||
    role === 'admin'
  ) {
    return true;
  }

  return !!getRolePermissions(
    config,
    role
  )[moduleId];

}


// =============================================================
// NORMALIZAR CONFIGURACIÓN
// =============================================================

export function normalizeAppConfig(
  value = {}
) {

  const merged = {

    ...DEFAULT_APP_CONFIG,

    ...value,

    document: {
      ...DEFAULT_APP_CONFIG.document,
      ...(value.document || {})
    },

    labels: {
      ...DEFAULT_APP_CONFIG.labels,
      ...(value.labels || {})
    },

    features: {
      ...DEFAULT_APP_CONFIG.features,
      ...(value.features || {})
    },

    plan: {
      ...DEFAULT_APP_CONFIG.plan,
      ...(value.plan || {})
    },

    installation: {
      ...DEFAULT_APP_CONFIG.installation,
      ...(value.installation || {})
    },

     taskSettings: {
      ...DEFAULT_APP_CONFIG.taskSettings,
      ...(value.taskSettings || {})
    },

    eventTypeSettings: {
      ...DEFAULT_APP_CONFIG.eventTypeSettings,
      ...(value.eventTypeSettings || {})
    }

  };


  // ----------------------------------------------------------
  // STATUS DE TAREAS
  // ----------------------------------------------------------

  if (
    !Array.isArray(
      merged.taskSettings.statuses
    )
  ) {

    merged.taskSettings.statuses =
      DEFAULT_APP_CONFIG.taskSettings.statuses;

  }


  // ----------------------------------------------------------
  // PRIORIDADES
  // ----------------------------------------------------------

  if (
    !Array.isArray(
      merged.taskSettings.priorities
    )
  ) {

    merged.taskSettings.priorities =
      DEFAULT_APP_CONFIG.taskSettings.priorities;

  }


  // ----------------------------------------------------------
  // TIPOS DE TAREA
  // ----------------------------------------------------------

  if (
    !Array.isArray(
      merged.taskSettings.types
    )
  ) {

    merged.taskSettings.types =
      DEFAULT_APP_CONFIG.taskSettings.types;

  }
  // ----------------------------------------------------------
  // TIPOS DE EVENTO
  // ----------------------------------------------------------

  const defaultEventColors = [
    '#64748b',
    '#f59e0b',
    '#3b82f6',
    '#8b5cf6',
    '#f97316',
    '#06b6d4',
    '#ec4899',
    '#22c55e',
    '#ef4444',
    '#14b8a6'
  ];

  const normalizedEventTypeSettings = {
    ...DEFAULT_APP_CONFIG.eventTypeSettings,
    ...(merged.eventTypeSettings || {})
  };

  (merged.eventTypes || []).forEach(
    (type, index) => {
      const id = String(type);

      if (!normalizedEventTypeSettings[id]) {
        normalizedEventTypeSettings[id] = {
          name: id
            .toLowerCase()
            .replaceAll('_', ' ')
            .replace(/\b\w/g, char => char.toUpperCase()),
          color:
            defaultEventColors[
              index % defaultEventColors.length
            ]
        };
      }
    }
  );

  merged.eventTypeSettings =
    normalizedEventTypeSettings;

  // ----------------------------------------------------------
  // TIPOS DE ASIGNACIÓN
  // ----------------------------------------------------------

  if (
    !Array.isArray(
      merged.taskSettings.assignmentTypes
    )
  ) {

    merged.taskSettings.assignmentTypes =
      DEFAULT_APP_CONFIG.taskSettings.assignmentTypes;

  }


  // ----------------------------------------------------------
  // MÓDULOS
  // ----------------------------------------------------------

  const defaultActiveModules =
    Object.fromEntries(
      MODULES.map(
        ([id]) => [id, true]
      )
    );

  const hasExplicitModules =
    value &&
    Object.prototype.hasOwnProperty.call(
      value,
      'activeModules'
    );

  merged.activeModules = {

    ...defaultActiveModules,

    ...(hasExplicitModules
      ? (value.activeModules || {})
      : {})

  };


  // ----------------------------------------------------------
  // COMPATIBILIDAD CON FEATURES VIEJAS
  // ----------------------------------------------------------

  if (
    !hasExplicitModules &&
    value?.features
  ) {

    Object.entries(
      LEGACY_FEATURE_MAP
    ).forEach(
      ([legacyKey, moduleId]) => {

        if (
          value.features[legacyKey] === false
        ) {

          merged.activeModules[
            moduleId
          ] = false;

        }

      }
    );

  }


  // ----------------------------------------------------------
  // MÓDULOS OBLIGATORIOS
  // ----------------------------------------------------------

  MODULES.forEach(
    ([id]) => {

      if (
        MODULE_CATALOG[id]?.required
      ) {

        merged.activeModules[id] = true;

      }

    }
  );


  // ----------------------------------------------------------
  // ROLES
  // ----------------------------------------------------------

  const allRoles =
    Array.from(
      new Set([
        ...(merged.roles || []),
        ...Object.keys(
          merged.rolePermissions || {}
        )
      ])
    );


  const permissions = {
    ...merged.rolePermissions
  };


  allRoles.forEach(
    role => {

      permissions[role] =
        getRolePermissions(
          {
            ...merged,
            rolePermissions: permissions
          },
          role
        );

    }
  );


  merged.rolePermissions =
    permissions;


  // ----------------------------------------------------------
  // LISTAS
  // ----------------------------------------------------------

  [
    'turns',
    'modalities',
    'eventTypes',
    'roles',
    'holidays',
    'sites',
    'levels',
    'sections',
    'areas',
    'teams'
  ].forEach(
    key => {

      if (
        !Array.isArray(
          merged[key]
        )
      ) {

        merged[key] =
          DEFAULT_APP_CONFIG[key];

      }

    }
  );


  return merged;
}
// =============================================================
// TIPOS DE EVENTO
// =============================================================

export function getEventTypeConfig(config, type) {
  const normalized = normalizeAppConfig(config);

  const fallbackName = String(type || 'GENERAL')
    .toLowerCase()
    .replaceAll('_', ' ')
    .replace(/\b\w/g, char => char.toUpperCase());

  return (
    normalized.eventTypeSettings?.[type] || {
      name: fallbackName,
      color: '#64748b'
    }
  );
}

export function getEventTypesConfig(config) {
  const normalized = normalizeAppConfig(config);

  return (normalized.eventTypes || []).map(type => ({
    id: type,
    ...(normalized.eventTypeSettings?.[type] || {
      name: String(type)
        .toLowerCase()
        .replaceAll('_', ' ')
        .replace(/\b\w/g, char => char.toUpperCase()),
      color: '#64748b'
    })
  }));
}

// =============================================================
// CONFIGURACIÓN LOCAL
// =============================================================

export function getCachedAppConfig() {

  try {

    const saved =
      localStorage.getItem(
        APP_CONFIG_STORAGE_KEY
      );

    return saved
      ? normalizeAppConfig(
          JSON.parse(saved)
        )
      : DEFAULT_APP_CONFIG;

  } catch {

    return DEFAULT_APP_CONFIG;

  }

}


// =============================================================
// GUARDAR CONFIGURACIÓN LOCAL
// =============================================================

export function cacheAppConfig(
  config
) {

  const normalized =
    normalizeAppConfig(
      config
    );

  try {

    localStorage.setItem(
      APP_CONFIG_STORAGE_KEY,
      JSON.stringify(
        normalized
      )
    );

  } catch {}

  return normalized;
}


// =============================================================
// APLICAR IDENTIDAD VISUAL
// =============================================================

export function applyBranding(
  config
) {

  const c =
    normalizeAppConfig(
      config
    );

  if (
    typeof document === 'undefined'
  ) {

    return;

  }

  const root =
    document.documentElement;

  const palette =
    PALETTES[c.palette] || null;

  const primary =
    palette?.primary ||
    c.primaryColor;

  const secondary =
    palette?.secondary ||
    c.secondaryColor;

  const background =
    palette?.background ||
    c.backgroundColor;

  const text =
    palette?.text ||
    c.textColor;


  root.style.setProperty(
    '--app-primary',
    primary
  );

  root.style.setProperty(
    '--app-secondary',
    secondary
  );

  root.style.setProperty(
    '--app-background',
    background
  );

  root.style.setProperty(
    '--app-text',
    text
  );

  root.style.setProperty(
    '--app-primary-soft',
    `${primary}18`
  );

  root.style.setProperty(
    '--app-secondary-soft',
    `${secondary}18`
  );


  let style =
    document.getElementById(
      'app-dynamic-branding'
    );


  if (!style) {

    style =
      document.createElement(
        'style'
      );

    style.id =
      'app-dynamic-branding';

    document.head.appendChild(
      style
    );

  }


  style.textContent = `

    .bg-violet-800 {
      background-color:
        var(--app-primary)
        !important;
    }

    .bg-violet-700 {
      background-color:
        var(--app-primary)
        !important;
    }

    .bg-violet-600 {
      background-color:
        var(--app-primary)
        !important;
    }

    .text-violet-600 {
      color:
        var(--app-primary)
        !important;
    }

    .text-violet-700 {
      color:
        var(--app-primary)
        !important;
    }

    .text-violet-900 {
      color:
        color-mix(
          in srgb,
          var(--app-primary) 72%,
          #111827
        )
        !important;
    }

    .bg-violet-50 {
      background-color:
        var(--app-primary-soft)
        !important;
    }

    .border-violet-100 {
      border-color:
        color-mix(
          in srgb,
          var(--app-primary) 18%,
          white
        )
        !important;
    }

    .border-violet-600 {
      border-color:
        var(--app-primary)
        !important;
    }

    .text-orange-500 {
      color:
        var(--app-secondary)
        !important;
    }

    .text-orange-600 {
      color:
        var(--app-secondary)
        !important;
    }

    .bg-orange-500 {
      background-color:
        var(--app-secondary)
        !important;
    }

    .bg-orange-50 {
      background-color:
        var(--app-secondary-soft)
        !important;
    }

  `;


  document.title =
    c.portalTitle ||
    c.appName;

}


// =============================================================
// NOMBRE DE LA INSTITUCIÓN
// =============================================================

export function getInstitutionName() {

  return (
    getCachedAppConfig()
      .institutionName ||
    'Mi Institución'
  );

}
