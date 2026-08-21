import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';

import {
  Search,
  Plus,
  User,
  X,
  Edit3,
  Users,
  Filter,
  BarChart3,
  MapPin,
  Phone,
  Mail,
  CalendarDays,
  Briefcase,
  GraduationCap,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Save,
  Printer,
BookOpen,
  UserRound,
  Clock3
} from 'lucide-react';

import { COLLECTIONS } from '../data/collections';

import {
  getActiveStudentGroupAssignment,
  createStudentGroupAssignment,
  closeStudentGroupAssignment
} from '../data/assignments';

const BASE = (db, appId, collectionName) =>
  collection(
    db,
    'artifacts',
    appId,
    'public',
    'data',
    collectionName
  );

const DOC = (db, appId, collectionName, id) =>
  doc(
    db,
    'artifacts',
    appId,
    'public',
    'data',
    collectionName,
    id
  );

const normalizeText = value =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const formatDate = value => {
  if (!value) return '';

  try {
    if (value?.toDate) {
      return value.toDate().toLocaleDateString('es-AR');
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleDateString('es-AR');
  } catch {
    return '';
  }
};

const calculateAge = birthDate => {
  if (!birthDate) return null;

  try {
    const birth = new Date(birthDate);
    const today = new Date();

    let age =
      today.getFullYear() -
      birth.getFullYear();

    const monthDifference =
      today.getMonth() -
      birth.getMonth();

    if (
      monthDifference < 0 ||
      (
        monthDifference === 0 &&
        today.getDate() < birth.getDate()
      )
    ) {
      age--;
    }

    return age;
  } catch {
    return null;
  }
};

const getCurrentAssignment = student =>
  student?.groupAssignments?.find(
    assignment =>
      assignment.status === 'active' &&
      !assignment.validTo
  ) || null;

export function MatriculaView({
  user,
  db,
  appId,
  initStudentId
}) {
  // ============================================================
  // DATOS
  // ============================================================

  const [students, setStudents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [institutionConfig, setInstitutionConfig] =
    useState({});

  const [loading, setLoading] = useState(true);

  // ============================================================
  // INTERFAZ
  // ============================================================

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] =
    useState(false);
  const [showStats, setShowStats] =
    useState(false);

  const [filters, setFilters] = useState({
    status: 'active',
    level: 'all',
    group: 'all',
    turn: 'all',
    journey: 'all',
    gender: 'all'
  });

  const [viewingStudent, setViewingStudent] =
    useState(null);
  const [showBitacora, setShowBitacora] =
  useState(false);

const [bitacoraEntries, setBitacoraEntries] =
  useState([]);

const [loadingBitacora, setLoadingBitacora] =
  useState(false);

  const [editingStudent, setEditingStudent] =
    useState(null);

  const [showForm, setShowForm] =
    useState(false);

  const [saving, setSaving] =
    useState(false);

  // ============================================================
  // CARGA DE FIREBASE
  // ============================================================

  useEffect(() => {
    if (!db || !appId) return;

    setLoading(true);

    let people = [];
    let profiles = [];
    let assignments = [];

    const rebuildStudents = () => {
      const peopleById = new Map(
        people.map(person => [
          person.id,
          person
        ])
      );

      const result =
        profiles
          .map(profile => {
            const person =
              peopleById.get(
                profile.personId
              ) || {};

            const studentId =
              profile.personId ||
              person.id;

            const currentAssignments =
              assignments.filter(item =>
                item.studentId ===
                  studentId &&
                item.status ===
                  'active' &&
                !item.validTo
              );

            return {
              ...person,
              ...profile,

              id: studentId,

              personId: studentId,

              firstName:
                profile.firstName ||
                person.firstName ||
                '',

              lastName:
                profile.lastName ||
                person.lastName ||
                '',

              fullName:
                profile.fullName ||
                person.fullName ||
                `${person.firstName || ''} ${person.lastName || ''}`.trim(),

              groupAssignments:
                currentAssignments
            };
          })
          .sort((a, b) =>
            `${a.lastName} ${a.firstName}`
              .localeCompare(
                `${b.lastName} ${b.firstName}`,
                'es'
              )
          );

      setStudents(result);
      setLoading(false);
    };

    const unsubPeople = onSnapshot(
      query(
        BASE(
          db,
          appId,
          COLLECTIONS.PEOPLE
        ),
        where('type', '==', 'student')
      ),
      snapshot => {
        people =
          snapshot.docs.map(item => ({
            id: item.id,
            ...item.data()
          }));

        rebuildStudents();
      }
    );

    const unsubProfiles = onSnapshot(
      BASE(
        db,
        appId,
        COLLECTIONS.STUDENT_PROFILES
      ),
      snapshot => {
        profiles =
          snapshot.docs.map(item => ({
            id: item.id,
            ...item.data()
          }));

        rebuildStudents();
      }
    );

    const unsubAssignments =
      onSnapshot(
        BASE(
          db,
          appId,
          COLLECTIONS.STUDENT_GROUP_ASSIGNMENTS
        ),
        snapshot => {
          assignments =
            snapshot.docs.map(item => ({
              id: item.id,
              ...item.data()
            }));

          rebuildStudents();
        }
      );

    const unsubGroups = onSnapshot(
      BASE(
        db,
        appId,
        COLLECTIONS.GROUPS
      ),
      snapshot => {
        setGroups(
          snapshot.docs
            .map(item => ({
              id: item.id,
              ...item.data()
            }))
            .filter(
              group => group.active !== false
            )
            .sort((a, b) =>
              (a.name || '').localeCompare(
                b.name || '',
                'es'
              )
            )
        );
      }
    );

    const unsubConfig = onSnapshot(
      DOC(
        db,
        appId,
        'config',
        'institution'
      ),
      snapshot => {
        if (snapshot.exists()) {
          setInstitutionConfig(
            snapshot.data()
          );
        }
      }
    );

    return () => {
      unsubPeople();
      unsubProfiles();
      unsubAssignments();
      unsubGroups();
      unsubConfig();
    };
  }, [db, appId]);

  // ============================================================
// CONFIGURACIÓN
// ============================================================

const levels = useMemo(() => {
  if (!Array.isArray(institutionConfig?.levels)) {
    return [];
  }

  return institutionConfig.levels.map(
    (level, index) =>
      typeof level === 'string'
        ? {
            id: level
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '_'),
            name: level
          }
        : {
            id:
              level?.id ||
              `nivel_${index + 1}`,
            name:
              level?.name ||
              level?.label ||
              `Nivel ${index + 1}`
          }
  );
}, [institutionConfig]);

const turns = useMemo(() => {
  if (!Array.isArray(institutionConfig?.turns)) {
    return [];
  }

  return institutionConfig.turns.map(
    (turn, index) =>
      typeof turn === 'string'
        ? {
            id: turn
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '_'),
            name: turn
          }
        : {
            id:
              turn?.id ||
              `turno_${index + 1}`,
            name:
              turn?.name ||
              turn?.label ||
              `Turno ${index + 1}`
          }
  );
}, [institutionConfig]);

const journeys = useMemo(() => {
  if (
    !Array.isArray(
      institutionConfig?.scheduleTypes
    )
  ) {
    return [];
  }

  return institutionConfig.scheduleTypes.map(
    (item, index) =>
      typeof item === 'string'
        ? {
            id: item
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '_'),
            name: item
          }
        : {
            id:
              item?.id ||
              `jornada_${index + 1}`,
            name:
              item?.name ||
              item?.label ||
              `Jornada ${index + 1}`
          }
  );
}, [institutionConfig]);

const getGroup = groupId =>
  groups.find(
    group => group.id === groupId
  );

const getTurnLabels = assignment => {
  if (
    !assignment ||
    !Array.isArray(assignment.turnIds)
  ) {
    return [];
  }

  return assignment.turnIds
    .map(turnId =>
      turns.find(
        turn => turn.id === turnId
      )?.name
    )
    .filter(Boolean);
};

  // ============================================================
  // FILTROS
  // ============================================================

  const filteredStudents = useMemo(() => {
    const searchValue =
      normalizeText(search);

    return students.filter(student => {
      const assignment =
        getCurrentAssignment(student);

      const group =
        assignment
          ? getGroup(
              assignment.groupId
            )
          : null;

      // ----------------------------------------
      // ESTADO
      // ----------------------------------------

      const active =
        student.active !== false;

      if (
        filters.status === 'active' &&
        !active
      ) {
        return false;
      }

      if (
        filters.status === 'inactive' &&
        active
      ) {
        return false;
      }

      // ----------------------------------------
      // BÚSQUEDA GLOBAL
      // ----------------------------------------

      if (searchValue) {
        const searchable = [
          student.firstName,
          student.lastName,
          student.fullName,
          student.dni,
          student.address,
          student.phone,
          student.email,
          student.healthInsurance,
          student.originSchool,
          student.motherName,
          student.fatherName,
          student.emergencyContact,
          student.city,

          group?.name,

          ...getTurnLabels(
            assignment
          )
        ]
          .filter(Boolean)
          .map(normalizeText);

        if (
          !searchable.some(value =>
            value.includes(searchValue)
          )
        ) {
          return false;
        }
      }

      // ----------------------------------------
      // NIVEL
      // ----------------------------------------

      if (
        filters.level !== 'all' &&
        student.level !==
          filters.level
      ) {
        return false;
      }

      // ----------------------------------------
      // GRUPO
      // ----------------------------------------

      if (
        filters.group !== 'all' &&
        assignment?.groupId !==
          filters.group
      ) {
        return false;
      }

      // ----------------------------------------
      // JORNADA
      // ----------------------------------------

      if (
        filters.journey !== 'all' &&
        assignment?.scheduleType !==
          filters.journey
      ) {
        return false;
      }

      // ----------------------------------------
      // TURNO
      // ----------------------------------------

      if (
        filters.turn !== 'all'
      ) {
        const hasTurn =
          assignment?.turnIds?.includes(
            filters.turn
          );

        if (!hasTurn) {
          return false;
        }
      }

      // ----------------------------------------
      // GÉNERO
      // ----------------------------------------

      if (
        filters.gender !== 'all' &&
        student.gender !==
          filters.gender
      ) {
        return false;
      }

      return true;
    });
  }, [
    students,
    groups,
    search,
    filters,
    turns
  ]);

  // ============================================================
  // ESTADÍSTICAS
  // ============================================================

  const stats = useMemo(() => {
    const activeStudents =
      students.filter(
        student =>
          student.active !== false
      );

    const byLevel = {};
    const byTurn = {};
    const byJourney = {};

    activeStudents.forEach(
      student => {
        const assignment =
          getCurrentAssignment(
            student
          );

        const level =
          student.level ||
          'Sin nivel';

        byLevel[level] =
          (byLevel[level] || 0) + 1;

        const journey =
          assignment?.scheduleType ||
          'Sin jornada';

        byJourney[journey] =
          (byJourney[journey] || 0) + 1;

        (
          assignment?.turnIds || []
        ).forEach(turnId => {
          const label =
            turns.find(
              turn =>
                turn.id === turnId
            )?.name ||
            turnId;

          byTurn[label] =
            (byTurn[label] || 0) + 1;
        });
      }
    );

    return {
      total: activeStudents.length,
      assigned: activeStudents.filter(
        student =>
          getCurrentAssignment(
            student
          )
      ).length,
      unassigned:
        activeStudents.filter(
          student =>
            !getCurrentAssignment(
              student
            )
        ).length,
      byLevel,
      byTurn,
      byJourney
    };
  }, [students, turns]);

  // ============================================================
  // ABRIR ESTUDIANTE DESDE EXTERIOR
  // ============================================================

  useEffect(() => {
    if (!initStudentId) return;

    const student =
      students.find(
        item =>
          item.id === initStudentId
      );

    if (student) {
      setViewingStudent(student);
    }
  }, [
    initStudentId,
    students
  ]);
useEffect(() => {
  if (
    !db ||
    !appId ||
    !showBitacora ||
    !viewingStudent?.personId
  ) {
    return;
  }

  setLoadingBitacora(true);

  const unsubscribe =
    onSnapshot(
      BASE(
        db,
        appId,
        COLLECTIONS.STUDENT_BITACORA
      ),
      snapshot => {
        const entries =
          snapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            .filter(
              entry =>
                entry.studentId ===
                viewingStudent.personId
            )
            .sort(
              (a, b) =>
                new Date(
                  b.date || 0
                ) -
                new Date(
                  a.date || 0
                )
            );

        setBitacoraEntries(entries);
        setLoadingBitacora(false);
      }
    );

  return unsubscribe;
}, [
  db,
  appId,
  showBitacora,
  viewingStudent?.personId
]);
  
  // ============================================================
  // NUEVO / EDITAR
  // ============================================================

  const openNew = () => {
    setEditingStudent({
      isNew: true,
      firstName: '',
      lastName: '',
      dni: '',
      birthDate: '',
      gender: '',
      level: '',
      address: '',
      phone: '',
      email: '',
      city: '',
      healthInsurance: '',
      emergencyContact: '',
      motherName: '',
      motherContact: '',
      fatherName: '',
      fatherContact: '',
      photoUrl: '',
      cudNumber: '',
      cudExpiration: '',
      notes: ''
    });

    setShowForm(true);
  };

  const openEdit = student => {
    setEditingStudent({
      ...student,
      isNew: false
    });

    setShowForm(true);
  };

  // ============================================================
  // GUARDAR ESTUDIANTE
  // ============================================================

  const handleSave = async event => {
    event.preventDefault();

    const form =
      new FormData(event.currentTarget);

    const data = Object.fromEntries(
      form.entries()
    );

    const firstName =
      String(
        data.firstName || ''
      ).trim();

    const lastName =
      String(
        data.lastName || ''
      ).trim();

    if (!firstName || !lastName) {
      alert(
        'Necesitamos nombre y apellido.'
      );

      return;
    }

    setSaving(true);

    try {
      console.log('CENTRA → iniciando guardado de estudiante');

      let personId =
        editingStudent?.personId;

      if (!personId) {
        personId = crypto.randomUUID();
      }

      console.log(
        'CENTRA → personId:',
        personId
      );

      const now = serverTimestamp();

    // ----------------------------------------
// PERSONA
// ----------------------------------------

await setDoc(
  DOC(
    db,
    appId,
    COLLECTIONS.PEOPLE,
    personId
  ),
  {
    firstName,
    lastName,
    fullName:
      `${firstName} ${lastName}`.trim(),

    type: 'student',

    active:
      editingStudent?.active !== false,

    updatedAt: now,

    ...(editingStudent?.isNew
      ? {
          createdAt: now
        }
      : {})
  },
  {
    merge: true
  }
);

console.log(
  'CENTRA → people guardado correctamente'
);

// ----------------------------------------
// PERFIL DE ESTUDIANTE
// ----------------------------------------
      // ----------------------------------------
      // PERFIL DE ESTUDIANTE
      // ----------------------------------------

     COLLECTIONS.STUDENT_PROFILES

      // ----------------------------------------
      // ASIGNACIÓN
      // ----------------------------------------

      const oldAssignment =
        editingStudent?.isNew
          ? null
          : getCurrentAssignment(
              editingStudent
            );

      const groupId =
        data.groupId || '';

      const turnIds =
        form.getAll('turnId');

      const scheduleType =
        data.scheduleType ||
        'simple';

      const changedAssignment =
        oldAssignment?.groupId !==
          groupId ||
        oldAssignment?.scheduleType !==
          scheduleType ||
        JSON.stringify(
          oldAssignment?.turnIds ||
          []
        ) !==
          JSON.stringify(turnIds);

      if (
        changedAssignment
      ) {
        if (oldAssignment) {
          await closeStudentGroupAssignment(
            db,
            appId,
            oldAssignment.id
          );
        }

        if (groupId) {
          await createStudentGroupAssignment(
            db,
            appId,
            {
              studentId:
                personId,

              groupId,

              turnIds,

              scheduleType
            }
          );
        }
      }

      setShowForm(false);
      setEditingStudent(null);

       } catch (error) {
      console.error(
        'CENTRA → ERROR AL GUARDAR ESTUDIANTE',
        error
      );

      console.error(
        'Código Firebase:',
        error?.code
      );

      console.error(
        'Mensaje Firebase:',
        error?.message
      );

      alert(
        `No se pudo guardar el estudiante.\n\n${error?.code || ''}\n${error?.message || error}`
      );
     } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // ESTADO
  // ============================================================

const toggleActive = async student => {
  const newActive =
    student.active === false;

  const action = newActive
    ? 'reactivar'
    : 'dar de baja';

  const confirmed = window.confirm(
    newActive
      ? `¿Querés reactivar a ${student.fullName}?`
      : `¿Querés dar de baja a ${student.fullName}?`
  );

  if (!confirmed) return;

  try {
    await setDoc(
      DOC(
        db,
        appId,
        COLLECTIONS.PEOPLE,
        student.personId
      ),
      {
        active: newActive,
        status: newActive
          ? 'active'
          : 'inactive',
        ...(newActive
          ? {}
          : {
              deactivatedAt:
                serverTimestamp()
            }),
        updatedAt:
          serverTimestamp()
      },
      {
        merge: true
      }
    );

    // Actualizar inmediatamente la pantalla
    setStudents(prev =>
      prev.map(item =>
        item.personId === student.personId
          ? {
              ...item,
              active: newActive,
              status: newActive
                ? 'active'
                : 'inactive'
            }
          : item
      )
    );

    setViewingStudent(prev =>
      prev
        ? {
            ...prev,
            active: newActive,
            status: newActive
              ? 'active'
              : 'inactive'
          }
        : prev
    );

    console.log(
      `CENTRA → estudiante ${action}do correctamente`
    );

    // Si se da de baja, cerramos su asignación actual
    if (!newActive) {
      const currentAssignment =
        getCurrentAssignment(student);

      if (currentAssignment) {
        await closeStudentGroupAssignment(
          db,
          appId,
          currentAssignment.id
        );
      }
    }

  } catch (error) {
    console.error(
      'Error actualizando estado:',
      error
    );

    alert(
      `No se pudo ${action} al estudiante.\n\n${
        error?.message || error
      }`
    );
  }
};

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">

      {/* ======================================================
          ENCABEZADO
      ====================================================== */}

      <div className="bg-white border-b border-slate-200 px-4 md:px-6 py-4 shrink-0">

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

          <div>
            <div className="flex items-center gap-3">

              <div className="w-11 h-11 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center">
                <GraduationCap size={24} />
              </div>

              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-900">
                  Estudiantes
                </h2>

                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                  Legajos y matrícula
                </p>
              </div>

            </div>
          </div>

          <div className="flex items-center gap-2">

            <button
              type="button"
              onClick={() =>
                setShowStats(
                  value => !value
                )
              }
              className={`px-3 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 transition ${
                showStats
                  ? 'bg-violet-600 text-white'
                  : 'bg-violet-50 text-violet-700 hover:bg-violet-100'
              }`}
            >
              <BarChart3 size={17} />
              Estadísticas
            </button>

            <button
              type="button"
              onClick={openNew}
              className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black text-xs flex items-center gap-2 shadow-lg shadow-violet-200 transition"
            >
              <Plus size={18} />
              Nuevo estudiante
            </button>

          </div>
        </div>

        {/* BUSCADOR */}

        <div className="mt-4 flex flex-col md:flex-row gap-2">

          <div className="relative flex-1">

            <Search
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={event =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Buscar por nombre, DNI, dirección, teléfono, email, grupo..."
              className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 transition text-sm font-semibold text-slate-700"
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch('')
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X size={17} />
              </button>
            )}

          </div>

          <button
            type="button"
            onClick={() =>
              setShowFilters(
                value => !value
              )
            }
            className={`px-4 py-3.5 rounded-2xl border font-black text-xs flex items-center justify-center gap-2 transition ${
              showFilters
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white border-slate-200 text-slate-600 hover:border-violet-300'
            }`}
          >
            <Filter size={17} />
            Filtros
          </button>

        </div>

        {/* FILTROS */}

        {showFilters && (
          <div className="mt-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">

              
              <div className="flex bg-slate-100 rounded-xl p-1 gap-1">

  <button
    type="button"
    onClick={() =>
      setFilters(prev => ({
        ...prev,
        status: 'active'
      }))
    }
    className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase transition ${
      filters.status === 'active'
        ? 'bg-white text-violet-700 shadow-sm'
        : 'text-slate-400'
    }`}
  >
    Activos
    <span className="ml-1">
      {students.filter(
        student =>
          student.active !== false
      ).length}
    </span>
  </button>

  <button
    type="button"
    onClick={() =>
      setFilters(prev => ({
        ...prev,
        status: 'inactive'
      }))
    }
    className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase transition ${
      filters.status === 'inactive'
        ? 'bg-white text-red-600 shadow-sm'
        : 'text-slate-400'
    }`}
  >
    Bajas
    <span className="ml-1">
      {students.filter(
        student =>
          student.active === false
      ).length}
    </span>
  </button>

</div>

              <select
                value={filters.level}
                onChange={event =>
                  setFilters(prev => ({
                    ...prev,
                    level:
                      event.target.value
                  }))
                }
                className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-bold"
              >
                <option value="all">
                  Todos los niveles
                </option>

                {[
                  ...new Set(
                    students
                      .map(
                        student =>
                          student.level
                      )
                      .filter(Boolean)
                  )
                ]
                  .sort((a, b) =>
                    String(a).localeCompare(
                      String(b),
                      'es'
                    )
                  )
                  .map(level => (
                    <option
                      key={level}
                      value={level}
                    >
                      {level}
                    </option>
                  ))}
              </select>

              <select
                value={filters.group}
                onChange={event =>
                  setFilters(prev => ({
                    ...prev,
                    group:
                      event.target.value
                  }))
                }
                className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-bold"
              >
                <option value="all">
                  Todos los grupos
                </option>

                {groups.map(group => (
                  <option
                    key={group.id}
                    value={group.id}
                  >
                    {group.name}
                  </option>
                ))}
              </select>

              <select
                value={filters.journey}
                onChange={event =>
                  setFilters(prev => ({
                    ...prev,
                    journey:
                      event.target.value
                  }))
                }
                className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-bold"
              >
                <option value="all">
                  Todas las jornadas
                </option>

                {journeys.map(journey => (
                  <option
                    key={journey.id}
                    value={journey.id}
                  >
                    {journey.name}
                  </option>
                ))}
              </select>

              <select
                value={filters.turn}
                onChange={event =>
                  setFilters(prev => ({
                    ...prev,
                    turn:
                      event.target.value
                  }))
                }
                className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-bold"
              >
                <option value="all">
                  Todos los turnos
                </option>

                {turns.map(turn => (
                  <option
                    key={turn.id}
                    value={turn.id}
                  >
                    {turn.name}
                  </option>
                ))}
              </select>

              <select
                value={filters.gender}
                onChange={event =>
                  setFilters(prev => ({
                    ...prev,
                    gender:
                      event.target.value
                  }))
                }
                className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-bold"
              >
                <option value="all">
                  Todos
                </option>
                <option value="F">
                  Mujer
                </option>
                <option value="M">
                  Varón
                </option>
                <option value="X">
                  Otro
                </option>
              </select>

            </div>

            <div className="flex justify-end mt-3">

              <button
                type="button"
                onClick={() =>
                  setFilters({
                    status: 'active',
                    level: 'all',
                    group: 'all',
                    turn: 'all',
                    journey: 'all',
                    gender: 'all'
                  })
                }
                className="text-[10px] font-black uppercase text-slate-400 hover:text-violet-600"
              >
                Limpiar filtros
              </button>

            </div>

          </div>
        )}

      </div>

      {/* ======================================================
          ESTADÍSTICAS
      ====================================================== */}

      {showStats && (
        <div className="px-4 md:px-6 pt-4 shrink-0">

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">

            <StatCard
              label="Estudiantes activos"
              value={stats.total}
              icon={<Users size={18} />}
            />

            <StatCard
              label="Con grupo"
              value={stats.assigned}
              icon={<CheckCircle2 size={18} />}
              positive
            />

            <StatCard
              label="Sin asignación"
              value={stats.unassigned}
              icon={<AlertCircle size={18} />}
              warning
            />

            <StatCard
              label="Resultados actuales"
              value={filteredStudents.length}
              icon={<Filter size={18} />}
            />

          </div>

          <div className="grid lg:grid-cols-3 gap-3 mt-3">

            <StatsList
              title="Por nivel"
              data={stats.byLevel}
            />

            <StatsList
              title="Por jornada"
              data={stats.byJourney}
            />

            <StatsList
              title="Por turno"
              data={stats.byTurn}
            />

          </div>

        </div>
      )}

      {/* ======================================================
          LISTADO
      ====================================================== */}

      <div className="flex-1 overflow-y-auto p-4 md:p-6">

        {loading ? (
          <div className="h-full flex items-center justify-center">

            <div className="text-center">

              <div className="w-12 h-12 rounded-full border-4 border-violet-100 border-t-violet-600 animate-spin mx-auto" />

              <p className="mt-4 text-xs font-black uppercase tracking-widest text-slate-400">
                Cargando estudiantes...
              </p>

            </div>

          </div>
        ) : filteredStudents.length === 0 ? (

          <div className="h-full flex items-center justify-center">

            <div className="max-w-md text-center">

              <div className="w-20 h-20 mx-auto rounded-3xl bg-slate-100 flex items-center justify-center text-slate-300">
                <UserRound size={40} />
              </div>

              <h3 className="mt-5 text-xl font-black text-slate-800">
                No encontramos estudiantes
              </h3>

              <p className="mt-2 text-sm text-slate-400 font-medium">
                Probá con otra búsqueda o modificá los filtros.
              </p>

            </div>

          </div>

        ) : (

          <div className="space-y-2">

            {filteredStudents.map(student => {

              const assignment =
                getCurrentAssignment(
                  student
                );

              const group =
                assignment
                  ? getGroup(
                      assignment.groupId
                    )
                  : null;

              const turnLabels =
                getTurnLabels(
                  assignment
                );

              const age =
                calculateAge(
                  student.birthDate
                );

              const active =
                student.active !== false;

              return (
                <article
                  key={student.id}
                  className="bg-white border border-slate-200 rounded-2xl hover:border-violet-300 hover:shadow-md transition-all"
                >

                  <div className="p-4 flex items-center gap-4">

                    {/* FOTO */}

                    <div className="w-14 h-14 rounded-2xl overflow-hidden bg-violet-50 border border-violet-100 shrink-0">

                      {student.photoUrl ? (
                        <img
                          src={
                            student.photoUrl
                          }
                          alt={
                            student.fullName
                          }
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-violet-300">
                          <User size={25} />
                        </div>
                      )}

                    </div>

                    {/* DATOS */}

                    <button
                      type="button"
                      onClick={() =>
                        setViewingStudent(
                          student
                        )
                      }
                      className="flex-1 min-w-0 text-left"
                    >

                      <div className="flex flex-wrap items-center gap-2">

                        <h3 className="font-black text-slate-800 truncate">
                          {student.lastName},{' '}
                          {student.firstName}
                        </h3>

                        {!active && (
                          <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100 text-[8px] font-black uppercase">
                            Inactivo
                          </span>
                        )}

                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">

                        {student.dni && (
                          <span className="text-[10px] text-slate-400 font-bold">
                            DNI {student.dni}
                          </span>
                        )}

                        {age !== null && (
                          <span className="text-[10px] text-slate-400 font-bold">
                            {age} años
                          </span>
                        )}

                        {student.level && (
                          <span className="text-[10px] text-slate-400 font-bold">
                            {student.level}
                          </span>
                        )}

                      </div>

                    </button>

                    {/* ASIGNACIÓN */}

                    <div className="hidden md:flex min-w-[240px] flex-col gap-1">

                      {group ? (
                        <>
                          <span className="text-[10px] font-black text-violet-700 truncate">
                            {group.name}
                          </span>

                          <div className="flex flex-wrap gap-1">

                            {turnLabels.map(
                              label => (
                                <span
                                  key={
                                    label
                                  }
                                  className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[8px] font-black uppercase"
                                >
                                  {label}
                                </span>
                              )
                            )}

                            {assignment?.scheduleType && (
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[8px] font-black uppercase">
                                {journeys.find(
                                  item =>
                                    item.id ===
                                    assignment.scheduleType
                                )?.name ||
                                  assignment.scheduleType}
                              </span>
                            )}

                          </div>
                        </>
                      ) : (
                        <span className="text-[10px] font-black text-amber-600 uppercase">
                          Sin asignación
                        </span>
                      )}

                    </div>

                    {/* ACCIONES */}

                    <div className="flex items-center gap-1">

                      <button
                        type="button"
                        title="Editar"
                        onClick={() =>
                          openEdit(
                            student
                          )
                        }
                        className="p-2.5 rounded-xl text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition"
                      >
                        <Edit3 size={17} />
                      </button>

                      <button
                        type="button"
                        title="Ver legajo"
                        onClick={() =>
                          setViewingStudent(
                            student
                          )
                        }
                        className="p-2.5 rounded-xl text-slate-400 hover:text-violet-600 hover:bg-violet-50 transition"
                      >
                        <ChevronRight
                          size={18}
                        />
                      </button>

                    </div>

                  </div>

                  {/* MOBILE ASIGNACIÓN */}

                  <div className="md:hidden px-4 pb-4">

                    {group ? (
                      <div className="px-3 py-2.5 rounded-xl bg-violet-50 border border-violet-100">

                        <p className="text-[9px] font-black uppercase tracking-widest text-violet-400">
                          Asignación
                        </p>

                        <p className="text-xs font-black text-violet-800 mt-1">
                          {group.name}
                        </p>

                        <div className="flex flex-wrap gap-1 mt-1">

                          {turnLabels.map(
                            label => (
                              <span
                                key={
                                  label
                                }
                                className="text-[8px] font-black uppercase text-violet-500"
                              >
                                {label}
                              </span>
                            )
                          )}

                        </div>

                      </div>
                    ) : (
                      <div className="px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-100 text-[9px] font-black uppercase text-amber-600">
                        Sin asignación de grupo
                      </div>
                    )}

                  </div>

                </article>
              );
            })}

          </div>
        )}

      </div>

      {/* ======================================================
          MODAL LEGAJO
      ====================================================== */}

     {showBitacora &&
  viewingStudent && (
    <BitacoraModal
      student={viewingStudent}
      entries={bitacoraEntries}
      loading={loadingBitacora}
      institutionConfig={institutionConfig}
      onClose={() =>
        setShowBitacora(false)
      }
      db={db}
      appId={appId}
      user={user}
    />
  )}
      {viewingStudent && (
       <StudentDetailModal
  student={viewingStudent}
  groups={groups}
  levels={levels}
  turns={turns}
  journeys={journeys}
  institutionConfig={institutionConfig}
  onClose={() =>
    setViewingStudent(null)
  }
 onEdit={() => {
  openEdit(viewingStudent);
  setViewingStudent(null);
}}
  onToggleActive={() =>
    toggleActive(
      viewingStudent
    )
  }
  onBitacora={() =>
    setShowBitacora(true)
  }
/>
      )}

      {/* ======================================================
          MODAL NUEVO / EDITAR
      ====================================================== */}

      {showForm &&
        editingStudent && (
          <StudentFormModal
            student={editingStudent}
            groups={groups}
             levels={levels}
            turns={turns}
            journeys={journeys}
            onClose={() => {
              setShowForm(false);
              setEditingStudent(null);
            }}
            onSave={handleSave}
            saving={saving}
          />
        )}

    </div>
  );
}

// ============================================================
// COMPONENTES AUXILIARES
// ============================================================

function StatCard({
  label,
  value,
  icon,
  positive,
  warning
}) {
 
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 flex items-center gap-3">

      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center ${
          positive
            ? 'bg-emerald-50 text-emerald-600'
            : warning
            ? 'bg-amber-50 text-amber-600'
            : 'bg-violet-50 text-violet-600'
        }`}
      >
        {icon}
      </div>

      <div>
        <p className="text-2xl font-black text-slate-900 leading-none">
          {value}
        </p>

        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mt-1">
          {label}
        </p>
      </div>

    </div>
  );
}

function StatsList({
  title,
  data
}) {
  const entries =
    Object.entries(data)
      .sort((a, b) => b[1] - a[1]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">

      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
        {title}
      </h4>

      <div className="space-y-2">

        {entries.length === 0 ? (
          <p className="text-xs text-slate-400">
            Sin datos.
          </p>
        ) : (
          entries.map(
            ([label, value]) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3"
              >
                <span className="text-xs font-bold text-slate-600 truncate">
                  {label}
                </span>

                <span className="text-xs font-black text-violet-700">
                  {value}
                </span>
              </div>
            )
          )
        )}

      </div>

    </div>
  );
}
function printStudentFile(
  student,
  group,
  journey,
  turnLabels,
  levelName,
  institutionConfig
) {
  const escapeHtml = value =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const age = calculateAge(
    student.birthDate
  );

  const primary =
    institutionConfig?.primaryColor ||
    '#6d28d9';

  const secondary =
    institutionConfig?.secondaryColor ||
    '#f97316';

  const background =
    institutionConfig?.backgroundColor ||
    '#f8fafc';

  const textColor =
    institutionConfig?.textColor ||
    '#1e293b';

  const institutionName =
    institutionConfig?.institutionName ||
    'Mi Institución';

  const institutionShortName =
    institutionConfig?.institutionShortName ||
    institutionName;

  const logoUrl =
    institutionConfig?.logoUrl ||
    '';

  const address =
    institutionConfig?.address ||
    '';

  const phone =
    institutionConfig?.phone ||
    '';

  const email =
    institutionConfig?.email ||
    '';

  const website =
    institutionConfig?.website ||
    '';

  const city =
    institutionConfig?.city ||
    '';

  const province =
    institutionConfig?.province ||
    '';

  const documentHeader =
    institutionConfig?.document?.header ||
    '';

  const documentFooter =
    institutionConfig?.document?.footer ||
    '';

  const showLogo =
    institutionConfig?.document?.showLogo !== false;

  const statusText =
    student.active === false
      ? 'BAJA'
      : 'ACTIVO';

  const statusColor =
    student.active === false
      ? '#b91c1c'
      : '#15803d';

  const statusBackground =
    student.active === false
      ? '#fee2e2'
      : '#dcfce7';

  const fullAddress = [
    address,
    city,
    province
  ]
    .filter(Boolean)
    .join(' · ');

  const contactLine = [
    phone,
    email,
    website
  ]
    .filter(Boolean)
    .join(' · ');

  const printWindow =
    window.open(
      '',
      '_blank',
      'width=1000,height=900'
    );

  if (!printWindow) {
    alert(
      'El navegador bloqueó la ventana de impresión.'
    );
    return;
  }

  const logoHtml =
    showLogo && logoUrl
      ? `
        <img
          src="${escapeHtml(logoUrl)}"
          alt="Logo institucional"
          class="institution-logo"
        />
      `
      : '';

  printWindow.document.write(`
    <!doctype html>

    <html lang="es">
      <head>

        <meta charset="UTF-8" />

        <title>
          Legajo - ${escapeHtml(
            student.lastName
          )}, ${escapeHtml(
            student.firstName
          )}
        </title>

        <style>

          @page {
            size: A4 portrait;
            margin: 8mm;
          }

          * {
            box-sizing: border-box;
          }

          html,
          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
          }

          body {
            font-family:
              Arial,
              Helvetica,
              sans-serif;

            color: ${textColor};

            font-size: 10px;

            -webkit-print-color-adjust:
              exact;

            print-color-adjust:
              exact;
          }

          .sheet {
            width: 100%;
            max-width: 194mm;
            margin: 0 auto;
          }

          /* ==================================================
             ENCABEZADO INSTITUCIONAL
          ================================================== */

          .institution-header {
            display: flex;
            align-items: center;
            gap: 14px;

            padding: 9px 12px;

            border-radius: 10px;

            background:
              linear-gradient(
                135deg,
                ${primary},
                ${secondary}
              );

            color: white;

            min-height: 48px;

            margin-bottom: 12px;
          }

         .institution-logo {
  width: 62px;
  height: 46px;

            object-fit: contain;

            background: white;

            border-radius: 7px;

            padding: 4px;

            flex-shrink: 0;
          }

          .institution-text {
            min-width: 0;
            flex: 1;
          }

          .institution-name {
            font-size: 13px;
            font-weight: 900;
            text-transform: uppercase;
            letter-spacing: .03em;

            line-height: 1.1;
          }

          .institution-meta {
            font-size: 8px;
            font-weight: 600;

            opacity: .92;

            margin-top: 3px;

            line-height: 1.3;
          }

          .document-header {
            font-size: 8px;
            opacity: .9;
            margin-top: 3px;
          }

          /* ==================================================
             TITULO DEL DOCUMENTO
          ================================================== */

          .document-title {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;

            gap: 12px;

            padding: 7px 2px 9px;

            border-bottom:
              2px solid ${primary};

            margin-bottom: 9px;
          }

          .document-title-left {
            flex: 1;
            min-width: 0;
          }

          .document-kicker {
            color: ${primary};

            font-size: 7px;

            font-weight: 900;

            text-transform:
              uppercase;

            letter-spacing: .15em;

            margin-bottom: 3px;
          }

          .student-name {
  font-size: 23px;

            font-weight: 900;

            line-height: 1;

            text-transform:
              uppercase;

            color: ${textColor};
          }

          .student-summary {
            font-size: 9px;

            font-weight: 700;

            color: #64748b;

            margin-top: 4px;
          }

       .student-photo {
  width: 62px;
  height: 74px;

            object-fit: cover;

            border-radius: 8px;

            border:
              2px solid ${primary};

            flex-shrink: 0;

            background: #f1f5f9;
          }

          .student-photo-empty {
            width: 46px;
            height: 54px;

            border-radius: 8px;

            border:
              2px solid ${primary};

            background: #f8fafc;

            display: flex;
            align-items: center;
            justify-content: center;

            color: #94a3b8;

            font-size: 7px;

            text-align: center;

            flex-shrink: 0;
          }

          .status {
            display: inline-block;

            padding: 3px 7px;

            border-radius: 999px;

            font-size: 7px;

            font-weight: 900;

            color: ${statusColor};

            background:
              ${statusBackground};

            margin-top: 5px;
          }

          /* ==================================================
             SECCIONES
          ================================================== */

          .section {
            margin-top: 6px;

            break-inside: avoid;

            page-break-inside: avoid;
          }

          .section-title {
            display: flex;
            align-items: center;

            gap: 6px;

            padding: 4px 7px;

            background: ${background};

            border-left:
              3px solid ${primary};

            border-radius: 5px;

            color: ${primary};

            font-size: 8px;

            font-weight: 900;

            text-transform:
              uppercase;

            letter-spacing: .05em;

            margin-bottom: 5px;
          }

         .grid {
  gap: 5px 8px;
            display: grid;

            grid-template-columns:
              repeat(2, minmax(0, 1fr));

            gap: 5px 8px;
          }

          .field {
            min-width: 0;

            padding: 3px 2px;

            border-bottom:
              1px solid #e2e8f0;
          }

          .field-label {
            font-size: 6.5px;

            font-weight: 900;

            text-transform:
              uppercase;

            letter-spacing: .06em;

            color: #64748b;

            line-height: 1.1;
          }

          .field-value {
            font-size: 8.5px;

            font-weight: 700;

            color: ${textColor};

            margin-top: 2px;

            line-height: 1.15;

            word-break:
              break-word;

            white-space:
              pre-wrap;
          }

          .full {
            grid-column:
              1 / -1;
          }

          /* ==================================================
             ASIGNACION
          ================================================== */

          .assignment-box {
            display: grid;

            grid-template-columns:
              1.4fr 1fr 1fr;

            gap: 6px;

            padding: 7px;

            border:
              1px solid ${primary};

            border-radius: 7px;

            background:
              linear-gradient(
                135deg,
                ${primary}12,
                ${secondary}10
              );
          }

          .assignment-field {
            padding: 4px 6px;

            background:
              rgba(255,255,255,.78);

            border-radius: 5px;
          }

          /* ==================================================
             FAMILIA
          ================================================== */

          .family-grid {
            display: grid;

            grid-template-columns:
              repeat(2, minmax(0, 1fr));

            gap: 7px;
          }

          .family-card {
            border:
              1px solid #e2e8f0;

            border-radius: 6px;

            padding: 5px 7px;
          }

          /* ==================================================
             PIE
          ================================================== */

          .footer {
            margin-top: 9px;

            padding-top: 6px;

            border-top:
              1px solid #e2e8f0;

            display: flex;

            justify-content:
              space-between;

            gap: 12px;

            color: #64748b;

            font-size: 6.5px;

            line-height: 1.3;
          }

          .footer-right {
            text-align: right;
          }

          /* ==================================================
             CONTROL DE IMPRESION
          ================================================== */

          @media print {

            html,
            body {
              width: 210mm;
              min-height: 297mm;
            }

            .sheet {
              width: 194mm;
              max-width: 194mm;
            }

          }

        </style>

      </head>

      <body>

        <div class="sheet">

          <!-- ===============================================
               IDENTIDAD INSTITUCIONAL
          ================================================ -->

          <div class="institution-header">

            ${logoHtml}

            <div class="institution-text">

              <div class="institution-name">
                ${escapeHtml(
                  institutionShortName
                )}
              </div>

              ${
                fullAddress
                  ? `
                    <div class="institution-meta">
                      ${escapeHtml(
                        fullAddress
                      )}
                    </div>
                  `
                  : ''
              }

              ${
                contactLine
                  ? `
                    <div class="institution-meta">
                      ${escapeHtml(
                        contactLine
                      )}
                    </div>
                  `
                  : ''
              }

              ${
                documentHeader
                  ? `
                    <div class="document-header">
                      ${escapeHtml(
                        documentHeader
                      )}
                    </div>
                  `
                  : ''
              }

            </div>

          </div>

          <!-- ===============================================
               ESTUDIANTE
          ================================================ -->

          <div class="document-title">

            <div class="document-title-left">

              <div class="document-kicker">
                ${escapeHtml(
                  institutionName
                )}
                · Legajo del estudiante
              </div>

              <div class="student-name">
                ${escapeHtml(
                  student.lastName
                )},
                ${escapeHtml(
                  student.firstName
                )}
              </div>

              <div class="student-summary">

                ${
                  student.dni
                    ? `DNI ${escapeHtml(
                        student.dni
                      )}`
                    : ''
                }

                ${
                  age !== null
                    ? ` · ${age} años`
                    : ''
                }

              </div>

              <div class="status">
                ${statusText}
              </div>

            </div>

            ${
              student.photoUrl
                ? `
                  <img
                    src="${escapeHtml(
                      student.photoUrl
                    )}"
                    alt="Foto del estudiante"
                    class="student-photo"
                  />
                `
                : `
                  <div class="student-photo-empty">
                    SIN FOTO
                  </div>
                `
            }

          </div>

          <!-- ===============================================
               DATOS PERSONALES
          ================================================ -->

          <div class="section">

            <div class="section-title">
              Datos personales
            </div>

            <div class="grid">

              <div class="field">
                <div class="field-label">
                  DNI
                </div>

                <div class="field-value">
                  ${escapeHtml(
                    student.dni ||
                      'Sin datos'
                  )}
                </div>
              </div>

              <div class="field">
                <div class="field-label">
                  Fecha de nacimiento
                </div>

                <div class="field-value">
                  ${
                    student.birthDate
                      ? escapeHtml(
                          formatDate(
                            student.birthDate
                          )
                        )
                      : 'Sin datos'
                  }
                </div>
              </div>

              <div class="field">
                <div class="field-label">
                  Edad
                </div>

                <div class="field-value">
                  ${
                    age !== null
                      ? `${age} años`
                      : 'Sin datos'
                  }
                </div>
              </div>

              <div class="field">
                <div class="field-label">
                  Género
                </div>

                <div class="field-value">
                  ${escapeHtml(
                    student.gender ||
                      'Sin datos'
                  )}
                </div>
              </div>

              <div class="field">
                <div class="field-label">
                  Dirección
                </div>

                <div class="field-value">
                  ${escapeHtml(
                    student.address ||
                      'Sin datos'
                  )}
                </div>
              </div>

              <div class="field">
                <div class="field-label">
                  Localidad
                </div>

                <div class="field-value">
                  ${escapeHtml(
                    student.city ||
                      'Sin datos'
                  )}
                </div>
              </div>

              <div class="field">
                <div class="field-label">
                  Teléfono
                </div>

                <div class="field-value">
                  ${escapeHtml(
                    student.phone ||
                      'Sin datos'
                  )}
                </div>
              </div>

              <div class="field">
                <div class="field-label">
                  Email
                </div>

                <div class="field-value">
                  ${escapeHtml(
                    student.email ||
                      'Sin datos'
                  )}
                </div>
              </div>

            </div>

          </div>

          <!-- ===============================================
               SALUD Y DOCUMENTACION
          ================================================ -->

          <div class="section">

            <div class="section-title">
              Salud y documentación
            </div>

            <div class="grid">

              <div class="field">
                <div class="field-label">
                  Obra social / prepaga
                </div>

                <div class="field-value">
                  ${escapeHtml(
                    student.healthInsurance ||
                      'Sin datos'
                  )}
                </div>
              </div>

              <div class="field">
                <div class="field-label">
                  CUD
                </div>

                <div class="field-value">
                  ${escapeHtml(
                    student.cudNumber ||
                      'No registrado'
                  )}
                </div>
              </div>

              <div class="field">
                <div class="field-label">
                  Vencimiento CUD
                </div>

                <div class="field-value">
                  ${escapeHtml(
                    student.cudExpiration ||
                      'Sin datos'
                  )}
                </div>
              </div>

              <div class="field">
                <div class="field-label">
                  Contacto de emergencia
                </div>

                <div class="field-value">
                  ${escapeHtml(
                    student.emergencyContact ||
                      'Sin datos'
                  )}
                </div>
              </div>

            </div>

          </div>

          <!-- ===============================================
               ESCOLARIDAD
          ================================================ -->

          <div class="section">

            <div class="section-title">
              Escolaridad actual
            </div>

            <div class="assignment-box">

              <div class="assignment-field">

                <div class="field-label">
                  Nivel
                </div>

                <div class="field-value">
                  ${escapeHtml(
                    student.level ||
                      'Sin nivel'
                  )}
                </div>

              </div>

              <div class="assignment-field">

                <div class="field-label">
                  Grupo
                </div>

                <div class="field-value">
                  ${escapeHtml(
                    group?.name ||
                      'Sin asignación'
                  )}
                </div>

              </div>

              <div class="assignment-field">

                <div class="field-label">
                  Jornada
                </div>

                <div class="field-value">
                  ${escapeHtml(
                    journey ||
                      'Sin jornada'
                  )}
                </div>

              </div>

              <div class="assignment-field">

                <div class="field-label">
                  Turno
                </div>

                <div class="field-value">
                  ${escapeHtml(
                    turnLabels.join(
                      ' · '
                    ) ||
                      'Sin turno'
                  )}
                </div>

              </div>

            </div>

          </div>

          <!-- ===============================================
               FAMILIA
          ================================================ -->

          <div class="section">

            <div class="section-title">
              Familia y contacto
            </div>

            <div class="family-grid">

              <div class="family-card">

                <div class="field-label">
                  Adulto responsable 1
                </div>

                <div class="field-value">
                  ${escapeHtml(
                    student.motherName ||
                      'Sin datos'
                  )}

                  ${
                    student.motherContact
                      ? `<br>${escapeHtml(
                          student.motherContact
                        )}`
                      : ''
                  }

                </div>

              </div>

              <div class="family-card">

                <div class="field-label">
                  Adulto responsable 2
                </div>

                <div class="field-value">
                  ${escapeHtml(
                    student.fatherName ||
                      'Sin datos'
                  )}

                  ${
                    student.fatherContact
                      ? `<br>${escapeHtml(
                          student.fatherContact
                        )}`
                      : ''
                  }

                </div>

              </div>

              <div class="family-card full">

                <div class="field-label">
                  Contacto de emergencia
                </div>

                <div class="field-value">
                  ${escapeHtml(
                    student.emergencyContact ||
                      'Sin datos'
                  )}
                </div>

              </div>

            </div>

          </div>

          <!-- ===============================================
               OBSERVACIONES
          ================================================ -->

          <div class="section">

            <div class="section-title">
              Observaciones
            </div>

            <div class="field full">

              <div class="field-value">
                ${escapeHtml(
                  student.notes ||
                    'Sin observaciones'
                )}
              </div>

            </div>

          </div>

          <!-- ===============================================
               PIE
          ================================================ -->

          <div class="footer">

            <div>
              ${escapeHtml(
                institutionName
              )}

              ${
                fullAddress
                  ? ` · ${escapeHtml(
                      fullAddress
                    )}`
                  : ''
              }
            </div>

            <div class="footer-right">

              ${
                documentFooter
                  ? `${escapeHtml(
                      documentFooter
                    )}<br>`
                  : ''
              }

              Legajo generado el
              ${new Date().toLocaleDateString(
                'es-AR'
              )}

            </div>

          </div>

        </div>

        <script>

          window.addEventListener(
            'load',
            function() {

              setTimeout(
                function() {
                  window.print();
                },
                300
              );

            }
          );

        </script>

      </body>
    </html>
  `);

  printWindow.document.close();
}
// ============================================================
// DETALLE
// ============================================================

function StudentDetailModal({
 student,
  groups,
  turns,
  journeys,
  onClose,
  institutionConfig,
  onEdit,
  onToggleActive,
  levels,
  onBitacora
}) {
  const assignment =
    getCurrentAssignment(
      student
    );

  const group = assignment
    ? groups.find(
        item =>
          item.id ===
          assignment.groupId
      )
    : null;

  const turnLabels =
    Array.isArray(
      assignment?.turnIds
    )
      ? assignment.turnIds
          .map(id =>
            turns.find(
              turn =>
                turn.id === id
            )?.name
          )
          .filter(Boolean)
      : [];

   const journey =
    journeys.find(
      item =>
        item.id ===
        assignment?.scheduleType
    )?.name ||
    assignment?.scheduleType ||
    '';
const levelName =
  levels.find(
    item =>
      item.id === student.level
  )?.name ||
 levelName;
const handlePrint = () => {
  console.log(
    'CENTRA → imprimir legajo',
    student.personId
  );
};
  return (
    <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">

      <div className="bg-white rounded-[28px] w-full max-w-3xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">

        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">

          <div className="flex items-center gap-3">

            <div className="w-12 h-12 rounded-2xl bg-violet-100 flex items-center justify-center text-violet-600">
              {student.photoUrl ? (
                <img
                  src={student.photoUrl}
                  alt=""
                  className="w-full h-full object-cover rounded-2xl"
                />
              ) : (
                <User size={22} />
              )}
            </div>

            <div>
              <h3 className="text-xl font-black text-slate-900">
                {student.lastName},{' '}
                {student.firstName}
              </h3>

              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Legajo del estudiante
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:text-red-500"
          >
            <X size={20} />
          </button>

        </div>

        <div className="p-6 overflow-y-auto space-y-4">

          <div className="grid md:grid-cols-3 gap-3">

            <InfoBox
              label="DNI"
              value={
                student.dni ||
                'Sin datos'
              }
            />

            <InfoBox
              label="Nacimiento"
              value={
                student.birthDate
                  ? `${formatDate(
                      student.birthDate
                    )} · ${calculateAge(
                      student.birthDate
                    )} años`
                  : 'Sin datos'
              }
            />

            <InfoBox
              label="Nivel"
              value={levelName}
            />

          </div>

          <section className="bg-slate-50 rounded-2xl p-4 border border-slate-200">

            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
              Contacto
            </h4>

            <div className="grid md:grid-cols-2 gap-3">

              <ContactLine
                icon={<MapPin size={15} />}
                label="Dirección"
                value={
                  student.address ||
                  'Sin datos'
                }
              />

              <ContactLine
                icon={<Phone size={15} />}
                label="Teléfono"
                value={
                  student.phone ||
                  'Sin datos'
                }
              />

              <ContactLine
                icon={<Mail size={15} />}
                label="Email"
                value={
                  student.email ||
                  'Sin datos'
                }
              />

              <ContactLine
                icon={<User size={15} />}
                label="Contacto de emergencia"
                value={
                  student.emergencyContact ||
                  'Sin datos'
                }
              />

            </div>

          </section>

          <section className="bg-violet-50 rounded-2xl p-4 border border-violet-100">

            <div className="flex items-center gap-2 mb-3">

              <GraduationCap
                size={16}
                className="text-violet-600"
              />

              <h4 className="text-[10px] font-black uppercase tracking-widest text-violet-500">
                Asignación actual
              </h4>

            </div>

            {group ? (
              <div className="grid md:grid-cols-3 gap-3">

                <InfoBox
                  label="Grupo"
                  value={
                    group.name
                  }
                />

                <InfoBox
                  label="Jornada"
                  value={
                    journey ||
                    'Sin jornada'
                  }
                />

                <InfoBox
                  label="Turno"
                  value={
                    turnLabels.join(
                      ' · '
                    ) ||
                    'Sin turno'
                  }
                />

              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-700 font-bold text-sm">
                <AlertCircle
                  size={17}
                />
                El estudiante no tiene una asignación actual.
              </div>
            )}

          </section>

          <div className="grid md:grid-cols-2 gap-3">

            <InfoBox
              label="Obra social"
              value={
                student.healthInsurance ||
                'No registrada'
              }
            />

            <InfoBox
              label="CUD"
              value={
                student.cudNumber ||
                'No registrado'
              }
            />

          </div>

          {(student.motherName ||
            student.fatherName) && (
            <section className="bg-white rounded-2xl border border-slate-200 p-4">

              <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                Familia
              </h4>

              <div className="grid md:grid-cols-2 gap-4">

                <ContactLine
                  icon={
                    <User size={15} />
                  }
                  label="Adulto responsable 1"
                  value={`${student.motherName || 'Sin nombre'}${student.motherContact ? ` · ${student.motherContact}` : ''}`}
                />

                <ContactLine
                  icon={
                    <User size={15} />
                  }
                  label="Adulto responsable 2"
                  value={`${student.fatherName || 'Sin nombre'}${student.fatherContact ? ` · ${student.fatherContact}` : ''}`}
                />

              </div>

            </section>
          )}

        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-2">

          <button
            type="button"
            onClick={onToggleActive}
            className={`px-4 py-2.5 rounded-xl font-black text-xs ${
              student.active === false
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-600'
            }`}
          >
            {student.active === false
              ? 'Reactivar estudiante'
              : 'Marcar como inactivo'}
          </button>

          <button
            type="button"
            onClick={onEdit}
            className="px-4 py-2.5 rounded-xl bg-violet-600 text-white font-black text-xs flex items-center gap-2"
          >
            <Edit3 size={16} />
            Editar legajo
          </button>
          <button
  type="button"
  onClick={() => onBitacora()}
  className="px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 font-black text-xs flex items-center gap-2 hover:bg-emerald-100"
>
  <BookOpen size={16} />
  Bitácora
</button>
<button
  type="button"
  onClick={handlePrint}
  className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-black text-xs flex items-center gap-2 hover:bg-slate-200"
>
  <Printer size={16} />
  Imprimir legajo
 </button>

        </div>

      </div>

    </div>
  );
}
function InfoBox({
  label,
  value
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-3">

      <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </p>

      <p className="text-sm font-black text-slate-700 mt-1">
        {value}
      </p>

    </div>
  );
}

function ContactLine({
  icon,
  label,
  value
}) {
  return (
    <div className="flex items-start gap-2">

      <div className="mt-0.5 text-violet-500">
        {icon}
      </div>

      <div className="min-w-0">

        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
          {label}
        </p>

        <p className="text-xs font-bold text-slate-700 break-words">
          {value}
        </p>

      </div>

    </div>
  );
}
const printBitacora = (
  student,
  entries,
  institutionConfig
) => {
  const escapeHtml = value =>
    String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

  const primary =
    institutionConfig?.primaryColor ||
    '#6d28d9';

  const secondary =
    institutionConfig?.secondaryColor ||
    '#f97316';

  const background =
    institutionConfig?.backgroundColor ||
    '#f8fafc';

  const institutionName =
    institutionConfig?.institutionName ||
    'Mi Institución';

  const logoUrl =
    institutionConfig?.logoUrl ||
    '';

  const address =
    [
      institutionConfig?.address,
      institutionConfig?.city,
      institutionConfig?.province
    ]
      .filter(Boolean)
      .join(' · ');

  const contact =
    [
      institutionConfig?.phone,
      institutionConfig?.email,
      institutionConfig?.website
    ]
      .filter(Boolean)
      .join(' · ');

  const printWindow =
    window.open(
      '',
      '_blank',
      'width=1000,height=900'
    );

  if (!printWindow) {
    alert(
      'El navegador bloqueó la ventana de impresión.'
    );
    return;
  }

  printWindow.document.write(`
    <!doctype html>

    <html lang="es">
      <head>

        <meta charset="UTF-8" />

        <title>
          Bitácora -
          ${escapeHtml(
            student.lastName
          )},
          ${escapeHtml(
            student.firstName
          )}
        </title>

        <style>

          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family:
              Arial,
              Helvetica,
              sans-serif;

            color: #1e293b;

            font-size: 10px;

            -webkit-print-color-adjust:
              exact;

            print-color-adjust:
              exact;
          }

          .header {
            display: flex;
            align-items: center;
            gap: 12px;

            padding: 10px 12px;

            border-radius: 9px;

            background:
              linear-gradient(
                135deg,
                ${primary},
                ${secondary}
              );

            color: white;

            margin-bottom: 14px;
          }

          .logo {
            width: 55px;
            height: 42px;

            object-fit: contain;

            background: white;

            padding: 4px;

            border-radius: 6px;
          }

          .institution {
            font-size: 13px;
            font-weight: 900;
            text-transform: uppercase;
          }

          .institution-meta {
            font-size: 7px;
            margin-top: 3px;
            opacity: .9;
          }

          .title {
            color: ${primary};
            font-size: 19px;
            font-weight: 900;
            text-transform: uppercase;
          }

          .student {
            font-size: 9px;
            color: #64748b;
            font-weight: 700;
            margin-top: 3px;
          }

          .section-title {
            margin-top: 14px;

            padding: 5px 8px;

            border-left:
              3px solid ${primary};

            background: ${background};

            color: ${primary};

            border-radius: 5px;

            font-size: 8px;

            font-weight: 900;

            text-transform: uppercase;
          }

          .entry {
            margin-top: 8px;

            padding: 9px 10px;

            border:
              1px solid #e2e8f0;

            border-radius: 7px;

            page-break-inside: avoid;
          }

          .entry-top {
            display: flex;
            justify-content: space-between;
            gap: 10px;
          }

          .entry-type {
            color: ${primary};
            font-size: 8px;
            font-weight: 900;
            text-transform: uppercase;
          }

          .entry-date {
            color: #64748b;
            font-size: 7px;
            font-weight: 700;
          }

          .entry-text {
            margin-top: 6px;

            font-size: 9px;

            line-height: 1.35;

            white-space: pre-wrap;
          }

          .entry-author {
            margin-top: 6px;

            font-size: 7px;

            color: #64748b;
          }

          .footer {
            margin-top: 12px;

            border-top:
              1px solid #e2e8f0;

            padding-top: 6px;

            color: #64748b;

            font-size: 7px;
          }

        </style>

      </head>

      <body>

        <div class="header">

          ${
            logoUrl
              ? `
                <img
                  src="${escapeHtml(
                    logoUrl
                  )}"
                  class="logo"
                  alt="Logo"
                />
              `
              : ''
          }

          <div>

            <div class="institution">
              ${escapeHtml(
                institutionName
              )}
            </div>

            ${
              address
                ? `
                  <div class="institution-meta">
                    ${escapeHtml(
                      address
                    )}
                  </div>
                `
                : ''
            }

            ${
              contact
                ? `
                  <div class="institution-meta">
                    ${escapeHtml(
                      contact
                    )}
                  </div>
                `
                : ''
            }

          </div>

        </div>

        <div class="title">
          Bitácora
        </div>

        <div class="student">
          Legajo del estudiante ·
          ${escapeHtml(
            student.lastName
          )},
          ${escapeHtml(
            student.firstName
          )}
        </div>

        <div class="section-title">
          Registros
        </div>

        ${
          entries.length === 0
            ? `
              <div class="entry">
                No hay registros en la bitácora.
              </div>
            `
            : entries
                .map(
                  entry => `
                    <div class="entry">

                      <div class="entry-top">

                        <div class="entry-type">
                          ${escapeHtml(
                            entry.type ||
                              'Registro'
                          )}
                        </div>

                        <div class="entry-date">
                          ${escapeHtml(
                            formatDate(
                              entry.date
                            )
                          )}
                        </div>

                      </div>

                      <div class="entry-text">
                        ${escapeHtml(
                          entry.text
                        )}
                      </div>

                      <div class="entry-author">
                        Registrado por:
                        ${escapeHtml(
                          entry.author ||
                            'Usuario'
                        )}
                      </div>

                    </div>
                  `
                )
                .join('')
        }

        <div class="footer">
          ${escapeHtml(
            institutionName
          )}
          · Bitácora generada el
          ${new Date().toLocaleDateString(
            'es-AR'
          )}
        </div>

        <script>
          window.addEventListener(
            'load',
            function() {
              setTimeout(
                function() {
                  window.print();
                },
                300
              );
            }
          );
        </script>

      </body>
    </html>
  `);

  printWindow.document.close();
};
// ============================================================
// FORMULARIO
// ============================================================

function BitacoraModal({
  student,
  entries,
  loading,
  onClose,
  db,
  appId,
  institutionConfig,
  user
}) {
  const [text, setText] =
    useState('');

  const [saving, setSaving] =
    useState(false);
  const handlePrint = () => {
  printBitacora(
    student,
    entries,
    institutionConfig
  );
};

  const addEntry = async () => {
    const cleanText =
      text.trim();

    if (!cleanText) return;

    setSaving(true);

    try {
      await setDoc(
        doc(
          db,
          'artifacts',
          appId,
          'public',
          'data',
          COLLECTIONS.STUDENT_BITACORA,
          crypto.randomUUID()
        ),
        {
          studentId:
            student.personId,

          date:
            new Date().toISOString(),

          type: 'Nota',

          severity: 'medium',

          text: cleanText,

          author:
            user?.fullName ||
            user?.firstName ||
            'Usuario',

          authorId:
            user?.id || null,

          createdAt:
            serverTimestamp()
        }
      );

      setText('');

    } catch (error) {
      console.error(
        'Error guardando bitácora:',
        error
      );

      alert(
        `No se pudo guardar la bitácora: ${
          error?.message || error
        }`
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">

      <div className="bg-white rounded-[28px] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">

        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">

          <div>
            <h3 className="text-xl font-black text-slate-900">
              Bitácora
            </h3>

            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
              {student.lastName},{' '}
              {student.firstName}
            </p>
          </div>
<button
  type="button"
  onClick={handlePrint}
  className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 font-black text-xs flex items-center gap-2"
>
  <Printer size={15} />
  Imprimir
</button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 text-slate-500"
          >
            <X size={20} />
          </button>

        </div>

        <div className="p-5 border-b border-slate-100 bg-slate-50">

          <textarea
            value={text}
            onChange={event =>
              setText(
                event.target.value
              )
            }
            rows={3}
            placeholder="Escribí una observación o registro..."
            className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm font-medium outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-100 resize-none"
          />

          <div className="flex justify-end mt-2">

            <button
              type="button"
              onClick={addEntry}
              disabled={
                saving ||
                !text.trim()
              }
              className="px-4 py-2.5 rounded-xl bg-violet-600 text-white font-black text-xs disabled:opacity-40 flex items-center gap-2"
            >
              <Plus size={16} />
              {saving
                ? 'Guardando...'
                : 'Agregar registro'}
            </button>

          </div>

        </div>

        <div className="flex-1 overflow-y-auto p-5">

          {loading ? (
            <div className="py-10 text-center text-xs font-black uppercase tracking-widest text-slate-400">
              Cargando bitácora...
            </div>
          ) : entries.length === 0 ? (
            <div className="py-10 text-center">

              <BookOpen
                size={32}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 text-sm font-bold text-slate-400">
                Todavía no hay registros.
              </p>

            </div>
          ) : (

            <div className="space-y-3">

              {entries.map(entry => (

                <div
                  key={entry.id}
                  className="border border-slate-200 rounded-2xl p-4 bg-white"
                >

                  <div className="flex items-center justify-between gap-3">

                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-violet-500">
                        {entry.type ||
                          'Registro'}
                      </p>

                      <p className="text-[10px] text-slate-400 font-bold mt-1">
                        {formatDate(
                          entry.date
                        )}{' '}
                        ·{' '}
                        {entry.author ||
                          'Usuario'}
                      </p>
                    </div>

                    <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-500 text-[8px] font-black uppercase">
                      {entry.severity ||
                        'medium'}
                    </span>

                  </div>

                  <p className="mt-3 text-sm text-slate-700 font-medium whitespace-pre-wrap">
                    {entry.text}
                  </p>

                </div>

              ))}

            </div>
          )}

        </div>

      </div>

    </div>
  );
}
function StudentFormModal({
  student,
  groups,
  levels,
  turns,
  journeys,
  onClose,
  onSave,
  saving
}) {
  const currentAssignment =
    getCurrentAssignment(
      student
    );

  const currentGroupId =
    currentAssignment?.groupId ||
    '';

  const currentTurnIds =
    currentAssignment?.turnIds ||
    [];

  const currentJourney =
    currentAssignment?.scheduleType ||
    journeys[0]?.id ||
    'simple';

  return (
    <div className="fixed inset-0 z-[400] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">

      <form
        onSubmit={onSave}
        className="bg-white rounded-[28px] w-full max-w-3xl max-h-[94vh] overflow-y-auto shadow-2xl"
      >

        <div className="sticky top-0 bg-white z-10 px-6 py-5 border-b border-slate-100 flex items-center justify-between">

          <div>
            <h3 className="text-xl font-black text-slate-900">
              {student.isNew
                ? 'Nuevo estudiante'
                : 'Editar estudiante'}
            </h3>

            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
              Datos personales y escolaridad
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 text-slate-500"
          >
            <X size={20} />
          </button>

        </div>

        <div className="p-6 space-y-5">

          {/* DATOS BÁSICOS */}

          <section>

            <SectionTitle>
              Datos personales
            </SectionTitle>

            <div className="grid md:grid-cols-2 gap-3">

              <Input
                name="firstName"
                label="Nombre"
                defaultValue={
                  student.firstName
                }
                required
              />

              <Input
                name="lastName"
                label="Apellido"
                defaultValue={
                  student.lastName
                }
                required
              />

              <Input
                name="dni"
                label="DNI"
                defaultValue={
                  student.dni
                }
              />

              <Input
                name="birthDate"
                label="Fecha de nacimiento"
                type="date"
                defaultValue={
                  student.birthDate || ''
                }
              />

              <Select
                name="gender"
                label="Género"
                defaultValue={
                  student.gender ||
                  ''
                }
              >
                <option value="">
                  Seleccionar
                </option>
                <option value="F">
                  Mujer
                </option>
                <option value="M">
                  Varón
                </option>
                <option value="X">
                  Otro
                </option>
              </Select>

              <Select
                name="active"
                label="Estado"
                defaultValue={
                  student.active ===
                  false
                    ? 'false'
                    : 'true'
                }
              >
                <option value="true">
                  Activo
                </option>
                <option value="false">
                  Inactivo
                </option>
              </Select>

            </div>

          </section>

          {/* CONTACTO */}

          <section>

            <SectionTitle>
              Contacto y familia
            </SectionTitle>

            <div className="grid md:grid-cols-2 gap-3">

              <Input
                name="address"
                label="Dirección"
                defaultValue={
                  student.address
                }
              />

              <Input
                name="city"
                label="Localidad"
                defaultValue={
                  student.city
                }
              />

              <Input
                name="phone"
                label="Teléfono"
                defaultValue={
                  student.phone
                }
              />

              <Input
                name="email"
                label="Email"
                type="email"
                defaultValue={
                  student.email
                }
              />

              <Input
                name="motherName"
                label="Adulto responsable 1"
                defaultValue={
                  student.motherName
                }
              />

              <Input
                name="motherContact"
                label="Contacto responsable 1"
                defaultValue={
                  student.motherContact
                }
              />

              <Input
                name="fatherName"
                label="Adulto responsable 2"
                defaultValue={
                  student.fatherName
                }
              />

              <Input
                name="fatherContact"
                label="Contacto responsable 2"
                defaultValue={
                  student.fatherContact
                }
              />

              <Input
                name="emergencyContact"
                label="Contacto de emergencia"
                defaultValue={
                  student.emergencyContact
                }
              />

            </div>

          </section>

          {/* SALUD */}

          <section>

            <SectionTitle>
              Salud y documentación
            </SectionTitle>

            <div className="grid md:grid-cols-2 gap-3">

              <Input
                name="healthInsurance"
                label="Obra social / prepaga"
                defaultValue={
                  student.healthInsurance
                }
              />

              <Input
                name="cudNumber"
                label="Número de CUD"
                defaultValue={
                  student.cudNumber
                }
              />

              <Input
                name="cudExpiration"
                label="Vencimiento CUD"
                type="date"
                defaultValue={
                  student.cudExpiration ||
                  ''
                }
              />

              <Input
                name="photoUrl"
                label="URL de foto"
                defaultValue={
                  student.photoUrl
                }
              />

            </div>

          </section>

          {/* ESCOLARIDAD */}

          <section>

            <SectionTitle>
              Escolaridad
            </SectionTitle>

            <div className="grid md:grid-cols-2 gap-3">

              <Select
  name="level"
  label="Nivel"
  defaultValue={student.level || ''}
>
  <option value="">
    Seleccionar
  </option>

  {levels.map(level => (
    <option
      key={level.id}
      value={level.id}
    >
      {level.name}
    </option>
  ))}
</Select>

              <div />

              <Select
                name="groupId"
                label="Grupo"
                defaultValue={
                  currentGroupId
                }
              >
                <option value="">
                  Sin asignar
                </option>

                {groups.map(
                  group => (
                    <option
                      key={group.id}
                      value={group.id}
                    >
                      {group.name}
                    </option>
                  )
                )}
              </Select>

              <Select
                name="scheduleType"
                label="Jornada"
                defaultValue={
                  currentJourney
                }
              >
                <option value="">
                  Seleccionar
                </option>

                {journeys.map(
                  journey => (
                    <option
                      key={journey.id}
                      value={journey.id}
                    >
                      {journey.name}
                    </option>
                  )
                )}
              </Select>

            </div>

            <div className="mt-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">

              <div className="flex items-center gap-2 mb-3">

                <Clock3
                  size={16}
                  className="text-violet-600"
                />

                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Turnos
                </span>

              </div>

              <div className="flex flex-wrap gap-2">

                {turns.map(turn => (

                  <label
                    key={turn.id}
                    className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl cursor-pointer"
                  >

                    <input
                      type="checkbox"
                      name="turnId"
                      value={turn.id}
                      defaultChecked={currentTurnIds.includes(
                        turn.id
                      )}
                      className="accent-violet-600"
                    />

                    <span className="text-xs font-bold text-slate-600">
                      {turn.name}
                    </span>

                  </label>

                ))}

                {turns.length === 0 && (
                  <p className="text-xs text-slate-400">
                    Todavía no hay turnos configurados.
                  </p>
                )}

              </div>

            </div>

          </section>

          {/* OBSERVACIONES */}

          <section>

            <SectionTitle>
              Observaciones
            </SectionTitle>

            <textarea
              name="notes"
              defaultValue={
                student.notes || ''
              }
              rows={4}
              placeholder="Observaciones institucionales..."
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-violet-400 text-sm font-medium resize-none"
            />

          </section>

        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 flex gap-2 justify-end">

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-xl bg-slate-100 text-slate-600 font-black text-xs"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-black text-xs flex items-center gap-2 disabled:opacity-60"
          >
            <Save size={16} />
            {saving
              ? 'Guardando...'
              : 'Guardar estudiante'}
          </button>

        </div>

      </form>

    </div>
  );
}

function SectionTitle({
  children
}) {
  return (
    <div className="flex items-center gap-2 mb-3">

      <div className="w-1.5 h-4 rounded-full bg-violet-600" />

      <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
        {children}
      </h4>

    </div>
  );
}

function Input({
  label,
  name,
  defaultValue,
  type = 'text',
  required = false,
  placeholder = ''
}) {
  return (
    <label className="block">

      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
        {label}
      </span>

      <input
        name={name}
        type={type}
        defaultValue={
          defaultValue || ''
        }
        required={required}
        placeholder={placeholder}
        className="mt-1 w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 text-sm font-semibold text-slate-700"
      />

    </label>
  );
}

function Select({
  label,
  name,
  defaultValue,
  children
}) {
  return (
    <label className="block">

      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
        {label}
      </span>

      <select
        name={name}
        defaultValue={
          defaultValue || ''
        }
        className="mt-1 w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-violet-400 text-sm font-semibold text-slate-700"
      >
        {children}
      </select>

    </label>
  );
}

export default MatriculaView;
