import React, { useState, useEffect } from 'react';
import {
    BellRing,
    MapPin,
    Clock,
    Calendar,
    Phone,
    MessageCircle,
    Timer,
    ArrowRight,
    CheckCircle2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
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
                    .select('id, pedido_id, numero_item, total_items, is_pickup, fecha_entrega, fecha_recepcion, sector, ubicacion, cliente_id, cliente_nombre, estado, created_at')
                    .in('estado', ['scheduled_pickup', 'recepcionada', 'in_process', 'ready'])
                    .not('estado', 'eq', 'delivered')
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
            const pedidosMap: Record<string, any[]> = {};

            alfombras?.forEach((item: any) => {
                const key = (item.pedido_id && item.pedido_id !== item.id)
                    ? item.pedido_id
                    : `${item.cliente_id}_${item.fecha_recepcion || item.created_at?.substring(0, 10)}`;

                if (!pedidosMap[key]) pedidosMap[key] = [];
                pedidosMap[key].push(item);
            });

            // Procesar cada grupo de pedido
            Object.values(pedidosMap).forEach(grupo => {
                if (grupo.length === 0) return;

                const primerItem = grupo[0];
                const totalItems = grupo.length;
                
                // Determinar el estado para el Dashboard
                // Si alguna es scheduled_pickup, el grupo se trata como retiro (si no ha sido recepcionada ninguna)
                // Si no, si todas son ready, se trata como entrega
                // El usuario quiere ver un solo registro por pedido
                
                const hasScheduledPickup = grupo.some(a => a.estado === 'scheduled_pickup');
                const allReady = grupo.every(a => a.estado === 'ready');
                
                let titulo = '';
                let estado = '';
                let fechaRaw = primerItem.fecha_recepcion || primerItem.created_at || new Date().toISOString();
                
                if (hasScheduledPickup) {
                    titulo = totalItems > 1 ? `🚚 Retiro de Alfombras (${totalItems})` : '🚚 Retiro Programado';
                    estado = 'scheduled_pickup';
                    fechaRaw = primerItem.fecha_recepcion || primerItem.created_at;
                } else if (allReady) {
                    titulo = totalItems > 1 ? `✅ Entrega de Alfombras (${totalItems} Listas)` : '✅ Lista para Entrega';
                    estado = 'ready';
                } else {
                    // En proceso (pero el usuario quiere ver un registro)
                    titulo = `🧼 Lavado en Proceso (${totalItems} Alfs.)`;
                    estado = 'in_process';
                }

                if (!fechaRaw) return;
                const dateNorm = fechaRaw.includes('T') ? fechaRaw : `${fechaRaw}T12:00:00`;
                if (!matchesDateFilter(new Date(dateNorm))) return;

                allItems.push({
                    id: `A-Pedido-${keyForGroup(primerItem)}`,
                    titulo: titulo,
                    servicio: 'ALFOMBRAS',
                    estado: estado,
                    fechaRaw: dateNorm,
                    lugar: primerItem.ubicacion || (primerItem.sector ? `Domicilio – ${primerItem.sector}` : 'Domicilio Cliente'),
                    clienteId: primerItem.cliente_id || '',
                    cliente: primerItem.cliente_nombre || 'Sin nombre',
                    telefono: '',
                    color: 'text-purple-600',
                    bg: 'bg-purple-600',
                    sector: primerItem.sector
                });
            });

            function keyForGroup(item: any) {
                return (item.pedido_id && item.pedido_id !== item.id)
                    ? item.pedido_id
                    : `${item.cliente_id}_${item.fecha_recepcion || item.created_at?.substring(0, 10)}`;
            }

            // Ordenar cronológicamente
            allItems.sort((a, b) => new Date(a.fechaRaw).getTime() - new Date(b.fechaRaw).getTime());

            // Batch-query de teléfonos y direcciones desde la tabla clientes
            const clienteIds = [...new Set(allItems.map(i => i.clienteId).filter(Boolean))];
            if (clienteIds.length > 0) {
                const { data: clientesData } = await supabase
                    .from('clientes')
                    .select('id, phone, address')
                    .in('id', clienteIds);
                
                const phoneMap: Record<string, string> = {};
                const addressMap: Record<string, string> = {};
                
                clientesData?.forEach((c: any) => { 
                    phoneMap[c.id] = c.phone || ''; 
                    addressMap[c.id] = c.address || '';
                });
                
                allItems.forEach(item => { 
                    item.telefono = phoneMap[item.clienteId] || ''; 
                    const realAddress = addressMap[item.clienteId];

                    if (realAddress) {
                        // En Limpieza y Plagas, si el lugar es genérico o vacío, usar la del cliente
                        if (item.servicio !== 'ALFOMBRAS') {
                            if (!item.lugar || item.lugar === 'Sin dirección' || item.lugar.toLowerCase().includes('domicilio')) {
                                item.lugar = realAddress;
                            }
                        } else {
                            // En Alfombras
                        if (!item.lugar || item.lugar.includes('Domicilio') || item.lugar.includes('Contactar Cliente') || SECTORS.includes(item.lugar) || item.lugar === 'Recepción' || item.lugar === 'Planta') {
                             item.lugar = item.sector ? `${realAddress}, ${item.sector}` : realAddress;
                        }
                        }
                    }
                });
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

                <CardContent className="flex flex-col">
                    <div className="mt-4 flex-1">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                                <p className="text-sm text-muted-foreground animate-pulse font-medium">Sincronizando itinerario operativo...</p>
                            </div>
                        ) : filteredItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-20 bg-slate-50 border border-dashed rounded-xl border-slate-200">
                                <span className="text-4xl mb-4">🎉</span>
                                <p className="text-sm text-center font-bold text-slate-600">
                                    No hay servicios para el filtro seleccionado.
                                </p>
                                <p className="text-xs text-slate-500 mt-1">Todo está al día por ahora.</p>
                            </div>
                        ) : (
                            <div className="rounded-xl border shadow-sm overflow-hidden bg-white">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow>
                                            <TableHead className="font-bold text-slate-600">ID / Estado</TableHead>
                                            <TableHead className="font-bold text-slate-600">Dirección / Sector</TableHead>
                                            <TableHead className="font-bold text-slate-600">Fecha / Hora</TableHead>
                                            <TableHead className="font-bold text-slate-600">Cliente</TableHead>
                                            <TableHead className="text-right font-bold text-slate-600">Acciones</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredItems.map(item => {
                                            const isDone = ['recepcionada', 'in_process', 'ready'].includes(item.estado);
                                            const itemDate = new Date(item.fechaRaw);
                                            
                                            // Lógica para mostrar Fecha/Hora o "----"
                                            const showDateTime = item.servicio !== 'ALFOMBRAS' || item.estado === 'scheduled_pickup';

                                            return (
                                                <TableRow key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black text-white uppercase tracking-tighter ${item.bg}`}>
                                                                    {item.servicio}
                                                                </span>
                                                                <code className="text-[10px] text-slate-400 font-mono">#{item.id.split('-').pop()?.substring(0, 6)}</code>
                                                            </div>
                                                            <div className="flex items-center gap-1.5">
                                                                {isDone ? (
                                                                    <Badge variant="success" className="text-[10px] px-1.5 py-0 h-5">
                                                                        <CheckCircle2 className="w-3 h-3 mr-1" /> Listo
                                                                    </Badge>
                                                                ) : item.estado === 'scheduled_pickup' ? (
                                                                    <Badge variant="warning" className="text-[10px] px-1.5 py-0 h-5">
                                                                        <Timer className="w-3 h-3 mr-1" /> Por Retirar
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                                                                        <Clock className="w-3 h-3 mr-1" /> {item.estado === 'pending' ? 'Pendiente' : 'Programado'}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    {/* Columna Estado Tiempo Eliminada */}
                                                    <TableCell>
                                                        <div className="flex flex-col max-w-[200px]">
                                                            <a
                                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.lugar)}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="flex items-start gap-1 text-xs font-semibold text-slate-700 hover:text-blue-600 transition-colors group-hover:underline"
                                                                onClick={e => e.stopPropagation()}
                                                            >
                                                                <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-slate-400" />
                                                                <span className="truncate" title={item.lugar}>{item.lugar}</span>
                                                            </a>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <a 
                                                                    href={`https://waze.com/ul?q=${encodeURIComponent(item.lugar)}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-[9px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded border border-sky-200 font-black hover:bg-sky-200 transition-colors"
                                                                    onClick={e => e.stopPropagation()}
                                                                >
                                                                    WAZE
                                                                </a>
                                                                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{item.sector}</span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {showDateTime ? (
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-1 text-xs font-bold text-slate-800">
                                                                    <Calendar className="w-3 h-3 text-slate-400" />
                                                                    {itemDate.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                                                                </div>
                                                                <div className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                                                                    <Clock className="w-3 h-3" />
                                                                    {itemDate.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="text-slate-300 font-bold tracking-widest text-center pr-4">----</div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-col gap-1">
                                                            <span className="text-xs font-bold text-slate-800">{item.cliente}</span>
                                                            {item.telefono && (
                                                                <div className="flex items-center gap-1.5">
                                                                    <a
                                                                        href={`https://wa.me/${item.telefono.replace(/\D/g, '')}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="p-1 rounded-full bg-green-50 text-green-600 hover:bg-green-600 hover:text-white transition-all border border-green-200"
                                                                        onClick={e => e.stopPropagation()}
                                                                        title="WhatsApp"
                                                                    >
                                                                        <MessageCircle className="w-3 h-3" />
                                                                    </a>
                                                                    <a
                                                                        href={`tel:+${item.telefono.replace(/\D/g, '')}`}
                                                                        className="p-1 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all border border-blue-200"
                                                                        onClick={e => e.stopPropagation()}
                                                                        title="Llamar"
                                                                    >
                                                                        <Phone className="w-3 h-3" />
                                                                    </a>
                                                                    <span className="text-[10px] font-mono text-slate-400">{item.telefono}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            onClick={() => navigate(getRouteForService(item.servicio))}
                                                            className="h-8 w-8 p-0 rounded-full hover:bg-primary hover:text-white transition-all shadow-sm border border-slate-100"
                                                            title="Ver Detalles"
                                                        >
                                                            <ArrowRight className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};
