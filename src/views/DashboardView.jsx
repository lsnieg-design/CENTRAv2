import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, CheckSquare, Settings, User, FileText, CheckCircle, 
  Download, Plus, Trash2, Users, AlertCircle, LogOut, Briefcase, Star,
  Lock, List, Grid, ChevronLeft, ChevronRight, Bell, Check, HelpCircle, Mail, Camera, MapPin, 
  Send, Key, Filter, LayoutDashboard, Link as LinkIcon, ExternalLink, Zap,
  AlertTriangle, Clock, Shield, Crown, Activity, Share, PlusSquare, 
  Smartphone, GraduationCap, Search, X, UploadCloud, PieChart, Eye, Edit3,
  Folder, MessageSquare, Globe, BookOpen, Lightbulb, ChevronDown, PlusCircle, Printer,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Phone, CheckCircle2, Clock3, UserCheck,
  ChevronUp
} from 'lucide-react';
import { 
  collection, query, where, onSnapshot, orderBy, limit, 
  doc, updateDoc, deleteDoc, addDoc, serverTimestamp, getDocs 
} from 'firebase/firestore';
import { getCachedAppConfig, isModuleEnabled } from '../config';

// Calcula días hábiles usando los días no laborables configurados por la institución.
const calculateBusinessDaysLeft = (dateString, holidays = []) => {
  if (!dateString) return 0;

  const targetDate = new Date(`${dateString}T00:00:00`);
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  if (Number.isNaN(targetDate.getTime()) || targetDate <= currentDate) {
    return 0;
  }

  const holidayDates = new Set(
    (holidays || []).map(value => String(value).split('|')[0])
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
    const formattedDate = `${yyyy}-${mm}-${dd}`;

    if (!holidayDates.has(formattedDate)) {
      businessDays++;
    }
  }

  return businessDays;
};

export function DashboardView({ user, db, appId, setActiveTab, tasks = [], events = [], announcements = [] }) {
  const now = new Date();
  const todayStr = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0')
  ].join('-');
  const todayEvents = events.filter(e => e.date === todayStr);
  const [students, setStudents] = useState([]);
  const [showAnnounceModal, setShowAnnounceModal] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showBirthdayModal, setShowBirthdayModal] = useState(false);
  const [birthdayModalType, setBirthdayModalType] = useState('students'); 
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [ungroupedCount, setUngroupedCount] = useState(0);
  
  const [studentBirthdays, setStudentBirthdays] = useState([]);
  const [staffBirthdays, setStaffBirthdays] = useState([]);
  const [tutorialTab, setTutorialTab] = useState('inicio');
  const appConfig = getCachedAppConfig();
  const moduleEnabled = (moduleId) => isModuleEnabled(appConfig, moduleId);

  // ESTADOS CUENTA REGRESIVA
  const [countdown, setCountdown] = useState({ title: "Vacaciones", date: "", daysLeft: 0 });
  const [countdownDocId, setCountdownDocId] = useState(null);
  const [isEditingCountdown, setIsEditingCountdown] = useState(false);
  const [newCountdownTitle, setNewCountdownTitle] = useState('');
  const [newCountdownDate, setNewCountdownDate] = useState('');

  const isManagement = ['admin', 'super-admin', 'Equipo Directivo', 'Equipo Técnico', 'Administración', 'Dirección Inclusión'].includes(user.role) || user.rol === 'admin';
  const isSuperAdmin = user.rol === 'admin' || user.rol === 'super-admin';
  const isInclusionStaff = ['DAI', 'Inclusión', 'Dirección Inclusión', 'Equipo Técnico Inclusión'].includes(user.role);
  const isSedeStaff = ['Docente', 'Equipo Directivo', 'Equipo Técnico', 'Auxiliar/Preceptor', 'Profes Especiales', 'Administración'].includes(user.role);
  const canPost = isManagement;

  useEffect(() => {
    if (!db || !appId) return;

    // 1. Tareas Personales (Notas)
    const qNotes = query(collection(db, 'artifacts', appId, 'public', 'data', 'notes'), where('userId', '==', user.id));
    const unsubNotes = onSnapshot(qNotes, (snap) => setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.done - b.done)));

    // 3. Estudiantes y Cumpleaños
    const qStudents = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), where('isActive', '==', true));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
        const allStudents = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setStudents(allStudents);
        const today = new Date(); today.setHours(0,0,0,0);
        const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
        const bdays = allStudents.map(data => {
            if(!data.birthDate) return null;
            const dob = new Date(data.birthDate + 'T00:00:00');
            const nextB = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
            if (nextB < today) nextB.setFullYear(today.getFullYear() + 1);
            return { ...data, nextBirthday: nextB };
        }).filter(s => s && s.nextBirthday >= today && s.nextBirthday <= nextWeek).sort((a, b) => a.nextBirthday - b.nextBirthday);
        setStudentBirthdays(bdays);
        setUngroupedCount(allStudents.filter(s => !s.groupMorning && !s.groupAfternoon && !s.daiMorning && !s.daiAfternoon).length);
    });

    // 4. Staff y Cumples Profes
    const qStaff = query(collection(db, 'artifacts', appId, 'public', 'data', 'staff_records'));
    const unsubStaff = onSnapshot(qStaff, (snap) => {
        const today = new Date(); today.setHours(0,0,0,0);
        const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
        const sBdays = snap.docs.map(d => {
            const data = d.data();
            if(!data.birthDate) return null;
            const dob = new Date(data.birthDate.includes('T') ? data.birthDate : data.birthDate + 'T00:00:00');
            const nextB = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
            if (nextB < today) nextB.setFullYear(today.getFullYear() + 1);
            return { ...data, id: d.id, nextBirthday: nextB };
        }).filter(s => s && s.nextBirthday >= today && s.nextBirthday <= nextWeek).sort((a, b) => a.nextBirthday - b.nextBirthday);
        setStaffBirthdays(sBdays);
    });

    // 5. Configuración de Cuenta Regresiva (ACTUALIZADO PARA DÍAS HÁBILES)
    const qSettings = query(collection(db, 'artifacts', appId, 'public', 'data', 'settings'));
    const unsubSettings = onSnapshot(qSettings, (snap) => {
        if (!snap.empty) {
            const docSnap = snap.docs.find(d => d.data().title || d.data().date);
            if (docSnap) {
                setCountdownDocId(docSnap.id);
                const data = docSnap.data();
                const diffDays = calculateBusinessDaysLeft(data.date, appConfig.holidays);
                setCountdown({ title: data.title || '', date: data.date, daysLeft: diffDays > 0 ? diffDays : 0 });
            }
        }
    });

    return () => { unsubNotes(); unsubSettings(); unsubStudents(); unsubStaff(); };
  }, [user.id, appId]); 

  // --- FUNCIONES ---
  const handlePost = async (e) => { 
    e.preventDefault(); 
    const fd = new FormData(e.target);
    try { 
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), { 
        message: fd.get('message'), 
        author: user.fullName || user.firstName, 
        authorId: user.id, 
        channel: fd.get('channel'), 
        showDate: fd.get('showDate') || todayStr,
        showTime: fd.get('showTime') || "00:00",
        createdAt: serverTimestamp() 
      }); 
      setShowAnnounceModal(false); 
    } catch(err) { alert(err.message); } 
  };

  const deleteAnnouncement = async (id) => { 
    if(confirm("¿Borrar este aviso de la cartelera?")) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'announcements', id));
      } catch (err) { alert("Error al borrar: " + err.message); }
    }
  };

  const saveNote = async (e) => { 
    e.preventDefault(); 
    if (!newNote.trim()) return; 
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'notes'), { text: newNote, userId: user.id, done: false, createdAt: serverTimestamp() }); 
    setNewNote(''); 
  };

  const toggleNote = async (note) => await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', note.id), { done: !note.done });
  const deleteNote = async (id) => {
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notes', id));
    } catch (err) { console.error(err); }
  };

  const handleSaveCountdown = async () => {
    if(!newCountdownTitle || !newCountdownDate) return;
    try {
        if (countdownDocId) { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', countdownDocId), { title: newCountdownTitle, date: newCountdownDate }); }
        else { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'settings'), { title: newCountdownTitle, date: newCountdownDate }); }
        setIsEditingCountdown(false);
    } catch (err) { alert(err.message); }
  };

  const visibleAnnouncements = moduleEnabled('notifications')
    ? announcements.filter(a => {
        const hasPermission =
          isSuperAdmin ||
          a.authorId === user.id ||
          !a.channel ||
          a.channel === 'general' ||
          (a.channel === 'inclusion' && isInclusionStaff) ||
          (a.channel === 'sede' && isSedeStaff);

        const scheduleDate = new Date(
          `${a.showDate || '2000-01-01'}T${a.showTime || '00:00'}`
        );

        return hasPermission && new Date() >= scheduleDate;
      })
    : [];

  const myPendingTasksCount = moduleEnabled('tasks')
    ? tasks.filter(t => {
        if (t.status === 'completed') return false;

        const sched = new Date(
          `${t.showDate || '2000-01-01'}T${t.showTime || '00:00'}`
        );

        if (sched > new Date()) return false;

        return (
          isSuperAdmin ||
          t.createdById === user.id ||
          t.targetUserId === user.id ||
          t.targetRoles?.some(
            r => r.toLowerCase() === user.role?.toLowerCase()
          )
        );
      }).length
    : 0;

return (
    <div className="w-full max-w-7xl mx-auto space-y-6 animate-in fade-in pb-20 overflow-y-auto h-full [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
      {/* ENCABEZADO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-violet-600 mb-1">
            {appConfig.institutionShortName || appConfig.institutionName || 'Institución'}
          </p>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Hola, {user.firstName || 'bienvenido'}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Este es el resumen de tu actividad institucional.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowTutorial(true)}
            className="bg-white text-violet-700 px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-sm border border-slate-200 flex items-center gap-2 hover:border-violet-200 hover:bg-violet-50 transition"
          >
            <HelpCircle size={16} />
            Ayuda
          </button>

          {canPost && moduleEnabled('notifications') && (
            <button
              onClick={() => setShowAnnounceModal(true)}
              className="bg-violet-600 text-white px-3.5 py-2.5 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2 hover:bg-violet-700 transition"
            >
              <Edit3 size={14} />
              Nuevo aviso
            </button>
          )}
        </div>
      </div>

      {/* CARTELERA */}
      {visibleAnnouncements.length > 0 && (
        <section className="mx-1 bg-white rounded-3xl border border-amber-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-amber-100 bg-amber-50">
            <h3 className="text-xs font-black text-amber-900 uppercase tracking-widest flex items-center gap-2">
              <Bell size={14} />
              Avisos institucionales
            </h3>
          </div>

          <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {visibleAnnouncements.map(a => (
              <div
                key={a.id}
                className="bg-amber-50/60 p-4 rounded-2xl border border-amber-100 text-sm text-slate-700 flex justify-between items-start gap-3"
              >
                <div className="min-w-0">
                  <p className="font-medium leading-relaxed break-words">{a.message}</p>
                  <p className="text-[10px] text-amber-700 font-bold mt-2 uppercase">{a.author}</p>
                </div>

                {(canPost || a.authorId === user.id) && (
                  <button
                    onClick={() => deleteAnnouncement(a.id)}
                    className="text-slate-300 hover:text-red-500 p-1 rounded-lg transition shrink-0"
                    title="Eliminar aviso"
                    aria-label="Eliminar aviso"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* CUMPLEAÑOS Y PRÓXIMA FECHA */}
      {(moduleEnabled('matricula') || moduleEnabled('personal') || moduleEnabled('calendar')) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 px-1">
          {moduleEnabled('matricula') && studentBirthdays.length > 0 && (
            <button
              onClick={() => {
                setBirthdayModalType('students');
                setShowBirthdayModal(true);
              }}
              className="bg-white p-4 rounded-2xl shadow-sm border border-pink-100 flex items-center gap-3 text-left hover:border-pink-200 hover:shadow-md transition"
            >
              <div className="bg-pink-50 text-pink-600 p-2.5 rounded-xl">
                <Crown size={19} />
              </div>
              <div>
                <h3 className="font-black text-xs uppercase text-slate-800">Cumpleaños</h3>
                <p className="text-[11px] text-slate-500">
                  {studentBirthdays.length} estudiante{studentBirthdays.length === 1 ? '' : 's'} esta semana
                </p>
              </div>
            </button>
          )}

          {moduleEnabled('personal') && staffBirthdays.length > 0 && (
            <button
              onClick={() => {
                setBirthdayModalType('staff');
                setShowBirthdayModal(true);
              }}
              className="bg-white p-4 rounded-2xl shadow-sm border border-violet-100 flex items-center gap-3 text-left hover:border-violet-200 hover:shadow-md transition"
            >
              <div className="bg-violet-50 text-violet-600 p-2.5 rounded-xl">
                <User size={19} />
              </div>
              <div>
                <h3 className="font-black text-xs uppercase text-slate-800">Cumpleaños del personal</h3>
                <p className="text-[11px] text-slate-500">
                  {staffBirthdays.length} persona{staffBirthdays.length === 1 ? '' : 's'} esta semana
                </p>
              </div>
            </button>
          )}

          {moduleEnabled('calendar') && (
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 relative group flex items-center gap-4">
              {isManagement && !isEditingCountdown && (
                <button
                  onClick={() => {
                    setNewCountdownTitle(countdown.title || '');
                    setNewCountdownDate(countdown.date || '');
                    setIsEditingCountdown(true);
                  }}
                  className="absolute top-2 right-2 text-slate-300 hover:text-violet-500 opacity-0 group-hover:opacity-100 transition"
                  title="Editar cuenta regresiva"
                  aria-label="Editar cuenta regresiva"
                >
                  <Edit3 size={14} />
                </button>
              )}

              {isEditingCountdown ? (
                <div className="w-full flex flex-col gap-2">
                  <input
                    type="text"
                    value={newCountdownTitle}
                    onChange={e => setNewCountdownTitle(e.target.value)}
                    placeholder="Ej.: Receso de invierno"
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-xl bg-white"
                  />
                  <input
                    type="date"
                    value={newCountdownDate}
                    onChange={e => setNewCountdownDate(e.target.value)}
                    className="w-full p-2.5 text-xs border border-slate-200 rounded-xl bg-white"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveCountdown}
                      className="flex-1 bg-violet-600 text-white text-xs font-bold p-2.5 rounded-xl"
                    >
                      Guardar
                    </button>
                    <button
                      onClick={() => setIsEditingCountdown(false)}
                      className="px-4 bg-white border border-slate-200 text-slate-600 text-xs font-bold rounded-xl"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-violet-600 text-white w-12 h-12 rounded-xl flex flex-col items-center justify-center shadow-sm shrink-0">
                    <span className="text-lg font-black leading-none">{countdown.daysLeft}</span>
                    <span className="text-[7px] font-bold uppercase tracking-wide">Días háb.</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] text-violet-500 font-bold uppercase tracking-wide">Próxima fecha</p>
                    <h3 className="font-black text-slate-800 text-sm leading-tight truncate">
                      {countdown.title || 'Configurar cuenta regresiva'}
                    </h3>
                    {countdown.date && (
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {new Date(`${countdown.date}T00:00:00`).toLocaleDateString('es-AR')}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAREAS Y AGENDA */}
      {(moduleEnabled('tasks') || moduleEnabled('calendar')) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 px-1">
          {moduleEnabled('tasks') && (
            <button
              onClick={() => setActiveTab('tasks')}
              className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm text-left hover:shadow-md hover:border-orange-200 transition flex items-center justify-between"
            >
              <div>
                <h4 className="text-3xl font-black text-orange-500">{myPendingTasksCount}</h4>
                <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mt-1">Tareas pendientes</p>
              </div>
              <ChevronRight className="text-orange-200" />
            </button>
          )}

          {moduleEnabled('calendar') && (
            <button
              onClick={() => setActiveTab('calendar')}
              className={`p-5 rounded-3xl border shadow-sm text-left hover:shadow-md transition flex items-center justify-between ${
                todayEvents.length > 0
                  ? 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="min-w-0">
                {todayEvents.length > 0 ? (
                  <>
                    <p className="text-[9px] uppercase font-bold tracking-widest opacity-70 mb-1">
                      {todayEvents.length === 1 ? 'Evento de hoy' : `${todayEvents.length} eventos hoy`}
                    </p>
                    <h4 className="text-lg font-black leading-tight truncate">
                      {todayEvents[0].title || 'Actividad institucional'}
                    </h4>
                  </>
                ) : (
                  <>
                    <h4 className="text-3xl font-black text-violet-600">0</h4>
                    <p className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mt-1">Eventos hoy</p>
                  </>
                )}
              </div>
              <ChevronRight className={todayEvents.length > 0 ? 'text-white/40' : 'text-violet-100'} />
            </button>
          )}
        </div>
      )}

      {/* NOTAS PERSONALES */}
      {moduleEnabled('tasks') && (
        <section className="bg-slate-50 p-5 rounded-3xl border border-slate-200 shadow-sm mx-1">
          <div className="mb-3">
            <h3 className="font-black text-slate-700 uppercase text-[10px] flex items-center gap-2">
              <Lock size={12} />
              Mis notas
            </h3>
            <p className="text-xs text-slate-400 mt-1">Un espacio privado para tus pendientes personales.</p>
          </div>

          <form onSubmit={saveNote} className="flex gap-2 mb-3">
            <input
              value={newNote}
              onChange={e => setNewNote(e.target.value)}
              placeholder="Escribí una nota..."
              className="flex-1 p-3 rounded-xl outline-none text-xs bg-white border border-slate-200 shadow-sm"
            />
            <button
              type="submit"
              className="bg-violet-600 text-white p-3 rounded-xl font-bold shadow-sm hover:bg-violet-700 transition"
              title="Agregar nota"
              aria-label="Agregar nota"
            >
              <Plus size={16} />
            </button>
          </form>

          {notes.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs">Todavía no tenés notas personales.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {notes.map(n => (
                <div key={n.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm group">
                  <button
                    onClick={() => toggleNote(n)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                      n.done ? 'bg-violet-500 border-violet-500' : 'border-violet-200'
                    }`}
                    title={n.done ? 'Marcar como pendiente' : 'Marcar como realizada'}
                    aria-label={n.done ? 'Marcar como pendiente' : 'Marcar como realizada'}
                  >
                    {n.done && <Check size={10} className="text-white" />}
                  </button>

                  <span className={`text-xs flex-1 font-medium ${n.done ? 'line-through text-slate-300' : 'text-slate-600'}`}>
                    {n.text}
                  </span>

                  <button
                    onClick={() => deleteNote(n.id)}
                    className="text-slate-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                    title="Eliminar nota"
                    aria-label="Eliminar nota"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {showBirthdayModal && (
        <div className="fixed inset-0 bg-slate-900/90 z-[9999] flex items-center justify-center p-4 backdrop-blur-md" onClick={() => setShowBirthdayModal(false)}>
          <div className="bg-white rounded-[40px] w-full max-w-sm p-6 shadow-2xl relative animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowBirthdayModal(false)} className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full"><X size={20}/></button>
            <h3 className="text-xl font-black text-violet-900 uppercase italic mb-4">{birthdayModalType === 'students' ? 'Cumples Alumnos' : 'Cumples Staff'}</h3>
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {(birthdayModalType === 'students' ? studentBirthdays : staffBirthdays).map(person => (
                <div key={person.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center font-black text-violet-600">{person.firstName?.[0] || person.fullName?.[0]}</div>
                    <div><p className="font-bold text-slate-800 text-sm uppercase">{person.firstName || person.fullName} {person.lastName || ''}</p><p className="text-[10px] text-violet-500 font-black uppercase">{person.nextBirthday.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' })}</p></div>
                  </div>
                  <div className="text-2xl">🎂</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}


      {showAnnounceModal && (
        <div className="fixed inset-0 bg-black/60 z-[500] flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={handlePost} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 border-t-8 border-orange-500">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-violet-900 uppercase italic">Nuevo Aviso</h3>
              <button type="button" onClick={() => setShowAnnounceModal(false)}><X size={20} className="text-gray-400"/></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">¿Cuándo?</label><input type="date" name="showDate" defaultValue={todayStr} className="w-full p-2 bg-gray-50 rounded-xl text-xs font-bold border-none" /></div>
                <div><label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Hora</label><input type="time" name="showTime" defaultValue="08:00" className="w-full p-2 bg-gray-50 rounded-xl text-xs font-bold border-none" /></div>
              </div>
              <div><label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Canal</label><select name="channel" className="w-full p-3 bg-gray-50 rounded-xl text-xs font-bold border-none"><option value="general">Todo el Personal</option><option value="sede">Solo Sede</option><option value="inclusion">Solo Inclusión</option></select></div>
              <textarea name="message" required placeholder="Mensaje..." className="w-full h-32 p-4 bg-gray-50 rounded-2xl border-none outline-none text-sm font-medium resize-none"></textarea>
              <button type="submit" className="w-full py-4 bg-orange-500 text-white rounded-2xl font-black uppercase text-xs shadow-lg">Publicar Aviso</button>
            </div>
          </form>
        </div>
      )}

      {showTutorial && (
        <div className="fixed inset-0 bg-violet-900/95 z-[300] flex items-center justify-center p-4 backdrop-blur-md animate-in fade-in">
            <div className="bg-white rounded-[40px] w-full max-w-lg p-6 shadow-2xl max-h-[85vh] flex flex-col relative">
                <button onClick={() => setShowTutorial(false)} className="absolute top-4 right-4 bg-gray-100 p-2 rounded-full hover:bg-gray-200 z-10"><X size={20}/></button>
                <div className="text-center mb-6 pt-4"><h2 className="text-2xl font-black text-violet-900 italic uppercase">Ayuda</h2></div>
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2 no-scrollbar">
                    {['inicio', 'legajos', 'aula', 'tareas', 'agenda', 'recursos', 'proyecto'].map(t => (
                      <button key={t} onClick={()=>setTutorialTab(t)} className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition ${tutorialTab===t?'bg-violet-600 text-white shadow-md':'bg-gray-100 text-gray-500'}`}>{t}</button>
                    ))}
                </div>
                <div className="flex-1 overflow-y-auto pr-2 space-y-4 text-sm text-gray-600">
                    {tutorialTab === 'inicio' && (
                      <>
                        <div className="bg-violet-50 p-5 rounded-2xl border border-violet-100">
                          <h4 className="font-black text-violet-900 text-base mb-2">Inicio</h4>
                          <p className="leading-relaxed">Es tu vista general de la institución. Desde acá podés revisar avisos, tareas pendientes, próximos eventos y accesos rápidos.</p>
                        </div>
                        <div className="grid md:grid-cols-2 gap-3">
                          <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100"><h4 className="font-bold text-orange-800 mb-1">Avisos</h4><p>Publicá información importante para que el equipo la tenga a mano.</p></div>
                          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100"><h4 className="font-bold text-blue-800 mb-1">Tareas</h4><p>Organizá pendientes personales y de trabajo.</p></div>
                          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100"><h4 className="font-bold text-emerald-800 mb-1">Agenda</h4><p>Consultá actividades y fechas importantes de la institución.</p></div>
                          <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100"><h4 className="font-bold text-indigo-800 mb-1">Accesos rápidos</h4><p>Usá la navegación inferior para entrar a las secciones que tengas habilitadas.</p></div>
                        </div>
                      </>
                    )}
                    {tutorialTab === 'legajos' && (
                      <div className="bg-green-50 p-5 rounded-2xl border border-green-100 space-y-3">
                        <h4 className="font-black text-green-900 text-base">Legajos</h4>
                        <p>Centraliza la información de las personas que forman parte de la institución.</p>
                        <p><strong>Buscar:</strong> encontrá rápidamente por nombre o apellido.</p>
                        <p><strong>Ficha:</strong> accedé a la información disponible y a los registros asociados.</p>
                        <p><strong>Edición:</strong> los datos que podés modificar dependen de tus permisos.</p>
                      </div>
                    )}
                    {tutorialTab === 'aula' && (
                      <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 space-y-3">
                        <h4 className="font-black text-indigo-900 text-base">Mi Aula</h4>
                        <p>Es el espacio para organizar grupos, consultar integrantes y trabajar con la información cotidiana del aula.</p>
                        <p><strong>Grupos:</strong> ingresá al grupo correspondiente para consultar sus integrantes.</p>
                        <p><strong>Asistencia y seguimiento:</strong> las opciones disponibles dependen de los módulos habilitados.</p>
                      </div>
                    )}
                    {tutorialTab === 'tareas' && (
                      <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 space-y-3">
                        <h4 className="font-black text-blue-900 text-base">Tareas</h4>
                        <p>Usá esta sección para ordenar pendientes, fechas y tareas de trabajo.</p>
                        <p><strong>Nueva tarea:</strong> cargá qué hay que hacer y cuándo.</p>
                        <p><strong>Seguimiento:</strong> marcá las tareas resueltas para mantener una vista clara de lo que queda pendiente.</p>
                      </div>
                    )}
                    {tutorialTab === 'agenda' && (
                      <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 space-y-3">
                        <h4 className="font-black text-emerald-900 text-base">Agenda</h4>
                        <p>Consultá y organizá eventos y actividades institucionales.</p>
                        <p><strong>Calendario:</strong> revisá las próximas fechas.</p>
                        <p><strong>Organización:</strong> usá las fechas como referencia común para el equipo.</p>
                      </div>
                    )}
                    {tutorialTab === 'recursos' && (
                      <div className="bg-cyan-50 p-5 rounded-2xl border border-cyan-100 space-y-3">
                        <h4 className="font-black text-cyan-900 text-base">Recursos</h4>
                        <p>Reuní materiales, enlaces y recursos útiles para el trabajo institucional.</p>
                        <p><strong>Agregar:</strong> incorporá un recurso cuando tengas permisos para hacerlo.</p>
                        <p><strong>Consultar:</strong> accedé desde esta sección cuando necesites recuperar un material.</p>
                      </div>
                    )}
                    {tutorialTab === 'proyecto' && (
                      <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100 space-y-3">
                        <h4 className="font-black text-orange-900 text-base">Proyecto institucional</h4>
                        <p>Espacio para reunir y consultar la información del proyecto institucional y sus líneas de trabajo.</p>
                        <p>Las opciones disponibles pueden variar según la configuración y los permisos de tu institución.</p>
                      </div>
                    )}
                </div>
                <button onClick={() => setShowTutorial(false)} className="w-full bg-violet-600 text-white py-3 rounded-2xl font-bold mt-4 shadow-lg uppercase text-xs">¡Entendido!</button>
            </div>
        </div>
      )}
    </div>
  );
}
