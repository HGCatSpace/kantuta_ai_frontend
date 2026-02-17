import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, FileText, Trash2, Loader2, X } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getCasos, createCaso, archiveCaso } from '../api/casos';
import { useAuthStore } from '../store/authStore';
import type { Caso, CasoCreate } from '../types/caso';
import { EstadoCaso } from '../types/caso';
import './CasosPage.css';

const dateFormatter = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});

const dateTimeFormatter = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatFecha(isoDate: string): string {
  try {
    return dateFormatter.format(new Date(isoDate));
  } catch {
    return isoDate;
  }
}

function formatFechaHora(isoDate: string): string {
  try {
    return dateTimeFormatter.format(new Date(isoDate));
  } catch {
    return isoDate;
  }
}

function NuevoCasoModal({
  onClose,
  onSubmit,
  isLoading,
}: {
  onClose: () => void;
  onSubmit: (data: { titulo: string; descripcion: string }) => void;
  isLoading: boolean;
}) {
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    onSubmit({ titulo: titulo.trim(), descripcion: descripcion.trim() });
  };

  return (
    <div className="casos-modal-overlay" onClick={onClose}>
      <div className="casos-modal" onClick={(e) => e.stopPropagation()}>
        <div className="casos-modal__header">
          <h2>Nuevo Caso</h2>
          <button className="casos-modal__close" onClick={onClose}>
            <X />
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="casos-modal__field">
            <label htmlFor="titulo">Titulo</label>
            <input
              id="titulo"
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej: Smith vs. Jones"
              required
            />
          </div>
          <div className="casos-modal__field">
            <label htmlFor="descripcion">Descripcion</label>
            <textarea
              id="descripcion"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Descripcion del caso..."
              rows={3}
            />
          </div>
          <div className="casos-modal__actions">
            <button type="button" className="casos-modal__cancel" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="casos-modal__submit" disabled={isLoading || !titulo.trim()}>
              {isLoading ? <Loader2 className="spin" /> : 'Crear caso'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function CasosPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.userId);
  const navigate = useNavigate();

  const { data: casos = [], isLoading, isError } = useQuery({
    queryKey: ['casos'],
    queryFn: () => getCasos(0, 100),
  });

  const createMutation = useMutation({
    mutationFn: (data: CasoCreate) => createCaso(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['casos'] });
      setShowModal(false);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: number) => archiveCaso(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['casos'] });
    },
  });

  const handleCreate = (data: { titulo: string; descripcion: string }) => {
    if (!userId) return;
    createMutation.mutate({
      titulo: data.titulo,
      descripcion: data.descripcion || undefined,
      usuario_id: userId,
    });
  };

  const handleArchive = (caso: Caso) => {
    if (caso.estado === EstadoCaso.ARCHIVADO) return;
    if (!confirm(`Archivar el caso "${caso.titulo}"?`)) return;
    archiveMutation.mutate(caso.id_caso);
  };

  const filteredCasos = casos.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.titulo.toLowerCase().includes(q) ||
      String(c.id_caso).includes(q) ||
      (c.descripcion?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="casos-page">
      {/* Header */}
      <div className="casos-page__header">
        <div>
          <h1 className="casos-page__title">Gestion de casos</h1>
          <p className="casos-page__stats">
            Total: <span>{casos.length} casos</span>
          </p>
        </div>
        <button className="casos-page__new-btn" onClick={() => setShowModal(true)}>
          <Plus />
          Nuevo Caso
        </button>
      </div>

      {/* Busqueda */}
      <div className="casos-page__toolbar">
        <div className="casos-page__search">
          <Search className="casos-page__search-icon" />
          <input
            type="text"
            placeholder="Buscar por nombre, ID, o descripcion..."
            className="casos-page__search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Loading / Error states */}
      {isLoading && (
        <div className="casos-page__status">
          <Loader2 className="spin" /> Cargando casos...
        </div>
      )}

      {isError && (
        <div className="casos-page__status casos-page__status--error">
          Error al cargar los casos. Verifica tu conexion.
        </div>
      )}

      {/* Tabla */}
      {!isLoading && !isError && (
        <table className="casos-table">
          <thead>
            <tr>
              <th>Nombre del caso</th>
              <th>Estado</th>
              <th>Fecha de creacion</th>
              <th>Ultima modificacion</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredCasos.length === 0 ? (
              <tr>
                <td colSpan={5} className="casos-table__empty">
                  {searchQuery ? 'No se encontraron casos.' : 'No hay casos registrados.'}
                </td>
              </tr>
            ) : (
              filteredCasos.map((caso) => (
                <tr key={caso.id_caso} onClick={() => navigate(`/casos/${caso.id_caso}`)} style={{ cursor: 'pointer' }}>
                  <td>
                    <div className="casos-table__nombre">{caso.titulo}</div>
                    <div className="casos-table__id">
                      ID: {caso.id_caso}
                      {caso.descripcion && ` \u2022 ${caso.descripcion}`}
                    </div>
                  </td>
                  <td>
                    <span className={`casos-badge casos-badge--${caso.estado.toLowerCase()}`}>
                      {caso.estado}
                    </span>
                  </td>
                  <td className="casos-table__fecha">{formatFecha(caso.fecha_creacion)}</td>
                  <td className="casos-table__fecha">{formatFechaHora(caso.fecha_actualizacion)}</td>
                  <td>
                    <div className="casos-table__actions">
                      <button
                        className="casos-table__action-btn"
                        title="Ver detalle"
                        onClick={(e) => { e.stopPropagation(); navigate(`/casos/${caso.id_caso}`); }}
                      >
                        <FileText />
                      </button>
                      <button
                        className="casos-table__action-btn"
                        title="Archivar"
                        onClick={() => handleArchive(caso)}
                        disabled={caso.estado === EstadoCaso.ARCHIVADO}
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
      )}

      {/* Modal */}
      {showModal && (
        <NuevoCasoModal
          onClose={() => setShowModal(false)}
          onSubmit={handleCreate}
          isLoading={createMutation.isPending}
        />
      )}
    </div>
  );
}
