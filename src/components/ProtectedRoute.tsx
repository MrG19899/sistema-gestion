import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: ('adminsupremo' | 'admin' | 'worker')[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
    const { user, profile, isLoading } = useAuth();

    if (isLoading) {
        return <div className="min-h-screen flex items-center justify-center">Cargando perfil seguro...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Si la ruta requiere un rol específico ("admin" o "worker")
    if (allowedRoles && profile) {
        if (!allowedRoles.includes(profile.rol)) {
            return <Navigate to="/unauthorized" replace />;
        }
    }

    // Verificar si la cuenta fue desactivada por el administrador manualmente
    if (profile && !profile.activo) {
        return <Navigate to="/inactive" replace />;
    }

    return <>{children}</>;
};
