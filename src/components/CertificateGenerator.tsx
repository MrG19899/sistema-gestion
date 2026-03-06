import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Button } from './ui/button';
import { FileText, Loader2 } from 'lucide-react';
import type { ServicioControlPlagas, Trampa, ServicioTrampa } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CertificateGeneratorProps {
    service: ServicioControlPlagas;
    traps: Trampa[];
    serviceTraps: ServicioTrampa[];
    onGenerated?: (url: string) => void;
}

export const CertificateGenerator: React.FC<CertificateGeneratorProps> = ({
    service,
    traps,
    serviceTraps,
}) => {
    const certificateRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = React.useState(false);

    const generatePDF = async () => {
        if (!certificateRef.current) return;

        try {
            setIsGenerating(true);

            // Create canvas from the certificate element
            const canvas = await html2canvas(certificateRef.current, {
                scale: 2, // Higher resolution
                logging: false,
                useCORS: true,
                backgroundColor: '#ffffff'
            });

            // Calculate PDF dimensions
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 210; // A4 width in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

            // Generate filename based on service/client
            const filename = `Certificado_${service.numeroCertificado || 'S/N'}_${format(new Date(), 'yyyyMMdd')}.pdf`;

            // Save PDF
            pdf.save(filename);

        } catch (error) {
            console.error('Error generating PDF:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div>
            <div className="mb-4">
                <Button
                    onClick={generatePDF}
                    disabled={isGenerating}
                    className="gap-2"
                >
                    {isGenerating ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Generando...
                        </>
                    ) : (
                        <>
                            <FileText className="h-4 w-4" />
                            Descargar Certificado PDF
                        </>
                    )}
                </Button>
            </div>

            {/* Hidden container for PDF generation (visible only off-screen or strictly for capture) 
                Actually, we might want to show a preview. For now, let's make it visible but distinct.
            */}
            <div className="border rounded-lg p-4 bg-gray-50 overflow-auto max-h-[500px]">
                <h3 className="text-sm font-medium mb-2 text-muted-foreground">Previsualización del Certificado:</h3>

                {/* Certificate Template */}
                <div
                    ref={certificateRef}
                    className="bg-white text-black p-8 mx-auto shadow-sm"
                    style={{
                        width: '210mm',
                        minHeight: '297mm',
                        boxSizing: 'border-box'
                    }}
                >
                    {/* Header */}
                    <div className="flex justify-between items-start mb-8 border-b pb-4">
                        <div>
                            <h1 className="text-2xl font-bold text-orange-600">TELOLIMPIO</h1>
                            <p className="text-sm text-gray-600">Servicios de Limpieza y Control de Plagas</p>
                            <p className="text-xs text-gray-500">Av. Ejemplo 123, Ciudad</p>
                            <p className="text-xs text-gray-500">Tel: +56 9 1234 5678</p>
                        </div>
                        <div className="text-right">
                            <h2 className="text-xl font-bold">CERTIFICADO DE SERVICIO</h2>
                            <p className="text-sm font-mono mt-1">N° {service.numeroCertificado || '---'}</p>
                            <p className="text-sm text-gray-500">Fecha: {format(new Date(service.fechaRealizada || new Date()), 'dd/MM/yyyy', { locale: es })}</p>
                        </div>
                    </div>

                    {/* Client Info */}
                    <div className="mb-8">
                        <h3 className="text-sm font-bold uppercase border-b mb-2 pb-1">Información del Cliente</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p><span className="font-semibold">Cliente:</span> {service.clienteNombre}</p>
                                <p><span className="font-semibold">Dirección:</span> {'---'}</p>
                            </div>
                            <div>
                                <p><span className="font-semibold">RUT/NIT:</span> {service.clienteId || '---'} (Simulado)</p>
                            </div>
                        </div>
                    </div>

                    {/* Service Details */}
                    <div className="mb-6">
                        <h3 className="text-sm font-bold uppercase border-b mb-2 pb-1">Detalles del Servicio</h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p><span className="font-semibold">Tipo de Servicio:</span> {Array.isArray(service.tipoServicio) ? service.tipoServicio.join(', ') : service.tipoServicio}</p>
                                <p><span className="font-semibold">Técnico Responsable:</span> {service.tecnicoAsignadoNombre}</p>
                            </div>
                            <div>
                                <p><span className="font-semibold">Próximo Vencimiento:</span> {service.proximaRenovacion ? format(new Date(service.proximaRenovacion), 'dd/MM/yyyy') : 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Tasks Checklist */}
                    {service.tareasRealizadas && service.tareasRealizadas.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-sm font-bold uppercase border-b mb-2 pb-1">Actividades Realizadas</h3>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                {service.tareasRealizadas.map((task, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="text-green-600">✓</span> {task}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Materials Used */}
                    {service.productosUtilizados && service.productosUtilizados.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-sm font-bold uppercase border-b mb-2 pb-1">Materiales Utilizados</h3>
                            <table className="w-full text-sm text-left">
                                <thead>
                                    <tr className="border-b bg-gray-50">
                                        <th className="py-1 px-1">Producto</th>
                                        <th className="py-1 px-1">Cantidad</th>
                                        <th className="py-1 px-1">Lote</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {service.productosUtilizados.map((prod, idx) => (
                                        <tr key={idx} className="border-b">
                                            <td className="py-1 px-1">{prod.nombre}</td>
                                            <td className="py-1 px-1">{prod.cantidad}</td>
                                            <td className="py-1 px-1">{prod.lote || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Traps/Activity Summary */}
                    <div className="mb-8">
                        <h3 className="text-sm font-bold uppercase border-b mb-2 pb-1">Registro de Actividad (Trampas/Cebos)</h3>
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="border-b bg-gray-50">
                                    <th className="py-2 px-1">Trampa #</th>
                                    <th className="py-2 px-1">Ubicación</th>
                                    <th className="py-2 px-1">Estado</th>
                                    <th className="py-2 px-1">Cebo / Obs.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {serviceTraps.map((st) => {
                                    const trampa = traps.find(t => t.id === st.trampaId);
                                    return (
                                        <tr key={st.id} className="border-b">
                                            <td className="py-2 px-1 text-xs">{trampa?.numeroTrampa || '???'}</td>
                                            <td className="py-2 px-1 text-xs">{trampa?.ubicacion || '-'}</td>
                                            <td className="py-2 px-1 text-xs uppercase font-semibold">{st.estado.replace('_', ' ')}</td>
                                            <td className="py-2 px-1 text-xs">
                                                {st.ceboCambiado ? `Sí (${st.cantidadCebo || ''})` : 'No'}
                                                {st.observaciones && <div className="italic text-gray-500">{st.observaciones}</div>}
                                            </td>
                                        </tr>
                                    );
                                })}
                                {serviceTraps.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-4 text-center text-gray-500 italic">
                                            No se registraron trampas en este servicio.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer / Signatures */}
                    <div className="mt-16 grid grid-cols-2 gap-16 text-center">
                        <div className="border-t pt-2">
                            <p className="font-semibold text-sm">{service.tecnicoAsignadoNombre}</p>
                            <p className="text-xs text-gray-500">Firma Técnico</p>
                        </div>
                        <div className="border-t pt-2">
                            <p className="font-semibold text-sm">Cliente / Responsable</p>
                            <p className="text-xs text-gray-500">Firma Cliente</p>
                        </div>
                    </div>

                    {/* Legal / Disclaimer */}
                    <div className="mt-12 text-[10px] text-gray-400 text-center">
                        <p>Este documento certifica que el servicio ha sido realizado conforme a las normas sanitarias vigentes.</p>
                        <p>Telolimpio - Control de Plagas y Limpieza Industrial</p>
                    </div>

                </div>
            </div>
        </div>
    );
};
