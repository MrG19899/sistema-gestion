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

const SEPARATOR = '\u200B '; // Zero-width space — invisible para Maps/Waze

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
        addressDepto: '',
        type: 'Comercial',
        sector: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (error) setError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.name.trim()) {
            setError('El nombre del cliente es obligatorio');
            return;
        }

        const isDuplicate = existingClients.some(
            c => c.name.toLowerCase() === formData.name.toLowerCase()
        );
        if (isDuplicate) {
            setError('Ya existe un cliente con este nombre');
            return;
        }

        if (formData.email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(formData.email)) {
                setError('Email no válido');
                return;
            }
        }

        const finalAddress = formData.addressDepto
            ? `${formData.address.trim()}${SEPARATOR}${formData.addressDepto.trim()}`
            : formData.address.trim();

        setLoading(true);
        try {
            const { data, error: supError } = await supabase
                .from('clientes')
                .insert([{
                    name: formData.name,
                    contact: formData.contact,
                    email: formData.email,
                    phone: formData.phone,
                    address: finalAddress,
                    type: formData.type,
                    sector: formData.sector,
                    status: 'active'
                }])
                .select();

            if (supError) throw supError;

            if (data && data.length > 0) {
                onClientCreated(data[0]);
                setFormData({ name: '', contact: '', email: '', phone: '', address: '', addressDepto: '', type: 'Comercial', sector: '' });
                setError('');
                onOpenChange(false);
            }
        } catch (err: any) {
            setError('Error de base de datos: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <FullScreenDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Agregar Nuevo Cliente"
            description="Ingresa los datos del nuevo cliente para registrarlo en el sistema"
        >
            <form onSubmit={handleSubmit} className="space-y-5 text-left pb-10">

                {/* Nombre principal */}
                <div className="space-y-2">
                    <Label htmlFor="qc-name">Nombre Empresa / Cliente</Label>
                    <Input
                        id="qc-name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Ej: Restaurante El Buen Sabor"
                        className="h-12 text-base"
                        required
                        autoFocus
                    />
                </div>

                {/* Contacto + Tipo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border p-4 bg-slate-50/50 rounded-xl">
                    <div className="space-y-2">
                        <Label htmlFor="qc-contact">Nombre Contacto <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
                        <Input
                            id="qc-contact"
                            name="contact"
                            value={formData.contact}
                            onChange={handleInputChange}
                            placeholder="Ej: Juan Pérez"
                            className="h-12 text-base bg-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="qc-type">Tipo Cliente</Label>
                        <select
                            id="qc-type"
                            name="type"
                            className="flex h-12 w-full rounded-md border border-input bg-white px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            value={formData.type}
                            onChange={handleInputChange}
                        >
                            <option value="Comercial">Comercial</option>
                            <option value="Residencial">Residencial</option>
                            <option value="Restaurant">Restaurant</option>
                        </select>
                    </div>
                </div>

                {/* Email + Teléfono */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border p-4 bg-slate-50/50 rounded-xl">
                    <div className="space-y-2">
                        <Label htmlFor="qc-email">Email <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
                        <Input
                            id="qc-email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleInputChange}
                            placeholder="contacto@empresa.cl"
                            className="h-12 text-base bg-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="qc-phone">Teléfono <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
                        <Input
                            id="qc-phone"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="+56 9 1234 5678"
                            className="h-12 text-base bg-white"
                        />
                    </div>
                </div>

                {/* Dirección + Depto + Sector */}
                <div className="grid grid-cols-2 sm:grid-cols-[1fr_auto_1fr] gap-3 border p-4 bg-slate-50/50 rounded-xl">
                    <div className="col-span-2 sm:col-span-1 space-y-2">
                        <Label htmlFor="qc-address">Dirección (Calle)</Label>
                        <Input
                            id="qc-address"
                            name="address"
                            value={formData.address}
                            onChange={handleInputChange}
                            placeholder="Ej: Las Magnolias 123"
                            className="h-12 text-base bg-white"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="qc-depto">N°/Depto o Casa</Label>
                        <Input
                            id="qc-depto"
                            name="addressDepto"
                            value={formData.addressDepto}
                            onChange={handleInputChange}
                            placeholder="Ej: 47"
                            className="h-12 text-base bg-white"
                        />
                    </div>
                    <div className="col-span-2 sm:col-span-1 space-y-2">
                        <Label htmlFor="qc-sector">Sector <span className="text-muted-foreground font-normal text-xs">(opcional)</span></Label>
                        <select
                            id="qc-sector"
                            name="sector"
                            className="flex h-12 w-full rounded-md border border-input bg-white px-3 py-2 text-base ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            value={formData.sector}
                            onChange={handleInputChange}
                        >
                            <option value="">Seleccionar...</option>
                            {SECTORS.map((s) => (
                                <option key={s} value={s}>{s}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 font-bold text-red-700 animate-in fade-in slide-in-from-top-2">
                        ⚠️ {error}
                    </div>
                )}

                <div className="pt-2 grid grid-cols-2 gap-3">
                    <Button type="button" variant="outline" size="lg" className="h-12" onClick={() => onOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button
                        type="submit"
                        size="lg"
                        disabled={loading}
                        className="h-12 font-bold bg-green-600 hover:bg-green-700 text-white"
                    >
                        {loading ? '⏳ Guardando...' : '✓ Guardar Cliente'}
                    </Button>
                </div>
            </form>
        </FullScreenDialog>
    );
};
