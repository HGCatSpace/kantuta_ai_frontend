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
  TrendingUp,
  TrendingDown,
  Minus,
  Briefcase,
  MessageCircle,
  UserCheck,
  FileUp,
  Activity,
  CheckCircle2,
  AlarmClock,
} from 'lucide-react';
import { isAxiosError } from 'axios';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { getReporteActividad } from '../api/reportes';
import type { CategoriaConteo, ReporteActividad } from '../types/reporte';
import logoImg from '../assets/logo.png';
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

/** Devuelve YYYY-MM-DD para un Date */
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
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

function ComparativeCard({
  icon,
  label,
  value,
  previousValue,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  previousValue: number;
}) {
  const diff = value - previousValue;
  const isUp = diff > 0;
  const isDown = diff < 0;

  return (
    <div className="reporte-page__card">
      <div className="reporte-page__card-icon">{icon}</div>
      <div className="reporte-page__card-body">
        <span className="reporte-page__card-label">{label}</span>
        <span className="reporte-page__card-value">{value}</span>
        <span className={`reporte-page__card-delta ${isUp ? 'reporte-page__card-delta--up' : isDown ? 'reporte-page__card-delta--down' : ''}`}>
          {isUp ? <TrendingUp /> : isDown ? <TrendingDown /> : <Minus />}
          {isUp ? '+' : ''}{diff} vs periodo anterior ({previousValue})
        </span>
      </div>
    </div>
  );
}

function KpiCard({
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
    <div className="reporte-page__card reporte-page__card--kpi">
      <div className="reporte-page__card-icon reporte-page__card-icon--kpi">{icon}</div>
      <div className="reporte-page__card-body">
        <span className="reporte-page__card-label">{label}</span>
        <span className="reporte-page__card-value">{value}</span>
        {hint && <span className="reporte-page__card-hint">{hint}</span>}
      </div>
    </div>
  );
}

function RankingTable({
  title,
  items,
  nameHeader,
  countHeader,
}: {
  title: string;
  items: { nombre: string; total: number }[];
  nameHeader: string;
  countHeader: string;
}) {
  return (
    <div className="reporte-page__ranking">
      <h3 className="reporte-page__ranking-title">{title}</h3>
      {items.length === 0 ? (
        <p className="reporte-page__ranking-empty">Sin datos en este rango</p>
      ) : (
        <table className="reporte-page__ranking-table">
          <thead>
            <tr>
              <th>#</th>
              <th>{nameHeader}</th>
              <th>{countHeader}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => (
              <tr key={idx}>
                <td className="reporte-page__ranking-pos">{idx + 1}</td>
                <td>{item.nombre}</td>
                <td className="reporte-page__ranking-count">{item.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function ReportePage() {
  const reportRef = useRef<HTMLDivElement>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Rango de fecha: por defecto últimos 7 días
  const today = useMemo(() => new Date(), []);
  const defaultDesde = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 7);
    return toDateStr(d);
  }, [today]);
  const defaultHasta = useMemo(() => toDateStr(today), [today]);

  const [desde, setDesde] = useState(defaultDesde);
  const [hasta, setHasta] = useState(defaultHasta);

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery<ReporteActividad>({
    queryKey: ['reporte-actividad', desde, hasta],
    queryFn: () => getReporteActividad(desde, hasta),
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
      // Precargar logo como base64
      const logoBase64 = await new Promise<string>((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const c = document.createElement('canvas');
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          c.getContext('2d')!.drawImage(img, 0, 0);
          resolve(c.toDataURL('image/png'));
        };
        img.src = logoImg;
      });

      const scale = 2;
      // Posiciones (en px de canvas) donde es seguro cortar entre páginas: el
      // borde superior de cada bloque/gráfico, para no partir una tarjeta a la
      // mitad. Se miden sobre el clon (donde el encabezado del PDF sí es visible).
      let breakOffsetsPx: number[] = [];

      const canvas = await html2canvas(reportRef.current, {
        scale,
        backgroundColor: '#ffffff',
        useCORS: true,
        logging: false,
        onclone: (clonedDoc) => {
          const pdfHeader = clonedDoc.querySelector<HTMLElement>('.reporte-page__pdf-header');
          if (pdfHeader) pdfHeader.style.display = 'block';

          const root = clonedDoc.querySelector<HTMLElement>('.reporte-page__capture');
          if (root) {
            const rootTop = root.getBoundingClientRect().top;
            // Unidades indivisibles, en orden. Un título de sección se "pega" al
            // bloque que le sigue (glued) para no quedar huérfano al pie. El
            // contenedor de gráficos se expande en sus cajas individuales.
            const leaves: { el: HTMLElement; glued: boolean }[] = [];
            let prevWasTitle = false;
            Array.from(root.children).forEach((node) => {
              const el = node as HTMLElement;
              if (el.classList.contains('reporte-page__charts')) {
                const boxes = Array.from(el.children) as HTMLElement[];
                const firstTop = boxes.length ? boxes[0].getBoundingClientRect().top : 0;
                boxes.forEach((box) => {
                  // La primera fila (cajas a la misma altura) se pega al título;
                  // las filas siguientes sí pueden saltar de página.
                  const sameRowAsFirst = Math.abs(box.getBoundingClientRect().top - firstTop) < 1;
                  leaves.push({ el: box, glued: prevWasTitle && sameRowAsFirst });
                });
                prevWasTitle = false;
              } else if (el.classList.contains('reporte-page__section-title')) {
                leaves.push({ el, glued: false });
                prevWasTitle = true;
              } else {
                leaves.push({ el, glued: prevWasTitle });
                prevWasTitle = false;
              }
            });
            breakOffsetsPx = leaves
              .filter((u, idx) => idx > 0 && !u.glued)
              .map((u) => (u.el.getBoundingClientRect().top - rootTop) * scale);
          }
        },
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const footerHeight = 14;
      const usableWidth = pageWidth - margin * 2;
      const usableHeight = pageHeight - margin - footerHeight;
      const imgHeight = (canvas.height * usableWidth) / canvas.width;
      const footerY = pageHeight - footerHeight;

      /** Dibuja el pie de página en la página actual */
      const drawFooter = () => {
        // Línea roja
        pdf.setDrawColor(139, 15, 44); // #8B0F2C
        pdf.setLineWidth(0.6);
        pdf.line(margin, footerY, pageWidth - margin, footerY);

        // Logo (izquierda)
        const logoH = 7;
        const logoW = logoH; // cuadrado
        const logoY = footerY + 3.5;
        pdf.addImage(logoBase64, 'PNG', margin, logoY, logoW, logoH);

        // Texto "Kantuta" (al lado del logo) — calculamos ancho ANTES de cambiar font size
        const textBaselineY = logoY + logoH * 0.7;
        const textX = margin + logoW + 2.5;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(139, 15, 44);
        const kantutaText = 'Kantuta';
        const kantutaWidth = pdf.getTextWidth(kantutaText);
        pdf.text(kantutaText, textX, textBaselineY);

        // Badge "AI" (fondo blanco + borde rojo, como en el sidebar)
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(6.5);
        const aiText = 'AI';
        const aiTextWidth = pdf.getTextWidth(aiText);
        const aiPadX = 1;
        const aiBoxW = aiTextWidth + aiPadX * 2;
        const aiBoxH = 3.2;
        const aiBoxX = textX + kantutaWidth + 1.5;
        const aiBoxY = textBaselineY - aiBoxH + 0.6;
        pdf.setDrawColor(139, 15, 44);
        pdf.setFillColor(255, 255, 255);
        pdf.setLineWidth(0.2);
        pdf.roundedRect(aiBoxX, aiBoxY, aiBoxW, aiBoxH, 0.5, 0.5, 'FD');
        pdf.setTextColor(139, 15, 44);
        pdf.text(aiText, aiBoxX + aiPadX, aiBoxY + aiBoxH - 0.7);

        // "Kantuta Group S.C." (derecha)
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8.5);
        pdf.setTextColor(100, 116, 139);
        const firmaText = 'Kantuta Group S.C.';
        const firmaWidth = pdf.getTextWidth(firmaText);
        pdf.text(firmaText, pageWidth - margin - firmaWidth, textBaselineY);
      };

      // Paginación que respeta los límites de los bloques: cada página corta en
      // el último punto seguro que cabe en el área útil, así ningún gráfico ni
      // tarjeta se parte entre dos páginas.
      const totalPx = canvas.height;
      const pxPerMm = canvas.width / usableWidth;
      const usableHeightPx = usableHeight * pxPerMm;
      const candidates = breakOffsetsPx
        .filter((y) => y > 0 && y < totalPx)
        .sort((a, b) => a - b);

      let topPx = 0;
      let firstPage = true;
      while (topPx < totalPx - 1) {
        if (!firstPage) pdf.addPage();

        const maxBottomPx = topPx + usableHeightPx;
        // Último punto de corte seguro que cabe en esta página
        let bottomPx = -1;
        for (const c of candidates) {
          if (c > topPx + 1 && c <= maxBottomPx + 0.5) bottomPx = c;
        }
        // Si ninguna unidad cabe (bloque más alto que una página), corte duro
        if (bottomPx <= topPx) bottomPx = Math.min(maxBottomPx, totalPx);
        if (bottomPx > totalPx) bottomPx = totalPx;

        const sliceHeightMm = (bottomPx - topPx) / pxPerMm;
        const position = margin - topPx / pxPerMm;
        pdf.addImage(imgData, 'PNG', margin, position, usableWidth, imgHeight);

        // Máscaras: oculta lo que se desborda fuera del corte de esta página
        pdf.setFillColor(255, 255, 255);
        pdf.rect(0, 0, pageWidth, margin, 'F'); // arriba
        const cutY = margin + sliceHeightMm;
        pdf.rect(0, cutY, pageWidth, pageHeight - cutY, 'F'); // abajo + zona pie

        drawFooter();

        topPx = bottomPx;
        firstPage = false;
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

      {/* Filtro de rango de fechas */}
      <div className="reporte-page__date-range">
        <div className="reporte-page__date-field">
          <label htmlFor="reporte-desde">Desde</label>
          <input
            id="reporte-desde"
            type="date"
            value={desde}
            max={hasta}
            onChange={(e) => setDesde(e.target.value)}
          />
        </div>
        <div className="reporte-page__date-field">
          <label htmlFor="reporte-hasta">Hasta</label>
          <input
            id="reporte-hasta"
            type="date"
            value={hasta}
            min={desde}
            onChange={(e) => setHasta(e.target.value)}
          />
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
          {/* Encabezado del PDF */}
          <div className="reporte-page__pdf-header">
            <h2 className="reporte-page__pdf-title">Reporte de Actividad — Kantuta AI</h2>
            <p className="reporte-page__pdf-subtitle">
              Generado: {dateFormatter.format(new Date(data.generado_en))}
            </p>
          </div>

          {/* Tarjetas globales */}
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

          {/* Métricas comparativas del rango vs periodo anterior */}
          <div className="reporte-page__section-title">Métricas comparativas del rango seleccionado</div>
          <div className="reporte-page__cards">
            <ComparativeCard
              icon={<Briefcase />}
              label="Casos creados"
              value={data.casos_creados}
              previousValue={data.casos_creados_anterior}
            />
            <ComparativeCard
              icon={<MessageCircle />}
              label="Sesiones de chat iniciadas"
              value={data.sesiones_chat_creadas}
              previousValue={data.sesiones_chat_creadas_anterior}
            />
            <ComparativeCard
              icon={<UserCheck />}
              label="Usuarios activos"
              value={data.usuarios_activos}
              previousValue={data.usuarios_activos_anterior}
            />
            <ComparativeCard
              icon={<FileUp />}
              label="Documentos subidos"
              value={data.documentos_subidos}
              previousValue={data.documentos_subidos_anterior}
            />
          </div>

          {/* KPIs derivados del rango */}
          <div className="reporte-page__section-title">Indicadores del rango</div>
          <div className="reporte-page__cards">
            <KpiCard
              icon={<Activity />}
              label="Promedio de chats por caso"
              value={data.promedio_chats_por_caso}
              hint="Densidad de uso del asistente por caso activo"
            />
            <KpiCard
              icon={<CheckCircle2 />}
              label="Tasa de éxito de ingesta"
              value={`${data.tasa_exito_ingesta}%`}
              hint="Documentos completados sobre el total subido en el rango"
            />
          </div>

          {/* Tablas comparativas */}
          <div className="reporte-page__rankings">
            <RankingTable
              title="Casos por usuario"
              items={data.casos_por_usuario}
              nameHeader="Usuario"
              countHeader="Casos"
            />
            <RankingTable
              title="Chats por caso"
              items={data.chats_por_caso}
              nameHeader="Caso"
              countHeader="Chats"
            />
            <RankingTable
              title="Chats por usuario"
              items={data.chats_por_usuario}
              nameHeader="Usuario"
              countHeader="Chats"
            />
          </div>

          {/* Casos sin actividad reciente (independiente del rango) */}
          <div className="reporte-page__section-title">
            <AlarmClock className="reporte-page__section-icon" />
            Casos abandonados ({data.dias_inactividad_umbral}+ días sin actividad)
          </div>
          <div className="reporte-page__inactive">
            {data.casos_sin_actividad.length === 0 ? (
              <p className="reporte-page__inactive-empty">
                Ningún caso ABIERTO supera el umbral de inactividad. Bien hecho.
              </p>
            ) : (
              <table className="reporte-page__inactive-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Caso</th>
                    <th>Última actividad</th>
                    <th>Días inactivo</th>
                  </tr>
                </thead>
                <tbody>
                  {data.casos_sin_actividad.map((caso, idx) => (
                    <tr key={caso.id_caso}>
                      <td className="reporte-page__ranking-pos">{idx + 1}</td>
                      <td>{caso.titulo}</td>
                      <td>
                        {caso.ultima_actividad
                          ? dateFormatter.format(new Date(caso.ultima_actividad))
                          : 'Sin chats registrados'}
                      </td>
                      <td>
                        <span
                          className={`reporte-page__days-badge ${
                            caso.dias_inactivo >= 30
                              ? 'reporte-page__days-badge--critical'
                              : caso.dias_inactivo >= 21
                              ? 'reporte-page__days-badge--warning'
                              : ''
                          }`}
                        >
                          {caso.dias_inactivo} días
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Gráficos globales */}
          <div className="reporte-page__section-title">Distribución general</div>
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
