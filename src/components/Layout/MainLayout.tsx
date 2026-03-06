import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

export const MainLayout: React.FC = () => {
    // Inicializar cerrado en móviles (< 1024px)
    const [sidebarOpen, setSidebarOpen] = React.useState(window.innerWidth >= 1024);

    // Ajustar cuando cambia el tamaño de la ventana (opcional pero recomendado)
    React.useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setSidebarOpen(false);
            } else {
                setSidebarOpen(true);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return (
        <div className="min-h-screen bg-background flex flex-col selection:bg-primary/30">
            <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

            <div className="flex flex-1 pt-16">
                <Sidebar isOpen={sidebarOpen} />

                {/* Overlay para móvil mejorado */}
                <div
                    className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden transition-opacity duration-300 ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                        }`}
                    onClick={() => setSidebarOpen(false)}
                />

                <main className={`flex-1 transition-all duration-300 w-full overflow-x-hidden ${sidebarOpen ? 'lg:ml-0' : 'ml-0'}`}>
                    <div className="p-4 md:p-6 pb-[calc(1rem+env(safe-area-inset-bottom))] w-full max-w-[100vw] overflow-x-hidden">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
};
