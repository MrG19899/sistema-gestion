import { useState, useEffect } from 'react';
import { Search, Plus, MapPin, Phone } from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { QuickClientCreateModal } from './QuickClientCreateModal';
import type { Cliente } from '../types';
import { supabase } from '../lib/supabase'; // IMPORT SUPABASE

interface ClientAutocompleteProps {
    onSelect: (client: Cliente) => void;
    selectedClientName?: string;
    onClientCreated?: (client: Cliente) => void;
}

export const ClientAutocomplete = ({ onSelect, selectedClientName, onClientCreated }: ClientAutocompleteProps) => {
    const [searchTerm, setSearchTerm] = useState(selectedClientName || '');
    const [isOpen, setIsOpen] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [clients, setClients] = useState<Cliente[]>([]);

    // FETCH REAL CLIENTS FROM SUPABASE
    useEffect(() => {
        const fetchClients = async () => {
            const { data, error } = await supabase
                .from('clientes')
                .select('*')
                .eq('status', 'active');

            if (!error && data) {
                setClients(data as Cliente[]);
            }
        };
        fetchClients();
    }, []);

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.address.toLowerCase().includes(searchTerm.toLowerCase())
    );

    useEffect(() => {
        if (selectedClientName) {
            setSearchTerm(selectedClientName);
        }
    }, [selectedClientName]);

    const handleSelect = (client: any) => {
        setSearchTerm(client.name);
        onSelect(client);
        setIsOpen(false);
    };

    const handleClientCreated = (newClient: any) => {
        const updatedClients = [...clients, newClient];
        setClients(updatedClients);

        // Si hay callback global
        if (onClientCreated) {
            onClientCreated(newClient);
        }

        // IMPORTANT SIMULATE SELECTION IMMEDIATELY
        setSearchTerm(newClient.name);
        setIsOpen(false);
        // FORCE the parent to register the ID
        onSelect(newClient);
    };

    const handleCreateClick = () => {
        setIsOpen(false);
        setIsCreateModalOpen(true);
    };

    // Mostrar opción "Crear nuevo" al final de los resultados
    const showCreateOption = searchTerm.length > 0 && filteredClients.length > 0;
    const noResults = searchTerm.length > 0 && filteredClients.length === 0;

    return (
        <>
            <div className="relative w-full">
                <div className="relative">
                    <Input
                        type="text"
                        placeholder="Buscar cliente por nombre o dirección..."
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setIsOpen(true);
                            // Si el usuario edita a mano, ya no hay un cliente válido de la lista seleccionado
                            onSelect({ id: '', name: e.target.value, address: '', phone: '', type: 'Comercial' } as any);
                        }}
                        onFocus={() => setIsOpen(true)}
                        className="pl-10"
                    />
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                </div>

                {isOpen && searchTerm.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredClients.length > 0 ? (
                            <>
                                {filteredClients.map((client) => (
                                    <div
                                        key={client.id}
                                        onClick={() => handleSelect(client)}
                                        className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                                    >
                                        <div className="font-medium text-gray-900">{client.name}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-2">
                                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {client.address}</span>
                                            {client.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {client.phone}</span>}
                                        </div>
                                    </div>
                                ))}
                                {showCreateOption && (
                                    <div
                                        onClick={handleCreateClick}
                                        className="p-3 hover:bg-blue-50 cursor-pointer border-t bg-gray-50"
                                    >
                                        <div className="font-medium text-blue-600 flex items-center gap-2">
                                            <Plus className="h-4 w-4" />
                                            Crear nuevo cliente
                                        </div>
                                        <div className="text-xs text-gray-500 ml-6">
                                            Si no encuentras al cliente, créalo aquí
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : noResults ? (
                            <div className="p-4 text-center">
                                <p className="text-sm text-gray-500 mb-2">No se encontraron clientes.</p>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full"
                                    onClick={handleCreateClick}
                                >
                                    <Plus className="h-4 w-4 mr-2" /> Crear Nuevo Cliente
                                </Button>
                            </div>
                        ) : null}
                    </div>
                )}
            </div>

            <QuickClientCreateModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
                onClientCreated={handleClientCreated}
                existingClients={clients}
            />
        </>
    );
};
