import { getCachedAppConfig, getInstitutionName } from '../config';
import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, Search, X, Printer, Save, FileText, 
  CheckCircle2, AlertCircle, Calendar, User, ChevronRight
} from 'lucide-react';
import {  
  collection, doc, setDoc, onSnapshot, serverTimestamp, updateDoc, query, where, deleteDoc 
} from 'firebase/firestore';

export function EvaluationsView({ user, db, appId }) {
  const [students, setStudents] = useState([]);
  const selectedSpecialty = '';
  const [monthlyEvaluations, setMonthlyEvaluations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterTurn, setFilterTurn] = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterMonth, setFilterMonth] = useState(''); // Filtro de mes para la grilla inferior
  
  // Filtros de organización inicial
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('es-AR', { month: 'long' }).toUpperCase());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  // Formulario Múltiple Choice
  const [answers, setAnswers] = useState({});
  const [observations, setObservations] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const isAllowed = ['admin', 'super-admin', 'Equipo Directivo', 'Equipo Técnico'].includes(user.role) || user.rol === 'admin';
  const LOGO_INSTITUCIONAL = getCachedAppConfig().logoUrl || '/icon-192.png';

  const SPECIALTIES = [
    { id: 'psicologia', label: 'Psicología', color: 'from-purple-500 to-indigo-600' },
    { id: 'to', label: 'Terapia Ocupacional', color: 'from-teal-500 to-emerald-600' },
    { id: 'fono', label: 'Fonoaudiología', color: 'from-blue-500 to-cyan-600' },
    { id: 'psicopedagogia', label: 'Psicopedagogía', color: 'from-pink-500 to-rose-600' },
    { id: 'trabajosocial', label: 'Trabajo Social', color: 'from-amber-500 to-orange-600' }
  ];

  const LEVELS = ['Inicial', '1° Ciclo', '2° Ciclo', 'CFI'];
  const MONTHS = ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];

  // VALORACIONES FIJAS MULTIPLE CHOICE
  const OPTIONS = [
    { value: 'Logrado', label: 'Logrado' },
    { value: 'En Proceso', label: 'En Proceso' },
    { value: 'Iniciado', label: 'Iniciado' },
    { value: 'No Observado', label: 'No Observado' }
  ];

  const EVALUATION_CRITERIA = {
    'Inicial': [
      { id: 'ini_psi_1', category: 'Psicología', label: 'Regulación emocional', options: ['Logra autorregularse', 'Requiere contención', 'Desregulación frecuente'] },
      { id: 'ini_psi_2', category: 'Psicología', label: 'Vínculo con adultos', options: ['Busca contacto', 'Selectivo', 'No muestra interés'] },
      { id: 'ini_psi_3', category: 'Psicología', label: 'Juego compartido', options: ['Participa', 'Imitativo', 'Individual'] },
      { id: 'ini_pp_1', category: 'Psicopedagogía', label: 'Exploración del entorno', options: ['Activa', 'Guiada', 'Escasa'] },
      { id: 'ini_pp_2', category: 'Psicopedagogía', label: 'Escritura inicial', options: ['Realiza grafismos/trazos', 'Escribe con apoyo', 'Escritura espontánea'] },
      { id: 'ini_pp_3', category: 'Psicopedagogía', label: 'Atención en propuestas', options: ['Sostiene', 'Intermitente', 'Disperso'] },
      { id: 'ini_to_1', category: 'Terapia Ocupacional', label: 'Participación en rutinas diarias', options: ['Autónomo', 'Requiere asistencia', 'No presenta interés'] },
      { id: 'ini_to_2', category: 'Terapia Ocupacional', label: 'Propuestas grafo-motoras', options: ['Las realiza con interés', 'Requiere asistencia', 'No presenta interés'] },
      { id: 'ini_to_3', category: 'Terapia Ocupacional', label: 'Participación y juego', options: ['Permanece en la actividad grupal', 'Explora los materiales', 'Inicia juego espontáneo'] },
      { id: 'ini_fo_1', category: 'Fonoaudiología', label: 'Comprensión de órdenes simples', options: ['Responde', 'Con apoyo visual', 'Con indicación verbal'] },
      { id: 'ini_fo_2', category: 'Fonoaudiología', label: 'Emisión de sonidos/palabras', options: ['Variada', 'Escasa', 'Ausente'] },
      { id: 'ini_fo_3', category: 'Fonoaudiología', label: 'Intención comunicativa', options: ['Espontánea', 'A demanda', 'No evidente'] },
      { id: 'ini_mt_1', category: 'Musicoterapia', label: 'Respuesta a estímulos sonoros', options: ['Activa', 'Selectiva', 'Nula'] },
      { id: 'ini_mt_2', category: 'Musicoterapia', label: 'Exploración corporal', options: ['Se involucra', 'Guiada', 'Pasiva'] },
      { id: 'ini_mt_3', category: 'Musicoterapia', label: 'Exploración sonora', options: ['Espontánea', 'Imitativa', 'Limitada'] },
      { id: 'ini_ts_1', category: 'Trabajo Social', label: 'Vínculo Escuela/Familia', options: ['Activo', 'Intermitente', 'Escaso'] },
      { id: 'ini_ts_2', category: 'Trabajo Social', label: 'Asistencia', options: ['Regular', 'Irregular', 'Inasistencias'] },
      { id: 'ini_ts_3', category: 'Trabajo Social', label: 'Inclusión socio-comunitaria', options: ['Vinculado', 'En gestión', 'Sin acceso'] }
    ],
    '1° Ciclo': [
      { id: 'c1_psi_1', category: 'Psicología', label: 'Regulación emocional', options: ['Autónoma', 'Con apoyo', 'Desregulación'] },
      { id: 'c1_psi_2', category: 'Psicología', label: 'Vínculo pares y adultos', options: ['Adecuado', 'Selectivo', 'Conflictivo'] },
      { id: 'c1_psi_3', category: 'Psicología', label: 'Expresión emocional', options: ['Verbal', 'Conductual', 'Limitada'] },
      { id: 'c1_pp_1', category: 'Psicopedagogía', label: 'Comprensión de consignas', options: ['Autónomo', 'Con apoyo', 'Requiere guía'] },
      { id: 'c1_pp_2', category: 'Psicopedagogía', label: 'Proceso de lectoescritura', options: ['Realiza grafismos/trazos', 'Escribe con apoyo', 'Escritura espontánea'] },
      { id: 'c1_pp_3', category: 'Psicopedagogía', label: 'Atención en las propuestas', options: ['Sostenida', 'Intermitente', 'Dispersa'] },
      { id: 'c1_to_1', category: 'Terapia Ocupacional', label: 'Motricidad/praxis', options: ['Usa útiles escolares', 'Planifica acciones simples', 'Coordinación bimanual'] },
      { id: 'c1_to_2', category: 'Terapia Ocupacional', label: 'Autonomía en rutinas escolares', options: ['Organiza los materiales', 'Realiza higiene básica', 'Requiere asistencia'] },
      { id: 'c1_to_3', category: 'Terapia Ocupacional', label: 'Procesamiento sensorial', options: ['Tolera el entorno áulico', 'Requiere pausas de organización', 'Utiliza otras estrategias'] },
      { id: 'c1_fo_1', category: 'Fonoaudiología', label: 'Comprensión del lenguaje', options: ['Adecuada', 'Con apoyo', 'Limitada'] },
      { id: 'c1_fo_2', category: 'Fonoaudiología', label: 'Expresión verbal', options: ['Clara', 'Poco inteligible', 'Escasa'] },
      { id: 'c1_fo_3', category: 'Fonoaudiología', label: 'Comunicación funcional', options: ['Espontánea', 'A demanda', 'No funcional'] },
      { id: 'c1_mt_1', category: 'Musicoterapia', label: 'Expresión sonora', options: ['Activa', 'Guiada', 'Pasiva'] },
      { id: 'c1_mt_2', category: 'Musicoterapia', label: 'Expresión corporal', options: ['Espontánea', 'Imitativa', 'Limitada'] },
      { id: 'c1_mt_3', category: 'Musicoterapia', label: 'Juegos rítmicos sonoros', options: ['Espontáneo', 'Variable', 'Pasivo'] },
      { id: 'c1_ts_1', category: 'Trabajo Social', label: 'Vínculo Escuela/Familia', options: ['Activo', 'Intermitente', 'Escaso'] },
      { id: 'c1_ts_2', category: 'Trabajo Social', label: 'Asistencia', options: ['Regular', 'Irregular', 'Inasistencias'] },
      { id: 'c1_ts_3', category: 'Trabajo Social', label: 'Inclusión socio-comunitaria', options: ['Vinculado', 'En gestión', 'Sin acceso'] }
    ],
    '2° Ciclo': [
      { id: 'c2_psi_1', category: 'Psicología', label: 'Regulación emocional autónoma', options: ['Adecuada', 'Con apoyo', 'Desregulación'] },
      { id: 'c2_psi_2', category: 'Psicología', label: 'Habilidades sociales', options: ['Adecuadas', 'Selectivas', 'Dificultosas'] },
      { id: 'c2_psi_3', category: 'Psicología', label: 'Expresión emocional adecuada', options: ['Pertinente', 'Variable', 'Inadecuada'] },
      { id: 'c2_pp_1', category: 'Psicopedagogía', label: 'Comprensión de consignas', options: ['Autónomo', 'Con apoyo', 'Requiere andamiaje'] },
      { id: 'c2_pp_2', category: 'Psicopedagogía', label: 'Producción escrita', options: ['Alfabetizado', 'En proceso', 'Requiere apoyo'] },
      { id: 'c2_pp_3', category: 'Psicopedagogía', label: 'Organización en las propuestas', options: ['Sostenida', 'Variable', 'Dispersa'] },
      { id: 'c2_to_1', category: 'Terapia Ocupacional', label: 'Motricidad/praxis', options: ['Organiza los materiales', 'Realiza higiene básica', 'Requiere asistencia'] },
      { id: 'c2_to_2', category: 'Terapia Ocupacional', label: 'Autonomía en rutinas escolares', options: ['Organiza los materiales', 'Realiza higiene básica', 'Requiere asistencia'] },
      { id: 'c2_to_3', category: 'Terapia Ocupacional', label: 'Procesamiento sensorial', options: ['Tolera el entorno áulico', 'Requiere pausas de organización', 'Utiliza otras estrategias'] },
      { id: 'c2_fo_1', category: 'Fonoaudiología', label: 'Comprensión del lenguaje', options: ['Adecuada', 'Con apoyo', 'Limitada'] },
      { id: 'c2_fo_2', category: 'Fonoaudiología', label: 'Expresión verbal', options: ['Clara', 'Poco inteligible', 'Escasa'] },
      { id: 'c2_fo_3', category: 'Fonoaudiología', label: 'Comunicación funcional', options: ['Espontánea', 'A demanda', 'No funcional'] },
      { id: 'c2_mt_1', category: 'Musicoterapia', label: 'Participación musical', options: ['Activa', 'Guiada', 'Pasiva'] },
      { id: 'c2_mt_2', category: 'Musicoterapia', label: 'Expresión corporal', options: ['Creativa', 'Imitativa', 'Limitada'] },
      { id: 'c2_mt_3', category: 'Musicoterapia', label: 'Participación rítmica', options: ['Adecuada', 'Variable', 'Dificultosa'] },
      { id: 'c2_ts_1', category: 'Trabajo Social', label: 'Acompañamiento familiar', options: ['Activo', 'Intermitente', 'Escaso'] },
      { id: 'c2_ts_2', category: 'Trabajo Social', label: 'Asistencia escolar', options: ['Regular', 'Irregular', 'Inasistencias'] },
      { id: 'c2_ts_3', category: 'Trabajo Social', label: 'Inclusión socio-comunitaria', options: ['Vinculado', 'En gestión', 'Sin acceso'] }
    ],
    'CFI': [
      { id: 'cfi_psi_1', category: 'Psicología', label: 'Regulación emocional en contextos sociales', options: ['Adecuada', 'Con apoyo', 'Dificultosa'] },
      { id: 'cfi_psi_2', category: 'Psicología', label: 'Habilidades sociales', options: ['Adecuadas', 'Selectivas', 'Conflictivas'] },
      { id: 'cfi_psi_3', category: 'Psicología', label: 'Toma de decisiones', options: ['Autónoma', 'Guiada', 'Dependiente'] },
      { id: 'cfi_pp_1', category: 'Psicopedagogía', label: 'Comprensión de propuestas', options: ['Autónomo', 'Con apoyo', 'Requiere guía'] },
      { id: 'cfi_pp_2', category: 'Psicopedagogía', label: 'Lectoescritura', options: ['Alfabetizado', 'En proceso', 'Requiere apoyo'] },
      { id: 'cfi_pp_3', category: 'Psicopedagogía', label: 'Resolución de situaciones cotidianas', options: ['Autónoma', 'Con guía/apoyos', 'Requiere asistencia'] },
      { id: 'cfi_to_1', category: 'Terapia Ocupacional', label: 'Autonomía en rutinas escolares', options: ['Administra su tiempo', 'Organiza sus materiales', 'Requiere asistencia'] },
      { id: 'cfi_to_2', category: 'Terapia Ocupacional', label: 'Habilidades escolares', options: ['Logra organizarse', 'Inicia las tareas propuestas', 'Requiere guía/asistencia'] },
      { id: 'cfi_to_3', category: 'Terapia Ocupacional', label: 'Aspecto interpersonal', options: ['Trabaja en grupos', 'Respeta turnos', 'Requiere ser motivado'] },
      { id: 'cfi_fo_1', category: 'Fonoaudiología', label: 'Comunicación funcional', options: ['Adecuada', 'Con apoyo', 'Limitada'] },
      { id: 'cfi_fo_2', category: 'Fonoaudiología', label: 'Comprensión compleja', options: ['Adecuada', 'Parcial', 'Limitada'] },
      { id: 'cfi_fo_3', category: 'Fonoaudiología', label: 'Expresión efectiva', options: ['Clara', 'Poco clara', 'Escasa'] },
      { id: 'cfi_mt_1', category: 'Musicoterapia', label: 'Participación y expresión musical', options: ['Activa', 'Guiada', 'Pasiva'] },
      { id: 'cfi_mt_2', category: 'Musicoterapia', label: 'Expresión corporal', options: ['Creativa', 'Imitativa', 'Limitada'] },
      { id: 'cfi_mt_3', category: 'Musicoterapia', label: 'Participación rítmica sonora', options: ['Adecuada', 'Variable', 'Dificultosa'] },
      { id: 'cfi_ts_1', category: 'Trabajo Social', label: 'Acompañamiento familiar', options: ['Activo', 'Intermitente', 'Escaso'] },
      { id: 'cfi_ts_2', category: 'Trabajo Social', label: 'Asistencia', options: ['Regular', 'Irregular', 'Inasistencias'] },
      { id: 'cfi_ts_3', category: 'Trabajo Social', label: 'Inclusión socio-comunitaria', options: ['Vinculado', 'En gestión', 'Sin acceso'] }
    ]
  };

  useEffect(() => {
    if (!isAllowed || !db || !appId) return;

    const qStudents = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), where('isActive', '==', true));
    const unsubStudents = onSnapshot(qStudents, (snap) => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const qEvals = collection(db, 'artifacts', appId, 'public', 'data', 'unified_monthly_evaluations');
    const unsubEvals = onSnapshot(qEvals, (snap) => {
      setMonthlyEvaluations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => { unsubStudents(); unsubEvals(); };
  }, [isAllowed, db, appId]);

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    const existingDoc = monthlyEvaluations.find(ev => 
      ev.studentId === student.id && 
      ev.month === selectedMonth && 
      ev.year === selectedYear
    );
    
    if (existingDoc && existingDoc.answers) {
      setAnswers(existingDoc.answers || {});
      setObservations(existingDoc.observations || '');
    } else {
      setAnswers({});
      setObservations('');
    }
  };

  const handleEditEvaluation = (ev) => {
    const student = students.find(s => s.id === ev.studentId);
    if (student) {
      setSelectedStudent(student);
      setAnswers(ev.answers || {});
      setObservations(ev.observations || '');
      setSelectedLevel(ev.level || '');
      setSelectedMonth(ev.month || selectedMonth);
      setSelectedYear(ev.year || selectedYear);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleDeleteEvaluation = async (evId) => {
    if (window.confirm("¿Estás segura de que quieres eliminar este informe completo? Esta acción no se puede deshacer.")) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'unified_monthly_evaluations', evId));
        alert("✅ Informe eliminado correctamente.");
      } catch (err) {
        alert("Error al borrar: " + err.message);
      }
    }
  };

  const handleSaveAll = async () => {
    if (!selectedStudent || !selectedLevel) return alert("Falta definir nivel o estudiante.");
    setIsSaving(true);
    const docId = `${selectedStudent.id}_${selectedMonth}_${selectedYear}`;
    try {
      const grupos = [selectedStudent.groupMorning, selectedStudent.groupAfternoon].filter(Boolean).join(' / ');
      const turnos = [selectedStudent.groupMorning ? 'Mañana' : null, selectedStudent.groupAfternoon ? 'Tarde' : null].filter(Boolean).join(' / ');

      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'unified_monthly_evaluations', docId), {
        id: docId,
        studentId: selectedStudent.id,
        studentName: `${selectedStudent.lastName}, ${selectedStudent.firstName}`,
        studentDni: selectedStudent.dni || selectedStudent.studentDni || '-',
        level: selectedLevel,
        group: grupos || '-', 
        turno: turnos || '-',
        month: selectedMonth,
        year: selectedYear,
        answers: answers, 
        observations: observations,
        lastUpdatedBy: user.firstName,
        serverUpdatedAt: serverTimestamp()
      });
      alert("✅ Informe guardado.");
      setSelectedStudent(null); setAnswers({}); setObservations('');
    } catch (err) { alert("Error: " + err.message); } finally { setIsSaving(false); }
  };

  const handlePrintFullEvaluation = (evalDoc) => {
    const foundStudent = students.find(s => s.id === evalDoc.studentId);
    const dniToPrint = evalDoc.studentDni || foundStudent?.dni || foundStudent?.studentDni || '-';

    const allCriteria = EVALUATION_CRITERIA[evalDoc.level] || [];
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    const areasDisponibles = [...new Set(allCriteria.map(q => q.category))]
      .filter(cat => cat !== 'Musicoterapia');

    let htmlContent = `
      <html>
      <head>
        <title>Seguimiento Equipo Técnico - ${evalDoc.studentName}</title>
        <style>
          body { font-family: sans-serif; padding: 40px; }
          .header { border-bottom: 2px solid #4c1d95; padding-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
          .logo { max-height: 60px; }
          .student-info { margin: 20px 0; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
          th { background: #ede9fe; color: #4c1d95; padding: 10px; text-align: left; border: 1px solid #ddd; }
          td { border: 1px solid #ddd; padding: 8px; font-size: 13px; }
          h3 { background: #4c1d95; color: white; padding: 10px; margin-top: 30px; text-transform: uppercase; font-size: 16px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>SEGUIMIENTO</h1>
            <p>${evalDoc.studentName}</p>
          </div>
          <div>
            <img src="${LOGO_INSTITUCIONAL}" class="logo" alt="Logo Institucional" />
          </div>
        </div>
        
        <div class="student-info">
          <div><b>Estudiante:</b> ${evalDoc.studentName}</div>
          <div><b>DNI:</b> ${dniToPrint}</div>
          <div><b>Nivel:</b> ${evalDoc.level}</div>
          <div><b>Grupo/Turno:</b> ${evalDoc.group || '-'} / ${evalDoc.turno || '-'}</div>
          <div><b>Mes y Año:</b> ${evalDoc.month} ${evalDoc.year}</div>
        </div>
    `;

    areasDisponibles.forEach((cat) => {
      const indicadores = allCriteria.filter(q => q.category === cat);
      
      htmlContent += `
        <h3>ÁREA: ${cat.toUpperCase()}</h3>
        <table>
          <thead><tr><th>Indicador</th><th>Valoración</th></tr></thead>
          <tbody>
            ${indicadores.map(q => `
              <tr>
                <td>${q.label}</td>
                <td><b>${evalDoc.answers?.[q.id] || '-'}</b></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    });

    htmlContent += `
        <h3>Observaciones Generales</h3>
        <p style="padding: 10px; border: 1px solid #ddd;">${evalDoc.observations || 'Sin observaciones'}</p>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);
  };

  const availableGroups = [...new Set(monthlyEvaluations.map(ev => ev.group).filter(Boolean))].sort();

  if (!isAllowed) {
    return <div className="p-8 text-center font-bold text-red-600">⛔ Acceso exclusivo para el Equipo Directivo o Técnico de la institución.</div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in pb-16 px-2 max-w-7xl mx-auto">
      {/* SECCIÓN CABECERA */}
      <div className="bg-white p-6 rounded-[35px] shadow-sm border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-violet-950 uppercase italic flex items-center gap-3">
            <ClipboardCheck size={28} className="text-orange-500" /> Seguimiento Mensual - Equipo Técnico
          </h2>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Unificación de Grillas y Legajos</p>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-2 w-full sm:w-auto">
          <select value={selectedMonth} onChange={e => { setSelectedMonth(e.target.value); setSelectedStudent(null); }} className="bg-white px-3 py-2 rounded-xl text-xs font-black text-slate-700 uppercase outline-none border shadow-sm">
            {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={selectedYear} onChange={e => { setSelectedYear(e.target.value); setSelectedStudent(null); }} className="bg-white px-3 py-2 rounded-xl text-xs font-black text-slate-700 outline-none border shadow-sm">
            {['2025', '2026', '2027'].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* RUTA DE PASOS SIMPLIFICADA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-[35px] border shadow-sm space-y-4">
          <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">Nivel Técnico</h3>
          <div className="grid grid-cols-2 gap-2">
            {LEVELS.map(lvl => (
              <button
                key={lvl}
                onClick={() => { setSelectedLevel(lvl); setSelectedStudent(null); }}
                className={`p-6 rounded-2xl font-black text-xs uppercase transition-all flex flex-col items-center justify-center gap-2 border-2 ${
                  selectedLevel === lvl ? 'bg-violet-950 text-white border-transparent shadow-md' : 'bg-slate-50 text-slate-600 border-slate-100'
                }`}
              >
                <span className="text-xl">🏫</span>
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-[35px] border shadow-sm space-y-4">
          <h3 className="font-black text-xs text-slate-400 uppercase tracking-widest flex items-center gap-2">Seleccionar Estudiante</h3>
          <div className="bg-slate-50 rounded-xl flex items-center px-3 border focus-within:bg-white transition-all shadow-inner">
            <Search size={18} className="text-slate-400" />
            <input 
              disabled={!selectedLevel}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Escribir apellido o DNI..." 
              className="w-full p-3 bg-transparent outline-none text-xs font-bold disabled:cursor-not-allowed"
            />
          </div>

          <div className="max-h-64 overflow-y-auto custom-scrollbar p-2 rounded-2xl bg-slate-50/50">
            {selectedLevel && students
              .filter(s => s.level?.toLowerCase().trim() === selectedLevel?.toLowerCase().trim())
              .filter(s => searchTerm === '' || `${s.lastName} ${s.firstName}`.toLowerCase().includes(searchTerm.toLowerCase()))
              .map(s => (
                <div key={s.id} onClick={() => handleSelectStudent(s)} className={`p-3 mb-1 rounded-xl cursor-pointer text-xs uppercase font-bold ${selectedStudent?.id === s.id ? 'bg-orange-500 text-white' : 'bg-white'}`}>
                  {s.lastName}, {s.firstName}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* FORMULARIO UNIFICADO */}
      {selectedStudent && (
        <div className="bg-white p-8 rounded-[40px] border shadow-md space-y-8 animate-in slide-in-from-bottom-4">
          <div className="bg-slate-950 text-white p-6 rounded-3xl">
            <h4 className="text-xl font-black uppercase">{selectedStudent.lastName}, {selectedStudent.firstName}</h4>
            <p className="text-xs font-bold text-slate-400">Nivel: {selectedLevel} | {selectedMonth} {selectedYear}</p>
          </div>

          <div className="space-y-6">
            {EVALUATION_CRITERIA[selectedLevel]?.map((q, idx) => (
              <div key={q.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                <p className="font-black text-sm text-slate-800">{idx + 1}. {q.label}</p>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  {q.options.map(optLabel => (
                    <button
                      key={optLabel}
                      onClick={() => setAnswers(p => ({ ...p, [q.id]: optLabel }))}
                      className={`p-2 rounded-lg font-black text-[9px] uppercase border transition-all ${
                        answers[q.id] === optLabel ? 'bg-violet-700 text-white' : 'bg-white'
                      }`}
                    >
                      {optLabel}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <textarea value={observations} onChange={e => setObservations(e.target.value)} placeholder="Observación general..." className="w-full p-4 border rounded-2xl" />
          <button onClick={handleSaveAll} className="w-full py-4 bg-violet-700 text-white font-black uppercase rounded-xl">Guardar Informe Completo</button>
        </div>
      )}

      {/* HISTORIAL: GRILLA DE INFORMES UNIFICADOS */}
      <div className="bg-white p-6 rounded-[40px] border shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
          <h3 className="font-black text-sm text-violet-950 uppercase italic flex items-center gap-2">Registros del Período</h3>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            {/* Filtro por mes integrado */}
            <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="bg-slate-50 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border">
              <option value="">Todos los Meses</option>
              {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <select onChange={(e) => setFilterLevel(e.target.value)} className="bg-slate-50 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border">
              <option value="">Todos los Niveles</option>
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <select onChange={(e) => setFilterTurn(e.target.value)} className="bg-slate-50 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border">
              <option value="">Todos los Turnos</option>
              <option value="Mañana">Mañana</option>
              <option value="Tarde">Tarde</option>
            </select>
            <select onChange={(e) => setFilterGroup(e.target.value)} className="bg-slate-50 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border">
              <option value="">Todos los Grupos</option>
              {availableGroups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b text-[10px] font-black text-slate-400 uppercase bg-slate-50/50">
                <th className="p-4">Estudiante</th>
                <th className="p-4">Período (Mes)</th>
                <th className="p-4">Nivel</th>
                <th className="p-4">Grupo</th>
                <th className="p-4">Turno</th>
                <th className="p-4">Estado</th>
                <th className="p-4 text-center">Acciones</th>
              </tr>
            </thead>
            
            <tbody className="divide-y text-xs font-bold text-slate-600 uppercase">
              {monthlyEvaluations
                .filter(ev => {
                  const matchMonth = !filterMonth || ev.month === filterMonth;
                  const matchLevel = !filterLevel || ev.level === filterLevel;
                  const matchTurn = !filterTurn || (ev.turno?.toLowerCase().includes(filterTurn.toLowerCase()));
                  const matchGroup = !filterGroup || (ev.group?.toLowerCase().includes(filterGroup.toLowerCase()));
                  return matchMonth && matchLevel && matchTurn && matchGroup;
                })
                .map(ev => (
                  <tr key={ev.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-black text-slate-800">{ev.studentName}</td>
                    <td className="p-4 text-violet-700 font-black">{ev.month} {ev.year}</td>
                    <td className="p-4">{ev.level}</td>
                    <td className="p-4">{ev.group || '-'}</td>
                    <td className="p-4">{ev.turno || '-'}</td>
                    <td className="p-4 text-emerald-600">Cargado</td>
                    <td className="p-4 text-center flex gap-2 justify-center">
                      <button onClick={() => handlePrintFullEvaluation(ev)} className="px-3 py-1 bg-slate-800 text-white rounded-lg text-[9px] font-black uppercase">Imprimir</button>
                      <button onClick={() => handleEditEvaluation(ev)} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-[9px] font-black uppercase">Editar</button>
                      <button onClick={() => handleDeleteEvaluation(ev.id)} className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-[9px] font-black uppercase">Borrar</button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
