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

  const turns = useMemo(() => {
    if (
      !Array.isArray(
        institutionConfig?.turns
      )
    ) {
      return [];
    }

    return institutionConfig.turns.map(
      (turn, index) =>
        typeof turn === 'string'
          ? {
              id:
                turn
                  .toLowerCase()
                  .replace(
                    /[^a-z0-9]+/g,
                    '_'
                  ),
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
              id:
                item
                  .toLowerCase()
                  .replace(
                    /[^a-z0-9]+/g,
                    '_'
                  ),
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
      !Array.isArray(
        assignment.turnIds
      )
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
          COLLECTIONS.STUDENT_PROFILES,
          personId
        ),
        {
          personId,

          firstName,
          lastName,
          fullName:
            `${firstName} ${lastName}`.trim(),

          dni:
            String(
              data.dni || ''
            ).trim(),

          birthDate:
            data.birthDate || null,

          gender:
            data.gender || '',

          level:
            data.level || '',

          address:
            data.address || '',

          city:
            data.city || '',

          phone:
            data.phone || '',

          email:
            data.email || '',

          motherName:
            data.motherName || '',

          motherContact:
            data.motherContact || '',

          fatherName:
            data.fatherName || '',

          fatherContact:
            data.fatherContact || '',

          healthInsurance:
            data.healthInsurance || '',

          emergencyContact:
            data.emergencyContact || '',

          cudNumber:
            data.cudNumber || '',

          cudExpiration:
            data.cudExpiration || null,

          photoUrl:
            data.photoUrl || '',

          notes:
            data.notes || '',

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
        'CENTRA → student_profiles guardado correctamente'
      );
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
    try {
           await updateDoc(
        DOC(
          db,
          appId,
          COLLECTIONS.PEOPLE,
          student.personId
        ),
        {
          active:
            student.active === false
              ? true
              : false,

          updatedAt:
            serverTimestamp()
        }
      );
        {
          active:
            student.active === false
              ? true
              : false,

          updatedAt:
            serverTimestamp()
        }
      );
    } catch (error) {
      console.error(error);

      alert(
        `No se pudo actualizar el estado: ${error.message}`
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

              <select
                value={filters.status}
                onChange={event =>
                  setFilters(prev => ({
                    ...prev,
                    status:
                      event.target.value
                  }))
                }
                className="p-3 bg-white rounded-xl border border-slate-200 text-xs font-bold"
              >
                <option value="active">
                  Activos
                </option>
                <option value="inactive">
                  Inactivos
                </option>
                <option value="all">
                  Todos
                </option>
              </select>

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

      {viewingStudent && (
        <StudentDetailModal
          student={viewingStudent}
          groups={groups}
          turns={turns}
          journeys={journeys}
          onClose={() =>
            setViewingStudent(null)
          }
          onEdit={() => {
            const student =
              students.find(
                item =>
                  item.id ===
                  viewingStudent.id
              );

            setViewingStudent(null);

            if (student) {
              openEdit(student);
            }
          }}
          onToggleActive={() =>
            toggleActive(
              viewingStudent
            )
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

// ============================================================
// DETALLE
// ============================================================

function StudentDetailModal({
  student,
  groups,
  turns,
  journeys,
  onClose,
  onEdit,
  onToggleActive
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
              value={
                student.level ||
                'Sin nivel'
              }
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

// ============================================================
// FORMULARIO
// ============================================================

function StudentFormModal({
  student,
  groups,
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

              <Input
                name="level"
                label="Nivel"
                defaultValue={
                  student.level
                }
                placeholder="Ej.: Primaria"
              />

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
