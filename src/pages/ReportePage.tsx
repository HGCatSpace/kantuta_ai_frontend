import { useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  Users,
  FolderOpen,
  Database,
  MessageSquare,
  MessagesSquare,
  Loader2,
  RefreshCw,
  AlertCircle,
  FileDown,
} from 'lucide-react';
import { isAxiosError } from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getReporteActividad } from '../api/reportes';
import type { CategoriaConteo, ReporteActividad } from '../types/reporte';
import './ReportePage.css';

// Paleta categórica: tonos joya complementarios al carmesí de marca
const CATEGORICAL_COLORS = [
  '#8B0F2C', // carmesí (marca)
  '#1E3A5F', // azul profundo
  '#2F6B4F', // verde bosque
  '#C5A065', // dorado muted
  '#6B4E8C', // púrpura
  '#B97A3A', // cobre cálido
  '#0F766E', // teal oscuro
];

// Color semántico por estado de indexación de documentos
const ESTADO_DOC_COLOR: Record<string, string> = {
  COMPLETADO: '#2F6B4F',  // verde
  PROCESANDO: '#C5A065',  // dorado/ámbar
  PENDIENTE:  '#94A3B8',  // gris azulado
  ERROR:      '#8B0F2C',  // carmesí
};

function colorPorEstadoDoc(categoria: string): string {
  return ESTADO_DOC_COLOR[categoria.toUpperCase()] ?? '#94A3B8';
}

const dateFormatter = new Intl.DateTimeFormat('es-BO', {
  day: '2-digit',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function totalDe(items: CategoriaConteo[]): number {
  return items.reduce((acc, it) => acc + it.total, 0);
}

function MetricCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="reporte-page__card">
      <div className="reporte-page__card-icon">{icon}</div>
      <div className="reporte-page__card-body">
        <span className="reporte-page__card-label">{label}</span>
        <span className="reporte-page__card-value">{value}</span>
        {hint && <span className="reporte-page__card-hint">{hint}</span>}
      </div>
    </div>
  );
}

export default function ReportePage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<ReporteActividad>({
    queryKey: ['reporte-actividad'],
    queryFn: getReporteActividad,
    retry: false,
  });

  const endpointAusente = isAxiosError(error) && (error.response?.status === 404 || error.response?.status === 405);
  const sinPermiso = isAxiosError(error) && error.response?.status === 403;

  const totales = useMemo(() => {
    if (!data) return { usuarios: 0, casos: 0, documentos: 0 };
    return {
      usuarios: totalDe(data.usuarios_por_rol),
      casos: totalDe(data.casos_por_estado),
      documentos: totalDe(data.documentos_por_estado),
    };
  }, [data]);

  const handleExportPdf = async () => {
    if (!reportRef.current || !data || exportingPdf) return;
    setExportingPdf(true);
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          // Mostrar cabecera del PDF (oculta en la UI live)
          const pdfHeader = clonedDoc.querySelector<HTMLElement>('.reporte-page__pdf-header');
          if (pdfHeader) pdfHeader.style.display = 'block';
        },
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const usableWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height * usableWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = margin;
      pdf.addImage(imgData, 'PNG', margin, position, usableWidth, imgHeight);
      heightLeft -= pageHeight - margin * 2;

      while (heightLeft > 0) {
        pdf.addPage();
        position = margin - (imgHeight - heightLeft);
        pdf.addImage(imgData, 'PNG', margin, position, usableWidth, imgHeight);
        heightLeft -= pageHeight - margin * 2;
      }

      const fecha = new Date().toISOString().slice(0, 10);
      pdf.save(`reporte_actividad_${fecha}.pdf`);
    } catch (err) {
      console.error('Error al exportar PDF:', err);
      alert('No se pudo generar el PDF. Revisa la consola.');
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <div className="reporte-page">
      <div className="reporte-page__header">
        <div>
          <h1 className="reporte-page__title">Informes y Reportes</h1>
          <p className="reporte-page__subtitle">
            Métricas globales de uso del asistente legal Kantuta AI
          </p>
        </div>
        <div className="reporte-page__header-actions">
          <button
            className="reporte-page__refresh-btn"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? <Loader2 className="spin" /> : <RefreshCw />}
            Actualizar
          </button>
          <button
            className="reporte-page__export-btn"
            onClick={handleExportPdf}
            disabled={!data || exportingPdf}
            title="Descargar reporte en PDF"
          >
            {exportingPdf ? <Loader2 className="spin" /> : <FileDown />}
            Exportar PDF
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="reporte-page__status">
          <Loader2 className="spin" /> Cargando reporte de actividad...
        </div>
      )}

      {isError && endpointAusente && (
        <div className="reporte-page__notice">
          <AlertCircle />
          <div>
            <strong>Endpoint pendiente</strong>
            <p>
              El backend aún no expone <code>GET /reportes/actividad</code>. Los datos globales
              aparecerán automáticamente cuando el endpoint esté implementado.
            </p>
          </div>
        </div>
      )}

      {isError && sinPermiso && (
        <div className="reporte-page__notice reporte-page__notice--error">
          <AlertCircle />
          <div>
            <strong>Sin permiso</strong>
            <p>Tu rol no tiene la acción <code>Informes y reportes</code>.</p>
          </div>
        </div>
      )}

      {isError && !endpointAusente && !sinPermiso && (
        <div className="reporte-page__status reporte-page__status--error">
          Error al cargar el reporte. Verifica tu conexión.
        </div>
      )}

      {data && !isLoading && (
        <div ref={reportRef} className="reporte-page__capture">
          {/* Encabezado del reporte (visible en el PDF exportado) */}
          <div className="reporte-page__pdf-header">
            <h2 className="reporte-page__pdf-title">Reporte de Actividad — Kantuta AI</h2>
            <p className="reporte-page__pdf-subtitle">
              Generado: {dateFormatter.format(new Date(data.generado_en))}
            </p>
          </div>

          {/* Tarjetas de métricas */}
          <div className="reporte-page__cards">
            <MetricCard
              icon={<Users />}
              label="Usuarios totales"
              value={totales.usuarios}
              hint={`${data.usuarios_por_rol.length} roles`}
            />
            <MetricCard
              icon={<FolderOpen />}
              label="Casos registrados"
              value={totales.casos}
            />
            <MetricCard
              icon={<Database />}
              label="Documentos indexados"
              value={totales.documentos}
            />
            <MetricCard
              icon={<MessageSquare />}
              label="Sesiones (7 días)"
              value={data.sesiones_chat_7d}
            />
            <MetricCard
              icon={<MessagesSquare />}
              label="Mensajes (30 días)"
              value={data.mensajes_humanos_30d}
            />
          </div>

          {/* Gráficos */}
          <div className="reporte-page__charts">
            <div className="reporte-page__chart-box">
              <h2 className="reporte-page__chart-title">Usuarios por rol</h2>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.usuarios_por_rol}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="categoria" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(30, 58, 95, 0.08)' }} />
                  <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                    {data.usuarios_por_rol.map((_, idx) => (
                      <Cell key={idx} fill={CATEGORICAL_COLORS[idx % CATEGORICAL_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="reporte-page__chart-box">
              <h2 className="reporte-page__chart-title">Casos por estado</h2>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={data.casos_por_estado}
                    dataKey="total"
                    nameKey="categoria"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label
                  >
                    {data.casos_por_estado.map((_, idx) => (
                      <Cell key={idx} fill={CATEGORICAL_COLORS[idx % CATEGORICAL_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="reporte-page__chart-box reporte-page__chart-box--full">
              <h2 className="reporte-page__chart-title">Documentos por estado</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.documentos_por_estado} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" stroke="#64748b" fontSize={12} allowDecimals={false} />
                  <YAxis type="category" dataKey="categoria" stroke="#64748b" fontSize={12} width={120} />
                  <Tooltip cursor={{ fill: 'rgba(47, 107, 79, 0.08)' }} />
                  <Bar dataKey="total" radius={[0, 6, 6, 0]}>
                    {data.documentos_por_estado.map((item, idx) => (
                      <Cell key={idx} fill={colorPorEstadoDoc(item.categoria)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <p className="reporte-page__footer">
            Generado: {dateFormatter.format(new Date(data.generado_en))}
          </p>
        </div>
      )}
    </div>
  );
}
