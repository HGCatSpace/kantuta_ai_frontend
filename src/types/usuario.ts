export type ActiveUserEnum = 'active' | 'inactive';

export interface Rol {
  id_rol: number;
  nombre: string;
  description: string;
}

export interface Action {
  id_action: number;
  nombre: string;
  descripcion: string;
}

export interface Usuario {
  id: number;
  nombre_de_usuario: string;
  email: string;
  nombre_completo: string;
  activo: ActiveUserEnum;
  id_rol: number | null;
  fecha_registro: string;
  fecha_ultima_modificacion: string;
  rol?: Rol | null;
  actions?: Action[];
}

export interface UsuarioCreate {
  nombre_de_usuario: string;
  email: string;
  nombre_completo: string;
  password: string;
  id_rol?: number | null;
}

export interface UsuarioUpdate {
  nombre_completo?: string;
  email?: string;
  password?: string;
  activo?: ActiveUserEnum;
  id_rol?: number | null;
}
