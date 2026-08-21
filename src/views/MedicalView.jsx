import { getInstitutionName, getCachedAppConfig } from '../config';
import React, { useState, useEffect } from 'react';
import { 
  Search, X, Activity, AlertTriangle, Printer, Edit3, FileText, Plus, Trash2, RefreshCw 
} from 'lucide-react';
import { 
  collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, orderBy 
} from 'firebase/firestore';

export function MedicalView({ user, db, appId }) {
  const [students, setStudents] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showEvoForm, setShowEvoForm] = useState(false);

  // Permisos: Solo Salud, Directivos y Admins
  const canAccess = ['admin', 'super-admin', 'Equipo Directivo', 'Dirección Inclusión', 'Médico', 'Enfermería', 'Salud'].includes(user.role) || user.rol === 'admin';

 // --- DENTRO DE MEDICALVIEW ---
  useEffect(() => {
    const qS = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), where('isActive', '==', true));
    const unsubS = onSnapshot(qS, (snap) => { setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });
    
    // CORRECCIÓN: Borramos la referencia a setUsersList que no existe aquí
    const qStaff = query(collection(db, 'artifacts', appId, 'public', 'data', 'staff_records'), orderBy('lastName', 'asc'));
    const unsubStaff = onSnapshot(qStaff, (snap) => { 
        // Si necesitas el personal en esta vista, declará [staff, setStaff] arriba
        // sino, simplemente borrá esta suscripción.
    });

    return () => { unsubS(); unsubStaff(); };
  }, []);

  const getSafeDate = (d) => { if(!d) return '-'; try { return new Date(d.includes('T') ? d : d+'T00:00:00').toLocaleDateString('es-AR'); } catch(e) { return d; } };
  const calculateAge = (d) => { if (!d) return '-'; const t = new Date(); const b = new Date(d); let a = t.getFullYear() - b.getFullYear(); const m = t.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--; return a; };

 // --- FUNCIÓN PARA VERIFICAR ESTADO DE CUD (AGREGAR ESTA) ---
  const checkCudStatus = (cudDate) => {
    if (!cudDate || cudDate === "") return { status: 'none', text: 'Sin fecha' };
    
    const today = new Date();
    const exp = new Date(cudDate + 'T00:00:00');
    const diffTime = exp - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return { status: 'expired', text: 'Vencido' };
    if (diffDays <= 90) return { status: 'warning', text: `Vence en ${diffDays} días` }; // Alerta 3 meses antes
    
    return { status: 'ok', text: 'Vigente' };
  };
  const handleSaveMedicalData = async (e) => {
      e.preventDefault();
      setSaving(true);
      const fd = new FormData(e.target);
      
      const updates = {
          healthInsurance: fd.get('healthInsurance'),
          cudExpiration: fd.get('cudExpiration'),
          cudDiagnosis: fd.get('cudDiagnosis'),
          allergies: fd.get('allergies'),
          medication: fd.get('medication'),
          weight: fd.get('weight'),
          vaccines: fd.get('vaccines')
      };

      try {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', selectedStudent.id), updates);
          setSelectedStudent({ ...selectedStudent, ...updates });
          setIsEditing(false);
      } catch (err) { alert("Error al guardar: " + err.message); } 
      finally { setSaving(false); }
  };

  const handleAddEvolution = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const text = fd.get('text');
      const date = fd.get('date');
      if (!text.trim()) return;

      const newEvo = {
          id: Date.now().toString(),
          date: date,
          text: text.trim(),
          author: user.firstName + (user.lastName ? ' ' + user.lastName : '')
      };
      
      try {
          setSaving(true);
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', selectedStudent.id), { 
            medicalEvolutions: arrayUnion(newEvo) 
          });setSelectedStudent({ ...selectedStudent, medicalEvolutions: [...(selectedStudent.medicalEvolutions || []), newEvo] });
          setShowEvoForm(false);
          alert("📋 Evolución médica guardada (+10 pts)");
      } catch (err) { alert("Error: " + err.message); }
      finally { setSaving(false); }
  };
      
    
      
      

  const handleDeleteEvolution = async (evoId) => {
      if (!confirm("¿Seguro que querés eliminar este registro clínico?")) return;
      const updatedEvos = (selectedStudent.medicalEvolutions || []).filter(e => e.id !== evoId);
      try {
          await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', selectedStudent.id), { medicalEvolutions: updatedEvos });
          setSelectedStudent({ ...selectedStudent, medicalEvolutions: updatedEvos });
      } catch (err) { alert("Error al eliminar: " + err.message); }
  };

  // --- FUNCIÓN DE IMPRESIÓN ACTUALIZADA CON LOGO ---
  const imprimirHistoriaClinica = (student) => {
      const fullDate = new Date().toLocaleDateString('es-AR');
      const evos = student.medicalEvolutions || [];
      
      let evosHtml = evos.length > 0 
          ? evos.slice().sort((a,b) => new Date(b.date) - new Date(a.date)).map(e => `<div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px dotted #ccc;">
              <div style="font-size: 11px; color: #666; margin-bottom: 4px;"><strong>${new Date(e.date + 'T00:00:00').toLocaleDateString('es-AR')}</strong> | Registro de: ${e.author}</div>
              <div style="font-size: 13px; line-height: 1.5; white-space: pre-wrap;">${e.text}</div>
            </div>`).join('')
          : '<p style="font-size: 13px; color: #666; font-style: italic;">No hay registros clínicos guardados en este legajo.</p>';

      let html = `
      <html><head><title>Historia Clínica - ${student.lastName}</title>
      <style>
          body { font-family: Arial, sans-serif; padding: 30px; color: #111; line-height: 1.4; position: relative; min-height: 100vh; padding-bottom: 150px;}
          .header { border-bottom: 3px solid #b91c1c; padding-bottom: 15px; margin-bottom: 25px; display: flex; align-items: center; justify-content: space-between;}
          .title { font-size: 22px; font-weight: 900; color: #b91c1c; text-transform: uppercase; }
          .subtitle { font-size: 14px; font-weight: bold; color: #555; margin-top: 5px;}
          .section { margin-bottom: 25px; }
          .section-title { background: #fee2e2; color: #991b1b; padding: 8px 12px; font-weight: bold; font-size: 14px; text-transform: uppercase; margin-bottom: 15px; border-radius: 4px;}
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
          .label { font-weight: bold; color: #666; text-transform: uppercase; font-size: 10px; display: block; margin-bottom: 2px;}
          .value { font-size: 14px; font-weight: bold; color: #000;}
          .signature-box { width: 100%; max-width: 300px; text-align: center; font-size: 12px; color: #333; }
          @media print {
            .signature-container { position: fixed; bottom: 30px; left: 30px; right: 30px; display: flex; justify-content: flex-end; width: calc(100% - 60px); }
          }
          @media screen {
            .signature-container { margin-top: 50px; display: flex; justify-content: flex-end; }
          }
      </style>
      </head><body>
          <div class="header">
              <div style="display: flex; align-items: center; gap: 15px;">
                <img src={getCachedAppConfig().logoUrl || '/icon-192.png'} alt="Logo institucional" style="width: 60px; height: 60px; object-fit: contain;">
                  <div>
                      <div class="title">HISTORIA CLÍNICA</div>
                      <div class="subtitle">${getInstitutionName()}</div>
                  </div>
              </div>
              <div style="text-align: right; font-size: 11px; color: #666;">
                  Documento Confidencial<br/>
                  Fecha de impresión: <strong>${fullDate}</strong>
              </div>
          </div>

          <div class="section">
              <div class="section-title">Datos del Paciente</div>
              <div class="grid">
                  <div><span class="label">Nombre y Apellido</span><div class="value">${student.lastName.toUpperCase()}, ${student.firstName}</div></div>
                  <div><span class="label">DNI</span><div class="value">${student.dni || '-'}</div></div>
                  <div><span class="label">Fecha de Nacimiento</span><div class="value">${student.birthDate ? new Date(student.birthDate + 'T00:00:00').toLocaleDateString('es-AR') : '-'}</div></div>
                  <div><span class="label">Edad Actual</span><div class="value">${calculateAge(student.birthDate)} años</div></div>
              </div>
          </div>

          <div class="section">
              <div class="section-title">Información Médica de Base</div>
              <div class="grid">
                  <div><span class="label">Obra Social</span><div class="value">${student.healthInsurance || 'No declara'}</div></div>
                  <div><span class="label">Vencimiento CUD</span><div class="value">${student.cudExpiration ? new Date(student.cudExpiration + 'T00:00:00').toLocaleDateString('es-AR') : 'Sin cargar'}</div></div>
                  <div style="grid-column: span 2;"><span class="label">Diagnóstico CUD / Médico</span><div class="value">${student.cudDiagnosis || 'S/D'}</div></div>
                  <div style="grid-column: span 2; padding: 10px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 4px;">
                      <span class="label" style="color: #be123c;">Alergias Declaradas</span>
                      <div class="value" style="color: #9f1239;">${student.allergies || 'Ninguna'}</div>
                  </div>
                  <div style="grid-column: span 2;"><span class="label">Medicación Habitual</span><div class="value">${student.medication || 'S/D'}</div></div>
                  <div><span class="label">Peso Aprox.</span><div class="value">${student.weight ? student.weight + ' kg' : 'S/D'}</div></div>
                  <div><span class="label">Vacunación</span><div class="value">${student.vaccines || 'S/D'}</div></div>
              </div>
          </div>

          <div class="section">
              <div class="section-title">Registros y Evoluciones</div>
              ${evosHtml}
          </div>

          <div class="signature-container">
            <div class="signature-box">
                <img src={getCachedAppConfig().logoUrl || '/icon-192.png'} alt="Firma del Médico" style="max-width: 220px; max-height: 120px; object-fit: contain;">
                <p style="margin: 0; font-weight: bold; border-top: 1px solid #ccc; padding-top: 5px; margin-top: 5px;">_________________________</p>
                <p style="margin: 2px 0 0 0;">Firma y Sello Profesional</p>
            </div>
          </div>
      </body></html>
      `;

      const iframe = document.createElement('iframe'); 
      iframe.style.position = 'fixed'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0'; 
      document.body.appendChild(iframe); 
      const doc = iframe.contentWindow.document; doc.open(); doc.write(html); doc.close(); 
      setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(() => { document.body.removeChild(iframe); }, 5000); }, 500);
  };
  const filteredStudents = students.filter(s => {
    const fullName = `${s.lastName || ''} ${s.firstName || ''}`.toLowerCase();
    return fullName.includes(filterText.toLowerCase());
  }).sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''));

  if (!canAccess) return <div className="p-10 text-center text-gray-400 font-bold">⛔ Acceso restringido al Departamento Médico.</div>;

  return (
    <div className="space-y-4 animate-in fade-in pb-20 px-2 pt-4">
        
        {!selectedStudent ? (
            /* --- PANTALLA 1: LISTADO DE PACIENTES --- */
            <>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-red-100 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-red-700 uppercase italic flex items-center gap-2">
                            <Activity size={24} /> Fichas Médicas
                        </h2>
                        <p className="text-xs text-gray-500 font-bold uppercase mt-1">Gabinete de Salud Institucional</p>
                    </div>
                    <div className="flex bg-gray-50 rounded-xl items-center px-3 border border-gray-200 w-full md:w-72 shadow-inner">
                        <Search size={16} className="text-gray-400"/>
                        <input 
                            placeholder="Buscar paciente..." 
                            value={filterText}
                            onChange={e=>setFilterText(e.target.value)} 
                            className="bg-transparent p-3 text-xs font-bold outline-none w-full text-gray-700"
                        />
                        {filterText && <button onClick={() => setFilterText('')} className="text-gray-400 hover:text-red-500"><X size={14}/></button>}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filteredStudents.map(s => {
                        const cud = checkCudStatus(s.cudExpiration);
                        const hasAlert = cud.status === 'expired' || cud.status === 'warning' || (s.allergies && s.allergies.length > 2);

                        return (
                            <div key={s.id} onClick={() => { setSelectedStudent(s); setIsEditing(false); setShowEvoForm(false); }} className={`bg-white p-4 rounded-2xl shadow-sm border-2 cursor-pointer transition-all hover:scale-[1.02] flex items-center gap-3 ${hasAlert ? 'border-red-200' : 'border-transparent'}`}>
                                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-300 font-black shrink-0 overflow-hidden border border-red-100">
                                    {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover"/> : s.firstName[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-gray-800 text-sm truncate uppercase">{s.lastName}, {s.firstName}</h4>
                                    <p className="text-[10px] text-gray-500 font-bold">{calculateAge(s.birthDate)} años | OS: {s.healthInsurance || 'S/D'}</p>
                                    
                                    <div className="flex gap-1 mt-1.5 flex-wrap">
                                        {cud.status !== 'none' && (
                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${cud.status === 'expired' ? 'bg-red-100 text-red-700' : cud.status === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                CUD: {cud.text}
                                            </span>
                                        )}
                                        {s.allergies && s.allergies.length > 2 && (
                                            <span className="text-[8px] font-black px-1.5 py-0.5 rounded uppercase bg-orange-100 text-orange-700 flex items-center gap-1">
                                                <AlertTriangle size={8}/> Alergias
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </>
        ) : (
            /* --- PANTALLA 2: FICHA CLÍNICA (INTEGRADA, SIN MODAL) --- */
            <div className="bg-white rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col animate-in slide-in-from-right-8 fade-in duration-300">
                
                {/* ENCABEZADO DE LA FICHA */}
                <div className="bg-red-700 p-6 text-white relative">
                    <button onClick={() => setSelectedStudent(null)} className="mb-4 flex items-center gap-2 text-red-200 hover:text-white transition font-black uppercase text-xs tracking-widest">
                        ← Volver a Pacientes
                    </button>
                    
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex gap-4 items-center">
                            <div className="w-16 h-16 rounded-2xl bg-white/20 border-2 border-white/30 overflow-hidden flex items-center justify-center font-black text-2xl">
                                {selectedStudent.photoUrl ? <img src={selectedStudent.photoUrl} className="w-full h-full object-cover"/> : selectedStudent.firstName[0]}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tight leading-none">{selectedStudent.lastName}, {selectedStudent.firstName}</h2>
                                <p className="text-red-200 font-bold text-xs uppercase mt-1">DNI: {selectedStudent.dni || '-'} • {calculateAge(selectedStudent.birthDate)} AÑOS</p>
                            </div>
                        </div>
                        <button onClick={() => imprimirHistoriaClinica(selectedStudent)} className="bg-white text-red-700 px-4 py-3 rounded-xl shadow-md hover:bg-red-50 transition flex items-center gap-2 font-black uppercase text-[10px] md:text-xs">
                            <Printer size={18}/> Imprimir Ficha
                        </button>
                    </div>
                </div>

                {/* CUERPO DE LA FICHA */}
                <div className="p-4 md:p-6 bg-gray-50 flex-1">
                    {!isEditing ? (
                        <div className="space-y-6">
                            {/* ALERTAS */}
                            {(selectedStudent.allergies || checkCudStatus(selectedStudent.cudExpiration).status === 'expired') && (
                                <div className="bg-red-50 border border-red-200 p-4 rounded-2xl shadow-inner">
                                    <h4 className="text-red-800 font-black text-xs uppercase flex items-center gap-1 mb-2"><AlertTriangle size={14}/> Alertas Médicas</h4>
                                    {selectedStudent.allergies && <p className="text-sm font-bold text-red-700 mb-1">Alergias: <span className="font-medium text-red-600">{selectedStudent.allergies}</span></p>}
                                    {checkCudStatus(selectedStudent.cudExpiration).status === 'expired' && <p className="text-sm font-bold text-red-700">CUD: <span className="font-medium text-red-600">Vencido ({getSafeDate(selectedStudent.cudExpiration)})</span></p>}
                                </div>
                            )}

                            {/* DATOS ESTÁTICOS */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Obra Social</p>
                                    <p className="font-bold text-slate-800">{selectedStudent.healthInsurance || 'No declara'}</p>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Vencimiento CUD</p>
                                    <p className={`font-bold ${checkCudStatus(selectedStudent.cudExpiration).status === 'expired' ? 'text-red-600' : 'text-slate-800'}`}>
                                        {getSafeDate(selectedStudent.cudExpiration)}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-4">
                                <div>
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Diagnóstico CUD / Médico</p>
                                    <p className="font-bold text-slate-800">{selectedStudent.cudDiagnosis || 'Sin datos cargados'}</p>
                                </div>
                                <div className="border-t border-gray-100 pt-4">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Medicación Habitual</p>
                                    <p className="font-bold text-slate-800">{selectedStudent.medication || 'No refiere'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Peso (Aprox)</p>
                                    <p className="font-bold text-slate-800">{selectedStudent.weight ? `${selectedStudent.weight} kg` : 'S/D'}</p>
                                </div>
                                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Vacunación</p>
                                    <p className="font-bold text-slate-800">{selectedStudent.vaccines || 'S/D'}</p>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button onClick={() => setIsEditing(true)} className="px-6 py-3 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase shadow-md hover:bg-gray-800 transition flex items-center gap-2">
                                    <Edit3 size={16}/> Editar Datos Fijos
                                </button>
                            </div>

                            {/* SECCIÓN EVOLUCIONES FORMALES */}
                            <div className="mt-8 pt-8 border-t-2 border-dashed border-gray-200">
                                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
                                    <h4 className="font-black text-red-800 uppercase flex items-center gap-2 text-lg"><FileText size={20}/> Evoluciones Médicas</h4>
                                    <button onClick={() => setShowEvoForm(true)} className="bg-red-600 text-white px-4 py-3 rounded-xl shadow-md text-xs font-black uppercase flex items-center justify-center gap-2 hover:bg-red-700 transition">
                                        <Plus size={16}/> Nuevo Registro
                                    </button>
                                </div>
                                
                                {showEvoForm && (
                                    <form onSubmit={handleAddEvolution} className="bg-white p-6 rounded-2xl border border-red-200 shadow-lg mb-8 animate-in slide-in-from-top-4">
                                        <div className="flex justify-between items-center mb-4">
                                            <h5 className="font-black text-sm text-red-800 uppercase">Registrar Nueva Evolución</h5>
                                            <button type="button" onClick={() => setShowEvoForm(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200"><X size={16}/></button>
                                        </div>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fecha de la Consulta / Registro</label>
                                                <input type="date" name="date" defaultValue={new Date().toISOString().split('T')[0]} required className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border border-gray-200 text-gray-700 mt-1"/>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Detalle Clínico</label>
                                                <textarea name="text" required placeholder="Escriba aquí los detalles de la consulta, indicaciones o seguimiento..." className="w-full p-4 bg-gray-50 rounded-xl border border-gray-200 outline-none text-sm font-medium resize-none h-32 mt-1 focus:border-red-400"/>
                                            </div>
                                            <div className="flex justify-end gap-2 pt-2">
                                                <button type="button" onClick={() => setShowEvoForm(false)} className="px-5 py-3 text-gray-500 font-bold text-xs uppercase hover:bg-gray-100 rounded-xl transition">Cancelar</button>
                                                <button type="submit" disabled={saving} className="px-6 py-3 bg-red-600 text-white rounded-xl font-black text-xs uppercase shadow-md hover:bg-red-700 transition flex items-center gap-2">
                                                    {saving ? <RefreshCw size={16} className="animate-spin"/> : 'Guardar Evolución'}
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                )}

                                <div className="space-y-4">
                                    {(!selectedStudent.medicalEvolutions || selectedStudent.medicalEvolutions.length === 0) && !showEvoForm && (
                                        <div className="bg-white border border-gray-100 p-8 rounded-2xl text-center shadow-sm">
                                            <p className="text-gray-400 font-bold">No hay evoluciones registradas en este legajo.</p>
                                        </div>
                                    )}
                                    
                                    {(selectedStudent.medicalEvolutions || []).slice().sort((a,b) => new Date(b.date) - new Date(a.date)).map(e => (
                                        <div key={e.id} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm relative group hover:border-red-100 transition">
                                            <button onClick={() => handleDeleteEvolution(e.id)} className="absolute top-4 right-4 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition p-2 bg-gray-50 rounded-full" title="Borrar evolución"><Trash2 size={16}/></button>
                                            <div className="flex gap-3 items-center mb-3">
                                                <span className="text-[11px] font-black text-red-700 bg-red-50 border border-red-100 px-3 py-1 rounded-lg uppercase tracking-widest">{new Date(e.date + 'T00:00:00').toLocaleDateString('es-AR')}</span>
                                                <span className="text-[11px] font-bold text-gray-400 uppercase">Dr/a. {e.author}</span>
                                            </div>
                                            <p className="text-sm text-gray-800 whitespace-pre-wrap font-medium leading-relaxed">{e.text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* --- MODO EDICIÓN DATOS FIJOS --- */
                        <form id="medicalForm" onSubmit={handleSaveMedicalData} className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5 animate-in zoom-in-95">
                            <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-2">
                                <h3 className="font-black text-gray-800 uppercase text-lg">Modificar Datos de Base</h3>
                                <button type="button" onClick={() => setIsEditing(false)}><X size={20} className="text-gray-400"/></button>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Obra Social</label>
                                    <input name="healthInsurance" defaultValue={selectedStudent.healthInsurance} className="w-full p-3 mt-1 bg-gray-50 rounded-xl outline-none font-bold text-sm border border-gray-200 focus:border-red-300"/>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Vencimiento CUD</label>
                                    <input type="date" name="cudExpiration" defaultValue={selectedStudent.cudExpiration} className="w-full p-3 mt-1 bg-gray-50 rounded-xl outline-none font-bold text-sm border border-gray-200 text-gray-700 focus:border-red-300"/>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Diagnóstico (Detalle Clínico / CUD)</label>
                                <textarea name="cudDiagnosis" defaultValue={selectedStudent.cudDiagnosis} className="w-full p-3 mt-1 bg-gray-50 rounded-xl outline-none font-bold text-sm border border-gray-200 h-20 resize-none focus:border-red-300"/>
                            </div>

                            <div className="bg-red-50 p-5 rounded-2xl border border-red-100">
                                <label className="text-[10px] font-black text-red-800 uppercase ml-1 tracking-widest">Alergias (Alimentarias / Medicamentosas)</label>
                                <input name="allergies" defaultValue={selectedStudent.allergies} placeholder="Ej: Penicilina, Maní..." className="w-full p-3 mt-2 bg-white rounded-xl outline-none font-bold text-sm border border-red-200 text-red-700"/>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Medicación Habitual / Dosis</label>
                                <textarea name="medication" defaultValue={selectedStudent.medication} className="w-full p-3 mt-1 bg-gray-50 rounded-xl outline-none font-bold text-sm border border-gray-200 h-20 resize-none focus:border-red-300"/>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Peso (kg)</label>
                                    <input name="weight" type="number" step="0.1" defaultValue={selectedStudent.weight} className="w-full p-3 mt-1 bg-gray-50 rounded-xl outline-none font-bold text-sm border border-gray-200 focus:border-red-300"/>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase ml-1">Plan de Vacunación</label>
                                    <select name="vaccines" defaultValue={selectedStudent.vaccines} className="w-full p-3 mt-1 bg-gray-50 rounded-xl outline-none font-bold text-sm border border-gray-200 text-gray-800 focus:border-red-300">
                                        <option value="">Seleccionar...</option>
                                        <option value="Completas">Completas</option>
                                        <option value="Incompletas">Incompletas</option>
                                        <option value="No presenta libreta">No presenta libreta</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setIsEditing(false)} className="px-6 py-3 text-gray-500 font-bold text-xs uppercase hover:bg-gray-100 rounded-xl transition">Cancelar</button>
                                <button type="submit" disabled={saving} className="px-8 py-3 bg-red-600 text-white rounded-xl font-black text-xs uppercase shadow-lg hover:bg-red-700 transition flex items-center gap-2">
                                    {saving ? <RefreshCw size={16} className="animate-spin"/> : 'Guardar Ficha'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        )}
    </div>
  );
}
