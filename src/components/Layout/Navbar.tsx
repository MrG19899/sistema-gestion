import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
const Menu = ({ className }: { className?: string }) => <span className={className}>☰</span>;
const Bell = ({ className }: { className?: string }) => <span className={className}>🔔</span>;
const LogOut = ({ className }: { className?: string }) => <span className={className}>🚪</span>;
const User = ({ className }: { className?: string }) => <span className={className}>👤</span>;

interface NavbarProps {
    onMenuClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
    const { profile, logout } = useAuth();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [pendingNotesCount, setPendingNotesCount] = useState(0);

    useEffect(() => {
        const fetchPendingCount = async () => {
            const { count, error } = await supabase
                .from('notas_muro')
                .select('*', { count: 'exact', head: true })
                .eq('completada', false);

            if (!error && count !== null) {
                setPendingNotesCount(count);
            }
        };

        fetchPendingCount();

        const channel = supabase
            .channel('public:notas_muro')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notas_muro' }, () => {
                fetchPendingCount();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
        } catch (error) {
            console.error('Error al cerrar sesión:', error);
        }
    };

    return (
        <nav className="fixed top-0 left-0 right-0 glass border-b border-border z-50 pt-[env(safe-area-inset-top)]">
            <div className="px-4 h-16 flex items-center justify-between">
                {/* Left side */}
                <div className="flex items-center gap-2 sm:gap-4">
                    <button
                        onClick={onMenuClick}
                        className="p-3 -ml-2 hover:bg-black/5 rounded-xl transition-all active:scale-95"
                    >
                        <Menu className="h-6 w-6 text-foreground/80" />
                    </button>

                    <div className="flex items-center gap-2">
                        <h1 className="text-lg sm:text-xl font-black text-primary tracking-tight neon-glow">
                            TE LO LIMPIO
                        </h1>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-bold hidden xs:inline uppercase tracking-widest">
                            Gestión
                        </span>
                    </div>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-1 sm:gap-3">
                    {/* Notificaciones */}
                    <button className="relative p-3 hover:bg-black/5 rounded-xl transition-all group active:scale-95" title="Boletín de Suministros">
                        <Bell className="h-6 w-6 sm:h-5 sm:w-5 text-foreground/70 group-hover:text-primary transition-colors" />
                        {pendingNotesCount > 0 ? (
                            <span className="absolute top-1 right-1 sm:top-0 sm:right-0 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full ring-2 ring-background shadow-sm animate-pulse">
                                {pendingNotesCount}
                            </span>
                        ) : (
                            <span className="absolute top-3 right-3 sm:top-2 sm:right-2 w-2 h-2 bg-accent/50 rounded-full ring-2 ring-background"></span>
                        )}
                    </button>

                    {/* User menu */}
                    <div className="relative">
                        <button
                            onClick={() => setShowUserMenu(!showUserMenu)}
                            className="flex items-center gap-2 p-1 hover:bg-black/5 rounded-xl transition-all border border-transparent hover:border-black/10 active:scale-95"
                        >
                            <div className="w-9 h-9 sm:w-8 sm:h-8 bg-gradient-to-tr from-primary to-accent rounded-full flex items-center justify-center shadow-lg shadow-primary/20">
                                <User className="h-6 w-6 sm:h-5 sm:w-5 text-white" />
                            </div>
                            <div className="text-left hidden md:block px-1">
                                <p className="text-sm font-bold text-foreground leading-tight">{profile?.nombre || 'Usuario'}</p>
                                <p className="text-[10px] text-muted-foreground uppercase font-black tracking-tighter opacity-70">{profile?.rol}</p>
                            </div>
                        </button>

                        {/* Dropdown */}
                        {showUserMenu && (
                            <div className="absolute right-0 mt-3 w-56 glass rounded-2xl shadow-xl shadow-black/5 border border-black/10 py-2 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                <div className="px-4 py-3 border-b border-black/5 mb-1 bg-black/5">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Sesión activa</p>
                                    <p className="text-sm font-extrabold text-foreground truncate">{profile?.nombre}</p>
                                    <p className="text-[10px] text-primary font-bold">{profile?.rol}</p>
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-foreground/80 hover:bg-red-500/10 hover:text-red-400 transition-colors font-semibold"
                                >
                                    <LogOut className="h-4 w-4" />
                                    Cerrar sesión
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
};
