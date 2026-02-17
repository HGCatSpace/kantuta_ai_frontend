import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Search,
  Maximize2,
  Scale,
  AlertTriangle,
  Calculator,
} from 'lucide-react';
import './ResumenAuditoriaPage.css';

/* ── Mock data per case ── */

interface Hallazgo {
  tipo: 'riesgo_alto' | 'riesgo_medio' | 'calculo';
  titulo: string;
  ubicacion: string;
  cita: string;
  analisis: string;
  detalle: string;
  ctaLabel: string;
}

interface ResumenCaso {
  titulo: string;
  casoLabel: string;
  docsAnalizados: string;
  confianza: number;
  actualizado: string;
  riesgoAlto: number;
  riesgoMedio: number;
  aprobado: number;
  resumenEjecutivo: string;
  hallazgos: Hallazgo[];
}

const MOCK_RESUMEN: Record<string, ResumenCaso> = {
  '2024-001': {
    titulo: 'Servicios Legales Minera Exp. 001',
    casoLabel: 'CASO: SERVICIOS LEGALES MINERA SAN CRISTÓBAL EXP. 001',
    docsAnalizados: 'Contrato de Servicios, Recurso de Apelación, Anexo de Tarifas, Carta de Presentación, Resolución Administrativa.',
    confianza: 96,
    actualizado: 'Actualizado hace 8 min',
    riesgoAlto: 2,
    riesgoMedio: 3,
    aprobado: 22,
    resumenEjecutivo: 'La auditoría integral de los documentos presentados en el expediente 001 revela deficiencias en el anexo de tarifas y la resolución administrativa. Las cláusulas de confidencialidad del contrato principal están correctamente redactadas, pero el recurso de apelación presenta argumentos que podrían ser fortalecidos con jurisprudencia reciente.',
    hallazgos: [
      {
        tipo: 'riesgo_alto',
        titulo: 'TARIFAS SIN INDEXACIÓN',
        ubicacion: 'HALLAZGO EN ANEXO TARIFARIO',
        cita: '"Las tarifas pactadas se mantendrán fijas durante la vigencia del contrato..."',
        analisis: 'La ausencia de cláusulas de ajuste por inflación expone al cliente a pérdidas significativas. La legislación boliviana (Ley 1670, Art. 42) recomienda indexación en contratos de servicios continuos.',
        detalle: 'El Anexo de Tarifas no contempla mecanismos de actualización. Diferencia estimada acumulada: $12,500 USD en 3 años de vigencia.',
        ctaLabel: 'VER DOCUMENTO ORIGINAL',
      },
      {
        tipo: 'calculo',
        titulo: 'PENALIDAD MAL CALCULADA',
        ubicacion: 'HALLAZGO EN CONTRATO',
        cita: '"Base de cálculo utilizada: Monto base sin recargos."',
        analisis: 'El Contrato de Servicios (Cláusula 12) establece penalidades del 5% pero la base de cálculo excluye recargos legales. Estos debieron integrarse según Art. 568 del Código Civil. Diferencia estimada: $4,200.',
        detalle: '',
        ctaLabel: 'RECALCULAR CON IA',
      },
    ],
  },
  '2024-002': {
    titulo: 'Demanda Laboral Exp. 892',
    casoLabel: 'CASO: DEMANDA LABORAL EXP. 892',
    docsAnalizados: 'Contrato Laboral, Liquidación de Beneficios, Intercambio de Correos, Pruebas Testimoniales.',
    confianza: 98,
    actualizado: 'Actualizado hace 15 min',
    riesgoAlto: 3,
    riesgoMedio: 5,
    aprobado: 28,
    resumenEjecutivo: 'La auditoría integral de los documentos presentados en el expediente 892 revela discrepancias significativas en la Liquidación de Beneficios Sociales. Si bien la defensa de la empresa se sustenta en una renuncia voluntaria, el análisis de los correos electrónicos sugiere una posible coacción, lo que eleva el riesgo de litigio desfavorable.',
    hallazgos: [
      {
        tipo: 'riesgo_alto',
        titulo: 'COACCIÓN EXPLÍCITA',
        ubicacion: 'HALLAZGO EN PRUEBA #1',
        cita: '"...procesaremos el despido por falta grave sin indemnización si no firma..."',
        analisis: 'Este correo invalida el argumento de "renuncia voluntaria". Alta probabilidad de que el juez desestime la renuncia y ordene indemnización por despido injustificado más daños.',
        detalle: '',
        ctaLabel: 'VER DOCUMENTO ORIGINAL',
      },
      {
        tipo: 'calculo',
        titulo: 'CÁLCULO ERRÓNEO',
        ubicacion: 'HALLAZGO EN LIQUIDACIÓN',
        cita: '"Base de cálculo utilizada: Salario básico sin bonificaciones."',
        analisis: 'El Contrato Laboral (Cláusula 8) define bonos regulares. Estos debieron integrarse al salario base para el cálculo de antigüedad según Art. 14 LGT. Diferencia estimada: $3,200.',
        detalle: '',
        ctaLabel: 'RECALCULAR CON IA',
      },
    ],
  },
  '2024-003': {
    titulo: 'Demanda Civil Exp. 003',
    casoLabel: 'CASO: DEMANDA CIVIL CONSTRUCTORA VILLALOBOS EXP. 003',
    docsAnalizados: 'Demanda Civil Ordinaria, Resolución de Homologación, Prueba Documental, Sentencia Final.',
    confianza: 99,
    actualizado: 'Actualizado hace 5 min',
    riesgoAlto: 0,
    riesgoMedio: 1,
    aprobado: 35,
    resumenEjecutivo: 'La auditoría confirma que todos los documentos del expediente 003 cumplen con los requisitos procesales. La sentencia fue correctamente homologada. Se detectó una observación menor en la cuantificación de daños que ya fue subsanada en la versión final del acuerdo transaccional.',
    hallazgos: [
      {
        tipo: 'riesgo_medio',
        titulo: 'CUANTIFICACIÓN DÉBIL',
        ubicacion: 'HALLAZGO EN DEMANDA',
        cita: '"El daño emergente asciende a la suma de Bs. 450,000..."',
        analisis: 'La cuantificación no incluye respaldo documental suficiente para el lucro cesante. Se recomienda agregar peritaje contable como respaldo adicional ante posible apelación.',
        detalle: '',
        ctaLabel: 'VER DOCUMENTO ORIGINAL',
      },
    ],
  },
};

/* Fallback for cases without specific mock data */
function getResumen(casoNumero: string): ResumenCaso {
  return MOCK_RESUMEN[casoNumero] ?? {
    titulo: `Caso Exp. ${casoNumero}`,
    casoLabel: `CASO: EXPEDIENTE ${casoNumero}`,
    docsAnalizados: 'Documentos del caso analizados.',
    confianza: 95,
    actualizado: 'Actualizado recientemente',
    riesgoAlto: 1,
    riesgoMedio: 2,
    aprobado: 20,
    resumenEjecutivo: 'La auditoría integral del expediente ha sido completada. Se identificaron observaciones que requieren atención.',
    hallazgos: [],
  };
}

function HallazgoIcon({ tipo }: { tipo: Hallazgo['tipo'] }) {
  if (tipo === 'calculo') return <Calculator className="ra-hallazgo__icon ra-hallazgo__icon--calc" />;
  return <AlertTriangle className="ra-hallazgo__icon ra-hallazgo__icon--risk" />;
}

export default function ResumenAuditoriaPage() {
  const { casoNumero } = useParams<{ casoNumero: string }>();
  const navigate = useNavigate();
  const resumen = getResumen(casoNumero ?? '');

  return (
    <div className="ra-page">
      {/* Top bar */}
      <div className="ra-topbar">
        <div className="ra-topbar__left">
          <button className="ra-topbar__back" onClick={() => navigate('/revision')}>
            <ArrowLeft /> VOLVER A CASOS
          </button>
          <div className="ra-topbar__title-group">
            <h1 className="ra-topbar__title">Resumen de Auditoría: {resumen.titulo}</h1>
            <div className="ra-topbar__meta">
              <span className="ra-topbar__badge">INFORME INTEGRADO</span>
              <span className="ra-topbar__meta-text">{resumen.docsAnalizados.split(',').length} Documentos analizados</span>
              <span className="ra-topbar__meta-text">{resumen.actualizado}</span>
            </div>
          </div>
        </div>
        <button className="ra-topbar__download">
          <Download /> Descargar Informe de Caso
        </button>
      </div>

      {/* Toolbar */}
      <div className="ra-toolbar">
        <div className="ra-toolbar__left">
          <span className="ra-toolbar__label">VISTA:</span>
          <select className="ra-toolbar__select">
            <option>Resumen Ejecutivo Consolidado</option>
            <option>Vista por Documento</option>
            <option>Solo Hallazgos</option>
          </select>
          <span className="ra-toolbar__ai">Generado por IA &bull; Confianza {resumen.confianza}%</span>
        </div>
        <div className="ra-toolbar__right">
          <button className="ra-toolbar__icon-btn"><Search /></button>
          <button className="ra-toolbar__icon-btn"><Maximize2 /></button>
        </div>
      </div>

      {/* Main content */}
      <div className="ra-content">
        {/* Left: Document */}
        <div className="ra-document">
          <div className="ra-document__header">
            <Scale className="ra-document__header-icon" />
            <h2 className="ra-document__title">Informe Consolidado de Auditoría Legal</h2>
          </div>
          <p className="ra-document__caso-label">{resumen.casoLabel}</p>
          <p className="ra-document__docs-list">
            Documentos Analizados: <em>{resumen.docsAnalizados}</em>
          </p>

          <h3 className="ra-document__section-title">1. RESUMEN EJECUTIVO DEL CASO</h3>
          <p className="ra-document__text">{resumen.resumenEjecutivo}</p>

          {resumen.hallazgos.length > 0 && (
            <>
              <h3 className="ra-document__section-title">2. HALLAZGOS CRÍTICOS POR DOCUMENTO</h3>
              {resumen.hallazgos.map((h, i) => (
                <div key={i} className="ra-document__hallazgo-block">
                  <h4 className="ra-document__hallazgo-subtitle">
                    {String.fromCharCode(65 + i)}. {h.titulo}
                  </h4>
                  <blockquote className="ra-document__cita">
                    {h.cita}
                  </blockquote>
                  {h.analisis.includes('Impacto:') ? (
                    <p className="ra-document__text">
                      <span className="ra-document__impacto-label">Impacto: </span>
                      {h.analisis.split('Impacto:')[1]}
                    </p>
                  ) : (
                    <p className="ra-document__text">{h.analisis}</p>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Right: Panel de Auditoría Global */}
        <div className="ra-panel">
          <h3 className="ra-panel__title">Panel de Auditoría Global</h3>

          {/* Stat cards */}
          <div className="ra-panel__stats">
            <div className="ra-panel__stat ra-panel__stat--alto">
              <span className="ra-panel__stat-label">RIESGO ALTO</span>
              <span className="ra-panel__stat-num">{resumen.riesgoAlto}</span>
              <span className="ra-panel__stat-sub">Acumulado</span>
            </div>
            <div className="ra-panel__stat ra-panel__stat--medio">
              <span className="ra-panel__stat-label">RIESGO MEDIO</span>
              <span className="ra-panel__stat-num">{resumen.riesgoMedio}</span>
              <span className="ra-panel__stat-sub">Acumulado</span>
            </div>
            <div className="ra-panel__stat ra-panel__stat--ok">
              <span className="ra-panel__stat-label">APROBADO</span>
              <span className="ra-panel__stat-num">{resumen.aprobado}</span>
              <span className="ra-panel__stat-sub">Cláusulas OK</span>
            </div>
          </div>

          {/* Hallazgo cards */}
          {resumen.hallazgos.map((h, i) => (
            <div key={i} className={`ra-hallazgo ra-hallazgo--${h.tipo === 'calculo' ? 'calc' : h.tipo === 'riesgo_alto' ? 'alto' : 'medio'}`}>
              <div className="ra-hallazgo__header">
                <HallazgoIcon tipo={h.tipo} />
                <span className="ra-hallazgo__titulo">{h.titulo}</span>
                <span className="ra-hallazgo__ubicacion">{h.ubicacion}</span>
              </div>

              {h.cita && (
                <blockquote className="ra-hallazgo__cita">{h.cita}</blockquote>
              )}

              {h.tipo !== 'calculo' && (
                <>
                  <p className="ra-hallazgo__analisis-label">ANÁLISIS DE IMPACTO</p>
                  <p className="ra-hallazgo__analisis-text">{h.analisis}</p>
                </>
              )}

              {h.tipo === 'calculo' && (
                <>
                  <p className="ra-hallazgo__analisis-label">DISCREPANCIA DETECTADA</p>
                  <p className="ra-hallazgo__analisis-text">{h.analisis}</p>
                </>
              )}

              <button className={`ra-hallazgo__cta ${h.tipo === 'calculo' ? 'ra-hallazgo__cta--calc' : ''}`}>
                {h.ctaLabel}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
