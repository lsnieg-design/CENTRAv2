import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckSquare,
  UserRound,
  Trash2,
  LockKeyhole,
  Bell,
  Check,
  HelpCircle,
  Plus,
  ChevronRight,
  Cake,
  Pencil,
  X,
  Users,
  Clock3,
  ArrowUpRight,
  Sparkles,
  CalendarCheck2,
  Megaphone,
  GraduationCap,
  ListTodo,
} from 'lucide-react';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { canAccessModule } from '../config';

const EMPTY_ARRAY = [];

const calculateBusinessDaysLeft = (dateString, holidays = EMPTY_ARRAY) => {
  if (!dateString) return 0;

  const targetDate = new Date(`${dateString}T00:00:00`);
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  if (Number.isNaN(targetDate.getTime()) || targetDate <= currentDate) return 0;

  const holidayDates = new Set(
    holidays.map(value => String(value).split('|')[0])
  );

  let businessDays = 0;
  const tempDate = new Date(currentDate);

  while (tempDate < targetDate) {
    tempDate.setDate(tempDate.getDate() + 1);
    const dayOfWeek = tempDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    const yyyy = tempDate.getFullYear();
    const mm = String(tempDate.getMonth() + 1).padStart(2, '0');
    const dd = String(tempDate.getDate()).padStart(2, '0');
    if (!holidayDates.has(`${yyyy}-${mm}-${dd}`)) businessDays++;
  }

  return businessDays;
};

const formatDate = (value, options = {}) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-AR', options);
};

const getNextBirthday = (birthDate, today = new Date()) => {
  if (!birthDate) return null;
  const raw = String(birthDate);
  const date = new Date(raw.includes('T') ? raw : `${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  const base = new Date(today);
  base.setHours(0, 0, 0, 0);
  const next = new Date(base.getFullYear(), date.getMonth(), date.getDate());
  if (next < base) next.setFullYear(base.getFullYear() + 1);
  return next;
};

const SectionHeading = ({ icon: Icon, title, subtitle, action }) => (
  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between mb-3">
    <div className="flex items-start gap-3">
      {Icon && (
        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
          <Icon size={16} aria-hidden="true" />
        </div>
      )}
      <div>
        <h3 className="text-sm font-extrabold text-slate-800">{title}</h3>
        {subtitle && <p className="text-[11px] text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {action}
  </div>
);

const EmptyState = ({ title, description }) => (
  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center">
    <div className="mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-400 border border-slate-200">
      <Sparkles size={15} aria-hidden="true" />
    </div>
    <p className="text-xs font-bold text-slate-700">{title}</p>
    {description && <p className="text-xs leading-relaxed text-slate-500 mt-1 max-w-sm mx-auto">{description}</p>}
  </div>
);

export function DashboardView({
  user,
  db,
  appId,
  appConfig = {},
  setActiveTab,
  tasks = EMPTY_ARRAY,
  events = EMPTY_ARRAY,
  announcements = EMPTY_ARRAY,
}) {
  const now = new Date();
  const todayStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  const todayLabel = now.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [birthdayModalType, setBirthdayModalType] = useState('students');
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [studentBirthdays, setStudentBirthdays] = useState([]);
  const [staffBirthdays, setStaffBirthdays] = useState([]);
  const [ungroupedCount, setUngroupedCount] = useState(0);
  const [tutorialTab, setTutorialTab] = useState('inicio');
  const [noticeMessage, setNoticeMessage] = useState('');
  const [noteError, setNoteError] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const [countdown, setCountdown] = useState({ title: '', date: '', daysLeft: 0 });
  const [countdownDocId, setCountdownDocId] = useState(null);
  const [isEditingCountdown, setIsEditingCountdown] = useState(false);
  const [newCountdownTitle, setNewCountdownTitle] = useState('');
  const [newCountdownDate, setNewCountdownDate] = useState('');
  const [savingCountdown, setSavingCountdown] = useState(false);

  const role = user?.role || '';
  const systemRole = user?.rol || '';
  const isSuperAdmin = systemRole === 'admin' || systemRole === 'super-admin';
  const isManagement =
    ['admin', 'super-admin', 'Equipo Directivo', 'Equipo Técnico', 'Administración', 'Dirección Inclusión'].includes(role) ||
    systemRole === 'admin' || systemRole === 'super-admin';
  const isInclusionStaff = ['DAI', 'Inclusión', 'Dirección Inclusión', 'Equipo Técnico Inclusión'].includes(role);
  const isSedeStaff = ['Docente', 'Equipo Directivo', 'Equipo Técnico', 'Auxiliar/Preceptor', 'Profes Especiales', 'Administración'].includes(role);
  const canPost = isManagement;
  const holidays = Array.isArray(appConfig.holidays) ? appConfig.holidays : EMPTY_ARRAY;
  const primaryColor = appConfig.primaryColor || '#6d28d9';
  const secondaryColor = appConfig.secondaryColor || '#f97316';
  const institutionName = appConfig.institutionShortName || appConfig.institutionName || 'Mi institución';
  const logoUrl = appConfig.logoUrl || '';

  const canUseModule = useCallback(
    moduleId => isSuperAdmin || canAccessModule(appConfig, role, moduleId),
    [isSuperAdmin, appConfig, role]
  );

  const todayEvents = useMemo(
    () => events
      .filter(event => event?.date === todayStr)
      .sort((a, b) => String(a.time || a.startTime || '').localeCompare(String(b.time || b.startTime || ''))),
    [events, todayStr]
  );

  const upcomingEvents = useMemo(
    () => events
      .filter(event => event?.date && String(event.date) >= todayStr)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)) || String(a.time || a.startTime || '').localeCompare(String(b.time || b.startTime || '')))
      .slice(0, 4),
    [events, todayStr]
  );

  const visibleAnnouncements = useMemo(() => {
    if (!canUseModule('notifications')) return [];
    return announcements
      .filter(announcement => {
        const hasPermission =
          isSuperAdmin ||
          announcement.authorId === user?.id ||
          !announcement.channel ||
          announcement.channel === 'general' ||
          (announcement.channel === 'inclusion' && isInclusionStaff) ||
          (announcement.channel === 'sede' && isSedeStaff);
        const scheduledAt = new Date(
          `${announcement.showDate || '2000-01-01'}T${announcement.showTime || '00:00'}`
        );
        return hasPermission && !Number.isNaN(scheduledAt.getTime()) && new Date() >= scheduledAt;
      })
      .slice(0, 4);
  }, [announcements, user?.id, isSuperAdmin, isInclusionStaff, isSedeStaff, appConfig, role]);

  const myPendingTasks = useMemo(() => {
    if (!canUseModule('tasks')) return [];
    return tasks
      .filter(task => {
        if (task.status === 'completed' || task.done === true) return false;
        const scheduledAt = new Date(
          `${task.showDate || '2000-01-01'}T${task.showTime || '00:00'}`
        );
        if (!Number.isNaN(scheduledAt.getTime()) && scheduledAt > new Date()) return false;
        const targetRoles = Array.isArray(task.targetRoles) ? task.targetRoles : [];
        return (
          isSuperAdmin ||
          task.createdById === user?.id ||
          task.targetUserId === user?.id ||
          targetRoles.some(targetRole => String(targetRole).toLowerCase() === String(role).toLowerCase())
        );
      })
      .sort((a, b) => {
        const aDate = String(a.dueDate || a.date || '9999-12-31');
        const bDate = String(b.dueDate || b.date || '9999-12-31');
        return aDate.localeCompare(bDate);
      });
  }, [tasks, user?.id, isSuperAdmin, role, appConfig]);

  useEffect(() => {
    if (!db || !appId || !user?.id) return undefined;
    const unsubscribers = [];

    if (canUseModule('tasks')) {
      const notesQuery = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'notes'),
        where('userId', '==', user.id)
      );
      unsubscribers.push(onSnapshot(notesQuery, snapshot => {
        setNotes(
          snapshot.docs
            .map(item => ({ id: item.id, ...item.data() }))
            .sort((a, b) => Number(Boolean(a.done)) - Number(Boolean(b.done)))
        );
      }, error => {
        console.error('No se pudieron cargar las notas personales:', error);
        setNoteError('No pudimos cargar tus notas. Revisá tu conexión e intentá nuevamente.');
      }));
    } else {
      setNotes([]);
    }

    if (canUseModule('matricula')) {
      const studentsQuery = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'students'),
        where('isActive', '==', true)
      );
      unsubscribers.push(onSnapshot(studentsQuery, snapshot => {
        const allStudents = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        const birthdays = allStudents
          .map(person => {
            const nextBirthday = getNextBirthday(person.birthDate, today);
            return nextBirthday ? { ...person, nextBirthday } : null;
          })
          .filter(person => person && person.nextBirthday >= today && person.nextBirthday <= nextWeek)
          .sort((a, b) => a.nextBirthday - b.nextBirthday);
        setStudentBirthdays(birthdays);
        setUngroupedCount(
          allStudents.filter(person =>
            !person.groupMorning && !person.groupAfternoon && !person.daiMorning && !person.daiAfternoon
          ).length
        );
      }, error => console.error('No se pudieron cargar los cumpleaños de estudiantes:', error)));
    } else {
      setStudentBirthdays([]);
      setUngroupedCount(0);
    }

    if (canUseModule('personal')) {
      const staffQuery = query(collection(db, 'artifacts', appId, 'public', 'data', 'staff_records'));
      unsubscribers.push(onSnapshot(staffQuery, snapshot => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const nextWeek = new Date(today);
        nextWeek.setDate(today.getDate() + 7);
        const birthdays = snapshot.docs
          .map(item => {
            const person = { id: item.id, ...item.data() };
            const nextBirthday = getNextBirthday(person.birthDate, today);
            return nextBirthday ? { ...person, nextBirthday } : null;
          })
          .filter(person => person && person.nextBirthday >= today && person.nextBirthday <= nextWeek)
          .sort((a, b) => a.nextBirthday - b.nextBirthday);
        setStaffBirthdays(birthdays);
      }, error => console.error('No se pudieron cargar los cumpleaños del personal:', error)));
    } else {
      setStaffBirthdays([]);
    }

    if (canUseModule('calendar')) {
      const settingsQuery = query(collection(db, 'artifacts', appId, 'public', 'data', 'settings'));
      unsubscribers.push(onSnapshot(settingsQuery, snapshot => {
        const countdownDocument = snapshot.docs.find(item => item.data().title || item.data().date);
        if (!countdownDocument) {
          setCountdownDocId(null);
          setCountdown({ title: '', date: '', daysLeft: 0 });
          return;
        }
        const data = countdownDocument.data();
        setCountdownDocId(countdownDocument.id);
        setCountdown({
          title: data.title || '',
          date: data.date || '',
          daysLeft: calculateBusinessDaysLeft(data.date, holidays),
        });
      }, error => console.error('No se pudo cargar la próxima fecha:', error)));
    }

    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  }, [db, appId, user?.id, canUseModule, holidays]);

  const handlePost = async event => {
    event.preventDefault();
    if (!db || !appId) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    const message = String(formData.get('message') || '').trim();
    if (!message) return;

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), {
        message,
        author: user?.fullName || user?.firstName || 'Equipo institucional',
        authorId: user?.id,
        channel: formData.get('channel') || 'general',
        showDate: formData.get('showDate') || todayStr,
        showTime: formData.get('showTime') || '00:00',
        createdAt: serverTimestamp(),
      });
      setShowAnnounceModal(false);
      setNoticeMessage('El aviso se publicó correctamente.');
    } catch (error) {
      console.error('No se pudo publicar el aviso:', error);
      alert(`No se pudo publicar el aviso. ${error?.message || 'Intentá nuevamente.'}`);
    }
  };

  const deleteAnnouncement = async id => {
    if (!db || !appId || !id) return;
    if (!window.confirm('¿Querés eliminar este aviso de la cartelera?')) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'announcements', id));
    } catch (error) {
      console.error('No se pudo eliminar el aviso:', error);
      alert(`No se pudo eliminar el aviso. ${error?.message || ''}`);
    }
  };

  const saveNote = async event => {
    event.preventDefault();
    const text = newNote.trim();
    if (!text || !db || !appId || !user?.id) return;
    setSavingNote(true);
    setNoteError('');
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notes'), {
        text,
        userId: user.id,
        done: false,
        createdAt: serverTimestamp(),
      });
      setNewNote('');
    } catch (error) {
      console.error('No se pudo guardar la nota:', error);
      setNoteError('No pudimos guardar la nota. Revisá tu conexión e intentá de nuevo.');
    } finally {
      setSavingNote(false);
    }
  };

  const toggleNote = async note => {
    if (!db || !appId || !note?.id) return;
    try {
      await updateDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'notes', note.id),
        { done: !note.done }
      );
      setNoteError('');
    } catch (error) {
      console.error('No se pudo actualizar la nota:', error);
      setNoteError('No pudimos actualizar la nota. Intentá nuevamente.');
    }
  };

  const deleteNote = async id => {
    if (!db || !appId || !id) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', id));
      setNoteError('');
    } catch (error) {
      console.error('No se pudo eliminar la nota:', error);
      setNoteError('No pudimos eliminar la nota. Intentá nuevamente.');
    }
  };

  const handleSaveCountdown = async event => {
    event?.preventDefault?.();
    if (!db || !appId || !newCountdownTitle.trim() || !newCountdownDate) return;
    setSavingCountdown(true);
    try {
      const payload = { title: newCountdownTitle.trim(), date: newCountdownDate };
      if (countdownDocId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', countdownDocId), payload);
      } else {
        const created = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'settings'), payload);
        setCountdownDocId(created.id);
      }
      setCountdown({
        ...payload,
        daysLeft: calculateBusinessDaysLeft(newCountdownDate, holidays),
      });
      setIsEditingCountdown(false);
    } catch (error) {
      console.error('No se pudo guardar la próxima fecha:', error);
      alert(`No se pudo guardar la próxima fecha. ${error?.message || ''}`);
    } finally {
      setSavingCountdown(false);
    }
  };

  const openBirthdayModal = type => {
    setBirthdayModalType(type);
    setShowBirthdayModal(true);
  };

  const primaryButtonStyle = { backgroundColor: primaryColor };
  const secondaryButtonStyle = { backgroundColor: secondaryColor };

  return (
    <main className="mx-auto h-full w-full max-w-7xl overflow-y-auto pb-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      <div className="space-y-3 px-1 sm:px-2">
        {/* ENCABEZADO */}
        <section
          className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
          style={{ borderColor: `${primaryColor}30` }}
        >
          <div
            className="absolute -right-12 -top-16 h-48 w-48 rounded-full opacity-[0.08]"
            style={{ backgroundColor: primaryColor }}
            aria-hidden="true"
          />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              {logoUrl ? (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-white p-1.5 sm:h-12 sm:w-12">
                  <img src={logoUrl} alt={`Logo de ${institutionName}`} className="h-full w-full object-contain" />
                </div>
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm sm:h-12 sm:w-12" style={primaryButtonStyle}>
                  <GraduationCap size={22} aria-hidden="true" />
                </div>
              )}
              <div className="min-w-0">
                <p className="mb-1 text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: primaryColor }}>
                  {institutionName}
                </p>
                <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                  ¡Hola, {user?.firstName || user?.fullName?.split(' ')[0] || 'bienvenido'}!
                </h1>
                <p className="mt-0.5 text-xs text-slate-500">Tu espacio de trabajo institucional.</p>
                <p className="mt-1 text-[11px] font-semibold capitalize text-slate-400">{todayLabel}</p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowTutorial(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                <HelpCircle size={16} aria-hidden="true" />
                Ayuda
              </button>
              {canPost && canUseModule('notifications') && (
                <button
                  type="button"
                  onClick={() => setShowAnnounceModal(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-offset-2"
                  style={primaryButtonStyle}
                >
                  <Megaphone size={16} aria-hidden="true" />
                  Nuevo aviso
                </button>
              )}
            </div>
          </div>
        </section>

        {/* CUENTA REGRESIVA + AVISOS: en dos columnas cuando hay espacio */}
        <div className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-2">
        {/* CUENTA REGRESIVA: visible al ingresar */}
        {canUseModule('calendar') && (countdown.date || isManagement) && (
          <section className="h-full rounded-2xl border bg-white px-3 py-3 shadow-sm sm:px-4" style={{ borderColor: `${primaryColor}55` }}>
            {isEditingCountdown ? (
              <form onSubmit={handleSaveCountdown} className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[minmax(0,1fr)_190px_auto]">
                <label className="text-[11px] font-bold text-slate-600">
                  Nombre de la próxima fecha
                  <input
                    type="text"
                    value={newCountdownTitle}
                    onChange={event => setNewCountdownTitle(event.target.value)}
                    placeholder="Ej.: Receso de invierno"
                    required
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-slate-400"
                  />
                </label>
                <label className="text-[11px] font-bold text-slate-600">
                  Fecha
                  <input
                    type="date"
                    value={newCountdownDate}
                    onChange={event => setNewCountdownDate(event.target.value)}
                    required
                    className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-700 outline-none focus:border-slate-400"
                  />
                </label>
                <div className="flex gap-2">
                  <button type="submit" disabled={savingCountdown} className="flex-1 rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-60" style={primaryButtonStyle}>{savingCountdown ? 'Guardando…' : 'Guardar'}</button>
                  <button type="button" onClick={() => setIsEditingCountdown(false)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl text-white" style={primaryButtonStyle}>
                    {countdown.date ? (
                      <>
                        <span className={`${countdown.date === todayStr ? 'text-sm' : 'text-xl'} font-black leading-none`}>{countdown.date === todayStr ? 'HOY' : countdown.date < todayStr ? '✓' : countdown.daysLeft}</span>
                        <span className="mt-0.5 text-[8px] font-bold uppercase">{countdown.date === todayStr ? 'Fecha' : countdown.date < todayStr ? 'Cumplida' : countdown.daysLeft === 1 ? 'Día hábil' : 'Días hábiles'}</span>
                      </>
                    ) : (
                      <CalendarCheck2 size={21} aria-hidden="true" />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.14em]" style={{ color: primaryColor }}>Cuenta regresiva · próxima fecha</p>
                    <p className="mt-0.5 break-words text-sm font-extrabold text-slate-800">
                      {countdown.title || 'Todavía no hay una fecha configurada'}
                    </p>
                    {countdown.date ? (
                      <p className="mt-0.5 text-xs font-medium text-slate-500">
                        {countdown.date === todayStr ? '¡Es hoy!' : countdown.date < todayStr ? `Fecha: ${formatDate(countdown.date, { day: 'numeric', month: 'long', year: 'numeric' })}` : `Faltan ${countdown.daysLeft} día${countdown.daysLeft === 1 ? '' : 's'} hábil${countdown.daysLeft === 1 ? '' : 'es'} · ${formatDate(countdown.date, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}`}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-xs text-slate-500">Configurá una fecha para verla acá cada vez que ingreses.</p>
                    )}
                  </div>
                </div>
                {isManagement && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewCountdownTitle(countdown.title || '');
                      setNewCountdownDate(countdown.date || '');
                      setIsEditingCountdown(true);
                    }}
                    className="shrink-0 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                    title={countdown.date ? 'Editar próxima fecha' : 'Configurar próxima fecha'}
                  ><Pencil size={13} className="mr-1 inline" />{countdown.date ? 'Editar' : 'Configurar'}</button>
                )}
              </div>
            )}
          </section>
        )}

        {/* AVISOS INSTITUCIONALES: destacados al ingresar */}
        {canUseModule('notifications') && (
          <section className="h-full rounded-2xl border border-amber-300 bg-amber-50/80 p-3 shadow-sm sm:p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-200 text-amber-950"><Bell size={17} aria-hidden="true" /></span>
                <div>
                  <h2 className="text-sm font-black text-amber-950">Avisos institucionales</h2>
                  <p className="text-[11px] text-amber-900">Información importante para tu equipo.</p>
                </div>
                {visibleAnnouncements.length > 0 && (
                  <span className="ml-1 rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-extrabold text-amber-950">{visibleAnnouncements.length}</span>
                )}
              </div>
              {canPost && (
                <button
                  type="button"
                  onClick={() => setShowAnnounceModal(true)}
                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-amber-950 transition hover:bg-amber-100"
                ><Plus size={13} /> Publicar aviso</button>
              )}
            </div>
            {visibleAnnouncements.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-white/80 px-3 py-2.5">
                <p className="text-xs font-bold text-slate-700">No hay avisos publicados para vos.</p>
                <p className="mt-0.5 text-[11px] text-slate-500">Los avisos dirigidos a tu equipo van a aparecer acá.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 xl:grid-cols-2">
                {visibleAnnouncements.map(announcement => (
                  <article key={announcement.id} className="flex min-w-0 items-start gap-2.5 rounded-xl border border-amber-200 bg-white px-3 py-2.5">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-900"><Megaphone size={14} aria-hidden="true" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-pre-wrap break-words text-xs font-semibold leading-relaxed text-slate-800">{announcement.message}</p>
                      <p className="mt-1.5 text-[10px] font-bold text-slate-500">Publicado por {announcement.author || 'Equipo institucional'}</p>
                    </div>
                    {(canPost || announcement.authorId === user?.id) && (
                      <button
                        type="button"
                        onClick={() => deleteAnnouncement(announcement.id)}
                        className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-200"
                        title="Eliminar aviso"
                        aria-label="Eliminar aviso"
                      ><Trash2 size={13} /></button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        </div>

        {/* RESUMEN RÁPIDO */}
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {canUseModule('tasks') && (
            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className="group rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700"><CheckSquare size={16} /></span>
                <ArrowUpRight size={17} className="text-slate-300 transition group-hover:text-slate-600" />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900">{myPendingTasks.length}</p>
              <p className="mt-0.5 text-xs font-bold text-slate-700">Tareas pendientes</p>
              <p className="mt-0.5 text-[10px] leading-snug text-slate-500">{myPendingTasks.length === 1 ? 'Una tarea para revisar' : 'Pendientes asignados o creados por vos'}</p>
            </button>
          )}
          {canUseModule('calendar') && (
            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className="group rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={primaryButtonStyle}><CalendarDays size={16} /></span>
                <ArrowUpRight size={17} className="text-slate-300 transition group-hover:text-slate-600" />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900">{todayEvents.length}</p>
              <p className="mt-0.5 text-xs font-bold text-slate-700">{todayEvents.length === 1 ? 'Evento para hoy' : 'Eventos para hoy'}</p>
              <p className="mt-1 truncate text-xs text-slate-500">{todayEvents[0]?.title || 'Consultá las próximas fechas en Agenda'}</p>
            </button>
          )}
          {canUseModule('matricula') && (
            <button
              type="button"
              onClick={() => openBirthdayModal('students')}
              className="group rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-50 text-pink-600"><Cake size={16} /></span>
                <ArrowUpRight size={17} className="text-slate-300 transition group-hover:text-slate-600" />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900">{studentBirthdays.length}</p>
              <p className="mt-0.5 text-xs font-bold text-slate-700">Cumpleaños de estudiantes</p>
              <p className="mt-0.5 text-[10px] leading-snug text-slate-500">En los próximos 7 días</p>
            </button>
          )}
          {canUseModule('personal') && (
            <button
              type="button"
              onClick={() => openBirthdayModal('staff')}
              className="group rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><UserRound size={16} /></span>
                <ArrowUpRight size={17} className="text-slate-300 transition group-hover:text-slate-600" />
              </div>
              <p className="mt-2 text-2xl font-black text-slate-900">{staffBirthdays.length}</p>
              <p className="mt-0.5 text-xs font-bold text-slate-700">Cumpleaños del equipo</p>
              <p className="mt-0.5 text-[10px] leading-snug text-slate-500">En los próximos 7 días</p>
            </button>
          )}
        </section>

        {/* ALERTA DE ORGANIZACIÓN */}
        {isManagement && canUseModule('matricula') && ungroupedCount > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('matricula')}
            className="flex w-full items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-left transition hover:bg-amber-100/70 focus:outline-none focus:ring-2 focus:ring-amber-300"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-amber-700"><Users size={18} /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-amber-950">Hay personas sin grupo asignado</span>
              <span className="mt-1 block text-xs leading-relaxed text-amber-900">{ungroupedCount} legajo{ungroupedCount === 1 ? '' : 's'} sin grupo o referente cargado. Revisá la organización desde Legajos.</span>
            </span>
            <ChevronRight size={18} className="mt-1 shrink-0 text-amber-700" />
          </button>
        )}

        {/* TAREAS Y AGENDA */}
        {(canUseModule('tasks') || canUseModule('calendar')) && (
          <section className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {canUseModule('tasks') && (
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                <SectionHeading
                  icon={ListTodo}
                  title="Mis tareas pendientes"
                  subtitle="Un vistazo rápido a lo que queda por resolver."
                  action={<button type="button" onClick={() => setActiveTab('tasks')} className="text-xs font-bold hover:underline" style={{ color: primaryColor }}>Ver tareas</button>}
                />
                {myPendingTasks.length === 0 ? (
                  <EmptyState title="¡Todo al día!" description="No aparecen tareas pendientes asignadas a vos por ahora." />
                ) : (
                  <div className="space-y-2">
                    {myPendingTasks.slice(0, 4).map(task => {
                      const taskTitle = task.title || task.name || task.description || task.text || 'Tarea sin título';
                      const dueDate = task.dueDate || task.date;
                      return (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => setActiveTab('tasks')}
                          className="flex w-full items-start gap-3 rounded-lg border border-slate-100 p-2.5 text-left transition hover:border-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                        >
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-amber-300 text-amber-700"><Clock3 size={11} /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block break-words text-xs font-semibold text-slate-700">{taskTitle}</span>
                            {dueDate && <span className="mt-0.5 block text-[10px] text-slate-400">Fecha: {formatDate(dueDate)}</span>}
                          </span>
                          <ChevronRight size={16} className="mt-0.5 shrink-0 text-slate-300" />
                        </button>
                      );
                    })}
                    {myPendingTasks.length > 4 && <p className="pt-1 text-center text-xs text-slate-400">Y {myPendingTasks.length - 4} tarea{myPendingTasks.length - 4 === 1 ? '' : 's'} más.</p>}
                  </div>
                )}
              </div>
            )}

            {canUseModule('calendar') && (
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                <SectionHeading
                  icon={CalendarDays}
                  title="Próximas fechas"
                  subtitle="Actividades y eventos de la institución."
                  action={<button type="button" onClick={() => setActiveTab('calendar')} className="text-xs font-bold hover:underline" style={{ color: primaryColor }}>Abrir agenda</button>}
                />
                {upcomingEvents.length === 0 ? (
                  <EmptyState title="La agenda está despejada" description="Cuando se carguen actividades, vas a poder verlas desde acá." />
                ) : (
                  <div className="space-y-2">
                    {upcomingEvents.map(event => {
                      const isToday = event.date === todayStr;
                      return (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => setActiveTab('calendar')}
                          className="flex w-full items-center gap-3 rounded-lg border border-slate-100 p-2.5 text-left transition hover:border-slate-200 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
                        >
                          <span className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg text-center" style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}>
                            <span className="text-[10px] font-extrabold uppercase">{formatDate(event.date, { month: 'short' }).replace('.', '')}</span>
                            <span className="text-base font-black leading-none">{formatDate(event.date, { day: 'numeric' })}</span>
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-xs font-bold text-slate-700">{event.title || event.name || 'Actividad institucional'}</span>
                            <span className="mt-0.5 block text-[10px] text-slate-400">{isToday ? 'Hoy' : formatDate(event.date, { weekday: 'short', day: 'numeric', month: 'long' })}{(event.time || event.startTime) ? ` · ${event.time || event.startTime}` : ''}</span>
                          </span>
                          <ChevronRight size={16} className="shrink-0 text-slate-300" />
                        </button>
                      );
                    })}
                  </div>
                )}

              </div>
            )}
          </section>
        )}

        {/* NOTAS PERSONALES */}
        {canUseModule('tasks') && (
          <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
            <SectionHeading
              icon={LockKeyhole}
              title="Mis notas"
              subtitle="Un espacio personal para recordar pendientes pequeños. Solo vos ves las notas asociadas a tu usuario."
            />
            <form onSubmit={saveNote} className="flex flex-col gap-2 sm:flex-row">
              <input
                value={newNote}
                onChange={event => setNewNote(event.target.value)}
                placeholder="Escribí una nota o recordatorio…"
                maxLength={500}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
                aria-label="Nueva nota personal"
              />
              <button
                type="submit"
                disabled={!newNote.trim() || savingNote}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-xs font-bold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
                style={primaryButtonStyle}
              >
                <Plus size={17} /> {savingNote ? 'Guardando…' : 'Agregar nota'}
              </button>
            </form>
            {noteError && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{noteError}</p>}
            {noticeMessage && (
              <div className="mt-3 flex items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                <span>{noticeMessage}</span>
                <button type="button" onClick={() => setNoticeMessage('')} aria-label="Cerrar mensaje" className="rounded p-1 hover:bg-emerald-100"><X size={13} /></button>
              </div>
            )}
            {notes.length === 0 ? (
              <div className="mt-4"><EmptyState title="Todavía no tenés notas" description="Agregá una arriba para tener a mano una idea, un pendiente o algo para recordar." /></div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
                {notes.map(note => (
                  <div key={note.id} className="group flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 p-3 transition hover:border-slate-300">
                    <button
                      type="button"
                      onClick={() => toggleNote(note)}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition ${note.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-slate-500'}`}
                      title={note.done ? 'Marcar como pendiente' : 'Marcar como realizada'}
                      aria-label={note.done ? 'Marcar nota como pendiente' : 'Marcar nota como realizada'}
                    >{note.done && <Check size={12} />}</button>
                    <span className={`min-w-0 flex-1 break-words text-xs leading-relaxed ${note.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{note.text}</span>
                    <button
                      type="button"
                      onClick={() => deleteNote(note.id)}
                      className="shrink-0 rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-200"
                      title="Eliminar nota"
                      aria-label="Eliminar nota"
                    ><Trash2 size={14} /></button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* MODAL DE CUMPLEAÑOS */}
      {showBirthdayModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) setShowBirthdayModal(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="birthday-modal-title" className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Próximos 7 días</p>
                <h2 id="birthday-modal-title" className="mt-1 text-xl font-black text-slate-900">{birthdayModalType === 'students' ? 'Cumpleaños de estudiantes' : 'Cumpleaños del equipo'}</h2>
              </div>
              <button type="button" onClick={() => setShowBirthdayModal(false)} aria-label="Cerrar" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={19} /></button>
            </div>
            <div className="space-y-2 overflow-y-auto p-4">
              {(birthdayModalType === 'students' ? studentBirthdays : staffBirthdays).length === 0 ? (
                <EmptyState title="No hay cumpleaños próximos" description="Cuando haya alguno dentro de los próximos siete días, lo vas a ver acá." />
              ) : (birthdayModalType === 'students' ? studentBirthdays : staffBirthdays).map(person => (
                <div key={person.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-pink-100 text-sm font-black text-pink-700">{(person.firstName || person.fullName || person.name || '?').charAt(0).toUpperCase()}</div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800">{[person.firstName || person.fullName || person.name, person.lastName].filter(Boolean).join(' ')}</p>
                    <p className="mt-0.5 text-xs font-semibold capitalize text-slate-500">{formatDate(person.nextBirthday, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  </div>
                  <Cake size={17} className="shrink-0 text-pink-500" aria-hidden="true" />
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 p-4">
              <button type="button" onClick={() => setShowBirthdayModal(false)} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50">Cerrar</button>
            </div>
          </section>
        </div>
      )}

      {/* MODAL PARA PUBLICAR AVISOS */}
      {showAnnounceModal && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) setShowAnnounceModal(false); }}>
          <form onSubmit={handlePost} className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 p-5 sm:p-6" style={{ borderBottom: `1px solid ${primaryColor}20` }}>
              <div>
                <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: primaryColor }}>Cartelera</p>
                <h2 className="mt-1 text-xl font-black text-slate-900">Publicar un aviso</h2>
                <p className="mt-1 text-sm text-slate-500">El mensaje aparecerá cuando llegue la fecha y hora elegidas.</p>
              </div>
              <button type="button" onClick={() => setShowAnnounceModal(false)} aria-label="Cerrar" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={19} /></button>
            </div>
            <div className="space-y-4 p-5 sm:p-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-600">Fecha de publicación
                  <input type="date" name="showDate" defaultValue={todayStr} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-700 outline-none focus:border-slate-400" />
                </label>
                <label className="text-xs font-bold text-slate-600">Hora
                  <input type="time" name="showTime" defaultValue="08:00" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-700 outline-none focus:border-slate-400" />
                </label>
              </div>
              <label className="block text-xs font-bold text-slate-600">Destinatarios
                <select name="channel" defaultValue="general" className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-700 outline-none focus:border-slate-400">
                  <option value="general">Todo el personal</option>
                  <option value="sede">Solo sede</option>
                  <option value="inclusion">Solo inclusión</option>
                </select>
              </label>
              <label className="block text-xs font-bold text-slate-600">Mensaje
                <textarea name="message" required maxLength={1200} rows={5} placeholder="Escribí el aviso con la información que el equipo necesita saber…" className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-normal leading-relaxed text-slate-700 outline-none focus:border-slate-400" />
              </label>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 p-5 sm:flex-row sm:justify-end sm:px-6">
              <button type="button" onClick={() => setShowAnnounceModal(false)} className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
              <button type="submit" className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white transition hover:brightness-95" style={secondaryButtonStyle}><Megaphone size={16} /> Publicar aviso</button>
            </div>
          </form>
        </div>
      )}

      {/* TUTORIAL BREVE */}
      {showTutorial && (
        <div className="fixed inset-0 z-[9997] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) setShowTutorial(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="tutorial-title" className="flex max-h-[84vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3 sm:px-5">
              <div className="flex items-start gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg text-white" style={primaryButtonStyle}><HelpCircle size={17} /></span>
                <div>
                  <h2 id="tutorial-title" className="text-base font-black text-slate-900">Guía rápida de CENTRA</h2>
                  <p className="mt-0.5 text-xs text-slate-500">Elegí una sección para saber para qué sirve y qué podés hacer.</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowTutorial(false)} aria-label="Cerrar ayuda" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={17} /></button>
            </div>
            <div className="flex gap-1.5 overflow-x-auto border-b border-slate-100 px-3 py-2 sm:px-4">
              {[
                ['inicio', 'Inicio'],
                ['avisos', 'Avisos'],
                ['legajos', 'Legajos'],
                ['aula', 'Mi Aula'],
                ['tareas', 'Tareas'],
                ['agenda', 'Agenda'],
                ['recursos', 'Recursos'],
              ].map(([id, label]) => (
                <button key={id} type="button" onClick={() => setTutorialTab(id)} className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${tutorialTab === id ? 'text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} style={tutorialTab === id ? primaryButtonStyle : undefined}>{label}</button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4 sm:p-5">
              {tutorialTab === 'inicio' && (
                <div className="space-y-3">
                  <div className="rounded-xl border p-3" style={{ borderColor: `${primaryColor}40`, backgroundColor: `${primaryColor}0A` }}>
                    <h3 className="text-sm font-extrabold text-slate-800">Empezá por este resumen</h3>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">Al ingresar, revisá la cuenta regresiva y los avisos. Debajo vas a ver un resumen de tareas, actividades de hoy y cumpleaños próximos.</p>
                  </div>
                  <ol className="space-y-2 text-xs leading-relaxed text-slate-700">
                    <li className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 font-black">1</span><span><strong>Leé los avisos.</strong> Ahí aparece la información compartida para tu equipo.</span></li>
                    <li className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 font-black">2</span><span><strong>Revisá tus pendientes.</strong> Entrá a Tareas para ver o completar el trabajo asignado.</span></li>
                    <li className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 font-black">3</span><span><strong>Usá el menú principal</strong> para ingresar a cada módulo. Las opciones disponibles dependen de tu rol y de la configuración institucional.</span></li>
                  </ol>
                </div>
              )}
              {tutorialTab === 'avisos' && (
                <div className="space-y-2">
                  <h3 className="text-sm font-extrabold text-slate-800">Avisos institucionales</h3>
                  <p className="text-xs leading-relaxed text-slate-600">Leé esta sección cada vez que ingreses. Los mensajes están dirigidos a todo el personal, a la sede o al equipo de inclusión, según lo que haya elegido quien los publicó.</p>
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950"><strong>Para publicar:</strong> si tenés permiso, tocá «Publicar aviso», escribí el mensaje, seleccioná a quiénes está dirigido y elegí cuándo debe aparecer.</div>
                  <p className="text-xs leading-relaxed text-slate-600">Los avisos programados aparecen al llegar la fecha y la hora elegidas.</p>
                </div>
              )}
              {tutorialTab === 'legajos' && (
                <div className="space-y-2">
                  <h3 className="text-sm font-extrabold text-slate-800">Legajos</h3>
                  <p className="text-xs leading-relaxed text-slate-600">Reúne las fichas de estudiantes y otras personas registradas, según los módulos habilitados en tu institución.</p>
                  <p className="text-xs leading-relaxed text-slate-600">Usá el buscador para encontrar una persona y abrí su ficha para consultar o actualizar los datos que tengas permitidos.</p>
                </div>
              )}
              {tutorialTab === 'aula' && (
                <div className="space-y-2">
                  <h3 className="text-sm font-extrabold text-slate-800">Mi Aula</h3>
                  <p className="text-xs leading-relaxed text-slate-600">Sirve para organizar grupos e integrantes, consultar la conformación de cada grupo y acceder a las herramientas de seguimiento disponibles.</p>
                  <p className="text-xs leading-relaxed text-slate-600">Si una persona no aparece donde esperás, revisá su asignación desde las opciones habilitadas para tu rol.</p>
                </div>
              )}
              {tutorialTab === 'tareas' && (
                <div className="space-y-2">
                  <h3 className="text-sm font-extrabold text-slate-800">Tareas</h3>
                  <p className="text-xs leading-relaxed text-slate-600">Consultá las tareas asignadas a vos o creadas por vos, revisá las fechas y marcá como realizadas las que ya resolviste.</p>
                  <p className="text-xs leading-relaxed text-slate-600">En Inicio también podés guardar notas personales. Esas notas están asociadas a tu usuario.</p>
                </div>
              )}
              {tutorialTab === 'agenda' && (
                <div className="space-y-2">
                  <h3 className="text-sm font-extrabold text-slate-800">Agenda</h3>
                  <p className="text-xs leading-relaxed text-slate-600">Revisá eventos, actividades y fechas institucionales. En Inicio aparecen los próximos eventos y la cuenta regresiva configurada.</p>
                  <p className="text-xs leading-relaxed text-slate-600">Si tenés permisos de gestión, podés configurar o editar la próxima fecha desde la cuenta regresiva.</p>
                </div>
              )}
              {tutorialTab === 'recursos' && (
                <div className="space-y-2">
                  <h3 className="text-sm font-extrabold text-slate-800">Recursos</h3>
                  <p className="text-xs leading-relaxed text-slate-600">Usá este espacio para encontrar materiales, documentos, carpetas y enlaces de consulta compartidos por la institución.</p>
                  <p className="text-xs leading-relaxed text-slate-600">La disponibilidad de las opciones para crear o editar recursos depende de tus permisos.</p>
                </div>
              )}
            </div>
            <div className="border-t border-slate-100 px-4 py-3 sm:px-5">
              <button type="button" onClick={() => setShowTutorial(false)} className="w-full rounded-lg px-4 py-2.5 text-xs font-bold text-white transition hover:brightness-95" style={primaryButtonStyle}>Cerrar guía</button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
