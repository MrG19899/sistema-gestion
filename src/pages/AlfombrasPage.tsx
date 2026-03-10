import React, { useState } from 'react';
import { Plus, Ruler, Truck, Inbox, CheckCircle, Tag, Camera, Image as ImageIcon, Trash2 } from 'lucide-react';
import { ClientAutocomplete } from '../components/ClientAutocomplete';
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

import { supabase } from '../lib/supabase';
import { Pagination } from '../components/ui/pagination';
import { SECTORS } from '../lib/constants';
import { useAuth } from '../contexts/AuthContext';

// Interfaz que engloba a Supabase
export interface ServicioAlfombra {
    id: string;
    cliente_id: string;
    cliente_nombre: string;
    tipo_servicio: string; // lana, pelo corto, etc
    dimensiones: string;
    ancho: number | null;
    largo: number | null;
    m2: number | null;
    valor_m2: number | null;
    valor_total: number | null;
    fecha_recepcion: string | null;
    fecha_entrega: string | null;
    ubicacion: string;
    estado: string; // espera, in_process, ready, delivered
    photo_url?: string | null;
    is_pickup?: boolean;
    sector?: string;
    cliente_telefono?: string;
    cliente_direccion?: string;
    pickup_date?: string;
}

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'recepcionada':
        case 'received':
            return <Badge variant="secondary">En Recepción</Badge>;
        case 'in_process':
            return <Badge variant="default">En Proceso</Badge>;
        case 'ready':
            return <Badge variant="success">Listo para Entrega</Badge>;
        case 'delivered':
            return <Badge variant="secondary" className="bg-gray-100 text-gray-800">Entregado</Badge>;
        case 'scheduled_pickup':
            return <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">Retiro Programado</Badge>;
        default:
            return <Badge variant="outline">{status}</Badge>;
    }
};

// Helper to calculate 5 business days
const addBusinessDays = (date: Date, days: number) => {
    const result = new Date(date);
    let count = 0;
    while (count < days) {
        result.setDate(result.getDate() + 1);
        if (result.getDay() !== 0 && result.getDay() !== 6) { // Skip Sunday (0) and Saturday (6)
            count++;
        }
    }
    return result;
};

export const AlfombrasPage = () => {
    const { profile } = useAuth();
    const isWorker = profile?.rol === 'worker';

    const [rugs, setRugs] = useState<ServicioAlfombra[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 12;

    const [viewPhotoIndex, setViewPhotoIndex] = useState<number | null>(null);

    // Fetch desde Supabase
    React.useEffect(() => {
        fetchRugs();
    }, []);

    const fetchRugs = async () => {
        const { data, error } = await supabase
            .from('servicios_alfombras')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) {
            const mappedData = (data as ServicioAlfombra[]);

            // Batch-query de teléfonos desde la tabla clientes
            const ids = [...new Set(mappedData.map(r => r.cliente_id).filter(Boolean))];
            if (ids.length > 0) {
                const { data: clientesData } = await supabase
                    .from('clientes')
                    .select('id, phone, address')
                    .in('id', ids);
                const phoneMap: Record<string, string> = {};
                const addressMap: Record<string, string> = {};
                clientesData?.forEach((c: any) => {
                    phoneMap[c.id] = c.phone || '';
                    addressMap[c.id] = c.address || '';
                });
                mappedData.forEach(r => {
                    r.cliente_telefono = phoneMap[r.cliente_id] || '';
                    r.cliente_direccion = addressMap[r.cliente_id] || '';
                });
            }
            setRugs(mappedData);
        }
    };

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sectorFilter, setSectorFilter] = useState('all');

    const filteredRugs = rugs.filter(rug => {
        const matchesSearch = (rug.cliente_nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            rug.id.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' ||
            rug.estado === statusFilter ||
            (statusFilter === 'recepcionada' && rug.estado === 'received');
        const matchesSector = sectorFilter === 'all' || (rug.sector && rug.sector === sectorFilter);

        return matchesSearch && matchesStatus && matchesSector;
    });

    const totalPages = Math.ceil(filteredRugs.length / itemsPerPage);
    const paginatedRugs = filteredRugs.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const rugsWithPhotos = filteredRugs.filter(r => !!r.photo_url);

    const [isReceiveOpen, setIsReceiveOpen] = useState(false);
    const [selectedRug, setSelectedRug] = useState<ServicioAlfombra | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [newRug, setNewRug] = useState({
        cliente_id: '',
        cliente_nombre: '',
        dims: '',
        type: '',
        notes: '',
        isPickup: false,
        pickupDate: '',
        pickupTime: '',
        sector: '',
        direccion: '',
        telefono: ''
    });
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setNewRug(prev => ({ ...prev, [name]: value }));
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setPhotoPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleReceiveRug = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!newRug.cliente_id) {
            alert('Debe buscar un cliente real en el autocompletar.');
            return;
        }

        const today = new Date();
        const deliveryDate = addBusinessDays(today, 5);
        let recepcionFinal = today.toISOString();
        if (newRug.isPickup && newRug.pickupDate) {
            const timeStr = newRug.pickupTime || '09:00';
            recepcionFinal = new Date(`${newRug.pickupDate}T${timeStr}:00`).toISOString();
        }

        // Carga de archivo a Storage no implementada, simulamos o dejamos en null la foto_url
        // En una app real, foto se subiría a Supabase Storage y retornaríamos su URL pública.

        const insertData = {
            cliente_id: newRug.cliente_id,
            cliente_nombre: newRug.cliente_nombre, // Se envía a DB ahora
            tipo_servicio: newRug.type || 'Estandar',
            dimensiones: newRug.dims,
            fecha_recepcion: recepcionFinal,
            fecha_entrega: newRug.isPickup ? null : deliveryDate.toISOString(),
            estado: newRug.isPickup ? 'scheduled_pickup' : 'recepcionada',
            ubicacion: newRug.isPickup ? (newRug.direccion || 'Domicilio (Sin detallar)') : 'Recepción',
            sector: newRug.sector,
            is_pickup: newRug.isPickup,
            pickup_date: newRug.pickupDate || null,
            photo_url: photoPreview
        };

        const { data, error } = await supabase
            .from('servicios_alfombras')
            .insert([insertData])
            .select('*');

        if (error) {
            alert('Error grabando: ' + error.message);
            return;
        }

        if (data && data.length > 0) {
            setRugs([data[0], ...rugs]);
            setIsReceiveOpen(false);
            setNewRug({ cliente_id: '', cliente_nombre: '', dims: '', type: '', notes: '', isPickup: false, pickupDate: '', pickupTime: '', sector: '', direccion: '', telefono: '' });
            setPhotoPreview(null);
        }
    };

    const handleConfirmPickup = async (id: string) => {
        const today = new Date();
        const deliveryDate = addBusinessDays(today, 5);

        const { error } = await supabase
            .from('servicios_alfombras')
            .update({
                estado: 'recepcionada',
                fecha_recepcion: today.toISOString(),
                ubicacion: 'Planta',
                fecha_entrega: deliveryDate.toISOString()
            })
            .eq('id', id);

        if (!error) {
            setRugs(rugs.map(r =>
                r.id === id
                    ? {
                        ...r,
                        estado: 'recepcionada',
                        fecha_recepcion: today.toISOString(),
                        ubicacion: 'Planta',
                        fecha_entrega: deliveryDate.toISOString()
                    }
                    : r
            ));
        }
    };

    const handleUpdateStatus = async (status: string) => {
        if (!selectedRug) return;

        const { error } = await supabase
            .from('servicios_alfombras')
            .update({ estado: status })
            .eq('id', selectedRug.id);

        if (!error) {
            const updatedRugs = rugs.map(r =>
                r.id === selectedRug.id ? { ...r, estado: status } : r
            );
            setRugs(updatedRugs);
            setSelectedRug(null);
        }
    };

    const handleUpdateRug = async () => {
        if (!selectedRug) return;

        const { error } = await supabase
            .from('servicios_alfombras')
            .update({
                cliente_id: selectedRug.cliente_id,
                cliente_nombre: selectedRug.cliente_nombre,
                tipo_servicio: selectedRug.tipo_servicio,
                fecha_recepcion: selectedRug.fecha_recepcion,
                fecha_entrega: selectedRug.fecha_entrega,
                estado: selectedRug.estado, photo_url: photoPreview || selectedRug.photo_url
            })
            .eq('id', selectedRug.id);

        if (!error) {
            setRugs(rugs.map(r => r.id === selectedRug.id ? { ...selectedRug, photo_url: photoPreview || selectedRug.photo_url } : r));
            setIsEditing(false);
            setSelectedRug(null);
            setPhotoPreview(null);
        }
    };

    const handleDeleteRug = async (id: string) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este registro permanentemente?')) {
            const { error } = await supabase
                .from('servicios_alfombras')
                .delete()
                .eq('id', id);

            if (!error) {
                setRugs(rugs.filter(r => r.id !== id));
            }
        }
    };

    const handleCloseDetails = () => {
        setSelectedRug(null);
        setIsEditing(false);
    };

    const getTrafficLightColor = (receivedDate: string) => {
        const daysInShop = Math.floor((new Date().getTime() - new Date(receivedDate).getTime()) / (1000 * 3600 * 24));
        if (daysInShop <= 2) return 'bg-green-100 text-green-800 border-green-200';
        if (daysInShop <= 4) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        return 'bg-red-100 text-red-800 border-red-200';
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Alfombras en Taller</h2>
                    <p className="text-muted-foreground">
                        Control de inventario y estado de alfombras en planta.
                    </p>
                </div>
                <Button onClick={() => setIsReceiveOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Nueva Recepción
                </Button>

                <FullScreenDialog
                    open={isReceiveOpen}
                    onOpenChange={setIsReceiveOpen}
                    title="Recepcionar Alfombra"
                    description="Ingresa los detalles. La fecha de entrega se calculará automáticamente (5 días hábiles)."
                >
                    <form onSubmit={handleReceiveRug} className="space-y-6 pb-12">
                        <div className="flex flex-col space-y-2 mb-4">
                            <div className="relative w-full h-40 bg-muted rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25">
                                {photoPreview ? (
                                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                                ) : (
                                    <div className="text-center p-4">
                                        <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2 opacity-30" />
                                        <p className="text-sm text-muted-foreground">Opcional: Adjunte foto de recepción</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex gap-2 w-full">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1 flex gap-2 h-12 relative overflow-hidden bg-blue-50/50 hover:bg-blue-100 border-blue-200 text-blue-700"
                                >
                                    <Camera className="w-4 h-4" />
                                    <span className="font-bold">Cámara</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={handlePhotoChange}
                                    />
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="flex-1 flex gap-2 h-12 relative overflow-hidden bg-purple-50/50 hover:bg-purple-100 border-purple-200 text-purple-700"
                                >
                                    <ImageIcon className="w-4 h-4" />
                                    <span className="font-bold">Galería</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={handlePhotoChange}
                                    />
                                </Button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="client" className="text-base font-semibold">Cliente</Label>
                            <ClientAutocomplete
                                onSelect={(client) => {
                                    setNewRug(prev => ({
                                        ...prev,
                                        cliente_nombre: client.name,
                                        cliente_id: client.id,
                                        sector: client.sector || '',
                                        direccion: client.address || ''
                                    }));
                                }}
                                selectedClientName={newRug.cliente_nombre}
                            />
                        </div>

                        <div className="flex items-center space-x-3 p-4 bg-slate-50 border rounded-xl">
                            <input
                                type="checkbox"
                                id="isPickup"
                                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                checked={newRug.isPickup}
                                onChange={(e) => setNewRug({ ...newRug, isPickup: e.target.checked })}
                            />
                            <Label htmlFor="isPickup" className="cursor-pointer text-base font-semibold">Solicitud de Retiro a Domicilio</Label>
                        </div>

                        {newRug.isPickup && (
                            <div className="grid gap-4 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="pickupDate" className="text-sm font-medium">Fecha Retiro</Label>
                                        <Input
                                            type="date"
                                            id="pickupDate"
                                            name="pickupDate"
                                            className="h-12 bg-white"
                                            value={newRug.pickupDate}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="pickupTime" className="text-sm font-medium">Bloque Horario</Label>
                                        <Input
                                            type="text"
                                            id="pickupTime"
                                            name="pickupTime"
                                            className="h-12 bg-white"
                                            placeholder="10:00 - 12:00"
                                            value={newRug.pickupTime}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="direccion" className="flex items-center gap-1 text-sm font-medium">
                                        📍 Dirección Exacta de Retiro
                                    </Label>
                                    <Input
                                        type="text"
                                        id="direccion"
                                        name="direccion"
                                        className="h-12 bg-white"
                                        placeholder="Ej: Las Rosas 123, Concepción"
                                        value={newRug.direccion}
                                        onChange={handleInputChange}
                                    />
                                    <p className="text-xs text-muted-foreground">Pre-cargada desde cliente, modificable si retira en otro lado.</p>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="sector" className="text-base font-semibold">Sector Logístico</Label>
                                <select
                                    id="sector"
                                    name="sector"
                                    className="flex h-12 w-full rounded-md border border-input bg-white px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                    value={newRug.sector}
                                    onChange={handleInputChange}
                                >
                                    <option value="">Seleccionar sector...</option>
                                    {SECTORS.map((sector) => (
                                        <option key={sector} value={sector}>
                                            {sector}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="type" className="text-base font-semibold">Tipo</Label>
                                    <select
                                        id="type"
                                        name="type"
                                        className="flex h-12 w-full rounded-md border border-input bg-white px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                        value={newRug.type}
                                        onChange={handleInputChange}
                                    >
                                        <option value="Pelo Corto">Pelo corto</option>
                                        <option value="Pelo Largo">Pelo largo</option>
                                        <option value="Lana">Lana</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dims" className="text-base font-semibold">Dimensiones</Label>
                                    <Input
                                        id="dims"
                                        name="dims"
                                        className="h-12 bg-white"
                                        placeholder="Ej: 1.60x230"
                                        value={newRug.dims}
                                        onChange={handleInputChange}
                                        list="common-dims"
                                    />
                                    <datalist id="common-dims">
                                        <option value="1.60x230" />
                                        <option value="2.30x2.90" />
                                        <option value="2.20x1.50" />
                                    </datalist>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl bg-blue-50 p-4 border border-blue-100 flex flex-col items-center justify-center text-center">
                            <p className="text-sm font-semibold text-blue-800 mb-1">Fecha Estimada de Entrega:</p>
                            <p className="text-lg font-bold text-blue-900">{addBusinessDays(new Date(), 5).toLocaleDateString()}</p>
                        </div>

                        <div className="pt-4">
                            <Button type="submit" size="lg" className="h-14 w-full text-lg font-bold bg-green-600 hover:bg-green-700 shadow-lg">
                                Ingresar Alfombra
                            </Button>
                        </div>
                    </form>
                </FullScreenDialog>

                <FullScreenDialog
                    open={!!selectedRug}
                    onOpenChange={(open) => !open && handleCloseDetails()}
                    title="Actualizar Estado"
                    description={`Gestionar flujo de la alfombra ${selectedRug?.id}`}
                >
                    {selectedRug && (
                        <div className="space-y-4 pt-2">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <Label className="font-bold block mb-1">Cliente:</Label>
                                    {isEditing ? (
                                        <ClientAutocomplete
                                            onSelect={(client) => setSelectedRug({
                                                ...selectedRug,
                                                cliente_id: client.id,
                                                cliente_nombre: client.name
                                            })}
                                            selectedClientName={selectedRug.cliente_nombre || ''}
                                        />
                                    ) : (
                                        <div className="flex h-10 items-center px-3 border rounded-md bg-muted/50">{selectedRug.cliente_nombre}</div>
                                    )}
                                </div>
                                <div>
                                    <Label className="font-bold block mb-1">Tipo:</Label>
                                    {isEditing ? (
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={selectedRug.tipo_servicio}
                                            onChange={(e) => setSelectedRug({ ...selectedRug, tipo_servicio: e.target.value })}
                                        >
                                            <option value="Pelo Corto">Pelo corto</option>
                                            <option value="Pelo Largo">Pelo largo</option>
                                            <option value="Lana">Lana</option>
                                            <option value="Estandar">Estandar</option>
                                        </select>
                                    ) : (
                                        <div className="flex h-10 items-center px-3 border rounded-md bg-muted/50">{selectedRug.tipo_servicio}</div>
                                    )}
                                </div>
                                <div>
                                    <Label className="font-bold block mb-1">Ingreso:</Label>
                                    {isEditing ? (
                                        <Input
                                            type="date"
                                            className="h-10 text-sm bg-white"
                                            value={selectedRug.fecha_recepcion ? selectedRug.fecha_recepcion.split('T')[0] : ''}
                                            onChange={(e) => setSelectedRug({ ...selectedRug, fecha_recepcion: e.target.value })}
                                        />
                                    ) : (
                                        <div className="flex h-10 items-center px-3 border rounded-md bg-muted/50">{selectedRug.fecha_recepcion ? new Date(selectedRug.fecha_recepcion).toLocaleDateString() : '-'}</div>
                                    )}
                                </div>
                                <div>
                                    <Label className="font-bold block mb-1">📏 Dimensiones:</Label>
                                    {isEditing ? (
                                        <Input
                                            type="text"
                                            className="h-10 text-sm"
                                            placeholder="Ej: 1.60x230"
                                            value={selectedRug.dimensiones || ''}
                                            onChange={(e) => setSelectedRug({ ...selectedRug, dimensiones: e.target.value })}
                                        />
                                    ) : (
                                        <div className="flex h-10 items-center px-3 border rounded-md bg-muted/50 text-sm text-muted-foreground">{selectedRug.dimensiones || 'Sin registrar'}</div>
                                    )}
                                </div>
                                <div className="col-span-2">
                                    <Label className="font-bold block mb-1">📍 Dirección de Entrega:</Label>
                                    <p className="text-xs text-muted-foreground mb-1">Pre-cargada desde el cliente. Modificable si la entrega es en otro domicilio.</p>
                                    {isEditing ? (
                                        <Input
                                            type="text"
                                            className="h-10 text-sm"
                                            placeholder="Ej: Las Rosas 123, Concepción"
                                            value={(selectedRug as any).direccion_entrega || selectedRug.ubicacion || ''}
                                            onChange={(e) => setSelectedRug({ ...selectedRug, ubicacion: e.target.value })}
                                        />
                                    ) : (
                                        <div className="min-h-10 flex items-center px-3 py-2 border rounded-md bg-muted/50 text-sm">{(selectedRug as any).direccion_entrega || selectedRug.ubicacion || 'Sin dirección registrada'}</div>
                                    )}
                                </div>
                            </div>
                            {selectedRug.photo_url || isEditing ? (
                                <div className="space-y-2 mt-2">
                                    <div className="h-40 w-full bg-muted rounded-md overflow-hidden relative border border-dashed border-gray-300">
                                        {(photoPreview || selectedRug.photo_url) ? (
                                            <img src={photoPreview || selectedRug.photo_url || undefined} alt="Evidencia" className="w-full h-full object-cover bg-black/5" />
                                        ) : (
                                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                                                <ImageIcon className="h-8 w-8 mb-2 opacity-50" />
                                                <span className="text-sm">Sin evidencia fotográfica</span>
                                            </div>
                                        )}
                                    </div>
                                    {isEditing && (
                                        <div className="flex flex-row gap-2 w-full">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="flex-1 flex gap-2 h-10 relative overflow-hidden bg-blue-50/50 hover:bg-blue-100 border-blue-200 text-blue-700"
                                            >
                                                <Camera className="w-4 h-4" />
                                                <span className="text-xs font-bold">Tomar Foto</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    capture="environment"
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    onChange={handlePhotoChange}
                                                />
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="flex-1 flex gap-2 h-10 relative overflow-hidden bg-purple-50/50 hover:bg-purple-100 border-purple-200 text-purple-700"
                                            >
                                                <ImageIcon className="w-4 h-4" />
                                                <span className="text-xs font-bold">Galería</span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    onChange={handlePhotoChange}
                                                />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            ) : null}
                            <div className="pt-4 border-t mt-4">
                                <Label className="mb-2 block font-bold">Estado Operativo:</Label>
                                {isEditing ? (
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={selectedRug.estado}
                                        onChange={(e) => setSelectedRug({ ...selectedRug, estado: e.target.value })}
                                    >
                                        <option value="recepcionada">En Recepción</option>
                                        <option value="in_process">En Proceso</option>
                                        <option value="ready">Listo para Entrega</option>
                                        <option value="delivered">Entregado</option>
                                    </select>
                                ) : (
                                    <div className="grid grid-cols-1 gap-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                variant={selectedRug.estado === 'recepcionada' ? 'default' : 'outline'}
                                                onClick={() => handleUpdateStatus('recepcionada')}
                                                size="sm"
                                            >
                                                En Recepción
                                            </Button>
                                            <Button
                                                variant={selectedRug.estado === 'in_process' ? 'default' : 'outline'}
                                                onClick={() => handleUpdateStatus('in_process')}
                                                size="sm"
                                                className={selectedRug.estado === 'recepcionada' ? "border-blue-500 text-blue-600 hover:bg-blue-50" : ""}
                                            >
                                                Pasar a Proceso
                                            </Button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <Button
                                                variant={selectedRug.estado === 'ready' ? 'default' : 'outline'}
                                                onClick={() => handleUpdateStatus('ready')}
                                                size="sm"
                                                className={selectedRug.estado === 'ready' ? "bg-green-600 hover:bg-green-700 text-white" : "text-green-600 border-green-200 hover:bg-green-50"}
                                            >
                                                Listo para Entrega
                                            </Button>
                                            <Button
                                                variant={selectedRug.estado === 'delivered' ? 'default' : 'outline'}
                                                onClick={() => handleUpdateStatus('delivered')}
                                                size="sm"
                                                className={selectedRug.estado === 'delivered' ? "bg-gray-800 text-white" : "border-gray-300 text-gray-600 hover:bg-gray-50"}
                                            >
                                                Entregado
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="pt-4 flex justify-end gap-2">
                                {isEditing ? (
                                    <>
                                        <Button variant="outline" onClick={() => setIsEditing(false)}>Cancelar</Button>
                                        <Button onClick={handleUpdateRug}>Guardar Cambios</Button>
                                    </>
                                ) : (
                                    <>
                                        <Button variant="outline" onClick={handleCloseDetails}>Cerrar</Button>
                                        <Button variant="secondary" onClick={() => setIsEditing(true)}>Editar Detalles</Button>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </FullScreenDialog>
            </div>

            <FullScreenDialog
                open={viewPhotoIndex !== null}
                onOpenChange={() => setViewPhotoIndex(null)}
                hideHeader
                className="bg-black/95"
                contentClassName="max-w-4xl mx-auto p-0 flex items-center justify-center relative w-full h-[100dvh]"
            >
                {viewPhotoIndex !== null && rugsWithPhotos[viewPhotoIndex] && (
                    <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
                        <div className="relative flex items-center justify-center w-full h-full max-h-[80vh]">
                            {viewPhotoIndex > 0 && (
                                <Button
                                    className="absolute left-2 md:-left-12 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 h-12 w-12 z-10 flex items-center justify-center"
                                    onClick={() => setViewPhotoIndex(viewPhotoIndex - 1)}
                                >
                                    <span className="text-xl font-bold">{"<"}</span>
                                </Button>
                            )}
                            <img
                                src={rugsWithPhotos[viewPhotoIndex].photo_url || ''}
                                alt="Vista Ampliada"
                                className="max-w-full max-h-full object-contain rounded-md shadow-2xl"
                            />
                            {viewPhotoIndex < rugsWithPhotos.length - 1 && (
                                <Button
                                    className="absolute right-2 md:-right-12 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 h-12 w-12 z-10 flex items-center justify-center"
                                    onClick={() => setViewPhotoIndex(viewPhotoIndex + 1)}
                                >
                                    <span className="text-xl font-bold">{">"}</span>
                                </Button>
                            )}
                        </div>

                        <div className="absolute bottom-6 bg-black/80 text-white px-6 py-2 rounded-full text-sm font-medium shadow-lg flex items-center gap-3">
                            <span>{rugsWithPhotos[viewPhotoIndex].cliente_nombre}</span>
                            <span className="opacity-50">|</span>
                            <span className="opacity-75">ID: {rugsWithPhotos[viewPhotoIndex].id.substring(0, 8)}</span>
                            <span className="opacity-50">|</span>
                            <span className="text-blue-300 font-bold">{viewPhotoIndex + 1} de {rugsWithPhotos.length}</span>
                        </div>

                        <Button
                            className="absolute top-4 right-4 bg-black/60 hover:bg-black/80 text-white rounded-full p-2 h-10 w-10 flex items-center justify-center"
                            onClick={() => setViewPhotoIndex(null)}
                        >
                            ✕
                        </Button>
                    </div>
                )}
            </FullScreenDialog>

            <Card>
                <CardHeader>
                    <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-4">
                        <div>
                            <CardTitle>Inventario Activo</CardTitle>
                            <CardDescription>
                                Alfombras actualmente en proceso o espera.
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2 items-center w-full xl:w-auto">
                            <Input
                                placeholder="Buscar por cliente o ID..."
                                className="w-full md:w-64"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                            <div className="flex flex-wrap gap-2 w-full md:w-auto">
                                <select
                                    className="flex-1 md:flex-none h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={statusFilter}
                                    onChange={(e) => {
                                        setStatusFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value="all">Todos los Estados</option>
                                    <option value="scheduled_pickup">Por Retirar</option>
                                    <option value="recepcionada">En Recepción</option>
                                    <option value="in_process">En Proceso</option>
                                    <option value="ready">Listas</option>
                                    <option value="delivered">Entregadas</option>
                                </select>
                                <select
                                    className="flex-1 md:flex-none h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={sectorFilter}
                                    onChange={(e) => {
                                        setSectorFilter(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <option value="all">Todos los Sectores</option>
                                    {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Dirección / Sector</TableHead>
                                <TableHead>Tipo / Dimensiones</TableHead>
                                <TableHead>Fecha / Hora</TableHead>
                                <TableHead>Estado Tiempo</TableHead>
                                <TableHead>Ubicación</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right min-w-[120px]">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedRugs.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-mono text-xs font-bold text-primary">
                                        <div className="flex items-center gap-2">
                                            {item.photo_url ? (
                                                <div
                                                    className="h-8 w-8 rounded overflow-hidden cursor-pointer border border-border hover:border-blue-500 transition-colors shrink-0"
                                                    onClick={() => {
                                                        const idx = rugsWithPhotos.findIndex(r => r.id === item.id);
                                                        setViewPhotoIndex(idx !== -1 ? idx : null);
                                                    }}
                                                >
                                                    <img src={item.photo_url} alt="Miniatura" className="h-full w-full object-cover" />
                                                </div>
                                            ) : (
                                                <ImageIcon className="h-4 w-4 text-muted-foreground/30" />
                                            )}
                                            {item.id}
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        <div className="flex flex-col">
                                            <span>{item.cliente_nombre}</span>
                                            {item.cliente_telefono ? (
                                                <div className="flex flex-col gap-1 mt-1">
                                                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{item.cliente_telefono}</span>
                                                    <div className="flex items-center gap-1.5">
                                                        <a
                                                            href={(() => {
                                                                let p = item.cliente_telefono.replace(/\D/g, '');
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
                                                                let p = item.cliente_telefono.replace(/\D/g, '');
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
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground mt-1">Sin teléfono</span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-sm">
                                            <a
                                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.cliente_direccion || item.ubicacion} ${item.sector || ''}`)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="hover:text-blue-600 hover:underline flex items-center gap-1 leading-tight"
                                                title="Abrir en Maps"
                                            >
                                                {item.cliente_direccion || 'Sin dirección registrada'}
                                            </a>
                                            <span className="text-muted-foreground text-xs">{item.sector || ''}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-sm">
                                            <span>{item.tipo_servicio}</span>
                                            <span className="text-muted-foreground text-xs">{item.dimensiones || '-'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {item.estado === 'scheduled_pickup' ? (
                                            <div className="flex flex-col text-sm">
                                                <span className="flex items-center text-blue-600 font-medium">
                                                    <Truck className="mr-1 h-3 w-3" /> {item.fecha_recepcion ? new Date(item.fecha_recepcion).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : '-'}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col text-sm">
                                                <span className="flex items-center">
                                                    <Inbox className="mr-1 h-3 w-3 text-muted-foreground" />
                                                    {item.fecha_recepcion ? new Date(item.fecha_recepcion).toLocaleDateString() : '-'}
                                                </span>
                                            </div>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {item.estado === 'scheduled_pickup' ? (
                                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                                Programado
                                            </span>
                                        ) : (
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${item.fecha_recepcion ? getTrafficLightColor(item.fecha_recepcion) : ''}`}>
                                                {item.fecha_recepcion ? `${Math.floor((new Date().getTime() - new Date(item.fecha_recepcion).getTime()) / (1000 * 3600 * 24))} días` : '-'}
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center text-sm text-muted-foreground">
                                            <Tag className="mr-1 h-3 w-3" />
                                            {item.ubicacion}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {getStatusBadge(item.estado)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setSelectedRug(item)}
                                            >
                                                Actualizar
                                            </Button>
                                            {item.estado === 'scheduled_pickup' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="hover:bg-green-50 hover:text-green-700"
                                                    title="Confirmar Retiro (Ingreso a Planta)"
                                                    onClick={() => handleConfirmPickup(item.id)}
                                                >
                                                    <Inbox className="h-4 w-4 text-green-600" />
                                                </Button>
                                            )}
                                            {!isWorker && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    onClick={() => handleDeleteRug(item.id)}
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
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                    />
                </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Por Retirar</CardTitle>
                        <Truck className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {rugs.filter(r => r.estado === 'scheduled_pickup').length}
                        </div>
                        <p className="text-xs text-muted-foreground">Logística pendiente</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">En Taller</CardTitle>
                        <Inbox className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {rugs.filter(r => r.estado !== 'delivered' && r.estado !== 'scheduled_pickup').length}
                        </div>
                        <p className="text-xs text-muted-foreground">Inventario físico real</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">En Recepción</CardTitle>
                        <Inbox className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {rugs.filter(r => r.estado === 'recepcionada' || r.estado === 'received').length}
                        </div>
                        <p className="text-xs text-muted-foreground">Por comenzar lavado</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">En Proceso</CardTitle>
                        <Ruler className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {rugs.filter(r => r.estado === 'in_process').length}
                        </div>
                        <p className="text-xs text-muted-foreground">Lavado / Secado</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Listas</CardTitle>
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {rugs.filter(r => r.estado === 'ready').length}
                        </div>
                        <p className="text-xs text-muted-foreground">Esperando entrega</p>
                    </CardContent>
                </Card>
            </div>

        </div >
    );
};
