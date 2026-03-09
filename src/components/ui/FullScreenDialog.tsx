import * as React from "react"
import { X } from "lucide-react"

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
    // Prevent body scroll when open
    React.useEffect(() => {
        if (open) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "auto";
        }
        return () => { document.body.style.overflow = "auto"; };
    }, [open]);

    if (!open) return null;

    return (
        <div className={`fixed inset-0 z-[100] bg-background flex flex-col w-full h-[100dvh] overflow-hidden animate-in slide-in-from-bottom-4 duration-200 ${className || ''}`}>
            {/* Header Fijo */}
            {!hideHeader && (
                <div className="flex items-center justify-between px-4 py-3 border-b bg-background z-10 sticky top-0 shadow-sm">
                    <div>
                        <h2 className="text-lg font-bold text-foreground">{title}</h2>
                        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
                    </div>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="p-2 rounded-full hover:bg-slate-100 transition-colors"
                        aria-label="Cerrar"
                    >
                        <X className="h-5 w-5 text-slate-600" />
                    </button>
                </div>
            )}

            {/* Contenido scroleable (El formulario) */}
            <div className={`flex-1 overflow-y-auto w-full ${contentClassName ?? 'max-w-2xl mx-auto p-4 sm:p-6 pb-24'}`}>
                {children}
            </div>
        </div>
    );
}
