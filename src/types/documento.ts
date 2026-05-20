export const CategoriaBiblioteca = {
  NORMATIVA_SUSTANTIVA: 'Normativa sustantiva',
  NORMATIVA_ADJETIVA: 'Normativa adjetiva (procesal)',
  NORMATIVA_GENERAL: 'Normativa general / principios',
  MATERIAL_REFERENCIA: 'Material de referencia',
} as const;

export type CategoriaBiblioteca = (typeof CategoriaBiblioteca)[keyof typeof CategoriaBiblioteca];

/** Etiquetas cortas para mostrar en tablas/dropdowns sin ocupar tanto espacio. */
export const CATEGORIA_LABEL: Record<string, string> = {
  'Normativa sustantiva': 'Sustantiva',
  'Normativa adjetiva (procesal)': 'Adjetiva',
  'Normativa general / principios': 'General',
  'Material de referencia': 'Referencia',
};

export function categoriaLabel(cat: string | null | undefined): string {
  if (!cat) return '—';
  return CATEGORIA_LABEL[cat] ?? cat;
}

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
  chunks_procesados: number | null;
  chunks_totales: number | null;
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
