import React, { useState, useEffect } from 'react';
const CheckCircle = ({ className }: { className?: string }) => <span className={className}>✅</span>;
const MapPin = ({ className }: { className?: string }) => <span className={className}>📍</span>;
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabase';
import { isToday, isThisWeek } from 'date-fns';

export interface AgendaItem {
    id: string;
    titulo: string;
    servicio: 'PLAGAS' | 'LIMPIEZA' | 'ALFOMBRAS';
    estado: string;
    fechaRaw: string;
    lugar: string;
    clienteId: string;
    cliente: string;
    telefono: string;
    color: string;
    bg: string;
}

export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [periodFilter, setPeriodFilter] = useState<'HOY' | 'SEMANA'>('HOY');
    const [serviceFilter, setServiceFilter] = useState<'TODOS' | 'PLAGAS' | 'LIMPIEZA' | 'ALFOMBRAS'>('TODOS');
    const [customDate, setCustomDate] = useState('');
    const [itinerario, setItinerario] = useState<AgendaItem[]>([]);
    const [loading, setLoading] = useState(true);

    const getRouteForService = (servicio: AgendaItem['servicio']) => {
        switch (servicio) {
            case 'PLAGAS': return '/plagas';
            case 'LIMPIEZA': return '/limpieza';
            case 'ALFOMBRAS': return '/alfombras';
        }
    };

    const [stats, setStats] = useState({ serviciosMes: 0, alertasPendientes: 0 });

    useEffect(() => {
        fetchDashboardData();
    }, [periodFilter, customDate]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [{ data: plagas }, { data: limpiezas }, { data: alfombras }] = await Promise.all([
                supabase.from('servicios_plagas')
                    .select('id, tipo_servicio, direccion, fecha_ejecucion, cliente_id, cliente_nombre, estado')
                    .in('estado', ['programado', 'vigente', 'pending']),
                supabase.from('servicios_limpieza')
                    .select('id, tipo_servicio, direccion, fecha, hora, cliente_id, cliente_nombre, estado')
                    .in('estado', ['scheduled', 'pending']),
                supabase.from('servicios_alfombras')
                    .select('id, is_pickup, fecha_entrega, fecha_recepcion, sector, ubicacion, cliente_id, cliente_nombre, estado, created_at')
                    .in('estado', ['scheduled_pickup', 'recepcionada', 'in_process', 'ready'])
            ]);

            const allItems: AgendaItem[] = [];

            // Helper: aplica el filtro de fecha según periodFilter o customDate
            const matchesDateFilter = (d: Date): boolean => {
                if (customDate) {
                    const cd = new Date(`${customDate}T12:00:00`);
                    return d.toDateString() === cd.toDateString();
                }
                if (periodFilter === 'HOY') return isToday(d);
                if (periodFilter === 'SEMANA') return isThisWeek(d);
                return true;
            };

            // --- PLAGAS ---
            plagas?.forEach(item => {
                if (!item.fecha_ejecucion) return;
                const fechaNorm = item.fecha_ejecucion.includes('T')
                    ? item.fecha_ejecucion
                    : `${item.fecha_ejecucion}T12:00:00`;
                if (!matchesDateFilter(new Date(fechaNorm))) return;

                allItems.push({
                    id: `P-${item.id}`,
                    titulo: item.tipo_servicio || 'Servicio de Plagas',
                    servicio: 'PLAGAS',
                    estado: 'pending',
                    fechaRaw: fechaNorm,
                    lugar: item.direccion || 'Sin dirección',
                    clienteId: item.cliente_id || '',
                    cliente: item.cliente_nombre || 'Sin nombre',
                    telefono: '',
                    color: 'text-orange-600',
                    bg: 'bg-orange-600'
                });
            });

            // --- LIMPIEZA ---
            limpiezas?.forEach(item => {
                if (!item.fecha) return;
                const horaClean = (item.hora || '12:00').substring(0, 5);
                const fechaLocal = `${item.fecha}T${horaClean}:00`;
                if (!matchesDateFilter(new Date(fechaLocal))) return;

                allItems.push({
                    id: `L-${item.id}`,
                    titulo: item.tipo_servicio || 'Aseo General',
                    servicio: 'LIMPIEZA',
                    estado: 'pending',
                    fechaRaw: fechaLocal,
                    lugar: item.direccion || 'Sin dirección',
                    clienteId: item.cliente_id || '',
                    cliente: item.cliente_nombre || 'Sin nombre',
                    telefono: '',
                    color: 'text-blue-600',
                    bg: 'bg-blue-600'
                });
            });

            // --- ALFOMBRAS ---
            // scheduled_pickup → aplica filtro de fecha (tarea futura pendiente)
            // recepcionada / in_process / ready → SIEMPRE se muestran (trabajo activo en taller)
            const tituloMap: Record<string, string> = {
                'scheduled_pickup': '🚚 Retiro Programado',
                'recepcionada': '📥 En Recepción',
                'in_process': '🧹 En Proceso / Lavado',
                'ready': '✅ Lista para Entrega',
            };

            alfombras?.forEach(item => {
                const estado = item.estado || '';
                const titulo = tituloMap[estado] || 'Alfombra';

                if (estado === 'scheduled_pickup') {
                    const dateStr = item.fecha_recepcion;
                    if (!dateStr) return;
                    const dateNorm = dateStr.includes('T') ? dateStr : `${dateStr}T12:00:00`;
                    if (!matchesDateFilter(new Date(dateNorm))) return;

                    allItems.push({
                        id: `A-${item.id}`,
                        titulo,
                        servicio: 'ALFOMBRAS',
                        estado: 'scheduled_pickup',
                        fechaRaw: dateNorm,
                        lugar: item.ubicacion && item.ubicacion !== 'Domicilio Cliente'
                            ? item.ubicacion
                            : (item.sector ? `Domicilio – ${item.sector}` : 'Domicilio Cliente'),
                        clienteId: item.cliente_id || '',
                        cliente: item.cliente_nombre || 'Sin nombre',
                        telefono: '',
                        color: 'text-purple-600',
                        bg: 'bg-purple-600'
                    });
                } else {
                    // Items activos en taller: siempre aparecen, no aplica filtro de fecha
                    allItems.push({
                        id: `A-${item.id}`,
                        titulo,
                        servicio: 'ALFOMBRAS',
                        estado: estado,
                        fechaRaw: item.created_at || new Date().toISOString(),
                        lugar: '🏢 Taller Local',
                        clienteId: item.cliente_id || '',
                        cliente: item.cliente_nombre || 'Sin nombre',
                        telefono: '',
                        color: 'text-purple-600',
                        bg: 'bg-purple-600'
                    });
                }
            });

            // Ordenar cronológicamente
            allItems.sort((a, b) => new Date(a.fechaRaw).getTime() - new Date(b.fechaRaw).getTime());

            // Batch-query de teléfonos desde la tabla clientes
            const clienteIds = [...new Set(allItems.map(i => i.clienteId).filter(Boolean))];
            if (clienteIds.length > 0) {
                const { data: clientesData } = await supabase
                    .from('clientes')
                    .select('id, phone')
                    .in('id', clienteIds);
                const phoneMap: Record<string, string> = {};
                clientesData?.forEach((c: any) => { phoneMap[c.id] = c.phone || ''; });
                allItems.forEach(item => { item.telefono = phoneMap[item.clienteId] || ''; });
            }

            setItinerario(allItems);
            setStats({
                serviciosMes: (plagas?.length || 0) + (limpiezas?.length || 0) + (alfombras?.length || 0),
                alertasPendientes: plagas?.length || 0
            });

        } catch (error) {
            console.error('Error Itinerario:', error);
        } finally {
            setLoading(false);
        }
    };

    const getFilteredItinerario = () => {
        if (serviceFilter === 'TODOS') return itinerario;
        return itinerario.filter(i => i.servicio === serviceFilter);
    };

    const filteredItems = getFilteredItinerario();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-black text-foreground tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground mt-1">Panel operativo del equipo</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Trabajos activos</p>
                                <p className="text-2xl font-bold text-foreground mt-1">{stats.serviciosMes}</p>
                            </div>
                            <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                                <CheckCircle className="h-6 w-6 text-primary" />
                            </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-3">Pendientes, programados y en proceso</p>
                    </CardContent>
                </Card>
            </div>

            {/* Itinerario Operativo */}
            <Card className="shadow-sm border-none bg-white">
                <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
                    <div>
                        <CardTitle className="text-xl">📅 Itinerario Operativo</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">
                            Haz clic en cualquier tarjeta para ir al módulo correspondiente
                        </p>
                    </div>

                    {/* Filtros */}
                    <div className="flex flex-wrap gap-2 items-center">
                        {/* Periodo */}
                        <Button
                            variant={periodFilter === 'HOY' && !customDate ? 'default' : 'outline'}
                            onClick={() => { setPeriodFilter('HOY'); setCustomDate(''); }}
                            size="sm" className="rounded-full">Hoy</Button>
                        <Button
                            variant={periodFilter === 'SEMANA' && !customDate ? 'default' : 'outline'}
                            onClick={() => { setPeriodFilter('SEMANA'); setCustomDate(''); }}
                            size="sm" className="rounded-full">Semana</Button>

                        {/* Filtro por fecha específica */}
                        <input
                            type="date"
                            value={customDate}
                            onChange={e => { setCustomDate(e.target.value); }}
                            className={`h-8 rounded-full border px-3 text-sm ${customDate ? 'border-primary bg-primary/5 font-semibold' : 'border-input bg-background'}`}
                            title="Filtrar por fecha específica"
                        />
                        {customDate && (
                            <Button variant="ghost" size="sm" className="rounded-full text-xs text-muted-foreground"
                                onClick={() => setCustomDate('')}>✕ Limpiar</Button>
                        )}

                        <div className="w-px h-6 bg-slate-200 mx-1 self-center hidden sm:block" />

                        {/* Filtro por servicio */}
                        <Button variant="outline" size="sm"
                            onClick={() => setServiceFilter(serviceFilter === 'PLAGAS' ? 'TODOS' : 'PLAGAS')}
                            className={`rounded-full ${serviceFilter === 'PLAGAS' ? 'bg-orange-500 text-white font-bold' : 'bg-orange-50 text-orange-700 hover:bg-orange-100'}`}>Plagas</Button>
                        <Button variant="outline" size="sm"
                            onClick={() => setServiceFilter(serviceFilter === 'LIMPIEZA' ? 'TODOS' : 'LIMPIEZA')}
                            className={`rounded-full ${serviceFilter === 'LIMPIEZA' ? 'bg-blue-500 text-white font-bold' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}>Limpieza</Button>
                        <Button variant="outline" size="sm"
                            onClick={() => setServiceFilter(serviceFilter === 'ALFOMBRAS' ? 'TODOS' : 'ALFOMBRAS')}
                            className={`rounded-full ${serviceFilter === 'ALFOMBRAS' ? 'bg-purple-500 text-white font-bold' : 'bg-purple-50 text-purple-700 hover:bg-purple-100'}`}>Alfombras</Button>
                    </div>
                </CardHeader>

                <CardContent className="h-[450px] flex flex-col">
                    <div className="space-y-3 mt-4 flex-1 overflow-y-auto pr-2">
                        {loading ? (
                            <p className="text-sm text-center text-muted-foreground p-8 animate-pulse">Cargando servicios...</p>
                        ) : filteredItems.length === 0 ? (
                            <p className="text-sm text-center font-semibold text-muted-foreground p-8 bg-slate-50 border border-dashed rounded-xl border-slate-200">
                                No hay servicios para el filtro seleccionado. ¡Buen trabajo! 🎉
                            </p>
                        ) : (
                            filteredItems.map(item => {
                                const isDone = ['recepcionada', 'in_process', 'ready'].includes(item.estado);
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => navigate(getRouteForService(item.servicio))}
                                        className={`flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border transition-all gap-3 shadow-sm cursor-pointer ${isDone
                                            ? 'bg-green-50 border-green-200 hover:border-green-400 hover:shadow-md'
                                            : 'bg-slate-50 border-slate-100 hover:bg-white hover:border-slate-300 hover:shadow-md'
                                            }`}
                                        title={`Ir a ${item.servicio}`}
                                    >
                                        {/* Izquierda */}
                                        <div className="flex gap-3 items-start flex-1 min-w-0">
                                            <div className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-lg ${isDone ? 'bg-green-100' : `${item.bg} bg-opacity-10`
                                                }`}>
                                                {isDone ? '✅' : (item.servicio === 'PLAGAS' ? '🐛' : item.servicio === 'LIMPIEZA' ? '🧹' : '🪣')}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h4 className={`font-bold text-sm ${isDone ? 'text-green-800' : 'text-slate-800'}`}>{item.titulo}</h4>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider ${item.bg}`}>
                                                        {item.servicio}
                                                    </span>
                                                    {isDone && (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-600 text-white uppercase">
                                                            En Taller
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                                                    <span className="text-sm font-semibold text-slate-700">👤 {item.cliente}</span>
                                                    {item.telefono ? (
                                                        <a
                                                            href={`https://wa.me/${item.telefono.replace(/\+/g, '').replace(/\s/g, '')}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-green-700 text-sm font-bold hover:underline"
                                                            onClick={e => e.stopPropagation()}
                                                            title="Enviar WhatsApp"
                                                        >📞 {item.telefono}</a>
                                                    ) : null}
                                                </div>
                                                <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-500">
                                                    <a
                                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.lugar)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 hover:text-blue-600 hover:underline"
                                                        onClick={e => e.stopPropagation()}
                                                        title="Abrir en Maps"
                                                    >
                                                        <MapPin className="w-3 h-3" />
                                                        <span className="truncate">{item.lugar}</span>
                                                    </a>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Derecha: fecha/hora */}
                                        <div className="text-left md:text-right shrink-0 border-t border-slate-200 md:border-none pt-2 md:pt-0">
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ejecución</p>
                                            <p className="font-bold text-slate-800 text-sm">
                                                {new Date(item.fechaRaw).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}
                                            </p>
                                            <p className="text-slate-500 text-sm">
                                                {new Date(item.fechaRaw).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
