import React, { useState, useEffect, useRef } from 'react';
import {
  InstitutionProvider
} from './context/InstitutionContext';
import { GroupsView } from './views/GroupsView';
import { PersonalView } from './views/PersonalView';
import { initializeCENTRAInstallation } from './data/initializeCENTRA';
import { DashboardView } from './views/DashboardView';
import { ResourcesView } from './views/ResourcesView';
import { TasksView } from './views/TasksView';
import { CalendarView } from './views/CalendarView';
import { MedicalView } from './views/MedicalView';
import { MatriculaView } from './views/MatriculaView';
import { AdministracionView } from './views/AdministracionView';
import { SocialView } from './views/SocialView';
import { UsersAdminView } from './views/UsersAdminView';
import { EquipoTecnicoView } from './views/EquipoTecnicoView';
import { ProfileView } from './views/ProfileView';
import { ActivityLogView } from './views/ActivityLogView';
import { ProyectoView } from './views/ProyectoView';
import { EvaluationsView } from './views/EvaluationsView';
import { InformesView } from './views/InformesView';
import { InformesExternosView } from './views/InformesExternosView';
import { ConfiguracionView } from './views/ConfiguracionView';
import { getCachedAppConfig, normalizeAppConfig, cacheAppConfig, applyBranding, DEFAULT_APP_CONFIG, canAccessModule, isModuleEnabled } from './config';

import { 
  Calendar as CalendarIcon, CheckSquare, Settings, User, FileText, CheckCircle, 
  RefreshCw, Plus, Trash2, Users, AlertCircle, LogOut, Briefcase, 
  Lock, List, Grid, ChevronLeft, ChevronRight, Bell, Check, HelpCircle, Mail, Camera, MapPin, 
  Send, Key, Filter, LayoutDashboard, Link as LinkIcon, ExternalLink, Zap,
  AlertTriangle, Clock, Shield, Crown, Activity, 
  GraduationCap, Search, X, UploadCloud, PieChart, Eye, Edit3, Trophy,
  Folder, MessageSquare, Globe, BookOpen, Lightbulb, ChevronDown, PlusCircle, Printer,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Phone, CheckCircle2, Clock3, UserCheck,
  ChevronUp, ClipboardCheck
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, query, orderBy, onSnapshot, doc, 
  updateDoc, deleteDoc, where, getDocs, getDoc, setDoc, serverTimestamp, arrayUnion, arrayRemove, limit,increment 
} from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from "firebase/messaging";
const LOGO_URL = () => getCachedAppConfig().logoUrl || '/icon-192.png';


const triggerMobileNotification = (title, body) => {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    if (navigator.serviceWorker && navigator.serviceWorker.ready) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title, { body: body, icon: LOGO_URL(), vibrate: [200, 100, 200] });
      });
    } else {
      try { new Notification(title, { body, icon: LOGO_URL() }); } catch (e) { console.log("Notif error"); }
    }
  }
};

const getFirebaseConfig = () => {
  const config = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  };

  const requiredKeys = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ];

  const configured = requiredKeys.every(
    key => typeof config[key] === 'string' && config[key].trim() !== ''
  );

  return configured ? config : {};
};

const firebaseConfig = getFirebaseConfig();

const app =
  Object.keys(firebaseConfig).length > 0
    ? initializeApp(firebaseConfig)
    : null;

const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;
const appId = typeof __app_id !== 'undefined' ? __app_id : 'escuela-app-prod';

 
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
          src={getCachedAppConfig().logoUrl || '/icon-192.png'} 
          alt="Logo" 
          className="w-32 h-auto" 
        />
      </div>
      <h1 className="mt-8 text-3xl font-black text-white tracking-widest uppercase italic animate-pulse">
        {getCachedAppConfig().institutionShortName || getCachedAppConfig().institutionName}
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



function describeFirebaseError(error) {
  const code = error?.code || '';
  if (code.includes('permission-denied')) return 'Firebase está conectado, pero Firestore rechazó el acceso. Revisá las reglas de Firestore.';
  if (code.includes('auth/operation-not-allowed')) return 'La conexión funciona, pero Email/Password no está habilitado en Firebase Authentication.';
  if (code.includes('auth/invalid-api-key')) return 'La API Key de Firebase no es válida.';
  if (code.includes('auth/invalid-project-id')) return 'El Project ID de Firebase no es válido.';
  if (code.includes('auth/network-request-failed')) return 'No se pudo contactar con Firebase. Revisá la conexión a internet.';
  if (code.includes('app/invalid-credential')) return 'La configuración de Firebase es inválida.';
  return error?.message || 'No se pudo completar la operación.';
}

function InitialAdminScreen({ onCreated }) {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const update = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

  const handleCreate = async (e) => {
  e.preventDefault();
  setError('');

  if (!auth || !db) {
    setError('CENTRA no está conectado con Firebase.');
    return;
  }

  if (form.password.length < 6) {
    setError('La contraseña debe tener al menos 6 caracteres.');
    return;
  }

  if (form.password !== form.confirmPassword) {
    setError('Las contraseñas no coinciden.');
    return;
  }

  setSaving(true);

  try {
    const email = form.email.trim().toLowerCase();
    let credential;

    try {
      credential = await createUserWithEmailAndPassword(
        auth,
        email,
        form.password
      );
    } catch (createError) {
      if (createError?.code === 'auth/email-already-in-use') {
        credential = await signInWithEmailAndPassword(
          auth,
          email,
          form.password
        );
      } else {
        throw createError;
      }
    }

    const profile = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      fullName:
        `${form.firstName.trim()} ${form.lastName.trim()}`.trim(),
      email,
      username: email,

      role: 'Equipo Directivo',
      rol: 'admin',
      accessRoleId: 'admin',
      isAdmin: true,

      authUid: credential.user.uid,
      personId: credential.user.uid,

      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp()
    };

    // Inicializa la arquitectura de CENTRA.
    const initialization =
      await initializeCENTRAInstallation({
        db,
        appId,
        authUser: credential.user,
        adminProfile: profile
      });

    // IMPORTANTE:
    // La instalación queda registrada en Firebase.
    // Esto permite que cualquier dispositivo o navegador
    // sepa que CENTRA ya fue instalado.
    const institutionRef = doc(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'config',
      'institution'
    );

    await setDoc(
      institutionRef,
      {
        installationComplete: true,
        installationCompletedAt: serverTimestamp(),
        initialAdminUid: credential.user.uid
      },
      { merge: true }
    );

    const completeProfile = {
      ...profile,
      id: credential.user.uid,
      personId: initialization.personId,
      architectureVersion:
        initialization.architectureVersion
    };

    // Esto queda solamente como caché local.
    // NO determina si CENTRA está instalado.
    localStorage.setItem(
      'schoolApp_profile',
      JSON.stringify(completeProfile)
    );

    onCreated(completeProfile);

  } catch (error) {
    console.error('Initial admin error:', error);

    if (
      error?.code === 'auth/invalid-credential' ||
      error?.code === 'auth/wrong-password' ||
      error?.code === 'auth/user-not-found'
    ) {
      setError(
        'La cuenta ya existe, pero la contraseña no coincide. Usá la contraseña con la que se creó la cuenta en Firebase.'
      );
    } else {
      setError(describeFirebaseError(error));
    }
  } finally {
    setSaving(false);
  }
};

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-xl border border-slate-200 p-8">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center font-black text-2xl">C</div>
          <h1 className="text-3xl font-black text-slate-900 mt-4">Crear administrador inicial</h1>
          <p className="text-slate-500 mt-2">Este será el usuario con acceso total a CENTRA.</p>
        </div>

        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <input required value={form.firstName} onChange={e => update('firstName', e.target.value)} placeholder="Nombre" className="w-full rounded-xl border border-slate-200 px-4 py-3" />
            <input required value={form.lastName} onChange={e => update('lastName', e.target.value)} placeholder="Apellido" className="w-full rounded-xl border border-slate-200 px-4 py-3" />
          </div>
          <input required type="email" value={form.email} onChange={e => update('email', e.target.value)} placeholder="Correo electrónico" className="w-full rounded-xl border border-slate-200 px-4 py-3" />
          <input required minLength={6} type="password" value={form.password} onChange={e => update('password', e.target.value)} placeholder="Contraseña" className="w-full rounded-xl border border-slate-200 px-4 py-3" />
          <input required minLength={6} type="password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} placeholder="Repetí la contraseña" className="w-full rounded-xl border border-slate-200 px-4 py-3" />

          {error && <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 p-4 text-sm font-semibold">{error}</div>}

          <button disabled={saving} className="w-full rounded-xl bg-violet-600 hover:bg-violet-700 text-white py-3.5 font-black disabled:opacity-60">
            {saving ? 'Creando administrador…' : 'Crear administrador y entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
function ErrorBoundary({ children }) {
  const [error, setError] = useState(null);

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl border border-red-200 p-8">
          <h1 className="text-2xl font-black text-red-700 mb-4">
            Error al cargar CENTRA
          </h1>

          <p className="text-slate-600 mb-4">
            CENTRA encontró un error al renderizar la aplicación.
          </p>

          <pre className="bg-slate-900 text-white rounded-xl p-4 text-xs overflow-auto whitespace-pre-wrap">
            {error?.stack || error?.message || String(error)}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundaryInner onError={setError}>
      {children}
    </ErrorBoundaryInner>
  );
}

class ErrorBoundaryInner extends React.Component {
  componentDidCatch(error) {
    this.props.onError(error);
  }

  render() {
    return this.props.children;
  }
}
function AppContent() {
const [firebaseUser, setFirebaseUser] = useState(null);
const [currentUserProfile, setCurrentUserProfile] = useState(null);
const [loading, setLoading] = useState(true);
const [minTimePassed, setMinTimePassed] = useState(false);
const [installationComplete, setInstallationComplete] = useState(null);

  useEffect(() => {
  const timer = setTimeout(() => {
    setMinTimePassed(true);
  }, 700);

  if (!db || !auth) {
    setInstallationComplete(null);
    setLoading(false);

    return () => {
      clearTimeout(timer);
    };
  }

  let cancelled = false;

  const loadInstallationState = async () => {
    try {
      const institutionRef = doc(
        db,
        'artifacts',
        appId,
        'public',
        'data',
        'config',
        'institution'
      );

      const institutionSnap =
        await getDoc(institutionRef);

      if (cancelled) return;

      if (!institutionSnap.exists()) {
        // Firebase respondió correctamente y
        // confirmó que todavía no existe la instalación.
        setInstallationComplete(false);
        return;
      }

      const data = institutionSnap.data();

      setInstallationComplete(
        data?.installationComplete === true
      );

    } catch (error) {
      console.error(
        'No se pudo consultar el estado de instalación:',
        error
      );

      if (!cancelled) {
        // IMPORTANTE:
        // null significa "no pude comprobarlo".
        // NO significa "no está instalado".
        //
        // Así evitamos mostrar accidentalmente
        // el formulario de crear administrador.
        setInstallationComplete(null);
      }
    }
  };

  loadInstallationState();

  const unsubscribe = onAuthStateChanged(
    auth,
    async (user) => {
      if (cancelled) return;

      setFirebaseUser(user);

      if (user?.uid) {
        try {
          const userDoc = await getDoc(
            doc(
              db,
              'artifacts',
              appId,
              'public',
              'data',
              'users',
              user.uid
            )
          );

          if (userDoc.exists()) {
            const profile = {
              ...userDoc.data(),
              id: userDoc.id
            };

            setCurrentUserProfile(profile);

            localStorage.setItem(
              'schoolApp_profile',
              JSON.stringify(profile)
            );
          }
        } catch (error) {
          console.warn(
            'No se pudo recuperar el perfil:',
            error
          );
        }
      } else {
        setCurrentUserProfile(null);
      }

      setLoading(false);
    }
  );

  return () => {
    cancelled = true;
    clearTimeout(timer);
    unsubscribe();
  };
}, []);
  const handleLogin = (profileData) => {
    setCurrentUserProfile(profileData);
    localStorage.setItem('schoolApp_profile', JSON.stringify(profileData));
  };

  const handleLogout = async () => {
  try {
    if (auth?.currentUser) {
      await signOut(auth);
    }
  } catch (error) {
    console.warn('Error al cerrar sesión:', error);
  }

  setFirebaseUser(null);
  setCurrentUserProfile(null);

  // Solo eliminamos la sesión/caché local.
  // La instalación permanece registrada en Firebase.
  localStorage.removeItem('schoolApp_profile');
};

  if (Object.keys(firebaseConfig).length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center font-black text-xl">C</div>
          <h1 className="text-2xl font-black text-slate-900 mt-5">CENTRA no está configurado</h1>
          <p className="text-slate-500 mt-2">Este deployment necesita las variables de Firebase configuradas en Vercel.</p>
        </div>
      </div>
    );
  }

  if (installationComplete === null || loading || !minTimePassed) {
  return (
    <div className="flex items-center justify-center h-screen bg-violet-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-violet-600"></div>
    </div>
  );
}

  if (!installationComplete) {
    return <InitialAdminScreen onCreated={(profile) => {
      setInstallationComplete(true);
      setCurrentUserProfile(profile);
    }} />;
  }


if (!currentUserProfile) {
  return <LoginScreen onLogin={handleLogin} />;
}

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
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setChecking(true);

    try {
      let email = username.trim().toLowerCase();

      if (!email.includes('@')) {
        const q = query(
          collection(db, 'artifacts', appId, 'public', 'data', 'users'),
          where('username', '==', email)
        );
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
          setError('No encontramos ese usuario.');
          return;
        }

        const userData = snapshot.docs[0].data();
        if (!userData.email) {
          setError('Este usuario pertenece al sistema anterior y no tiene correo asociado. Creá nuevamente su cuenta desde Gestión de Usuarios.');
          return;
        }
        email = userData.email;
      }

      const credential = await signInWithEmailAndPassword(auth, email, password);

      const profileRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', credential.user.uid);
      const profileSnap = await getDoc(profileRef);

      if (!profileSnap.exists()) {
        setError('La cuenta existe en Firebase, pero todavía no tiene un perfil institucional.');
        await signOut(auth);
        return;
      }

      const profile = { ...profileSnap.data(), id: profileSnap.id };
      await updateDoc(profileRef, { lastLogin: serverTimestamp() }).catch(() => {});
      onLogin(profile);
    } catch (err) {
      console.error('Login error:', err);
      const code = err?.code || '';
      if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setError('Correo, usuario o contraseña incorrectos.');
      } else {
        setError(describeFirebaseError(err));
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
      const value = recoverUser.trim().toLowerCase();
      let email = value;

      if (!value.includes('@')) {
        const q = query(
          collection(db, 'artifacts', appId, 'public', 'data', 'users'),
          where('username', '==', value)
        );
        const snapshot = await getDocs(q);
        if (snapshot.empty || !snapshot.docs[0].data().email) {
          setRecoverStatus('error');
          setTimeout(() => setRecoverStatus('idle'), 3000);
          return;
        }
        email = snapshot.docs[0].data().email;
      }

      await sendPasswordResetEmail(auth, email);
      setRecoverStatus('sent');
    } catch (error) {
      console.error('Reset error:', error);
      setRecoverStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-900 to-fuchsia-900 flex items-center justify-center p-6 relative">
      
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border-t-8 border-orange-500 relative z-0">
        <div className="text-center mb-8">
            <div className="flex justify-center mb-4"><img src={getCachedAppConfig().logoUrl || '/icon-192.png'} alt="Logo institucional" className="h-24 w-auto object-contain drop-shadow-md" /></div>
            <h1 className="text-2xl font-extrabold text-violet-900 tracking-tight uppercase">{getCachedAppConfig().portalTitle || 'PORTAL INSTITUCIONAL'}<br/><span className="text-orange-500">{getCachedAppConfig().institutionShortName || 'Mi Institución'}</span></h1>
        </div>

        {!showRecover ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div><label className="block text-xs font-bold text-violet-900 uppercase mb-2 ml-1">Usuario</label><div className="relative group"><User className="absolute left-3 top-3.5 text-violet-300" size={18} /><input type="text" required className="w-full pl-10 pr-4 py-3 bg-violet-50 border border-violet-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-400" placeholder="Nombre de usuario" value={username} onChange={(e) => setUsername(e.target.value)} /></div></div>
            <div><label className="block text-xs font-bold text-violet-900 uppercase mb-2 ml-1">Contraseña</label><div className="relative group"><Lock className="absolute left-3 top-3.5 text-violet-300" size={18} /><input type="password" required className="w-full pl-10 pr-4 py-3 bg-violet-50 border border-violet-100 rounded-xl outline-none focus:ring-2 focus:ring-orange-400" placeholder="••••••" value={password} onChange={(e) => setPassword(e.target.value)} /></div></div>
            <div className="flex justify-end"><button type="button" onClick={() => setShowRecover(true)} className="text-xs font-bold text-violet-600 hover:text-orange-500 transition">¿Olvidaste tu contraseña?</button></div>
            {error && <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl flex items-center gap-3 border border-red-100">{error}</div>}
            <button type="submit" disabled={checking} className="w-full bg-gradient-to-r from-violet-600 to-violet-800 text-white py-4 rounded-xl font-bold text-lg hover:from-orange-500 hover:to-orange-600 transition duration-300 shadow-xl disabled:opacity-70 flex justify-center items-center">{checking ? <RefreshCw className="animate-spin" /> : 'Ingresar a CENTRA'}</button>
          </form>
        ) : (
          <div className="animate-in fade-in slide-in-from-right">
              <div className="bg-violet-50 p-6 rounded-2xl text-center mb-6 border border-violet-100">
                <Key className="mx-auto text-violet-500 mb-2" size={40} />
                <h3 className="font-bold text-violet-900 text-lg mb-2">Restablecer contraseña</h3>
                <p className="text-sm text-gray-600 mb-4">Ingresá tu correo o usuario para recibir un enlace de recuperación.</p>
                {recoverStatus === 'sent' ? (
                    <div className="bg-green-100 text-green-700 p-3 rounded-xl mb-4 text-sm font-bold flex items-center justify-center gap-2"><CheckCircle size={18} /> ¡Solicitud Enviada!</div>
                ) : (
                    <form onSubmit={handleRequestReset} className="mb-4">
                        <input className="w-full p-3 bg-white border border-violet-200 rounded-xl mb-3 text-center focus:ring-2 focus:ring-orange-400 outline-none" placeholder="Correo o usuario" value={recoverUser} onChange={(e) => setRecoverUser(e.target.value)} required />
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
  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [resources, setResources] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [students, setStudents] = useState([]);
  const [appConfig, setAppConfig] = useState(() => getCachedAppConfig());
  
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [globalViewingStudent, setGlobalViewingStudent] = useState(null);
  
  // POPUPS Y PWA HEADER
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [showMaintenanceAlert, setShowMaintenanceAlert] = useState(false);
  const prevNotifCount = useRef(0);
  const currentRole = user?.role || user?.rol || '';
  const isSuperAdmin = user?.rol === 'super-admin' || user?.rol === 'admin' || currentRole === 'super-admin' || currentRole === 'admin';
  const hasModule = (moduleId) => isSuperAdmin ? (moduleId === 'configuracion' || isModuleEnabled(appConfig, moduleId)) : canAccessModule(appConfig, currentRole, moduleId);
  const canManageContent = user?.rol === 'admin' || isSuperAdmin || currentRole === 'Equipo Directivo';
  const isAdminRole = hasModule('admin');
  const isTechTeamRole = hasModule('equipo');
  const isMedicalRole = hasModule('medical');
  const canAccessSocial = hasModule('social');
  const canAccessInformesExternos = hasModule('informes_externos');
  const showPrivateMenu = isAdminRole || isTechTeamRole || isMedicalRole || canAccessSocial || hasModule('informes_externos');

  const isWideTab = ['groups', 'calendar', 'matricula', 'resources', 'users', 'admin', 'configuracion', 'personal'].includes(activeTab);

  useEffect(() => {
    applyBranding(appConfig);
  }, [appConfig]);

  useEffect(() => {
    const handleConfigUpdate = (event) => setAppConfig(normalizeAppConfig(event.detail));
    window.addEventListener('institution-config-updated', handleConfigUpdate);
    return () => window.removeEventListener('institution-config-updated', handleConfigUpdate);
  }, []);

  useEffect(() => {
    if (!db || !appId) return;
    const loadInstitutionConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'institution'));
        if (snap.exists()) setAppConfig(cacheAppConfig(snap.data()));
        else await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'institution'), { ...DEFAULT_APP_CONFIG }, { merge: true });
      } catch (e) { console.warn('No se pudo cargar la configuración institucional', e); }
    };
    loadInstitutionConfig();
  }, [db, appId]);

  useEffect(() => {
    if (!db || !appId || !user?.id) return; 

    updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', user.id), { 
      lastLogin: serverTimestamp() 
    }).catch(() => {});

    const unsubTasks = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), orderBy('dueDate', 'asc')), (snap) => setTasks(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubEvents = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'events'), orderBy('date', 'asc')), (snap) => setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubResources = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'resources'), orderBy('createdAt', 'desc')), (snap) => setResources(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    const unsubAnnounce = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), orderBy('createdAt', 'desc')), (snap) => setAnnouncements(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
    
    const unsubMaint = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'config', 'maintenance'), (doc) => { 
        const isActive = doc.exists() ? doc.data().active : false;
        setMaintenanceMode(isActive);
        if(isActive && user.rol !== 'super-admin') setShowMaintenanceAlert(true);
    });

    const qNotifs = query(collection(db, 'artifacts', appId, 'public', 'data', 'notifications'), where('toUserId', '==', user.id));
    const unsubNotifs = onSnapshot(qNotifs, (snap) => { 
        const d = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
        d.sort((a,b)=> (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)); 
        const unread = d.filter(n=>!n.read); 
        setNotifications(unread);
        
        if (unread.length > prevNotifCount.current) { 
          const latest = unread[0]; 
          if (latest && "Notification" in window && Notification.permission === "granted") { 
            new Notification(`🔔 ${latest.title}`, { body: latest.message, icon: LOGO_URL() }); 
          } 
        } 
        prevNotifCount.current = unread.length;
    });

    return () => { 
      unsubTasks(); unsubNotifs(); unsubEvents(); unsubResources(); unsubAnnounce(); unsubMaint();
    };
  }, [user.id, db, appId]);
  const handleGlobalSearch = async (text) => { 
    setSearchQuery(text); 
    if (text.length < 2 || !db || !appId) { setSearchResults([]); return; } 
    
    try {
      const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'students')); 
      const s = await getDocs(q); 
      const r = s.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(s => (s.isActive === undefined || s.isActive) && 
              (s.firstName.toLowerCase().includes(text.toLowerCase()) || 
               s.lastName.toLowerCase().includes(text.toLowerCase()))); 
      setSearchResults(r.slice(0, 5)); 
    } catch (err) { console.error("Search error:", err); }
  };

  const handleNotificationClick = async (n) => { 
    if (!db || !appId) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'notifications', n.id)); 
      if (n.targetTab) setActiveTab(n.targetTab); 
      setShowNotifPanel(false); 
    } catch (err) { console.error(err); }
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
  
  return (
    <div className="flex flex-col h-[100dvh] w-full bg-gray-50 font-sans text-slate-800 overflow-hidden relative">
      <header
  className="text-white shadow-lg px-4 py-3 flex justify-between items-center z-50 sticky top-0 shrink-0"
  style={{
    backgroundColor:
      appConfig.primaryColor || 'var(--app-primary)'
  }}
>
        <div className="flex items-center space-x-3">
          <img src={appConfig.logoUrl || LOGO_URL()} alt="Logo" className="w-10 h-8 object-contain" />
          <div>
            <h1 className="font-bold text-sm leading-tight">{appConfig.institutionShortName || appConfig.institutionName}</h1>
            <p className="text-[10px] text-orange-200 uppercase font-bold">{user.firstName}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSearch(true)} className="p-2 rounded-full bg-violet-900/50 hover:bg-orange-500 transition"><Search size={20} /></button>
          
          <div className="relative">
            <button onClick={() => setShowNotifPanel(!showNotifPanel)} className={`p-2 rounded-full transition ${showNotifPanel ? 'bg-orange-500' : 'bg-violet-900/50'}`}>
              <Bell size={20} />
              {notifications.length > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full animate-pulse border border-white">{notifications.length}</span>}
            </button>
            {showNotifPanel && (
              <div className="absolute right-0 mt-3 w-72 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-[100]">
                <div className="p-4 bg-violet-50 border-b flex justify-between items-center"><h3 className="font-bold text-violet-900 text-sm">Avisos</h3><button onClick={() => setShowNotifPanel(false)}><X size={16} className="text-gray-400"/></button></div>
                <div className="max-h-80 overflow-y-auto">{notifications.length===0?<div className="p-10 text-center text-gray-400"><p className="text-xs font-bold uppercase">Sin novedades</p></div>:notifications.map(n=>(<div key={n.id} onClick={()=>handleNotificationClick(n)} className="p-4 border-b hover:bg-gray-50 cursor-pointer"><p className="text-[10px] font-bold text-orange-600 mb-1 uppercase">{n.title}</p><p className="text-xs text-gray-700">{n.message}</p></div>))}</div>
              </div>
            )}
          </div>
          
          <div onClick={() => {setActiveTab('profile'); setShowNotifPanel(false);}} className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold border-2 border-orange-400 overflow-hidden cursor-pointer active:scale-95 transition">
            {user.photoUrl ? <img src={user.photoUrl} className="w-full h-full object-cover" /> : user.firstName?.[0]}
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

      <main className={`flex-1 overflow-y-auto no-scrollbar pb-24 pt-6 mx-auto w-full transition-all duration-300 ${isWideTab ? 'px-2 max-w-[98%]' : 'px-4 max-w-4xl'}`}>
        {activeTab === 'dashboard' && <DashboardView user={user} db={db} appId={appId} tasks={tasks} events={events} announcements={announcements} setActiveTab={setActiveTab} />}
        {activeTab === 'calendar' && hasModule('calendar') && appConfig.features.calendar !== false && <CalendarView events={events} user={user} db={db} appId={appId} canEdit={canManageContent} />}
        {activeTab === 'tasks' && hasModule('tasks') && appConfig.features.tasks !== false && <TasksView tasks={tasks} user={user} db={db} appId={appId} />}
        {activeTab === 'matricula' && hasModule('matricula') && appConfig.features.studentFiles !== false && <MatriculaView user={user} db={db} appId={appId} initStudentId={selectedStudentId} />}
        {activeTab === 'groups' && hasModule('groups') && <GroupsView user={user} db={db} appId={appId} setActiveTab={setActiveTab} onSelectStudent={setSelectedStudentId} />}
        {activeTab === 'resources' && hasModule('resources') && appConfig.features.resources !== false && <ResourcesView resources={resources} canEdit={canManageContent} db={db} appId={appId} user={user} />}
        {activeTab === 'social' && hasModule('social') && appConfig.features.social !== false && <SocialView user={user} db={db} appId={appId} />}
        {activeTab === 'profile' && <ProfileView user={user} tasks={tasks} onLogout={onLogout} isSuperAdmin={isSuperAdmin} db={db} appId={appId} />}
        {activeTab === 'proyecto' && hasModule('proyecto') && <ProyectoView user={user} db={db} appId={appId} />}
        {activeTab === 'evaluations' && hasModule('evaluations') && isTechTeamRole && appConfig.features.evaluations !== false && <EvaluationsView user={user} db={db} appId={appId} />}
        {activeTab === 'notifications' && <NotificationsView notifications={notifications} canEdit={isSuperAdmin} user={user} />}

        {activeTab === 'users' && hasModule('users') && isSuperAdmin && db && <UsersAdminView db={db} appId={appId} />}
        {activeTab === 'personal' && hasModule('personal') && isAdminRole && db && <PersonalView user={user} db={db} appId={appId} TURNS_LIST={appConfig.turns} VALID_ROLES_OFFICIAL={appConfig.roles} />}
        {activeTab === 'admin' && hasModule('admin') && isAdminRole && db && <AdministracionView user={user} db={db} appId={appId} />}
        {activeTab === 'equipo' && hasModule('equipo') && isTechTeamRole && db && <EquipoTecnicoView user={user} db={db} appId={appId} />}
        {activeTab === 'medical' && hasModule('medical') && isMedicalRole && db && <MedicalView user={user} db={db} appId={appId} />}  
        {activeTab === 'informes' && hasModule('informes') && appConfig.features.reports !== false && (<InformesView user={user} students={students} db={db} appId={appId} />)}
        {activeTab === 'informes_externos' && hasModule('informes_externos') && appConfig.features.externalReports !== false && canAccessInformesExternos && (<InformesExternosView user={user} db={db} appId={appId} />)}
        {activeTab === 'audit' && hasModule('audit') && isSuperAdmin && db && (<ActivityLogView db={db} appId={appId} />)}
        {activeTab === 'configuracion' && hasModule('configuracion') && isSuperAdmin && db && (<ConfiguracionView db={db} appId={appId} auth={auth} />)}
      </main>
  <a
      href="https://www.somosnomade.com.ar/"
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-[72px] right-3 z-20 text-[9px] font-semibold text-slate-400 hover:text-violet-600 transition bg-white/90 backdrop-blur-sm px-2.5 py-1.5 rounded-full border border-slate-200/70 shadow-sm"
    >
      Desarrollado por <span className="font-black">NOMADE</span> ↗
    </a>
      <nav className="fixed bottom-0 w-full bg-white border-t border-violet-100 h-16 z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.05)] pb-safe shrink-0 text-center">
        <div className="grid grid-cols-5 h-full max-w-3xl mx-auto px-2 relative">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Inicio" />
          {hasModule('tasks') && <NavButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<CheckSquare size={20} />} label="Tareas" />}
          
          {hasModule('groups') && <div className="relative -top-5 flex justify-center">
            <button onClick={() => setActiveTab('groups')} className={`w-14 h-14 rounded-full flex flex-col items-center justify-center shadow-xl border-4 border-gray-50 transition-all transform active:scale-95 ${activeTab === 'groups' ? 'bg-orange-500 text-white scale-110' : 'bg-violet-600 text-white'}`}>
              <Grid size={24} />
            </button>
            <span className="absolute -bottom-4 text-[9px] font-black text-violet-900 uppercase tracking-wide whitespace-nowrap">Mi Aula</span>
          </div>}

          {hasModule('calendar') && <NavButton active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} icon={<CalendarIcon size={20} />} label="Agenda" />}
          
          <div className="relative">
            <NavButton active={['matricula', 'resources', 'proyecto', 'admin', 'personal', 'medical', 'equipo', 'social', 'users', 'configuracion'].includes(activeTab)} onClick={() => setShowMoreMenu(!showMoreMenu)} icon={<List size={20} />} label="Más" />
            
            {showMoreMenu && (
              <div className="absolute bottom-16 right-0 bg-white rounded-3xl shadow-2xl border border-gray-100 p-2 w-64 animate-in slide-in-from-bottom-5 zoom-in-95 origin-bottom-right z-[100] max-h-[70vh] overflow-y-auto custom-scrollbar">
                {hasModule('matricula') && appConfig.features.studentFiles !== false && <button onClick={() => { setActiveTab('matricula'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600 transition">
                  <GraduationCap size={18} className="text-violet-500"/> Legajos
                </button>}
                {hasModule('resources') && appConfig.features.resources !== false && <button onClick={() => { setActiveTab('resources'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600 transition">
                  <LinkIcon size={18} className="text-green-500"/> Recursos
                </button>}
                {hasModule('proyecto') && <button onClick={() => { setActiveTab('proyecto'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600 transition">
                  <PieChart size={18} className="text-orange-500"/> Proyecto Inst.
                </button>}
                {hasModule('informes') && appConfig.features.reports !== false && <button onClick={() => { setActiveTab('informes'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-gray-600 transition">
                  <ClipboardCheck size={18} className="text-violet-500"/> Informes Pedagógicos
                </button>}
                
                {showPrivateMenu && (
                  <div className="mt-2 pt-2 border-t border-gray-100 space-y-1">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 mb-1 mt-1">Gestión Privada</p>
                    {hasModule('equipo') && isTechTeamRole && <button onClick={() => { setActiveTab('equipo'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-teal-50 flex items-center gap-3 text-sm font-bold text-teal-700 transition"><Briefcase size={18} className="text-teal-500"/> Equipo Técnico</button>}
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
                    {hasModule('evaluations') && appConfig.features.evaluations !== false && isTechTeamRole && <button onClick={() => { setActiveTab('evaluations'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl bg-orange-50 text-orange-950 flex items-center gap-3 text-sm font-black transition border border-orange-100/50 shadow-inner"><ClipboardCheck size={18} className="text-orange-600"/> Evaluación Áreas</button>}
                    {canAccessSocial && appConfig.features.social !== false && <button onClick={() => { setActiveTab('social'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-blue-50 flex items-center gap-3 text-sm font-bold text-gray-600 transition"><Users size={18} className="text-blue-500"/> Trabajo Social</button>}
                    {hasModule('medical') && appConfig.features.medical !== false && isMedicalRole && <button onClick={() => { setActiveTab('medical'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-red-50 flex items-center gap-3 text-sm font-bold text-red-600 transition"><Activity size={18} className="text-red-500"/> Médico</button>}
                    {isSuperAdmin && (
                      <>
                        <button onClick={() => { setActiveTab('configuracion'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-violet-50 flex items-center gap-3 text-sm font-bold text-violet-700 transition border-t border-violet-50 mt-1"><Settings size={18} className="text-violet-500"/> Configuración</button>
                        <button onClick={() => { setActiveTab('audit'); setShowMoreMenu(false); }} className="w-full text-left p-3 rounded-xl hover:bg-slate-100 flex items-center gap-3 text-sm font-bold text-slate-700 transition"><Activity size={18} className="text-slate-500"/> Auditoría Global</button>
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
function App() {
  return (
    <InstitutionProvider>
      <AppContent />
    </InstitutionProvider>
  );
}

export default App;
