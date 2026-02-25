import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Plus,
  FileText,
  Eye,
  Download,
  Trash2,
  Loader2,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  SlidersHorizontal,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDocumentos, getDocumentosCount, deleteDocumento, getDownloadUrl } from '../api/documentos';
import { CategoriaBiblioteca } from '../types/documento';
import type { DocumentoConocimiento } from '../types/documento';
import './BibliotecaPage.css';
import { useAuthStore } from '../store/authStore';
import DocumentPreviewModal from '../components/DocumentPreviewModal';

const PAGE_SIZE = 5;

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

const CATEGORIAS = Object.values(CategoriaBiblioteca);

const CATEGORIA_DOT_CLASS: Record<string, string> = {
  Contratos: 'contratos',
  Litigios: 'litigios',
  Corporativo: 'corporativo',
  Otros: 'otros',
};

export default function BibliotecaPage() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [categoriaFilter, setCategoriaFilter] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<'fecha' | 'titulo'>('fecha');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState('');


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

  const handlePreview = async (doc: DocumentoConocimiento) => {
    try {
      const url = getDownloadUrl(doc.id_documento);
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Preview failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      setPreviewUrl(blobUrl);
      setPreviewName(doc.titulo);
    } catch {
      // silent
    }
  };

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewName('');
  };


  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page on categoria filter change
  useEffect(() => { setPage(0); }, [categoriaFilter]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilterDropdown(false);
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSortDropdown(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

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
    queryKey: ['documentos', queryParams],
    queryFn: () => getDocumentos(queryParams),
  });

  const { data: total = 0 } = useQuery({
    queryKey: ['documentos-count', countParams],
    queryFn: () => getDocumentosCount(countParams),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteDocumento(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentos'] });
      queryClient.invalidateQueries({ queryKey: ['documentos-count'] });
    },
  });


  // Client-side sort
  const sortedDocumentos = useMemo(() => {
    if (sortMode === 'titulo') {
      return [...documentos].sort((a, b) => a.titulo.localeCompare(b.titulo, 'es'));
    }
    return documentos;
  }, [documentos, sortMode]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const showingFrom = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const showingTo = Math.min((page + 1) * PAGE_SIZE, total);

  return (
    <div className="biblioteca-page">
      {/* Breadcrumb */}
      <nav className="biblioteca-page__breadcrumb">
        <Link to="/dashboard">Home</Link>
        <span>/</span>
        <span>Biblioteca</span>
      </nav>

      {/* Header */}
      <div className="biblioteca-page__header">
        <h1 className="biblioteca-page__title">Centro de Conocimiento</h1>
        <p className="biblioteca-page__subtitle">
          Accede a la base de documentos legales, plantillas y recursos de consulta del equipo.
        </p>
      </div>

      {/* Repositorio section */}
      <div className="biblioteca-page__section">
        <div className="biblioteca-page__section-header">
          <h2 className="biblioteca-page__section-title">Repositorio de Documentos</h2>
          <div className="biblioteca-page__section-actions">
            <div className="biblioteca-page__search">
              <Search className="biblioteca-page__search-icon" />
              <input
                type="text"
                placeholder="Buscar documentos..."
                className="biblioteca-page__search-input"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            {/* Filtros por categoría */}
            <div className="biblioteca-page__dropdown-wrapper" ref={filterRef}>
              <button
                className={`biblioteca-page__toolbar-btn${categoriaFilter ? ' biblioteca-page__toolbar-btn--active' : ''}`}
                onClick={() => { setShowFilterDropdown((v) => !v); setShowSortDropdown(false); }}
              >
                <SlidersHorizontal /> Filtros
              </button>
              {showFilterDropdown && (
                <div className="biblioteca-page__dropdown">
                  <button
                    className={`biblioteca-page__dropdown-item${!categoriaFilter ? ' biblioteca-page__dropdown-item--active' : ''}`}
                    onClick={() => { setCategoriaFilter(null); setShowFilterDropdown(false); }}
                  >
                    Todas
                  </button>
                  <div className="biblioteca-page__dropdown-divider" />
                  {CATEGORIAS.map((c) => (
                    <button
                      key={c}
                      className={`biblioteca-page__dropdown-item${categoriaFilter === c ? ' biblioteca-page__dropdown-item--active' : ''}`}
                      onClick={() => { setCategoriaFilter(c); setShowFilterDropdown(false); }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Ordenar */}
            <div className="biblioteca-page__dropdown-wrapper" ref={sortRef}>
              <button
                className="biblioteca-page__toolbar-btn"
                onClick={() => { setShowSortDropdown((v) => !v); setShowFilterDropdown(false); }}
              >
                <ArrowUpDown /> Ordenar
              </button>
              {showSortDropdown && (
                <div className="biblioteca-page__dropdown">
                  <button
                    className={`biblioteca-page__dropdown-item${sortMode === 'fecha' ? ' biblioteca-page__dropdown-item--active' : ''}`}
                    onClick={() => { setSortMode('fecha'); setShowSortDropdown(false); }}
                  >
                    Fecha de creación
                  </button>
                  <button
                    className={`biblioteca-page__dropdown-item${sortMode === 'titulo' ? ' biblioteca-page__dropdown-item--active' : ''}`}
                    onClick={() => { setSortMode('titulo'); setShowSortDropdown(false); }}
                  >
                    Título A-Z
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Loading / Error */}
        {isLoading && (
          <div className="biblioteca-page__status">
            <Loader2 className="spin" /> Cargando documentos...
          </div>
        )}

        {isError && (
          <div className="biblioteca-page__status biblioteca-page__status--error">
            Error al cargar los documentos. Verifica tu conexion.
          </div>
        )}

        {/* Table */}
        {!isLoading && !isError && (
          <table className="biblioteca-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Categoria</th>
                <th>Creado</th>
                <th>Modificado</th>
                <th>Vista</th>
                <th>Descarga</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedDocumentos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="biblioteca-table__empty">
                    {search ? 'No se encontraron documentos.' : 'No hay documentos registrados.'}
                  </td>
                </tr>
              ) : (
                sortedDocumentos.map((doc) => (
                  <tr key={doc.id_documento}>
                    <td>
                      <div className="biblioteca-table__doc-cell">
                        <div
                          className={`biblioteca-table__doc-icon biblioteca-table__doc-icon--${doc.icono}`}
                        >
                          <FileText />
                        </div>
                        <span className="biblioteca-table__doc-title">{doc.titulo}</span>
                      </div>
                    </td>
                    <td>
                      <div className="biblioteca-table__categoria">
                        <span
                          className={`biblioteca-table__cat-dot biblioteca-table__cat-dot--${CATEGORIA_DOT_CLASS[doc.categoria] ?? 'otros'}`}
                        />
                        {doc.categoria}
                      </div>
                    </td>
                    <td className="biblioteca-table__fecha">{formatFecha(doc.fecha_creacion)}</td>
                    <td className="biblioteca-table__fecha">
                      {formatFecha(doc.ultima_modificacion)}
                    </td>
                    <td>
                      <button className="biblioteca-table__action-btn" title="Ver documento"
                        onClick={() => handlePreview(doc)}>
                        <Eye />
                      </button>
                    </td>
                    <td>
                      <button className="biblioteca-table__action-btn"
                        title="Descargar"
                        onClick={() => handleDownload(doc)}>
                        <Download />
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!isLoading && !isError && total > 0 && (
          <div className="biblioteca-page__pagination">
            <div className="biblioteca-page__pagination-info">
              Mostrando <span>{showingFrom}-{showingTo}</span> de{' '}
              <span>{total.toLocaleString('es-BO')}</span> documentos
            </div>
            <div className="biblioteca-page__pagination-controls">
              <button
                className="biblioteca-page__pagination-btn"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
              >
                <ChevronLeft />
              </button>
              <button
                className="biblioteca-page__pagination-btn"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Preview modal */}
      {previewUrl && (
        <DocumentPreviewModal
          fileUrl={previewUrl}
          fileName={previewName}
          onClose={closePreview}
        />
      )}
    </div>
  );
}
