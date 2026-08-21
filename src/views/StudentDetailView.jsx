import React, { useState } from 'react';
import { 
  X, Users, AlertTriangle, Edit3, Trash2
} from 'lucide-react';
import { doc, updateDoc, arrayUnion, addDoc, collection, serverTimestamp } from 'firebase/firestore';

export function StudentDetailView({ student, onClose, onEdit, db, appId, user }) {
  const [activeTabModal, setActiveTabModal] = useState("info");
  const [isWriting, setIsWriting] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [loading, setLoading] = useState(false);
  
  const INCIDENT_TYPES = [
    { label: "Trabajó Muy Bien", emoji: "🌟", severity: "positive", color: "bg-emerald-100 border-emerald-300 text-emerald-800" },
    { label: "Ayudó a un amigo", emoji: "🤝", severity: "positive", color: "bg-emerald-100 border-emerald-300 text-emerald-800" },
    { label: "Logro de Aprendizaje", emoji: "🚀", severity: "positive", color: "bg-emerald-100 border-emerald-300 text-emerald-800" },
    { label: "Buena Conducta", emoji: "😇", severity: "positive", color: "bg-emerald-100 border-emerald-300 text-emerald-800" },
    { label: "Crisis Llanto", emoji: "😭", severity: "medium", color: "bg-orange-100 border-orange-300 text-orange-800" },
    { label: "Higiene / Esfínter", emoji: "💩", severity: "medium", color: "bg-blue-100 border-blue-300 text-blue-800" }, 
    { label: "No trabajó", emoji: "💤", severity: "low", color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
    { label: "Llegada Tarde", emoji: "🕑", severity: "low", color: "bg-yellow-50 border-yellow-200 text-yellow-700" },
    { label: "No comió", emoji: "🍽️", severity: "low", color: "bg-blue-50 border-blue-200 text-blue-700" }, 
    { label: "Agresión / Violencia", emoji: "👊", severity: "high", color: "bg-red-100 border-red-300 text-red-800" },
    { label: "Brote / Gritos", emoji: "🤬", severity: "high", color: "bg-red-100 border-red-300 text-red-800" },
    { label: "Fuga / Intento", emoji: "🏃", severity: "high", color: "bg-red-100 border-red-300 text-red-800" },
    { label: "Convulsión / Salud", emoji: "🚑", severity: "high", color: "bg-indigo-100 border-indigo-300 text-indigo-800" },
    { label: "Ausentismo", emoji: "🏠", severity: "medium", color: "bg-blue-100 border-blue-300 text-blue-800" }, // 👈 BOTÓN AGREGADO AQUÍ
  ];

  if (!student) return null;

  const calculateAge = (d) => {
    if (!d) return '-';
    const t = new Date();
    const b = new Date(d + 'T12:00:00');
    let a = t.getFullYear() - b.getFullYear();
    const m = t.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
    return a;
  };

 const handleSaveIncident = async (type, severity, text = "") => {
   alert("¡Hiciste clic! Tipo recibido: " + type);
    // 1. Validamos que Firebase esté disponible antes de hacer nada
    if (!db || !appId) {
      alert("❌ Error crítico: Firebase (db) o el appId no están configurados en esta vista.");
      console.error("Faltan credenciales:", { db, appId, user });
      return;
    }

    setLoading(true);
    try {
      console.log("🟢 1. Guardando en la bitácora del alumno:", student.id);
      const studentRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', student.id);
      const entry = {
        date: new Date().toISOString(),
        type: type,
        text: text || type,
        severity: severity,
        author: user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || "Docente",
        authorId: user?.id || "unknown"
      };
      
      await updateDoc(studentRef, { incidents: arrayUnion(entry) });
      
      if (user?.id) {
      }
      
      // 2. Validamos si es ausentismo de forma estricta
      const esAusentismo = type && type.toLowerCase().includes("ausentismo");
      console.log("🟢 2. ¿Es ausentismo?", esAusentismo, "Tipo:", type);

      if (esAusentismo) {
        console.log("🟢 3. Intentando crear caso social en social_cases con appId:", appId);
        const socialRef = collection(db, 'artifacts', appId, 'public', 'data', 'social_cases');
        
        const payloadSocial = {
            studentId: student.id,
            dni: student.dni || "",
            studentName: `${student.lastName}, ${student.firstName}`,
            level: student.level || "SEDE",
            reason: "REPORTE DESDE AULA: Ausentismo detectado.",
            status: "Pendiente",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            steps: { llamada: { done: false }, continuidad: { sent: false } },
            history: [{ 
              date: new Date().toISOString(), 
              text: `📢 REGISTRO AUTOMÁTICO: Reporte de ausentismo registrado.`, 
              author: user?.firstName || "Docente" 
            }]
        };

        const docRefSocial = await addDoc(socialRef, payloadSocial);
        console.log("✅ ¡Caso social creado exitosamente con ID:", docRefSocial.id);
        alert("✅ ¡Caso creado y derivado a Trabajo Social con éxito!");
      } else {
        alert("✅ Incidencia guardada correctamente en la bitácora.");
      }

      setNewNote('');
      setIsWriting(false);
    } catch (e) { 
      console.error("❌ ERROR COMPLETO EN FIREBASE:", e);
      alert("❌ Error de Firebase al guardar: " + e.message); 
    } finally { 
      setLoading(false); 
    }
  };

const handleReportAbsenteeism = async () => {
    const reason = prompt("¿Motivo del ausentismo prolongado? (Ej: Salud, Viaje, etc.)");
    if (!reason) return;
    
    if (!db || !appId) {
      alert("❌ Error: Faltan credenciales de Firebase (db o appId).");
      return;
    }

    setLoading(true);
    try {
      console.log("🟢 [Reporte Ausentismo] Iniciando registro para alumno ID:", student.id);
      const studentRef = doc(db, 'artifacts', appId, 'public', 'data', 'students', student.id);
      const entry = {
        date: new Date().toISOString(),
        type: 'AUSENTISMO PROLONGADO',
        text: `Alerta de ausentismo: ${reason}`,
        severity: 'medium',
        author: user?.firstName || "Docente",
        authorId: user?.id || "unknown"
      };
      
      await updateDoc(studentRef, { 
        incidents: arrayUnion(entry),
        absenteeismAlert: true 
      });

      // 🚨 CREACIÓN DIRECTA Y SEGURA DEL CASO SOCIAL (Sin duplicados y bien escrito)
      const socialRef = collection(db, 'artifacts', appId, 'public', 'data', 'social_cases');
      const docRefSocial = await addDoc(socialRef, {
          studentId: student.id,           // 👈 ID Único estricto (evita cruce con apellidos repetidos)
          dni: student.dni || "",          // 👈 DNI de respaldo
          studentName: `${student.lastName}, ${student.firstName}`,
          level: student.level || "SEDE",
          reason: `REPORTE DESDE AULA: Ausentismo prolongado (${reason}).`,
          status: "Pendiente",             // 👈 Vital para ver en activos
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          steps: { llamada: { done: false }, continuidad: { sent: false } },
          history: [{ 
            date: new Date().toISOString(), 
            text: `Alerta de ausentismo: ${reason}`, 
            author: user?.firstName || "Docente" 
          }]
      });

      console.log("✅ ¡Caso social creado con éxito! ID:", docRefSocial.id);

      if (user?.id) {
      }

      alert("⚠️ Alerta enviada al Equipo Técnico y derivada a Trabajo Social.");
    } catch (e) { 
      console.error("❌ Error crítico al reportar ausentismo:", e);
      alert("Error al guardar en Firebase: " + e.message); 
    } finally { 
      setLoading(false); 
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
      <div className="bg-white rounded-[40px] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95">
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white relative shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 p-2 rounded-full transition"><X size={20}/></button>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/30 overflow-hidden flex items-center justify-center font-black text-3xl shadow-inner">
              {student.photoUrl ? <img src={student.photoUrl} className="w-full h-full object-cover" alt="pibe"/> : student.firstName?.[0]}
            </div>
            <div>
              <h2 className="text-2xl font-bold uppercase tracking-tight leading-tight">{student.lastName}, {student.firstName}</h2>
              <p className="opacity-90 text-xs font-bold uppercase mt-1 tracking-widest text-cyan-50">{student.modality || 'Sede'}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-6">
            <button onClick={() => setActiveTabModal("info")} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition ${activeTabModal === "info" ? "bg-white text-blue-600 shadow-md" : "bg-black/20 text-white/70"}`}>Datos</button>
            <button onClick={() => setActiveTabModal("history")} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition ${activeTabModal === "history" ? "bg-white text-blue-600 shadow-md" : "bg-black/20 text-white/70"}`}>Bitácora</button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 no-scrollbar flex-1 bg-gray-50">
          {activeTabModal === "info" ? (
            <div className="space-y-5 animate-in fade-in">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white p-3 rounded-2xl border text-center shadow-sm">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">DNI</p>
                  <p className="font-bold text-slate-800 text-xs">{student.dni || '-'}</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-2xl border text-center shadow-sm">
                  <p className="text-[8px] font-black text-blue-400 uppercase mb-1">Edad</p>
                  <p className="font-bold text-blue-700 text-xs">{calculateAge(student.birthDate)} años</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-2xl border text-center shadow-sm">
                   <p className="text-[8px] font-black text-orange-400 uppercase mb-1">DX</p>
                   <p className="font-bold text-orange-700 text-[10px] truncate">{student.dx || '-'}</p>
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border text-center shadow-sm">
                <h3 className="font-black text-slate-400 text-[10px] uppercase mb-2 tracking-widest"><Users size={12}/> Familia</h3>
                <div className="space-y-1">
                  <p className="text-sm text-slate-700">M: <b className="text-slate-900">{student.motherName || 'S/D'}</b></p>
                  <p className="text-sm text-slate-700">P: <b className="text-slate-900">{student.fatherName || 'S/D'}</b></p>
                </div>
              </div>
              <button onClick={handleReportAbsenteeism} className="w-full py-4 bg-red-50 text-red-700 font-black rounded-2xl border border-red-200 flex items-center justify-center gap-2 hover:bg-red-100 transition shadow-sm uppercase text-[10px] tracking-widest">
                <AlertTriangle size={18}/> Reportar Ausentismo (+3 días)
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in pb-10">
              {!isWriting && (
                <div className="grid grid-cols-2 gap-2 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                  {INCIDENT_TYPES.map((type) => (
                    <button key={type.label} disabled={loading} onClick={() => handleSaveIncident(type.label, type.severity)} className={`p-3 rounded-2xl border-2 flex flex-col items-center justify-center gap-1 transition active:scale-95 ${type.color} ${loading ? 'opacity-50' : ''}`}>
                      <span className="text-2xl">{type.emoji}</span>
                      <span className="text-[9px] font-black uppercase text-center leading-tight">{type.label}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="bg-slate-100 p-4 rounded-2xl border border-slate-200 shadow-inner">
                {isWriting ? (
                  <div className="space-y-2">
                    <textarea autoFocus value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Detalles de la nota..." className="w-full p-3 bg-white border rounded-xl text-sm h-24 outline-none shadow-sm" />
                    <div className="flex gap-2">
                      <button onClick={() => setIsWriting(false)} className="flex-1 py-3 text-gray-400 font-bold uppercase text-[10px]">Cancelar</button>
                      <button onClick={() => handleSaveIncident('Nota Manual', 'medium', newNote)} className="flex-[2] py-3 bg-violet-600 text-white rounded-xl font-bold uppercase text-[10px] shadow-lg">Guardar</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setIsWriting(true)} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold uppercase text-[10px] flex items-center justify-center gap-2 hover:bg-slate-700 transition shadow-md">
                    <Edit3 size={16}/> Escribir Nota Detallada
                  </button>
                )}
              </div>
              <div className="space-y-2 mt-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Historial Reciente</h4>
                {student.incidents?.slice().reverse().map((inc, i) => (
                  <div key={i} className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm border-l-4 border-l-violet-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black text-violet-400 uppercase">{new Date(inc.date).toLocaleDateString('es-AR')}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase italic">Por: {inc.author}</span>
                    </div>
                    <p className="font-bold text-slate-700 text-sm leading-relaxed">{inc.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-white shrink-0">
          <button 
            onClick={() => { 
              onClose(); 
              onEdit(student); 
            }} 
            className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl hover:bg-black transition"
          >
            Ver Legajo Completo
          </button>
        </div>
      </div>
    </div>
  );
}
