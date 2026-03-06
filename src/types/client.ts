import { Timestamp } from 'firebase/firestore';

export type ClienteType = 'Residencial' | 'Comercial' | 'Restaurant';
export type ClienteEstado = 'active' | 'inactive';

export interface Cliente {
    id: string;
    type: ClienteType; // 'Residencial' | 'Comercial' | 'Restaurant'
    name: string;
    rut?: string;
    phone: string;
    email?: string;
    address: string;
    commune?: string;
    sector?: string; // Added for sector filtering
    notes?: string;
    status: ClienteEstado; // 'active' | 'inactive'
    createdAt?: Timestamp | string; // Allow string for mocks
    updatedAt?: Timestamp | string;
    contact?: string; // Contact person name
    lastService?: string; // Date string
    deleted?: boolean;
}
