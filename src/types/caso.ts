export const EstadoCaso = {
  ABIERTO: 'ABIERTO',
  CERRADO: 'CERRADO',
  ARCHIVADO: 'ARCHIVADO',
} as const;

export type EstadoCaso = (typeof EstadoCaso)[keyof typeof EstadoCaso];

export interface Caso {
  id_caso: number;
  usuario_id: number;
  titulo: string;
  descripcion: string | null;
  estado: EstadoCaso;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface CasoCreate {
  titulo: string;
  descripcion?: string;
  usuario_id: number;
}

export interface CasoUpdate {
  titulo?: string;
  descripcion?: string;
  estado?: EstadoCaso;
}

export interface CasoDetail {
  id_caso: number;
  titulo: string;
  descripcion: string | null;
  estado: EstadoCaso;
  fecha_creacion: string;
  fecha_actualizacion: string;
  usuario_id: number;
  total_documentos: number;
}
