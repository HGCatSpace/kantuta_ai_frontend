export interface SystemPrompt {
  id_prompt: number;
  nombre: string;
  descripcion: string | null;
  contenido_instruccion: string;
  resumen_logica: string | null;
  contenido_rol: string | null;
  contenido_tarea: string | null;
  contenido_alcances: string | null;
  contenido_contexto: string | null;
  es_activo: boolean;
  temperatura: number;
  top_p: number;
  penalizacion_frecuencia: number;
  tokens_maximos: number;
  id_experto_creador: number;
  nombre_creador: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
  documentos_conocimiento: number[];
}

export interface SystemPromptCreate {
  nombre: string;
  contenido_instruccion?: string;
  descripcion?: string | null;
  resumen_logica?: string | null;
  contenido_rol?: string | null;
  contenido_tarea?: string | null;
  contenido_alcances?: string | null;
  contenido_contexto?: string | null;
  es_activo?: boolean;
  temperatura?: number;
  top_p?: number;
  penalizacion_frecuencia?: number;
  tokens_maximos?: number;
}

export interface SystemPromptUpdate {
  nombre?: string;
  contenido_instruccion?: string;
  descripcion?: string | null;
  resumen_logica?: string | null;
  contenido_rol?: string | null;
  contenido_tarea?: string | null;
  contenido_alcances?: string | null;
  contenido_contexto?: string | null;
  es_activo?: boolean;
  temperatura?: number;
  top_p?: number;
  penalizacion_frecuencia?: number;
  tokens_maximos?: number;
  documentos_conocimiento?: number[];
}
