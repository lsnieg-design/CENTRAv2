import { getCachedAppConfig, getInstitutionName } from '../config';
import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, CheckSquare, Settings, User, FileText, CheckCircle, 
  Download, RefreshCw, Plus, Trash2, Users, AlertCircle, LogOut, Briefcase, 
  Lock, List, Grid, ChevronLeft, ChevronRight, Bell, Check, HelpCircle, Mail, Camera, MapPin, 
  Send, Key, Filter, LayoutDashboard, Link as LinkIcon, ExternalLink, Zap,
  AlertTriangle, Clock, Shield, Crown, Activity, Share, PlusSquare, 
  Smartphone, GraduationCap, Search, X, UploadCloud, PieChart, Eye, Edit3, Trophy,
  Folder, MessageSquare, Globe, BookOpen, Lightbulb, ChevronDown, PlusCircle, Printer,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, Phone, CheckCircle2, Clock3, UserCheck,
  ChevronUp // <--- ESTE ES EL QUE FALTABA
} from 'lucide-react';
import { 
  collection, addDoc, doc, updateDoc, deleteDoc, serverTimestamp 
} from 'firebase/firestore';

export function ResourcesView({ resources, canEdit, db, appId, user }) {
  const [showModal, setShowModal] = useState(false);
  const [editingRes, setEditingRes] = useState(null); 
  const [showMobilePreview, setShowMobilePreview] = useState(false); // Para minimizar en celu
  const [isGeneratingImg, setIsGeneratingImg] = useState(false); // Estado de carga
  
  const [showNotaModal, setShowNotaModal] = useState(false);
  const [notaData, setNotaData] = useState({ 
    date: new Date().toLocaleDateString('es-AR'), 
    title: '', body: '', signature: 'EQUIPO DIRECTIVO',
    fontSize: 'text-[14px]', textAlign: 'text-center',
    wordSpacing: '0.12em', isPrintMode: false 
  });

  const [showTemplates, setShowTemplates] = useState(false);
  const [templateData, setTemplateData] = useState({
      destinatario: '',
      fechaReunion: '',
      horaReunion: '',
      modalidad: 'Presencial en la Institución'
  });
  
  const LOGO_SIN_FONDO = getCachedAppConfig().logoUrl || '/icon-192.png';

  const handleSaveResource = async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = {
      title: fd.get('title'),
      url: fd.get('url'),
      category: 'GENERAL', 
      updatedAt: serverTimestamp()
    };
    try {
      if (editingRes?.id) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'resources', editingRes.id), data);
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'resources'), { ...data, createdAt: serverTimestamp() });
      }
      setShowModal(false); setEditingRes(null);
    } catch (err) { alert(err.message); }
  };

  const handleDeleteResource = async (resId) => {
    if (!confirm("¿Eliminar este link?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'resources', resId));
    } catch (err) { alert(err.message); }
  };
const handleDownloadNota = async () => {
  if (!notaData.title && !notaData.body) return alert("Escribí algo.");
  setIsGeneratingImg(true);

  try {
    const html2canvas = (await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js')).default;

    // 1. Creamos hoja virtual tamaño PC fuera de la pantalla
    const tempDiv = document.createElement('div');
    tempDiv.style.cssText = 'position:absolute; left:-9999px; top:0; width:800px; z-index:99999;';
    document.body.appendChild(tempDiv);

    const source = document.getElementById('nota-canvas');
    const clone = source.cloneNode(true);
    
    // 2. Forzamos diseño limpio en el clon
    clone.style.cssText = 'transform:none; width:800px; height:auto; min-height:700px; padding:60px; display:block; background:' + (notaData.isPrintMode ? "#ffffff" : "#fefce8");
    
    // Forzar tamaño y visibilidad correcta de la imagen del logo en el clon
    const clonedImg = clone.querySelector('img');
    if (clonedImg) {
      clonedImg.style.cssText = 'width:70px !important; height:70px !important; object-fit:contain; display:block !important;';
      clonedImg.crossOrigin = "anonymous";
    }

    const content = clone.querySelector('.whitespace-pre-wrap');
    if (content) {
      content.style.cssText = `font-size:20px; line-height:1.8; text-align:${notaData.textAlign.replace('text-', '')}; width:100%; display:block; color:#334155;`;
    }
    
    tempDiv.appendChild(clone);

    // 3. ASEGURAR QUE LAS IMÁGENES ESTÉN CARGADAS ANTES DE RENDERIZAR
    const images = tempDiv.getElementsByTagName('img');
    await Promise.all(
      Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve; // Evita que se cuelgue si falla
        });
      })
    );

    // Pequeñorespiro para el motor de renderizado del navegador
    await new Promise(r => setTimeout(r, 150));

    // 4. Captura con html2canvas
    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: notaData.isPrintMode ? '#ffffff' : '#fefce8',
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const link = document.createElement('a');
    link.download = `Nota_${new Date().getTime()}.jpg`;
    link.href = imgData;
    link.click();

    document.body.removeChild(tempDiv);

    // Sumar puntos al usuario en Firestore
    
    alert("🚀 ¡Nota generada perfectamente!");
  } catch (error) {
    console.error(error);
    alert("Error al procesar la imagen.");
  } finally {
    setIsGeneratingImg(false);
  }
};
  
  const aplicarPlantillaReunion = () => {
      if(!templateData.fechaReunion || !templateData.horaReunion) {
          alert("Completá fecha y hora."); return;
      }
      const partesFecha = templateData.fechaReunion.split('-');
      const fechaLegible = `${partesFecha[2]}/${partesFecha[1]}/${partesFecha[0]}`;
      const textoDestinatario = templateData.destinatario ? `Estimada familia de ${templateData.destinatario}:` : `Estimadas familias:`;
      const cuerpoMensaje = `${textoDestinatario}\n\nPor medio de la presente, nos comunicamos para citarlos a una reunión a fin de conversar sobre aspectos relacionados a la trayectoria escolar.\n\nLa misma se llevará a cabo el día ${fechaLegible} a las ${templateData.horaReunion} hs.\nModalidad: ${templateData.modalidad}.\n\nAgradecemos su compromiso y puntualidad.\nPor favor, confirmar asistencia.`;
      setNotaData({ ...notaData, title: 'CITACIÓN A REUNIÓN', body: cuerpoMensaje, textAlign: 'text-left' });
      setShowTemplates(false);
  };

 return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 pb-10 px-2">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-black text-violet-900 italic tracking-tighter uppercase">Recursos</h2>
        {canEdit && (
          <button onClick={() => { setEditingRes(null); setShowModal(true); }} className="bg-orange-500 text-white p-2.5 rounded-xl shadow-lg hover:bg-orange-600 transition flex items-center gap-2 font-black text-[10px] uppercase">
            <PlusCircle size={20}/> Nuevo Link
          </button>
        )}
      </div>

      {/* BOTÓN GENERADOR DE NOTAS */}
      <button onClick={() => setShowNotaModal(true)} className="w-full bg-gradient-to-r from-pink-500 to-orange-400 p-6 rounded-[35px] shadow-lg text-white flex items-center justify-between mb-8 group active:scale-95 transition-transform">
          <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-2xl group-hover:rotate-12 transition-transform"><Edit3 size={32}/></div>
              <div className="text-left">
                  <h3 className="font-black text-xl tracking-widest uppercase italic drop-shadow-md">Generador de Notas</h3>
                  <p className="text-xs font-bold opacity-90 mt-1">Crear comunicados oficiales</p>
              </div>
          </div>
          <ChevronRight size={24} className="opacity-50"/>
      </button>

      {/* LISTADO EN DOS COLUMNAS PARA PC */}
      <div className="space-y-3">
        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[4px] ml-2 mb-2">Accesos Directos</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.map(r => (
            <div key={r.id} className="bg-white p-4 rounded-[30px] border border-violet-50 flex flex-col justify-between shadow-sm group hover:border-violet-200 hover:shadow-md transition-all relative overflow-hidden h-32">
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="h-full flex flex-col justify-center">
                    <div className="w-10 h-10 bg-violet-50 text-violet-500 rounded-xl flex items-center justify-center shrink-0 mb-2 group-hover:bg-violet-600 group-hover:text-white transition-colors">
                      <ExternalLink size={20} />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-black text-xs text-gray-700 uppercase italic leading-tight line-clamp-2">{r.title}</span>
                    </div>
                </a>

                {canEdit && (
                  <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={(e) => { e.preventDefault(); setEditingRes(r); setShowModal(true); }} className="p-2 bg-white/90 rounded-full shadow-sm text-gray-400 hover:text-orange-500"><Edit3 size={14}/></button>
                    <button onClick={(e) => { e.preventDefault(); handleDeleteResource(r.id); }} className="p-2 bg-white/90 rounded-full shadow-sm text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                  </div>
                )}
            </div>
          ))}
        </div>
      </div>

      {/* MODAL LINK */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
          <form onSubmit={handleSaveResource} className="bg-white rounded-[40px] w-full max-w-sm p-8 shadow-2xl border-t-8 border-orange-500">
            <h3 className="text-xl font-black text-violet-900 mb-6 uppercase italic">{editingRes ? 'Editar Link' : 'Nuevo Link'}</h3>
            <div className="space-y-4">
              <input name="title" defaultValue={editingRes?.title} placeholder="Título del Botón" className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm border" required />
              <input name="url" defaultValue={editingRes?.url} placeholder="https://..." className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-bold text-sm border" required />
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setEditingRes(null); }} className="flex-1 py-4 font-black text-xs text-gray-400 uppercase">Cancelar</button>
                <button type="submit" className="flex-[2] py-4 bg-orange-500 text-white rounded-2xl font-black text-xs uppercase">Guardar</button>
              </div>
            </div>
          </form>
        </div>
      )}
      {showNotaModal && (
        <div className="fixed inset-0 bg-black/95 z-[300] flex items-center justify-center p-0 md:p-4 backdrop-blur-md" onClick={() => setShowNotaModal(false)}>
          <div className="bg-white rounded-t-[40px] md:rounded-[40px] w-full max-w-7xl flex flex-col h-[98vh] md:h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="text-xl font-black text-violet-900 uppercase italic">Editor Institucional</h3>
              <div className="flex gap-2">
  <button onClick={() => setShowMobilePreview(!showMobilePreview)} className="md:hidden bg-violet-100 text-violet-700 px-3 py-1 rounded-lg flex items-center gap-1 font-bold text-[10px] uppercase">
    {showMobilePreview ? <Edit3 size={14}/> : <Eye size={14}/>}
    {showMobilePreview ? 'Escribir' : 'Ver Nota'}
  </button>
 <div className="flex gap-2">
  <button onClick={() => setShowMobilePreview(!showMobilePreview)} className="md:hidden bg-violet-100 text-violet-700 px-3 py-1 rounded-lg flex items-center gap-1 font-bold text-[10px] uppercase">
    {showMobilePreview ? <Edit3 size={14}/> : <Eye size={14}/>}
    {showMobilePreview ? 'Escribir' : 'Ver Nota'}
  </button>
  <button onClick={() => setShowNotaModal(false)} className="bg-gray-100 p-2 rounded-full hover:bg-gray-200 transition"><X size={20}/></button>
</div>
</div>
            </div>
            
          <div className="flex-1 flex overflow-hidden">
              
              {/* LADO 1: EDITOR (Se oculta en celu si se está previsualizando) */}
              <div className={`flex-1 overflow-y-auto p-4 md:p-10 space-y-4 ${showMobilePreview ? 'hidden md:block' : 'block'}`}>
                
                {/* BOTÓN DE PLANTILLAS */}
                <button 
                    onClick={() => setShowTemplates(!showTemplates)} 
                    className="w-full bg-blue-50 text-blue-700 py-3 rounded-xl font-bold text-xs uppercase border border-blue-200 flex justify-center items-center gap-2 hover:bg-blue-100 transition"
                >
                    <List size={16}/> {showTemplates ? 'Ocultar Plantillas' : 'Usar una Plantilla (Ej: Reunión)'}
                </button>

                {/* PANEL DE PLANTILLAS */}
                {showTemplates && (
                    <div className="bg-white p-4 rounded-2xl border border-blue-200 shadow-sm animate-in slide-in-from-top-2 space-y-3">
                        <h4 className="font-black text-blue-900 text-xs uppercase italic border-b pb-2">Citación a Reunión</h4>
                        <div className="space-y-2">
                            <input type="text" placeholder="Alumno / Grupo" value={templateData.destinatario} onChange={e => setTemplateData({...templateData, destinatario: e.target.value})} className="w-full p-2 bg-gray-50 rounded-lg outline-none font-bold text-xs border" />
                            <div className="grid grid-cols-2 gap-2">
                                <input type="date" value={templateData.fechaReunion} onChange={e => setTemplateData({...templateData, fechaReunion: e.target.value})} className="w-full p-2 bg-gray-50 rounded-lg outline-none font-bold text-xs border" />
                                <input type="time" value={templateData.horaReunion} onChange={e => setTemplateData({...templateData, horaReunion: e.target.value})} className="w-full p-2 bg-gray-50 rounded-lg outline-none font-bold text-xs border" />
                            </div>
                        </div>
                        <button onClick={aplicarPlantillaReunion} className="w-full bg-blue-600 text-white py-2 rounded-xl font-bold text-xs uppercase shadow-md">Generar Texto</button>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Fecha Arriba</label>
                    <input type="text" value={notaData.date} onChange={e => setNotaData({...notaData, date: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-xs border border-gray-100"/>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase mb-1 block">Firma Abajo</label>
                    <input type="text" value={notaData.signature} onChange={e => setNotaData({...notaData, signature: e.target.value})} className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-violet-700 text-xs border border-gray-100"/>
                  </div>
                </div>
                
                <div className="bg-violet-50 p-4 rounded-3xl space-y-4">
                  <div className="flex gap-2">
                    {[{l:'Chica', v:'text-[11px]'}, {l:'Media', v:'text-[14px]'}, {l:'Grande', v:'text-[18px]'}].map(s => (
                      <button key={s.v} onClick={() => setNotaData({...notaData, fontSize: s.v})} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${notaData.fontSize === s.v ? 'bg-violet-600 text-white shadow-md' : 'bg-white text-violet-400'}`}>{s.l}</button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setNotaData({...notaData, isPrintMode: false})} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${!notaData.isPrintMode ? 'bg-orange-500 text-white shadow-md' : 'bg-white text-orange-400'}`}>🎨 COLOR</button>
                    <button onClick={() => setNotaData({...notaData, isPrintMode: true})} className={`flex-1 py-2 rounded-lg text-[10px] font-black transition-all ${notaData.isPrintMode ? 'bg-gray-800 text-white shadow-md' : 'bg-white text-gray-400'}`}>🖨️ BLANCO</button>
                  </div>
                  <div className="flex gap-2 justify-center pt-2 border-t border-violet-200/50">
                      <button onClick={() => setNotaData({...notaData, textAlign: 'text-left'})} className={`p-2 rounded-lg ${notaData.textAlign === 'text-left' ? 'bg-violet-200 text-violet-800' : 'text-violet-400'}`}><AlignLeft size={16}/></button>
                      <button onClick={() => setNotaData({...notaData, textAlign: 'text-center'})} className={`p-2 rounded-lg ${notaData.textAlign === 'text-center' ? 'bg-violet-200 text-violet-800' : 'text-violet-400'}`}><AlignCenter size={16}/></button>
                      <button onClick={() => setNotaData({...notaData, textAlign: 'text-justify'})} className={`p-2 rounded-lg ${notaData.textAlign === 'text-justify' ? 'bg-violet-200 text-violet-800' : 'text-violet-400'}`}><AlignJustify size={16}/></button>
                  </div>
                </div>

                <input type="text" placeholder="TÍTULO" value={notaData.title} onChange={e => setNotaData({...notaData, title: e.target.value})} className="w-full p-4 bg-gray-50 rounded-xl outline-none font-black uppercase text-gray-700 shadow-inner"/>
                <textarea value={notaData.body} onChange={e => setNotaData({...notaData, body: e.target.value})} placeholder="Mensaje..." className="w-full p-4 bg-gray-50 rounded-2xl outline-none text-sm h-[250px] resize-none font-medium text-gray-600 shadow-inner"/>
              </div>

              {/* LADO 2: VISTA PREVIA (DERECHA) - Visible en celu solo si se activa showMobilePreview */}
              <div className={`flex-1 bg-slate-100 flex items-start justify-center p-4 md:p-10 overflow-y-auto ${!showMobilePreview ? 'hidden md:flex' : 'flex'}`}>
                <div className="scale-[0.5] sm:scale-[0.6] md:scale-[0.8] xl:scale-[0.95] origin-top transition-all">
                  <div id="nota-canvas" className={`w-[600px] min-h-[400px] relative shadow-2xl rounded-[15px] flex flex-col overflow-hidden ${notaData.isPrintMode ? 'bg-white border-[10px] border-gray-200' : 'bg-[#fefce8] border-[10px] border-white'}`}>
                    <div className={`absolute top-0 left-0 right-0 h-3 ${notaData.isPrintMode ? 'bg-gray-300' : 'bg-gradient-to-r from-violet-600 via-pink-500 to-orange-400'}`}></div>
                    
                    <div className="flex flex-col h-full px-12 pt-10 pb-12 z-10">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-4">
                          <img src={LOGO_SIN_FONDO} className="w-16 h-auto mix-blend-multiply" crossOrigin="anonymous"/>
                          <div className="leading-tight pt-1">
                            <h2 className="font-black text-[16px] text-violet-900 uppercase tracking-[2px]">JUNTOS A LA PAR</h2>
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">ESCUELA ESPECIAL</p>
                          </div>
                        </div>
                        <p className={`text-[12px] font-black uppercase pt-2 ${notaData.isPrintMode ? 'text-gray-400' : 'text-orange-600'}`}>{notaData.date}</p>
                      </div>
                      
                      <h1 className="text-2xl font-black text-gray-800 uppercase leading-tight mb-6 text-center">{notaData.title || 'COMUNICADO'}</h1>
                      
                      <div className="flex-1 w-full mb-10">
                        <div className={`text-slate-700 font-bold whitespace-pre-wrap leading-relaxed break-words w-full px-8 ${notaData.fontSize} ${notaData.textAlign}`}>
                          {notaData.body || 'Vista previa del mensaje...'}
                        </div>
                      </div>

                      <div className="mt-auto flex flex-col items-center shrink-0">
                        <div className="w-48 h-[1px] bg-orange-200 mb-4 opacity-50"></div>
                        <p className="text-[16px] font-black text-violet-800 uppercase text-center italic">{notaData.signature}</p>
                        <p className={`text-[9px] font-black uppercase tracking-[3px] opacity-70 ${notaData.isPrintMode ? 'text-gray-400' : 'text-orange-500'}`}>ESCUELA JUNTOS A LA PAR</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            <div className="p-6 border-t bg-white shrink-0 z-20 shadow-2xl">
              <div className="flex gap-4 max-w-4xl mx-auto">
                <button onClick={() => setShowNotaModal(false)} className="flex-1 text-gray-400 font-black text-xs uppercase py-4">VOLVER</button>
               <button 
  disabled={isGeneratingImg}
  onClick={async () => {
    if(!notaData.title && !notaData.body) return alert("Escribí algo.");
    setIsGeneratingImg(true);
    
    try {
      const html2canvas = (await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js')).default;

      // TRUCO: Creamos una hoja virtual tamaño PC fuera de la pantalla
      const tempDiv = document.createElement('div');
      tempDiv.style.cssText = 'position:absolute; left:-9999px; top:0; width:800px;';
      document.body.appendChild(tempDiv);

      const source = document.getElementById('nota-canvas');
      const clone = source.cloneNode(true);
      
      // Forzamos estilos de hoja real al clon para que en el celu no salga deformada
      clone.style.cssText = `transform:none; width:800px; height:auto; min-height:800px; padding:60px; display:block; background:${notaData.isPrintMode ? "#ffffff" : "#fefce8"};`;
      
      const content = clone.querySelector('.whitespace-pre-wrap');
      if(content) {
        content.style.cssText = `font-size:22px; line-height:1.8; text-align:${notaData.textAlign.replace('text-', '')}; width:100%; display:block; padding:0 40px; color:#334155;`;
      }
      
      tempDiv.appendChild(clone);

      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: notaData.isPrintMode ? '#ffffff' : '#fefce8',
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.download = `Nota_${new Date().getTime()}.jpg`;
      link.href = imgData;
      link.click();

      document.body.removeChild(tempDiv);
      alert("🚀 ¡Nota descargada perfectamente!");
    } catch (error) {
      alert("Error al generar imagen.");
    } finally { setIsGeneratingImg(false); }
  }}
  className="flex-[3] bg-gradient-to-r from-pink-500 to-orange-400 text-white font-black text-sm uppercase tracking-[4px] rounded-2xl shadow-xl py-4 flex items-center justify-center gap-2"
>
  {isGeneratingImg ? <RefreshCw className="animate-spin" /> : <><Download size={20}/> DESCARGAR NOTA OFICIAL</>}
</button>
              </div>
            </div>
          </div> 
        </div>
      )}
    </div>
  );
}
