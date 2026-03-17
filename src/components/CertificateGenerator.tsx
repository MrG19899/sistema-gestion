import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { SignaturePad } from './SignaturePad';
import templateRoedoresImg from '../assets/template_roedores.png';
import templateDesinsectacionImg from '../assets/template_desinsectacion.png';
import templateSanitizacionImg from '../assets/template_sanitizacion.png';
import firmaDuenioImg from '../assets/firma_dueño.jpg';

export interface AreaServicio {
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
    traps?: unknown[];
    serviceTraps?: unknown[];
}



export const CertificateGenerator: React.FC<CertPropsReal> = ({ service }) => {
    const certificateRef = useRef<HTMLDivElement>(null);
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [signature, setSignature] = React.useState<string | null>(null);
    const [showSignaturePad, setShowSignaturePad] = React.useState(false);
    const [selectedTemplate, setSelectedTemplate] = React.useState<string>(templateRoedoresImg);
    const [availableTemplates, setAvailableTemplates] = React.useState<{ id: string, name: string, img: string }[]>([]);

    // Detect all applicable templates based on the service types
    React.useEffect(() => {
        const types = service.tipos_servicio || [];
        const templates = [];

        if (types.includes('desratizacion')) {
            templates.push({ id: 'roedores', name: 'Roedores', img: templateRoedoresImg });
        }
        if (types.includes('desinsectacion')) {
            templates.push({ id: 'desinsectacion', name: 'Desinsectación', img: templateDesinsectacionImg });
        }
        if (types.includes('sanitizacion') || types.includes('fumigacion') || types.includes('integral')) {
            templates.push({ id: 'sanitizacion', name: 'Sanitización', img: templateSanitizacionImg });
        }

        // Default to roedores if none matched but there's a single service like "control_plagas"
        if (templates.length === 0) {
            templates.push({ id: 'roedores', name: 'Control de Plagas', img: templateRoedoresImg });
        }

        setAvailableTemplates(templates);
        if (templates.length > 0 && !templates.find(t => t.img === selectedTemplate)) {
            setSelectedTemplate(templates[0].img);
        }
    }, [service.tipos_servicio]);

    const trampas: Trampa[] = Array.isArray(service.trampas) ? service.trampas : [];


    const fechaServicio = service.fecha_ejecucion
        ? format(new Date(service.fecha_ejecucion.includes('T') ? service.fecha_ejecucion : `${service.fecha_ejecucion}T12:00:00`), 'dd/MM/yyyy', { locale: es })
        : '---';

    const fechaVencimiento = service.proxima_renovacion
        ? format(new Date(service.proxima_renovacion.includes('T') ? service.proxima_renovacion : `${service.proxima_renovacion}T12:00:00`), 'dd/MM/yyyy', { locale: es })
        : 'N/A';

    const generatePDF = async () => {
        if (!certificateRef.current) return;
        try {
            if (!signature) {
                const proceed = window.confirm('¿Descargar sin firma del cliente?');
                if (!proceed) return;
            }

            const defaultFilename = `Certificado_${service.numero_certificado || 'SN'}_${format(new Date(), 'yyyyMMdd')}`;
            const userFilename = window.prompt('Introduce el nombre para el archivo PDF:', defaultFilename);
            
            if (userFilename === null) return; // Usuario canceló

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
            
            const finalFilename = userFilename.toLowerCase().endsWith('.pdf') 
                ? userFilename 
                : `${userFilename}.pdf`;
                
            pdf.save(finalFilename);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Error al generar el PDF. Por favor, inténtalo de nuevo.');
        } finally {
            setIsGenerating(false);
        }
    };

    // ... (helpers de lógica se mantienen igual)

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center justify-center sm:justify-start">
                {!signature ? (
                    <Button
                        onClick={() => setShowSignaturePad(true)}
                        className="gap-2 bg-orange-600 hover:bg-orange-700 text-white font-bold"
                    >
                        🖋️ Firmar Certificado
                    </Button>
                ) : (
                    <div className="flex items-center gap-2">
                        <Badge variant="success" className="bg-green-100 text-green-800">✅ Firmado</Badge>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => { setSignature(null); setShowSignaturePad(true); }}
                            className="text-xs text-slate-500 hover:text-red-500"
                        >
                            Refirmar
                        </Button>
                    </div>
                )}

                <Button
                    onClick={generatePDF}
                    disabled={isGenerating}
                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                    {isGenerating ? '⏳ Generando...' : '📄 Descargar PDF'}
                </Button>
            </div>

            {/* Pestañas para Selección de Múltiples Certificados */}
            {availableTemplates.length > 1 && (
                <div className="flex gap-2 justify-center print:hidden border-b pb-2">
                    {availableTemplates.map(template => (
                        <button
                            key={template.id}
                            onClick={() => setSelectedTemplate(template.img)}
                            className={`px-4 py-2 rounded-t-lg font-bold text-sm transition-colors border ${
                                selectedTemplate === template.img 
                                    ? 'bg-blue-600 text-white border-blue-600' 
                                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'
                            }`}
                        >
                            Ver Cert. {template.name}
                        </button>
                    ))}
                </div>
            )}

            {showSignaturePad && (
                <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <SignaturePad 
                        onSave={(dataUrl) => {
                            setSignature(dataUrl);
                            setShowSignaturePad(false);
                        }}
                        onCancel={() => setShowSignaturePad(false)}
                    />
                </div>
            )}

            {/* Plantilla del certificado */}
            <div
                ref={certificateRef}
                className="bg-white text-black mx-auto relative overflow-hidden"
                style={{ 
                    width: '210mm', 
                    height: '297mm', 
                    boxSizing: 'border-box',
                    backgroundImage: `url(${selectedTemplate})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    fontFamily: '"Geist", sans-serif'
                }}
            >
                {/* ── DATOS DINÁMICOS SOBREPUESTOS ───────────────── */}
                
                {/* ── DATOS DINÁMICOS SOBREPUESTOS SEGÚN PLANTILLA ───────────────── */}
                
                {selectedTemplate === templateRoedoresImg && (
                    <>
                        {/* ROEDORES - Coordenadas Excatas */}
                        <div className="absolute top-[313px] right-[100px] font-bold text-sm">{service.numero_certificado || '---'}</div>
                        <div className="absolute top-[410px] left-[170px] text-[11px] font-bold w-[250px] uppercase truncate">{service.direccion || '—'}</div>
                        <div className="absolute top-[410px] left-[520px] text-[11px] font-bold w-[200px] uppercase truncate">{service.cliente_nombre}</div>
                        
                        <div className="absolute top-[425px] left-[170px] text-[11px] font-bold w-[250px] uppercase truncate">{service.cliente_nombre}</div>
                        <div className="absolute top-[425px] left-[520px] text-[11px] font-bold w-[200px]">—</div>
                        
                        <div className="absolute top-[442px] left-[170px] text-[11px] font-bold w-[250px] uppercase truncate">{service.tecnico_asignado || '—'}</div>
                        <div className="absolute top-[442px] left-[520px] text-[11px] font-bold w-[200px]">—</div>

                        {/* ROEDORES - Tabla de Trampas */}
                        <div className="absolute top-[515px] left-[108px] right-[108px]">
                            {trampas.slice(0, 10).map((t, idx) => (
                                <div key={t.id || idx} className="grid grid-cols-[33px_33px_120px_88px_73px_95px_flex-1] h-[20.8px] items-center text-[10px] pl-1">
                                    <div className="text-center font-bold px-1">RT</div>
                                    <div className="text-center font-bold">{idx + 1}</div>
                                    <div className="px-2 truncate leading-tight uppercase text-[9px] font-bold">{t.ubicacion}</div>
                                    <div className="text-center px-1 font-bold pt-[2px]">100g</div>
                                    <div className="text-center capitalize px-1 font-bold pt-[1px]">{t.estado === 'activa' ? 'NO' : 'SI'}</div>
                                    <div className="text-center px-1 font-bold pt-[1px]">{fechaVencimiento !== 'N/A' ? fechaVencimiento : 'N/A'}</div>
                                    <div className="pl-3 truncate text-[9px] uppercase font-bold text-slate-700">{t.estado}</div>
                                </div>
                            ))}
                        </div>

                        <div className="absolute top-[752px] left-[452px] text-xs font-bold">{fechaServicio}</div>
                        <div className="absolute top-[825px] left-[130px] right-[120px] text-[10px] uppercase leading-tight font-bold text-slate-800">
                            {service.observaciones || 'Se recomienda mantener limpieza periódica y evitar acumulación de residuos en las áreas tratadas.'}
                        </div>
                    </>
                )}

                {selectedTemplate === templateDesinsectacionImg && (
                    <>
                        <div className="absolute top-[188px] right-[85px] font-bold text-lg text-red-700">{service.numero_certificado || '---'}</div>
                        
                        {/* Coordenadas estimadas para Desinsectación, requiere ajuste fino */}
                        <div className="absolute top-[284px] left-[200px] text-sm font-medium w-[300px]">{service.direccion || '—'}</div>
                        <div className="absolute top-[284px] right-[70px] text-sm font-medium w-[200px]">{service.cliente_nombre}</div>
                        <div className="absolute top-[308px] left-[200px] text-sm font-medium w-[300px]">{service.cliente_nombre}</div>
                        
                        {/* Se omiten trampas o se usa otra tabla si corresponde a insectos */}
                        <div className="absolute top-[698px] right-[130px] text-sm font-bold">{fechaServicio}</div>
                        <div className="absolute top-[780px] left-[130px] right-[120px] text-[11px] leading-tight italic text-slate-700">
                            {service.observaciones || 'Tratamiento de desinsectación realizado conforme a normativa.'}
                        </div>
                    </>
                )}

                {selectedTemplate === templateSanitizacionImg && (
                    <>
                        {/* SANITIZACION - Coordenadas Exactas */}
                        <div className="absolute top-[252px] left-[555px] font-bold text-sm tracking-wide">{service.numero_certificado || '---'}</div>
                        <div className="absolute top-[267px] left-[555px] font-bold text-sm tracking-wide">{fechaServicio}</div>
                        
                        {/* Bloque principal Sanitización */}
                        <div className="absolute top-[452px] left-[150px] text-xs font-bold w-[450px] uppercase">{service.direccion || '—'}</div>
                        <div className="absolute top-[484px] left-[150px] text-xs font-bold w-[450px] uppercase">{service.cliente_nombre}</div>
                        <div className="absolute top-[468px] left-[150px] text-xs font-bold w-[450px]">{/* RUT */}</div>
                        
                        {/* Detalle del trabajo */}
                        <div className="absolute top-[528px] left-[150px] text-[11px] font-bold w-[450px] uppercase leading-relaxed">
                            {service.tipos_servicio?.join(', ')}
                        </div>

                        {/* Observaciones Sanitización */}
                        <div className="absolute top-[620px] left-[150px] text-[10px] uppercase font-bold w-[450px] leading-tight pr-4">
                            {service.observaciones || 'Aplicación de amonio cuaternario y desinfección preventiva en superficies de alto contacto.'}
                        </div>
                        
                        <div className="absolute top-[690px] left-[445px] text-sm font-bold">{fechaServicio}</div>
                        <div className="absolute top-[705px] left-[445px] text-sm font-bold">{fechaVencimiento !== 'N/A' ? fechaVencimiento : ''}</div>
                    </>
                )}

                {/* Firma Cliente */}
                <div className="absolute bottom-[115px] left-[130px] w-56 flex flex-col items-center">
                    {signature ? (
                        <img src={signature} alt="Firma Cliente" className="h-16 mb-1 object-contain mix-blend-multiply" />
                    ) : (
                        <div className="h-16 mb-1"></div>
                    )}
                    <p className="text-[10px] font-bold text-gray-800 uppercase text-center w-full px-2">{service.cliente_nombre}</p>
                </div>

                {/* Firma Técnico (Firma Dueño cargada de assets) */}
                <div className="absolute bottom-[110px] right-[130px] w-56 flex flex-col items-center">
                    <img src={firmaDuenioImg} alt="Firma Autorizada" className="h-[88px] -mb-2 object-contain mix-blend-multiply" />
                    <p className="text-[10px] font-bold text-gray-800 uppercase text-center w-full px-2">{service.tecnico_asignado || 'Francisco García C.'}</p>
                </div>

                {/* Datos de contacto pie de página (opcional, si el template no los tiene claros) */}
                <div className="absolute bottom-[50px] left-0 right-0 text-center text-[8px] text-gray-400">
                    Telolimpio & Control de Plagas · Concepción · +569 68031107
                </div>
            </div>
        </div>
    );
};
