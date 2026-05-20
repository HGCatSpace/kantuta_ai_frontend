/* Tipos para el módulo de Informes y Reportes */

export interface CategoriaConteo {
  categoria: string;
  total: number;
}

export interface ItemConteo {
  nombre: string;
  total: number;
}

export interface CasoInactivo {
  id_caso: number;
  titulo: string;
  dias_inactivo: number;
  ultima_actividad: string | null;
}

export interface ReporteActividad {
  usuarios_por_rol: CategoriaConteo[];
  casos_por_estado: CategoriaConteo[];
  documentos_por_estado: CategoriaConteo[];
  sesiones_chat_7d: number;
  mensajes_humanos_30d: number;
  // Comparativos rango actual vs anterior (misma duración)
  casos_creados: number;
  casos_creados_anterior: number;
  sesiones_chat_creadas: number;
  sesiones_chat_creadas_anterior: number;
  usuarios_activos: number;
  usuarios_activos_anterior: number;
  documentos_subidos: number;
  documentos_subidos_anterior: number;
  // KPIs derivados (sin comparativo)
  promedio_chats_por_caso: number;
  tasa_exito_ingesta: number;
  // Rankings
  casos_por_usuario: ItemConteo[];
  chats_por_caso: ItemConteo[];
  chats_por_usuario: ItemConteo[];
  // Casos abandonados
  casos_sin_actividad: CasoInactivo[];
  dias_inactividad_umbral: number;
  // Rango aplicado
  desde: string;
  hasta: string;
  generado_en: string;
}
