import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Save,
  Loader2,
  UserRound,
  ListChecks,
  Target,
  FileText,
  Pencil,
  Braces,
  Hash,
  DollarSign,
  Search,
  CheckSquare,
  Filter,
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getPrompt, updatePrompt } from '../api/prompts';
import { getDocumentos } from '../api/documentos';
import type { SystemPromptUpdate } from '../types/prompt';
import type { DocumentoConocimiento } from '../types/documento';
import './EditorPromptPage.css';

const SECTION_DEFS = [
  { key: 'contenido_rol', label: 'ROL', icon: UserRound, placeholder: 'Define el rol del asistente...' },
  { key: 'contenido_tarea', label: 'TAREA', icon: ListChecks, placeholder: 'Describe la tarea principal...' },
  { key: 'contenido_alcances', label: 'ALCANCES', icon: Target, placeholder: 'Define los alcances y limitaciones...' },
  { key: 'contenido_contexto', label: 'CONTEXTO', icon: FileText, placeholder: 'Proporciona el contexto necesario...' },
] as const;

type SectionKey = typeof SECTION_DEFS[number]['key'];
type TabId = 'prompt' | 'fuentes';

const DEFAULT_TEMP = 0.7;
const DEFAULT_TOP_P = 0.95;
const DEFAULT_TOP_K = 20;

export default function EditorPromptPage() {
  const { idPrompt } = useParams<{ idPrompt: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const promptId = Number(idPrompt);

  const { data: prompt, isLoading, isError } = useQuery({
    queryKey: ['prompt', promptId],
    queryFn: () => getPrompt(promptId),
    enabled: !isNaN(promptId),
  });

  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>('prompt');

  // Local form state
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [sections, setSections] = useState<Record<SectionKey, string>>({
    contenido_rol: '',
    contenido_tarea: '',
    contenido_alcances: '',
    contenido_contexto: '',
  });
  const [temperatura, setTemperatura] = useState(DEFAULT_TEMP);
  const [topP, setTopP] = useState(DEFAULT_TOP_P);
  const [topK, setTopK] = useState(DEFAULT_TOP_K);
  const [enabledSections, setEnabledSections] = useState<Record<SectionKey, boolean>>({
    contenido_rol: true,
    contenido_tarea: true,
    contenido_alcances: true,
    contenido_contexto: true,
  });

  // Filtrar Fuentes state
  const [selectedDocIds, setSelectedDocIds] = useState<Set<number>>(new Set());
  const [docSearch, setDocSearch] = useState('');
  const [fuentesApplied, setFuentesApplied] = useState(false);

  // Fetch documents
  const { data: documentos = [], isLoading: docsLoading } = useQuery({
    queryKey: ['documentos-all'],
    queryFn: () => getDocumentos({ limit: 500 }),
    enabled: activeTab === 'fuentes',
  });

  // Populate form when prompt loads
  useEffect(() => {
    if (!prompt) return;
    setNombre(prompt.nombre);
    setDescripcion(prompt.descripcion ?? '');
    setSections({
      contenido_rol: prompt.contenido_rol ?? '',
      contenido_tarea: prompt.contenido_tarea ?? '',
      contenido_alcances: prompt.contenido_alcances ?? '',
      contenido_contexto: prompt.contenido_contexto ?? '',
    });
    setTemperatura(prompt.temperatura);
    setTopP(prompt.top_p);
    setTopK(prompt.top_k);
    setEnabledSections({
      contenido_rol: true,
      contenido_tarea: true,
      contenido_alcances: true,
      contenido_contexto: true,
    });
    // Pre-populate selected documents from prompt data
    if (prompt.documentos_conocimiento && prompt.documentos_conocimiento.length > 0) {
      setSelectedDocIds(new Set(prompt.documentos_conocimiento));
      setFuentesApplied(true);
    }
  }, [prompt]);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data: SystemPromptUpdate) => updatePrompt(promptId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompt', promptId] });
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      nombre,
      descripcion: descripcion || null,
      contenido_rol: sections.contenido_rol || null,
      contenido_tarea: sections.contenido_tarea || null,
      contenido_alcances: sections.contenido_alcances || null,
      contenido_contexto: sections.contenido_contexto || null,
      temperatura,
      top_p: topP,
      top_k: topK,
      documentos_conocimiento: Array.from(selectedDocIds),
    });
  };

  const handleReset = () => {
    setTemperatura(DEFAULT_TEMP);
    setTopP(DEFAULT_TOP_P);
    setTopK(DEFAULT_TOP_K);
  };

  // Token estimate (rough: 1 token ~ 4 chars)
  const tokenEstimate = useMemo(() => {
    const allText = Object.values(sections).join('');
    return Math.ceil(allText.length / 4);
  }, [sections]);

  // Cost estimate (rough: $0.01 per 1k tokens)
  const costEstimate = useMemo(() => {
    return ((tokenEstimate / 1000) * 0.01).toFixed(4);
  }, [tokenEstimate]);

  // Filter documents by search term
  const filteredDocs = useMemo(() => {
    if (!docSearch.trim()) return documentos;
    const term = docSearch.toLowerCase();
    return documentos.filter(
      (d) =>
        d.titulo.toLowerCase().includes(term) ||
        d.categoria?.toLowerCase().includes(term) ||
        d.nombre_archivo?.toLowerCase().includes(term)
    );
  }, [documentos, docSearch]);

  // Group documents by category
  const groupedDocs = useMemo(() => {
    const groups: Record<string, DocumentoConocimiento[]> = {};
    for (const doc of filteredDocs) {
      const cat = doc.categoria || 'Sin categoría';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(doc);
    }
    return groups;
  }, [filteredDocs]);

  const toggleDoc = (id: number) => {
    setSelectedDocIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedDocIds.size === filteredDocs.length) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(filteredDocs.map((d) => d.id_documento)));
    }
  };

  const handleUsarDocumentos = () => {
    setFuentesApplied(true);
    setActiveTab('prompt');
  };

  if (isLoading) {
    return (
      <div className="ep-loading">
        <Loader2 className="ep-spin" /> Cargando prompt...
      </div>
    );
  }

  if (isError || !prompt) {
    return (
      <div className="ep-error">
        Error al cargar el prompt. Verifica que existe.
      </div>
    );
  }

  return (
    <div className="ep-page">
      {/* Top bar */}
      <div className="ep-topbar">
        <div className="ep-topbar__left">
          <button className="ep-topbar__back" onClick={() => navigate('/prompts')} title="Volver">
            <ArrowLeft />
          </button>
          <h1 className="ep-topbar__title">Editor de Prompt: {nombre}</h1>
          <span
            className={`ep-topbar__badge ${prompt.es_activo ? 'ep-topbar__badge--activo' : 'ep-topbar__badge--inactivo'
              }`}
          >
            {prompt.es_activo ? 'Activo' : 'Inactivo'}
          </span>
        </div>
        <div className="ep-topbar__actions">
          <button
            className="ep-topbar__btn ep-topbar__save"
            onClick={handleSave}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? <Loader2 className="ep-spin" /> : <Save />}
            Guardar
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="ep-tabs">
        <button
          className={`ep-tabs__tab ${activeTab === 'prompt' ? 'ep-tabs__tab--active' : ''}`}
          onClick={() => setActiveTab('prompt')}
        >
          Prompt
        </button>
        <button
          className={`ep-tabs__tab ${activeTab === 'fuentes' ? 'ep-tabs__tab--active' : ''}`}
          onClick={() => setActiveTab('fuentes')}
        >
          <Filter size={14} />
          Filtrar Fuentes
          {fuentesApplied && selectedDocIds.size > 0 && (
            <span className="ep-tabs__badge">{selectedDocIds.size}</span>
          )}
        </button>
      </div>

      {/* ============ PROMPT TAB ============ */}
      {activeTab === 'prompt' && (
        <div className="ep-layout">
          {/* Main content */}
          <div className="ep-main">
            {/* Name field */}
            <div className="ep-name-field">
              <label className="ep-name-field__label">Nombre del Prompt</label>
              <input
                type="text"
                className="ep-name-field__input"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre del prompt..."
              />
            </div>

            {/* Description field */}
            <div className="ep-desc-field">
              <label className="ep-desc-field__label">Descripción</label>
              <textarea
                className="ep-desc-field__input"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Breve descripción del prompt..."
              />
            </div>

            {/* Section cards */}
            {SECTION_DEFS.map(({ key, label, icon: Icon, placeholder }) => {
              if (!enabledSections[key]) return null;
              return (
                <div className="ep-section" key={key}>
                  <div className="ep-section__header">
                    <div className="ep-section__header-left">
                      <div className="ep-section__icon">
                        <Icon />
                      </div>
                      <span className="ep-section__label">{label}</span>
                    </div>
                    <span className="ep-section__variable-chip">
                      <Braces /> Variable
                    </span>
                  </div>
                  <textarea
                    className="ep-section__textarea"
                    value={sections[key]}
                    onChange={(e) =>
                      setSections((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    placeholder={placeholder}
                  />
                </div>
              );
            })}
          </div>

          {/* Sidebar */}
          <div className="ep-sidebar">
            {/* Estructura del Prompt */}
            <div className="ep-sidebar__section">
              <div className="ep-sidebar__section-title">Estructura del Prompt</div>
              <div className="ep-sidebar__checklist">
                {SECTION_DEFS.map(({ key, label }) => (
                  <div className="ep-sidebar__check-item" key={key}>
                    <div className="ep-sidebar__check-item-left">
                      <input
                        type="checkbox"
                        checked={enabledSections[key]}
                        onChange={() =>
                          setEnabledSections((prev) => ({ ...prev, [key]: !prev[key] }))
                        }
                      />
                      <span className="ep-sidebar__check-item-label">{label}</span>
                    </div>
                    <button className="ep-sidebar__check-edit" title="Editar sección">
                      <Pencil />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Ajustes del Modelo */}
            <div className="ep-sidebar__section">
              <div className="ep-sidebar__section-title">Ajustes del Modelo</div>

              <div className="ep-sidebar__slider-group">
                <div className="ep-sidebar__slider-header">
                  <span className="ep-sidebar__slider-label">Temperatura</span>
                  <span className="ep-sidebar__slider-value">{temperatura.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  className="ep-sidebar__slider"
                  min={0}
                  max={1}
                  step={0.01}
                  value={temperatura}
                  onChange={(e) => setTemperatura(parseFloat(e.target.value))}
                />
              </div>

              <div className="ep-sidebar__slider-group">
                <div className="ep-sidebar__slider-header">
                  <span className="ep-sidebar__slider-label">Top K</span>
                  <span className="ep-sidebar__slider-value">{topK.toLocaleString()}</span>
                </div>
                <input
                  type="range"
                  className="ep-sidebar__slider"
                  min={0}
                  max={20}
                  step={1}
                  value={topK}
                  onChange={(e) => setTopK(parseFloat(e.target.value))}
                />
              </div>

              <div className="ep-sidebar__slider-group">
                <div className="ep-sidebar__slider-header">
                  <span className="ep-sidebar__slider-label">Top P</span>
                  <span className="ep-sidebar__slider-value">{topP.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  className="ep-sidebar__slider"
                  min={0}
                  max={1}
                  step={0.01}
                  value={topP}
                  onChange={(e) => setTopP(parseFloat(e.target.value))}
                />
              </div>

              <button className="ep-sidebar__reset-btn" onClick={handleReset}>
                Restablecer Ajustes
              </button>
            </div>

            {/* Fuentes badge in sidebar */}
            {fuentesApplied && selectedDocIds.size > 0 && (
              <div className="ep-sidebar__section">
                <div className="ep-sidebar__section-title">Fuentes Seleccionadas</div>
                <div className="ep-sidebar__fuentes-badge">
                  <CheckSquare size={16} />
                  <span>{selectedDocIds.size} documento{selectedDocIds.size !== 1 ? 's' : ''} seleccionado{selectedDocIds.size !== 1 ? 's' : ''}</span>
                </div>
                <button
                  className="ep-sidebar__fuentes-edit"
                  onClick={() => setActiveTab('fuentes')}
                >
                  Editar selección
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ FUENTES TAB ============ */}
      {activeTab === 'fuentes' && (
        <div className="ep-fuentes">
          <div className="ep-fuentes__header">
            <h2 className="ep-fuentes__title">
              <Filter size={20} />
              Filtrar Fuentes de Conocimiento
            </h2>
            <p className="ep-fuentes__subtitle">
              Selecciona los documentos que el asistente debe consultar al responder.
            </p>
          </div>

          {/* Search + select all */}
          <div className="ep-fuentes__toolbar">
            <div className="ep-fuentes__search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Buscar documentos..."
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
              />
            </div>
            <button className="ep-fuentes__select-all" onClick={toggleAll}>
              {selectedDocIds.size === filteredDocs.length && filteredDocs.length > 0
                ? 'Deseleccionar todos'
                : 'Seleccionar todos'}
            </button>
          </div>

          {/* Document list */}
          <div className="ep-fuentes__list">
            {docsLoading ? (
              <div className="ep-fuentes__loading">
                <Loader2 className="ep-spin" /> Cargando documentos...
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="ep-fuentes__empty">
                No se encontraron documentos{docSearch ? ` para "${docSearch}"` : ''}.
              </div>
            ) : (
              Object.entries(groupedDocs).map(([category, docs]) => (
                <div className="ep-fuentes__group" key={category}>
                  <div className="ep-fuentes__group-header">
                    <span className="ep-fuentes__group-label">{category}</span>
                    <span className="ep-fuentes__group-count">{docs.length}</span>
                  </div>
                  {docs.map((doc) => (
                    <label className="ep-fuentes__item" key={doc.id_documento}>
                      <input
                        type="checkbox"
                        checked={selectedDocIds.has(doc.id_documento)}
                        onChange={() => toggleDoc(doc.id_documento)}
                      />
                      <div className="ep-fuentes__item-info">
                        <span className="ep-fuentes__item-title">{doc.titulo}</span>
                        {doc.nombre_archivo && (
                          <span className="ep-fuentes__item-file">{doc.nombre_archivo}</span>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              ))
            )}
          </div>

          {/* Bottom action bar */}
          <div className="ep-fuentes__actions">
            <span className="ep-fuentes__count">
              {selectedDocIds.size} de {documentos.length} seleccionados
            </span>
            <button
              className="ep-fuentes__apply-btn"
              onClick={handleUsarDocumentos}
              disabled={selectedDocIds.size === 0}
            >
              <CheckSquare size={16} />
              Usar estos documentos
            </button>
          </div>
        </div>
      )}

      {/* Bottom status bar */}
      <div className="ep-statusbar">
        <div className="ep-statusbar__item">
          <Hash />
          ~{tokenEstimate.toLocaleString()} tokens
        </div>
        <div className="ep-statusbar__item">
          <DollarSign />
          ~${costEstimate}
        </div>
        <div className="ep-statusbar__item">
          <span className="ep-statusbar__dot" />
          <span className="ep-statusbar__ready">Listo para probar</span>
        </div>
      </div>
    </div>
  );
}
