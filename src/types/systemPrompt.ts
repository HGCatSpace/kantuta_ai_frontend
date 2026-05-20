export interface SystemPrompt {
    id_prompt: number;
    nombre: string;
    descripcion: string | null;
    es_activo: boolean;
    contenido_rol?: string | null;
    contenido_tarea?: string | null;
    contenido_alcances?: string | null;
    contenido_contexto?: string | null;
    temperatura?: number;
    top_p?: number;
    top_k?: number;
    documentos_conocimiento?: number[];
}
