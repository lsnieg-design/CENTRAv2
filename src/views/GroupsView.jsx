import { normalizeAppConfig } from '../config';
import React, { useEffect, useMemo, useState } from 'react';
import {
  User,
  FileText,
  Plus,
  Users,
  Grid,
  ChevronRight,
  ChevronLeft,
  Printer,
  MessageSquare,
  Send,
  Edit3,
  X,
  Search,
  Settings2,
  UserPlus,
  UsersRound,
  Save,
  Zap,
  Phone,
  Mail,
  MapPin,
  CalendarDays,
  Clock3,
  ExternalLink,
  Trash2
} from 'lucide-react';
import {
  doc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  where
} from 'firebase/firestore';
import { createGroup, updateGroup } from '../data/groups';
import {
  createStaffGroupAssignment,
  closeStaffGroupAssignment,
  getStaffGroupAssignmentsForGroup
} from '../data/assignments';
import { COLLECTIONS } from '../data/collections';

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

const formatDate = value => {
  if (!value) return '';

  try {
    if (value?.toDate) {
      return value
        .toDate()
        .toLocaleDateString('es-AR');
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return date.toLocaleDateString('es-AR');
  } catch {
    return '';
  }
};

const formatDateTime = value => {
  if (!value) return '';

  try {
    const date = value?.toDate
      ? value.toDate()
      : new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '';
    }

    return `${date.toLocaleDateString('es-AR')} · ${date.toLocaleTimeString('es-AR', {
      hour: '2-digit',
      minute: '2-digit'
    })}`;
  } catch {
    return '';
  }
};

const escapeHtml = value =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const getAssignmentPlacements = assignment => {
  if (!assignment) return [];

  if (
    Array.isArray(assignment.placements) &&
    assignment.placements.length > 0
  ) {
    return assignment.placements;
  }

  const groupId = assignment.groupId || '';
  const turnIds = Array.isArray(assignment.turnIds)
    ? assignment.turnIds
    : [];

  if (!groupId) return [];

  return turnIds.map(turnId => ({
    groupId,
    turnId
  }));
};

const getCurrentAssignment = student =>
  student?.groupAssignments?.find(
    assignment =>
      assignment.status === 'active' &&
      !assignment.validTo
  ) || null;

const INCIDENT_TYPES = [
  {
    label: 'Trabajó muy bien',
    emoji: '🌟',
    severity: 'positive',
    className:
      'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
  },
  {
    label: 'Buena disposición',
    emoji: '😊',
    severity: 'positive',
    className:
      'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
  },
  {
    label: 'Logro / aprendizaje',
    emoji: '🏆',
    severity: 'positive',
    className:
      'bg-teal-50 border-teal-200 text-teal-800 hover:bg-teal-100'
  },
  {
    label: 'Participación',
    emoji: '🙌',
    severity: 'positive',
    className:
      'bg-cyan-50 border-cyan-200 text-cyan-800 hover:bg-cyan-100'
  },
  {
    label: 'Crisis / desregulación',
    emoji: '😭',
    severity: 'medium',
    className:
      'bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100'
  },
  {
    label: 'Conflicto / agresión',
    emoji: '✊',
    severity: 'high',
    className:
      'bg-red-50 border-red-200 text-red-800 hover:bg-red-100'
  },
  {
    label: 'Fuga / intento',
    emoji: '🏃',
    severity: 'high',
    className:
      'bg-red-50 border-red-200 text-red-800 hover:bg-red-100'
  },
  {
    label: 'Ausentismo',
    emoji: '🏠',
    severity: 'medium',
    className:
      'bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100'
  }
];

export function GroupsView({
  user,
  db,
  appId,
  setActiveTab,
  onSelectStudent
}) {
  const [students, setStudents] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [groups, setGroups] = useState([]);
  const [staffAssignments, setStaffAssignments] = useState([]);
  const [institutionConfig, setInstitutionConfig] = useState(() =>
    normalizeAppConfig({})
  );

  const [selectedTurnId, setSelectedTurnId] =
    useState('all');
  const [selectedGroupDetails, setSelectedGroupDetails] =
    useState(null);
  const [selectedStudent, setSelectedStudent] =
    useState(null);
  const [showBitacoraModal, setShowBitacoraModal] =
    useState(null);
  const [bitacoraEntries, setBitacoraEntries] =
    useState([]);
  const [groupMessages, setGroupMessages] =
    useState({});
  const [editingGroup, setEditingGroup] =
    useState(null);
  const [staffSelections, setStaffSelections] =
    useState({});
  const [updatingGroup, setUpdatingGroup] =
    useState(false);
  const [newNote, setNewNote] = useState('');
  const [isWriting, setIsWriting] =
    useState(false);
  const [savingIncident, setSavingIncident] =
    useState(false);
  const [editingBitacoraEntry, setEditingBitacoraEntry] =
    useState(null);
  const [editingBitacoraText, setEditingBitacoraText] =
    useState('');
  const [showPrintOptions, setShowPrintOptions] =
    useState(false);
  const [groupsToPrint, setGroupsToPrint] =
    useState([]);
  const [printMode, setPrintMode] =
    useState('students');
  const [searchTerm, setSearchTerm] =
    useState('');

  const institutionMode =
    institutionConfig?.institutionMode ||
    'school';

  const personLabel =
    institutionMode === 'day_center'
      ? 'concurrente'
      : institutionMode === 'clinic'
      ? 'paciente'
      : 'estudiante';

  const personLabelPlural =
    institutionMode === 'day_center'
      ? 'concurrentes'
      : institutionMode === 'clinic'
      ? 'pacientes'
      : 'estudiantes';

  const groupLabel =
    institutionMode === 'day_center'
      ? 'taller / grupo'
      : institutionMode === 'clinic'
      ? 'espacio / equipo'
      : 'grupo';

  const groupLabelPlural =
    institutionMode === 'day_center'
      ? 'talleres / grupos'
      : institutionMode === 'clinic'
      ? 'espacios / equipos'
      : 'grupos';

  const isManagement =
    user?.rol === 'admin' ||
    user?.rol === 'super-admin' ||
    user?.accessRoleId === 'admin' ||
    [
      'admin',
      'super-admin',
      'Equipo Directivo',
      'Equipo Técnico',
      'Administración'
    ].includes(user?.role);

  const scheduleTypeOptions = useMemo(
    () =>
      (Array.isArray(
        institutionConfig.scheduleTypes
      )
        ? institutionConfig.scheduleTypes
        : []
      ).map((item, index) => {
        if (typeof item === 'string') {
          return {
            id: item
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '_'),
            name: item
          };
        }

        return {
          id:
            item?.id ||
            `jornada_${index + 1}`,
          name:
            item?.name ||
            item?.label ||
            `Jornada ${index + 1}`
        };
      }),
    [institutionConfig.scheduleTypes]
  );

  const turnOptions = useMemo(
    () =>
      (Array.isArray(institutionConfig.turns)
        ? institutionConfig.turns
        : []
      ).map((turn, index) => {
        if (typeof turn === 'string') {
          return {
            id: `turno_${index + 1}`,
            name: turn
          };
        }

        return {
          id:
            turn?.id ||
            `turno_${index + 1}`,
          name:
            turn?.name ||
            turn?.label ||
            `Turno ${index + 1}`
        };
      }),
    [institutionConfig.turns]
  );

  const roleOptions = useMemo(
    () =>
      (Array.isArray(institutionConfig.roles)
        ? institutionConfig.roles
        : []
      ).map((role, index) => {
        if (typeof role === 'string') {
          return {
            id: role
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, '_'),
            name: role,
            requiredForGroup: false
          };
        }

        return {
          id:
            role?.id ||
            `rol_${index + 1}`,
          name:
            role?.name ||
            role?.label ||
            `Rol ${index + 1}`,
          requiredForGroup:
            Boolean(role?.requiredForGroup)
        };
      }),
    [institutionConfig.roles]
  );

  const defaultGroupRole =
    roleOptions.find(
      role => role.requiredForGroup
    ) ||
    roleOptions[0] ||
    null;

  const normalizeRoles = roles => {
    const result = Array.isArray(roles)
      ? [...roles]
      : [];

    if (
      result.length === 0 &&
      defaultGroupRole?.id
    ) {
      result.unshift(
        defaultGroupRole.id
      );
    }

    return [...new Set(result)];
  };

  const getTurnLabel = turnId =>
    turnOptions.find(
      turn => turn.id === turnId
    )?.name ||
    turnId ||
    '';

  const getRoleLabel = roleId =>
    roleOptions.find(
      role => role.id === roleId
    )?.name ||
    roleId ||
    'Rol';

  const getScheduleTypeLabel = scheduleType =>
    scheduleTypeOptions.find(
      item => item.id === scheduleType
    )?.name ||
    scheduleType ||
    '';

  useEffect(() => {
    if (!db || !appId) return undefined;

    let studentPeople = [];
    let studentProfiles = [];
    let studentAssignments = [];

    const unsubs = [];

    const rebuildStudents = () => {
      const peopleById = new Map(
        studentPeople.map(person => [
          person.id,
          person
        ])
      );

      const result = studentProfiles.map(
        profile => {
          const person =
            peopleById.get(
              profile.personId
            ) || {};

          const assignments =
            studentAssignments.filter(
              item =>
                item.studentId ===
                  (profile.personId ||
                    person.id) &&
                item.status !== 'closed' &&
                !item.validTo
            );

          return {
            ...person,
            ...profile,
            id:
              profile.personId ||
              person.id,
            personId:
              profile.personId ||
              person.id,
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
              assignments
          };
        }
      );

      setStudents(result);
    };

    unsubs.push(
      onSnapshot(
        doc(
          db,
          'artifacts',
          appId,
          'public',
          'data',
          'config',
          'institution'
        ),
        snapshot => {
          setInstitutionConfig(
            normalizeAppConfig(
              snapshot.exists()
                ? snapshot.data()
                : {}
            )
          );
        }
      )
    );

    unsubs.push(
      onSnapshot(
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
                group =>
                  group.active !== false
              )
              .sort((a, b) =>
                (a.name || '').localeCompare(
                  b.name || ''
                )
              )
          );
        }
      )
    );

    unsubs.push(
      onSnapshot(
        query(
          BASE(
            db,
            appId,
            COLLECTIONS.PEOPLE
          ),
          where('type', '==', 'staff')
        ),
        snapshot => {
          setStaffList(
            snapshot.docs.map(item => ({
              id: item.id,
              ...item.data()
            }))
          );
        }
      )
    );

    unsubs.push(
      onSnapshot(
        query(
          BASE(
            db,
            appId,
            COLLECTIONS.PEOPLE
          ),
          where('type', '==', 'student')
        ),
        snapshot => {
          studentPeople = snapshot.docs.map(
            item => ({
              id: item.id,
              ...item.data()
            })
          );
          rebuildStudents();
        }
      )
    );

    unsubs.push(
      onSnapshot(
        BASE(
          db,
          appId,
          COLLECTIONS.STUDENT_PROFILES
        ),
        snapshot => {
          studentProfiles = snapshot.docs.map(
            item => ({
              id: item.id,
              ...item.data()
            })
          );
          rebuildStudents();
        }
      )
    );

    unsubs.push(
      onSnapshot(
        BASE(
          db,
          appId,
          COLLECTIONS.STUDENT_GROUP_ASSIGNMENTS
        ),
        snapshot => {
          studentAssignments = snapshot.docs.map(
            item => ({
              id: item.id,
              ...item.data()
            })
          );
          rebuildStudents();
        }
      )
    );

    unsubs.push(
      onSnapshot(
        BASE(
          db,
          appId,
          COLLECTIONS.STAFF_GROUP_ASSIGNMENTS
        ),
        snapshot => {
          setStaffAssignments(
            snapshot.docs.map(item => ({
              id: item.id,
              ...item.data()
            }))
          );
        }
      )
    );

    unsubs.push(
      onSnapshot(
        query(
          BASE(
            db,
            appId,
            COLLECTIONS.STUDENT_BITACORA
          ),
          orderBy('date', 'desc')
        ),
        snapshot => {
          setBitacoraEntries(
            snapshot.docs.map(item => ({
              id: item.id,
              ...item.data()
            }))
          );
        }
      )
    );

    unsubs.push(
      onSnapshot(
        query(
          BASE(
            db,
            appId,
            'group_mural'
          ),
          orderBy('createdAt', 'desc')
        ),
        snapshot => {
          const messages =
            snapshot.docs.map(item => ({
              id: item.id,
              ...item.data()
            }));

          const grouped = messages.reduce(
            (acc, message) => {
              const key =
                message.groupId ||
                message.groupName ||
                'sin-grupo';

              if (!acc[key]) {
                acc[key] = [];
              }

              acc[key].push(message);
              return acc;
            },
            {}
          );

          setGroupMessages(grouped);
        }
      )
    );

    return () => {
      unsubs.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, [db, appId]);

  const gruposFinales = useMemo(() => {
    const normalizedSearch =
      normalizeText(searchTerm);

    return groups
      .filter(group => {
        if (
          selectedTurnId === 'all'
        ) {
          return true;
        }

        const turnIds =
          Array.isArray(group.turnIds)
            ? group.turnIds
            : group.turnId
            ? [group.turnId]
            : [];

        return turnIds.includes(
          selectedTurnId
        );
      })
      .filter(group => {
        if (!normalizedSearch) {
          return true;
        }

        const searchable = normalizeText(
          [
            group.name,
            group.classroom,
            group.levelId,
            group.sectionId
          ]
            .filter(Boolean)
            .join(' ')
        );

        return searchable.includes(
          normalizedSearch
        );
      })
      .map(group => {
        const turnIds =
          Array.isArray(group.turnIds)
            ? group.turnIds
            : group.turnId
            ? [group.turnId]
            : [];

        const studentsInGroup =
          students.filter(student => {
            const assignments =
              student.groupAssignments || [];

            return assignments.some(
              assignment => {
                const placements =
                  getAssignmentPlacements(
                    assignment
                  );

                return placements.some(
                  placement => {
                    if (
                      placement.groupId !==
                      group.id
                    ) {
                      return false;
                    }

                    if (
                      selectedTurnId ===
                      'all'
                    ) {
                      return true;
                    }

                    return (
                      placement.turnId ===
                      selectedTurnId
                    );
                  }
                );
              }
            );
          });

        const staffByRole =
          staffAssignments
            .filter(
              item =>
                item.groupId ===
                  group.id &&
                item.status !== 'closed' &&
                !item.validTo
            )
            .map(assignment => {
              const person =
                staffList.find(
                  item =>
                    item.id ===
                    assignment.staffId
                );

              return {
                ...assignment,
                person,
                roleName:
                  getRoleLabel(
                    assignment.roleId
                  ),
                name:
                  person?.fullName ||
                  `${person?.lastName || ''}, ${person?.firstName || ''}`.replace(
                    /^, /,
                    ''
                  ) ||
                  'Sin asignar'
              };
            });

        return {
          ...group,
          turnIds,
          turnLabels:
            turnIds
              .map(getTurnLabel)
              .filter(Boolean),
          enabledRoles:
            normalizeRoles(
              group.enabledRoles
            ),
          students:
            studentsInGroup,
          staffByRole
        };
      });
  }, [
    groups,
    students,
    staffList,
    staffAssignments,
    selectedTurnId,
    searchTerm,
    roleOptions
  ]);

  const assignedGroupsForStudent = student => {
    const assignment =
      getCurrentAssignment(student);

    if (!assignment) return [];

    return getAssignmentPlacements(
      assignment
    )
      .map(placement => {
        const group =
          groups.find(
            item =>
              item.id ===
              placement.groupId
          );

        const turn =
          turnOptions.find(
            item =>
              item.id ===
              placement.turnId
          );

        if (!group) return null;

        return {
          group,
          turn
        };
      })
      .filter(Boolean);
  };

  const openCreateGroup = () => {
    setStaffSelections({});

    setEditingGroup({
      isNew: true,
      name: '',
      siteId: '',
      levelId: '',
      sectionId: '',
      turnIds:
        turnOptions[0]
          ? [turnOptions[0].id]
          : [],
      scheduleType:
        scheduleTypeOptions[0]?.id ||
        '',
      enabledRoles:
        normalizeRoles([]),
      classroom: '',
      driveLink: '',
      institucionalDrive: ''
    });
  };

  const openEditGroup = async group => {
    setUpdatingGroup(true);

    try {
      const assignments =
        await getStaffGroupAssignmentsForGroup(
          db,
          appId,
          group.id
        );

      const selections = {};

      assignments
        .filter(
          item =>
            item.status !== 'closed' &&
            !item.validTo
        )
        .forEach(item => {
          selections[item.roleId] =
            item.staffId;
        });

      setStaffSelections(
        selections
      );

      setEditingGroup({
        ...group,
        enabledRoles:
          normalizeRoles(
            group.enabledRoles
          ),
        turnIds:
          Array.isArray(group.turnIds)
            ? group.turnIds
            : group.turnId
            ? [group.turnId]
            : []
      });
    } catch (error) {
      console.error(error);
      alert(
        `No se pudo abrir ${groupLabel}: ${error.message}`
      );
    } finally {
      setUpdatingGroup(false);
    }
  };

  const handleUpdateGroup = async event => {
    event.preventDefault();

    if (!editingGroup) return;

    setUpdatingGroup(true);

    try {
      const form =
        new FormData(
          event.currentTarget
        );

      const name = String(
        form.get('groupName') || ''
      ).trim();

      if (!name) {
        throw new Error(
          `El ${groupLabel} necesita un nombre.`
        );
      }

      const turnIds = form.getAll(
        'turnId'
      );

      const enabledRoles =
        normalizeRoles(
          form.getAll('roleId')
        );

      const isSchool =
        institutionMode === 'school';

      const groupData = {
        name,
        siteId:
          String(
            form.get('siteId') ||
              ''
          ).trim() || null,
        levelId: isSchool
          ? String(
              form.get('levelId') ||
                ''
            ).trim() || null
          : null,
        sectionId: isSchool
          ? String(
              form.get('sectionId') ||
                ''
            ).trim() || null
          : null,
        turnIds,
        scheduleType: isSchool
          ? form.get('scheduleType') ||
            null
          : null,
        enabledRoles,
        classroom: String(
          form.get('classroom') || ''
        ).trim(),
        institucionalDrive:
          String(
            form.get(
              'institucionalDrive'
            ) || ''
          ).trim(),
        active: true
      };

      const groupId =
        editingGroup.isNew
          ? await createGroup(
              db,
              appId,
              groupData
            )
          : editingGroup.id;

      if (!editingGroup.isNew) {
        await updateGroup(
          db,
          appId,
          groupId,
          groupData
        );
      }

      const previous = editingGroup.isNew
        ? []
        : await getStaffGroupAssignmentsForGroup(
            db,
            appId,
            groupId
          );

      const activeByRole =
        previous.filter(
          item =>
            item.status !== 'closed' &&
            !item.validTo
        );

      for (const role of roleOptions) {
        const oldAssignment =
          activeByRole.find(
            item =>
              item.roleId === role.id
          );

        const selectedStaffId =
          enabledRoles.includes(
            role.id
          )
            ? staffSelections[
                role.id
              ] || ''
            : '';

        if (
          oldAssignment?.staffId ===
          selectedStaffId
        ) {
          continue;
        }

        if (oldAssignment) {
          await closeStaffGroupAssignment(
            db,
            appId,
            oldAssignment.id
          );
        }

        if (selectedStaffId) {
          await createStaffGroupAssignment(
            db,
            appId,
            {
              staffId:
                selectedStaffId,
              groupId,
              roleId:
                role.id,
              turnIds
            }
          );
        }
      }

      setEditingGroup(null);
      setStaffSelections({});
    } catch (error) {
      console.error(error);
      alert(
        `No se pudo guardar ${groupLabel}: ${error.message}`
      );
    } finally {
      setUpdatingGroup(false);
    }
  };

  const saveBitacoraEntry = async (
    student,
    type,
    severity,
    text
  ) => {
    if (!student?.personId) return;

    const cleanText =
      String(text || type || '')
        .trim();

    if (!cleanText) return;

    setSavingIncident(true);

    try {
      const entry = {
        studentId:
          student.personId,
        date:
          new Date().toISOString(),
        type:
          type || 'Registro',
        severity:
          severity || 'medium',
        text: cleanText,
        author:
          user?.fullName ||
          user?.firstName ||
          'Usuario',
        authorId:
          user?.id || null,
        createdAt:
          serverTimestamp()
      };

      await addDoc(
        BASE(
          db,
          appId,
          COLLECTIONS.STUDENT_BITACORA
        ),
        entry
      );

      if (
        normalizeText(type) ===
        'ausentismo'
      ) {
        try {
          await addDoc(
            BASE(
              db,
              appId,
              'social_cases'
            ),
            {
              studentId:
                student.personId,
              dni:
                student.dni || '',
              studentName:
                `${student.lastName || ''}, ${student.firstName || ''}`.trim(),
              level:
                student.level ||
                'SEDE',
              reason:
                'REPORTE DESDE ORGANIZACIÓN: Ausentismo detectado.',
              status:
                'Pendiente',
              createdAt:
                serverTimestamp(),
              updatedAt:
                serverTimestamp(),
              steps: {
                llamada: {
                  done: false
                },
                continuidad: {
                  sent: false
                }
              },
              history: [
                {
                  date:
                    new Date().toISOString(),
                  text:
                    'Registro automático por ausentismo.',
                  author:
                    user?.fullName ||
                    user?.firstName ||
                    'Sistema'
                }
              ]
            }
          );
        } catch (socialError) {
          console.error(
            'No se pudo abrir caso social:',
            socialError
          );
        }
      }
    } catch (error) {
      console.error(
        'Error guardando Bitácora:',
        error
      );
      alert(
        `No se pudo guardar la bitácora: ${error.message}`
      );
      throw error;
    } finally {
      setSavingIncident(false);
    }
  };

  const handleQuickIncident = async incident => {
    const activeStudent =
      students.find(
        item =>
          item.id ===
          showBitacoraModal?.id
      ) || showBitacoraModal;

    if (!activeStudent) return;

    try {
      await saveBitacoraEntry(
        activeStudent,
        incident.label,
        incident.severity,
        incident.label
      );

      setNewNote('');
      setIsWriting(false);
    } catch {
      // El error ya fue informado.
    }
  };

  const handleSaveWrittenNote = async () => {
    const cleanText = newNote.trim();

    if (!cleanText) return;

    const activeStudent =
      students.find(
        item =>
          item.id ===
          showBitacoraModal?.id
      ) || showBitacoraModal;

    try {
      await saveBitacoraEntry(
        activeStudent,
        'Nota',
        'medium',
        cleanText
      );

      setNewNote('');
      setIsWriting(false);
    } catch {
      // El error ya fue informado.
    }
  };

  const handleDeleteBitacora = async entry => {
    if (!entry?.id) return;

    const confirmed = window.confirm(
      '¿Querés eliminar este registro de la bitácora?'
    );

    if (!confirmed) return;

    try {
      await deleteDoc(
        DOC(
          db,
          appId,
          COLLECTIONS.STUDENT_BITACORA,
          entry.id
        )
      );
    } catch (error) {
      console.error(error);
      alert(
        `No se pudo eliminar el registro: ${error.message}`
      );
    }
  };

  const handleStartEditBitacora = entry => {
    setEditingBitacoraEntry(entry);
    setEditingBitacoraText(
      entry.text || ''
    );
  };

  const handleSaveEditBitacora = async () => {
    const cleanText =
      editingBitacoraText.trim();

    if (
      !editingBitacoraEntry?.id ||
      !cleanText
    ) {
      return;
    }

    try {
      await updateDoc(
        DOC(
          db,
          appId,
          COLLECTIONS.STUDENT_BITACORA,
          editingBitacoraEntry.id
        ),
        {
          text: cleanText,
          updatedAt:
            serverTimestamp(),
          editedBy:
            user?.id || null
        }
      );

      setEditingBitacoraEntry(null);
      setEditingBitacoraText('');
    } catch (error) {
      console.error(error);
      alert(
        `No se pudo editar el registro: ${error.message}`
      );
    }
  };

  const handleAddGroupComment = async (
    event,
    group
  ) => {
    event.preventDefault();

    const text = String(
      event.currentTarget.comment?.value || ''
    ).trim();

    if (!text) return;

    try {
      await addDoc(
        BASE(
          db,
          appId,
          'group_mural'
        ),
        {
          groupId:
            group.id,
          groupName:
            group.name,
          text,
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

      event.currentTarget.reset();
    } catch (error) {
      console.error(error);
      alert(
        `No se pudo publicar la novedad: ${error.message}`
      );
    }
  };

  const openFullLegajo = student => {
    if (
      typeof onSelectStudent ===
      'function'
    ) {
      onSelectStudent(
        student.personId ||
          student.id
      );
    }

    if (
      typeof setActiveTab ===
      'function'
    ) {
      setActiveTab('matricula');
    }

    setSelectedStudent(null);
  };

  const printBitacora = (
    student,
    entries
  ) => {
    const institutionName =
      institutionConfig?.institutionName ||
      'Mi Institución';

    const logoUrl =
      institutionConfig?.logoUrl ||
      '';

    const address = [
      institutionConfig?.address,
      institutionConfig?.city,
      institutionConfig?.province
    ]
      .filter(Boolean)
      .join(' · ');

    const contact = [
      institutionConfig?.phone,
      institutionConfig?.email,
      institutionConfig?.website
    ]
      .filter(Boolean)
      .join(' · ');

    const sorted =
      [...(entries || [])].sort(
        (a, b) =>
          new Date(b.date || 0) -
          new Date(a.date || 0)
      );

    const printWindow = window.open(
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

    const photoHtml = student.photoUrl
      ? `<img class="photo" src="${escapeHtml(student.photoUrl)}" />`
      : `<div class="photo initials">${escapeHtml((student.firstName || '?').charAt(0).toUpperCase())}</div>`;

    const entriesHtml =
      sorted.length === 0
        ? `<div class="empty">No hay registros en la bitácora.</div>`
        : sorted
            .map(entry => {
              const severityClass =
                entry.severity ||
                'medium';

              return `
                <div class="entry ${escapeHtml(severityClass)}">
                  <div class="entry-top">
                    <span class="entry-type">${escapeHtml(entry.type || 'Registro')}</span>
                    <span class="entry-date">${escapeHtml(formatDateTime(entry.date))}</span>
                  </div>
                  <div class="entry-text">${escapeHtml(entry.text || '')}</div>
                  <div class="entry-author">Registrado por: ${escapeHtml(entry.author || 'Usuario')}</div>
                </div>
              `;
            })
            .join('');

    printWindow.document.write(`
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>Bitácora Express - ${escapeHtml(student.lastName)}, ${escapeHtml(student.firstName)}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; }
            body {
              margin: 0;
              font-family: Arial, Helvetica, sans-serif;
              color: #1e293b;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .header {
              display: flex;
              justify-content: space-between;
              gap: 20px;
              align-items: center;
              padding: 18px 20px;
              border-radius: 18px;
              background: #f5f3ff;
              border: 1px solid #ddd6fe;
              margin-bottom: 18px;
            }
            .brand {
              font-size: 9px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 1.6px;
              color: #7c3aed;
              margin-bottom: 7px;
            }
            .student-name {
              margin: 0;
              font-size: 22px;
              font-weight: 900;
              text-transform: uppercase;
            }
            .student-meta {
              margin-top: 8px;
              font-size: 10px;
              font-weight: 700;
              color: #64748b;
              line-height: 1.6;
            }
            .photo {
              width: 78px;
              height: 78px;
              border-radius: 18px;
              object-fit: cover;
              border: 3px solid #ffffff;
              box-shadow: 0 4px 16px rgba(15, 23, 42, .12);
              flex: 0 0 auto;
            }
            .initials {
              display: flex;
              align-items: center;
              justify-content: center;
              background: #ede9fe;
              color: #6d28d9;
              font-size: 28px;
              font-weight: 900;
            }
            .title {
              font-size: 13px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin: 20px 0 10px;
              color: #475569;
            }
            .entry {
              border: 1px solid #e2e8f0;
              border-left: 6px solid #cbd5e1;
              border-radius: 14px;
              padding: 12px 14px;
              margin-bottom: 10px;
              page-break-inside: avoid;
              background: #f8fafc;
            }
            .entry.positive {
              border-left-color: #10b981;
              background: #ecfdf5;
            }
            .entry.medium {
              border-left-color: #f59e0b;
              background: #fffbeb;
            }
            .entry.high {
              border-left-color: #ef4444;
              background: #fef2f2;
            }
            .entry-top {
              display: flex;
              justify-content: space-between;
              gap: 15px;
              margin-bottom: 8px;
            }
            .entry-type {
              font-size: 9px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: .8px;
            }
            .entry-date {
              font-size: 9px;
              font-weight: 700;
              color: #64748b;
              white-space: nowrap;
            }
            .entry-text {
              font-size: 12px;
              line-height: 1.5;
              font-weight: 700;
            }
            .entry-author {
              margin-top: 8px;
              padding-top: 7px;
              border-top: 1px solid rgba(148, 163, 184, .25);
              font-size: 8px;
              color: #64748b;
              font-weight: 800;
              text-transform: uppercase;
            }
            .empty {
              padding: 25px;
              text-align: center;
              border: 1px dashed #cbd5e1;
              border-radius: 14px;
              color: #94a3b8;
              font-size: 11px;
              font-style: italic;
            }
            .footer {
              margin-top: 24px;
              padding-top: 10px;
              border-top: 1px dashed #cbd5e1;
              font-size: 8px;
              color: #94a3b8;
              text-align: center;
              line-height: 1.6;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <div class="brand">${escapeHtml(institutionName)} · Bitácora Express</div>
              <h1 class="student-name">${escapeHtml(student.lastName || '')}, ${escapeHtml(student.firstName || '')}</h1>
              <div class="student-meta">
                DNI: ${escapeHtml(student.dni || '-')}
                · Edad: ${escapeHtml(calculateAge(student.birthDate) ?? '-')}
                · Nacimiento: ${escapeHtml(formatDate(student.birthDate) || '-')}
                ${address ? `<br />${escapeHtml(address)}` : ''}
                ${contact ? `<br />${escapeHtml(contact)}` : ''}
              </div>
            </div>
            ${photoHtml}
          </div>

          <div class="title">Registros</div>
          ${entriesHtml}

          <div class="footer">
            ${escapeHtml(institutionName)}
            ${address ? ` · ${escapeHtml(address)}` : ''}
            ${contact ? ` · ${escapeHtml(contact)}` : ''}
            <br />Generado el ${escapeHtml(new Date().toLocaleDateString('es-AR'))}
          </div>

          <script>
            window.addEventListener('load', function() {
              setTimeout(function() { window.print(); }, 300);
            });
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const printGroups = groupsList => {
    const title =
      institutionMode === 'day_center'
        ? 'Listado de talleres y concurrentes'
        : institutionMode === 'clinic'
        ? 'Organización de espacios y pacientes'
        : 'Listado de grupos y estudiantes';

    const personPluralLabel =
      personLabelPlural.charAt(0).toUpperCase() +
      personLabelPlural.slice(1);

    const printWindow = window.open(
      '',
      '_blank',
      'width=1200,height=900'
    );

    if (!printWindow) {
      alert(
        'El navegador bloqueó la ventana de impresión.'
      );
      return;
    }

    const pages = groupsList
      .map(group => {
        const team =
          group.staffByRole
            ?.map(
              item =>
                `${item.roleName}: ${item.name}`
            )
            .join(' · ') ||
          'Sin personal asignado';

        const peopleRows =
          [...(group.students || [])]
            .sort((a, b) =>
              (a.lastName || '').localeCompare(
                b.lastName || ''
              )
            )
            .map((person, index) => {
              const photo = person.photoUrl
                ? `<img src="${escapeHtml(person.photoUrl)}" class="person-photo" />`
                : `<div class="person-photo initials">${escapeHtml((person.firstName || '?').charAt(0).toUpperCase())}</div>`;

              return `
                <tr>
                  <td class="center">${index + 1}</td>
                  <td>${photo}</td>
                  <td><strong>${escapeHtml(person.lastName || '')}, ${escapeHtml(person.firstName || '')}</strong></td>
                  <td>${escapeHtml(person.dni || '-')}</td>
                  <td>${escapeHtml(calculateAge(person.birthDate) ?? '-')} años</td>
                  <td>${escapeHtml(formatDate(person.birthDate) || '-')}</td>
                </tr>
              `;
            })
            .join('');

        return `
          <section class="group-page">
            <div class="group-header">
              <div>
                <div class="eyebrow">${escapeHtml(groupLabelPlural)}</div>
                <h2>${escapeHtml(group.name)}</h2>
                <div class="meta">
                  ${group.turnLabels?.length ? escapeHtml(group.turnLabels.join(' · ')) : ''}
                  ${group.levelId && institutionMode === 'school' ? ` · ${escapeHtml(group.levelId)}` : ''}
                  ${group.sectionId && institutionMode === 'school' ? ` · ${escapeHtml(group.sectionId)}` : ''}
                  ${group.classroom ? ` · ${escapeHtml(group.classroom)}` : ''}
                </div>
              </div>
              <div class="count">${group.students.length}<span>${escapeHtml(personPluralLabel)}</span></div>
            </div>

            <div class="team"><strong>Equipo:</strong> ${escapeHtml(team)}</div>

            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Foto</th>
                  <th>Nombre y apellido</th>
                  <th>DNI</th>
                  <th>Edad</th>
                  <th>Fecha de nacimiento</th>
                </tr>
              </thead>
              <tbody>
                ${peopleRows || `<tr><td colspan="6" class="empty">Sin ${escapeHtml(personLabelPlural)} asignados.</td></tr>`}
              </tbody>
            </table>
          </section>
        `;
      })
      .join('');

    const staffRows = groupsList
      .map(group => {
        const team =
          group.staffByRole
            ?.map(
              item =>
                `${item.roleName}: ${item.name}`
            )
            .join(' · ') || '-';

        return `
          <tr>
            <td><strong>${escapeHtml(group.name)}</strong></td>
            <td>${escapeHtml(team)}</td>
            <td>${escapeHtml(group.turnLabels?.join(' · ') || '-')}</td>
            <td>${escapeHtml(group.classroom || '-')}</td>
          </tr>
        `;
      })
      .join('');

    const content =
      printMode === 'staff'
        ? `
          <h1>${escapeHtml(title)}</h1>
          <table>
            <thead>
              <tr>
                <th>${escapeHtml(groupLabel)}</th>
                <th>Equipo</th>
                <th>Turnos</th>
                <th>Espacio</th>
              </tr>
            </thead>
            <tbody>${staffRows}</tbody>
          </table>
        `
        : pages;

    printWindow.document.write(`
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>${escapeHtml(title)}</title>
          <style>
            @page { size: A4 landscape; margin: 8mm; }
            * { box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; margin: 0; color: #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            h1 { font-size: 20px; margin: 0 0 16px; color: #4c1d95; text-transform: uppercase; }
            .group-page { page-break-after: always; }
            .group-page:last-child { page-break-after: avoid; }
            .group-header { display: flex; justify-content: space-between; gap: 20px; align-items: center; border: 1px solid #ddd6fe; background: #f5f3ff; border-radius: 16px; padding: 14px 16px; margin-bottom: 10px; }
            .eyebrow { font-size: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 1.4px; color: #7c3aed; margin-bottom: 4px; }
            h2 { margin: 0; font-size: 18px; text-transform: uppercase; }
            .meta { margin-top: 4px; color: #64748b; font-size: 9px; font-weight: 700; }
            .count { width: 62px; height: 62px; border-radius: 16px; background: white; border: 1px solid #e2e8f0; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 20px; font-weight: 900; color: #6d28d9; }
            .count span { font-size: 7px; text-transform: uppercase; letter-spacing: .8px; color: #94a3b8; }
            .team { margin-bottom: 10px; padding: 8px 10px; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; font-size: 9px; }
            table { width: 100%; border-collapse: collapse; font-size: 9px; }
            th { background: #6d28d9; color: white; text-transform: uppercase; padding: 7px 6px; text-align: left; font-size: 7.5px; }
            td { border: 1px solid #e2e8f0; padding: 6px; vertical-align: middle; }
            .center { text-align: center; }
            .person-photo { width: 30px; height: 30px; object-fit: cover; border-radius: 8px; display: block; }
            .initials { background: #ede9fe; color: #6d28d9; font-weight: 900; display: flex; align-items: center; justify-content: center; }
            .empty { text-align: center; color: #94a3b8; padding: 16px; font-style: italic; }
          </style>
        </head>
        <body>
          ${content}
          <script>
            window.addEventListener('load', function() {
              setTimeout(function() { window.print(); }, 300);
            });
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  const currentBitacoraStudent =
    students.find(
      item =>
        item.id ===
        showBitacoraModal?.id
    ) ||
    showBitacoraModal;

  const currentBitacoraEntries =
    bitacoraEntries.filter(
      entry =>
        entry.studentId ===
        currentBitacoraStudent?.personId
    );

  const detailGroups = selectedGroupDetails
    ? assignedGroupsForStudent
    : [];

  const groupMessagesForSelected =
    selectedGroupDetails
      ? (
          groupMessages[
            selectedGroupDetails.id
          ] ||
          groupMessages[
            selectedGroupDetails.name
          ] ||
          []
        )
      : [];

  const sortedGroupMessages =
    [...groupMessagesForSelected].sort(
      (a, b) => {
        const aDate =
          a.createdAt?.seconds
            ? a.createdAt.seconds * 1000
            : new Date(
                a.createdAt || 0
              ).getTime();
        const bDate =
          b.createdAt?.seconds
            ? b.createdAt.seconds * 1000
            : new Date(
                b.createdAt || 0
              ).getTime();

        return aDate - bDate;
      }
    );

  return (
    <div className="flex flex-col h-full bg-slate-100 animate-in fade-in relative overflow-hidden">

      {/* ==========================================
          CABECERA
      =========================================== */}

      <div className="bg-white p-4 shadow-sm z-20 shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 px-1">

          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl bg-violet-50 text-violet-700 flex items-center justify-center">
                <Grid size={20} />
              </div>

              <div>
                <h2 className="text-2xl font-black text-violet-900 uppercase italic leading-none">
                  Organización
                </h2>

                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {institutionMode === 'day_center'
                    ? 'Talleres y participación institucional'
                    : institutionMode === 'clinic'
                    ? 'Espacios y equipos de atención'
                    : 'Grupos y organización institucional'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isManagement && (
              <button
                type="button"
                onClick={openCreateGroup}
                className="bg-violet-600 text-white px-4 py-2.5 rounded-xl hover:bg-violet-700 transition shadow-sm flex items-center gap-2 font-black text-xs"
              >
                <Plus size={16} />
                Nuevo {institutionMode === 'day_center' ? 'taller' : 'grupo'}
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setGroupsToPrint(
                  gruposFinales
                );
                setPrintMode('students');
                setShowPrintOptions(
                  true
                );
              }}
              className="bg-slate-100 text-slate-700 p-2.5 rounded-xl hover:bg-slate-200 transition shadow-sm"
              title="Imprimir"
            >
              <Printer size={22} />
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-col lg:flex-row gap-3">

          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={searchTerm}
              onChange={event =>
                setSearchTerm(
                  event.target.value
                )
              }
              placeholder={`Buscar ${groupLabelPlural}...`}
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-violet-400 text-sm font-semibold"
            />
          </div>

          {turnOptions.length > 0 && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() =>
                  setSelectedTurnId(
                    'all'
                  )
                }
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap ${
                  selectedTurnId ===
                  'all'
                    ? 'bg-white text-violet-700 shadow-sm'
                    : 'text-slate-400'
                }`}
              >
                Todos
              </button>

              {turnOptions.map(
                turnOption => (
                  <button
                    type="button"
                    key={turnOption.id}
                    onClick={() =>
                      setSelectedTurnId(
                        turnOption.id
                      )
                    }
                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap ${
                      selectedTurnId ===
                      turnOption.id
                        ? 'bg-white text-violet-700 shadow-sm'
                        : 'text-slate-400'
                    }`}
                  >
                    {turnOption.name}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* ==========================================
          LISTADO DE GRUPOS
      =========================================== */}

      <div className="flex-1 overflow-y-auto bg-slate-50/70">
        <div className="max-w-[1800px] mx-auto p-4 md:p-6 lg:p-8">

          {gruposFinales.length === 0 ? (
            <div className="min-h-[420px] flex items-center justify-center">
              <div className="w-full max-w-xl bg-white border border-slate-200 rounded-[32px] p-10 md:p-14 text-center shadow-sm">
                <div className="w-20 h-20 mx-auto rounded-[24px] bg-violet-50 text-violet-600 flex items-center justify-center mb-6">
                  <UsersRound size={34} />
                </div>

                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-500">
                  Organización institucional
                </p>

                <h3 className="text-2xl font-black text-slate-900 mt-2">
                  Todavía no hay {groupLabelPlural}
                </h3>

                <p className="text-sm leading-relaxed text-slate-500 mt-3 max-w-md mx-auto">
                  Creá la estructura de la institución y después asigná a las personas desde sus legajos.
                </p>

                {isManagement && (
                  <button
                    type="button"
                    onClick={openCreateGroup}
                    className="mt-7 inline-flex items-center gap-2 px-5 py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-black text-xs shadow-lg shadow-violet-200 transition"
                  >
                    <Plus size={17} />
                    Crear primer {institutionMode === 'day_center' ? 'taller' : 'grupo'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
              {gruposFinales.map(group => {
                const personCount =
                  group.students.length;

                const teamCount =
                  group.staffByRole?.filter(
                    item =>
                      item.name &&
                      item.name !==
                        'Sin asignar'
                  ).length || 0;

                return (
                  <article
                    key={group.id}
                    className="bg-white rounded-[30px] border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all overflow-hidden"
                  >
                    <div className="p-5 md:p-6">

                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">

                          <div className="flex flex-wrap gap-2 mb-3">
                            {group.turnLabels?.map(label => (
                              <span
                                key={label}
                                className="inline-flex items-center px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100 text-[9px] font-black uppercase tracking-wide"
                              >
                                {label}
                              </span>
                            ))}

                            {institutionMode === 'school' &&
                              group.scheduleType && (
                                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-wide">
                                  {getScheduleTypeLabel(
                                    group.scheduleType
                                  )}
                                </span>
                              )}
                          </div>

                          <h3 className="text-xl md:text-2xl font-black text-slate-900 truncate">
                            {group.name}
                          </h3>

                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] font-bold text-slate-400 uppercase">
                            {institutionMode === 'school' && group.levelId && (
                              <span>
                                {group.levelId}
                              </span>
                            )}

                            {institutionMode === 'school' && group.sectionId && (
                              <span>
                                • {group.sectionId}
                              </span>
                            )}

                            {group.classroom && (
                              <span>
                                • {group.classroom}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setGroupsToPrint(
                                [group]
                              );
                              setPrintMode(
                                'students'
                              );
                              setShowPrintOptions(
                                true
                              );
                            }}
                            className="p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition"
                            title="Imprimir"
                          >
                            <Printer size={15} />
                          </button>

                          {isManagement && (
                            <button
                              type="button"
                              onClick={() =>
                                openEditGroup(
                                  group
                                )
                              }
                              className="p-2.5 rounded-xl bg-violet-50 text-violet-600 hover:bg-violet-100 transition"
                              title="Editar"
                            >
                              <Edit3 size={15} />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-6">
                        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            {personLabelPlural}
                          </p>
                          <p className="text-2xl font-black text-slate-800 mt-1">
                            {personCount}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-violet-50 border border-violet-100 p-4">
                          <p className="text-[9px] font-black uppercase tracking-widest text-violet-400">
                            Equipo
                          </p>
                          <p className="text-2xl font-black text-violet-700 mt-1">
                            {teamCount}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 pt-5 border-t border-slate-100">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                              Personal
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {group.staffByRole?.map(
                                item =>
                                  `${item.roleName}: ${item.name}`
                              ).join(' · ') ||
                                'Sin personal asignado'}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 flex gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedGroupDetails(
                              group
                            )
                          }
                          className="flex-1 py-3.5 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-wide hover:bg-slate-800 transition"
                        >
                          Ver {institutionMode === 'day_center' ? 'taller' : 'grupo'}
                        </button>

                        {group.institucionalDrive && (
                          <button
                            type="button"
                            onClick={() =>
                              window.open(
                                group.institucionalDrive,
                                '_blank',
                                'noopener,noreferrer'
                              )
                            }
                            className="px-4 py-3.5 rounded-2xl bg-blue-50 text-blue-700 hover:bg-blue-100 transition"
                            title="Abrir Drive"
                          >
                            <ExternalLink size={17} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 bg-slate-50/50 p-3">
                      {group.students.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                            Sin {personLabelPlural} asignados
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Se reflejarán desde los legajos.
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex -space-x-2 overflow-hidden pl-1">
                            {[...group.students]
                              .sort((a, b) =>
                                (a.lastName || '').localeCompare(
                                  b.lastName || ''
                                )
                              )
                              .slice(0, 7)
                              .map(person => (
                                <button
                                  type="button"
                                  key={person.id}
                                  onClick={() =>
                                    setSelectedStudent(
                                      person
                                    )
                                  }
                                  className="w-9 h-9 rounded-full border-2 border-white bg-slate-200 overflow-hidden flex items-center justify-center text-[9px] font-black text-slate-400"
                                  title={`${person.lastName || ''}, ${person.firstName || ''}`}
                                >
                                  {person.photoUrl ? (
                                    <img
                                      src={person.photoUrl}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    (
                                      person.firstName?.[0] ||
                                      '?'
                                    ).toUpperCase()
                                  )}
                                </button>
                              ))}

                            {group.students.length > 7 && (
                              <div className="w-9 h-9 rounded-full border-2 border-white bg-violet-100 text-violet-700 flex items-center justify-center text-[9px] font-black">
                                +{group.students.length - 7}
                              </div>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              setSelectedGroupDetails(
                                group
                              )
                            }
                            className="text-[10px] font-black text-slate-400 uppercase hover:text-violet-600 transition"
                          >
                            Ver integrantes →
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ==========================================
          VISTA RÁPIDA DE PERSONA
      =========================================== */}

      {selectedStudent && (
        <QuickStudentModal
          student={selectedStudent}
          institutionMode={institutionMode}
          personLabel={personLabel}
          groupsForStudent={assignedGroupsForStudent(
            selectedStudent
          )}
          onClose={() =>
            setSelectedStudent(null)
          }
          onOpenFullLegajo={() =>
            openFullLegajo(
              selectedStudent
            )
          }
          onOpenBitacora={() => {
            setShowBitacoraModal(
              selectedStudent
            );
            setSelectedStudent(null);
          }}
        />
      )}

      {/* ==========================================
          BITÁCORA EXPRESS
      =========================================== */}

      {showBitacoraModal &&
        currentBitacoraStudent && (
          <BitacoraExpressModal
            student={
              currentBitacoraStudent
            }
            entries={
              currentBitacoraEntries
            }
            personLabel={personLabel}
            isWriting={isWriting}
            newNote={newNote}
            setNewNote={setNewNote}
            setIsWriting={setIsWriting}
            saving={savingIncident}
            onClose={() => {
              setShowBitacoraModal(
                null
              );
              setIsWriting(false);
              setNewNote('');
              setEditingBitacoraEntry(
                null
              );
              setEditingBitacoraText(
                ''
              );
            }}
            onQuickIncident={
              handleQuickIncident
            }
            onSaveNote={
              handleSaveWrittenNote
            }
            editingEntry={
              editingBitacoraEntry
            }
            editingText={
              editingBitacoraText
            }
            setEditingText={
              setEditingBitacoraText
            }
            onStartEdit={
              handleStartEditBitacora
            }
            onSaveEdit={
              handleSaveEditBitacora
            }
            onCancelEdit={() => {
              setEditingBitacoraEntry(
                null
              );
              setEditingBitacoraText(
                ''
              );
            }}
            onDelete={
              handleDeleteBitacora
            }
            onPrint={() =>
              printBitacora(
                currentBitacoraStudent,
                currentBitacoraEntries
              )
            }
          />
        )}

      {/* ==========================================
          VISTA DEL GRUPO
      =========================================== */}

      {selectedGroupDetails && (
        <GroupDetailModal
          group={
            selectedGroupDetails
          }
          institutionMode={
            institutionMode
          }
          personLabelPlural={
            personLabelPlural
          }
          messages={
            sortedGroupMessages
          }
          onClose={() =>
            setSelectedGroupDetails(
              null
            )
          }
          onOpenStudent={student =>
            setSelectedStudent(
              student
            )
          }
          onOpenBitacora={student => {
            setShowBitacoraModal(
              student
            );
            setSelectedGroupDetails(
              null
            );
          }}
          onAddComment={event =>
            handleAddGroupComment(
              event,
              selectedGroupDetails
            )
          }
          onOpenDrive={() => {
            if (
              selectedGroupDetails.institucionalDrive
            ) {
              window.open(
                selectedGroupDetails.institucionalDrive,
                '_blank',
                'noopener,noreferrer'
              );
            }
          }}
          onEdit={
            isManagement
              ? () => {
                  openEditGroup(
                    selectedGroupDetails
                  );
                }
              : null
          }
        />
      )}

      {/* ==========================================
          CREAR / EDITAR GRUPO
      =========================================== */}

      {editingGroup && (
        <GroupFormModal
          editingGroup={
            editingGroup
          }
          institutionMode={
            institutionMode
          }
          groupLabel={groupLabel}
          groupLabelPlural={
            groupLabelPlural
          }
          turnOptions={turnOptions}
          scheduleTypeOptions={
            scheduleTypeOptions
          }
          roleOptions={roleOptions}
          defaultGroupRole={defaultGroupRole}
          normalizeRoles={
            normalizeRoles
          }
          staffList={staffList}
          staffSelections={
            staffSelections
          }
          setStaffSelections={
            setStaffSelections
          }
          onClose={() => {
            setEditingGroup(null);
            setStaffSelections({});
          }}
          onSubmit={
            handleUpdateGroup
          }
          saving={updatingGroup}
        />
      )}

      {/* ==========================================
          IMPRESIÓN
      =========================================== */}

      {showPrintOptions && (
        <PrintOptionsModal
          printMode={printMode}
          setPrintMode={
            setPrintMode
          }
          onClose={() =>
            setShowPrintOptions(
              false
            )
          }
          onConfirm={() => {
            printGroups(
              groupsToPrint
            );
            setShowPrintOptions(
              false
            );
          }}
          groupLabelPlural={
            groupLabelPlural
          }
          personLabelPlural={
            personLabelPlural
          }
        />
      )}
    </div>
  );
}

function QuickStudentModal({
  student,
  institutionMode,
  personLabel,
  groupsForStudent,
  onClose,
  onOpenFullLegajo,
  onOpenBitacora
}) {
  const age = calculateAge(
    student.birthDate
  );

  return (
    <div className="fixed inset-0 z-[700] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] w-full max-w-2xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">

        <div className="p-5 md:p-6 border-b border-slate-100 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-16 h-16 rounded-2xl bg-violet-100 overflow-hidden flex items-center justify-center text-violet-600 shrink-0">
              {student.photoUrl ? (
                <img
                  src={student.photoUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <User size={25} />
              )}
            </div>

            <div className="min-w-0">
              <h3 className="text-xl font-black text-slate-900 truncate">
                {student.lastName || ''}, {student.firstName || ''}
              </h3>

              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">
                Legajo rápido · {personLabel}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:text-red-500 transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5">

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniInfo
              icon={<FileText size={15} />}
              label="DNI"
              value={
                student.dni ||
                'Sin datos'
              }
            />

            <MiniInfo
              icon={<CalendarDays size={15} />}
              label="Nacimiento"
              value={
                formatDate(
                  student.birthDate
                ) || 'Sin datos'
              }
            />

            <MiniInfo
              icon={<User size={15} />}
              label="Edad"
              value={
                age === null
                  ? 'Sin datos'
                  : `${age} años`
              }
            />

            <MiniInfo
              icon={<Phone size={15} />}
              label="Teléfono"
              value={
                student.phone ||
                'Sin datos'
              }
            />
          </div>

          <section className="bg-slate-50 rounded-2xl border border-slate-200 p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">
              Contactos
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              <ContactQuick
                icon={<User size={15} />}
                label="Responsable 1"
                value={student.motherName || 'Sin cargar'}
                detail={student.motherContact || ''}
              />

              <ContactQuick
                icon={<User size={15} />}
                label="Responsable 2"
                value={student.fatherName || 'Sin cargar'}
                detail={student.fatherContact || ''}
              />

              <ContactQuick
                icon={<Phone size={15} />}
                label="Emergencia"
                value={student.emergencyContact || 'Sin cargar'}
                detail=""
              />

              <ContactQuick
                icon={<Mail size={15} />}
                label="Email"
                value={student.email || 'Sin cargar'}
                detail=""
              />
            </div>
          </section>

          <section className="bg-white rounded-2xl border border-slate-200 p-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">
              Ubicación
            </p>

            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-violet-50 text-violet-600">
                <MapPin size={17} />
              </div>

              <div>
                <p className="text-xs font-black text-slate-700">
                  {student.address || 'Sin dirección registrada'}
                </p>
                <p className="text-[10px] font-bold text-slate-400 mt-1">
                  {student.city || 'Sin localidad registrada'}
                </p>
              </div>
            </div>
          </section>

          {groupsForStudent.length > 0 && (
            <section className="bg-violet-50/60 border border-violet-100 rounded-2xl p-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-violet-600 mb-3">
                {institutionMode === 'day_center'
                  ? 'Participación actual'
                  : institutionMode === 'clinic'
                  ? 'Espacios actuales'
                  : 'Asignación actual'}
              </p>

              <div className="flex flex-wrap gap-2">
                {groupsForStudent.map(item => (
                  <span
                    key={`${item.group.id}-${item.turn?.id || 'sin-turno'}`}
                    className="px-3 py-2 rounded-xl bg-white border border-violet-100 text-xs font-black text-slate-700"
                  >
                    {item.group.name}
                    {item.turn?.name
                      ? ` · ${item.turn.name}`
                      : ''}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenBitacora}
            className="flex-1 px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700 font-black text-xs flex items-center justify-center gap-2 hover:bg-emerald-100 transition"
          >
            <Zap size={16} />
            Bitácora Express
          </button>

          <button
            type="button"
            onClick={onOpenFullLegajo}
            className="flex-1 px-4 py-3 rounded-xl bg-violet-600 text-white font-black text-xs flex items-center justify-center gap-2 hover:bg-violet-700 transition"
          >
            <ChevronRight size={16} />
            Ver legajo completo
          </button>
        </div>
      </div>
    </div>
  );
}

function MiniInfo({
  icon,
  label,
  value
}) {
  return (
    <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
      <div className="flex items-center gap-2 text-violet-500">
        {icon}
        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">
          {label}
        </span>
      </div>
      <p className="text-xs font-black text-slate-700 mt-2 break-words">
        {value}
      </p>
    </div>
  );
}

function ContactQuick({
  icon,
  label,
  value,
  detail
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="text-violet-500 mt-0.5">
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">
          {label}
        </p>
        <p className="text-xs font-black text-slate-700 mt-1 break-words">
          {value}
        </p>
        {detail && (
          <p className="text-[10px] font-bold text-blue-600 mt-0.5 break-words">
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}

function BitacoraExpressModal({
  student,
  entries,
  personLabel,
  isWriting,
  newNote,
  setNewNote,
  setIsWriting,
  saving,
  onClose,
  onQuickIncident,
  onSaveNote,
  editingEntry,
  editingText,
  setEditingText,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onPrint
}) {
  const sortedEntries = [...entries].sort(
    (a, b) =>
      new Date(b.date || 0) -
      new Date(a.date || 0)
  );

  return (
    <div className="fixed inset-0 z-[800] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-[32px] w-full max-w-2xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">

        <div className="p-5 md:p-6 border-b border-slate-100 flex items-center justify-between gap-4 shrink-0">
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase italic">
              Bitácora Express
            </h3>
            <p className="text-xs font-bold text-slate-500 mt-1">
              {student.firstName} {student.lastName}
              {' · '}
              {personLabel}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrint}
              className="p-2.5 rounded-xl bg-violet-50 text-violet-700 hover:bg-violet-100 transition"
              title="Imprimir bitácora"
            >
              <Printer size={19} />
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:text-red-500 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-5 border-b border-slate-100 bg-slate-50 shrink-0">
          {!isWriting ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {INCIDENT_TYPES.map(incident => (
                <button
                  type="button"
                  key={incident.label}
                  disabled={saving}
                  onClick={() =>
                    onQuickIncident(
                      incident
                    )
                  }
                  className={`min-h-[78px] rounded-2xl border-2 flex flex-col items-center justify-center gap-1 px-2 py-3 transition active:scale-95 disabled:opacity-50 ${incident.className}`}
                >
                  <span className="text-xl leading-none">
                    {incident.emoji}
                  </span>
                  <span className="text-[8px] font-black uppercase tracking-tight text-center leading-tight">
                    {incident.label}
                  </span>
                </button>
              ))}

              <button
                type="button"
                onClick={() =>
                  setIsWriting(true)
                }
                className="col-span-2 md:col-span-4 py-3 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider hover:bg-slate-800 transition flex items-center justify-center gap-2"
              >
                <Edit3 size={14} />
                Redactar nota escrita
              </button>
            </div>
          ) : (
            <div>
              <textarea
                autoFocus
                value={newNote}
                onChange={event =>
                  setNewNote(
                    event.target.value
                  )
                }
                placeholder="¿Qué pasó? Escribí un registro breve..."
                className="w-full h-28 p-3 rounded-2xl bg-white border border-slate-200 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 text-sm font-medium resize-none"
              />

              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsWriting(false);
                    setNewNote('');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-500 text-xs font-black"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={onSaveNote}
                  disabled={
                    saving ||
                    !newNote.trim()
                  }
                  className="flex-[2] py-2.5 rounded-xl bg-violet-600 text-white text-xs font-black disabled:opacity-50"
                >
                  {saving
                    ? 'Guardando...'
                    : 'Guardar nota'}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="flex items-center justify-between gap-3 mb-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Registros
            </p>

            <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full">
              {sortedEntries.length}
            </span>
          </div>

          {sortedEntries.length === 0 ? (
            <div className="py-10 text-center border border-dashed border-slate-200 rounded-2xl">
              <Zap size={26} className="mx-auto text-slate-300" />
              <p className="text-xs font-bold text-slate-400 mt-2">
                Todavía no hay registros.
              </p>
            </div>
          ) : (
            sortedEntries.map(entry => {
              const tone =
                entry.severity ===
                'positive'
                  ? 'border-emerald-200 bg-emerald-50/70'
                  : entry.severity ===
                    'high'
                  ? 'border-red-200 bg-red-50/70'
                  : 'border-orange-200 bg-orange-50/70';

              const editing =
                editingEntry?.id ===
                entry.id;

              return (
                <div
                  key={entry.id}
                  className={`rounded-2xl border p-3.5 ${tone}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">
                          {entry.type ||
                            'Registro'}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400">
                          {formatDateTime(
                            entry.date
                          )}
                        </span>
                      </div>

                      {editing ? (
                        <div className="mt-2">
                          <textarea
                            value={
                              editingText
                            }
                            onChange={event =>
                              setEditingText(
                                event.target
                                  .value
                              )
                            }
                            className="w-full p-3 rounded-xl bg-white border border-slate-200 text-sm font-medium outline-none focus:border-violet-400 resize-none"
                            rows={3}
                          />

                          <div className="flex gap-2 mt-2">
                            <button
                              type="button"
                              onClick={
                                onCancelEdit
                              }
                              className="px-3 py-2 rounded-lg bg-slate-100 text-slate-500 text-[10px] font-black"
                            >
                              Cancelar
                            </button>

                            <button
                              type="button"
                              onClick={
                                onSaveEdit
                              }
                              disabled={
                                !editingText.trim()
                              }
                              className="px-3 py-2 rounded-lg bg-violet-600 text-white text-[10px] font-black disabled:opacity-50"
                            >
                              Guardar cambios
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-black text-slate-800 leading-snug mt-2">
                            {entry.text ||
                              entry.type}
                          </p>

                          <p className="text-[9px] font-bold uppercase text-slate-400 mt-2">
                            Registrado por:{' '}
                            {entry.author ||
                              'Usuario'}
                          </p>
                        </>
                      )}
                    </div>

                    {!editing && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            onStartEdit(
                              entry
                            )
                          }
                          className="p-2 rounded-lg bg-white/80 text-slate-500 hover:text-violet-600 transition"
                          title="Editar registro"
                        >
                          <Edit3 size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onDelete(entry)
                          }
                          className="p-2 rounded-lg bg-white/80 text-slate-500 hover:text-red-600 transition"
                          title="Eliminar registro"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function GroupDetailModal({
  group,
  institutionMode,
  personLabelPlural,
  messages,
  onClose,
  onOpenStudent,
  onOpenBitacora,
  onAddComment,
  onOpenDrive,
  onEdit
}) {
  const members = [...(group.students || [])].sort(
    (a, b) =>
      (a.lastName || '').localeCompare(
        b.lastName || ''
      )
  );

  const groupSubtitle = [
    group.turnLabels?.join(' · '),
    institutionMode === 'school'
      ? group.levelId
      : '',
    institutionMode === 'school'
      ? group.sectionId
      : '',
    group.classroom
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="fixed inset-0 z-[600] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 md:p-5">
      <div className="bg-white rounded-[34px] w-full max-w-7xl h-[92vh] max-h-[92vh] overflow-hidden shadow-2xl flex flex-col">

        <div className="p-5 md:p-6 border-b border-slate-100 flex items-center justify-between gap-4 shrink-0">
          <div className="min-w-0 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
              <Users size={23} />
            </div>

            <div className="min-w-0">
              <h2 className="text-2xl font-black text-slate-900 uppercase italic truncate">
                {group.name}
              </h2>

              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1 truncate">
                {groupSubtitle || 'Organización institucional'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {group.institucionalDrive && (
              <button
                type="button"
                onClick={onOpenDrive}
                className="px-3.5 py-2.5 rounded-xl bg-blue-50 text-blue-700 text-xs font-black flex items-center gap-2 hover:bg-blue-100 transition"
              >
                <ExternalLink size={15} />
                Drive
              </button>
            )}

            {onEdit && (
              <button
                type="button"
                onClick={onEdit}
                className="p-2.5 rounded-xl bg-violet-50 text-violet-700 hover:bg-violet-100 transition"
                title="Editar"
              >
                <Edit3 size={18} />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:text-red-500 transition"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col lg:flex-row">

          {/* INTEGRANTES */}
          <div className="w-full lg:w-[48%] border-r border-slate-100 overflow-y-auto bg-slate-50/70 p-5 md:p-6">

            <div className="flex items-end justify-between gap-3 mb-4">
              <div>
                <p className="text-[9px] font-black uppercase tracking-widest text-violet-500">
                  Integrantes
                </p>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  {group.students.length} {personLabelPlural}
                </h3>
              </div>

              <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-white border border-slate-200 px-2.5 py-1.5 rounded-full">
                Click en la persona para ver datos
              </span>
            </div>

            <div className="space-y-2">
              {members.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                  <UsersRound size={28} className="mx-auto text-slate-300" />
                  <p className="text-xs font-bold text-slate-400 mt-2">
                    Todavía no hay personas asignadas a este {institutionMode === 'day_center' ? 'taller' : 'grupo'}.
                  </p>
                </div>
              ) : (
                members.map(person => (
                  <div
                    key={person.id}
                    className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center gap-3 shadow-sm"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        onOpenStudent(person)
                      }
                      className="w-12 h-12 rounded-xl bg-violet-100 overflow-hidden shrink-0 flex items-center justify-center text-violet-600 font-black"
                    >
                      {person.photoUrl ? (
                        <img
                          src={person.photoUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (person.firstName?.[0] || '?').toUpperCase()
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onOpenStudent(person)
                      }
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className="text-xs font-black uppercase text-slate-800 truncate">
                        {person.lastName || ''}, {person.firstName || ''}
                      </p>
                      <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1">
                        <span className="text-[9px] font-black uppercase text-violet-500">
                          {calculateAge(person.birthDate) ?? '-'} años
                        </span>
                        {person.dni && (
                          <span className="text-[9px] font-bold text-slate-400">
                            DNI {person.dni}
                          </span>
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onOpenBitacora(person)
                      }
                      className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100 transition flex items-center justify-center shrink-0"
                      title="Abrir Bitácora Express"
                    >
                      <Zap size={19} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* MURO */}
          <div className="flex-1 min-h-0 flex flex-col bg-slate-50">
            <div className="p-5 md:p-6 bg-white border-b border-slate-100 shrink-0 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-orange-500 text-white">
                  <MessageSquare size={17} />
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-orange-500">
                    Comunicación interna
                  </p>
                  <h3 className="text-lg font-black text-slate-900 mt-0.5">
                    Muro del {institutionMode === 'day_center' ? 'taller' : 'grupo'}
                  </h3>
                </div>
              </div>

              <span className="text-[8px] font-black uppercase tracking-widest bg-slate-100 text-slate-400 px-2.5 py-1.5 rounded-full">
                Novedades del equipo
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-3">
              {messages.length === 0 ? (
                <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center">
                  <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center">
                    <MessageSquare size={30} className="text-slate-400" />
                  </div>
                  <p className="text-xs font-black uppercase text-slate-500 mt-4">
                    El muro está vacío
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">
                    Dejá la primera novedad del equipo.
                  </p>
                </div>
              ) : (
                messages.map(message => {
                  const mine =
                    message.authorId ===
                    group.currentUserId;

                  return (
                    <div
                      key={message.id}
                      className="flex justify-start"
                    >
                      <div className="max-w-[90%] md:max-w-[78%] bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                        <p className="text-[8px] font-black uppercase tracking-widest text-violet-500">
                          {message.author || 'Usuario'}
                          {' · '}
                          {message.createdAt?.seconds
                            ? new Date(
                                message.createdAt.seconds * 1000
                              ).toLocaleTimeString('es-AR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'Ahora'}
                        </p>
                        <p className="text-sm font-bold text-slate-700 leading-relaxed mt-1">
                          {message.text}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 md:p-5 bg-white border-t border-slate-100 shrink-0">
              <form
                onSubmit={onAddComment}
                className="flex gap-2"
              >
                <input
                  name="comment"
                  autoComplete="off"
                  placeholder="Escribí una novedad importante para el equipo..."
                  className="flex-1 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold text-slate-700 outline-none focus:border-orange-300 focus:bg-white transition"
                />
                <button
                  type="submit"
                  className="bg-orange-500 text-white p-3.5 rounded-2xl shadow-sm hover:bg-orange-600 transition"
                >
                  <Send size={19} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GroupFormModal({
  editingGroup,
  institutionMode,
  groupLabel,
  groupLabelPlural,
  turnOptions,
  scheduleTypeOptions,
  roleOptions,
  normalizeRoles,
  staffList,
  staffSelections,
  setStaffSelections,
  onClose,
  onSubmit,
  saving
}) {
  const isSchool =
    institutionMode === 'school';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[900] flex items-center justify-center p-4">
      <form
        onSubmit={onSubmit}
        className="bg-white rounded-[32px] w-full max-w-3xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4 shrink-0">
          <div>
            <p className="text-[10px] font-black text-violet-500 uppercase tracking-[0.2em]">
              Organización institucional
            </p>

            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {editingGroup.isNew
                ? `Crear ${groupLabel}`
                : `Editar ${groupLabel}`}
            </h3>

            <p className="text-xs text-slate-400 mt-1">
              {institutionMode === 'day_center'
                ? 'El taller existe independientemente de las personas. La participación se refleja desde los legajos.'
                : institutionMode === 'clinic'
                ? 'El espacio existe independientemente de las personas atendidas.'
                : 'El grupo existe independientemente de los estudiantes. Las personas se asignan por rol.'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:text-red-500 transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          <section>
            <SectionHeading
              icon={<Grid size={16} />}
              title="Identificación"
            />

            <div className="grid md:grid-cols-2 gap-4">
              <label className="block md:col-span-2">
                <span className={fieldLabelClass}>
                  {institutionMode === 'day_center'
                    ? 'Nombre del taller / grupo'
                    : institutionMode === 'clinic'
                    ? 'Nombre del espacio / equipo'
                    : 'Nombre del grupo'}
                </span>
                <input
                  name="groupName"
                  defaultValue={
                    editingGroup.name || ''
                  }
                  required
                  className={fieldInputClass}
                  placeholder={
                    institutionMode === 'day_center'
                      ? 'Ej.: Taller de Cocina'
                      : institutionMode === 'clinic'
                      ? 'Ej.: Consultorio 2'
                      : 'Ej.: 3° A'
                  }
                />
              </label>

              <label className="block md:col-span-2">
                <span className={fieldLabelClass}>
                  Sede / establecimiento
                </span>
                <input
                  name="siteId"
                  defaultValue={
                    editingGroup.siteId || ''
                  }
                  className={fieldInputClass}
                  placeholder="Sede"
                />
              </label>

              {isSchool && (
                <>
                  <label className="block">
                    <span className={fieldLabelClass}>
                      Nivel
                    </span>
                    <input
                      name="levelId"
                      defaultValue={
                        editingGroup.levelId || ''
                      }
                      className={fieldInputClass}
                      placeholder="Nivel"
                    />
                  </label>

                  <label className="block">
                    <span className={fieldLabelClass}>
                      Sección
                    </span>
                    <input
                      name="sectionId"
                      defaultValue={
                        editingGroup.sectionId || ''
                      }
                      className={fieldInputClass}
                      placeholder="Sección"
                    />
                  </label>
                </>
              )}

              <label className="block">
                <span className={fieldLabelClass}>
                  Aula / espacio
                </span>
                <input
                  name="classroom"
                  defaultValue={
                    editingGroup.classroom || ''
                  }
                  className={fieldInputClass}
                  placeholder="Ej.: SUM"
                />
              </label>

              {isSchool && (
                <label className="block">
                  <span className={fieldLabelClass}>
                    Jornada del grupo
                  </span>
                  <select
                    name="scheduleType"
                    defaultValue={
                      editingGroup.scheduleType ||
                      scheduleTypeOptions[0]?.id ||
                      ''
                    }
                    className={fieldInputClass}
                  >
                    <option value="">
                      Seleccionar
                    </option>
                    {scheduleTypeOptions.map(
                      option => (
                        <option
                          key={option.id}
                          value={option.id}
                        >
                          {option.name}
                        </option>
                      )
                    )}
                  </select>
                </label>
              )}
            </div>
          </section>

          <section>
            <SectionHeading
              icon={<Clock3 size={16} />}
              title={
                institutionMode === 'school'
                  ? 'Turnos'
                  : 'Franjas / turnos'
              }
            />

            {turnOptions.length === 0 ? (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-xs font-bold text-amber-700">
                No hay turnos configurados en la institución.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {turnOptions.map(
                  turnOption => (
                    <label
                      key={turnOption.id}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        name="turnId"
                        value={turnOption.id}
                        defaultChecked={(
                          editingGroup.turnIds || []
                        ).includes(
                          turnOption.id
                        )}
                        className="accent-violet-600"
                      />
                      <span className="text-xs font-bold text-slate-600">
                        {turnOption.name}
                      </span>
                    </label>
                  )
                )}
              </div>
            )}
          </section>

          <section>
            <SectionHeading
              icon={<Settings2 size={16} />}
              title="Roles habilitados"
            />

            <p className="text-xs text-slate-400 mb-4">
              Los roles salen de Configuración. Los roles marcados como obligatorios se mantienen habilitados.
            </p>

            <div className="grid md:grid-cols-2 gap-2">
              {roleOptions.map(role => {
                const checked =
                  normalizeRoles(
                    editingGroup.enabledRoles ||
                      []
                  ).includes(
                    role.id
                  );

                const required =
                  Boolean(
                    role.requiredForGroup
                  );

                return (
                  <label
                    key={role.id}
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      checked
                        ? 'border-violet-200 bg-violet-50'
                        : 'border-slate-200 bg-slate-50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="roleId"
                        value={role.id}
                        defaultChecked={
                          checked
                        }
                        disabled={
                          required
                        }
                        className="accent-violet-600"
                      />
                      <span className="text-xs font-black text-slate-700">
                        {role.name}
                      </span>
                    </span>

                    {required && (
                      <span className="text-[8px] font-black uppercase text-violet-500">
                        Obligatorio
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </section>

          <section>
            <SectionHeading
              icon={<UserPlus size={16} />}
              title="Personal asignado"
            />

            <div className="space-y-2">
              {normalizeRoles(
                editingGroup.enabledRoles || []
              ).map(roleId => (
                <div
                  key={roleId}
                  className="grid md:grid-cols-[1fr_1.5fr] items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200"
                >
                  <span className="text-[10px] font-black uppercase text-slate-500">
                    {roleOptions.find(
                      role =>
                        role.id ===
                        roleId
                    )?.name ||
                      roleId}
                  </span>

                  <select
                    value={
                      staffSelections[
                        roleId
                      ] || ''
                    }
                    onChange={event =>
                      setStaffSelections(
                        previous => ({
                          ...previous,
                          [roleId]:
                            event.target
                              .value
                        })
                      )
                    }
                    className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 outline-none"
                  >
                    <option value="">
                      Sin asignar
                    </option>

                    {staffList
                      .slice()
                      .sort((a, b) =>
                        (
                          a.fullName ||
                          `${a.lastName || ''}, ${a.firstName || ''}`
                        ).localeCompare(
                          b.fullName ||
                            `${b.lastName || ''}, ${b.firstName || ''}`
                        )
                      )
                      .map(person => (
                        <option
                          key={person.id}
                          value={person.id}
                        >
                          {person.fullName ||
                            `${person.lastName || ''}, ${person.firstName || ''}`}
                        </option>
                      ))}
                  </select>
                </div>
              ))}
            </div>

            {staffList.length === 0 && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700">
                Todavía no hay personal cargado. {groupLabel.charAt(0).toUpperCase() + groupLabel.slice(1)} puede crearse igual.
              </div>
            )}
          </section>

          <section>
            <SectionHeading
              icon={<ExternalLink size={16} />}
              title="Documentación"
            />

            <label className="block">
              <span className={fieldLabelClass}>
                Drive institucional
              </span>
              <input
                name="institucionalDrive"
                defaultValue={
                  editingGroup.institucionalDrive || ''
                }
                className={`${fieldInputClass} bg-blue-50 border-blue-100`}
                placeholder="Pegá aquí el enlace de Drive"
              />
            </label>
          </section>
        </div>

        <div className="p-4 border-t border-slate-100 flex gap-3 shrink-0 bg-white">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-xs hover:bg-slate-200 transition"
          >
            Cancelar
          </button>

          <button
            type="submit"
            disabled={saving}
            className="flex-[2] py-3.5 bg-violet-600 text-white rounded-xl font-black uppercase text-xs shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Save size={16} />
            {saving
              ? 'Guardando...'
              : editingGroup.isNew
              ? `Crear ${groupLabel}`
              : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  );
}

function SectionHeading({
  icon,
  title
}) {
  return (
    <div className="flex items-center gap-2 pb-2 mb-3 border-b border-slate-100">
      <div className="p-2 rounded-lg bg-violet-50 text-violet-600">
        {icon}
      </div>
      <h4 className="text-sm font-black text-slate-800">
        {title}
      </h4>
    </div>
  );
}

function PrintOptionsModal({
  printMode,
  setPrintMode,
  onClose,
  onConfirm,
  groupLabelPlural,
  personLabelPlural
}) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] w-full max-w-md p-7 shadow-2xl border-t-8 border-violet-600">
        <p className="text-[9px] font-black uppercase tracking-widest text-violet-500">
          Imprimir
        </p>

        <h3 className="text-xl font-black text-slate-900 uppercase italic mt-1">
          Elegí qué querés imprimir
        </h3>

        <div className="flex flex-col gap-3 mt-5">
          <button
            type="button"
            onClick={() =>
              setPrintMode('students')
            }
            className={`p-4 rounded-2xl border-2 text-left transition ${
              printMode === 'students'
                ? 'border-violet-600 bg-violet-50'
                : 'border-slate-100 hover:border-slate-200'
            }`}
          >
            <p className="font-black text-xs uppercase text-slate-800">
              Listado de {personLabelPlural}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              Foto, nombre, DNI, edad y fecha de nacimiento.
            </p>
          </button>

          <button
            type="button"
            onClick={() =>
              setPrintMode('staff')
            }
            className={`p-4 rounded-2xl border-2 text-left transition ${
              printMode === 'staff'
                ? 'border-violet-600 bg-violet-50'
                : 'border-slate-100 hover:border-slate-200'
            }`}
          >
            <p className="font-black text-xs uppercase text-slate-800">
              Organización de personal
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              Equipo, turnos y espacios por {groupLabelPlural}.
            </p>
          </button>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-500 font-black text-xs"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className="flex-[2] py-3 rounded-xl bg-violet-600 text-white font-black text-xs shadow-lg"
          >
            <span className="inline-flex items-center gap-2">
              <Printer size={15} />
              Confirmar e imprimir
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

const fieldLabelClass =
  'text-[10px] font-black text-slate-400 uppercase tracking-widest';
const fieldInputClass =
  'mt-1 w-full p-3.5 bg-slate-50 rounded-xl font-bold text-sm outline-none border border-slate-200 focus:border-violet-400';

if (typeof document !== 'undefined') {
  // Estas clases se inyectan solamente si el proyecto todavía no las tiene.
  // No afectan la lógica de la aplicación.
}
