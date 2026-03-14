import { useState, useEffect } from 'react';
import { Search, UserPlus, Phone, MapPin, Building2, Mail, Map, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from './ui/button';
import { FullScreenDialog } from './ui/FullScreenDialog';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { SECTORS } from '../lib/constants';
import type { Cliente } from '../types';

interface ClientAutocompleteProps {
    onSelect: (client: Cliente) => void;
    selectedClientName?: string;
    onClientCreated?: (client: Cliente) => void;
}

export const ClientAutocomplete = ({ onSelect, selectedClientName, onClientCreated }: ClientAutocompleteProps) => {
    const [searchValue, setSearchValue] = useState(selectedClientName || '');
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [clients, setClients] = useState<Cliente[]>([]);
    
    const [newClient, setNewClient] = useState({
        name: '',
        contact: '',
        email: '',
        phone: '',
        address: '',
        addressDepto: '',
        type: 'Comercial',
        sector: ''
    });

    // FETCH REAL CLIENTS FROM SUPABASE
    useEffect(() => {
        const fetchClients = async () => {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('clientes')
                .select('*')
                .eq('status', 'active');

            if (!error && data) {
                setClients(data as Cliente[]);
            }
            setIsLoading(false);
        };
        fetchClients();
    }, []);

    useEffect(() => {
        if (selectedClientName) {
            setSearchValue(selectedClientName);
        }
    }, [selectedClientName]);

    const results = clients.filter(c =>
        c.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        (c.address || '').toLowerCase().includes(searchValue.toLowerCase())
    );

    const handleSelect = (client: Cliente) => {
        setSearchValue(client.name);
        onSelect(client);
        setIsOpen(false);
    };

    const handleCreateClient = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const SEPARATOR = '\u200B ';
            const finalAddress = newClient.addressDepto ? `${newClient.address.trim()}${SEPARATOR}${newClient.addressDepto.trim()}` : newClient.address.trim();
            
            const payload = {
                name: newClient.name,
                contact: newClient.contact,
                email: newClient.email,
                phone: newClient.phone,
                address: finalAddress,
                type: newClient.type,
                sector: newClient.sector,
                status: 'active'
            };

            const { data, error } = await supabase
                .from('clientes')
                .insert([payload])
                .select();

            if (error) throw error;

            if (data && data[0]) {
                const created = data[0] as Cliente;
                
                // Update local clients list
                setClients(prevClients => [...prevClients, created]);

                // Select the newly created client
                onSelect(created);
                setSearchValue(created.name);
                
                // Close states
                setIsAddingNew(false);
                setIsOpen(false);
                
                // Reset form
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

                if (onClientCreated) onClientCreated(created);
            }
        } catch (err: any) {
            alert('Error al crear cliente: ' + err.message);
        }
    };

    return (
        <div className="relative w-full">
            <div className="relative">
                <Input
                    type="text"
                    placeholder="Buscar cliente por nombre o dirección..."
                    value={searchValue}
                    onChange={(e) => {
                        setSearchValue(e.target.value);
                        setIsOpen(true);
                        // Invalidar selección previa si se cambia el texto
                        if (e.target.value !== searchValue) {
                            onSelect({ id: '', name: e.target.value } as any);
                        }
                    }}
                    onFocus={() => setIsOpen(true)}
                    className="pl-10 h-12 text-base shadow-sm font-medium"
                />
                <Search className="absolute left-3 top-3.5 h-5 w-5 text-slate-400" />
                {searchValue && (
                    <button 
                        type="button"
                        onClick={() => { setSearchValue(''); setIsOpen(false); }}
                        className="absolute right-3 top-3.5"
                    >
                        <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                    </button>
                )}
            </div>

            {isOpen && searchValue.length >= 2 && (
                <div className="absolute z-[100] w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="max-h-64 overflow-y-auto">
                        <button
                            type="button"
                            onClick={() => { setIsAddingNew(true); setIsOpen(false); }}
                            className="w-full px-4 py-4 flex items-center gap-4 text-left hover:bg-slate-50 border-b border-slate-100 transition-colors group"
                        >
                            <div className="bg-primary p-2.5 rounded-full text-white shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                                <UserPlus className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-slate-800">¿Nuevo Cliente?</p>
                                <p className="text-xs text-slate-500 font-medium">Registrar "{searchValue}" ahora</p>
                            </div>
                        </button>

                        {isLoading ? (
                            <div className="p-4 text-center text-slate-400 text-sm font-medium">Buscando...</div>
                        ) : results.length > 0 ? (
                            results.map((client) => (
                                <button
                                    key={client.id}
                                    type="button"
                                    onClick={() => handleSelect(client)}
                                    className="w-full px-4 py-3 flex flex-col text-left hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors"
                                >
                                    <span className="text-sm font-bold text-slate-700">{client.name}</span>
                                    <div className="flex items-center gap-3 mt-1 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-slate-400" />{client.address || 'Sin dirección'}</span>
                                        {client.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3 text-slate-400" />{client.phone}</span>}
                                    </div>
                                </button>
                            ))
                        ) : (
                            <div className="p-6 text-center">
                                <p className="text-sm font-bold text-slate-400">Sin resultados exactos</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <FullScreenDialog
                open={isAddingNew}
                onOpenChange={setIsAddingNew}
                title="✨ Registrar Nuevo Cliente"
                description="Ingresa los datos para su creación inmediata y selección."
            >
                <form onSubmit={handleCreateClient} className="space-y-6 pt-2 pb-12">
                    <div className="grid gap-2">
                        <Label htmlFor="create-name" className="text-base font-bold flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-primary" /> Nombre Empresa / Cliente
                        </Label>
                        <Input 
                            id="create-name" 
                            className="h-12 text-base shadow-sm focus:ring-4 focus:ring-primary/10 transition-all font-bold" 
                            value={newClient.name} 
                            onChange={e => setNewClient({...newClient, name: e.target.value})} 
                            required 
                        />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="create-contact" className="text-base font-bold">👤 Nombre Contacto <span className="text-slate-400 font-normal text-xs">(opcional)</span></Label>
                            <Input 
                                id="create-contact" 
                                className="h-12 text-base" 
                                value={newClient.contact} 
                                onChange={e => setNewClient({...newClient, contact: e.target.value})} 
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="create-type" className="text-base font-bold">🏷️ Tipo Cliente</Label>
                            <select
                                id="create-type"
                                className="flex h-12 w-full rounded-md border border-input bg-white px-3 py-2 text-base focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                                value={newClient.type}
                                onChange={e => setNewClient({...newClient, type: e.target.value})}
                            >
                                <option value="Restaurant">Restaurant</option>
                                <option value="Residencial">Residencial</option>
                                <option value="Comercial">Comercial</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="create-email" className="text-base font-bold flex items-center gap-2">
                                <Mail className="w-4 h-4 text-slate-400" /> Email <span className="text-slate-400 font-normal text-xs">(opcional)</span>
                            </Label>
                            <Input 
                                id="create-email" 
                                type="email" 
                                className="h-12 text-base" 
                                value={newClient.email} 
                                onChange={e => setNewClient({...newClient, email: e.target.value})} 
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="create-phone" className="text-base font-bold flex items-center gap-2">
                                <Phone className="w-4 h-4 text-slate-400" /> Teléfono
                            </Label>
                            <Input 
                                id="create-phone" 
                                className="h-12 text-base font-mono" 
                                placeholder="+569 ..."
                                value={newClient.phone} 
                                onChange={e => setNewClient({...newClient, phone: e.target.value})} 
                            />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="grid grid-cols-[2fr_1fr] gap-2">
                            <div className="grid gap-2">
                                <Label htmlFor="create-address" className="text-base font-bold flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-slate-400" /> Dirección (Calle)
                                </Label>
                                <Input 
                                    id="create-address" 
                                    className="h-12 text-base" 
                                    placeholder="Ej: Las Magnolias 123" 
                                    value={newClient.address} 
                                    onChange={e => setNewClient({...newClient, address: e.target.value})} 
                                    required 
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="create-depto" className="text-base font-bold">N°/Depto</Label>
                                <Input 
                                    id="create-depto" 
                                    className="h-12 text-base" 
                                    placeholder="4B" 
                                    value={newClient.addressDepto} 
                                    onChange={e => setNewClient({...newClient, addressDepto: e.target.value})} 
                                />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="create-sector" className="text-base font-bold flex items-center gap-2">
                                <Map className="w-4 h-4 text-slate-400" /> Sector
                            </Label>
                            <select
                                id="create-sector"
                                className="flex h-12 w-full rounded-md border border-input bg-white px-3 py-2 text-base focus:ring-4 focus:ring-primary/10 transition-all font-medium"
                                value={newClient.sector}
                                onChange={e => setNewClient({...newClient, sector: e.target.value})}
                                required
                            >
                                <option value="">Seleccionar sector...</option>
                                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="pt-8">
                        <Button type="submit" className="w-full h-16 text-xl font-black bg-primary hover:bg-primary/90 shadow-2xl shadow-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]">
                            REGISTRAR Y SELECCIONAR
                        </Button>
                    </div>
                </form>
            </FullScreenDialog>
        </div>
    );
};
