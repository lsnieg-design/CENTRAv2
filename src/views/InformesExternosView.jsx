import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Printer,
  Save,
  X,
  FileText,
  User,
  HelpCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Building2,
  Info,
} from 'lucide-react';
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { COLLECTIONS } from '../data/collections';

const SAFE_DEFAULT_PRIMARY = '#6d28d9';
const SAFE_DEFAULT_SECONDARY = '#f97316';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeColor(value, fallback) {
  const candidate = String(value || '').trim();
  return /^#[0-9a-f]{3,8}$/i.test(candidate) ? candidate : fallback;
}

function safeImageUrl(value) {
  const url = String(value || '').trim();
  if (/^https:\/\//i.test(url) || /^http:\/\//i.test(url) || /^\//.test(url)) {
    return url;
  }
  if (/^data:image\/(png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(url)) {
    return url;
  }
  return '';
}

function formatDate(value) {
  if (!value) return '';
  const raw = String(value);
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T12:00:00` : raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function normalizeSearchText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es-AR')
    .replace(/\s+/g, ' ')
    .trim();
}

function getStudentName(student = {}) {
  const lastName = student.lastName || student.apellido || student.apellidos || '';
  const firstName = student.firstName || student.nombre || student.nombres || '';
  const orderedName = [lastName, firstName].filter(Boolean).join(', ');
  return orderedName || student.fullName || student.displayName || student.name || 'Persona sin nombre cargado';
}

function getStudentDni(student = {}) {
  return String(student.dni || student.documentNumber || student.identificationNumber || student.numeroDocumento || '').trim();
}

function getStudentIdentity(student = {}) {
  const dni = normalizeSearchText(getStudentDni(student)).replace(/[^a-z0-9]/g, '');
  return dni ? `dni:${dni}` : '';
}

function getStudentSearchText(student = {}) {
  return normalizeSearchText([
    student.lastName, student.apellido, student.apellidos,
    student.firstName, student.nombre, student.nombres,
    student.fullName, student.displayName, student.name,
    getStudentName(student), getStudentDni(student),
    student.personId, student.id,
  ].filter(Boolean).join(' '));
}

function buildInstitutionContact(config = {}) {
  const location = [config.address, config.city, config.province, config.country]
    .map(value => String(value || '').trim())
    .filter(Boolean);
  return {
    location: [...new Set(location)].join(' · '),
    phone: String(config.phone || '').trim(),
    email: String(config.email || '').trim(),
    website: String(config.website || '').trim(),
  };
}

function buildPrintDocument({ student, report, config = {} }) {
  const institutionName = config.institutionName || config.institutionShortName || 'Institución';
  const subtitle = config.institutionDescription || config.institutionType || config.portalTitle || '';
  const primary = safeColor(config.primaryColor, SAFE_DEFAULT_PRIMARY);
  const secondary = safeColor(config.secondaryColor, SAFE_DEFAULT_SECONDARY);
  const documentConfig = config.document || {};
  const logoUrl = documentConfig.showLogo === false ? '' : safeImageUrl(config.logoUrl);
  const contact = buildInstitutionContact(config);
  const issuedDate = new Date().toLocaleDateString('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const studentName = getStudentName(student);
  const group = student.groupMorning || student.groupAfternoon || student.laboralGroup || student.group || student.level || '';
  const birthDate = student.birthDate || student.fechaNac || '';
  const configuredHeader = String(documentConfig.header || '').trim();
  const configuredFooter = String(documentConfig.footer || '').trim();
  const signatureName = String(documentConfig.signatureName || '').trim();
  const signatureRole = String(documentConfig.signatureRole || '').trim();

  const contactParts = [
    contact.location,
    contact.phone ? `Tel. ${contact.phone}` : '',
    contact.email,
    contact.website,
  ].filter(Boolean);

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Informe externo - ${escapeHtml(studentName)}</title>
  <style>
    @page { size: A4; margin: 18mm 18mm 20mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; color: #182230; background: #fff; font-family: Arial, Helvetica, sans-serif; }
    body { font-size: 11pt; line-height: 1.55; }
    .document { width: 100%; margin: 0 auto; }
    .header { display: flex; align-items: center; gap: 16px; padding-bottom: 18px; border-bottom: 3px solid ${primary}; margin-bottom: 24px; }
    .logo { width: 76px; height: 76px; object-fit: contain; flex: 0 0 auto; }
    .brand { flex: 1; min-width: 0; }
    .institution { margin: 0; color: ${primary}; font-size: 17pt; font-weight: 800; text-transform: uppercase; letter-spacing: .03em; overflow-wrap: anywhere; }
    .subtitle { margin-top: 5px; color: #667085; font-size: 9pt; }
    .document-title { margin: 0; text-align: right; font-size: 13pt; color: #243043; text-transform: uppercase; letter-spacing: .06em; }
    .issued { text-align: right; margin-top: 8px; color: ${secondary}; font-size: 9pt; font-weight: 700; }
    .custom-header { margin: 0 0 18px; color: #374151; white-space: pre-wrap; }
    .section { border: 1px solid #d8dee8; border-radius: 8px; padding: 14px 16px; margin: 0 0 16px; page-break-inside: avoid; }
    .section-title { margin: 0 0 12px; padding-bottom: 7px; border-bottom: 1px solid ${primary}33; color: ${primary}; font-size: 9pt; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
    .student-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 20px; }
    .field-label { color: #667085; font-size: 8.5pt; display: block; margin-bottom: 2px; }
    .field-value { color: #1f2937; font-weight: 700; overflow-wrap: anywhere; }
    .recipient { font-weight: 700; color: #1f2937; }
    .body-copy { min-height: 80px; white-space: pre-wrap; overflow-wrap: anywhere; }
    .signature-block { display: flex; justify-content: flex-end; margin-top: 55px; page-break-inside: avoid; }
    .signature { width: 240px; text-align: center; border-top: 1px solid #111827; padding-top: 8px; }
    .signature-name { display: block; font-weight: 800; font-size: 10pt; }
    .signature-role { display: block; font-size: 9pt; color: #475467; margin-top: 3px; }
    .footer { border-top: 1px solid ${primary}; color: #596273; text-align: center; padding-top: 10px; margin-top: 36px; font-size: 8pt; white-space: pre-wrap; }
    .footer-name { font-weight: 800; text-transform: uppercase; color: ${primary}; margin-bottom: 4px; }
    @media print { .section, .header, .signature-block { break-inside: avoid; } }
    @media screen { body { padding: 16mm; max-width: 210mm; margin: auto; box-shadow: 0 2px 18px #0001; } }
  </style>
</head>
<body>
  <main class="document">
    <header class="header">
      ${logoUrl ? `<img src="${escapeHtml(logoUrl)}" alt="Logo de ${escapeHtml(institutionName)}" class="logo" />` : ''}
      <div class="brand">
        <h1 class="institution">${escapeHtml(institutionName)}</h1>
        ${subtitle ? `<div class="subtitle">${escapeHtml(subtitle)}</div>` : ''}
      </div>
      <div>
        <h2 class="document-title">Informe profesional externo</h2>
        <div class="issued">Emitido el ${escapeHtml(issuedDate)}</div>
      </div>
    </header>

    ${configuredHeader ? `<p class="custom-header">${escapeHtml(configuredHeader)}</p>` : ''}

    <section class="section">
      <h3 class="section-title">Datos de la persona</h3>
      <div class="student-grid">
        <div><span class="field-label">Apellido y nombre</span><span class="field-value">${escapeHtml(studentName)}</span></div>
        <div><span class="field-label">DNI</span><span class="field-value">${escapeHtml(getStudentDni(student) || 'No consignado')}</span></div>
        <div><span class="field-label">Fecha de nacimiento</span><span class="field-value">${escapeHtml(birthDate ? formatDate(birthDate) : 'No consignada')}</span></div>
        <div><span class="field-label">Grupo / nivel</span><span class="field-value">${escapeHtml(group || 'No consignado')}</span></div>
      </div>
    </section>

    <section class="section">
      <h3 class="section-title">Destinatario</h3>
      <div class="recipient">${escapeHtml(report.paraQuien)}</div>
    </section>

    <section>
      <h3 class="section-title">Desarrollo del informe</h3>
      <div class="body-copy">${escapeHtml(report.cuerpoInforme)}</div>
    </section>

    <div class="signature-block">
      <div class="signature">
        ${signatureName ? `<span class="signature-name">${escapeHtml(signatureName)}</span>` : ''}
        <span class="signature-role">${escapeHtml(signatureRole || 'Firma y aclaración')}</span>
      </div>
    </div>

    <footer class="footer">
      <div class="footer-name">${escapeHtml(institutionName)}</div>
      ${contactParts.length ? `<div>${contactParts.map(escapeHtml).join(' · ')}</div>` : ''}
      ${configuredFooter ? `<div>${escapeHtml(configuredFooter)}</div>` : ''}
    </footer>
  </main>
</body>
</html>`;
}

export function InformesExternosView({ user, db, appId, appConfig = {} }) {
  const [stage, setStage] = useState('main');
  const [searchTerm, setSearchTerm] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [paraQuien, setParaQuien] = useState('');
  const [cuerpoInforme, setCuerpoInforme] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingStudents, setIsLoadingStudents] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [feedback, setFeedback] = useState(null);

  const institutionName = appConfig.institutionShortName || appConfig.institutionName || 'Mi institución';
  const primaryColor = safeColor(appConfig.primaryColor, SAFE_DEFAULT_PRIMARY);
  const secondaryColor = safeColor(appConfig.secondaryColor, SAFE_DEFAULT_SECONDARY);
  const logoUrl = appConfig.logoUrl || '';
  const personLabel = appConfig.labels?.person || 'persona';

  useEffect(() => {
    if (!db || !appId) {
      setIsLoadingStudents(false);
      setLoadError('No se pudo conectar con la base de datos institucional.');
      return undefined;
    }

    setIsLoadingStudents(true);
    setLoadError('');

    // CENTRA guarda los legajos nuevos en people + student_profiles.
    // También leemos students para mantener compatibilidad con registros antiguos.
    let people = [];
    let profiles = [];
    let legacyStudents = [];
    let latestMergedRecords = [];
    const pendingSources = new Set(['people', 'profiles', 'legacy']);
    const sourceErrors = [];
    const unsubscribers = [];

    const rebuildStudents = () => {
      const peopleById = new Map(people.map(person => [person.id, person]));
      const profileIds = new Set();

      const profileStudents = profiles.map(profile => {
        const personId = profile.personId || profile.id;
        const person = peopleById.get(personId) || peopleById.get(profile.id) || {};
        if (personId) profileIds.add(personId);
        return {
          ...person,
          ...profile,
          id: personId || profile.id || person.id,
          personId: personId || person.id || profile.id,
          firstName: profile.firstName || profile.nombre || person.firstName || person.nombre || '',
          lastName: profile.lastName || profile.apellido || profile.apellidos || person.lastName || person.apellido || person.apellidos || '',
          fullName: profile.fullName || profile.displayName || person.fullName || person.displayName ||
            [profile.firstName || person.firstName || '', profile.lastName || person.lastName || ''].filter(Boolean).join(' '),
          dni: getStudentDni(profile) || getStudentDni(person),
          isActive: profile.isActive ?? person.isActive ?? person.active ?? true,
        };
      });

      // Si hay una persona marcada como estudiante pero todavía no tiene perfil,
      // también la mostramos para no ocultar un legajo incompleto.
      const peopleWithoutProfile = people
        .filter(person => person.id && !profileIds.has(person.id))
        .map(person => ({
          ...person,
          id: person.id,
          personId: person.id,
          firstName: person.firstName || person.nombre || '',
          lastName: person.lastName || person.apellido || person.apellidos || '',
          fullName: person.fullName || person.displayName ||
            [person.firstName || person.nombre || '', person.lastName || person.apellido || person.apellidos || ''].filter(Boolean).join(' '),
          dni: getStudentDni(person),
          isActive: person.isActive ?? person.active ?? true,
        }));

      const combined = [...profileStudents, ...peopleWithoutProfile];
      const identityKeys = new Set(
        combined.map(getStudentIdentity).filter(Boolean)
      );
      const idKeys = new Set(
        combined.flatMap(student => [student.id, student.personId]).filter(Boolean)
      );

      legacyStudents.forEach(student => {
        const legacyId = student.id || student.personId;
        const identity = getStudentIdentity(student);
        if ((legacyId && idKeys.has(legacyId)) || (identity && identityKeys.has(identity))) return;
        combined.push({
          ...student,
          firstName: student.firstName || student.nombre || student.nombres || '',
          lastName: student.lastName || student.apellido || student.apellidos || '',
          dni: getStudentDni(student),
          isActive: student.isActive ?? student.active ?? true,
        });
        if (legacyId) idKeys.add(legacyId);
        if (identity) identityKeys.add(identity);
      });

      latestMergedRecords = combined.sort((a, b) =>
        getStudentName(a).localeCompare(getStudentName(b), 'es-AR')
      );
      setStudents(latestMergedRecords);

      if (latestMergedRecords.length > 0) {
        setLoadError('');
      }
    };

    const finishSource = source => {
      pendingSources.delete(source);
      if (pendingSources.size === 0) {
        setIsLoadingStudents(false);
        const coreError = sourceErrors.find(item => item.source === 'people' || item.source === 'profiles');
        if (latestMergedRecords.length === 0 && coreError) {
          setLoadError('No pudimos leer los legajos desde Firestore. Revisá la conexión y los permisos de lectura.');
        }
      }
    };

    const handleSourceError = (source, error) => {
      console.error(`No se pudo cargar la fuente ${source} para Informes Externos:`, error);
      sourceErrors.push({ source, error });
      finishSource(source);
    };

    unsubscribers.push(onSnapshot(
      query(
        collection(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.PEOPLE),
        where('type', '==', 'student')
      ),
      snapshot => {
        people = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
        rebuildStudents();
        finishSource('people');
      },
      error => handleSourceError('people', error)
    ));

    unsubscribers.push(onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.STUDENT_PROFILES),
      snapshot => {
        profiles = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
        rebuildStudents();
        finishSource('profiles');
      },
      error => handleSourceError('profiles', error)
    ));

    unsubscribers.push(onSnapshot(
      collection(db, 'artifacts', appId, 'public', 'data', 'students'),
      snapshot => {
        legacyStudents = snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
        rebuildStudents();
        finishSource('legacy');
      },
      error => {
        // La colección legacy es opcional: puede no existir o estar retirada.
        console.warn('No se pudieron consultar legajos antiguos para Informes Externos:', error);
        finishSource('legacy');
      }
    ));

    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  }, [db, appId]);

  const filteredStudents = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchTerm);
    if (!normalizedSearch) return [];
    return students
      .filter(student => getStudentSearchText(student).includes(normalizedSearch))
      .slice(0, 30);
  }, [students, searchTerm]);

  const handleSelectStudent = student => {
    setSelectedStudent(student);
    setParaQuien('');
    setCuerpoInforme('');
    setFeedback(null);
    setStage('form');
  };

  const validateReport = () => {
    if (!selectedStudent) {
      setFeedback({ type: 'error', message: 'Primero seleccioná una persona.' });
      return false;
    }
    if (!paraQuien.trim() || !cuerpoInforme.trim()) {
      setFeedback({ type: 'error', message: 'Completá el destinatario y el desarrollo del informe antes de continuar.' });
      return false;
    }
    return true;
  };

  const handlePrint = () => {
    if (!validateReport()) return;

    const html = buildPrintDocument({
      student: selectedStudent,
      report: { paraQuien: paraQuien.trim(), cuerpoInforme: cuerpoInforme.trim() },
      config: appConfig,
    });

    const frame = document.createElement('iframe');
    frame.title = 'Documento para imprimir';
    frame.setAttribute('aria-hidden', 'true');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    frame.style.opacity = '0';
    document.body.appendChild(frame);

    const printDocument = frame.contentDocument || frame.contentWindow?.document;
    const printWindow = frame.contentWindow;
    if (!printDocument || !printWindow) {
      frame.remove();
      setFeedback({ type: 'error', message: 'No se pudo preparar la impresión. Intentá nuevamente.' });
      return;
    }

    let removed = false;
    const cleanup = () => {
      if (removed) return;
      removed = true;
      frame.remove();
    };

    printWindow.addEventListener('afterprint', cleanup, { once: true });
    printDocument.open();
    printDocument.write(html);
    printDocument.close();

    window.setTimeout(() => {
      try {
        printWindow.focus();
        printWindow.print();
        setFeedback({ type: 'success', message: 'Documento preparado para imprimir o guardar como PDF.' });
      } catch (error) {
        console.error('No se pudo imprimir el informe externo:', error);
        setFeedback({ type: 'error', message: 'El navegador no pudo abrir la impresión. Revisá si permite ventanas de impresión.' });
        cleanup();
      }
    }, 350);
  };

  const handleSave = async () => {
    if (!validateReport()) return;
    if (!db || !appId) {
      setFeedback({ type: 'error', message: 'No hay conexión con la base de datos institucional.' });
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'external_reports'), {
        studentId: selectedStudent.id,
        studentName: getStudentName(selectedStudent),
        studentDni: getStudentDni(selectedStudent),
        paraQuien: paraQuien.trim(),
        cuerpoInforme: cuerpoInforme.trim(),
        institutionName,
        createdById: user?.id || null,
        createdByName: user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Usuario',
        fechaCreacion: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      setFeedback({ type: 'success', message: 'El informe quedó guardado en la base de datos institucional.' });
    } catch (error) {
      console.error('Error guardando informe externo:', error);
      setFeedback({ type: 'error', message: 'No se pudo guardar el informe. Revisá tu conexión o tus permisos e intentá nuevamente.' });
    } finally {
      setIsSaving(false);
    }
  };

  const returnToSearch = () => {
    setStage('main');
    setSelectedStudent(null);
    setParaQuien('');
    setCuerpoInforme('');
    setFeedback(null);
  };

  const buttonPrimaryStyle = { backgroundColor: primaryColor };
  const accentBorderStyle = { borderColor: `${primaryColor}35` };

  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 px-3 pb-24 pt-4 sm:px-5 animate-in fade-in">
      <header className="overflow-hidden rounded-3xl border bg-white shadow-sm" style={accentBorderStyle}>
        <div className="h-1.5" style={{ background: `linear-gradient(90deg, ${primaryColor}, ${secondaryColor})` }} />
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7">
          <div className="flex min-w-0 items-center gap-4">
            {logoUrl ? (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-100 bg-white p-2 sm:h-16 sm:w-16">
                <img src={logoUrl} alt={`Logo de ${institutionName}`} className="h-full w-full object-contain" />
              </div>
            ) : (
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-white sm:h-16 sm:w-16" style={buttonPrimaryStyle}>
                <FileText size={26} aria-hidden="true" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: primaryColor }}>{institutionName}</p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Informes externos</h1>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-slate-500">Redactá, guardá e imprimí informes formales para profesionales y organismos externos.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 sm:self-center">
            <Building2 size={15} className="shrink-0" />
            Documento institucional
          </div>
        </div>
      </header>

      {feedback && (
        <div role="status" className={`flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm ${feedback.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          {feedback.type === 'error' ? <AlertCircle size={18} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={18} className="mt-0.5 shrink-0" />}
          <p className="flex-1 leading-relaxed">{feedback.message}</p>
          <button type="button" onClick={() => setFeedback(null)} className="rounded-lg p-1 opacity-70 hover:opacity-100" aria-label="Cerrar mensaje"><X size={15} /></button>
        </div>
      )}

      {stage === 'main' ? (
        <>
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm"><HelpCircle size={18} /></div>
              <div>
                <h2 className="text-sm font-extrabold text-slate-800">¿Cómo funciona?</h2>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">Buscá a la persona, completá el destinatario y redactá el informe. Después podés guardarlo en CENTRA o imprimirlo y elegir “Guardar como PDF”. El membrete toma los datos disponibles en Configuración.</p>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <label htmlFor="external-report-student-search" className="mb-2 block text-sm font-extrabold text-slate-800">1. Buscar persona</label>
            <div className="relative">
              <Search size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <input
                id="external-report-student-search"
                type="search"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3.5 pl-11 pr-4 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
                style={{ '--tw-ring-color': primaryColor }}
                placeholder={`Buscar por nombre, apellido o DNI de ${personLabel.toLocaleLowerCase('es')}…`}
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                autoComplete="off"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400" aria-live="polite">
              <span>{isLoadingStudents ? 'Conectando con los legajos…' : `${students.length} legajo${students.length === 1 ? '' : 's'} disponible${students.length === 1 ? '' : 's'}`}</span>
              {!isLoadingStudents && students.length > 0 && searchTerm.trim() && <span>{filteredStudents.length} coincidencia{filteredStudents.length === 1 ? '' : 's'}</span>}
            </div>

            {isLoadingStudents ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500"><Loader2 size={18} className="animate-spin" /> Cargando legajos…</div>
            ) : loadError ? (
              <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadError}</div>
            ) : !searchTerm.trim() ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-9 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500"><User size={20} /></div>
                <p className="mt-3 text-sm font-bold text-slate-700">Empezá escribiendo un nombre o DNI</p>
                <p className="mt-1 text-xs text-slate-500">Los resultados van a aparecer acá.</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-200 px-4 py-9 text-center">
                <p className="text-sm font-bold text-slate-700">No encontramos coincidencias</p>
                <p className="mt-1 text-xs text-slate-500">Probá con otro nombre, apellido o DNI.</p>
              </div>
            ) : (
              <div className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100">
                {filteredStudents.map(student => (
                  <div key={student.id} className="flex flex-col gap-3 p-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><User size={19} /></div>
                      <div className="min-w-0">
                        <p className="break-words text-sm font-extrabold text-slate-800">{getStudentName(student)}</p>
                        <p className="mt-1 text-xs text-slate-500">DNI: {getStudentDni(student) || 'No consignado'}{student.level ? ` · ${student.level}` : ''}</p>
                        {student.isActive === false && <p className="mt-1 text-[11px] font-semibold text-amber-700">Legajo inactivo</p>}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSelectStudent(student)}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-extrabold text-white transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-offset-2"
                      style={buttonPrimaryStyle}
                    >
                      Redactar informe <ArrowRight size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {filteredStudents.length === 30 && <p className="mt-3 text-xs text-slate-400">Se muestran hasta 30 resultados. Afiná la búsqueda para encontrar otra persona.</p>}
          </section>
        </>
      ) : (
        <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-7">
          <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <button type="button" onClick={returnToSearch} className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50">
              <ArrowLeft size={16} /> Volver a la búsqueda
            </button>
            <span className="inline-flex items-center gap-2 self-start rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-slate-600 sm:self-center"><FileText size={13} /> Nuevo informe</span>
          </div>

          <div className="rounded-2xl border p-4 sm:p-5" style={{ backgroundColor: `${primaryColor}08`, borderColor: `${primaryColor}25` }}>
            <p className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: primaryColor }}>2. Persona seleccionada</p>
            <h2 className="mt-1 break-words text-xl font-black text-slate-900">{getStudentName(selectedStudent)}</h2>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>DNI: {getStudentDni(selectedStudent) || 'No consignado'}</span>
              <span>Fecha de nacimiento: {formatDate(selectedStudent?.birthDate || selectedStudent?.fechaNac) || 'No consignada'}</span>
              {(selectedStudent?.level || selectedStudent?.groupMorning || selectedStudent?.groupAfternoon || selectedStudent?.laboralGroup) && (
                <span>Grupo / nivel: {selectedStudent.level || selectedStudent.groupMorning || selectedStudent.groupAfternoon || selectedStudent.laboralGroup}</span>
              )}
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label htmlFor="external-report-recipient" className="mb-2 block text-sm font-extrabold text-slate-800">3. Destinatario del informe <span className="text-red-500">*</span></label>
              <input
                id="external-report-recipient"
                type="text"
                required
                maxLength={200}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                placeholder="Ej.: profesional tratante, obra social u organismo…"
                value={paraQuien}
                onChange={event => setParaQuien(event.target.value)}
              />
            </div>

            <div>
              <div className="mb-2 flex items-end justify-between gap-3">
                <label htmlFor="external-report-body" className="block text-sm font-extrabold text-slate-800">4. Desarrollo del informe <span className="text-red-500">*</span></label>
                <span className="text-[11px] text-slate-400">{cuerpoInforme.length} caracteres</span>
              </div>
              <textarea
                id="external-report-body"
                required
                maxLength={20000}
                rows={13}
                className="w-full resize-y rounded-xl border border-slate-200 px-4 py-3 text-sm leading-relaxed outline-none transition focus:border-slate-400"
                placeholder="Redactá el informe. El texto y los saltos de línea se van a conservar en la impresión."
                value={cuerpoInforme}
                onChange={event => setCuerpoInforme(event.target.value)}
              />
              <p className="mt-2 flex items-start gap-2 text-xs leading-relaxed text-slate-500"><Info size={14} className="mt-0.5 shrink-0" /> Antes de imprimir, revisá los datos personales y el contenido. El membrete toma logo, nombre, datos institucionales y firma desde Configuración.</p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !paraQuien.trim() || !cuerpoInforme.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-5 py-3 text-sm font-extrabold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSaving ? <Loader2 size={17} className="animate-spin" /> : <Save size={17} />}
              {isSaving ? 'Guardando…' : 'Guardar en CENTRA'}
            </button>
            <button
              type="button"
              onClick={handlePrint}
              disabled={!paraQuien.trim() || !cuerpoInforme.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
              style={buttonPrimaryStyle}
            >
              <Printer size={17} /> Imprimir / Guardar PDF
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
