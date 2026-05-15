/* Tipo del payload de GET /users/dashboard */

export interface DocumentoReciente {
  id_documento: number;
  titulo: string;
  categoria: string;
  fecha_creacion: string;
}

export interface UserDashboard {
  id: number;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  email: string;
  rol: string | null;
  casos_activos: number;
  documentos_recientes: DocumentoReciente[];
  sesiones_chat_30d: number;
  ultimo_acceso: string;
}
