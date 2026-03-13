import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';
import { Trash2, PlusCircle, AlertCircle, CheckCircle2, MapPin } from 'lucide-react';

export interface Trampa {
    id: string;
    tipo: 'cebo' | 'pegajosa' | 'mecanica' | 'jaula';
    ubicacion: string;
    estado: 'activa' | 'retirada' | 'consumida';
    fecha_instalacion: string;
    fecha_ultima_revision: string;
}

interface GestorTrampasProps {
    trampas: Trampa[];
    onChange: (trampas: Trampa[]) => void;
    isEditing?: boolean;
}

const tiposDisponibles = [
    { id: 'cebo', label: 'Cebo Tubo/Caja', icon: '🧀' },
    { id: 'pegajosa', label: 'Trampa Pegajosa', icon: '🕸️' },
    { id: 'mecanica', label: 'Rat. Mecánica', icon: '⚡' },
    { id: 'jaula', label: 'Jaula Captura', icon: '📥' },
];

const estadosInfo = {
    activa: { label: 'Activa', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle2 },
    retirada: { label: 'Retirada', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Trash2 },
    consumida: { label: 'Consumida y Repuesta', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: AlertCircle },
};

export const GestorTrampas: React.FC<GestorTrampasProps> = ({ trampas = [], onChange, isEditing = true }) => {
    const [nuevaUbicacion, setNuevaUbicacion] = useState('');
    const [nuevoTipo, setNuevoTipo] = useState<Trampa['tipo']>('cebo');

    const handleAñadirTrampa = () => {
        if (!nuevaUbicacion.trim()) return;

        const nuevaTrampa: Trampa = {
            id: crypto.randomUUID(),
            tipo: nuevoTipo,
            ubicacion: nuevaUbicacion.trim(),
            estado: 'activa',
            fecha_instalacion: new Date().toISOString(),
            fecha_ultima_revision: new Date().toISOString(),
        };

        onChange([...(trampas || []), nuevaTrampa]);
        setNuevaUbicacion('');
    };

    const handleEliminarTrampa = (id: string) => {
        onChange((trampas || []).filter(t => t.id !== id));
    };

    const handleActualizarEstado = (id: string, nuevoEstado: Trampa['estado']) => {
        onChange((trampas || []).map(t =>
            t.id === id ? { ...t, estado: nuevoEstado, fecha_ultima_revision: new Date().toISOString() } : t
        ));
    };

    const resumen = {
        total: (trampas || []).length,
        activas: (trampas || []).filter(t => t.estado === 'activa').length,
        consumidas: (trampas || []).filter(t => t.estado === 'consumida').length,
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    🧀 Panel de Trampas
                    <Badge variant="secondary" className="ml-2">{resumen.total} Total</Badge>
                </h3>
                <div className="flex gap-2">
                    {resumen.activas > 0 && <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">{resumen.activas} Activas</Badge>}
                    {resumen.consumidas > 0 && <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">{resumen.consumidas} Consumidas</Badge>}
                </div>
            </div>

            {isEditing && (
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
                    <Label className="font-semibold text-sm">Añadir Nueva Trampa</Label>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <select
                            className="h-10 rounded-md border border-input bg-background px-3 py-1 text-sm sm:w-1/3"
                            value={nuevoTipo}
                            onChange={(e) => setNuevoTipo(e.target.value as Trampa['tipo'])}
                        >
                            {tiposDisponibles.map(t => (
                                <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                            ))}
                        </select>
                        <div className="flex-1 flex gap-2">
                            <Input
                                placeholder="Ej: Esquina Cocina, Techo Bodega..."
                                value={nuevaUbicacion}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNuevaUbicacion(e.target.value)}
                                className="h-10"
                                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && (e.preventDefault(), handleAñadirTrampa())}
                            />
                            <Button type="button" onClick={handleAñadirTrampa} className="h-10 px-4 min-w-[100px] flex gap-2">
                                <PlusCircle className="w-4 h-4" /> Agregar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                {(!trampas || trampas.length === 0) && (
                    <div className="col-span-1 sm:col-span-2 text-center p-6 text-muted-foreground border-2 border-dashed rounded-lg bg-slate-50">
                        No hay trampas registradas en este servicio.
                    </div>
                )}

                {(trampas || []).map(trampa => {
                    const StateIcon = estadosInfo[trampa.estado].icon;
                    return (
                        <Card key={trampa.id} className={`overflow-hidden border-l-4 ${trampa.estado === 'activa' ? 'border-l-green-500' :
                            trampa.estado === 'consumida' ? 'border-l-orange-500' : 'border-l-gray-400'
                            }`}>
                            <CardContent className="p-3">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-bold text-sm flex items-center gap-1.5 line-clamp-1">
                                        <MapPin className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                        {trampa.ubicacion}
                                    </div>
                                    {isEditing && (
                                        <button onClick={() => handleEliminarTrampa(trampa.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Eliminar trampa">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                                    <span className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded">
                                        {tiposDisponibles.find(t => t.id === trampa.tipo)?.icon}
                                        {tiposDisponibles.find(t => t.id === trampa.tipo)?.label}
                                    </span>
                                    <span>Instalada: {new Date(trampa.fecha_instalacion).toLocaleDateString()}</span>
                                </div>

                                {isEditing ? (
                                    <div className="flex gap-2">
                                        <select
                                            className={`flex-1 h-8 text-xs rounded border px-2 font-medium ${estadosInfo[trampa.estado].color}`}
                                            value={trampa.estado}
                                            onChange={(e) => handleActualizarEstado(trampa.id, e.target.value as Trampa['estado'])}
                                        >
                                            <option value="activa">Activa / OK</option>
                                            <option value="consumida">Consumida y Repuesta</option>
                                            <option value="retirada">Retirada</option>
                                        </select>
                                    </div>
                                ) : (
                                    <div className="flex gap-2 mt-1">
                                        <Badge className={`px-2 py-1 flex items-center gap-1.5 text-xs border ${estadosInfo[trampa.estado].color}`}>
                                            <StateIcon className="w-3.5 h-3.5" />
                                            {estadosInfo[trampa.estado].label}
                                        </Badge>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};
