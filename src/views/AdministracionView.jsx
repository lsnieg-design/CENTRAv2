import { getInstitutionName, getCachedAppConfig } from '../config';
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
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
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp 
} from 'firebase/firestore';

export function AdministracionView({ user, db, appId }) {
  const [students, setStudents] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [filters, setFilters] = useState({ os: 'all', level: 'all', modality: 'all' });
  
  /// ESTADOS DOCUMENTOS
  const [template, setTemplate] = useState('constancia_regular'); 
  const [generating, setGenerating] = useState(false);
  const [customTarget, setCustomTarget] = useState(""); 
  const [customDate, setCustomDate] = useState(new Date().toISOString().split('T')[0]);
  const [paseAction, setPaseAction] = useState('CONCEDE'); 
  
  const LOGO_URL = getCachedAppConfig().logoUrl || '/icon-192.png';
  const FIRMA_URL = getCachedAppConfig().logoUrl || '/icon-192.png'; 
  const SELLO_URL = getCachedAppConfig().logoUrl || '/icon-192.png';
  
  const canAccess = ['admin', 'super-admin', 'Administración', 'Equipo Directivo'].includes(user.role) || user.rol === 'admin';

  useEffect(() => {
    if (!db || !appId) return;
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), orderBy('lastName', 'asc'));
    const unsubStudents = onSnapshot(q, (snap) => { 
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
    });
    return () => unsubStudents();
  }, [db, appId]);
 const downloadStudentsByOS = () => {
    // 1. Lógica para calcular el horario
    const getSchedule = (s) => {
      const journey = (s.journey || '').toLowerCase();
      if (journey.includes('simple')) {
        if (journey.includes('mañana')) return '08:30 a 12:30';
        if (journey.includes('tarde')) return '12:30 a 16:30';
      }
      if (journey.includes('doble')) return '08:30 a 16:30';
      return 'A definir';
    };

    // 2. Preparar los datos
    const dataToExport = students.map(s => ({
      'Apellido': s.lastName || '',
      'Nombre': s.firstName || '',
      'Prestación': '', // <--- Se deja vacío para completar a mano
      'Obra Social': s.healthInsurance || 'SIN OBRA SOCIAL',
      'Horario': getSchedule(s)
    }));

    // 3. Ordenar por Obra Social
    dataToExport.sort((a, b) => a['Obra Social'].localeCompare(b['Obra Social']));

    // 4. Crear el archivo
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    
    // Opcional: Ajustar el ancho de las columnas para que sea más fácil escribir
    const wscols = [
      { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, { wch: 15 }
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Estudiantes");

    // 5. Descargar
    XLSX.writeFile(workbook, `Alumnos_por_OS_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const filteredStudents = students.filter(s => {
      if (s.isActive === false) return false;
      const txt = filterText.toLowerCase();
      const matchesText = !txt || `${s.lastName} ${s.firstName} ${s.dni} ${s.healthInsurance || ''} ${s.level || ''}`.toLowerCase().includes(txt);
      if (!matchesText) return false;
      if (filters.os !== 'all') {
          const sOS = (s.healthInsurance || '').toLowerCase();
          if (filters.os === 'con_os' && sOS.length < 2) return false;
          if (filters.os === 'sin_os' && sOS.length >= 2) return false;
          if (filters.os !== 'con_os' && filters.os !== 'sin_os' && !sOS.includes(filters.os.toLowerCase())) return false;
      }
      if (filters.level !== 'all' && s.level !== filters.level) return false;
      return true;
  });

  const toggleSelectAll = () => { if (selectedIds.length === filteredStudents.length) setSelectedIds([]); else setSelectedIds(filteredStudents.map(s => s.id)); };
  const toggleSelect = (id) => { if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(x => x !== id)); else setSelectedIds([...selectedIds, id]); };

  const generateDocument = async () => {
      if (selectedIds.length === 0) return alert("Selecciona al menos un estudiante.");
      setGenerating(true);
      
      const targets = students.filter(s => selectedIds.includes(s.id));
      const dateObj = new Date(customDate + 'T12:00:00'); 
      const day = dateObj.getDate();
      const month = dateObj.toLocaleString('es-AR', { month: 'long' });
      const year = dateObj.getFullYear();
      const fullDate = `Villa Udaondo, ${day} de ${month} de ${year}`;

      // --- REGISTRO EN AUDITORÍA ---
      try {
        const studentNames = targets.map(s => `${s.lastName} ${s.firstName}`).join(', ');
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'activity_log'), {
          userName: user.firstName || user.fullName,
          userId: user.id,
          action: "Generación de Documentos",
          details: `Generó "${template}" para: ${studentNames.substring(0, 150)}`,
          timestamp: serverTimestamp()
        });
      } catch (err) { console.error(err); }

      let htmlContent = `<html><head><title>Documentos</title><style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
          body { font-family: 'Times New Roman', Times, serif; margin: 0; padding: 0; color: #000; }
          .cert-wrapper { width: 100%; display: block; clear: both; margin-bottom: 20px; page-break-after: always; }
          .cert-container { border: 2px solid #65a30d; border-radius: 25px; padding: 25px 40px; margin: 0 auto; position: relative; height: 175mm; box-sizing: border-box; width: 190mm; display: flex; flex-direction: column; overflow: hidden; }
          .cert-header { display: flex; align-items: center; margin-bottom: 15px; }
          .cert-logo { width: 100px; height: auto; margin-right: 20px; }
          .cert-title { font-size: 16px; font-weight: bold; text-decoration: underline; text-transform: uppercase; padding-top: 15px; }
          .cert-subtitle { font-size: 12px; font-weight: bold; margin-top: 5px; }
          .cert-body { font-size: 13px; line-height: 1.6; flex-grow: 1; }
          .line-group { margin-bottom: 12px; }
          .data-field { text-align: center; font-weight: bold; font-size: 14px; border-bottom: 1px dotted #000; display: block; margin: 2px 0; padding-bottom: 2px; }
          .inline-field { font-weight: bold; border-bottom: 1px dotted #000; padding: 0 10px; }
          .date-section { margin: 15px 0; text-align: center; font-weight: bold; }
          .signatures-section { display: flex; justify-content: space-between; align-items: flex-end; padding: 0 20px; height: 130px; margin-top: auto; padding-bottom: 10px; }
          .sig-box { text-align: center; width: 220px; position: relative; }
          .sig-img { height: 95px; width: auto; display: block; margin: 0 auto -10px auto; position: relative; z-index: 10; }
          .sig-line { border-top: 1px solid #000; margin-top: 0; padding-top: 4px; font-size: 11px; font-weight: bold; }

          .planilla-page { width: 100%; max-width: 210mm; padding: 15px 30px; box-sizing: border-box; margin: 0 auto; height: 297mm; position: relative; }
          .planilla-header { text-align: center; margin-bottom: 15px; border-bottom: 2px solid #000; padding-bottom: 10px; }
          .planilla-title { font-size: 18px; font-weight: bold; text-transform: uppercase; margin: 0; padding-top: 10px; }
          .planilla-grid { display: grid; grid-template-columns: 180px 1fr; gap: 5px; margin-bottom: 20px; font-size: 12px; }
          .p-label { font-weight: bold; text-transform: uppercase; padding: 4px 0; }
          .p-value { border-bottom: 1px dotted #000; padding: 4px 5px; font-weight: bold; text-transform: uppercase; }
          .asistencia-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
          .asistencia-table th, .asistencia-table td { border: 1px solid #000; padding: 4px; text-align: center; height: 25px; }
          .asistencia-table th { background-color: #f0f0f0; font-weight: bold; }
          .mes-box { text-align: right; font-size: 14px; font-weight: bold; margin: 15px 0; text-transform: uppercase; padding-right: 10px; }
          .firmas-planilla { display: flex; justify-content: space-between; margin-top: 40px; padding: 0 20px; }
          .firma-col { text-align: center; width: 45%; border-top: 1px solid #000; padding-top: 5px; font-size: 10px; font-weight: bold; }
          @media print { body { margin: 0; padding: 0; } .cert-container, .planilla-page { margin: 5mm auto; page-break-after: always; } }
      </style></head><body>`;

      targets.forEach(s => {
          const nivelRaw = (s.level || '').toUpperCase();
          const modRaw = (s.modality || 'Sede');
          let nivelDetallado = nivelRaw;
          if (nivelRaw.includes('INICIAL')) nivelDetallado = "escolaridad especial inicial";
          else if (nivelRaw.includes('CFI')) nivelDetallado = "escolaridad especial de formación laboral";
          else if (nivelRaw.includes('1°') || nivelRaw.includes('2°') || nivelRaw.includes('PRIMARIA')) nivelDetallado = `escolaridad especial primaria, ${s.level}`;

          let jornadaInfo = s.journey && s.journey !== "A DEFINIR" ? ` con jornada ${s.journey.toLowerCase()}` : "";
          let fraseAlumno = modRaw === 'Inclusión' ? `Es alumno/a regular de modulo de apoyo a la integración escolar (con equipo)` : `Es alumno/a regular de ${nivelDetallado}${jornadaInfo}`;
          let presentadoAnte = customTarget.trim() !== "" ? customTarget : (s.healthInsurance || 'quien corresponda');

          htmlContent += `<div class="cert-wrapper">`;
          if (template === 'constancia_regular' || template === 'informe_jornada' || template === 'concesion_pase') {
              htmlContent += `
              <div class="cert-container">
                  <div class="cert-header"><img src="${LOGO_URL}" class="cert-logo"/><div class="cert-title">CONSTANCIA INSTITUCIONAL</div></div>
                  <div class="cert-body">
                      ${getInstitutionName()} hace constar que <span class="data-field">${s.lastName.toUpperCase()}, ${s.firstName.toUpperCase()}</span> con DNI N.° <span class="inline-field">${s.dni}</span>.
                      <div style="margin-top:20px;">${fraseAlumno}.</div>
                      <div style="margin-top:20px;">Presentado ante: ${presentadoAnte.toUpperCase()}</div>
                      <div class="date-section" style="margin-top:40px;">${fullDate}</div>
                  </div>
                  <div class="signatures-section">
                      <div class="sig-box"><div class="sig-line">Firma Director/a</div></div>
                      <div class="sig-box"><div class="sig-line">Sello Institución</div></div>
                  </div>
              </div>`;
          } else if (template === 'planilla_asistencia') {
              const months = ['MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'];
              months.forEach(mes => {
                  htmlContent += `
                  <div class="planilla-page">
                      <div class="planilla-header"><img src="${LOGO_URL}" style="height:40px;float:left;" /><h1 class="planilla-title">PLANILLA MENSUAL</h1></div>
                      <div class="planilla-grid"><div class="p-label">ALUMNO:</div><div class="p-value">${s.lastName}, ${s.firstName}</div><div class="p-label">MES:</div><div class="p-value">${mes}</div></div>
                      <table class="asistencia-table"><tr>${Array.from({length:10},(_,i)=>`<th>${i+1}</th>`).join('')}</tr><tr>${Array.from({length:10},()=>`<td></td>`).join('')}</tr></table>
                  </div>`;
              });
          }
          htmlContent += `</div>`; 
      });
    
      htmlContent += '</body></html>';
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      const docFrame = iframe.contentWindow.document;
      docFrame.open(); docFrame.write(htmlContent); docFrame.close();
      setTimeout(() => { iframe.contentWindow.print(); document.body.removeChild(iframe); setGenerating(false); }, 1000);
  }; 

  if (!canAccess) return <div className="p-10 text-center text-gray-400 font-bold">⛔ Acceso restringido.</div>;

  return (
    <div className="animate-in fade-in pb-20 px-2 pt-4">
        <div className="bg-white rounded-[30px] shadow-sm border border-gray-200 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 to-violet-600"></div>
            <div className="p-6 pt-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-4">
                    <img src={LOGO_URL} className="w-16 h-auto object-contain" />
                    <div>
                        <h2 className="text-2xl font-black text-gray-800 uppercase italic leading-none">Docs Alumnos</h2>
                        <p className="text-sm text-blue-600 font-bold uppercase mt-1">Gestión Administrativa</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 w-full md:w-auto">
                    <div className="flex bg-gray-100 rounded-xl items-center px-2">
                        <Search size={14} className="text-gray-400"/>
                        <input placeholder="Buscar..." onChange={e=>setFilterText(e.target.value)} className="bg-transparent p-2 text-xs font-bold outline-none w-full"/>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-blue-50/80 p-4 border border-blue-100 flex flex-col md:flex-row justify-between items-center gap-4 mt-2 rounded-2xl shadow-sm">
            <button onClick={toggleSelectAll} className="text-xs font-black uppercase text-blue-700 bg-blue-100/50 px-3 py-1 rounded-full">
              {selectedIds.length === filteredStudents.length ? 'Deseleccionar' : 'Seleccionar'} Visibles ({selectedIds.length})
            </button>
            <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto items-center">
                <input placeholder="Presentar ante..." value={customTarget} onChange={e => setCustomTarget(e.target.value)} className="w-full md:w-48 p-2 rounded-xl text-xs font-bold border border-blue-200 outline-none text-blue-900"/>
                <input type="date" value={customDate} onChange={e => setCustomDate(e.target.value)} className="w-full md:w-auto p-2 rounded-xl text-xs font-bold border border-blue-200 outline-none text-blue-900"/>
              <select value={template} onChange={e=>setTemplate(e.target.value)} className="bg-white text-gray-700 p-2 rounded-xl text-xs font-bold border border-blue-200 shadow-sm">
                    <option value="constancia_regular">📄 Constancia Regular</option>
                    <option value="planilla_asistencia">🗓️ Planilla Asistencia</option>
                    <option value="concesion_pase">✈️ Pase</option>
                    <option value="informe_jornada">📄 Informe Jornada</option>
                </select>
                <button onClick={generateDocument} disabled={generating || selectedIds.length === 0} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase shadow-md flex items-center gap-2">
                  {generating ? <RefreshCw className="animate-spin" size={14}/> : <><Printer size={16}/> Imprimir</>}
                </button>
              <button 
  onClick={downloadStudentsByOS}
  className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-black uppercase shadow-md flex items-center gap-2 hover:bg-emerald-700 transition-colors"
>
  <Download size={14}/> Excel OS
</button>
            </div>
        </div>

        <div className="bg-white shadow-sm border-x border-b border-gray-200 overflow-hidden rounded-b-[30px]">
            <div className="divide-y divide-gray-100 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {filteredStudents.map(s => (
                    <div key={s.id} onClick={() => toggleSelect(s.id)} className={`p-4 cursor-pointer hover:bg-blue-50 transition-colors ${selectedIds.includes(s.id) ? 'bg-blue-50/80' : ''}`}>
                        <div className="flex items-center gap-3">
                            <div className="shrink-0 text-blue-600">
                                {selectedIds.includes(s.id) ? <CheckSquare size={20} /> : <div className="w-5 h-5 border-2 border-gray-300 rounded"></div>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-slate-800 uppercase text-sm truncate">{s.lastName}, {s.firstName}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase">DNI: {s.dni} | {s.level} | {s.healthInsurance || 'S/D'}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
}
