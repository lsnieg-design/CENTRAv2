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
  ChevronUp // <--- ESTE ES EL QUE FALTABA
} from 'lucide-react';
import { 
  collection, query, where, onSnapshot, orderBy, 
  doc, updateDoc, arrayUnion, increment 
} from 'firebase/firestore';

export function ProyectoView({ user, db, appId }) {
  const [periods, setPeriods] = useState([]);
  const [expandedPeriod, setExpandedPeriod] = useState(null);
  const [editing, setEditing] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  const isAdmin = user.rol === 'admin' || user.rol === 'super-admin' || user.role === 'Equipo Directivo';
  
  const PERIOD_NAMES = ["MARZO", "ABRIL Y MAYO", "JUNIO Y JULIO", "AGOSTO Y SEPTIEMBRE", "OCTUBRE Y NOVIEMBRE", "DICIEMBRE"];

  // --- BASE DE DATOS PROYECTO 2026 (INFO COMPLETA DEL PDF) ---
  const PROJECT_DATA_2026 = {
      "MARZO": {
          title: "Estación 1: Los Preparativos",
          narrativa: "Un grupo de estudiantes encuentra en la biblioteca del colegio el libro 'La vuelta al mundo en 80 días'. Lo leen y deciden emprender un viaje similar.",
          paises: "🧳 LOS PREPARATIVOS DEL VIAJE\n\n• Identidad: El nombre, el DNI, la historia personal.\n• Equipaje: Qué llevar, cómo organizarnos.\n• La Ruta: Armado del itinerario y calendario.",
          contenidos: "📌 Prácticas del Lenguaje:\n- Escritura del nombre propio.\n- Lectura de listas.\n\n📌 Cs. Sociales:\n- Identidad y DNI.\n- Objetos personales.\n\n📌 Matemática:\n- Uso del calendario.\n- Medida (alturas).",
          actividades: "1. Confección del Pasaporte.\n2. Armado de la Valija Real.\n3. Medición de alturas.\n4. Foto Carnet.\n5. Circuito de Aeropuerto.",
          herramientas: "🧠 PEDAGÓGICAS:\n• El Pasaporte: Confección del librillo.\n• Lista de Viaje: Qué 5 cosas no pueden faltar.\n• Calendario de Ruta: Marcar salida y llegada.\n• DNI Gigante: Analizar sus partes.\n\n🖐️ SENSORIALES:\n• Reconocimiento Táctil: 'La Valija Ciega'.\n• Huella de Identidad: Pintarse el dedo.\n• El Peso del Equipaje: Pesado vs Liviano.\n• Sonidos Propios: 'Adivina quién habla'.\n\n🧱 CONCRETAS:\n• Armado de Valija Real: Doblar y guardar.\n• Medición de Alturas: Cintas en la pared.\n• Foto Carnet: Simular estudio.\n• Circuito de Aeropuerto: Mostrar pasaporte.\n\n🎨 ARTÍSTICAS:\n• Autorretrato: Frente al espejo.\n• Decoración de Valijas: Cajas con collage.\n• Collage del Nombre: Relleno con papeles.\n• Sellos de Manos: Mural colectivo."
      },
      "ABRIL_Y_MAYO": {
          title: "Estación 2: América",
          narrativa: "Llegan a nuestro continente. Tierra, raíces, maíz y selva.",
          paises: "🇦🇷 ARGENTINA (Nuestra Casa)\n• Capital: Buenos Aires.\n• Comida Típica: Mate y Asado/Empanadas.\n• Animal Típico: El Hornero (construye con barro).\n• Símbolos: El Obelisco, la Escarapela, el Tango.\n\n🇧🇷 BRASIL (Vecinos y Selva)\n• Capital: Brasilia.\n• Comida Típica: Frutas tropicales (Banana, Ananá), Feijoada.\n• Animal Típico: El Tucán / Guacamayo.\n• Símbolos: El Carnaval, el Cristo Redentor, la Samba.\n\n🇲🇽 MÉXICO (Colores y Tradición)\n• Capital: Ciudad de México.\n• Comida Típica: Tacos (Maíz), Chocolate.\n• Animal Típico: Águila Real / Perro Xoloitzcuintle.\n• Símbolos: Sombrero de Mariachi, Calaveras de colores, Pirámides.",
          contenidos: "📌 Prácticas del Lenguaje:\n- Leyendas tradicionales.\n\n📌 Cs. Sociales:\n- Pueblos Originarios.\n- Paisajes naturales/humanizados.\n\n📌 Cs. Naturales:\n- Coberturas (plumas/pelo).\n- Semillas.",
          actividades: "1. Cocina: Chipá y Ensalada de Frutas.\n2. Nido de hornero (barro).\n3. Máscaras de Carnaval.\n4. Siembra.\n5. Pintura con tierra.",
          herramientas: "🧠 PEDAGÓGICAS:\n• Secuencia de Leyenda: Ordenar imágenes.\n• Receta de Cocina: Leer pasos.\n• Clasificación: Plumas vs Pelo.\n• Bandera Rompecabezas: Armar banderas.\n\n🖐️ SENSORIALES:\n• Taller de Aromas: Yerba, café, chocolate.\n• Caja Táctil: Lana cruda, aguayos.\n• Degustación: Frutas tropicales.\n• Sonidos de la Selva: Lluvia, pájaros.\n\n🧱 CONCRETAS:\n• Molienda Ancestral: Morteros con maíz.\n• Cocina: Amasar chipá.\n• Construcción de Nido: Barro y paja.\n• Siembra: Germinadores.\n\n🎨 ARTÍSTICAS:\n• Telar Aborigen: Tejer con lanas.\n• Máscaras de Carnaval: Plumas.\n• Papel Picado Mexicano: Papel doblado.\n• Pintura con Tierra: Tierra + cola."
      },
      "JUNIO_Y_JULIO": {
          title: "Estación 3: Europa & Mundial",
          narrativa: "Europa es historia (castillos) y presente (fútbol). El grupo recorre países, pero el mundo se detiene para jugar.",
          paises: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 INGLATERRA\n• Capital: Londres.\n• Comida Típica: Té con galletitas.\n• Animal Típico: Bulldog / León.\n• Símbolos: Big Ben, Autobús rojo.\n\n🇮🇹 ITALIA (Sabores de la Abuela)\n• Capital: Roma.\n• Comida Típica: Pizza y Pastas.\n• Animal Típico: La Loba.\n• Símbolos: Coliseo Romano, Máscaras de Venecia.\n\n🇪🇸 ESPAÑA (Música y Color)\n• Capital: Madrid.\n• Comida Típica: Paella, Tortilla.\n• Animal Típico: El Toro.\n• Símbolos: Abanicos, Molinos, Guitarra.",
          contenidos: "📌 Cs. Sociales:\n- Pasado/Presente (Castillos vs Estadios).\n- Reglas de juego.\n\n📌 Matemática:\n- Conteo (goles).\n- Espacio: Ubicación.",
          actividades: "1. Mini Mundial.\n2. Taller de Masas.\n3. Construcción de Torres.\n4. Hora del Té.\n5. Diseño de camisetas.",
          herramientas: "🧠 PEDAGÓGICAS:\n• Álbum de Figuritas: Correspondencia número.\n• Tabla de Goles: Registro con palitos.\n• Lectura de Camisetas: Nombres y números.\n• Reglamento del Aula: 3 reglas de oro.\n\n🖐️ SENSORIALES:\n• Taller de Masas: Harina vs Masa.\n• Sonidos de Estadio: Gol vs Susurro.\n• Temperatura: Hielo (Londres) vs Té tibio.\n• Texturas: Pelotas (cuero, tenis).\n\n🧱 CONCRETAS:\n• Mini Mundial: Patear penales.\n• Construcción: Torres con bloques.\n• Hora del Té: Poner la mesa.\n• Circuito: Zigzag y túnel.\n\n🎨 ARTÍSTICAS:\n• Mosaico (Gaudí): Papel glacé.\n• Diseño de Camisetas: Estampado.\n• Abanicos Españoles: Plegado.\n• Coronas de Reyes: Cartulina."
      },
      "AGOSTO_Y_SEPTIEMBRE": {
          title: "Estación 4: Asia",
          narrativa: "El Oriente nos enseña la paciencia, el detalle y el contraste entre la luz y la sombra.",
          paises: "🇨🇳 CHINA (El Dragón)\n• Capital: Pekín.\n• Comida Típica: Arroz chaufa.\n• Animal Típico: Oso Panda / Dragón.\n• Símbolos: Muralla, Farolitos.\n\n🇮🇳 INDIA (Los Aromas)\n• Capital: Nueva Delhi.\n• Comida Típica: Especias (Curry).\n• Animal Típico: Elefante, Tigre.\n• Símbolos: Taj Mahal, Mandalas.\n\n🇯🇵 JAPÓN (La Calma)\n• Capital: Tokio.\n• Comida Típica: Sushi.\n• Animal Típico: Pez Koi, Gato de la Suerte.\n• Símbolos: Flor de Cerezo, Monte Fuji.",
          contenidos: "📌 Prácticas del Lenguaje:\n- Haikus.\n- Trazos no convencionales.\n\n📌 Matemática:\n- Geometría (Tangram).\n- Plegado (Origami).",
          actividades: "1. Arroz Sensorial.\n2. Escritura Vertical.\n3. Sombras Chinas.\n4. Origami.\n5. Jardín Zen.",
          herramientas: "🧠 PEDAGÓGICAS:\n• Tangram: Armar figuras.\n• Secuencia de Crecimiento: Semilla a Arroz.\n• Escritura Vertical: Tiras de papel.\n• Haikus: Leer y dibujar.\n\n🖐️ SENSORIALES:\n• Arroz Sensorial: Buscar objetos.\n• Ceremonia de Té: Oler jazmín, calma.\n• Luces y Sombras: Linternas.\n• Vibración: Cuenco tibetano.\n\n🧱 CONCRETAS:\n• Uso de Palitos: Agarrar pompones.\n• Origami Simple: Perrito o vaso.\n• Jardín Zen: Arena y tenedor.\n• Yoga Animal: Posturas.\n\n🎨 ARTÍSTICAS:\n• Manchas Sopladas: Tinta y sorbete.\n• Escritura con Pincel: Trazos gruesos.\n• Mandalas Naturales: Hojas y piedras.\n• Farolitos Chinos: Cartulina roja."
      },
      "OCTUBRE_Y_NOVIEMBRE": {
          title: "Estación 5: África y Oceanía",
          narrativa: "La fuerza de la naturaleza. Cruzamos desiertos, selvas y el inmenso océano.",
          paises: "🇪🇬 EGIPTO (El Desierto)\n• Capital: El Cairo.\n• Comida: Dátiles.\n• Animal: Camello, Escarabajo.\n• Símbolos: Pirámides, Momias, Nilo.\n\n🇿🇦 SUDÁFRICA (La Sabana)\n• Capital: Pretoria.\n• Comida: Carne asada.\n• Animal: León, Jirafa, Cebra.\n• Símbolos: Máscaras, Diamantes.\n\n🇦🇺 AUSTRALIA (El Océano)\n• Capital: Canberra.\n• Comida: Pescado.\n• Animal: Canguro, Koala.\n• Símbolos: Boomerang, Surf, Ópera.",
          contenidos: "📌 Cs. Naturales:\n- Desplazamiento animal.\n- Ambientes (Agua/Tierra).\n\n📌 Matemática:\n- Cuerpos: Pirámide, Esfera.",
          actividades: "1. Arenero Egipcio.\n2. Botellas del Océano.\n3. Juego de Momias.\n4. Puntillismo.\n5. Máscaras Tribales.",
          herramientas: "🧠 PEDAGÓGICAS:\n• Clasificación Hábitat: Tierra vs Mar.\n• Adivinanzas: Pistas de animales.\n• Laberinto: Canguro busca mamá.\n• Conteo de Patas: Araña vs León.\n\n🖐️ SENSORIALES:\n• Arenero Egipcio: Arena y tesoros.\n• Botellas del Océano: Agua y aceite azul.\n• Percusión Corporal: Ritmo en el cuerpo.\n• Pieles: Texturas (rugosa/suave).\n\n🧱 CONCRETAS:\n• Momias: Envolver con papel higiénico.\n• Salto de Canguro: Competencia.\n• Construcción: Pirámides de vasos.\n• Pesca: Con imanes.\n\n🎨 ARTÍSTICAS:\n• Puntillismo: Hisopos y témpera.\n• Máscaras Tribales: Cartón y rafia.\n• Collares Egipcios: Platos dorados.\n• Huellas de Animales: Estampado."
      },
      "DICIEMBRE": {
          title: "Estación 6: El Regreso a Casa",
          narrativa: "Los estudiantes vuelven al colegio y socializan todo lo recorrido.",
          paises: "🏠 MUESTRA DEL VIAJERO\n\n• Recorrido por el patio transformado en mapa.\n• Merienda con sabores del mundo.\n• Entrega de Pasaportes Completos.",
          contenidos: "📌 Evaluación.\n📌 Muestra a la comunidad.",
          actividades: "1. Cierre del Pasaporte.\n2. Muestra interactiva.\n3. Fiesta de sabores.",
          herramientas: "🧠 CIERRE DEL PROYECTO:\n• Finalización de lectura del libro.\n• Armado de la muestra con los objetos creados.\n• Evaluación de la 'Bitácora de Viaje'."
      }
  };

  useEffect(() => {
    const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'proyecto2026_periods'));
    const unsub = onSnapshot(q, (snap) => {
        const dataMap = {};
        snap.docs.forEach(d => dataMap[d.id] = d.data());
        const builtPeriods = PERIOD_NAMES.map(name => {
            const id = name.replace(/\s+/g, '_');
            return { id, name, ...(dataMap[id] || {}) };
        });
        setPeriods(builtPeriods);
    });
    return () => unsub();
  }, []);

  const getCurrentPeriodId = () => {
      const month = new Date().getMonth(); 
      if (month === 2) return "MARZO";
      if (month === 3 || month === 4) return "ABRIL_Y_MAYO";
      if (month === 5 || month === 6) return "JUNIO_Y_JULIO";
      if (month === 7 || month === 8) return "AGOSTO_Y_SEPTIEMBRE";
      if (month === 9 || month === 10) return "OCTUBRE_Y_NOVIEMBRE";
      if (month === 11) return "DICIEMBRE";
      return null;
  };
  const currentId = getCurrentPeriodId();

  const handleSave = async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = {
          narrativa: fd.get('narrativa'),
          paises: fd.get('paises'),
          fundamentacion: fd.get('fundamentacion'),
          contenidos: fd.get('contenidos'),
          actividades: fd.get('actividades'),
          herramientas: fd.get('herramientas'),
          updatedAt: serverTimestamp()
      };
      const { setDoc, doc: docRef } = await import('firebase/firestore'); 
      await setDoc(docRef(db, 'artifacts', appId, 'public', 'data', 'proyecto2026_periods', expandedPeriod.id), data, { merge: true });
      setEditing(false); setExpandedPeriod({...expandedPeriod, ...data});
  };

  const handleLoadProjectData = async () => {
      if(!confirm("⚠️ ¿Cargar planificación completa desde PDF?")) return;
      setLoadingAction(true);
      try {
          const { setDoc, doc: docRef } = await import('firebase/firestore');
          const promises = Object.keys(PROJECT_DATA_2026).map(key => {
              return setDoc(docRef(db, 'artifacts', appId, 'public', 'data', 'proyecto2026_periods', key), PROJECT_DATA_2026[key], { merge: true });
          });
          await Promise.all(promises);
          alert("✅ ¡Proyecto cargado con éxito!");
          setShowAdminMenu(false);
      } catch (e) { alert("Error: " + e.message); } finally { setLoadingAction(false); }
  };

  const handleResetProject = async () => {
      if(!confirm("⛔ PELIGRO: ¿Borrar todo el contenido?")) return;
      setLoadingAction(true);
      try {
          const { setDoc, doc: docRef } = await import('firebase/firestore');
          const promises = PERIOD_NAMES.map(name => {
              const id = name.replace(/\s+/g, '_');
              return setDoc(docRef(db, 'artifacts', appId, 'public', 'data', 'proyecto2026_periods', id), { 
                  paises: '', fundamentacion: '', contenidos: '', actividades: '', herramientas: '', narrativa: '' 
              });
          });
          await Promise.all(promises);
          alert("🗑️ Proyecto reiniciado.");
          setShowAdminMenu(false);
      } catch (e) { alert("Error: " + e.message); } finally { setLoadingAction(false); }
  };

  return (
    <div className="space-y-6 pb-24 animate-in fade-in duration-700 relative">
      
      {/* PORTADA CON LINK */}
      <div className="relative w-full h-56 rounded-[35px] overflow-hidden shadow-2xl group border border-violet-100">
          <img src="/PPI.png" alt="Portada" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" onError={(e) => { e.target.style.display = 'none'; }} />
          <div className="absolute inset-0 bg-gradient-to-t from-violet-900 via-violet-900/40 to-transparent flex flex-col justify-end p-8">
              <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter drop-shadow-md mb-1">Proyecto 2026</h2>
              
              <a href="https://drive.google.com/file/d/1Cgb9QQ5XNy_RvmdIShPc2cZX317tcmga/view?usp=sharing" target="_blank" rel="noopener noreferrer" className="absolute top-4 left-4 bg-white/20 hover:bg-white/40 backdrop-blur-md px-3 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-2 transition shadow-lg border border-white/30">
                  <FileText size={16}/> Ver PDF Completo
              </a>

              <div className="flex items-center gap-2">
                  <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-widest shadow-sm">Institucional</span>
                  <p className="text-orange-200 font-bold text-xs uppercase tracking-[3px] drop-shadow-sm">La Vuelta al Mundo</p>
              </div>
          </div>
          
          {isAdmin && (
              <div className="absolute top-4 right-4">
                  <button onClick={() => setShowAdminMenu(!showAdminMenu)} className="bg-white/20 hover:bg-white/40 backdrop-blur-md p-2 rounded-full text-white shadow-lg transition"><Settings size={20}/></button>
                  {showAdminMenu && (
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in slide-in-from-top-5 z-50">
                          <button onClick={handleLoadProjectData} disabled={loadingAction} className="w-full text-left px-4 py-3 text-xs font-bold text-violet-700 hover:bg-violet-50 flex items-center gap-2">{loadingAction ? <RefreshCw className="animate-spin" size={14}/> : <UploadCloud size={14}/>} Cargar Info 2026 (PDF)</button>
                          <button onClick={handleResetProject} disabled={loadingAction} className="w-full text-left px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-2"><Trash2 size={14}/> Reiniciar Todo</button>
                      </div>
                  )}
              </div>
          )}
      </div>

      <div className="space-y-3">
          {periods.map(period => {
              const isCurrent = period.id === currentId;
              const displayTitle = PROJECT_DATA_2026[period.id]?.title || period.name;

              return (
              <div key={period.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all duration-500 ${isCurrent ? 'border-orange-400 ring-2 ring-orange-100 shadow-orange-100 transform scale-[1.02]' : 'border-gray-100'}`}>
                  <div onClick={() => setExpandedPeriod(expandedPeriod?.id === period.id ? null : period)} className={`p-4 flex justify-between items-center cursor-pointer transition-colors ${expandedPeriod?.id === period.id ? 'bg-violet-50' : 'hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${expandedPeriod?.id === period.id ? 'bg-violet-600 text-white' : isCurrent ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}>{period.name.substring(0,3)}</div>
                          <div>
                              <div className="flex items-center gap-2">
                                  <h3 className={`font-black text-sm uppercase italic tracking-tighter ${isCurrent ? 'text-orange-600' : 'text-gray-800'}`}>{displayTitle}</h3>
                                  {isCurrent && <span className="bg-orange-100 text-orange-700 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">📍 Estación Actual</span>}
                              </div>
                              <p className="text-[10px] text-gray-400 truncate max-w-[250px] font-medium">{period.fundamentacion || 'Clic para ver contenidos...'}</p>
                          </div>
                      </div>
                      <ChevronRight size={16} className={`text-gray-300 transition-transform ${expandedPeriod?.id === period.id ? 'rotate-90 text-violet-600' : ''}`} />
                  </div>

                  {expandedPeriod?.id === period.id && (
                      <div className="p-5 border-t border-gray-100 bg-gray-50/50 animate-in slide-in-from-top-2">
                          {!editing ? (
                              <div className="space-y-6">
                                  
                                  {/* SECCIÓN NARRATIVA */}
                                  <div className="bg-white p-4 rounded-2xl border border-violet-100 shadow-sm relative overflow-hidden">
                                      <div className="absolute top-0 left-0 w-1 h-full bg-violet-400"></div>
                                      <h4 className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-2 flex items-center gap-1"><BookOpen size={12}/> Narrativa del Cuento</h4>
                                      <p className="text-sm font-medium text-gray-700 italic leading-relaxed">"{period.narrativa || '...'}"</p>
                                  </div>

                                  {/* SECCIÓN PAÍSES (CON FORMATO PRESERVADO) */}
                                  <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm">
                                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1"><Globe size={12}/> Países y Ejes</h4>
                                      <p className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-bold">{period.paises || '-'}</p>
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                          <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-1"><List size={12}/> Contenidos Curriculares</h4>
                                          <p className="text-xs text-gray-700 whitespace-pre-wrap leading-relaxed">{period.contenidos || '-'}</p>
                                      </div>
                                      
                                      <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100">
                                          <h4 className="text-[10px] font-black text-orange-700 uppercase tracking-widest mb-2 flex items-center gap-1"><Briefcase size={12}/> Caja de Herramientas</h4>
                                          <div className="text-xs text-gray-800 whitespace-pre-wrap leading-relaxed font-medium">
                                              {period.herramientas || 'Sin herramientas cargadas.'}
                                          </div>
                                      </div>
                                  </div>

                                  <div className="bg-white p-4 rounded-2xl border border-gray-200">
                                      <h4 className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-2 flex items-center gap-1"><Lightbulb size={12}/> Actividades Sugeridas</h4>
                                      <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{period.actividades || '-'}</p>
                                  </div>

                                  {isAdmin && <button onClick={() => setEditing(true)} className="w-full py-3 bg-white border border-violet-200 text-violet-600 font-bold text-xs rounded-xl mt-2 hover:bg-violet-50 transition shadow-sm">Editar Manualmente</button>}
                              </div>
                          ) : (
                              <form onSubmit={handleSave} className="space-y-4">
                                  <div className="bg-white p-4 rounded-xl border border-gray-200 space-y-3">
                                      <label className="text-[10px] font-bold text-gray-400 uppercase">Narrativa</label>
                                      <textarea name="narrativa" defaultValue={period.narrativa} className="w-full p-3 rounded-lg border border-gray-200 text-xs h-20 outline-none focus:border-violet-400" />
                                      
                                      <label className="text-[10px] font-bold text-gray-400 uppercase">Países y Ejes</label>
                                      <textarea name="paises" defaultValue={period.paises} className="w-full p-3 rounded-lg border border-gray-200 text-xs h-40 outline-none focus:border-violet-400" />
                                  </div>

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      <div><label className="text-[10px] font-bold text-gray-400 uppercase">Contenidos</label><textarea name="contenidos" defaultValue={period.contenidos} className="w-full p-3 rounded-lg border border-gray-200 text-xs h-40 outline-none focus:border-violet-400" /></div>
                                      <div><label className="text-[10px] font-bold text-gray-400 uppercase">Caja Herramientas</label><textarea name="herramientas" defaultValue={period.herramientas} className="w-full p-3 rounded-lg border border-gray-200 text-xs h-40 outline-none focus:border-violet-400 bg-orange-50" /></div>
                                  </div>
                                  
                                  <div><label className="text-[10px] font-bold text-gray-400 uppercase">Actividades</label><textarea name="actividades" defaultValue={period.actividades} className="w-full p-3 rounded-lg border border-gray-200 text-xs h-24 outline-none focus:border-violet-400" /></div>

                                  <div className="flex gap-2 pt-2">
                                      <button type="button" onClick={() => setEditing(false)} className="flex-1 py-3 text-gray-400 font-bold text-xs hover:bg-gray-200 rounded-xl transition">Cancelar</button>
                                      <button type="submit" className="flex-1 py-3 bg-violet-600 text-white font-bold text-xs rounded-xl shadow-lg hover:bg-violet-700 transition">Guardar Cambios</button>
                                  </div>
                              </form>
                          )}
                      </div>
                  )}
              </div>
          )})}
      </div>
      
      <style>{`.hidden-icon { display: none; }`}</style>
      <div className="hidden"><Settings size={0}/></div>
    </div>
  );
}
