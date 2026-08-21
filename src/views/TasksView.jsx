import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Check,
  CheckSquare,
  ChevronDown,
  Edit3,
  Filter,
  MessageSquare,
  Plus,
  Search,
  Send,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore';
import { getCachedAppConfig, isModuleEnabled } from '../config';

const FALLBACK_STATUSES = [
  { key: 'pending', label: 'Pendiente' },
  { key: 'in_progress', label: 'En proceso' },
  { key: 'completed', label: 'Completada' },
];

const FALLBACK_PRIORITIES = [
  { key: 'low', label: 'Baja' },
  { key: 'medium', label: 'Media' },
  { key: 'high', label: 'Alta' },
];

function getStatusMeta(settings, status) {
  return (settings.statuses || FALLBACK_STATUSES).find(item => item.key === status) || FALLBACK_STATUSES[0];
}

function getPriorityMeta(settings, priority) {
  return (settings.priorities || FALLBACK_PRIORITIES).find(item => item.key === priority) || FALLBACK_PRIORITIES[1];
}

function formatDate(value) {
  if (!value) return '';
  return new Date(`${value}T12:00:00`).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function getDaysLabel(value) {
  if (!value) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${value}T12:00:00`);
  due.setHours(0, 0, 0, 0);
  const diff = Math.ceil((due - today) / 86400000);

  if (Number.isNaN(diff)) return null;
  if (diff < 0) return { label: 'Vencida', tone: 'danger' };
  if (diff === 0) return { label: 'Hoy', tone: 'warning' };
  if (diff === 1) return { label: 'Mañana', tone: 'info' };
  return { label: `Faltan ${diff} días`, tone: 'muted' };
}

function matchesRole(targetRoles = [], role = '') {
  return targetRoles.some(target => String(target).toLowerCase() === String(role).toLowerCase());
}

export function TasksView({ tasks = [], user, db, appId }) {
  const appConfig = getCachedAppConfig();
  const taskSettings = appConfig.taskSettings || {};
  const roles = appConfig.roles || [];
  const teams = appConfig.teams || [];
  const statuses = taskSettings.statuses?.length ? taskSettings.statuses : FALLBACK_STATUSES;
  const priorities = taskSettings.priorities?.length ? taskSettings.priorities : FALLBACK_PRIORITIES;
  const assignmentTypes = taskSettings.assignmentTypes?.length ? taskSettings.assignmentTypes : ['Persona', 'Rol', 'Equipo'];

  const [showModal, setShowModal] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [view, setView] = useState('mine');
  const [statusFilter, setStatusFilter] = useState('active');
  const [editingTask, setEditingTask] = useState(null);
  const [assignType, setAssignType] = useState('Persona');
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [selectedTeams, setSelectedTeams] = useState([]);
  const [selectedUsersObj, setSelectedUsersObj] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [openCommentsId, setOpenCommentsId] = useState(null);
  const [newComment, setNewComment] = useState('');
  const [feedback, setFeedback] = useState('');

  const currentRole = user?.role || user?.rol || '';
  const isAdmin = ['admin', 'super-admin'].includes(user?.rol) || ['admin', 'super-admin'].includes(user?.role);
  const creatorRoles = taskSettings.creatorRoles || [];
  const canCreateTasks = isAdmin || creatorRoles.length === 0 || creatorRoles.includes(currentRole);
  const moduleEnabled = isModuleEnabled(appConfig, 'tasks');

  useEffect(() => {
    if (!db || !appId || !moduleEnabled) return undefined;
    const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
    const q = query(usersRef, orderBy('fullName', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setUsersList(snap.docs.map(item => ({ id: item.id, ...item.data() })));
    }, error => {
      console.error('No se pudieron cargar los usuarios de Tareas:', error);
      setUsersList([]);
    });
    return () => unsub();
  }, [db, appId, moduleEnabled]);

  useEffect(() => {
    if (!editingTask) return;
    const ids = editingTask.targetUserIds || (editingTask.targetUserId ? [editingTask.targetUserId] : []);
    setAssignType(editingTask.targetType || 'Persona');
    setSelectedUsersObj(usersList.filter(item => ids.includes(item.id)));
    setSelectedRoles(editingTask.targetRoles || []);
    setSelectedTeams(editingTask.targetTeams || []);
  }, [editingTask, usersList]);

  const visibleTasks = useMemo(() => {
    if (!moduleEnabled) return [];

    return (tasks || [])
      .filter(Boolean)
      .filter(task => {
        const isMine =
          task.createdById === user?.id ||
          task.targetUserIds?.includes(user?.id) ||
          matchesRole(task.targetRoles || [], currentRole) ||
          task.targetTeams?.some(team => teams.includes(team) && (user?.team === team || user?.teamName === team));

        if (view === 'all' && isAdmin) return true;
        return isMine;
      })
      .filter(task => {
        if (statusFilter === 'active') return task.status !== 'completed';
        if (statusFilter === 'completed') return task.status === 'completed';
        if (statusFilter === 'overdue') return task.status !== 'completed' && task.dueDate && new Date(`${task.dueDate}T23:59:59`) < new Date();
        return true;
      })
      .sort((a, b) => (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31'));
  }, [tasks, moduleEnabled, statusFilter, view, isAdmin, user?.id, currentRole, teams]);

  const counts = useMemo(() => {
    const relevant = (tasks || []).filter(task => {
      if (view === 'all' && isAdmin) return true;
      return task.createdById === user?.id || task.targetUserIds?.includes(user?.id) || matchesRole(task.targetRoles || [], currentRole);
    });
    return {
      active: relevant.filter(item => item.status !== 'completed').length,
      completed: relevant.filter(item => item.status === 'completed').length,
      overdue: relevant.filter(item => item.status !== 'completed' && item.dueDate && new Date(`${item.dueDate}T23:59:59`) < new Date()).length,
    };
  }, [tasks, view, isAdmin, user?.id, currentRole]);

  const resetForm = () => {
    setShowModal(false);
    setEditingTask(null);
    setSelectedUsersObj([]);
    setSelectedRoles([]);
    setSelectedTeams([]);
    setUserSearch('');
    setAssignType('Persona');
  };

  const handleSaveTask = async event => {
    event.preventDefault();
    if (!db || !appId || !canCreateTasks) return;

    const fd = new FormData(event.currentTarget);
    const typeLabel = fd.get('taskType') || taskSettings.types?.[0] || 'Institucional';
    const dueDate = fd.get('dueDate') || null;
    if (taskSettings.requireDueDate && !dueDate) {
      setFeedback('Esta institución requiere una fecha de vencimiento.');
      return;
    }

    let targetType = assignType;
    let assignedToName = 'Sin asignar';
    if (assignType === 'Persona') assignedToName = selectedUsersObj.map(item => item.fullName || `${item.firstName || ''} ${item.lastName || ''}`.trim()).join(', ') || 'Sin asignar';
    if (assignType === 'Rol') assignedToName = selectedRoles.join(', ') || 'Sin asignar';
    if (assignType === 'Equipo') assignedToName = selectedTeams.join(', ') || 'Sin asignar';

    const taskData = {
      title: String(fd.get('title') || '').trim() || 'Sin título',
      type: typeLabel,
      dueDate,
      showDate: fd.get('showDate') || null,
      showTime: fd.get('showTime') || '08:00',
      priority: fd.get('priority') || priorities[1].key,
      targetType,
      targetUserIds: selectedUsersObj.map(item => item.id),
      targetRoles: selectedRoles,
      targetTeams: selectedTeams,
      assignedToName,
    };

    try {
      if (editingTask?.id) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', editingTask.id), taskData);
        setFeedback('Tarea actualizada.');
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'tasks'), {
          ...taskData,
          createdByName: user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Usuario',
          createdById: user?.id,
          status: statuses[0]?.key || 'pending',
          createdAt: serverTimestamp(),
          comments: [],
        });
        setFeedback('Tarea creada.');
      }
      resetForm();
      setTimeout(() => setFeedback(''), 2500);
    } catch (error) {
      console.error(error);
      setFeedback('No se pudo guardar la tarea.');
    }
  };

  const changeStatus = async (task, newStatus) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', task.id), { status: newStatus });
    } catch (error) {
      console.error(error);
      setFeedback('No se pudo actualizar el estado.');
    }
  };

  const handleDelete = async id => {
    if (!confirm('¿Eliminar esta tarea?')) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', id));
      setFeedback('Tarea eliminada.');
      setTimeout(() => setFeedback(''), 2500);
    } catch (error) {
      console.error(error);
      setFeedback('No se pudo eliminar la tarea.');
    }
  };

  const handleAddComment = async (taskId, comments = []) => {
    if (!taskSettings.allowComments || !newComment.trim()) return;
    const comment = {
      id: Date.now().toString(),
      text: newComment.trim(),
      author: user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Usuario',
      date: new Date().toLocaleString('es-AR'),
    };
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'tasks', taskId), {
        comments: [...(comments || []), comment],
      });
      setNewComment('');
    } catch (error) {
      console.error(error);
      setFeedback('No se pudo enviar el comentario.');
    }
  };

  const toggleUserSelection = userItem => {
    setSelectedUsersObj(current => current.some(selected => selected.id === userItem.id)
      ? current.filter(selected => selected.id !== userItem.id)
      : [...current, userItem]);
    setUserSearch('');
  };

  if (!moduleEnabled) {
    return (
      <div className="max-w-2xl mx-auto py-16 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-5 text-slate-400">
          <CheckSquare size={28} />
        </div>
        <h2 className="text-xl font-black text-slate-800">Tareas no está habilitado</h2>
        <p className="text-sm text-slate-500 mt-2">Esta funcionalidad no está activa para esta institución.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-24 animate-in fade-in">
      <div className="bg-white border border-slate-200 rounded-3xl p-5 sticky top-0 z-10 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-violet-600">Gestión</p>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Tareas</h2>
            <p className="text-sm text-slate-500 mt-1">Organizá pendientes, responsables y fechas desde un solo lugar.</p>
          </div>
          {canCreateTasks && (
            <button
              onClick={() => { setEditingTask(null); setShowModal(true); }}
              className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition"
            >
              <Plus size={17} /> Nueva tarea
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-5">
          {[
            ['active', 'Pendientes', counts.active],
            ['overdue', 'Vencidas', counts.overdue],
            ['completed', 'Completadas', counts.completed],
            ['all', 'Todas', counts.active + counts.completed],
          ].map(([key, label, count]) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${statusFilter === key ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            >
              {label} <span className="ml-1 opacity-60">{count}</span>
            </button>
          ))}
          {isAdmin && (
            <button
              onClick={() => setView(view === 'mine' ? 'all' : 'mine')}
              className={`ml-auto px-3 py-2 rounded-xl text-xs font-bold border transition ${view === 'all' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-500'}`}
            >
              {view === 'mine' ? 'Ver todas' : 'Solo las mías'}
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div className="mx-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl px-4 py-3 text-sm font-semibold">
          {feedback}
        </div>
      )}

      {visibleTasks.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <Check size={24} />
          </div>
          <h3 className="font-black text-slate-800">No hay tareas para mostrar</h3>
          <p className="text-sm text-slate-500 mt-1">
            {statusFilter === 'completed' ? 'Todavía no hay tareas completadas.' : statusFilter === 'overdue' ? 'No hay tareas vencidas.' : 'Todo está al día o no tenés tareas asignadas.'}
          </p>
          {canCreateTasks && statusFilter !== 'completed' && (
            <button onClick={() => setShowModal(true)} className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700">
              <Plus size={16} /> Crear una tarea
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 px-1">
          {visibleTasks.map(task => {
            const statusMeta = getStatusMeta(taskSettings, task.status);
            const priorityMeta = getPriorityMeta(taskSettings, task.priority);
            const dueInfo = getDaysLabel(task.dueDate);
            const overdue = dueInfo?.tone === 'danger' && task.status !== 'completed';
            const canEdit = task.createdById === user?.id || isAdmin;

            return (
              <article key={task.id} className={`bg-white border rounded-2xl p-5 shadow-sm ${overdue ? 'border-red-200' : 'border-slate-200'}`}>
                <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${overdue ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                        {statusMeta.label}
                      </span>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase ${priorityMeta.key === 'high' ? 'bg-rose-50 text-rose-700' : priorityMeta.key === 'medium' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {priorityMeta.label}
                      </span>
                      {task.type && <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-violet-50 text-violet-700">{task.type}</span>}
                    </div>

                    <h3 className={`text-base font-black text-slate-900 leading-tight ${task.status === 'completed' ? 'line-through text-slate-400' : ''}`}>
                      {task.title}
                    </h3>

                    <p className="text-xs text-slate-500 mt-2">
                      {task.targetType === 'Persona' && 'Asignada a personas'}
                      {task.targetType === 'Rol' && `Asignada a ${task.targetRoles?.join(', ') || 'roles'}`}
                      {task.targetType === 'Equipo' && `Asignada a ${task.targetTeams?.join(', ') || 'equipos'}`}
                      {task.assignedToName && task.targetType === 'Persona' && ` · ${task.assignedToName}`}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 text-[11px] text-slate-400">
                      {task.dueDate && (
                        <span className={`flex items-center gap-1.5 ${overdue ? 'text-red-600 font-bold' : ''}`}>
                          <CalendarIcon size={13} /> Vence {formatDate(task.dueDate)}
                        </span>
                      )}
                      {task.createdByName && <span>Creada por {task.createdByName}</span>}
                      {dueInfo && <span className={`${dueInfo.tone === 'warning' ? 'text-amber-600 font-bold' : dueInfo.tone === 'danger' ? 'text-red-600 font-bold' : ''}`}>{dueInfo.label}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 lg:pt-1">
                    {canEdit && (
                      <>
                        <button onClick={() => { setEditingTask(task); setShowModal(true); }} className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50" title="Editar">
                          <Edit3 size={15} />
                        </button>
                        <button onClick={() => handleDelete(task.id)} className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:bg-red-50 hover:text-red-500" title="Eliminar">
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                  {taskSettings.allowComments !== false ? (
                    <button onClick={() => setOpenCommentsId(openCommentsId === task.id ? null : task.id)} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-violet-700">
                      <MessageSquare size={16} /> {task.comments?.length || 0} comentario{task.comments?.length === 1 ? '' : 's'}
                    </button>
                  ) : <span />}

                  <div className="flex flex-wrap gap-1.5">
                    {statuses.map(status => (
                      <button
                        key={status.key}
                        onClick={() => changeStatus(task, status.key)}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition ${task.status === status.key ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-white border-slate-200 text-slate-400 hover:bg-slate-50'}`}
                      >
                        {status.label}
                      </button>
                    ))}
                  </div>
                </div>

                {openCommentsId === task.id && taskSettings.allowComments !== false && (
                  <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4">
                    <div className="space-y-3 max-h-48 overflow-y-auto mb-3">
                      {(task.comments || []).map(comment => (
                        <div key={comment.id} className="bg-white rounded-xl border border-slate-200 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[10px] font-black uppercase text-violet-700">{comment.author}</span>
                            <span className="text-[9px] text-slate-400">{comment.date}</span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">{comment.text}</p>
                        </div>
                      ))}
                      {(!task.comments || task.comments.length === 0) && <p className="text-xs text-slate-400 text-center py-4">Todavía no hay comentarios.</p>}
                    </div>

                    <div className="flex gap-2">
                      <input
                        value={newComment}
                        onChange={event => setNewComment(event.target.value)}
                        onKeyDown={event => { if (event.key === 'Enter') handleAddComment(task.id, task.comments); }}
                        placeholder="Escribí un comentario..."
                        className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs outline-none focus:ring-2 focus:ring-violet-100"
                      />
                      <button onClick={() => handleAddComment(task.id, task.comments)} className="rounded-xl bg-violet-600 text-white px-3 hover:bg-violet-700" title="Enviar comentario">
                        <Send size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {showModal && canCreateTasks && (
        <div className="fixed inset-0 bg-slate-900/60 z-[110] flex items-center justify-center p-4 backdrop-blur-sm">
          <form onSubmit={handleSaveTask} className="bg-white rounded-3xl w-full max-w-2xl p-6 md:p-7 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-6">
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-violet-600">Tareas</p>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{editingTask ? 'Editar tarea' : 'Nueva tarea'}</h3>
                <p className="text-sm text-slate-500 mt-1">Definí el trabajo, responsable y fechas.</p>
              </div>
              <button type="button" onClick={resetForm} className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200" aria-label="Cerrar">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5">
              <section>
                <label className="block text-xs font-black uppercase tracking-wide text-slate-500 mb-1.5">Qué hay que hacer</label>
                <input name="title" defaultValue={editingTask?.title || ''} placeholder="Ej.: Preparar informe trimestral" required className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-violet-100" />
              </section>

              <div className="grid md:grid-cols-2 gap-4">
                <section>
                  <label className="block text-xs font-black uppercase tracking-wide text-slate-500 mb-1.5">Tipo de tarea</label>
                  <select name="taskType" defaultValue={editingTask?.type || taskSettings.types?.[0] || ''} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold bg-white">
                    {(taskSettings.types || ['Institucional']).map(type => <option key={type} value={type}>{type}</option>)}
                  </select>
                </section>

                <section>
                  <label className="block text-xs font-black uppercase tracking-wide text-slate-500 mb-1.5">Prioridad</label>
                  <select name="priority" defaultValue={editingTask?.priority || priorities[1].key} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold bg-white">
                    {priorities.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
                  </select>
                </section>
              </div>

              <section>
                <label className="block text-xs font-black uppercase tracking-wide text-slate-500 mb-2">A quién asignar</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {assignmentTypes.map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setAssignType(type)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border ${assignType === type ? 'bg-violet-50 border-violet-200 text-violet-700' : 'bg-white border-slate-200 text-slate-500'}`}
                    >
                      {type === 'Persona' && <User size={14} className="inline mr-1" />}
                      {type === 'Rol' && <Users size={14} className="inline mr-1" />}
                      {type === 'Equipo' && <Users size={14} className="inline mr-1" />}
                      {type}
                    </button>
                  ))}
                </div>

                {assignType === 'Persona' && (
                  <div>
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                      <input value={userSearch} onChange={event => setUserSearch(event.target.value)} placeholder="Buscar una persona..." className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-violet-100" />
                    </div>

                    {userSearch && (
                      <div className="mt-2 rounded-xl border border-slate-200 bg-white max-h-48 overflow-y-auto shadow-sm">
                        {usersList
                          .filter(item => (item.fullName || '').toLowerCase().includes(userSearch.toLowerCase()))
                          .slice(0, 12)
                          .map(item => (
                            <button key={item.id} type="button" onClick={() => toggleUserSelection(item)} className="w-full px-3 py-2.5 text-left hover:bg-violet-50 flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-slate-700">{item.fullName || 'Sin nombre'}</p>
                                <p className="text-[10px] text-slate-400">{item.role || item.rol || 'Sin rol'}</p>
                              </div>
                              <Plus size={15} className="text-violet-500" />
                            </button>
                          ))}
                        {usersList.filter(item => (item.fullName || '').toLowerCase().includes(userSearch.toLowerCase())).length === 0 && <p className="px-3 py-4 text-xs text-slate-400 text-center">No encontramos personas.</p>}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mt-2">
                      {selectedUsersObj.map(item => (
                        <span key={item.id} className="inline-flex items-center gap-2 bg-violet-50 text-violet-700 px-3 py-1.5 rounded-xl text-xs font-bold">
                          {item.fullName || 'Usuario'}
                          <button type="button" onClick={() => toggleUserSelection(item)} aria-label="Quitar"><X size={13} /></button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {assignType === 'Rol' && (
                  <div className="grid sm:grid-cols-2 gap-2">
                    {roles.map(role => (
                      <label key={role} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm">
                        <span>{role}</span>
                        <input type="checkbox" checked={selectedRoles.includes(role)} onChange={event => setSelectedRoles(current => event.target.checked ? [...current, role] : current.filter(item => item !== role))} className="accent-violet-600" />
                      </label>
                    ))}
                  </div>
                )}

                {assignType === 'Equipo' && (
                  teams.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-2">
                      {teams.map(team => (
                        <label key={team} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm">
                          <span>{team}</span>
                          <input type="checkbox" checked={selectedTeams.includes(team)} onChange={event => setSelectedTeams(current => event.target.checked ? [...current, team] : current.filter(item => item !== team))} className="accent-violet-600" />
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 text-xs">Todavía no hay equipos configurados en esta institución.</div>
                  )
                )}
              </section>

              <div className="grid md:grid-cols-2 gap-4">
                <section>
                  <label className="block text-xs font-black uppercase tracking-wide text-slate-500 mb-1.5">Mostrar desde</label>
                  <input name="showDate" type="date" defaultValue={editingTask?.showDate || ''} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
                  <input name="showTime" type="time" defaultValue={editingTask?.showTime || '08:00'} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm mt-2" />
                </section>

                <section>
                  <label className="block text-xs font-black uppercase tracking-wide text-slate-500 mb-1.5">Vencimiento</label>
                  <input name="dueDate" type="date" required={!!taskSettings.requireDueDate} defaultValue={editingTask?.dueDate || ''} className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm" />
                  <p className="text-[10px] text-slate-400 mt-1">{taskSettings.requireDueDate ? 'La fecha es obligatoria.' : 'Opcional.'}</p>
                </section>
              </div>
            </div>

            <div className="flex gap-2 mt-7 pt-4 border-t border-slate-100">
              <button type="button" onClick={resetForm} className="flex-1 rounded-xl border border-slate-200 text-slate-600 py-3 font-bold text-sm hover:bg-slate-50">Cancelar</button>
              <button type="submit" className="flex-1 rounded-xl bg-violet-600 text-white py-3 font-black text-sm hover:bg-violet-700">{editingTask ? 'Guardar cambios' : 'Crear tarea'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
