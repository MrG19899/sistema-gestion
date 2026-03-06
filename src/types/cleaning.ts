import { Timestamp } from 'firebase/firestore';
import type { ServicioEstado } from './common';

export type ServicioLimpiezaType = 'oficinas' | 'industrial' | 'fin_de_obra' | 'vidrios' | 'alfombras_in_situ' | 'tapices' | 'otro';

export interface ServicioAseo {
    id: string;
    clienteId: string;
    clienteNombre?: string;

    tipo: ServicioLimpiezaType;
    fechaProgramada: string;
    fechaRealizada?: string;

    direccion: string;
    estado: ServicioEstado;

    tecnicoAsignadoId?: string;
    tecnicoAsignadoNombre?: string;

    // Details
    metrosCuadrados?: number;
    cantidadAmbientes?: number;
    observaciones?: string;

    // Execution
    materialesUsados?: string;
    costoTotal?: number;

    createdAt: string | Timestamp;
    updatedAt?: string | Timestamp;
}
