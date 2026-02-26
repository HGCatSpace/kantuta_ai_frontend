import { useState, useCallback, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import 'react-pdf/dist/Page/TextLayer.css';
import './DocumentPreviewModal.css';

// Configure worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
).toString();

interface DocumentPreviewModalProps {
    fileUrl: string | null;
    fileName: string;
    onClose: () => void;
    initialPage?: number;
    highlightText?: string;
}

function buildTextRenderer(highlightText: string | undefined) {
    if (!highlightText) return undefined;
    const normalizedHighlight = highlightText.replace(/\s+/g, ' ').toLowerCase();
    return ({ str }: { str: string }) => {
        const normalizedStr = str.replace(/\s+/g, ' ').toLowerCase().trim();
        if (normalizedStr.length > 3 && normalizedHighlight.includes(normalizedStr)) {
            return `<mark class="pdf-highlight">${str}</mark>`;
        }
        return str;
    };
}

export default function DocumentPreviewModal({ fileUrl, fileName, onClose, initialPage = 1, highlightText }: DocumentPreviewModalProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState(initialPage);
    const [scale, setScale] = useState(1.2);
    const bodyRef = useRef<HTMLDivElement>(null);

    const onDocumentLoadSuccess = useCallback(({ numPages: n }: { numPages: number }) => {
        setNumPages(n);
        setCurrentPage(initialPage);
    }, [initialPage]);

    const onPageRenderSuccess = useCallback(() => {
        if (!highlightText) return;
        setTimeout(() => {
            const mark = bodyRef.current?.querySelector<HTMLElement>('.pdf-highlight');
            mark?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 80);
    }, [highlightText]);

    if (!fileUrl) return null;

    const isPdf = fileName.toLowerCase().endsWith('.pdf') || !fileName.includes('.');

    return (
        <div className="doc-preview-overlay" onClick={onClose}>
            <div className="doc-preview-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="doc-preview__header">
                    <span className="doc-preview__title">{fileName}</span>
                    <button className="doc-preview__close" onClick={onClose}><X /></button>
                </div>

                {/* Toolbar */}
                {isPdf && numPages > 0 && (
                    <div className="doc-preview__toolbar">
                        <div className="doc-preview__nav">
                            <button
                                disabled={currentPage <= 1}
                                onClick={() => setCurrentPage((p) => p - 1)}
                            >
                                <ChevronLeft />
                            </button>
                            <span className="doc-preview__page-info">
                                {currentPage} / {numPages}
                            </span>
                            <button
                                disabled={currentPage >= numPages}
                                onClick={() => setCurrentPage((p) => p + 1)}
                            >
                                <ChevronRight />
                            </button>
                        </div>
                        <div className="doc-preview__zoom">
                            <button onClick={() => setScale((s) => Math.max(0.5, s - 0.2))} title="Reducir">
                                <ZoomOut />
                            </button>
                            <span className="doc-preview__zoom-level">{Math.round(scale * 100)}%</span>
                            <button onClick={() => setScale((s) => Math.min(3, s + 0.2))} title="Ampliar">
                                <ZoomIn />
                            </button>
                            <button onClick={() => setScale(1.2)} title="Restablecer">
                                <Maximize2 />
                            </button>
                        </div>
                    </div>
                )}

                {/* Viewer */}
                <div className="doc-preview__body" ref={bodyRef}>
                    {isPdf ? (
                        <Document
                            file={fileUrl}
                            onLoadSuccess={onDocumentLoadSuccess}
                        >
                            <Page
                                pageNumber={currentPage}
                                scale={scale}
                                renderTextLayer={!!highlightText}
                                renderAnnotationLayer={false}
                                customTextRenderer={buildTextRenderer(highlightText)}
                                onRenderSuccess={onPageRenderSuccess}
                            />
                        </Document>
                    ) : (
                        <iframe
                            src={fileUrl}
                            className="doc-preview__iframe"
                            title={fileName}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
