import * as React from "react"
import { X } from "lucide-react"

import { createPortal } from "react-dom"

interface FullScreenDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: string;
    children: React.ReactNode;
    className?: string;
    contentClassName?: string;
    hideHeader?: boolean;
}

export function FullScreenDialog({
    open,
    onOpenChange,
    title,
    description,
    children,
    className,
    contentClassName,
    hideHeader
}: FullScreenDialogProps) {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    // Prevent body scroll when open
    React.useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
        return () => { document.body.style.overflow = "auto"; };
    }, [open]);

    if (!open || !mounted) return null;

    const dialogContent = (
        <div className={`fixed inset-0 z-[99999] bg-background flex flex-col w-full h-[100dvh] md:h-screen overflow-hidden animate-in slide-in-from-bottom-4 duration-300 ${className || ''}`}>
            {/* Header Fijo */}
            {!hideHeader && (
                <div className="flex-none flex items-center justify-between px-4 py-3 border-b bg-background z-10 shadow-sm relative">
                    <div>
                        <h2 className="text-lg font-bold text-foreground leading-tight">{title}</h2>
                        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
                    </div>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="p-2 rounded-full hover:bg-slate-100 transition-colors ml-2 flex-shrink-0"
                        aria-label="Cerrar"
                    >
                        <X className="h-6 w-6 text-slate-600" />
                    </button>
                </div>
            )}

            {/* Contenido scroleable (El formulario) */}
            <div className={`flex-1 overflow-y-auto overscroll-contain w-full relative ${contentClassName ?? 'max-w-2xl mx-auto p-4 sm:p-6 pb-[env(safe-area-inset-bottom,2rem)] leading-relaxed'}`}>
                {children}
            </div>
        </div>
    );

    return createPortal(dialogContent, document.body);
}
