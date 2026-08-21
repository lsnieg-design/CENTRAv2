import { getCachedAppConfig, getInstitutionName } from '../config';
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
  doc, updateDoc, collection, query, orderBy, onSnapshot, 
  addDoc, serverTimestamp, where, deleteDoc 
} from 'firebase/firestore';

export function PersonalView({ user, db, appId, TURNS_LIST, VALID_ROLES_OFFICIAL }) {
  const [staffList, setStaffList] = useState([]);
  const [students, setStudents] = useState([]);
  const uniqueTurns = TURNS_LIST;
  
  const [staffFilterText, setStaffFilterText] = useState('');
  const [filters, setFilters] = useState({ modality: 'all', roles: [], turn: 'all', subsidized: 'all' });
  
  const [viewingStaff, setViewingStaff] = useState(null); 
  const [showStaffForm, setShowStaffForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [showAbsenceForm, setShowAbsenceForm] = useState(false);
  const [selectedStaffForAbsence, setSelectedStaffForAbsence] = useState(null);
  const [absenceDate, setAbsenceDate] = useState(new Date().toISOString().split('T')[0]);
  const [absenceCode, setAbsenceCode] = useState('');
  const [showAbsencesSummary, setShowAbsencesSummary] = useState(false);
  const [summaryMonth, setSummaryMonth] = useState(new Date().toISOString().substring(0, 7)); 
  const [allAbsences, setAllAbsences] = useState([]);
  const [absenceEndDate, setAbsenceEndDate] = useState(''); 
  const [isRange, setIsRange] = useState(false);
  const [absenceTurn, setAbsenceTurn] = useState('Ambos');
  const [absenceNotes, setAbsenceNotes] = useState('');
  const [staffAbsences, setStaffAbsences] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [printColumns, setPrintColumns] = useState({
      dni: true,
      cargo1: true,
      cargo2: true,
      alta: false,
      domicilio: false,
      telefono: false,
      titulo: false
  });

  const canAccess = ['admin', 'super-admin', 'Administración', 'Equipo Directivo'].includes(user.role) || user.rol === 'admin';

  const VALID_ROLES = [
      "Docente", "Preceptora", "Auxiliar", "Profe Especial", "Equipo Técnico", "Equipo Directivo",
      "Dirección Inclusión", "Equipo Técnico Inclusión", "DAI",
      "Cocina", "Limpieza", "Mantenimiento", "Administración"
  ];

  const getNormRole = (r) => {
      if (!r) return '';
      const match = VALID_ROLES.find(v => v.toLowerCase() === r.trim().toLowerCase());
      return match || r.trim();
  };

  useEffect(() => {
    if (!showAbsencesSummary) return;
    const qAllAbsences = query(collection(db, 'artifacts', appId, 'public', 'data', 'absences'));
    const unsub = onSnapshot(qAllAbsences, (snap) => {
        setAllAbsences(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [showAbsencesSummary, db, appId]);

  useEffect(() => {
      if (!viewingStaff) {
          setStaffAbsences([]);
          return;
      }
      const qAbsences = query(
          collection(db, 'artifacts', appId, 'public', 'data', 'absences'),
          where('staffId', '==', viewingStaff.id)
      );
      
      const unsub = onSnapshot(qAbsences, (snap) => {
          const faltas = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          faltas.sort((a, b) => new Date(b.date) - new Date(a.date));
          setStaffAbsences(faltas);
      });
      return () => unsub();
  }, [viewingStaff, db, appId]);

  const CODIGOS_FALTAS = {
    '114a': 'Enfermedad corta',
    '114c': 'Matrimonio',
    '114d': 'Maternidad',
    '114e': 'Nacimiento',
    '114f': 'Familiar enfermo',
    '114j': 'Duelo familiar',
    '114ll': 'Examen / Prácticas / Días de estudio',
    '114o': 'Causas particulares',
    '114cro': 'Enfermedad Crónica'
  };

  useEffect(() => {
    const qStaff = query(collection(db, 'artifacts', appId, 'public', 'data', 'staff_records'), orderBy('lastName', 'asc'));
    const unsubStaff = onSnapshot(qStaff, (snap) => { setStaffList(snap.docs.map(d => ({ id: d.id, ...d.data() }))); });

    const qStudents = query(collection(db, 'artifacts', appId, 'public', 'data', 'students'), where('isActive', '==', true));
    const unsubStudents = onSnapshot(qStudents, (snap) => { 
        setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() }))); 
    });

    return () => { unsubStaff(); unsubStudents(); };
  }, []);

  const filteredStaff = staffList.filter(s => {
      const txt = staffFilterText.toLowerCase();
      const matchesText = !txt || `${s.lastName || ''} ${s.firstName || ''} ${s.dni || ''}`.toLowerCase().includes(txt);
      if (!matchesText) return false;
      if (filters.modality !== 'all' && (s.modality || 'Sede') !== filters.modality) return false;
      
      const c1Sub = s.cargo1_subsidized;
      const c2Sub = s.cargo2_subsidized;

      const isMecanizada = (c1Sub === 'true' || c2Sub === 'true');
      const isFueraDePlanta = (c1Sub === 'fuera' || c2Sub === 'fuera' || s.cargo1_en_papeles === 'true' || s.cargo2_en_papeles === 'true');
      const isDeno = !isMecanizada && !isFueraDePlanta;

      if (filters.subsidized !== 'all') {
          if (filters.subsidized === 'yes' && !isMecanizada) return false;
          if (filters.subsidized === 'fuera' && !isFueraDePlanta) return false;
          if (filters.subsidized === 'no' && !isDeno) return false;
      }

      const c1Role = getNormRole(s.cargo1_role || s.role); 
      const c2Role = getNormRole(s.cargo2_role);
      const c1Turn = (s.cargo1_turn || '').trim().toLowerCase();
      const c2Turn = (s.cargo2_turn || '').trim().toLowerCase();
      const filterRoles = filters.roles || [];
      const filterTurn = filters.turn.toLowerCase();
      const hasC1 = Boolean((s.cargo1_name && s.cargo1_name.trim()) || c1Role || c1Turn);
      const hasC2 = Boolean((s.cargo2_name && s.cargo2_name.trim()) || c2Role || c2Turn);
      let c1MatchesRole = filterRoles.length === 0 || filterRoles.includes(c1Role);
      let c2MatchesRole = filterRoles.length === 0 || filterRoles.includes(c2Role);
      const c1MatchesTurn = filterTurn === 'all' || c1Turn.includes(filterTurn);
      const c2MatchesTurn = filterTurn === 'all' || c2Turn.includes(filterTurn);

      if (filterRoles.length === 0 && filterTurn === 'all') return true;
      return (hasC1 && c1MatchesRole && c1MatchesTurn) || (hasC2 && c2MatchesRole && c2MatchesTurn);
  });

  const handlePhotoChange = (e) => {
      const f = e.target.files[0]; if(!f) return;
      setUploading(true);
      const reader = new FileReader();
      reader.onload=(ev)=>{
          const img=new Image();
          img.onload=()=>{
              const c=document.createElement('canvas');
              const s=300/img.width; c.width=300; c.height=img.height*s;
              const ctx=c.getContext('2d'); ctx.drawImage(img,0,0,c.width,c.height);
              setPhotoPreview(c.toDataURL('image/jpeg',0.7));
              setUploading(false);
          };
          img.src=ev.target.result;
      };
      reader.readAsDataURL(f);
  };

  const calcularAntiguedad = (aniosBase, mesesBase, fechaReferencia) => {
      const aBase = parseInt(aniosBase) || 0;
      const mBase = parseInt(mesesBase) || 0;
      if (!fechaReferencia && aBase === 0 && mBase === 0) return '-';

      const refDate = fechaReferencia ? new Date(fechaReferencia + 'T00:00:00') : new Date();
      const hoy = new Date();
      
      let diffAnios = hoy.getFullYear() - refDate.getFullYear();
      let diffMeses = hoy.getMonth() - refDate.getMonth();
      
      if (diffMeses < 0 || (diffMeses === 0 && hoy.getDate() < refDate.getDate())) {
          diffAnios--;
          diffMeses += 12;
      }

      let totalMeses = mBase + diffMeses;
      let totalAnios = aBase + diffAnios;

      if (totalMeses >= 12) {
          totalAnios += Math.floor(totalMeses / 12);
          totalMeses = totalMeses % 12;
      }

      if (totalAnios <= 0 && totalMeses <= 0) return 'Reciente';
      if (totalAnios <= 0) return `${totalMeses} meses`;
      if (totalMeses === 0) return `${totalAnios} años`;
      return `${totalAnios} años, ${totalMeses} mes${totalMeses !== 1 ? 'es' : ''}`;
  };

  const getSafeDate = (d) => { if(!d) return '-'; try { return new Date(d.includes('T') ? d : d+'T00:00:00').toLocaleDateString('es-AR'); } catch(e) { return d; } };

  const imprimirFichasDocentes = (lista) => {
      if (!lista || lista.length === 0) return alert("No hay docentes para imprimir.");
      let html = `<html><head><title>Fichas Docentes</title>
      <style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap');
          body{font-family:'Roboto',sans-serif;padding:20px; color: #222;}
          .page{border:1px solid #eee;padding:30px;margin-bottom:20px;border-radius:8px;page-break-after:always;max-width:800px;margin:0 auto 20px auto;border-top:10px solid #8b5cf6;}
          .header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #ddd;padding-bottom:20px;margin-bottom:20px;}
          .header-text h1{color:#5b21b6;font-size:24px;margin:0;text-transform:uppercase;}
          .header-text p{color:#666;font-size:14px;margin:5px 0 0 0;}
          .photo-box{width:80px;height:80px;background:#eee;border-radius:50%;overflow:hidden;border:3px solid #8b5cf6;display:flex;align-items:center;justify-content:center;font-size:30px;color:#aaa;}
          .photo-box img{width:100%;height:100%;object-fit:cover;}
          .section-title{background:#f3f4f6;color:#5b21b6;padding:8px 15px;font-weight:900;text-transform:uppercase;font-size:12px;border-radius:6px;margin-bottom:10px;border-left:5px solid #8b5cf6; margin-top:20px;}
          .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:15px;}
          .field{margin-bottom:5px;}
          .label{display:block;font-size:9px;color:#888;text-transform:uppercase;font-weight:bold;}
          .value{font-size:12px;font-weight:bold;color:#333;}
          .footer{text-align:center;font-size:9px;color:#aaa;margin-top:30px;border-top:1px solid #eee;padding-top:10px;}
          .cargo-card { border: 2px solid #e5e7eb; border-radius: 8px; padding: 15px; margin-bottom: 15px; background-color: #f9fafb; }
          .cargo-card.active { border-color: #c4b5fd; background-color: #fff; }
          .cargo-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px dashed #e5e7eb; padding-bottom: 10px; margin-bottom: 15px; }
          .cargo-role { font-size: 16px; font-weight: 900; color: #6d28d9; text-transform: uppercase; }
          .badge-sub { background: #d1fae5; color: #065f46; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
          .badge-nosub { background: #f3f4f6; color: #4b5563; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
          .badge-papeles { background: #fee2e2; color: #991b1b; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; margin-left: 5px; }
          .cargo-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
      </style></head><body>`;
      
      lista.forEach(s => {
          let antiguedad = calcularAntiguedad(s.antiguedadAnios, s.antiguedadMeses, s.antiguedadFechaRef);
          
          let c1Role = getNormRole(s.cargo1_role || s.role) || 'Rol Pendiente';
          let c2Role = getNormRole(s.cargo2_role) || 'Rol Pendiente';

          const hasC1 = Boolean((s.cargo1_name && s.cargo1_name.trim()) || c1Role !== 'Rol Pendiente' || (s.cargo1_turn && s.cargo1_turn.trim()));
          const hasC2 = Boolean((s.cargo2_name && s.cargo2_name.trim()) || c2Role !== 'Rol Pendiente' || (s.cargo2_turn && s.cargo2_turn.trim()));

          let c1Html = '';
          if (hasC1) {
              let subBadge = (s.cargo1_subsidized === 'true' || s.isSubsidized === 'true') ? '<span class="badge-sub">SUBVENCIONADO (MECA)</span>' : '<span class="badge-nosub">SIN SUBVENCIÓN (DENO)</span>';
              let papelesBadge = s.cargo1_en_papeles === 'true' ? '<span class="badge-papeles">SOLO EN PAPELES</span>' : '';
              let bajaC1 = s.cargo1_baja ? `<span style="color:red; font-size:10px; margin-left:10px;">BAJA: ${getSafeDate(s.cargo1_baja)}</span>` : '';
              c1Html = `
              <div class="cargo-card active">
                  <div class="cargo-header">
                      <span class="cargo-role">CARGO 1: ${c1Role} ${bajaC1}</span>
                      <div>${subBadge}${papelesBadge}</div>
                  </div>
                  <div class="cargo-grid">
                      <div class="field"><span class="label">N° de Cargo</span><span class="value">${s.cargo1_numero || '-'}</span></div>
                      <div class="field"><span class="label">Detalle / Nombre</span><span class="value">${s.cargo1_name || '-'}</span></div>
                      <div class="field"><span class="label">Turno</span><span class="value">${s.cargo1_turn || '-'}</span></div>
                      <div class="field"><span class="label">Sit. de Revista</span><span class="value">${s.cargo1_revista || '-'}</span></div>
                      <div class="field"><span class="label">Tipo</span><span class="value" style="text-transform:uppercase;">${s.cargo1_type || '-'}</span></div>
                      <div class="field"><span class="label">Fecha Alta</span><span class="value">${getSafeDate(s.cargo1_ingreso)}</span></div>
                  </div>
              </div>`;
          } else {
              c1Html = `<div class="cargo-card"><div class="cargo-role" style="color:#aaa; font-size: 14px;">CARGO 1: NO TRABAJA / SIN CARGO</div></div>`;
          }

          let c2Html = '';
          if (hasC2) {
              let subBadge = s.cargo2_subsidized === 'true' ? '<span class="badge-sub">SUBVENCIONADO (MECA)</span>' : '<span class="badge-nosub">SIN SUBVENCIÓN (DENO)</span>';
              let papelesBadge = s.cargo2_en_papeles === 'true' ? '<span class="badge-papeles">SOLO EN PAPELES</span>' : '';
              let bajaC2 = s.cargo2_baja ? `<span style="color:red; font-size:10px; margin-left:10px;">BAJA: ${getSafeDate(s.cargo2_baja)}</span>` : '';
              c2Html = `
              <div class="cargo-card active">
                  <div class="cargo-header">
                      <span class="cargo-role">CARGO 2: ${c2Role} ${bajaC2}</span>
                      <div>${subBadge}${papelesBadge}</div>
                  </div>
                  <div class="cargo-grid">
                      <div class="field"><span class="label">N° de Cargo</span><span class="value">${s.cargo2_numero || '-'}</span></div>
                      <div class="field"><span class="label">Detalle / Nombre</span><span class="value">${s.cargo2_name || '-'}</span></div>
                      <div class="field"><span class="label">Turno</span><span class="value">${s.cargo2_turn || '-'}</span></div>
                      <div class="field"><span class="label">Sit. de Revista</span><span class="value">${s.cargo2_revista || '-'}</span></div>
                      <div class="field"><span class="label">Tipo</span><span class="value" style="text-transform:uppercase;">${s.cargo2_type || '-'}</span></div>
                      <div class="field"><span class="label">Fecha Alta</span><span class="value">${getSafeDate(s.cargo2_ingreso)}</span></div>
                  </div>
              </div>`;
          } else {
              c2Html = `<div class="cargo-card"><div class="cargo-role" style="color:#aaa; font-size: 14px;">CARGO 2: NO TRABAJA / SIN CARGO</div></div>`;
          }

          html += `<div class="page">
              <div class="header">
                  <div class="header-text"><h1>${s.lastName}, ${s.firstName}</h1><p>DNI: ${s.dni || '-'} | Modalidad: <strong style="color: #6b28d9;">${s.modality || 'Sede'}</strong></p></div>
                  <div class="photo-box">${s.photoUrl ? `<img src="${s.photoUrl}"/>` : s.firstName?.[0] || 'U'}</div>
              </div>
              <div class="section-title">Datos Personales y Formación</div>
              <div class="grid">
                  <div class="field"><span class="label">Fecha Nacimiento</span><span class="value">${s.birthDate ? new Date(s.birthDate + 'T00:00:00').toLocaleDateString('es-AR') : '-'}</span></div>
                  <div class="field"><span class="label">Teléfono / Celular</span><span class="value">${s.phone || '-'}</span></div>
                  <div class="field"><span class="label">Email</span><span class="value">${s.email || '-'}</span></div>
                  <div class="field"><span class="label">Contacto de Emergencia</span><span class="value" style="color:#dc2626">${s.emergencyContact || '-'}</span></div>
                  <div class="field" style="grid-column: span 2;"><span class="label">Dirección</span><span class="value">${s.address || '-'}</span></div>
                  <div class="field"><span class="label">Título</span><span class="value">${s.degree || '-'}</span></div>
                  <div class="field"><span class="label">Estado de Estudios</span><span class="value">${s.studyStatus || '-'}</span></div>
              </div>
              <div class="section-title">Antigüedad e Ingreso Institucional</div>
              <div class="grid">
                  <div class="field"><span class="label">Fecha Ingreso Inst.</span><span class="value">${s.fechaIngreso ? new Date(s.fechaIngreso + 'T00:00:00').toLocaleDateString('es-AR') : '-'}</span></div>
                  <div class="field"><span class="label">Antigüedad Reconocida Total</span><span class="value" style="color:#5b21b6; font-size:14px;">${antiguedad}</span></div>
              </div>
              <div class="section-title" style="margin-bottom: 15px;">Detalle de Cargos</div>
              ${c1Html}
              ${c2Html}
              <div class="footer">${getInstitutionName()} - Legajo Docente generado el ${new Date().toLocaleDateString('es-AR')} a las ${new Date().toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'})}</div>
          </div>`;
      });
      html += '</body></html>';

      const iframe = document.createElement('iframe'); 
      iframe.style.position = 'fixed'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0'; 
      document.body.appendChild(iframe); 
      const doc = iframe.contentWindow.document; doc.open(); doc.write(html); doc.close(); 
      setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); setTimeout(() => { document.body.removeChild(iframe); }, 5000); }, 500);
  };

  const imprimirPlanillaGeneral = (lista) => {
      if (!lista || lista.length === 0) return alert("No hay personal para imprimir.");
      
      const LOGO_APP = getCachedAppConfig().logoUrl || '/icon-192.png';

      let html = `<html><head><title>Planilla Personalizada</title>
      <style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap');
          @page { size: landscape; margin: 10mm; }
          body { font-family: 'Roboto', sans-serif; padding: 0; color: #1e293b; font-size: 9px; }
          .header-table { width: 100%; border-bottom: 2px solid #6d28d9; margin-bottom: 15px; }
          table.data-table { width: 100%; border-collapse: collapse; }
          .data-table th { background: #f8fafc; padding: 8px; border: 1px solid #e2e8f0; text-transform: uppercase; font-weight: 900; text-align: left; }
          .data-table td { padding: 8px; border: 1px solid #e2e8f0; vertical-align: middle; }
          tr:nth-child(even) { background-color: #f1f5f9; }
          .cargo-role { font-weight: 900; color: #4338ca; font-size: 8px; text-transform: uppercase; }
      </style></head><body>
      <table class="header-table"><tr>
          <td><img src="${LOGO_APP}" style="height:40px;"></td>
          <td style="text-align:center;"><h1 style="margin:0; font-size:18px; color:#6d28d9;">Planilla de Personal Institucional</h1></td>
          <td style="text-align:right; font-weight:bold;">Ciclo 2026</td>
      </tr></table>
      <table class="data-table">
          <thead><tr>
              <th>Apellido y Nombre</th>
              ${printColumns.dni ? '<th>DNI</th>' : ''}
              ${printColumns.cargo1 ? '<th>Cargo 1</th>' : ''}
              ${printColumns.cargo2 ? '<th>Cargo 2</th>' : ''}
              ${printColumns.alta ? '<th>Ingreso Inst.</th>' : ''}
              ${printColumns.domicilio ? '<th>Dirección</th>' : ''}
              ${printColumns.telefono ? '<th>Teléfono</th>' : ''}
              ${printColumns.titulo ? '<th>Título</th>' : ''}
          </tr></thead><tbody>`;
      
      lista.forEach(s => {
          html += `<tr>
              <td style="font-weight:700; text-transform:uppercase;">${s.lastName}, ${s.firstName}</td>
              ${printColumns.dni ? `<td>${s.dni || '-'}</td>` : ''}
              ${printColumns.cargo1 ? `<td><div class="cargo-role">${s.cargo1_role || s.role || ''}</div>${s.cargo1_name || ''} ${s.cargo1_baja ? '<b style="color:red;">(BAJA)</b>' : ''}</td>` : ''}
              ${printColumns.cargo2 ? `<td><div class="cargo-role">${s.cargo2_role || ''}</div>${s.cargo2_name || ''} ${s.cargo2_baja ? '<b style="color:red;">(BAJA)</b>' : ''}</td>` : ''}
              ${printColumns.alta ? `<td>${s.fechaIngreso ? new Date(s.fechaIngreso+'T12:00:00').toLocaleDateString('es-AR') : '-'}</td>` : ''}
              ${printColumns.domicilio ? `<td>${s.address || '-'}</td>` : ''}
              ${printColumns.telefono ? `<td>${s.phone || '-'}</td>` : ''}
              ${printColumns.titulo ? `<td>${s.degree || '-'}</td>` : ''}
          </tr>`;
      });

      html += `</tbody></table><p style="text-align:right; font-size:8px; margin-top:10px;">Generado el ${new Date().toLocaleString('es-AR')}</p></body></html>`;

      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow.document; doc.open(); doc.write(html); doc.close();
      setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); document.body.removeChild(iframe); }, 500);
  };

  const handleImportStaff = async (e) => {
      const file = e.target.files[0];
      if (!file || !confirm("⚠️ ¿Importar archivo CSV completo?")) return;
      setProcessing(true);
      const reader = new FileReader();
      reader.onload = async (evt) => {
          try {
              const rows = evt.target.result.split('\n').slice(1).filter(r => r.trim() !== '');
              const promises = rows.map(row => {
                  const cols = row.split(';');
                  let bDate = "";
                  if (cols[3]?.trim()) {
                      const parts = cols[3].trim().split('/');
                      if (parts.length === 3) bDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                  }
                  return addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'staff_records'), {
                      lastName: cols[0]?.trim() || '', firstName: cols[1]?.trim() || '', dni: cols[2]?.trim() || '',
                      birthDate: bDate, address: cols[4]?.trim() || '', phone: cols[5]?.trim() || '',
                      emergencyContact: cols[6]?.trim() || '', email: cols[7]?.trim() || '',
                      studyStatus: cols[8]?.trim() || '', degree: cols[9]?.trim() || '',
                      modality: cols[11]?.trim() || 'Sede',
                      cargo1_role: cols[10]?.trim() || '', 
                      cargo1_subsidized: cols[12]?.trim() === 'SI' ? 'true' : 'false',
                      cargo1_en_papeles: 'false',
                      cargo1_name: cols[13]?.trim() || '', cargo1_type: cols[14]?.trim() || '', cargo1_turn: cols[15]?.trim() || '', cargo1_revista: cols[16]?.trim() || '',
                      cargo2_name: cols[17]?.trim() || '', cargo2_type: cols[18]?.trim() || '', cargo2_turn: cols[19]?.trim() || '', cargo2_revista: cols[20]?.trim() || '',
                      cargo2_en_papeles: 'false',
                      createdAt: serverTimestamp()
                  });
              });
              await Promise.all(promises);
              alert("✅ Personal importado correctamente.");
          } catch (err) { alert("Error: " + err.message); } finally { setProcessing(false); }
      };
      reader.readAsText(file);
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const d = Object.fromEntries(fd.entries());
    
    delete d.id; 

    d.photoUrl = photoPreview || editingStaff?.photoUrl || '';
    
    if(!d.cargo2_name || d.cargo2_name.trim() === '') { 
        d.cargo2_role = ''; d.cargo2_turn = ''; d.cargo2_type = ''; 
        d.cargo2_revista = ''; d.cargo2_ingreso = ''; d.cargo2_name = ''; 
        d.cargo2_subsidized = 'false'; d.cargo2_en_papeles = 'false'; d.cargo2_baja = '';
    }

    try {
        setProcessing(true);
        if (editingStaff?.id) {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'staff_records', editingStaff.id), d);
            if (viewingStaff?.id === editingStaff.id) {
                setViewingStaff({ ...viewingStaff, ...d });
            }
        } else {
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'staff_records'), { 
                ...d, 
                createdAt: serverTimestamp() 
            });
        }
        setShowStaffForm(false); 
        setEditingStaff(null); 
        setPhotoPreview(null);
        alert("✅ Legajo actualizado con éxito");
    } catch (err) { 
        alert("Error: " + err.message); 
    } finally {
        setProcessing(false);
    }
  };

  const calculateStats = () => {
      const stats = {
          cargos: { simple: 0, doble: 0 },
      };

      filteredStaff.forEach(s => {
          const c1Role = getNormRole(s.cargo1_role || s.role);
          const c2Role = getNormRole(s.cargo2_role);
          const c1Turn = (s.cargo1_turn || '').toLowerCase();
          const c2Turn = (s.cargo2_turn || '').toLowerCase();
          
          const filterRoles = filters.roles || [];
          const filterTurn = filters.turn.toLowerCase();

          const hasC1 = Boolean((s.cargo1_name && s.cargo1_name.trim()) || c1Role || c1Turn);
          const hasC2 = Boolean((s.cargo2_name && s.cargo2_name.trim()) || c2Role || c2Turn);

          const c1IsUnassigned = !hasC1 || !VALID_ROLES.includes(c1Role);
          const c2IsUnassigned = hasC2 && !VALID_ROLES.includes(c2Role);

          let c1MatchesRole = filterRoles.length === 0 || (filterRoles.includes('sin-asignar') && c1IsUnassigned) || filterRoles.includes(c1Role);
          let c2MatchesRole = filterRoles.length === 0 || (filterRoles.includes('sin-asignar') && c2IsUnassigned) || filterRoles.includes(c2Role);

          const c1Matches = hasC1 && c1MatchesRole && (filterTurn === 'all' || c1Turn.includes(filterTurn));
          const c2Matches = hasC2 && c2MatchesRole && (filterTurn === 'all' || c2Turn.includes(filterTurn));

          const isC1Papeles = s.cargo1_en_papeles === 'true';
          const isC2Papeles = s.cargo2_en_papeles === 'true';

          let activeCargosCount = 0;
          if (c1Matches && !isC1Papeles && s.cargo1_name && !s.cargo1_baja) activeCargosCount++;
          if (c2Matches && !isC2Papeles && s.cargo2_name && !s.cargo2_baja) activeCargosCount++;

          if (activeCargosCount === 2) stats.cargos.doble++;
          else if (activeCargosCount === 1) stats.cargos.simple++;
      });
      return stats;
  };

  if (!canAccess) return <div className="p-10 text-center text-gray-400 font-bold">⛔ Acceso restringido.</div>;

  const currentStats = calculateStats();
  const totalCargosReales = currentStats.cargos.simple + (currentStats.cargos.doble * 2);

  const handleDeleteAbsence = async (id) => {
      if(window.confirm("⚠️ ¿Seguro que querés eliminar este registro de inasistencia?")) {
          try {
              await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'absences', id));
          } catch (err) {
              alert("Error al borrar: " + err.message);
          }
      }
  };

  const getBusinessDays = (startDateStr, endDateStr) => {
      const dates = [];
      let current = new Date(startDateStr + 'T12:00:00');
      const end = new Date(endDateStr + 'T12:00:00');
      
      while (current <= end) {
          const dayOfWeek = current.getDay();
          if (dayOfWeek !== 0 && dayOfWeek !== 6) {
              dates.push(current.toISOString().split('T')[0]);
          }
          current.setDate(current.getDate() + 1);
      }
      return dates;
  };

  const handleSaveAbsence = async () => {
    if (!selectedStaffForAbsence || !absenceCode || !absenceDate) {
        alert("Por favor completá los campos obligatorios (Persona, Fecha de Inicio y Código).");
        return;
    }

    let diasAProcesar = [absenceDate];
    if (isRange && absenceEndDate) {
        if (new Date(absenceEndDate) < new Date(absenceDate)) {
            alert("La fecha de finalización no puede ser anterior a la de inicio.");
            return;
        }
        diasAProcesar = getBusinessDays(absenceDate, absenceEndDate);
        if (diasAProcesar.length === 0) {
            alert("El rango seleccionado no contiene días hábiles (Lunes a Viernes).");
            return;
        }
    }

    try {
        setProcessing(true);
        const absencesRef = collection(db, 'artifacts', appId, 'public', 'data', 'absences');
        
        const promises = diasAProcesar.map(fecha => {
            return addDoc(absencesRef, {
                staffId: selectedStaffForAbsence.id,
                staffName: `${selectedStaffForAbsence.lastName}, ${selectedStaffForAbsence.firstName}`,
                role: getNormRole(selectedStaffForAbsence.cargo1_role || selectedStaffForAbsence.role),
                code: absenceCode,
                description: CODIGOS_FALTAS[absenceCode],
                date: fecha,
                month: fecha.substring(0, 7),
                year: fecha.substring(0, 4),
                turn: absenceTurn, 
                notes: absenceNotes.trim(), 
                createdAt: serverTimestamp()
            });
        });

        await Promise.all(promises);
        
        alert(`✅ Se registraron ${diasAProcesar.length} día(s) de inasistencia para ${selectedStaffForAbsence.lastName}`);
        
        setShowAbsenceForm(false);
        setSelectedStaffForAbsence(null);
        setAbsenceCode('');
        setAbsenceEndDate('');
        setIsRange(false);
        setAbsenceTurn('Ambos');
        setAbsenceNotes('');
    } catch (err) {
        alert("Error al guardar la inasistencia: " + err.message);
    } finally {
        setProcessing(false);
    }
  };

  const absencesForMonth = allAbsences.filter(a => a.month === summaryMonth);
  
  const staffAbsenceStats = {};
  absencesForMonth.forEach(abs => {
      if (!staffAbsenceStats[abs.staffId]) {
          staffAbsenceStats[abs.staffId] = {
              name: abs.staffName,
              role: abs.role,
              total: 0,
              codes: {}
          };
      }
      staffAbsenceStats[abs.staffId].total += 1;
      staffAbsenceStats[abs.staffId].codes[abs.code] = (staffAbsenceStats[abs.staffId].codes[abs.code] || 0) + 1;
  });
  
  const sortedStaffStats = Object.values(staffAbsenceStats).sort((a, b) => a.name.localeCompare(b.name));

  const imprimirResumenMensual = () => {
      if (sortedStaffStats.length === 0) return alert("No hay inasistencias registradas en este mes.");
      
      const [year, month] = summaryMonth.split('-');
      const mesNombre = new Date(year, parseInt(month)-1, 1).toLocaleString('es-AR', { month: 'long' });

      let html = `<html><head><title>Resumen de Inasistencias</title>
      <style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap');
          body { font-family: 'Roboto', sans-serif; padding: 20px; color: #1e293b; font-size: 11px; }
          .header { text-align: center; border-bottom: 2px solid #ea580c; padding-bottom: 15px; margin-bottom: 20px; }
          h1 { color: #ea580c; margin: 0; font-size: 20px; text-transform: uppercase; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #fff7ed; color: #c2410c; padding: 10px; border: 1px solid #fed7aa; text-transform: uppercase; font-weight: 900; text-align: left; }
          td { padding: 10px; border: 1px solid #fed7aa; }
          .totales { font-weight: 900; color: #ea580c; font-size: 14px; text-align: center; }
          .badge { background: #ffedd5; padding: 3px 6px; border-radius: 4px; border: 1px solid #fdba74; font-weight: bold; font-size: 9px; margin-right: 4px; }
      </style></head><body>
      
      <div class="header">
          <h1>Resumen Institucional de Inasistencias</h1>
          <p style="font-size: 14px; font-weight: bold; margin-top: 5px; text-transform: uppercase;">Período: ${mesNombre} ${year}</p>
      </div>

      <table>
          <thead><tr>
              <th>Personal</th>
              <th>Rol / Función</th>
              <th style="text-align: center;">Total Días</th>
              <th>Detalle por Artículo</th>
          </tr></thead>
          <tbody>`;

      sortedStaffStats.forEach(s => {
          const detailStr = Object.entries(s.codes).map(([code, count]) => `<span class="badge">Art. ${code}: ${count}</span>`).join(' ');
          html += `<tr>
              <td style="font-weight: 900; text-transform: uppercase;">${s.name}</td>
              <td style="color: #64748b;">${s.role}</td>
              <td class="totales">${s.total}</td>
              <td>${detailStr}</td>
          </tr>`;
      });

      html += `</tbody></table>
      <p style="text-align: right; font-size: 9px; margin-top: 20px; color: #94a3b8;">
          ${getInstitutionName()} - Generado el ${new Date().toLocaleString('es-AR')}
      </p></body></html>`;

      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow.document; doc.open(); doc.write(html); doc.close();
      setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); document.body.removeChild(iframe); }, 500);
  };
  
  return (
    <div className="space-y-4 animate-in fade-in pb-20 px-2 md:px-4 pt-4">
        
        {/* ENCABEZADO CON CONTADOR EN VIVO (PERSONAS Y CARGOS) */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-3xl border border-violet-100 shadow-sm gap-4">
            <div className="flex items-center gap-4 flex-wrap">
                <h3 className="font-black text-violet-900 uppercase italic text-xl">Personal</h3>
                
                <div className="flex gap-2">
                    <div className="bg-orange-100 text-orange-700 px-3 py-2 rounded-xl font-black text-[10px] md:text-xs flex items-center gap-1.5 border border-orange-200 shadow-sm uppercase tracking-widest" title="Cantidad de personas físicas activas">
                        <User size={14}/> {filteredStaff.filter(s => !s.cargo1_baja || !s.cargo2_baja).length} {filteredStaff.length === 1 ? 'Persona' : 'Personas'}
                    </div>
                    
                    <div className="bg-emerald-100 text-emerald-800 px-3 py-2 rounded-xl font-black text-[10px] md:text-xs flex items-center gap-1.5 border border-emerald-200 shadow-sm uppercase tracking-widest" title="Cantidad total de cargos ejercidos activos">
                        {totalCargosReales} {totalCargosReales === 1 ? 'Cargo Activo' : 'Cargos Activos'}
                    </div>
                </div>
            </div>
            
            <div className="flex gap-2">
                <button 
                    onClick={() => setShowPrintOptions(true)} 
                    className="bg-white text-blue-600 border border-blue-200 p-3 rounded-2xl shadow-sm hover:bg-blue-50 transition" 
                    title="Configurar Planilla"
                >
                    <Grid size={20}/>
                </button>
                <button onClick={() => imprimirFichasDocentes(filteredStaff)} className="bg-white text-violet-600 border border-violet-200 p-3 rounded-2xl shadow-sm hover:bg-violet-50 transition" title="Imprimir Fichas Individuales"><Printer size={20}/></button>
                
                <label className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl cursor-pointer hover:bg-emerald-200 transition flex items-center justify-center">
                    {processing ? <RefreshCw className="animate-spin" size={20}/> : <UploadCloud size={20}/>}
                    <input type="file" accept=".csv" className="hidden" onChange={handleImportStaff} />
                </label>

                <button onClick={()=>{setEditingStaff(null); setPhotoPreview(null); setShowStaffForm(true);}} className="bg-violet-600 text-white p-3 rounded-2xl shadow-lg flex items-center justify-center"><Plus size={20}/></button>
            </div>
        </div>

        {/* ACCIONES DE AUSENTISMO HORIZONTALES */}
        <div className="flex items-center gap-2 mr-1 md:mr-3 pr-1 md:pr-3">
            <button 
                onClick={() => setShowAbsenceForm(true)} 
                className="bg-orange-100 text-orange-700 border border-orange-200 p-3 rounded-2xl shadow-sm hover:bg-orange-200 transition flex items-center gap-2 font-black uppercase text-[10px] tracking-widest"
                title="Registrar Inasistencias"
            >
                <UserCheck size={20}/>
                <span className="hidden md:inline">Faltas</span>
            </button>

            <button 
                onClick={() => setShowAbsencesSummary(true)} 
                className="bg-violet-100 text-violet-700 border border-violet-200 p-3 rounded-2xl shadow-sm hover:bg-violet-200 transition flex items-center gap-2 font-black uppercase text-[10px] tracking-widest"
                title="Resumen Mensual de Inasistencias"
            >
                <PieChart size={20}/>
                <span className="hidden md:inline">Resumen</span>
            </button>
        </div>

        {/* BARRA DE FILTROS ACTUALIZADA PARA MULTISELECCIÓN */}
        <div className="space-y-2">
            <div className="bg-white p-2 rounded-2xl border border-gray-100 flex items-center gap-2 shadow-sm">
                <Search size={18} className="ml-2 text-gray-300"/>
                <input value={staffFilterText} onChange={e=>setStaffFilterText(e.target.value)} placeholder="Buscar por apellido, nombre o DNI..." className="w-full p-2 outline-none text-sm font-bold text-gray-700 bg-transparent"/>
                {staffFilterText && <button onClick={()=>setStaffFilterText('')} className="pr-2 text-gray-400 hover:text-gray-600"><X size={16}/></button>}
            </div>
            
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide items-center">
                <select value={filters.modality} onChange={e=>setFilters({...filters, modality: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[120px] border border-gray-200 shadow-sm outline-none">
                    <option value="all">Modalidad: Todas</option><option value="Sede">Sede</option><option value="Inclusión">Inclusión</option>
                </select>
                
                <select 
                    value="default" 
                    onChange={e => {
                        const val = e.target.value;
                        if (val !== 'default' && !filters.roles.includes(val)) {
                            setFilters({...filters, roles: [...filters.roles, val]});
                        }
                    }} 
                    className="bg-white text-violet-700 text-xs p-2 rounded-lg font-bold min-w-[140px] border border-violet-200 shadow-sm outline-none cursor-pointer"
                >
                    <option value="default">+ Agregar Rol...</option>
                    <option value="sin-asignar">⚠️ Sin Asignar / Error</option>
                    {VALID_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>

                <select value={filters.turn} onChange={e=>setFilters({...filters, turn: e.target.value})} className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[120px] border border-gray-200 shadow-sm outline-none">
                    <option value="all">Turno: Todos</option>
                    {(typeof TURNS_LIST !== 'undefined' ? TURNS_LIST : []).map(t => (
                        <option key={t} value={t}>{t}</option>
                    ))}
                </select>

                <select 
                  value={filters.subsidized} 
                  onChange={e => setFilters({...filters, subsidized: e.target.value})} 
                  className="bg-white text-gray-700 text-xs p-2 rounded-lg font-bold min-w-[120px] border border-gray-200 shadow-sm outline-none cursor-pointer"
                >
                    <option value="all">Subvención: Todas</option>
                    <option value="yes">Mecanizada (Subv.)</option>
                    <option value="no">No Subvencionada (DENO)</option>
                    <option value="fuera">Fuera de Planta / Papeles</option>
                </select>
                <button onClick={() => setFilters({ modality: 'all', roles: [], turn: 'all', subsidized: 'all' })} className="bg-red-50 text-red-600 text-xs px-3 py-2 rounded-lg font-bold min-w-[80px] border border-red-100 shadow-sm hover:bg-red-100 transition">Limpiar</button>
            </div>

            {filters.roles.length > 0 && (
                <div className="flex flex-wrap gap-2 animate-in fade-in mt-1 mb-2">
                    {filters.roles.map(r => (
                        <span key={r} className="bg-violet-100 text-violet-800 text-[10px] font-black px-2 py-1.5 rounded-lg flex items-center gap-1 border border-violet-200 shadow-sm">
                            {r === 'sin-asignar' ? '⚠️ Sin Asignar' : r}
                            <button onClick={() => setFilters({...filters, roles: filters.roles.filter(role => role !== r)})} className="hover:text-red-500 transition-colors bg-white rounded-full p-0.5 ml-1"><X size={10}/></button>
                        </span>
                    ))}
                </div>
            )}
        </div>

        {/* LISTADO DE PERSONAL (CON SOPORTE DE BAJA EN GRIS) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-24 mt-2">
             {filteredStaff.map(s => {
                const tieneSub = s.cargo1_subsidized === 'true' || s.cargo2_subsidized === 'true' || s.isSubsidized === 'true';
                
                const c1Role = getNormRole(s.cargo1_role || s.role);
                const c2Role = getNormRole(s.cargo2_role);

                const hasC1 = Boolean((s.cargo1_name && s.cargo1_name.trim()) || c1Role || (s.cargo1_turn && s.cargo1_turn.trim()));
                const hasC2 = Boolean((s.cargo2_name && s.cargo2_name.trim()) || c2Role || (s.cargo2_turn && s.cargo2_turn.trim()));

                const c1NeedsFix = !hasC1 || !VALID_ROLES_OFFICIAL.includes(c1Role);
                const c2NeedsFix = hasC2 && !VALID_ROLES_OFFICIAL.includes(c2Role);
                const needsRoleFix = c1NeedsFix || c2NeedsFix;
                                
                const c1Baja = Boolean(s.cargo1_baja);
                const c2Baja = Boolean(s.cargo2_baja);
                const estaDadoDeBajaTotal = (hasC1 ? c1Baja : true) && (hasC2 ? c2Baja : true);

                return (
                    <div 
                      key={s.id} 
                      onClick={() => setViewingStaff(s)} 
                      className={`p-4 rounded-[25px] border transition-all cursor-pointer group relative flex items-center gap-4 ${
                          estaDadoDeBajaTotal 
                              ? 'bg-gray-100 border-gray-300 opacity-60 grayscale' 
                              : 'bg-white border-gray-100 hover:border-violet-300 shadow-sm'
                      }`}
                    >
                        <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center font-black text-violet-300 overflow-hidden border-2 border-violet-100 shrink-0 relative">
                            {s.photoUrl ? <img src={s.photoUrl} className="w-full h-full object-cover"/> : s.firstName?.[0]}
                            {tieneSub && <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-sm" title="Subvencionada"></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex gap-2 items-center flex-wrap">
                                <h4 className="font-bold text-gray-800 text-sm uppercase truncate">{s.lastName}, {s.firstName}</h4>
                                <span className={`text-[8px] px-2 py-0.5 rounded-md font-black uppercase ${s.modality === 'Inclusión' ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-100 text-orange-700'}`}>{s.modality || 'Sede'}</span>
                                {estaDadoDeBajaTotal && <span className="bg-red-100 text-red-700 text-[9px] font-black px-2 py-0.5 rounded-lg border border-red-200">BAJA</span>}
                                {needsRoleFix && <span className="bg-red-100 text-red-700 text-[9px] font-black px-2 py-0.5 rounded-lg border border-red-200 animate-pulse">⚠️ ASIGNAR ROL</span>}
                            </div>
                            <div className="flex gap-2 text-[10px] mt-1 text-gray-500 font-bold">
                                {s.dni && <span>DNI: {s.dni}</span>}
                                <span className="text-violet-500">Anti: {calcularAntiguedad(s.antiguedadAnios, s.antiguedadMeses, s.antiguedadFechaRef)}</span>
                            </div>
                            
                            <p className="text-[10px] font-black uppercase mt-1 truncate">
                                {hasC1 ? (
                                    <span className={s.cargo1_subsidized === 'true' ? 'text-emerald-600' : s.cargo1_subsidized === 'fuera' ? 'text-amber-600' : 'text-slate-400'}>
                                        C1: {getNormRole(s.cargo1_role || s.role)} ({s.cargo1_turn || '-'}) 
                                        {s.cargo1_subsidized === 'true' ? ' (MECA)' : s.cargo1_subsidized === 'fuera' ? ' (PAPELES)' : ' (DENO)'}
                                        {s.cargo1_baja && <b className="text-red-500 ml-1">[Baja: {getSafeDate(s.cargo1_baja)}]</b>}
                                    </span>
                                ) : (
                                    <span className="text-gray-300">NO TRABAJA (C1)</span>
                                )} 
                                
                                {hasC2 ? (
                                    <>
                                        <span className="text-gray-300 mx-1">|</span>
                                        <span className={s.cargo2_subsidized === 'true' ? 'text-emerald-600' : s.cargo2_subsidized === 'fuera' ? 'text-amber-600' : 'text-slate-400'}>
                                            C2: {getNormRole(s.cargo2_role)} ({s.cargo2_turn || '-'}) 
                                            {s.cargo2_subsidized === 'true' ? ' (MECA)' : s.cargo2_subsidized === 'fuera' ? ' (PAPELES)' : ' (DENO)'}
                                            {s.cargo2_baja && <b className="text-red-500 ml-1">[Baja: {getSafeDate(s.cargo2_baja)}]</b>}
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-gray-300"> | NO TRABAJA (C2)</span>
                                )}
                            </p>
                        </div>
                        <Eye className="text-gray-300 group-hover:text-violet-500 transition-colors shrink-0" />
                    </div>
                );
             })}
        </div>

        {/* MODAL LECTURA LEGAJO */}
        {viewingStaff && !showStaffForm && (
            <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setViewingStaff(null)}>
                <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95" onClick={(e) => e.stopPropagation()}>
                    
                    <div className="bg-violet-800 p-6 text-white relative shrink-0">
                        <div className="absolute top-4 right-14 flex gap-2">
                            <button 
                              onClick={() => { setEditingStaff(viewingStaff); setPhotoPreview(viewingStaff.photoUrl || null); setShowStaffForm(true); }} 
                              className="bg-white/20 p-2 rounded-full hover:bg-white/40 transition flex items-center gap-1 text-xs font-bold"
                              title="Editar ficha"
                            >
                                <Edit3 size={18}/>
                            </button>
                        </div>
                        <button onClick={()=>setViewingStaff(null)} className="absolute top-4 right-4 bg-white/20 p-1.5 rounded-full hover:bg-white/40 transition"><X size={20}/></button>
                        <div className="flex gap-5 items-center">
                            <div className="w-20 h-20 rounded-2xl bg-white/20 border-4 border-white/10 overflow-hidden flex items-center justify-center shadow-lg">
                                {viewingStaff.photoUrl ? <img src={viewingStaff.photoUrl} className="w-full h-full object-cover"/> : <div className="text-4xl font-black text-white/50">{viewingStaff?.firstName?.[0] || '👤'}</div>}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black uppercase tracking-tight">{viewingStaff?.lastName}, {viewingStaff?.firstName}</h2>
                                <p className="text-orange-300 font-bold text-xs uppercase tracking-widest">{viewingStaff?.modality || 'Sede'}</p>
                                <span className="bg-white/20 px-3 py-1 rounded-lg text-[10px] font-bold inline-block mt-2">DNI: {viewingStaff?.dni || '-'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-6 overflow-y-auto bg-gray-50 flex-1 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm"><p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Nacimiento</p><p className="font-black text-slate-800 text-xs">{getSafeDate(viewingStaff.birthDate)}</p></div>
                            <div className="bg-white p-3 rounded-2xl border border-gray-200 shadow-sm"><p className="text-[9px] text-gray-400 font-bold uppercase mb-1">Celular</p><p className="font-black text-slate-800 text-xs">{viewingStaff.phone || '-'}</p></div>
                        </div>

                        <div className="bg-violet-50 p-4 rounded-2xl border border-violet-100 shadow-sm space-y-3">
                            <div className="flex justify-between text-xs border-b border-violet-200 pb-2">
                                <span className="font-bold text-gray-500">Ingreso Inst: {getSafeDate(viewingStaff.fechaIngreso)}</span>
                                <span className="font-black text-violet-700">Antigüedad: {calcularAntiguedad(viewingStaff.antiguedadAnios, viewingStaff.antiguedadMeses, viewingStaff.antiguedadFechaRef)}</span>
                            </div>
                            
                            {Boolean((viewingStaff.cargo1_name && viewingStaff.cargo1_name.trim()) || viewingStaff.cargo1_role || viewingStaff.role) && (
                                <div className={`bg-white p-3 rounded-lg border ${viewingStaff.cargo1_baja ? 'border-red-300 bg-red-50/50' : 'border-violet-200 shadow-sm'} text-xs relative`}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-black text-violet-900 uppercase">C1: {getNormRole(viewingStaff.cargo1_role || viewingStaff.role)} {viewingStaff.cargo1_baja && <span className="bg-red-200 text-red-800 px-1.5 py-0.5 rounded text-[8px] ml-1">BAJA: {getSafeDate(viewingStaff.cargo1_baja)}</span>}</span>
                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${viewingStaff.cargo1_subsidized === 'true' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>{viewingStaff.cargo1_subsidized === 'true' ? 'MECA' : 'DENO'}</span>
                                    </div>
                                    <p className="font-bold text-gray-700">{viewingStaff.cargo1_name}</p>
                                    <p className="text-gray-500 text-[10px]">N° {viewingStaff.cargo1_numero || '-'} | {viewingStaff.cargo1_type || '-'} | {viewingStaff.cargo1_turn || '-'} | {viewingStaff.cargo1_revista || '-'}</p>
                                    <p className="text-[9px] text-violet-400 mt-1 font-bold">Alta: {getSafeDate(viewingStaff.cargo1_ingreso)}</p>
                                </div>
                            )}

                            {Boolean((viewingStaff.cargo2_name && viewingStaff.cargo2_name.trim()) || viewingStaff.cargo2_role) && (
                                <div className={`bg-white p-3 rounded-lg border ${viewingStaff.cargo2_baja ? 'border-red-300 bg-red-50/50' : 'border-violet-200 shadow-sm'} text-xs relative`}>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-black text-violet-900 uppercase">C2: {getNormRole(viewingStaff.cargo2_role)} {viewingStaff.cargo2_baja && <span className="bg-red-200 text-red-800 px-1.5 py-0.5 rounded text-[8px] ml-1">BAJA: {getSafeDate(viewingStaff.cargo2_baja)}</span>}</span>
                                        <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded ${viewingStaff.cargo2_subsidized === 'true' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'}`}>{viewingStaff.cargo2_subsidized === 'true' ? 'MECA' : 'DENO'}</span>
                                    </div>
                                    <p className="font-bold text-gray-700">{viewingStaff.cargo2_name}</p>
                                    <p className="text-gray-500 text-[10px]">N° {viewingStaff.cargo2_numero || '-'} | {viewingStaff.cargo2_type || '-'} | {viewingStaff.cargo2_turn || '-'} | {viewingStaff.cargo2_revista || '-'}</p>
                                    <p className="text-[9px] text-violet-400 mt-1 font-bold">Alta: {getSafeDate(viewingStaff.cargo2_ingreso)}</p>
                                </div>
                            )}
                        </div>

                        {['Docente', 'Auxiliar', 'Preceptora', 'DAI', 'Inclusión'].some(role => 
                            (viewingStaff.cargo1_role || viewingStaff.role || '').includes(role) || 
                            (viewingStaff.cargo2_role || '').includes(role)
                        ) && (
                            <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 shadow-sm">
                                <h4 className="text-[10px] font-black text-emerald-600 uppercase mb-3 flex items-center gap-2">📍 Alumnos y Grupos Asignados</h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {(() => {
                                        const myGroupsTM = [...new Set(students.filter(s => s.teacherIdMorning === viewingStaff.id || s.teacherId2Morning === viewingStaff.id || s.daiId === viewingStaff.id).map(s => s.groupMorning))].filter(Boolean);
                                        const myGroupsTT = [...new Set(students.filter(s => s.teacherIdAfternoon === viewingStaff.id || s.teacherId2Afternoon === viewingStaff.id || s.daiId === viewingStaff.id).map(s => s.groupAfternoon))].filter(Boolean);
                                        return (
                                            <>
                                                <div className="bg-white p-2 rounded-xl border border-emerald-100 text-center">
                                                    <p className="text-[8px] font-black text-gray-400 uppercase">T. Mañana</p>
                                                    <p className="font-bold text-emerald-700 text-xs">{myGroupsTM.length > 0 ? myGroupsTM.join(', ') : 'Ninguno'}</p>
                                                </div>
                                                <div className="bg-white p-2 rounded-xl border border-emerald-100 text-center">
                                                    <p className="text-[8px] font-black text-gray-400 uppercase">T. Tarde</p>
                                                    <p className="font-bold text-emerald-700 text-xs">{myGroupsTT.length > 0 ? myGroupsTT.join(', ') : 'Ninguno'}</p>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                                <p className="text-[7px] text-emerald-400 mt-2 italic text-center">* Información vinculada por ID de seguridad</p>
                            </div>
                        )}

                        <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 shadow-sm mt-2">
                            <div className="flex justify-between items-center mb-3">
                                <h4 className="text-[10px] font-black text-orange-600 uppercase flex items-center gap-2">
                                    <UserCheck size={14}/> Historial de Inasistencias
                                </h4>
                                <span className="bg-orange-200 text-orange-800 text-[9px] font-black px-2 py-0.5 rounded-lg">
                                    Total: {staffAbsences.length}
                                </span>
                            </div>

                           {staffAbsences.length === 0 ? (
                                <p className="text-[10px] text-orange-400 font-bold italic text-center py-2">
                                    No registra inasistencias cargadas.
                                </p>
                            ) : (
                                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-1">
                                    {staffAbsences.map((falta) => (
                                        <div key={falta.id} className="bg-white p-2 rounded-xl border border-orange-200 flex justify-between items-center group/falta">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-orange-500 text-white font-black text-[10px] px-2 py-1 rounded-lg uppercase">
                                                    {falta.code}
                                                </span>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-700 leading-tight">
                                                        {falta.description} 
                                                        {falta.turn && <span className="bg-slate-100 text-slate-600 font-black text-[7px] px-1.5 py-0.5 rounded-md ml-1.5 border border-slate-200">{falta.turn.toUpperCase()}</span>}
                                                    </p>
                                                    <p className="text-[8px] text-slate-400 uppercase font-black flex justify-between items-center mt-0.5">
                                                        <span>{new Date(falta.date + 'T00:00:00').toLocaleDateString('es-AR')}</span>
                                                        {falta.notes && <span className="text-orange-600 italic font-bold normal-case truncate max-w-[180px]">“{falta.notes}”</span>}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <button 
                                                onClick={() => handleDeleteAbsence(falta.id)} 
                                                className="text-red-300 hover:text-red-600 p-1.5 bg-red-50 rounded-lg opacity-0 group-hover/falta:opacity-100 transition-all"
                                                title="Eliminar registro"
                                            >
                                                <Trash2 size={12}/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        )}
        
        {/* MODAL EDICIÓN LEGAJO */}
        {showStaffForm && (
          <div className="fixed inset-0 bg-black/70 z-[150] flex items-center justify-center p-2 sm:p-4 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-slate-50 rounded-[30px] w-full max-w-xl shadow-2xl max-h-[95vh] overflow-hidden flex flex-col border border-white/20">
              
              <div className="bg-violet-700 p-5 text-white flex justify-between items-center shrink-0">
                <div className="flex-1">
                  <h3 className="text-lg font-black uppercase italic tracking-tighter">
                    {editingStaff ? 'Editar Legajo' : 'Nuevo Personal'}
                  </h3>
                  {editingStaff && (!editingStaff?.dni || !editingStaff?.cargo1_role || !editingStaff?.modality) ? (
                    <div className="bg-amber-400 text-amber-900 text-[8px] font-black px-2 py-0.5 rounded-full inline-flex items-center gap-1 animate-pulse mt-1 uppercase">
                      ⚠️ Atención: Ficha incompleta. Completar datos para vinculación.
                    </div>
                  ) : (
                    <p className="text-[10px] opacity-70 font-bold uppercase">Configuración de ficha técnica</p>
                  )}
                </div>
                <button onClick={() => setShowStaffForm(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition">
                  <X size={20} />
                </button>
              </div>

              {/* FORMULARIO */}
              <form id="staffForm" onSubmit={handleSaveStaff} className="overflow-y-auto p-4 sm:p-6 space-y-4 custom-scrollbar flex-1">
                
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-2">
                    <p className="text-[10px] font-black text-blue-600 uppercase flex items-center gap-2">
                        <LinkIcon size={14}/> Conexión de Seguridad y Grupos
                    </p>
                    <input 
                        name="userId" 
                        defaultValue={editingStaff?.userId || ""} 
                        placeholder="ID de Usuario vinculado para login y grupos..." 
                        className="p-3 bg-white rounded-xl w-full font-mono text-[10px] outline-none border border-blue-200 focus:ring-2 ring-blue-100"
                    />
                    <p className="text-[7px] text-blue-400 font-bold italic uppercase px-1">
                        * Este ID conecta el legajo con el usuario y detecta automáticamente sus grupos asignados.
                    </p>
                </div>

                <div className="flex flex-col items-center mb-6">
                    <div className="w-24 h-24 rounded-3xl bg-violet-100 border-4 border-white shadow-md overflow-hidden relative group">
                        {photoPreview ? <img src={photoPreview} className="w-full h-full object-cover"/> : (editingStaff?.photoUrl ? <img src={editingStaff.photoUrl} className="w-full h-full object-cover"/> : <div className="flex items-center justify-center h-full text-violet-300"><User size={40}/></div>)}
                        <label className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition cursor-pointer">
                            <Camera className="text-white" size={24}/>
                            <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange}/>
                        </label>
                    </div>
                    <p className="text-[9px] font-black text-violet-400 uppercase mt-2">Tocar para cambiar foto</p>
                </div>

                <details open className="group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <summary className="list-none p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition">
                    <span className="text-[11px] font-black text-violet-600 uppercase flex items-center gap-2"><User size={14}/> Datos de Identidad</span>
                    <ChevronDown size={16} className="group-open:rotate-180 transition-transform text-slate-400" />
                  </summary>
                  <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input name="lastName" defaultValue={editingStaff?.lastName || ""} placeholder="Apellido/s" required className="p-3 bg-slate-50 rounded-xl border-none outline-none font-bold text-sm focus:ring-2 ring-violet-200"/>
                    <input name="firstName" defaultValue={editingStaff?.firstName || ""} placeholder="Nombre/s" required className="p-3 bg-slate-50 rounded-xl border-none outline-none font-bold text-sm focus:ring-2 ring-violet-200"/>
                    <input name="dni" defaultValue={editingStaff?.dni || ""} placeholder="DNI sin puntos" className="p-3 bg-slate-50 rounded-xl border-none outline-none font-bold text-sm focus:ring-2 ring-violet-200"/>
                    <input name="birthDate" type="date" defaultValue={editingStaff?.birthDate || ""} className="p-3 bg-slate-50 rounded-xl border-none outline-none font-bold text-sm"/>
                    <input name="phone" defaultValue={editingStaff?.phone || ""} placeholder="Celular" className="p-3 bg-slate-50 rounded-xl border-none font-bold text-sm"/>
                    <input name="email" defaultValue={editingStaff?.email || ""} placeholder="Email" className="p-3 bg-slate-50 rounded-xl border-none font-bold text-sm"/>
                  </div>
                </details>

                <details className="group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-3">
                  <summary className="list-none p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition">
                    <span className="text-[11px] font-black text-blue-600 uppercase flex items-center gap-2"><MapPin size={14}/> Domicilio y Título</span>
                    <ChevronDown size={16} className="group-open:rotate-180 transition-transform text-slate-400" />
                  </summary>
                  <div className="p-4 pt-0 space-y-3">
                    <input name="address" defaultValue={editingStaff?.address || ""} placeholder="Dirección completa" className="p-3 bg-slate-50 rounded-xl border-none w-full font-bold text-sm"/>
                    <input name="emergencyContact" defaultValue={editingStaff?.emergencyContact || ""} placeholder="Contacto Emergencia (Nombre y Tel)" className="p-3 bg-red-50 text-red-700 rounded-xl border-none w-full font-bold text-sm placeholder:text-red-300"/>
                    <div className="grid grid-cols-2 gap-2">
                        <input name="degree" defaultValue={editingStaff?.degree || ""} placeholder="Título Obtenido" className="p-3 bg-slate-50 rounded-xl border-none font-bold text-sm"/>
                        <select name="studyStatus" defaultValue={editingStaff?.studyStatus || ""} className="p-3 bg-slate-50 rounded-xl border-none font-bold text-xs">
                            <option value="">Estado estudios...</option>
                            <option value="Completo">Completo</option>
                            <option value="Incompleto">Incompleto</option>
                            <option value="En curso">En curso</option>
                        </select>
                    </div>
                  </div>
                </details>

                <details open className="group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <summary className="list-none p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition border-l-4 border-emerald-500">
                    <span className="text-[11px] font-black text-emerald-600 uppercase flex items-center gap-2">
                      <Briefcase size={14}/> Cargo Principal
                    </span>
                    <ChevronDown size={16} className="group-open:rotate-180 transition-transform text-slate-400" />
                  </summary>
                  <div className="p-4 pt-0 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select name="modality" defaultValue={editingStaff?.modality || 'Sede'} className="p-3 bg-slate-50 rounded-xl border-none font-bold text-xs">
                        <option value="Sede">Modalidad: Sede</option>
                        <option value="Inclusión">Modalidad: Inclusión</option>
                        <option value="Ambos">Modalidad: Ambos</option>
                      </select>
                      <select name="cargo1_subsidized" defaultValue={editingStaff?.cargo1_subsidized || 'false'} className={`p-3 rounded-xl border-none font-black text-xs ${editingStaff?.cargo1_subsidized === 'true' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'}`}>
                        <option value="false">DENO (No Subvencionado)</option>
                        <option value="true">MECA (Subvencionado)</option>
                        <option value="fuera">FUERA DE PLANTA (Papeles)</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-[1fr,2fr] gap-2">
                      <input name="cargo1_numero" defaultValue={editingStaff?.cargo1_numero || ""} placeholder="N° Cargo" className="p-3 bg-slate-50 rounded-xl border-none font-bold text-sm"/>
                      <input name="cargo1_name" defaultValue={editingStaff?.cargo1_name || ""} placeholder="Nombre del Cargo" className="p-3 bg-slate-50 rounded-xl border-none font-bold text-sm"/>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="flex flex-col">
                        <label className="text-[7px] font-black text-slate-400 uppercase ml-2">Función / Rol</label>
                        <select 
                          name="cargo1_role" 
                          defaultValue={editingStaff?.cargo1_role || editingStaff?.role || ""} 
                          className="p-3 bg-slate-50 rounded-xl border-none font-bold text-xs"
                          required
                        >
                          <option value="">Seleccionar Rol...</option>
                          {(typeof VALID_ROLES_OFFICIAL !== 'undefined' ? VALID_ROLES_OFFICIAL : []).map(r => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col">
                        <label className="text-[7px] font-black text-slate-400 uppercase ml-2">Turno Horario</label>
                        <select name="cargo1_turn" defaultValue={editingStaff?.cargo1_turn || ""} className="p-3 bg-slate-50 rounded-xl border-none font-bold text-xs">
                          <option value="">Turno...</option>
                          <option value="Mañana">Mañana</option>
                          <option value="Tarde">Tarde</option>
                          <option value="Alternado">Alternado</option>
                          <option value="Vespertino">Vespertino</option>
                          <option value="Doble">Doble</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                         <select name="cargo1_revista" defaultValue={editingStaff?.cargo1_revista || ""} className="p-3 bg-slate-50 rounded-xl border-none font-bold text-xs">
                        <option value="">Revista...</option>
                        <option value="Titular">Titular</option><option value="Provisional">Provisional</option><option value="Suplente">Suplente</option>
                      </select>
                      <div className="flex flex-col">
                        <label className="text-[7px] font-black text-slate-400 uppercase ml-2">Alta Cargo</label>
                        <input name="cargo1_ingreso" type="date" defaultValue={editingStaff?.cargo1_ingreso || ""} className="p-2 bg-slate-50 rounded-xl border-none font-bold text-xs"/>
                      </div>
                    </div>
                    <div className="flex flex-col bg-red-50 p-2.5 rounded-xl border border-red-100">
                        <label className="text-[8px] font-black text-red-600 uppercase ml-1">Fecha de Baja Cargo 1 (Dejar vacío si sigue activo)</label>
                        <input name="cargo1_baja" type="date" defaultValue={editingStaff?.cargo1_baja || ""} className="p-2 bg-white rounded-lg border border-red-200 font-bold text-xs mt-1"/>
                    </div>
                  </div>
                </details>

                <details className="group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mt-3">
                  <summary className="list-none p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition">
                    <span className="text-[11px] font-black text-slate-500 uppercase flex items-center gap-2">
                      <PlusCircle size={14}/> Cargo Secundario / Adicional
                    </span>
                    <ChevronDown size={16} className="group-open:rotate-180 transition-transform text-slate-400" />
                  </summary>
                  <div className="p-4 pt-0 space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <input name="cargo2_numero" defaultValue={editingStaff?.cargo2_numero || ""} placeholder="N° Cargo" className="p-3 bg-slate-50 rounded-xl border-none font-bold text-sm w-full"/>
                      <input name="cargo2_name" defaultValue={editingStaff?.cargo2_name || ""} placeholder="Nombre Cargo" className="p-3 bg-slate-50 rounded-xl border-none font-bold text-sm w-full"/>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select name="cargo2_role" defaultValue={editingStaff?.cargo2_role || ""} className="p-3 bg-slate-50 rounded-xl border-none font-bold text-xs w-full">
                        <option value="">Rol Cargo 2...</option>
                        {VALID_ROLES.map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      <select name="cargo2_subsidized" defaultValue={editingStaff?.cargo2_subsidized || 'false'} className="p-3 bg-slate-50 rounded-xl border-none font-bold text-xs w-full">
                        <option value="false">DENO (No Subvencionado)</option>
                        <option value="true">MECA (Subvencionado)</option>
                        <option value="fuera">FUERA DE PLANTA (Papeles)</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                         <select name="cargo2_revista" defaultValue={editingStaff?.cargo2_revista || ""} className="p-3 bg-slate-50 rounded-xl border-none font-bold text-xs">
                        <option value="">Revista...</option>
                        <option value="Titular">Titular</option>
                        <option value="Provisional">Provisional</option>
                        <option value="Suplente">Suplente</option>
                      </select>
                      <div className="flex flex-col">
                        <label className="text-[7px] font-black text-slate-400 uppercase ml-2">Alta Cargo 2</label>
                        <input name="cargo2_ingreso" type="date" defaultValue={editingStaff?.cargo2_ingreso || ""} className="p-2 bg-slate-50 rounded-xl border-none font-bold text-xs"/>
                      </div>
                    </div>
                    <div className="flex flex-col bg-red-50 p-2.5 rounded-xl border border-red-100">
                        <label className="text-[8px] font-black text-red-600 uppercase ml-1">Fecha de Baja Cargo 2 (Dejar vacío si sigue activo)</label>
                        <input name="cargo2_baja" type="date" defaultValue={editingStaff?.cargo2_baja || ""} className="p-2 bg-white rounded-lg border border-red-200 font-bold text-xs mt-1"/>
                    </div>
                    <div className="flex items-center gap-2 px-2">
                         <input type="checkbox" name="cargo2_en_papeles" defaultChecked={editingStaff?.cargo2_en_papeles === 'true'} value="true" className="w-4 h-4 accent-violet-600"/>
                         <span className="text-[10px] font-bold text-gray-500 uppercase">¿Este cargo figura solo en papeles?</span>
                    </div>
                  </div>
                </details>

                <details className="group bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <summary className="list-none p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition">
                    <span className="text-[11px] font-black text-violet-500 uppercase flex items-center gap-2">
                      <Clock size={14}/> Ingreso y Antigüedad
                    </span>
                    <ChevronDown size={16} className="group-open:rotate-180 transition-transform text-slate-400" />
                  </summary>
                  <div className="p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1">Ingreso Institución</label>
                      <input name="fechaIngreso" type="date" defaultValue={editingStaff?.fechaIngreso || ""} className="p-3 bg-slate-50 rounded-xl border-none w-full font-bold text-sm"/>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1">Años Anti.</label>
                        <input name="antiguedadAnios" type="number" defaultValue={editingStaff?.antiguedadAnios || ""} className="p-3 bg-slate-50 rounded-xl border-none w-full font-bold text-sm text-center"/>
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase ml-2 mb-1">Meses Anti.</label>
                        <input name="antiguedadMeses" type="number" defaultValue={editingStaff?.antiguedadMeses || ""} className="p-3 bg-slate-50 rounded-xl border-none w-full font-bold text-sm text-center"/>
                      </div>
                    </div>
                    <input name="antiguedadFechaRef" type="hidden" defaultValue={editingStaff?.antiguedadFechaRef || new Date().toISOString().split('T')[0]} />
                  </div>
                </details>

                <div className="h-4"></div>
              </form>

              {/* BOTONERA DE FORMULARIO DE LEGAJO */}
              <div className="p-4 bg-white border-t space-y-3 shrink-0">
                <div className="flex flex-col sm:flex-row gap-2">
                  <button type="button" onClick={() => setShowStaffForm(false)} className="order-2 sm:order-1 flex-1 py-3 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    form="staffForm" 
                    disabled={processing}
                    className="order-1 sm:order-2 flex-[2] py-4 bg-violet-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-violet-200 hover:bg-violet-700 transition active:scale-95 flex justify-center items-center gap-2"
                  >
                    {processing ? <RefreshCw className="animate-spin" size={16}/> : 'Guardar Cambios'}
                  </button>
                </div>
                 
                {editingStaff && (
                  <button 
                    type="button" 
                    onClick={async () => {
                      if(confirm("¿Eliminar definitivamente?")) {
                        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'staff_records', editingStaff.id)); 
                        setShowStaffForm(false); 
                        setViewingStaff(null);
                      }
                    }} 
                    className="w-full py-2 text-red-400 font-bold text-[9px] uppercase hover:text-red-500 transition tracking-tighter"
                  >
                    Eliminar Personal del Sistema
                  </button>
                )}
              </div>
            </div> 
          </div>
        )}

        {/* MODAL CONFIGURACIÓN IMPRESIÓN GENERAL */}
        {showPrintOptions && (
            <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95">
                    <h3 className="text-xl font-black text-violet-900 uppercase italic mb-4 text-center">¿Qué info imprimir?</h3>
                    <div className="grid grid-cols-1 gap-2 mb-6">
                        {Object.keys(printColumns).map(col => (
                            <label key={col} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl cursor-pointer hover:bg-violet-50 transition border border-transparent hover:border-violet-200">
                                <span className="text-[10px] font-black text-gray-600 uppercase">
                                    {col === 'alta' ? 'Fecha Ingreso' : col.replace('cargo', 'Cargo ')}
                                </span>
                                <input 
                                    type="checkbox" 
                                    checked={printColumns[col]} 
                                    onChange={() => setPrintColumns({...printColumns, [col]: !printColumns[col]})}
                                    className="w-5 h-5 accent-violet-600"
                                />
                            </label>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => setShowPrintOptions(false)} className="flex-1 py-3 text-gray-400 font-bold uppercase text-[10px]">Cancelar</button>
                        <button 
                            onClick={() => { imprimirPlanillaGeneral(filteredStaff); setShowPrintOptions(false); }} 
                            className="flex-[2] py-4 bg-violet-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-violet-700 transition"
                        >
                            Generar Planilla
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL REGISTRO DE FALTAS */}
        {showAbsenceForm && (
            <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center p-2 sm:p-4 backdrop-blur-md animate-in fade-in">
                <div className="bg-slate-50 rounded-[30px] w-full max-w-4xl shadow-2xl max-h-[95vh] flex flex-col border border-white/20 overflow-hidden">
                    
                    <div className="bg-orange-600 p-5 text-white flex justify-between items-center shrink-0">
                        <div>
                            <h3 className="text-lg font-black uppercase italic tracking-tighter flex items-center gap-2">
                                <UserCheck size={20}/> Registro Rápido de Inasistencias
                            </h3>
                            <p className="text-[10px] opacity-80 font-bold uppercase mt-1">Carga de ausentismo por artículo</p>
                        </div>
                        <button onClick={() => { setShowAbsenceForm(false); setSelectedStaffForAbsence(null); }} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
                        
                        {/* COLUMNA IZQUIERDA: SELECCIÓN */}
                        <div className="w-full md:w-1/2 bg-white border-r border-slate-200 flex flex-col overflow-hidden">
                            <div className="p-3 bg-slate-100 border-b border-slate-200 shrink-0">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">1. Seleccionar Personal</p>
                            </div>
                            <div className="overflow-y-auto p-4 space-y-4 custom-scrollbar">
                                {VALID_ROLES.map(rol => {
                                    const staffEnRol = staffList.filter(s => getNormRole(s.cargo1_role || s.role) === rol);
                                    if (staffEnRol.length === 0) return null;
                                    return (
                                        <div key={rol} className="space-y-2">
                                            <h4 className="text-[10px] font-black text-orange-600 uppercase border-b border-orange-100 pb-1">{rol}</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                {staffEnRol.map(s => (
                                                    <button 
                                                        key={s.id}
                                                        onClick={() => setSelectedStaffForAbsence(s)}
                                                        className={`p-2 rounded-xl text-left border transition-all flex items-center gap-2 ${selectedStaffForAbsence?.id === s.id ? 'bg-orange-100 border-orange-400 shadow-sm' : 'bg-slate-50 border-slate-200 hover:border-orange-300'}`}
                                                    >
                                                        <div className="w-6 h-6 rounded-full bg-orange-200 text-orange-700 flex items-center justify-center text-[10px] font-black shrink-0">
                                                            {s.firstName?.[0]}
                                                        </div>
                                                        <span className="text-[10px] font-bold text-slate-700 truncate uppercase">
                                                            {s.lastName}, {s.firstName}
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* COLUMNA DERECHA: DATOS DE FALTA */}
                        <div className="w-full md:w-1/2 p-4 sm:p-6 overflow-y-auto space-y-4">
                            {selectedStaffForAbsence && (
                                <div className="bg-orange-100 p-3 rounded-2xl border border-orange-200 flex items-center gap-3">
                                    <User size={20} className="text-orange-600"/>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[9px] font-black text-orange-500 uppercase">Cargando falta para:</p>
                                        <p className="text-xs font-black text-orange-900 uppercase truncate">{selectedStaffForAbsence.lastName}, {selectedStaffForAbsence.firstName}</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200">
                                <span className="text-[10px] font-black text-slate-600 uppercase">¿Es una licencia por varios días?</span>
                                <button 
                                    type="button"
                                    onClick={() => { setIsRange(!isRange); setAbsenceEndDate(''); }}
                                    className={`text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-wider transition ${isRange ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-500'}`}
                                >
                                    {isRange ? 'Por Período 📅' : 'Un Solo Día ⏱️'}
                                </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[9px] font-black text-slate-400 uppercase ml-1 mb-1 block">
                                        {isRange ? 'Fecha Inicio' : 'Fecha de Ausencia'}
                                    </label>
                                    <input 
                                        type="date" 
                                        value={absenceDate} 
                                        onChange={(e) => setAbsenceDate(e.target.value)}
                                        className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-orange-200"
                                    />
                                </div>
                                {isRange && (
                                    <div className="animate-in slide-in-from-top-2 duration-200">
                                        <label className="text-[9px] font-black text-slate-400 uppercase ml-1 mb-1 block">Fecha Fin (Licencia)</label>
                                        <input 
                                            type="date" 
                                            value={absenceEndDate} 
                                            onChange={(e) => setAbsenceEndDate(e.target.value)}
                                            className="w-full p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-orange-200"
                                        />
                                    </div>
                                )}
                            </div>

                            {selectedStaffForAbsence && (
                                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2">
                                    <label className="text-[9px] font-black text-slate-500 uppercase block">
                                        📍 ¿A qué turno corresponde la falta?
                                    </label>
                                    <div className="grid grid-cols-3 gap-1.5">
                                        {['Mañana', 'Tarde', 'Ambos'].map(t => {
                                            const tieneC1EnTurno = selectedStaffForAbsence.cargo1_turn === t;
                                            const tieneC2EnTurno = selectedStaffForAbsence.cargo2_turn === t;
                                            const esSugerido = tieneC1EnTurno || tieneC2EnTurno;

                                            return (
                                                <button
                                                    key={t}
                                                    type="button"
                                                    onClick={() => setAbsenceTurn(t)}
                                                    className={`p-2 rounded-xl border font-black text-[9px] uppercase tracking-wider flex flex-col items-center justify-center transition-all ${absenceTurn === t ? 'bg-slate-800 text-white border-slate-900' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                                                >
                                                    <span>{t}</span>
                                                    {esSugerido && <span className="text-[6px] text-orange-500 font-bold block mt-0.5">Asignado</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1.5 flex items-center justify-between">
                                    <span>Artículo / Código</span>
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                    {Object.entries(CODIGOS_FALTAS).map(([codigo, descripcion]) => (
                                        <button
                                            type="button"
                                            key={codigo}
                                            onClick={() => setAbsenceCode(codigo)}
                                            title={descripcion}
                                            className={`group relative p-2.5 rounded-xl border transition-all flex flex-col items-center justify-center ${absenceCode === codigo ? 'bg-orange-500 border-orange-600 text-white shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:bg-orange-50'}`}
                                        >
                                            <span className="font-black text-xs uppercase">{codigo}</span>
                                            <span className="text-[7px] text-center opacity-60 truncate w-full max-w-[90px]">{descripcion}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] font-black text-slate-500 uppercase ml-1 mb-1 block">Observaciones / Notas (Opcional)</label>
                                <textarea
                                    value={absenceNotes}
                                    onChange={(e) => setAbsenceNotes(e.target.value)}
                                    placeholder="Ej: Presentó certificado médico digital, número de trámite..."
                                    rows={2}
                                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-orange-200 resize-none"
                                />
                            </div>

                            <div className="pt-2">
                                <button 
                                    type="button"
                                    onClick={handleSaveAbsence}
                                    disabled={processing || !absenceCode}
                                    className={`w-full py-3.5 rounded-xl font-black uppercase tracking-widest text-xs shadow-md transition active:scale-95 flex justify-center items-center gap-2 ${absenceCode && !processing ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                                >
                                    {processing ? <RefreshCw className="animate-spin" size={14}/> : (
                                        <>
                                            <CheckCircle size={16}/>
                                            {absenceCode ? `Registrar Ausentismo` : 'Seleccione un Código'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* MODAL RESUMEN MENSUAL DE FALTAS */}
        {showAbsencesSummary && (
            <div className="fixed inset-0 bg-black/70 z-[250] flex items-center justify-center p-2 sm:p-4 backdrop-blur-md animate-in fade-in">
                <div className="bg-slate-50 rounded-[30px] w-full max-w-4xl shadow-2xl max-h-[95vh] flex flex-col border border-white/20 overflow-hidden">
                    
                    <div className="bg-violet-700 p-5 text-white flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="bg-white/20 p-2 rounded-xl">
                                <PieChart size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black uppercase italic tracking-tighter">
                                    Planilla de Ausentismo
                                </h3>
                                <p className="text-[10px] opacity-80 font-bold uppercase mt-1">Conteo y discriminación por artículo</p>
                            </div>
                        </div>
                        <button onClick={() => setShowAbsencesSummary(false)} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-4 bg-white border-b border-slate-200 shrink-0 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Período:</label>
                            <input 
                                type="month" 
                                value={summaryMonth}
                                onChange={(e) => setSummaryMonth(e.target.value)}
                                className="p-2 bg-violet-50 text-violet-800 border border-violet-200 rounded-xl font-bold text-sm outline-none focus:ring-2 ring-violet-300"
                            />
                        </div>

                        <button 
                            onClick={imprimirResumenMensual}
                            className="px-4 py-2 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-black uppercase text-[10px] tracking-widest hover:border-violet-400 hover:text-violet-600 transition flex items-center gap-2"
                        >
                            <Printer size={16}/> Imprimir Resumen
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 custom-scrollbar">
                        {sortedStaffStats.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                                <UserCheck size={60} className="text-slate-300 mb-4"/>
                                <p className="text-lg font-black text-slate-500 uppercase tracking-widest">Sin inasistencias</p>
                                <p className="text-xs font-bold text-slate-400">No hay registros de faltas para el mes seleccionado.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-100 border-b border-slate-200">
                                            <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Personal</th>
                                            <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Días</th>
                                            <th className="p-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Desglose de Artículos</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {sortedStaffStats.map((s, idx) => (
                                            <tr key={idx} className="hover:bg-violet-50/50 transition">
                                                <td className="p-3">
                                                    <p className="font-black text-slate-800 text-sm uppercase">{s.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{s.role}</p>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <span className="bg-orange-100 text-orange-700 font-black text-sm px-3 py-1 rounded-xl">
                                                        {s.total}
                                                    </span>
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex flex-wrap gap-1">
                                                        {Object.entries(s.codes).map(([code, count]) => (
                                                            <span key={code} className="bg-white border border-slate-200 text-slate-600 text-[9px] font-black px-2 py-1 rounded-lg uppercase shadow-sm">
                                                                {code}: <span className="text-violet-600 ml-1">{count}</span>
                                                            </span>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )}

    </div>
  );
}
