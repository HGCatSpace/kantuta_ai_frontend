import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Pencil,
  Eye,
  Trash2,
  Loader2,
  X,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPrompts, getPromptsCount, createPrompt, updatePrompt, deletePrompt } from '../api/prompts';
import type { SystemPrompt } from '../types/prompt';
import './GestionPromptsPage.css';

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

type SortMode = 'fecha_desc' | 'nombre_asc';
type FilterEstado = boolean | null;

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

/* ── Vista Rápida (Preview Popup) ── */

function VistaRapidaPrompt({
  prompt,
  onClose,
  onToggleActivo,
  isToggling,
  onDelete,
  isDeleting,
}: {
  prompt: SystemPrompt;
  onClose: () => void;
  onToggleActivo: () => void;
  isToggling: boolean;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const navigate = useNavigate();

  return (
    <div className="gp-preview-overlay" onClick={onClose}>
      <div className="gp-preview" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="gp-preview__header">
          <div className="gp-preview__header-left">
            <span
              className={`gp-preview__badge ${prompt.es_activo ? 'gp-preview__badge--activo' : 'gp-preview__badge--inactivo'
                }`}
            >
              {prompt.es_activo ? 'Activo' : 'Inactivo'}
            </span>
            <h2 className="gp-preview__name">{prompt.nombre}</h2>
          </div>
          <button className="gp-preview__close" onClick={onClose}>
            <X />
          </button>
        </div>

        {/* Resumen de Lógica */}
        {prompt.resumen_logica && (
          <div className="gp-preview__section">
            <div className="gp-preview__section-title">Resumen de Lógica</div>
            <div className="gp-preview__blockquote">{prompt.resumen_logica}</div>
          </div>
        )}

        {/* Parámetros del Prompt */}
        <div className="gp-preview__section">
          <div className="gp-preview__section-title">Parámetros del Prompt</div>
          <table className="gp-preview__params">
            <tbody>
              <tr>
                <td>Creador</td>
                <td>{prompt.nombre_creador ?? 'Desconocido'}</td>
              </tr>
              <tr>
                <td>Temperatura</td>
                <td>{prompt.temperatura}</td>
              </tr>
              <tr>
                <td>Top P</td>
                <td>{prompt.top_p}</td>
              </tr>
              <tr>
                <td>Top K</td>
                <td>{prompt.top_k}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Toggle Activar */}
        <div className="gp-preview__toggle-row">
          <span className="gp-preview__toggle-label">Activar Prompt</span>
          <button
            className={`gp-preview__toggle ${prompt.es_activo ? 'gp-preview__toggle--on' : ''}`}
            onClick={onToggleActivo}
            disabled={isToggling}
          >
            <span className="gp-preview__toggle-knob" />
          </button>
        </div>

        {/* Actions */}
        <div className="gp-preview__actions">
          <button
            className="gp-preview__edit-btn"
            onClick={() => navigate(`/prompts/${prompt.id_prompt}/editar`)}
          >
            <Pencil />
            Editar Prompt
          </button>
          <button
            className="gp-preview__delete-btn"
            onClick={onDelete}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2 className="gp-spin" /> : <Trash2 />}
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main Page ── */

export default function GestionPromptsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortMode, setSortMode] = useState<SortMode>('fecha_desc');
  const [filterEstado, setFilterEstado] = useState<FilterEstado>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [previewPrompt, setPreviewPrompt] = useState<SystemPrompt | null>(null);

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

  const { data: prompts = [], isLoading, isError } = useQuery({
    queryKey: ['prompts'],
    queryFn: () => getPrompts({ offset: 0, limit: 200 }),
  });

  const { data: totalCount } = useQuery({
    queryKey: ['prompts-count'],
    queryFn: () => getPromptsCount(),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: () => createPrompt({ nombre: 'Nuevo Prompt' }),
    onSuccess: (newPrompt) => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      queryClient.invalidateQueries({ queryKey: ['prompts-count'] });
      navigate(`/prompts/${newPrompt.id_prompt}/editar`);
    },
  });

  // Toggle activo mutation
  const toggleMutation = useMutation({
    mutationFn: ({ id, es_activo }: { id: number; es_activo: boolean }) =>
      updatePrompt(id, { es_activo }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      if (previewPrompt && previewPrompt.id_prompt === updated.id_prompt) {
        setPreviewPrompt(updated);
      }
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deletePrompt(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      queryClient.invalidateQueries({ queryKey: ['prompts-count'] });
      setPreviewPrompt(null);
    },
  });

  function handleDelete(id: number) {
    if (window.confirm('¿Estás seguro de que deseas eliminar este prompt? Esta acción no se puede deshacer.')) {
      deleteMutation.mutate(id);
    }
  }

  // Filter + search + sort (client-side)
  const processedPrompts = useMemo(() => {
    let result = [...prompts];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          (p.descripcion?.toLowerCase().includes(q) ?? false)
      );
    }

    if (filterEstado !== null) {
      result = result.filter((p) => p.es_activo === filterEstado);
    }

    if (sortMode === 'fecha_desc') {
      result.sort((a, b) => new Date(b.fecha_creacion).getTime() - new Date(a.fecha_creacion).getTime());
    } else {
      result.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    }

    return result;
  }, [prompts, searchQuery, filterEstado, sortMode]);

  const totalFiltered = processedPrompts.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedPrompts = processedPrompts.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  // Reset page on filter/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterEstado, sortMode]);

  const displayTotal = totalCount ?? prompts.length;
  const hasActiveFilters = filterEstado !== null;

  return (
    <div className="gp-page">
      {/* Header */}
      <div className="gp-page__header">
        <div>
          <h1 className="gp-page__title">Gestión de Prompts de Experto</h1>
          <p className="gp-page__subtitle">
            Administra los prompts del sistema, sus configuraciones y parámetros
          </p>
        </div>
        <button
          className="gp-page__new-btn"
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
        >
          {createMutation.isPending ? <Loader2 className="gp-spin" /> : <Plus />}
          Agregar Prompt
        </button>
      </div>

      {/* Toolbar */}
      <div className="gp-page__toolbar">
        <div className="gp-page__search">
          <Search className="gp-page__search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre o descripción..."
            className="gp-page__search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filtros */}
        <div className="gp-page__dropdown-wrapper" ref={filterRef}>
          <button
            className={`gp-page__toolbar-btn ${hasActiveFilters ? 'gp-page__toolbar-btn--active' : ''}`}
            onClick={() => setShowFilterDropdown((v) => !v)}
          >
            <SlidersHorizontal />
            Filtros
          </button>
          {showFilterDropdown && (
            <div className="gp-page__dropdown">
              <button
                className={`gp-page__dropdown-item ${filterEstado === null ? 'gp-page__dropdown-item--active' : ''}`}
                onClick={() => { setFilterEstado(null); setShowFilterDropdown(false); }}
              >
                Todos
              </button>
              <div className="gp-page__dropdown-divider" />
              <button
                className={`gp-page__dropdown-item ${filterEstado === true ? 'gp-page__dropdown-item--active' : ''}`}
                onClick={() => { setFilterEstado(filterEstado === true ? null : true); setShowFilterDropdown(false); }}
              >
                Activos
              </button>
              <button
                className={`gp-page__dropdown-item ${filterEstado === false ? 'gp-page__dropdown-item--active' : ''}`}
                onClick={() => { setFilterEstado(filterEstado === false ? null : false); setShowFilterDropdown(false); }}
              >
                Inactivos
              </button>
            </div>
          )}
        </div>

        {/* Ordenar */}
        <div className="gp-page__dropdown-wrapper" ref={sortRef}>
          <button
            className="gp-page__toolbar-btn"
            onClick={() => setShowSortDropdown((v) => !v)}
          >
            <ArrowUpDown />
            Ordenar
          </button>
          {showSortDropdown && (
            <div className="gp-page__dropdown">
              <button
                className={`gp-page__dropdown-item ${sortMode === 'fecha_desc' ? 'gp-page__dropdown-item--active' : ''}`}
                onClick={() => { setSortMode('fecha_desc'); setShowSortDropdown(false); }}
              >
                Más recientes
              </button>
              <button
                className={`gp-page__dropdown-item ${sortMode === 'nombre_asc' ? 'gp-page__dropdown-item--active' : ''}`}
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
        <div className="gp-page__status">
          <Loader2 className="gp-spin" /> Cargando prompts...
        </div>
      )}

      {isError && (
        <div className="gp-page__status gp-page__status--error">
          Error al cargar los prompts. Verifica tu conexión.
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && (
        <>
          <table className="gp-table">
            <thead>
              <tr>
                <th>Nombre del Prompt</th>
                <th>Estado</th>
                <th>Fecha de Creación</th>
                <th>Última Modificación</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPrompts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="gp-table__empty">
                    {searchQuery || hasActiveFilters
                      ? 'No se encontraron prompts con esos filtros.'
                      : 'No hay prompts registrados.'}
                  </td>
                </tr>
              ) : (
                paginatedPrompts.map((prompt) => (
                  <tr key={prompt.id_prompt}>
                    <td>
                      <div className="gp-table__name-cell">
                        <div className="gp-table__name">{prompt.nombre}</div>
                        {prompt.descripcion && (
                          <div className="gp-table__desc">{prompt.descripcion}</div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="gp-table__estado">
                        <span
                          className={`gp-table__estado-dot ${prompt.es_activo
                            ? 'gp-table__estado-dot--activo'
                            : 'gp-table__estado-dot--inactivo'
                            }`}
                        />
                        {prompt.es_activo ? 'Activo' : 'Inactivo'}
                      </div>
                    </td>
                    <td className="gp-table__fecha">{formatFecha(prompt.fecha_creacion)}</td>
                    <td className="gp-table__fecha">{formatFecha(prompt.fecha_actualizacion)}</td>
                    <td>
                      <div className="gp-table__actions">
                        <button
                          className="gp-table__action-btn"
                          title="Editar prompt"
                          onClick={() => navigate(`/prompts/${prompt.id_prompt}/editar`)}
                        >
                          <Pencil />
                        </button>
                        <button
                          className="gp-table__action-btn"
                          title="Vista rápida"
                          onClick={() => setPreviewPrompt(prompt)}
                        >
                          <Eye />
                        </button>
                        <button
                          className="gp-table__action-btn gp-table__action-btn--danger"
                          title="Eliminar prompt"
                          onClick={() => handleDelete(prompt.id_prompt)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {totalFiltered > 0 && (
            <div className="gp-page__pagination">
              <div className="gp-page__pagination-info">
                Mostrando <span>{Math.min(ITEMS_PER_PAGE, totalFiltered - (safePage - 1) * ITEMS_PER_PAGE)}</span> de{' '}
                <span>{displayTotal}</span> prompts
              </div>
              <div className="gp-page__pagination-controls">
                <button
                  className="gp-page__page-btn"
                  disabled={safePage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft />
                </button>
                {buildPageNumbers(safePage, totalPages).map((item, idx) =>
                  item === 'ellipsis' ? (
                    <span key={`e-${idx}`} className="gp-page__page-ellipsis">
                      ...
                    </span>
                  ) : (
                    <button
                      key={item}
                      className={`gp-page__page-btn ${item === safePage ? 'gp-page__page-btn--active' : ''}`}
                      onClick={() => setCurrentPage(item)}
                    >
                      {item}
                    </button>
                  )
                )}
                <button
                  className="gp-page__page-btn"
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

      {/* Preview Popup */}
      {previewPrompt && (
        <VistaRapidaPrompt
          prompt={previewPrompt}
          onClose={() => setPreviewPrompt(null)}
          onToggleActivo={() =>
            toggleMutation.mutate({
              id: previewPrompt.id_prompt,
              es_activo: !previewPrompt.es_activo,
            })
          }
          isToggling={toggleMutation.isPending}
          onDelete={() => handleDelete(previewPrompt.id_prompt)}
          isDeleting={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
