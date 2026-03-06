import { useState } from 'react';
import { Plus, Edit2, MapPin, Calendar, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from './ui/table';
import type { Trampa } from '../types';

interface TrapListProps {
    clientId: string;
    clientName: string;
    traps: Trampa[];
    onTrapAdded: (trap: Trampa) => void;
    onTrapUpdated: (trap: Trampa) => void;
    onTrapDeleted?: (trapId: string) => void; // Make optional if not used
}

export const TrapList = ({
    clientId,
    clientName,
    traps,
    onTrapAdded,
    onTrapUpdated,
    // onTrapDeleted // Unused for now
}: TrapListProps) => {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [selectedTrap, setSelectedTrap] = useState<Trampa | null>(null);
    const [formData, setFormData] = useState({
        numeroTrampa: '',
        tipo: 'raton' as Trampa['tipo'],
        ubicacion: '',
        observaciones: ''
    });

    // Obtener trampas del cliente actual
    const clientTraps = traps.filter(t => t.clienteId === clientId);

    // Calcular el próximo número de trampa
    const getNextTrapNumber = () => {
        if (clientTraps.length === 0) return '001';
        const numbers = clientTraps.map(t => parseInt(t.numeroTrampa));
        const maxNumber = Math.max(...numbers);
        return String(maxNumber + 1).padStart(3, '0');
    };

    const resetForm = () => {
        setFormData({
            numeroTrampa: '',
            tipo: 'raton',
            ubicacion: '',
            observaciones: ''
        });
    };

    const handleAddTrap = (e: React.FormEvent) => {
        e.preventDefault();

        const newTrap: Trampa = {
            id: `TRAP-${Date.now()}`,
            clienteId: clientId, // Fix: Use prop clientId
            numeroTrampa: formData.numeroTrampa || getNextTrapNumber(),
            tipo: formData.tipo,
            ubicacion: formData.ubicacion,
            fechaInstalacion: new Date().toISOString().split('T')[0],
            estado: 'activa',
            observaciones: formData.observaciones || undefined
        };

        onTrapAdded(newTrap);
        resetForm();
        setIsAddOpen(false);
    };

    const handleEditClick = (trap: Trampa) => {
        setSelectedTrap(trap);
        setFormData({
            numeroTrampa: trap.numeroTrampa,
            tipo: trap.tipo,
            ubicacion: trap.ubicacion,
            observaciones: trap.observaciones || ''
        });
        setIsEditOpen(true);
    };

    const handleUpdateTrap = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedTrap) return;

        const updatedTrap: Trampa = {
            ...selectedTrap,
            numeroTrampa: formData.numeroTrampa,
            tipo: formData.tipo,
            ubicacion: formData.ubicacion,
            observaciones: formData.observaciones || undefined
        };

        onTrapUpdated(updatedTrap);
        resetForm();
        setSelectedTrap(null);
        setIsEditOpen(false);
    };

    const handleStatusChange = (trap: Trampa, newStatus: Trampa['estado']) => {
        const updatedTrap: Trampa = {
            ...trap,
            estado: newStatus,
            fechaBaja: newStatus === 'baja' ? new Date().toISOString().split('T')[0] : undefined
        };
        onTrapUpdated(updatedTrap);
    };

    const getStatusBadge = (status: Trampa['estado']) => {
        switch (status) {
            case 'activa':
                return <Badge variant="success">Activa</Badge>;
            case 'inactiva':
                return <Badge variant="warning">Inactiva</Badge>;
            case 'baja':
                return <Badge variant="secondary">Baja</Badge>;
        }
    };

    const getTipoLabel = (tipo: Trampa['tipo']) => {
        const labels = {
            raton: 'Ratón',
            cucaracha: 'Cucaracha',
            mosca: 'Mosca',
            volador: 'Volador',
            otro: 'Otro'
        };
        return labels[tipo];
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold">Trampas Instaladas</h3>
                    <p className="text-sm text-muted-foreground">
                        {clientTraps.length} trampa(s) registrada(s) para {clientName}
                    </p>
                </div>
                <Button onClick={() => setIsAddOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Trampa
                </Button>
            </div>

            {clientTraps.length === 0 ? (
                <div className="text-center py-8 border rounded-lg bg-muted/30">
                    <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No hay trampas instaladas para este cliente</p>
                    <Button variant="outline" className="mt-4" onClick={() => setIsAddOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Instalar Primera Trampa
                    </Button>
                </div>
            ) : (
                <div className="border rounded-lg">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Número</TableHead>
                                <TableHead>Tipo</TableHead>
                                <TableHead>Ubicación</TableHead>
                                <TableHead>Instalación</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {clientTraps.map((trap) => (
                                <TableRow key={trap.id}>
                                    <TableCell className="font-mono font-semibold">
                                        #{trap.numeroTrampa}
                                    </TableCell>
                                    <TableCell>{getTipoLabel(trap.tipo)}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3 text-muted-foreground" />
                                            {trap.ubicacion}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                            <Calendar className="h-3 w-3" />
                                            {new Date(trap.fechaInstalacion).toLocaleDateString()}
                                        </div>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(trap.estado)}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleEditClick(trap)}
                                            >
                                                <Edit2 className="h-4 w-4" />
                                            </Button>
                                            {trap.estado === 'activa' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleStatusChange(trap, 'inactiva')}
                                                >
                                                    Desactivar
                                                </Button>
                                            )}
                                            {trap.estado === 'inactiva' && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleStatusChange(trap, 'activa')}
                                                    >
                                                        Activar
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleStatusChange(trap, 'baja')}
                                                    >
                                                        Dar de Baja
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Dialog para agregar trampa */}
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Instalar Nueva Trampa</DialogTitle>
                        <DialogDescription>
                            Registra una nueva trampa para {clientName}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddTrap} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="add-numero">Número de Trampa</Label>
                                <Input
                                    id="add-numero"
                                    value={formData.numeroTrampa}
                                    onChange={(e) => setFormData({ ...formData, numeroTrampa: e.target.value })}
                                    placeholder={`Auto: ${getNextTrapNumber()}`}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Dejar vacío para auto-generar
                                </p>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="add-tipo">Tipo</Label>
                                <select
                                    id="add-tipo"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={formData.tipo}
                                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as Trampa['tipo'] })}
                                >
                                    <option value="raton">Ratón</option>
                                    <option value="cucaracha">Cucaracha</option>
                                    <option value="mosca">Mosca</option>
                                    <option value="volador">Volador</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="add-ubicacion">
                                Ubicación <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="add-ubicacion"
                                value={formData.ubicacion}
                                onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                                placeholder="Ej: Cocina Principal, Bodega Norte"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="add-observaciones">Observaciones</Label>
                            <Input
                                id="add-observaciones"
                                value={formData.observaciones}
                                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                                placeholder="Notas adicionales (opcional)"
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>
                                Cancelar
                            </Button>
                            <Button type="submit">Instalar Trampa</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Dialog para editar trampa */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Trampa</DialogTitle>
                        <DialogDescription>
                            Modifica la información de la trampa
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateTrap} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="edit-numero">Número de Trampa</Label>
                                <Input
                                    id="edit-numero"
                                    value={formData.numeroTrampa}
                                    onChange={(e) => setFormData({ ...formData, numeroTrampa: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="edit-tipo">Tipo</Label>
                                <select
                                    id="edit-tipo"
                                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    value={formData.tipo}
                                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as Trampa['tipo'] })}
                                >
                                    <option value="raton">Ratón</option>
                                    <option value="cucaracha">Cucaracha</option>
                                    <option value="mosca">Mosca</option>
                                    <option value="volador">Volador</option>
                                    <option value="otro">Otro</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-ubicacion">Ubicación</Label>
                            <Input
                                id="edit-ubicacion"
                                value={formData.ubicacion}
                                onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-observaciones">Observaciones</Label>
                            <Input
                                id="edit-observaciones"
                                value={formData.observaciones}
                                onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => { setIsEditOpen(false); resetForm(); setSelectedTrap(null); }}>
                                Cancelar
                            </Button>
                            <Button type="submit">Guardar Cambios</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
};
