import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Search,
  Users,
  Briefcase,
  FileText,
  GraduationCap,
  CalendarDays,
  Printer,
  ChevronRight,
  Check,
  CheckSquare,
  Square,
  X,
  AlertCircle,
  Info,
  Building2,
  BadgeCheck,
  UserRound,
  ArrowRight,
  Loader2,
  ClipboardCheck,
} from 'lucide-react';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { canAccessModule } from '../config';

const DEFAULT_PRIMARY = '#6d28d9';
const DEFAULT_SECONDARY = '#f97316';

const getLocalDateString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const safeColor = (value, fallback) =>
  typeof value === 'string' && /^#[0-9a-f]{3,8}$/i.test(value) ? value : fallback;

const cleanText = value => String(value ?? '').trim();

const normalizeSearch = value =>
  cleanText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const escapeHtml = value =>
  String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);

const safeImageUrl = value => {
  const url = cleanText(value);
  if (!url) return '';
  if (url.startsWith('/') || /^https:\/\//i.test(url) || /^http:\/\//i.test(url)) return url;
  return '';
};

const formatDate = (value, options = { day: 'numeric', month: 'long', year: 'numeric' }) => {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-AR', options);
};

const getFullName = person =>
  [person?.lastName, person?.firstName].filter(Boolean).join(', ') ||
  cleanText(person?.fullName || person?.name) ||
  'Sin nombre cargado';

const getPersonName = person =>
  [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim() ||
  cleanText(person?.fullName || person?.name) ||
  'Sin nombre cargado';

const getMode = config => config?.institutionMode || 'school';

const getPersonCertificate = mode =>
  mode === 'day_center'
    ? {
        key: 'concurrente',
        label: 'Certificado de concurrente',
        personLabel: 'concurrente',
        description: 'Deja constancia de que una persona concurre a la institución.',
      }
    : {
        key: 'regular',
        label: 'Certificado de estudiante regular',
        personLabel: 'estudiante regular',
        description: 'Deja constancia de la condición de estudiante regular.',
      };

const getMainStaffRole = staff =>
  cleanText(staff?.cargo1_role || staff?.role || staff?.position || staff?.cargo2_role);

const getMainStaffStartDate = staff =>
  cleanText(staff?.cargo1_ingreso || staff?.fechaInicioActividades || staff?.fechaIngreso || staff?.cargo2_ingreso);

const CertificateDocument = ({
  user,
  db,
  appId,
  appConfig = {},
}) => {
  const mode = getMode(appConfig);
  const personModeEnabled = mode === 'school' || mode === 'day_center';
  const personCertificate = getPersonCertificate(mode);
  const primaryColor = safeColor(appConfig.primaryColor, DEFAULT_PRIMARY);
  const secondaryColor = safeColor(appConfig.secondaryColor, DEFAULT_SECONDARY);
  const institutionName = cleanText(appConfig.institutionName || appConfig.institutionShortName) || 'Institución';
  const logoUrl = appConfig.document?.showLogo === false ? '' : safeImageUrl(appConfig.logoUrl);
  const institutionAddress = [appConfig.address, appConfig.city, appConfig.province]
    .map(cleanText)
    .filter(Boolean)
    .join(' · ');
  const contactLine = [appConfig.phone, appConfig.email, appConfig.website]
    .map(cleanText)
    .filter(Boolean)
    .join(' · ');
  const documentConfig = appConfig.document || {};
  const userRole = user?.role || '';
  const canAccess =
    user?.rol === 'admin' ||
    user?.rol === 'super-admin' ||
    canAccessModule(appConfig, userRole, 'admin');

  const [activeSection, setActiveSection] = useState(personModeEnabled ? 'people' : 'staff');
  const [students, setStudents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [selectedPeopleIds, setSelectedPeopleIds] = useState([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [staffCertificateDetails, setStaffCertificateDetails] = useState({});
  const [certificateDate, setCertificateDate] = useState(getLocalDateString);
  const [recipient, setRecipient] = useState('');
  const [generating, setGenerating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (!personModeEnabled && activeSection === 'people') setActiveSection('staff');
  }, [personModeEnabled, activeSection]);

  useEffect(() => {
    if (!db || !appId || !canAccess) return undefined;

    setLoadingStudents(true);
    setLoadError('');
    const studentsQuery = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'students'),
      orderBy('lastName', 'asc')
    );
    const unsubscribe = onSnapshot(
      studentsQuery,
      snapshot => {
        setStudents(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
        setLoadingStudents(false);
      },
      error => {
        console.error('No se pudieron cargar los legajos para certificados:', error);
        setLoadError('No se pudieron cargar los legajos. Revisá los permisos de acceso o la conexión e intentá nuevamente.');
        setLoadingStudents(false);
      }
    );
    return () => unsubscribe();
  }, [db, appId, canAccess]);

  useEffect(() => {
    if (!db || !appId || !canAccess) return undefined;

    setLoadingStaff(true);
    const staffQuery = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'staff_records'),
      orderBy('lastName', 'asc')
    );
    const unsubscribe = onSnapshot(
      staffQuery,
      snapshot => {
        setStaff(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
        setLoadingStaff(false);
      },
      error => {
        console.error('No se pudieron cargar los legajos del personal:', error);
        setLoadError('No se pudo cargar el registro del personal. Revisá los permisos de acceso o la conexión e intentá nuevamente.');
        setLoadingStaff(false);
      }
    );
    return () => unsubscribe();
  }, [db, appId, canAccess]);

  const activeStudents = useMemo(
    () => students.filter(person => person.isActive !== false),
    [students]
  );

  const filteredPeople = useMemo(() => {
    const search = normalizeSearch(searchText);
    if (!search) return activeStudents;
    return activeStudents.filter(person =>
      normalizeSearch([
        person.firstName,
        person.lastName,
        person.fullName,
        person.dni,
        person.level,
        person.section,
        person.group,
        person.healthInsurance,
      ].join(' ')).includes(search)
    );
  }, [activeStudents, searchText]);

  const activeStaff = useMemo(
    () => staff.filter(person => person.isActive !== false && !person.fechaBaja),
    [staff]
  );

  const filteredStaff = useMemo(() => {
    const search = normalizeSearch(searchText);
    if (!search) return activeStaff;
    return activeStaff.filter(person =>
      normalizeSearch([
        person.firstName,
        person.lastName,
        person.fullName,
        person.dni,
        person.cargo1_role,
        person.cargo2_role,
        person.role,
        person.email,
      ].join(' ')).includes(search)
    );
  }, [activeStaff, searchText]);

  const selectedPeople = useMemo(
    () => activeStudents.filter(person => selectedPeopleIds.includes(person.id)),
    [activeStudents, selectedPeopleIds]
  );

  const selectedStaff = useMemo(
    () => activeStaff.filter(person => selectedStaffIds.includes(person.id)),
    [activeStaff, selectedStaffIds]
  );

  const togglePerson = useCallback(personId => {
    setSelectedPeopleIds(previous =>
      previous.includes(personId)
        ? previous.filter(id => id !== personId)
        : [...previous, personId]
    );
    setSuccessMessage('');
  }, []);

  const toggleStaffMember = useCallback(person => {
    setSelectedStaffIds(previous => {
      if (previous.includes(person.id)) return previous.filter(id => id !== person.id);
      return [...previous, person.id];
    });

    setStaffCertificateDetails(previous => ({
      ...previous,
      [person.id]: previous[person.id] || {
        cargo: getMainStaffRole(person),
        startDate: getMainStaffStartDate(person),
      },
    }));
    setSuccessMessage('');
  }, []);

  const visibleIds = activeSection === 'people'
    ? filteredPeople.map(person => person.id)
    : filteredStaff.map(person => person.id);
  const selectedVisibleIds = activeSection === 'people'
    ? visibleIds.filter(id => selectedPeopleIds.includes(id))
    : visibleIds.filter(id => selectedStaffIds.includes(id));
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleIds.length === visibleIds.length;

  const toggleSelectVisible = () => {
    if (activeSection === 'people') {
      if (allVisibleSelected) {
        setSelectedPeopleIds(previous => previous.filter(id => !visibleIds.includes(id)));
      } else {
        setSelectedPeopleIds(previous => [...new Set([...previous, ...visibleIds])]);
      }
      return;
    }

    if (allVisibleSelected) {
      setSelectedStaffIds(previous => previous.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedStaffIds(previous => [...new Set([...previous, ...visibleIds])]);
      setStaffCertificateDetails(previous => {
        const next = { ...previous };
        filteredStaff.forEach(person => {
          if (!next[person.id]) {
            next[person.id] = {
              cargo: getMainStaffRole(person),
              startDate: getMainStaffStartDate(person),
            };
          }
        });
        return next;
      });
    }
    setSuccessMessage('');
  };

  const updateStaffDetail = (staffId, field, value) => {
    setStaffCertificateDetails(previous => ({
      ...previous,
      [staffId]: {
        cargo: previous[staffId]?.cargo ?? getMainStaffRole(staff.find(person => person.id === staffId)),
        startDate: previous[staffId]?.startDate ?? getMainStaffStartDate(staff.find(person => person.id === staffId)),
        ...previous[staffId],
        [field]: value,
      },
    }));
  };

  const buildInstitutionHtml = () => `
    <header class="institution-header">
      ${logoUrl ? `<img class="institution-logo" src="${escapeHtml(logoUrl)}" alt="Logo institucional">` : ''}
      <div class="institution-identity">
        <div class="institution-name">${escapeHtml(institutionName)}</div>
        ${institutionAddress ? `<div class="institution-meta">${escapeHtml(institutionAddress)}</div>` : ''}
        ${contactLine ? `<div class="institution-meta">${escapeHtml(contactLine)}</div>` : ''}
      </div>
    </header>
    ${cleanText(documentConfig.header) ? `<div class="custom-header">${escapeHtml(documentConfig.header)}</div>` : ''}
    <div class="header-rule"></div>
  `;

  const buildSignatureHtml = () => {
    const signatureName = cleanText(documentConfig.signatureName);
    const signatureRole = cleanText(documentConfig.signatureRole);
    return `
      <div class="signature-area">
        <div class="signature-block">
          <div class="signature-line"></div>
          ${signatureName ? `<div class="signature-name">${escapeHtml(signatureName)}</div>` : ''}
          ${signatureRole ? `<div class="signature-role">${escapeHtml(signatureRole)}</div>` : ''}
          <div class="signature-caption">${signatureName || signatureRole ? 'Firma autorizada' : 'Firma y aclaración'}</div>
        </div>
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-caption">Firma y sello institucional</div>
        </div>
      </div>
    `;
  };

  const buildPeopleCertificate = person => {
    const date = new Date(`${certificateDate}T12:00:00`);
    const location = [appConfig.city, appConfig.province].map(cleanText).filter(Boolean).join(', ');
    const datePhrase = `${location ? `${escapeHtml(location)}, ` : ''}${escapeHtml(date.getDate())} de ${escapeHtml(date.toLocaleDateString('es-AR', { month: 'long' }))} de ${escapeHtml(date.getFullYear())}`;
    const personName = escapeHtml(getPersonName(person));
    const dni = escapeHtml(person.dni || 'no informado');
    const personCategory = personCertificate.personLabel;
    const level = cleanText(person.level || person.section || person.group);
    const levelLine = mode === 'school' && level
      ? `<p class="detail-line"><strong>Trayectoria / nivel:</strong> ${escapeHtml(level)}</p>`
      : '';
    const recipientLine = cleanText(recipient)
      ? `<p class="recipient"><strong>Presentado ante:</strong> ${escapeHtml(recipient)}</p>`
      : '';
    const schoolYear = mode === 'school' ? cleanText(appConfig.schoolYear || new Date().getFullYear()) : '';
    const schoolYearLine = schoolYear
      ? `<p class="detail-line"><strong>Ciclo lectivo:</strong> ${escapeHtml(schoolYear)}</p>`
      : '';
    const intro = mode === 'day_center'
      ? `Por medio de la presente, se deja constancia de que <strong>${personName}</strong>, DNI <strong>${dni}</strong>, es ${personCategory} de esta institución.`
      : `Por medio de la presente, se deja constancia de que <strong>${personName}</strong>, DNI <strong>${dni}</strong>, es ${personCategory} de esta institución.`;

    return `
      <article class="certificate">
        ${buildInstitutionHtml()}
        <h1 class="certificate-title">${escapeHtml(personCertificate.label)}</h1>
        <div class="certificate-body">
          <p>${intro}</p>
          ${levelLine}
          ${schoolYearLine}
          ${recipientLine}
          <p class="closing">Se extiende la presente constancia a solicitud de la persona interesada, para ser presentada ante quien corresponda.</p>
        </div>
        <p class="certificate-date">${datePhrase}</p>
        ${buildSignatureHtml()}
        ${cleanText(documentConfig.footer) ? `<footer class="document-footer">${escapeHtml(documentConfig.footer)}</footer>` : ''}
      </article>
    `;
  };

  const buildStaffCertificate = person => {
    const detail = staffCertificateDetails[person.id] || {};
    const cargo = cleanText(detail.cargo || getMainStaffRole(person));
    const startDate = cleanText(detail.startDate || getMainStaffStartDate(person));
    const date = new Date(`${certificateDate}T12:00:00`);
    const location = [appConfig.city, appConfig.province].map(cleanText).filter(Boolean).join(', ');
    const datePhrase = `${location ? `${escapeHtml(location)}, ` : ''}${escapeHtml(date.getDate())} de ${escapeHtml(date.toLocaleDateString('es-AR', { month: 'long' }))} de ${escapeHtml(date.getFullYear())}`;
    const recipientLine = cleanText(recipient)
      ? `<p class="recipient"><strong>Presentado ante:</strong> ${escapeHtml(recipient)}</p>`
      : '';

    return `
      <article class="certificate">
        ${buildInstitutionHtml()}
        <h1 class="certificate-title">Certificado laboral</h1>
        <div class="certificate-body">
          <p>Por medio de la presente, <strong>${escapeHtml(institutionName)}</strong> deja constancia de que <strong>${escapeHtml(getPersonName(person))}</strong>, DNI <strong>${escapeHtml(person.dni || 'no informado')}</strong>, se desempeña en esta institución en el cargo de <strong>${escapeHtml(cargo)}</strong>${startDate ? ` desde el <strong>${escapeHtml(formatDate(startDate))}</strong>` : ''}.</p>
          ${!startDate ? '<p class="data-warning">La fecha de inicio no está cargada en el legajo. Completala antes de emitir el certificado si necesitás que figure.</p>' : ''}
          ${recipientLine}
          <p class="closing">Se extiende el presente certificado a solicitud de la persona interesada, para ser presentado ante quien corresponda.</p>
        </div>
        <p class="certificate-date">${datePhrase}</p>
        ${buildSignatureHtml()}
        ${cleanText(documentConfig.footer) ? `<footer class="document-footer">${escapeHtml(documentConfig.footer)}</footer>` : ''}
      </article>
    `;
  };

  const generateCertificates = event => {
    event?.preventDefault?.();
    if (generating) return;

    const isPeopleSection = activeSection === 'people';
    const targets = isPeopleSection ? selectedPeople : selectedStaff;
    if (!targets.length) {
      alert(isPeopleSection
        ? `Seleccioná al menos una persona para emitir el ${personCertificate.label.toLowerCase()}.`
        : 'Seleccioná al menos una persona del equipo para emitir el certificado laboral.');
      return;
    }

    if (!certificateDate || Number.isNaN(new Date(`${certificateDate}T12:00:00`).getTime())) {
      alert('Elegí una fecha válida para el certificado.');
      return;
    }

    if (!isPeopleSection) {
      const incompleteStaff = targets.filter(person => {
        const detail = staffCertificateDetails[person.id] || {};
        return !cleanText(detail.cargo || getMainStaffRole(person)) || !cleanText(detail.startDate || getMainStaffStartDate(person));
      });
      if (incompleteStaff.length > 0) {
        alert(`Completá el cargo y la fecha de inicio de ${incompleteStaff.map(getPersonName).join(', ')} antes de emitir los certificados.`);
        return;
      }
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('El navegador bloqueó la ventana de impresión. Permití las ventanas emergentes para CENTRA y volvé a intentarlo.');
      return;
    }

    setGenerating(true);
    setSuccessMessage('');

    const certificates = targets.map(person =>
      isPeopleSection ? buildPeopleCertificate(person) : buildStaffCertificate(person)
    ).join('');

    const title = isPeopleSection ? personCertificate.label : 'Certificados laborales';
    const html = `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>${escapeHtml(title)}</title>
          <style>
            @page { size: A4; margin: 14mm 16mm; }
            * { box-sizing: border-box; }
            html, body { margin: 0; padding: 0; color: #1e293b; font-family: Arial, Helvetica, sans-serif; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .certificate { position: relative; min-height: 268mm; display: flex; flex-direction: column; padding: 0; page-break-after: always; break-after: page; }
            .certificate:last-child { page-break-after: auto; break-after: auto; }
            .institution-header { display: flex; align-items: center; gap: 18px; min-height: 75px; }
            .institution-logo { width: 82px; height: 72px; object-fit: contain; flex-shrink: 0; }
            .institution-identity { min-width: 0; }
            .institution-name { color: ${primaryColor}; font-weight: 800; text-transform: uppercase; font-size: 16px; letter-spacing: .03em; line-height: 1.3; }
            .institution-meta { color: #64748b; font-size: 9px; line-height: 1.5; margin-top: 3px; overflow-wrap: anywhere; }
            .custom-header { margin-top: 9px; white-space: pre-wrap; font-size: 10px; color: #475569; }
            .header-rule { width: 100%; height: 3px; background: ${primaryColor}; margin: 14px 0 34px; border-radius: 10px; }
            .certificate-title { text-align: center; color: #0f172a; font-size: 18px; text-transform: uppercase; letter-spacing: .07em; line-height: 1.4; margin: 0 0 32px; }
            .certificate-body { font-size: 13px; line-height: 2; color: #1e293b; }
            .certificate-body p { margin: 0 0 16px; }
            .certificate-body strong { color: #0f172a; }
            .detail-line { margin-top: 10px !important; font-size: 12px; }
            .recipient { margin-top: 22px !important; font-size: 11px; }
            .closing { margin-top: 26px !important; }
            .certificate-date { text-align: right; margin: 28px 0 0; font-size: 11px; color: #334155; }
            .signature-area { margin-top: auto; padding-top: 64px; display: grid; grid-template-columns: 1fr 1fr; gap: 42px; align-items: end; }
            .signature-block { text-align: center; min-width: 0; font-size: 10px; }
            .signature-line { border-top: 1px solid #334155; margin-bottom: 8px; }
            .signature-name { font-weight: 800; font-size: 11px; }
            .signature-role { margin-top: 3px; font-size: 10px; }
            .signature-caption { margin-top: 4px; color: #475569; font-size: 9px; }
            .document-footer { margin-top: 28px; padding-top: 9px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 9px; white-space: pre-wrap; }
            .data-warning { margin-top: 18px !important; padding: 10px 12px; border-left: 3px solid ${secondaryColor}; background: #fff7ed; color: #9a3412; font-size: 10px; line-height: 1.5; }
            @media screen {
              body { background: #e2e8f0; padding: 20px; }
              .certificate { max-width: 178mm; min-height: 255mm; margin: 0 auto 20px; padding: 12mm; background: white; box-shadow: 0 5px 24px rgba(15,23,42,.12); }
            }
          </style>
        </head>
        <body>
          ${certificates}
          <script>
            window.addEventListener('load', () => {
              const images = Array.from(document.images);
              Promise.all(images.map(image => image.complete ? Promise.resolve() : new Promise(resolve => {
                image.onload = resolve;
                image.onerror = resolve;
              }))).then(() => setTimeout(() => window.print(), 350));
            });
            window.addEventListener('afterprint', () => window.close());
          </script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();

    if (db && appId) {
      addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'activity_log'), {
        userName: user?.fullName || [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Usuario',
        userId: user?.id || '',
        action: 'Emisión de certificados',
        details: `Emitió ${targets.length} certificado(s) de ${isPeopleSection ? personCertificate.label.toLowerCase() : 'personal laboral'}.`,
        timestamp: serverTimestamp(),
      }).catch(error => console.error('No se pudo registrar la emisión en la auditoría:', error));
    }

    setGenerating(false);
    setSuccessMessage(`${targets.length} certificado(s) preparado(s) para imprimir.`);
  };

  if (!canAccess) {
    return (
      <div className="mx-auto max-w-xl rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center">
        <AlertCircle size={28} className="mx-auto text-rose-600" />
        <h2 className="mt-3 text-lg font-black text-rose-900">Acceso restringido</h2>
        <p className="mt-1 text-sm text-rose-700">Tu usuario no tiene permisos para acceder a la emisión de certificados.</p>
      </div>
    );
  }

  const isLoading = activeSection === 'people' ? loadingStudents : loadingStaff;
  const visiblePeopleCount = activeSection === 'people' ? filteredPeople.length : filteredStaff.length;
  const selectedCount = activeSection === 'people' ? selectedPeopleIds.length : selectedStaffIds.length;
  const sectionTitle = activeSection === 'people'
    ? personCertificate.label
    : 'Certificado laboral del personal';

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 pb-12">
      <header className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full opacity-[0.08]" style={{ backgroundColor: primaryColor }} />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {logoUrl ? (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-white p-2">
                <img src={logoUrl} alt={`Logo de ${institutionName}`} className="h-full w-full object-contain" />
              </div>
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-white" style={{ backgroundColor: primaryColor }}>
                <Building2 size={30} />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-[11px] font-extrabold uppercase tracking-[0.16em]" style={{ color: primaryColor }}>
                {institutionName}
              </p>
              <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">Certificados</h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
                Emití constancias institucionales con los datos y la identidad visual definidos en Configuración.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 self-start rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 sm:self-center">
            <BadgeCheck size={16} style={{ color: primaryColor }} />
            Emisión para impresión
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {personModeEnabled && (
          <button
            type="button"
            onClick={() => {
              setActiveSection('people');
              setSearchText('');
              setSuccessMessage('');
            }}
            className={`flex items-start gap-4 rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 ${activeSection === 'people' ? 'border-violet-300 bg-violet-50 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
            style={activeSection === 'people' ? { borderColor: `${primaryColor}70`, backgroundColor: `${primaryColor}0A` } : undefined}
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm" style={{ color: primaryColor }}>
              <GraduationCap size={22} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-slate-900">{personCertificate.label}</span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-500">{personCertificate.description}</span>
            </span>
            {activeSection === 'people' && <CheckCircleIcon primaryColor={primaryColor} />}
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setActiveSection('staff');
            setSearchText('');
            setSuccessMessage('');
          }}
          className={`flex items-start gap-4 rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 ${activeSection === 'staff' ? 'border-violet-300 bg-violet-50 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
          style={activeSection === 'staff' ? { borderColor: `${primaryColor}70`, backgroundColor: `${primaryColor}0A` } : undefined}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-pink-600 shadow-sm">
            <Briefcase size={21} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-extrabold text-slate-900">Certificado laboral del personal</span>
            <span className="mt-1 block text-xs leading-relaxed text-slate-500">Deja constancia del cargo y la fecha de inicio de actividades registrados.</span>
          </span>
          {activeSection === 'staff' && <CheckCircleIcon primaryColor={primaryColor} />}
        </button>
      </section>

      {!personModeEnabled && (
        <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-900">
          <Info size={19} className="mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-extrabold">Certificado de personas no configurado para este tipo de institución</p>
            <p className="mt-1 text-xs leading-relaxed">Por ahora, esta pantalla permite emitir el certificado laboral del personal. Los certificados de estudiantes o concurrentes se habilitan cuando el modo institucional sea Escuela o Centro de Día.</p>
          </div>
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider" style={{ color: primaryColor }}>
              {activeSection === 'people' ? 'Personas de la institución' : 'Equipo institucional'}
            </p>
            <h2 className="mt-1 text-xl font-black text-slate-900">{sectionTitle}</h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              {activeSection === 'people'
                ? 'Buscá y seleccioná una o más personas. Se generará una constancia por cada legajo seleccionado.'
                : 'Seleccioná integrantes del equipo y revisá el cargo y la fecha que aparecerán en cada certificado.'}
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <label className="relative block min-w-0 flex-1 sm:min-w-[250px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={searchText}
                onChange={event => setSearchText(event.target.value)}
                placeholder={activeSection === 'people' ? 'Buscar por nombre o DNI…' : 'Buscar por nombre, cargo o DNI…'}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
              />
            </label>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-bold text-slate-700">
              <Users size={14} /> {visiblePeopleCount} {visiblePeopleCount === 1 ? 'registro' : 'registros'}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 font-bold text-slate-700">
              <CheckSquare size={14} /> {selectedCount} seleccionados
            </span>
          </div>
          <button
            type="button"
            onClick={toggleSelectVisible}
            disabled={visibleIds.length === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {allVisibleSelected ? <X size={15} /> : <CheckSquare size={15} />}
            {allVisibleSelected ? 'Quitar selección visible' : 'Seleccionar todos los visibles'}
          </button>
        </div>

        {loadError && (
          <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
            <AlertCircle size={17} className="mt-0.5 shrink-0" /> {loadError}
          </div>
        )}

        <div className="mt-4 space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-sm font-semibold text-slate-500">
              <LoaderCircle size={18} className="animate-spin" /> Cargando registros…
            </div>
          ) : activeSection === 'people' ? (
            filteredPeople.length === 0 ? (
              <EmptyPanel
                title={searchText ? 'No encontramos coincidencias' : 'Todavía no hay legajos para mostrar'}
                description={searchText ? 'Probá con otro nombre, apellido o DNI.' : 'Cuando haya legajos activos, van a aparecer acá.'}
              />
            ) : filteredPeople.map(person => {
              const isSelected = selectedPeopleIds.includes(person.id);
              return (
                <button
                  key={person.id}
                  type="button"
                  onClick={() => togglePerson(person.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition focus:outline-none focus:ring-2 ${isSelected ? 'border-violet-200 bg-violet-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                  style={isSelected ? { borderColor: `${primaryColor}80`, backgroundColor: `${primaryColor}0A` } : undefined}
                >
                  <span className="shrink-0" style={{ color: isSelected ? primaryColor : '#cbd5e1' }}>
                    {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                  </span>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-sm font-black text-slate-600">
                    {(person.firstName || person.fullName || '?').charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-extrabold text-slate-800">{getFullName(person)}</span>
                    <span className="mt-1 block truncate text-xs text-slate-500">
                      DNI: {person.dni || 'Sin dato'}
                      {mode === 'school' && (person.level || person.section) ? ` · ${person.level || person.section}` : ''}
                      {mode === 'day_center' && person.group ? ` · ${person.group}` : ''}
                    </span>
                  </span>
                  {isSelected && <span className="hidden rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase sm:inline" style={{ color: primaryColor, backgroundColor: `${primaryColor}15` }}>Seleccionado</span>}
                  <ChevronRight size={17} className="shrink-0 text-slate-300" />
                </button>
              );
            })
          ) : (
            filteredStaff.length === 0 ? (
              <EmptyPanel
                title={searchText ? 'No encontramos coincidencias' : 'Todavía no hay personal para mostrar'}
                description={searchText ? 'Probá con otro nombre, cargo o DNI.' : 'Cuando haya registros de personal activos, van a aparecer acá.'}
              />
            ) : filteredStaff.map(person => {
              const isSelected = selectedStaffIds.includes(person.id);
              const detail = staffCertificateDetails[person.id] || {
                cargo: getMainStaffRole(person),
                startDate: getMainStaffStartDate(person),
              };
              return (
                <div
                  key={person.id}
                  className={`rounded-2xl border p-3 transition ${isSelected ? 'border-violet-200 bg-violet-50/50' : 'border-slate-200 bg-white'}`}
                  style={isSelected ? { borderColor: `${primaryColor}70` } : undefined}
                >
                  <button type="button" onClick={() => toggleStaffMember(person)} className="flex w-full items-center gap-3 text-left focus:outline-none focus:ring-2 focus:ring-slate-300 rounded-xl">
                    <span className="shrink-0" style={{ color: isSelected ? primaryColor : '#cbd5e1' }}>
                      {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                    </span>
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-pink-50 text-sm font-black text-pink-700">
                      {(person.firstName || person.fullName || '?').charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-extrabold text-slate-800">{getFullName(person)}</span>
                      <span className="mt-1 block truncate text-xs text-slate-500">
                        DNI: {person.dni || 'Sin dato'} · {getMainStaffRole(person) || 'Cargo no cargado'}
                      </span>
                    </span>
                    {isSelected && <span className="hidden rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase sm:inline" style={{ color: primaryColor, backgroundColor: `${primaryColor}15` }}>Seleccionado</span>}
                  </button>
                  {isSelected && (
                    <div className="mt-3 grid grid-cols-1 gap-3 border-t border-slate-200/80 pt-3 sm:grid-cols-2">
                      <label className="text-xs font-bold text-slate-600">
                        Cargo que debe figurar
                        <input
                          type="text"
                          value={detail.cargo || ''}
                          onChange={event => updateStaffDetail(person.id, 'cargo', event.target.value)}
                          placeholder="Ej.: Docente, Psicóloga, Auxiliar…"
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-700 outline-none focus:border-slate-400"
                        />
                      </label>
                      <label className="text-xs font-bold text-slate-600">
                        Fecha de inicio en ese cargo
                        <input
                          type="date"
                          value={detail.startDate || ''}
                          onChange={event => updateStaffDetail(person.id, 'startDate', event.target.value)}
                          className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-normal text-slate-700 outline-none focus:border-slate-400"
                        />
                      </label>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* OPCIONES DE EMISIÓN */}
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ backgroundColor: primaryColor }}>
            <ClipboardCheck size={20} />
          </span>
          <div>
            <h2 className="text-lg font-black text-slate-900">Preparar certificado</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              {activeSection === 'people'
                ? `Se generará ${selectedCount === 1 ? 'una constancia' : 'una constancia por cada registro'} seleccionado.`
                : `Se generará ${selectedCount === 1 ? 'un certificado' : 'un certificado por cada integrante'} seleccionado. Revisá los datos antes de imprimir.`}
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="text-xs font-bold text-slate-600">
            Fecha de emisión
            <span className="mt-1 block font-normal text-slate-400">La fecha que aparecerá en el documento.</span>
            <input
              type="date"
              value={certificateDate}
              onChange={event => setCertificateDate(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-normal text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
            />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Presentar ante (opcional)
            <span className="mt-1 block font-normal text-slate-400">Dejalo vacío si no necesitás indicar un destinatario.</span>
            <input
              type="text"
              value={recipient}
              onChange={event => setRecipient(event.target.value)}
              placeholder="Ej.: Obra social, organismo, quien corresponda…"
              maxLength={160}
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-normal text-slate-700 outline-none focus:border-slate-400 focus:bg-white"
            />
          </label>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
          <Info size={16} className="mt-0.5 shrink-0" />
          <p>El nombre, el logo, los datos de contacto, la localidad, los colores y la firma institucional se toman de Configuración. Si algún dato no aparece en el certificado, revisá esa sección antes de emitirlo.</p>
        </div>

        {successMessage && (
          <div role="status" className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">
            <Check size={17} className="mt-0.5 shrink-0" /> {successMessage}
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-relaxed text-slate-400">
            {selectedCount === 0 ? 'Seleccioná registros para habilitar la emisión.' : `${selectedCount} ${selectedCount === 1 ? 'certificado listo' : 'certificados listos'} para preparar.`}
          </p>
          <button
            type="button"
            onClick={generateCertificates}
            disabled={generating || selectedCount === 0 || isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold text-white shadow-sm transition hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40"
            style={{ backgroundColor: secondaryColor }}
          >
            {generating ? <LoaderCircle size={17} className="animate-spin" /> : <Printer size={17} />}
            {generating ? 'Preparando…' : `Generar e imprimir (${selectedCount})`}
          </button>
        </div>
      </section>
    </div>
  );
};

function CheckCircleIcon({ primaryColor }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${primaryColor}17`, color: primaryColor }}>
      <Check size={15} />
    </span>
  );
}

function EmptyPanel({ title, description }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
      <Users size={24} className="mx-auto text-slate-300" />
      <p className="mt-3 text-sm font-extrabold text-slate-700">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">{description}</p>
    </div>
  );
}

export function AdministracionView({ user, db, appId, appConfig = {} }) {
  return (
    <CertificateDocument
      user={user}
      db={db}
      appId={appId}
      appConfig={appConfig}
    />
  );
}
