import { useState, useEffect } from 'react';
// import { Plus, Search, Eye, Pencil, UserX, UserCheck, ArrowLeft, Trash2 } from 'lucide-react';
const Plus = ({ className }: { className?: string }) => <span className={className}>+</span>;
const Search = ({ className }: { className?: string }) => <span className={className}>🔍</span>;
const Eye = ({ className }: { className?: string }) => <span className={className}>👁️</span>;
const Pencil = ({ className }: { className?: string }) => <span className={className}>✏️</span>;
const UserX = ({ className }: { className?: string }) => <span className={className}>🚫</span>;
const UserCheck = ({ className }: { className?: string }) => <span className={className}>✅</span>;
const ArrowLeft = ({ className }: { className?: string }) => <span className={className}>⬅️</span>;
const Trash2 = ({ className }: { className?: string }) => <span className={className}>🗑️</span>;
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
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '../components/ui/tabs';

// import { mockClients } from '../data/mockData';
import { SECTORS } from '../lib/constants';
import { TrapList } from '../components/TrapList';
import { Pagination } from '../components/ui/pagination';
import type { Trampa, Cliente, ClienteType, ClienteEstado } from '../types';
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

    const [traps, setTraps] = useState<Trampa[]>([]);
    const [isAddClientOpen, setIsAddClientOpen] = useState(false);
    const [isEditClientOpen, setIsEditClientOpen] = useState(false);
    const [selectedClient, setSelectedClient] = useState<Cliente | null>(null);
    const [showInactive, setShowInactive] = useState(false);
    const [serviceFilter, setServiceFilter] = useState<string>('all');

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

    const handleTrapAdded = (trap: Trampa) => {
        setTraps([...traps, trap]);
    };

    const handleTrapUpdated = (updatedTrap: Trampa) => {
        setTraps(traps.map(t => t.id === updatedTrap.id ? updatedTrap : t));
    };

    const handleTrapDeleted = (trapId: string) => {
        setTraps(traps.filter(t => t.id !== trapId));
    };

    // Vista de detalle del cliente
    if (selectedClient && !isEditClientOpen) {
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

                <Tabs defaultValue="info" className="w-full">
                    <TabsList className="flex w-full overflow-x-auto justify-start sm:justify-center">
                        <TabsTrigger value="info" className="text-xs sm:text-sm flex-shrink-0">Información</TabsTrigger>
                        <TabsTrigger value="traps" className="text-xs sm:text-sm flex-shrink-0">Trampas</TabsTrigger>
                        <TabsTrigger value="services" className="text-xs sm:text-sm flex-shrink-0">Servicios</TabsTrigger>
                        <TabsTrigger value="certificates" className="text-xs sm:text-sm flex-shrink-0">Certificados</TabsTrigger>
                    </TabsList>

                    <TabsContent value="info" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Datos del Cliente</CardTitle>
                                <CardDescription>Información de contacto y detalles</CardDescription>
                            </CardHeader>
                            <CardContent className="grid gap-4">
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-muted-foreground">Nombre Empresa</Label>
                                        <p className="font-medium">{selectedClient.name}</p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">Tipo</Label>
                                        <p className="font-medium">{selectedClient.type}</p>
                                    </div>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-muted-foreground">Contacto</Label>
                                        <p className="font-medium">{selectedClient.contact}</p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">Email</Label>
                                        <p className="font-medium">{selectedClient.email}</p>
                                    </div>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-muted-foreground">Teléfono</Label>
                                        <p className="font-medium">{selectedClient.phone}</p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">Estado</Label>
                                        <Badge variant={selectedClient.status === 'active' ? 'success' : 'secondary'}>
                                            {selectedClient.status === 'active' ? 'Activo' : 'Inactivo'}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-muted-foreground">Dirección</Label>
                                        <p className="font-medium">{selectedClient.address}</p>
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground">Sector</Label>
                                        <p className="font-medium">{selectedClient.sector || 'Sin Asignar'}</p>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Último Servicio</Label>
                                    <p className="font-medium">{selectedClient.lastService ? new Date(selectedClient.lastService).toLocaleDateString() : 'Sin servicio'}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="traps">
                        <Card>
                            <CardContent className="pt-6">
                                <TrapList
                                    clientId={selectedClient.id}
                                    clientName={selectedClient.name}
                                    traps={traps}
                                    onTrapAdded={handleTrapAdded}
                                    onTrapUpdated={handleTrapUpdated}
                                    onTrapDeleted={handleTrapDeleted}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="services">
                        <Card>
                            <CardHeader>
                                <CardTitle>Historial de Servicios</CardTitle>
                                <CardDescription>Próximamente...</CardDescription>
                            </CardHeader>
                        </Card>
                    </TabsContent>

                    <TabsContent value="certificates">
                        <Card>
                            <CardHeader>
                                <CardTitle>Certificados Emitidos</CardTitle>
                                <CardDescription>Próximamente...</CardDescription>
                            </CardHeader>
                        </Card>
                    </TabsContent>
                </Tabs>
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
                                onClick={() => {
                                    setShowInactive(!showInactive);
                                    setCurrentPage(1);
                                }}
                                className="w-full sm:w-auto"
                            >
                                {showInactive ? 'Ocultar Inactivos' : 'Mostrar Inactivos'}
                            </Button>
                            <select
                                className="h-10 w-full sm:w-auto rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={serviceFilter}
                                onChange={(e) => {
                                    setServiceFilter(e.target.value);
                                    setCurrentPage(1); // Reset page on filter change
                                }}
                            >
                                <option value="all">Todos los Servicios</option>
                                <option value="cleaning">Limpieza</option>
                                <option value="rugs">Alfombras</option>
                                <option value="pest-control">Control de Plagas</option>
                            </select>
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
                            <Label htmlFor="phone" className="text-base font-semibold">Teléfono</Label>
                            <Input id="phone" name="phone" className="h-12 text-base" value={newClient.phone} onChange={handleInputChange} required />
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
