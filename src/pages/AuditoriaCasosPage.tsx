import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Eye,
  FileText,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  X,
  PenLine,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Loader2,
} from 'lucide-react';
import './AuditoriaCasosPage.css';

const ITEMS_PER_PAGE = 5;

type Categoria = 'Abierto' | 'Archivado' | 'Cerrado';
type EstadoAuditoria = 'Auditado' | 'Sin auditar';
type SortMode = 'fecha_desc' | 'nombre_asc';
type FilterCategoria = Categoria | null;
type FilterEstado = EstadoAuditoria | null;

interface DocRelacionado {
  nombre: string;
  tipo: string;
  tamano: string;
}

interface DocumentoAuditoria {
  id: number;
  nombre: string;
  casoNumero: string;
  casoCliente: string;
  categoria: Categoria;
  estado: EstadoAuditoria;
  fechaGeneracion: string;
  resumenAuditoria: string;
  indiceCumplimiento: number;
  tags: string[];
  docsRelacionados: DocRelacionado[];
  creadoPor: string;
  ultimaRevision: string;
}

/* ── Auditoría en Progreso types ── */

type DocAuditEstado = 'completado' | 'riesgo' | 'procesando' | 'en_cola';

interface DocAuditItem {
  nombre: string;
  estado: DocAuditEstado;
  cumplimiento: number;
  tiempo: string;
  alerta?: string;
}

interface CasoAuditData {
  titulo: string;
  casoNumero: string;
  documentos: DocAuditItem[];
}

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

/* ── Mock: tabla principal ── */

const MOCK_DOCUMENTOS: DocumentoAuditoria[] = [
  {
    id: 1, nombre: 'Contrato de Servicios Legales', casoNumero: '2024-001', casoCliente: 'Minera San Cristóbal',
    categoria: 'Abierto', estado: 'Auditado', fechaGeneracion: '2025-12-10',
    resumenAuditoria: 'El documento presenta un <b>índice de cumplimiento del 97%</b>. Las cláusulas de confidencialidad y responsabilidad están correctamente redactadas según la normativa vigente. Se recomienda revisión menor en la sección 3.2 referente a penalidades por incumplimiento.',
    indiceCumplimiento: 97, tags: ['Riesgo Bajo', 'Vigente'],
    docsRelacionados: [
      { nombre: 'Anexo A - Tarifario', tipo: 'PDF', tamano: '1.8 MB' },
      { nombre: 'Carta de Presentación', tipo: 'PDF', tamano: '340 KB' },
    ],
    creadoPor: 'M. García', ultimaRevision: 'Hoy, 10:15 AM',
  },
  {
    id: 2, nombre: 'Poder Notarial Amplio', casoNumero: '2024-002', casoCliente: 'Banco Nacional de Bolivia',
    categoria: 'Abierto', estado: 'Sin auditar', fechaGeneracion: '2025-12-08',
    resumenAuditoria: 'Documento pendiente de revisión. Se requiere verificar la validez de las facultades otorgadas y la correcta identificación del poderdante conforme al artículo 804 del Código Civil boliviano.',
    indiceCumplimiento: 0, tags: ['Pendiente', 'Requiere revisión'],
    docsRelacionados: [
      { nombre: 'CI Poderdante', tipo: 'PDF', tamano: '520 KB' },
      { nombre: 'Testimonio Notarial', tipo: 'PDF', tamano: '2.1 MB' },
      { nombre: 'Formulario de Registro', tipo: 'PDF', tamano: '180 KB' },
    ],
    creadoPor: 'A. Thompson', ultimaRevision: 'Pendiente',
  },
  {
    id: 3, nombre: 'Demanda Civil Ordinaria', casoNumero: '2024-003', casoCliente: 'Constructora Villalobos',
    categoria: 'Cerrado', estado: 'Auditado', fechaGeneracion: '2025-11-25',
    resumenAuditoria: 'El documento presenta un <b>índice de cumplimiento del 92%</b>. La estructura procesal es correcta. Se identificó una observación menor en la cuantificación de daños y perjuicios que fue subsanada en la versión final.',
    indiceCumplimiento: 92, tags: ['Riesgo Bajo', 'Cerrado'],
    docsRelacionados: [
      { nombre: 'Prueba Documental 1', tipo: 'PDF', tamano: '3.4 MB' },
      { nombre: 'Sentencia', tipo: 'PDF', tamano: '890 KB' },
    ],
    creadoPor: 'R. Mendoza', ultimaRevision: '25 nov 2025, 16:30',
  },
  {
    id: 4, nombre: 'Recurso de Apelación', casoNumero: '2024-001', casoCliente: 'Minera San Cristóbal',
    categoria: 'Abierto', estado: 'Sin auditar', fechaGeneracion: '2025-12-12',
    resumenAuditoria: 'Documento pendiente de auditoría. El recurso fue generado automáticamente y requiere validación de los fundamentos legales citados, especialmente los artículos 251-261 del Código de Procedimiento Civil.',
    indiceCumplimiento: 0, tags: ['Pendiente', 'Urgente'],
    docsRelacionados: [
      { nombre: 'Resolución Apelada', tipo: 'PDF', tamano: '1.2 MB' },
    ],
    creadoPor: 'M. García', ultimaRevision: 'Pendiente',
  },
  {
    id: 5, nombre: 'Acta de Conciliación', casoNumero: '2024-004', casoCliente: 'Transportes Alianza',
    categoria: 'Archivado', estado: 'Auditado', fechaGeneracion: '2025-10-15',
    resumenAuditoria: 'El documento presenta un <b>índice de cumplimiento del 100%</b>. El acta cumple con todos los requisitos formales establecidos en la Ley 708 de Conciliación y Arbitraje. Ambas partes ratificaron el acuerdo.',
    indiceCumplimiento: 100, tags: ['Sin riesgo', 'Archivado'],
    docsRelacionados: [
      { nombre: 'Acuerdo Firmado', tipo: 'PDF', tamano: '2.7 MB' },
      { nombre: 'Acta de Audiencia', tipo: 'PDF', tamano: '1.5 MB' },
    ],
    creadoPor: 'L. Flores', ultimaRevision: '15 oct 2025, 11:00',
  },
  {
    id: 6, nombre: 'Escritura de Constitución', casoNumero: '2024-005', casoCliente: 'Tech Solutions SRL',
    categoria: 'Abierto', estado: 'Sin auditar', fechaGeneracion: '2025-12-01',
    resumenAuditoria: 'Documento pendiente de revisión. Se debe verificar la conformidad del objeto social, el capital autorizado y la estructura de gobernanza con el Código de Comercio boliviano (Arts. 127-217).',
    indiceCumplimiento: 0, tags: ['Pendiente', 'Requiere revisión'],
    docsRelacionados: [
      { nombre: 'Estatutos Sociales', tipo: 'PDF', tamano: '4.2 MB' },
      { nombre: 'Poder del Representante', tipo: 'PDF', tamano: '650 KB' },
      { nombre: 'Balance de Apertura', tipo: 'XLSX', tamano: '320 KB' },
    ],
    creadoPor: 'A. Thompson', ultimaRevision: 'Pendiente',
  },
  {
    id: 7, nombre: 'Contrato de Arrendamiento Comercial', casoNumero: '2024-006', casoCliente: 'Inmobiliaria Prado',
    categoria: 'Cerrado', estado: 'Auditado', fechaGeneracion: '2025-09-20',
    resumenAuditoria: 'El documento presenta un <b>índice de cumplimiento del 94%</b>. Las cláusulas de renovación automática y ajuste por inflación están correctamente redactadas según la normativa vigente. Se recomienda revisión manual en la sección 4.2 referente a "subarrendamiento" para confirmar alineación con las políticas internas de Inmobiliaria Prado.',
    indiceCumplimiento: 94, tags: ['Riesgo Bajo', 'Vigente'],
    docsRelacionados: [
      { nombre: 'Anexo A - Inventario', tipo: 'PDF', tamano: '2.4 MB' },
      { nombre: 'Póliza de Seguro', tipo: 'PDF', tamano: '1.1 MB' },
      { nombre: 'Correspondencia Previa', tipo: 'EML', tamano: '45 KB' },
    ],
    creadoPor: 'A. Thompson', ultimaRevision: 'Hoy, 14:30 PM',
  },
  {
    id: 8, nombre: 'Memorial de Contestación', casoNumero: '2024-002', casoCliente: 'Banco Nacional de Bolivia',
    categoria: 'Abierto', estado: 'Auditado', fechaGeneracion: '2025-12-05',
    resumenAuditoria: 'El documento presenta un <b>índice de cumplimiento del 89%</b>. Los argumentos de defensa son consistentes con la documentación probatoria. Se sugiere reforzar la excepción de prescripción con jurisprudencia reciente del Tribunal Supremo.',
    indiceCumplimiento: 89, tags: ['Riesgo Medio', 'En proceso'],
    docsRelacionados: [
      { nombre: 'Demanda Original', tipo: 'PDF', tamano: '1.9 MB' },
      { nombre: 'Pruebas de Descargo', tipo: 'PDF', tamano: '5.1 MB' },
    ],
    creadoPor: 'R. Mendoza', ultimaRevision: '05 dic 2025, 09:45',
  },
  {
    id: 9, nombre: 'Informe Pericial Contable', casoNumero: '2024-007', casoCliente: 'Cooperativa El Alto',
    categoria: 'Archivado', estado: 'Sin auditar', fechaGeneracion: '2025-08-30',
    resumenAuditoria: 'Documento pendiente de auditoría. El informe pericial requiere validación de las metodologías de cálculo empleadas y verificación cruzada con los estados financieros presentados como prueba.',
    indiceCumplimiento: 0, tags: ['Pendiente', 'Archivado'],
    docsRelacionados: [
      { nombre: 'Estados Financieros 2024', tipo: 'XLSX', tamano: '8.3 MB' },
      { nombre: 'Extractos Bancarios', tipo: 'PDF', tamano: '12.1 MB' },
    ],
    creadoPor: 'L. Flores', ultimaRevision: 'Pendiente',
  },
  {
    id: 10, nombre: 'Resolución de Homologación', casoNumero: '2024-003', casoCliente: 'Constructora Villalobos',
    categoria: 'Cerrado', estado: 'Auditado', fechaGeneracion: '2025-11-18',
    resumenAuditoria: 'El documento presenta un <b>índice de cumplimiento del 100%</b>. La resolución judicial homologa correctamente el acuerdo transaccional. Todos los requisitos procesales fueron cumplidos satisfactoriamente.',
    indiceCumplimiento: 100, tags: ['Sin riesgo', 'Cerrado'],
    docsRelacionados: [
      { nombre: 'Acuerdo Transaccional', tipo: 'PDF', tamano: '3.0 MB' },
    ],
    creadoPor: 'R. Mendoza', ultimaRevision: '18 nov 2025, 15:20',
  },
];

/* ── Mock: auditoría en progreso por caso ── */

const MOCK_AUDIT_POR_CASO: Record<string, CasoAuditData> = {
  '2024-001': {
    titulo: 'Servicios Legales Minera San Cristóbal',
    casoNumero: '2024-001',
    documentos: [
      { nombre: 'Contrato de Servicios Legales', estado: 'completado', cumplimiento: 97, tiempo: 'Analizado hace 3 min' },
      { nombre: 'Recurso de Apelación', estado: 'completado', cumplimiento: 64, tiempo: 'Analizado hace 1 min' },
      { nombre: 'Anexo de Tarifas', estado: 'riesgo', cumplimiento: 32, tiempo: 'Analizado hace 30 seg', alerta: 'Faltan cláusulas de ajuste por inflación según normativa vigente.' },
      { nombre: 'Carta de Presentación', estado: 'procesando', cumplimiento: 0, tiempo: 'Procesando contenido legal...' },
      { nombre: 'Resolución Administrativa', estado: 'en_cola', cumplimiento: 0, tiempo: 'En cola de espera' },
    ],
  },
  '2024-002': {
    titulo: 'Litigio Bancario BNB',
    casoNumero: '2024-002',
    documentos: [
      { nombre: 'Poder Notarial Amplio', estado: 'completado', cumplimiento: 88, tiempo: 'Analizado hace 5 min' },
      { nombre: 'Memorial de Contestación', estado: 'completado', cumplimiento: 89, tiempo: 'Analizado hace 2 min' },
      { nombre: 'Pruebas de Descargo', estado: 'riesgo', cumplimiento: 41, tiempo: 'Analizado hace 45 seg', alerta: 'Documentación probatoria incompleta según Art. 136 CPC.' },
      { nombre: 'CI Poderdante', estado: 'procesando', cumplimiento: 0, tiempo: 'Procesando contenido legal...' },
      { nombre: 'Testimonio Notarial', estado: 'en_cola', cumplimiento: 0, tiempo: 'En cola de espera' },
      { nombre: 'Formulario de Registro', estado: 'en_cola', cumplimiento: 0, tiempo: 'En cola de espera' },
    ],
  },
  '2024-003': {
    titulo: 'Demanda Civil Constructora Villalobos',
    casoNumero: '2024-003',
    documentos: [
      { nombre: 'Demanda Civil Ordinaria', estado: 'completado', cumplimiento: 92, tiempo: 'Analizado hace 4 min' },
      { nombre: 'Resolución de Homologación', estado: 'completado', cumplimiento: 100, tiempo: 'Analizado hace 2 min' },
      { nombre: 'Prueba Documental 1', estado: 'completado', cumplimiento: 95, tiempo: 'Analizado hace 1 min' },
      { nombre: 'Sentencia Final', estado: 'procesando', cumplimiento: 0, tiempo: 'Procesando contenido legal...' },
    ],
  },
  '2024-004': {
    titulo: 'Conciliación Transportes Alianza',
    casoNumero: '2024-004',
    documentos: [
      { nombre: 'Acta de Conciliación', estado: 'completado', cumplimiento: 100, tiempo: 'Analizado hace 6 min' },
      { nombre: 'Acuerdo Firmado', estado: 'completado', cumplimiento: 98, tiempo: 'Analizado hace 3 min' },
      { nombre: 'Acta de Audiencia', estado: 'completado', cumplimiento: 96, tiempo: 'Analizado hace 1 min' },
    ],
  },
  '2024-005': {
    titulo: 'Constitución Tech Solutions SRL',
    casoNumero: '2024-005',
    documentos: [
      { nombre: 'Escritura de Constitución', estado: 'completado', cumplimiento: 78, tiempo: 'Analizado hace 2 min' },
      { nombre: 'Estatutos Sociales', estado: 'riesgo', cumplimiento: 35, tiempo: 'Analizado hace 40 seg', alerta: 'Objeto social no cumple con requisitos del Art. 127 Código de Comercio.' },
      { nombre: 'Poder del Representante', estado: 'procesando', cumplimiento: 0, tiempo: 'Procesando contenido legal...' },
      { nombre: 'Balance de Apertura', estado: 'en_cola', cumplimiento: 0, tiempo: 'En cola de espera' },
    ],
  },
  '2024-006': {
    titulo: 'Arrendamiento Inmobiliaria Prado',
    casoNumero: '2024-006',
    documentos: [
      { nombre: 'Contrato de Arrendamiento Comercial', estado: 'completado', cumplimiento: 94, tiempo: 'Analizado hace 4 min' },
      { nombre: 'Anexo A - Inventario', estado: 'completado', cumplimiento: 91, tiempo: 'Analizado hace 2 min' },
      { nombre: 'Póliza de Seguro', estado: 'completado', cumplimiento: 87, tiempo: 'Analizado hace 1 min' },
      { nombre: 'Correspondencia Previa', estado: 'procesando', cumplimiento: 0, tiempo: 'Procesando contenido legal...' },
    ],
  },
  '2024-007': {
    titulo: 'Pericia Contable Cooperativa El Alto',
    casoNumero: '2024-007',
    documentos: [
      { nombre: 'Informe Pericial Contable', estado: 'completado', cumplimiento: 72, tiempo: 'Analizado hace 3 min' },
      { nombre: 'Estados Financieros 2024', estado: 'riesgo', cumplimiento: 28, tiempo: 'Analizado hace 1 min', alerta: 'Metodología de cálculo no cumple con NIF vigentes.' },
      { nombre: 'Extractos Bancarios', estado: 'procesando', cumplimiento: 0, tiempo: 'Procesando contenido legal...' },
    ],
  },
};

function buildPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | 'ellipsis')[] = [1];
  if (current > 3) pages.push('ellipsis');
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (current < total - 2) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

function getCumplimientoColor(c: number): string {
  if (c >= 80) return 'ap-doc__cumpl--high';
  if (c >= 50) return 'ap-doc__cumpl--mid';
  return 'ap-doc__cumpl--low';
}

/* ── Vista Rápida Panel (Eye button) ── */

function VistaRapidaPanel({ doc, onClose }: { doc: DocumentoAuditoria; onClose: () => void }) {
  return (
    <div className="vista-rapida-overlay" onClick={onClose}>
      <div className="vista-rapida" onClick={(e) => e.stopPropagation()}>
        <div className="vista-rapida__header">
          <span className="vista-rapida__label">VISTA RÁPIDA</span>
          <button className="vista-rapida__close" onClick={onClose}><X /></button>
        </div>
        <h2 className="vista-rapida__title">{doc.nombre}</h2>
        <div className="vista-rapida__section">
          <div className="vista-rapida__section-header">
            <PenLine className="vista-rapida__section-icon" />
            <span>RESUMEN DE AUDITORÍA</span>
          </div>
          <div className="vista-rapida__resumen" dangerouslySetInnerHTML={{ __html: doc.resumenAuditoria }} />
          <div className="vista-rapida__tags">
            {doc.tags.map((tag) => (<span key={tag} className="vista-rapida__tag">{tag}</span>))}
          </div>
        </div>
        <div className="vista-rapida__section">
          <div className="vista-rapida__section-header">
            <span>DOCUMENTOS RELACIONADOS</span>
            <span className="vista-rapida__count">{doc.docsRelacionados.length}</span>
          </div>
          <div className="vista-rapida__docs-list">
            {doc.docsRelacionados.map((rd) => (
              <div key={rd.nombre} className="vista-rapida__doc-item">
                <FileText className="vista-rapida__doc-icon" />
                <div className="vista-rapida__doc-info">
                  <span className="vista-rapida__doc-name">{rd.nombre}</span>
                  <span className="vista-rapida__doc-meta">{rd.tipo} &bull; {rd.tamano}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="vista-rapida__meta">
          <div className="vista-rapida__meta-col">
            <span className="vista-rapida__meta-label">CREADO POR</span>
            <div className="vista-rapida__meta-value">
              <span className="vista-rapida__meta-avatar" />{doc.creadoPor}
            </div>
          </div>
          <div className="vista-rapida__meta-col">
            <span className="vista-rapida__meta-label">ÚLTIMA REVISIÓN</span>
            <span className="vista-rapida__meta-value">{doc.ultimaRevision}</span>
          </div>
        </div>
        <button className="vista-rapida__cta" onClick={onClose}>
          Cerrar Vista Rápida
        </button>
      </div>
    </div>
  );
}

/* ── Auditoría en Progreso Panel (FileText button) ── */

function AuditoriaProgresoPanel({
  casoData,
  casoCliente,
  onClose,
  onVerResumen,
}: {
  casoData: CasoAuditData;
  casoCliente: string;
  onClose: () => void;
  onVerResumen: () => void;
}) {
  const [docs, setDocs] = useState<DocAuditItem[]>(() =>
    casoData.documentos.map((d) => ({ ...d }))
  );

  const advanceNext = useCallback(() => {
    setDocs((prev) => {
      const next = [...prev];
      const processingIdx = next.findIndex((d) => d.estado === 'procesando');
      if (processingIdx !== -1) {
        // Finish current processing doc
        const scores = [94, 68, 32, 87, 76, 55, 91, 42];
        const score = scores[processingIdx % scores.length];
        next[processingIdx] = {
          ...next[processingIdx],
          estado: score < 50 ? 'riesgo' : 'completado',
          cumplimiento: score,
          tiempo: 'Analizado hace unos seg',
          alerta: score < 50 ? 'Se detectaron cláusulas que requieren revisión manual.' : undefined,
        };
        // Start next queued doc
        const nextQueue = next.findIndex((d) => d.estado === 'en_cola');
        if (nextQueue !== -1) {
          next[nextQueue] = { ...next[nextQueue], estado: 'procesando', tiempo: 'Procesando contenido legal...' };
        }
      }
      return next;
    });
  }, []);

  // Auto-advance processing documents
  useEffect(() => {
    const hasProcessing = docs.some((d) => d.estado === 'procesando');
    if (!hasProcessing) return;
    const timer = setTimeout(advanceNext, 2500);
    return () => clearTimeout(timer);
  }, [docs, advanceNext]);

  const analizados = docs.filter((d) => d.estado === 'completado' || d.estado === 'riesgo').length;
  const total = docs.length;
  const allDone = analizados === total;

  return (
    <div className="vista-rapida-overlay" onClick={onClose}>
      <div className="ap-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="ap-panel__header">
          <div>
            <h2 className="ap-panel__title">
              Auditoría en Progreso: {casoCliente}
            </h2>
            <div className="ap-panel__status-row">
              <span className={`ap-panel__status-dot ${allDone ? 'ap-panel__status-dot--done' : ''}`} />
              <span className="ap-panel__status-text">
                {allDone ? 'Auditoría completada' : 'Analizando documentos...'}
              </span>
            </div>
          </div>
          <div className="ap-panel__counter">
            <span className="ap-panel__counter-num">{analizados}</span> de{' '}
            <span className="ap-panel__counter-num">{total}</span> Documentos Analizados
          </div>
        </div>

        {/* Document list */}
        <div className="ap-panel__docs">
          {docs.map((doc, idx) => (
            <div key={idx} className={`ap-doc ap-doc--${doc.estado}`}>
              {/* Status icon */}
              <div className="ap-doc__icon-col">
                {doc.estado === 'completado' && <CheckCircle2 className="ap-doc__status-icon ap-doc__status-icon--ok" />}
                {doc.estado === 'riesgo' && <AlertTriangle className="ap-doc__status-icon ap-doc__status-icon--risk" />}
                {doc.estado === 'procesando' && <Loader2 className="ap-doc__status-icon ap-doc__status-icon--loading spin" />}
                {doc.estado === 'en_cola' && <Clock className="ap-doc__status-icon ap-doc__status-icon--queue" />}
              </div>

              {/* Content */}
              <div className="ap-doc__body">
                <div className="ap-doc__top-row">
                  <div className="ap-doc__info">
                    <FileText className="ap-doc__file-icon" />
                    <div>
                      <div className="ap-doc__name">{doc.nombre}</div>
                      <div className="ap-doc__time">{doc.tiempo}</div>
                    </div>
                  </div>
                  {(doc.estado === 'completado' || doc.estado === 'riesgo') && (
                    <div className="ap-doc__cumpl-wrap">
                      <span className="ap-doc__cumpl-label">CUMPLIMIENTO</span>
                      <span className={`ap-doc__cumpl-value ${getCumplimientoColor(doc.cumplimiento)}`}>
                        <span className={`ap-doc__cumpl-dot ${getCumplimientoColor(doc.cumplimiento)}`} />
                        {doc.cumplimiento}%
                      </span>
                    </div>
                  )}
                </div>
                {doc.estado === 'riesgo' && doc.alerta && (
                  <div className="ap-doc__alerta-row">
                    <span className="ap-doc__riesgo-tag">RIESGO ALTO</span>
                    <span className="ap-doc__alerta-text">{doc.alerta}</span>
                  </div>
                )}
                {doc.estado === 'procesando' && (
                  <div className="ap-doc__progress-bar">
                    <div className="ap-doc__progress-fill" />
                  </div>
                )}
              </div>

              {/* Eye icon for completed */}
              {(doc.estado === 'completado' || doc.estado === 'riesgo') && (
                <Eye className="ap-doc__eye" />
              )}
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          className={`ap-panel__cta ${allDone ? '' : 'ap-panel__cta--disabled'}`}
          disabled={!allDone}
          onClick={onVerResumen}
        >
          {allDone ? (
            <>Ver Documento Completo <ArrowRight /></>
          ) : (
            <><Loader2 className="spin" /> Ver Documento Completo <ArrowRight /></>
          )}
        </button>
      </div>
    </div>
  );
}

/* ── Main Page ── */

export default function AuditoriaCasosPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortMode, setSortMode] = useState<SortMode>('fecha_desc');
  const [filterCategoria, setFilterCategoria] = useState<FilterCategoria>(null);
  const [filterEstado, setFilterEstado] = useState<FilterEstado>(null);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentoAuditoria | null>(null);
  const [auditCaso, setAuditCaso] = useState<{ data: CasoAuditData; cliente: string } | null>(null);

  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilterDropdown(false);
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setShowSortDropdown(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setPreviewDoc(null); setAuditCaso(null); }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const processedDocs = useMemo(() => {
    let result = [...MOCK_DOCUMENTOS];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((d) =>
        d.nombre.toLowerCase().includes(q) ||
        d.casoNumero.toLowerCase().includes(q) ||
        d.casoCliente.toLowerCase().includes(q)
      );
    }
    if (filterCategoria !== null) result = result.filter((d) => d.categoria === filterCategoria);
    if (filterEstado !== null) result = result.filter((d) => d.estado === filterEstado);
    if (sortMode === 'fecha_desc') {
      result.sort((a, b) => new Date(b.fechaGeneracion).getTime() - new Date(a.fechaGeneracion).getTime());
    } else {
      result.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    }
    return result;
  }, [searchQuery, filterCategoria, filterEstado, sortMode]);

  const totalFiltered = processedDocs.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedDocs = processedDocs.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterCategoria, filterEstado, sortMode]);

  const hasActiveFilters = filterCategoria !== null || filterEstado !== null;

  const openAudit = (doc: DocumentoAuditoria) => {
    const data = MOCK_AUDIT_POR_CASO[doc.casoNumero];
    if (data) setAuditCaso({ data, cliente: doc.casoCliente });
  };

  return (
    <div className="auditoria-page">
      {/* Header */}
      <div className="auditoria-page__header">
        <div>
          <h1 className="auditoria-page__title">Auditoría de Casos</h1>
          <p className="auditoria-page__subtitle">Revisa y audita los documentos generados por caso</p>
        </div>
        <button className="auditoria-page__new-btn"><Plus /> Nueva Auditoría</button>
      </div>

      {/* Toolbar */}
      <div className="auditoria-page__toolbar">
        <div className="auditoria-page__search">
          <Search className="auditoria-page__search-icon" />
          <input type="text" placeholder="Buscar por documento, caso o cliente..." className="auditoria-page__search-input" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <div className="auditoria-page__dropdown-wrapper" ref={filterRef}>
          <button className={`auditoria-page__toolbar-btn ${hasActiveFilters ? 'auditoria-page__toolbar-btn--active' : ''}`} onClick={() => setShowFilterDropdown((v) => !v)}>
            <SlidersHorizontal /> Filtros
          </button>
          {showFilterDropdown && (
            <div className="auditoria-page__dropdown">
              <button className={`auditoria-page__dropdown-item ${filterCategoria === null && filterEstado === null ? 'auditoria-page__dropdown-item--active' : ''}`} onClick={() => { setFilterCategoria(null); setFilterEstado(null); setShowFilterDropdown(false); }}>Todos</button>
              <div className="auditoria-page__dropdown-divider" />
              {(['Abierto', 'Archivado', 'Cerrado'] as Categoria[]).map((cat) => (
                <button key={cat} className={`auditoria-page__dropdown-item ${filterCategoria === cat ? 'auditoria-page__dropdown-item--active' : ''}`} onClick={() => { setFilterCategoria(filterCategoria === cat ? null : cat); setShowFilterDropdown(false); }}>{cat}</button>
              ))}
              <div className="auditoria-page__dropdown-divider" />
              <button className={`auditoria-page__dropdown-item ${filterEstado === 'Auditado' ? 'auditoria-page__dropdown-item--active' : ''}`} onClick={() => { setFilterEstado(filterEstado === 'Auditado' ? null : 'Auditado'); setShowFilterDropdown(false); }}>Auditado</button>
              <button className={`auditoria-page__dropdown-item ${filterEstado === 'Sin auditar' ? 'auditoria-page__dropdown-item--active' : ''}`} onClick={() => { setFilterEstado(filterEstado === 'Sin auditar' ? null : 'Sin auditar'); setShowFilterDropdown(false); }}>Sin auditar</button>
            </div>
          )}
        </div>
        <div className="auditoria-page__dropdown-wrapper" ref={sortRef}>
          <button className="auditoria-page__toolbar-btn" onClick={() => setShowSortDropdown((v) => !v)}>
            <ArrowUpDown /> Ordenar
          </button>
          {showSortDropdown && (
            <div className="auditoria-page__dropdown">
              <button className={`auditoria-page__dropdown-item ${sortMode === 'fecha_desc' ? 'auditoria-page__dropdown-item--active' : ''}`} onClick={() => { setSortMode('fecha_desc'); setShowSortDropdown(false); }}>Más recientes</button>
              <button className={`auditoria-page__dropdown-item ${sortMode === 'nombre_asc' ? 'auditoria-page__dropdown-item--active' : ''}`} onClick={() => { setSortMode('nombre_asc'); setShowSortDropdown(false); }}>Nombre A-Z</button>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <table className="auditoria-table">
        <thead>
          <tr><th>Documento</th><th>Categoría</th><th>Estado</th><th>Fecha generación</th><th>Acciones</th></tr>
        </thead>
        <tbody>
          {paginatedDocs.length === 0 ? (
            <tr><td colSpan={5} className="auditoria-table__empty">{searchQuery || hasActiveFilters ? 'No se encontraron documentos con esos filtros.' : 'No hay documentos registrados.'}</td></tr>
          ) : (
            paginatedDocs.map((doc) => (
              <tr key={doc.id}>
                <td>
                  <div className="auditoria-table__doc-cell">
                    <div className="auditoria-table__doc-name">{doc.nombre}</div>
                    <div className="auditoria-table__doc-caso">Caso #{doc.casoNumero} - {doc.casoCliente}</div>
                  </div>
                </td>
                <td><div className="auditoria-table__badge"><span className={`auditoria-table__dot auditoria-table__dot--${doc.categoria.toLowerCase()}`} />{doc.categoria}</div></td>
                <td><div className="auditoria-table__badge"><span className={`auditoria-table__dot auditoria-table__dot--${doc.estado === 'Auditado' ? 'auditado' : 'sin-auditar'}`} />{doc.estado}</div></td>
                <td className="auditoria-table__fecha">{formatFecha(doc.fechaGeneracion)}</td>
                <td>
                  <div className="auditoria-table__actions">
                    <button className="auditoria-table__action-btn" title="Vista rápida" onClick={() => setPreviewDoc(doc)}><Eye /></button>
                    <button className="auditoria-table__action-btn" title="Iniciar auditoría del caso" onClick={() => openAudit(doc)}><FileText /></button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* Pagination */}
      {totalFiltered > 0 && (
        <div className="auditoria-page__pagination">
          <div className="auditoria-page__pagination-info">
            Mostrando <span>{Math.min(ITEMS_PER_PAGE, totalFiltered - (safePage - 1) * ITEMS_PER_PAGE)}</span> de <span>{MOCK_DOCUMENTOS.length}</span> documentos
          </div>
          <div className="auditoria-page__pagination-controls">
            <button className="auditoria-page__page-btn" disabled={safePage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}><ChevronLeft /></button>
            {buildPageNumbers(safePage, totalPages).map((item, idx) =>
              item === 'ellipsis' ? (
                <span key={`e-${idx}`} className="auditoria-page__page-ellipsis">...</span>
              ) : (
                <button key={item} className={`auditoria-page__page-btn ${item === safePage ? 'auditoria-page__page-btn--active' : ''}`} onClick={() => setCurrentPage(item)}>{item}</button>
              )
            )}
            <button className="auditoria-page__page-btn" disabled={safePage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}><ChevronRight /></button>
          </div>
        </div>
      )}

      {/* Vista Rápida (Eye) */}
      {previewDoc && <VistaRapidaPanel doc={previewDoc} onClose={() => setPreviewDoc(null)} />}

      {/* Auditoría en Progreso (FileText) */}
      {auditCaso && (
        <AuditoriaProgresoPanel
          casoData={auditCaso.data}
          casoCliente={auditCaso.cliente}
          onClose={() => setAuditCaso(null)}
          onVerResumen={() => {
            setAuditCaso(null);
            navigate(`/revision/${auditCaso.data.casoNumero}/resumen`);
          }}
        />
      )}
    </div>
  );
}
