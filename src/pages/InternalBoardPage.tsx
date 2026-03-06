import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import type { InternalNote, NoteCategory, NotePriority, NoteStatus } from '../types';
// import { Plus, CheckCircle2, StickyNote, Trash2 } from 'lucide-react';
const Plus = ({ className }: { className?: string }) => <span className={className}>+</span>;
const CheckCircle2 = ({ className }: { className?: string }) => <span className={className}>✅</span>;
const StickyNote = ({ className }: { className?: string }) => <span className={className}>📝</span>;
const Trash2 = ({ className }: { className?: string }) => <span className={className}>🗑️</span>;

const PRIORITY_COLORS = {
    alta: 'bg-red-100 text-red-800 border-red-200',
    media: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    baja: 'bg-blue-100 text-blue-800 border-blue-200',
};

export const InternalBoardPage = () => {
    const { user } = useAuth();

    // Mock initial data - Replace with Firebase logic later
    const [notes, setNotes] = useState<InternalNote[]>([]);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newNote, setNewNote] = useState({
        content: '',
        category: 'general' as NoteCategory,
        priority: 'media' as NotePriority
    });

    const handleAddNote = (e: React.FormEvent) => {
        e.preventDefault();
        const note: InternalNote = {
            id: Date.now().toString(),
            content: newNote.content,
            category: newNote.category,
            priority: newNote.priority,
            status: 'pendiente',
            // createdAt: Timestamp.now(), 
            createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as any, // Mock for now
            createdBy: user?.email?.split('@')[0] || 'Usuario', // Fallback name
            createdById: user?.id || 'temp-uid'
        };

        setNotes([note, ...notes]);
        setIsModalOpen(false);
        setNewNote({ content: '', category: 'general', priority: 'media' });
    };

    const handleStatusChange = (id: string, newStatus: NoteStatus) => {
        setNotes(notes.map(note =>
            note.id === id ? { ...note, status: newStatus } : note
        ));
    };

    const handleDelete = (id: string) => {
        if (confirm('¿Estás seguro de eliminar esta nota?')) {
            setNotes(notes.filter(n => n.id !== id));
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                        <StickyNote className="h-8 w-8 text-indigo-600" />
                        Pizarra Interna
                    </h1>
                    <p className="text-gray-500 mt-1">Comunicación y tareas del equipo</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition"
                >
                    <Plus className="h-5 w-5" />
                    Nueva Nota
                </button>
            </div>

            {/* Kanban-ish Board or Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {notes.map((note) => (
                    <div
                        key={note.id}
                        className={`bg-white rounded-xl shadow-sm border p-5 relative group transition-all hover:shadow-md ${note.status === 'solucionado' ? 'opacity-75 bg-gray-50' : ''
                            }`}
                    >
                        {/* Header: Priority & Category */}
                        <div className="flex justify-between items-start mb-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold uppercase ${PRIORITY_COLORS[note.priority]}`}>
                                {note.priority}
                            </span>
                            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider border px-2 py-1 rounded">
                                {note.category}
                            </span>
                        </div>

                        {/* Content */}
                        <p className="text-gray-800 text-lg mb-4 whitespace-pre-wrap">{note.content}</p>

                        {/* Footer: Meta & Actions */}
                        <div className="flex items-center justify-between border-t pt-4 mt-2">
                            <div className="text-sm text-gray-500">
                                <p className="font-medium text-gray-700">{note.createdBy}</p>
                                <p className="text-xs">{new Date(note.createdAt.seconds * 1000).toLocaleDateString()}</p>
                            </div>

                            <div className="flex items-center gap-2">
                                {note.status !== 'solucionado' ? (
                                    <button
                                        onClick={() => handleStatusChange(note.id, 'solucionado')}
                                        className="p-2 text-green-600 hover:bg-green-50 rounded-full tooltip"
                                        title="Marcar como solucionado"
                                    >
                                        <CheckCircle2 className="h-5 w-5" />
                                    </button>
                                ) : (
                                    <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                        <CheckCircle2 className="h-4 w-4" /> Listo
                                    </span>
                                )}

                                {/* Delete button (only visible on hover or if admin - mocked for now) */}
                                <button
                                    onClick={() => handleDelete(note.id)}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Status indicator pill if pending/in-progress */}
                        {note.status !== 'solucionado' && (
                            <div className="absolute top-5 right-1/2 translate-x-1/2 -mt-8 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs py-1 px-2 rounded mb-2">
                                {note.status === 'pendiente' ? 'Pendiente' : 'En Proceso'}
                            </div>
                        )}
                    </div>
                ))}

                {notes.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-400">
                        <div className="flex justify-center mb-4">
                            <StickyNote className="h-12 w-12 text-gray-200" />
                        </div>
                        <p>No hay notas activas. ¡Crea una para avisar algo al equipo!</p>
                    </div>
                )}
            </div>

            {/* Modal Nueva Nota */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <h2 className="text-xl font-bold mb-4">Nueva Nota</h2>
                        <form onSubmit={handleAddNote}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                                <select
                                    value={newNote.category}
                                    onChange={(e) => setNewNote({ ...newNote, category: e.target.value as NoteCategory })}
                                    className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="general">General</option>
                                    <option value="insumos">Insumos</option>
                                    <option value="maquinas">Máquinas</option>
                                    <option value="personal">Personal</option>
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                                <div className="flex gap-2">
                                    {(['baja', 'media', 'alta'] as NotePriority[]).map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => setNewNote({ ...newNote, priority: p })}
                                            className={`flex-1 py-2 px-3 rounded-lg border capitalize text-sm ${newNote.priority === p
                                                ? PRIORITY_COLORS[p] + ' ring-2 ring-offset-1 ring-gray-400'
                                                : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                                                }`}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mensaje</label>
                                <textarea
                                    required
                                    value={newNote.content}
                                    onChange={(e) => setNewNote({ ...newNote, content: e.target.value })}
                                    className="w-full p-2 border rounded-lg h-24 focus:ring-2 focus:ring-indigo-500"
                                    placeholder="Ej: Se acabó el cloro, comprar urgente..."
                                />
                            </div>

                            <div className="flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                >
                                    Publicar Nota
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
