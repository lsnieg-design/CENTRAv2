import React, { useState, useEffect, useRef } from 'react';
import { GroupsView } from './views/GroupsView';
import { PersonalView } from './views/PersonalView';
import { DashboardView } from './views/DashboardView';
import { ResourcesView } from './views/ResourcesView';
import { TasksView } from './views/TasksView';
import { CalendarView } from './views/CalendarView';
import { MedicalView } from './views/MedicalView';
import { MatriculaView } from './views/MatriculaView';
import { AdministracionView } from './views/AdministracionView';
import { SocialView } from './views/SocialView';
import { UsersAdminView } from './views/UsersAdminView';
import { ProfileView } from './views/ProfileView';
import { ProyectoView } from './views/ProyectoView';
import { EvaluationsView } from './views/EvaluationsView';
import { InformesView } from './views/InformesView';
import { InformesExternosView } from './views/InformesExternosView';

import { 
  Calendar as CalendarIcon, CheckSquare, Settings, User, FileText, CheckCircle, 
  Download, RefreshCw, Plus, Trash2, Users, AlertCircle, LogOut, Briefcase, 
  Lock, List, Grid, ChevronLeft, ChevronRight, Bell, Check, HelpCircle, Mail, Camera, MapPin, 
  Send, Key, Filter, LayoutDashboard, Link as LinkIcon, ExternalLink, Zap,
  AlertTriangle, Clock, Shield, Crown, Activity, Share, PlusSquare, 
  Smartphone, GraduationCap, Search, X, UploadCloud, PieChart, Eye, Edit3, Trophy,
  Folder, MessageSquare, Globe, BookOpen, Lightbulb, ChevronDown, PlusCircle, Printer,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Phone, CheckCircle2, Clock3, UserCheck,
  ChevronUp, ClipboardCheck
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, 
  updateDoc, deleteDoc, where, getDocs, getDoc, serverTimestamp, arrayUnion, arrayRemove, limit,increment 
} from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from "firebase/messaging";
const VALID_ROLES_OFFICIAL = [
  "Docente", "Preceptora", "Auxiliar", "Profe Especial", "Equipo Técnico", "Equipo Directivo",
  "Dirección Inclusión", "Equipo Técnico Inclusión", "DAI",
  "Cocina", "Limpieza", "Mantenimiento", "Administración"
];
const TURNS_LIST = ["Mañana", "Tarde", "Alternado", "Vespertino", "Doble"];
 const LOGO_URL = "/icon-192.png";


const triggerMobileNotification = (title, body) => {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, { body: body, icon: LOGO_URL, vibrate: [200, 100, 200] });
      });
    } else {
      try { new Notification(title, { body, icon: LOGO_URL }); } catch (e) { console.log("Notif error"); }
    }
  }
};

const getFirebaseConfig = () => {
  try {
    if (import.meta.env && import.meta.env.VITE_FIREBASE_API_KEY) {
      return {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID
      };
    }
  } catch (e) {
    console.log("Buscando config global...");
  }
  if (typeof __firebase_config !== 'undefined') {
    return JSON.parse(__firebase_config);
  }
  return {};
};

const firebaseConfig = getFirebaseConfig();
const app = Object.keys(firebaseConfig).length > 0 ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'escuela-app-prod';

 
const ROLES = [
  'Docente', 
  'Equipo Directivo', 
  'Equipo Técnico', 
  'Auxiliar/Preceptor', 
  'Inclusión', 
  'Profes Especiales', 
  'Administración',
  'Dirección Inclusión', 
  'Equipo Técnico Inclusión',
  'DAI'
];
const MODALIDADES = ['Sede', 'Inclusión'];
const EVENT_TYPES = ['SALIDA EDUCATIVA', 'GENERAL', 'ADMINISTRATIVO', 'INFORMES', 'EVENTOS', 'ACTOS', 'EFEMÉRIDES', 'CUMPLEAÑOS', 'INCLUSIÓN' ];

const calculateBusinessDaysLeft = (dateString) => {
  if (!dateString) return 0;
  
  const FERIADOS_ARG_2026 = [
    '2026-01-01', '2026-02-16', '2026-02-17', '2026-03-23', '2026-03-24', 
    '2026-04-02', '2026-04-03', '2026-05-01', '2026-05-25', '2026-06-15', 
    '2026-07-09', '2026-07-10', '2026-08-17', '2026-10-12', '2026-11-23', 
    '2026-12-07', '2026-12-08', '2026-12-25'
  ];

  const targetDate = new Date(dateString + 'T00:00:00');
  let currentDate = new Date();
  currentDate.setHours(0,0,0,0);
  targetDate.setHours(0,0,0,0);

  if (targetDate <= currentDate) return 0;

  let businessDays = 0;
  let tempDate = new Date(currentDate);
  
  while (tempDate < targetDate) {
    tempDate.setDate(tempDate.getDate() + 1);
    const dayOfWeek = tempDate.getDay();
    
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const yyyy = tempDate.getFullYear();
      const mm = String(tempDate.getMonth() + 1).padStart(2, '0');
      const dd = String(tempDate.getDate()).padStart(2, '0');
      const formattedDate = `${yyyy}-${mm}-${dd}`;
      
      if (!FERIADOS_ARG_2026.includes(formattedDate)) {
        businessDays++;
      }
    }
  }

  return businessDays;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

function SplashScreen() {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-violet-600 to-indigo-700 z-[9999] flex flex-col items-center justify-center animate-out fade-out duration-1000 fill-mode-forwards">
      <div className="bg-white p-6 rounded-[40px] shadow-2xl animate-bounce">
        <img 
          src="https://static.wixstatic.com/media/1a42ff_3511de5c6129483cba538636cff31b1d~mv2.png/v1/crop/x_0,y_79,w_500,h_343/fill/w_143,h_98,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo%20sin%20fondo.png" 
          alt="Logo" 
          className="w-32 h-auto" 
        />
      </div>
      <h1 className="mt-8 text-3xl font-black text-white tracking-widest uppercase italic animate-pulse">
        Juntos a la Par
      </h1>
      <p className="text-white/60 text-xs font-bold mt-2 uppercase tracking-[4px]">Cargando Sistema...</p>
    </div>
  );
}

function NotificationsView({ notifications }) {
  return (
    <div className="p-4">
      <h2 className="text-2xl font-black text-violet-900 mb-6 uppercase italic">Notificaciones</h2>
      <div className="space-y-3">
        {notifications.length === 0 ? (
          <p className="text-gray-400 italic">No hay avisos nuevos.</p>
        ) : (
          notifications.map(n => (
            <div key={n.id} className="bg-white p-4 rounded-2xl shadow-sm border-l-4 border-orange-500">
              <p className="font-bold text-slate-800">{n.title}</p>
              <p className="text-sm text-slate-500">{n.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [currentUserProfile, setCurrentUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(false);
  const [minTimePassed, setMinTimePassed] = useState(false);

  useEffect(() => {
    setTimeout(() => setMinTimePassed(true), 2500);
    if (!auth) { setConfigError(true); setLoading(false); return; }

    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) { console.error("Auth error:", error); }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      const savedProfile = localStorage.getItem('schoolApp_profile');
      if (savedProfile) setCurrentUserProfile(JSON.parse(savedProfile));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = (profileData) => { setCurrentUserProfile(profileData); localStorage.setItem('schoolApp_profile', JSON.stringify(profileData)); };
  const handleLogout = () => { setCurrentUserProfile(null); localStorage.removeItem('schoolApp_profile'); };

  if (loading) return <div className="flex items-center justify-center h-screen bg-violet-50"><div className="animate-spin rounded-full h-12 w-12 border-b-4 border-violet-600"></div></div>;
  if (configError) return <div className="flex flex-col items-center justify-center h-screen bg-red-50 p-6 text-center"><AlertCircle className="text-red-500 w-16 h-16 mb-4" /><h1 className="text-xl font-bold text-red-700">Error de Configuración</h1></div>;
  if (!currentUserProfile) return <LoginScreen onLogin={handleLogin} />;

  
 return <MainApp user={currentUserProfile} onLogout={handleLogout} />;
}


function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [showRecover, setShowRecover] = useState(false);
  const [recoverUser, setRecoverUser] = useState('');
  const [recoverStatus, setRecoverStatus] = useState('idle');
  
  const [showInstall, setShowInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIos, setIsIos] = useState(false);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  useEffect(() => {
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIos(ios);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isStandalone) setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (ios && !isStandalone) {
        setTimeout(() => setShowInstall(true), 2000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [isStandalone]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setShowInstall(false);
      setDeferredPrompt(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setChecking(true);
    if (username === 'admin' && password === 'admin123') {
      onLogin({ id: 'super-admin', firstName: 'Super', lastName: 'Admin', fullName: 'Super Admin', role: 'Equipo Directivo', rol: 'super-admin', isAdmin: true, username: 'admin' }); return;
    }
    try {
      const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
      const q = query(usersRef, where('username', '==', username.toLowerCase()), where('password', '==', password));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0]; const userData = userDoc.data();
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userDoc.id), { lastLogin: serverTimestamp() });
        const esAdmin = userData.rol === 'admin';
        onLogin({ ...userData, id: userDoc.id, isAdmin: esAdmin });
      } else { setError('Usuario o contraseña incorrectos.'); }
    } catch (err) { setError('Error de conexión.'); } finally { setChecking(false); }
  };

  const handleRequestReset = async (e) => {
    e.preventDefault(); if(!recoverUser.trim()) return; setRecoverStatus('sending');
    try {
        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), where('username', '==', recoverUser));
        const snapshot = await getDocs(q);
        if (snapshot.empty) { setRecoverStatus('error'); setTimeout(() => setRecoverStatus('idle'), 3000); return; }
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'requests'), { type: 'password_reset', username: recoverUser, status: 'pending', createdAt: serverTimestamp() });
        setRecoverStatus('sent');
    } catch (error) { setRecoverStatus('error'); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 to-fuchsia-900 flex items-center justify-center p-6 relative">
      
      {!isStandalone && showInstall && (
         <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in duration-500">
             <div className="bg-white rounded-[35px] shadow-2xl p-6 w-full max-w-sm text-center mb-4 md:mb-0 border-t-8 border-violet-500 relative">
                 <button onClick={() => setShowInstall(false)} className="absolute top-4 right-4 text-gray-300 hover:text-gray-500"><X size={24}/></button>
                 
                 <div className="flex justify-center mb-4">
                    <div className="bg-violet-100 p-4 rounded-full animate-bounce">
                        <Smartphone className="text-violet-600" size={40} />
                    </div>
                 </div>
                 
                 <h3 className="text-2xl font-black text-gray-800 mb-2 leading-tight">¡Instalá la App! 📲</h3>
                 <p className="text-sm text-gray-500 mb-6 font-medium">Para tener acceso rápido y recibir notificaciones importantes, instalá la app en tu celular.</p>
                 
                 <div className="space-y-3">
                     {!isIos ? (
                         <button onClick={handleInstallClick} className="w-full bg-violet-600 text-white font-bold py-4 px-4 rounded-2xl shadow-xl hover:bg-violet-700 transition flex items-center justify-center gap-2 text-sm uppercase tracking-wide">
                             <Download size={20}/> Instalar Ahora
                         </button>
                     ) : (
                         <div className="text-left bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs text-gray-600 space-y-3">
                             <p className="font-bold text-violet-600 text-center uppercase tracking-wider mb-2">Cómo instalar en iPhone:</p>
                             <div className="flex items-center gap-3">
                                 <div className="bg-white p-2 rounded-lg shadow-sm text-blue-500"><Share size={18}/></div>
                                 <span>1. Tocá el botón <b>Compartir</b> (abajo al medio).</span>
                             </div>
                             <div className="flex items-center gap-3">
                                 <div className="bg-white p-2 rounded-lg shadow-sm text-gray-600"><PlusSquare size={18}/></div>
                                 <span>2. Buscá y elegí <b>"Agregar a Inicio"</b>.</span>
                             </div>
                             <div className="flex items-center gap-3">
                                 <div className="bg-white p-2 rounded-lg shadow-sm font-bold text-blue-500 text-[10px]">Add</div>
                                 <span>3. Dale a <b>Agregar</b> (arriba derecha).</span>
                             </div>
                         </div>
                     )}
                     <button onClick={() => setShowInstall(false)} className="text-gray-400 font-bold text-xs uppercase hover:text-gray-600 mt-2">Usar navegador por ahora</button>
                 </div>
             </div>
         </div>
      )}

      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border-t-8 border-orange-500 relative z-0">
        <div className="text-center mb-8">
            <div className="flex justify-center mb-4"><img src="https://static.wixstatic.com/media/1a42ff_3511de5c6129483cba538636cff31b1d~mv2.png/v1/crop/x_0,y_79,w_500,h_343/fill/w_143,h_98,al_c,q_85,usm_0.66_1.00_0.01,enc_avif,quality_auto/logo%20sin%20fondo.png" alt="Logo" className="h-24 w-auto object-contain drop-shadow-md" /></div>
            <h1 className="text-2xl font-extrabold text-violet-900 tracking-tight uppercase">PORTAL INSTITUCIONAL<br/><span className="text-orange-500">JUNTOS A LA PAR</span></h1>
        </div>

        {!showRecover ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div><label className="block text-xs font-bold text-violet-900 uppercase mb-2 ml-1">Usuario</label><div className="relative group"><User className="absolute left-3 top-3.5 text-violet-300" size={18} /><input type="text" required className="w-full pl-10 pr-4 py-3 bg-violet-50 border border-violet-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-400" placeholder="Nombre de usuario" value={username} onChange={(e) => setUsername(e.target.value)} /></div></div>
            <div><label className="block text-xs font-bold text-violet-900 uppercase mb-2 ml-1">Contraseña</label><div className="relative group"><Lock className="absolute left-3 top-3.5 text-violet-300" size={18} /><input type="password" required className="w-full pl-10 pr-4 py-3 bg-violet-50 border border-violet-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-400" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} /></div></div>
            <div className="flex justify-end"><button type="button" onClick={() => setShowRecover(true)} className="text-xs font-bold text-violet-600 hover:text-orange-500 transition">¿Olvidaste tu contraseña?</button></div>
            {error && <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl flex items-center gap-3 border border-red-100">{error}</div>}
            <button type="submit" disabled={checking} className="w-full bg-gradient-to-r from-violet-600 to-violet-800 text-white py-4 rounded-xl font-bold text-lg hover:from-orange-500 hover:to-orange-600 transition duration-300 shadow-xl disabled:opacity-70 flex justify-center items-center">{checking ? <RefreshCw className="animate-spin" /> : 'Ingresar al Portal'}</button>
          </form>
        ) : (
          <div className="animate-in fade-in slide-in-from-right">
              <div className="bg-violet-50 p-6 rounded-2xl text-center mb-6 border border-violet-100">
                <Key className="mx-auto text-violet-500 mb-2" size={40} />
                <h3 className="font-bold text-violet-900 text-lg mb-2">Solicitar Blanqueo</h3>
                <p className="text-sm text-gray-600 mb-4">Ingresa tu usuario para notificar a administración.</p>
                {recoverStatus === 'sent' ? (
                    <div className="bg-green-100 text-green-700 p-3 rounded-xl mb-4 text-sm font-bold flex items-center justify-center gap-2"><CheckCircle size={18} /> ¡Solicitud Enviada!</div>
                ) : (
                    <form onSubmit={handleRequestReset} className="mb-4">
                        <input className="w-full p-3 bg-white border border-violet-200 rounded-xl mb-3 text-center focus:ring-2 focus:ring-orange-400 outline-none" placeholder="Tu Usuario" value={recoverUser} onChange={(e) => setRecoverUser(e.target.value)} required />
                        <button type="submit" disabled={recoverStatus === 'sending'} className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition flex items-center justify-center gap-2">{recoverStatus === 'sending' ? <RefreshCw className="animate-spin" size={18} /> : <><Send size={18} /> Enviar Solicitud</>}</button>
                        {recoverStatus === 'error' && <p className="text-xs text-red-500 mt-2 font-bold">Error de red o usuario incorrecto.</p>}
                    </form>
                )}
              </div>
              <button onClick={() => {setShowRecover(false); setRecoverStatus('idle');}} className="w-full text-gray-500 font-bold py-3 hover:text-gray-700 transition">Volver al inicio</button>
          </div>
        )}
      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }) {
  return (
    <button 
      onClick={onClick} 
      className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 ${active ? 'text-orange-500 transform -translate-y-1' : 'text-gray-400 hover:text-violet-600'}`}
    >
      <div className={`relative p-2 rounded-2xl ${active ? 'bg-orange-50' : 'bg-transparent'}`}>
        {icon}
      </div>
      <span className={`text-[10px] font-bold ${active ? 'text-violet-900' : 'text-gray-400'}`}>{label}</span>
    </button>
  );
}

// --- APP PRINCIPAL ---
function MainApp({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const moreMenuRef = useRef(null);
  const profileMenuRef = useRef(null);
  const notifPanelRef = useRef(null);
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [students, setStudents] = useState([]);
  
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [globalViewingStudent, setGlobalViewingStudent] = useState(null);
  
  // POPUPS Y PWA HEADER
  const [showNotifRequest, setShowNotifRequest] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [showMaintenanceAlert, setShowMaintenanceAlert] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  const prevNotifCount = useRef(0);
  const isSuperAdmin = user.rol === 'super-admin' || user.rol === 'admin'; 
  const canManageContent = user.rol === 'admin' || isSuperAdmin || user.role === 'Equipo Directivo';
  
  const isAdminRole = ['admin', 'super-admin', 'Administración', 'Equipo Directivo', 'Dirección Inclusión'].includes(user?.role) || user?.rol === 'admin';
  const isTechTeamRole = ['admin', 'super-admin', 'Equipo Directivo', 'Dirección Inclusión', 'Equipo Técnico', 'Equipo Técnico Inclusión'].includes(user?.role) || user?.rol === 'admin';
  const isMedicalRole = ['admin', 'super-admin', 'Equipo Directivo', 'Dirección Inclusión', 'Médico', 'Enfermería', 'Salud'].includes(user?.role) || user?.rol === 'admin';
  const canAccessSocial = ['admin', 'super-admin', 'Docente', 'Auxiliar/Preceptor', 'Equipo Directivo', 'Equipo Técnico', 'Inclusión', 'DAI'].includes(user?.role) || user?.rol === 'admin';
  const canAccessInformesExternos = ['Equipo Directivo', 'Equipo Técnico', 'Equipo Técnico Inclusión', 'Administración', 'admin', 'super-admin'].includes(user?.role) || user?.rol === 'admin';
  const showPrivateMenu = isAdminRole || isTechTeamRole || isMedicalRole || canAccessSocial;

  const isWideTab = ['groups', 'calendar', 'matricula', 'resources', 'users', 'admin'].includes(activeTab);

  useEffect(() => {
    if (!db || !appId || !user?.id) return;

    updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id), {
      lastLogin: serverTimestamp()
    }).catch(() => {});

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isStandalone) setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const unsubTasks = onSnapshot(
      query(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), orderBy('dueDate', 'asc')),
      (snap) => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubEvents = onSnapshot(
      query(collection(db, 'artifacts', appId, 'public', 'data', 'events'), orderBy('date', 'asc')),
      (snap) => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubResources = onSnapshot(
      query(collection(db, 'artifacts', appId, 'public', 'data', 'resources'), orderBy('createdAt', 'desc')),
      (snap) => setResources(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubAnnounce = onSnapshot(
      query(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), orderBy('createdAt', 'desc')),
      (snap) => setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    const unsubMaint = onSnapshot(
      doc(db, 'artifacts', appId, 'public', 'data', 'config', 'maintenance'),
      (maintenanceDoc) => {
        const isActive = maintenanceDoc.exists() ? maintenanceDoc.data().active : false;
        setMaintenanceMode(isActive);
        if (isActive && user.rol !== 'super-admin') setShowMaintenanceAlert(true);
      }
    );

    const qNotifs = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'notifications'),
      where('toUserId', '==', user.id)
    );

    const unsubNotifs = onSnapshot(qNotifs, (snap) => {
      const all = snap.docs.map(notificationDoc => ({
        id: notificationDoc.id,
        ...notificationDoc.data()
      }));

      all.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() ?? (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
        const bTime = b.createdAt?.toMillis?.() ?? (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
        return bTime - aTime;
      });

      const unread = all.filter(n => !n.read);
      setNotifications(all);

      if (unread.length > prevNotifCount.current) {
        const latest = unread[0];

        if (latest && 'Notification' in window && Notification.permission === 'granted') {
          try {
            navigator.serviceWorker?.ready.then(registration => {
              registration.showNotification(`🔔 ${latest.title}`, {
                body: latest.message || '',
                icon: LOGO_URL,
                tag: `centra-${latest.id}`
              });
            });
          } catch (error) {
            console.warn('No se pudo mostrar la notificación del navegador:', error);
          }
        }
      }

      prevNotifCount.current = unread.length;
    });

    let notificationTimer = null;
    if ('Notification' in window && Notification.permission === 'default') {
      notificationTimer = setTimeout(() => setShowNotifRequest(true), 5000);
    }

    let unsubForegroundMessage = null;
    if ('Notification' in window && Notification.permission === 'granted' && app) {
      try {
        const messaging = getMessaging(app);

        unsubForegroundMessage = onMessage(messaging, (payload) => {
          const title = payload?.notification?.title || payload?.data?.title || 'Nueva notificación';
          const body = payload?.notification?.body || payload?.data?.body || '';

          try {
            navigator.serviceWorker?.ready.then(registration => {
              registration.showNotification(`🔔 ${title}`, {
                body,
                icon: LOGO_URL,
                tag: `centra-fcm-${Date.now()}`
              });
            });
          } catch (error) {
            console.warn('No se pudo mostrar el mensaje FCM:', error);
          }
        });
      } catch (error) {
        console.warn('Firebase Messaging todavía no está disponible:', error);
      }
    }

    return () => {
      unsubTasks();
      unsubNotifs();
      unsubEvents();
      unsubResources();
      unsubAnnounce();
      unsubMaint();
      unsubForegroundMessage?.();
      if (notificationTimer) clearTimeout(notificationTimer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [user.id, db, appId, isStandalone]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (showMoreMenu && !moreMenuRef.current?.contains(event.target)) {
        setShowMoreMenu(false);
      }

      if (showProfileMenu && !profileMenuRef.current?.contains(event.target)) {
        setShowProfileMenu(false);
      }

      if (showNotifPanel && !notifPanelRef.current?.contains(event.target)) {
        setShowNotifPanel(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setShowMoreMenu(false);
        setShowProfileMenu(false);
        setShowNotifPanel(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showMoreMenu, showProfileMenu, showNotifPanel]);

const handleInstallApp = async () => {
    if (deferredPrompt) {
      // Si el navegador ya tiene guardado el evento, se descarga de forma directa
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`Resultado: ${outcome}`);
      if (outcome === 'accepted') {
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else {
      // Si el navegador aún no liberó el evento directo, le damos instrucciones claras según el dispositivo
      const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
      
      if (isIOS) {
        alert("Para instalar en iPhone: Toca el botón 'Compartir' (abajo en el navegador) y luego 'Agregar a la pantalla de inicio'.");
      } else {
        alert("Para instalar la app, toca los tres puntos (menú superior derecho de tu navegador) y selecciona 'Instalar aplicación' o 'Agregar a la pantalla principal'.");
      }
    }
  };
  const handleGlobalSearch = async (text) => {
    setSearchQuery(text);

    if (text.length < 2 || !db || !appId) {
      setSearchResults([]);
      return;
    }

    try {
      const base = `artifacts/${appId}/public/data`;

      const [peopleSnap, profilesSnap] = await Promise.all([
        getDocs(collection(db, `${base}/people`)),
        getDocs(collection(db, `${base}/student_profiles`))
      ]);

      const profileMap = new Map(
        profilesSnap.docs.map(profileDoc => [
          profileDoc.id,
          { id: profileDoc.id, ...profileDoc.data() }
        ])
      );

      const needle = text.toLowerCase().trim();

      const results = peopleSnap.docs
        .map(personDoc => {
          const person = { id: personDoc.id, ...personDoc.data() };
          const profile = profileMap.get(person.id) || profileMap.get(person.personId) || {};

          return {
            ...person,
            ...profile,
            personId: person.id
          };
        })
        .filter(person => person.active !== false)
        .filter(person => {
          const haystack = [
            person.firstName,
            person.lastName,
            person.fullName,
            person.dni,
            person.email,
            person.phone
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          return haystack.includes(needle);
        })
        .sort((a, b) =>
          `${a.lastName || ''} ${a.firstName || ''}`.localeCompare(
            `${b.lastName || ''} ${b.firstName || ''}`,
            'es'
          )
        );

      setSearchResults(results.slice(0, 8));
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    }
  };

  const unreadNotifications = notifications.filter(n => !n.read);
  const unreadNotificationCount = unreadNotifications.length;

  const handleNotificationClick = async (n) => {
    if (!db || !appId) return;

    try {
      if (!n.read) {
        await updateDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'notifications', n.id),
          { read: true, readAt: serverTimestamp() }
        );
      }

      if (n.targetTab) setActiveTab(n.targetTab);
      setShowNotifPanel(false);
    } catch (err) {
      console.error('Error al abrir notificación:', err);
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!db || !appId || unreadNotifications.length === 0) return;

    try {
      await Promise.all(
        unreadNotifications.map(n =>
          updateDoc(
            doc(db, 'artifacts', appId, 'public', 'data', 'notifications', n.id),
            { read: true, readAt: serverTimestamp() }
          )
        )
      );
    } catch (err) {
      console.error('Error al marcar notificaciones como leídas:', err);
    }
  };

  const calculateAge = (d) => { 
    if (!d) return '-'; 
    const t = new Date(); 
    const b = new Date(d); 
    let a = t.getFullYear() - b.getFullYear(); 
    const m = t.getMonth() - b.getMonth(); 
    if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--; 
    return a; 
  };
  
  const enableNotifications = async () => {
    if (!('Notification' in window)) {
      alert('Este navegador no permite notificaciones.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();

      if (permission !== 'granted') {
        setShowNotifRequest(false);
        return;
      }

      if (!app) throw new Error('Firebase no está inicializado.');

      const messaging = getMessaging(app);
      const registration = await navigator.serviceWorker?.ready;

      const token = await getToken(messaging, {
        vapidKey: 'BLtqtHLQvIIDs53Or78_JwxhFNKZaQM6S7rD4gbRoanfoh_YtYSbFbGHCWyHtZgXuL6Dm3rCvirHgW6fB_FUXrw',
        ...(registration ? { serviceWorkerRegistration: registration } : {})
      });

      if (token && db && appId) {
        await updateDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id),
          {
            fcmTokens: arrayUnion(token),
            notificationsEnabled: true,
            notificationsUpdatedAt: serverTimestamp()
          }
        );
      }

      alert('¡Listo! CENTRA ya puede avisarte de novedades.');
    } catch (error) {
      console.error('FCM Error:', error);
      alert('No pudimos activar las notificaciones del dispositivo. Los avisos dentro de CENTRA seguirán funcionando.');
    } finally {
      setShowNotifRequest(false);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-gray-50 font-sans text-slate-800 overflow-hidden relative">
      <header className="bg-violet-800 text-white shadow-lg px-4 py-3 flex justify-between items-center z-50 sticky top-0 shrink-0">
        <div className="flex items-center space-x-3">
          <img src={LOGO_URL} alt="Logo" className="w-10 h-8 object-contain" />
          <div>
            <h1 className="font-bold text-sm leading-tight">Juntos a la Par</h1>
            <p className="text-[10px] text-orange-200 uppercase font-bold">{user.firstName}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setShowSearch(true);
              setShowNotifPanel(false);
              setShowProfileMenu(false);
              setShowMoreMenu(false);
            }}
            className="p-2 rounded-full bg-violet-900/50 hover:bg-orange-500 transition"
            title="Buscar"
          >
            <Search size={20} />
          </button>

          <div ref={notifPanelRef} className="relative">
            <button
              onClick={() => {
                setShowNotifPanel(value => !value);
                setShowProfileMenu(false);
                setShowMoreMenu(false);
              }}
              className={`p-2 rounded-full transition ${showNotifPanel ? 'bg-orange-500' : 'bg-violet-900/50'}`}
              title="Notificaciones"
            >
              <Bell size={20} />
              {unreadNotificationCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-4 h-4 px-1 flex items-center justify-center rounded-full animate-pulse border border-white">
                  {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                </span>
              )}
            </button>

            {showNotifPanel && (
              <div className="absolute right-0 mt-3 w-[min(22rem,calc(100vw-1rem))] bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[100]">
                <div className="p-4 bg-violet-50 border-b flex justify-between items-center gap-3">
                  <div>
                    <h3 className="font-bold text-violet-900 text-sm">Avisos</h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {unreadNotificationCount ? `${unreadNotificationCount} sin leer` : 'Todo al día'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {unreadNotificationCount > 0 && (
                      <button
                        onClick={handleMarkAllNotificationsRead}
                        className="text-[9px] font-black uppercase text-violet-600 hover:text-orange-500"
                      >
                        Marcar leídas
                      </button>
                    )}
                    <button onClick={() => setShowNotifPanel(false)} title="Cerrar">
                      <X size={16} className="text-gray-400"/>
                    </button>
                  </div>
                </div>

                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-10 text-center text-gray-400">
                      <Bell size={24} className="mx-auto mb-2 opacity-30"/>
                      <p className="text-xs font-bold uppercase">Sin novedades</p>
                    </div>
                  ) : (
                    notifications.slice(0, 20).map(n => (
                      <button
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`w-full text-left p-4 border-b last:border-b-0 hover:bg-gray-50 transition ${n.read ? 'bg-white' : 'bg-orange-50/50'}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${n.read ? 'bg-gray-200' : 'bg-orange-500'}`}/>
                          <div>
                            <p className={`text-[10px] font-bold mb-1 uppercase ${n.read ? 'text-gray-400' : 'text-orange-600'}`}>{n.title}</p>
                            <p className="text-xs text-gray-700 leading-relaxed">{n.message}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div ref={profileMenuRef} className="relative">
            <button
              onClick={() => {
                setShowProfileMenu(value => !value);
                setShowNotifPanel(false);
                setShowMoreMenu(false);
              }}
              className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold border-2 border-orange-400 overflow-hidden cursor-pointer active:scale-95 transition shadow-sm"
              title="Mi perfil"
            >
              {user.photoUrl ? (
                <img src={user.photoUrl} className="w-full h-full object-cover" alt="Tu perfil" />
              ) : (
                user.firstName?.[0] || user.fullName?.[0] || 'U'
              )}
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 mt-3 w-72 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[110]">
                <div className="p-4 bg-gradient-to-br from-violet-800 to-violet-700 text-white">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 overflow-hidden flex items-center justify-center font-black">
                      {user.photoUrl ? (
                        <img src={user.photoUrl} className="w-full h-full object-cover" alt="" />
                      ) : (
                        user.firstName?.[0] || user.fullName?.[0] || 'U'
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black truncate">{user.fullName || `${user.firstName || ''} ${user.lastName || ''}`}</p>
                      <p className="text-[10px] text-violet-200 uppercase font-bold mt-0.5 truncate">{user.role || user.rol || 'Usuario'}</p>
                      {user.email && <p className="text-[10px] text-white/70 mt-1 truncate">{user.email}</p>}
                    </div>
                  </div>
                </div>

                <div className="p-2">
                  <button
                    onClick={() => {
                      setActiveTab('profile');
                      setShowProfileMenu(false);
                    }}
                    className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-700 transition"
                  >
                    <User size={18} className="text-violet-500"/> Mi perfil
                  </button>

                  {!isStandalone && (
                    <button
                      onClick={() => {
                        handleInstallApp();
                        setShowProfileMenu(false);
                      }}
                      className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-700 transition"
                    >
                      <Download size={18} className="text-green-500"/> Instalar CENTRA
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      enableNotifications();
                    }}
                    className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-700 transition"
                  >
                    <Bell size={18} className="text-blue-500"/> Configurar notificaciones
                  </button>

                  <div className="my-1 border-t border-gray-100"/>

                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full text-left p-3 rounded-xl hover:bg-red-50 flex items-center gap-3 text-sm font-bold text-red-600 transition"
                  >
                    <LogOut size={18}/> Cerrar sesión
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* --- CARTEL MANTENIMIENTO --- */}
      {maintenanceMode && showMaintenanceAlert && (
          <div className="fixed top-16 left-0 right-0 z-[999] p-4 animate-in slide-in-from-top-5">
              <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl shadow-2xl p-5 text-white flex flex-col items-center gap-3 border-4 border-white/20 relative overflow-hidden">
                  <div className="flex items-center gap-3 z-10">
                      <div className="bg-white p-3 rounded-full text-orange-600"><Settings size={28}/></div>
                      <div className="text-center">
                          <h3 className="font-black uppercase text-lg leading-none">¡Estamos en Obra! 🚧</h3>
                          <p className="text-xs font-medium opacity-90 mt-1">Mejorando la App para vos.</p>
                      </div>
                  </div>
                  <button onClick={() => setShowMaintenanceAlert(false)} className="w-full bg-white text-orange-600 py-3 rounded-xl text-xs font-black uppercase">Entendido</button>
              </div>
          </div>
      )}

      {/* --- POPUP NOTIFICACIONES --- */}
      {showNotifRequest && (
        <div className="fixed inset-0 z-[400] flex items-end md:items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white rounded-[30px] p-6 w-full max-w-sm shadow-2xl text-center border-t-8 border-orange-500 mb-20 md:mb-0">
                  <Bell size={32} className="text-orange-500 mx-auto mb-4"/>
                  <h3 className="text-xl font-black text-gray-800">¡No te pierdas nada!</h3>
                  <p className="text-sm text-gray-500 mb-6">Activá los avisos urgentes.</p>
                  <div className="flex flex-col gap-3">
                      <button onClick={enableNotifications} className="w-full bg-violet-600 text-white font-bold py-3 rounded-xl">ACTIVAR AHORA</button>
                      <button onClick={() => setShowNotifRequest(false)} className="text-gray-400 text-xs font-bold uppercase">Ahora no</button>
                  </div>
             </div>
        </div>
      )}

      <main className={`flex-1 overflow-y-auto no-scrollbar pb-24 pt-6 mx-auto w-full transition-all duration-300 ${isWideTab ? 'px-2 max-w-[98%]' : 'px-4 max-w-4xl'}`}>
        {activeTab === 'dashboard' && <DashboardView user={user} db={db} appId={appId} tasks={tasks} events={events} announcements={announcements} setActiveTab={setActiveTab} />}
        {activeTab === 'calendar' && <CalendarView events={events} user={user} db={db} appId={appId} canEdit={canManageContent} />}
        {activeTab === 'tasks' && <TasksView tasks={tasks} user={user} db={db} appId={appId} />}
        {activeTab === 'matricula' && <MatriculaView user={user} db={db} appId={appId} initStudentId={selectedStudentId} />}
        {activeTab === 'groups' && <GroupsView user={user} db={db} appId={appId} setActiveTab={setActiveTab} onSelectStudent={setSelectedStudentId} />}
        {activeTab === 'resources' && <ResourcesView resources={resources} canEdit={canManageContent} db={db} appId={appId} user={user} />}
        {activeTab === 'social' && <SocialView user={user} db={db} appId={appId} />}
        {activeTab === 'profile' && <ProfileView user={user} tasks={tasks} onLogout={onLogout} isSuperAdmin={isSuperAdmin} db={db} appId={appId} />}
        {activeTab === 'proyecto' && <ProyectoView user={user} db={db} appId={appId} />}
        {activeTab === 'evaluations' && isTechTeamRole && <EvaluationsView user={user} db={db} appId={appId} />}
        {activeTab === 'notifications' && <NotificationsView notifications={notifications} canEdit={isSuperAdmin} user={user} />}

        {activeTab === 'users' && isSuperAdmin && db && <UsersAdminView db={db} appId={appId} />}
        {activeTab === 'personal' && isAdminRole && db && <PersonalView user={user} db={db} appId={appId} TURNS_LIST={TURNS_LIST} VALID_ROLES_OFFICIAL={VALID_ROLES_OFFICIAL} />}
        {activeTab === 'admin' && isAdminRole && db && <AdministracionView user={user} db={db} appId={appId} />}
        {activeTab === 'medical' && isMedicalRole && db && <MedicalView user={user} db={db} appId={appId} />}
  
        {activeTab === 'informes' && (<InformesView user={user} students={students} db={db} appId={appId} />)}
        {activeTab === 'informes_externos' && canAccessInformesExternos && (<InformesExternosView user={user} db={db} appId={appId} />)}
      </main>

      <nav className="fixed bottom-0 w-full bg-white border-t border-violet-100 h-16 z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] pb-safe shrink-0 text-center">
        <div className="grid grid-cols-5 h-full max-w-3xl mx-auto px-2 relative">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Inicio" />
          <NavButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckSquare size={20} />} label="Tareas" />
          
          <div className="relative -top-5 flex justify-center">
            <button onClick={() => setActiveTab('groups')} className={`w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-xl border-4 border-gray-50 transition-all transform active:scale-95 ${activeTab === 'groups' ? 'bg-orange-500 text-white scale-110' : 'bg-violet-600 text-white'}`}>
              <Grid size={24} />
            </button>
            <span className="absolute -bottom-4 text-[9px] font-black text-violet-900 uppercase tracking-wide whitespace-nowrap">Organización</span>
          </div>

          <NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<CalendarIcon size={20} />} label="Agenda" />
          
          <div className="relative">
            <NavButton active={['matricula', 'resources', 'proyecto', 'admin', 'personal', 'medical', 'social', 'users', 'informes', 'informes_externos', 'evaluations'].includes(activeTab)} onClick={() => setShowMoreMenu(!showMoreMenu)} icon={<List size={20} />} label="Más" />
            
            {showMoreMenu && (
              <div className="absolute bottom-16 right-0 bg-white rounded-3xl shadow-2xl border border-gray-100 p-2 w-64 animate-in slide-in-from-bottom-5 zoom-in-95 origin-bottom-right z-[100] max-h-[70vh] overflow-y-auto custom-scrollbar">
                <button onClick={() => { setActiveTab('matricula'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600 transition">
                  <GraduationCap size={18} className="text-violet-500"/> Legajos
                </button>
                <button onClick={() => { setActiveTab('resources'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600 transition">
                  <LinkIcon size={18} className="text-green-500"/> Recursos
                </button>
                <button onClick={() => { setActiveTab('proyecto'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600 transition">
                  <PieChart size={18} className="text-orange-500"/> Proyecto Inst.
                </button>
                <button onClick={() => { setActiveTab('informes'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600 transition">
                  <ClipboardCheck size={18} className="text-violet-500"/> Informes Pedagógicos
                </button>
                
                {showPrivateMenu && (
                  <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 mb-1 mt-1">Gestión Privada</p>
                    {isAdminRole && (
                      <>
                        <button onClick={() => { setActiveTab('admin'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-blue-50 flex items-center gap-3 text-sm font-bold text-blue-600 transition"><FileText size={18} className="text-blue-500"/> Admin Docs</button>
                        <button onClick={() => { setActiveTab('personal'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-violet-700 transition"><Users size={18} className="text-violet-500"/> Personal</button>
                      </>
                    )}
                    {canAccessInformesExternos && (
                      <button onClick={() => { setActiveTab('informes_externos'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600 transition">
                        <ExternalLink size={18} className="text-pink-500"/> Informes Externos
                      </button>
                    )}
                    {isTechTeamRole && <button onClick={() => { setActiveTab('evaluations'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl bg-orange-50 text-orange-950 flex items-center gap-3 text-sm font-black transition border border-orange-100/50 shadow-inner"><ClipboardCheck size={18} className="text-orange-600"/> Evaluación Áreas</button>}
                    {canAccessSocial && <button onClick={() => { setActiveTab('social'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-blue-50 flex items-center gap-3 text-sm font-bold text-gray-600 transition"><Users size={18} className="text-blue-500"/> Trabajo Social</button>}
                    {isMedicalRole && <button onClick={() => { setActiveTab('medical'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-red-50 flex items-center gap-3 text-sm font-bold text-red-600 transition"><Activity size={18} className="text-red-500"/> Médico</button>}
                    {isSuperAdmin && (
                      <>
                        <button onClick={() => { setActiveTab('users'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-red-50 flex items-center gap-3 text-sm font-bold text-red-700 transition border-t border-red-50 mt-1"><Shield size={18} className="text-red-500"/> Gestión Usuarios</button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </nav>

      {showSearch && ( 
        <div className="fixed inset-0 bg-violet-900/90 z-[300] flex flex-col p-4 backdrop-blur-md animate-in fade-in">
          <div className="flex justify-between items-center text-white mb-4"><h3 className="font-black italic uppercase">Buscador Rápido</h3><button onClick={() => {setShowSearch(false); setSearchQuery(''); setSearchResults([]);}} className="p-2 bg-white/20 rounded-full"><X/></button></div>
          <input autoFocus value={searchQuery} onChange={(e) => handleGlobalSearch(e.target.value)} placeholder="Escribí un nombre o apellido..." className="w-full p-4 rounded-2xl bg-white text-lg font-bold text-gray-800 outline-none shadow-xl mb-4"/>
          <div className="flex-1 overflow-y-auto space-y-2">
            {searchResults.map(s => (
              <div key={s.id} onClick={() => setGlobalViewingStudent(s)} className="bg-white p-3 rounded-xl flex items-center gap-3 active:scale-95 transition cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">{s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{s.firstName[0]}</div>}</div>
                <div><p className="font-bold text-gray-800 text-sm">{s.lastName}, {s.firstName}</p><p className="text-[10px] text-gray-500">{s.level} • {s.groupMorning || s.groupAfternoon || 'Sin Grupo'}</p></div>
              </div>
            ))}
            {searchQuery.length > 2 && searchResults.length === 0 && <p className="text-white/50 text-center mt-4">No se encontraron resultados.</p>}
          </div>
        </div> 
      )}
       
      {globalViewingStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[350] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="bg-violet-600 p-4 text-white flex justify-between items-center"><h3 className="font-bold text-lg">{globalViewingStudent.lastName}, {globalViewingStudent.firstName}</h3><button onClick={() => setGlobalViewingStudent(null)}><X/></button></div>
            <div className="p-6">
              <div className="flex gap-4 items-center mb-4">
                <div className="w-20 h-20 bg-gray-200 rounded-2xl overflow-hidden">{globalViewingStudent.photoUrl && <img src={globalViewingStudent.photoUrl} className="w-full h-full object-cover"/>}</div>
                <div><p className="text-sm font-bold text-gray-600">Edad: {calculateAge(globalViewingStudent.birthDate)} años</p><p className="text-sm font-bold text-gray-600">DNI: {globalViewingStudent.dni}</p><p className="text-xs text-orange-500 font-bold mt-1 uppercase">{globalViewingStudent.dx}</p></div>
              </div>
              <button onClick={() => { setActiveTab('matricula'); setShowSearch(false); setGlobalViewingStudent(null); alert("Te llevamos a Legajos. Buscalo ahí para ver más."); }} className="w-full bg-violet-100 text-violet-700 py-3 rounded-xl font-bold text-xs uppercase hover:bg-violet-200 transition">Ir a Legajo Completo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StartIcon({size}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
    </svg>
  );
}
