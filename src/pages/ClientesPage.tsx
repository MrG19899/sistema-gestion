import { useState, useEffect } from 'react';
import { 
    Plus, 
    Search, 
    Eye, 
    Pencil, 
    UserX, 
    UserCheck, 
    Trash2,
    ArrowLeft,
    Clock,
    Calendar,
    Settings
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
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
import { SECTORS } from '../lib/constants';
import { Pagination } from '../components/ui/pagination';
import type { Cliente, ClienteType, ClienteEstado } from '../types';
import { supabase } from '../lib/supabase';


export const ClientesPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [clients, setClients] = useState<Cliente[]>([]);

    // Cargar clientes desde Supabase
    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const { data, error } = await supabase
                .from('clientes')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            if (data) setClients(data as Cliente[]);
        } catch (error) {
            console.error('Error fetching clients:', error);
            alert('Error al cargar clientes desde la base de datos.');
        }
    };

    const [isAddClientOpen, setIsAddClientOpen] = useState(false);

    const [isEditClientOpen, setIsEditClientOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
    const [clientServices, setClientServices] = useState<{
        plagas: any[];
        limpieza: any[];
        alfombras: any[];
    }>({ plagas: [], limpieza: [], alfombras: [] });
    const [loadingServices, setLoadingServices] = useState(false);
    
    const [showInactive, setShowInactive] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    const [newClient, setNewClient] = useState<{
        name: string;
        contact: string;
        email: string;
        phone: string;
        address: string;
        addressDepto?: string;
        type: ClienteType;
        sector: string;
    }>({
        name: '',
        contact: '',
        email: '',
        phone: '',
        address: '',
        addressDepto: '',
        type: 'Comercial',
        sector: ''
    });

    const filteredClients = clients.filter(client => {
        if (client.deleted) return false;

        const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (client.contact || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (client.address || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = showInactive || client.status === 'active';

        // Service Filtering Logic (To be implemented with Supabase Views in future phases)
        let matchesService = true;

        // Removed mock-based cross-checks as services now live in Supabase PostgreSQL

        return matchesSearch && matchesStatus && matchesService;
    });

    const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
    const paginatedClients = filteredClients.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewClient(prev => ({ ...prev, [name]: value }));
    };

    const handleAddClient = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            // Guardamos con un separador invisible (Zero-width space) + espacio normal
            // para que los mapas (Waze/Google Maps) lo lean perfecto sin comas y nosotros
            // podamos volver a separarlo en el botón de "Editar".
            const SEPARATOR = '\u200B ';
            const finalAddress = newClient.addressDepto ? `${newClient.address.trim()}${SEPARATOR}${newClient.addressDepto.trim()}` : newClient.address.trim();
            const newClientData = {
                name: newClient.name,
                type: newClient.type,
                contact: newClient.contact,
                email: newClient.email,
                phone: newClient.phone,
                address: finalAddress,
                sector: newClient.sector,
                status: 'active'
            };

            const { data, error } = await supabase
                .from('clientes')
                .insert([newClientData])
                .select();

            if (error) throw error;

            if (data && data.length > 0) {
                setClients([data[0] as Cliente, ...clients]);
                setIsAddClientOpen(false);
                setNewClient({
                    name: '',
                    contact: '',
                    email: '',
                    phone: '',
                    address: '',
                    addressDepto: '',
                    type: 'Comercial',
                    sector: ''
                });
            }
        } catch (error: any) {
            console.error("Error inserting client:", error.message);
            alert('Error al crear el cliente: ' + error.message);
        }
    };

    const handleEditClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClient) return;

        try {
            const SEPARATOR = '\u200B ';
            const finalAddress = newClient.addressDepto ? `${newClient.address.trim()}${SEPARATOR}${newClient.addressDepto.trim()}` : newClient.address.trim();
            const updateData = {
                name: newClient.name,
                type: newClient.type,
                contact: newClient.contact,
                email: newClient.email,
                phone: newClient.phone,
                address: finalAddress,
                sector: newClient.sector
            };

            const { data, error } = await supabase
                .from('clientes')
                .update(updateData)
                .eq('id', selectedClient.id)
                .select();

            if (error) throw error;

            if (data && data.length > 0) {
                const updatedClient = data[0] as Cliente;

                // Actualizar estado local
                setClients(clients.map(c => c.id === updatedClient.id ? updatedClient : c));
                setSelectedClient(updatedClient);
                setIsEditClientOpen(false);
            }
        } catch (error: any) {
            console.error("Error updating client:", error.message);
            alert('Error al actualizar el cliente: ' + error.message);
        }
    };

    const openEditDialog = (client: Cliente) => {
        // setSelectedClient(client); // Handled by button click before usually, or here
        // But we need to make sure selectedClient is set for the view
        // Wait, handleEditClient uses selectedClient.

        // If we are in "View" mode, selectedClient is already set.
        // If we are in list mode, we might need to set it.
        // But openEditDialog is called from list mode too.

        // Let's ensure selectedClient is set if passed
        if (client) setSelectedClient(client);

        const SEPARATOR = '\u200B ';
        let addr = client.address;
        let depto = '';

        if (client.address?.includes(SEPARATOR)) {
            const parts = client.address.split(SEPARATOR);
            addr = parts[0];
            depto = parts[1] || '';
        } else if (client.address?.includes(', ')) {
            // Retrocompatibilidad con el formato viejo de comas, para cuentas creadas ayer
            const parts = client.address.split(', ');
            addr = parts[0];
            depto = parts[1] || '';
        }

        setNewClient({
            name: client.name,
            contact: client.contact || '',
            email: client.email || '',
            phone: client.phone,
            address: addr,
            addressDepto: depto,
            type: client.type,
            sector: client.sector || ''
        });
        setIsEditClientOpen(true);
    };

    const toggleClientStatus = async (clientId: string) => {
        const currentClient = clients.find(c => c.id === clientId);
        if (!currentClient) return;

        const newStatus = currentClient.status === 'active' ? 'inactive' : 'active';

        try {
            const { error } = await supabase
                .from('clientes')
                .update({ status: newStatus })
                .eq('id', clientId);

            if (error) throw error;

            // Actualizar vista local
            const updatedClients = clients.map(c =>
                c.id === clientId ? { ...c, status: newStatus as ClienteEstado } : c
            );
            setClients(updatedClients);

            if (selectedClient && selectedClient.id === clientId) {
                setSelectedClient({ ...selectedClient, status: newStatus as ClienteEstado });
            }
        } catch (error: any) {
            console.error("Error toggling client status:", error.message);
        }
    };

    const handleDeleteClient = async (clientId: string) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este cliente permanentemente? Esta acción eliminará también sus servicios asociados.')) {
            try {
                const { error } = await supabase
                    .from('clientes')
                    .delete()
                    .eq('id', clientId);

                if (error) throw error;

                // Actualizar vista
                setClients(clients.filter(c => c.id !== clientId));
                if (selectedClient && selectedClient.id === clientId) {
                    setSelectedClient(null);
                }
            } catch (error: any) {
                console.error("Error deleting client:", error.message);
                alert('Error al eliminar cliente: ' + error.message);
            }
        }
    };

    const fetchActiveServices = async (clientId: string) => {
        setLoadingServices(true);
        try {
            const [{ data: plagas }, { data: limpieza }, { data: alfombras }] = await Promise.all([
                supabase.from('servicios_plagas').select('*').eq('cliente_id', clientId).neq('estado', 'realizado').order('fecha_ejecucion', { ascending: false }),
                supabase.from('servicios_limpieza').select('*').eq('cliente_id', clientId).neq('estado', 'completed').order('fecha', { ascending: false }),
                supabase.from('servicios_alfombras').select('*').eq('cliente_id', clientId).neq('estado', 'delivered').order('created_at', { ascending: false })
            ]);

            setClientServices({
                plagas: plagas || [],
                limpieza: limpieza || [],
                alfombras: alfombras || []
            });
        } catch (error) {
            console.error('Error fetching client services:', error);
        } finally {
            setLoadingServices(false);
        }
    };

    const handleAddItemToOrder = async (orderId: string, baseItem: any) => {
        if (!window.confirm('¿Deseas agregar una nueva alfombra a este pedido? Se actualizará el total de piezas automáticamente.')) return;
        
        try {
            // 1. Obtener items actuales para contar
            const { data: currentItems, error: fetchErr } = await supabase
                .from('servicios_alfombras')
                .select('id, numero_item')
                .eq('pedido_id', orderId);
            
            if (fetchErr) throw fetchErr;
            
            const newTotal = (currentItems?.length || 0) + 1;

            // 2. Actualizar el total_items en todos los registros del pedido
            const { error: updateErr } = await supabase
                .from('servicios_alfombras')
                .update({ total_items: newTotal })
                .eq('pedido_id', orderId);
            
            if (updateErr) throw updateErr;

            // 3. Insertar el nuevo item (copia los datos base pero con nuevo número)
            const newItem = {
                ...baseItem,
                id: undefined, // Supabase genera el nuevo ID
                numero_item: newTotal,
                total_items: newTotal,
                foto_url: null, // Pieza nueva sin foto aún
                created_at: new Date().toISOString()
            };
            delete (newItem as any).id;

            const { error: insertErr } = await supabase
                .from('servicios_alfombras')
                .insert([newItem]);
            
            if (insertErr) throw insertErr;

            alert('Pieza agregada con éxito.');
            fetchActiveServices(selectedClient?.id || '');
        } catch (error: any) {
            alert('Error al agregar pieza: ' + error.message);
        }
    };

    // Vista de detalle del cliente
    if (selectedClient && !isEditClientOpen) {
        if (clientServices.plagas.length === 0 && clientServices.limpieza.length === 0 && clientServices.alfombras.length === 0 && !loadingServices) {
            fetchActiveServices(selectedClient.id);
        }
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" onClick={() => setSelectedClient(null)}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Volver
                    </Button>
                    <div className="flex-1">
                        <h2 className="text-3xl font-bold tracking-tight">{selectedClient.name}</h2>
                        <p className="text-muted-foreground">{selectedClient.address} - {selectedClient.sector}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => openEditDialog(selectedClient)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Editar
                        </Button>
                        <Button
                            variant={selectedClient.status === 'active' ? 'destructive' : 'default'}
                            onClick={() => toggleClientStatus(selectedClient.id)}
                        >
                            {selectedClient.status === 'active' ? (
                                <>
                                    <UserX className="mr-2 h-4 w-4" />
                                    Desactivar
                                </>
                            ) : (
                                <>
                                    <UserCheck className="mr-2 h-4 w-4" />
                                    Activar
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Datos del Cliente</CardTitle>
                        <CardDescription>Información de contacto y detalles</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-5">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <Label className="text-muted-foreground text-xs">Nombre Empresa</Label>
                                <p className="font-medium">{selectedClient.name}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs">Tipo</Label>
                                <p className="font-medium">{selectedClient.type}</p>
                            </div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <Label className="text-muted-foreground text-xs">Contacto</Label>
                                <p className="font-medium">{selectedClient.contact || '—'}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs">Email</Label>
                                <p className="font-medium">{selectedClient.email || '—'}</p>
                            </div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <Label className="text-muted-foreground text-xs">Teléfono</Label>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className="font-medium">{selectedClient.phone || '—'}</p>
                                    {selectedClient.phone && (
                                        <div className="flex gap-1.5">
                                            <a href={(() => { let p = selectedClient.phone.replace(/\D/g, ''); if (p.length === 8) p = '569' + p; else if (p.length === 9) p = '56' + p; return `https://wa.me/${p}`; })()} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold bg-green-50 text-green-700 hover:bg-green-100 px-2 py-0.5 rounded border border-green-200">💬 WhatsApp</a>
                                            <a href={(() => { let p = selectedClient.phone.replace(/\D/g, ''); if (p.length === 8) p = '569' + p; else if (p.length === 9) p = '56' + p; return `tel:+${p}`; })()} className="text-[10px] font-bold bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-0.5 rounded border border-blue-200">📞 Llamar</a>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs">Estado</Label>
                                <Badge variant={selectedClient.status === 'active' ? 'success' : 'secondary'} className="mt-1">
                                    {selectedClient.status === 'active' ? 'Activo' : 'Inactivo'}
                                </Badge>
                            </div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <Label className="text-muted-foreground text-xs">Dirección</Label>
                                <p className="font-medium">{selectedClient.address || '—'}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs">Sector</Label>
                                <p className="font-medium">{selectedClient.sector || 'Sin Asignar'}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="mt-8 border-t pt-8">
                    <h3 className="text-2xl font-black text-slate-800 flex items-center gap-2 mb-6">
                        <Clock className="w-6 h-6 text-primary" />
                        Servicios Activos / Pendientes
                    </h3>

                    {loadingServices ? (
                        <div className="p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                            <p className="font-medium text-slate-500">Cargando historial de servicios...</p>
                        </div>
                    ) : (clientServices.plagas.length === 0 && clientServices.limpieza.length === 0 && clientServices.alfombras.length === 0) ? (
                        <div className="p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                            <p className="font-bold text-slate-400">Este cliente no tiene servicios activos actualmente.</p>
                        </div>
                    ) : (
                        <div className="grid gap-6">
                            {/* Grupo Alfombras */}
                            {clientServices.alfombras.length > 0 && (
                                <div className="space-y-4">
                                    <h4 className="font-bold text-purple-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                                        <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                        Alfombras
                                    </h4>
                                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {/* Agrupar por pedido_id */}
                                        {Object.values(clientServices.alfombras.reduce((acc, rug) => {
                                            const key = rug.pedido_id || rug.id;
                                            if (!acc[key]) acc[key] = [];
                                            acc[key].push(rug);
                                            return acc;
                                        }, {} as Record<string, any[]>)).map((orderItems: any) => {
                                            const first = orderItems[0];
                                            const isComplete = orderItems.every((i: any) => i.estado === 'ready');
                                            return (
                                                <Card key={first.pedido_id || first.id} className="border-2 hover:border-purple-300 transition-all shadow-sm group">
                                                    <CardContent className="p-4">
                                                        <div className="flex justify-between items-start mb-3">
                                                            <Badge variant={isComplete ? "success" : "secondary"}>
                                                                {isComplete ? "LISTO PARA ENTREGA" : "EN TALLER"}
                                                            </Badge>
                                                            <span className="text-[10px] font-mono text-slate-400">#{ (first.pedido_id || first.id).substring(0,6) }</span>
                                                        </div>
                                                        <p className="text-lg font-black text-slate-800">{orderItems.length} Alfombras</p>
                                                        <p className="text-xs text-slate-500 mt-1">Ingreso: { new Date(first.created_at).toLocaleDateString() }</p>
                                                        
                                                        <div className="mt-4 pt-3 border-t flex flex-col gap-2">
                                                            <Button 
                                                                variant="outline" 
                                                                size="sm" 
                                                                className="w-full text-xs font-bold border-purple-200 hover:bg-purple-50 text-purple-700 h-9"
                                                                onClick={() => handleAddItemToOrder(first.pedido_id || first.id, first)}
                                                            >
                                                                <Plus className="w-3 h-3 mr-1" /> Agregar pieza al pedido
                                                            </Button>
                                                            <Button 
                                                                variant="ghost" 
                                                                size="sm" 
                                                                className="w-full text-xs font-bold h-8"
                                                                onClick={() => window.location.href = '/alfombras'}
                                                            >
                                                                Ir a panel de alfombras
                                                            </Button>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Grupo Plagas */}
                            {clientServices.plagas.length > 0 && (
                                <div className="space-y-4">
                                    <h4 className="font-bold text-orange-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                                        <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                                        Control de Plagas
                                    </h4>
                                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {clientServices.plagas.map(service => (
                                            <Card key={service.id} className="border-2 border-orange-100 hover:border-orange-300 transition-all shadow-sm">
                                                <CardContent className="p-4">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <Badge variant="warning">{service.estado?.toUpperCase() || 'VIGENTE' }</Badge>
                                                        <span className="text-[10px] font-mono text-slate-400">#{service.id.substring(0,6)}</span>
                                                    </div>
                                                    <p className="text-lg font-black text-slate-800 leading-tight">{service.tipo_servicio}</p>
                                                    <div className="mt-2 space-y-1">
                                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" /> Ejecución: {service.fecha_ejecucion || 'Sin fecha' }
                                                        </p>
                                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                                            <Settings className="w-3 h-3" /> Prox. Visita: {service.proxima_visita || 'Puntos crónicos' }
                                                        </p>
                                                    </div>
                                                    <div className="mt-4 pt-3 border-t">
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="w-full text-xs font-bold border-orange-200 hover:bg-orange-50 text-orange-700"
                                                            onClick={() => window.location.href = '/plagas'}
                                                        >
                                                            Ir a panel de plagas
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Grupo Limpieza */}
                            {clientServices.limpieza.length > 0 && (
                                <div className="space-y-4">
                                    <h4 className="font-bold text-blue-700 flex items-center gap-2 text-sm uppercase tracking-wider">
                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                        Limpieza / Aseo
                                    </h4>
                                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {clientServices.limpieza.map(service => (
                                            <Card key={service.id} className="border-2 border-blue-100 hover:border-blue-300 transition-all shadow-sm">
                                                <CardContent className="p-4">
                                                    <div className="flex justify-between items-start mb-3">
                                                        <Badge className="bg-blue-600 text-white border-none">{service.estado?.toUpperCase() || 'AGENDADO' }</Badge>
                                                        <span className="text-[10px] font-mono text-slate-400">#{service.id.substring(0,6)}</span>
                                                    </div>
                                                    <p className="text-lg font-black text-slate-800 leading-tight">{service.tipo_servicio || 'Aseo General' }</p>
                                                    <div className="mt-2 space-y-1">
                                                        <p className="text-xs text-slate-500 flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" /> Fecha: {service.fecha || 'Sin fecha' } {service.hora}
                                                        </p>
                                                    </div>
                                                    <div className="mt-4 pt-3 border-t">
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="w-full text-xs font-bold border-blue-200 hover:bg-blue-50 text-blue-700"
                                                            onClick={() => window.location.href = '/limpieza'}
                                                        >
                                                            Ir a panel de limpieza
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Vista de lista de clientes
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Clientes</h2>
                    <p className="text-muted-foreground">
                        Gestiona tu cartera de clientes y sus servicios.
                    </p>
                </div>
                <Button onClick={() => setIsAddClientOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Nuevo Cliente
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Listado de Clientes</CardTitle>
                    <CardDescription>
                        {filteredClients.length} cliente(s) encontrado(s)
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center justify-between mb-6 gap-4">
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar clientes..."
                                className="pl-8 w-full"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
                            <Button
                                variant="outline"
                                onClick={() => { setShowInactive(!showInactive); setCurrentPage(1); }}
                                className="w-full sm:w-auto"
                            >
                                {showInactive ? 'Ocultar Inactivos' : 'Mostrar Inactivos'}
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Cliente</TableHead>
                                    <TableHead>Contacto</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Último Servicio</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {paginatedClients.map((client) => (
                                    <TableRow key={client.id}>
                                        <TableCell>
                                            <div className="font-medium">{client.name}</div>
                                            <div className="text-xs text-muted-foreground">{client.address}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <div className="text-sm font-medium">{client.contact}</div>
                                                {client.email && <div className="text-xs text-muted-foreground">{client.email}</div>}
                                                {client.phone && (
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <a
                                                            href={(() => {
                                                                let p = client.phone.replace(/\D/g, '');
                                                                if (p.length === 8) p = '569' + p;
                                                                else if (p.length === 9) p = '56' + p;
                                                                return `https://wa.me/${p}`;
                                                            })()}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-1 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-800 px-2 py-0.5 rounded border border-green-200 text-[10px] font-bold transition-colors"
                                                            title="Enviar WhatsApp"
                                                        >
                                                            💬 WhatsApp
                                                        </a>
                                                        <a
                                                            href={(() => {
                                                                let p = client.phone.replace(/\D/g, '');
                                                                if (p.length === 8) p = '569' + p;
                                                                else if (p.length === 9) p = '56' + p;
                                                                return `tel:+${p}`;
                                                            })()}
                                                            className="flex items-center gap-1 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 px-2 py-0.5 rounded border border-blue-200 text-[10px] font-bold transition-colors"
                                                            title="Llamar al cliente"
                                                        >
                                                            📞 Llamar
                                                        </a>
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{client.type}</TableCell>
                                        <TableCell>
                                            <Badge variant={client.status === 'active' ? 'success' : 'secondary'}>
                                                {client.status === 'active' ? 'Activo' : 'Inactivo'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{client.lastService ? new Date(client.lastService).toLocaleDateString() : 'N/A'}</TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => setSelectedClient(client)}
                                                >
                                                    <Eye className="h-4 w-4 mr-1" />
                                                    Ver
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEditDialog(client)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleDeleteClient(client.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Pagination Controls */}
            {filteredClients.length > 0 && (
                <Card>
                    <CardContent className="py-2">
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            onPageChange={setCurrentPage}
                        />
                    </CardContent>
                </Card>
            )}

            {/* Dialog para agregar cliente */}
            <FullScreenDialog
                open={isAddClientOpen}
                onOpenChange={setIsAddClientOpen}
                title="Agregar Nuevo Cliente"
                description="Ingresa los datos del nuevo cliente para registrarlo en el sistema."
            >
                <form onSubmit={handleAddClient} className="space-y-6 pt-2 pb-12">
                    <div className="grid gap-2">
                        <Label htmlFor="name" className="text-base font-semibold">Nombre Empresa / Cliente</Label>
                        <Input id="name" name="name" className="h-12 text-base" value={newClient.name} onChange={handleInputChange} required />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="contact" className="text-base font-semibold">Nombre Contacto <span className="text-muted-foreground font-normal text-sm">(opcional)</span></Label>
                            <Input id="contact" name="contact" className="h-12 text-base" value={newClient.contact} onChange={handleInputChange} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="type" className="text-base font-semibold">Tipo Cliente</Label>
                            <select
                                id="type"
                                name="type"
                                className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
                                value={newClient.type}
                                onChange={handleInputChange}
                            >
                                <option value="Restaurant">Restaurant</option>
                                <option value="Residencial">Residencial</option>
                                <option value="Comercial">Comercial</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="email" className="text-base font-semibold">Email <span className="text-muted-foreground font-normal text-sm">(opcional)</span></Label>
                            <Input id="email" name="email" type="email" className="h-12 text-base" value={newClient.email} onChange={handleInputChange} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="phone" className="text-base font-semibold">Teléfono <span className="text-muted-foreground font-normal text-sm">(opcional)</span></Label>
                            <Input id="phone" name="phone" className="h-12 text-base" value={newClient.phone} onChange={handleInputChange} />
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="grid grid-cols-[2fr_1fr] gap-2">
                            <div className="grid gap-2">
                                <Label htmlFor="address" className="text-base font-semibold">Dirección (Calle)</Label>
                                <Input id="address" name="address" className="h-12 text-base" placeholder="Ej: Las Magnolias 123" value={newClient.address} onChange={handleInputChange} required />
                            </div>
                            <div className="grid gap-2 w-1/3">
                                <Label htmlFor="addressDepto" className="text-base font-semibold">N°/Depto o Casa</Label>
                                <Input id="addressDepto" name="addressDepto" className="h-12 text-base" placeholder="Ej: 474" value={newClient.addressDepto || ''} onChange={handleInputChange} />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="sector" className="text-base font-semibold">Sector <span className="text-muted-foreground font-normal text-sm">(opcional)</span></Label>
                            <select
                                id="sector"
                                name="sector"
                                className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
                                value={newClient.sector}
                                onChange={handleInputChange}
                            >
                                <option value="">Seleccionar...</option>
                                {SECTORS.map((sector) => (
                                    <option key={sector} value={sector}>{sector}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="pt-6 grid grid-cols-2 gap-4">
                        <Button type="button" variant="outline" size="lg" className="h-14 text-base" onClick={() => setIsAddClientOpen(false)}>Cancelar</Button>
                        <Button type="submit" size="lg" className="h-14 text-base">Guardar Cliente</Button>
                    </div>
                </form>
            </FullScreenDialog>

            {/* Dialog para editar cliente */}
            <FullScreenDialog
                open={isEditClientOpen}
                onOpenChange={setIsEditClientOpen}
                title="Editar Cliente"
                description="Modifica la información del cliente."
            >
                <form onSubmit={handleEditClient} className="space-y-6 pt-2 pb-12">
                    <div className="grid gap-2">
                        <Label htmlFor="edit-name" className="text-base font-semibold">Nombre Empresa / Cliente</Label>
                        <Input id="edit-name" name="name" className="h-12 text-base" value={newClient.name} onChange={handleInputChange} required />
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-contact" className="text-base font-semibold">Nombre Contacto <span className="text-muted-foreground font-normal text-sm">(opcional)</span></Label>
                            <Input id="edit-contact" name="contact" className="h-12 text-base" value={newClient.contact} onChange={handleInputChange} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-type" className="text-base font-semibold">Tipo Cliente</Label>
                            <select
                                id="edit-type"
                                name="type"
                                className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
                                value={newClient.type}
                                onChange={handleInputChange}
                            >
                                <option value="Restaurant">Restaurant</option>
                                <option value="Residencial">Residencial</option>
                                <option value="Comercial">Comercial</option>
                            </select>
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-email" className="text-base font-semibold">Email <span className="text-muted-foreground font-normal text-sm">(opcional)</span></Label>
                            <Input id="edit-email" name="email" type="email" className="h-12 text-base" value={newClient.email} onChange={handleInputChange} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-phone" className="text-base font-semibold">Teléfono</Label>
                            <Input id="edit-phone" name="phone" className="h-12 text-base" value={newClient.phone} onChange={handleInputChange} required />
                        </div>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="grid grid-cols-[2fr_1fr] gap-2">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-address" className="text-base font-semibold">Dirección (Calle)</Label>
                                <Input id="edit-address" name="address" className="h-12 text-base" value={newClient.address} onChange={handleInputChange} required />
                            </div>
                            <div className="grid gap-2 w-1/3">
                                <Label htmlFor="edit-addressDepto" className="text-base font-semibold">N°/Depto o Casa</Label>
                                <Input id="edit-addressDepto" name="addressDepto" className="h-12 text-base" placeholder="Ej: 474" value={newClient.addressDepto || ''} onChange={handleInputChange} />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-sector" className="text-base font-semibold">Sector <span className="text-muted-foreground font-normal text-sm">(opcional)</span></Label>
                            <select
                                id="edit-sector"
                                name="sector"
                                className="flex h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-base"
                                value={newClient.sector}
                                onChange={handleInputChange}
                            >
                                <option value="">Seleccionar...</option>
                                {SECTORS.map((sector) => (
                                    <option key={sector} value={sector}>{sector}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="pt-6 grid grid-cols-2 gap-4">
                        <Button type="button" variant="outline" size="lg" className="h-14 text-base" onClick={() => setIsEditClientOpen(false)}>Cancelar</Button>
                        <Button type="submit" size="lg" className="h-14 text-base">Guardar Cambios</Button>
                    </div>
                </form>
            </FullScreenDialog>
        </div>
    );
};
