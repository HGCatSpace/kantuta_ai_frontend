import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Search,
  Plus,
  FileText,
  Pencil,
  Download,
  Trash2,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpDown,
  Upload,
  FlaskConical,
  Send,
  CheckCircle2,
  AlertCircle,
  Maximize2,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getDocumentos,
  getDocumentosCount,
  deleteDocumento,
  uploadDocumento,
  updateDocumento,
  getDownloadUrl,
} from '../api/documentos';
import { CategoriaBiblioteca, EstadoIndexacion } from '../types/documento';
import type { DocumentoConocimiento, DocumentoUpdate } from '../types/documento';
import { useAuthStore } from '../store/authStore';
import { searchKnowledgeBase, getKnowledgeSources } from '../api/knowledgeSearch';
import type { ChunkResult } from '../api/knowledgeSearch';
import './BaseConocimientoPage.css';
import ConfirmDialog from '../components/ConfirmDialog';

const PAGE_SIZE = 8;

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

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const CATEGORIA_DOT_CLASS: Record<string, string> = {
  Contratos: 'contratos',
  Litigios: 'litigios',
  Corporativo: 'corporativo',
  Laboral: 'laboral',
  Otros: 'otros',
};

const CATEGORIAS = Object.values(CategoriaBiblioteca);

type SortField = 'fecha' | 'titulo';

/* ════════════════════════════════════════
   Upload Modal
   ════════════════════════════════════════ */

function SubirDocumentoModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [titulo, setTitulo] = useState('');
  const [categoria, setCategoria] = useState<string>(CategoriaBiblioteca.OTROS);
  const [descripcion, setDescripcion] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setFile(null);
    setTitulo('');
    setCategoria(CategoriaBiblioteca.OTROS);
    setDescripcion('');
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      setFile(dropped);
      if (!titulo) setTitulo(dropped.name.replace(/\.[^.]+$/, ''));
    }
  }, [titulo]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      setFile(selected);
      if (!titulo) setTitulo(selected.name.replace(/\.[^.]+$/, ''));
    }
  };

  const handleSubmit = async () => {
    if (!file || !titulo.trim()) return;
    setUploading(true);
    try {
      await uploadDocumento({
        archivo: file,
        titulo: titulo.trim(),
        categoria,
        descripcion: descripcion.trim() || undefined,
      });
      reset();
      onSuccess();
      onClose();
    } catch {
      // Error is handled silently; the user can retry
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="bc-modal-overlay" onClick={onClose}>
      <div className="bc-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bc-modal__header">
          <h2>Subir Documento</h2>
          <button className="bc-modal__close" onClick={onClose}>
            <X />
          </button>
        </div>

        {/* Dropzone */}
        <div
          className={`bc-modal__dropzone${dragActive ? ' bc-modal__dropzone--active' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="bc-modal__dropzone-icon" />
          <p className="bc-modal__dropzone-text">
            Arrastra un archivo aquí o haz clic para seleccionar
          </p>
          <p className="bc-modal__dropzone-hint">PDF, DOCX, TXT — máx. 50 MB</p>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </div>

        {/* File preview */}
        {file && (
          <div className="bc-modal__files">
            <div className="bc-modal__file-item">
              <div className="bc-modal__file-info">
                <FileText className="bc-modal__file-icon" />
                <div>
                  <div className="bc-modal__file-name">{file.name}</div>
                  <div className="bc-modal__file-size">{formatFileSize(file.size)}</div>
                </div>
              </div>
              <button className="bc-modal__file-remove" onClick={() => setFile(null)}>
                <X />
              </button>
            </div>
          </div>
        )}

        {/* Fields */}
        <div className="bc-modal__field">
          <label className="bc-modal__label">Título del Documento</label>
          <input
            type="text"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Nombre del documento"
          />
        </div>

        <div className="bc-modal__row">
          <div className="bc-modal__field bc-modal__field--flex">
            <label className="bc-modal__label">Categoría</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bc-modal__field">
          <label className="bc-modal__label">Descripción (opcional)</label>
          <textarea
            rows={2}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Breve descripción del documento"
          />
        </div>

        <div className="bc-modal__actions">
          <button className="bc-modal__cancel" onClick={onClose}>Cancelar</button>
          <button
            className="bc-modal__submit"
            disabled={!file || !titulo.trim() || uploading}
            onClick={handleSubmit}
          >
            {uploading ? <><Loader2 className="bc-spin" /> Subiendo...</> : <><Upload /> Subir Documento</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   Edit Modal
   ════════════════════════════════════════ */

function EditarDocumentoModal({
  doc,
  onClose,
  onSuccess,
}: {
  doc: DocumentoConocimiento;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [titulo, setTitulo] = useState(doc.titulo);
  const [categoria, setCategoria] = useState(doc.categoria as string);
  const [descripcion, setDescripcion] = useState(doc.descripcion ?? '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: DocumentoUpdate = {};
      if (titulo.trim() !== doc.titulo) updates.titulo = titulo.trim();
      if (categoria !== doc.categoria) updates.categoria = categoria as DocumentoUpdate['categoria'];
      if (descripcion.trim() !== (doc.descripcion ?? '')) updates.descripcion = descripcion.trim();

      await updateDocumento(doc.id_documento, updates);
      onSuccess();
      onClose();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bc-modal-overlay" onClick={onClose}>
      <div className="bc-modal bc-modal--sm" onClick={(e) => e.stopPropagation()}>
        <div className="bc-modal__header">
          <h2>Editar Documento</h2>
          <button className="bc-modal__close" onClick={onClose}><X /></button>
        </div>

        <div className="bc-modal__field">
          <label className="bc-modal__label">Título</label>
          <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
        </div>

        <div className="bc-modal__row">
          <div className="bc-modal__field bc-modal__field--flex">
            <label className="bc-modal__label">Categoría</label>
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="bc-modal__field">
          <label className="bc-modal__label">Descripción</label>
          <textarea rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
        </div>

        <div className="bc-modal__actions">
          <button className="bc-modal__cancel" onClick={onClose}>Cancelar</button>
          <button className="bc-modal__submit" disabled={!titulo.trim() || saving} onClick={handleSave}>
            {saving ? <><Loader2 className="bc-spin" /> Guardando...</> : 'Guardar Cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════
   Test Panel (Design Only)
   ════════════════════════════════════════ */

function ProbarPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ChunkResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [sources, setSources] = useState<string[]>([]);
  const [selectedSource, setSelectedSource] = useState<string>('');
  const [loadingSources, setLoadingSources] = useState(false);
  const [expandedChunk, setExpandedChunk] = useState<ChunkResult | null>(null);

  // Load available sources when panel opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingSources(true);
    getKnowledgeSources()
      .then((s) => { if (!cancelled) setSources(s); })
      .catch(() => { if (!cancelled) setSources([]); })
      .finally(() => { if (!cancelled) setLoadingSources(false); });
    return () => { cancelled = true; };
  }, [open]);

  const handleSearch = async () => {
    if (!query.trim() || searching) return;
    setSearching(true);
    setSearched(false);
    try {
      const data = await searchKnowledgeBase(
        query.trim(),
        5,
        selectedSource || undefined,
      );
      setResults(data.results);
      setSearched(true);
    } catch (err) {
      console.error('Error en búsqueda:', err);
      setResults([]);
      setSearched(true);
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  };

  // Chroma L2 distance → relevance %  (lower distance = better match)
  const scoreToPercent = (score: number) => {
    const pct = Math.max(0, Math.min(100, Math.round((1 - score / 2) * 100)));
    return pct;
  };

  const badgeClass = (pct: number) => {
    if (pct >= 70) return 'bc-panel__result-badge--high';
    if (pct >= 50) return 'bc-panel__result-badge--mid';
    return 'bc-panel__result-badge--low';
  };

  if (!open) return null;

  return (
    <div className="bc-panel-overlay" onClick={onClose}>
      <div className="bc-panel" onClick={(e) => e.stopPropagation()}>
        <div className="bc-panel__header">
          <h2>Probar Base de Conocimiento</h2>
          <button className="bc-panel__close" onClick={onClose}><X /></button>
        </div>

        {/* Document filter */}
        <div className="bc-panel__section">
          <label className="bc-panel__label">Filtrar por Documento</label>
          <select
            className="bc-panel__filter-select"
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            disabled={loadingSources}
          >
            <option value="">Todos los documentos</option>
            {sources.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="bc-panel__section">
          <label className="bc-panel__label">Consulta</label>
          <div className="bc-panel__query-row">
            <input
              className="bc-panel__query-input"
              placeholder="Escribe tu consulta..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={searching}
            />
            <button
              className="bc-panel__send-btn"
              disabled={!query.trim() || searching}
              onClick={handleSearch}
            >
              {searching ? <Loader2 className="bc-spin" /> : <Send />}
            </button>
          </div>
        </div>

        <div className="bc-panel__section">
          <label className="bc-panel__label">
            Resultados {searched && `(${results.length})`}
          </label>
          <div className="bc-panel__results">
            {searching && (
              <div className="bc-panel__searching">
                <Loader2 className="bc-spin" /> Buscando en la base vectorial...
              </div>
            )}

            {searched && results.length === 0 && !searching && (
              <div className="bc-panel__no-results">
                No se encontraron resultados relevantes para esta consulta.
              </div>
            )}

            {results.map((chunk, i) => {
              const pct = scoreToPercent(chunk.score);
              const title = (chunk.metadata?.titulo as string)
                || (chunk.metadata?.source as string)
                || `Fragmento ${i + 1}`;
              return (
                <div key={i} className="bc-panel__result-card">
                  <div className="bc-panel__result-header">
                    <div className="bc-panel__result-title-row">
                      <FileText className="bc-panel__result-icon" />
                      <span className="bc-panel__result-title">{title}</span>
                    </div>
                    <div className="bc-panel__result-header-actions">
                      <span className={`bc-panel__result-badge ${badgeClass(pct)}`}>
                        {pct}%
                      </span>
                      <button
                        className="bc-panel__expand-btn"
                        title="Ver contenido completo"
                        onClick={() => setExpandedChunk(chunk)}
                      >
                        <Maximize2 />
                      </button>
                    </div>
                  </div>
                  <p className="bc-panel__result-snippet">
                    {chunk.content.length > 400
                      ? chunk.content.slice(0, 400) + '…'
                      : chunk.content}
                  </p>
                  {Object.keys(chunk.metadata).length > 0 && (
                    <div className="bc-panel__result-meta">
                      {typeof chunk.metadata.categoria === 'string' && (
                        <span className="bc-panel__meta-tag">
                          {String(chunk.metadata.categoria)}
                        </span>
                      )}
                      <span className="bc-panel__meta-score">
                        Distancia: {chunk.score.toFixed(4)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Expanded result popup */}
      {expandedChunk && (() => {
        const ePct = scoreToPercent(expandedChunk.score);
        const eTitle = (expandedChunk.metadata?.titulo as string)
          || (expandedChunk.metadata?.source as string)
          || 'Fragmento';
        return (
          <div className="bc-detail-overlay" onClick={() => setExpandedChunk(null)}>
            <div className="bc-detail-popup" onClick={(e) => e.stopPropagation()}>
              <div className="bc-detail-popup__header">
                <div className="bc-detail-popup__title-row">
                  <FileText className="bc-detail-popup__icon" />
                  <h3 className="bc-detail-popup__title">{eTitle}</h3>
                </div>
                <div className="bc-detail-popup__header-right">
                  <span className={`bc-panel__result-badge ${badgeClass(ePct)}`}>
                    {ePct}% relevancia
                  </span>
                  <button className="bc-detail-popup__close" onClick={() => setExpandedChunk(null)}>
                    <X />
                  </button>
                </div>
              </div>
              <div className="bc-detail-popup__body">
                <pre className="bc-detail-popup__content">{expandedChunk.content}</pre>
              </div>
              {Object.keys(expandedChunk.metadata).length > 0 && (
                <div className="bc-detail-popup__meta">
                  {Object.entries(expandedChunk.metadata).map(([key, val]) => (
                    <div key={key} className="bc-detail-popup__meta-item">
                      <span className="bc-detail-popup__meta-key">{key}</span>
                      <span className="bc-detail-popup__meta-val">{String(val)}</span>
                    </div>
                  ))}
                  <div className="bc-detail-popup__meta-item">
                    <span className="bc-detail-popup__meta-key">distancia</span>
                    <span className="bc-detail-popup__meta-val">{expandedChunk.score.toFixed(6)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ════════════════════════════════════════
   Pagination helper
   ════════════════════════════════════════ */

function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i);
  const pages: (number | 'ellipsis')[] = [];
  pages.push(0);
  if (current > 2) pages.push('ellipsis');
  for (let i = Math.max(1, current - 1); i <= Math.min(total - 2, current + 1); i++) {
    pages.push(i);
  }
  if (current < total - 3) pages.push('ellipsis');
  pages.push(total - 1);
  return pages;
}

/* ════════════════════════════════════════
   Main Page
   ════════════════════════════════════════ */

export default function BaseConocimientoPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [categoriaFilter, setCategoriaFilter] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('fecha');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentoConocimiento | null>(null);
  const [showTestPanel, setShowTestPanel] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<DocumentoConocimiento | null>(null);

  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const queryParams = {
    offset: page * PAGE_SIZE,
    limit: PAGE_SIZE,
    ...(search ? { search } : {}),
    ...(categoriaFilter ? { categoria: categoriaFilter } : {}),
  };

  const countParams = {
    ...(search ? { search } : {}),
    ...(categoriaFilter ? { categoria: categoriaFilter } : {}),
  };

  const {
    data: documentos = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['bc-documentos', queryParams],
    queryFn: () => getDocumentos(queryParams),
    refetchInterval: (query) => {
      const docs = query.state.data;
      if (!docs) return false;
      const hasProcessing = docs.some(
        (d) => d.estado_indexacion === EstadoIndexacion.PROCESANDO || d.estado_indexacion === EstadoIndexacion.PENDIENTE,
      );
      return hasProcessing ? 3000 : false;
    },
  });

  const { data: total = 0 } = useQuery({
    queryKey: ['bc-documentos-count', countParams],
    queryFn: () => getDocumentosCount(countParams),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteDocumento(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bc-documentos'] });
      queryClient.invalidateQueries({ queryKey: ['bc-documentos-count'] });
    },
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['bc-documentos'] });
    queryClient.invalidateQueries({ queryKey: ['bc-documentos-count'] });
  };

  const handleDelete = (doc: DocumentoConocimiento) => {
    setConfirmDelete(doc);
  };

  const handleConfirmDelete = () => {
    if (!confirmDelete) return;
    deleteMutation.mutate(confirmDelete.id_documento, {
      onSuccess: () => setConfirmDelete(null),
    });
  };

  const handleDownload = async (doc: DocumentoConocimiento) => {
    try {
      const url = getDownloadUrl(doc.id_documento);
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = doc.titulo;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch {
      // silent
    }
  };

  // Client-side sort
  const sortedDocs = useMemo(() => {
    if (sortField === 'titulo') {
      return [...documentos].sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));
    }
    return documentos;
  }, [documentos, sortField]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const showingFrom = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const showingTo = Math.min((page + 1) * PAGE_SIZE, total);
  const pageNumbers = getPageNumbers(page, totalPages);

  return (
    <div className="bc-page">
      {/* Header */}
      <div className="bc-page__header">
        <div>
          <h1 className="bc-page__title">Gestión de Base de Conocimiento</h1>
          <p className="bc-page__subtitle">
            Administra los documentos que alimentan la base de datos vectorial del asistente.
          </p>
        </div>
        <div className="bc-page__header-actions">
          <button className="bc-page__test-btn" onClick={() => setShowTestPanel(true)}>
            <FlaskConical /> Probar Base
          </button>
          <button className="bc-page__new-btn" onClick={() => setShowUpload(true)}>
            <Plus /> Subir Documento
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bc-page__toolbar">
        <div className="bc-page__search">
          <Search className="bc-page__search-icon" />
          <input
            type="text"
            placeholder="Buscar documentos..."
            className="bc-page__search-input"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>

        {/* Filter dropdown */}
        <div className="bc-page__dropdown-wrapper">
          <button
            className={`bc-page__toolbar-btn${categoriaFilter ? ' bc-page__toolbar-btn--active' : ''}`}
            onClick={() => { setShowFilterDropdown((v) => !v); setShowSortDropdown(false); }}
          >
            <Filter /> Filtros
          </button>
          {showFilterDropdown && (
            <div className="bc-page__dropdown">
              <button
                className={`bc-page__dropdown-item${!categoriaFilter ? ' bc-page__dropdown-item--active' : ''}`}
                onClick={() => { setCategoriaFilter(null); setShowFilterDropdown(false); setPage(0); }}
              >
                Todas
              </button>
              <div className="bc-page__dropdown-divider" />
              {CATEGORIAS.map((c) => (
                <button
                  key={c}
                  className={`bc-page__dropdown-item${categoriaFilter === c ? ' bc-page__dropdown-item--active' : ''}`}
                  onClick={() => { setCategoriaFilter(c); setShowFilterDropdown(false); setPage(0); }}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Sort dropdown */}
        <div className="bc-page__dropdown-wrapper">
          <button
            className="bc-page__toolbar-btn"
            onClick={() => { setShowSortDropdown((v) => !v); setShowFilterDropdown(false); }}
          >
            <ArrowUpDown /> Ordenar
          </button>
          {showSortDropdown && (
            <div className="bc-page__dropdown">
              <button
                className={`bc-page__dropdown-item${sortField === 'fecha' ? ' bc-page__dropdown-item--active' : ''}`}
                onClick={() => { setSortField('fecha'); setShowSortDropdown(false); }}
              >
                Fecha de creación
              </button>
              <button
                className={`bc-page__dropdown-item${sortField === 'titulo' ? ' bc-page__dropdown-item--active' : ''}`}
                onClick={() => { setSortField('titulo'); setShowSortDropdown(false); }}
              >
                Título (A-Z)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Loading / Error */}
      {isLoading && (
        <div className="bc-page__status">
          <Loader2 className="bc-spin" /> Cargando documentos...
        </div>
      )}

      {isError && (
        <div className="bc-page__status bc-page__status--error">
          Error al cargar los documentos. Verifica tu conexión.
        </div>
      )}

      {/* Table */}
      {!isLoading && !isError && (
        <table className="bc-table">
          <thead>
            <tr>
              <th>Documento</th>
              <th>Categoría</th>
              <th>Estado</th>
              <th>Creado</th>
              <th>Modificado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedDocs.length === 0 ? (
              <tr>
                <td colSpan={6} className="bc-table__empty">
                  {search || categoriaFilter
                    ? 'No se encontraron documentos con esos filtros.'
                    : 'No hay documentos registrados.'}
                </td>
              </tr>
            ) : (
              sortedDocs.map((doc) => {
                const isReady = doc.estado_indexacion === EstadoIndexacion.COMPLETADO;
                const isProcessing =
                  doc.estado_indexacion === EstadoIndexacion.PROCESANDO ||
                  doc.estado_indexacion === EstadoIndexacion.PENDIENTE;
                const isErrorState = doc.estado_indexacion === EstadoIndexacion.ERROR;
                return (
                  <tr key={doc.id_documento} className={!isReady ? 'bc-table__row--processing' : ''}>
                    <td>
                      <div className="bc-table__doc-cell">
                        <div className="bc-table__doc-info">
                          <div className="bc-table__doc-title">{doc.titulo}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="bc-table__categoria">
                        <span
                          className={`bc-table__cat-dot bc-table__cat-dot--${CATEGORIA_DOT_CLASS[doc.categoria] ?? 'otros'}`}
                        />
                        {doc.categoria}
                      </div>
                    </td>
                    <td>
                      {isProcessing && (
                        <span className="bc-table__status-badge bc-table__status-badge--processing">
                          <Loader2 className="bc-spin" /> Indexando…
                        </span>
                      )}
                      {isReady && (
                        <span className="bc-table__status-badge bc-table__status-badge--ready">
                          <CheckCircle2 /> Listo
                        </span>
                      )}
                      {isErrorState && (
                        <span className="bc-table__status-badge bc-table__status-badge--error">
                          <AlertCircle /> Error
                        </span>
                      )}
                    </td>
                    <td className="bc-table__fecha">{formatFecha(doc.fecha_creacion)}</td>
                    <td className="bc-table__fecha">{formatFecha(doc.ultima_modificacion)}</td>
                    <td>
                      <div className="bc-table__actions">
                        <button
                          className="bc-table__action-btn"
                          title={isReady ? 'Editar' : 'Esperando indexación…'}
                          onClick={() => setEditingDoc(doc)}
                          disabled={!isReady}
                        >
                          <Pencil />
                        </button>
                        <button
                          className="bc-table__action-btn"
                          title={isReady ? 'Descargar' : 'Esperando indexación…'}
                          onClick={() => handleDownload(doc)}
                          disabled={!isReady}
                        >
                          <Download />
                        </button>
                        <button
                          className="bc-table__action-btn bc-table__action-btn--delete"
                          title={isReady ? 'Eliminar' : 'Esperando indexación…'}
                          onClick={() => handleDelete(doc)}
                          disabled={!isReady}
                        >
                          <Trash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      )}

      {/* Pagination */}
      {!isLoading && !isError && total > 0 && (
        <div className="bc-page__pagination">
          <div className="bc-page__pagination-info">
            Mostrando <span>{showingFrom}-{showingTo}</span> de{' '}
            <span>{total.toLocaleString('es-BO')}</span> documentos
          </div>
          <div className="bc-page__pagination-controls">
            <button
              className="bc-page__page-btn"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 0}
            >
              <ChevronLeft />
            </button>
            {pageNumbers.map((p, idx) =>
              p === 'ellipsis' ? (
                <span key={`e${idx}`} className="bc-page__page-ellipsis">...</span>
              ) : (
                <button
                  key={p}
                  className={`bc-page__page-btn${p === page ? ' bc-page__page-btn--active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p + 1}
                </button>
              ),
            )}
            <button
              className="bc-page__page-btn"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages - 1}
            >
              <ChevronRight />
            </button>
          </div>
        </div>
      )}

      {/* Modals / Panels */}
      <SubirDocumentoModal
        open={showUpload}
        onClose={() => setShowUpload(false)}
        onSuccess={invalidateAll}
      />

      {editingDoc && (
        <EditarDocumentoModal
          doc={editingDoc}
          onClose={() => setEditingDoc(null)}
          onSuccess={invalidateAll}
        />
      )}

      <ProbarPanel open={showTestPanel} onClose={() => setShowTestPanel(false)} />

      {confirmDelete && (
        <ConfirmDialog
          title="Eliminar Documento"
          message={
            <>
              ¿Eliminar permanentemente{' '}
              <strong>&ldquo;{confirmDelete.titulo}&rdquo;</strong>? Esta acción
              no se puede deshacer.
            </>
          }
          confirmLabel="Eliminar"
          variant="danger"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDelete(null)}
          isLoading={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
