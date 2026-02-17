import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Pencil,
  Power,
  Loader2,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getUsuarios,
  getUsuariosCount,
  createUsuario,
  updateUsuario,
  getRoles,
  getActions,
  getUserActions,
  assignAction,
  removeAction,
} from '../api/usuarios';
import type {
  Usuario,
  UsuarioCreate,
  UsuarioUpdate,
  Rol,
  Action,
  ActiveUserEnum,
} from '../types/usuario';
import './UsuariosPage.css';

const ITEMS_PER_PAGE = 5;

const dateFormatter = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

function formatFecha(isoDate: string): string {
  try {
    return dateFormatter.format(new Date(isoDate));
  } catch {
    return isoDate;
  }
}

function getInitials(nombreCompleto: string): string {
  const parts = nombreCompleto.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return (parts[0]?.[0] ?? '?').toUpperCase();
}

function getRolDotClass(rolNombre?: string | null): string {
  if (!rolNombre) return 'usuarios-table__tipo-dot--default';
  const lower = rolNombre.toLowerCase();
  if (lower.includes('admin')) return 'usuarios-table__tipo-dot--admin';
  if (lower.includes('experto')) return 'usuarios-table__tipo-dot--experto';
  return 'usuarios-table__tipo-dot--default';
}

type SortMode = 'fecha_desc' | 'nombre_asc';
type FilterRol = number | null;
type FilterEstado = ActiveUserEnum | null;

/* ── Añadir Usuario Modal ── */

function AnadirUsuarioModal({
  roles,
  allActions,
  onClose,
  onSubmit,
  isLoading,
}: {
  roles: Rol[];
  allActions: Action[];
  onClose: () => void;
  onSubmit: (data: UsuarioCreate, selectedActionIds: number[]) => void;
  isLoading: boolean;
}) {
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [nombreUsuario, setNombreUsuario] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [idRol, setIdRol] = useState<number | ''>('');
  const [checkedActions, setCheckedActions] = useState<Set<number>>(new Set());

  const toggleAction = (actionId: number) => {
    setCheckedActions((prev) => {
      const next = new Set(prev);
      if (next.has(actionId)) {
        next.delete(actionId);
      } else {
        next.add(actionId);
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreCompleto.trim() || !nombreUsuario.trim() || !email.trim() || !password.trim()) return;
    onSubmit(
      {
        nombre_completo: nombreCompleto.trim(),
        nombre_de_usuario: nombreUsuario.trim(),
        email: email.trim(),
        password,
        id_rol: idRol !== '' ? idRol : undefined,
      },
      Array.from(checkedActions)
    );
  };

  return (
    <div className="usuarios-modal-overlay" onClick={onClose}>
      <div className="usuarios-modal" onClick={(e) => e.stopPropagation()}>
        <div className="usuarios-modal__header">
          <h2>Añadir Usuario</h2>
          <button className="usuarios-modal__close" onClick={onClose}>
            <X />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="usuarios-modal__field">
            <label htmlFor="add-nombre-completo">Nombre Completo</label>
            <input
              id="add-nombre-completo"
              type="text"
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              placeholder="Ej: Juan Pérez Mamani"
              required
            />
          </div>
          <div className="usuarios-modal__field">
            <label htmlFor="add-nombre-usuario">Nombre de Usuario</label>
            <input
              id="add-nombre-usuario"
              type="text"
              value={nombreUsuario}
              onChange={(e) => setNombreUsuario(e.target.value)}
              placeholder="Ej: jperez"
              required
            />
          </div>
          <div className="usuarios-modal__field">
            <label htmlFor="add-email">Correo Electrónico</label>
            <input
              id="add-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ej: juan@empresa.com"
              required
            />
          </div>
          <div className="usuarios-modal__field">
            <label htmlFor="add-password">Contraseña</label>
            <input
              id="add-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña segura"
              required
            />
          </div>
          <div className="usuarios-modal__field">
            <label htmlFor="add-rol">Rol</label>
            <select
              id="add-rol"
              value={idRol}
              onChange={(e) => setIdRol(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Sin rol</option>
              {roles.map((r) => (
                <option key={r.id_rol} value={r.id_rol}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </div>
          {allActions.length > 0 && (
            <div className="usuarios-modal__field">
              <label>Acciones Permitidas</label>
              <div className="usuarios-modal__checkboxes">
                {allActions.map((action) => (
                  <label key={action.id_action} className="usuarios-modal__checkbox-item">
                    <input
                      type="checkbox"
                      checked={checkedActions.has(action.id_action)}
                      onChange={() => toggleAction(action.id_action)}
                    />
                    {action.nombre}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="usuarios-modal__actions">
            <button type="button" className="usuarios-modal__cancel" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="usuarios-modal__submit"
              disabled={isLoading || !nombreCompleto.trim() || !nombreUsuario.trim() || !email.trim() || !password.trim()}
            >
              {isLoading ? <Loader2 className="spin" /> : 'Crear usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Modificar Usuario Modal ── */

function ModificarUsuarioModal({
  usuario,
  roles,
  allActions,
  onClose,
  onSubmit,
  isLoading,
}: {
  usuario: Usuario;
  roles: Rol[];
  allActions: Action[];
  onClose: () => void;
  onSubmit: (data: UsuarioUpdate, checkedActionIds: number[]) => void;
  isLoading: boolean;
}) {
  const [nombreCompleto, setNombreCompleto] = useState(usuario.nombre_completo);
  const [email, setEmail] = useState(usuario.email);
  const [password, setPassword] = useState('');
  const [idRol, setIdRol] = useState<number | ''>(usuario.id_rol ?? '');
  const [activo, setActivo] = useState<ActiveUserEnum>(usuario.activo);
  const [checkedActions, setCheckedActions] = useState<Set<number>>(new Set());
  const [actionsLoaded, setActionsLoaded] = useState(false);

  useEffect(() => {
    getUserActions(usuario.id).then((userActions) => {
      setCheckedActions(new Set(userActions.map((a) => a.id_action)));
      setActionsLoaded(true);
    });
  }, [usuario.id]);

  const toggleAction = (actionId: number) => {
    setCheckedActions((prev) => {
      const next = new Set(prev);
      if (next.has(actionId)) {
        next.delete(actionId);
      } else {
        next.add(actionId);
      }
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: UsuarioUpdate = {};
    if (nombreCompleto.trim() !== usuario.nombre_completo) data.nombre_completo = nombreCompleto.trim();
    if (email.trim() !== usuario.email) data.email = email.trim();
    if (password) data.password = password;
    if ((idRol !== '' ? idRol : null) !== usuario.id_rol) data.id_rol = idRol !== '' ? idRol : null;
    if (activo !== usuario.activo) data.activo = activo;
    onSubmit(data, Array.from(checkedActions));
  };

  return (
    <div className="usuarios-modal-overlay" onClick={onClose}>
      <div className="usuarios-modal" onClick={(e) => e.stopPropagation()}>
        <div className="usuarios-modal__header">
          <h2>Modificar Usuario</h2>
          <button className="usuarios-modal__close" onClick={onClose}>
            <X />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="usuarios-modal__field">
            <label htmlFor="edit-nombre-completo">Nombre Completo</label>
            <input
              id="edit-nombre-completo"
              type="text"
              value={nombreCompleto}
              onChange={(e) => setNombreCompleto(e.target.value)}
              required
            />
          </div>
          <div className="usuarios-modal__field">
            <label htmlFor="edit-email">Correo Electrónico</label>
            <input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="usuarios-modal__field">
            <label htmlFor="edit-password">Contraseña (dejar vacío para no cambiar)</label>
            <input
              id="edit-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nueva contraseña"
            />
          </div>
          <div className="usuarios-modal__field">
            <label htmlFor="edit-rol">Rol</label>
            <select
              id="edit-rol"
              value={idRol}
              onChange={(e) => setIdRol(e.target.value ? Number(e.target.value) : '')}
            >
              <option value="">Sin rol</option>
              {roles.map((r) => (
                <option key={r.id_rol} value={r.id_rol}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </div>
          {allActions.length > 0 && (
            <div className="usuarios-modal__field">
              <label>Acciones Permitidas</label>
              {!actionsLoaded ? (
                <div className="usuarios-page__status">
                  <Loader2 className="spin" /> Cargando acciones...
                </div>
              ) : (
                <div className="usuarios-modal__checkboxes">
                  {allActions.map((action) => (
                    <label key={action.id_action} className="usuarios-modal__checkbox-item">
                      <input
                        type="checkbox"
                        checked={checkedActions.has(action.id_action)}
                        onChange={() => toggleAction(action.id_action)}
                      />
                      {action.nombre}
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="usuarios-modal__field">
            <label htmlFor="edit-estado">Estado</label>
            <select
              id="edit-estado"
              value={activo}
              onChange={(e) => setActivo(e.target.value as ActiveUserEnum)}
            >
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
            </select>
          </div>
          <div className="usuarios-modal__actions">
            <button type="button" className="usuarios-modal__cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="usuarios-modal__submit" disabled={isLoading}>
              {isLoading ? <Loader2 className="spin" /> : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Pagination helpers ── */

function buildPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

/* ── Main Page ── */

export default function UsuariosPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortMode, setSortMode] = useState<SortMode>('fecha_desc');
  const [filterRol, setFilterRol] = useState<FilterRol>(null);
  const [filterEstado, setFilterEstado] = useState<FilterEstado>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);

  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilterDropdown(false);
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const { data: usuarios = [], isLoading, isError } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => getUsuarios(0, 200),
  });

  const { data: totalCount } = useQuery({
    queryKey: ['usuarios-count'],
    queryFn: getUsuariosCount,
  });

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: getRoles,
  });

  const { data: allActions = [] } = useQuery({
    queryKey: ['actions'],
    queryFn: getActions,
  });

  const rolesMap = useMemo(() => {
    const map = new Map<number, Rol>();
    for (const r of roles) map.set(r.id_rol, r);
    return map;
  }, [roles]);

  // Filter + search + sort
  const processedUsuarios = useMemo(() => {
    let result = [...usuarios];

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (u) =>
          u.nombre_completo.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.nombre_de_usuario.toLowerCase().includes(q)
      );
    }

    // Filter by rol
    if (filterRol !== null) {
      result = result.filter((u) => u.id_rol === filterRol);
    }

    // Filter by estado
    if (filterEstado !== null) {
      result = result.filter((u) => u.activo === filterEstado);
    }

    // Sort
    if (sortMode === 'fecha_desc') {
      result.sort((a, b) => new Date(b.fecha_registro).getTime() - new Date(a.fecha_registro).getTime());
    } else {
      result.sort((a, b) => a.nombre_completo.localeCompare(b.nombre_completo, 'es'));
    }

    return result;
  }, [usuarios, searchQuery, filterRol, filterEstado, sortMode]);

  const totalFiltered = processedUsuarios.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedUsuarios = processedUsuarios.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  // Reset page on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterRol, filterEstado, sortMode]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: async ({ data, actionIds }: { data: UsuarioCreate; actionIds: number[] }) => {
      const newUser = await createUsuario(data);
      if (actionIds.length > 0) {
        await Promise.all(actionIds.map((actionId) => assignAction(newUser.id, actionId)));
      }
      return newUser;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      queryClient.invalidateQueries({ queryKey: ['usuarios-count'] });
      setShowAddModal(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UsuarioUpdate }) => updateUsuario(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    },
  });

  const toggleEstado = (usuario: Usuario) => {
    const newEstado: ActiveUserEnum = usuario.activo === 'active' ? 'inactive' : 'active';
    updateMutation.mutate({ id: usuario.id, data: { activo: newEstado } });
  };

  const handleModificarSubmit = async (data: UsuarioUpdate, checkedActionIds: number[]) => {
    if (!editingUser) return;

    // 1. Update user fields if any changed
    const hasFieldChanges = Object.keys(data).length > 0;
    if (hasFieldChanges) {
      await updateUsuario(editingUser.id, data);
    }

    // 2. Sync actions
    const currentActions = await getUserActions(editingUser.id);
    const currentIds = new Set(currentActions.map((a) => a.id_action));
    const newIds = new Set(checkedActionIds);

    const toAdd = checkedActionIds.filter((id) => !currentIds.has(id));
    const toRemove = currentActions.filter((a) => !newIds.has(a.id_action)).map((a) => a.id_action);

    await Promise.all([
      ...toAdd.map((actionId) => assignAction(editingUser.id, actionId)),
      ...toRemove.map((actionId) => removeAction(editingUser.id, actionId)),
    ]);

    queryClient.invalidateQueries({ queryKey: ['usuarios'] });
    setEditingUser(null);
  };

  const displayTotal = totalCount ?? usuarios.length;
  const hasActiveFilters = filterRol !== null || filterEstado !== null;

  return (
    <div className="usuarios-page">
      {/* Header */}
      <div className="usuarios-page__header">
        <div>
          <h1 className="usuarios-page__title">Gestión de Usuarios</h1>
          <p className="usuarios-page__subtitle">
            Administra los usuarios del sistema, sus roles y permisos
          </p>
        </div>
        <button className="usuarios-page__new-btn" onClick={() => setShowAddModal(true)}>
          <Plus />
          Añadir Usuario
        </button>
      </div>

      {/* Toolbar */}
      <div className="usuarios-page__toolbar">
        <div className="usuarios-page__search">
          <Search className="usuarios-page__search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre, email o usuario..."
            className="usuarios-page__search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filtros */}
        <div className="usuarios-page__dropdown-wrapper" ref={filterRef}>
          <button
            className={`usuarios-page__toolbar-btn ${hasActiveFilters ? 'usuarios-page__toolbar-btn--active' : ''}`}
            onClick={() => setShowFilterDropdown((v) => !v)}
          >
            <SlidersHorizontal />
            Filtros
          </button>
          {showFilterDropdown && (
            <div className="usuarios-page__dropdown">
              <button
                className={`usuarios-page__dropdown-item ${filterRol === null && filterEstado === null ? 'usuarios-page__dropdown-item--active' : ''}`}
                onClick={() => { setFilterRol(null); setFilterEstado(null); setShowFilterDropdown(false); }}
              >
                Todos
              </button>
              <div className="usuarios-page__dropdown-divider" />
              {roles.map((r) => (
                <button
                  key={r.id_rol}
                  className={`usuarios-page__dropdown-item ${filterRol === r.id_rol ? 'usuarios-page__dropdown-item--active' : ''}`}
                  onClick={() => { setFilterRol(filterRol === r.id_rol ? null : r.id_rol); setShowFilterDropdown(false); }}
                >
                  {r.nombre}
                </button>
              ))}
              <div className="usuarios-page__dropdown-divider" />
              <button
                className={`usuarios-page__dropdown-item ${filterEstado === 'active' ? 'usuarios-page__dropdown-item--active' : ''}`}
                onClick={() => { setFilterEstado(filterEstado === 'active' ? null : 'active'); setShowFilterDropdown(false); }}
              >
                Activos
              </button>
              <button
                className={`usuarios-page__dropdown-item ${filterEstado === 'inactive' ? 'usuarios-page__dropdown-item--active' : ''}`}
                onClick={() => { setFilterEstado(filterEstado === 'inactive' ? null : 'inactive'); setShowFilterDropdown(false); }}
              >
                Inactivos
              </button>
            </div>
          )}
        </div>

        {/* Ordenar */}
        <div className="usuarios-page__dropdown-wrapper" ref={sortRef}>
          <button
            className="usuarios-page__toolbar-btn"
            onClick={() => setShowSortDropdown((v) => !v)}
          >
            <ArrowUpDown />
            Ordenar
          </button>
          {showSortDropdown && (
            <div className="usuarios-page__dropdown">
              <button
                className={`usuarios-page__dropdown-item ${sortMode === 'fecha_desc' ? 'usuarios-page__dropdown-item--active' : ''}`}
                onClick={() => { setSortMode('fecha_desc'); setShowSortDropdown(false); }}
              >
                Más recientes
              </button>
              <button
                className={`usuarios-page__dropdown-item ${sortMode === 'nombre_asc' ? 'usuarios-page__dropdown-item--active' : ''}`}
                onClick={() => { setSortMode('nombre_asc'); setShowSortDropdown(false); }}
              >
                Nombre A-Z
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Loading / Error */}
      {isLoading && (
        <div className="usuarios-page__status">
          <Loader2 className="spin" /> Cargando usuarios...
        </div>
      )}

      {isError && (
        <div className="usuarios-page__status usuarios-page__status--error">
          Error al cargar los usuarios. Verifica tu conexión.
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && (
        <>
          <table className="usuarios-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Tipo</th>
                <th>Creado</th>
                <th>Modificado</th>
                <th>Modificar</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {paginatedUsuarios.length === 0 ? (
                <tr>
                  <td colSpan={6} className="usuarios-table__empty">
                    {searchQuery || hasActiveFilters
                      ? 'No se encontraron usuarios con esos filtros.'
                      : 'No hay usuarios registrados.'}
                  </td>
                </tr>
              ) : (
                paginatedUsuarios.map((usuario) => {
                  const rol = usuario.rol ?? (usuario.id_rol ? rolesMap.get(usuario.id_rol) : null);
                  const rolNombre = rol?.nombre ?? null;

                  return (
                    <tr key={usuario.id}>
                      <td>
                        <div className="usuarios-table__user-cell">
                          <div className="usuarios-table__avatar">
                            {getInitials(usuario.nombre_completo)}
                          </div>
                          <div className="usuarios-table__user-info">
                            <div className="usuarios-table__user-name">{usuario.nombre_completo}</div>
                            <div className="usuarios-table__user-email">{usuario.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="usuarios-table__tipo">
                          <span className={`usuarios-table__tipo-dot ${getRolDotClass(rolNombre)}`} />
                          {rolNombre ?? 'Sin rol'}
                        </div>
                      </td>
                      <td className="usuarios-table__fecha">{formatFecha(usuario.fecha_registro)}</td>
                      <td className="usuarios-table__fecha">{formatFecha(usuario.fecha_ultima_modificacion)}</td>
                      <td>
                        <button
                          className="usuarios-table__action-btn"
                          title="Modificar usuario"
                          onClick={() => setEditingUser(usuario)}
                        >
                          <Pencil />
                        </button>
                      </td>
                      <td>
                        <button
                          className={`usuarios-table__estado-btn ${
                            usuario.activo === 'active'
                              ? 'usuarios-table__estado-btn--active'
                              : 'usuarios-table__estado-btn--inactive'
                          }`}
                          title={usuario.activo === 'active' ? 'Desactivar' : 'Activar'}
                          onClick={() => toggleEstado(usuario)}
                        >
                          <Power />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalFiltered > 0 && (
            <div className="usuarios-page__pagination">
              <div className="usuarios-page__pagination-info">
                Mostrando <span>{Math.min(ITEMS_PER_PAGE, totalFiltered - (safePage - 1) * ITEMS_PER_PAGE)}</span> de{' '}
                <span>{displayTotal}</span> usuarios
              </div>
              <div className="usuarios-page__pagination-controls">
                <button
                  className="usuarios-page__page-btn"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft />
                </button>
                {buildPageNumbers(safePage, totalPages).map((item, idx) =>
                  item === 'ellipsis' ? (
                    <span key={`e-${idx}`} className="usuarios-page__page-ellipsis">
                      ...
                    </span>
                  ) : (
                    <button
                      key={item}
                      className={`usuarios-page__page-btn ${item === safePage ? 'usuarios-page__page-btn--active' : ''}`}
                      onClick={() => setCurrentPage(item)}
                    >
                      {item}
                    </button>
                  )
                )}
                <button
                  className="usuarios-page__page-btn"
                  disabled={safePage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                >
                  <ChevronRight />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <AnadirUsuarioModal
          roles={roles}
          allActions={allActions}
          onClose={() => setShowAddModal(false)}
          onSubmit={(data, actionIds) => createMutation.mutate({ data, actionIds })}
          isLoading={createMutation.isPending}
        />
      )}

      {/* Edit Modal */}
      {editingUser && (
        <ModificarUsuarioModal
          usuario={editingUser}
          roles={roles}
          allActions={allActions}
          onClose={() => setEditingUser(null)}
          onSubmit={handleModificarSubmit}
          isLoading={updateMutation.isPending}
        />
      )}
    </div>
  );
}
