import { getInstitutionName } from '../config';
import React, { useState, useEffect, useRef } from 'react';
import { StudentDetailView } from './StudentDetailView';
import { 
  User, FileText, Plus, Users, Grid, CheckCircle, ChevronRight, RefreshCw, ChevronLeft, Printer, MessageSquare, Send, Folder, Edit3, X, Search, GraduationCap, Activity, Shield, MapPin, Phone, Settings2, UserPlus, UsersRound, Save 
} from 'lucide-react';
import { doc, updateDoc, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, arrayUnion, arrayRemove, where, getDocs } from 'firebase/firestore';
import { createGroup, updateGroup } from '../data/groups';
import { createStaffGroupAssignment, closeStaffGroupAssignment, getStaffGroupAssignmentsForGroup } from '../data/assignments';
import { COLLECTIONS } from '../data/collections';

// -------------------------------------------------------------
// FUNCIONES AUXILIARES DE FECHAS Y EDAD (SANEAMIENTO)
// -------------------------------------------------------------

const calculateAge = (d) => { 
  if (!d) return '-'; 
  const t = new Date(); 
  const b = new Date(d); 
  let a = t.getFullYear() - b.getFullYear(); 
  const m = t.getMonth() - b.getMonth(); 
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--; 
  return a; 
};

const getSafeDate = (d) => { 
  if (!d) return ''; 
  try { return d.includes('T') ? d.split('T')[0] : d; } catch(e) { return ''; } 
};

const checkCudStatus = (cudDate) => {
  if (!cudDate || cudDate === "") return { status: 'none', text: 'Sin fecha' };
  const today = new Date();
  const exp = new Date(cudDate + 'T00:00:00');
  const diffTime = exp - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { status: 'expired', text: 'Vencido' };
  if (diffDays <= 90) return { status: 'warning', text: `Vence en ${diffDays} días` };
  return { status: 'ok', text: 'Vigente' };
};

export function GroupsView({ user, db, appId, setActiveTab, onSelectStudent }) {
  const [students, setStudents] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [groups, setGroups] = useState([]);
  const [staffAssignments, setStaffAssignments] = useState([]);
  const [institutionConfig, setInstitutionConfig] = useState({ turns: [], staffRoles: [] });
  const [selectedTurnId, setSelectedTurnId] = useState('all');

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [fullFileStudent, setFullFileStudent] = useState(null);
  const [showBitacoraModal, setShowBitacoraModal] = useState(null);
  const [groupMessages, setGroupMessages] = useState({});
  const [selectedGroupDetails, setSelectedGroupDetails] = useState(null);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [informeEpoca, setInformeEpoca] = useState(1);
  const [newNote, setNewNote] = useState('');
  const [isWriting, setIsWriting] = useState(false);
  const [savingIncident, setSavingIncident] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [staffSelections, setStaffSelections] = useState({});
  const [updatingGroup, setUpdatingGroup] = useState(false);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [groupsToPrint, setGroupsToPrint] = useState([]);
  const [printMode, setPrintMode] = useState('students');
  const [socialCases, setSocialCases] = useState([]);

  const scrollRef = useRef(null);
  const scroll = (direction) => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({
      left: direction === 'left' ? -350 : 350,
      behavior: 'smooth'
    });
  };

  const isManagement =
    user?.rol === 'admin' ||
    user?.rol === 'super-admin' ||
    user?.accessRoleId === 'admin' ||
    [
      'admin',
      'super-admin',
      'Equipo Directivo',
      'Equipo Técnico',
      'Administración'
    ].includes(user?.role);

  const scheduleTypeOptions = (Array.isArray(institutionConfig.scheduleTypes) ? institutionConfig.scheduleTypes : []).map((item, index) => {
    if (typeof item === 'string') {
      return {
        id: item.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        name: item
      };
    }
    return {
      id: item?.id || `jornada_${index + 1}`,
      name: item?.name || item?.label || `Jornada ${index + 1}`
    };
  });

  const getScheduleTypeLabel = (scheduleType) =>
    scheduleTypeOptions.find(item => item.id === scheduleType)?.name ||
    scheduleType ||
    'Jornada';

  const turnOptions = (Array.isArray(institutionConfig.turns) ? institutionConfig.turns : []).map((turn, index) => {
    if (typeof turn === 'string') return { id: `turno_${index + 1}`, name: turn };
    return {
      id: turn?.id || `turno_${index + 1}`,
      name: turn?.name || turn?.label || `Turno ${index + 1}`
    };
  });

  const roleOptions = (Array.isArray(institutionConfig.staffRoles) ? institutionConfig.staffRoles : []).map((role, index) => {
    if (typeof role === 'string') {
      return {
        id: role.toLowerCase().replace(/[^a-z0-9]+/g, '_'),
        name: role,
        requiredForGroup: role.toLowerCase() === 'docente'
      };
    }
    return {
      id: role?.id || `rol_${index + 1}`,
      name: role?.name || role?.label || `Rol ${index + 1}`,
      requiredForGroup: Boolean(role?.requiredForGroup)
    };
  });

  const docenteRole = roleOptions.find(
    role => role.id === 'docente' || role.name.toLowerCase() === 'docente'
  ) || { id: 'docente', name: 'Docente', requiredForGroup: true };

  const normalizeRoles = (roles = []) => {
    const result = Array.isArray(roles) ? [...roles] : [];
    if (!result.includes(docenteRole.id)) result.unshift(docenteRole.id);
    return [...new Set(result)];
  };

  const getTurnLabel = (turnId) =>
    turnOptions.find(turn => turn.id === turnId)?.name || turnId || '';

  const getRoleLabel = (roleId) =>
    roleOptions.find(role => role.id === roleId)?.name || roleId || 'Rol';

  const INCIDENT_TYPES = [
    { label: 'Trabajó Muy Bien', emoji: '🌟', severity: 'positive', color: 'bg-emerald-100 border-emerald-300 text-emerald-800' },
    { label: 'Buena Conducta', emoji: '😇', severity: 'positive', color: 'bg-emerald-100 border-emerald-300 text-emerald-800' },
    { label: 'Crisis Llanto', emoji: '😭', severity: 'medium', color: 'bg-orange-100 border-orange-300 text-orange-800' },
    { label: 'Agresión / Violencia', emoji: '👊', severity: 'high', color: 'bg-red-100 border-red-300 text-red-800' },
    { label: 'Fuga / Intento', emoji: '🏃', severity: 'high', color: 'bg-red-100 border-red-300 text-red-800' },
    { label: 'Ausentismo', emoji: '🏠', severity: 'medium', color: 'bg-blue-100 border-blue-300 text-blue-800' }
  ];

  useEffect(() => {
    if (!db || !appId) return;

    let configDoc = () => {};
    let unsubGroups = () => {};
    let unsubStaff = () => {};
    let unsubStudentPeople = () => {};
    let unsubStudentProfiles = () => {};
    let unsubStudentAssignments = () => {};
    let unsubStaffAssignments = () => {};
    let unsubMural = () => {};
    let unsubSocial = () => {};

    configDoc = onSnapshot(
      doc(db, 'artifacts', appId, 'public', 'data', 'config', 'institution'),
      snap => setInstitutionConfig(snap.exists() ? snap.data() : { turns: [], staffRoles: [] })
    );

    unsubGroups = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.GROUPS),
      snap => setGroups(
        snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(group => group.active !== false)
          .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
      )
    );

    unsubStaff = onSnapshot(
      query(
        collection(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.PEOPLE),
        where('type', '==', 'staff')
      ),
      snap => setStaffList(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    // Estudiantes de la arquitectura nueva: people + student_profiles.
    let studentPeople = [];
    let studentProfiles = [];
    let studentAssignments = [];

    const rebuildStudents = () => {
      const peopleById = new Map(studentPeople.map(person => [person.id, person]));
      const result = studentProfiles.map(profile => {
        const person = peopleById.get(profile.personId) || {};
        const assignments = studentAssignments.filter(item =>
          item.studentId === (profile.personId || person.id) &&
          item.status !== 'closed' &&
          !item.validTo
        );
        return {
          ...person,
          ...profile,
          id: profile.personId || person.id,
          personId: profile.personId || person.id,
          firstName: profile.firstName || person.firstName || '',
          lastName: profile.lastName || person.lastName || '',
          fullName: profile.fullName || person.fullName || `${person.firstName || ''} ${person.lastName || ''}`.trim(),
          groupAssignments: assignments
        };
      });
      setStudents(result);
    };

    unsubStudentPeople = onSnapshot(
      query(collection(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.PEOPLE), where('type', '==', 'student')),
      snap => {
        studentPeople = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        rebuildStudents();
      }
    );

    unsubStudentProfiles = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.STUDENT_PROFILES),
      snap => {
        studentProfiles = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        rebuildStudents();
      }
    );

    unsubStudentAssignments = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.STUDENT_GROUP_ASSIGNMENTS),
      snap => {
        studentAssignments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        rebuildStudents();
      }
    );

    unsubStaffAssignments = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.STAFF_GROUP_ASSIGNMENTS),
      snap => setStaffAssignments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    unsubMural = onSnapshot(
      query(collection(db, 'artifacts', appId, 'public', 'data', 'group_mural'), orderBy('createdAt', 'desc')),
      snap => {
        const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setGroupMessages(msgs.reduce((acc, message) => {
          const key = message.groupId || message.groupName || 'sin-grupo';
          if (!acc[key]) acc[key] = [];
          acc[key].push(message);
          return acc;
        }, {}));
      }
    );

    unsubSocial = onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'social_cases'),
      snap => setSocialCases(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );

    return () => {
      configDoc();
      unsubGroups();
      unsubStaff();
      unsubStudentPeople();
      unsubStudentProfiles();
      unsubStudentAssignments();
      unsubStaffAssignments();
      unsubMural();
      unsubSocial();
    };
  }, [db, appId]);

  const gruposFinales = React.useMemo(() => {
    return groups
      .filter(group => selectedTurnId === 'all' ||
        (Array.isArray(group.turnIds)
          ? group.turnIds.includes(selectedTurnId)
          : group.turnId === selectedTurnId))
      .map(group => {
        const turnIds = Array.isArray(group.turnIds) ? group.turnIds : (group.turnId ? [group.turnId] : []);
        const studentsInGroup = students.filter(student =>
          (student.groupAssignments || []).some(assignment =>
            assignment.groupId === group.id &&
            (selectedTurnId === 'all' ||
              !Array.isArray(assignment.turnIds) ||
              assignment.turnIds.length === 0 ||
              assignment.turnIds.includes(selectedTurnId))
          )
        );
        const staffByRole = staffAssignments.filter(item => item.groupId === group.id && item.status !== 'closed' && !item.validTo).map(assignment => {
          const person = staffList.find(item => item.id === assignment.staffId);
          return {
            ...assignment,
            person,
            roleName: getRoleLabel(assignment.roleId),
            name: person?.fullName || `${person?.firstName || ''} ${person?.lastName || ''}`.trim() || 'Sin asignar'
          };
        });
        return {
          ...group,
          turnIds,
          turnLabels: turnIds.map(getTurnLabel).filter(Boolean),
          enabledRoles: normalizeRoles(group.enabledRoles),
          students: studentsInGroup,
          staffByRole
        };
      });
  }, [groups, students, staffList, staffAssignments, selectedTurnId, roleOptions.length]);

  const imprimirBitacora = (student) => {
      const getEdad = (d) => { if (!d) return '-'; const t = new Date(); const b = new Date(d); let a = t.getFullYear() - b.getFullYear(); const m = t.getMonth() - b.getMonth(); if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--; return a; };
      const incidents = (student.incidents || []).slice().sort((a, b) => new Date(b.date) - new Date(a.date));

      let h = `<html><head><title>Bitácora - ${student.lastName}</title>
      <style>
          @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap');
          body { font-family: 'Roboto', sans-serif; padding: 20px; color: #333; }
          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #7c3aed; padding-bottom: 15px; margin-bottom: 20px; }
          .header-info { display: flex; flex-direction: column; }
          .header-info h1 { margin: 0; color: #4c1d95; font-size: 20px; text-transform: uppercase; }
          .header-info p { margin: 4px 0 0; font-size: 12px; color: #666; font-weight: bold; }
          .photo { width: 80px; height: 80px; border-radius: 50%; object-fit: cover; border: 3px solid #7c3aed; }
          .incident { border-left: 5px solid #ccc; padding: 12px 15px; margin-bottom: 15px; background: #f9fafb; border-radius: 0 8px 8px 0; page-break-inside: avoid; }
          .incident.high { border-left-color: #ef4444; background: #fef2f2; }
          .incident.medium { border-left-color: #f97316; background: #fff7ed; }
          .incident.positive { border-left-color: #10b981; background: #ecfdf5; }
          .inc-header { display: flex; justify-content: space-between; font-size: 10px; font-weight: 900; color: #888; text-transform: uppercase; margin-bottom: 8px; }
          .inc-body { font-size: 13px; font-weight: 700; color: #333; line-height: 1.4; }
          .inc-footer { font-size: 9px; font-weight: bold; color: #999; margin-top: 8px; text-transform: uppercase; border-top: 1px solid #eee; padding-top: 5px; }
          .print-footer { text-align: center; font-size: 10px; color: #aaa; margin-top: 30px; border-top: 1px dashed #ccc; padding-top: 10px; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style></head><body>`;

      h += `
      <div class="header">
          <div class="header-info">
              <h1>BITÁCORA EXPRÉS: ${student.lastName}, ${student.firstName}</h1>
              <p>DNI: ${student.dni || '-'} | Edad: ${getEdad(student.birthDate)} años | Modalidad: ${student.modality || 'Sede'}</p>
              <p>Grupo/Asignación: ${student.groupMorning || student.groupAfternoon || student.daiMorning || student.daiAfternoon || 'Sin asignar'}</p>
          </div>
          ${student.photoUrl ? `<img class="photo" src="${student.photoUrl}" />` : ''}
      </div>`;

      if (!incidents || incidents.length === 0) {
          h += `<p style="text-align:center; color:#999; font-style:italic;">No hay registros cargados en la bitácora de este alumno.</p>`;
      } else {
          incidents.forEach(inc => {
              const dateObj = new Date(inc.date);
              const dateStr = dateObj.toLocaleDateString('es-AR') + ' ' + dateObj.toLocaleTimeString('es-AR', {hour: '2-digit', minute:'2-digit'});
              h += `
              <div class="incident ${inc.severity || ''}">
                  <div class="inc-header">
                      <span>${dateStr}</span>
                      <span>ORIGEN: AULA</span>
                  </div>
                  <div class="inc-body">
                      ${inc.text || inc.type}
                  </div>
                  <div class="inc-footer">
                      Registrado por: ${inc.author || 'Anónimo'}
                  </div>
              </div>`;
          });
      }

      h += `<div class="print-footer">Documento generado el ${new Date().toLocaleDateString('es-AR')} - ${getInstitutionName()}</div>`;
      h += `</body></html>`;

      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0';
      document.body.appendChild(iframe);
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(h);
      doc.close();
      
      setTimeout(() => {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          setTimeout(() => { document.body.removeChild(iframe); }, 5000);
      }, 500);
  };
  const printGroups = (groupsList) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed'; iframe.style.right = '0'; iframe.style.bottom = '0'; iframe.style.width = '0'; iframe.style.height = '0'; iframe.style.border = '0';
    document.body.appendChild(iframe);
    
    let h = `<html><head><style>
      @page {
        size: A4 landscape;
        margin: 0.6cm;
      }
      body{font-family:sans-serif; padding:0; margin:0; color:#222;}
      .group-page { 
        page-break-inside: avoid; 
        page-break-after: always; 
      }
      .group-page:last-child { page-break-after: avoid; }
      .header{background:#f3f4f6; padding:10px 14px; border-left:5px solid #7c3aed; margin-bottom:10px; border-radius: 0 12px 12px 0;}
      .header h2 { margin: 0; color: #7c3aed; text-transform: uppercase; font-size: 15px; }
      .header-info { margin: 4px 0 0 0; font-size: 11px; color: #555; }
      table{width:100%; border-collapse:collapse; font-size:10px;}
      th{background:#7c3aed; color:white; padding:8px 6px; text-align:left; text-transform:uppercase; font-size:9.5px;}
      td{border:1px solid #ddd; padding:6px; vertical-align: middle;}
      .foto-print { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; background: #eee; display: block; margin: 0 auto; }
      @media print { 
        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        tr { page-break-inside: avoid; }
      }
    </style></head><body>`;

    if (printMode === 'staff') {
      h += `<h1>Organización de personal por grupo</h1>
            <table><thead><tr>
              <th>Grupo</th>
              <th>Docente</th>
              <th>Otros roles</th>
              <th>Turnos</th>
              <th>Aula / Espacio</th>
            </tr></thead><tbody>`;
      groupsList.forEach(g => {
        h += `<tr>
          <td><b>${g.name}</b></td>
          <td>${g.staffByRole?.find(x => x.roleId === docenteRole.id)?.name || '-'}</td>
          <td>${g.staffByRole?.filter(x => x.roleId !== docenteRole.id).map(x => `${x.roleName}: ${x.name}`).join(' | ') || '-'}</td>
          <td>${g.turnLabels?.join(' · ') || '-'}</td>
          <td>${g.classroom || '-'}</td>
        </tr>`;
      });
      h += `</tbody></table>`;
    } else {
      groupsList.forEach(g => {
        const turnoTexto = g.turnLabels?.join(' · ') || 'Sin turno';
          h += `<div class="group-page">
                  <div class="header">
                    <h2>${g.name}</h2>
                    <p class="header-info">
                      <b>Docente:</b> ${g.staffByRole?.find(item => item.roleId === docenteRole.id)?.name || 'Sin asignar'} &nbsp;|&nbsp; 
                      <b>Equipo:</b> ${g.staffByRole?.filter(item => item.roleId !== docenteRole.id).map(item => `${item.roleName}: ${item.name}`).join(' · ') || 'Sin otros roles'} &nbsp;|&nbsp; 
                      <b>Turno:</b> ${turnoTexto}
                    </p>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th style="width: 30px; text-align: center;">#</th>
                        <th style="width: 45px; text-align: center;">Foto</th>
                        <th>Nombre y Apellido</th>
                        <th>DNI</th>
                        <th>Edad</th>
                        <th>Fecha de Nacimiento</th>
                        <th>Género</th>
                        <th>Diagnóstico</th>
                      </tr>
                    </thead>
                    <tbody>`;
          [...g.students].sort((a,b)=>(a.lastName||'').localeCompare(b.lastName||'')).forEach((s, i) => {
              const fotoHTML = s.photoUrl 
                ? `<img src="${s.photoUrl}" class="foto-print" />` 
                : `<div class="foto-print" style="line-height:32px; color:#aaa; text-align:center; font-size:13px; font-weight:bold;">${s.firstName[0]}</div>`;
              
              h += `<tr>
                <td style="text-align: center;"><b>${i+1}</b></td>
                <td>${fotoHTML}</td>
                <td><b>${s.lastName}, ${s.firstName}</b></td>
                <td>${s.dni || '-'}</td>
                <td>${calculateAge(s.birthDate)} años</td>
                <td>${getSafeDate(s.birthDate) || '-'}</td>
                <td style="text-transform: capitalize;">${s.gender || '-'}</td>
                <td style="text-transform: uppercase;">${s.dx || '-'}</td>
              </tr>`;
          });
          h += `</tbody></table></div>`;
      });
    }
    h += `</body></html>`;
    const docIframe = iframe.contentWindow.document; docIframe.open(); docIframe.write(h); docIframe.close();
    setTimeout(() => { iframe.contentWindow.focus(); iframe.contentWindow.print(); document.body.removeChild(iframe); }, 500);
  };

  const handleToggleInformeGrupo = async (estudiante, numeroInforme) => {
    const campo = `informe${numeroInforme}`;
    const info = estudiante[campo] || { status: 'Pendiente' };
    const proximo = { 'Pendiente': 'Hecho', 'Hecho': 'Impreso', 'Impreso': 'Enviado', 'Enviado': 'Archivado' }[info.status] || 'Pendiente';
    
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', estudiante.id), { 
        [campo]: { status: proximo, updatedAt: new Date().toISOString() } 
      });

      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'activity_log'), {
        userName: user.firstName || user.fullName,
        userId: user.id,
        action: "Estado de Informe",
        details: `Informe ${numeroInforme} de ${estudiante.lastName} pasó a: ${proximo}`,
        timestamp: serverTimestamp()
      });

      if (proximo === 'Hecho' || proximo === 'Archivado') {
      }

      const nuevosEstudiantes = selectedGroupDetails.students.map(s => s.id === estudiante.id ? { ...s, [campo]: { status: proximo } } : s);
      setSelectedGroupDetails({ ...selectedGroupDetails, students: nuevosEstudiantes });
    } catch (e) { console.error(e); }
  };

  const openCreateGroup = () => {
    setStaffSelections({});
    setEditingGroup({
      isNew: true,
      name: '',
      siteId: '',
      levelId: '',
      sectionId: '',
      turnIds: turnOptions[0] ? [turnOptions[0].id] : [],
      scheduleType: scheduleTypeOptions[0]?.id || 'simple',
      enabledRoles: normalizeRoles([docenteRole.id]),
      classroom: '',
      driveLink: '',
      institucionalDrive: ''
    });
  };

  const openEditGroup = async (group) => {
    setUpdatingGroup(true);
    try {
      const assignments = await getStaffGroupAssignmentsForGroup(db, appId, group.id);
      const selections = {};
      assignments
        .filter(item => item.status !== 'closed' && !item.validTo)
        .forEach(item => { selections[item.roleId] = item.staffId; });
      setStaffSelections(selections);
      setEditingGroup({
        ...group,
        enabledRoles: normalizeRoles(group.enabledRoles),
        turnIds: Array.isArray(group.turnIds) ? group.turnIds : (group.turnId ? [group.turnId] : [])
      });
    } catch (error) {
      console.error(error);
      alert(`No se pudo abrir el grupo: ${error.message}`);
    } finally {
      setUpdatingGroup(false);
    }
  };

  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    if (!editingGroup) return;
    setUpdatingGroup(true);

    try {
      const form = new FormData(e.currentTarget);
      const name = String(form.get('groupName') || '').trim();
      if (!name) throw new Error('El grupo necesita un nombre.');

      const turnIds = form.getAll('turnId');
      const enabledRoles = normalizeRoles(form.getAll('roleId'));
      const groupData = {
        name,
        siteId: String(form.get('siteId') || '').trim() || null,
        levelId: String(form.get('levelId') || '').trim() || null,
        sectionId: String(form.get('sectionId') || '').trim() || null,
        turnIds,
        scheduleType: form.get('scheduleType') || 'simple',
        enabledRoles,
        classroom: String(form.get('classroom') || '').trim(),
        driveLink: String(form.get('driveLink') || '').trim(),
        institucionalDrive: String(form.get('institucionalDrive') || '').trim(),
        active: true
      };

      const groupId = editingGroup.isNew
        ? await createGroup(db, appId, groupData)
        : editingGroup.id;

      if (!editingGroup.isNew) {
        await updateGroup(db, appId, groupId, groupData);
      }

      const previous = editingGroup.isNew ? [] : await getStaffGroupAssignmentsForGroup(db, appId, groupId);
      const activeByRole = previous.filter(item => item.status !== 'closed' && !item.validTo);

      for (const role of roleOptions) {
        const oldAssignment = activeByRole.find(item => item.roleId === role.id);
        const selectedStaffId = enabledRoles.includes(role.id) ? (staffSelections[role.id] || '') : '';

        if (oldAssignment?.staffId === selectedStaffId) continue;

        if (oldAssignment) {
          await closeStaffGroupAssignment(db, appId, oldAssignment.id);
        }

        if (selectedStaffId) {
          await createStaffGroupAssignment(db, appId, {
            staffId: selectedStaffId,
            groupId,
            roleId: role.id,
            turnIds
          });
        }
      }

      setEditingGroup(null);
      setStaffSelections({});
    } catch (error) {
      console.error(error);
      alert(`No se pudo guardar el grupo: ${error.message}`);
    } finally {
      setUpdatingGroup(false);
    }
  };

  const deleteIncident = async (studentId, inc) => {
    if (!confirm("⚠️ ¿Seguro que querés borrar este registro de la bitácora?")) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', studentId), {
        incidents: arrayRemove(inc)
      });
    } catch (e) {
      console.error("Error al eliminar:", e);
      alert("❌ No se pudo eliminar el registro.");
    }
  };

const handleSaveIncident = async (type, severity = "medium", text = "") => {
  alert("¡Hiciste clic! Tipo recibido: " + type);
    const activeStudent = showBitacoraModal || selectedStudent;
    if (!activeStudent) return;
    setSavingIncident(true);
    
    try {
      const entry = { 
        date: new Date().toISOString(), 
        type: text ? "Nota" : type, 
        severity, 
        text: text || type, 
        author: user?.fullName || user?.firstName || "Docente", 
        authorId: user?.id || "unknown" 
      };

      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', activeStudent.id), { 
        incidents: arrayUnion(entry) 
      });
      
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'activity_log'), {
        userName: user?.firstName || user?.fullName || "Docente",
        userId: user?.id || "unknown",
        action: "Bitácora",
        details: `Cargó incidencia "${text || type}" para ${activeStudent.lastName}`,
        timestamp: serverTimestamp()
      });

      // Definimos la variable limpiamente fuera de cualquier llamada
     const esAusentismo = type && type.toLowerCase().includes("ausentismo");

      if (esAusentismo) {
        try {
          console.log("Intentando guardar caso social con appId:", appId, "y db:", db);
          const socialRef = collection(db, 'artifacts', appId, 'public', 'data', 'social_cases');
          await addDoc(socialRef, {
            studentId: activeStudent.id,
            dni: activeStudent.dni || "",
            studentName: `${activeStudent.lastName}, ${activeStudent.firstName}`,
            level: activeStudent.level || "SEDE", 
            reason: "REPORTE DESDE AULA: Ausentismo detectado.",
            status: "Pendiente", 
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            steps: { llamada: { done: false }, continuidad: { sent: false } },
            history: [{ 
              date: new Date().toISOString(), 
              text: `📢 REGISTRO AUTOMÁTICO: Caso abierto por reporte de ausentismo desde el aula.`, 
              author: user?.fullName || user?.firstName || "Sistema" 
            }]
          });
          console.log("¡Caso social guardado con éxito en Firebase!");
        } catch (errFirebase) {
          console.error("ERROR CRÍTICO AL GUARDAR EN SOCIAL_CASES:", errFirebase);
          alert("Error de Firebase: " + errFirebase.message);
        }
      }

      setShowBitacoraModal(null); 
      setIsWriting(false); 
      setNewNote("");
      
      alert(`✅ Registro guardado en Bitácora${esAusentismo ? " y derivado a Trabajo Social." : "."}`);

    } catch (e) { 
      alert("Error al guardar: " + e.message); 
    } finally { 
      setSavingIncident(false); 
    }
  };
  
  const handleAddGroupComment = async (e, group) => {
    e.preventDefault();
    const text = e.target.comment.value;
    if (!text.trim()) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'group_mural'), {
        groupId: group.id,
        groupName: group.name,
        text,
        author: user.firstName,
        authorId: user.id,
        createdAt: serverTimestamp()
      });

      e.target.reset();
    } catch (err) { alert(err.message); }
  };

 return (
    <div className="flex flex-col h-full bg-slate-100 animate-in fade-in relative overflow-hidden">
      <div className="bg-white p-4 shadow-sm z-20 sticky top-0 flex flex-col gap-3">
        <div className="flex justify-between items-center px-2">
          <div>
            <h2 className="text-2xl font-black text-violet-900 uppercase italic flex items-center gap-2">
              <Grid size={24} className="text-orange-500"/> Mis Grupos
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-8">Vista Institucional</p>
          </div>

          <div className="flex items-center gap-2">
            {isManagement && (
              <button onClick={openCreateGroup} className="bg-violet-600 text-white px-4 py-2.5 rounded-xl hover:bg-violet-700 transition shadow-sm flex items-center gap-2 font-black text-xs">
                <Plus size={16}/> Nuevo grupo
              </button>
            )}
            <button onClick={() => { setGroupsToPrint(gruposFinales); setShowPrintOptions(true); }} className="bg-slate-100 text-slate-700 p-2.5 rounded-xl hover:bg-slate-200 transition shadow-sm" title="Imprimir">
              <Printer size={22}/>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mx-2 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl shrink-0">
            <button onClick={() => setSelectedTurnId('all')} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase ${selectedTurnId === 'all' ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-400'}`}>Todos</button>
            {turnOptions.map(turnOption => (
              <button key={turnOption.id} onClick={() => setSelectedTurnId(turnOption.id)} className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase whitespace-nowrap ${selectedTurnId === turnOption.id ? 'bg-white text-violet-700 shadow-sm' : 'text-slate-400'}`}>
                {turnOption.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto bg-slate-50/70">
        <div className="max-w-[1800px] mx-auto p-4 md:p-6 lg:p-8">
          {gruposFinales.length === 0 ? (
            <div className="min-h-[420px] flex items-center justify-center">
              <div className="w-full max-w-xl bg-white border border-slate-200 rounded-[32px] p-10 md:p-14 text-center shadow-sm">
                <div className="w-20 h-20 mx-auto rounded-[24px] bg-violet-50 text-violet-600 flex items-center justify-center mb-6">
                  <UsersRound size={34}/>
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-violet-500">
                  Estructura institucional
                </p>
                <h3 className="text-2xl font-black text-slate-900 mt-2">
                  Todavía no hay grupos
                </h3>
                <p className="text-sm leading-relaxed text-slate-500 mt-3 max-w-md mx-auto">
                  Creá los grupos de la institución y definí qué roles necesita cada uno.
                  Después, los estudiantes se asignarán desde Legajos.
                </p>
                {isManagement && (
                  <button
                    onClick={openCreateGroup}
                    className="mt-7 inline-flex items-center gap-2 px-5 py-3.5 bg-violet-600 hover:bg-violet-700 text-white rounded-2xl font-black text-xs shadow-lg shadow-violet-200 transition"
                  >
                    <Plus size={17}/>
                    Crear primer grupo
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 2xl:grid-cols-3 gap-5">
              {gruposFinales.map((g) => {
                const docente = g.staffByRole?.find(item => item.roleId === docenteRole.id);
                const otherStaff = (g.staffByRole || []).filter(item => item.roleId !== docenteRole.id);

                return (
                  <article
                    key={g.id}
                    className="group bg-white rounded-[30px] border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all overflow-hidden"
                  >
                    <div className="p-5 md:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex flex-wrap gap-2 mb-3">
                            {g.turnLabels?.map(label => (
                              <span
                                key={label}
                                className="inline-flex items-center px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100 text-[9px] font-black uppercase tracking-wide"
                              >
                                {label}
                              </span>
                            ))}
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-[9px] font-black uppercase tracking-wide">
                              {getScheduleTypeLabel(g.scheduleType)}
                            </span>
                          </div>

                          <h3 className="text-xl md:text-2xl font-black text-slate-900 truncate">
                            {g.name}
                          </h3>

                          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[10px] font-bold text-slate-400 uppercase">
                            {g.levelId && <span>{g.levelId}</span>}
                            {g.sectionId && <span>• {g.sectionId}</span>}
                            {g.classroom && <span>• {g.classroom}</span>}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setGroupsToPrint([g]);
                              setShowPrintOptions(true);
                            }}
                            className="p-2.5 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition"
                            title="Imprimir grupo"
                          >
                            <Printer size={15}/>
                          </button>

                          {isManagement && (
                            <button
                              onClick={() => openEditGroup(g)}
                              className="p-2.5 rounded-xl bg-violet-50 text-violet-600 hover:bg-violet-100 transition"
                              title="Editar grupo"
                            >
                              <Edit3 size={15}/>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-6">
                        <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            Estudiantes
                          </p>
                          <p className="text-2xl font-black text-slate-800 mt-1">
                            {g.students.length}
                          </p>
                        </div>

                        <div className="rounded-2xl bg-violet-50 border border-violet-100 p-3">
                          <p className="text-[9px] font-black uppercase tracking-widest text-violet-400">
                            Roles
                          </p>
                          <p className="text-2xl font-black text-violet-700 mt-1">
                            {g.enabledRoles.length}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 pt-5 border-t border-slate-100">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                              Equipo
                            </p>
                            <p className="text-xs text-slate-500 mt-1">
                              {otherStaff.length + (docente ? 1 : 0)} asignación{(otherStaff.length + (docente ? 1 : 0)) === 1 ? '' : 'es'}
                            </p>
                          </div>

                          {isManagement && (
                            <button
                              onClick={() => openEditGroup(g)}
                              className="text-[10px] font-black text-violet-600 hover:text-violet-800"
                            >
                              Gestionar
                            </button>
                          )}
                        </div>

                        <div className="space-y-2">
                          {g.enabledRoles.map(roleId => {
                            const assignment = g.staffByRole.find(item => item.roleId === roleId);
                            return (
                              <div
                                key={roleId}
                                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 px-3 py-2.5"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                                    assignment?.name
                                      ? 'bg-emerald-500'
                                      : 'bg-slate-300'
                                  }`}/>
                                  <span className="text-[10px] font-black uppercase text-slate-400 truncate">
                                    {getRoleLabel(roleId)}
                                  </span>
                                </div>

                                <span className={`text-[10px] font-black text-right truncate ${
                                  assignment?.name
                                    ? 'text-slate-700'
                                    : 'text-slate-300'
                                }`}>
                                  {assignment?.name || 'Sin asignar'}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="mt-5 flex gap-2">
                        <button
                          onClick={() => setSelectedGroupDetails(g)}
                          className="flex-1 py-3 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-wide hover:bg-slate-800 transition"
                        >
                          Ver grupo
                        </button>

                        <button
                          onClick={() => setSelectedGroupDetails(g)}
                          className="px-4 py-3 rounded-2xl bg-violet-50 text-violet-700 hover:bg-violet-100 transition"
                          title="Ver estudiantes"
                        >
                          <Users size={17}/>
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 bg-slate-50/50 p-3">
                      {g.students.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                            Sin estudiantes asignados
                          </p>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Se completará desde Legajos.
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex -space-x-2 overflow-hidden pl-1">
                            {[...g.students]
                              .sort((a,b)=>(a.lastName||'').localeCompare(b.lastName||''))
                              .slice(0, 6)
                              .map(student => (
                                <div
                                  key={student.id}
                                  className="w-9 h-9 rounded-full border-2 border-white bg-slate-200 overflow-hidden flex items-center justify-center text-[9px] font-black text-slate-400"
                                  title={`${student.lastName || ''}, ${student.firstName || ''}`}
                                >
                                  {student.photoUrl ? (
                                    <img
                                      src={student.photoUrl}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    (student.firstName?.[0] || '?').toUpperCase()
                                  )}
                                </div>
                              ))
                            }
                            {g.students.length > 6 && (
                              <div className="w-9 h-9 rounded-full border-2 border-white bg-violet-100 text-violet-700 flex items-center justify-center text-[9px] font-black">
                                +{g.students.length - 6}
                              </div>
                            )}
                          </div>

                          <span className="text-[10px] font-black text-slate-400 uppercase">
                            Ver listado →
                          </span>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {selectedStudent && (
        <StudentDetailView student={selectedStudent} user={user} db={db} appId={appId} onClose={() => setSelectedStudent(null)} onEdit={(s) => { setSelectedStudent(null); setFullFileStudent(s); }} />
      )}

      {fullFileStudent && (
        <div className="fixed inset-0 bg-slate-900/60 z-[1000] flex items-center justify-center p-4 lg:p-10 backdrop-blur-md animate-in fade-in">
          <div className="bg-white rounded-[40px] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] border border-white/20">
            <div className="p-6 lg:p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-3xl bg-gradient-to-br from-orange-400 to-orange-600 p-1 shadow-lg">
                    {fullFileStudent.photoUrl ? 
                      <img src={fullFileStudent.photoUrl} className="w-full h-full object-cover rounded-[22px]"/> : 
                      <div className="w-full h-full flex items-center justify-center bg-slate-800 rounded-[22px] font-black text-2xl">{fullFileStudent.firstName[0]}</div>
                    }
                  </div>
                  <div>
                    <h3 className="text-xl lg:text-3xl font-black uppercase italic tracking-tighter leading-none">
                      {fullFileStudent.lastName}, {fullFileStudent.firstName}
                    </h3>
                    <div className="flex gap-2 mt-2">
                      <span className="bg-white/10 text-orange-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/5">Legajo Digital</span>
                      <span className="bg-white/10 text-slate-400 px-3 py-1 rounded-full text-[10px] font-bold border border-white/5">DNI: {fullFileStudent.dni || '-'}</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setFullFileStudent(null)} className="p-3 bg-white/5 rounded-full hover:bg-red-500 transition-all hover:rotate-90"><X size={24}/></button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 p-6 lg:p-10 custom-scrollbar">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                  <div className="space-y-6">
                    <section className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-100">
                      <h4 className="text-violet-600 font-black text-[11px] uppercase mb-4 flex items-center gap-2 border-b border-violet-50 pb-2">
                        <User size={16}/> Información Base
                      </h4>
                    <div className="space-y-4">
                        <div><p className="text-[9px] text-slate-400 font-bold uppercase">Diagnóstico (DX)</p><p className="font-black text-slate-700 bg-violet-50 p-2 rounded-xl text-sm mt-1 uppercase inline-block">{fullFileStudent.dx || 'S/D'}</p></div>
                        <div><p className="text-[9px] text-slate-400 font-bold uppercase">Edad Actual</p><p className="font-black text-slate-700 text-base">{calculateAge(fullFileStudent.birthDate)} años</p></div>
                        <div><p className="text-[9px] text-slate-400 font-bold uppercase">Fecha de Nacimiento</p><p className="font-bold text-slate-600 text-sm">{getSafeDate(fullFileStudent.birthDate)}</p></div>
                      </div>
                    </section>

                    <section className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-100">
                      <h4 className="text-emerald-600 font-black text-[11px] uppercase mb-4 flex items-center gap-2 border-b border-emerald-50 pb-2">
                        <Activity size={16}/> Cobertura Médica
                      </h4>
                      <div className="space-y-4">
                        <div><p className="text-[9px] text-slate-400 font-bold uppercase">Obra Social</p><p className="font-black text-slate-700 text-sm mt-1">{fullFileStudent.healthInsurance || 'No declarada'}</p></div>
                        <div>
                          <p className="text-[9px] text-slate-400 font-bold uppercase">Vencimiento CUD</p>
                          <p className={`font-black text-sm mt-1 ${checkCudStatus(fullFileStudent.cudExpiration).status === 'expired' ? 'text-red-500' : 'text-slate-700'}`}>
                            {getSafeDate(fullFileStudent.cudExpiration) || 'Sin fecha cargada'}
                          </p>
                        </div>
                      </div>
                    </section>
                  </div>

                 <div className="space-y-6">
                    <section className="bg-white p-6 rounded-[35px] shadow-sm border border-slate-100 h-full">
                      <h4 className="text-orange-600 font-black text-[11px] uppercase mb-4 flex items-center gap-2 border-b border-orange-50 pb-2"><Users size={16}/> Grupo Familiar</h4>
                      <div className="space-y-6">
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <p className="text-[9px] text-orange-500 font-black uppercase mb-1">Madre / Tutor 1</p>
                          <p className="font-black text-slate-700 text-sm">{fullFileStudent.motherName || 'No cargado'}</p>
                          <p className="text-blue-600 font-bold text-xs mt-1 flex items-center gap-1"><Phone size={10}/> {fullFileStudent.motherContact || '-'}</p>
                        </div>
                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                          <p className="text-[9px] text-orange-500 font-black uppercase mb-1">Padre / Tutor 2</p>
                          <p className="font-black text-slate-700 text-sm">{fullFileStudent.fatherName || 'No cargado'}</p>
                          <p className="text-blue-600 font-bold text-xs mt-1 flex items-center gap-1"><Phone size={10}/> {fullFileStudent.fatherContact || '-'}</p>
                        </div>
                        <div className="pt-2"><p className="text-[9px] text-slate-400 font-bold uppercase">Domicilio</p><div className="flex items-start gap-2 mt-1"><MapPin size={14} className="text-slate-300 shrink-0 mt-1"/><p className="font-bold text-slate-600 text-sm leading-tight">{fullFileStudent.address || 'Sin dirección registrada'}</p></div></div>
                      </div>
                    </section>
                  </div>

                  <div className="space-y-6">
                    <section className="bg-indigo-900 text-white p-6 rounded-[35px] shadow-xl">
                      <h4 className="text-indigo-300 font-black text-[11px] uppercase mb-4 flex items-center gap-2 border-b border-white/10 pb-2">
                        <GraduationCap size={16}/> Situación Escolar
                      </h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-indigo-300 uppercase">Modalidad</span>
                          <span className="font-black text-sm uppercase">{fullFileStudent.modality || 'Sede'}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-indigo-300 uppercase">Nivel Actual</span>
                          <span className="font-black text-sm uppercase">{fullFileStudent.level || '-'}</span>
                        </div>
                        <div className="mt-4 p-3 bg-white/5 rounded-2xl border border-white/10">
                          <p className="text-[9px] font-black text-indigo-300 uppercase mb-2">Responsables de Aula</p>
                          <p className="text-[10px] font-bold mb-1">Grupo: <span className="text-white">{fullFileStudent.currentGroupName || '-'}</span></p>
                          <p className="text-[10px] font-bold">Turno: <span className="text-white">{fullFileStudent.currentTurnLabel || '-'}</span></p>
                        </div>
                      </div>
                    </section>

                    <div className="mt-4 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                      <p className="text-[9px] font-black text-orange-600 uppercase mb-2 flex items-center gap-1">
                        <MessageSquare size={12}/> Últimas novedades del grupo
                      </p>
                      <div className="space-y-2 max-h-32 overflow-y-auto no-scrollbar">
                        {(groupMessages[fullFileStudent.currentGroupId || fullFileStudent.currentGroupName] || []).slice(0, 3).map(m => (
                          <div key={m.id} className="bg-white p-2 rounded-xl shadow-sm border border-orange-50">
                            <p className="text-[8px] font-bold text-slate-400 uppercase">{m.author}</p>
                            <p className="text-[10px] text-slate-600 leading-tight">{m.text}</p>
                          </div>
                        )) || <p className="text-[10px] text-orange-300 italic">Sin novedades recientes.</p>}
                      </div>
                    </div>

                    <section className="bg-emerald-50 p-6 rounded-[35px] border border-emerald-100 h-fit">
                      <h4 className="text-emerald-700 font-black text-[11px] uppercase mb-4 flex items-center gap-2 border-b border-emerald-200 pb-2">
                        <Shield size={16}/> Autorizaciones
                      </h4>
                      <div>
                        <p className="text-[9px] text-emerald-600 font-black uppercase mb-2">Retira de la Institución:</p>
                        <div className="bg-white/60 p-4 rounded-2xl text-xs font-bold text-slate-600 italic leading-relaxed">
                          "{fullFileStudent.pickupInfo || 'No hay información de retiro cargada.'}"
                        </div>
                      </div>
                    </section>
                  </div>
                </div>
            </div>

            <div className="p-6 bg-white border-t border-slate-100 flex justify-center gap-4 shrink-0">
                <button onClick={() => setFullFileStudent(null)} className="px-8 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs hover:bg-slate-200 transition-all">Cerrar</button>
                <button onClick={() => { printGroups([fullFileStudent]) }} className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs shadow-lg flex items-center gap-2 hover:scale-105 transition-all"><Printer size={16}/> Imprimir Legajo</button>
            </div>
          </div>
        </div>
      )}

     {showBitacoraModal && (() => {
        const liveStudent = students.find(s => s.id === showBitacoraModal.id) || showBitacoraModal;
        
      // Unificamos incidentes de aula y todo el historial de gabinete/trabajo social
        const normales = (liveStudent.incidents || []).map(inc => ({ ...inc, source: 'aula' }));
        
        const sociales = [];
        (socialCases || []).filter(c => {
          if (c.studentId && c.studentId === liveStudent.id) return true;
          if (c.dni && liveStudent.dni && c.dni === liveStudent.dni) return true;
          return false;
        }).forEach(c => {
          // Extraemos CADA NOTA que Trabajo Social haya escrito en el historial del caso
          if (c.history && Array.isArray(c.history)) {
            c.history.forEach(h => {
              sociales.push({
                date: h.date || new Date().toISOString(),
                text: h.text,
                author: h.author || 'Gabinete',
                severity: (c.status === 'Archivado' || c.status === 'Reincorporado') ? 'low' : 'high',
                source: 'social',
                isClosed: c.status === 'Archivado' || c.status === 'Reincorporado'
              });
            });
          }
        });

        const historialUnificado = [...normales, ...sociales].sort((a, b) => new Date(b.date) - new Date(a.date));
        return (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[600] flex items-center justify-center p-4">
            <div className="bg-white rounded-[40px] w-full max-w-sm p-6 shadow-2xl border-t-8 border-emerald-500 animate-in zoom-in-95 flex flex-col max-h-[90vh]">
              <div className="flex justify-between items-center mb-4 shrink-0">
                <div>
                  <h3 className="text-lg font-black text-gray-800 uppercase italic">Bitácora Express</h3>
                  <p className="text-xs text-gray-500 font-bold">{liveStudent.firstName} {liveStudent.lastName}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => imprimirBitacora(liveStudent, historialUnificado)} className="bg-violet-100 text-violet-700 p-2 rounded-full hover:bg-violet-200 transition" title="Imprimir Historial">
                    <Printer size={20}/>
                  </button>
                  <button onClick={() => { setShowBitacoraModal(null); setIsWriting(false); }} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition">
                    <X size={20}/>
                  </button>
                </div>
              </div>

              <div className="shrink-0 mb-4">
                {!isWriting ? (
                  <div className="grid grid-cols-2 gap-2">
                    {INCIDENT_TYPES.map((type) => (
                      <button key={type.label} onClick={() => handleSaveIncident(type.label, type.severity)} disabled={savingIncident} className={`p-2.5 rounded-xl border-2 flex flex-col items-center justify-center gap-0.5 transition active:scale-95 ${type.color} ${savingIncident ? "opacity-50" : "hover:brightness-95"}`}>
                        <span className="text-xl">{type.emoji}</span>
                        <span className="text-[9px] font-black uppercase text-center leading-tight">{type.label}</span>
                      </button>
                    ))}
                    <button onClick={() => setIsWriting(true)} className="col-span-2 py-2 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 hover:bg-gray-800 transition">
                      <Edit3 size={12}/> Redactar Nota Escrita
                    </button>
                  </div>
                ) : (
                  <div className="animate-in slide-in-from-bottom">
                    <textarea autoFocus value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="¿Qué pasó?..." className="w-full p-3 bg-gray-50 border rounded-xl text-xs mb-2 h-24 outline-none resize-none font-medium" />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => setIsWriting(false)} className="flex-1 py-2 bg-gray-100 text-gray-500 rounded-xl font-black uppercase text-[10px]">Cancelar</button>
                      <button type="button" onClick={() => handleSaveIncident("Nota", "medium", newNote)} disabled={!newNote.trim() || savingIncident} className="flex-[2] py-2 bg-violet-600 text-white rounded-xl font-black uppercase text-[10px] shadow-md">Guardar Nota</button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto border-t pt-3 space-y-2 pr-1 select-none" style={{ scrollbarWidth: 'thin' }}>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2">Registros recientes:</p>
                {historialUnificado.length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic text-center py-4">Sin registros previos en esta etapa.</p>
                ) : (
                  historialUnificado.map((inc, idx) => {
                    const colorSev = inc.source === 'social' 
                      ? (inc.isClosed ? 'bg-slate-50 border-slate-200 text-slate-500' : 'bg-red-50 border-red-200 text-red-800 ring-1 ring-red-300')
                      : (inc.severity === 'positive' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : inc.severity === 'high' ? 'bg-red-50 border-red-200 text-red-800' : inc.severity === 'medium' ? 'bg-orange-50 border-orange-200 text-orange-800' : 'bg-gray-50 border-gray-200 text-gray-600');
                    
                    return (
                      <div key={idx} className={`p-2.5 rounded-xl border flex justify-between items-start text-xs ${colorSev}`}>
                        <div className="flex-1 pr-2">
                          <p className="text-[8px] font-bold opacity-60 uppercase mb-0.5">
                            {inc.date ? new Date(inc.date).toLocaleDateString('es-AR') : 'Fecha s/d'} • Origen: {inc.source === 'social' ? 'Gabinete' : 'Aula'} • Por: {inc.author || 'Docente'}
                          </p>
                          <p className={`font-bold leading-tight ${inc.isClosed ? 'line-through' : ''}`}>{inc.text || inc.type}</p>
                        </div>
                        {inc.source === 'aula' && (
                          <button type="button" onClick={() => deleteIncident(liveStudent.id, inc)} className="text-gray-400 hover:text-red-600 p-0.5 rounded-lg transition" title="Eliminar Registro">
                            <X size={14} strokeWidth={3}/>
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {selectedGroupDetails && (
        <div className="fixed inset-0 bg-slate-100 z-[500] flex flex-col animate-in fade-in">
          <div className="p-4 border-b-4 border-violet-100 flex justify-between items-center bg-white shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-violet-600 text-white p-2 rounded-xl shadow-lg"><Users size={20}/></div>
              <div>
                <h2 className="text-xl font-black uppercase italic text-slate-800 leading-none">{selectedGroupDetails.name}</h2>
                <p className="text-[9px] font-bold text-violet-400 uppercase tracking-widest mt-1">Gestión de Grupo y Mural</p>
              </div>
            </div>
            <button onClick={() => setSelectedGroupDetails(null)} className="p-3 bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-all"><X size={24}/></button>
          </div>
          
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
            <div className="w-full lg:w-[400px] bg-white border-r flex flex-col overflow-y-auto custom-scrollbar border-slate-200">
              <div className="p-4 grid grid-cols-2 gap-2 border-b border-slate-50 bg-slate-50/50">
                <button onClick={() => window.open(selectedGroupDetails.institucionalDrive, '_blank')} className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl font-black text-[9px] uppercase flex items-center justify-center gap-2 shadow-sm hover:bg-emerald-200 transition-all"><Folder size={16}/> Drive</button>
                <button onClick={() => window.open(selectedGroupDetails.driveLink, '_blank')} className="p-3 bg-blue-100 text-blue-700 rounded-2xl font-black text-[9px] uppercase flex items-center justify-center gap-2 shadow-sm hover:bg-blue-200 transition-all"><FileText size={16}/> Fotos</button>
              </div>

              <div className="p-4">
                <div className="flex items-center gap-2 mb-4 text-violet-900">
                  <GraduationCap size={18}/>
                  <h3 className="font-black uppercase italic text-sm">Seguimiento de Informes</h3>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-2xl mb-4">
                  {[1, 2, 3].map(n => (
                    <button key={n} onClick={() => setInformeEpoca(n)} className={`flex-1 py-2 rounded-xl text-[9px] font-black uppercase transition-all ${informeEpoca === n ? 'bg-white text-violet-600 shadow-sm' : 'text-slate-400'}`}>Etapa {n}</button>
                  ))}
                </div>

                <div className="space-y-2">
                  {selectedGroupDetails.students.sort((a,b)=>a.lastName.localeCompare(b.lastName)).map(s => {
                    const status = s[`informe${informeEpoca}`]?.status || 'Pendiente';
                    const colorMap = {
                      'Pendiente': 'bg-slate-100 text-slate-400 border-slate-200',
                      'Hecho': 'bg-blue-500 text-white border-blue-600 shadow-blue-100',
                      'Impreso': 'bg-orange-500 text-white border-orange-600 shadow-orange-100',
                      'Enviado': 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-100',
                      'Archivado': 'bg-slate-800 text-white border-slate-900 shadow-slate-200'
                    };

                    return (
                      <div key={s.id} className="flex items-center justify-between p-3 bg-white rounded-2xl border-2 border-slate-50 hover:border-violet-100 transition-all">
                        <span className="font-bold text-xs text-slate-700 uppercase truncate pr-2">{s.lastName}, {s.firstName}</span>
                        <button 
                          onClick={() => handleToggleInformeGrupo(s, informeEpoca)} 
                          className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase border-b-4 shadow-sm active:scale-95 transition-all ${colorMap[status] || colorMap['Pendiente']}`}
                        >
                          {status}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col bg-slate-50 relative">
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: `url("https://www.transparenttextures.com/patterns/cubes.png")` }}></div>

                <div className="p-4 bg-white border-b flex items-center justify-between shrink-0 z-10 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-orange-500 text-white rounded-lg"><MessageSquare size={16}/></div>
                    <h3 className="font-black text-slate-800 uppercase italic text-sm">Muro de Intercambio</h3>
                  </div>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded-full">Novedades del día</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 lg:p-8 flex flex-col-reverse space-y-4 custom-scrollbar z-10">
                    {(!groupMessages[selectedGroupDetails.id] && !groupMessages[selectedGroupDetails.name]) || ((groupMessages[selectedGroupDetails.id] || groupMessages[selectedGroupDetails.name] || []).length === 0) ? (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-10 animate-pulse">
                        <div className="w-20 h-20 bg-slate-200 rounded-full flex items-center justify-center mb-4">
                          <Send size={30} className="text-slate-400" />
                        </div>
                        <h4 className="text-slate-500 font-black uppercase text-xs italic">El muro está vacío</h4>
                        <p className="text-slate-400 text-[10px] mt-1 font-bold uppercase">¡Escribí la primera novedad del grupo!</p>
                      </div>
                    ) : (
                      (groupMessages[selectedGroupDetails.id] || groupMessages[selectedGroupDetails.name] || []).map(m => (
                        <div key={m.id} className={`flex flex-col ${m.authorId === user.id ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[90%] lg:max-w-[70%] p-4 rounded-[28px] shadow-sm relative group ${
                            m.authorId === user.id 
                            ? 'bg-violet-600 text-white rounded-tr-none' 
                            : 'bg-white text-slate-700 rounded-tl-none border border-slate-200'
                          }`}>
                            <p className={`text-[8px] font-black uppercase mb-1 tracking-tighter ${m.authorId === user.id ? 'text-violet-200' : 'text-violet-500'}`}>
                              {m.author} • {m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Ahora'}
                            </p>
                            <p className="text-sm font-bold leading-tight">{m.text}</p>
                          </div>
                        </div>
                      ))
                    )}
                </div>

                <div className="p-4 lg:p-6 bg-white border-t-2 border-slate-100 z-10 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                  <form onSubmit={(e) => handleAddGroupComment(e, selectedGroupDetails)} className="max-w-4xl mx-auto flex gap-2">
                    <input 
                      name="comment" 
                      autoComplete="off" 
                      placeholder="Escribí algo importante para el equipo..." 
                      className="flex-1 p-4 bg-slate-50 border-2 border-slate-200 rounded-[30px] text-sm font-bold text-slate-700 outline-none focus:border-orange-300 focus:bg-white transition-all shadow-inner" 
                    />
                    <button type="submit" className="bg-orange-500 text-white p-4 rounded-full shadow-lg shadow-orange-200 active:scale-95 transition-all hover:bg-orange-600">
                      <Send size={24}/>
                    </button>
                  </form>
                </div>
            </div>
          </div>
        </div>
      )}

      {editingGroup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[600] flex items-center justify-center p-4">
          <form onSubmit={handleUpdateGroup} className="bg-white rounded-[32px] w-full max-w-2xl p-6 lg:p-8 shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar">
            <div className="flex justify-between items-start gap-4 mb-6">
              <div>
                <p className="text-[10px] font-black text-violet-500 uppercase tracking-[0.2em]">Estructura institucional</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{editingGroup.isNew ? 'Crear grupo' : 'Editar grupo'}</h3>
                <p className="text-xs text-slate-400 mt-1">El grupo existe independientemente de los estudiantes. Las personas se asignan por rol.</p>
              </div>
              <button type="button" onClick={() => { setEditingGroup(null); setStaffSelections({}); }} className="p-2 rounded-full bg-slate-100 text-slate-400 hover:text-red-500"><X size={20}/></button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <label className="block md:col-span-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del grupo</span><input name="groupName" defaultValue={editingGroup.name || ''} required className="mt-1 w-full p-3.5 bg-slate-50 rounded-xl font-black text-sm outline-none border border-slate-200" placeholder="Ej.: Grupo Azul" /></label>
              <label className="block"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nivel</span><input name="levelId" defaultValue={editingGroup.levelId || ''} className="mt-1 w-full p-3.5 bg-slate-50 rounded-xl font-bold text-sm outline-none border border-slate-200" placeholder="Nivel" /></label>
              <label className="block"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sección</span><input name="sectionId" defaultValue={editingGroup.sectionId || ''} className="mt-1 w-full p-3.5 bg-slate-50 rounded-xl font-bold text-sm outline-none border border-slate-200" placeholder="Sección" /></label>
              <label className="block md:col-span-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sede / establecimiento</span><input name="siteId" defaultValue={editingGroup.siteId || ''} className="mt-1 w-full p-3.5 bg-slate-50 rounded-xl font-bold text-sm outline-none border border-slate-200" placeholder="Sede" /></label>

              <div className="md:col-span-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Turnos configurados</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {turnOptions.map(turnOption => (
                    <label key={turnOption.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                      <input type="checkbox" name="turnId" value={turnOption.id} defaultChecked={(editingGroup.turnIds || []).includes(turnOption.id)} className="accent-violet-600" />
                      <span className="text-xs font-bold text-slate-600">{turnOption.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="block"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Jornada</span><select name="scheduleType" defaultValue={editingGroup.scheduleType || scheduleTypeOptions[0]?.id || 'simple'} className="mt-1 w-full p-3.5 bg-slate-50 rounded-xl font-bold text-sm outline-none border border-slate-200"><option value="">Seleccionar</option>{scheduleTypeOptions.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
              <label className="block"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aula / Espacio</span><input name="classroom" defaultValue={editingGroup.classroom || ''} className="mt-1 w-full p-3.5 bg-slate-50 rounded-xl font-bold text-sm outline-none border border-slate-200" /></label>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-3"><Settings2 size={16} className="text-violet-500"/><h4 className="text-sm font-black text-slate-800">Roles habilitados</h4></div>
              <p className="text-xs text-slate-400 mb-4">Los roles salen de Configuración. Docente es obligatorio por defecto.</p>
              <div className="grid md:grid-cols-2 gap-2">
                {roleOptions.map(role => {
                  const checked = normalizeRoles(editingGroup.enabledRoles || []).includes(role.id);
                  const required = role.id === docenteRole.id || role.requiredForGroup;
                  return <label key={role.id} className={`flex items-center justify-between p-3 rounded-xl border ${checked ? 'border-violet-200 bg-violet-50' : 'border-slate-200 bg-slate-50'}`}><span className="flex items-center gap-2"><input type="checkbox" name="roleId" value={role.id} defaultChecked={checked} disabled={required} className="accent-violet-600"/><span className="text-xs font-black text-slate-700">{role.name}</span></span>{required && <span className="text-[8px] font-black uppercase text-violet-500">Obligatorio</span>}</label>;
                })}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-3"><UserPlus size={16} className="text-violet-500"/><h4 className="text-sm font-black text-slate-800">Personal asignado</h4></div>
              <div className="space-y-2">
                {normalizeRoles(editingGroup.enabledRoles || []).map(roleId => (
                  <div key={roleId} className="grid grid-cols-[1fr_1.5fr] items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] font-black uppercase text-slate-500">{getRoleLabel(roleId)}</span>
                    <select value={staffSelections[roleId] || ''} onChange={e => setStaffSelections(prev => ({ ...prev, [roleId]: e.target.value }))} className="p-2.5 rounded-lg bg-white border border-slate-200 text-xs font-bold text-slate-700 outline-none"><option value="">Sin asignar</option>{staffList.slice().sort((a,b)=>(a.fullName||'').localeCompare(b.fullName||'')).map(person => <option key={person.id} value={person.id}>{person.fullName || `${person.lastName || ''}, ${person.firstName || ''}`}</option>)}</select>
                  </div>
                ))}
              </div>
              {staffList.length === 0 && <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700">Todavía no hay personal cargado. El grupo puede crearse igual.</div>}
            </div>

            <div className="mt-6 grid md:grid-cols-2 gap-3">
              <label className="block"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carpeta de fotos</span><input name="driveLink" defaultValue={editingGroup.driveLink || ''} className="mt-1 w-full p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-xs font-bold" /></label>
              <label className="block"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Drive institucional</span><input name="institucionalDrive" defaultValue={editingGroup.institucionalDrive || ''} className="mt-1 w-full p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs font-bold" /></label>
            </div>

            <div className="flex gap-3 mt-8"><button type="button" onClick={() => { setEditingGroup(null); setStaffSelections({}); }} className="flex-1 py-3.5 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-xs">Cancelar</button><button type="submit" disabled={updatingGroup} className="flex-[2] py-3.5 bg-violet-600 text-white rounded-xl font-black uppercase text-xs shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"><Save size={16}/>{updatingGroup ? 'Guardando…' : editingGroup.isNew ? 'Crear grupo' : 'Guardar cambios'}</button></div>
          </form>
        </div>
      )}

      {showPrintOptions && (
        <div className="fixed inset-0 bg-black/60 z-[1000] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl border-t-8 border-violet-600">
            <h3 className="text-xl font-black text-violet-900 uppercase italic mb-4">¿Qué imprimir?</h3>
            <div className="flex flex-col gap-3 mb-6">
              <button onClick={() => setPrintMode('students')} className={`p-4 rounded-2xl border-2 text-left transition-all ${printMode === 'students' ? 'border-violet-600 bg-violet-50' : 'border-slate-100'}`}><p className="font-black text-xs uppercase text-violet-900">Listado de Alumnos</p><p className="text-[10px] text-slate-500">DNI, Fecha de nacimiento y contactos.</p></button>
              <button onClick={() => setPrintMode('staff')} className={`p-4 rounded-2xl border-2 text-left transition-all ${printMode === 'staff' ? 'border-violet-600 bg-violet-50' : 'border-slate-100'}`}><p className="font-black text-xs uppercase text-violet-900">Listado de Staff</p><p className="text-[10px] text-slate-500">Grilla de Docentes, Auxiliares y Aulas.</p></button>
            </div>
            <button onClick={() => { printGroups(groupsToPrint); setShowPrintOptions(false); }} className="w-full py-4 bg-violet-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg mb-2">Confirmar e Imprimir</button>
            <button onClick={() => setShowPrintOptions(false)} className="w-full py-3 text-gray-400 font-bold uppercase text-[10px]">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}
