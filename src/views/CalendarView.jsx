import React, { useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  X,
  Edit3,
  RefreshCw,
  UploadCloud
} from 'lucide-react';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import {
  getCachedAppConfig,
  canAccessModule
} from '../config';

const DEFAULT_EVENT_STYLES = [
  ['ACTO', 'Acto', 'bg-orange-50 text-orange-800 border-orange-200'],
  ['CUMPLEAÑOS', 'Cumpleaños', 'bg-pink-50 text-pink-800 border-pink-200'],
  ['SALIDAS EDUCATIVAS', 'Salida', 'bg-emerald-50 text-emerald-800 border-emerald-200'],
  ['ENCUENTROS CON FAMILIAS', 'Familias', 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200'],
  ['REUNIONES', 'Reunión', 'bg-violet-50 text-violet-800 border-violet-200'],
  ['CALENDARIO ACADÉMICO', 'Académico', 'bg-blue-50 text-blue-800 border-blue-200'],
  ['EFEMÉRIDES', 'Efeméride', 'bg-cyan-50 text-cyan-800 border-cyan-200'],
  ['TAREAS ADMINISTRATIVAS', 'Administrativo', 'bg-slate-100 text-slate-700 border-slate-200'],
  ['FERIADO', 'Feriado', 'bg-red-50 text-red-800 border-red-200'],
  ['TECNICO', 'Privado', 'bg-teal-50 text-teal-800 border-teal-200'],
  ['GENERAL', 'General', 'bg-slate-50 text-slate-700 border-slate-200']
];

const STYLE_BY_TYPE = Object.fromEntries(
  DEFAULT_EVENT_STYLES.map(([id, label, className]) => [id, { label, className }])
);

const formatMonth = (date) => {
  const value = date.toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric'
  });

  return value.charAt(0).toUpperCase() + value.slice(1);
};

const formatLongDate = (dateString) => {
  if (!dateString) return '';

  return new Date(`${dateString}T00:00:00`).toLocaleDateString('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

const normalizeDate = (value) => {
  if (!value) return '';

  const [year, month, day] = String(value)
    .split('-')
    .map(Number);

  if (!year || !month || !day) return '';

  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
};

const formatEventType = (type) => {
  const fallback = String(type || 'GENERAL').toLowerCase();

  return fallback.charAt(0).toUpperCase() + fallback.slice(1);
};

const getEventStyle = (type, metaMap = {}) => {
  const meta = metaMap?.[type];

  if (!meta) {
    return {
      backgroundColor: '#f8fafc',
      borderColor: '#e2e8f0',
      color: '#475569'
    };
  }

  return {
    backgroundColor: `${meta.color}14`,
    borderColor: `${meta.color}45`,
    color: meta.color
  };
};

const getEventLabel = (type, metaMap = {}) => {
  return metaMap?.[type]?.name || formatEventType(type);
};

export function CalendarView({
  events = [],
  canEdit = false,
  user,
  db,
  appId
}) {
  const appConfig = getCachedAppConfig();

  const role = user?.role || user?.rol || '';

  const configuredEventTypes = Array.isArray(appConfig.eventTypes)
    ? appConfig.eventTypes
    : ['GENERAL'];

  const eventTypeConfig = useMemo(() => {
    const fallbackColors = [
      '#8b5cf6',
      '#3b82f6',
      '#14b8a6',
      '#f59e0b',
      '#ef4444',
      '#ec4899',
      '#06b6d4',
      '#64748b',
      '#22c55e',
      '#f97316'
    ];

    const normalized = configuredEventTypes
      .map((item, index) => {
        if (typeof item === 'string') {
          return {
            id: item,
            name: item.replaceAll('_', ' '),
            color: fallbackColors[index % fallbackColors.length]
          };
        }

        return {
          id: item?.id || `EVENTO_${index}`,
          name: item?.name || item?.label || `Evento ${index + 1}`,
          color: item?.color || fallbackColors[index % fallbackColors.length]
        };
      })
      .filter(item => item.id !== 'TECNICO');

    if (!normalized.some(item => item.id === 'GENERAL')) {
      normalized.unshift({
        id: 'GENERAL',
        name: 'General',
        color: '#64748b'
      });
    }

    return normalized;
  }, [configuredEventTypes]);

  const eventTypes = eventTypeConfig.map(item => item.id);

  const eventTypeById = Object.fromEntries(
    eventTypeConfig.map(item => [item.id, item])
  );

  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState(() => {
    if (typeof window === 'undefined') return 'month';
    return localStorage.getItem('centra_calendar_view') || 'month';
  });

  const [selectedDayEvents, setSelectedDayEvents] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);

  const [filterType, setFilterType] = useState('TODOS');

  const [showQuickLoad, setShowQuickLoad] = useState(false);
  const [quickText, setQuickText] = useState('');

  const [processing, setProcessing] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  const canManage = !!canEdit;

  const moduleEnabled = (moduleId) =>
    canAccessModule(
      appConfig,
      role,
      moduleId
    );

  const visibleEvents = useMemo(() => {
    return (events || []).filter(
      event => event?.type !== 'TECNICO'
    );
  }, [events]);

  const displayedEvents = useMemo(() => {
    return visibleEvents.filter(event => {
      if (filterType === 'TODOS') return true;

      return event.type === filterType;
    });
  }, [visibleEvents, filterType]);

  const changePeriod = (offset) => {
    setCurrentDate(previous => {
      const next = new Date(previous);

      if (viewMode === 'week') {
        next.setDate(
          next.getDate() + offset * 7
        );
      } else {
        next.setMonth(
          next.getMonth() + offset
        );
      }

      return next;
    });
  };

  const goToday = () => {
    setCurrentDate(new Date());
  };

  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();

    const diff =
      day === 0
        ? -6
        : 1 - day;

    d.setDate(
      d.getDate() + diff
    );

    d.setHours(
      0,
      0,
      0,
      0
    );

    return d;
  };

  const weekStart = getWeekStart(currentDate);

  const weekDays = Array.from(
    { length: 7 },
    (_, index) => {
      const d = new Date(
        weekStart
      );

      d.setDate(
        weekStart.getDate() + index
      );

      return d;
    }
  );

  const getDateString = (date) => {
    return [
      date.getFullYear(),
      String(
        date.getMonth() + 1
      ).padStart(2, '0'),
      String(
        date.getDate()
      ).padStart(2, '0')
    ].join('-');
  };

  const eventsForDate = (dateStr) =>
    displayedEvents
      .filter(
        event => event.date === dateStr
      )
      .sort(
        (a, b) =>
          String(a.title || '')
            .localeCompare(
              String(b.title || '')
            )
      );

  const handleTouchStart = (e) => {
    setTouchEnd(null);

    setTouchStart(
      e.targetTouches[0]?.clientX ?? null
    );
  };

  const handleTouchMove = (e) => {
    setTouchEnd(
      e.targetTouches[0]?.clientX ?? null
    );
  };

  const handleTouchEnd = () => {
    if (
      touchStart == null ||
      touchEnd == null
    ) {
      return;
    }

    const distance =
      touchStart - touchEnd;

    if (
      Math.abs(distance) < 50
    ) {
      return;
    }

    changePeriod(
      distance > 0 ? 1 : -1
    );

    setTouchStart(null);
    setTouchEnd(null);
  };

  const handleDayClick = (dateStr) => {
    const eventsOnDay =
      eventsForDate(dateStr);

    setSelectedDayEvents({
      date: dateStr,
      events: eventsOnDay
    });
  };

  const handlePhotoChange = (e) => {
    const file =
      e.target.files?.[0];

    if (!file) return;

    if (
      !file.type.startsWith(
        'image/'
      )
    ) {
      alert(
        'Elegí una imagen válida.'
      );

      return;
    }

    setUploading(true);

    const reader =
      new FileReader();

    reader.onload = event => {
      const img = new Image();

      img.onload = () => {
        const maxWidth = 1000;

        const scale =
          Math.min(
            1,
            maxWidth /
              Math.max(
                img.width,
                1
              )
          );

        const canvas =
          document.createElement(
            'canvas'
          );

        canvas.width =
          Math.max(
            1,
            Math.round(
              img.width * scale
            )
          );

        canvas.height =
          Math.max(
            1,
            Math.round(
              img.height * scale
            )
          );

        const ctx =
          canvas.getContext(
            '2d'
          );

        if (!ctx) {
          setUploading(false);

          alert(
            'No se pudo procesar la imagen.'
          );

          return;
        }

        ctx.drawImage(
          img,
          0,
          0,
          canvas.width,
          canvas.height
        );

        const dataUrl =
          canvas.toDataURL(
            'image/webp',
            0.78
          );

        if (
          dataUrl.length > 450000
        ) {
          setUploading(false);

          alert(
            'La imagen sigue siendo demasiado pesada. Probá con una imagen más simple.'
          );

          return;
        }

        setPhotoPreview(
          dataUrl
        );

        setUploading(false);
      };

      img.onerror = () => {
        setUploading(false);

        alert(
          'No se pudo leer la imagen.'
        );
      };

      img.src =
        event.target.result;
    };

    reader.onerror = () => {
      setUploading(false);

      alert(
        'No se pudo cargar el archivo.'
      );
    };

    reader.readAsDataURL(file);
  };

  const deleteEvent = async (id) => {
    if (
      !canManage ||
      !db ||
      !appId
    ) {
      return;
    }

    if (
      !window.confirm(
        '¿Querés eliminar este evento?'
      )
    ) {
      return;
    }

    try {
      await deleteDoc(
        doc(
          db,
          'artifacts',
          appId,
          'public',
          'data',
          'events',
          id
        )
      );

      setSelectedDayEvents(
        current => {
          if (!current) {
            return current;
          }

          const updated =
            current.events.filter(
              event =>
                event.id !== id
            );

          return {
            ...current,
            events: updated
          };
        }
      );
    } catch (error) {
      console.error(
        error
      );

      alert(
        `No se pudo eliminar el evento: ${error.message}`
      );
    }
  };

  const handleSaveEvent = async e => {
    e.preventDefault();

    if (
      !canManage ||
      !db ||
      !appId
    ) {
      alert(
        'No tenés permisos para modificar la agenda.'
      );

      return;
    }

    const form =
      new FormData(
        e.currentTarget
      );

    const type = String(
      form.get('type') ||
        'GENERAL'
    );

    const title =
      String(
        form.get('title') || ''
      ).trim();

    const date =
      normalizeDate(
        form.get('date')
      );

    const description =
      String(
        form.get(
          'description'
        ) || ''
      ).trim();

    if (
      !title ||
      !date
    ) {
      alert(
        'Completá el título y la fecha.'
      );

      return;
    }

    if (
      type === 'TECNICO'
    ) {
      return;
    }

    const data = {
      title,
      date,
      type,
      description,
      author:
        user?.firstName ||
        user?.fullName ||
        'Usuario',
      authorId:
        user?.id || '',
      imageUrl: String(
        photoPreview ||
          editingEvent?.imageUrl ||
          ''
      )
    };

    setProcessing(true);

    try {
      if (
        editingEvent?.id
      ) {
        await updateDoc(
          doc(
            db,
            'artifacts',
            appId,
            'public',
            'data',
            'events',
            editingEvent.id
          ),
          data
        );
      } else {
        await addDoc(
          collection(
            db,
            'artifacts',
            appId,
            'public',
            'data',
            'events'
          ),
          {
            ...data,
            createdAt:
              serverTimestamp()
          }
        );
      }

      setShowModal(false);
      setEditingEvent(null);
      setPhotoPreview(null);

      if (
        selectedDayEvents?.date ===
        date
      ) {
        setSelectedDayEvents(
          null
        );
      }
    } catch (error) {
      console.error(
        'Calendar save error:',
        error
      );

      alert(
        `No se pudo guardar el evento: ${error.message}`
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleQuickSave =
    async () => {
      if (
        !canManage ||
        !db ||
        !appId
      ) {
        return;
      }

      const lines =
        quickText
          .split('\n')
          .map(
            line =>
              line.trim()
          )
          .filter(Boolean);

      if (
        !lines.length
      ) {
        alert(
          'Pegá al menos un evento.'
        );

        return;
      }

      setProcessing(true);

      try {
        const validLines =
          [];

        const invalidLines =
          [];

        lines.forEach(
          line => {
            const match =
              line.match(
                /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\s+(.+)$/
              );

            if (!match) {
              invalidLines.push(
                line
              );

              return;
            }

            let [
              ,
              day,
              month,
              year,
              rawTitle
            ] = match;

            if (
              year.length === 2
            ) {
              year =
                `20${year}`;
            }

            const isoDate =
              `${year}-${String(
                month
              ).padStart(
                2,
                '0'
              )}-${String(
                day
              ).padStart(
                2,
                '0'
              )}`;

            validLines.push({
              date: isoDate,
              title:
                rawTitle.trim()
            });
          }
        );

        if (
          !validLines.length
        ) {
          alert(
            'No encontré ninguna línea con un formato válido.'
          );

          return;
        }

        const configuredTypes =
          eventTypes.filter(
            type =>
              type !==
              'GENERAL'
          );

        await Promise.all(
          validLines.map(
            ({
              date,
              title
            }) => {
              let finalType =
                'GENERAL';

              let finalTitle =
                title;

              for (
                const type of configuredTypes
              ) {
                const eventName =
                  eventTypeById[
                    type
                  ]?.name ||
                  type;

                if (
                  finalTitle
                    .toUpperCase()
                    .includes(
                      eventName
                        .toUpperCase()
                    )
                ) {
                  finalType =
                    type;

                  const safeName =
                    eventName.replace(
                      /[.*+?^${}()|[\]\\]/g,
                      '\\$&'
                    );

                  finalTitle =
                    finalTitle
                      .replace(
                        new RegExp(
                          `\\(?\\b${safeName}\\b\\)?`,
                          'i'
                        ),
                        ''
                      )
                      .replace(
                        /^[:\-\s]+|[:\-\s]+$/g,
                        ''
                      )
                      .trim();

                  break;
                }
              }

              return addDoc(
                collection(
                  db,
                  'artifacts',
                  appId,
                  'public',
                  'data',
                  'events'
                ),
                {
                  title:
                    finalTitle ||
                    finalType,
                  date,
                  type:
                    finalType,
                  description: '',
                  author:
                    user?.firstName ||
                    user?.fullName ||
                    'Usuario',
                  authorId:
                    user?.id || '',
                  imageUrl: '',
                  bulkLoaded: true,
                  createdAt:
                    serverTimestamp()
                }
              );
            }
          )
        );

        setShowQuickLoad(
          false
        );

        setQuickText('');

        if (
          invalidLines.length
        ) {
          alert(
            `Se cargaron ${validLines.length} eventos. ${invalidLines.length} línea(s) no pudieron interpretarse.`
          );
        }
      } catch (error) {
        console.error(
          'Bulk calendar save error:',
          error
        );

        alert(
          `No se pudo completar la carga: ${error.message}`
        );
      } finally {
        setProcessing(false);
      }
    };

  const openNew = (
    date = selectedDayEvents?.date ||
      ''
  ) => {
    if (!canManage) {
      return;
    }

    setEditingEvent(
      date
        ? { date }
        : null
    );

    setPhotoPreview(null);
    setShowModal(true);
  };

  const openEdit = event => {
    if (!canManage) {
      return;
    }

    setEditingEvent(
      event
    );

    setPhotoPreview(
      event.imageUrl ||
        null
    );

    setShowModal(true);
  };

  const renderMonthGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);

    const firstDayIndex =
      firstDay.getDay() === 0
        ? 6
        : firstDay.getDay() - 1;

    const daysInMonth =
      new Date(year, month + 1, 0).getDate();

    const totalCells =
      Math.ceil(
        (firstDayIndex + daysInMonth) / 7
      ) * 7;

    const cells = [];

    for (
      let cellIndex = 0;
      cellIndex < totalCells;
      cellIndex++
    ) {
      const dayNumber =
        cellIndex - firstDayIndex + 1;

      if (
        dayNumber < 1 ||
        dayNumber > daysInMonth
      ) {
        cells.push(
          <div
            key={`empty-${cellIndex}`}
            className="min-w-0 min-h-0 bg-slate-50/70"
          />
        );

        continue;
      }

      const date =
        new Date(
          year,
          month,
          dayNumber
        );

      const dateStr =
        getDateString(date);

      const dayEvents =
        eventsForDate(dateStr);

      const isToday =
        getDateString(new Date()) ===
        dateStr;

      cells.push(
        <button
          key={dateStr}
          type="button"
          onClick={() =>
            handleDayClick(dateStr)
          }
          className={`group relative min-w-0 min-h-0 overflow-hidden text-left p-2 transition bg-white hover:bg-violet-50/40 ${
            isToday
              ? 'ring-2 ring-inset ring-violet-300 bg-violet-50/50'
              : ''
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span
              className={`text-[11px] font-black rounded-full w-6 h-6 flex items-center justify-center ${
                isToday
                  ? 'bg-violet-600 text-white'
                  : 'text-slate-500'
              }`}
            >
              {dayNumber}
            </span>

            {dayEvents.length > 0 && (
              <span className="text-[9px] font-black text-slate-400">
                {dayEvents.length}
              </span>
            )}
          </div>

          <div className="space-y-1 overflow-hidden mt-1">
            {dayEvents
              .slice(0, 4)
              .map((event, index) => (
                <div
  key={`${
    event.id ||
    event.title
  }-${index}`}
  className="w-full min-w-0 h-6 flex items-center gap-1 rounded-md px-2 text-[9px] md:text-[10px] truncate font-semibold border"
  style={getEventStyle(
    event.type,
    eventTypeById
  )}
  title={event.title}
>
  <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-current" />
  <span className="truncate">
    {event.title}
  </span>
</div>
              ))}

            {dayEvents.length > 4 && (
              <span className="text-[9px] font-bold text-violet-600 px-1">
                +{dayEvents.length - 4} más
              </span>
            )}
          </div>

          {canManage && (
            <span className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition text-violet-400">
              <Plus size={14} />
            </span>
          )}
        </button>
      );
    }

    return cells;
  };

  const renderWeekGrid = () => (
    <div className="w-full min-w-0 grid grid-cols-1 md:grid-cols-7 gap-px bg-slate-200">
      {weekDays.map(
        date => {
          const dateStr =
            getDateString(
              date
            );

          const dayEvents =
            eventsForDate(
              dateStr
            );

          const isToday =
            getDateString(
              new Date()
            ) === dateStr;

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() =>
                handleDayClick(
                  dateStr
                )
              }
              className={`min-w-0 overflow-hidden text-left min-h-[180px] md:min-h-[520px] p-3 bg-white hover:bg-violet-50/30 transition ${
                isToday
                  ? 'bg-violet-50/60'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    {date.toLocaleDateString(
                      'es-AR',
                      {
                        weekday:
                          'short'
                      }
                    )}
                  </p>

                  <p
                    className={`text-2xl font-black ${
                      isToday
                        ? 'text-violet-600'
                        : 'text-slate-800'
                    }`}
                  >
                    {
                      date.getDate()
                    }
                  </p>
                </div>

                {isToday && (
                  <span className="px-2 py-1 rounded-full bg-violet-600 text-white text-[9px] font-black uppercase">
                    Hoy
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {dayEvents.length ===
                0 ? (
                  <div className="border border-dashed border-slate-200 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-slate-300 font-semibold">
                      Sin eventos
                    </p>
                  </div>
                ) : (
                  dayEvents.map(
                    (
                      event,
                      index
                    ) => (
                      <div
                        key={`${
                          event.id ||
                          event.title
                        }-${index}`}
                        className="p-2.5 rounded-xl border"
                        style={getEventStyle(
                          event.type,
                          eventTypeById
                        )}
                      >
                        <p className="text-[9px] font-black uppercase opacity-70 mb-1">
                          {getEventLabel(
                            event.type,
                            eventTypeById
                          )}
                        </p>

                        <p className="text-xs font-bold leading-snug">
                          {
                            event.title
                          }
                        </p>
                      </div>
                    )
                  )
                )}
              </div>
            </button>
          );
        }
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full min-h-0 w-full min-w-0 bg-white rounded-3xl border border-slate-200 overflow-hidden animate-in fade-in select-none">
      
      <div className="p-4 border-b border-slate-200 bg-white shrink-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-600 mb-1">
              Agenda institucional
            </p>

            <h2 className="text-xl md:text-2xl font-black text-slate-900">
              {viewMode === 'month'
                ? formatMonth(
                    currentDate
                  )
                : `${weekDays[0].toLocaleDateString(
                    'es-AR',
                    {
                      day: 'numeric',
                      month: 'short'
                    }
                  )} – ${weekDays[6].toLocaleDateString(
                    'es-AR',
                    {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    }
                  )}`}
            </h2>

            <p className="text-xs text-slate-500 mt-1">
              {displayedEvents.length === 0
                ? 'No hay eventos para mostrar'
                : `${displayedEvents.length} evento${displayedEvents.length === 1 ? '' : 's'} visible${displayedEvents.length === 1 ? '' : 's'}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            
            <div className="flex bg-slate-100 rounded-xl p-1">
              
              <button
                onClick={() =>
                  changePeriod(-1)
                }
                className="p-2 text-slate-600 hover:bg-white rounded-lg transition"
                title={
                  viewMode ===
                  'month'
                    ? 'Mes anterior'
                    : 'Semana anterior'
                }
                aria-label={
                  viewMode ===
                  'month'
                    ? 'Mes anterior'
                    : 'Semana anterior'
                }
              >
                <ChevronLeft
                  size={17}
                />
              </button>

              <button
                onClick={goToday}
                className="px-3 text-xs font-bold text-slate-600 hover:bg-white rounded-lg transition"
              >
                Hoy
              </button>

              <button
                onClick={() =>
                  changePeriod(1)
                }
                className="p-2 text-slate-600 hover:bg-white rounded-lg transition"
                title={
                  viewMode ===
                  'month'
                    ? 'Mes siguiente'
                    : 'Semana siguiente'
                }
                aria-label={
                  viewMode ===
                  'month'
                    ? 'Mes siguiente'
                    : 'Semana siguiente'
                }
              >
                <ChevronRight
                  size={17}
                />
              </button>
            </div>

            <div className="flex bg-slate-100 rounded-xl p-1">
              <button
                type="button"
                onClick={() => {
                  setViewMode('week');
                  localStorage.setItem(
                    'centra_calendar_view',
                    'week'
                  );
                }}
                className={`px-3 py-2 rounded-lg text-xs font-bold ${
                  viewMode ===
                  'week'
                    ? 'bg-white text-violet-700 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                Semana
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewMode('month');
                  localStorage.setItem(
                    'centra_calendar_view',
                    'month'
                  );
                }}
                className={`px-3 py-2 rounded-lg text-xs font-bold ${
                  viewMode ===
                  'month'
                    ? 'bg-white text-violet-700 shadow-sm'
                    : 'text-slate-500'
                }`}
              >
                Mes
              </button>
            </div>

            {canManage && (
              <>
                <button
                  onClick={() =>
                    setShowQuickLoad(
                      current =>
                        !current
                    )
                  }
                  className={`p-2.5 rounded-xl border transition ${
                    showQuickLoad
                      ? 'bg-violet-600 text-white border-violet-600'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                  title="Carga rápida"
                  aria-label="Carga rápida"
                >
                  <UploadCloud
                    size={18}
                  />
                </button>

                <button
                  onClick={() =>
                    openNew()
                  }
                  className="bg-violet-600 text-white px-3.5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm hover:bg-violet-700 transition"
                >
                  <Plus
                    size={16}
                  />
                  Nuevo evento
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto px-4 py-3 bg-white border-b border-slate-200 no-scrollbar">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 shrink-0 mr-1">
          Mostrar
        </span>

        <button
          onClick={() => setFilterType('TODOS')}
          className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition border ${
            filterType === 'TODOS'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
          }`}
        >
          Todos
        </button>

        {eventTypes.map(type => {
          const meta = eventTypeById[type];
          const active = filterType === type;

          return (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-full text-[10px] font-bold whitespace-nowrap transition border flex items-center gap-1.5 ${
                active
                  ? 'bg-white shadow-sm'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
              }`}
              style={
                active
                  ? {
                      borderColor: meta?.color || '#64748b',
                      color: meta?.color || '#64748b'
                    }
                  : undefined
              }
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: meta?.color || '#64748b'
                }}
              />
              {getEventLabel(type, eventTypeById)}
            </button>
          );
        })}
      </div>

      {showQuickLoad &&
        canManage && (
          <div className="bg-violet-50 border-b border-violet-100 p-4">
            <div className="flex justify-between items-center gap-3 mb-2">
              <div>
                <h3 className="font-black text-violet-900 text-xs uppercase">
                  Carga rápida
                </h3>

                <p className="text-[11px] text-violet-700/70 mt-0.5">
                  Una fecha y un título por línea.
                </p>
              </div>

              <button
                onClick={() =>
                  setShowQuickLoad(
                    false
                  )
                }
                aria-label="Cerrar carga rápida"
              >
                <X
                  size={16}
                  className="text-violet-500"
                />
              </button>
            </div>

            <textarea
              value={quickText}
              onChange={e =>
                setQuickText(
                  e.target.value
                )
              }
              className="w-full h-28 p-3 rounded-xl border border-violet-200 text-xs outline-none bg-white"
              placeholder="10/05/2026 Reunión de equipo (REUNIONES)"
            />

            <button
              onClick={
                handleQuickSave
              }
              disabled={
                processing
              }
              className="mt-2 w-full bg-violet-600 text-white font-bold py-2.5 rounded-xl text-xs transition flex justify-center gap-2 disabled:opacity-60"
            >
              {processing ? (
                <>
                  <RefreshCw
                    className="animate-spin"
                    size={14}
                  />
                  Procesando…
                </>
              ) : (
                'Procesar y guardar'
              )}
            </button>
          </div>
        )}

      {viewMode === 'month' ? (
        <div className="flex flex-col flex-1 min-h-0 min-w-0 w-full bg-slate-100/50">
          <div className="w-full min-w-0 grid grid-cols-7 bg-white border-b border-slate-200 shrink-0">
            {[
              'Lun',
              'Mar',
              'Mié',
              'Jue',
              'Vie',
              'Sáb',
              'Dom'
            ].map(day => (
              <div
                key={day}
                className="min-w-0 py-2.5 text-center text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest"
              >
                {day}
              </div>
            ))}
          </div>

          <div
            className="flex-1 min-h-0 min-w-0 w-full overflow-hidden"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="w-full h-full min-h-0 grid grid-cols-7 gap-px bg-slate-200"
              style={{ gridAutoRows: '1fr' }}
            >
              {renderMonthGrid()}
            </div>
          </div>
        </div>
      ) : (
        <div
          className="flex-1 min-h-0 min-w-0 w-full overflow-auto bg-slate-100/50"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {renderWeekGrid()}
        </div>
      )}

      {showModal &&
        canManage && (
          <div className="fixed inset-0 bg-slate-900/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm">
            <form
              onSubmit={
                handleSaveEvent
              }
              className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-violet-600">
                    Agenda
                  </p>

                  <h3 className="text-xl font-black text-slate-900 mt-1">
                    {editingEvent?.id
                      ? 'Editar evento'
                      : 'Nuevo evento'}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowModal(
                      false
                    );
                    setEditingEvent(
                      null
                    );
                    setPhotoPreview(
                      null
                    );
                  }}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200"
                  aria-label="Cerrar"
                >
                  <X
                    size={18}
                  />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase">
                  Título
                </label>

                <input
                  name="title"
                  defaultValue={
                    editingEvent?.title ||
                    ''
                  }
                  placeholder="Ej.: Reunión de equipo"
                  required
                  className="w-full p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-violet-200"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">
                    Fecha
                  </label>

                  <input
                    name="date"
                    type="date"
                    defaultValue={
                      editingEvent?.date ||
                      selectedDayEvents?.date ||
                      ''
                    }
                    required
                    className="w-full p-3 rounded-xl border border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase">
                    Tipo
                  </label>

                  <select
                    name="type"
                    defaultValue={
                      editingEvent?.type ||
                      'GENERAL'
                    }
                    className="w-full p-3 rounded-xl border border-slate-200 bg-white"
                  >
                    {eventTypes.map(
                      type => (
                        <option
                          key={type}
                          value={
                            type
                          }
                        >
                          {
                            getEventLabel(
                              type,
                              eventTypeById
                            )
                          }
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase">
                  Descripción
                </label>

                <textarea
                  name="description"
                  defaultValue={
                    editingEvent?.description ||
                    ''
                  }
                  placeholder="Agregá información que ayude a entender el evento."
                  className="w-full min-h-28 p-3 rounded-xl border border-slate-200 outline-none resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase">
                  Imagen
                </label>

                <div className="border border-dashed border-slate-300 rounded-2xl p-4 bg-slate-50">
                  {photoPreview ? (
                    <div className="relative">
                      <img
                        src={
                          photoPreview
                        }
                        alt="Vista previa del evento"
                        className="w-full max-h-56 object-cover rounded-xl"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setPhotoPreview(
                            null
                          )
                        }
                        className="absolute top-2 right-2 bg-white text-red-500 p-2 rounded-xl shadow"
                        aria-label="Quitar imagen"
                      >
                        <Trash2
                          size={15}
                        />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center gap-2 py-6 text-slate-400 cursor-pointer">
                      <UploadCloud
                        size={24}
                      />

                      <span className="text-xs font-bold">
                        {uploading
                          ? 'Procesando imagen…'
                          : 'Agregar imagen'}
                      </span>

                      <input
                        type="file"
                        accept="image/*"
                        onChange={
                          handlePhotoChange
                        }
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(
                      false
                    );
                    setEditingEvent(
                      null
                    );
                    setPhotoPreview(
                      null
                    );
                  }}
                  className="flex-1 py-3 text-slate-500 font-bold text-sm rounded-xl hover:bg-slate-50"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={
                    processing ||
                    uploading
                  }
                  className="flex-1 py-3 bg-violet-600 text-white rounded-xl font-bold text-sm hover:bg-violet-700 disabled:opacity-60"
                >
                  {processing
                    ? 'Guardando…'
                    : 'Guardar evento'}
                </button>
              </div>
            </form>
          </div>
        )}

      {selectedDayEvents && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-[250] flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() =>
            setSelectedDayEvents(
              null
            )
          }
        >
          <div
            className="bg-white rounded-3xl w-full max-w-lg p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
            onClick={e =>
              e.stopPropagation()
            }
          >
            <div className="flex justify-between items-start gap-4 mb-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-violet-600">
                  Agenda
                </p>

                <h2 className="text-xl font-black text-slate-900 mt-1 capitalize">
                  {formatLongDate(
                    selectedDayEvents.date
                  )}
                </h2>
              </div>

              <button
                onClick={() =>
                  setSelectedDayEvents(
                    null
                  )
                }
                className="p-2 bg-slate-100 rounded-xl"
                aria-label="Cerrar"
              >
                <X
                  size={18}
                />
              </button>
            </div>

            {canManage && (
              <button
                onClick={() =>
                  openNew(
                    selectedDayEvents.date
                  )
                }
                className="w-full py-3 mb-4 border border-dashed border-violet-300 text-violet-600 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-violet-50 transition"
              >
                <Plus
                  size={15}
                />
                Agregar evento
              </button>
            )}

            {selectedDayEvents.events
              .length ===
            0 ? (
              <div className="py-10 text-center">
                <CalendarIcon
                  size={32}
                  className="mx-auto text-slate-300 mb-3"
                />

                <p className="font-bold text-slate-700">
                  No hay eventos este día
                </p>

                <p className="text-xs text-slate-400 mt-1">
                  {canManage
                    ? 'Podés agregar uno desde el botón de arriba.'
                    : 'No hay actividades cargadas para esta fecha.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDayEvents.events.map(
                  event => (
                    <article
                      key={
                        event.id
                      }
                      className="p-4 rounded-2xl border relative"
                      style={getEventStyle(
                        event.type,
                        eventTypeById
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <span className="text-[9px] font-black px-2 py-1 rounded-full bg-white/70 uppercase inline-block">
                            {
                              getEventLabel(
                                event.type,
                                eventTypeById
                              )
                            }
                          </span>

                          <h3 className="font-black text-base mt-2 break-words">
                            {
                              event.title
                            }
                          </h3>
                        </div>

                        {canManage && (
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() =>
                                openEdit(
                                  event
                                )
                              }
                              className="p-2 bg-white/70 rounded-lg"
                              aria-label="Editar evento"
                            >
                              <Edit3
                                size={14}
                              />
                            </button>

                            <button
                              onClick={() =>
                                deleteEvent(
                                  event.id
                                )
                              }
                              className="p-2 bg-white/70 text-red-600 rounded-lg"
                              aria-label="Eliminar evento"
                            >
                              <Trash2
                                size={14}
                              />
                            </button>
                          </div>
                        )}
                      </div>

                      {event.imageUrl && (
                        <img
                          src={
                            event.imageUrl
                          }
                          alt=""
                          className="mt-3 rounded-xl w-full max-h-56 object-cover"
                        />
                      )}

                      {event.description && (
                        <p className="text-sm mt-3 opacity-90 leading-relaxed">
                          {
                            event.description
                          }
                        </p>
                      )}
                    </article>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
