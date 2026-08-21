import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, CheckSquare, Settings, User, FileText, CheckCircle, 
  Download, RefreshCw, Plus, Trash2, Users, AlertCircle, LogOut, Briefcase, 
  Lock, List, Grid, ChevronLeft, ChevronRight, Bell, Check, HelpCircle, Mail, Camera, MapPin, 
  Send, Key, Filter, LayoutDashboard, Link as LinkIcon, ExternalLink, Zap,
  AlertTriangle, Clock, Shield, Crown, Activity, Share, PlusSquare, 
  Smartphone, GraduationCap, Search, X, UploadCloud, PieChart, Eye, Edit3, Trophy,
  Folder, MessageSquare, Globe, BookOpen, Lightbulb, ChevronDown, PlusCircle, Printer,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Phone, CheckCircle2, Clock3, UserCheck,
  ChevronUp // <--- ESTE ES EL QUE FALTABA
} from 'lucide-react';
import { 
  collection, query, orderBy, onSnapshot, doc, 
  updateDoc, addDoc, deleteDoc, where, getDocs, 
  serverTimestamp 
} from 'firebase/firestore';


export function UsersAdminView({ db, appId }) {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showRenamer, setShowRenamer] = useState(false);
  const [editingUser, setEditingUser] = useState(null); 
  const [searchTerm, setSearchTerm] = useState('');
  const [csvContent, setCsvContent] = useState('');
  const [processing, setProcessing] = useState(false);
  
  // ESTADOS PARA AUDITORÍA
  const [staffList, setStaffList] = useState([]); // <--- EL QUE FALTABA
  const [showMissingUsers, setShowMissingUsers] = useState(false);
  const [missingUsersList, setMissingUsersList] = useState([]); 
  const [missingLegajosList, setMissingLegajosList] = useState([]);
  const [manualLinks, setManualLinks] = useState({});

  

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), orderBy('fullName', 'asc'));
    const unsub = onSnapshot(q, snap => setUsers(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    const qStaff = query(collection(db, 'artifacts', appId, 'public', 'data', 'staff_records'), orderBy('lastName', 'asc'));
    const unsubStaff = onSnapshot(qStaff, snap => setStaffList(snap.docs.map(d => ({id: d.id, ...d.data()}))));
    return () => unsub();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
        firstName: fd.get('firstName'), lastName: fd.get('lastName'), fullName: `${fd.get('firstName')} ${fd.get('lastName')}`,
        username: fd.get('username').toLowerCase(), password: fd.get('password'), role: fd.get('role'),
        rol: fd.get('isAdmin') === 'on' ? 'admin' : 'user'
    };
    try {
        if (editingUser) {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', editingUser.id), data);
        } else {
            const qCheck = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'), where('username', '==', data.username));
            const check = await getDocs(qCheck);
            if (!check.empty) return alert("El usuario ya existe.");
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), { ...data, createdAt: serverTimestamp() });
        }
        setShowModal(false); setEditingUser(null);
    } catch(e) { alert("Error: " + e.message); }
  };

  // --- 1. DETECTAR QUIÉN FALTA (BIDIRECCIONAL INTELIGENTE) ---
  const checkMissingData = async () => {
      setProcessing(true);
      setManualLinks({}); // Resetear links manuales al auditar
      try {
          const legajosSnap = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'staff_records'));
          const legajos = legajosSnap.docs.map(d => ({id: d.id, ...d.data()}));
          
          const faltanCuentas = [];
          const faltanLegajos = [];

          const getWords = (str) => {
              if (!str) return [];
              return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().match(/\w+/g) || [];
          };

          const isSamePerson = (legajo, userAcc) => {
              if (legajo.dni && legajo.dni.length > 5 && (userAcc.password === legajo.dni || userAcc.username.includes(legajo.dni))) return true;
              const l_names = getWords(legajo.firstName);
              const l_lasts = getWords(legajo.lastName);
              const u_all = [...getWords(userAcc.firstName), ...getWords(userAcc.lastName)];
              return l_names.some(name => u_all.includes(name)) && l_lasts.some(last => u_all.includes(last));
          };

          legajos.forEach(legajo => {
              // Buscar primero si ya hay coincidencia automática
              const existe = users.find(u => isSamePerson(legajo, u));
              // Y descartamos también si ya lo vinculó manualmente la escuela antes (revisando si el usuario guardó su DNI)
              const yaVinculado = users.find(u => u.legajoId === legajo.id);
              
              if (!existe && !yaVinculado && legajo.firstName && legajo.lastName) {
                  faltanCuentas.push(legajo);
              }
          });

          users.forEach(u => {
              if (u.username === 'admin') return; 
              const existe = legajos.find(legajo => isSamePerson(legajo, u) || u.legajoId === legajo.id);
              if (!existe && u.firstName && u.lastName) faltanLegajos.push(u);
          });

          if (faltanCuentas.length === 0 && faltanLegajos.length === 0) {
              alert("✅ ¡Todo en orden! Base de datos 100% sincronizada.");
          } else {
              setMissingUsersList(faltanCuentas);
              setMissingLegajosList(faltanLegajos);
              setShowMissingUsers(true);
          }
      } catch(e) { alert("Error: " + e.message); }
      setProcessing(false);
  };

  // --- 2. VINCULACIÓN MANUAL (EL TINDER DE CUENTAS) ---
  const handleLinkManual = async (legajoId, userId) => {
      if(!userId) return;
      if(!confirm("¿Vincular este legajo con el usuario seleccionado?")) return;
      try {
          // Guardamos el ID del legajo dentro del usuario para que queden casados para siempre
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userId), { legajoId: legajoId });
          
          // Lo sacamos de ambas listas de faltantes
          setMissingUsersList(prev => prev.filter(m => m.id !== legajoId));
          setMissingLegajosList(prev => prev.filter(m => m.id !== userId));
          alert("🔗 ¡Cuentas vinculadas exitosamente!");
      } catch (e) { alert("Error al vincular: " + e.message); }
  };

  // --- 3. CREACIÓN INDIVIDUAL (A DEMANDA) ---
  const handleCreateSingleUser = async (legajo) => {
      if(!confirm(`¿Crear un usuario NUEVO para ${legajo.firstName} ${legajo.lastName}?`)) return;
      
      const cleanName = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, '');
      const newUsername = `${cleanName(legajo.firstName)}.${cleanName(legajo.lastName)}`;
      const newPassword = legajo.dni || '123456';

      try {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), {
              firstName: legajo.firstName, lastName: legajo.lastName, fullName: `${legajo.firstName} ${legajo.lastName}`,
              username: newUsername, password: newPassword, role: legajo.role || 'Docente', rol: 'user', 
              legajoId: legajo.id, // Queda vinculado desde el nacimiento
              createdAt: serverTimestamp()
          });
          setMissingUsersList(prev => prev.filter(m => m.id !== legajo.id));
      } catch (e) { alert("Error: " + e.message); }
  };

  const handleCreateSingleLegajo = async (userAcc) => {
      if(!confirm(`¿Crear legajo oficial en blanco para el usuario ${userAcc.firstName} ${userAcc.lastName}?`)) return;
      try {
          const docRef = await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'staff_records'), {
              firstName: userAcc.firstName, lastName: userAcc.lastName, 
              dni: userAcc.password !== '123456' ? userAcc.password : '', 
              role: userAcc.role || 'Docente', modality: 'Sede', isSubsidized: 'false', createdAt: serverTimestamp()
          });
          // Lo vinculamos
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userAcc.id), { legajoId: docRef.id });
          setMissingLegajosList(prev => prev.filter(m => m.id !== userAcc.id));
      } catch (e) { alert("Error: " + e.message); }
  };

  const deleteUser = async (id) => { if(confirm("¿Eliminar?")) await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', id)); };
  const openEdit = (u) => { setEditingUser(u); setShowModal(true); };
  const analizarConflictos = () => alert("Función Detective: Próximamente buscará duplicados.");
  const filteredUsers = users.filter(u => (u.fullName||'').toLowerCase().includes(searchTerm.toLowerCase()));
  const formatLastLogin = (timestamp) => { if (!timestamp) return 'Nunca'; const date = new Date(timestamp.seconds * 1000); return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}); };

  return (
   <div className="flex flex-col h-full bg-slate-50 p-4 rounded-3xl overflow-hidden animate-in fade-in">
    <div className="flex flex-col gap-3 mb-4 shrink-0">
        <div className="flex justify-between items-center">
            <h3 className="text-violet-900 font-black text-lg uppercase tracking-tighter italic">Gestión de Personal</h3>
            <div className="flex gap-2">
               {/* BOTÓN AUDITOR */}
               <button onClick={checkMissingData} disabled={processing} className="p-2 bg-blue-500 text-white rounded-xl shadow hover:bg-blue-600 transition flex items-center justify-center" title="Sincronizar Legajos y Usuarios">
                   {processing ? <RefreshCw className="animate-spin" size={20}/> : <Users size={20}/>}
               </button>
               <button onClick={()=>setShowImport(true)} className="p-2 bg-emerald-500 text-white rounded-xl shadow hover:bg-emerald-600 transition" title="Carga Masiva"><UploadCloud size={20}/></button>
               <button onClick={()=>{setEditingUser(null); setShowModal(true);}} className="p-2 bg-orange-500 text-white rounded-xl shadow hover:bg-orange-600 transition" title="Nuevo Usuario"><Plus size={20}/></button>
            </div>
        </div>
        <div className="bg-white p-3 rounded-xl flex items-center gap-2 border border-violet-100 shadow-sm"><Search className="text-gray-400 ml-1" size={18} /><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nombre..." className="bg-transparent border-none outline-none text-gray-700 text-sm w-full font-bold" /></div>
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar"><button onClick={analizarConflictos} className="whitespace-nowrap px-4 py-2 bg-violet-100 text-violet-700 rounded-xl text-xs font-black uppercase flex items-center gap-2 hover:bg-violet-200 transition">🕵️ Detective</button><button onClick={()=>setShowRenamer(true)} className="whitespace-nowrap px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-xs font-black uppercase flex items-center gap-2 hover:bg-blue-200 transition">🔄 Reemplazar</button></div>
    </div>

    <div className="flex-1 overflow-y-auto space-y-2 pb-10">
      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">{filteredUsers.length} Usuarios Encontrados</h3>
    {/* BUSCA ESTE BLOQUE EN UsersAdminView Y REEMPLAZALO */}
{filteredUsers.map(u => (
  <div key={u.id} className="bg-white p-3 rounded-xl flex items-center justify-between group shadow-sm border border-gray-100">
    <div className="flex items-center gap-3 overflow-hidden">
      <div className="w-10 h-10 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center font-black text-sm shrink-0 relative">
          {u.firstName?.[0]}
          {u.rol === 'admin' && <div className="absolute -top-1 -right-1 bg-orange-500 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center"><Shield size={8} className="text-white"/></div>}
      </div>
      <div className="min-w-0">
          <p className="font-bold text-sm text-gray-800 truncate">{u.fullName}</p>
          <div className="flex flex-wrap gap-2 items-center mt-0.5">
              <span className="text-[9px] text-white bg-violet-400 px-1.5 py-0.5 rounded font-bold uppercase">{u.role}</span>
              {/* ESTO ES LO NUEVO: MUESTRA EL ID PARA COPIAR */}
              <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-mono border border-blue-100 select-all" title="Hacé triple clic para copiar el ID">
                ID: {u.id}
              </span>
          </div>
          <p className="text-[9px] font-bold text-gray-400 mt-1 italic">
            User: <span className="text-slate-600">{u.username}</span> | Legajo: {u.legajoId ? <span className="text-green-600">✅ VINCULADO</span> : <span className="text-red-400">❌ NO VINCULADO</span>}
          </p>
      </div>
    </div>
    <div className="flex gap-2 shrink-0">
        <button onClick={() => openEdit(u)} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Edit3 size={16}/></button>
        {u.username !== 'admin' && <button onClick={() => deleteUser(u.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={16}/></button>}
    </div>
  </div>
))}
    </div>

    {/* MODAL AUDITORÍA BIDIRECCIONAL A DEMANDA */}
    {showMissingUsers && (
        <div className="fixed inset-0 bg-black/80 z-[400] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[40px] w-full max-w-4xl p-6 md:p-8 shadow-2xl flex flex-col max-h-[90vh] border-t-8 border-blue-500">
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
                    <div>
                        <h3 className="text-2xl font-black text-blue-600 uppercase italic flex items-center gap-2"><RefreshCw size={28}/> Auditoría de Personal</h3>
                        <p className="text-xs text-gray-500 font-bold mt-1">Vinculá cuentas existentes o creá las que faltan.</p>
                    </div>
                    <button onClick={() => setShowMissingUsers(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={20}/></button>
                </div>

                <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-6 pr-2 mb-6">
                  {/* COLUMNA 1: TIENEN LEGAJO, NO SABEMOS SU CUENTA */}
                    <div>
                        <h4 className="font-black text-orange-600 uppercase text-xs tracking-widest mb-3 flex items-center gap-1"><FileText size={16}/> Legajos sin Usuario App ({missingUsersList.length})</h4>
                        {missingUsersList.length === 0 ? <p className="text-xs text-gray-400 italic">Todos tienen cuenta asignada.</p> : (
                            <div className="space-y-3">
                                {missingUsersList.map((m, i) => (
                                    <div key={i} className="bg-orange-50 p-4 rounded-2xl border border-orange-200 flex flex-col gap-3">
                                        <div>
                                            <p className="font-bold text-sm text-gray-800 leading-tight">{m.lastName}, {m.firstName}</p>
                                            <p className="text-[10px] text-orange-600 font-bold uppercase mt-0.5">{m.role || 'Docente'}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="flex-1 flex gap-1">
                                                <select 
                                                    onChange={(e) => setManualLinks({...manualLinks, [m.id]: e.target.value})} 
                                                    className="w-full text-[10px] p-2 rounded-lg border border-orange-300 outline-none bg-white font-bold text-gray-600"
                                                >
                                                    <option value="">¿Ya tiene cuenta?</option>
                                                    {missingLegajosList.map(u => <option key={u.id} value={u.id}>{u.fullName}</option>)}
                                                </select>
                                                {manualLinks[m.id] && (
                                                    <button onClick={() => handleLinkManual(m.id, manualLinks[m.id])} className="bg-orange-500 text-white px-2 rounded-lg font-bold">OK</button>
                                                )}
                                            </div>
                                            <button onClick={() => handleCreateSingleUser(m)} className="bg-white border-2 border-orange-300 text-orange-700 px-3 py-2 rounded-lg font-black text-[10px] uppercase shadow-sm hover:bg-orange-100 transition whitespace-nowrap">
                                                Crear Nueva
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* COLUMNA 2: TIENEN CUENTA APP, PERO NO TIENEN EL LEGAJO VINCULADO */}
                    <div>
                        <h4 className="font-black text-violet-600 uppercase text-xs tracking-widest mb-3 flex items-center gap-1">
                            <Smartphone size={16}/> Usuarios por Vincular ({missingLegajosList.length})
                        </h4>
                        {missingLegajosList.length === 0 ? (
                            <p className="text-xs text-gray-400 italic">Todos los usuarios tienen su legajo conectado.</p>
                        ) : (
                            <div className="space-y-3">
                                {missingLegajosList.map((u, i) => (
                                    <div key={i} className="bg-violet-50 p-4 rounded-2xl border border-violet-200 flex flex-col gap-3">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-sm text-gray-800 leading-tight">{u.fullName}</p>
                                                <p className="text-[10px] text-violet-600 font-bold uppercase mt-0.5">{u.role || 'Usuario'}</p>
                                            </div>
                                            <span className="text-[8px] bg-white px-2 py-1 rounded border border-violet-200 font-mono">ID: {u.id.substring(0,6)}...</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <div className="flex-1 flex gap-1">
                                                <select 
                                                    onChange={(e) => setManualLinks({...manualLinks, [u.id]: e.target.value})}
                                                    className="w-full text-[10px] p-2 rounded-lg border border-violet-300 outline-none bg-white font-bold text-gray-600"
                                                >
                                                    <option value="">Vincular a Legajo...</option>
                                                    {staffList.map(staff => (
                                                        <option key={staff.id} value={staff.id}>{staff.lastName}, {staff.firstName} ({staff.dni || 'S/D'})</option>
                                                    ))}
                                                </select>
                                                {manualLinks[u.id] && (
                                                    <button 
                                                        onClick={async () => {
                                                            if(confirm("¿Vincular?")) {
                                                                try {
                                                                    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', u.id), { legajoId: manualLinks[u.id] });
                                                                    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'staff_records', manualLinks[u.id]), { userId: u.id });
                                                                    alert("🔗 Vinculado");
                                                                    checkMissingData(); 
                                                                } catch(e) { alert(e.message); }
                                                            }
                                                        }}
                                                        className="bg-violet-600 text-white px-3 rounded-lg font-black text-[10px]"
                                                    >UNIR</button>
                                                )}
                                            </div>
                                            <button onClick={() => handleCreateSingleLegajo(u)} className="bg-white border border-violet-300 text-violet-700 px-2 py-2 rounded-lg font-black text-[9px] uppercase hover:bg-violet-100 transition">NUEVO LEGAJO</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )}

    {showModal && (
      <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4">
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl w-full max-w-sm p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <h3 className="font-bold text-violet-900 text-xl">{editingUser ? 'Editar' : 'Nuevo'} Usuario</h3>
            <div className="grid grid-cols-2 gap-2">
                <input name="firstName" defaultValue={editingUser?.firstName} placeholder="Nombre" className="p-3 bg-gray-50 rounded-xl text-sm border outline-none" required/>
                <input name="lastName" defaultValue={editingUser?.lastName} placeholder="Apellido" className="p-3 bg-gray-50 rounded-xl text-sm border outline-none" required/>
            </div>
            <input name="username" defaultValue={editingUser?.username} placeholder="Usuario" className="w-full p-3 bg-gray-50 rounded-xl text-sm border outline-none" required/>
            <input name="password" defaultValue={editingUser?.password} placeholder="Contraseña" className="w-full p-3 bg-gray-50 rounded-xl text-sm border outline-none" required/>
            <select name="role" defaultValue={editingUser?.role || 'Docente'} className="w-full p-3 bg-gray-50 rounded-xl text-sm border outline-none font-bold text-gray-600">
                {['Docente', 'Equipo Directivo', 'Equipo Técnico', 'Auxiliar/Preceptor', 'Inclusión', 'Profes Especiales', 'Administración', 'Médico', 'Dirección Inclusión', 'Equipo Técnico Inclusión', 'DAI'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <input type="checkbox" name="isAdmin" defaultChecked={editingUser?.rol === 'admin'} className="w-5 h-5 accent-violet-600"/>
                <div><span className="text-sm font-bold text-gray-700 block">Permisos Administrador</span></div>
            </div>
            <div className="flex gap-2 pt-2">
                <button type="button" onClick={()=>setShowModal(false)} className="flex-1 py-3 text-gray-400 text-xs font-bold uppercase">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-bold text-xs uppercase shadow-lg">Guardar</button>
            </div>
        </form>
      </div>
    )}

    {showImport && (
      <div className="fixed inset-0 bg-black/80 z-[300] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-emerald-600 text-xl">Importación Masiva</h3>
            <textarea value={csvContent} onChange={e=>setCsvContent(e.target.value)} className="w-full h-40 p-3 border rounded-xl text-xs font-mono" placeholder="Juan,Perez,jperez,1234,Docente"/>
            <div className="flex gap-2">
                <button onClick={()=>setShowImport(false)} className="flex-1 py-3 text-gray-500 font-bold text-xs uppercase">Cancelar</button>
                <button onClick={processBulkImport} disabled={processing} className="flex-1 py-3 bg-emerald-500 text-white font-bold text-xs uppercase rounded-xl shadow-lg">Procesar</button>
            </div>
        </div>
      </div>
    )}
  </div>
  );
}
