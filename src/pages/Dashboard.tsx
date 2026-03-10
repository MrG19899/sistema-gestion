import React, { useState, useEffect } from 'react';
import { BellRing } from 'lucide-react';
const MapPin = ({ className }: { className?: string }) => <span className={className}>📍</span>;
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabase';
import { SECTORS } from '../lib/constants';
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
    sector?: string; // Para aplicar filtros de sector logísticos
}

export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [periodFilter, setPeriodFilter] = useState<'HOY' | 'SEMANA'>('HOY');
    const [serviceFilter, setServiceFilter] = useState<'TODOS' | 'PLAGAS' | 'LIMPIEZA' | 'ALFOMBRAS'>('TODOS');
    const [customDate, setCustomDate] = useState('');
    const [sectorFilter, setSectorFilter] = useState('all');
    const [itinerario, setItinerario] = useState<AgendaItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [pendingNotesCount, setPendingNotesCount] = useState(0);

    const getRouteForService = (servicio: AgendaItem['servicio']) => {
        switch (servicio) {
            case 'PLAGAS': return '/plagas';
            case 'LIMPIEZA': return '/limpieza';
            case 'ALFOMBRAS': return '/alfombras';
        }
    };

    useEffect(() => {
        fetchDashboardData();

        const fetchPendingCount = async () => {
            const { count, error } = await supabase
                .from('notas_muro')
                .select('*', { count: 'exact', head: true })
                .eq('fijada', true);

            if (!error && count !== null) {
                setPendingNotesCount(count);
            }
        };

        fetchPendingCount();

        const channel = supabase
            .channel('dashboard_notas')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notas_muro' }, () => {
                fetchPendingCount();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [periodFilter, customDate, sectorFilter]);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const [{ data: plagas }, { data: limpiezas }, { data: alfombras }] = await Promise.all([
                supabase.from('servicios_plagas')
                    .select('id, tipo_servicio, direccion, sector, fecha_ejecucion, cliente_id, cliente_nombre, estado')
                    .in('estado', ['programado', 'vigente', 'pending']),
                supabase.from('servicios_limpieza')
                    .select('id, tipo_servicio, direccion, sector, fecha, hora, cliente_id, cliente_nombre, estado')
                    .in('estado', ['scheduled', 'pending']),
                supabase.from('servicios_alfombras')
                    .select('id, is_pickup, fecha_entrega, fecha_recepcion, sector, ubicacion, cliente_id, cliente_nombre, estado, created_at')
                    .in('estado', ['scheduled_pickup', 'ready'])
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
                    bg: 'bg-orange-600',
                    sector: item.sector
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
                    bg: 'bg-blue-600',
                    sector: item.sector
                });
            });

            // --- ALFOMBRAS ---
            // scheduled_pickup → aplica filtro de fecha (tarea futura pendiente)
            // ready → SIEMPRE se muestran (trabajo activo en taller listo para entrega)
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
                        bg: 'bg-purple-600',
                        sector: item.sector
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
                        bg: 'bg-purple-600',
                        sector: item.sector
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

        } catch (error) {
            console.error('Error Itinerario:', error);
        } finally {
            setLoading(false);
        }
    };

    const getFilteredItinerario = () => {
        let filtered = itinerario;
        if (serviceFilter !== 'TODOS') {
            filtered = filtered.filter(i => i.servicio === serviceFilter);
        }
        if (sectorFilter !== 'all') {
            filtered = filtered.filter(i => i.sector === sectorFilter);
        }
        return filtered;
    };

    const filteredItems = getFilteredItinerario();

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-black text-foreground tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground mt-1">Panel operativo del equipo</p>
            </div>

            {pendingNotesCount > 0 && (
                <div onClick={() => navigate('/reportes')} className="bg-red-50 hover:bg-red-100 transition-colors border-2 border-red-200 rounded-xl p-4 flex items-start gap-4 cursor-pointer shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-red-600"></div>
                    <div className="bg-red-100 p-2 rounded-full text-red-600 group-hover:scale-110 transition-transform">
                        <BellRing className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-red-800">¡Nuevos avisos en Boletín de Suministros!</h3>
                        <p className="text-red-700/80 text-sm mt-0.5 font-medium border-b border-transparent group-hover:border-red-700/30 inline-block transition-colors">
                            Tienes {pendingNotesCount} tarea{pendingNotesCount !== 1 ? 's' : ''} pendiente{pendingNotesCount !== 1 ? 's' : ''}. Toca aquí para ver.
                        </p>
                    </div>
                </div>
            )}

            {/* Stats (Oculto a petición del usuario por ahora)
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
            */}

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

                        <select
                            className="h-8 text-xs w-auto min-w-[140px] border-slate-200 shadow-sm border rounded-full px-3 text-slate-700 font-medium"
                            value={sectorFilter}
                            onChange={(e) => setSectorFilter(e.target.value)}
                        >
                            <option value="all">🗺️ Todos los Sectores</option>
                            {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>

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
                                        className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border transition-all gap-2 shadow-sm cursor-pointer ${isDone
                                            ? 'bg-green-50 border-green-200 hover:border-green-400'
                                            : 'bg-slate-50 border-slate-100 hover:bg-white hover:border-slate-300'
                                            }`}
                                        title={`Ir a ${item.servicio}`}
                                    >
                                        {/* Izquierda */}
                                        <div className="flex gap-2.5 items-start flex-1 min-w-0">
                                            <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-sm ${isDone ? 'bg-green-100' : `${item.bg} bg-opacity-10`
                                                }`}>
                                                {isDone ? '✅' : (item.servicio === 'PLAGAS' ? '🐛' : item.servicio === 'LIMPIEZA' ? '🧹' : '🪣')}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <h4 className={`font-bold text-xs ${isDone ? 'text-green-800' : 'text-slate-800'}`}>{item.titulo}</h4>
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold text-white uppercase tracking-wider ${item.bg}`}>
                                                        {item.servicio}
                                                    </span>
                                                    {isDone && (
                                                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-green-600 text-white uppercase">
                                                            En Taller
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                                                    <span className="text-xs font-semibold text-slate-700">👤 {item.cliente}</span>
                                                    {item.telefono ? (
                                                        <div className="flex items-center gap-1.5 overflow-hidden">
                                                            <span className="text-xs font-medium text-slate-600 mr-1">{item.telefono}</span>
                                                            <a
                                                                href={(() => {
                                                                    let p = item.telefono.replace(/\D/g, '');
                                                                    if (p.length === 8) p = '569' + p;
                                                                    else if (p.length === 9) p = '56' + p;
                                                                    return `https://wa.me/${p}`;
                                                                })()}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-center gap-1 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 px-2 py-0.5 rounded border border-green-200 text-[10px] font-bold transition-colors"
                                                                onClick={e => e.stopPropagation()}
                                                                title="Abrir WhatsApp"
                                                            >
                                                                💬 WhatsApp
                                                            </a>
                                                            <a
                                                                href={(() => {
                                                                    let p = item.telefono.replace(/\D/g, '');
                                                                    if (p.length === 8) p = '569' + p;
                                                                    else if (p.length === 9) p = '56' + p;
                                                                    return `tel:+${p}`;
                                                                })()}
                                                                className="flex items-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 px-2 py-0.5 rounded border border-blue-200 text-[10px] font-bold transition-colors"
                                                                onClick={e => e.stopPropagation()}
                                                                title="Llamar al cliente"
                                                            >
                                                                📞 Llamar
                                                            </a>
                                                        </div>
                                                    ) : null}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
                                                    <span className="flex-1 truncate text-slate-600 font-medium" title={item.lugar}>📌 {item.lugar}</span>
                                                    <a
                                                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.lugar)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 bg-slate-100 hover:bg-blue-50 hover:text-blue-600 px-2 py-1 rounded border border-slate-200"
                                                        onClick={e => e.stopPropagation()}
                                                        title="Abrir en Google Maps"
                                                    >
                                                        <MapPin className="w-2.5 h-2.5" /> Maps
                                                    </a>
                                                    <a
                                                        href={`https://waze.com/ul?q=${encodeURIComponent(item.lugar)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 bg-slate-100 hover:bg-sky-50 hover:text-sky-600 px-2 py-1 rounded border border-slate-200"
                                                        onClick={e => e.stopPropagation()}
                                                        title="Abrir en Waze"
                                                    >
                                                        🚙 Waze
                                                    </a>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Derecha: fecha/hora */}
                                        <div className="text-left sm:text-right shrink-0 border-t border-slate-200 mt-1 sm:mt-0 sm:border-none pt-2 sm:pt-0 flex items-center justify-between sm:block">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest sm:mb-1">Ejecución</p>
                                            <div className="flex items-center sm:flex-col sm:items-end gap-1 sm:gap-0">
                                                <p className="font-bold text-slate-800 text-xs">
                                                    {new Date(item.fechaRaw).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' })}
                                                </p>
                                                <p className="text-slate-500 text-[11px] font-medium">
                                                    {new Date(item.fechaRaw).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
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
