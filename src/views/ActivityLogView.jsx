import { getInstitutionName } from '../config';
import React, { useState, useEffect } from 'react';
import { 
  Clock, Download, Printer, FileText, Search, X, Activity, RefreshCw, User
} from 'lucide-react';
import { collection, query, orderBy, onSnapshot, limit } from 'firebase/firestore';

export function ActivityLogView({ db, appId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchQuery] = useState("");

  useEffect(() => {
    if (!db || !appId) return;

    // Apuntamos a 'activity_log' que es donde se guardan los movimientos reales
    const q = query(
      collection(db, 'artifacts', appId, 'public', 'data', 'activity_log'), 
      orderBy('timestamp', 'desc'),
      limit(200) // Traemos los últimos 200 para no saturar
    );

    const unsub = onSnapshot(q, (snap) => {
        const data = snap.docs.map(d => ({
            id: d.id,
            ...d.data(),
            date: d.data().timestamp ? new Date(d.data().timestamp.seconds * 1000) : new Date()
        }));
        setLogs(data);
        setLoading(false);
    });
    return () => unsub();
  }, [db, appId]);

  const filteredLogs = logs.filter(l => 
    l.userName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    l.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.details?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = () => {
    window.print();
  };

  const downloadReport = () => {
      const headers = ["Fecha", "Usuario", "Acción", "Detalles"];
      const rows = filteredLogs.map(l => [
        l.date.toLocaleString(), 
        l.userName || 'Sistema', 
        l.action, 
        `"${l.details}"`
      ]);
      const csvContent = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; 
      link.download = `LOG_ACTIVIDAD_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 md:bg-white rounded-3xl overflow-hidden shadow-inner">
        {/* HEADER - OCULTO AL IMPRIMIR */}
        <div className="p-6 bg-slate-900 text-white print:hidden shrink-0">
            <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter flex items-center gap-2">
                    <Activity className="text-orange-400"/> Auditoría Global
                  </h2>
                  <p className="text-white/50 text-[10px] uppercase font-bold tracking-widest">Seguimiento de movimientos del personal</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handlePrint} className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-xl transition flex items-center gap-2">
                      <Printer size={20}/>
                    </button>
                    <button onClick={downloadReport} className="bg-emerald-500 hover:bg-emerald-600 text-white p-3 rounded-xl shadow-lg transition">
                      <Download size={20}/>
                    </button>
                </div>
            </div>

            {/* BUSCADOR */}
            <div className="relative">
              <Search className="absolute left-4 top-3.5 text-slate-400" size={18}/>
              <input 
                value={searchTerm}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por usuario o acción..."
                className="w-full bg-white/10 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm font-bold outline-none focus:bg-white/20 transition-all"
              />
            </div>
        </div>

        {/* FORMATO PARA IMPRESIÓN (Solo visible al imprimir) */}
        <div className="hidden print:block p-8">
            <div className="flex justify-between items-center border-b-4 border-black pb-4 mb-6">
                <h1 className="text-2xl font-bold uppercase">Reporte de Auditoría - ${getInstitutionName()}</h1>
                <p className="text-sm font-bold">Emisión: {new Date().toLocaleString()}</p>
            </div>
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border p-2 text-xs uppercase">Fecha/Hora</th>
                        <th className="border p-2 text-xs uppercase">Usuario</th>
                        <th className="border p-2 text-xs uppercase">Acción</th>
                        <th className="border p-2 text-xs uppercase">Detalles</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredLogs.map(l => (
                        <tr key={l.id}>
                            <td className="border p-2 text-[10px]">{l.date.toLocaleString()}</td>
                            <td className="border p-2 text-[10px] font-bold">{l.userName || 'Sistema'}</td>
                            <td className="border p-2 text-[10px]">{l.action}</td>
                            <td className="border p-2 text-[10px] italic">{l.details}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* LISTADO VISUAL - OCULTO AL IMPRIMIR */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 print:hidden custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-20">
                <RefreshCw className="animate-spin mb-2" size={40}/>
                <p className="font-black uppercase italic">Sincronizando logs...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <p className="text-center text-slate-400 py-10 font-bold italic">No se encontraron registros</p>
            ) : filteredLogs.map(log => (
                <div key={log.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex gap-4 items-start hover:border-violet-300 transition-colors">
                    <div className="bg-slate-100 p-2 rounded-xl text-slate-400 shrink-0">
                      {log.userName ? <User size={18}/> : <Clock size={18}/>}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <p className="font-black text-[10px] text-violet-600 uppercase tracking-tighter italic">
                            {log.userName || 'Sistema'}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">
                            {log.date.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'})}
                          </p>
                        </div>
                        <p className="font-bold text-sm text-slate-800 leading-tight mb-1">{log.action}</p>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed italic border-l-2 border-slate-100 pl-3">
                          {log.details}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
}
