import React, { useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from './ui/button';
import { Eraser, Check } from 'lucide-react';

interface SignaturePadProps {
    onSave: (signatureDataUrl: string) => void;
    onCancel: () => void;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({ onSave, onCancel }) => {
    const sigCanvas = useRef<SignatureCanvas>(null);

    const clear = () => {
        sigCanvas.current?.clear();
    };

    const save = () => {
        if (sigCanvas.current?.isEmpty()) {
            alert('Por favor, firma antes de guardar.');
            return;
        }
        const dataUrl = sigCanvas.current?.getTrimmedCanvas().toDataURL('image/png');
        if (dataUrl) {
            onSave(dataUrl);
        }
    };

    return (
        <div className="flex flex-col items-center gap-4 p-4 bg-white rounded-xl border-2 border-slate-200 shadow-xl max-w-md mx-auto">
            <h3 className="text-lg font-bold text-slate-800">Firma del Cliente</h3>
            <p className="text-xs text-muted-foreground mb-2">Firme dentro del cuadro blanco</p>
            
            <div className="border-2 border-dashed border-slate-300 rounded-lg overflow-hidden bg-slate-50">
                <SignatureCanvas
                    ref={sigCanvas}
                    penColor="black"
                    canvasProps={{
                        width: 320,
                        height: 200,
                        className: 'signature-canvas'
                    }}
                />
            </div>

            <div className="flex gap-4 w-full">
                <Button 
                    variant="outline" 
                    className="flex-1 border-red-200 text-red-600 hover:bg-red-50"
                    onClick={clear}
                >
                    <Eraser className="w-4 h-4 mr-2" />
                    Limpiar
                </Button>
                <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
                    onClick={save}
                >
                    <Check className="w-4 h-4 mr-2" />
                    Confirmar
                </Button>
            </div>
            
            <button 
                className="text-sm text-slate-400 hover:text-slate-600 mt-2 underline"
                onClick={onCancel}
            >
                Cancelar
            </button>
        </div>
    );
};
