export const CategoriaBiblioteca = {
  CONTRATOS: 'Contratos',
  LITIGIOS: 'Litigios',
  CORPORATIVO: 'Corporativo',
  LABORAL: 'Laboral',
  OTROS: 'Otros',
} as const;

export type CategoriaBiblioteca = (typeof CategoriaBiblioteca)[keyof typeof CategoriaBiblioteca];

export const IconoArchivo = {
  PDF: 'pdf',
  DOC: 'doc',
  OTHER: 'other',
} as const;

export type IconoArchivo = (typeof IconoArchivo)[keyof typeof IconoArchivo];

export const EstadoIndexacion = {
  PENDIENTE: 'PENDIENTE',
  PROCESANDO: 'PROCESANDO',
  COMPLETADO: 'COMPLETADO',
  ERROR: 'ERROR',
} as const;

export type EstadoIndexacion = (typeof EstadoIndexacion)[keyof typeof EstadoIndexacion];

export interface DocumentoConocimiento {
  id_documento: number;
  titulo: string;
  categoria: CategoriaBiblioteca;
  icono: IconoArchivo;
  descripcion: string | null;
  nombre_archivo: string | null;
  estado_indexacion: EstadoIndexacion;
  fecha_creacion: string;
  ultima_modificacion: string;
  nombre_uploader: string | null;
}

export interface DocumentoCreate {
  titulo: string;
  categoria?: CategoriaBiblioteca;
  icono?: IconoArchivo;
  descripcion?: string;
  etiquetas?: string;
}

export interface DocumentoUpdate {
  titulo?: string;
  categoria?: CategoriaBiblioteca;
  icono?: IconoArchivo;
  descripcion?: string;
  etiquetas?: string;
}
