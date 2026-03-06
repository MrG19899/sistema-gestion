export * from './auth';
export * from './client';
export * from './pest-control';
export * from './carpets';
export * from './cleaning';
export * from './common';

import { Timestamp } from 'firebase/firestore';

// Notifications
export type NotificationType = 'renovacion_plagas' | 'alfombra_lista' | 'servicio_pendiente';

export interface Notification {
    id: string;
    tipo: NotificationType;
    titulo: string;
    mensaje: string;
    leido: boolean;
    link?: string;
    createdAt: Timestamp;
}

// KPIs and Dashboard
export interface DashboardStats {
    ingresosMes: number;
    serviciosMes: number;
    clientesActivos: number;
    alertasPendientes: number;
}

// Internal Board / Notes
export type NotePriority = 'alta' | 'media' | 'baja';
export type NoteCategory = 'insumos' | 'maquinas' | 'general' | 'personal';
export type NoteStatus = 'pendiente' | 'en_proceso' | 'solucionado';

export interface InternalNote {
    id: string;
    content: string;
    category: NoteCategory;
    priority: NotePriority;
    status: NoteStatus;
    createdAt: Timestamp;
    createdBy: string; // Nombre del usuario
    createdById: string; // UID del usuario
}
