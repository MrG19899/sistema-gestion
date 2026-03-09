import React, { useState } from 'react';
const ShieldCheck = ({ className }: { className?: string }) => <span className={className}>🛡️</span>;
const AlertTriangle = ({ className }: { className?: string }) => <span className={className}>⚠️</span>;
const Clock = ({ className }: { className?: string }) => <span className={className}>🕐</span>;
const FileText = ({ className }: { className?: string }) => <span className={className}>📄</span>;
const Trash2 = ({ className }: { className?: string }) => <span className={className}>🗑️</span>;
const Phone = ({ className }: { className?: string }) => <span className={className}>📞</span>;
const MapPin = ({ className }: { className?: string }) => <span className={className}>📍</span>;

import { ClientAutocomplete } from '../components/ClientAutocomplete';
import { CertificateGenerator } from '../components/CertificateGenerator';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

import { SECTORS } from '../lib/constants';
import { Pagination } from '../components/ui/pagination';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { FullScreenDialog } from '../components/ui/FullScreenDialog';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '../components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../components/ui/table';

export interface ServicioControlPlagasReal {
    id: string;
    cliente_id: string;
    cliente_nombre: string;
    cliente_telefono?: string;
    sector: string;
    tipo_servicio: string;
    tipos_servicio?: string[];
    numero_certificado: string;
    tecnico_asignado: string;
    fecha_ejecucion: string;
    hora_ejecucion?: string;
    proxima_renovacion: string;
    periodicidad_meses?: number;
    estado: string;
    direccion?: string;
    observaciones?: string;
}

// Helpers de estado visual
const getStatusBadge = (status: string) => {
    switch (status) {
        case 'programado': return <Badge className="bg-blue-100 text-blue-800 border border-blue-200">🗓️ Programado</Badge>;
        case 'vigente': return <Badge className="bg-green-100 text-green-800 border border-green-200">✅ Vigente</Badge>;
        case 'completado': return <Badge className="bg-green-100 text-green-800 border border-green-200">✅ Completado</Badge>;
        case 'vencido': return <Badge className="bg-red-100 text-red-800 border border-red-200">🚨 Vencido</Badge>;
        case 'pending': return <Badge variant="outline">⏳ Pendiente</Badge>;
        default: return <Badge variant="outline">{status}</Badge>;
    }
};

const serviceTypes = [
    { id: 'desratizacion', label: '🐀 Desratización' },
    { id: 'desinsectacion', label: '🐜 Desinsectación' },
    { id: 'sanitizacion', label: '🧴 Sanitización' },
    { id: 'fumigacion', label: '💨 Fumigación' },
    { id: 'integral', label: '🛡️ Control Integral' },
];

const getTrafficLight = (proxima: string) => {
    if (!proxima) return '';
    const diff = new Date(proxima).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 3600 * 24));
    if (days < 0) return 'bg-red-100 border-red-400 text-red-700';
    if (days <= 30) return 'bg-yellow-100 border-yellow-400 text-yellow-700';
    return 'bg-green-100 border-green-400 text-green-700';
};

export const PlagasPage = () => {
    const { profile } = useAuth();
    const isWorker = profile?.rol === 'worker';
    const [services, setServices] = useState<ServicioControlPlagasReal[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    // Supabase Fetch + batch phone
    React.useEffect(() => { fetchServices(); }, []);

    const fetchServices = async () => {
        const { data, error } = await supabase
            .from('servicios_plagas')
            .select('*')
            .order('fecha_ejecucion', { ascending: false });

        if (!error && data) {
            const mapped = data as ServicioControlPlagasReal[];
            const ids = [...new Set(mapped.map(s => s.cliente_id).filter(Boolean))];
            if (ids.length > 0) {
                const { data: clientesData } = await supabase
                    .from('clientes').select('id, phone').in('id', ids);
                const phoneMap: Record<string, string> = {};
                clientesData?.forEach((c: any) => { phoneMap[c.id] = c.phone || ''; });
                mapped.forEach(s => { s.cliente_telefono = phoneMap[s.cliente_id] || ''; });
            }
            setServices(mapped);
        }
    };

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sectorFilter, setSectorFilter] = useState('all');

    const filteredServices = services.filter(s => {
        const matchSearch = (s.cliente_nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.numero_certificado || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'all' || s.estado === statusFilter;
        const matchSector = sectorFilter === 'all' || s.sector === sectorFilter;
        return matchSearch && matchStatus && matchSector;
    });

    const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
    const paginatedServices = filteredServices.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    // ─── FORMULARIO UNIFICADO ───────────────────────────────────────────────
    const [isFormOpen, setIsFormOpen] = useState(false);
    const emptyForm = {
        clienteId: '', clienteNombre: '', clienteTelefono: '', clienteDireccion: '',
        sector: '', tiposServicio: [] as string[], tecnico: '',
        fecha: new Date().toISOString().split('T')[0],
        hora: '09:00',
        estado: 'programado' as 'programado' | 'completado',
        // Periodicidad
        tienePeriodicidad: false, periodicidadMeses: '3',
        // Certificado (solo si completado)
        generarCertificado: false, numeroCertificado: '',
        observaciones: '',
    };
    const [form, setForm] = useState(emptyForm);

    const toggleTipo = (tipo: string) => {
        setForm(prev => ({
            ...prev,
            tiposServicio: prev.tiposServicio.includes(tipo)
                ? prev.tiposServicio.filter(t => t !== tipo)
                : [...prev.tiposServicio, tipo]
        }));
    };

    const calcProximaRenovacion = () => {
        if (!form.tienePeriodicidad) return null;
        const base = new Date(`${form.fecha}T12:00:00`);
        const months = parseInt(form.periodicidadMeses) || 3;
        base.setMonth(base.getMonth() + months);
        return base.toISOString().split('T')[0];
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.clienteId) { alert('Debe seleccionar un cliente.'); return; }
        if (form.tiposServicio.length === 0) { alert('Seleccione al menos un tipo de servicio.'); return; }

        const proxima = calcProximaRenovacion();
        const insertData: any = {
            cliente_id: form.clienteId,
            cliente_nombre: form.clienteNombre,
            sector: form.sector,
            tipos_servicio: form.tiposServicio,
            tecnico_asignado: form.tecnico,
            fecha_ejecucion: form.fecha,
            direccion: form.clienteDireccion,
            estado: form.estado,
            observaciones: form.observaciones,
        };
        if (proxima) {
            insertData.proxima_renovacion = proxima;
            insertData.periodicidad_meses = parseInt(form.periodicidadMeses);
        }
        if (form.estado === 'completado' && form.generarCertificado && form.numeroCertificado) {
            insertData.numero_certificado = form.numeroCertificado;
        }

        const { data, error } = await supabase
            .from('servicios_plagas')
            .insert([insertData])
            .select('*');

        if (error) { alert('Error al guardar: ' + error.message); return; }

        if (data) {
            const nuevo: ServicioControlPlagasReal = {
                ...data[0],
                cliente_nombre: form.clienteNombre,
                cliente_telefono: form.clienteTelefono,
            };
            setServices([nuevo, ...services]);
            setIsFormOpen(false);
            setForm(emptyForm);
        }
    };

    // ─── MODAL DETALLES / EDICIÓN ────────────────────────────────────────────
    const [selectedService, setSelectedService] = useState<ServicioControlPlagasReal | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isCertificateOpen, setIsCertificateOpen] = useState(false);
    const [certificateService, setCertificateService] = useState<ServicioControlPlagasReal | null>(null);

    const handleUpdateService = async () => {
        if (!selectedService) return;
        const { error } = await supabase
            .from('servicios_plagas')
            .update({
                estado: selectedService.estado,
                numero_certificado: selectedService.numero_certificado,
                tecnico_asignado: selectedService.tecnico_asignado,
                fecha_ejecucion: selectedService.fecha_ejecucion,
                proxima_renovacion: selectedService.proxima_renovacion,
                tipo_servicio: selectedService.tipo_servicio,
                observaciones: selectedService.observaciones,
            })
            .eq('id', selectedService.id);

        if (!error) {
            setServices(services.map(s => s.id === selectedService.id ? selectedService : s));
            setIsEditing(false);
            setSelectedService(null);
        }
    };

    const handleDeleteService = async (id: string) => {
        if (!window.confirm('¿Eliminar este registro?')) return;
        const { error } = await supabase.from('servicios_plagas').delete().eq('id', id);
        if (!error) setServices(services.filter(s => s.id !== id));
    };

    // KPIs
    const today = new Date();
    const vigentes = services.filter(s => s.estado === 'completado' && new Date(s.proxima_renovacion || '') > new Date(today.getTime() + 30 * 24 * 3600000)).length;
    const porVencer = services.filter(s => s.estado === 'completado' && new Date(s.proxima_renovacion || '') <= new Date(today.getTime() + 30 * 24 * 3600000) && new Date(s.proxima_renovacion || '') >= today).length;
    const vencidos = services.filter(s => s.estado === 'completado' && new Date(s.proxima_renovacion || '') < today).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Control de Plagas</h2>
                    <p className="text-muted-foreground">Gestión y seguimiento de servicios de control de plagas.</p>
                </div>
                <Button
                    onClick={() => setIsFormOpen(true)}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6"
                >
                    🐛 Registrar Servicio
                </Button>
            </div>

            {/* KPIs */}
            <div className="grid gap-4 md:grid-cols-3">
                <Card className="border-l-4 border-l-green-500">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium">Certificados Vigentes</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700">{vigentes}</div>
                        <p className="text-xs text-muted-foreground">Clientes al día</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-yellow-500">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium">Por Vencer (30 días)</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-700">{porVencer}</div>
                        <p className="text-xs text-muted-foreground">Requieren visita próxima</p>
                    </CardContent>
                </Card>
                <Card className="border-l-4 border-l-red-500">
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                        <CardTitle className="text-sm font-medium">Vencidos / Urgentes</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-red-700">{vencidos}</div>
                        <p className="text-xs text-muted-foreground">Acción inmediata</p>
                    </CardContent>
                </Card>
            </div>

            {/* Tabla de servicios */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle>Estado de Servicios</CardTitle>
                            <CardDescription>Seguimiento de controles y vencimientos.</CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
                            <Input
                                placeholder="Buscar cliente, ID o certificado..."
                                className="w-full sm:w-64"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            <select
                                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                            >
                                <option value="all">Todos los Estados</option>
                                <option value="programado">Programado</option>
                                <option value="completado">Completado</option>
                                <option value="vencido">Vencido</option>
                            </select>
                            <select
                                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={sectorFilter}
                                onChange={e => setSectorFilter(e.target.value)}
                            >
                                <option value="all">Todos los Sectores</option>
                                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Estado</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Dirección / Sector</TableHead>
                                <TableHead>Tipo de Servicio</TableHead>
                                <TableHead>Fecha / Hora</TableHead>
                                <TableHead>Próx. Renovación</TableHead>
                                <TableHead>Certificado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedServices.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                        No hay servicios registrados. ¡Registra el primero!
                                    </TableCell>
                                </TableRow>
                            ) : paginatedServices.map(service => (
                                <TableRow key={service.id}>
                                    <TableCell>{getStatusBadge(service.estado)}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{service.cliente_nombre}</span>
                                            {service.cliente_telefono && (
                                                <a href={`https://wa.me/${service.cliente_telefono.replace(/\+/g, '').replace(/\s/g, '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    title="Enviar WhatsApp"
                                                    className="text-green-700 text-xs font-bold hover:underline mt-0.5 flex items-center">
                                                    <span className="mr-1">📞</span> {service.cliente_telefono}
                                                </a>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-sm">
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${service.direccion || ''} ${service.sector || ''}`)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1 hover:text-blue-600 hover:underline"
                                                title="Abrir en Maps"
                                            >
                                                <MapPin className="w-3 h-3" />{service.direccion || '-'}
                                            </a>
                                            <span className="text-muted-foreground text-xs">{service.sector}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm">
                                            {Array.isArray(service.tipos_servicio)
                                                ? service.tipos_servicio.join(', ')
                                                : service.tipo_servicio || '-'}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-sm">
                                            <span>{service.fecha_ejecucion ? new Date(service.fecha_ejecucion.includes('T') ? service.fecha_ejecucion : `${service.fecha_ejecucion}T12:00:00`).toLocaleDateString('es-CL') : '-'}</span>
                                            {service.hora_ejecucion && (
                                                <span className="text-muted-foreground flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />{service.hora_ejecucion}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {service.proxima_renovacion ? (
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getTrafficLight(service.proxima_renovacion)}`}>
                                                {new Date(service.proxima_renovacion).toLocaleDateString('es-CL')}
                                            </span>
                                        ) : <span className="text-muted-foreground text-xs">Sin periodicidad</span>}
                                    </TableCell>
                                    <TableCell>
                                        {service.numero_certificado
                                            ? <code className="bg-muted px-2 py-0.5 rounded text-xs">{service.numero_certificado}</code>
                                            : <span className="text-muted-foreground text-xs">–</span>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1 flex-wrap">
                                            <Button variant="outline" size="sm"
                                                onClick={() => setSelectedService(service)}>Ver</Button>
                                            {service.estado === 'completado' && (
                                                <Button variant="secondary" size="sm"
                                                    onClick={() => { setCertificateService(service); setIsCertificateOpen(true); }}>
                                                    <FileText className="h-3 w-3 mr-1" />Cert.
                                                </Button>
                                            )}
                                            {!isWorker && (
                                                <Button variant="ghost" size="sm"
                                                    className="text-red-600 hover:bg-red-50"
                                                    onClick={() => handleDeleteService(service.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
                <CardContent className="pt-0">
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════
                MODAL UNIFICADO — REGISTRAR SERVICIO
            ═══════════════════════════════════════════════════ */}
            <FullScreenDialog
                open={isFormOpen}
                onOpenChange={(open: boolean) => { if (!open) { setIsFormOpen(false); setForm(emptyForm); } }}
                title="🐛 Registrar Servicio de Control de Plagas"
                description="Completa los datos del servicio. Puedes programarlo para el futuro o registrarlo como ya completado."
            >
                <form onSubmit={handleSubmit} className="space-y-6 py-2 pb-12">

                    {/* CLIENTE */}
                    <div className="space-y-2">
                        <Label className="text-base font-semibold">👤 Cliente</Label>
                        <ClientAutocomplete
                            onSelect={client => setForm(prev => ({
                                ...prev,
                                clienteId: client.id,
                                clienteNombre: client.name,
                                clienteTelefono: client.phone || '',
                                clienteDireccion: client.address || '',
                                sector: client.sector || prev.sector,
                            }))}
                            selectedClientName={form.clienteNombre}
                        />
                        {form.clienteTelefono && (
                            <p className="text-sm text-green-700 font-semibold flex items-center gap-1 mt-1">
                                <Phone className="w-4 h-4" /> {form.clienteTelefono}
                            </p>
                        )}
                    </div>

                    {/* DIRECCIÓN + SECTOR */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 border rounded-xl">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">📍 Dirección del Servicio</Label>
                            <Input
                                placeholder="Ej: Las Rosas 123"
                                className="h-12 bg-white"
                                value={form.clienteDireccion}
                                onChange={e => setForm(p => ({ ...p, clienteDireccion: e.target.value }))}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">🗺️ Sector</Label>
                            <select
                                className="flex h-12 w-full rounded-md border border-input bg-white px-3 py-2 text-base"
                                value={form.sector}
                                onChange={e => setForm(p => ({ ...p, sector: e.target.value }))}
                                required
                            >
                                <option value="">Seleccionar sector...</option>
                                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* TIPOS DE SERVICIO */}
                    <div className="space-y-2">
                        <Label className="text-base font-semibold">🛡️ Tipo de Servicio</Label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 border rounded-xl p-4 bg-slate-50">
                            {serviceTypes.map(t => (
                                <label key={t.id} className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer border-2 transition-colors ${form.tiposServicio.includes(t.id)
                                    ? 'bg-orange-100 border-orange-500 font-bold'
                                    : 'bg-white border-transparent hover:border-slate-300'
                                    }`}>
                                    <input
                                        type="checkbox"
                                        checked={form.tiposServicio.includes(t.id)}
                                        onChange={() => toggleTipo(t.id)}
                                        className="h-5 w-5 accent-orange-600 rounded border-gray-300"
                                    />
                                    <span className="text-sm">{t.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* FECHA + HORA */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">📅 Fecha</Label>
                            <Input type="date"
                                className="h-12 text-base"
                                value={form.fecha}
                                onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">🕐 Hora</Label>
                            <Input type="time"
                                className="h-12 text-base"
                                value={form.hora}
                                onChange={e => setForm(p => ({ ...p, hora: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* TÉCNICO */}
                    <div className="space-y-2">
                        <Label className="text-base font-semibold">👷 Técnico Asignado</Label>
                        <Input
                            placeholder="Nombre del técnico"
                            className="h-12 text-base"
                            value={form.tecnico}
                            onChange={e => setForm(p => ({ ...p, tecnico: e.target.value }))}
                        />
                    </div>

                    {/* ESTADO */}
                    <div className="space-y-2">
                        <Label className="text-base font-semibold">📋 Estado del Servicio</Label>
                        <div className="flex flex-col sm:flex-row gap-3">
                            {[
                                { value: 'programado', label: '🗓️ Programado', desc: 'Aparece como pendiente' },
                                { value: 'completado', label: '✅ Completado', desc: 'Servicio ya ejecutado' },
                            ].map(opt => (
                                <label key={opt.value} className={`flex-1 p-4 rounded-xl border-2 cursor-pointer transition-colors ${form.estado === opt.value
                                    ? 'bg-orange-50 border-orange-500 font-bold'
                                    : 'bg-white border-slate-200 hover:border-slate-300'
                                    }`}>
                                    <div className="flex items-center gap-3">
                                        <input type="radio" name="estado" value={opt.value}
                                            checked={form.estado === opt.value}
                                            onChange={() => setForm(p => ({ ...p, estado: opt.value as any }))}
                                            className="h-5 w-5 accent-orange-600"
                                        />
                                        <span className="text-base">{opt.label}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-2 ml-8">{opt.desc}</p>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* PERIODICIDAD */}
                    <div className="space-y-3 border-2 rounded-xl p-5 bg-blue-50/50 border-blue-200">
                        <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox"
                                checked={form.tienePeriodicidad}
                                onChange={e => setForm(p => ({ ...p, tienePeriodicidad: e.target.checked }))}
                                className="h-6 w-6 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-bold text-lg text-blue-900">🔁 ¿Requiere visitas periódicas?</span>
                        </label>
                        {form.tienePeriodicidad && (
                            <div className="ml-9 mt-4 space-y-4">
                                <Label className="text-sm font-semibold text-blue-800">Frecuencia de visita:</Label>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                                    {[
                                        { v: '1', l: '📅 Mensual' },
                                        { v: '2', l: '📅 Bimestral' },
                                        { v: '3', l: '📅 Trimestral' },
                                        { v: '6', l: '📅 Semestral' },
                                        { v: '12', l: '📅 Anual' },
                                    ].map(opt => (
                                        <label key={opt.v} className={`flex justify-center items-center py-3 rounded-lg border-2 text-sm cursor-pointer transition-colors ${form.periodicidadMeses === opt.v
                                            ? 'bg-blue-600 text-white border-blue-700 font-bold shadow-md'
                                            : 'bg-white border-blue-200 text-blue-800 hover:bg-blue-100'
                                            }`}>
                                            <input type="radio" name="periodicidad" value={opt.v}
                                                checked={form.periodicidadMeses === opt.v}
                                                onChange={() => setForm(p => ({ ...p, periodicidadMeses: opt.v }))}
                                                className="sr-only"
                                            />
                                            {opt.l}
                                        </label>
                                    ))}
                                </div>
                                {form.fecha && (
                                    <div className="bg-white p-3 rounded-md border border-blue-100 flex items-center justify-between">
                                        <span className="text-sm text-blue-800 font-medium">📌 Próxima visita estimada:</span>
                                        <span className="text-base font-bold text-blue-900">
                                            {new Date(`${calcProximaRenovacion()}T12:00:00`).toLocaleDateString('es-CL', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* CERTIFICADO (solo si completado) */}
                    {form.estado === 'completado' && (
                        <div className="space-y-3 border-2 rounded-xl p-5 bg-green-50 border-green-200">
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input type="checkbox"
                                    checked={form.generarCertificado}
                                    onChange={e => setForm(p => ({ ...p, generarCertificado: e.target.checked }))}
                                    className="h-6 w-6 rounded border-green-300 text-green-600 focus:ring-green-500"
                                />
                                <span className="font-bold text-lg text-green-900">📄 ¿Emitir certificado de control de plagas?</span>
                            </label>
                            {form.generarCertificado && (
                                <div className="ml-9 mt-4">
                                    <Label className="text-sm font-semibold text-green-800">N° de Certificado (Automático o Manual)</Label>
                                    <Input
                                        className="mt-2 h-12 text-base bg-white"
                                        placeholder="Ej: CERT-2026-001"
                                        value={form.numeroCertificado}
                                        onChange={e => setForm(p => ({ ...p, numeroCertificado: e.target.value }))}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {/* OBSERVACIONES */}
                    <div className="space-y-2">
                        <Label className="text-base font-semibold">📝 Observaciones (opcional)</Label>
                        <Input
                            placeholder="Notas adicionales del servicio..."
                            className="h-12 text-base"
                            value={form.observaciones}
                            onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))}
                        />
                    </div>

                    <div className="pt-6 grid grid-cols-2 gap-4">
                        <Button type="button" variant="outline" size="lg" className="h-14 text-base" onClick={() => { setIsFormOpen(false); setForm(emptyForm); }}>
                            Cancelar
                        </Button>
                        <Button type="submit" size="lg" className="h-14 text-base font-bold bg-orange-600 hover:bg-orange-700 text-white shadow-lg">
                            {form.estado === 'completado' ? '✅ Guardar Servicio' : '🗓️ Agendar Visita'}
                        </Button>
                    </div>
                </form>
            </FullScreenDialog>

            {/* MODAL DETALLES */}
            <FullScreenDialog
                open={!!selectedService}
                onOpenChange={open => { if (!open) { setSelectedService(null); setIsEditing(false); } }}
                title="Detalles del Servicio"
                description={`ID: ${selectedService?.id}`}
            >
                {selectedService && (
                    <div className="space-y-6 pt-2 pb-12">
                        <div className="grid grid-cols-1 gap-2">
                            <Label className="text-base font-semibold">👤 Cliente</Label>
                            <div className="h-12 flex items-center px-3 border rounded-md bg-muted/50 text-base">{selectedService.cliente_nombre}</div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="grid grid-cols-1 gap-2">
                                <Label className="text-base font-semibold">📞 Teléfono</Label>
                                <div className="h-12 flex items-center px-3 border rounded-md bg-muted/50 text-base">{selectedService.cliente_telefono || '–'}</div>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                <Label className="text-base font-semibold">🗺️ Sector</Label>
                                <div className="h-12 flex items-center px-3 border rounded-md bg-muted/50 text-base">{selectedService.sector}</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            <Label className="text-base font-semibold">📍 Dirección</Label>
                            <div className="h-12 flex items-center px-3 border rounded-md bg-muted/50 text-base">{selectedService.direccion || '–'}</div>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            <Label className="text-base font-semibold">🛡️ Tipo</Label>
                            <div className="min-h-12 flex items-center px-3 border rounded-md bg-muted/50 text-base py-2">{Array.isArray(selectedService.tipos_servicio) ? selectedService.tipos_servicio.join(', ') : selectedService.tipo_servicio}</div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="grid grid-cols-1 gap-2">
                                <Label className="text-base font-semibold">👷 Técnico</Label>
                                <div className="h-12 flex items-center px-3 border rounded-md bg-muted/50 text-base">{selectedService.tecnico_asignado || '–'}</div>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                <Label className="text-base font-semibold">📋 Estado</Label>
                                <div className="h-12 flex items-center px-3 gap-2 text-base">
                                    {isEditing ? (
                                        <select
                                            className="flex h-12 flex-1 rounded-md border border-input bg-background px-3 py-1 text-base"
                                            value={selectedService.estado}
                                            onChange={e => setSelectedService({ ...selectedService, estado: e.target.value })}
                                        >
                                            <option value="programado">Programado</option>
                                            <option value="completado">Completado</option>
                                            <option value="vencido">Vencido</option>
                                        </select>
                                    ) : getStatusBadge(selectedService.estado)}
                                </div>
                            </div>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="grid grid-cols-1 gap-2">
                                <Label className="text-base font-semibold">🔁 Renovación</Label>
                                <div className="h-12 flex items-center px-3 text-base">
                                    {isEditing ? (
                                        <Input type="date" className="flex-1 h-12"
                                            value={selectedService.proxima_renovacion?.split('T')[0] || ''}
                                            onChange={e => setSelectedService({ ...selectedService, proxima_renovacion: e.target.value })}
                                        />
                                    ) : (
                                        <span className={`px-4 py-1 rounded-full text-base font-semibold border ${getTrafficLight(selectedService.proxima_renovacion)}`}>
                                            {selectedService.proxima_renovacion ? new Date(selectedService.proxima_renovacion).toLocaleDateString('es-CL') : 'Sin periodicidad'}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                                <Label className="text-base font-semibold">📄 Certificado</Label>
                                <div className="h-12 flex items-center px-3 text-base">
                                    {isEditing ? (
                                        <Input className="flex-1 h-12"
                                            value={selectedService.numero_certificado || ''}
                                            onChange={e => setSelectedService({ ...selectedService, numero_certificado: e.target.value })}
                                        />
                                    ) : (
                                        selectedService.numero_certificado
                                            ? <code className="bg-muted px-2 py-1 rounded text-base">{selectedService.numero_certificado}</code>
                                            : <span className="text-base text-muted-foreground">–</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2 mt-4">
                            <Label className="text-base font-semibold">📝 Notas</Label>
                            <div className="min-h-16 flex items-start px-3 py-2 border rounded-md bg-muted/50 text-base">{selectedService.observaciones || '–'}</div>
                        </div>
                        <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {isEditing ? (
                                <>
                                    <Button variant="outline" size="lg" className="h-14 text-base" onClick={() => setIsEditing(false)}>Cancelar</Button>
                                    <Button size="lg" className="h-14 text-base sm:col-span-2" onClick={handleUpdateService}>Guardar Cambios</Button>
                                </>
                            ) : (
                                <>
                                    <Button variant="secondary" size="lg" className="h-14 text-base" onClick={() => setIsEditing(true)}>✏️ Editar</Button>
                                    {selectedService?.estado === 'completado' && (
                                        <Button variant="outline" size="lg" className="h-14 text-base" onClick={() => {
                                            setCertificateService(selectedService);
                                            setIsCertificateOpen(true);
                                            setSelectedService(null);
                                        }}>📄 Ver Certificado</Button>
                                    )}
                                    <Button variant="outline" size="lg" className="h-14 text-base" onClick={() => { setSelectedService(null); setIsEditing(false); }}>Cerrar</Button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </FullScreenDialog>

            {/* MODAL CERTIFICADO */}
            {isCertificateOpen && certificateService && (
                <FullScreenDialog
                    open={isCertificateOpen}
                    onOpenChange={setIsCertificateOpen}
                    title=""
                    description=""
                >
                    <div className="print:hidden mb-6 flex justify-between items-center bg-gray-50 p-4 border rounded-lg">
                        <h2 className="flex items-center gap-2 text-lg font-bold">
                            <FileText className="w-5 h-5 text-blue-600" />
                            Visor de Certificado
                        </h2>
                        <div className="space-x-3">
                            <Button variant="outline" onClick={() => setIsCertificateOpen(false)}>Volver</Button>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold" onClick={() => window.print()}>🖨️ Imprimir PDF</Button>
                        </div>
                    </div>
                    <CertificateGenerator
                        service={certificateService as any}
                        traps={[]}
                        serviceTraps={[]}
                    />
                </FullScreenDialog>
            )}
        </div>
    );
};
