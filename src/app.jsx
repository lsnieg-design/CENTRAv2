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
import { ProyectoView } from './views/ProyectoView';
import { EvaluationsView } from './views/EvaluationsView';
import { ConfiguracionView } from './views/ConfiguracionView';
import { InformesView } from './views/InformesView';
import { InformesExternosView } from './views/InformesExternosView';
import { getCachedAppConfig, normalizeAppConfig, applyBranding, getRolePermissions, canAccessModule } from './config';

import { 
  Calendar as CalendarIcon, CheckSquare, Settings, User, FileText, CheckCircle, 
  Download, RefreshCw, Plus, Trash2, Users, AlertCircle, LogOut, Briefcase, 
  Lock, List, Grid, ChevronLeft, ChevronRight, Bell, Check, HelpCircle, Mail, Camera, MapPin, 
  Send, Key, Filter, LayoutDashboard, Link as LinkIcon, ExternalLink, Zap,
  AlertTriangle, Clock, Shield, Crown, Activity, Share, PlusSquare, 
  Smartphone, GraduationCap, Search, X, UploadCloud, PieChart, Eye, Edit3, Trophy,
  Folder, MessageSquare, Globe, BookOpen, Lightbulb, ChevronDown, PlusCircle, Printer,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Phone, CheckCircle2, Clock3, UserCheck,
  ChevronUp, ClipboardCheck, EyeOff
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, 
  updateDoc, setDoc, deleteDoc, where, getDocs, getDoc, serverTimestamp, arrayUnion, arrayRemove, limit,increment 
} from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from "firebase/messaging";
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

function SplashScreen({ config = getCachedAppConfig() }) {
  const primary = config?.primaryColor || '#6d28d9';
  const secondary = config?.secondaryColor || '#f97316';
  const logo = config?.logoUrl || LOGO_URL;
  const title = config?.portalTitle || `Portal ${config?.institutionShortName || config?.institutionName || 'Institucional'}`;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
      style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
    >
      <div className="bg-white p-6 rounded-[40px] shadow-2xl">
        <img src={logo} alt="Logo institucional" className="w-32 h-32 object-contain" />
      </div>
      <h1 className="mt-8 text-3xl font-black text-white tracking-tight uppercase text-center px-6">
        {title}
      </h1>
      <p className="text-white/70 text-xs font-bold mt-2 uppercase tracking-[4px]">Cargando sistema...</p>
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
  const [appConfig, setAppConfig] = useState(() => getCachedAppConfig());
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(false);

  // La configuración institucional se carga antes del login.
  // Así logo, nombre y colores funcionan también cuando nadie inició sesión.
  useEffect(() => {
    let active = true;

    const loadInstitutionConfig = async () => {
      const cached = getCachedAppConfig();
      if (active) {
        setAppConfig(cached);
        applyBranding(cached);
      }

      if (!db || !appId) {
        setConfigError(true);
        setLoading(false);
        return;
      }

      try {
        const ref = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'institution');
        const snap = await getDoc(ref);
        const next = normalizeAppConfig(snap.exists() ? snap.data() : cached);

        if (!active) return;

        setAppConfig(next);
        applyBranding(next);
        try {
          localStorage.setItem('institution_app_config', JSON.stringify(next));
        } catch {}
      } catch (error) {
        console.warn('No se pudo cargar la configuración institucional:', error);
        // Si Firestore falla, seguimos con el cache local si existe.
        if (active) {
          setAppConfig(cached);
          applyBranding(cached);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadInstitutionConfig();
    return () => { active = false; };
  }, []);

  // Firebase Authentication queda como fuente real de identidad.
  // Ya no iniciamos sesión anónima automáticamente.
  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseAuthUser) => {
      setFirebaseUser(firebaseAuthUser);

      if (!firebaseAuthUser) {
        setCurrentUserProfile(null);
        localStorage.removeItem('schoolApp_profile');
        return;
      }

      try {
        const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
        let profileSnap = await getDocs(
          query(usersRef, where('uid', '==', firebaseAuthUser.uid), limit(1))
        );

        // Compatibilidad con perfiles creados antes de migrar a Firebase Auth.
        if (profileSnap.empty && firebaseAuthUser.email) {
          profileSnap = await getDocs(
            query(usersRef, where('email', '==', firebaseAuthUser.email.toLowerCase()), limit(1))
          );
        }

        if (profileSnap.empty) {
          console.error('AUTH OK, pero no existe perfil institucional para:', firebaseAuthUser.uid);
          await signOut(auth).catch(() => {});
          setCurrentUserProfile(null);
          alert('La cuenta de Firebase existe, pero todavía no tiene un perfil institucional en CENTRA.');
          return;
        }

        const userDoc = profileSnap.docs[0];
        const userData = userDoc.data();
        const profile = {
          ...userData,
          id: userDoc.id,
          uid: firebaseAuthUser.uid,
          email: firebaseAuthUser.email || userData.email || '',
          isAdmin: userData.rol === 'admin' || userData.rol === 'super-admin'
        };

        // Vinculamos una cuenta antigua con su UID de Firebase la primera vez.
        if (userData.uid !== firebaseAuthUser.uid) {
          await updateDoc(userDoc.ref, {
            uid: firebaseAuthUser.uid,
            lastLogin: serverTimestamp()
          });
        } else {
          await updateDoc(userDoc.ref, { lastLogin: serverTimestamp() });
        }

        setCurrentUserProfile(profile);
        localStorage.setItem('schoolApp_profile', JSON.stringify(profile));
      } catch (error) {
        console.error('Error cargando perfil institucional:', error);
        await signOut(auth).catch(() => {});
        setCurrentUserProfile(null);
        alert(`La cuenta ingresó a Firebase, pero no se pudo cargar el perfil institucional.\n\n${error?.message || 'Error desconocido'}`);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      if (auth?.currentUser) await signOut(auth);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      setCurrentUserProfile(null);
      localStorage.removeItem('schoolApp_profile');
    }
  };

  if (loading) return <SplashScreen config={appConfig} />;
  if (configError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center" style={{ background: appConfig.backgroundColor }}>
        <AlertCircle className="w-16 h-16 mb-4" style={{ color: appConfig.primaryColor }} />
        <h1 className="text-xl font-black" style={{ color: appConfig.textColor }}>No se pudo iniciar CENTRA</h1>
        <p className="text-sm text-slate-500 mt-2">Revisá la configuración de Firebase.</p>
      </div>
    );
  }

  if (!currentUserProfile) {
    return <LoginScreen auth={auth} db={db} appId={appId} config={appConfig} />;
  }

  return <MainApp user={currentUserProfile} onLogout={handleLogout} />;
}

function LoginScreen({ auth, db, appId, config }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRecover, setShowRecover] = useState(false);
  const [recoverUser, setRecoverUser] = useState('');
  const [recoverStatus, setRecoverStatus] = useState('idle');

  const [showInstall, setShowInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIos, setIsIos] = useState(false);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  const primary = config?.primaryColor || '#6d28d9';
  const secondary = config?.secondaryColor || '#f97316';
  const background = config?.backgroundColor || '#f8fafc';
  const text = config?.textColor || '#1e293b';
  const logo = config?.logoUrl || LOGO_URL;
  const institutionName = config?.institutionName || 'Mi Institución';
  const shortName = config?.institutionShortName || institutionName;
  const portalTitle = config?.portalTitle || `Portal ${shortName}`;

  useEffect(() => {
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIos(ios);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isStandalone) setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    if (ios && !isStandalone) setTimeout(() => setShowInstall(true), 2000);

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [isStandalone]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setShowInstall(false);
    setDeferredPrompt(null);
  };

  const resolveEmail = async (value) => {
    const clean = value.trim().toLowerCase();
    if (clean.includes('@')) return clean;

    if (!db || !appId) throw new Error('Firestore no está disponible.');

    const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
    const snapshot = await getDocs(
      query(usersRef, where('username', '==', clean), limit(1))
    );

    if (snapshot.empty) {
      throw new Error('USER_NOT_FOUND');
    }

    const userData = snapshot.docs[0].data();
    if (!userData.email) {
      throw new Error('USER_WITHOUT_EMAIL');
    }

    return String(userData.email).trim().toLowerCase();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setChecking(true);

    try {
      if (!auth) throw new Error('AUTH_UNAVAILABLE');

      const email = await resolveEmail(username);
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged se encarga de cargar el perfil institucional.
    } catch (err) {
      console.error('LOGIN ERROR:', { code: err?.code, message: err?.message });

      if (err?.message === 'USER_NOT_FOUND') {
        setError('No encontramos ese usuario. Revisá el usuario o correo.');
      } else if (err?.message === 'USER_WITHOUT_EMAIL') {
        setError('Esta cuenta todavía no tiene un correo asociado.');
      } else if (err?.code === 'auth/invalid-credential' || err?.code === 'auth/wrong-password' || err?.code === 'auth/user-not-found') {
        setError('Usuario o contraseña incorrectos.');
      } else if (err?.code === 'auth/too-many-requests') {
        setError('Hubo demasiados intentos. Esperá unos minutos y volvé a probar.');
      } else if (err?.code === 'auth/operation-not-allowed') {
        setError('El acceso con correo y contraseña todavía no está habilitado en Firebase Authentication.');
      } else {
        setError(err?.message || 'No se pudo iniciar sesión.');
      }
    } finally {
      setChecking(false);
    }
  };

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!recoverUser.trim()) return;
    setRecoverStatus('sending');

    try {
      const email = await resolveEmail(recoverUser);
      if (!auth) throw new Error('AUTH_UNAVAILABLE');

      await sendPasswordResetEmail(auth, email);
      setRecoverStatus('sent');
    } catch (error) {
      console.error('RESET ERROR:', error);
      setRecoverStatus('error');
      setTimeout(() => setRecoverStatus('idle'), 4000);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6 relative"
      style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
    >
      {!isStandalone && showInstall && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[35px] shadow-2xl p-6 w-full max-w-sm text-center mb-4 md:mb-0 relative" style={{ borderTop: `8px solid ${primary}` }}>
            <button onClick={() => setShowInstall(false)} className="absolute top-4 right-4 text-gray-300 hover:text-gray-500"><X size={24}/></button>
            <div className="flex justify-center mb-4">
              <div className="p-4 rounded-full animate-bounce" style={{ background: `${primary}18`, color: primary }}>
                <Smartphone size={40} />
              </div>
            </div>
            <h3 className="text-2xl font-black text-gray-800 mb-2 leading-tight">¡Instalá la App!</h3>
            <p className="text-sm text-gray-500 mb-6 font-medium">Para tener acceso rápido y recibir notificaciones importantes, instalá la app en tu celular.</p>
            <div className="space-y-3">
              {!isIos ? (
                <button onClick={handleInstallClick} className="w-full text-white font-bold py-4 px-4 rounded-2xl shadow-xl transition flex items-center justify-center gap-2 text-sm uppercase tracking-wide" style={{ background: primary }}>
                  <Download size={20}/> Instalar Ahora
                </button>
              ) : (
                <div className="text-left bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs text-gray-600 space-y-3">
                  <p className="font-bold text-center uppercase tracking-wider mb-2" style={{ color: primary }}>Cómo instalar en iPhone:</p>
                  <div className="flex items-center gap-3"><div className="bg-white p-2 rounded-lg shadow-sm text-blue-500"><Share size={18}/></div><span>1. Tocá el botón <b>Compartir</b>.</span></div>
                  <div className="flex items-center gap-3"><div className="bg-white p-2 rounded-lg shadow-sm"><PlusSquare size={18}/></div><span>2. Elegí <b>Agregar a Inicio</b>.</span></div>
                  <div className="flex items-center gap-3"><div className="bg-white p-2 rounded-lg shadow-sm font-bold text-blue-500 text-[10px]">Add</div><span>3. Tocá <b>Agregar</b>.</span></div>
                </div>
              )}
              <button onClick={() => setShowInstall(false)} className="text-gray-400 font-bold text-xs uppercase hover:text-gray-600 mt-2">Usar navegador por ahora</button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-3xl shadow-2xl p-8 w-full max-w-md relative z-0" style={{ background, color: text }}>
        <div className="text-center mb-8">
          <div className="flex justify-center mb-5">
            <div className="w-28 h-28 rounded-3xl bg-white p-3 shadow-sm flex items-center justify-center">
              <img src={logo} alt={`Logo de ${institutionName}`} className="max-w-full max-h-full object-contain" />
            </div>
          </div>
          <p className="text-xs font-black uppercase tracking-[0.2em] opacity-60 mb-2">{institutionName}</p>
          <h1 className="text-2xl font-black tracking-tight uppercase" style={{ color: primary }}>{portalTitle}</h1>
        </div>

        {!showRecover ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-black uppercase mb-2 ml-1" style={{ color: primary }}>Usuario o correo electrónico</label>
              <div className="relative group">
                <User className="absolute left-3 top-3.5 opacity-40" size={18} />
                <input type="text" required autoComplete="username" className="w-full pl-10 pr-4 py-3 rounded-xl outline-none border border-black/10 focus:ring-2" style={{ background: `${primary}0D`, color: text, '--tw-ring-color': primary }} placeholder="usuario o correo" value={username} onChange={(e) => setUsername(e.target.value)} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase mb-2 ml-1" style={{ color: primary }}>Contraseña</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-3.5 opacity-40" size={18} />
                <input type={showPassword ? 'text' : 'password'} required autoComplete="current-password" className="w-full pl-10 pr-12 py-3 rounded-xl outline-none border border-black/10 focus:ring-2" style={{ background: `${primary}0D`, color: text, '--tw-ring-color': primary }} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPassword(value => !value)} className="absolute right-3 top-2.5 p-1.5 rounded-lg opacity-50 hover:opacity-100 transition" style={{ color: primary }} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>} 
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" onClick={() => setShowRecover(true)} className="text-xs font-bold transition" style={{ color: primary }}>¿Olvidaste tu contraseña?</button>
            </div>

            {error && <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100">{error}</div>}

            <button type="submit" disabled={checking} className="w-full text-white py-4 rounded-xl font-black text-lg transition shadow-xl disabled:opacity-70 flex justify-center items-center" style={{ background: primary }}>
              {checking ? <RefreshCw className="animate-spin" /> : 'Ingresar al Portal'}
            </button>
          </form>
        ) : (
          <div className="animate-in fade-in slide-in-from-right">
            <div className="p-6 rounded-2xl text-center mb-6 border" style={{ background: `${primary}0D`, borderColor: `${primary}25` }}>
              <Key className="mx-auto mb-2" style={{ color: primary }} size={40} />
              <h3 className="font-black text-lg mb-2" style={{ color: primary }}>Restablecer contraseña</h3>
              <p className="text-sm text-gray-600 mb-4">Ingresá tu usuario o correo y te enviaremos un enlace para crear una nueva contraseña.</p>

              {recoverStatus === 'sent' ? (
                <div className="bg-green-100 text-green-700 p-3 rounded-xl mb-4 text-sm font-bold flex items-center justify-center gap-2"><CheckCircle size={18} /> ¡Correo enviado!</div>
              ) : (
                <form onSubmit={handleRequestReset} className="mb-4">
                  <input className="w-full p-3 bg-white border border-black/10 rounded-xl mb-3 text-center outline-none" placeholder="Tu usuario o correo" value={recoverUser} onChange={(e) => setRecoverUser(e.target.value)} required />
                  <button type="submit" disabled={recoverStatus === 'sending'} className="w-full text-white py-3 rounded-xl font-bold transition flex items-center justify-center gap-2" style={{ background: secondary }}>
                    {recoverStatus === 'sending' ? <RefreshCw className="animate-spin" size={18} /> : <><Send size={18} /> Enviar enlace</>}
                  </button>
                  {recoverStatus === 'error' && <p className="text-xs text-red-500 mt-2 font-bold">No pudimos encontrar una cuenta con esos datos.</p>}
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
  const primary = 'var(--app-primary, #6d28d9)';
  const soft = 'var(--app-primary-soft, #f3e8ff)';
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 ${active ? 'transform -translate-y-1' : 'text-gray-400 hover:opacity-80'}`}
      style={{ color: active ? primary : undefined }}
    >
      <div
        className="relative p-2 rounded-2xl transition-colors duration-200"
        style={{ background: active ? soft : 'transparent' }}
      >
        {icon}
      </div>
      <span className="text-[10px] font-bold" style={{ color: active ? primary : '#9ca3af' }}>{label}</span>
    </button>
  );
}

// --- APP PRINCIPAL ---
function MainApp({ user: initialUser, onLogout }) {
  const [user, setUser] = useState(initialUser);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [groupMessages, setGroupMessages] = useState([]);
  const [students, setStudents] = useState([]);
  const [appConfig, setAppConfig] = useState(() => normalizeAppConfig(getCachedAppConfig()));

  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [globalViewingStudent, setGlobalViewingStudent] = useState(null);
  const [showNotifRequest, setShowNotifRequest] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [showMaintenanceAlert, setShowMaintenanceAlert] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [seenAutoNotificationIds, setSeenAutoNotificationIds] = useState(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(`centra_seen_auto_notifications_${initialUser?.id || 'user'}`) || '[]'));
    } catch {
      return new Set();
    }
  });

  const moreMenuRef = useRef(null);
  const profileMenuRef = useRef(null);
  const notifPanelRef = useRef(null);
  const prevNotifCount = useRef(0);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

  // Nivel de acceso del sistema: esto es distinto del rol institucional.
  // `rol` identifica el nivel técnico de administración; `role` identifica
  // el rol institucional configurado en Configuración.
  const isSuperAdmin = user?.rol === 'super-admin' || user?.rol === 'admin';

  // Los permisos de módulos salen de Configuración > Usuarios y permisos.
  // Así un rol nuevo puede funcionar sin tener que editar App.jsx.
  const hasModule = (moduleId) => {
    // El super-admin de la instalación conserva acceso total.
    // Los permisos configurables se aplican a los usuarios institucionales comunes.
    if (isSuperAdmin) return true;
    return canAccessModule(appConfig, user?.role, moduleId);
  };

  const rolePermissions = getRolePermissions(appConfig, user?.role);
  const canManageContent = isSuperAdmin || !!rolePermissions.admin;
  const isAdminRole = hasModule('admin') || hasModule('personal');
  const isTechTeamRole = hasModule('evaluations');
  const isMedicalRole = hasModule('medical');
  const canAccessSocial = hasModule('social');
  const canAccessInformesExternos = hasModule('informes_externos');
  const showPrivateMenu = isSuperAdmin || [
    'admin', 'personal', 'informes_externos', 'evaluations', 'social', 'medical'
  ].some(hasModule);

  const normalizeConfig = (data = {}) => normalizeAppConfig(data);

  useEffect(() => {
    if (!db || !appId) return;
    const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'institution');
    const unsub = onSnapshot(configRef, (snap) => {
      if (snap.exists()) {
        const next = normalizeConfig(snap.data());
        setAppConfig(next);
        try { localStorage.setItem('institution_app_config', JSON.stringify(next)); } catch {}
      }
    }, (error) => console.warn('No se pudo escuchar la configuración institucional:', error));
    return () => unsub();
  }, [db, appId, user?.id, isSuperAdmin]);

  useEffect(() => {
    try {
      const cached = JSON.parse(localStorage.getItem('institution_app_config') || 'null');
      if (cached) setAppConfig(normalizeConfig(cached));
    } catch {}
  }, []);

  useEffect(() => {
    if (!hasModule('personal') && activeTab === 'personal') setActiveTab('dashboard');
    if (!hasModule('admin') && activeTab === 'admin') setActiveTab('dashboard');
    if (!hasModule('medical') && activeTab === 'medical') setActiveTab('dashboard');
    if (!hasModule('social') && activeTab === 'social') setActiveTab('dashboard');
    if (!hasModule('evaluations') && activeTab === 'evaluations') setActiveTab('dashboard');
    if (!hasModule('informes') && activeTab === 'informes') setActiveTab('dashboard');
    if (!hasModule('informes_externos') && activeTab === 'informes_externos') setActiveTab('dashboard');
  }, [appConfig.activeModules, appConfig.features, activeTab]);

  useEffect(() => {
    if (!db || !appId || !user?.id) return;

    updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id), { lastLogin: serverTimestamp() }).catch(() => {});

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isStandalone) setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const unsubTasks = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), (snap) => {
      setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubEvents = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'events'), (snap) => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubResources = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'resources'), (snap) => {
      setResources(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubAnnounce = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), (snap) => {
      setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubMural = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'group_mural'), (snap) => {
      setGroupMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubMaint = onSnapshot(
      doc(db, 'artifacts', appId, 'public', 'data', 'config', 'maintenance'),
      (maintenanceDoc) => {
        const isActive = maintenanceDoc.exists() ? maintenanceDoc.data().active : false;
        setMaintenanceMode(isActive);
        if (isActive && user?.rol !== 'super-admin') setShowMaintenanceAlert(true);
      }
    );

    const unsubNotifs = onSnapshot(
      query(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), where('toUserId', '==', user.id)),
      (snap) => {
        const all = snap.docs.map(notificationDoc => ({ id: notificationDoc.id, ...notificationDoc.data(), source: 'firestore' }));
        all.sort((a, b) => getNotificationTime(b) - getNotificationTime(a));
        setNotifications(all);

        const unread = all.filter(n => !n.read);
        if (unread.length > prevNotifCount.current) {
          const latest = unread[0];
          if (latest && 'Notification' in window && Notification.permission === 'granted') {
            navigator.serviceWorker?.ready.then(registration => {
              registration.showNotification(`🔔 ${latest.title}`, {
                body: latest.message || '',
                icon: appConfig.logoUrl || LOGO_URL,
                tag: `centra-${latest.id}`
              });
            }).catch(() => {});
          }
        }
        prevNotifCount.current = unread.length;
      }
    );

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
          navigator.serviceWorker?.ready.then(registration => {
            registration.showNotification(`🔔 ${title}`, {
              body,
              icon: appConfig.logoUrl || LOGO_URL,
              tag: `centra-fcm-${Date.now()}`
            });
          }).catch(() => {});
        });
      } catch (error) {
        console.warn('Firebase Messaging todavía no está disponible:', error);
      }
    }

    return () => {
      unsubTasks(); unsubEvents(); unsubResources(); unsubAnnounce(); unsubMural(); unsubNotifs(); unsubMaint();
      unsubForegroundMessage?.();
      if (notificationTimer) clearTimeout(notificationTimer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [user?.id, user?.role, appConfig.logoUrl, db, appId, isStandalone]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (showMoreMenu && !moreMenuRef.current?.contains(event.target)) setShowMoreMenu(false);
      if (showProfileMenu && !profileMenuRef.current?.contains(event.target)) setShowProfileMenu(false);
      if (showNotifPanel && !notifPanelRef.current?.contains(event.target)) setShowNotifPanel(false);
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

  const getDateValue = (value) => {
    if (!value) return 0;
    if (typeof value?.toMillis === 'function') return value.toMillis();
    if (typeof value?.seconds === 'number') return value.seconds * 1000;
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const getNotificationTime = (item) =>
    getDateValue(item?.createdAt) || getDateValue(item?.updatedAt) || getDateValue(item?.date);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') setIsInstallable(false);
      setDeferredPrompt(null);
      return;
    }
    const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
    if (isIOS) {
      alert("Para instalar en iPhone: tocá 'Compartir' y luego 'Agregar a la pantalla de inicio'.");
    } else {
      alert("Para instalar CENTRA: abrí el menú de tu navegador y elegí 'Instalar aplicación' o 'Agregar a la pantalla principal'.");
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
        profilesSnap.docs.map(profileDoc => [profileDoc.id, { id: profileDoc.id, ...profileDoc.data() }])
      );
      const needle = text.toLowerCase().trim();
      const results = peopleSnap.docs
        .map(personDoc => {
          const person = { id: personDoc.id, ...personDoc.data() };
          const profile = profileMap.get(person.id) || profileMap.get(person.personId) || {};
          return { ...person, ...profile, personId: person.id };
        })
        .filter(person => person.active !== false)
        .filter(person => [person.firstName, person.lastName, person.fullName, person.dni, person.email, person.phone].filter(Boolean).join(' ').toLowerCase().includes(needle))
        .sort((a, b) => `${a.lastName || ''} ${a.firstName || ''}`.localeCompare(`${b.lastName || ''} ${b.firstName || ''}`, 'es'));
      setSearchResults(results.slice(0, 8));
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
  };

  const autoNotifications = React.useMemo(() => {
    const now = Date.now();
    const recent = now - 1000 * 60 * 60 * 24 * 30;
    const result = [];
    const roleValues = [user?.role, user?.rol].filter(Boolean);

    (tasks || []).forEach(task => {
      const assignedUserIds = Array.isArray(task.targetUserIds) ? task.targetUserIds : [];
      const assignedRoles = Array.isArray(task.targetRoles) ? task.targetRoles : [];
      const isAssigned = assignedUserIds.includes(user?.id) || assignedRoles.some(role => roleValues.includes(role));
      const createdAt = getNotificationTime(task);
      if (isAssigned && createdAt >= recent) {
        result.push({
          id: `auto-task-${task.id}`,
          title: 'Nueva tarea asignada',
          message: task.title || 'Tenés una tarea nueva.',
          targetTab: 'tasks',
          createdAt: task.createdAt || task.updatedAt || task.dueDate,
          source: 'auto',
          read: seenAutoNotificationIds.has(`auto-task-${task.id}`),
          icon: CheckSquare
        });
      }
    });

    (events || []).forEach(event => {
      const createdAt = getNotificationTime(event);
      if (createdAt >= recent) {
        result.push({
          id: `auto-event-${event.id}`,
          title: 'Novedad en Agenda',
          message: event.title || 'Se agregó una novedad al calendario.',
          targetTab: 'calendar',
          createdAt: event.createdAt || event.updatedAt || event.date,
          source: 'auto',
          read: seenAutoNotificationIds.has(`auto-event-${event.id}`),
          icon: CalendarIcon
        });
      }
    });

    (announcements || []).forEach(announcement => {
      const createdAt = getNotificationTime(announcement);
      if (createdAt >= recent) {
        result.push({
          id: `auto-announcement-${announcement.id}`,
          title: 'Novedad institucional',
          message: announcement.title || announcement.message || 'Hay una nueva comunicación institucional.',
          targetTab: 'dashboard',
          createdAt: announcement.createdAt,
          source: 'auto',
          read: seenAutoNotificationIds.has(`auto-announcement-${announcement.id}`),
          icon: Bell
        });
      }
    });

    (resources || []).forEach(resource => {
      const createdAt = getNotificationTime(resource);
      if (createdAt >= recent) {
        result.push({
          id: `auto-resource-${resource.id}`,
          title: 'Nuevo recurso',
          message: resource.title || resource.name || 'Se agregó un nuevo recurso institucional.',
          targetTab: 'resources',
          createdAt: resource.createdAt,
          source: 'auto',
          read: seenAutoNotificationIds.has(`auto-resource-${resource.id}`),
          icon: LinkIcon
        });
      }
    });

    (groupMessages || []).forEach(message => {
      const createdAt = getNotificationTime(message);
      if (createdAt >= recent) {
        result.push({
          id: `auto-group-${message.id}`,
          title: `Novedad en ${message.groupName || 'Organización'}`,
          message: message.text || 'Hay una nueva intervención en un grupo.',
          targetTab: 'groups',
          createdAt: message.createdAt,
          source: 'auto',
          read: seenAutoNotificationIds.has(`auto-group-${message.id}`),
          icon: Grid
        });
      }
    });

    return result;
  }, [tasks, events, resources, announcements, groupMessages, seenAutoNotificationIds, user?.id, user?.role, user?.rol]);

  const allNotifications = React.useMemo(() => {
    return [...notifications, ...autoNotifications]
      .sort((a, b) => getNotificationTime(b) - getNotificationTime(a))
      .slice(0, 60);
  }, [notifications, autoNotifications]);

  const unreadNotifications = allNotifications.filter(n => !n.read);
  const unreadNotificationCount = unreadNotifications.length;

  const markAutoNotificationRead = (id) => {
    setSeenAutoNotificationIds(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem(`centra_seen_auto_notifications_${user?.id || 'user'}`, JSON.stringify([...next]));
      return next;
    });
  };

  const handleNotificationClick = async (notification) => {
    if (notification.source === 'auto') {
      markAutoNotificationRead(notification.id);
    } else if (!notification.read && db && appId) {
      try {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notifications', notification.id), { read: true, readAt: serverTimestamp() });
      } catch (error) {
        console.error('Error al marcar notificación:', error);
      }
    }
    if (notification.targetTab) setActiveTab(notification.targetTab);
    setShowNotifPanel(false);
  };

  const handleMarkAllNotificationsRead = async () => {
    if (db && appId) {
      const firestoreUnread = notifications.filter(n => !n.read);
      await Promise.all(firestoreUnread.map(n => updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notifications', n.id), { read: true, readAt: serverTimestamp() }).catch(() => {})));
    }
    const autoUnread = autoNotifications.filter(n => !n.read).map(n => n.id);
    if (autoUnread.length) {
      setSeenAutoNotificationIds(prev => {
        const next = new Set(prev);
        autoUnread.forEach(id => next.add(id));
        localStorage.setItem(`centra_seen_auto_notifications_${user?.id || 'user'}`, JSON.stringify([...next]));
        return next;
      });
    }
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
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id), {
          fcmTokens: arrayUnion(token),
          notificationsEnabled: true,
          notificationsUpdatedAt: serverTimestamp()
        }, { merge: true });
      }
      alert('¡Listo! CENTRA ya puede mostrarte los avisos del dispositivo.');
    } catch (error) {
      console.error('FCM Error:', error);
      alert('No pudimos activar las notificaciones del dispositivo. Los avisos dentro de CENTRA seguirán funcionando.');
    } finally {
      setShowNotifRequest(false);
    }
  };

  const calculateAge = (d) => {
    if (!d) return '-';
    const today = new Date();
    const birth = new Date(d);
    let age = today.getFullYear() - birth.getFullYear();
    const month = today.getMonth() - birth.getMonth();
    if (month < 0 || (month === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const closeAllMenus = () => {
    setShowMoreMenu(false);
    setShowProfileMenu(false);
    setShowNotifPanel(false);
  };

  const navigate = (tab) => {
    setActiveTab(tab);
    closeAllMenus();
  };

  const isWideTab = ['groups', 'calendar', 'matricula', 'resources', 'users', 'admin', 'personal'].includes(activeTab);
  const brandLogo = appConfig.logoUrl || LOGO_URL;
  const institutionName = appConfig.institutionShortName || appConfig.institutionName || 'Mi Institución';
  const primaryColor = appConfig.primaryColor || '#6d28d9';
  const secondaryColor = appConfig.secondaryColor || '#f97316';
  const backgroundColor = appConfig.backgroundColor || '#f8fafc';

  useEffect(() => {
    applyBranding(appConfig);
  }, [appConfig]);

  return (
    <div className="flex flex-col h-[100dvh] w-full font-sans text-slate-800 overflow-hidden relative" style={{ background: backgroundColor }}>
      <header className="text-white shadow-lg px-4 py-3 flex justify-between items-center z-50 sticky top-0 shrink-0" style={{ background: primaryColor }}>
        <div className="flex items-center space-x-3 min-w-0">
          <img src={brandLogo} alt="Logo" className="w-10 h-8 object-contain" />
          <div className="min-w-0">
            <h1 className="font-bold text-sm leading-tight truncate max-w-[180px]">{institutionName}</h1>
            <p className="text-[10px] text-white/70 uppercase font-bold truncate">{user?.firstName || user?.fullName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => { setShowSearch(true); closeAllMenus(); }} className="p-2 rounded-full bg-black/15 hover:bg-black/25 transition" title="Buscar"><Search size={20} /></button>

          <div ref={notifPanelRef} className="relative">
            <button onClick={() => { setShowNotifPanel(value => !value); setShowProfileMenu(false); setShowMoreMenu(false); }} className={`relative p-2 rounded-full transition ${showNotifPanel ? 'bg-black/25' : 'bg-black/15'}`} title="Notificaciones">
              <Bell size={20} />
              {unreadNotificationCount > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-4 h-4 px-1 flex items-center justify-center rounded-full animate-pulse border border-white">{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</span>}
            </button>

            {showNotifPanel && (
              <div className="absolute right-0 mt-3 w-[min(24rem,calc(100vw-1rem))] bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-[110]">
                <div className="p-4 bg-violet-50 border-b flex justify-between items-center gap-3">
                  <div><h3 className="font-bold text-violet-900 text-sm">Novedades</h3><p className="text-[10px] text-gray-400 mt-0.5">{unreadNotificationCount ? `${unreadNotificationCount} sin leer` : 'Todo al día'}</p></div>
                  <div className="flex items-center gap-3">
                    {unreadNotificationCount > 0 && <button onClick={handleMarkAllNotificationsRead} className="text-[9px] font-black uppercase text-violet-600 hover:text-orange-500">Marcar leídas</button>}
                    <button onClick={() => setShowNotifPanel(false)} title="Cerrar"><X size={16} className="text-gray-400"/></button>
                  </div>
                </div>
                <div className="max-h-[24rem] overflow-y-auto">
                  {allNotifications.length === 0 ? (
                    <div className="p-10 text-center text-gray-400"><Bell size={24} className="mx-auto mb-2 opacity-30"/><p className="text-xs font-bold uppercase">Sin novedades</p></div>
                  ) : (
                    allNotifications.map(notification => {
                      const Icon = notification.icon || Bell;
                      return <button key={notification.id} onClick={() => handleNotificationClick(notification)} className={`w-full text-left p-4 border-b last:border-b-0 hover:bg-gray-50 transition ${notification.read ? 'bg-white' : 'bg-orange-50/50'}`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${notification.read ? 'bg-gray-100 text-gray-400' : 'bg-violet-100 text-violet-600'}`}><Icon size={15}/></div>
                          <div className="min-w-0"><div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${notification.read ? 'bg-gray-200' : 'bg-orange-500'}`}/><p className={`text-[10px] font-bold mb-1 uppercase truncate ${notification.read ? 'text-gray-400' : 'text-orange-600'}`}>{notification.title}</p></div><p className="text-xs text-gray-700 leading-relaxed">{notification.message}</p></div>
                        </div>
                      </button>;
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          <div ref={profileMenuRef} className="relative">
            <button onClick={() => { setShowProfileMenu(value => !value); setShowNotifPanel(false); setShowMoreMenu(false); }} className="w-10 h-10 rounded-full flex items-center justify-center font-bold overflow-hidden cursor-pointer active:scale-95 transition shadow-sm" style={{ background: `${secondaryColor}18`, color: secondaryColor, border: `2px solid ${secondaryColor}` }} title="Mi perfil">
              {user?.photoUrl ? <img src={user.photoUrl} className="w-full h-full object-cover" alt="Tu perfil"/> : user?.firstName?.[0] || user?.fullName?.[0] || 'U'}
            </button>
            {showProfileMenu && (
              <div className="absolute right-0 mt-3 w-72 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-[110]">
                <div className="p-4 text-white" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white/15 border border-white/20 overflow-hidden flex items-center justify-center font-black">{user?.photoUrl ? <img src={user.photoUrl} className="w-full h-full object-cover" alt=""/> : user?.firstName?.[0] || user?.fullName?.[0] || 'U'}</div>
                    <div className="min-w-0"><p className="font-black truncate">{user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`}</p><p className="text-[10px] text-violet-200 uppercase font-bold mt-0.5 truncate">{user?.role || user?.rol || 'Usuario'}</p>{user?.email && <p className="text-[10px] text-white/70 mt-1 truncate">{user.email}</p>}</div>
                  </div>
                </div>
                <div className="p-2">
                  <button onClick={() => navigate('profile')} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-700 transition"><User size={18} className="text-violet-500"/> Mi perfil</button>
                  {!isStandalone && <button onClick={() => { setShowProfileMenu(false); handleInstallApp(); }} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-700 transition"><Download size={18} className="text-green-500"/> Instalar CENTRA</button>}
                  <div className="my-1 border-t border-gray-100"/>
                  <button onClick={() => { setShowProfileMenu(false); onLogout(); }} className="w-full text-left p-3 rounded-xl hover:bg-red-50 flex items-center gap-3 text-sm font-bold text-red-600 transition"><LogOut size={18}/> Cerrar sesión</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {maintenanceMode && showMaintenanceAlert && <div className="fixed top-16 left-0 right-0 z-[999] p-4 animate-in slide-in-from-top-5"><div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl shadow-2xl p-5 text-white flex flex-col items-center gap-3 border-4 border-white/20"><div className="flex items-center gap-3"><div className="bg-white p-3 rounded-full text-orange-600"><Settings size={28}/></div><div className="text-center"><h3 className="font-black uppercase text-lg leading-none">¡Estamos en obra!</h3><p className="text-xs font-medium opacity-90 mt-1">Mejorando CENTRA.</p></div></div><button onClick={() => setShowMaintenanceAlert(false)} className="w-full bg-white text-orange-600 py-3 rounded-xl text-xs font-black uppercase">Entendido</button></div></div>}

      {showNotifRequest && <div className="fixed inset-0 z-[400] flex items-end md:items-center justify-center bg-black/60 p-4 backdrop-blur-sm"><div className="bg-white rounded-[30px] p-6 w-full max-w-sm shadow-2xl text-center border-t-8 border-orange-500 mb-20 md:mb-0"><Bell size={32} className="text-orange-500 mx-auto mb-4"/><h3 className="text-xl font-black text-gray-800">¡No te pierdas nada!</h3><p className="text-sm text-gray-500 mb-6">Activá los avisos del dispositivo para complementar la campanita de CENTRA.</p><div className="flex flex-col gap-3"><button onClick={enableNotifications} className="w-full bg-violet-600 text-white font-bold py-3 rounded-xl">ACTIVAR AVISOS</button><button onClick={() => setShowNotifRequest(false)} className="text-gray-400 text-xs font-bold uppercase">Ahora no</button></div></div></div>}

      <main className={`flex-1 overflow-y-auto no-scrollbar pb-24 pt-6 mx-auto w-full transition-all duration-300 ${isWideTab ? 'px-2 max-w-[98%]' : 'px-4 max-w-4xl'}`}>
        {activeTab === 'dashboard' && <DashboardView user={user} db={db} appId={appId} tasks={tasks} events={events} announcements={announcements} setActiveTab={setActiveTab} />}
        {activeTab === 'calendar' && hasModule('calendar') && <CalendarView events={events} user={user} db={db} appId={appId} canEdit={canManageContent} />}
        {activeTab === 'tasks' && hasModule('tasks') && <TasksView tasks={tasks} user={user} db={db} appId={appId} />}
        {activeTab === 'matricula' && hasModule('matricula') && <MatriculaView user={user} db={db} appId={appId} initStudentId={selectedStudentId} />}
        {activeTab === 'groups' && hasModule('groups') && <GroupsView user={user} db={db} appId={appId} setActiveTab={setActiveTab} onSelectStudent={setSelectedStudentId} />}
        {activeTab === 'resources' && hasModule('resources') && <ResourcesView resources={resources} canEdit={canManageContent} db={db} appId={appId} user={user} />}
        {activeTab === 'social' && hasModule('social') && canAccessSocial && <SocialView user={user} db={db} appId={appId} />}
        {activeTab === 'profile' && <SelfProfileView user={user} db={db} appId={appId} onUpdated={setUser} />}
        
        {activeTab === 'evaluations' && hasModule('evaluations') && isTechTeamRole && <EvaluationsView user={user} db={db} appId={appId} />}
        {activeTab === 'notifications' && <NotificationsView notifications={allNotifications} user={user} />}
        {activeTab === 'users' && isSuperAdmin && hasModule('users') && db && <UsersAdminView db={db} appId={appId} />}
        {activeTab === 'personal' && isAdminRole && hasModule('personal') && db && <PersonalView user={user} db={db} appId={appId} TURNS_LIST={appConfig.turns} VALID_ROLES_OFFICIAL={appConfig.roles} />}
        {activeTab === 'admin' && isAdminRole && hasModule('admin') && db && <AdministracionView user={user} db={db} appId={appId} />}
        {activeTab === 'medical' && isMedicalRole && hasModule('medical') && db && <MedicalView user={user} db={db} appId={appId} />}
        {activeTab === 'informes' && hasModule('informes') && <InformesView user={user} students={students} db={db} appId={appId} />}
        {activeTab === 'informes_externos' && hasModule('informes_externos') && canAccessInformesExternos && <InformesExternosView user={user} db={db} appId={appId} />}
        {activeTab === 'configuracion' && isSuperAdmin && <ConfiguracionView db={db} appId={appId} auth={auth} />}
      </main>

      <nav className="fixed bottom-0 w-full bg-white h-16 z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] pb-safe shrink-0 text-center" style={{ borderTop: `1px solid ${primaryColor}18` }}>
        <div className="grid grid-cols-5 h-full max-w-3xl mx-auto px-2 relative">
          <NavButton active={activeTab === 'dashboard'} onClick={() => navigate('dashboard')} icon={<LayoutDashboard size={20}/>} label="Inicio" />
          {hasModule('tasks') ? <NavButton active={activeTab === 'tasks'} onClick={() => navigate('tasks')} icon={<CheckSquare size={20}/>} label="Tareas" /> : <div/>}
          {hasModule('groups') ? <div className="relative -top-5 flex justify-center"><button onClick={() => navigate('groups')} className={`w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-xl border-4 border-gray-50 transition-all transform active:scale-95 ${activeTab === 'groups' ? 'text-white scale-110' : 'text-white'}`} style={{ background: activeTab === 'groups' ? secondaryColor : primaryColor }}><Grid size={24}/></button><span className="absolute -bottom-4 text-[9px] font-black uppercase tracking-wide whitespace-nowrap" style={{ color: primaryColor }}>Organización</span></div> : <div/>}
          {hasModule('calendar') ? <NavButton active={activeTab === 'calendar'} onClick={() => navigate('calendar')} icon={<CalendarIcon size={20}/>} label="Agenda" /> : <div/>}

          <div ref={moreMenuRef} className="relative">
            <NavButton active={['matricula','resources','proyecto','admin','personal','medical','social','users','informes','informes_externos','evaluations','configuracion'].includes(activeTab)} onClick={() => { setShowMoreMenu(value => !value); setShowProfileMenu(false); setShowNotifPanel(false); }} icon={<List size={20}/>} label="Más" />
            {showMoreMenu && <div className="absolute bottom-16 right-0 bg-white rounded-3xl shadow-2xl border border-gray-100 p-2 w-72 animate-in slide-in-from-bottom-5 zoom-in-95 origin-bottom-right z-[100] max-h-[75vh] overflow-y-auto custom-scrollbar">
              {hasModule('matricula') && <button onClick={() => navigate('matricula')} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600 transition"><GraduationCap size={18} className="text-violet-500"/> Legajos</button>}
              {hasModule('resources') && <button onClick={() => navigate('resources')} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600 transition"><LinkIcon size={18} className="text-green-500"/> Recursos</button>}
              
              {hasModule('informes') && <button onClick={() => navigate('informes')} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600 transition"><ClipboardCheck size={18} className="text-violet-500"/> Informes pedagógicos</button>}
              {showPrivateMenu && <div className="mt-2 pt-2 border-t border-gray-100 space-y-1"><p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 mb-1">Gestión</p>
                {isAdminRole && hasModule('admin') && <button onClick={() => navigate('admin')} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600 transition"><FileText size={18} className="text-blue-500"/> Administración</button>}
                {isAdminRole && hasModule('personal') && <button onClick={() => navigate('personal')} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600 transition"><Users size={18} className="text-violet-500"/> Personal</button>}
                {canAccessInformesExternos && hasModule('informes_externos') && <button onClick={() => navigate('informes_externos')} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600 transition"><ExternalLink size={18} className="text-pink-500"/> Informes externos</button>}
                {isTechTeamRole && hasModule('evaluations') && <button onClick={() => navigate('evaluations')} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600 transition"><ClipboardCheck size={18} className="text-orange-600"/> Evaluación de áreas</button>}
                {canAccessSocial && hasModule('social') && <button onClick={() => navigate('social')} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600 transition"><Users size={18} className="text-blue-500"/> Trabajo Social</button>}
                {isMedicalRole && hasModule('medical') && <button onClick={() => navigate('medical')} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600 transition"><Activity size={18} className="text-red-500"/> Área médica</button>}
                {isSuperAdmin && hasModule('users') && <button onClick={() => navigate('users')} className="w-full text-left p-3 rounded-xl hover:bg-red-50 flex items-center gap-3 text-sm font-bold text-red-700 transition"><Shield size={18} className="text-red-500"/> Gestión de usuarios</button>}
                {isSuperAdmin && <button onClick={() => navigate('configuracion')} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-violet-700 transition border-t border-violet-100 mt-1 pt-3"><Settings size={18} className="text-violet-600"/> Configuración de la app</button>}
              </div>}
            </div>}
          </div>
        </div>
      </nav>

      {showSearch && <div className="fixed inset-0 bg-violet-900/90 z-[300] flex flex-col p-4 backdrop-blur-md"><div className="flex justify-between items-center text-white mb-4"><h3 className="font-black italic uppercase">Buscador rápido</h3><button onClick={() => {setShowSearch(false); setSearchQuery(''); setSearchResults([]);}} className="p-2 bg-white/20 rounded-full"><X/></button></div><input autoFocus value={searchQuery} onChange={e => handleGlobalSearch(e.target.value)} placeholder="Escribí un nombre, apellido, DNI o contacto..." className="w-full p-4 rounded-2xl bg-white text-lg font-bold text-gray-800 outline-none shadow-xl mb-4"/><div className="flex-1 overflow-y-auto space-y-2">{searchResults.map(s => <div key={s.id} onClick={() => setGlobalViewingStudent(s)} className="bg-white p-3 rounded-xl flex items-center gap-3 cursor-pointer"><div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden">{s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">{s.firstName?.[0] || '?'}</div>}</div><div><p className="font-bold text-gray-800 text-sm">{s.lastName}, {s.firstName}</p><p className="text-[10px] text-gray-500">{s.email || s.phone || 'Sin datos de contacto'}</p></div></div>)}{searchQuery.length > 2 && searchResults.length === 0 && <p className="text-white/50 text-center mt-4">No se encontraron resultados.</p>}</div></div>}

      {globalViewingStudent && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[350] flex items-center justify-center p-4"><div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl"><div className="bg-violet-600 p-4 text-white flex justify-between items-center"><h3 className="font-bold text-lg">{globalViewingStudent.lastName}, {globalViewingStudent.firstName}</h3><button onClick={() => setGlobalViewingStudent(null)}><X/></button></div><div className="p-6"><div className="flex gap-4 items-center mb-4"><div className="w-20 h-20 bg-gray-200 rounded-2xl overflow-hidden">{globalViewingStudent.photoUrl && <img src={globalViewingStudent.photoUrl} className="w-full h-full object-cover"/>}</div><div><p className="text-sm font-bold text-gray-600">Edad: {calculateAge(globalViewingStudent.birthDate)} años</p><p className="text-sm font-bold text-gray-600">DNI: {globalViewingStudent.dni || '-'}</p><p className="text-xs text-orange-500 font-bold mt-1 uppercase">{globalViewingStudent.email || globalViewingStudent.phone || 'Sin contacto cargado'}</p></div></div><button onClick={() => { setActiveTab('matricula'); setShowSearch(false); setGlobalViewingStudent(null); alert('Te llevamos a Legajos.'); }} className="w-full bg-violet-100 text-violet-700 py-3 rounded-xl font-bold text-xs uppercase hover:bg-violet-200 transition">Ir a legajo completo</button></div></div></div>}
    </div>
  );
}

function SelfProfileView({ user, db, appId, onUpdated }) {
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    photoUrl: user?.photoUrl || ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      email: user?.email || '',
      phone: user?.phone || '',
      photoUrl: user?.photoUrl || ''
    });
  }, [user?.id, user?.firstName, user?.lastName, user?.email, user?.phone, user?.photoUrl]);

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return alert('Elegí una imagen válida.');
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => {
          const img = new Image();
          img.onload = () => {
            const MAX = 500;
            let width = img.width;
            let height = img.height;
            if (width > MAX || height > MAX) {
              if (width >= height) { height = Math.round(height * MAX / width); width = MAX; }
              else { width = Math.round(width * MAX / height); height = MAX; }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d')?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.7));
          };
          img.onerror = reject;
          img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      setForm(prev => ({ ...prev, photoUrl: dataUrl }));
    } catch {
      alert('No se pudo procesar la foto.');
    }
  };

  const save = async (event) => {
    event.preventDefault();
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    if (!firstName || !lastName) return alert('Completá nombre y apellido.');
    setSaving(true);
    try {
      const updated = {
        ...user,
        firstName,
        lastName,
        fullName: `${firstName} ${lastName}`.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        photoUrl: form.photoUrl || ''
      };

      if (db && appId && user?.id) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id), {
          firstName: updated.firstName,
          lastName: updated.lastName,
          fullName: updated.fullName,
          email: updated.email,
          phone: updated.phone,
          photoUrl: updated.photoUrl,
          updatedAt: serverTimestamp()
        }, { merge: true });

        if (user?.personId) {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'people', user.personId), {
            firstName: updated.firstName,
            lastName: updated.lastName,
            fullName: updated.fullName,
            email: updated.email,
            phone: updated.phone,
            photoUrl: updated.photoUrl,
            updatedAt: serverTimestamp()
          }, { merge: true }).catch(error => console.warn('No se pudo sincronizar la persona vinculada:', error));
        }
      }

      localStorage.setItem('schoolApp_profile', JSON.stringify(updated));
      onUpdated(updated);
      alert('Perfil actualizado correctamente.');
    } catch (error) {
      console.error(error);
      alert(`No se pudo guardar el perfil: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-10 space-y-5">
      <div className="bg-gradient-to-br from-violet-800 to-violet-700 rounded-3xl p-6 text-white shadow-lg">
        <p className="text-[10px] uppercase tracking-[0.2em] font-black text-violet-200">Cuenta personal</p>
        <h2 className="text-3xl font-black mt-1">Mi perfil</h2>
        <p className="text-sm text-violet-100 mt-1">Acá cada persona administra sus propios datos de contacto y su foto.</p>
      </div>

      <form onSubmit={save} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 grid md:grid-cols-[180px_1fr] gap-8 items-start">
          <div className="flex flex-col items-center">
            <div className="w-36 h-36 rounded-[2rem] overflow-hidden bg-violet-50 border-4 border-violet-100 flex items-center justify-center text-4xl font-black text-violet-500 shadow-sm">
              {form.photoUrl ? <img src={form.photoUrl} alt="Foto de perfil" className="w-full h-full object-cover"/> : form.firstName?.[0] || 'U'}
            </div>
            <label className="mt-3 cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-50 text-violet-700 text-xs font-black hover:bg-violet-100 transition"><Camera size={16}/> Cambiar foto<input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange}/></label>
            <p className="text-[10px] text-slate-400 text-center mt-2">La foto se comprime para no hacer pesada la app.</p>
          </div>

          <div className="space-y-5">
            <div><h3 className="font-black text-slate-800 text-lg">Datos personales</h3><p className="text-xs text-slate-400 mt-1">Podés actualizar esta información cuando necesites.</p></div>
            <div className="grid md:grid-cols-2 gap-4">
              <label className="space-y-1"><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Nombre</span><input value={form.firstName} onChange={e => setForm(prev => ({...prev, firstName: e.target.value}))} className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-violet-200"/></label>
              <label className="space-y-1"><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Apellido</span><input value={form.lastName} onChange={e => setForm(prev => ({...prev, lastName: e.target.value}))} className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-violet-200"/></label>
              <label className="space-y-1"><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Correo electrónico</span><input type="email" value={form.email} onChange={e => setForm(prev => ({...prev, email: e.target.value}))} className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-violet-200"/></label>
              <label className="space-y-1"><span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Teléfono</span><input value={form.phone} onChange={e => setForm(prev => ({...prev, phone: e.target.value}))} className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-violet-200" placeholder="Opcional"/></label>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Usuario</p><p className="font-bold text-slate-800 mt-1">{user?.username || user?.email || '—'}</p></div>
              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Rol</p><p className="font-bold text-slate-800 mt-1">{user?.role || user?.rol || 'Usuario'}</p></div>
            </div>
          </div>
        </div>

        <div className="px-6 md:px-8 py-5 border-t border-slate-100 bg-slate-50 flex justify-end"><button disabled={saving} className="px-6 py-3 rounded-xl bg-violet-600 text-white font-black text-sm shadow-lg shadow-violet-200 disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar cambios'}</button></div>
      </form>
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
