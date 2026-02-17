import { create } from 'zustand';

interface UserData {
  nombre: string;
  email: string;
  userId: number | null;
  rolNombre: string | null;
  actions: string[];
}

interface AuthState {
  token: string | null;
  user: UserData | null;
  setAuth: (token: string, user: { nombre: string; email: string; rol_nombre?: string | null; actions?: string[] }) => void;
  logout: () => void;
}

function parseUserIdFromToken(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub ? Number(payload.sub) : null;
  } catch {
    return null;
  }
}

function buildUserData(token: string, userData: { nombre: string; email: string; rol_nombre?: string | null; actions?: string[] }): UserData {
  return {
    nombre: userData.nombre,
    email: userData.email,
    userId: parseUserIdFromToken(token),
    rolNombre: userData.rol_nombre ?? null,
    actions: userData.actions ?? [],
  };
}

// Restore user data from localStorage, enriching with userId from token
function getInitialUser(): UserData | null {
  const raw = localStorage.getItem('user_data');
  const token = localStorage.getItem('access_token');
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const userId = token ? parseUserIdFromToken(token) : null;
    return {
      nombre: parsed.nombre ?? '',
      email: parsed.email ?? '',
      userId,
      rolNombre: parsed.rolNombre ?? null,
      actions: parsed.actions ?? [],
    };
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('access_token'),
  user: getInitialUser(),

  setAuth: (token, user) => {
    const enrichedUser = buildUserData(token, user);
    localStorage.setItem('access_token', token);
    localStorage.setItem('user_data', JSON.stringify({
      nombre: enrichedUser.nombre,
      email: enrichedUser.email,
      rolNombre: enrichedUser.rolNombre,
      actions: enrichedUser.actions,
    }));
    set({ token, user: enrichedUser });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user_data');
    set({ token: null, user: null });
  },
}));
