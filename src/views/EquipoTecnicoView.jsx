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
  collection, query, where, onSnapshot, orderBy, limit,
  doc, addDoc, updateDoc, deleteDoc, serverTimestamp 
} from 'firebase/firestore';


export function EquipoTecnicoView({ user, db, appId }) {
    const [items, setItems] = useState([]);
    const [messages, setMessages] = useState([]); // Nuevo: Chat general
    const [outingsChats, setOutingsChats] = useState({}); // Nuevo: Control de chats de salidas
    
    // 1. DEFINICIÓN ESTRICTA DE ROLES
    const isSedeRole = ['Equipo Directivo', 'Equipo Técnico'].includes(user.role);
    const isInclusionRole = ['Dirección Inclusión', 'Equipo Técnico Inclusión'].includes(user.role);
    const isAdmin = ['admin', 'super-admin'].includes(user.role) || user.rol === 'admin';
    const canAccess = isSedeRole || isInclusionRole || isAdmin;

    // 2. EQUIPO POR DEFECTO SEGÚN ROL
    const defaultTeam = (isInclusionRole && !isAdmin && !isSedeRole) ? 'inclusion' : 'sede';
    const [activeTeam, setActiveTeam] = useState(defaultTeam);
    
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState(''); 

    useEffect(() => {
        // Carga de ítems generales (Tareas, fechas, temas)
        const qItems = query(collection(db, 'artifacts', appId, 'public', 'data', 'tech_items'));
        const unsubItems = onSnapshot(qItems, snap => {
            setItems(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Carga del Chat General del equipo activo
        const qChat = query(
            collection(db, 'artifacts', appId, 'public', 'data', 'tech_messages'),
            where('team', '==', activeTeam),
            orderBy('createdAt', 'desc'),
            limit(50)
        );
        const unsubChat = onSnapshot(qChat, snap => {
            setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        return () => { unsubItems(); unsubChat(); };
    }, [activeTeam]);

    // BLOQUEO TOTAL SI NO PERTENECE A ESTOS ROLES
    if (!canAccess) return <div className="p-10 text-center text-gray-400 font-bold">⛔ Acceso restringido a Equipos de Gestión y Técnicos.</div>;

    const teamItems = items.filter(i => i.team === activeTeam);
    
    const topics = teamItems.filter(i => i.type === 'topic').sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    const tasks = teamItems.filter(i => i.type === 'task').sort((a,b) => {
        const statusOrder = { 'Pendiente': 0, 'En curso': 1, 'Completada': 2 };
        return statusOrder[a.status] - statusOrder[b.status];
    });
    const dates = teamItems.filter(i => i.type === 'date').sort((a,b) => new Date(a.date) - new Date(b.date));
    const outings = teamItems.filter(i => i.type === 'outing').sort((a,b) => new Date(a.date) - new Date(b.date));

    const today = new Date().toISOString().split('T')[0];
    const upcomingDates = dates.filter(d => d.date >= today);
    const nextDate = upcomingDates.length > 0 ? upcomingDates[0] : null;

    // --- FUNCIONES DE CHAT ---
    const sendChatMessage = async (e, parentId = null) => {
        if (e) e.preventDefault();
        const text = e.target.chatText.value;
        if (!text.trim()) return;
        
        const colName = parentId ? 'outings_messages' : 'tech_messages';
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', colName), {
            text,
            author: user.firstName,
            authorId: user.id,
            team: activeTeam,
            parentId, // Solo para chat de salidas
            createdAt: serverTimestamp()
        });
        e.target.reset();
    };

    const handleAddTopic = async () => {
        const text = prompt("Nuevo tema para la reunión:");
        if (!text) return;
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tech_items'), {
            type: 'topic', text, team: activeTeam, author: user.firstName, createdAt: serverTimestamp()
        });
    };

    const handleClearTopics = async () => {
        if (!confirm("¿Borrar todos los temas de esta reunión?")) return;
        const promises = topics.map(t => deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tech_items', t.id)));
        await Promise.all(promises);
    };

    const handleDelete = async (id) => {
        if (confirm("¿Eliminar este registro?")) {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tech_items', id));
        }
    };

    const toggleTaskStatus = async (task) => {
        const nextStatus = task.status === 'Pendiente' ? 'En curso' : task.status === 'En curso' ? 'Completada' : 'Pendiente';
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tech_items', task.id), { status: nextStatus });
    };

    const handleSaveForm = async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd.entries());
        data.type = modalType;
        data.team = activeTeam;
        data.author = user.firstName;
        data.createdAt = serverTimestamp();
        if(modalType === 'task') data.status = 'Pendiente';
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tech_items'), data);
        setShowModal(false);
    };

    return (
        <div className="space-y-4 animate-in fade-in pb-20 px-2 pt-4">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 uppercase italic flex items-center gap-2">
                            <List className="text-teal-500" size={24}/> Organizador {activeTeam === 'sede' ? 'Sede' : 'Inclusión'}
                        </h2>
                        <p className="text-xs text-gray-500 font-bold uppercase mt-1">Espacio de Trabajo Confidencial</p>
                    </div>
                    
                    <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto">
                        {(isSedeRole || isAdmin) && (
                            <button onClick={() => setActiveTeam('sede')} className={`flex-1 md:px-6 py-3 rounded-lg text-xs font-black uppercase transition ${activeTeam === 'sede' ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>Sede</button>
                        )}
                        {(isInclusionRole || isAdmin) && (
                            <button onClick={() => setActiveTeam('inclusion')} className={`flex-1 md:px-6 py-3 rounded-lg text-xs font-black uppercase transition ${activeTeam === 'inclusion' ? 'bg-white shadow text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}>Inclusión</button>
                        )}
                    </div>
                </div>
            </div>

            {nextDate && (
                <div className="bg-gradient-to-r from-teal-500 to-emerald-500 p-4 rounded-2xl shadow-lg text-white flex items-center justify-between animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-xl"><AlertTriangle size={24}/></div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-teal-100">Próximo Vencimiento / Evento</p>
                            <h3 className="font-bold text-lg">{nextDate.title}</h3>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="bg-white text-teal-700 px-3 py-1 rounded-lg text-sm font-black shadow-sm">
                            {new Date(nextDate.date + 'T00:00:00').toLocaleDateString('es-AR')}
                        </span>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                    {/* PRÓXIMA REUNIÓN */}
                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-gray-800 uppercase flex items-center gap-2"><FileText size={18} className="text-orange-500"/> Próxima Reunión</h3>
                            <div className="flex gap-2">
                                <button onClick={handleAddTopic} className="bg-orange-100 text-orange-700 p-2 rounded-lg hover:bg-orange-200 transition"><Plus size={16}/></button>
                                {topics.length > 0 && <button onClick={handleClearTopics} className="bg-red-50 text-red-600 p-2 rounded-lg hover:bg-red-100 transition" title="Limpiar todo"><Trash2 size={16}/></button>}
                            </div>
                        </div>
                        <div className="space-y-2">
                            {topics.length === 0 ? <p className="text-xs text-gray-400 italic">No hay temas agendados.</p> : topics.map(t => (
                                <div key={t.id} className="flex justify-between items-start bg-orange-50/50 p-3 rounded-xl border border-orange-100/50 group">
                                    <div className="flex gap-2 items-start">
                                        <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-1.5 shrink-0"></div>
                                        <p className="text-sm font-bold text-gray-700">{t.text}</p>
                                    </div>
                                    <button onClick={() => handleDelete(t.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition"><X size={14}/></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* TAREAS EQUIPO */}
                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-gray-800 uppercase flex items-center gap-2"><CheckSquare size={18} className="text-blue-500"/> Tareas del Equipo</h3>
                            <button onClick={() => {setModalType('task'); setShowModal(true);}} className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 transition"><Plus size={16}/></button>
                        </div>
                        <div className="space-y-3">
                            {tasks.map(t => (
                                <div key={t.id} className={`p-3 rounded-xl border transition flex justify-between items-center group ${t.status === 'Completada' ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-white border-blue-100 shadow-sm'}`}>
                                    <div>
                                        <h4 className={`font-bold text-sm ${t.status === 'Completada' ? 'line-through text-gray-500' : 'text-gray-800'}`}>{t.title}</h4>
                                        <p className="text-[10px] font-black text-blue-500 uppercase mt-1">Responsable: {t.assignee}</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => toggleTaskStatus(t)} className={`text-[9px] font-black uppercase px-2 py-1 rounded-md border transition ${t.status === 'Pendiente' ? 'bg-red-50 text-red-600 border-red-200' : t.status === 'En curso' ? 'bg-yellow-50 text-yellow-600 border-yellow-200' : 'bg-green-50 text-green-600 border-green-200'}`}>{t.status}</button>
                                        <button onClick={() => handleDelete(t.id)} className="text-gray-300 hover:text-red-500 transition"><Trash2 size={14}/></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* NUEVO: CHAT GENERAL EQUIPO */}
                    <div className="bg-slate-900 p-6 rounded-[40px] shadow-xl text-white h-[400px] flex flex-col border-b-8 border-blue-600">
                        <h3 className="font-black uppercase italic text-[10px] mb-4 flex items-center gap-2 text-blue-400"><MessageSquare size={16}/> Muro de Comunicación</h3>
                        <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-2 custom-scrollbar flex flex-col-reverse">
                            {messages.map(m => (
                                <div key={m.id} className={`p-3 rounded-2xl max-w-[85%] ${m.authorId === user.id ? 'bg-blue-600 self-end rounded-tr-none' : 'bg-slate-800 self-start rounded-tl-none'}`}>
                                    <p className="text-[9px] font-black uppercase opacity-60 mb-1">{m.author}</p>
                                    <p className="text-sm font-medium">{m.text}</p>
                                </div>
                            ))}
                        </div>
                        <form onSubmit={sendChatMessage} className="flex gap-2">
                            <input name="chatText" placeholder="Escribir..." className="flex-1 bg-slate-800 border-none rounded-2xl px-4 py-3 text-sm focus:ring-1 ring-blue-500 outline-none" />
                            <button type="submit" className="bg-blue-600 p-3 rounded-2xl active:scale-90 transition-transform"><Send size={20}/></button>
                        </form>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* FECHAS IMPORTANTE */}
                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-gray-800 uppercase flex items-center gap-2"><CalendarIcon size={18} className="text-emerald-500"/> Fechas Importantes</h3>
                            <button onClick={() => {setModalType('date'); setShowModal(true);}} className="bg-emerald-50 text-emerald-600 p-2 rounded-lg hover:bg-emerald-100 transition"><Plus size={16}/></button>
                        </div>
                        <div className="space-y-2">
                            {dates.map(d => (
                                <div key={d.id} className="flex justify-between items-center bg-white border border-gray-100 p-3 rounded-xl shadow-sm group">
                                    <div className="flex gap-3 items-center">
                                        <div className="bg-emerald-100 text-emerald-800 text-center rounded-lg px-2 py-1 min-w-[50px]">
                                            <span className="block text-sm font-black leading-none">{d.date.split('-')[2]}</span>
                                            <span className="block text-[9px] uppercase font-bold">{new Date(d.date+'T00:00:00').toLocaleString('es-ES', {month:'short'})}</span>
                                        </div>
                                        <h4 className="font-bold text-sm text-gray-700">{d.title}</h4>
                                    </div>
                                    <button onClick={() => handleDelete(d.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition"><Trash2 size={14}/></button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SALIDAS / PROYECTOS CON CHAT */}
                    <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-purple-500"></div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-black text-gray-800 uppercase flex items-center gap-2"><span className="text-lg">📍</span> Salidas / Proyectos</h3>
                            <button onClick={() => {setModalType('outing'); setShowModal(true);}} className="bg-purple-50 text-purple-600 p-2 rounded-lg hover:bg-purple-100 transition"><Plus size={16}/></button>
                        </div>
                        <div className="space-y-3">
                            {outings.map(o => (
                                <div key={o.id} className="bg-purple-50/30 rounded-2xl border border-purple-100 overflow-hidden group">
                                    <div className="p-4">
                                        <div className="flex justify-between">
                                            <h4 className="font-black text-purple-900 text-sm mb-1">{o.title}</h4>
                                            <button onClick={() => handleDelete(o.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={14}/></button>
                                        </div>
                                        <div className="flex gap-2 mb-2">
                                            <span className="text-[9px] font-bold bg-white px-2 py-0.5 rounded border">📅 {new Date(o.date+'T00:00:00').toLocaleDateString('es-AR')}</span>
                                            <span className="text-[9px] font-bold bg-white px-2 py-0.5 rounded border">👥 {o.groups}</span>
                                        </div>
                                        <button onClick={() => setOutingsChats(prev => ({...prev, [o.id]: !prev[o.id]}))} className={`w-full mt-2 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${outingsChats[o.id] ? 'bg-purple-600 text-white shadow-lg' : 'bg-white text-purple-600 border border-purple-100'}`}>
                                            {outingsChats[o.id] ? 'Cerrar Coordinación' : '💬 Chat de Coordinación'}
                                        </button>
                                    </div>
                                    {outingsChats[o.id] && (
                                        <div className="bg-white border-t p-4 animate-in slide-in-from-top-2">
                                            <form onSubmit={(e) => sendChatMessage(e, o.id)} className="flex gap-2">
                                                <input name="chatText" placeholder="Anotar algo..." className="flex-1 bg-gray-50 border rounded-xl px-3 py-2 text-xs outline-none" />
                                                <button type="submit" className="bg-purple-600 text-white p-2 rounded-xl"><Send size={14}/></button>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <form onSubmit={handleSaveForm} className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-black text-slate-800 uppercase italic">
                                {modalType === 'task' ? 'Nueva Tarea' : modalType === 'date' ? 'Nueva Fecha' : 'Nueva Salida'}
                            </h3>
                            <button type="button" onClick={() => setShowModal(false)}><X/></button>
                        </div>
                        <div className="space-y-3">
                            <input name="title" placeholder="Título" className="w-full p-3 bg-gray-50 rounded-xl outline-none font-bold text-sm border focus:border-blue-300" required />
                            {modalType === 'task' && <input name="assignee" placeholder="Responsable" className="w-full p-3 bg-gray-50 rounded-xl outline-none text-xs border" required />}
                            {(modalType === 'date' || modalType === 'outing') && <input name="date" type="date" className="w-full p-3 bg-gray-50 rounded-xl outline-none text-xs border font-bold" required />}
                            {modalType === 'outing' && (
                                <>
                                    <input name="groups" placeholder="Grupos" className="w-full p-3 bg-gray-50 rounded-xl outline-none text-xs border" required />
                                    <textarea name="ideas" placeholder="Propósito..." className="w-full p-3 bg-gray-50 rounded-xl outline-none text-xs border h-16 resize-none" required />
                                </>
                            )}
                            <button type="submit" className="w-full py-3 bg-slate-800 text-white rounded-xl font-black uppercase text-xs shadow-lg mt-2">Guardar</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
