/* Tipos para el módulo de Informes y Reportes */

export interface CategoriaConteo {
  categoria: string;
  total: number;
}

export interface ReporteActividad {
  usuarios_por_rol: CategoriaConteo[];
  casos_por_estado: CategoriaConteo[];
  documentos_por_estado: CategoriaConteo[];
  sesiones_chat_7d: number;
  mensajes_humanos_30d: number;
  generado_en: string;
}
