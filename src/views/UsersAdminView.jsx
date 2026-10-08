import React, { useEffect, useMemo, useState } from 'react';
import { normalizeAppConfig } from '../config';
import {
  Plus,
  Trash2,
  Users,
  Search,
  X,
  UploadCloud,
  Edit3,
  Shield,
  Link as LinkIcon,
  Unlink,
  UserCheck,
  UserX,
  Mail,
  Clock3,
  AlertCircle
} from 'lucide-react';

import {
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  deleteDoc,
  where,
  getDocs,
  serverTimestamp,
  deleteField
} from 'firebase/firestore';



const getRoleLabel = (role, index = 0) => {
  if (typeof role === 'string') return role.trim();
  return (
    role?.name ||
    role?.shortName ||
    role?.label ||
    role?.id ||
    `Rol ${index + 1}`
  ).trim();
};

const getConfiguredRoleOptions = (config) => {
  const roles = Array.isArray(config?.roles) ? config.roles : [];
  return roles
    .map((role, index) => getRoleLabel(role, index))
    .filter(Boolean)
    .filter((role, index, arr) => arr.indexOf(role) === index);
};

const makeEmptyForm = (defaultRole = '') => ({
  firstName: '',
  lastName: '',
  username: '',
  email: '',
  password: '',
  role: defaultRole,
  isAdmin: false,
  staffId: ''
});

const cleanText = (value) => String(value || '').trim();

const normalizeName = (value) =>
  cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const makeUsername = (firstName, lastName) => {
  const first = normalizeName(firstName).replace(/[^a-z0-9]/g, '');
  const last = normalizeName(lastName).replace(/[^a-z0-9]/g, '');
  return first && last ? `${first}.${last}` : first || last;
};

const getDateMillis = (value) => {
  if (!value) return 0;
  if (typeof value.toMillis === 'function') return value.toMillis();
  if (value.seconds) return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatLastLogin = (timestamp) => {
  const millis = getDateMillis(timestamp);
  if (!millis) return 'Nunca ingresó';

  return new Date(millis).toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};


export function UsersAdminView({ db, appId }) {
  const [users, setUsers] = useState([]);
  const [staffList, setStaffList] = useState([]);

  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showPendingStaff, setShowPendingStaff] = useState(false);

  const [editingUser, setEditingUser] = useState(null);
  const [institutionConfig, setInstitutionConfig] = useState(() => normalizeAppConfig({}));
  const [form, setForm] = useState(() => makeEmptyForm(''));

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [csvContent, setCsvContent] = useState('');
  const [processing, setProcessing] = useState(false);
  const [savingLink, setSavingLink] = useState(false);

  const configuredRoleOptions = useMemo(() => {
    const configured = getConfiguredRoleOptions(institutionConfig);
    return configured;
  }, [institutionConfig]);

  const roleOptionsForForm = useMemo(() => {
    const currentRole = cleanText(editingUser?.role || form.role);
    if (currentRole && !configuredRoleOptions.includes(currentRole)) {
      return [currentRole, ...configuredRoleOptions];
    }
    return configuredRoleOptions;
  }, [configuredRoleOptions, editingUser, form.role]);

  useEffect(() => {
    if (!db || !appId) return undefined;

    const configRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'config',
      'institution'
    );

    const unsubscribe = onSnapshot(
      configRef,
      snap => {
        if (!snap.exists()) return;
        setInstitutionConfig(normalizeAppConfig(snap.data()));
      },
      error => console.warn('No se pudo escuchar la configuración institucional:', error)
    );

    return () => unsubscribe();
  }, [db, appId]);

  useEffect(() => {
    const handleConfigUpdate = event => {
      const next = event?.detail;
      if (!next) return;
      setInstitutionConfig(normalizeAppConfig(next));
    };

    window.addEventListener('institution-config-updated', handleConfigUpdate);
    return () => window.removeEventListener('institution-config-updated', handleConfigUpdate);
  }, []);

  useEffect(() => {
    if (!showModal || editingUser) return;
    const currentRole = cleanText(form.role);
    if (!currentRole || !configuredRoleOptions.includes(currentRole)) {
      setField('role', configuredRoleOptions[0] || '');
    }
  }, [showModal, editingUser, configuredRoleOptions]);

  useEffect(() => {
    if (!db || !appId) return undefined;

    const base = `artifacts/${appId}/public/data`;

    const usersQuery = query(
      collection(db, `${base}/users`),
      orderBy('fullName', 'asc')
    );

    const staffQuery = query(
      collection(db, `${base}/staff_records`),
      orderBy('lastName', 'asc')
    );

    const unsubUsers = onSnapshot(
      usersQuery,
      snap => {
        setUsers(
          snap.docs.map(item => ({
            id: item.id,
            ...item.data()
          }))
        );
      },
      error => {
        console.error('No se pudieron cargar los usuarios:', error);
      }
    );

    const unsubStaff = onSnapshot(
      staffQuery,
      snap => {
        setStaffList(
          snap.docs.map(item => ({
            id: item.id,
            ...item.data()
          }))
        );
      },
      error => {
        console.error('No se pudo cargar Personal:', error);
      }
    );

    return () => {
      unsubUsers();
      unsubStaff();
    };
  }, [db, appId]);

  const linkedStaffMap = useMemo(() => {
    const map = new Map();

    staffList.forEach(staff => {
      if (staff.userId) {
        map.set(staff.userId, staff.id);
      }
    });

    users.forEach(user => {
      if (user.legajoId && !map.has(user.id)) {
        map.set(user.id, user.legajoId);
      }
    });

    return map;
  }, [users, staffList]);

  const staffById = useMemo(
    () => new Map(staffList.map(staff => [staff.id, staff])),
    [staffList]
  );

  const getLinkedStaffId = (user) =>
    linkedStaffMap.get(user.id) || user.legajoId || '';

  const getLinkedStaff = (user) => {
    const staffId = getLinkedStaffId(user);
    return staffById.get(staffId) || null;
  };

  const pendingStaff = useMemo(() => {
    return staffList.filter(staff => {
      const linkedByStaff = Boolean(staff.userId);
      const linkedByUser = users.some(user => user.legajoId === staff.id);
      return !linkedByStaff && !linkedByUser;
    });
  }, [staffList, users]);

  const linkedUsersCount = useMemo(
    () => users.filter(user => Boolean(getLinkedStaffId(user))).length,
    [users, linkedStaffMap]
  );

  const externalUsersCount = Math.max(users.length - linkedUsersCount, 0);

  const filteredUsers = useMemo(() => {
    const needle = normalizeName(searchTerm);

    return users
      .filter(user => {
        const linkedStaff = getLinkedStaff(user);

        const haystack = [
          user.firstName,
          user.lastName,
          user.fullName,
          user.username,
          user.email,
          user.role,
          linkedStaff?.firstName,
          linkedStaff?.lastName,
          linkedStaff?.dni
        ]
          .filter(Boolean)
          .join(' ');

        const matchesSearch =
          !needle || normalizeName(haystack).includes(needle);

        if (!matchesSearch) return false;

        if (statusFilter === 'linked') {
          return Boolean(linkedStaff);
        }

        if (statusFilter === 'external') {
          return !linkedStaff;
        }

        if (statusFilter === 'admin') {
          return user.rol === 'admin';
        }

        return true;
      })
      .sort((a, b) =>
        `${a.lastName || ''} ${a.firstName || ''}`.localeCompare(
          `${b.lastName || ''} ${b.firstName || ''}`,
          'es'
        )
      );
  }, [users, staffById, linkedStaffMap, searchTerm, statusFilter]);

  const availableStaff = useMemo(() => {
    const currentStaffId = editingUser
      ? getLinkedStaffId(editingUser)
      : '';

    return staffList
      .filter(staff => {
        if (staff.id === currentStaffId) return true;

        const occupiedByUser = staff.userId;
        if (!occupiedByUser) {
          const legacyUser = users.find(user => user.legajoId === staff.id);
          return !legacyUser;
        }

        return occupiedByUser === editingUser?.id;
      })
      .sort((a, b) =>
        `${a.lastName || ''} ${a.firstName || ''}`.localeCompare(
          `${b.lastName || ''} ${b.firstName || ''}`,
          'es'
        )
      );
  }, [staffList, users, editingUser, linkedStaffMap]);

  const openCreate = () => {
    setEditingUser(null);
    setForm(makeEmptyForm(configuredRoleOptions[0] || ''));
    setShowModal(true);
  };

  const openEdit = (user) => {
    const linkedStaff = getLinkedStaff(user);

    setEditingUser(user);
    setForm({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      username: user.username || '',
      email: user.email || '',
      password: user.password || '',
      role: user.role || configuredRoleOptions[0] || '',
      isAdmin: user.rol === 'admin',
      staffId: linkedStaff?.id || getLinkedStaffId(user) || ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setForm(makeEmptyForm(configuredRoleOptions[0] || ''));
  };

  const setField = (field, value) => {
    setForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const linkStaffToUser = async (userId, staffId) => {
    if (!db || !appId || !userId || !staffId) return;

    const targetStaff = staffById.get(staffId);
    if (!targetStaff) {
      throw new Error('No se encontró el registro de Personal.');
    }

    const alreadyLinkedTo = targetStaff.userId;

    if (alreadyLinkedTo && alreadyLinkedTo !== userId) {
      throw new Error(
        'Ese registro de Personal ya está vinculado a otro usuario.'
      );
    }

    const userWithSameLegacyLink = users.find(
      item =>
        item.id !== userId &&
        item.legajoId === staffId
    );

    if (userWithSameLegacyLink) {
      throw new Error(
        'Ese registro de Personal ya está vinculado a otro usuario.'
      );
    }

    await updateDoc(
      doc(
        db,
        'artifacts',
        appId,
        'public',
        'data',
        'users',
        userId
      ),
      {
        legajoId: staffId
      }
    );

    await updateDoc(
      doc(
        db,
        'artifacts',
        appId,
        'public',
        'data',
        'staff_records',
        staffId
      ),
      {
        userId
      }
    );
  };

  const unlinkStaffFromUser = async (userId) => {
    const currentStaffId = linkedStaffMap.get(userId);

    if (!currentStaffId || !db || !appId) return;

    await updateDoc(
      doc(
        db,
        'artifacts',
        appId,
        'public',
        'data',
        'users',
        userId
      ),
      {
        legajoId: deleteField()
      }
    );

    const staff = staffById.get(currentStaffId);

    if (staff?.userId === userId) {
      await updateDoc(
        doc(
          db,
          'artifacts',
          appId,
          'public',
          'data',
          'staff_records',
          currentStaffId
        ),
        {
          userId: deleteField()
        }
      );
    }
  };

  const handleLinkChange = async (nextStaffId) => {
    if (!editingUser) {
      setField('staffId', nextStaffId);
      return;
    }

    const currentStaffId = getLinkedStaffId(editingUser);

    if (nextStaffId === currentStaffId) {
      setField('staffId', nextStaffId);
      return;
    }

    setSavingLink(true);

    try {
      if (currentStaffId) {
        const currentStaff = staffById.get(currentStaffId);

        await updateDoc(
          doc(
            db,
            'artifacts',
            appId,
            'public',
            'data',
            'users',
            editingUser.id
          ),
          {
            legajoId: deleteField()
          }
        );

        if (currentStaff?.userId === editingUser.id) {
          await updateDoc(
            doc(
              db,
              'artifacts',
              appId,
              'public',
              'data',
              'staff_records',
              currentStaffId
            ),
            {
              userId: deleteField()
            }
          );
        }
      }

      if (nextStaffId) {
        await linkStaffToUser(editingUser.id, nextStaffId);
      }

      setEditingUser(prev =>
        prev
          ? {
              ...prev,
              legajoId: nextStaffId || undefined
            }
          : prev
      );

      setField('staffId', nextStaffId);

      alert(
        nextStaffId
          ? 'Usuario y Personal vinculados.'
          : 'Vínculo con Personal eliminado.'
      );
    } catch (error) {
      console.error(error);
      alert(`No se pudo actualizar el vínculo: ${error.message}`);
      setField('staffId', currentStaffId || '');
    } finally {
      setSavingLink(false);
    }
  };

  const handleSubmit = async event => {
    event.preventDefault();

    if (!db || !appId) {
      alert('No se encontró la conexión con Firebase.');
      return;
    }

    const firstName = cleanText(form.firstName);
    const lastName = cleanText(form.lastName);
    const username = cleanText(form.username || makeUsername(firstName, lastName)).toLowerCase();
    const email = cleanText(form.email).toLowerCase();

    if (!firstName || !lastName || !username) {
      alert('Completá nombre, apellido y usuario.');
      return;
    }

    if (!editingUser && !cleanText(form.password)) {
      alert('Para crear un usuario necesitás indicar una contraseña.');
      return;
    }

    setProcessing(true);

    try {
      const usernameQuery = query(
        collection(
          db,
          'artifacts',
          appId,
          'public',
          'data',
          'users'
        ),
        where('username', '==', username)
      );

      const usernameSnap = await getDocs(usernameQuery);

      const duplicateUsername = usernameSnap.docs.find(
        item => item.id !== editingUser?.id
      );

      if (duplicateUsername) {
        alert('Ya existe otro usuario con ese nombre de usuario.');
        return;
      }

      if (form.staffId) {
        const targetStaff = staffById.get(form.staffId);

        if (!targetStaff) {
          alert('El registro de Personal seleccionado ya no existe.');
          return;
        }

        const occupiedBy = targetStaff.userId;

        if (
          occupiedBy &&
          occupiedBy !== editingUser?.id
        ) {
          alert('Ese registro de Personal ya está vinculado a otro usuario.');
          return;
        }

        const legacyLinked = users.find(
          item =>
            item.id !== editingUser?.id &&
            item.legajoId === form.staffId
        );

        if (legacyLinked) {
          alert('Ese registro de Personal ya está vinculado a otro usuario.');
          return;
        }
      }

      const selectedRole = cleanText(form.role);

      if (!selectedRole) {
        alert('Configurá al menos un rol en Configuración → Listas y opciones → Roles.');
        return;
      }

      if (!editingUser && configuredRoleOptions.length && !configuredRoleOptions.includes(selectedRole)) {
        alert('El rol seleccionado ya no está disponible en la configuración institucional. Elegí uno de los roles configurados.');
        return;
      }

      const data = {
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        username,
        email,
        role: selectedRole,
        rol: form.isAdmin ? 'admin' : 'user',
        ...(cleanText(form.password)
          ? { password: cleanText(form.password) }
          : {})
      };

      if (editingUser) {
        await updateDoc(
          doc(
            db,
            'artifacts',
            appId,
            'public',
            'data',
            'users',
            editingUser.id
          ),
          data
        );

        const oldStaffId = getLinkedStaffId(editingUser);
        const newStaffId = form.staffId || '';

        if (oldStaffId !== newStaffId) {
          if (oldStaffId) {
            const oldStaff = staffById.get(oldStaffId);

            if (oldStaff?.userId === editingUser.id) {
              await updateDoc(
                doc(
                  db,
                  'artifacts',
                  appId,
                  'public',
                  'data',
                  'staff_records',
                  oldStaffId
                ),
                {
                  userId: deleteField()
                }
              );
            }

            await updateDoc(
              doc(
                db,
                'artifacts',
                appId,
                'public',
                'data',
                'users',
                editingUser.id
              ),
              {
                legajoId: deleteField()
              }
            );
          }

          if (newStaffId) {
            await linkStaffToUser(editingUser.id, newStaffId);
          }
        } else if (newStaffId) {
          await linkStaffToUser(editingUser.id, newStaffId);
        }
      } else {
        const userRef = await addDoc(
          collection(
            db,
            'artifacts',
            appId,
            'public',
            'data',
            'users'
          ),
          {
            ...data,
            ...(form.staffId ? { legajoId: form.staffId } : {}),
            createdAt: serverTimestamp()
          }
        );

        if (form.staffId) {
          await updateDoc(
            doc(
              db,
              'artifacts',
              appId,
              'public',
              'data',
              'staff_records',
              form.staffId
            ),
            {
              userId: userRef.id
            }
          );
        }
      }

      alert(
        editingUser
          ? 'Usuario actualizado correctamente.'
          : 'Usuario creado correctamente.'
      );

      closeModal();
    } catch (error) {
      console.error('Error al guardar usuario:', error);
      alert(`Error al guardar el usuario: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteUser = async user => {
    if (!db || !appId) return;

    if (user.username === 'admin') {
      alert('La cuenta admin principal no se puede eliminar desde acá.');
      return;
    }

    const linkedStaff = getLinkedStaff(user);

    const message = linkedStaff
      ? `¿Eliminar el usuario ${user.fullName}? El registro de Personal de ${linkedStaff.lastName}, ${linkedStaff.firstName} se conservará, pero quedará sin usuario.`
      : `¿Eliminar el usuario ${user.fullName}?`;

    if (!window.confirm(message)) return;

    setProcessing(true);

    try {
      if (linkedStaff?.userId === user.id) {
        await updateDoc(
          doc(
            db,
            'artifacts',
            appId,
            'public',
            'data',
            'staff_records',
            linkedStaff.id
          ),
          {
            userId: deleteField()
          }
        );
      }

      await deleteDoc(
        doc(
          db,
          'artifacts',
          appId,
          'public',
          'data',
          'users',
          user.id
        )
      );
    } catch (error) {
      console.error(error);
      alert(`No se pudo eliminar el usuario: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleQuickUnlink = async user => {
    if (!window.confirm(`¿Desvincular a ${user.fullName} de Personal?`)) {
      return;
    }

    setSavingLink(true);

    try {
      await unlinkStaffFromUser(user.id);
      alert('Vínculo eliminado.');
    } catch (error) {
      console.error(error);
      alert(`No se pudo desvincular: ${error.message}`);
    } finally {
      setSavingLink(false);
    }
  };

  const processBulkImport = async () => {
    if (!db || !appId) return;

    const rows = csvContent
      .split(/\r?\n/)
      .map(row => row.trim())
      .filter(Boolean);

    if (!rows.length) {
      alert('Pegá al menos una fila de usuarios.');
      return;
    }

    setProcessing(true);

    try {
      let created = 0;
      let skipped = 0;

      for (const row of rows) {
        const separator = row.includes(';') ? ';' : ',';
        const columns = row
          .split(separator)
          .map(value => value.trim());

        if (
          columns.length < 5 ||
          normalizeName(columns[0]) === 'nombre'
        ) {
          skipped += 1;
          continue;
        }

        const [
          firstName,
          lastName,
          username,
          password,
          role,
          email
        ] = columns;

        const requestedRole = cleanText(role);
        const matchedConfiguredRole = configuredRoleOptions.find(
          configuredRole => configuredRole.toLowerCase() === requestedRole.toLowerCase()
        );
        const finalRole = matchedConfiguredRole || '';

        if (!finalRole) {
          skipped += 1;
          continue;
        }

        const finalUsername =
          cleanText(username) ||
          makeUsername(firstName, lastName);

        const duplicateQuery = query(
          collection(
            db,
            'artifacts',
            appId,
            'public',
            'data',
            'users'
          ),
          where('username', '==', finalUsername.toLowerCase())
        );

        const duplicateSnap = await getDocs(duplicateQuery);

        if (!duplicateSnap.empty) {
          skipped += 1;
          continue;
        }

        await addDoc(
          collection(
            db,
            'artifacts',
            appId,
            'public',
            'data',
            'users'
          ),
          {
            firstName: cleanText(firstName),
            lastName: cleanText(lastName),
            fullName: `${cleanText(firstName)} ${cleanText(lastName)}`.trim(),
            username: finalUsername.toLowerCase(),
            password: cleanText(password),
            email: cleanText(email).toLowerCase(),
            role: finalRole,
            rol: 'user',
            createdAt: serverTimestamp()
          }
        );

        created += 1;
      }

      alert(
        `Importación finalizada.\n\nCreados: ${created}\nOmitidos por duplicado o formato: ${skipped}`
      );

      setCsvContent('');
      setShowImport(false);
    } catch (error) {
      console.error(error);
      alert(`Error durante la importación: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  if (!db || !appId) {
    return (
      <div className="p-10 text-center text-slate-400 font-bold">
        No se pudo conectar con la base de datos.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 p-4 md:p-6 rounded-3xl overflow-hidden animate-in fade-in">

      <div className="shrink-0 space-y-4 mb-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl md:text-2xl font-black text-violet-900 uppercase tracking-tight">
              Gestión de Usuarios
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Administrá las cuentas que pueden ingresar a CENTRA y su vínculo con Personal.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {pendingStaff.length > 0 && (
              <button
                type="button"
                onClick={() => setShowPendingStaff(true)}
                className="px-3 py-2 rounded-xl bg-amber-100 text-amber-800 border border-amber-200 text-xs font-black flex items-center gap-2 hover:bg-amber-200 transition"
              >
                <UserX size={16} />
                {pendingStaff.length} sin usuario
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowImport(true)}
              className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-sm hover:bg-emerald-600 transition"
              title="Importar usuarios"
            >
              <UploadCloud size={19} />
            </button>

            <button
              type="button"
              onClick={openCreate}
              className="p-2.5 bg-violet-600 text-white rounded-xl shadow-sm hover:bg-violet-700 transition"
              title="Nuevo usuario"
            >
              <Plus size={19} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="bg-white rounded-2xl border border-slate-200 p-3">
            <p className="text-[9px] uppercase font-black text-slate-400">Usuarios</p>
            <p className="text-xl font-black text-slate-800 mt-1">{users.length}</p>
          </div>

          <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-3">
            <p className="text-[9px] uppercase font-black text-emerald-600">Vinculados a Personal</p>
            <p className="text-xl font-black text-emerald-800 mt-1">{linkedUsersCount}</p>
          </div>

          <div className="bg-blue-50 rounded-2xl border border-blue-100 p-3">
            <p className="text-[9px] uppercase font-black text-blue-600">Usuarios externos</p>
            <p className="text-xl font-black text-blue-800 mt-1">{externalUsersCount}</p>
          </div>

          <button
            type="button"
            onClick={() => pendingStaff.length > 0 && setShowPendingStaff(true)}
            className={`text-left rounded-2xl border p-3 transition ${
              pendingStaff.length
                ? 'bg-amber-50 border-amber-200 hover:bg-amber-100'
                : 'bg-slate-100 border-slate-200'
            }`}
          >
            <p className="text-[9px] uppercase font-black text-slate-500">Personal sin usuario</p>
            <p className="text-xl font-black text-slate-800 mt-1">{pendingStaff.length}</p>
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-2">
          <div className="bg-white p-3 rounded-2xl flex items-center gap-2 border border-violet-100 shadow-sm flex-1">
            <Search className="text-slate-400 ml-1" size={18} />
            <input
              value={searchTerm}
              onChange={event => setSearchTerm(event.target.value)}
              placeholder="Buscar por nombre, usuario, mail o Personal..."
              className="bg-transparent border-none outline-none text-slate-700 text-sm w-full font-semibold"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="flex gap-1 bg-white border border-slate-200 rounded-2xl p-1">
            {[
              ['all', 'Todos'],
              ['linked', 'Con Personal'],
              ['external', 'Externos'],
              ['admin', 'Admins']
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition ${
                  statusFilter === value
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pb-10">
        <div className="flex items-center justify-between px-1 mb-2">
          <p className="text-[10px] uppercase tracking-widest font-black text-slate-400">
            {filteredUsers.length} {filteredUsers.length === 1 ? 'usuario' : 'usuarios'}
          </p>
          <p className="text-[10px] text-slate-400">
            {linkedUsersCount} vinculados · {externalUsersCount} externos
          </p>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-10 text-center">
            <Users className="mx-auto text-slate-300" size={34} />
            <p className="text-sm font-black text-slate-500 mt-3">
              No encontramos usuarios con esos criterios.
            </p>
          </div>
        ) : (
          filteredUsers.map(user => {
            const linkedStaff = getLinkedStaff(user);
            const isAdmin = user.rol === 'admin';

            return (
              <div
                key={user.id}
                className="bg-white p-3 md:p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center font-black shrink-0 relative overflow-hidden">
                      {user.photoUrl ? (
                        <img
                          src={user.photoUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        (user.firstName?.[0] || user.lastName?.[0] || 'U').toUpperCase()
                      )}

                      {isAdmin && (
                        <div className="absolute top-0 right-0 w-4 h-4 bg-orange-500 rounded-bl-lg flex items-center justify-center">
                          <Shield size={9} className="text-white" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-black text-sm md:text-base text-slate-800 truncate">
                          {user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Sin nombre'}
                        </p>

                        {isAdmin && (
                          <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 text-[8px] font-black uppercase">
                            Administrador
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-1">
                        <span className="px-2 py-1 rounded-lg bg-violet-50 text-violet-700 text-[9px] font-black uppercase">
                          {user.role || 'Usuario'}
                        </span>

                        {linkedStaff ? (
                          <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[9px] font-black flex items-center gap-1">
                            <UserCheck size={11} />
                            Personal: {linkedStaff.lastName}, {linkedStaff.firstName}
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-700 text-[9px] font-black">
                            Usuario sin Personal
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[9px] text-slate-400 font-semibold">
                        <span>Usuario: <strong className="text-slate-600">{user.username || '-'}</strong></span>

                        {user.email && (
                          <span className="flex items-center gap-1">
                            <Mail size={10} />
                            {user.email}
                          </span>
                        )}

                        <span className="flex items-center gap-1">
                          <Clock3 size={10} />
                          {formatLastLogin(user.lastLogin)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1.5 shrink-0">
                    {linkedStaff && (
                      <button
                        type="button"
                        onClick={() => handleQuickUnlink(user)}
                        disabled={savingLink}
                        className="p-2 bg-amber-50 text-amber-700 rounded-xl hover:bg-amber-100 transition"
                        title="Desvincular de Personal"
                      >
                        <Unlink size={16} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => openEdit(user)}
                      className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition"
                      title="Editar usuario"
                    >
                      <Edit3 size={16} />
                    </button>

                    {user.username !== 'admin' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(user)}
                        disabled={processing}
                        className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition"
                        title="Eliminar usuario"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden"
          >
            <div className="bg-violet-700 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight">
                  {editingUser ? 'Editar usuario' : 'Nuevo usuario'}
                </h3>
                <p className="text-[10px] font-semibold text-white/70 mt-1">
                  La cuenta puede existir con o sin Personal asociado.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="bg-white/15 p-2 rounded-full hover:bg-white/25 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[78vh] overflow-y-auto">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400">
                    Nombre
                  </label>
                  <input
                    value={form.firstName}
                    onChange={event => setField('firstName', event.target.value)}
                    className="mt-1 w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 ring-violet-200 font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400">
                    Apellido
                  </label>
                  <input
                    value={form.lastName}
                    onChange={event => setField('lastName', event.target.value)}
                    className="mt-1 w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 ring-violet-200 font-semibold"
                    required
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400">
                    Usuario
                  </label>
                  <input
                    value={form.username}
                    onChange={event => setField('username', event.target.value)}
                    placeholder={makeUsername(form.firstName, form.lastName) || 'nombre.apellido'}
                    className="mt-1 w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 ring-violet-200 font-semibold"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400">
                    Correo
                  </label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={event => setField('email', event.target.value)}
                    placeholder="correo@institucion.com"
                    className="mt-1 w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 ring-violet-200 font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-black text-slate-400">
                  Contraseña
                </label>
                <input
                  type="text"
                  value={form.password}
                  onChange={event => setField('password', event.target.value)}
                  placeholder={editingUser ? 'Dejar vacío para conservar la actual' : 'Contraseña'}
                  className="mt-1 w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:ring-2 ring-violet-200 font-semibold"
                  required={!editingUser}
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-black text-slate-400">
                  Rol de acceso
                </label>

                <select
                  value={form.role}
                  onChange={event => setField('role', event.target.value)}
                  className="mt-1 w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none font-bold text-slate-700"
                  disabled={roleOptionsForForm.length === 0}
                >
                  {roleOptionsForForm.map(role => (
                    <option key={role} value={role}>
                      {role}
                      {editingUser?.role === role && !configuredRoleOptions.includes(role) ? ' (rol anterior)' : ''}
                    </option>
                  ))}
                </select>

                <p className="text-[10px] text-slate-400 mt-1">
                  Esta lista sale directamente de Configuración → Listas y opciones → Roles. Si agregás o quitás un tipo de usuario, el selector se actualiza automáticamente.
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-emerald-600 shrink-0">
                    <LinkIcon size={17} />
                  </div>

                  <div className="flex-1">
                    <p className="text-[11px] uppercase font-black text-emerald-800">
                      Vincular con Personal
                    </p>
                    <p className="text-xs text-emerald-700 mt-1">
                      No es obligatorio para una cuenta. Si la persona pertenece al Personal institucional, elegí su registro acá.
                    </p>

                    <select
                      value={form.staffId}
                      onChange={event => handleLinkChange(event.target.value)}
                      disabled={savingLink}
                      className="mt-3 w-full p-3 rounded-xl bg-white border border-emerald-200 outline-none font-semibold text-slate-700"
                    >
                      <option value="">Sin Personal asociado</option>

                      {availableStaff.map(staff => (
                        <option key={staff.id} value={staff.id}>
                          {staff.lastName}, {staff.firstName}
                          {staff.dni ? ` · DNI ${staff.dni}` : ''}
                          {staff.cargo1_role ? ` · ${staff.cargo1_role}` : ''}
                        </option>
                      ))}
                    </select>

                    {editingUser && form.staffId && (
                      <div className="mt-2 text-[10px] font-bold text-emerald-700 flex items-center gap-1">
                        <UserCheck size={12} />
                        Cuenta y Personal quedarán vinculados en ambos registros.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-3 p-4 rounded-2xl bg-orange-50 border border-orange-100 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isAdmin}
                  onChange={event => setField('isAdmin', event.target.checked)}
                  className="w-5 h-5 accent-orange-500"
                />
                <div>
                  <p className="text-sm font-black text-orange-800">
                    Administrador de la instalación
                  </p>
                  <p className="text-[10px] text-orange-700 mt-0.5">
                    Es un nivel técnico de administración de CENTRA, independiente del tipo de usuario institucional elegido arriba.
                  </p>
                </div>
              </label>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 py-3 rounded-xl text-slate-500 font-black uppercase text-xs hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={processing || savingLink}
                  className="flex-[2] py-3 rounded-xl bg-violet-600 text-white font-black uppercase text-xs shadow-lg hover:bg-violet-700 transition disabled:opacity-60"
                >
                  {processing ? 'Guardando...' : 'Guardar usuario'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {showImport && (
        <div className="fixed inset-0 bg-black/70 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="bg-emerald-600 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black uppercase">
                  Importar usuarios
                </h3>
                <p className="text-[10px] text-white/75 mt-1">
                  Esta importación crea cuentas, pero no las vincula automáticamente con Personal.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowImport(false)}
                className="bg-white/15 p-2 rounded-full hover:bg-white/25 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <p className="text-[10px] uppercase font-black text-slate-500">
                  Formato
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Nombre, Apellido, Usuario, Contraseña, Rol, Correo
                </p>
              </div>

              <textarea
                value={csvContent}
                onChange={event => setCsvContent(event.target.value)}
                className="w-full h-48 p-4 border border-slate-200 rounded-2xl text-xs font-mono outline-none focus:ring-2 ring-emerald-200"
                placeholder={`Nombre,Apellido,nombre.apellido,Contraseña,${configuredRoleOptions[0] || 'Rol configurado'},correo@institucion.com\nMaría,Pérez,maria.perez,Contraseña,${configuredRoleOptions[1] || configuredRoleOptions[0] || 'Rol configurado'},maria@institucion.com`}
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowImport(false)}
                  className="flex-1 py-3 text-slate-500 font-black uppercase text-xs"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={processBulkImport}
                  disabled={processing}
                  className="flex-[2] py-3 bg-emerald-600 text-white rounded-xl font-black uppercase text-xs disabled:opacity-60"
                >
                  {processing ? 'Importando...' : 'Procesar importación'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPendingStaff && (
        <div className="fixed inset-0 bg-black/70 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="bg-amber-500 text-white p-5 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black uppercase">
                  Personal sin usuario
                </h3>
                <p className="text-[10px] text-white/80 mt-1">
                  Toda persona registrada en Personal debería tener una cuenta de acceso.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowPendingStaff(false)}
                className="bg-white/15 p-2 rounded-full hover:bg-white/25 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 max-h-[70vh] overflow-y-auto space-y-2">
              {pendingStaff.length === 0 ? (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-6 text-center">
                  <UserCheck className="mx-auto text-emerald-600" size={34} />
                  <p className="font-black text-emerald-800 mt-3">
                    Todo el Personal tiene usuario.
                  </p>
                </div>
              ) : (
                pendingStaff.map(staff => (
                  <div
                    key={staff.id}
                    className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-black text-slate-800">
                        {staff.lastName}, {staff.firstName}
                      </p>

                      <div className="flex flex-wrap gap-2 mt-1">
                        {staff.dni && (
                          <span className="text-[9px] bg-white border border-slate-200 rounded-lg px-2 py-1 font-semibold text-slate-500">
                            DNI {staff.dni}
                          </span>
                        )}

                        {(staff.cargo1_role || staff.role) && (
                          <span className="text-[9px] bg-violet-50 border border-violet-100 rounded-lg px-2 py-1 font-bold text-violet-700">
                            {staff.cargo1_role || staff.role}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowPendingStaff(false);
                        setEditingUser(null);
                        setForm({
                          ...makeEmptyForm(
                            configuredRoleOptions.find(role =>
                              role.toLowerCase() === String(staff.cargo1_role || staff.role || '').toLowerCase()
                            ) || configuredRoleOptions[0] || ''
                          ),
                          firstName: staff.firstName || '',
                          lastName: staff.lastName || '',
                          username: makeUsername(staff.firstName, staff.lastName),
                          email: staff.email || '',
                          role: configuredRoleOptions.find(role =>
                            role.toLowerCase() === String(staff.cargo1_role || staff.role || '').toLowerCase()
                          ) || configuredRoleOptions[0] || '',
                          staffId: staff.id
                        });
                        setShowModal(true);
                      }}
                      className="px-4 py-2.5 bg-violet-600 text-white rounded-xl font-black text-xs uppercase"
                    >
                      Crear usuario
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {(processing || savingLink) && (
        <div className="fixed bottom-20 right-4 z-[500] bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl text-xs font-black flex items-center gap-2">
          <AlertCircle size={15} />
          Guardando cambios...
        </div>
      )}
    </div>
  );
}
