import { getCachedAppConfig } from '../config';
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
  ChevronUp
} from 'lucide-react';
import { 
  collection, query, where, onSnapshot, doc, 
  updateDoc, arrayUnion, deleteDoc, serverTimestamp 
} from 'firebase/firestore';

export function SocialView({ user, db, appId }) {
  const [cases, setCases] = useState([]);
  const [allSocialCases, setAllSocialCases] = useState([]); 
  const [students, setStudents] = useState([]);
  const [viewingStudent, setViewingStudent] = useState(null);
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('active'); 
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState({});
  const [selectedCase, setSelectedCase] = useState(null); 
  const [searchTerm, setSearchProfile] = useState('');

  const isAllowed = ['admin', 'super-admin', 'Docente', 'Auxiliar/Preceptor', 'Equipo Directivo', 'Equipo Técnico'].includes(user.role) || user.rol === 'admin';

  useEffect(() => {
    if (!isAllowed || !db || !appId) return;

    const socialRef = collection(db, 'artifacts', appId, 'public', 'data', 'social_cases');
    
    const unsub = onSnapshot(socialRef, (snap) => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      docs.sort((a, b) => {
        const dateA = a.createdAt?.seconds || Date.now() / 1000;
        const dateB = b.createdAt?.seconds || Date.now() / 1000;
        return dateB - dateA;
      });

      setAllSocialCases(docs); 
      setCases(docs);
      setLoading(false);
    }, (error) => {
      console.error("❌ Error de Firebase en SocialView:", error);
    });

    const qStudents = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), where('isActive', '==', true));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsub(); unsubStudents(); };
  }, [isAllowed, db, appId]);

  const hasNews = (c) => {
    const lastSeenCount = parseInt(localStorage.getItem(`lastSeenSocial_${c.id}_${user.id}`) || "0");
    return (c.history?.length || 0) > lastSeenCount;
  };

  const handleOpenCase = (c) => {
    let studentInfo = students.find(s => c.studentId && s.id === c.studentId);

    if (!studentInfo) {
      studentInfo = students.find(s => {
        if (c.dni && s.dni && c.dni === s.dni) return true;
        const fullName = `${s.lastName || ''}, ${s.firstName || ''}`.trim().toLowerCase();
        return (c.studentName || '').trim().toLowerCase() === fullName;
      });
    }

    setSelectedCase({ ...c, fullInfo: studentInfo });
    localStorage.setItem(`lastSeenSocial_${c.id}_${user.id}`, c.history?.length || 0);
  };

  const updateStep = async (caseId, stepName) => {
    const c = cases.find(x => x.id === caseId);
    if (!c) return;

    const field = stepName === 'continuidad' ? 'sent' : 'done';
    const currentValue = c.steps?.[stepName]?.[field] || false;
    const label = stepName === 'continuidad' ? 'CONTINUIDAD PEDAGÓGICA' : 'LLAMADA A LA FAMILIA';
    const userFullName = user.fullName || `${user.firstName} ${user.lastName}`;

    try {
      const caseRef = doc(db, 'artifacts', appId, 'public', 'data', 'social_cases', caseId);
      
      const newSteps = { 
        ...c.steps, 
        [stepName]: { 
          ...c.steps?.[stepName], 
          [field]: !currentValue, 
          date: !currentValue ? new Date().toLocaleDateString('es-AR') : null, 
          author: userFullName 
        } 
      };

      if (!currentValue) {
        const autoNote = { 
          date: new Date().toISOString(), 
          text: `📢 REGISTRO AUTOMÁTICO: ${userFullName} marcó como REALIZADA la acción de "${label}".`, 
          author: userFullName
        };
        
        await updateDoc(caseRef, { 
          steps: newSteps,
          history: arrayUnion(autoNote) 
        });
      } else {
        await updateDoc(caseRef, { steps: newSteps });
      }

      if (selectedCase && selectedCase.id === caseId) {
        setSelectedCase(prev => ({
          ...prev,
          steps: newSteps,
          history: !currentValue ? [...(prev.history || []), { 
            text: `📢 REGISTRO AUTOMÁTICO: Marcaron como realizada "${label}".`, 
            author: userFullName, 
            date: new Date().toISOString() 
          }] : prev.history
        }));
      }
    } catch (err) {
      console.error("Error al actualizar paso:", err);
      alert("Error al guardar el cambio.");
    }
  };

  const handleAddComment = async (caseId) => {
    const text = newComment[caseId];
    if (!text || !text.trim()) return;
    const userFullName = user.fullName || `${user.firstName} ${user.lastName}`;
    const entry = { date: new Date().toISOString(), text: text.trim(), author: userFullName };
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'social_cases', caseId), { 
        history: arrayUnion(entry) 
      });

      if (selectedCase && selectedCase.id === caseId) {
        setSelectedCase(prev => ({ ...prev, history: [...(prev.history || []), entry] }));
      }
      setNewComment({ ...newComment, [caseId]: "" });
      alert("💬 Comentario registrado (+10 pts)");
    } catch (error) {
      alert("No se pudo enviar el mensaje.");
    }
  };

  // NUEVA FUNCIÓN PARA ARCHIVAR/REACTIVAR EL CASO
  const handleArchiveCase = async (c) => {
    const isCurrentlyArchived = c.status === 'Archivado' || c.status === 'Reincorporado';
    const confirmMsg = isCurrentlyArchived 
      ? "¿Deseas reactivar este caso? Volverá a la lista de activos." 
      : "❗ ¿Imprimiste el reporte para el legajo físico? El caso pasará al archivo.";
    
    if (confirm(confirmMsg)) {
        const newStatus = isCurrentlyArchived ? 'Pendiente' : 'Archivado';
        const userFullName = user.fullName || `${user.firstName} ${user.lastName}`;
        
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'social_cases', c.id), { 
                status: newStatus,
                updatedAt: serverTimestamp(),
                history: arrayUnion({
                    date: new Date().toISOString(),
                    text: newStatus === 'Archivado' ? "📦 CASO ARCHIVADO por Trabajo Social." : "🔄 CASO REACTIVADO por Trabajo Social.",
                    author: userFullName
                })
            });
            setSelectedCase(null);
            alert(newStatus === 'Archivado' ? "Caso archivado correctamente." : "Caso reactivado con éxito.");
        } catch (error) {
            alert("Error al actualizar el estado: " + error.message);
        }
    }
  };

  // NUEVA FUNCIÓN PARA BORRAR EL CASO POR COMPLETO
  const handleDeleteCase = async (c) => {
    if (!confirm("⚠️ ATENCIÓN: ¿Borrar definitivamente este caso de la base de datos? Esta acción no se puede deshacer.")) return;
    
    try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'social_cases', c.id));
        setSelectedCase(null);
        alert("Caso eliminado con éxito de la base de datos.");
    } catch (error) {
        alert("Error al eliminar: " + error.message);
    }
  };

  const imprimirSeguimientoSocial = (c) => {
    const docHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Informe - ${c.studentName}</title>
          <meta charset="UTF-8">
          <style>
            body { font-family: sans-serif; padding: 20px; color: #1e293b; background: white; }
            .header { border-bottom: 4px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
            .logo-img { height: 50px; width: auto; }
            .main-card { border: 2px solid #e2e8f0; border-radius: 15px; padding: 15px; margin-bottom: 20px; background: #f8fafc; }
            .label { font-size: 9px; font-weight: 900; color: #2563eb; text-transform: uppercase; display: block; }
            .value { font-size: 13px; font-weight: bold; }
            .history-item { padding: 10px 0; border-bottom: 1px solid #f1f5f9; }
            .history-meta { font-size: 9px; font-weight: 800; color: #64748b; display: flex; justify-content: space-between; }
          </style>
        </head>
        <body>
          <div class="header">
            <img src={getCachedAppConfig().logoUrl || '/icon-192.png'} class="logo-img" />
            <div style="text-align: right;">
              <h1 style="margin:0; font-size: 18px; color: #1e3a8a;">JUNTOS A LA PAR</h1>
              <p style="margin:0; font-size: 10px; font-weight: bold;">INFORME SOCIAL</p>
            </div>
          </div>
          <div class="main-card">
            <div><span class="label">Estudiante</span><div class="value">${c.studentName}</div></div>
            <div style="margin-top:10px;"><span class="label">Motivo del Reporte</span><div class="value" style="font-style:italic;">"${c.reason}"</div></div>
          </div>
          <h3>Seguimiento</h3>
          ${c.history?.map(h => `
            <div class="history-item">
              <div class="history-meta"><span>${new Date(h.date).toLocaleDateString('es-AR')}</span><span>${h.author.toUpperCase()}</span></div>
              <div style="font-size:11px; margin-top:4px;">${h.text}</div>
            </div>
          `).join('') || '<p>Sin registros.</p>'}
          <script>window.onload = function() { setTimeout(() => { window.print(); }, 800); };</script>
        </body>
      </html>
    `;
    const blob = new Blob([docHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (!win) { window.location.href = url; }
  };

  const filteredCases = cases.filter(c => {
    const term = searchTerm.trim().toLowerCase();
    if (term) {
      return c.studentName?.toLowerCase().includes(term);
    }

    const isArchived = c.status === 'Reincorporado' || c.status === 'Archivado';
    if (viewMode === 'archived' && !isArchived) return false;
    if (viewMode === 'active' && isArchived) return false;

    if (filter !== 'all' && c.status !== 'Pendiente') {
      const level = (c.level || '').toUpperCase();
      if (filter === 'primeros') {
        const esPrimeros = level.includes('INICIAL') || level.includes('1°') || level.includes('1ERA');
        if (!esPrimeros) return false;
      }
      if (filter === 'segundos') {
        const esSegundos = level.includes('2°') || level.includes('2DA') || level.includes('CFI');
        if (!esSegundos) return false;
      }
    }

    return true;
  });

  return (
    <div className="h-full flex flex-col space-y-4 animate-in fade-in pb-20">
      {/* HEADER PRINCIPAL */}
      <div className="bg-white p-4 md:p-6 rounded-b-[40px] shadow-sm border-b border-blue-100 space-y-4 shrink-0">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-xl text-white"><Users size={24}/></div>
            <h2 className="text-xl font-black text-slate-800 uppercase italic">Seguimiento Social</h2>
          </div>
          <button onClick={() => setViewMode(viewMode === 'active' ? 'archived' : 'active')} className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase shadow-sm transition-all ${viewMode === 'active' ? 'bg-slate-800 text-white' : 'bg-blue-600 text-white'}`}>
            {viewMode === 'active' ? 'Ver Archivo' : 'Ver Activos'}
          </button>
        </div>

        <div className="flex flex-col md:flex-row gap-2">
          <div className="flex-1 bg-slate-100 rounded-xl flex items-center px-3 border border-transparent focus-within:border-blue-400 focus-within:bg-white transition-all">
            <Search size={18} className="text-slate-400"/>
            <input 
              value={searchTerm} 
              onChange={(e) => setSearchProfile(e.target.value)} 
              placeholder="Buscar por nombre, apellido o DNI..." 
              className="w-full p-3 bg-transparent outline-none text-sm font-bold"
            />
            {searchTerm && <button onClick={() => setSearchProfile('')}><X size={16} className="text-slate-400"/></button>}
          </div>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className="bg-slate-100 text-slate-600 font-bold text-[10px] p-3 rounded-xl uppercase outline-none border-none">
            <option value="all">Todos los Ciclos</option>
            <option value="primeros">Inicial / 1° Ciclo</option>
            <option value="segundos">2° Ciclo / CFI</option>
          </select>
        </div>
      </div>

      {/* LISTA VERTICAL */}
      <div className="flex-1 overflow-y-auto px-4 space-y-3 custom-scrollbar">
        {loading ? <p className="text-center py-20 opacity-20 font-black">CARGANDO...</p> : filteredCases.map(c => {
            const caseHasNews = hasNews(c);
            const isArchived = c.status === 'Reincorporado' || c.status === 'Archivado';
            return (
              <div key={c.id} onClick={() => handleOpenCase(c)} className={`bg-white p-5 rounded-[30px] border-2 flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer ${isArchived ? 'opacity-60 grayscale' : ''} ${caseHasNews ? 'border-orange-400 ring-4 ring-orange-50 shadow-lg' : 'border-transparent shadow-sm hover:border-blue-100'}`}>
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black shrink-0 ${isArchived ? 'bg-slate-400' : caseHasNews ? 'bg-orange-500 animate-pulse' : 'bg-blue-600 shadow-inner'}`}>{c.studentName[0]}</div>
                  <div className="truncate">
                    <h4 className="font-black text-slate-700 text-sm uppercase truncate leading-tight">{c.studentName}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">{c.level}</p>
                      {isArchived && <span className="bg-slate-100 text-slate-500 text-[8px] font-black px-1.5 py-0.5 rounded uppercase">Archivado</span>}
                    </div>
                    {caseHasNews && !isArchived && <p className="text-[8px] font-black text-orange-600 uppercase mt-1 animate-bounce">● Mensaje nuevo</p>}
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-300"/>
              </div>
            );
        })}
      </div>

      {selectedCase && (
        <div className="fixed inset-0 bg-white z-[100] flex flex-col animate-in slide-in-from-right duration-300">
          <div className="bg-slate-900 p-4 sm:p-6 text-white flex justify-between items-center shrink-0 shadow-2xl">
            <button onClick={() => setSelectedCase(null)} className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-xl hover:bg-white/20 transition">
              <ChevronLeft size={20}/> <span className="text-xs font-black uppercase tracking-tighter">Volver</span>
            </button>
            <div className="text-center flex-1 min-w-0"><h2 className="text-sm font-black uppercase truncate px-4">{selectedCase.studentName}</h2></div>
            <div className="flex gap-2">
              <button onClick={() => imprimirSeguimientoSocial(selectedCase)} className="p-3 bg-white/10 rounded-xl hover:bg-blue-600 transition" title="Imprimir"><Printer size={20}/></button>
              
              <button 
                onClick={() => handleArchiveCase(selectedCase)} 
                className={`p-3 rounded-xl transition ${selectedCase.status === 'Archivado' || selectedCase.status === 'Reincorporado' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-white/10 hover:bg-emerald-600'}`} 
                title={selectedCase.status === 'Archivado' || selectedCase.status === 'Reincorporado' ? "Reactivar Caso" : "Archivar Caso"}
              >
                {selectedCase.status === 'Archivado' || selectedCase.status === 'Reincorporado' ? <RefreshCw size={20}/> : <Folder size={20}/>}
              </button>

              <button 
                onClick={() => handleDeleteCase(selectedCase)} 
                className="p-3 bg-white/10 text-white hover:bg-red-600 rounded-xl transition shadow-sm" 
                title="Eliminar Caso"
              >
                <Trash2 size={20}/>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col lg:flex-row h-full">
            <div className="w-full lg:w-80 bg-white border-b lg:border-r border-slate-200 p-6 space-y-6 shrink-0 overflow-y-auto custom-scrollbar">
              <div className="flex flex-col items-center">
                <div className="w-48 h-48 rounded-[40px] bg-slate-100 border-4 border-white shadow-xl overflow-hidden mb-3">
                  {selectedCase.fullInfo?.photoUrl ? (
                    <img src={selectedCase.fullInfo.photoUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-6xl uppercase">{selectedCase.studentName[0]}</div>
                  )}
                </div>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">DNI: {selectedCase.fullInfo?.dni || 'S/D'}</p>
              </div>

              <button onClick={() => setViewingStudent(selectedCase.fullInfo)} className="w-full py-4 bg-orange-500 text-white rounded-3xl font-black uppercase text-xs shadow-lg flex items-center justify-center gap-2">
                  <BookOpen size={18}/> Ver Bitácora de Aula
              </button>

              <div className="bg-orange-50 p-5 rounded-[35px] border border-orange-100 space-y-4">
                <h4 className="text-[10px] font-black text-orange-600 uppercase tracking-widest flex items-center gap-2">Ubicación y Equipo</h4>
                <div className="space-y-3 text-xs font-bold">
                    <div className="bg-white/80 p-3 rounded-2xl shadow-sm border border-orange-100">
                        <p className="text-[8px] font-black text-gray-400 uppercase mb-1">Nivel / Ciclo</p>
                        <p className="text-slate-800 uppercase">{selectedCase.fullInfo?.level || 'S/D'}</p>
                    </div>
                    <div className="bg-white/80 p-3 rounded-2xl shadow-sm border border-orange-100">
                        <p className="text-[8px] font-black text-orange-400 uppercase mb-1">Mañana: {selectedCase.fullInfo?.groupMorning || '-'}</p>
                        <p className="text-[10px] text-slate-700">Doc: {selectedCase.fullInfo?.teacherMorning || '-'}</p>
                    </div>
                    <div className="bg-white/80 p-3 rounded-2xl shadow-sm border border-orange-100">
                        <p className="text-[8px] font-black text-orange-400 uppercase mb-1">Tarde: {selectedCase.fullInfo?.groupAfternoon || '-'}</p>
                        <p className="text-[10px] text-slate-700">Doc: {selectedCase.fullInfo?.teacherAfternoon || '-'}</p>
                    </div>
                </div>
              </div>

              <div className="bg-blue-50 p-5 rounded-[35px] border border-blue-100">
                <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-3 flex items-center gap-1">Familia</h4>
                <div className="space-y-4">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Madre: {selectedCase.fullInfo?.motherName || 'S/D'}</p>
                    <a href={`tel:${selectedCase.fullInfo?.motherContact}`} className="text-blue-600 text-sm font-black flex items-center gap-1">{selectedCase.fullInfo?.motherContact || 'S/N'}</a>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-4 h-full min-h-[600px]">
              <div className="grid grid-cols-2 gap-3 shrink-0">
                <button onClick={() => updateStep(selectedCase.id, 'llamada')} className={`flex flex-col items-center gap-2 p-5 rounded-[35px] border-2 transition-all ${selectedCase.steps?.llamada?.done ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
                  <Phone size={24}/> <span className="text-[11px] font-black uppercase">Llamada</span>
                </button>
                <button onClick={() => updateStep(selectedCase.id, 'continuidad')} className={`flex flex-col items-center gap-2 p-5 rounded-[35px] border-2 transition-all ${selectedCase.steps?.continuidad?.sent ? 'bg-indigo-600 border-indigo-700 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
                  <BookOpen size={24}/> <span className="text-[11px] font-black uppercase">Continuidad</span>
                </button>
              </div>

              <div className="flex-1 flex flex-col bg-white rounded-[45px] border border-slate-200 shadow-xl overflow-hidden min-h-[400px]">
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/20">
                  {selectedCase.history?.map((h, i) => (
                    <div key={i} className={`flex flex-col ${h.author.includes(user.firstName) ? 'items-end' : 'items-start'}`}>
                      <div className={`max-w-[85%] p-4 rounded-[25px] text-sm font-bold shadow-sm ${h.author.includes(user.firstName) ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white text-slate-700 rounded-tl-none border border-slate-100'}`}>
                        <p className="text-[8px] font-black uppercase opacity-60 mb-2">{h.author} • {new Date(h.date).toLocaleDateString()}</p>
                        {h.text}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
                  <input value={newComment[selectedCase.id] || ""} onChange={(e) => setNewComment({ ...newComment, [selectedCase.id]: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleAddComment(selectedCase.id)} placeholder="Registrar novedad..." className="flex-1 bg-slate-100 p-4 rounded-2xl text-sm font-bold border border-slate-200 outline-none focus:ring-2 ring-blue-500"/>
                  <button onClick={() => handleAddComment(selectedCase.id)} className="bg-blue-600 text-white p-4 rounded-2xl shadow-lg active:scale-95 transition-all flex-shrink-0"><Send size={20}/></button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
