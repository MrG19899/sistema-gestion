import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { FullScreenDialog } from './ui/FullScreenDialog';
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

    return (
        <FullScreenDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Nuevo Cliente Rápido"
            description="Ingresa los datos esenciales para registrar el cliente"
        >
            <form onSubmit={handleSubmit} className="space-y-5 text-left pb-10">
                <div className="space-y-2">
                    <Label htmlFor="quick-name">
                        Nombre Empresa / Cliente <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="quick-name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Ej: Restaurante El Buen Sabor"
                        className="h-12 text-base"
                        required
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border p-4 bg-slate-50/50 rounded-xl">
                    <div className="space-y-2">
                        <Label htmlFor="quick-contact">
                            Nombre Contacto (Opcional)
                        </Label>
                        <Input
                            id="quick-contact"
                            name="contact"
                            value={formData.contact}
                            onChange={handleInputChange}
                            placeholder="Ej: Juan Pérez"
                            className="h-12 text-base bg-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="quick-type">Tipo Cliente</Label>
                        <select
                            id="quick-type"
                            name="type"
                            className="flex h-12 w-full rounded-md border border-input bg-white px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            value={formData.type}
                            onChange={handleInputChange}
                        >
                            <option value="Restaurant">Restaurant</option>
                            <option value="Residencial">Residencial</option>
                            <option value="Comercial">Comercial</option>
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border p-4 bg-slate-50/50 rounded-xl">
                    <div className="space-y-2">
                        <Label htmlFor="quick-phone">
                            Teléfono (Opcional)
                        </Label>
                        <Input
                            id="quick-phone"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="+56 9 1234 5678"
                            className="h-12 text-base bg-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="quick-sector">Sector Logístico (Opcional)</Label>
                        <select
                            id="quick-sector"
                            name="sector"
                            className="flex h-12 w-full rounded-md border border-input bg-white px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            value={formData.sector}
                            onChange={handleInputChange}
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

                <div className="space-y-2">
                    <Label htmlFor="quick-address">Dirección</Label>
                    <Input
                        id="quick-address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="Calle Principal 123"
                        className="h-12 text-base"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="quick-email">Email (Opcional)</Label>
                    <Input
                        id="quick-email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="contacto@empresa.cl"
                        className="h-12 text-base"
                    />
                </div>

                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 font-bold text-red-700 animate-in fade-in slide-in-from-top-2">
                        ⚠️ {error}
                    </div>
                )}

                <div className="pt-4 flex flex-col sm:flex-row gap-3">
                    <Button
                        type="submit"
                        size="lg"
                        className="w-full text-base font-bold bg-green-600 hover:bg-green-700"
                    >
                        ✓ Guardar y Usar Cliente
                    </Button>
                </div>
            </form>
        </FullScreenDialog>
    );
};
