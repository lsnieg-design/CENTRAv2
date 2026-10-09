import React, { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, getDocs, setDoc, serverTimestamp, collection, writeBatch } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import { COLLECTIONS } from '../data/collections';
import { Building2, Palette, CalendarDays, SlidersHorizontal, Save, Plus, Trash2, CheckCircle2, RotateCcw, Image as ImageIcon, ShieldCheck, FileText, Settings2, Server, Info, Database, RefreshCw, ExternalLink, Download, UploadCloud, ChevronUp, ChevronDown, Pencil, X, AlertTriangle } from 'lucide-react';
import { DEFAULT_APP_CONFIG, normalizeAppConfig, applyBranding, PALETTES, MODULES, MODULE_CATALOG, FEATURE_LABELS, getRolePermissions, isModuleEnabled, INSTITUTION_TYPES, PLAN_OPTIONS, INSTITUTION_MODES, getStaffModeConfig, STAFF_WEEKDAYS } from '../config';
 
const normalizeRoleLabel = (role, index = 0) => {
  if (typeof role === 'string') return role.trim();
  return (
    role?.name ||
    role?.shortName ||
    role?.label ||
    role?.id ||
    `Rol ${index + 1}`
  );
};

const TABS = [
  { id: 'identity', label: 'Institución', icon: Building2 },
  { id: 'branding', label: 'Apariencia', icon: Palette },
  { id: 'structure', label: 'Estructura', icon: SlidersHorizontal },
 {
  id: 'studentFileActions',
  label: 'Acciones del legajo',
  icon: Settings2
},
  { id: 'features', label: 'Módulos', icon: Settings2 },
  { id: 'permissions', label: 'Usuarios y permisos', icon: ShieldCheck },
  { id: 'labels', label: 'Nombres y documentos', icon: FileText },
  { id: 'lists', label: 'Listas y opciones', icon: SlidersHorizontal },
  { id: 'calendar', label: 'Calendario', icon: CalendarDays },
  { id: 'import', label: 'Importación de datos', icon: Database },
  { id: 'system', label: 'Sistema', icon: Server }
];

const getListItemLabel = (item, index = 0) => {
  if (typeof item === 'string' || typeof item === 'number') {
    return String(item).trim();
  }

  if (item && typeof item === 'object') {
    return String(
      item.name ??
      item.label ??
      item.shortName ??
      item.title ??
      item.id ??
      `Opción ${index + 1}`
    ).trim();
  }

  return '';
};

const updateListItemLabel = (item, value) => {
  if (item && typeof item === 'object') {
    if (Object.prototype.hasOwnProperty.call(item, 'name')) {
      return { ...item, name: value };
    }
    if (Object.prototype.hasOwnProperty.call(item, 'label')) {
      return { ...item, label: value };
    }
    if (Object.prototype.hasOwnProperty.call(item, 'shortName')) {
      return { ...item, shortName: value };
    }
    return { ...item, name: value };
  }

  return value;
};

function ListEditor({ items = [], title, onChange, placeholder, description, allowReorder = true, allowEdit = true }) {
  const [value, setValue] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  const add = () => {
    const clean = value.trim();
    if (!clean) return;

    const duplicated = items.some(
      (item, index) => getListItemLabel(item, index).toLowerCase() === clean.toLowerCase()
    );

    if (duplicated) return;

    onChange([...items, clean]);
    setValue('');
  };

  const startEdit = (index) => {
    setEditingIndex(index);
    setEditingValue(getListItemLabel(items[index], index));
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingValue('');
  };

  const saveEdit = () => {
    if (editingIndex === null) return;

    const clean = editingValue.trim();
    if (!clean) return;

    const duplicated = items.some(
      (item, index) =>
        index !== editingIndex &&
        getListItemLabel(item, index).toLowerCase() === clean.toLowerCase()
    );

    if (duplicated) {
      alert('Ya existe una opción con ese nombre.');
      return;
    }

    onChange(
      items.map((item, index) =>
        index === editingIndex ? updateListItemLabel(item, clean) : item
      )
    );
    cancelEdit();
  };

  const moveItem = (index, direction) => {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;

    const next = [...items];
    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
    onChange(next);
  };

  const removeItem = (index) => {
    const itemLabel = getListItemLabel(items[index], index);
    if (!confirm(`¿Quitar "${itemLabel}" de esta lista?`)) return;

    onChange(items.filter((_, itemIndex) => itemIndex !== index));
    if (editingIndex === index) cancelEdit();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <div className="mb-3">
        <h3 className="font-black text-slate-800">{title}</h3>
        {description && (
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">{description}</p>
        )}
      </div>

      <div className="flex gap-2 mb-3">
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder={placeholder}
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200"
        />
        <button
          type="button"
          onClick={add}
          className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0"
          title="Agregar opción"
        >
          <Plus size={18}/>
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl bg-slate-50 border border-dashed border-slate-200 px-4 py-5 text-center">
          <p className="text-xs font-semibold text-slate-400">Todavía no hay opciones cargadas.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, index) => {
            const isEditing = editingIndex === index;
            const itemLabel = getListItemLabel(item, index);

            return (
              <div
                key={item && typeof item === 'object' && item.id != null ? `${item.id}-${index}` : `${itemLabel}-${index}`}
                className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl p-2.5"
              >
                {isEditing ? (
                  <>
                    <input
                      autoFocus
                      value={editingValue}
                      onChange={e => setEditingValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                      }}
                      className="flex-1 min-w-0 rounded-lg border border-violet-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200"
                    />
                    <button
                      type="button"
                      onClick={saveEdit}
                      className="w-9 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center"
                      title="Guardar nombre"
                    >
                      <CheckCircle2 size={15}/>
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="w-9 h-9 rounded-lg bg-white border border-slate-200 text-slate-500 flex items-center justify-center"
                      title="Cancelar"
                    >
                      <X size={15}/>
                    </button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 min-w-0 text-sm font-semibold text-slate-700 truncate">
                      {itemLabel}
                    </span>

                    {allowReorder && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveItem(index, -1)}
                          disabled={index === 0}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 flex items-center justify-center disabled:opacity-30"
                          title="Subir"
                        >
                          <ChevronUp size={14}/>
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(index, 1)}
                          disabled={index === items.length - 1}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 flex items-center justify-center disabled:opacity-30"
                          title="Bajar"
                        >
                          <ChevronDown size={14}/>
                        </button>
                      </div>
                    )}

                    {allowEdit && (
                      <button
                        type="button"
                        onClick={() => startEdit(index)}
                        className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-violet-600 flex items-center justify-center"
                        title="Editar nombre"
                      >
                        <Pencil size={14}/>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200 text-slate-400 hover:text-red-500 flex items-center justify-center"
                      title="Quitar opción"
                    >
                      <Trash2 size={14}/>
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ ok, children }) {
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-black ${ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
      <span className={`w-2 h-2 rounded-full ${ok ? 'bg-emerald-500' : 'bg-amber-500'}`} />
      {children}
    </span>
  );
}


function EventTypeEditor({ eventTypes = [], eventTypeSettings = {}, onChange }) {
  const [newName, setNewName] = useState('');

  const formatId = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toUpperCase();

  const fallbackColor = (index) => {
    const colors = ['#64748b', '#8b5cf6', '#3b82f6', '#14b8a6', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#22c55e', '#f97316'];
    return colors[index % colors.length];
  };

  const updateType = (typeId, field, value) => {
    const nextSettings = {
      ...(eventTypeSettings || {}),
      [typeId]: {
        ...((eventTypeSettings || {})[typeId] || {}),
        [field]: value
      }
    };
    onChange(eventTypes, nextSettings);
  };

  const addType = () => {
    const name = newName.trim();
    if (!name) return;

    let id = formatId(name);
    if (!id) return;

    let suffix = 2;
    while (eventTypes.includes(id)) {
      id = `${formatId(name)}_${suffix++}`;
    }

    onChange(
      [...eventTypes, id],
      {
        ...(eventTypeSettings || {}),
        [id]: {
          name,
          color: fallbackColor(eventTypes.length)
        }
      }
    );
    setNewName('');
  };

  const removeType = (typeId) => {
    if (eventTypes.length <= 1) {
      alert('El calendario necesita al menos una categoría.');
      return;
    }

    const label = eventTypeSettings?.[typeId]?.name || typeId;
    if (!confirm(`¿Quitar “${label}” de las categorías del calendario? Los eventos históricos que ya usen esta categoría conservarán su dato, pero dejará de aparecer como opción para nuevos eventos.`)) return;

    const nextTypes = eventTypes.filter(type => type !== typeId);
    const nextSettings = { ...(eventTypeSettings || {}) };
    delete nextSettings[typeId];
    onChange(nextTypes, nextSettings);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      <div>
        <h3 className="text-lg font-black text-slate-800">Etiquetas del calendario</h3>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed">
          Estas categorías definen las opciones que aparecen en el calendario. Podés cambiar el nombre visible y el color sin tocar el código. Los identificadores internos se mantienen separados para no romper eventos existentes.
        </p>
      </div>

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && addType()}
          placeholder="Ej. Reuniones con familias"
          className="flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-violet-200"
        />
        <button
          type="button"
          onClick={addType}
          className="px-4 rounded-xl bg-violet-600 text-white font-black text-sm flex items-center gap-2"
        >
          <Plus size={16} /> Agregar
        </button>
      </div>

      <div className="space-y-2">
        {eventTypes.map((typeId, index) => {
          const setting = eventTypeSettings?.[typeId] || {};
          const label = setting.name || String(typeId).replaceAll('_', ' ');

          return (
            <div key={typeId} className="grid grid-cols-[1fr_auto_auto] gap-3 items-center p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="min-w-0">
                <input
                  value={label}
                  onChange={e => updateType(typeId, 'name', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-violet-200"
                />
                <p className="text-[9px] text-slate-400 font-mono mt-1 uppercase">ID: {typeId}</p>
              </div>

              <input
                type="color"
                value={setting.color || fallbackColor(index)}
                onChange={e => updateType(typeId, 'color', e.target.value)}
                className="h-10 w-12 rounded-xl border border-slate-200 bg-white p-1"
                title={`Color de ${label}`}
              />

              <button
                type="button"
                onClick={() => removeType(typeId)}
                className="w-10 h-10 rounded-xl text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                title={`Quitar ${label}`}
              >
                <Trash2 size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}


const IMPORT_STUDENT_HEADERS = [
  'Apellido', 'Nombre', 'DNI', 'Fecha de nacimiento', 'Género',
  'Nivel o trayectoria', 'Domicilio', 'Localidad', 'Teléfono',
  'Correo electrónico', 'Obra social', 'Nombre de madre',
  'Contacto de madre', 'Nombre de padre', 'Contacto de padre',
  'Contacto de emergencia', 'Número de CUD', 'Vencimiento del CUD',
  'Observaciones'
];

const IMPORT_STAFF_HEADERS = [
  'Apellido', 'Nombre', 'DNI', 'Fecha de nacimiento', 'Domicilio',
  'Localidad', 'Teléfono', 'Correo electrónico', 'Cargo o función',
  'Fecha de ingreso', 'Modalidad', 'Turno', 'Número de cargo 1',
  'Nombre del cargo 1', 'Tipo de cargo 1', 'Situación de revista 1',
  'Fecha de alta del cargo 1', 'Número de cargo 2', 'Nombre del cargo 2',
  'Rol del cargo 2', 'Tipo de cargo 2', 'Turno del cargo 2',
  'Situación de revista 2', 'Fecha de alta del cargo 2',
  'Estado de estudios', 'Título', 'Días de trabajo', 'Horas semanales',
  'Contacto de emergencia'
];

const normalizeImportHeader = value =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const normalizeImportText = value =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const normalizeImportDni = value =>
  String(value ?? '').replace(/\D/g, '');

const readImportValue = (row, aliases = []) => {
  const normalizedAliases = new Set(aliases.map(normalizeImportHeader));
  const entry = Object.entries(row || {}).find(([key]) =>
    normalizedAliases.has(normalizeImportHeader(key))
  );
  return entry?.[1] == null ? '' : String(entry[1]).trim();
};

const parseImportDate = value => {
  if (value == null || value === '') return '';

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed?.y && parsed?.m && parsed?.d) {
      return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
    }
  }

  const raw = String(value).trim();
  if (!raw) return '';
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    return `${iso[1]}-${String(iso[2]).padStart(2, '0')}-${String(iso[3]).padStart(2, '0')}`;
  }

  const local = raw.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
  if (local) {
    return `${local[3]}-${String(local[2]).padStart(2, '0')}-${String(local[1]).padStart(2, '0')}`;
  }

  const date = new Date(raw);
  if (!Number.isNaN(date.getTime())) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  return '';
};

const getImportPersonName = row => {
  let firstName = readImportValue(row, [
    'Nombre', 'Nombres', 'First name', 'Given name', 'Nombre de pila'
  ]);
  let lastName = readImportValue(row, [
    'Apellido', 'Apellidos', 'Last name', 'Surname'
  ]);

  const fullNameEntry = Object.entries(row || {}).find(([key]) =>
    [
      'apellidoynombre', 'nombreyapellido', 'nombrecompleto',
      'fullname', 'apellidoynombres'
    ].includes(normalizeImportHeader(key))
  );

  if ((!firstName || !lastName) && fullNameEntry) {
    const header = normalizeImportHeader(fullNameEntry[0]);
    const fullName = String(fullNameEntry[1] ?? '').trim();
    if (fullName) {
      if (fullName.includes(',')) {
        const parts = fullName.split(',').map(part => part.trim()).filter(Boolean);
        if (!lastName) lastName = parts[0] || '';
        if (!firstName) firstName = parts.slice(1).join(' ') || '';
      } else {
        const parts = fullName.split(/\s+/).filter(Boolean);
        if (header.startsWith('apellidoy')) {
          if (!lastName) lastName = parts[0] || '';
          if (!firstName) firstName = parts.slice(1).join(' ');
        } else {
          if (!firstName) firstName = parts[0] || '';
          if (!lastName) lastName = parts.slice(1).join(' ');
        }
      }
    }
  }

  return { firstName: firstName.trim(), lastName: lastName.trim() };
};

const makeImportNameKeys = (record = {}) => {
  const firstName = record.firstName || record.nombre || '';
  const lastName = record.lastName || record.apellido || '';
  const fullName = record.fullName || record.name || '';
  const keys = new Set();
  const combined = normalizeImportText(`${firstName} ${lastName}`);
  const reverse = normalizeImportText(`${lastName} ${firstName}`);
  const full = normalizeImportText(fullName);
  if (combined) keys.add(combined);
  if (reverse) keys.add(reverse);
  if (full) keys.add(full);
  return [...keys];
};

const makeImportRecord = (row, type, rowNumber, staffWeekdays = []) => {
  const { firstName, lastName } = getImportPersonName(row);
  const dni = readImportValue(row, ['DNI', 'Documento', 'Número de documento', 'Nro de documento', 'Documento nacional']);
  const base = {
    firstName,
    lastName,
    fullName: `${firstName} ${lastName}`.trim(),
    dni,
    birthDate: parseImportDate(readImportValue(row, ['Fecha de nacimiento', 'Nacimiento', 'Fecha nac'])),
    address: readImportValue(row, ['Domicilio', 'Dirección', 'Direccion', 'Calle y número']),
    city: readImportValue(row, ['Localidad', 'Ciudad']),
    phone: readImportValue(row, ['Teléfono', 'Telefono', 'Celular', 'Teléfono de contacto']),
    email: readImportValue(row, ['Correo electrónico', 'Correo electronico', 'Email', 'E-mail']),
    emergencyContact: readImportValue(row, ['Contacto de emergencia', 'Contacto emergencia', 'Teléfono de emergencia'])
  };

  if (type === 'student') {
    return {
      ...base,
      gender: readImportValue(row, ['Género', 'Genero', 'Sexo']),
      level: readImportValue(row, ['Nivel o trayectoria', 'Nivel', 'Trayectoria', 'Curso', 'Sala', 'Sección']),
      healthInsurance: readImportValue(row, ['Obra social', 'Cobertura médica', 'Cobertura medica', 'Prepaga']),
      motherName: readImportValue(row, ['Nombre de madre', 'Madre', 'Nombre madre']),
      motherContact: readImportValue(row, ['Contacto de madre', 'Teléfono madre', 'Telefono madre', 'Contacto madre']),
      fatherName: readImportValue(row, ['Nombre de padre', 'Padre', 'Nombre padre']),
      fatherContact: readImportValue(row, ['Contacto de padre', 'Teléfono padre', 'Telefono padre', 'Contacto padre']),
      cudNumber: readImportValue(row, ['Número de CUD', 'Numero de CUD', 'CUD', 'Nro CUD']),
      cudExpiration: parseImportDate(readImportValue(row, ['Vencimiento del CUD', 'Vencimiento CUD', 'Fecha vencimiento CUD'])),
      notes: readImportValue(row, ['Observaciones', 'Notas', 'Comentarios']),
      rowNumber
    };
  }

  const role = readImportValue(row, [
    'Cargo o función', 'Cargo o funcion', 'Rol o función', 'Rol', 'Función', 'Funcion',
    'Cargo principal', 'Función del cargo 1'
  ]);
  const daysRaw = readImportValue(row, ['Días de trabajo', 'Dias de trabajo', 'Días de asistencia', 'Días laborales', 'Work days']);
  const parsedDays = daysRaw
    .split(/[;,|/]+/)
    .map(day => day.trim())
    .filter(Boolean)
    .map(day => {
      const normalized = normalizeImportText(day);
      const match = staffWeekdays.find(item => normalizeImportText(item) === normalized);
      return match || day;
    });

  return {
    ...base,
    role,
    modality: readImportValue(row, ['Modalidad', 'Sede / Inclusión', 'Sede o inclusión']),
    fechaIngreso: parseImportDate(readImportValue(row, ['Fecha de ingreso', 'Ingreso', 'Fecha de inicio', 'Inicio laboral'])),
    fechaInicioActividades: parseImportDate(readImportValue(row, ['Fecha de inicio de actividades', 'Inicio de actividades'])),
    antiguedadFechaRef: parseImportDate(readImportValue(row, ['Fecha de antigüedad', 'Fecha antiguedad'])) || parseImportDate(readImportValue(row, ['Fecha de ingreso', 'Ingreso', 'Fecha de inicio', 'Inicio laboral'])),
    weeklyHours: readImportValue(row, ['Horas semanales', 'Carga horaria semanal', 'Carga horaria', 'Horas por semana']),
    workDays: parsedDays,
    studyStatus: readImportValue(row, ['Estado de estudios', 'Estudios', 'Nivel de estudios']),
    degree: readImportValue(row, ['Título', 'Titulo', 'Formación', 'Formacion']),
    cargo1_role: role,
    cargo1_numero: readImportValue(row, ['Número de cargo 1', 'Numero de cargo 1', 'Nro cargo 1']),
    cargo1_name: readImportValue(row, ['Nombre del cargo 1', 'Cargo 1', 'Nombre cargo 1']),
    cargo1_type: readImportValue(row, ['Tipo de cargo 1', 'Tipo cargo 1']),
    cargo1_revista: readImportValue(row, ['Situación de revista 1', 'Situacion de revista 1', 'Revista cargo 1']),
    cargo1_turn: readImportValue(row, ['Turno', 'Turno del cargo 1', 'Turno cargo 1']),
    cargo1_ingreso: parseImportDate(readImportValue(row, ['Fecha de alta del cargo 1', 'Alta del cargo 1', 'Ingreso cargo 1'])),
    cargo1_subsidized: readImportValue(row, ['Subvencionado cargo 1', 'Cargo 1 subvencionado']).toLowerCase() === 'si' ? 'true' : 'false',
    cargo1_en_papeles: 'false',
    cargo2_numero: readImportValue(row, ['Número de cargo 2', 'Numero de cargo 2', 'Nro cargo 2']),
    cargo2_name: readImportValue(row, ['Nombre del cargo 2', 'Cargo 2', 'Nombre cargo 2']),
    cargo2_role: readImportValue(row, ['Rol del cargo 2', 'Función del cargo 2', 'Funcion cargo 2']),
    cargo2_type: readImportValue(row, ['Tipo de cargo 2', 'Tipo cargo 2']),
    cargo2_turn: readImportValue(row, ['Turno del cargo 2', 'Turno cargo 2']),
    cargo2_revista: readImportValue(row, ['Situación de revista 2', 'Situacion de revista 2', 'Revista cargo 2']),
    cargo2_ingreso: parseImportDate(readImportValue(row, ['Fecha de alta del cargo 2', 'Alta del cargo 2', 'Ingreso cargo 2'])),
    cargo2_subsidized: 'false',
    cargo2_en_papeles: 'false',
    cargo1_baja: '',
    cargo2_baja: '',
    rowNumber
  };
};

const rowHasContent = row =>
  Object.values(row || {}).some(value => String(value ?? '').trim() !== '');

const readExistingImportData = async (db, appId) => {
  const base = name => collection(db, 'artifacts', appId, 'public', 'data', name);
  const [peopleSnap, profilesSnap, staffRecordsSnap, legacyStudentsSnap, staffProfilesSnap] = await Promise.all([
    getDocs(base(COLLECTIONS.PEOPLE)),
    getDocs(base(COLLECTIONS.STUDENT_PROFILES)),
    getDocs(base('staff_records')),
    getDocs(base('students')),
    getDocs(base(COLLECTIONS.STAFF_PROFILES))
  ]);

  const people = peopleSnap.docs.map(item => ({ id: item.id, ...item.data() }));
  const studentRecords = [
    ...people.filter(item => item.type === 'student'),
    ...profilesSnap.docs.map(item => ({ id: item.id, ...item.data() })),
    ...legacyStudentsSnap.docs.map(item => ({ id: item.id, ...item.data() }))
  ];
  const staffRecords = [
    ...people.filter(item => item.type === 'staff'),
    ...staffProfilesSnap.docs.map(item => ({ id: item.id, ...item.data() })),
    ...staffRecordsSnap.docs.map(item => ({ id: item.id, ...item.data() }))
  ];

  const buildIdentity = records => {
    const dni = new Set();
    const names = new Set();
    records.forEach(record => {
      const dniKey = normalizeImportDni(record.dni || record.documento || record.documentNumber);
      if (dniKey) dni.add(dniKey);
      makeImportNameKeys(record).forEach(key => names.add(key));
    });
    return { dni, names };
  };

  return {
    students: buildIdentity(studentRecords),
    staff: buildIdentity(staffRecords)
  };
};

const createImportPreviewRows = (rawRows, type, existingIdentity, staffWeekdays = []) => {
  const seenDni = new Set();
  const seenNames = new Set();

  return rawRows
    .filter(rowHasContent)
    .map((rawRow, index) => {
      const data = makeImportRecord(rawRow, type, index + 2, staffWeekdays);
      const nameKeys = makeImportNameKeys(data);
      const dniKey = normalizeImportDni(data.dni);
      let status = 'ready';
      let detail = 'Listo para importar';

      if (!data.firstName || !data.lastName) {
        status = 'invalid';
        detail = 'Faltan nombre o apellido';
      } else if (type === 'staff' && !String(data.role || data.cargo1_role || '').trim()) {
        status = 'invalid';
        detail = 'Falta el cargo o función';
      } else if (dniKey && existingIdentity.dni.has(dniKey)) {
        status = 'duplicate';
        detail = 'El DNI ya existe en CENTRA';
      } else if (dniKey && seenDni.has(dniKey)) {
        status = 'duplicate';
        detail = 'DNI repetido en el archivo';
      } else if (!dniKey && nameKeys.some(key => existingIdentity.names.has(key))) {
        status = 'review';
        detail = 'Posible duplicado por nombre; agregá DNI o revisá el registro';
      } else if (!dniKey && nameKeys.some(key => seenNames.has(key))) {
        status = 'review';
        detail = 'Nombre repetido en el archivo; agregá DNI para distinguirlo';
      }

      if (dniKey) seenDni.add(dniKey);
      nameKeys.forEach(key => seenNames.add(key));
      return { ...data, id: `${type}-${index + 2}`, type, status, detail };
    });
};

export function ConfiguracionView({ db, appId, auth }) {
  const [tab, setTab] = useState('identity');
  const [config, setConfig] = useState(DEFAULT_APP_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });
  const [logoBusy, setLogoBusy] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [lastSavedConfig, setLastSavedConfig] = useState(DEFAULT_APP_CONFIG);
  const [systemCheck, setSystemCheck] = useState({ status: 'idle', message: '' });
  const [importPreview, setImportPreview] = useState(null);
  const [importParsing, setImportParsing] = useState(false);
  const [importSaving, setImportSaving] = useState(false);
  const [importFeedback, setImportFeedback] = useState(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!db || !appId) { setLoading(false); return; }
      try {
        const ref = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'institution');
        const snap = await getDoc(ref);
        if (!active) return;
        const next = normalizeAppConfig(snap.exists() ? snap.data() : DEFAULT_APP_CONFIG);
        setConfig(next);
        setLastSavedConfig(next);
        setSelectedRole(normalizeRoleLabel(next.roles?.[0]));
        applyBranding(next);
      } catch (error) {
        console.warn('No se pudo cargar la configuración institucional', error);
        const next = normalizeAppConfig(DEFAULT_APP_CONFIG);
        setConfig(next);
        setLastSavedConfig(next);
        setSelectedRole(normalizeRoleLabel(next.roles?.[0]));
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [db, appId]);

  const update = (key, value) => setConfig(prev => ({ ...prev, [key]: value }));
  const updateNested = (key, field, value) => setConfig(prev => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));
  const updateModule = (moduleId, value) => setConfig(prev => ({ ...prev, activeModules: { ...(prev.activeModules || {}), [moduleId]: value } }));
  const updateStructure = (key, value) => update(key, value);

  const handleEventTypesChange = (nextEventTypes, nextEventTypeSettings) => {
    setConfig(prev => ({
      ...prev,
      eventTypes: nextEventTypes,
      eventTypeSettings: nextEventTypeSettings
    }));
  };

  const roles = (Array.isArray(config.roles) ? config.roles : [])
    .map((role, index) => normalizeRoleLabel(role, index))
    .filter(Boolean);

  const handleRolesChange = (nextRoles) => {
    const safeRoles = nextRoles
      .map((role, index) => normalizeRoleLabel(role, index))
      .filter(Boolean);

    setConfig(prev => {
      const nextRolePermissions = { ...(prev.rolePermissions || {}) };
      Object.keys(nextRolePermissions).forEach(role => {
        if (!safeRoles.includes(role)) delete nextRolePermissions[role];
      });

      return {
        ...prev,
        roles: safeRoles,
        rolePermissions: nextRolePermissions
      };
    });

    if (!safeRoles.includes(selectedRole)) {
      setSelectedRole(safeRoles[0] || '');
    }
  };
  const rolePerms = selectedRole ? getRolePermissions(config, selectedRole) : {};
  const selectedPalette = PALETTES[config.palette] || { name: 'Personalizada', primary: config.primaryColor, secondary: config.secondaryColor, background: config.backgroundColor, text: config.textColor };

  const institutionMode = config.institutionMode || INSTITUTION_MODES.SCHOOL;
  const staffModeConfig = getStaffModeConfig(config);
  const configuredStaffWeekdays = Array.isArray(config.staffWeekdays) && config.staffWeekdays.length
    ? config.staffWeekdays
    : STAFF_WEEKDAYS;

  const hasUnsavedChanges = useMemo(() => {
    try {
      return JSON.stringify(normalizeAppConfig(config)) !== JSON.stringify(normalizeAppConfig(lastSavedConfig));
    } catch {
      return true;
    }
  }, [config, lastSavedConfig]);

  const updateInstitutionMode = (mode) => {
    update('institutionMode', mode);
  };

  const updatePermission = (moduleId, value) => {
    if (!selectedRole) return;
    update('rolePermissions', { ...(config.rolePermissions || {}), [selectedRole]: { ...rolePerms, [moduleId]: value } });
  };

  const allowAll = () => {
    if (!selectedRole) return;
    const next = Object.fromEntries(MODULES.map(([id]) => [id, true]));
    update('rolePermissions', { ...(config.rolePermissions || {}), [selectedRole]: next });
  };

  const removeAll = () => {
    if (!selectedRole) return;
    const next = Object.fromEntries(MODULES.map(([id]) => [id, false]));
    next.dashboard = true;
    update('rolePermissions', { ...(config.rolePermissions || {}), [selectedRole]: next });
  };

  const handleLogoUpload = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Elegí una imagen válida.'); return; }
    setLogoBusy(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const max = 600;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/webp', 0.76);
        if (dataUrl.length > 300000) {
          alert('El logo quedó demasiado pesado. Probá una imagen más simple o con menos resolución.');
          setLogoBusy(false);
          return;
        }
        update('logoUrl', dataUrl);
        setLogoBusy(false);
      };
      img.onerror = () => { alert('No se pudo leer la imagen.'); setLogoBusy(false); };
      img.src = event.target.result;
    };
    reader.onerror = () => { alert('No se pudo cargar el archivo.'); setLogoBusy(false); };
    reader.readAsDataURL(file);
  };

  const exportConfig = () => {
    const blob = new Blob([JSON.stringify(normalizeAppConfig(config), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `configuracion-institucional-${config.schoolYear || 'backup'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importConfig = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const next = normalizeAppConfig(JSON.parse(event.target.result));
        setConfig(next);
        setSelectedRole(normalizeRoleLabel(next.roles?.[0]));
        applyBranding(next);
      } catch {
        alert('El archivo de configuración no es válido.');
      }
    };
    reader.readAsText(file);
  };

  const save = async () => {
    if (!db || !appId) {
      alert('No hay una conexión disponible con la base de datos.');
      return;
    }
    setSaving(true);
    setSaved(false);
    const normalized = normalizeAppConfig(config);
    try {
      await setDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'config', 'institution'),
        { ...normalized, updatedAt: serverTimestamp() },
        { merge: true }
      );
      applyBranding(normalized);
      window.dispatchEvent(new CustomEvent('institution-config-updated', { detail: normalized }));
      setConfig(normalized);
      setLastSavedConfig(normalized);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
  console.error('ERROR REAL AL GUARDAR CONFIGURACIÓN:', {
    code: error?.code,
    message: error?.message,
    authUid: auth?.currentUser?.uid || null,
    isAnonymous: auth?.currentUser?.isAnonymous ?? null
  });

  alert(
    `Error de Firebase:\n\n` +
    `Código: ${error?.code || 'sin código'}\n` +
    `Mensaje: ${error?.message || 'sin mensaje'}\n\n` +
    `Usuario Firebase: ${auth?.currentUser?.uid || 'NINGUNO'}`
  );
} finally {
      setSaving(false);
    }
  };

  const reset = () => {
    if (!confirm('¿Restaurar la configuración inicial? Esto reemplazará los cambios actuales en el formulario.')) return;
    const next = normalizeAppConfig(DEFAULT_APP_CONFIG);
    setConfig(next);
    setSelectedRole(normalizeRoleLabel(next.roles?.[0]));
    applyBranding(next);
  };

  const addHoliday = () => {
    if (!newHoliday.date) return;
    const entry = newHoliday.name.trim() ? `${newHoliday.date}|${newHoliday.name.trim()}` : newHoliday.date;
    update('holidays', [...(config.holidays || []), entry].filter((v, i, arr) => arr.indexOf(v) === i).sort());
    setNewHoliday({ date: '', name: '' });
  };


  const downloadImportTemplate = () => {
    const workbook = XLSX.utils.book_new();
    const studentsSheet = XLSX.utils.aoa_to_sheet([IMPORT_STUDENT_HEADERS]);
    const staffSheet = XLSX.utils.aoa_to_sheet([IMPORT_STAFF_HEADERS]);
    const instructions = XLSX.utils.aoa_to_sheet([
      ['PLANTILLA DE IMPORTACIÓN DE CENTRA'],
      ['Completá las hojas Estudiantes y/o Personal. Podés usar una sola hoja si querés importar un solo tipo de registro.'],
      ['No cambies los nombres de las hojas ni los encabezados de la primera fila.'],
      ['Nombre y Apellido son obligatorios. En Personal también es obligatorio Cargo o función.'],
      ['DNI es muy recomendable para detectar duplicados. No uses fórmulas.'],
      ['Fechas: usá DD/MM/AAAA o AAAA-MM-DD. Días de trabajo: separalos con coma, por ejemplo Lunes, Miércoles, Viernes.'],
      ['La importación no crea cuentas de acceso ni asigna permisos. El personal importado quedará pendiente de vincular a una cuenta CENTRA.'],
      ['CENTRA no sobrescribe automáticamente registros existentes. Los duplicados y filas incompletas se omiten.'],
      ['La hoja Estudiantes también se utiliza para concurrentes o pacientes, según el modo de la institución.']
    ]);
    studentsSheet['!cols'] = IMPORT_STUDENT_HEADERS.map(header => ({ wch: Math.max(16, header.length + 4) }));
    staffSheet['!cols'] = IMPORT_STAFF_HEADERS.map(header => ({ wch: Math.max(16, header.length + 4) }));
    instructions['!cols'] = [{ wch: 125 }];
    XLSX.utils.book_append_sheet(workbook, studentsSheet, 'Estudiantes');
    XLSX.utils.book_append_sheet(workbook, staffSheet, 'Personal');
    XLSX.utils.book_append_sheet(workbook, instructions, 'Instrucciones');
    XLSX.writeFile(workbook, `plantilla-importacion-CENTRA-${config.schoolYear || new Date().getFullYear()}.xlsx`);
  };

  const handleImportFile = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImportFeedback(null);
    setImportPreview(null);

    if (!db || !appId) {
      setImportFeedback({ type: 'error', message: 'No hay conexión con la base de datos institucional.' });
      event.target.value = '';
      return;
    }

    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls'].includes(extension)) {
      setImportFeedback({ type: 'error', message: 'Subí un archivo Excel .xlsx o .xls. Primero podés descargar la plantilla de CENTRA.' });
      event.target.value = '';
      return;
    }

    setImportParsing(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const normalizedSheets = workbook.SheetNames.map(name => ({
        original: name,
        normalized: normalizeImportHeader(name)
      }));
      const studentsSheet = normalizedSheets.find(item =>
        ['estudiantes', 'estudiantesoconcurrentes', 'personas', 'alumnado', 'concurrentes', 'pacientes'].includes(item.normalized)
      );
      const staffSheet = normalizedSheets.find(item =>
        ['personal', 'equipodetrabajo', 'equipoinstitucional', 'staff'].includes(item.normalized)
      );

      if (!studentsSheet && !staffSheet) {
        throw new Error('No encontramos una hoja llamada Estudiantes (o Personas) ni otra llamada Personal. Descargá la plantilla y copiá tus datos en esas hojas.');
      }

      const existing = await readExistingImportData(db, appId);
      const readRows = sheetInfo => {
        if (!sheetInfo) return [];
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetInfo.original], {
          defval: '',
          raw: false,
          blankrows: false
        });
        return rows.filter(rowHasContent);
      };

      const studentRawRows = readRows(studentsSheet);
      const staffRawRows = readRows(staffSheet);
      const staffWeekdays = Array.isArray(config.staffWeekdays) && config.staffWeekdays.length
        ? config.staffWeekdays
        : STAFF_WEEKDAYS;

      const nextPreview = {
        fileName: file.name,
        studentRows: createImportPreviewRows(studentRawRows, 'student', existing.students, staffWeekdays),
        staffRows: createImportPreviewRows(staffRawRows, 'staff', existing.staff, staffWeekdays),
        foundStudentSheet: Boolean(studentsSheet),
        foundStaffSheet: Boolean(staffSheet),
        importedAt: new Date().toISOString()
      };
      setImportPreview(nextPreview);

      const totalRows = nextPreview.studentRows.length + nextPreview.staffRows.length;
      if (totalRows === 0) {
        setImportFeedback({ type: 'error', message: 'Encontramos las hojas, pero no hay filas con datos para revisar.' });
      } else {
        const readyCount = [...nextPreview.studentRows, ...nextPreview.staffRows].filter(row => row.status === 'ready').length;
        setImportFeedback({
          type: readyCount ? 'success' : 'warning',
          message: readyCount
            ? `Vista previa lista: ${readyCount} registro${readyCount === 1 ? '' : 's'} disponible${readyCount === 1 ? '' : 's'} para importar. Todavía no se guardó ningún dato.`
            : 'No hay filas listas para importar. Revisá los nombres, los DNI repetidos y los datos indicados.'
        });
      }
    } catch (error) {
      console.error('Error leyendo el archivo de importación:', error);
      setImportFeedback({ type: 'error', message: error?.message || 'No pudimos leer el Excel. Verificá el archivo e intentá otra vez.' });
    } finally {
      setImportParsing(false);
      event.target.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!importPreview || !db || !appId) return;
    const initialStudents = importPreview.studentRows.filter(row => row.status === 'ready');
    const initialStaff = importPreview.staffRows.filter(row => row.status === 'ready');
    if (!initialStudents.length && !initialStaff.length) {
      setImportFeedback({ type: 'error', message: 'No hay registros válidos para importar.' });
      return;
    }

    const confirmed = window.confirm(
      `Vas a importar ${initialStudents.length} estudiantes/concurrentes y ${initialStaff.length} integrantes del personal.\\n\\nLos duplicados e incompletos se omiten. No se crean cuentas de acceso y no se sobrescriben registros existentes. ¿Continuar?`
    );
    if (!confirmed) return;

    setImportSaving(true);
    setImportFeedback(null);

    try {
      const latestExisting = await readExistingImportData(db, appId);
      const studentDniSeen = new Set(latestExisting.students.dni);
      const studentNamesSeen = new Set(latestExisting.students.names);
      const staffDniSeen = new Set(latestExisting.staff.dni);
      const staffNamesSeen = new Set(latestExisting.staff.names);

      const filterFresh = (rows, type, dniSeen, namesSeen) => {
        const accepted = [];
        const skipped = [];
        for (const row of rows) {
          const dniKey = normalizeImportDni(row.dni);
          const nameKeys = makeImportNameKeys(row);
          if (dniKey && dniSeen.has(dniKey)) {
            skipped.push({ ...row, status: 'duplicate', detail: 'Se detectó un duplicado al confirmar la importación' });
            continue;
          }
          if (!dniKey && nameKeys.some(key => namesSeen.has(key))) {
            skipped.push({ ...row, status: 'review', detail: 'Posible duplicado detectado al confirmar; requiere DNI o revisión' });
            continue;
          }
          if (dniKey) dniSeen.add(dniKey);
          nameKeys.forEach(key => namesSeen.add(key));
          accepted.push(row);
        }
        return { accepted, skipped };
      };

      const safeStudents = filterFresh(initialStudents, 'student', studentDniSeen, studentNamesSeen);
      const safeStaff = filterFresh(initialStaff, 'staff', staffDniSeen, staffNamesSeen);
      const studentsToWrite = safeStudents.accepted;
      const staffToWrite = safeStaff.accepted;

      // Estudiantes: dos documentos por persona (people + student_profiles).
      for (let offset = 0; offset < studentsToWrite.length; offset += 200) {
        const batch = writeBatch(db);
        const chunk = studentsToWrite.slice(offset, offset + 200);
        chunk.forEach(student => {
          const personRef = doc(collection(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.PEOPLE));
          const profileRef = doc(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.STUDENT_PROFILES, personRef.id);
          const timestamp = serverTimestamp();

          batch.set(personRef, {
            firstName: student.firstName,
            lastName: student.lastName,
            fullName: student.fullName,
            type: 'student',
            active: true,
            createdAt: timestamp,
            updatedAt: timestamp,
            importedFrom: 'xlsx',
            importedBy: auth?.currentUser?.uid || ''
          });
          batch.set(profileRef, {
            personId: personRef.id,
            firstName: student.firstName,
            lastName: student.lastName,
            fullName: student.fullName,
            dni: student.dni,
            birthDate: student.birthDate,
            gender: student.gender,
            level: student.level,
            address: student.address,
            city: student.city,
            phone: student.phone,
            email: student.email,
            healthInsurance: student.healthInsurance,
            motherName: student.motherName,
            motherContact: student.motherContact,
            fatherName: student.fatherName,
            fatherContact: student.fatherContact,
            emergencyContact: student.emergencyContact,
            cudNumber: student.cudNumber,
            cudExpiration: student.cudExpiration,
            notes: student.notes,
            createdAt: timestamp,
            updatedAt: timestamp,
            importedFrom: 'xlsx',
            importedBy: auth?.currentUser?.uid || ''
          });
        });
        await batch.commit();
      }

      // Personal: se escribe en las colecciones que consumen los módulos actuales.
      // No se crea una cuenta de acceso ni se inventan permisos.
      for (let offset = 0; offset < staffToWrite.length; offset += 150) {
        const batch = writeBatch(db);
        const chunk = staffToWrite.slice(offset, offset + 150);
        chunk.forEach(staff => {
          const personRef = doc(collection(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.PEOPLE));
          const profileRef = doc(db, 'artifacts', appId, 'public', 'data', COLLECTIONS.STAFF_PROFILES, personRef.id);
          const staffRecordRef = doc(db, 'artifacts', appId, 'public', 'data', 'staff_records', personRef.id);
          const timestamp = serverTimestamp();
          const staffData = {
            lastName: staff.lastName,
            firstName: staff.firstName,
            fullName: staff.fullName,
            dni: staff.dni,
            birthDate: staff.birthDate,
            address: staff.address,
            city: staff.city,
            phone: staff.phone,
            emergencyContact: staff.emergencyContact,
            email: staff.email,
            role: staff.role || staff.cargo1_role || '',
            modality: staff.modality || '',
            fechaIngreso: staff.fechaIngreso || staff.fechaInicioActividades || '',
            fechaInicioActividades: staff.fechaInicioActividades || staff.fechaIngreso || '',
            antiguedadFechaRef: staff.antiguedadFechaRef || staff.fechaIngreso || '',
            weeklyHours: staff.weeklyHours || '',
            workDays: staff.workDays || [],
            studyStatus: staff.studyStatus || '',
            degree: staff.degree || '',
            cargo1_role: staff.cargo1_role || staff.role || '',
            cargo1_numero: staff.cargo1_numero || '',
            cargo1_name: staff.cargo1_name || '',
            cargo1_type: staff.cargo1_type || '',
            cargo1_revista: staff.cargo1_revista || '',
            cargo1_turn: staff.cargo1_turn || '',
            cargo1_ingreso: staff.cargo1_ingreso || '',
            cargo1_subsidized: staff.cargo1_subsidized || 'false',
            cargo1_en_papeles: staff.cargo1_en_papeles || 'false',
            cargo1_baja: staff.cargo1_baja || '',
            cargo2_numero: staff.cargo2_numero || '',
            cargo2_name: staff.cargo2_name || '',
            cargo2_role: staff.cargo2_role || '',
            cargo2_type: staff.cargo2_type || '',
            cargo2_turn: staff.cargo2_turn || '',
            cargo2_revista: staff.cargo2_revista || '',
            cargo2_ingreso: staff.cargo2_ingreso || '',
            cargo2_subsidized: staff.cargo2_subsidized || 'false',
            cargo2_en_papeles: staff.cargo2_en_papeles || 'false',
            cargo2_baja: staff.cargo2_baja || '',
            userId: '',
            createdAt: timestamp,
            updatedAt: timestamp,
            importedFrom: 'xlsx',
            importedBy: auth?.currentUser?.uid || ''
          };

          batch.set(personRef, {
            firstName: staff.firstName,
            lastName: staff.lastName,
            fullName: staff.fullName,
            type: 'staff',
            active: true,
            createdAt: timestamp,
            updatedAt: timestamp,
            importedFrom: 'xlsx',
            importedBy: auth?.currentUser?.uid || ''
          });
          batch.set(profileRef, {
            personId: personRef.id,
            ...staffData,
            createdAt: timestamp,
            updatedAt: timestamp
          });
          batch.set(staffRecordRef, staffData);
        });
        await batch.commit();
      }

      const importedStudentCount = studentsToWrite.length;
      const importedStaffCount = staffToWrite.length;
      const skippedRows = [...safeStudents.skipped, ...safeStaff.skipped];
      setImportFeedback({
        type: skippedRows.length ? 'warning' : 'success',
        message: `Importación terminada: ${importedStudentCount} ${institutionMode === INSTITUTION_MODES.DAY_CENTER ? 'concurrentes' : institutionMode === INSTITUTION_MODES.CLINIC ? 'pacientes' : 'estudiantes'} y ${importedStaffCount} integrantes del personal. ${skippedRows.length ? `${skippedRows.length} registro${skippedRows.length === 1 ? '' : 's'} se omitieron porque ya existían o requerían revisión; podés ver el detalle abajo.` : 'No se detectaron duplicados nuevos.'}`
      });

      setImportPreview({
        ...importPreview,
        studentRows: importPreview.studentRows.map(row => {
          const imported = studentsToWrite.some(item => item.id === row.id);
          const lateSkip = safeStudents.skipped.find(item => item.id === row.id);
          return imported ? { ...row, status: 'imported', detail: 'Importado correctamente' } : lateSkip || row;
        }),
        staffRows: importPreview.staffRows.map(row => {
          const imported = staffToWrite.some(item => item.id === row.id);
          const lateSkip = safeStaff.skipped.find(item => item.id === row.id);
          return imported ? { ...row, status: 'imported', detail: 'Importado correctamente' } : lateSkip || row;
        })
      });
    } catch (error) {
      console.error('Error en la importación de datos:', error);
      setImportFeedback({ type: 'error', message: `La importación no pudo completarse por completo: ${error?.message || 'Error de Firestore'}. Revisá los registros antes de volver a intentar para evitar duplicados.` });
    } finally {
      setImportSaving(false);
    }
  };

  const resetImportPreview = () => {
    setImportPreview(null);
    setImportFeedback(null);
  };

  const holidays = useMemo(
    () => (config.holidays || []).map(v => {
      const [date, name] = String(v).split('|');
      return { raw: v, date, name: name || '' };
    }),
    [config.holidays]
  );

  const checkSystem = async () => {
    setSystemCheck({ status: 'checking', message: 'Comprobando Firestore y autenticación…' });
    try {
      if (!db) throw new Error('Firestore no está disponible.');
      if (!auth) throw new Error('Authentication no está disponible.');
      const ref = doc(db, 'artifacts', appId, 'public', 'data', 'config', 'institution');
      await getDoc(ref);
      setSystemCheck({ status: 'success', message: 'Firebase está conectado y Firestore responde correctamente.' });
    } catch (error) {
      setSystemCheck({ status: 'error', message: error?.message || 'No se pudo comprobar la conexión.' });
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Cargando configuración…</div>;

  return (
    <div className="max-w-6xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-violet-600">Administración</p>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Configuración</h2>
          <p className="text-sm text-slate-500 mt-1">Adaptá CENTRA a cada institución sin tocar el código.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={reset} className="px-3 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-sm flex items-center gap-2"><RotateCcw size={16}/> Restablecer</button>
          <button onClick={save} disabled={saving || !hasUnsavedChanges} className="px-5 py-2.5 rounded-xl bg-violet-600 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-violet-200 disabled:opacity-50 disabled:shadow-none">
            <Save size={17}/> {saving ? 'Guardando…' : hasUnsavedChanges ? 'Guardar cambios' : 'Todo guardado'}
          </button>
        </div>
      </div>

      {saved && <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 flex items-center gap-2 font-semibold text-sm"><CheckCircle2 size={18}/> Configuración guardada correctamente.</div>}

      {hasUnsavedChanges && !saved && (
        <div className="mb-4 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-4 py-3 flex items-center gap-2 font-semibold text-sm">
          <AlertTriangle size={18} className="shrink-0"/>
          Tenés cambios sin guardar. Acordate de presionar <strong>“Guardar cambios”</strong> antes de salir.
        </div>
      )}

      <div className="grid lg:grid-cols-[235px_1fr] gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-2 h-fit lg:sticky lg:top-4">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold ${tab === id ? 'bg-violet-50 text-violet-700' : 'text-slate-500 hover:bg-slate-50'}`}>
              <Icon size={18}/>{label}
            </button>
          ))}
        </div>

        <div className="space-y-5">
          {tab === 'identity' && <>
            <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div><h3 className="text-lg font-black">Identidad de la institución</h3><p className="text-sm text-slate-500">Estos datos se usan en la app, comunicaciones y documentos.</p></div>
              <div className="grid md:grid-cols-2 gap-4">
               <div className="md:col-span-2">
  <span className="text-xs font-black uppercase text-slate-500">
    Modo de funcionamiento
  </span>

  <p className="text-sm text-slate-500 mt-1 mb-3">
    Define cómo se organiza y cómo habla CENTRA en esta institución.
  </p>

  <div className="grid md:grid-cols-3 gap-3">

    <button
      type="button"
      onClick={() => updateInstitutionMode(INSTITUTION_MODES.SCHOOL)}
      className={`text-left p-4 rounded-2xl border-2 transition ${
        institutionMode === INSTITUTION_MODES.SCHOOL
          ? 'border-violet-600 bg-violet-50 ring-2 ring-violet-100'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="text-2xl mb-2">🏫</div>
      <div className="font-black text-slate-800">
        Escuela
      </div>
      <div className="text-xs text-slate-500 mt-1">
        Estudiantes, niveles, escolaridad y grupos.
      </div>
    </button>

    <button
      type="button"
      onClick={() => updateInstitutionMode(INSTITUTION_MODES.DAY_CENTER)}
      className={`text-left p-4 rounded-2xl border-2 transition ${
        institutionMode === INSTITUTION_MODES.DAY_CENTER
          ? 'border-violet-600 bg-violet-50 ring-2 ring-violet-100'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="text-2xl mb-2">🧩</div>
      <div className="font-black text-slate-800">
        Centro de día
      </div>
      <div className="text-xs text-slate-500 mt-1">
        Concurrentes, jornadas y talleres.
      </div>
    </button>

    <button
      type="button"
      onClick={() => updateInstitutionMode(INSTITUTION_MODES.CLINIC)}
      className={`text-left p-4 rounded-2xl border-2 transition ${
        institutionMode === INSTITUTION_MODES.CLINIC
          ? 'border-violet-600 bg-violet-50 ring-2 ring-violet-100'
          : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="text-2xl mb-2">🩺</div>
      <div className="font-black text-slate-800">
        Consultorios
      </div>
      <div className="text-xs text-slate-500 mt-1">
        Pacientes, profesionales y espacios de atención.
      </div>
    </button>

  </div>
</div>

                <div className="md:col-span-2 rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
                      <Settings2 size={18} className="text-violet-600"/>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500">Personal</p>
                      <h4 className="font-black text-slate-800 mt-1">
                        {institutionMode === INSTITUTION_MODES.SCHOOL
                          ? 'Configuración escolar'
                          : institutionMode === INSTITUTION_MODES.DAY_CENTER
                            ? 'Configuración de centro de día'
                            : 'Configuración de consultorio'}
                      </h4>
                      <p className="text-sm text-slate-500 mt-1">
                        {institutionMode === INSTITUTION_MODES.SCHOOL
                          ? 'Personal conservará la lógica escolar: cargos, modalidad, turnos, fecha de inicio y antigüedad.'
                          : institutionMode === INSTITUTION_MODES.DAY_CENTER
                            ? 'Personal utilizará roles institucionales, días de asistencia, horas semanales, fecha de inicio y antigüedad. No se utilizarán Sede ni Inclusión.'
                            : 'Personal utilizará roles institucionales, días de trabajo, horas semanales, fecha de inicio y antigüedad. No se utilizarán Sede ni Inclusión.'}
                      </p>

                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600">
                          Antigüedad: {staffModeConfig.calculateSeniority ? 'activa' : 'desactivada'}
                        </span>
                        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600">
                          Roles configurables
                        </span>

                        {institutionMode === INSTITUTION_MODES.SCHOOL && (
                          <>
                            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600">
                              Cargos escolares
                            </span>
                            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600">
                              Turnos
                            </span>
                            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600">
                              Sede / Inclusión
                            </span>
                          </>
                        )}

                        {institutionMode !== INSTITUTION_MODES.SCHOOL && (
                          <>
                            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600">
                              Días de trabajo
                            </span>
                            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600">
                              Horas semanales
                            </span>
                          </>
                        )}

                        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600">
                          Fecha de inicio
                        </span>
                        <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600">
                          Antigüedad automática
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <label><span className="text-xs font-black uppercase text-slate-500">Tipo de institución</span><select value={config.institutionType || 'Otro'} onChange={e=>update('institutionType',e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 bg-white">{INSTITUTION_TYPES.map(type=><option key={type}>{type}</option>)}</select></label>
                <label><span className="text-xs font-black uppercase text-slate-500">Año lectivo</span><input type="number" value={config.schoolYear} onChange={e=>update('schoolYear',Number(e.target.value))} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>
                {[['institutionName','Nombre completo'],['institutionShortName','Nombre corto'],['portalTitle','Título del portal'],['appName','Nombre del sistema'],['email','Correo institucional'],['phone','Teléfono'],['address','Domicilio'],['city','Localidad'],['province','Provincia'],['country','País'],['website','Sitio web']].map(([key,label]) => <label key={key}><span className="text-xs font-black uppercase text-slate-500">{label}</span><input value={config[key] || ''} onChange={e=>update(key,e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:ring-2 focus:ring-violet-200" /></label>)}
              </div>
              <label className="block"><span className="text-xs font-black uppercase text-slate-500">Descripción institucional</span><textarea value={config.institutionDescription || ''} onChange={e=>update('institutionDescription',e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 min-h-28" placeholder="Breve descripción que puede utilizarse en la presentación institucional y documentos." /></label>
            </section>
          </>}

          {tab === 'branding' && <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
            <div><h3 className="text-lg font-black">Apariencia</h3><p className="text-sm text-slate-500">Elegí una paleta completa o personalizá los colores.</p></div>
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {Object.entries(PALETTES).map(([key,p]) => <button key={key} type="button" onClick={()=>setConfig(prev=>({...prev,palette:key,primaryColor:p.primary,secondaryColor:p.secondary,backgroundColor:p.background,textColor:p.text}))} className={`rounded-2xl border-2 p-3 text-left transition ${config.palette===key ? 'border-violet-600 ring-2 ring-violet-100' : 'border-slate-200 hover:border-slate-300'}`}><div className="flex gap-1 mb-2"><span className="h-8 flex-1 rounded-lg" style={{background:p.primary}}/><span className="h-8 w-14 rounded-lg" style={{background:p.secondary}}/></div><span className="font-bold text-sm text-slate-800">{p.name}</span></button>)}
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              {[['primaryColor','Principal'],['secondaryColor','Acento'],['backgroundColor','Fondo'],['textColor','Texto']].map(([key,label]) => <label key={key}><span className="text-xs font-black uppercase text-slate-500">{label}</span><div className="flex gap-2 mt-1"><input type="color" value={config[key] || '#000000'} onChange={e=>setConfig(prev=>({...prev,palette:'custom',[key]:e.target.value}))} className="h-11 w-14 rounded-xl border border-slate-200"/><input value={config[key] || ''} onChange={e=>setConfig(prev=>({...prev,palette:'custom',[key]:e.target.value}))} className="flex-1 rounded-xl border border-slate-200 px-3"/></div></label>)}
            </div>
            <div className="rounded-2xl p-5" style={{background:selectedPalette.background,color:selectedPalette.text}}><div className="flex items-center justify-between gap-4"><div><p className="text-xs font-black uppercase opacity-70">Vista previa</p><h4 className="text-2xl font-black">{config.institutionShortName || 'Mi Institución'}</h4><p className="text-sm opacity-70">Así se verá la identidad general del sistema.</p></div><div className="w-16 h-16 rounded-2xl bg-white/80 p-2 shadow-sm overflow-hidden"><img src={config.logoUrl || '/icon-192.png'} alt="Logo" className="w-full h-full object-contain"/></div></div><div className="flex gap-2 mt-4"><span className="px-4 py-2 rounded-xl text-white font-bold text-sm" style={{background:config.primaryColor}}>Botón principal</span><span className="px-4 py-2 rounded-xl text-white font-bold text-sm" style={{background:config.secondaryColor}}>Acento</span></div></div>
            <div className="space-y-2"><span className="text-xs font-black uppercase text-slate-500">Logo institucional</span><div className="flex flex-col md:flex-row gap-4 items-start"><div className="w-24 h-24 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0"><img src={config.logoUrl || '/icon-192.png'} alt="Vista previa" className="max-w-full max-h-full object-contain p-2"/></div><div className="space-y-2"><label className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-violet-600 text-white font-bold text-sm cursor-pointer"><ImageIcon size={17}/>{logoBusy ? 'Procesando…' : 'Elegir imagen'}<input type="file" accept="image/*" className="hidden" onChange={e=>handleLogoUpload(e.target.files?.[0])}/></label><p className="text-xs text-slate-400">El archivo se comprime automáticamente.</p></div></div></div>
          </section>}

          {tab === 'structure' && (
            <section className="space-y-4">
              <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 text-sm text-violet-900">
                <p className="font-black">La estructura es propia de cada institución.</p>
                <p className="mt-1 leading-relaxed">
                  Acá definís las opciones que después aparecerán en formularios, legajos, grupos y demás módulos de CENTRA.
                  Podés agregar, editar, ordenar o quitar opciones sin tocar el código.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <ListEditor
                  title={config.labels.sites || 'Sedes'}
                  items={config.sites || []}
                  onChange={v => updateStructure('sites', v)}
                  placeholder="Ej. Sede Centro"
                  description="Ubicaciones o sedes físicas donde funciona la institución."
                />

                <ListEditor
                  title={config.labels.levels || 'Niveles'}
                  items={config.levels || []}
                  onChange={v => updateStructure('levels', v)}
                  placeholder="Ej. Primaria"
                  description="Niveles, etapas o tramos institucionales."
                />

                <ListEditor
                  title={config.labels.sections || 'Secciones'}
                  items={config.sections || []}
                  onChange={v => updateStructure('sections', v)}
                  placeholder="Ej. 1° A"
                  description="Cursos, salas, secciones o grupos formales."
                />

                <ListEditor
                  title={config.labels.areas || 'Áreas'}
                  items={config.areas || []}
                  onChange={v => updateStructure('areas', v)}
                  placeholder="Ej. Psicología"
                  description="Áreas profesionales, pedagógicas o funcionales."
                />

                <ListEditor
                  title={config.labels.teams || 'Equipos'}
                  items={config.teams || []}
                  onChange={v => updateStructure('teams', v)}
                  placeholder="Ej. Equipo Técnico"
                  description="Equipos de trabajo, coordinación o acompañamiento."
                />
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                <p className="text-xs font-black uppercase tracking-wider text-slate-500">Modo actual</p>
                <p className="font-black text-slate-800 mt-1">
                  {institutionMode === INSTITUTION_MODES.SCHOOL
                    ? 'Escuela'
                    : institutionMode === INSTITUTION_MODES.DAY_CENTER
                      ? 'Centro de día'
                      : 'Consultorios'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  La estructura disponible puede crecer con cada tipo de institución sin modificar la base del producto.
                </p>
              </div>
            </section>
          )}

{tab === 'studentFileActions' && (
  <div className="space-y-5">

    <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">

      <div>
        <p className="text-xs font-black uppercase tracking-widest text-violet-600">
          Legajos
        </p>

        <h3 className="text-lg font-black text-slate-900">
          Acciones del legajo
        </h3>

        <p className="text-sm text-slate-500 mt-1">
          Elegí qué acciones estarán disponibles
          cuando se consulte el legajo de un estudiante.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-3">

        {[
          ['edit', 'Editar legajo'],
          ['bitacora', 'Ver bitácora'],
          ['print', 'Imprimir legajo'],
          [
            'toggleActive',
            'Dar de baja / Reactivar'
          ]
        ].map(([key, label]) => (

          <label
            key={key}
            className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200"
          >

            <div>
              <p className="text-sm font-black text-slate-800">
                {label}
              </p>

              <p className="text-xs text-slate-500 mt-1">
                {key === 'edit' &&
                  'Permite modificar los datos del legajo.'}

                {key === 'bitacora' &&
                  'Permite consultar el historial del estudiante.'}

                {key === 'print' &&
                  'Permite generar el legajo imprimible.'}

                {key === 'toggleActive' &&
                  'Permite dar de baja o reactivar al estudiante.'}
              </p>
            </div>

            <input
              type="checkbox"
              checked={
                config.document
                  ?.studentFileActions?.[key] !== false
              }
              onChange={event =>
                setConfig(prev => ({
                  ...prev,

                  document: {
                    ...(prev.document || {}),

                    studentFileActions: {
                      ...(prev.document
                        ?.studentFileActions || {}),

                      [key]:
                        event.target.checked
                    }
                  }
                }))
              }
              className="w-5 h-5 accent-violet-600"
            />

          </label>

        ))}

      </div>

    </section>

    <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">

      <div>
        <p className="text-xs font-black uppercase tracking-widest text-emerald-600">
          Bitácora
        </p>

        <h3 className="text-lg font-black text-slate-900">
          Acciones de la bitácora
        </h3>

        <p className="text-sm text-slate-500 mt-1">
          Definí qué acciones estarán disponibles
          dentro de la bitácora.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-3">

        {[
          ['add', 'Agregar registro'],
          ['print', 'Imprimir bitácora']
        ].map(([key, label]) => (

          <label
            key={key}
            className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200"
          >

            <div>
              <p className="text-sm font-black text-slate-800">
                {label}
              </p>

              <p className="text-xs text-slate-500 mt-1">
                {key === 'add'
                  ? 'Permite escribir nuevos registros.'
                  : 'Permite imprimir el historial de bitácora.'}
              </p>
            </div>

            <input
              type="checkbox"
              checked={
                config.document
                  ?.bitacoraActions?.[key] !== false
              }
              onChange={event =>
                setConfig(prev => ({
                  ...prev,

                  document: {
                    ...(prev.document || {}),

                    bitacoraActions: {
                      ...(prev.document
                        ?.bitacoraActions || {}),

                      [key]:
                        event.target.checked
                    }
                  }
                }))
              }
              className="w-5 h-5 accent-violet-600"
            />

          </label>

        ))}

      </div>

    </section>

    <section className="rounded-2xl bg-violet-50 border border-violet-100 p-4">

      <p className="text-sm font-bold text-violet-900">
        Esta funcionalidad también puede
        desactivarse completamente desde
        <strong> Configuración → Módulos</strong>.
      </p>

      <p className="text-xs text-violet-700 mt-1">
        Cuando esté desactivada, CENTRA no mostrará
        las acciones del legajo.
      </p>

    </section>

  </div>
)}
         
         {tab === 'features' && <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
            <div><h3 className="text-lg font-black">Módulos y funcionalidades</h3><p className="text-sm text-slate-500">Elegí qué partes del sistema estarán disponibles en esta instalación.</p></div>
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><p className="text-xs font-black uppercase text-slate-500">Paquete</p><p className="font-black text-slate-800">{PLAN_OPTIONS.find(p=>p.key===config.plan?.key)?.name || 'Personalizado'}</p><p className="text-xs text-slate-500 mt-1">{PLAN_OPTIONS.find(p=>p.key===config.plan?.key)?.description || ''}</p></div><select value={config.plan?.key || 'custom'} onChange={e=>update('plan',{key:e.target.value,name:PLAN_OPTIONS.find(p=>p.key===e.target.value)?.name || 'Personalizado'})} className="rounded-xl border border-slate-200 px-3 py-2.5 bg-white font-bold">{PLAN_OPTIONS.map(plan=><option key={plan.key} value={plan.key}>{plan.name}</option>)}</select></div>
            </div>
            <div className="rounded-2xl bg-violet-50 border border-violet-100 p-4 text-sm text-violet-900"><strong>Consejo:</strong> desactivá módulos que la institución no contrató o no necesita. Se ocultan del menú y el sistema bloquea su acceso.</div>
            <div className="grid md:grid-cols-2 gap-3">
              {MODULES.map(([id,label]) => {
                const meta = MODULE_CATALOG[id] || {};
                const enabled = isModuleEnabled(config,id);
                return <label key={id} className={`flex items-start gap-3 p-4 rounded-2xl border transition ${enabled ? 'bg-white border-slate-200' : 'bg-slate-50 border-slate-200 opacity-70'}`}><input type="checkbox" checked={enabled} disabled={!!meta.required} onChange={e=>updateModule(id,e.target.checked)} className="w-5 h-5 mt-0.5 accent-violet-600"/><span className="min-w-0"><span className="block text-sm font-black text-slate-800">{label}{meta.required ? ' · siempre disponible' : ''}</span><span className="block text-xs text-slate-500 mt-1">{meta.description || 'Funcionalidad del sistema.'}</span></span></label>;
              })}
            </div>
          </section>}

          {tab === 'permissions' && (
            <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
              <div>
                <h3 className="text-lg font-black">Usuarios y permisos</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Acá configurás los permisos de cada <strong>tipo de usuario institucional</strong>. Los tipos que aparecen en esta pantalla son exactamente los que definiste en Listas y opciones → Roles.
                </p>
              </div>

              {roles.length === 0 ? (
                <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                  Primero configurá al menos un tipo de usuario en <strong>Listas y opciones → Roles</strong>.
                </div>
              ) : (
                <div className="grid md:grid-cols-[240px_1fr] gap-5">
                  <div className="space-y-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">Tipos de usuario</p>
                    {roles.map(role => {
                      const permissions = getRolePermissions(config, role);
                      const enabledCount = MODULES.filter(([id]) => permissions[id]).length;
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setSelectedRole(role)}
                          className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm transition border ${selectedRole === role ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-slate-50 text-slate-600 border-transparent hover:bg-slate-100'}`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="truncate">{role}</span>
                            <span className="text-[9px] font-black bg-white border border-slate-200 rounded-full px-2 py-1 text-slate-400 shrink-0">{enabledCount}/{MODULES.length}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Permisos del tipo de usuario</p>
                        <h4 className="font-black text-slate-800 mt-1">{selectedRole || 'Elegí un tipo de usuario'}</h4>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button type="button" onClick={allowAll} className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-200 bg-white">Dar todos</button>
                        <button type="button" onClick={removeAll} className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-200 bg-white">Quitar todos</button>
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-2">
                      {MODULES.map(([id, label]) => (
                        <label key={id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-transparent hover:border-slate-200">
                          <span className="text-sm font-semibold">{label}</span>
                          <input type="checkbox" checked={!!rolePerms[id]} onChange={e => updatePermission(id, e.target.checked)} className="w-5 h-5 accent-violet-600" />
                        </label>
                      ))}
                    </div>

                    <div className="mt-4 rounded-2xl bg-blue-50 border border-blue-200 p-4 text-xs text-blue-800 leading-relaxed">
                      <strong>Importante:</strong> el tipo de usuario institucional (por ejemplo, Docente, Tallerista o Psicología) es independiente del nivel técnico de administración de CENTRA. La administración de la instalación se controla por separado al crear o editar una cuenta.
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {tab === 'labels' && <>
            <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4"><div><h3 className="text-lg font-black">Nombres del sistema</h3><p className="text-sm text-slate-500">Adaptá el vocabulario a la forma en que trabaja la institución.</p></div><div className="grid md:grid-cols-2 gap-4">{Object.entries(config.labels || {}).map(([key,value])=><label key={key}><span className="text-xs font-black uppercase text-slate-500">{key}</span><input value={value || ''} onChange={e=>updateNested('labels',key,e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>)}</div></section>
            <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4"><div><h3 className="text-lg font-black">Documentos</h3><p className="text-sm text-slate-500">Datos que aparecen en los documentos generados por el sistema.</p></div><div className="grid md:grid-cols-2 gap-4"><label><span className="text-xs font-black uppercase text-slate-500">Encabezado</span><textarea value={config.document?.header || ''} onChange={e=>updateNested('document','header',e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 min-h-24" /></label><label><span className="text-xs font-black uppercase text-slate-500">Pie de documento</span><textarea value={config.document?.footer || ''} onChange={e=>updateNested('document','footer',e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 min-h-24" /></label><label><span className="text-xs font-black uppercase text-slate-500">Nombre de firma</span><input value={config.document?.signatureName || ''} onChange={e=>updateNested('document','signatureName',e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label><label><span className="text-xs font-black uppercase text-slate-500">Cargo de firma</span><input value={config.document?.signatureRole || ''} onChange={e=>updateNested('document','signatureRole',e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label></div><label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"><input type="checkbox" checked={config.document?.showLogo !== false} onChange={e=>updateNested('document','showLogo',e.target.checked)} className="w-5 h-5 accent-violet-600"/><span className="text-sm font-semibold">Mostrar logo en documentos</span></label></section>
          </>}

          {tab === 'lists' && (
            <div className="grid gap-4">

              <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
                <div>
                  <h3 className="text-lg font-black">Roles del personal</h3>
                  <p className="text-sm text-slate-500">
                    Cargá los roles que realmente existen en esta institución. La misma lista se utilizará para crear y editar Personal, y también para configurar permisos.
                  </p>
                </div>

                <ListEditor
                  title="Roles"
                  items={roles}
                  onChange={handleRolesChange}
                  description="Podés agregar, editar, ordenar o quitar roles. Los cambios se aplican al presionar Guardar cambios."
                  placeholder={
                    institutionMode === INSTITUTION_MODES.SCHOOL
                      ? 'Ej. Docente'
                      : institutionMode === INSTITUTION_MODES.DAY_CENTER
                        ? 'Ej. Tallerista'
                        : 'Ej. Psicología'
                  }
                />
              </section>

              {institutionMode === INSTITUTION_MODES.SCHOOL && (
                <>
                  <ListEditor
                    title="Turnos"
                    items={config.turns || []}
                    onChange={v => update('turns', v)}
                    placeholder="Ej. Mañana"
                    description="Turnos en los que se organiza la actividad institucional."
                  />

                  <ListEditor
                    title="Tipos de jornada"
                    items={config.scheduleTypes || []}
                    onChange={v => update('scheduleTypes', v)}
                    placeholder="Ej. Jornada completa"
                    description="Modalidades de jornada disponibles en la institución."
                  />

                  <ListEditor
                    title="Modalidades"
                    items={config.modalities || []}
                    onChange={v => update('modalities', v)}
                    placeholder="Ej. Sede"
                    description="Modalidades institucionales que pueden utilizarse en los registros."
                  />
                </>
              )}

              {institutionMode !== INSTITUTION_MODES.SCHOOL && (
                <>
                  <ListEditor
                    title="Días de trabajo del personal"
                    items={configuredStaffWeekdays}
                    onChange={v => update('staffWeekdays', v)}
                    placeholder="Ej. Lunes"
                    description="Días habilitados para organizar la disponibilidad del equipo."
                  />

                  <ListEditor
                    title="Tipos de jornada"
                    items={config.scheduleTypes || []}
                    onChange={v => update('scheduleTypes', v)}
                    placeholder="Ej. Jornada simple"
                    description="Tipos de jornada o modalidad horaria propios de la institución."
                  />
                </>
              )}

              <div className="rounded-2xl bg-blue-50 border border-blue-200 p-4">
                <p className="text-sm font-black text-blue-900">Las etiquetas del calendario se configuran en Configuración → Calendario.</p>
                <p className="text-xs text-blue-700 mt-1 leading-relaxed">Ahí podés agregar categorías, cambiar el nombre visible y definir sus colores. Así evitamos tener dos lugares distintos modificando la misma lista.</p>
              </div>

              <div className="rounded-2xl bg-violet-50 border border-violet-100 p-4">
                <p className="text-sm font-bold text-violet-900">
                  {institutionMode === INSTITUTION_MODES.SCHOOL
                    ? 'En la escuela podés adaptar turnos, tipos de jornada y modalidades a la organización real de la institución.'
                    : institutionMode === INSTITUTION_MODES.DAY_CENTER
                      ? 'En centro de día el equipo se organiza mediante roles, días de trabajo y tipos de jornada, sin depender de una estructura escolar.'
                      : 'En consultorios el equipo se organiza mediante roles, días de trabajo y tipos de jornada o atención, según la configuración de la institución.'}
                </p>
              </div>

            </div>
          )}

{tab === 'calendar' && (
            <section className="space-y-4">
              <EventTypeEditor
                eventTypes={config.eventTypes || []}
                eventTypeSettings={config.eventTypeSettings || {}}
                onChange={handleEventTypesChange}
              />

              <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
                <div>
                  <h3 className="text-lg font-black">Días no laborables</h3>
                  <p className="text-sm text-slate-500">Podés cargar feriados, jornadas institucionales, recesos u otros días sin actividad.</p>
                </div>
                <div className="grid md:grid-cols-[180px_1fr_auto] gap-2">
                  <input type="date" value={newHoliday.date} onChange={e=>setNewHoliday(v=>({...v,date:e.target.value}))} className="rounded-xl border border-slate-200 px-3 py-2.5"/>
                  <input value={newHoliday.name} onChange={e=>setNewHoliday(v=>({...v,name:e.target.value}))} placeholder="Nombre del día" className="rounded-xl border border-slate-200 px-3 py-2.5"/>
                  <button type="button" onClick={addHoliday} className="rounded-xl bg-violet-600 text-white px-4 font-bold flex items-center justify-center gap-2"><Plus size={16}/> Agregar</button>
                </div>
                <div className="space-y-2">
                  {holidays.length===0 ? <div className="text-sm text-slate-400 py-5 text-center">No hay días cargados.</div> : holidays.map(h=><div key={h.raw} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3"><div><span className="font-bold">{h.date}</span>{h.name&&<span className="text-slate-500 ml-2">— {h.name}</span>}</div><button type="button" onClick={()=>update('holidays',config.holidays.filter(x=>x!==h.raw))} className="text-slate-400 hover:text-red-500"><Trash2 size={17}/></button></div>)}
                </div>
              </section>
            </section>
          )}

          {tab === 'import' && (
            <section className="space-y-5">
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="bg-gradient-to-r from-violet-50 to-indigo-50 p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-violet-700 shadow-sm">
                      <Database size={23} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black uppercase tracking-widest text-violet-700">Carga inicial</p>
                      <h3 className="mt-1 text-xl font-black text-slate-900">Importación de datos</h3>
                      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
                        Cargá de una sola vez los legajos y el personal desde un Excel. Primero revisamos los datos; recién se guardan cuando confirmás la importación.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-3 p-5 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-slate-500"><FileText size={17}/><span className="text-xs font-black uppercase">Personas</span></div>
                    <p className="mt-2 text-sm font-bold text-slate-800">
                      {institutionMode === INSTITUTION_MODES.DAY_CENTER ? 'Concurrentes' : institutionMode === INSTITUTION_MODES.CLINIC ? 'Pacientes' : 'Estudiantes'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Se integran con Legajos usando la arquitectura actual de CENTRA.</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-slate-500"><Settings2 size={17}/><span className="text-xs font-black uppercase">Personal</span></div>
                    <p className="mt-2 text-sm font-bold text-slate-800">Datos laborales</p>
                    <p className="mt-1 text-xs text-slate-500">Se cargan los datos del equipo; no se crean cuentas de acceso.</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-2 text-slate-500"><ShieldCheck size={17}/><span className="text-xs font-black uppercase">Revisión previa</span></div>
                    <p className="mt-2 text-sm font-bold text-slate-800">Sin sobrescritura automática</p>
                    <p className="mt-1 text-xs text-slate-500">Los registros duplicados o incompletos quedan fuera de la importación.</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><Download size={19}/></div>
                    <div>
                      <h4 className="font-black text-slate-800">1. Descargá la plantilla</h4>
                      <p className="mt-1 text-sm leading-relaxed text-slate-500">Incluye dos hojas: Estudiantes y Personal. Podés completar una sola o ambas.</p>
                    </div>
                  </div>
                  <button type="button" onClick={downloadImportTemplate} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-black text-white transition hover:bg-violet-700">
                    <Download size={17}/> Descargar plantilla Excel
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><UploadCloud size={19}/></div>
                    <div>
                      <h4 className="font-black text-slate-800">2. Subí el Excel completo</h4>
                      <p className="mt-1 text-sm leading-relaxed text-slate-500">Acepta archivos .xlsx y .xls con las hojas de la plantilla. El archivo se procesa en esta pantalla y no se guarda en el navegador.</p>
                    </div>
                  </div>
                  <label className={`mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-violet-300 hover:bg-violet-50 ${importParsing || importSaving ? 'pointer-events-none opacity-60' : ''}`}>
                    <UploadCloud size={17}/>
                    {importParsing ? 'Leyendo archivo…' : 'Elegir archivo Excel'}
                    <input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" className="hidden" disabled={importParsing || importSaving} onChange={handleImportFile}/>
                  </label>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700"/>
                  <div className="text-sm leading-relaxed text-amber-900">
                    <p className="font-black">Antes de confirmar</p>
                    <p className="mt-1">Revisá los datos porque se incorporarán a la base institucional. No importamos automáticamente filas sin nombre y apellido, duplicados de DNI ni nombres que parecen repetidos. Para el personal, esta carga no crea usuarios: las cuentas se gestionan aparte y luego se vinculan al registro laboral.</p>
                  </div>
                </div>
              </div>

              {importFeedback && (
                <div role="status" className={`flex items-start gap-3 rounded-2xl border p-4 text-sm leading-relaxed ${
                  importFeedback.type === 'error'
                    ? 'border-red-200 bg-red-50 text-red-800'
                    : importFeedback.type === 'warning'
                      ? 'border-amber-200 bg-amber-50 text-amber-900'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-800'
                }`}>
                  {importFeedback.type === 'error' ? <AlertTriangle size={18} className="mt-0.5 shrink-0"/> : <CheckCircle2 size={18} className="mt-0.5 shrink-0"/>}
                  <span className="flex-1">{importFeedback.message}</span>
                  <button type="button" onClick={() => setImportFeedback(null)} className="rounded-lg p-1 opacity-70 hover:opacity-100" aria-label="Cerrar mensaje"><X size={15}/></button>
                </div>
              )}

              {importPreview && (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-widest text-slate-400">Vista previa</p>
                      <h4 className="mt-1 break-all font-black text-slate-900">{importPreview.fileName}</h4>
                      <p className="mt-1 text-xs text-slate-500">Todavía no se guardó ningún dato.</p>
                    </div>
                    <button type="button" onClick={resetImportPreview} disabled={importSaving} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50"><X size={14}/> Quitar vista previa</button>
                  </div>

                  {[
                    { key: 'studentRows', title: institutionMode === INSTITUTION_MODES.DAY_CENTER ? 'Concurrentes / estudiantes' : institutionMode === INSTITUTION_MODES.CLINIC ? 'Pacientes / personas' : 'Estudiantes', countLabel: 'registros' },
                    { key: 'staffRows', title: 'Personal', countLabel: 'integrantes' }
                  ].map(section => {
                    const rows = importPreview[section.key] || [];
                    if (!rows.length && !importPreview[section.key === 'studentRows' ? 'foundStudentSheet' : 'foundStaffSheet']) return null;
                    const ready = rows.filter(row => row.status === 'ready').length;
                    const imported = rows.filter(row => row.status === 'imported').length;
                    const issueCount = rows.filter(row => !['ready', 'imported'].includes(row.status)).length;
                    return (
                      <section key={section.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                        <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div><h4 className="font-black text-slate-800">{section.title}</h4><p className="mt-1 text-xs text-slate-500">{rows.length} {section.countLabel} en la planilla</p></div>
                          <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">{ready} listos</span>
                            {imported > 0 && <span className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700">{imported} importados</span>}
                            {issueCount > 0 && <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-800">{issueCount} revisar</span>}
                          </div>
                        </div>
                        {rows.length ? (
                          <div className="max-h-[360px] overflow-auto">
                            <table className="w-full min-w-[760px] text-left text-xs">
                              <thead className="sticky top-0 z-10 bg-white text-[10px] uppercase tracking-wide text-slate-400 shadow-sm">
                                <tr>
                                  <th className="px-3 py-3">Fila</th>
                                  <th className="px-3 py-3">Apellido y nombre</th>
                                  <th className="px-3 py-3">DNI</th>
                                  {section.key === 'staffRows' && <th className="px-3 py-3">Función</th>}
                                  <th className="px-3 py-3">Estado</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {rows.map(row => {
                                  const statusClass = row.status === 'ready'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : row.status === 'imported'
                                      ? 'bg-blue-50 text-blue-700'
                                      : row.status === 'duplicate'
                                        ? 'bg-red-50 text-red-700'
                                        : 'bg-amber-50 text-amber-800';
                                  const statusLabel = row.status === 'ready'
                                    ? 'Listo'
                                    : row.status === 'imported'
                                      ? 'Importado'
                                      : row.status === 'duplicate'
                                        ? 'Duplicado'
                                        : row.status === 'invalid'
                                          ? 'Incompleto'
                                          : 'Revisar';
                                  return (
                                    <tr key={row.id} className={row.status === 'ready' ? '' : 'bg-amber-50/30'}>
                                      <td className="px-3 py-3 text-slate-400">{row.rowNumber}</td>
                                      <td className="px-3 py-3"><div className="font-bold text-slate-800">{row.lastName}, {row.firstName}</div><div className="mt-0.5 max-w-sm truncate text-[10px] text-slate-400">{row.detail}</div></td>
                                      <td className="px-3 py-3 text-slate-600">{row.dni || '—'}</td>
                                      {section.key === 'staffRows' && <td className="px-3 py-3 text-slate-600">{row.role || row.cargo1_role || '—'}</td>}
                                      <td className="px-3 py-3"><span className={`inline-flex rounded-full px-2.5 py-1 font-black ${statusClass}`}>{statusLabel}</span></td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <div className="p-4 text-sm text-slate-500">La hoja está presente, pero no contiene registros.</div>
                        )}
                      </section>
                    );
                  })}

                  <div className="flex flex-col-reverse gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs leading-relaxed text-slate-500">Solo se importarán las filas marcadas como <strong>Listo</strong>. Las demás no se guardan y deben revisarse en el Excel.</p>
                    <button
                      type="button"
                      onClick={handleConfirmImport}
                      disabled={importSaving || importParsing || ![...importPreview.studentRows, ...importPreview.staffRows].some(row => row.status === 'ready')}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {importSaving ? <RefreshCw size={17} className="animate-spin"/> : <CheckCircle2 size={17}/>}
                      {importSaving ? 'Importando…' : 'Confirmar e importar'}
                    </button>
                  </div>
                </div>
              )}
            </section>
          )}

          {tab === 'system' && <section className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
              <div><h3 className="text-lg font-black">Estado del sistema</h3><p className="text-sm text-slate-500">Información útil para la instalación y el mantenimiento de CENTRA.</p></div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase text-slate-400">Firestore</p><p className="font-bold text-slate-800 mt-1">Base de datos</p></div><StatusBadge ok={!!db}> {db ? 'Conectado' : 'No disponible'} </StatusBadge></div></div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase text-slate-400">Authentication</p><p className="font-bold text-slate-800 mt-1">Usuarios</p></div><StatusBadge ok={!!auth}> {auth ? 'Disponible' : 'No disponible'} </StatusBadge></div></div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4"><p className="text-xs font-black uppercase text-slate-400">Identificador de instalación</p><p className="font-mono text-sm text-slate-700 mt-2 break-all">{appId || '—'}</p></div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4"><p className="text-xs font-black uppercase text-slate-400">Institución configurada</p><p className="font-bold text-slate-800 mt-2">{config.institutionName || 'Mi Institución'}</p></div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4"><p className="text-xs font-black uppercase text-slate-400">Sesión actual</p><p className="font-bold text-slate-800 mt-2">{auth?.currentUser ? (auth.currentUser.email || 'Autenticado') : 'Sin sesión Firebase'}</p></div>
              </div>
              <div className="flex flex-wrap gap-2"><button onClick={checkSystem} disabled={systemCheck.status==='checking'} className="px-4 py-3 rounded-xl bg-violet-600 text-white font-bold text-sm flex items-center gap-2"><RefreshCw size={16} className={systemCheck.status==='checking'?'animate-spin':''}/> Probar conexión</button><button onClick={exportConfig} className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-sm flex items-center gap-2"><Download size={16}/> Respaldar configuración</button><label className="px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 font-bold text-sm cursor-pointer flex items-center gap-2"><UploadCloud size={16}/> Restaurar configuración<input type="file" accept="application/json" className="hidden" onChange={e=>importConfig(e.target.files?.[0])}/></label></div>
              {systemCheck.message && <div className={`rounded-xl p-4 text-sm font-semibold ${systemCheck.status==='success'?'bg-emerald-50 border border-emerald-200 text-emerald-700':systemCheck.status==='error'?'bg-red-50 border border-red-200 text-red-700':'bg-slate-50 border border-slate-200 text-slate-700'}`}>{systemCheck.message}</div>}
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex items-start gap-3"><div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center"><Info size={18}/></div><div><h3 className="text-lg font-black">Sobre CENTRA</h3><p className="text-sm text-slate-500">La instalación puede personalizarse para cada institución sin modificar el código.</p></div></div>
              <div className="grid md:grid-cols-2 gap-3"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-black uppercase text-slate-400">Desarrollado por</p><p className="font-black text-slate-800 mt-1">NOMADE</p><a href="https://www.somosnomade.com.ar/" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm text-violet-600 font-bold mt-2">somosnomade.com.ar <ExternalLink size={14}/></a></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs font-black uppercase text-slate-400">Estado de instalación</p><p className="font-black text-slate-800 mt-1">{config.installation?.complete ? 'Instalación completada' : 'Configuración pendiente'}</p></div></div>
              <div className="rounded-xl bg-slate-50 p-4 flex items-start gap-3"><Database size={18} className="text-violet-600 mt-0.5"/><div><p className="text-sm font-black text-slate-800">Datos de conexión</p><p className="text-xs text-slate-500 mt-1">La configuración pública de Firebase se usa para conectar esta instalación. La seguridad real depende de Authentication y de las reglas de Firestore y Storage.</p></div></div>
            </div>
          </section>}
        </div>
      </div>
    </div>
  );
}
