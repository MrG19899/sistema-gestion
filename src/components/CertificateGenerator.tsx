import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Button } from './ui/button';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Usamos el tipo real de PlagasPage para evitar discrepancias
interface AreaServicio {
    area: string;
    servicios: string[];
}

interface Trampa {
    id: string;
    tipo: string;
    ubicacion: string;
    estado: string;
    fecha_instalacion: string;
}

interface CertPropsReal {
    service: {
        id: string;
        cliente_nombre: string;
        cliente_id?: string;
        sector?: string;
        tipo_servicio?: string;
        tipos_servicio?: string[];
        tecnico_asignado?: string;
        fecha_ejecucion?: string;
        proxima_renovacion?: string;
        numero_certificado?: string;
        direccion?: string;
        observaciones?: string;
        trampas?: Trampa[];
        areas_servicio?: AreaServicio[];
    };
    // Mantenemos compatibilidad con la firma anterior — no se usan
    traps?: unknown[];
    serviceTraps?: unknown[];
}

const ESTADO_LABELS: Record<string, string> = {
    activa: 'Activa',
    consumida: 'Consumida y Repuesta',
    revisada_repuesta: 'Revisada y Repuesta',
    retirada: 'Retirada',
};

const SERVICIO_LABELS: Record<string, string> = {
    fumigacion: 'Fumigación',
    sanitizacion: 'Sanitización',
    desinsectacion: 'Desinsectación',
    desratizacion: 'Desratización',
    integral: 'Control Integral',
};

export const CertificateGenerator: React.FC<CertPropsReal> = ({ service }) => {
    const certificateRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = React.useState(false);

    const generatePDF = async () => {
        if (!certificateRef.current) return;
        try {
            setIsGenerating(true);
            const canvas = await html2canvas(certificateRef.current, {
                scale: 2,
                logging: false,
                useCORS: true,
                backgroundColor: '#ffffff',
            });
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const imgWidth = 210;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            const filename = `Certificado_${service.numero_certificado || 'SN'}_${format(new Date(), 'yyyyMMdd')}.pdf`;
            pdf.save(filename);
        } catch (error) {
            console.error('Error generating PDF:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    const trampas: Trampa[] = Array.isArray(service.trampas) ? service.trampas : [];
    const areasServicio: AreaServicio[] = Array.isArray(service.areas_servicio) ? service.areas_servicio : [];
    const tiposServicio: string[] = Array.isArray(service.tipos_servicio)
        ? service.tipos_servicio
        : service.tipo_servicio
            ? [service.tipo_servicio]
            : [];

    const fechaServicio = service.fecha_ejecucion
        ? format(new Date(service.fecha_ejecucion.includes('T') ? service.fecha_ejecucion : `${service.fecha_ejecucion}T12:00:00`), 'dd/MM/yyyy', { locale: es })
        : '---';

    const fechaVencimiento = service.proxima_renovacion
        ? format(new Date(service.proxima_renovacion.includes('T') ? service.proxima_renovacion : `${service.proxima_renovacion}T12:00:00`), 'dd/MM/yyyy', { locale: es })
        : 'N/A';

    return (
        <div>
            <div className="mb-4">
                <Button
                    onClick={generatePDF}
                    disabled={isGenerating}
                    className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                >
                    {isGenerating ? '⏳ Generando...' : '📄 Descargar Certificado PDF'}
                </Button>
            </div>

            {/* Plantilla del certificado */}
            <div
                ref={certificateRef}
                className="bg-white text-black p-8 mx-auto shadow-sm font-sans"
                style={{ width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}
            >
                {/* ── ENCABEZADO ────────────────────────────────── */}
                <div className="flex justify-between items-start mb-6 border-b-2 border-orange-500 pb-4">
                    <div>
                        <h1 className="text-2xl font-black text-orange-600 tracking-tight">TELOLIMPIO</h1>
                        <p className="text-sm text-gray-600 font-semibold">Control de Plagas & Limpieza Industrial</p>
                        <p className="text-xs text-gray-400 mt-1">Concepción, Chile</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-lg font-bold text-gray-800">CERTIFICADO DE SERVICIO</h2>
                        <p className="text-sm font-mono mt-1 text-orange-700">N° {service.numero_certificado || '---'}</p>
                        <p className="text-xs text-gray-500">Fecha: {fechaServicio}</p>
                    </div>
                </div>

                {/* ── DATOS CLIENTE ─────────────────────────────── */}
                <div className="mb-5 bg-gray-50 p-3 rounded-lg border">
                    <h3 className="text-xs font-bold uppercase text-gray-500 mb-2 tracking-wider">Información del Cliente</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <span className="font-semibold text-gray-700">Cliente:</span>{' '}
                            <span>{service.cliente_nombre}</span>
                        </div>
                        <div>
                            <span className="font-semibold text-gray-700">Dirección:</span>{' '}
                            <span>{service.direccion || '—'}</span>
                        </div>
                        <div>
                            <span className="font-semibold text-gray-700">Sector:</span>{' '}
                            <span>{service.sector || '—'}</span>
                        </div>
                        <div>
                            <span className="font-semibold text-gray-700">Técnico Responsable:</span>{' '}
                            <span>{service.tecnico_asignado || '—'}</span>
                        </div>
                    </div>
                </div>

                {/* ── DETALLES SERVICIO ─────────────────────────── */}
                <div className="mb-5">
                    <h3 className="text-xs font-bold uppercase text-gray-500 mb-2 tracking-wider border-b pb-1">Detalles del Servicio</h3>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <span className="font-semibold text-gray-700">Tipo(s) de Servicio:</span>{' '}
                            <span>{tiposServicio.map(t => SERVICIO_LABELS[t] || t).join(', ') || '—'}</span>
                        </div>
                        <div>
                            <span className="font-semibold text-gray-700">Próximo Vencimiento:</span>{' '}
                            <span>{fechaVencimiento}</span>
                        </div>
                    </div>
                    {service.observaciones && (
                        <div className="mt-2 text-sm">
                            <span className="font-semibold text-gray-700">Observaciones:</span>{' '}
                            <span className="italic text-gray-600">{service.observaciones}</span>
                        </div>
                    )}
                </div>

                {/* ── ÁREAS CON SERVICIOS REALIZADOS ───────────── */}
                {areasServicio.length > 0 && (
                    <div className="mb-5">
                        <h3 className="text-xs font-bold uppercase text-gray-500 mb-2 tracking-wider border-b pb-1">
                            Áreas Sanitizadas / Fumigadas
                        </h3>
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="bg-orange-50 border-b">
                                    <th className="py-1.5 px-2 font-semibold text-gray-700">Área / Zona</th>
                                    <th className="py-1.5 px-2 font-semibold text-gray-700">Servicios Realizados</th>
                                </tr>
                            </thead>
                            <tbody>
                                {areasServicio.map((a, idx) => (
                                    <tr key={idx} className="border-b even:bg-gray-50">
                                        <td className="py-1.5 px-2 font-medium">{a.area || '—'}</td>
                                        <td className="py-1.5 px-2">
                                            {a.servicios.length > 0
                                                ? a.servicios.map(s => SERVICIO_LABELS[s] || s).join(' · ')
                                                : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* ── REGISTRO DE TRAMPAS / CEBOS ──────────────── */}
                <div className="mb-8">
                    <h3 className="text-xs font-bold uppercase text-gray-500 mb-2 tracking-wider border-b pb-1">
                        Registro de Actividad — Trampas / Cebos (Desratización)
                    </h3>
                    {trampas.length === 0 ? (
                        <p className="text-sm italic text-gray-400 py-2">No se registraron trampas en este servicio.</p>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b">
                                    <th className="py-1.5 px-2 font-semibold text-gray-700">#</th>
                                    <th className="py-1.5 px-2 font-semibold text-gray-700">Ubicación</th>
                                    <th className="py-1.5 px-2 font-semibold text-gray-700">Tipo</th>
                                    <th className="py-1.5 px-2 font-semibold text-gray-700">Estado</th>
                                    <th className="py-1.5 px-2 font-semibold text-gray-700">Instalada</th>
                                </tr>
                            </thead>
                            <tbody>
                                {trampas.map((t, idx) => (
                                    <tr key={t.id || idx} className="border-b even:bg-gray-50">
                                        <td className="py-1.5 px-2 text-gray-500">{idx + 1}</td>
                                        <td className="py-1.5 px-2 font-medium">{t.ubicacion}</td>
                                        <td className="py-1.5 px-2 capitalize text-xs text-gray-600">{t.tipo}</td>
                                        <td className="py-1.5 px-2">
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                                t.estado === 'activa' ? 'bg-green-100 text-green-800'
                                                : t.estado === 'consumida' ? 'bg-orange-100 text-orange-800'
                                                : t.estado === 'revisada_repuesta' ? 'bg-blue-100 text-blue-800'
                                                : 'bg-gray-100 text-gray-700'
                                            }`}>
                                                {ESTADO_LABELS[t.estado] || t.estado}
                                            </span>
                                        </td>
                                        <td className="py-1.5 px-2 text-xs text-gray-500">
                                            {t.fecha_instalacion
                                                ? new Date(t.fecha_instalacion).toLocaleDateString('es-CL')
                                                : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* ── FIRMAS ────────────────────────────────────── */}
                <div className="mt-16 grid grid-cols-2 gap-16 text-center">
                    <div className="border-t pt-2">
                        <p className="font-semibold text-sm">{service.tecnico_asignado || 'Técnico'}</p>
                        <p className="text-xs text-gray-500">Firma Técnico</p>
                    </div>
                    <div className="border-t pt-2">
                        <p className="font-semibold text-sm">Cliente / Responsable</p>
                        <p className="text-xs text-gray-500 text-red-400">Firma Cliente</p>
                    </div>
                </div>

                {/* ── PIE LEGAL ─────────────────────────────────── */}
                <div className="mt-10 text-[9px] text-gray-400 text-center border-t pt-3">
                    <p>Este documento certifica que el servicio ha sido realizado conforme a las normas sanitarias vigentes.</p>
                    <p>Telolimpio — Control de Plagas y Limpieza Industrial · Concepción, Chile</p>
                </div>
            </div>
        </div>
    );
};
