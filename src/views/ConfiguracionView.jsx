import React, { useEffect, useMemo, useState } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Building2, Palette, CalendarDays, SlidersHorizontal, Save, Plus, Trash2, CheckCircle2, RotateCcw, Image as ImageIcon, ShieldCheck, FileText, Settings2, Server, Info, Database, RefreshCw, ExternalLink, Download, UploadCloud } from 'lucide-react';
import { DEFAULT_APP_CONFIG, normalizeAppConfig, cacheAppConfig, applyBranding, PALETTES, MODULES, MODULE_CATALOG, FEATURE_LABELS, getRolePermissions, isModuleEnabled, INSTITUTION_TYPES, PLAN_OPTIONS } from '../config';
 
const TABS = [
  { id: 'identity', label: 'Institución', icon: Building2 },
  { id: 'branding', label: 'Apariencia', icon: Palette },
  { id: 'structure', label: 'Estructura', icon: SlidersHorizontal },
  { id: 'features', label: 'Módulos', icon: Settings2 },
  { id: 'permissions', label: 'Usuarios y permisos', icon: ShieldCheck },
  { id: 'labels', label: 'Nombres y documentos', icon: FileText },
  { id: 'lists', label: 'Listas y opciones', icon: SlidersHorizontal },
  { id: 'calendar', label: 'Calendario', icon: CalendarDays },
  { id: 'system', label: 'Sistema', icon: Server }
];

function ListEditor({ title, items, onChange, placeholder }) {
  const [value, setValue] = useState('');
  const add = () => {
    const clean = value.trim();
    if (!clean || items.includes(clean)) return;
    onChange([...items, clean]);
    setValue('');
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4">
      <h3 className="font-black text-slate-800 mb-3">{title}</h3>
      <div className="flex gap-2 mb-3">
        <input value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} placeholder={placeholder} className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-200" />
        <button type="button" onClick={add} className="w-10 h-10 rounded-xl bg-violet-600 text-white flex items-center justify-center"><Plus size={18}/></button>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="inline-flex items-center gap-2 bg-slate-100 text-slate-700 px-3 py-2 rounded-xl text-sm font-semibold">
            {item}
            <button type="button" onClick={() => onChange(items.filter(x => x !== item))} className="text-slate-400 hover:text-red-500"><Trash2 size={14}/></button>
          </span>
        ))}
      </div>
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

export function ConfiguracionView({ db, appId, auth }) {
  const [tab, setTab] = useState('identity');
  const [config, setConfig] = useState(DEFAULT_APP_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });
  const [logoBusy, setLogoBusy] = useState(false);
  const [selectedRole, setSelectedRole] = useState('');
  const [systemCheck, setSystemCheck] = useState({ status: 'idle', message: '' });

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
        setSelectedRole(next.roles?.[0] || '');
        applyBranding(next);
        cacheAppConfig(next);
      } catch (error) {
        console.warn('No se pudo cargar la configuración institucional', error);
        const next = normalizeAppConfig(DEFAULT_APP_CONFIG);
        setConfig(next);
        setSelectedRole(next.roles?.[0] || '');
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

  const roles = config.roles || [];
  const rolePerms = selectedRole ? getRolePermissions(config, selectedRole) : {};
  const selectedPalette = PALETTES[config.palette] || { name: 'Personalizada', primary: config.primaryColor, secondary: config.secondaryColor, background: config.backgroundColor, text: config.textColor };

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
        setSelectedRole(next.roles?.[0] || '');
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
      cacheAppConfig(normalized);
      applyBranding(normalized);
      window.dispatchEvent(new CustomEvent('institution-config-updated', { detail: normalized }));
      setConfig(normalized);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error(error);
      alert('No se pudo guardar la configuración. Revisá la conexión y los permisos de Firestore.');
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    if (!confirm('¿Restaurar la configuración inicial? Esto reemplazará los cambios actuales en el formulario.')) return;
    const next = normalizeAppConfig(DEFAULT_APP_CONFIG);
    setConfig(next);
    setSelectedRole(next.roles?.[0] || '');
    applyBranding(next);
  };

  const addHoliday = () => {
    if (!newHoliday.date) return;
    const entry = newHoliday.name.trim() ? `${newHoliday.date}|${newHoliday.name.trim()}` : newHoliday.date;
    update('holidays', [...(config.holidays || []), entry].filter((v, i, arr) => arr.indexOf(v) === i).sort());
    setNewHoliday({ date: '', name: '' });
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
          <button onClick={save} disabled={saving} className="px-5 py-2.5 rounded-xl bg-violet-600 text-white font-black text-sm flex items-center gap-2 shadow-lg shadow-violet-200 disabled:opacity-60"><Save size={17}/> {saving ? 'Guardando…' : 'Guardar cambios'}</button>
        </div>
      </div>

      {saved && <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 flex items-center gap-2 font-semibold text-sm"><CheckCircle2 size={18}/> Configuración guardada correctamente.</div>}

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

          {tab === 'structure' && <section className="space-y-4">
            <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 text-sm text-violet-900"><strong>Esta sección hace genérico a CENTRA.</strong> Cada institución puede definir su propia estructura sin cambiar el código.</div>
            <div className="grid md:grid-cols-2 gap-4">
              <ListEditor title={config.labels.sites || 'Sedes'} items={config.sites || []} onChange={v=>updateStructure('sites',v)} placeholder="Ej. Sede Centro" />
              <ListEditor title={config.labels.levels || 'Niveles'} items={config.levels || []} onChange={v=>updateStructure('levels',v)} placeholder="Ej. Primaria" />
              <ListEditor title={config.labels.sections || 'Secciones'} items={config.sections || []} onChange={v=>updateStructure('sections',v)} placeholder="Ej. 1° A" />
              <ListEditor title={config.labels.areas || 'Áreas'} items={config.areas || []} onChange={v=>updateStructure('areas',v)} placeholder="Ej. Psicología" />
              <ListEditor title={config.labels.teams || 'Equipos'} items={config.teams || []} onChange={v=>updateStructure('teams',v)} placeholder="Ej. Equipo Técnico" />
            </div>
          </section>}

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

          {tab === 'permissions' && <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
            <div><h3 className="text-lg font-black">Usuarios y permisos</h3><p className="text-sm text-slate-500">Definí qué módulos puede utilizar cada rol.</p></div>
            <div className="grid md:grid-cols-[220px_1fr] gap-5"><div className="space-y-2">{roles.map(role=><button key={role} onClick={()=>setSelectedRole(role)} className={`w-full text-left px-4 py-3 rounded-xl font-bold text-sm ${selectedRole===role?'bg-violet-50 text-violet-700':'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>{role}</button>)}</div><div><div className="flex items-center justify-between gap-3 mb-3"><h4 className="font-black">Módulos de {selectedRole || 'rol'}</h4><div className="flex gap-2"><button onClick={allowAll} className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-200">Dar todos</button><button onClick={removeAll} className="text-xs font-bold px-3 py-2 rounded-lg border border-slate-200">Quitar todos</button></div></div><div className="grid sm:grid-cols-2 gap-2">{MODULES.map(([id,label])=><label key={id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-transparent hover:border-slate-200"><span className="text-sm font-semibold">{label}</span><input type="checkbox" checked={!!rolePerms[id]} onChange={e=>updatePermission(id,e.target.checked)} className="w-5 h-5 accent-violet-600"/></label>)}</div><div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">Los administradores siguen teniendo acceso total.</div></div></div>
          </section>}

          {tab === 'labels' && <>
            <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4"><div><h3 className="text-lg font-black">Nombres del sistema</h3><p className="text-sm text-slate-500">Adaptá el vocabulario a la forma en que trabaja la institución.</p></div><div className="grid md:grid-cols-2 gap-4">{Object.entries(config.labels || {}).map(([key,value])=><label key={key}><span className="text-xs font-black uppercase text-slate-500">{key}</span><input value={value || ''} onChange={e=>updateNested('labels',key,e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label>)}</div></section>
            <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4"><div><h3 className="text-lg font-black">Documentos</h3><p className="text-sm text-slate-500">Datos que aparecen en los documentos generados por el sistema.</p></div><div className="grid md:grid-cols-2 gap-4"><label><span className="text-xs font-black uppercase text-slate-500">Encabezado</span><textarea value={config.document?.header || ''} onChange={e=>updateNested('document','header',e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 min-h-24" /></label><label><span className="text-xs font-black uppercase text-slate-500">Pie de documento</span><textarea value={config.document?.footer || ''} onChange={e=>updateNested('document','footer',e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 min-h-24" /></label><label><span className="text-xs font-black uppercase text-slate-500">Nombre de firma</span><input value={config.document?.signatureName || ''} onChange={e=>updateNested('document','signatureName',e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label><label><span className="text-xs font-black uppercase text-slate-500">Cargo de firma</span><input value={config.document?.signatureRole || ''} onChange={e=>updateNested('document','signatureRole',e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5" /></label></div><label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl"><input type="checkbox" checked={config.document?.showLogo !== false} onChange={e=>updateNested('document','showLogo',e.target.checked)} className="w-5 h-5 accent-violet-600"/><span className="text-sm font-semibold">Mostrar logo en documentos</span></label></section>
          </>}

          {tab === 'lists' && <div className="grid gap-4"><ListEditor title="Roles" items={config.roles || []} onChange={v=>{update('roles',v); if(!selectedRole && v[0]) setSelectedRole(v[0]);}} placeholder="Ej. Docente"/><ListEditor title="Turnos" items={config.turns || []} onChange={v=>update('turns',v)} placeholder="Ej. Mañana"/><ListEditor title="Modalidades" items={config.modalities || []} onChange={v=>update('modalities',v)} placeholder="Ej. Sede"/><ListEditor title="Tipos de evento" items={config.eventTypes || []} onChange={v=>update('eventTypes',v)} placeholder="Ej. Reunión"/></div>}

          {tab === 'calendar' && <section className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4"><div><h3 className="text-lg font-black">Días no laborables</h3><p className="text-sm text-slate-500">Podés cargar feriados, jornadas institucionales, recesos u otros días sin actividad.</p></div><div className="grid md:grid-cols-[180px_1fr_auto] gap-2"><input type="date" value={newHoliday.date} onChange={e=>setNewHoliday(v=>({...v,date:e.target.value}))} className="rounded-xl border border-slate-200 px-3 py-2.5"/><input value={newHoliday.name} onChange={e=>setNewHoliday(v=>({...v,name:e.target.value}))} placeholder="Nombre del día" className="rounded-xl border border-slate-200 px-3 py-2.5"/><button onClick={addHoliday} className="rounded-xl bg-violet-600 text-white px-4 font-bold flex items-center justify-center gap-2"><Plus size={16}/> Agregar</button></div><div className="space-y-2">{holidays.length===0?<div className="text-sm text-slate-400 py-5 text-center">No hay días cargados.</div>:holidays.map(h=><div key={h.raw} className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3"><div><span className="font-bold">{h.date}</span>{h.name&&<span className="text-slate-500 ml-2">— {h.name}</span>}</div><button onClick={()=>update('holidays',config.holidays.filter(x=>x!==h.raw))} className="text-slate-400 hover:text-red-500"><Trash2 size={17}/></button></div>)}</div></section>}

          {tab === 'system' && <section className="space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
              <div><h3 className="text-lg font-black">Estado del sistema</h3><p className="text-sm text-slate-500">Información útil para la instalación y el mantenimiento de CENTRA.</p></div>
              <div className="grid md:grid-cols-2 gap-3">
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase text-slate-400">Firestore</p><p className="font-bold text-slate-800 mt-1">Base de datos</p></div><StatusBadge ok={!!db}> {db ? 'Conectado' : 'No disponible'} </StatusBadge></div></div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase text-slate-400">Authentication</p><p className="font-bold text-slate-800 mt-1">Usuarios</p></div><StatusBadge ok={!!auth}> {auth ? 'Disponible' : 'No disponible'} </StatusBadge></div></div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4"><p className="text-xs font-black uppercase text-slate-400">Identificador de instalación</p><p className="font-mono text-sm text-slate-700 mt-2 break-all">{appId || '—'}</p></div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4"><p className="text-xs font-black uppercase text-slate-400">Institución configurada</p><p className="font-bold text-slate-800 mt-2">{config.institutionName || 'Mi Institución'}</p></div>
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
