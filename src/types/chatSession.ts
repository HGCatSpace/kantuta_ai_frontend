export interface ChatSession {
    id_session: string;
    titulo: string;
    caso_id: number | null;
    system_prompt_id: number | null;
    es_activo: boolean;
    fecha_creacion: string;
    ultimo_acceso: string;
}

export interface ChatSessionCreate {
    titulo: string;
    caso_id: number;
    system_prompt_id: number;
}
