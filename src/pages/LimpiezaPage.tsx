import { useState, useEffect } from 'react';
// import { Plus, Calendar, Clock, MapPin, CheckCircle2, Clock3, AlertCircle, Trash2 } from 'lucide-react';
const Plus = ({ className }: { className?: string }) => <span className={className}>+</span>;
const Calendar = ({ className }: { className?: string }) => <span className={className}>📅</span>;
const Clock = ({ className }: { className?: string }) => <span className={className}>🕒</span>;
const MapPin = ({ className }: { className?: string }) => <span className={className}>📍</span>;
const CheckCircle2 = ({ className }: { className?: string }) => <span className={className}>✅</span>;
const Clock3 = ({ className }: { className?: string }) => <span className={className}>🕒</span>;
const AlertCircle = ({ className }: { className?: string }) => <span className={className}>⚠️</span>;
const Trash2 = ({ className }: { className?: string }) => <span className={className}>🗑️</span>;
import { ClientAutocomplete } from '../components/ClientAutocomplete';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '../components/ui/dialog';
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

import { Pagination } from '../components/ui/pagination';
import { SECTORS } from '../lib/constants';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Definición de Tipo para Servicios de Limpieza 100% real
export interface ServicioLimpieza {
    id: string;
    cliente_id: string;
    cliente_nombre: string;
    tipo_servicio: string;
    sector: string;
    fecha: string;
    hora: string;
    direccion: string;
    estado: string;
    cliente_telefono?: string;
}

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'completed':
            return <Badge variant="success">Completado</Badge>;
        case 'scheduled':
            return <Badge variant="default">Programado</Badge>;
        case 'pending':
            return <Badge variant="warning">Pendiente</Badge>;
        default:
            return <Badge variant="secondary">{status}</Badge>;
    }
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'completed':
            return <CheckCircle2 className="h-4 w-4 text-green-600" />;
        case 'scheduled':
            return <Clock3 className="h-4 w-4 text-blue-600" />;
        case 'pending':
            return <AlertCircle className="h-4 w-4 text-yellow-600" />;
        default:
            return null;
    }
};

export const LimpiezaPage = () => {
    const { profile } = useAuth();
    const isWorker = profile?.rol === 'worker';
    const [services, setServices] = useState<ServicioLimpieza[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    // Supabase Fetch
    useEffect(() => {
        fetchServices();
    }, []);

    const fetchServices = async () => {
        const { data, error } = await supabase
            .from('servicios_limpieza')
            .select('*')
            .order('fecha', { ascending: false });

        if (!error && data) {
            const mapped = data as ServicioLimpieza[];

            // Batch-query de teléfonos desde la tabla clientes
            const ids = [...new Set(mapped.map(s => s.cliente_id).filter(Boolean))];
            if (ids.length > 0) {
                const { data: clientesData } = await supabase
                    .from('clientes')
                    .select('id, phone')
                    .in('id', ids);
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

    const filteredServices = services.filter(service => {
        const matchesSearch = (service.cliente_nombre || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || service.estado === statusFilter;
        const matchesSector = sectorFilter === 'all' || service.sector === sectorFilter;

        return matchesSearch && matchesStatus && matchesSector;
    });

    const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
    const paginatedServices = filteredServices.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const [isScheduleOpen, setIsScheduleOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<ServicioLimpieza | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // New Service Form State
    const [newService, setNewService] = useState({
        cliente_id: '',
        cliente_nombre: '',
        servicio: '',
        fecha: '',
        hora: '',
        direccion: '',
        sector: ''
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewService(prev => ({ ...prev, [name]: value }));
    };

    const handleScheduleService = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newService.cliente_id) {
            alert("Debe seleccionar un cliente del buscador");
            return;
        }

        const insertData = {
            cliente_id: newService.cliente_id,
            cliente_nombre: newService.cliente_nombre,
            tipo_servicio: newService.servicio,
            fecha: newService.fecha,
            hora: newService.hora,
            direccion: newService.direccion,
            sector: newService.sector,
            estado: 'scheduled'
        };

        const { data, error } = await supabase
            .from('servicios_limpieza')
            .insert([insertData])
            .select();

        if (error) {
            alert("Error agendando: " + error.message);
            return;
        }

        if (data) {
            setServices([data[0], ...services]);
            setIsScheduleOpen(false);
            setNewService({
                cliente_id: '', cliente_nombre: '', servicio: '',
                fecha: '', hora: '', direccion: '', sector: ''
            });
        }
    };

    const handleCompleteService = async (id: string) => {
        const { error } = await supabase
            .from('servicios_limpieza')
            .update({ estado: 'completed' })
            .eq('id', id);

        if (!error) {
            setServices(services.map(s => s.id === id ? { ...s, estado: 'completed' } : s));
        }
    };

    const handleUpdateService = async () => {
        if (!selectedService) return;

        const { error } = await supabase
            .from('servicios_limpieza')
            .update({
                estado: selectedService.estado,
                fecha: selectedService.fecha,
                hora: selectedService.hora
            })
            .eq('id', selectedService.id);

        if (!error) {
            setServices(services.map(s => s.id === selectedService.id ? selectedService : s));
            setIsEditing(false);
            setSelectedService(null);
        }
    };

    const handleDeleteService = async (id: string) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este servicio permanentemente?')) {
            const { error } = await supabase
                .from('servicios_limpieza')
                .delete()
                .eq('id', id);

            if (!error) {
                setServices(services.filter(s => s.id !== id));
            }
        }
    };

    const handleCloseDetails = () => {
        setSelectedService(null);
        setIsEditing(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Servicios de Limpieza</h2>
                    <p className="text-muted-foreground">
                        Programación y seguimiento de servicios de aseo.
                    </p>
                </div>
                <Button onClick={() => setIsScheduleOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Agendar Servicio
                </Button>

                <FullScreenDialog
                    open={isScheduleOpen}
                    onOpenChange={setIsScheduleOpen}
                    title="Agendar Nuevo Servicio"
                    description="Programa una nueva visita de limpieza para un cliente."
                >
                    <form onSubmit={handleScheduleService} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="client" className="text-base font-semibold">Cliente</Label>
                            <ClientAutocomplete
                                onSelect={(client) => {
                                    setNewService(prev => ({
                                        ...prev,
                                        cliente_id: client.id,
                                        cliente_nombre: client.name,
                                        direccion: client.address || prev.direccion,
                                        sector: client.sector || prev.sector
                                    }));
                                }}
                                selectedClientName={newService.cliente_nombre}
                            />
                        </div>

                        <div className="bg-slate-50 border p-4 rounded-xl space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="service" className="text-base font-semibold">Tipo de Servicio *</Label>
                                <select
                                    id="service"
                                    name="servicio"
                                    className="flex h-12 w-full rounded-md border border-input bg-white px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={newService.servicio}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Selecciónar servicio...</option>
                                    <option value="Aseo General">Aseo General</option>
                                    <option value="Limpieza de Alfombras">Limpieza de Alfombras</option>
                                    <option value="Limpieza de Piso Flotante">Limpieza de Piso Flotante</option>
                                    <option value="Limpieza de Cerámicas">Limpieza de Cerámicas</option>
                                    <option value="Pulido y Vitrificado de Parqué">Pulido y Vitrificado de Parqué</option>
                                    <option value="Limpieza de Tapices y Muebles">Limpieza de Tapices y Muebles</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="date" className="text-base font-medium">Fecha</Label>
                                    <Input id="date" name="fecha" type="date" className="h-12 text-base bg-white" value={newService.fecha} onChange={handleInputChange} required />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="time" className="text-base font-medium">Hora</Label>
                                    <Input id="time" name="hora" type="time" className="h-12 text-base bg-white" value={newService.hora} onChange={handleInputChange} required />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="address" className="text-base font-semibold">Dirección Exacta</Label>
                                <Input id="address" name="direccion" className="h-12 text-base" value={newService.direccion} onChange={handleInputChange} required />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="sector" className="text-base font-semibold">Sector Logístico</Label>
                                <select
                                    id="sector"
                                    name="sector"
                                    className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={newService.sector}
                                    onChange={handleInputChange}
                                    required
                                >
                                    <option value="">Seleccionar sector...</option>
                                    {SECTORS.map((sector) => (
                                        <option key={sector} value={sector}>
                                            {sector}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="pt-4 pb-12">
                            <Button type="submit" size="lg" className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 shadow-lg">
                                Agendar Visita
                            </Button>
                        </div>
                    </form>
                </FullScreenDialog>

                <Dialog open={!!selectedService} onOpenChange={(open) => !open && handleCloseDetails()}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Detalles del Servicio</DialogTitle>
                            <DialogDescription>
                                Información completa de la orden de servicio #{selectedService?.id}
                            </DialogDescription>
                        </DialogHeader>
                        {selectedService && (
                            <div className="grid gap-4 py-4">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right font-bold">Cliente:</Label>
                                    <span className="col-span-3">{selectedService.cliente_nombre}</span>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right font-bold">Servicio:</Label>
                                    <span className="col-span-3">{selectedService.tipo_servicio}</span>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right font-bold">Fecha:</Label>
                                    {isEditing ? (
                                        <Input
                                            type="date"
                                            value={selectedService.fecha}
                                            onChange={(e) => setSelectedService({ ...selectedService, fecha: e.target.value })}
                                            className="col-span-3"
                                        />
                                    ) : (
                                        <span className="col-span-3">{selectedService.fecha ? new Date(selectedService.fecha).toLocaleDateString() : '-'}</span>
                                    )}
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right font-bold">Hora:</Label>
                                    {isEditing ? (
                                        <Input
                                            type="time"
                                            value={selectedService.hora}
                                            onChange={(e) => setSelectedService({ ...selectedService, hora: e.target.value })}
                                            className="col-span-3"
                                        />
                                    ) : (
                                        <span className="col-span-3">{selectedService.hora}</span>
                                    )}
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right font-bold">Dirección:</Label>
                                    <span className="col-span-3">{selectedService.direccion}</span>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right font-bold">Personal:</Label>
                                    {isEditing ? (
                                        <span className="col-span-3 text-muted-foreground italic">No asignable</span>
                                    ) : (
                                        <span className="col-span-3">N/A</span>
                                    )}
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-right font-bold">Estado:</Label>
                                    <div className="col-span-3 flex items-center gap-2">
                                        {isEditing ? (
                                            <select
                                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                                value={selectedService.estado}
                                                onChange={(e) => setSelectedService({ ...selectedService, estado: e.target.value })}
                                            >
                                                <option value="pending">Pendiente</option>
                                                <option value="scheduled">Programado</option>
                                                <option value="completed">Completado</option>
                                                <option value="cancelled">Cancelado</option>
                                            </select>
                                        ) : (
                                            <>
                                                {getStatusIcon(selectedService.estado)}
                                                {getStatusBadge(selectedService.estado)}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                        <DialogFooter>
                            {isEditing ? (
                                <>
                                    <Button variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
                                    <Button onClick={handleUpdateService}>Guardar Cambios</Button>
                                </>
                            ) : (
                                <>
                                    <Button variant="secondary" onClick={() => setIsEditing(true)}>Editar / Reagendar</Button>
                                    <Button variant="outline" onClick={handleCloseDetails}>Cerrar</Button>
                                </>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle>Programación Semanal</CardTitle>
                            <CardDescription>
                                Vista detallada de los servicios asignados.
                            </CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-start sm:items-center w-full sm:w-auto">
                            <Input
                                placeholder="Buscar por cliente o ID..."
                                className="w-full sm:w-64"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <select
                                className="h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">Todos los Estados</option>
                                <option value="scheduled">Programado</option>
                                <option value="pending">Pendiente</option>
                                <option value="completed">Completado</option>
                            </select>
                            <select
                                className="h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm"
                                value={sectorFilter}
                                onChange={(e) => setSectorFilter(e.target.value)}
                            >
                                <option value="all">Todos los Sectores</option>
                                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Cliente / Dirección</TableHead>
                                    <TableHead>Servicio</TableHead>
                                    <TableHead>Fecha / Hora</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedServices.map((service) => (
                                    <TableRow key={service.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {getStatusIcon(service.estado)}
                                                {getStatusBadge(service.estado)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{service.cliente_nombre || 'Desconocido'}</span>
                                                <a
                                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(service.direccion || '')}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center text-muted-foreground text-xs mt-0.5 hover:text-blue-600 hover:underline"
                                                    title="Abrir en Maps"
                                                >
                                                    <MapPin className="mr-1 h-3 w-3" />
                                                    {service.direccion || 'Sin dirección'}
                                                </a>
                                                {service.cliente_telefono && (
                                                    <a href={`https://wa.me/${service.cliente_telefono.replace(/\+/g, '').replace(/\s/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-green-700 text-xs font-bold hover:underline mt-0.5 flex items-center"
                                                        title="Enviar WhatsApp"
                                                    >
                                                        <span className="mr-1">📞</span> {service.cliente_telefono}
                                                    </a>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-sm">{service.tipo_servicio}</span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-sm">
                                                <div className="flex items-center">
                                                    <Calendar className="mr-1 h-3 w-3 text-muted-foreground" />
                                                    {service.fecha ? new Date(service.fecha.includes('T') ? service.fecha : `${service.fecha}T12:00:00`).toLocaleDateString() : '-'}
                                                </div>
                                                <div className="flex items-center text-muted-foreground mt-0.5">
                                                    <Clock className="mr-1 h-3 w-3" />
                                                    {service.hora}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                {service.estado !== 'completed' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        title="Marcar como Realizado"
                                                        onClick={() => handleCompleteService(service.id)}
                                                    >
                                                        <CheckCircle2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedService(service)}
                                                >
                                                    Ver Detalles
                                                </Button>
                                                {!isWorker && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleDeleteService(service.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </CardContent>
            </Card>



        </div>
    );
};
