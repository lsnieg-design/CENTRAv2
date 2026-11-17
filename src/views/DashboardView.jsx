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
import { useStudents, useStaff } from '../data/hooks';
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

const SectionHeading = ({ icon: Icon, title, badge, action, primaryColor }) => (
  <div className="flex items-center justify-between gap-2 mb-3">
    <div className="flex items-center gap-2 min-w-0">
      {Icon && (
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={primaryColor ? { backgroundColor: `${primaryColor}12`, color: primaryColor } : undefined}
        >
          <Icon size={15} aria-hidden="true" />
        </div>
      )}
      <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 truncate">{title}</h3>
      {badge !== undefined && badge > 0 && (
        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-extrabold text-slate-600">
          {badge}
        </span>
      )}
    </div>
    {action}
  </div>
);

const EmptyState = ({ title, description }) => (
  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-5 text-center">
    <p className="text-xs font-bold text-slate-700">{title}</p>
    {description && <p className="text-[11px] leading-relaxed text-slate-500 mt-1">{description}</p>}
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
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [birthdayModalType, setBirthdayModalType] = useState('students');
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
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

  const { students: activeStudents } = useStudents(
    canUseModule('matricula') ? db : null,
    appId,
    { activeOnly: true }
  );

  const { staff: activeStaff } = useStaff(
    canUseModule('personal') ? db : null,
    appId,
    { activeOnly: true }
  );

  const studentBirthdays = useMemo(() => {
    if (!canUseModule('matricula')) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    return activeStudents
      .map(person => {
        const nextBirthday = getNextBirthday(person.birthDate, today);
        return nextBirthday ? { ...person, nextBirthday } : null;
      })
      .filter(person => person && person.nextBirthday >= today && person.nextBirthday <= nextWeek)
      .sort((a, b) => a.nextBirthday - b.nextBirthday);
  }, [activeStudents, canUseModule]);

  const ungroupedCount = useMemo(() => {
    if (!canUseModule('matricula')) return 0;
    return activeStudents.filter(person => {
      const hasNewAssignment =
        Array.isArray(person.groupAssignments) &&
        person.groupAssignments.some(a => a.status === 'active' && !a.validTo);
      const hasLegacyGroup =
        Boolean(person.groupMorning || person.groupAfternoon || person.daiMorning || person.daiAfternoon);
      return !hasNewAssignment && !hasLegacyGroup;
    }).length;
  }, [activeStudents, canUseModule]);

  const staffBirthdays = useMemo(() => {
    if (!canUseModule('personal')) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    return activeStaff
      .map(person => {
        const nextBirthday = getNextBirthday(person.birthDate, today);
        return nextBirthday ? { ...person, nextBirthday } : null;
      })
      .filter(person => person && person.nextBirthday >= today && person.nextBirthday <= nextWeek)
      .sort((a, b) => a.nextBirthday - b.nextBirthday);
  }, [activeStaff, canUseModule]);

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
  }, [announcements, user?.id, isSuperAdmin, isInclusionStaff, isSedeStaff, canUseModule]);

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
        const targetUserIds = Array.isArray(task.targetUserIds) ? task.targetUserIds : [];
        return (
          isSuperAdmin ||
          task.createdById === user?.id ||
          task.targetUserId === user?.id ||
          targetUserIds.includes(user?.id) ||
          targetRoles.some(targetRole => String(targetRole).toLowerCase() === String(role).toLowerCase())
        );
      })
      .sort((a, b) => {
        const aDate = String(a.dueDate || a.date || '9999-12-31');
        const bDate = String(b.dueDate || b.date || '9999-12-31');
        return aDate.localeCompare(bDate);
      });
  }, [tasks, user?.id, isSuperAdmin, role, canUseModule]);

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
        setNoteError('No pudimos cargar tus notas.');
      }));
    } else {
      setNotes([]);
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
      setNoticeMessage('Aviso publicado.');
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
      setNoteError('No pudimos guardar la nota.');
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
      setNoteError('No pudimos actualizar la nota.');
    }
  };

  const deleteNote = async id => {
    if (!db || !appId || !id) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', id));
      setNoteError('');
    } catch (error) {
      console.error('No se pudo eliminar la nota:', error);
      setNoteError('No pudimos eliminar la nota.');
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
  const showCountdown = canUseModule('calendar') && Boolean(countdown.date || isManagement);
  const showAnnouncements = canUseModule('notifications');
  const showActivityColumn = canUseModule('tasks') || canUseModule('calendar');
  const showNotesColumn = canUseModule('tasks');
  const dashboardColumnCount = [showAnnouncements, showActivityColumn, showNotesColumn].filter(Boolean).length;
  const dashboardColumnClass = dashboardColumnCount === 3 ? 'xl:col-span-4' : dashboardColumnCount === 2 ? 'xl:col-span-6' : 'xl:col-span-12';
  const announcementColumnClass = dashboardColumnCount === 3 ? 'xl:col-span-5' : dashboardColumnCount === 2 ? 'xl:col-span-6' : 'xl:col-span-12';
  const activityColumnClass = dashboardColumnCount === 3 ? 'xl:col-span-4' : dashboardColumnClass;
  const notesColumnClass = dashboardColumnCount === 3 ? 'xl:col-span-3' : dashboardColumnClass;

  return (
    <main className="mx-auto min-h-full w-full max-w-[1560px] rounded-[30px] bg-white/20 px-3 pb-8 pt-3 sm:px-4 lg:px-6">
      <div className="space-y-4">

        {/* BARRA SUPERIOR COMPACTA: Saludo + Cuenta regresiva + Acciones */}
        <section
          className="rounded-[26px] border bg-white px-4 py-4 shadow-sm sm:px-5"
          style={{ borderColor: `${primaryColor}28` }}
        >
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            {/* Identidad y saludo */}
            <div className="flex items-center gap-2.5 min-w-0">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={institutionName}
                  className="h-11 w-11 shrink-0 rounded-2xl border border-slate-100 bg-white p-1.5 object-contain"
                />
              ) : (
                <div
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-white"
                  style={primaryButtonStyle}
                >
                  <GraduationCap size={18} aria-hidden="true" />
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="truncate text-lg font-black text-slate-900 sm:text-xl">
                    ¡Hola, {user?.firstName || user?.fullName?.split(' ')[0] || 'bienvenido'}!
                  </h1>
                  <span className="hidden rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold capitalize text-slate-500 sm:inline-block">
                    {todayLabel}
                  </span>
                </div>
                <p className="truncate text-[10px] font-bold uppercase tracking-wider" style={{ color: primaryColor }}>
                  {institutionName}
                </p>
              </div>
            </div>

            {/* Cuenta regresiva integrada en pastilla + Botones chicos */}
            <div className="flex flex-wrap items-center gap-1.5 ml-auto">
              {showCountdown && !isEditingCountdown && (
                <div
                  className="flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs"
                  style={{
                    borderColor: `${primaryColor}30`,
                    backgroundColor: `${primaryColor}08`,
                  }}
                >
                  <span
                    className="flex h-6 min-w-6 items-center justify-center rounded-lg px-1.5 text-[11px] font-black text-white"
                    style={primaryButtonStyle}
                  >
                    {countdown.date
                      ? countdown.date === todayStr
                        ? 'HOY'
                        : countdown.date < todayStr
                        ? '✓'
                        : `${countdown.daysLeft}d`
                      : '—'}
                  </span>
                  <div className="min-w-0 max-w-[160px] sm:max-w-[220px]">
                    <p className="truncate text-[11px] font-extrabold text-slate-800 leading-tight">
                      {countdown.title || 'Próxima fecha'}
                    </p>
                    {countdown.date && (
                      <p className="truncate text-[9px] font-semibold text-slate-500 leading-tight">
                        {countdown.date === todayStr
                          ? '¡Es hoy!'
                          : `${countdown.daysLeft} día${countdown.daysLeft === 1 ? '' : 's'} hábil${countdown.daysLeft === 1 ? '' : 'es'} · ${formatDate(countdown.date, { day: '2-digit', month: '2-digit' })}`}
                      </p>
                    )}
                  </div>
                  {isManagement && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewCountdownTitle(countdown.title || '');
                        setNewCountdownDate(countdown.date || '');
                        setIsEditingCountdown(true);
                      }}
                      className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700"
                      title="Configurar próxima fecha"
                    >
                      <Pencil size={12} />
                    </button>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowTutorial(true)}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-600 transition hover:bg-slate-50"
              >
                <HelpCircle size={13} />
                <span className="hidden sm:inline">Ayuda</span>
              </button>

              {canPost && canUseModule('notifications') && (
                <button
                  type="button"
                  onClick={() => setShowAnnounceModal(true)}
                  className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-[11px] font-bold text-white shadow-sm transition hover:brightness-95"
                  style={primaryButtonStyle}
                >
                  <Megaphone size={13} />
                  <span>Aviso</span>
                </button>
              )}
            </div>
          </div>

          {/* Editor inline de cuenta regresiva cuando se toca el lápiz */}
          {isEditingCountdown && (
            <form
              onSubmit={handleSaveCountdown}
              className="mt-2.5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5"
            >
              <input
                type="text"
                value={newCountdownTitle}
                onChange={event => setNewCountdownTitle(event.target.value)}
                placeholder="Ej.: Receso de invierno"
                required
                className="min-w-[160px] flex-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-400"
              />
              <input
                type="date"
                value={newCountdownDate}
                onChange={event => setNewCountdownDate(event.target.value)}
                required
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-400"
              />
              <button
                type="submit"
                disabled={savingCountdown}
                className="rounded-lg px-3 py-1.5 text-xs font-bold text-white"
                style={primaryButtonStyle}
              >
                {savingCountdown ? '…' : 'Guardar'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditingCountdown(false)}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-500"
              >
                Cancelar
              </button>
            </form>
          )}
        </section>

        {/* INDICADORES PRINCIPALES */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {canUseModule('tasks') && (
            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className="group flex min-h-[76px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <CheckSquare size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-black leading-none text-slate-900">{myPendingTasks.length}</span>
                  <span className="truncate text-[11px] font-bold text-slate-600">Tareas</span>
                </div>
                <p className="truncate text-[10px] text-slate-400">Pendientes</p>
              </div>
              <ArrowUpRight size={14} className="shrink-0 text-slate-300 group-hover:text-slate-600" />
            </button>
          )}

          {canUseModule('calendar') && (
            <button
              type="button"
              onClick={() => setActiveTab('calendar')}
              className="group flex min-h-[76px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white" style={primaryButtonStyle}>
                <CalendarDays size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-black leading-none text-slate-900">{todayEvents.length}</span>
                  <span className="truncate text-[11px] font-bold text-slate-600">Hoy</span>
                </div>
                <p className="truncate text-[10px] text-slate-400">{todayEvents[0]?.title || 'En agenda'}</p>
              </div>
              <ArrowUpRight size={14} className="shrink-0 text-slate-300 group-hover:text-slate-600" />
            </button>
          )}

          {canUseModule('matricula') && (
            <button
              type="button"
              onClick={() => openBirthdayModal('students')}
              className="group flex min-h-[76px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pink-50 text-pink-600">
                <Cake size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-black leading-none text-slate-900">{studentBirthdays.length}</span>
                  <span className="truncate text-[11px] font-bold text-slate-600">Cumples</span>
                </div>
                <p className="truncate text-[10px] text-slate-400">Estudiantes (7d)</p>
              </div>
              <ArrowUpRight size={14} className="shrink-0 text-slate-300 group-hover:text-slate-600" />
            </button>
          )}

          {canUseModule('personal') && (
            <button
              type="button"
              onClick={() => openBirthdayModal('staff')}
              className="group flex min-h-[76px] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
                <UserRound size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-black leading-none text-slate-900">{staffBirthdays.length}</span>
                  <span className="truncate text-[11px] font-bold text-slate-600">Equipo</span>
                </div>
                <p className="truncate text-[10px] text-slate-400">Cumples (7d)</p>
              </div>
              <ArrowUpRight size={14} className="shrink-0 text-slate-300 group-hover:text-slate-600" />
            </button>
          )}
        </section>

        {/* ALERTA COMPACTA DE PERSONAS SIN GRUPO */}
        {isManagement && canUseModule('matricula') && ungroupedCount > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('matricula')}
            className="flex w-full items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-left transition hover:bg-amber-100/70"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Users size={15} className="shrink-0 text-amber-700" />
              <p className="truncate text-xs font-bold text-amber-950">
                {ungroupedCount} legajo{ungroupedCount === 1 ? '' : 's'} sin grupo asignado
              </p>
            </div>
            <span className="shrink-0 text-[11px] font-extrabold text-amber-800 flex items-center gap-0.5">
              Revisar <ChevronRight size={14} />
            </span>
          </button>
        )}

        {/* ESPACIOS DE TRABAJO: avisos, actividad y notas personales */}
        <div className="grid grid-cols-1 items-stretch gap-4 xl:grid-cols-12">

          {/* COLUMNA 1: AVISOS INSTITUCIONALES */}
          {showAnnouncements && (
            <section className={`min-h-[245px] rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm ${announcementColumnClass}`}>
              <SectionHeading
                icon={Bell}
                title="Avisos"
                badge={visibleAnnouncements.length}
                primaryColor={primaryColor}
                action={
                  canPost && (
                    <button
                      type="button"
                      onClick={() => setShowAnnounceModal(true)}
                      className="rounded-lg border px-2 py-1 text-[10px] font-bold transition hover:bg-slate-50"
                      style={{ borderColor: `${primaryColor}35`, color: primaryColor }}
                    >
                      + Publicar
                    </button>
                  )
                }
              />
              {visibleAnnouncements.length === 0 ? (
                <EmptyState title="Sin avisos nuevos" description="Los comunicados del equipo aparecerán acá." />
              ) : (
                <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-0.5">
                  {visibleAnnouncements.map(announcement => (
                    <article
                      key={announcement.id}
                      className="flex items-start gap-2 rounded-xl border border-slate-100 border-l-[3px] bg-slate-50/70 px-2.5 py-2"
                      style={{ borderLeftColor: primaryColor }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="whitespace-pre-wrap break-words text-xs font-semibold leading-snug text-slate-800">
                          {announcement.message}
                        </p>
                        <p className="mt-1 text-[10px] font-bold text-slate-400">
                          {announcement.author || 'Equipo'}
                        </p>
                      </div>
                      {(canPost || announcement.authorId === user?.id) && (
                        <button
                          type="button"
                          onClick={() => deleteAnnouncement(announcement.id)}
                          className="shrink-0 rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-600"
                          title="Eliminar aviso"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* COLUMNA 2: TAREAS PENDIENTES + PRÓXIMAS FECHAS */}
          {(canUseModule('tasks') || canUseModule('calendar')) && (
            <div className={`${activityColumnClass} space-y-4`}>

              {canUseModule('tasks') && (
                <section className="min-h-[150px] rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
                  <SectionHeading
                    icon={ListTodo}
                    title="Mis tareas"
                    primaryColor={primaryColor}
                    badge={myPendingTasks.length}
                    action={
                      <button
                        type="button"
                        onClick={() => setActiveTab('tasks')}
                        className="text-[11px] font-bold hover:underline"
                        style={{ color: primaryColor }}
                      >
                        Ver todas
                      </button>
                    }
                  />
                  {myPendingTasks.length === 0 ? (
                    <EmptyState title="¡Todo al día!" />
                  ) : (
                    <div className="space-y-1.5">
                      {myPendingTasks.slice(0, 3).map(task => {
                        const taskTitle = task.title || task.name || task.description || task.text || 'Tarea sin título';
                        const dueDate = task.dueDate || task.date;
                        return (
                          <button
                            key={task.id}
                            type="button"
                            onClick={() => setActiveTab('tasks')}
                            className="flex w-full items-center gap-2 rounded-lg border border-slate-100 px-2.5 py-1.5 text-left transition hover:bg-slate-50"
                          >
                            <Clock3 size={12} className="shrink-0 text-amber-600" />
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-slate-700">
                              {taskTitle}
                            </span>
                            {dueDate && (
                              <span className="shrink-0 text-[10px] font-bold text-slate-400">
                                {formatDate(dueDate, { day: '2-digit', month: '2-digit' })}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {canUseModule('calendar') && (
                <section className="min-h-[150px] rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm">
                  <SectionHeading
                    icon={CalendarDays}
                    title="Próximas fechas"
                    primaryColor={primaryColor}
                    action={
                      <button
                        type="button"
                        onClick={() => setActiveTab('calendar')}
                        className="text-[11px] font-bold hover:underline"
                        style={{ color: primaryColor }}
                      >
                        Agenda
                      </button>
                    }
                  />
                  {upcomingEvents.length === 0 ? (
                    <EmptyState title="Agenda despejada" />
                  ) : (
                    <div className="space-y-1.5">
                      {upcomingEvents.slice(0, 3).map(event => {
                        const isToday = event.date === todayStr;
                        return (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => setActiveTab('calendar')}
                            className="flex w-full items-center gap-2.5 rounded-lg border border-slate-100 px-2.5 py-1.5 text-left transition hover:bg-slate-50"
                          >
                            <span
                              className="flex h-7 w-7 shrink-0 flex-col items-center justify-center rounded-md text-center"
                              style={{ backgroundColor: `${primaryColor}12`, color: primaryColor }}
                            >
                              <span className="text-[11px] font-black leading-none">
                                {formatDate(event.date, { day: 'numeric' })}
                              </span>
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-xs font-bold text-slate-700">
                                {event.title || event.name || 'Actividad'}
                              </span>
                              <span className="block text-[10px] text-slate-400">
                                {isToday ? 'Hoy' : formatDate(event.date, { weekday: 'short', day: 'numeric', month: 'short' })}
                                {(event.time || event.startTime) ? ` · ${event.time || event.startTime}` : ''}
                              </span>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}
            </div>
          )}

          {/* COLUMNA 3: NOTAS RÁPIDAS PERSONALES */}
          {canUseModule('tasks') && (
            <section className={`min-h-[245px] rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm ${notesColumnClass}`}>
              <SectionHeading
                icon={LockKeyhole}
                title="Mis notas rápidas"
                primaryColor={primaryColor}
                badge={notes.filter(n => !n.done).length}
              />
              <form onSubmit={saveNote} className="flex gap-1.5">
                <input
                  value={newNote}
                  onChange={event => setNewNote(event.target.value)}
                  placeholder="Anotar recordatorio privado…"
                  maxLength={500}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
                  aria-label="Nueva nota personal"
                />
                <button
                  type="submit"
                  disabled={!newNote.trim() || savingNote}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg px-2.5 py-1.5 text-xs font-bold text-white transition disabled:opacity-50"
                  style={primaryButtonStyle}
                  title="Agregar nota"
                >
                  <Plus size={15} />
                </button>
              </form>
              {noteError && (
                <p role="alert" className="mt-2 rounded-lg bg-red-50 px-2.5 py-1.5 text-[11px] font-medium text-red-700">
                  {noteError}
                </p>
              )}
              {noticeMessage && (
                <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700">
                  <span>{noticeMessage}</span>
                  <button type="button" onClick={() => setNoticeMessage('')} aria-label="Cerrar">
                    <X size={12} />
                  </button>
                </div>
              )}
              {notes.length === 0 ? (
                <div className="mt-2">
                  <EmptyState title="Sin notas privadas" description="Solo vos podés ver lo que anotes acá." />
                </div>
              ) : (
                <div className="mt-2 space-y-1.5 max-h-[215px] overflow-y-auto pr-0.5">
                  {notes.map(note => (
                    <div
                      key={note.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-100 px-2.5 py-1.5"
                    >
                      <button
                        type="button"
                        onClick={() => toggleNote(note)}
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition ${
                          note.done
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-slate-300 text-transparent hover:border-slate-500'
                        }`}
                      >
                        {note.done && <Check size={10} />}
                      </button>
                      <span
                        className={`min-w-0 flex-1 break-words text-xs leading-snug ${
                          note.done ? 'text-slate-400 line-through' : 'text-slate-700'
                        }`}
                      >
                        {note.text}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteNote(note.id)}
                        className="shrink-0 rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-600"
                        title="Eliminar nota"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>

      {/* MODAL DE CUMPLEAÑOS */}
      {showBirthdayModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) setShowBirthdayModal(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="birthday-modal-title" className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-4">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Próximos 7 días</p>
                <h2 id="birthday-modal-title" className="mt-0.5 text-lg font-black text-slate-900">
                  {birthdayModalType === 'students' ? 'Cumpleaños de estudiantes' : 'Cumpleaños del equipo'}
                </h2>
              </div>
              <button type="button" onClick={() => setShowBirthdayModal(false)} aria-label="Cerrar" className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
            </div>
            <div className="space-y-2 overflow-y-auto p-4">
              {(birthdayModalType === 'students' ? studentBirthdays : staffBirthdays).length === 0 ? (
                <EmptyState title="No hay cumpleaños próximos" description="Cuando haya alguno dentro de los próximos siete días, lo vas a ver acá." />
              ) : (birthdayModalType === 'students' ? studentBirthdays : staffBirthdays).map(person => (
                <div key={person.id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pink-100 text-xs font-black text-pink-700">
                    {(person.firstName || person.fullName || person.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-800">
                      {[person.firstName || person.fullName || person.name, person.lastName].filter(Boolean).join(' ')}
                    </p>
                    <p className="text-[11px] font-semibold capitalize text-slate-500">
                      {formatDate(person.nextBirthday, { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                  <Cake size={16} className="shrink-0 text-pink-500" aria-hidden="true" />
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* MODAL PARA PUBLICAR AVISOS */}
      {showAnnounceModal && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) setShowAnnounceModal(false); }}>
          <form onSubmit={handlePost} className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 p-4 sm:p-5" style={{ borderBottom: `1px solid ${primaryColor}20` }}>
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: primaryColor }}>Cartelera</p>
                <h2 className="mt-0.5 text-lg font-black text-slate-900">Publicar un aviso</h2>
              </div>
              <button type="button" onClick={() => setShowAnnounceModal(false)} aria-label="Cerrar" className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
            </div>
            <div className="space-y-3 p-4 sm:p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="text-xs font-bold text-slate-600">Fecha de publicación
                  <input type="date" name="showDate" defaultValue={todayStr} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-700 outline-none focus:border-slate-400" />
                </label>
                <label className="text-xs font-bold text-slate-600">Hora
                  <input type="time" name="showTime" defaultValue="08:00" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-700 outline-none focus:border-slate-400" />
                </label>
              </div>
              <label className="block text-xs font-bold text-slate-600">Destinatarios
                <select name="channel" defaultValue="general" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-normal text-slate-700 outline-none focus:border-slate-400">
                  <option value="general">Todo el personal</option>
                  <option value="sede">Solo sede</option>
                  <option value="inclusion">Solo inclusión</option>
                </select>
              </label>
              <label className="block text-xs font-bold text-slate-600">Mensaje
                <textarea name="message" required maxLength={1200} rows={4} placeholder="Escribí el aviso con la información que el equipo necesita saber…" className="mt-1 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-normal leading-relaxed text-slate-700 outline-none focus:border-slate-400" />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3 sm:px-5">
              <button type="button" onClick={() => setShowAnnounceModal(false)} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100">Cancelar</button>
              <button type="submit" className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold text-white transition hover:brightness-95" style={secondaryButtonStyle}><Megaphone size={14} /> Publicar</button>
            </div>
          </form>
        </div>
      )}

      {/* TUTORIAL BREVE */}
      {showTutorial && (
        <div className="fixed inset-0 z-[9997] flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) setShowTutorial(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="tutorial-title" className="flex max-h-[84vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg text-white" style={primaryButtonStyle}><HelpCircle size={15} /></span>
                <h2 id="tutorial-title" className="text-sm font-black text-slate-900">Guía rápida de CENTRA</h2>
              </div>
              <button type="button" onClick={() => setShowTutorial(false)} aria-label="Cerrar ayuda" className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X size={16} /></button>
            </div>
            <div className="flex gap-1.5 overflow-x-auto border-b border-slate-100 px-3 py-2">
              {[
                ['inicio', 'Inicio'],
                ['avisos', 'Avisos'],
                ['legajos', 'Legajos'],
                ['aula', 'Organización'],
                ['tareas', 'Tareas'],
                ['agenda', 'Agenda'],
                ['recursos', 'Recursos'],
              ].map(([id, label]) => (
                <button key={id} type="button" onClick={() => setTutorialTab(id)} className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${tutorialTab === id ? 'text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`} style={tutorialTab === id ? primaryButtonStyle : undefined}>{label}</button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4 text-xs leading-relaxed text-slate-600 space-y-2">
              {tutorialTab === 'inicio' && <p>De un solo vistazo tenés la cuenta regresiva arriba, los contadores rápidos de tareas/agenda/cumpleaños en el centro y las 3 columnas operativas abajo (Avisos, Tareas/Agenda y tus Notas privadas).</p>}
              {tutorialTab === 'avisos' && <p>Los comunicados se pueden dirigir a todo el personal, sede o inclusión, y programarse con fecha y hora.</p>}
              {tutorialTab === 'legajos' && <p>Reúne las fichas completas, bitácoras e impresión de legajos de las personas registradas.</p>}
              {tutorialTab === 'aula' && <p>Permite gestionar grupos, talleres, referentes y asignaciones por turno o jornada.</p>}
              {tutorialTab === 'tareas' && <p>Consultá pendientes asignados a tu usuario, rol o equipo y cambiá su estado a medida que avancen.</p>}
              {tutorialTab === 'agenda' && <p>Reúne eventos institucionales, actos, reuniones y fechas clave del calendario.</p>}
              {tutorialTab === 'recursos' && <p>Repositorio de carpetas y enlaces institucionales + generador de notas con membrete oficial.</p>}
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
