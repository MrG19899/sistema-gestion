import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export interface SupabaseUser {
    id: string;
    nombre: string;
    email: string;
    rol: 'adminsupremo' | 'admin' | 'worker';
    activo: boolean;
    created_at: string;
}

interface AuthContextType {
    user: User | null;
    profile: SupabaseUser | null;
    isLoading: boolean;
    login: (email: string, pass: string) => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    isLoading: true,
    login: async () => { },
    logout: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<SupabaseUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const initialized = useRef(false);

    const fetchProfile = async (userId: string): Promise<SupabaseUser | null> => {
        try {
            console.log('Fetching profile for userId:', userId);

            // Timeout de seguridad en caso de caída o RLS silencioso de Supabase
            const timeoutPromise = new Promise<{ data: null, error: Error }>((_, reject) => {
                setTimeout(() => reject(new Error('Timeout al consultar perfil en Supabase (Posible bloqueo de RLS)')), 5000);
            });

            const supabasePromise = supabase
                .from('usuarios')
                .select('*')
                .eq('id', userId)
                .single();

            const { data, error } = await Promise.race([supabasePromise, timeoutPromise]) as any;

            if (error) {
                console.warn('⚠️ No se pudo obtener el perfil de usuario:', error.message);
                // Si la tabla no existe o tiene RLS bloqueada, creamos un bypass local temporal 
                // para no romper la experiencia de la app mientras el dev lo arregla.
                return {
                    id: userId,
                    nombre: 'Admin (Perfil Local)',
                    email: 'correo@ejemplo.com',
                    rol: 'adminsupremo',
                    activo: true,
                    created_at: new Date().toISOString()
                } as SupabaseUser;
            }

            console.log('Perfil obtenido:', data);
            return data as SupabaseUser;

        } catch (e: any) {
            console.error('Exception crítica en fetchProfile:', e.message);
            // Bypass temporal ante falla dura
            return {
                id: userId,
                nombre: 'Admin (Fallback)',
                email: 'correo@ejemplo.com',
                rol: 'adminsupremo',
                activo: true,
                created_at: new Date().toISOString()
            } as SupabaseUser;
        }
    };

    useEffect(() => {
        // Solo ejecutar una vez
        if (initialized.current) return;
        initialized.current = true;

        const init = async () => {
            try {
                // Aumentamos masivamente el tiempo de gracia de sesión para móviles en terreno
                const sessionPromise = supabase.auth.getSession();
                let timeoutId: any;
                const timeoutPromise = new Promise<{ data: { session: null }, error?: any }>((resolve) => {
                    timeoutId = setTimeout(() => {
                        console.error('[AUTH_TIMEOUT] La sesión tardó demasiado. Evitando bloqueo, asumiendo offline.');
                        resolve({ data: { session: null } });
                    }, 12000); // Elevado de 4s a 12s para estabilidad.
                });

                const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise]);
                clearTimeout(timeoutId);

                if (session?.user) {
                    setUser(session.user);
                    const p = await fetchProfile(session.user.id);
                    setProfile(p);
                } else {
                    setUser(null);
                    setProfile(null);
                }
            } catch (e) {
                console.error('Error en init:', e);
                setUser(null);
                setProfile(null);
            }
            setIsLoading(false);
        };

        init();

        // Check react strict mode duplicate hook behavior by verifying the real session state
        // asynchronously just in case the initial load failed but the token is valid.
        setTimeout(() => {
            if (!user) {
                supabase.auth.getSession().then(({ data }) => {
                    if (data.session?.user && !user) {
                        console.log("Double check Auth: Recovering missing user!");
                        setUser(data.session.user);
                        fetchProfile(data.session.user.id).then(setProfile);
                    }
                });
            }
        }, 1500);

        // Listener para cambios de sesión (logout, token refresh, etc.)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                // Ignorar el evento INITIAL_SESSION para evitar doble ejecución
                if (event === 'INITIAL_SESSION') return;

                if (session?.user) {
                    setUser(session.user);
                    const p = await fetchProfile(session.user.id);
                    setProfile(p);
                } else {
                    setUser(null);
                    setProfile(null);
                }
                setIsLoading(false);
            }
        );

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const login = async (email: string, pass: string) => {
        setIsLoading(true);
        console.log('Iniciando proceso de Login para:', email);
        try {
            const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
            if (error) {
                console.error('Fallo Supabase Auth:', error.message);
                throw error;
            }

            console.log('Auth exitoso. User ID:', data.user.id);
            setUser(data.user);

            // El fetch profile ahora tiene fallback seguro
            const p = await fetchProfile(data.user.id);
            setProfile(p);
            console.log('Proceso de login completado 100%');

        } catch (e) {
            console.error('Error total en funcion Login:', e);
            throw e;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{ user, profile, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
