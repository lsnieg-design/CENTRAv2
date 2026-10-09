import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  X,
  Activity,
  AlertTriangle,
  Printer,
  Edit3,
  FileText,
  Plus,
  Trash2,
  RefreshCw,
  ArrowLeft,
  CalendarDays,
  ShieldAlert,
  HeartPulse,
  UserRound,
  CheckCircle2,
} from 'lucide-react';
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from 'firebase/firestore';
import { canAccessModule, isModuleEnabled } from '../config';

const DEFAULT_PRIMARY = '#b91c1c';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]));
}

function safeImageUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  if (/^(https?:\/\/|\/)/i.test(url)) return url;
  return '';
}

function safeColor(value, fallback = DEFAULT_PRIMARY) {
  const color = String(value || '').trim();
  return /^#[0-9a-f]{3,8}$/i.test(color) ? color : fallback;
}

function parseDate(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === 'function') {
    const date = value.toDate();
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const raw = String(value);
  const date = new Date(raw.includes('T') ? raw : `${raw}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value, options = { day: '2-digit', month: '2-digit', year: 'numeric' }) {
  const date = parseDate(value);
  return date ? date.toLocaleDateString('es-AR', options) : '—';
}

function calculateAge(birthDate) {
  const birth = parseDate(birthDate);
  if (!birth) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDifference = today.getMonth() - birth.getMonth();
  if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 0 ? age : null;
}

function checkCudStatus(cudDate) {
  const expiration = parseDate(cudDate);
  if (!expiration) return { status: 'none', text: 'Sin fecha cargada', days: null };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiration.setHours(0, 0, 0, 0);
  const days = Math.round((expiration.getTime() - today.getTime()) / 86400000);

  if (days < 0) return { status: 'expired', text: 'Vencido', days };
  if (days <= 90) return { status: 'warning', text: days === 0 ? 'Vence hoy' : `Vence en ${days} días`, days };
  return { status: 'ok', text: 'Vigente', days };
}

function Field({ label, value, emphasis = false }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`whitespace-pre-wrap break-words text-sm ${emphasis ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
        {value || 'Sin datos cargados'}
      </p>
    </div>
  );
}

function StatusBadge({ status, children }) {
  const styles = {
    expired: 'bg-red-100 text-red-800 border-red-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    ok: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    none: 'bg-slate-100 text-slate-600 border-slate-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-extrabold ${styles[status] || styles.none}`}>
      {status === 'expired' || status === 'warning' ? <AlertTriangle size={12} /> : status === 'ok' ? <CheckCircle2 size={12} /> : null}
      {children}
    </span>
  );
}

export function MedicalView({ user, db, appId, appConfig = {} }) {
  const [students, setStudents] = useState([]);
  const [filterText, setFilterText] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showEvoForm, setShowEvoForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [feedback, setFeedback] = useState(null);
  const [printError, setPrintError] = useState('');

  const institutionName = appConfig.institutionShortName || appConfig.institutionName || 'Institución';
  const logoUrl = safeImageUrl(appConfig.logoUrl);
  const primaryColor = safeColor(appConfig.primaryColor);
  const secondaryColor = safeColor(appConfig.secondaryColor, '#64748b');
  const documentSettings = appConfig.document || {};
  const currentRole = user?.role || user?.rol || '';
  const isSystemAdmin = ['admin', 'super-admin'].includes(user?.rol) || ['admin', 'super-admin'].includes(user?.role);
  const moduleEnabled = isModuleEnabled(appConfig, 'medical');
  const canAccess = moduleEnabled && (isSystemAdmin || canAccessModule(appConfig, currentRole, 'medical'));
  const personLabel = appConfig.labels?.person || 'persona';
  const peopleLabel = appConfig.labels?.people || 'personas';

  useEffect(() => {
    if (!db || !appId || !moduleEnabled || !canAccess) {
      setStudents([]);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    setLoadError('');
    const studentsQuery = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'students'),
      where('isActive', '==', true)
    );

    const unsubscribe = onSnapshot(studentsQuery, snapshot => {
      const records = snapshot.docs
        .map(item => ({ id: item.id, ...item.data() }))
        .sort((a, b) => String(a.lastName || '').localeCompare(String(b.lastName || ''), 'es'));
      setStudents(records);
      setLoading(false);
      setLoadError('');
    }, error => {
      console.error('No se pudieron cargar las fichas médicas:', error);
      setStudents([]);
      setLoading(false);
      setLoadError('No pudimos cargar las fichas médicas. Revisá la conexión y los permisos de acceso.');
    });

    return () => unsubscribe();
  }, [db, appId, moduleEnabled, canAccess]);

  useEffect(() => {
    if (!selectedStudent?.id) return;
    const freshStudent = students.find(student => student.id === selectedStudent.id);
    if (freshStudent) setSelectedStudent(freshStudent);
  }, [students, selectedStudent?.id]); // Mantener la ficha sincronizada con Firestore.

  const filteredStudents = useMemo(() => {
    const term = filterText.trim().toLocaleLowerCase('es-AR');
    if (!term) return students;
    return students.filter(student => {
      const name = `${student.lastName || ''} ${student.firstName || ''} ${student.dni || ''}`;
      return name.toLocaleLowerCase('es-AR').includes(term);
    });
  }, [students, filterText]);

  const selectStudent = student => {
    setSelectedStudent(student);
    setIsEditing(false);
    setShowEvoForm(false);
    setFeedback(null);
    setPrintError('');
  };

  const returnToList = () => {
    setSelectedStudent(null);
    setIsEditing(false);
    setShowEvoForm(false);
    setFeedback(null);
    setPrintError('');
  };

  const handleSaveMedicalData = async event => {
    event.preventDefault();
    if (!db || !appId || !selectedStudent?.id || !canAccess) return;

    const formData = new FormData(event.currentTarget);
    const updates = {
      healthInsurance: String(formData.get('healthInsurance') || '').trim(),
      cudExpiration: String(formData.get('cudExpiration') || ''),
      cudDiagnosis: String(formData.get('cudDiagnosis') || '').trim(),
      allergies: String(formData.get('allergies') || '').trim(),
      medication: String(formData.get('medication') || '').trim(),
      weight: String(formData.get('weight') || '').trim(),
      vaccines: String(formData.get('vaccines') || '').trim(),
      medicalUpdatedAt: new Date().toISOString(),
      medicalUpdatedBy: user?.id || '',
    };

    setSaving(true);
    setFeedback(null);
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'students', selectedStudent.id), updates);
      setSelectedStudent(current => ({ ...current, ...updates }));
      setIsEditing(false);
      setFeedback({ type: 'success', text: 'Los datos médicos se guardaron correctamente.' });
    } catch (error) {
      console.error('No se pudieron guardar los datos médicos:', error);
      setFeedback({ type: 'error', text: `No se pudieron guardar los datos. ${error?.message || 'Intentá nuevamente.'}` });
    } finally {
      setSaving(false);
    }
  };

  const handleAddEvolution = async event => {
    event.preventDefault();
    if (!db || !appId || !selectedStudent?.id || !canAccess) return;

    const formData = new FormData(event.currentTarget);
    const text = String(formData.get('text') || '').trim();
    const date = String(formData.get('date') || '');
    if (!text || !date) {
      setFeedback({ type: 'error', text: 'Completá la fecha y el detalle de la evolución.' });
      return;
    }

    const newEvolution = {
      id: window.crypto?.randomUUID?.() || `${Date.now()}`,
      date,
      text,
      author: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.fullName || 'Usuario de CENTRA',
      createdAt: new Date().toISOString(),
      authorId: user?.id || '',
    };

    setSaving(true);
    setFeedback(null);
    try {
      await updateDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'students', selectedStudent.id),
        { medicalEvolutions: arrayUnion(newEvolution) }
      );
      setSelectedStudent(current => ({
        ...current,
        medicalEvolutions: [...(current.medicalEvolutions || []), newEvolution],
      }));
      setShowEvoForm(false);
      setFeedback({ type: 'success', text: 'La evolución médica se guardó correctamente.' });
    } catch (error) {
      console.error('No se pudo guardar la evolución médica:', error);
      setFeedback({ type: 'error', text: `No se pudo guardar la evolución. ${error?.message || 'Intentá nuevamente.'}` });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvolution = async evolution => {
    if (!db || !appId || !selectedStudent?.id || !evolution || !canAccess) return;
    if (!window.confirm('¿Querés eliminar esta evolución médica? Esta acción no se puede deshacer.')) return;

    setSaving(true);
    setFeedback(null);
    try {
      await updateDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'students', selectedStudent.id),
        { medicalEvolutions: arrayRemove(evolution) }
      );
      setSelectedStudent(current => ({
        ...current,
        medicalEvolutions: (current.medicalEvolutions || []).filter(item => item.id !== evolution.id),
      }));
      setFeedback({ type: 'success', text: 'La evolución se eliminó correctamente.' });
    } catch (error) {
      console.error('No se pudo eliminar la evolución médica:', error);
      setFeedback({ type: 'error', text: `No se pudo eliminar la evolución. ${error?.message || 'Intentá nuevamente.'}` });
    } finally {
      setSaving(false);
    }
  };

  const printClinicalHistory = student => {
    if (!student) return;
    setPrintError('');

    const printedAt = new Date().toLocaleDateString('es-AR', {
      day: '2-digit', month: 'long', year: 'numeric',
    });
    const evolutions = [...(student.medicalEvolutions || [])].sort((a, b) => {
      return (parseDate(b.date)?.getTime() || 0) - (parseDate(a.date)?.getTime() || 0);
    });
    const showLogo = documentSettings.showLogo !== false && logoUrl;
    const logoMarkup = showLogo
      ? `<img src="${escapeHtml(logoUrl)}" alt="Logo de ${escapeHtml(institutionName)}" style="width:68px;height:68px;object-fit:contain;">`
      : '';
    const addressParts = [appConfig.address, appConfig.city, appConfig.province, appConfig.country]
      .map(value => String(value || '').trim()).filter(Boolean);
    const contactParts = [addressParts.join(', '), appConfig.phone ? `Tel. ${appConfig.phone}` : '', appConfig.email || '', appConfig.website || '']
      .filter(Boolean);
    const footerMarkup = contactParts.length
      ? `<footer>${contactParts.map(escapeHtml).join(' · ')}</footer>`
      : '';
    const evolutionMarkup = evolutions.length
      ? evolutions.map(evolution => `
          <article class="evolution">
            <div class="evolution-meta"><strong>${escapeHtml(formatDate(evolution.date))}</strong> · Registro de ${escapeHtml(evolution.author || 'Usuario')}</div>
            <p>${escapeHtml(evolution.text || '').replace(/\n/g, '<br>')}</p>
          </article>`).join('')
      : '<p class="muted">No hay evoluciones médicas registradas.</p>';
    const signatureName = documentSettings.signatureName || '';
    const signatureRole = documentSettings.signatureRole || 'Profesional responsable';
    const signatureMarkup = `
      <div class="signature-box">
        <div class="signature-line"></div>
        <strong>${escapeHtml(signatureName || 'Firma y aclaración')}</strong>
        <span>${escapeHtml(signatureName ? signatureRole : 'Firma y sello profesional')}</span>
      </div>`;
    const html = `<!doctype html>
      <html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
      <title>Ficha médica - ${escapeHtml(student.lastName || '')}</title>
      <style>
        @page { size: A4; margin: 16mm; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #172033; font-family: Arial, Helvetica, sans-serif; font-size: 10.5pt; line-height: 1.45; }
        .header { display:flex; align-items:center; justify-content:space-between; gap:16px; border-bottom:3px solid ${primaryColor}; padding-bottom:14px; margin-bottom:22px; }
        .brand { display:flex; align-items:center; gap:14px; min-width:0; }
        .title { color:${primaryColor}; font-size:19pt; font-weight:800; text-transform:uppercase; letter-spacing:.04em; }
        .institution { color:#475569; font-size:10pt; font-weight:700; margin-top:4px; }
        .confidential { color:#64748b; text-align:right; font-size:8.5pt; min-width:120px; }
        .section { margin:0 0 18px; break-inside:avoid; }
        .section-title { background:${primaryColor}12; color:${primaryColor}; border-left:4px solid ${primaryColor}; padding:8px 10px; margin:0 0 12px; font-size:10pt; font-weight:800; text-transform:uppercase; letter-spacing:.04em; }
        .grid { display:grid; grid-template-columns:1fr 1fr; gap:12px 18px; }
        .label { display:block; margin-bottom:3px; color:#64748b; font-size:7.5pt; font-weight:800; text-transform:uppercase; }
        .value { color:#111827; font-weight:600; overflow-wrap:anywhere; }
        .allergies { border:1px solid #fecaca; background:#fff7f7; padding:10px; border-radius:5px; }
        .evolution { margin:0 0 12px; padding:0 0 10px; border-bottom:1px solid #e2e8f0; break-inside:avoid; }
        .evolution-meta { color:#64748b; font-size:8.5pt; margin-bottom:5px; }
        .evolution p { margin:0; white-space:normal; overflow-wrap:anywhere; }
        .muted { color:#64748b; font-style:italic; }
        .signatures { display:flex; justify-content:flex-end; margin-top:46px; break-inside:avoid; }
        .signature-box { width:245px; text-align:center; font-size:9pt; }
        .signature-line { border-top:1px solid #334155; margin-bottom:6px; }
        .signature-box span { display:block; margin-top:2px; color:#64748b; }
        footer { margin-top:25px; border-top:1px solid #cbd5e1; padding-top:8px; text-align:center; font-size:7.5pt; color:#64748b; }
        .small-note { margin-top:15px; font-size:8pt; color:#64748b; }
        @media print { .section-title { print-color-adjust:exact; -webkit-print-color-adjust:exact; } .allergies { print-color-adjust:exact; -webkit-print-color-adjust:exact; } }
      </style></head><body>
        <header class="header">
          <div class="brand">${logoMarkup}<div><div class="title">Ficha médica</div><div class="institution">${escapeHtml(institutionName)}</div></div></div>
          <div class="confidential"><strong>Documento confidencial</strong><br>Impreso: ${escapeHtml(printedAt)}</div>
        </header>
        <section class="section">
          <h2 class="section-title">Datos de la persona</h2>
          <div class="grid">
            <div><span class="label">Nombre y apellido</span><div class="value">${escapeHtml(`${student.lastName || ''}, ${student.firstName || ''}`.replace(/^,\s*/, ''))}</div></div>
            <div><span class="label">DNI</span><div class="value">${escapeHtml(student.dni || '—')}</div></div>
            <div><span class="label">Fecha de nacimiento</span><div class="value">${escapeHtml(formatDate(student.birthDate || student.fechaNac))}</div></div>
            <div><span class="label">Edad</span><div class="value">${calculateAge(student.birthDate || student.fechaNac) ?? '—'}${calculateAge(student.birthDate || student.fechaNac) === null ? '' : ' años'}</div></div>
          </div>
        </section>
        <section class="section">
          <h2 class="section-title">Información médica registrada</h2>
          <div class="grid">
            <div><span class="label">Obra social o cobertura</span><div class="value">${escapeHtml(student.healthInsurance || 'No declara')}</div></div>
            <div><span class="label">Vencimiento del CUD</span><div class="value">${escapeHtml(formatDate(student.cudExpiration))}</div></div>
            <div style="grid-column:1 / -1"><span class="label">Diagnóstico consignado</span><div class="value">${escapeHtml(student.cudDiagnosis || 'Sin datos cargados')}</div></div>
            <div class="allergies" style="grid-column:1 / -1"><span class="label">Alergias declaradas</span><div class="value">${escapeHtml(student.allergies || 'No hay alergias declaradas en el registro')}</div></div>
            <div style="grid-column:1 / -1"><span class="label">Medicación habitual</span><div class="value">${escapeHtml(student.medication || 'Sin datos cargados')}</div></div>
            <div><span class="label">Peso registrado</span><div class="value">${escapeHtml(student.weight ? `${student.weight} kg` : 'Sin datos cargados')}</div></div>
            <div><span class="label">Vacunación</span><div class="value">${escapeHtml(student.vaccines || 'Sin datos cargados')}</div></div>
          </div>
        </section>
        <section class="section">
          <h2 class="section-title">Evoluciones médicas</h2>
          ${evolutionMarkup}
        </section>
        <div class="small-note">Este documento reproduce la información registrada en CENTRA a la fecha de impresión.</div>
        <div class="signatures">${signatureMarkup}</div>
        ${footerMarkup}
      </body></html>`;

    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'Documento para impresión');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '1px';
    iframe.style.height = '1px';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      iframe.remove();
    };

    try {
      const printDocument = iframe.contentWindow.document;
      printDocument.open();
      printDocument.write(html);
      printDocument.close();
      iframe.contentWindow.addEventListener('afterprint', cleanup, { once: true });
      window.setTimeout(() => {
        try {
          iframe.contentWindow.focus();
          iframe.contentWindow.print();
          window.setTimeout(cleanup, 60000);
        } catch (error) {
          console.error('No se pudo abrir la impresión:', error);
          cleanup();
          setPrintError('No se pudo abrir la impresión. Revisá la configuración del navegador.');
        }
      }, 350);
    } catch (error) {
      console.error('No se pudo preparar la ficha para imprimir:', error);
      cleanup();
      setPrintError('No se pudo preparar el documento para imprimir.');
    }
  };

  if (!moduleEnabled) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><HeartPulse size={28} /></div>
        <h2 className="text-xl font-black text-slate-800">Módulo Médico deshabilitado</h2>
        <p className="mt-2 text-sm text-slate-500">Podés habilitarlo desde Configuración si esta institución necesita utilizar fichas médicas.</p>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-16 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"><ShieldAlert size={28} /></div>
        <h2 className="text-xl font-black text-slate-800">Acceso restringido</h2>
        <p className="mt-2 text-sm text-slate-500">Tu usuario no tiene permisos para consultar información médica. Si necesitás acceso, pedilo a quien administra CENTRA.</p>
      </div>
    );
  }

  if (!db || !appId) {
    return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">No se pudo conectar con la base de datos institucional.</div>;
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-2 pb-24 pt-4 animate-in fade-in">
      {!selectedStudent ? (
        <>
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})` }} />
            <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: primaryColor }}><HeartPulse size={23} /></div>
                <div className="min-w-0">
                  <h1 className="text-xl font-black tracking-tight text-slate-900 sm:text-2xl">Fichas médicas</h1>
                  <p className="mt-1 text-sm text-slate-500">Información confidencial · {institutionName}</p>
                </div>
              </div>
              <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 sm:max-w-sm">
                <Search size={17} className="shrink-0 text-slate-400" />
                <input
                  value={filterText}
                  onChange={event => setFilterText(event.target.value)}
                  placeholder="Buscar por nombre, apellido o DNI…"
                  aria-label="Buscar personas"
                  className="min-w-0 flex-1 bg-transparent py-3 text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
                {filterText && <button type="button" onClick={() => setFilterText('')} aria-label="Limpiar búsqueda" className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-slate-700"><X size={15} /></button>}
              </div>
            </div>
          </section>

          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <p className="text-xs font-semibold text-slate-500">{loading ? 'Cargando registros…' : `${filteredStudents.length} ${filteredStudents.length === 1 ? personLabel : `${personLabel}${personLabel.endsWith('s') ? '' : 's'}`}${filterText ? ' encontrados' : ' activos'}`}</p>
            <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-400"><ShieldAlert size={13} /> Información sensible</p>
          </div>

          {loadError && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{loadError}</div>}

          {loading ? (
            <div className="flex items-center justify-center gap-3 rounded-3xl border border-slate-200 bg-white py-16 text-sm font-semibold text-slate-500"><RefreshCw size={18} className="animate-spin" /> Cargando fichas médicas…</div>
          ) : filteredStudents.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Search size={22} /></div>
              <h2 className="font-extrabold text-slate-800">{filterText ? 'No encontramos resultados' : 'Todavía no hay fichas disponibles'}</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{filterText ? 'Probá con otro nombre, apellido o DNI.' : 'Cuando haya personas activas con fichas cargadas, van a aparecer acá.'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredStudents.map(student => {
                const cud = checkCudStatus(student.cudExpiration);
                const hasAllergies = Boolean(String(student.allergies || '').trim());
                const hasAlert = cud.status === 'expired' || cud.status === 'warning' || hasAllergies;
                const initials = `${student.firstName?.[0] || ''}${student.lastName?.[0] || ''}`.trim() || '?';
                const age = calculateAge(student.birthDate || student.fechaNac);
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => selectStudent(student)}
                    className={`group min-w-0 rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${hasAlert ? 'border-amber-200 hover:border-amber-300' : 'border-slate-200 hover:border-slate-300'}`}
                    style={{ '--tw-ring-color': `${primaryColor}55` }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-100 text-sm font-black text-slate-600">
                        {student.photoUrl ? <img src={student.photoUrl} alt="" className="h-full w-full object-cover" /> : initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-extrabold text-slate-800">{student.lastName || 'Sin apellido'}, {student.firstName || 'Sin nombre'}</h3>
                        <p className="mt-1 text-xs text-slate-500">DNI: {student.dni || 'Sin cargar'}{age === null ? '' : ` · ${age} años`}</p>
                        <p className="mt-1 truncate text-xs text-slate-400">{student.healthInsurance || 'Sin cobertura declarada'}</p>
                      </div>
                      <ArrowLeft size={16} className="mt-1 rotate-180 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {cud.status !== 'none' && <StatusBadge status={cud.status}>CUD: {cud.text}</StatusBadge>}
                      {hasAllergies && <StatusBadge status="warning">Revisar alergias</StatusBadge>}
                      {!hasAlert && <StatusBadge status="ok">Sin alertas destacadas</StatusBadge>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <header className="p-5 text-white sm:p-6" style={{ background: `linear-gradient(115deg, ${primaryColor}, ${secondaryColor})` }}>
            <button type="button" onClick={returnToList} className="mb-5 inline-flex items-center gap-2 rounded-lg px-2 py-1 text-xs font-extrabold text-white/85 transition hover:bg-white/10 hover:text-white">
              <ArrowLeft size={15} /> Volver a las fichas
            </button>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/15 text-lg font-black">
                  {selectedStudent.photoUrl ? <img src={selectedStudent.photoUrl} alt="" className="h-full w-full object-cover" /> : `${selectedStudent.firstName?.[0] || ''}${selectedStudent.lastName?.[0] || ''}` || '?'}
                </div>
                <div className="min-w-0">
                  <h1 className="break-words text-xl font-black sm:text-2xl">{selectedStudent.lastName || 'Sin apellido'}, {selectedStudent.firstName || 'Sin nombre'}</h1>
                  <p className="mt-1 text-xs font-semibold text-white/80">DNI: {selectedStudent.dni || 'Sin cargar'}{calculateAge(selectedStudent.birthDate || selectedStudent.fechaNac) === null ? '' : ` · ${calculateAge(selectedStudent.birthDate || selectedStudent.fechaNac)} años`}</p>
                  <p className="mt-1 text-xs font-medium text-white/75">Ficha médica confidencial</p>
                </div>
              </div>
              <button type="button" onClick={() => printClinicalHistory(selectedStudent)} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white px-4 py-3 text-sm font-extrabold shadow-sm transition hover:bg-slate-50" style={{ color: primaryColor }}>
                <Printer size={17} /> Imprimir ficha
              </button>
            </div>
          </header>

          <div className="space-y-5 bg-slate-50 p-4 sm:p-6">
            {feedback && (
              <div role={feedback.type === 'error' ? 'alert' : 'status'} className={`flex items-start gap-2 rounded-xl border px-4 py-3 text-sm font-semibold ${feedback.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
                {feedback.type === 'error' ? <AlertTriangle size={17} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={17} className="mt-0.5 shrink-0" />}
                <span className="flex-1">{feedback.text}</span>
                <button type="button" onClick={() => setFeedback(null)} aria-label="Cerrar mensaje"><X size={15} /></button>
              </div>
            )}
            {printError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{printError}</div>}

            {!isEditing ? (
              <>
                {(selectedStudent.allergies || checkCudStatus(selectedStudent.cudExpiration).status === 'expired') && (
                  <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
                    <h2 className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-wider text-red-800"><AlertTriangle size={16} /> Alertas para revisar</h2>
                    {selectedStudent.allergies && <p className="text-sm font-semibold text-red-800">Alergias declaradas: <span className="font-medium">{selectedStudent.allergies}</span></p>}
                    {checkCudStatus(selectedStudent.cudExpiration).status === 'expired' && <p className="mt-1 text-sm font-semibold text-red-800">CUD vencido: {formatDate(selectedStudent.cudExpiration)}</p>}
                  </section>
                )}

                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="font-extrabold text-slate-900">Datos médicos de base</h2>
                      <p className="mt-1 text-xs text-slate-500">Información registrada para la consulta del equipo autorizado.</p>
                    </div>
                    <button type="button" onClick={() => { setFeedback(null); setIsEditing(true); }} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-extrabold text-slate-700 transition hover:bg-slate-50">
                      <Edit3 size={15} /> Editar datos
                    </button>
                  </div>
                  <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Obra social o cobertura" value={selectedStudent.healthInsurance} />
                    <div><p className="mb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Vencimiento CUD</p><p className="mb-2 text-sm font-bold text-slate-800">{formatDate(selectedStudent.cudExpiration)}</p><StatusBadge status={checkCudStatus(selectedStudent.cudExpiration).status}>{checkCudStatus(selectedStudent.cudExpiration).text}</StatusBadge></div>
                    <Field label="Diagnóstico consignado" value={selectedStudent.cudDiagnosis} />
                    <Field label="Alergias declaradas" value={selectedStudent.allergies} emphasis={Boolean(selectedStudent.allergies)} />
                    <Field label="Medicación habitual" value={selectedStudent.medication} />
                    <Field label="Peso registrado" value={selectedStudent.weight ? `${selectedStudent.weight} kg` : ''} />
                    <Field label="Vacunación" value={selectedStudent.vaccines} />
                    <Field label="Última actualización médica" value={selectedStudent.medicalUpdatedAt ? formatDate(selectedStudent.medicalUpdatedAt) : ''} />
                  </div>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}><FileText size={19} /></div>
                      <div><h2 className="font-extrabold text-slate-900">Evoluciones médicas</h2><p className="mt-0.5 text-xs text-slate-500">{selectedStudent.medicalEvolutions?.length || 0} registros</p></div>
                    </div>
                    <button type="button" onClick={() => { setFeedback(null); setShowEvoForm(value => !value); }} className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold text-white shadow-sm transition hover:brightness-95" style={{ backgroundColor: primaryColor }}>
                      {showEvoForm ? <X size={15} /> : <Plus size={15} />}{showEvoForm ? 'Cancelar registro' : 'Nueva evolución'}
                    </button>
                  </div>

                  {showEvoForm && (
                    <form onSubmit={handleAddEvolution} className="mb-5 space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[200px_1fr]">
                        <label className="block text-xs font-extrabold text-slate-600">Fecha del registro
                          <input type="date" name="date" defaultValue={new Date().toLocaleDateString('en-CA')} required className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-slate-400" />
                        </label>
                        <label className="block text-xs font-extrabold text-slate-600">Detalle clínico
                          <textarea name="text" required rows={4} maxLength={10000} placeholder="Registrá la consulta, indicaciones o seguimiento…" className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium leading-relaxed text-slate-700 outline-none focus:border-slate-400" />
                        </label>
                      </div>
                      <div className="flex justify-end">
                        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-xs font-extrabold text-white disabled:opacity-60" style={{ backgroundColor: primaryColor }}>
                          {saving ? <RefreshCw size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}{saving ? 'Guardando…' : 'Guardar evolución'}
                        </button>
                      </div>
                    </form>
                  )}

                  {!(selectedStudent.medicalEvolutions || []).length ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
                      <Activity size={22} className="mx-auto mb-2 text-slate-300" />
                      <p className="text-sm font-bold text-slate-700">Todavía no hay evoluciones</p>
                      <p className="mt-1 text-xs text-slate-500">Los registros que agregues van a aparecer en esta sección.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[...(selectedStudent.medicalEvolutions || [])].sort((a, b) => (parseDate(b.date)?.getTime() || 0) - (parseDate(a.date)?.getTime() || 0)).map(evolution => (
                        <article key={evolution.id} className="group relative rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300">
                          <div className="mb-2 flex flex-wrap items-center gap-2 pr-8">
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold text-slate-600"><CalendarDays size={12} />{formatDate(evolution.date)}</span>
                            <span className="text-[11px] font-bold text-slate-400">Registró: {evolution.author || 'Usuario'}</span>
                          </div>
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700">{evolution.text}</p>
                          <button type="button" onClick={() => handleDeleteEvolution(evolution)} disabled={saving} className="absolute right-3 top-3 rounded-lg p-2 text-slate-300 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-40 sm:opacity-0 sm:group-hover:opacity-100" title="Eliminar evolución" aria-label="Eliminar evolución"><Trash2 size={15} /></button>
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              </>
            ) : (
              <form onSubmit={handleSaveMedicalData} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                  <div><h2 className="font-extrabold text-slate-900">Editar datos médicos</h2><p className="mt-1 text-xs text-slate-500">Guardá únicamente información que corresponda al registro institucional.</p></div>
                  <button type="button" onClick={() => setIsEditing(false)} aria-label="Cancelar edición" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><X size={18} /></button>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-extrabold text-slate-600">Obra social o cobertura
                    <input name="healthInsurance" defaultValue={selectedStudent.healthInsurance || ''} maxLength={200} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400" />
                  </label>
                  <label className="block text-xs font-extrabold text-slate-600">Vencimiento del CUD
                    <input type="date" name="cudExpiration" defaultValue={selectedStudent.cudExpiration || ''} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400" />
                  </label>
                </div>
                <label className="block text-xs font-extrabold text-slate-600">Diagnóstico consignado en el CUD / médico
                  <textarea name="cudDiagnosis" defaultValue={selectedStudent.cudDiagnosis || ''} maxLength={5000} rows={3} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400" />
                </label>
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                  <label className="block text-xs font-extrabold text-amber-900">Alergias declaradas
                    <textarea name="allergies" defaultValue={selectedStudent.allergies || ''} maxLength={2000} rows={2} placeholder="Detallá alergias conocidas o dejá vacío si no hay información registrada." className="mt-1.5 w-full resize-y rounded-xl border border-amber-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none focus:border-amber-400" />
                  </label>
                </div>
                <label className="block text-xs font-extrabold text-slate-600">Medicación habitual / indicaciones registradas
                  <textarea name="medication" defaultValue={selectedStudent.medication || ''} maxLength={5000} rows={3} className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400" />
                </label>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block text-xs font-extrabold text-slate-600">Peso (kg)
                    <input name="weight" type="number" min="0" max="500" step="0.1" defaultValue={selectedStudent.weight || ''} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400" />
                  </label>
                  <label className="block text-xs font-extrabold text-slate-600">Vacunación
                    <select name="vaccines" defaultValue={selectedStudent.vaccines || ''} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 outline-none focus:border-slate-400">
                      <option value="">Sin información</option>
                      <option value="Completas">Completas</option>
                      <option value="Incompletas">Incompletas</option>
                      <option value="No presenta libreta">No presenta libreta</option>
                    </select>
                  </label>
                </div>
                <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
                  <button type="button" onClick={() => setIsEditing(false)} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
                  <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold text-white disabled:opacity-60" style={{ backgroundColor: primaryColor }}>
                    {saving ? <RefreshCw size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}{saving ? 'Guardando…' : 'Guardar datos'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
