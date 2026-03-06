import React from 'react';
import { NavLink } from 'react-router-dom';
// import { ... } from 'lucide-react';
const LayoutDashboard = ({ className }: { className?: string }) => <span className={className}>📊</span>;
const Users = ({ className }: { className?: string }) => <span className={className}>👥</span>;
const Sparkles = ({ className }: { className?: string }) => <span className={className}>✨</span>;
const Bug = ({ className }: { className?: string }) => <span className={className}>🕷️</span>;
const Package = ({ className }: { className?: string }) => <span className={className}>📦</span>;
const BarChart3 = ({ className }: { className?: string }) => <span className={className}>📈</span>;
const Settings = ({ className }: { className?: string }) => <span className={className}>⚙️</span>;
const UserCog = ({ className }: { className?: string }) => <span className={className}>🛠️</span>;
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
    isOpen: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen }) => {
    const { profile } = useAuth();

    const menuItems = [
        { icon: LayoutDashboard, label: 'Dashboard', path: '/', roles: ['adminsupremo', 'admin'] },
        { icon: Users, label: 'Clientes', path: '/clientes', roles: ['adminsupremo', 'admin'] },
        { icon: Sparkles, label: 'Limpieza', path: '/limpieza', roles: ['adminsupremo', 'admin', 'worker'] },
        { icon: Package, label: 'Alfombras Local', path: '/alfombras', roles: ['adminsupremo', 'admin', 'worker'] },
        { icon: Bug, label: 'Control de Plagas', path: '/plagas', roles: ['adminsupremo', 'admin', 'worker'] },
        { icon: BarChart3, label: 'Reportes', path: '/reportes', roles: ['adminsupremo', 'admin'] },
        { icon: UserCog, label: 'Usuarios', path: '/usuarios', roles: ['adminsupremo'] },
        { icon: Settings, label: 'Configuración', path: '/configuracion', roles: ['adminsupremo', 'admin'] },
    ];

    const filteredItems = menuItems.filter(item =>
        item.roles.includes(profile?.rol || '')
    );

    return (
        <aside
            className={`fixed left-0 top-16 h-[calc(100vh-4rem)] bg-card/80 backdrop-blur-xl border-r border-border transition-transform duration-300 z-40 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                } w-72 lg:w-64 lg:translate-x-0 lg:static lg:h-auto`}
        >
            <nav className="p-4 space-y-3">
                {filteredItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            className={({ isActive }) =>
                                `flex items-center gap-4 px-4 py-4 lg:py-3 rounded-2xl transition-all duration-200 border border-transparent active:scale-[0.98] ${isActive
                                    ? 'bg-primary/20 text-primary shadow-neon-blue border-primary/30 font-bold'
                                    : 'text-muted-foreground hover:bg-black/5 hover:text-primary hover:border-black/10'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon className={`h-6 w-6 lg:h-5 lg:w-5 ${isActive ? 'neon-glow text-primary' : ''}`} />
                                    <span className="text-base lg:text-sm">{item.label}</span>
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            {/* Footer del sidebar con safe area */}
            <div className="absolute bottom-0 left-0 right-0 p-6 border-t border-border bg-card/30 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                <div className="text-xs text-muted-foreground text-center">
                    <p className="font-black text-primary/80 neon-glow uppercase tracking-widest text-sm">Te lo limpio</p>
                    <p className="mt-1 opacity-60">© 2026 • Versión 1.2.5</p>
                </div>
            </div>
        </aside>
    );
};
