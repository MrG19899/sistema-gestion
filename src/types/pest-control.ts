
import type { ServicioEstado } from './common';

export type TrampaType = 'raton' | 'cucaracha' | 'mosca' | 'volador' | 'otro';
export type TrampaEstado = 'activa' | 'inactiva' | 'baja' | 'revision_pendiente';
export type TipoProcesoPlagas = 'desratizacion' | 'desinsectacion' | 'sanitizacion' | 'control_palomas' | 'integral';

export interface Trampa {
    id: string;
    clienteId: string;
    numeroTrampa: string; // Identificador único por cliente (ej: T-01, T-02)
    tipo: TrampaType;
    ubicacion: string; // Ej: "Cocina", "Bodega Exterior"
    estado: TrampaEstado;
    fechaInstalacion: string;
    fechaUltimaRevision?: string;
    observaciones?: string;
    fechaBaja?: string;
    qrCode?: string;
}

export interface ProductoUtilizado {
    nombre: string;
    cantidad: string;
    lote?: string; // Importante para trazabilidad
}

export interface ServicioControlPlagas {
    id: string;
    clienteId: string;
    clienteNombre?: string; // Redundancia para facilitar UI
    numeroCertificado?: string; // Formato: CERT-YYYY-NNNN
    fechaProgramada: string;
    fechaRealizada?: string;
    tecnicoAsignadoId?: string;
    tecnicoAsignadoNombre?: string;
    tipoServicio: TipoProcesoPlagas[];
    estado: ServicioEstado;
    observacionesGenerales?: string;
    sector?: string;

    // Ejecución del Servicio
    tareasRealizadas?: string[];
    productosUtilizados?: ProductoUtilizado[];

    // Certificado
    certificadoGenerado: boolean;
    certificadoUrl?: string;

    costoTotal?: number;
    proximaRenovacion?: string;

    createdAt: string; // ISO date string
    updatedAt?: string; // ISO date string

    // Evidencias (opcionales)
    firmaCliente?: string; // Base64 image
    fotosEvidencia?: string[]; // Array of Base64 or URLs
    validadoCliente?: boolean;
}

export interface ServicioTrampa {
    id: string;
    servicioId: string; // Relación con la Orden de Trabajo
    trampaId: string;   // Relación con el dispositivo físico
    trampaNumero: string; // Redundancia para mostrar "T-01" fácilmente

    // Estado en esta visita
    revisada: boolean;
    estado: 'limpia' | 'sucia' | 'con_captura' | 'no_revisada' | 'deteriorada';
    ceboCambiado: boolean;
    tipoCebo?: string;
    cantidadCebo?: string;

    observaciones?: string;
    fotoUrl?: string; // Evidencia fotográfica
    fechaRevision: string;
}

