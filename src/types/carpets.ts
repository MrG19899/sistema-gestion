

export type AlfombraEstado = 'recepcion' | 'lavado' | 'secado' | 'lista' | 'entregada';
export type AlfombraTipo = 'persa' | 'shaggy' | 'boucle' | 'yute' | 'pelo_corto' | 'pelo_largo' | 'otro';

export interface Alfombra {
    id: string;
    clienteId: string;
    clienteNombre?: string;
    servicioId?: string; // Optional link to a service group

    numeroAlfombra?: string; // Internal ID tag
    dimensiones: string; // "2.5 x 3.0"
    metrosCuadrados?: number;
    tipo: AlfombraTipo;
    color?: string;

    fechaIngreso: string;
    fechaEstimadaEntrega: string;
    fechaEntregaReal?: string;

    estado: AlfombraEstado;
    ubicacionTaller?: string; // "Estante A"

    fotosIngreso: string[];
    fotosSalida?: string[];

    estadoInicial?: string; // "Manchada", "Rota"
    observaciones?: string;
}
