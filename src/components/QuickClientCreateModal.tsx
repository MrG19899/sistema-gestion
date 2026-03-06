import { useState } from 'react';
import { Button } from './ui/button';
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
import { SECTORS } from '../lib/constants';
import { supabase } from '../lib/supabase';

interface QuickClientCreateModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onClientCreated: (client: any) => void;
    existingClients: Array<{ id: string; name: string }>;
}

export const QuickClientCreateModal = ({
    open,
    onOpenChange,
    onClientCreated,
    existingClients
}: QuickClientCreateModalProps) => {
    const [formData, setFormData] = useState({
        name: '',
        contact: '',
        email: '',
        phone: '',
        address: '',
        type: 'Comercial',
        sector: ''
    });
    const [error, setError] = useState('');

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (error) setError('');
    };

    const validateForm = (): boolean => {
        const isDuplicate = existingClients.some(
            client => client.name.toLowerCase() === formData.name.toLowerCase()
        );

        if (isDuplicate) {
            setError('Ya existe un cliente con este nombre');
            return false;
        }

        if (!formData.name.trim()) {
            setError('El nombre del cliente es obligatorio');
            return false;
        }

        if (!formData.contact.trim()) {
            setError('El nombre de contacto es obligatorio');
            return false;
        }

        if (!formData.phone.trim()) {
            setError('El teléfono es obligatorio');
            return false;
        }

        if (!formData.sector) {
            setError('Debe seleccionar un sector');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (formData.email && !emailRegex.test(formData.email)) {
            setError('Email no válido');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const newClientData = {
            name: formData.name,
            contact: formData.contact,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            type: formData.type,
            sector: formData.sector,
            status: 'active'
        };

        try {
            const { data, error: supError } = await supabase
                .from('clientes')
                .insert([newClientData])
                .select();

            if (supError) throw supError;

            if (data && data.length > 0) {
                onClientCreated(data[0]);

                setFormData({
                    name: '',
                    contact: '',
                    email: '',
                    phone: '',
                    address: '',
                    type: 'Comercial',
                    sector: ''
                });
                setError('');
                onOpenChange(false);
            }
        } catch (err: any) {
            setError('Error de base de datos: ' + err.message);
        }
    };

    const handleCancel = () => {
        setFormData({
            name: '',
            contact: '',
            email: '',
            phone: '',
            address: '',
            type: 'Comercial',
            sector: ''
        });
        setError('');
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Crear Cliente Rápido</DialogTitle>
                    <DialogDescription>
                        Ingresa los datos esenciales, incluyendo el sector para logística.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 text-left">
                    <div className="grid gap-2">
                        <Label htmlFor="quick-name">
                            Nombre Empresa / Cliente <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            id="quick-name"
                            name="name"
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="Ej: Restaurante El Buen Sabor"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="quick-contact">
                                Nombre Contacto <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="quick-contact"
                                name="contact"
                                value={formData.contact}
                                onChange={handleInputChange}
                                placeholder="Ej: Juan Pérez"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="quick-type">Tipo Cliente</Label>
                            <select
                                id="quick-type"
                                name="type"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={formData.type}
                                onChange={handleInputChange}
                            >
                                <option value="Restaurant">Restaurant</option>
                                <option value="Residencial">Residencial</option>
                                <option value="Comercial">Comercial</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="quick-phone">
                                Teléfono <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="quick-phone"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                placeholder="+56 9 1234 5678"
                                required
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="quick-sector">Sector <span className="text-red-500">*</span></Label>
                            <select
                                id="quick-sector"
                                name="sector"
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={formData.sector}
                                onChange={handleInputChange}
                                required
                            >
                                <option value="">Seleccionar...</option>
                                {SECTORS.map((sector) => (
                                    <option key={sector} value={sector}>
                                        {sector}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="quick-email">Email</Label>
                        <Input
                            id="quick-email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="contacto@empresa.cl"
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="quick-address">Dirección</Label>
                        <Input
                            id="quick-address"
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            placeholder="Calle Principal 123, Ciudad"
                        />
                    </div>

                    {error && (
                        <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                            {error}
                        </div>
                    )}

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleCancel}>
                            Cancelar
                        </Button>
                        <Button type="submit">
                            Guardar Cliente
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};
