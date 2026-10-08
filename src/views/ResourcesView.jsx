import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';
import {
  Plus,
  Trash2,
  ExternalLink,
  Folder,
  FolderOpen,
  Link as LinkIcon,
  Search,
  ChevronRight,
  ChevronLeft,
  Edit3,
  X,
  Copy,
  Check,
  FileText,
  Download,
  Printer,
  Eye,
  PenLine,
  List,
  AlignLeft,
  AlignCenter,
  AlignJustify,
  ArrowUpRight,
  MoreVertical
} from 'lucide-react';

const BASE = (db, appId, collectionName) =>
  collection(
    db,
    'artifacts',
    appId,
    'public',
    'data',
    collectionName
  );

const DOC = (db, appId, collectionName, id) =>
  doc(
    db,
    'artifacts',
    appId,
    'public',
    'data',
    collectionName,
    id
  );

const normalizeText = value =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const getPrimaryColor = config =>
  config?.primaryColor ||
  config?.paletteConfig?.primary ||
  '#6d28d9';

const getSecondaryColor = config =>
  config?.secondaryColor ||
  config?.paletteConfig?.secondary ||
  '#f97316';

const getInstitutionDisplayName = config =>
  config?.institutionName ||
  config?.institutionShortName ||
  config?.appName ||
  'Institución';

const getItemType = item =>
  item?.itemType === 'folder' || item?.type === 'folder'
    ? 'folder'
    : 'link';

const getParentId = item =>
  item?.parentId ||
  item?.folderId ||
  null;

const getHostname = url => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url || '';
  }
};

const escapeXml = value =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

const wrapText = (text, maxChars) => {
  const source = String(text ?? '');
  const paragraphs = source.split(/\r?\n/);
  const lines = [];

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const clean = paragraph.trim();

    if (!clean) {
      lines.push('');
      return;
    }

    const words = clean.split(/\s+/);
    let current = '';

    words.forEach(word => {
      const next = current
        ? `${current} ${word}`
        : word;

      if (next.length > maxChars && current) {
        lines.push(current);
        current = word;
      } else {
        current = next;
      }
    });

    if (current) {
      lines.push(current);
    }

    if (paragraphIndex < paragraphs.length - 1) {
      lines.push('');
    }
  });

  return lines;
};

export function ResourcesView({
  resources = [],
  canEdit,
  db,
  appId,
  user
}) {
  // ============================================================
  // CONFIGURACIÓN INSTITUCIONAL
  // ============================================================

  const [institutionConfig, setInstitutionConfig] =
    useState({});

  useEffect(() => {
    if (!db || !appId) return;

    const configRef = DOC(
      db,
      appId,
      'config',
      'institution'
    );

    const unsubscribe = onSnapshot(
      configRef,
      snapshot => {
        if (snapshot.exists()) {
          setInstitutionConfig(
            snapshot.data() || {}
          );
        }
      },
      error => {
        console.warn(
          'No se pudo cargar la configuración institucional:',
          error
        );
      }
    );

    return unsubscribe;
  }, [db, appId]);

  const institutionName =
    getInstitutionDisplayName(
      institutionConfig
    );

  const logoUrl =
    institutionConfig?.logoUrl || '';

  const primaryColor =
    getPrimaryColor(institutionConfig);

  const secondaryColor =
    getSecondaryColor(institutionConfig);

  // ============================================================
  // REPOSITORIO
  // ============================================================

  const [currentFolderId, setCurrentFolderId] =
    useState(null);

  const [search, setSearch] =
    useState('');

  const [resourceModal, setResourceModal] =
    useState(false);

  const [folderModal, setFolderModal] =
    useState(false);

  const [editingResource, setEditingResource] =
    useState(null);

  const [editingFolder, setEditingFolder] =
    useState(null);

  const [resourceTitle, setResourceTitle] =
    useState('');

  const [resourceUrl, setResourceUrl] =
    useState('');

  const [resourceFolderId, setResourceFolderId] =
    useState(null);

  const [folderName, setFolderName] =
    useState('');

  const [copiedId, setCopiedId] =
    useState(null);

  const folders = useMemo(
    () =>
      resources
        .filter(item => getItemType(item) === 'folder')
        .map(item => ({
          ...item,
          parentId: getParentId(item),
          title:
            item.title ||
            item.name ||
            'Carpeta sin nombre'
        })),
    [resources]
  );

  const links = useMemo(
    () =>
      resources
        .filter(item => getItemType(item) === 'link')
        .map(item => ({
          ...item,
          parentId: getParentId(item)
        })),
    [resources]
  );

  const currentFolder = useMemo(
    () =>
      folders.find(
        folder =>
          folder.id === currentFolderId
      ) || null,
    [folders, currentFolderId]
  );

  const breadcrumb = useMemo(() => {
    const path = [];
    let folderId = currentFolderId;

    while (folderId) {
      const folder = folders.find(
        item => item.id === folderId
      );

      if (!folder) break;

      path.unshift(folder);
      folderId = folder.parentId || null;
    }

    return path;
  }, [folders, currentFolderId]);

  const currentFolders = useMemo(() => {
    const currentSearch = normalizeText(search);

    return folders
      .filter(
        folder =>
          (folder.parentId || null) ===
          (currentFolderId || null)
      )
      .filter(folder => {
        if (!currentSearch) return true;

        return normalizeText(
          folder.title
        ).includes(currentSearch);
      })
      .sort((a, b) =>
        a.title.localeCompare(
          b.title,
          'es'
        )
      );
  }, [
    folders,
    currentFolderId,
    search
  ]);

  const currentLinks = useMemo(() => {
    const currentSearch = normalizeText(search);

    return links
      .filter(
        link =>
          (link.parentId || null) ===
          (currentFolderId || null)
      )
      .filter(link => {
        if (!currentSearch) return true;

        const haystack = [
          link.title,
          link.url,
          getHostname(link.url)
        ]
          .filter(Boolean)
          .map(normalizeText)
          .join(' ');

        return haystack.includes(
          currentSearch
        );
      })
      .sort((a, b) =>
        (a.title || '').localeCompare(
          b.title || '',
          'es'
        )
      );
  }, [
    links,
    currentFolderId,
    search
  ]);

  const folderContainsItems = folderId =>
    resources.some(
      item =>
        getParentId(item) === folderId
    );

  const resetResourceForm = () => {
    setEditingResource(null);
    setResourceTitle('');
    setResourceUrl('');
    setResourceFolderId(currentFolderId);
  };

  const openNewLink = () => {
    resetResourceForm();
    setResourceModal(true);
  };

  const openEditLink = item => {
    setEditingResource(item);
    setResourceTitle(item?.title || '');
    setResourceUrl(item?.url || '');
    setResourceFolderId(
      getParentId(item)
    );
    setResourceModal(true);
  };

  const openNewFolder = () => {
    setEditingFolder(null);
    setFolderName('');
    setFolderModal(true);
  };

  const openEditFolder = folder => {
    setEditingFolder(folder);
    setFolderName(
      folder?.title ||
      folder?.name ||
      ''
    );
    setFolderModal(true);
  };

  const handleSaveFolder = async event => {
    event.preventDefault();

    const name =
      folderName.trim();

    if (!name) {
      alert(
        'Escribí un nombre para la carpeta.'
      );
      return;
    }

    try {
      const data = {
        itemType: 'folder',
        type: 'folder',
        title: name,
        name,
        parentId:
          editingFolder
            ? getParentId(editingFolder)
            : currentFolderId || null,
        updatedAt: serverTimestamp()
      };

      if (editingFolder?.id) {
        await updateDoc(
          DOC(
            db,
            appId,
            'resources',
            editingFolder.id
          ),
          data
        );
      } else {
        await addDoc(
          BASE(
            db,
            appId,
            'resources'
          ),
          {
            ...data,
            createdBy:
              user?.id ||
              user?.uid ||
              null,
            createdAt:
              serverTimestamp()
          }
        );
      }

      setFolderModal(false);
      setEditingFolder(null);
      setFolderName('');
    } catch (error) {
      console.error(
        'Error guardando carpeta:',
        error
      );
      alert(
        `No se pudo guardar la carpeta.\n\n${
          error?.message || error
        }`
      );
    }
  };

  const handleDeleteFolder = async folder => {
    if (
      folderContainsItems(
        folder.id
      )
    ) {
      alert(
        'Esta carpeta todavía tiene contenido. Mové o eliminá primero los links y subcarpetas que contiene.'
      );
      return;
    }

    const confirmed =
      window.confirm(
        `¿Eliminar la carpeta "${folder.title}"?`
      );

    if (!confirmed) return;

    try {
      await deleteDoc(
        DOC(
          db,
          appId,
          'resources',
          folder.id
        )
      );
    } catch (error) {
      console.error(
        'Error eliminando carpeta:',
        error
      );
      alert(
        error?.message ||
        'No se pudo eliminar la carpeta.'
      );
    }
  };

  const handleSaveLink = async event => {
    event.preventDefault();

    const title =
      resourceTitle.trim();

    let url =
      resourceUrl.trim();

    if (!title || !url) {
      alert(
        'Completá título y enlace.'
      );
      return;
    }

    if (
      !/^https?:\/\//i.test(url)
    ) {
      url =
        `https://${url}`;
    }

    try {
      const data = {
        itemType: 'link',
        type: 'link',
        title,
        url,
        parentId:
          resourceFolderId || null,
        category: 'GENERAL',
        updatedAt:
          serverTimestamp()
      };

      if (editingResource?.id) {
        await updateDoc(
          DOC(
            db,
            appId,
            'resources',
            editingResource.id
          ),
          data
        );
      } else {
        await addDoc(
          BASE(
            db,
            appId,
            'resources'
          ),
          {
            ...data,
            createdBy:
              user?.id ||
              user?.uid ||
              null,
            createdAt:
              serverTimestamp()
          }
        );
      }

      setResourceModal(false);
      resetResourceForm();
    } catch (error) {
      console.error(
        'Error guardando recurso:',
        error
      );
      alert(
        `No se pudo guardar el enlace.\n\n${
          error?.message || error
        }`
      );
    }
  };

  const handleDeleteLink = async link => {
    const confirmed =
      window.confirm(
        `¿Eliminar "${link.title}"?`
      );

    if (!confirmed) return;

    try {
      await deleteDoc(
        DOC(
          db,
          appId,
          'resources',
          link.id
        )
      );
    } catch (error) {
      console.error(
        'Error eliminando enlace:',
        error
      );
      alert(
        error?.message ||
        'No se pudo eliminar el enlace.'
      );
    }
  };

  const handleCopyLink = async link => {
    try {
      await navigator.clipboard.writeText(
        link.url
      );

      setCopiedId(link.id);

      window.setTimeout(
        () => setCopiedId(null),
        1800
      );
    } catch {
      alert(
        'No se pudo copiar el enlace.'
      );
    }
  };

  // ============================================================
  // GENERADOR DE NOTAS
  // ============================================================

  const [showNotaModal, setShowNotaModal] =
    useState(false);

  const [showMobilePreview, setShowMobilePreview] =
    useState(false);

  const [showTemplates, setShowTemplates] =
    useState(false);

  const [isGeneratingImg, setIsGeneratingImg] =
    useState(false);

  const [notaData, setNotaData] =
    useState({
      date:
        new Date().toLocaleDateString(
          'es-AR'
        ),
      title: '',
      body: '',
      signature:
        'EQUIPO DIRECTIVO',
      fontSize: 'medium',
      textAlign: 'left',
      isPrintMode: false
    });

  const [templateData, setTemplateData] =
    useState({
      destinatario: '',
      fechaReunion: '',
      horaReunion: '',
      modalidad:
        'Presencial en la Institución'
    });

  const notaFontClass =
    notaData.fontSize === 'small'
      ? 'text-[14px]'
      : notaData.fontSize === 'large'
      ? 'text-[20px]'
      : 'text-[17px]';

  const notaTextAlign =
    notaData.textAlign === 'center'
      ? 'text-center'
      : notaData.textAlign === 'justify'
      ? 'text-justify'
      : 'text-left';

  const aplicarPlantillaReunion = () => {
    if (
      !templateData.fechaReunion ||
      !templateData.horaReunion
    ) {
      alert(
        'Completá fecha y hora.'
      );
      return;
    }

    const partesFecha =
      templateData.fechaReunion.split(
        '-'
      );

    const fechaLegible =
      `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0]}`;

    const destinatario =
      templateData.destinatario
        ? `Estimada familia de ${templateData.destinatario}:`
        : 'Estimadas familias:';

    const body =
      `${destinatario}

Por medio de la presente, nos comunicamos para citarlos a una reunión a fin de conversar sobre aspectos relacionados a la trayectoria.

La misma se llevará a cabo el día ${fechaLegible} a las ${templateData.horaReunion} hs.
Modalidad: ${templateData.modalidad}.

Agradecemos su compromiso y puntualidad.
Por favor, confirmar asistencia.`;

    setNotaData(prev => ({
      ...prev,
      title:
        'CITACIÓN A REUNIÓN',
      body,
      textAlign: 'left'
    }));

    setShowTemplates(false);
  };

  const buildNoteSvg = () => {
    const width = 1240;
    const height = 1754;

    const bodyFont =
      notaData.fontSize === 'small'
        ? 24
        : notaData.fontSize === 'large'
        ? 32
        : 28;

    const lineHeight =
      bodyFont * 1.6;

    const title =
      notaData.title ||
      'COMUNICADO';

    const bodyLines =
      wrapText(
        notaData.body ||
          'Vista previa del mensaje...',
        notaData.fontSize === 'large'
          ? 44
          : 52
      );

    const maxBodyLines = 27;

    const visibleBodyLines =
      bodyLines.slice(
        0,
        maxBodyLines
      );

    const textAnchor =
      notaData.textAlign === 'center'
        ? 'middle'
        : 'start';

    const textX =
      notaData.textAlign === 'center'
        ? width / 2
        : 112;

    const bodyStartY = 520;

    const bodySvg =
      visibleBodyLines
        .map(
          (line, index) =>
            `<text x="${textX}" y="${
              bodyStartY +
              index * lineHeight
            }" text-anchor="${textAnchor}" font-family="Arial, Helvetica, sans-serif" font-size="${bodyFont}" font-weight="500" fill="#334155">${escapeXml(line)}</text>`
        )
        .join('');

    const isPrint =
      notaData.isPrintMode;

    const background =
      isPrint
        ? '#ffffff'
        : '#fffaf0';

    const softBackground =
      isPrint
        ? '#f8fafc'
        : '#fff7ed';

    const accent =
      isPrint
        ? '#94a3b8'
        : primaryColor;

    const secondary =
      isPrint
        ? '#cbd5e1'
        : secondaryColor;

    const logoMarkup =
      logoUrl
        ? `<image href="${escapeXml(logoUrl)}" x="90" y="86" width="118" height="118" preserveAspectRatio="xMidYMid meet" />`
        : `<rect x="90" y="86" width="118" height="118" rx="28" fill="${escapeXml(accent)}" />
           <text x="149" y="160" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="700" fill="#ffffff">${escapeXml(
             institutionName
               .slice(0, 2)
               .toUpperCase()
           )}</text>`;

    const signatureY =
      Math.max(
        1480,
        bodyStartY +
          visibleBodyLines.length *
            lineHeight +
          150
      );

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${background}" />
  <rect x="42" y="42" width="${width - 84}" height="${height - 84}" rx="34" fill="none" stroke="${secondary}" stroke-width="2" />
  <rect x="42" y="42" width="${width - 84}" height="18" rx="9" fill="${accent}" />
  <circle cx="${width - 122}" cy="112" r="44" fill="${softBackground}" />
  <circle cx="${width - 122}" cy="112" r="9" fill="${accent}" />
  ${logoMarkup}
  <text x="244" y="126" font-family="Arial, Helvetica, sans-serif" font-size="30" font-weight="700" fill="#0f172a">${escapeXml(institutionName)}</text>
  <text x="244" y="164" font-family="Arial, Helvetica, sans-serif" font-size="16" font-weight="700" letter-spacing="3" fill="#64748b">COMUNICACIÓN INSTITUCIONAL</text>
  <text x="${width - 88}" y="164" text-anchor="end" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" fill="${accent}">${escapeXml(notaData.date)}</text>
  <line x1="112" y1="270" x2="${width - 112}" y2="270" stroke="${secondary}" stroke-width="2" />
  <text x="${width / 2}" y="362" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="42" font-weight="700" fill="#1e293b">${escapeXml(title)}</text>
  <rect x="112" y="408" width="${width - 224}" height="2" fill="${secondary}" opacity="0.45" />
  ${bodySvg}
  <line x1="430" y1="${signatureY}" x2="810" y2="${signatureY}" stroke="${secondary}" stroke-width="2" />
  <text x="${width / 2}" y="${signatureY + 52}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="22" font-weight="700" fill="${accent}">${escapeXml(notaData.signature)}</text>
  <text x="${width / 2}" y="${signatureY + 86}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" letter-spacing="3" fill="#64748b">${escapeXml(institutionName.toUpperCase())}</text>
</svg>`;
  };

  const handleDownloadNota = () => {
    if (
      !notaData.title &&
      !notaData.body
    ) {
      alert('Escribí algo.');
      return;
    }

    setIsGeneratingImg(true);

    try {
      const svg =
        buildNoteSvg();

      const blob =
        new Blob(
          [svg],
          {
            type: 'image/svg+xml;charset=utf-8'
          }
        );

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement('a');

      const safeName =
        (notaData.title ||
          'comunicado')
          .replace(
            /[^a-z0-9áéíóúñü]+/gi,
            '-'
          )
          .replace(
            /^-+|-+$/g,
            ''
          )
          .toLowerCase();

      link.href = url;
      link.download =
        `${safeName || 'comunicado'}-institucional.svg`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(
        'Error descargando la nota:',
        error
      );
      alert(
        'No se pudo descargar la imagen.'
      );
    } finally {
      setIsGeneratingImg(false);
    }
  };

  const handlePrintNota = () => {
    if (
      !notaData.title &&
      !notaData.body
    ) {
      alert('Escribí algo.');
      return;
    }

    const printWindow =
      window.open(
        '',
        '_blank',
        'width=900,height=1100'
      );

    if (!printWindow) {
      alert(
        'El navegador bloqueó la ventana de impresión. Permití ventanas emergentes para CENTRA.'
      );
      return;
    }

    const safeInstitution =
      escapeXml(institutionName);

    const safeLogo =
      logoUrl
        ? `<img src="${escapeXml(logoUrl)}" alt="" />`
        : '';

    const bodyHtml =
      escapeXml(
        notaData.body ||
          'Vista previa del mensaje...'
      ).replace(
        /\r?\n/g,
        '<br />'
      );

    const title =
      escapeXml(
        notaData.title ||
          'COMUNICADO'
      );

    const signature =
      escapeXml(
        notaData.signature
      );

    const date =
      escapeXml(
        notaData.date
      );

    printWindow.document.write(`
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <title>${title}</title>
          <style>
            @page {
              size: A4;
              margin: 0;
            }

            html,
            body {
              margin: 0;
              padding: 0;
              background: #e2e8f0;
              font-family: Arial, Helvetica, sans-serif;
            }

            .sheet {
              width: 210mm;
              min-height: 297mm;
              margin: 0 auto;
              box-sizing: border-box;
              padding: 18mm 17mm 20mm;
              background: ${
                notaData.isPrintMode
                  ? '#ffffff'
                  : '#fffaf0'
              };
              position: relative;
            }

            .top-line {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 5mm;
              background: ${escapeXml(
                notaData.isPrintMode
                  ? '#94a3b8'
                  : primaryColor
              )};
            }

            .header {
              display: flex;
              align-items: flex-start;
              gap: 18px;
              padding-top: 8mm;
              padding-bottom: 9mm;
              border-bottom: 1px solid ${escapeXml(
                secondaryColor
              )};
            }

            .logo {
              width: 26mm;
              height: 26mm;
              object-fit: contain;
            }

            .identity {
              flex: 1;
            }

            .identity h2 {
              margin: 4mm 0 1.5mm;
              font-size: 17pt;
              color: #0f172a;
            }

            .identity p {
              margin: 0;
              font-size: 8pt;
              letter-spacing: 2px;
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
            }

            .date {
              font-size: 9pt;
              font-weight: 700;
              color: ${escapeXml(
                notaData.isPrintMode
                  ? '#64748b'
                  : secondaryColor
              )};
              padding-top: 3mm;
            }

            .title {
              margin: 13mm 0 8mm;
              text-align: center;
              font-size: 21pt;
              line-height: 1.15;
              color: #1e293b;
              text-transform: uppercase;
            }

            .body {
              min-height: 145mm;
              font-size: ${
                notaData.fontSize === 'small'
                  ? '11.5pt'
                  : notaData.fontSize === 'large'
                  ? '16pt'
                  : '13pt'
              };
              line-height: 1.75;
              color: #334155;
              font-weight: 500;
              text-align: ${
                notaData.textAlign
              };
              white-space: normal;
              overflow-wrap: anywhere;
            }

            .signature {
              margin-top: 15mm;
              text-align: center;
            }

            .signature-line {
              width: 65mm;
              margin: 0 auto 5mm;
              border-top: 1px solid ${escapeXml(
                secondaryColor
              )};
            }

            .signature strong {
              display: block;
              font-size: 11pt;
              color: ${escapeXml(
                notaData.isPrintMode
                  ? '#475569'
                  : primaryColor
              )};
              text-transform: uppercase;
            }

            .signature span {
              display: block;
              margin-top: 2mm;
              font-size: 7pt;
              letter-spacing: 2px;
              color: #64748b;
              font-weight: 700;
            }

            @media screen {
              .sheet {
                margin: 20px auto;
                box-shadow: 0 15px 45px rgba(15, 23, 42, .18);
              }
            }
          </style>
        </head>
        <body>
          <section class="sheet">
            <div class="top-line"></div>

            <div class="header">
              ${
                safeLogo
                  ? `<img class="logo" src="${safeLogo.match(/src="([^"]+)"/)?.[1] || ''}" alt="" />`
                  : `<div class="logo"></div>`
              }

              <div class="identity">
                <h2>${safeInstitution}</h2>
                <p>Comunicación institucional</p>
              </div>

              <div class="date">${date}</div>
            </div>

            <h1 class="title">${title}</h1>

            <div class="body">
              ${bodyHtml}
            </div>

            <div class="signature">
              <div class="signature-line"></div>
              <strong>${signature}</strong>
              <span>${safeInstitution.toUpperCase()}</span>
            </div>
          </section>

          <script>
            window.addEventListener('load', () => {
              setTimeout(() => {
                window.print();
              }, 250);
            });
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  };

  return (
    <div className="space-y-5 pb-12">
      {/* ========================================================
          ENCABEZADO
      ======================================================== */}

      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p
              className="text-[10px] font-black uppercase tracking-[0.24em]"
              style={{
                color: primaryColor
              }}
            >
              Repositorio institucional
            </p>

            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-slate-900 mt-1">
              Recursos
            </h2>

            <p className="text-sm text-slate-500 font-medium mt-1">
              Carpetas y accesos directos,
              ordenados en un solo lugar.
            </p>
          </div>

          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={openNewFolder}
                className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:border-slate-300 font-black text-xs flex items-center gap-2 transition"
              >
                <Folder size={17} />
                Nueva carpeta
              </button>

              <button
                type="button"
                onClick={openNewLink}
                className="px-4 py-2.5 rounded-xl text-white font-black text-xs flex items-center gap-2 shadow-lg transition"
                style={{
                  backgroundColor:
                    primaryColor
                }}
              >
                <Plus size={17} />
                Nuevo link
              </button>
            </div>
          )}
        </div>

        {/* BREADCRUMB + SEARCH */}

        <div className="bg-white border border-slate-200 rounded-2xl p-3 flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto">
            {currentFolderId && (
              <button
                type="button"
                onClick={() =>
                  setCurrentFolderId(
                    currentFolder
                      ? getParentId(
                          currentFolder
                        )
                      : null
                  )
                }
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 shrink-0"
                title="Volver"
              >
                <ChevronLeft size={18} />
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                setCurrentFolderId(null)
              }
              className={`px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap ${
                !currentFolderId
                  ? 'bg-slate-100 text-slate-900'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Repositorio
            </button>

            {breadcrumb.map(folder => (
              <React.Fragment key={folder.id}>
                <ChevronRight
                  size={14}
                  className="text-slate-300 shrink-0"
                />

                <button
                  type="button"
                  onClick={() =>
                    setCurrentFolderId(
                      folder.id
                    )
                  }
                  className={`px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap ${
                    folder.id ===
                    currentFolderId
                      ? 'bg-slate-100 text-slate-900'
                      : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {folder.title}
                </button>
              </React.Fragment>
            ))}
          </div>

          <div className="relative md:w-72 shrink-0">
            <Search
              size={16}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />

            <input
              value={search}
              onChange={event =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Buscar en esta carpeta..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-50 border border-slate-200 outline-none focus:border-slate-300 text-xs font-semibold"
            />

            {search && (
              <button
                type="button"
                onClick={() =>
                  setSearch('')
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================
          CARPETAS
      ======================================================== */}

      {currentFolders.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <FolderOpen
              size={17}
              style={{
                color: primaryColor
              }}
            />

            <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
              Carpetas
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentFolders.map(
              folder => (
                <article
                  key={folder.id}
                  className="group bg-white border border-slate-200 rounded-2xl p-4 hover:border-slate-300 hover:shadow-lg transition"
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setCurrentFolderId(
                          folder.id
                        )
                      }
                      className="flex items-start gap-3 min-w-0 flex-1 text-left"
                    >
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: `${primaryColor}14`,
                          color: primaryColor
                        }}
                      >
                        <Folder size={22} />
                      </div>

                      <div className="min-w-0">
                        <h4 className="font-black text-sm text-slate-800 truncate">
                          {folder.title}
                        </h4>

                        <p className="text-[10px] text-slate-400 font-semibold mt-1">
                          {
                            resources.filter(
                              item =>
                                getParentId(
                                  item
                                ) ===
                                folder.id
                            ).length
                          }{' '}
                          elementos
                        </p>
                      </div>
                    </button>

                    {canEdit && (
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            openEditFolder(
                              folder
                            )
                          }
                          className="p-2 rounded-lg text-slate-300 hover:text-slate-700 hover:bg-slate-100 transition"
                          title="Editar carpeta"
                        >
                          <Edit3 size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteFolder(
                              folder
                            )
                          }
                          className="p-2 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition"
                          title="Eliminar carpeta"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentFolderId(
                        folder.id
                      )
                    }
                    className="mt-4 w-full flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-slate-400 group-hover:text-slate-700 transition"
                  >
                    Abrir carpeta
                    <ArrowUpRight size={14} />
                  </button>
                </article>
              )
            )}
          </div>
        </section>
      )}

      {/* ========================================================
          LINKS
      ======================================================== */}

      <section>
        <div className="flex items-center gap-2 mb-3">
          <LinkIcon
            size={17}
            style={{
              color: secondaryColor
            }}
          />

          <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
            Enlaces
          </h3>

          <span className="text-[10px] font-bold text-slate-300">
            {currentLinks.length}
          </span>
        </div>

        {currentLinks.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {currentLinks.map(
              link => (
                <article
                  key={link.id}
                  className="bg-white border border-slate-200 rounded-2xl p-4 hover:border-slate-300 hover:shadow-lg transition"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${secondaryColor}14`,
                        color: secondaryColor
                      }}
                    >
                      <LinkIcon size={19} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block font-black text-sm text-slate-800 hover:underline line-clamp-2"
                      >
                        {link.title}
                      </a>

                      <p className="text-[10px] text-slate-400 font-semibold truncate mt-1">
                        {getHostname(
                          link.url
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 mt-4 pt-3 border-t border-slate-100">
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 px-3 py-2 rounded-xl text-white text-[10px] font-black uppercase flex items-center justify-center gap-2 transition"
                      style={{
                        backgroundColor:
                          primaryColor
                      }}
                    >
                      Abrir
                      <ExternalLink
                        size={13}
                      />
                    </a>

                    <button
                      type="button"
                      onClick={() =>
                        handleCopyLink(
                          link
                        )
                      }
                      className="px-3 py-2 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 text-[10px] font-black uppercase"
                      title="Copiar enlace"
                    >
                      {copiedId ===
                      link.id ? (
                        <Check
                          size={14}
                        />
                      ) : (
                        <Copy
                          size={14}
                        />
                      )}
                    </button>

                    {canEdit && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            openEditLink(
                              link
                            )
                          }
                          className="px-3 py-2 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                          title="Editar"
                        >
                          <Edit3 size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            handleDeleteLink(
                              link
                            )
                          }
                          className="px-3 py-2 rounded-xl bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50"
                          title="Eliminar"
                        >
                          <Trash2
                            size={14}
                          />
                        </button>
                      </>
                    )}
                  </div>
                </article>
              )
            )}
          </div>
        ) : (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center">
            <div
              className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center"
              style={{
                backgroundColor: `${primaryColor}12`,
                color: primaryColor
              }}
            >
              <LinkIcon size={25} />
            </div>

            <h4 className="font-black text-slate-700 mt-4">
              Esta carpeta todavía no tiene enlaces
            </h4>

            <p className="text-xs text-slate-400 font-medium mt-1">
              Agregá un link o abrí una subcarpeta para empezar a organizarla.
            </p>

            {canEdit && (
              <button
                type="button"
                onClick={openNewLink}
                className="mt-5 px-4 py-2.5 rounded-xl text-white text-xs font-black uppercase"
                style={{
                  backgroundColor:
                    primaryColor
                }}
              >
                Agregar link
              </button>
            )}
          </div>
        )}
      </section>

      {/* ========================================================
          MODAL CARPETA
      ======================================================== */}

      {folderModal && (
        <div className="fixed inset-0 z-[500] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveFolder}
            className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Repositorio
                </p>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  {editingFolder
                    ? 'Editar carpeta'
                    : 'Nueva carpeta'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setFolderModal(false)
                }
                className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <label className="block">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Nombre
              </span>

              <input
                autoFocus
                value={folderName}
                onChange={event =>
                  setFolderName(
                    event.target.value
                  )
                }
                placeholder="Ej. Formularios, Moodle, Proyectos..."
                className="mt-2 w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:border-slate-400 text-sm font-semibold"
                required
              />
            </label>

            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() =>
                  setFolderModal(false)
                }
                className="flex-1 py-3 rounded-xl text-xs font-black uppercase text-slate-400 hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="flex-[2] py-3 rounded-xl text-white text-xs font-black uppercase"
                style={{
                  backgroundColor:
                    primaryColor
                }}
              >
                Guardar carpeta
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================
          MODAL LINK
      ======================================================== */}

      {resourceModal && (
        <div className="fixed inset-0 z-[500] bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveLink}
            className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Repositorio
                </p>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  {editingResource
                    ? 'Editar enlace'
                    : 'Nuevo enlace'}
                </h3>
              </div>

              <button
                type="button"
                onClick={() =>
                  setResourceModal(false)
                }
                className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Título
                </span>

                <input
                  autoFocus
                  value={resourceTitle}
                  onChange={event =>
                    setResourceTitle(
                      event.target.value
                    )
                  }
                  placeholder="Ej. Campus virtual"
                  className="mt-2 w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:border-slate-400 text-sm font-semibold"
                  required
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Enlace
                </span>

                <input
                  value={resourceUrl}
                  onChange={event =>
                    setResourceUrl(
                      event.target.value
                    )
                  }
                  placeholder="https://..."
                  className="mt-2 w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:border-slate-400 text-sm font-semibold"
                  required
                />
              </label>

              <label className="block">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Carpeta
                </span>

                <select
                  value={
                    resourceFolderId ||
                    ''
                  }
                  onChange={event =>
                    setResourceFolderId(
                      event.target.value ||
                        null
                    )
                  }
                  className="mt-2 w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none focus:border-slate-400 text-sm font-semibold"
                >
                  <option value="">
                    Repositorio principal
                  </option>

                  {folders
                    .filter(
                      folder =>
                        folder.id !==
                        editingResource?.id
                    )
                    .sort((a, b) =>
                      a.title.localeCompare(
                        b.title,
                        'es'
                      )
                    )
                    .map(folder => (
                      <option
                        key={
                          folder.id
                        }
                        value={
                          folder.id
                        }
                      >
                        {folder.title}
                      </option>
                    ))}
                </select>
              </label>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                type="button"
                onClick={() =>
                  setResourceModal(false)
                }
                className="flex-1 py-3 rounded-xl text-xs font-black uppercase text-slate-400 hover:bg-slate-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="flex-[2] py-3 rounded-xl text-white text-xs font-black uppercase"
                style={{
                  backgroundColor:
                    primaryColor
                }}
              >
                Guardar enlace
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================
          BOTÓN GENERADOR DE NOTAS
      ======================================================== */}

      <section className="pt-2">
        <div
          className="relative overflow-hidden rounded-3xl p-6 md:p-7 text-white shadow-xl"
          style={{
            background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})`
          }}
        >
          <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-white/10" />
          <div className="absolute -right-2 -bottom-16 w-52 h-52 rounded-full bg-black/10" />

          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                <FileText size={24} />
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-75">
                  Herramienta institucional
                </p>

                <h3 className="text-2xl font-black tracking-tight mt-1">
                  Generador de notas
                </h3>

                <p className="text-sm opacity-90 font-medium mt-1 max-w-xl">
                  Armá comunicados listos para compartir o imprimir, usando automáticamente el nombre y el logo configurados en CENTRA.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setShowNotaModal(true)
              }
              className="px-5 py-3 rounded-xl bg-white text-slate-900 font-black text-xs uppercase flex items-center justify-center gap-2 hover:bg-slate-50 transition shadow-lg shrink-0"
            >
              <PenLine size={17} />
              Crear nota
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================
          EDITOR DE NOTAS
      ======================================================== */}

      {showNotaModal && (
        <div className="fixed inset-0 z-[700] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
          <div
            className="bg-white rounded-none md:rounded-3xl w-full max-w-7xl h-full md:h-[94vh] overflow-hidden flex flex-col shadow-2xl"
            onClick={event =>
              event.stopPropagation()
            }
          >
            <header className="px-5 md:px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt=""
                    className="w-10 h-10 object-contain rounded-xl bg-slate-50"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black"
                    style={{
                      backgroundColor:
                        primaryColor
                    }}
                  >
                    {institutionName
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                    {institutionName}
                  </p>

                  <h3 className="font-black text-slate-900 truncate">
                    Editor de nota institucional
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setShowMobilePreview(
                      prev => !prev
                    )
                  }
                  className="md:hidden px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-[10px] font-black uppercase flex items-center gap-1"
                >
                  {showMobilePreview ? (
                    <>
                      <PenLine
                        size={14}
                      />
                      Editar
                    </>
                  ) : (
                    <>
                      <Eye size={14} />
                      Vista
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setShowNotaModal(false)
                  }
                  className="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
                >
                  <X size={19} />
                </button>
              </div>
            </header>

            <div className="flex-1 flex min-h-0 overflow-hidden">
              {/* EDITOR */}

              <div
                className={`w-full md:w-[42%] overflow-y-auto p-5 md:p-7 space-y-5 ${
                  showMobilePreview
                    ? 'hidden md:block'
                    : 'block'
                }`}
              >
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Contenido
                  </p>

                  <h4 className="text-lg font-black text-slate-900 mt-1">
                    Armá tu comunicado
                  </h4>
                </div>

                {/* PLANTILLA */}

                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() =>
                      setShowTemplates(
                        prev => !prev
                      )
                    }
                    className="w-full px-4 py-3 flex items-center justify-between text-left bg-slate-50"
                  >
                    <span className="text-xs font-black text-slate-700 flex items-center gap-2">
                      <List size={15} />
                      Plantillas rápidas
                    </span>

                    <ChevronRight
                      size={15}
                      className={`transition-transform ${
                        showTemplates
                          ? 'rotate-90'
                          : ''
                      }`}
                    />
                  </button>

                  {showTemplates && (
                    <div className="p-4 space-y-3">
                      <input
                        type="text"
                        placeholder="Destinatario / grupo"
                        value={
                          templateData.destinatario
                        }
                        onChange={event =>
                          setTemplateData(
                            prev => ({
                              ...prev,
                              destinatario:
                                event.target
                                  .value
                            })
                          )
                        }
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-xs font-semibold"
                      />

                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="date"
                          value={
                            templateData.fechaReunion
                          }
                          onChange={event =>
                            setTemplateData(
                              prev => ({
                                ...prev,
                                fechaReunion:
                                  event.target
                                    .value
                              })
                            )
                          }
                          className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-xs font-semibold"
                        />

                        <input
                          type="time"
                          value={
                            templateData.horaReunion
                          }
                          onChange={event =>
                            setTemplateData(
                              prev => ({
                                ...prev,
                                horaReunion:
                                  event.target
                                    .value
                              })
                            )
                          }
                          className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-xs font-semibold"
                        />
                      </div>

                      <select
                        value={
                          templateData.modalidad
                        }
                        onChange={event =>
                          setTemplateData(
                            prev => ({
                              ...prev,
                              modalidad:
                                event.target
                                  .value
                            })
                          )
                        }
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-xs font-semibold"
                      >
                        <option>
                          Presencial en la Institución
                        </option>
                        <option>
                          Modalidad virtual
                        </option>
                        <option>
                          Modalidad mixta
                        </option>
                      </select>

                      <button
                        type="button"
                        onClick={
                          aplicarPlantillaReunion
                        }
                        className="w-full py-3 rounded-xl text-white text-[10px] font-black uppercase"
                        style={{
                          backgroundColor:
                            primaryColor
                        }}
                      >
                        Generar texto
                      </button>
                    </div>
                  )}
                </div>

                {/* DATOS */}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Fecha
                    </span>
                    <input
                      type="text"
                      value={
                        notaData.date
                      }
                      onChange={event =>
                        setNotaData(
                          prev => ({
                            ...prev,
                            date:
                              event.target
                                .value
                          })
                        )
                      }
                      className="mt-2 w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-xs font-semibold"
                    />
                  </label>

                  <label>
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Firma
                    </span>
                    <input
                      type="text"
                      value={
                        notaData.signature
                      }
                      onChange={event =>
                        setNotaData(
                          prev => ({
                            ...prev,
                            signature:
                              event.target
                                .value
                          })
                        )
                      }
                      className="mt-2 w-full p-3 rounded-xl bg-slate-50 border border-slate-200 outline-none text-xs font-semibold"
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Título
                  </span>

                  <input
                    type="text"
                    value={
                      notaData.title
                    }
                    onChange={event =>
                      setNotaData(
                        prev => ({
                          ...prev,
                          title:
                            event.target
                              .value
                        })
                      )
                    }
                    placeholder="Ej. CITACIÓN A REUNIÓN"
                    className="mt-2 w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none text-sm font-black uppercase"
                  />
                </label>

                <label className="block">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Mensaje
                    </span>

                    <span className="text-[9px] font-bold text-slate-300">
                      {notaData.body.length} caracteres
                    </span>
                  </div>

                  <textarea
                    value={
                      notaData.body
                    }
                    onChange={event =>
                      setNotaData(
                        prev => ({
                          ...prev,
                          body:
                            event.target
                              .value
                        })
                      )
                    }
                    placeholder="Escribí el mensaje..."
                    className="mt-2 w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 outline-none text-sm font-medium text-slate-700 min-h-[260px] resize-y"
                  />
                </label>

                {/* FORMATO */}

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                      Tamaño del texto
                    </p>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        {
                          label:
                            'Chico',
                          value:
                            'small'
                        },
                        {
                          label:
                            'Medio',
                          value:
                            'medium'
                        },
                        {
                          label:
                            'Grande',
                          value:
                            'large'
                        }
                      ].map(
                        item => (
                          <button
                            key={
                              item.value
                            }
                            type="button"
                            onClick={() =>
                              setNotaData(
                                prev => ({
                                  ...prev,
                                  fontSize:
                                    item.value
                                })
                              )
                            }
                            className={`py-2.5 rounded-xl text-[10px] font-black uppercase ${
                              notaData.fontSize ===
                              item.value
                                ? 'text-white'
                                : 'bg-white text-slate-500 border border-slate-200'
                            }`}
                            style={
                              notaData.fontSize ===
                              item.value
                                ? {
                                    backgroundColor:
                                      primaryColor
                                  }
                                : undefined
                            }
                          >
                            {item.label}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                      Alineación
                    </p>

                    <div className="flex gap-2">
                      {[
                        {
                          value:
                            'left',
                          icon: (
                            <AlignLeft
                              size={16}
                            />
                          )
                        },
                        {
                          value:
                            'center',
                          icon: (
                            <AlignCenter
                              size={16}
                            />
                          )
                        },
                        {
                          value:
                            'justify',
                          icon: (
                            <AlignJustify
                              size={16}
                            />
                          )
                        }
                      ].map(
                        item => (
                          <button
                            key={
                              item.value
                            }
                            type="button"
                            onClick={() =>
                              setNotaData(
                                prev => ({
                                  ...prev,
                                  textAlign:
                                    item.value
                                })
                              )
                            }
                            className={`p-2.5 rounded-xl ${
                              notaData.textAlign ===
                              item.value
                                ? 'text-white'
                                : 'bg-white text-slate-500 border border-slate-200'
                            }`}
                            style={
                              notaData.textAlign ===
                              item.value
                                ? {
                                    backgroundColor:
                                      primaryColor
                                  }
                                : undefined
                            }
                          >
                            {item.icon}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                      Estilo de impresión
                    </p>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setNotaData(
                            prev => ({
                              ...prev,
                              isPrintMode:
                                false
                            })
                          )
                        }
                        className={`py-2.5 rounded-xl text-[10px] font-black uppercase ${
                          !notaData.isPrintMode
                            ? 'text-white'
                            : 'bg-white text-slate-500 border border-slate-200'
                        }`}
                        style={
                          !notaData.isPrintMode
                            ? {
                                backgroundColor:
                                  secondaryColor
                              }
                            : undefined
                        }
                      >
                        Color
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setNotaData(
                            prev => ({
                              ...prev,
                              isPrintMode:
                                true
                            })
                          )
                        }
                        className={`py-2.5 rounded-xl text-[10px] font-black uppercase ${
                          notaData.isPrintMode
                            ? 'bg-slate-800 text-white'
                            : 'bg-white text-slate-500 border border-slate-200'
                        }`}
                      >
                        Blanco
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* PREVIEW */}

              <div
                className={`flex-1 bg-slate-100 overflow-y-auto p-5 md:p-8 items-start justify-center ${
                  showMobilePreview
                    ? 'flex'
                    : 'hidden md:flex'
                }`}
              >
                <div className="w-full max-w-[720px]">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                        Vista previa
                      </p>
                      <p className="text-xs font-bold text-slate-500">
                        Formato listo para compartir o imprimir
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={
                        handleDownloadNota
                      }
                      disabled={
                        isGeneratingImg
                      }
                      className="hidden md:flex px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-[10px] font-black uppercase items-center gap-2 hover:bg-slate-50 disabled:opacity-50"
                    >
                      <Download
                        size={14}
                      />
                      Descargar imagen
                    </button>
                  </div>

                  <div
                    className={`relative mx-auto w-full max-w-[680px] aspect-[210/297] rounded-[28px] overflow-hidden shadow-2xl ${
                      notaData.isPrintMode
                        ? 'bg-white border border-slate-200'
                        : 'bg-[#fffaf0] border border-white'
                    }`}
                    style={{
                      '--note-primary':
                        primaryColor,
                      '--note-secondary':
                        secondaryColor
                    }}
                  >
                    <div
                      className="absolute top-0 left-0 right-0 h-2"
                      style={{
                        backgroundColor:
                          notaData.isPrintMode
                            ? '#94a3b8'
                            : primaryColor
                      }}
                    />

                    <div className="h-full flex flex-col p-8 md:p-12">
                      <div className="flex items-start gap-4 border-b border-slate-200 pb-7">
                        {logoUrl ? (
                          <img
                            src={logoUrl}
                            alt=""
                            className="w-16 h-16 md:w-[72px] md:h-[72px] object-contain shrink-0"
                          />
                        ) : (
                          <div
                            className="w-16 h-16 md:w-[72px] md:h-[72px] rounded-2xl shrink-0 flex items-center justify-center text-white font-black text-lg"
                            style={{
                              backgroundColor:
                                primaryColor
                            }}
                          >
                            {institutionName
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="text-base md:text-lg font-black text-slate-900 leading-tight break-words">
                            {
                              institutionName
                            }
                          </p>

                          <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 mt-1">
                            Comunicación institucional
                          </p>
                        </div>

                        <p
                          className="text-[10px] md:text-xs font-black uppercase shrink-0"
                          style={{
                            color:
                              notaData.isPrintMode
                                ? '#64748b'
                                : secondaryColor
                          }}
                        >
                          {
                            notaData.date
                          }
                        </p>
                      </div>

                      <div className="py-8 md:py-10">
                        <h1 className="text-xl md:text-3xl font-black text-slate-800 uppercase leading-tight text-center">
                          {notaData.title ||
                            'COMUNICADO'}
                        </h1>

                        <div
                          className="w-16 h-1 rounded-full mx-auto mt-4"
                          style={{
                            backgroundColor:
                              notaData.isPrintMode
                                ? '#94a3b8'
                                : secondaryColor
                          }}
                        />
                      </div>

                      <div
                        className={`flex-1 whitespace-pre-wrap break-words text-slate-700 font-medium leading-relaxed ${notaFontClass} ${notaTextAlign}`}
                      >
                        {notaData.body ||
                          'Vista previa del mensaje...'}
                      </div>

                      <div className="pt-8 mt-8 border-t border-slate-200 text-center">
                        <p
                          className="text-sm md:text-base font-black uppercase"
                          style={{
                            color:
                              notaData.isPrintMode
                                ? '#475569'
                                : primaryColor
                          }}
                        >
                          {
                            notaData.signature
                          }
                        </p>

                        <p className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.25em] text-slate-400 mt-1">
                          {
                            institutionName
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <footer className="border-t border-slate-100 bg-white p-4 md:p-5 flex flex-col md:flex-row gap-2 md:items-center md:justify-between shrink-0">
              <p className="hidden md:block text-[10px] font-semibold text-slate-400">
                La identidad institucional se toma directamente de Configuración.
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setShowNotaModal(false)
                  }
                  className="px-4 py-3 rounded-xl text-slate-400 text-xs font-black uppercase hover:bg-slate-50"
                >
                  Cerrar
                </button>

                <button
                  type="button"
                  onClick={
                    handlePrintNota
                  }
                  className="px-4 py-3 rounded-xl bg-slate-100 text-slate-700 text-xs font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-200"
                >
                  <Printer size={16} />
                  Imprimir / PDF
                </button>

                <button
                  type="button"
                  disabled={
                    isGeneratingImg
                  }
                  onClick={
                    handleDownloadNota
                  }
                  className="px-5 py-3 rounded-xl text-white text-xs font-black uppercase flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                  style={{
                    backgroundColor:
                      primaryColor
                  }}
                >
                  <Download size={16} />
                  {isGeneratingImg
                    ? 'Generando...'
                    : 'Descargar imagen'}
                </button>
              </div>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
