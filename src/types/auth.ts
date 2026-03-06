import { Timestamp } from 'firebase/firestore';

export type UserRole = 'adminsupremo' | 'admin' | 'worker';

export interface User {
    uid: string;
    email: string;
    nombre: string;
    rol: UserRole;
    activo: boolean;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}
